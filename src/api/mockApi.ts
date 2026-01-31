import type {
  Quote,
  PaymentRequest,
  PaymentResponse,
  Transaction,
} from "../types";
import { getMockConfig } from "./mockConfig";
import { getExchangeRate } from "./exchangeRateService";

// In-memory storage for tracking transactions and preventing double submissions
const transactionStore = new Map<string, Transaction>();
const pendingPayments = new Set<string>();

// Helper function to simulate network delay
const delay = (): Promise<void> => {
  const config = getMockConfig();
  const ms = config.deterministicMode
    ? config.networkDelay.min
    : Math.random() * (config.networkDelay.max - config.networkDelay.min) +
      config.networkDelay.min;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Helper function to determine if request should fail
const shouldFail = (rate: number): boolean => {
  const config = getMockConfig();
  return config.deterministicMode ? false : Math.random() < rate;
};

// Generate a UUID
const generateId = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Calculate fee based on amount. Fixed until 10k. Mockup done by me
const calculateFee = (amount: number): number => {
  if (amount < 100) return 2.5;
  if (amount < 1000) return 3.5;
  if (amount < 10000) return 5.0;
  return amount * 0.001;
};

// POST /quote - Get FX quote
export const getQuote = async (
  sourceCurrency: string,
  destinationCurrency: string,
  amount: number,
): Promise<Quote> => {
  await delay();

  const config = getMockConfig();

  // Simulate failure
  if (shouldFail(config.quoteFailureRate)) {
    throw new Error(
      "RATE_UNAVAILABLE: Unable to fetch exchange rate. Please try again.",
    );
  }

  // Validate inputs
  if (amount <= 0) {
    throw new Error("INVALID_AMOUNT: Amount must be greater than zero.");
  }

  if (sourceCurrency === destinationCurrency) {
    throw new Error(
      "SAME_CURRENCY: Source and destination currencies cannot be the same.",
    );
  }

  const rate = await getExchangeRate(sourceCurrency, destinationCurrency);
  const fee = calculateFee(amount);
  const destinationAmount = amount * rate;
  const totalPayable = amount + fee;

  const quote: Quote = {
    sourceCurrency,
    destinationCurrency,
    sourceAmount: amount,
    rate,
    fee,
    destinationAmount,
    totalPayable,
    expiresAt: Date.now() + config.quoteExpirySeconds * 1000,
    quoteId: generateId(),
  };

  return quote;
};

// POST /pay
export const submitPayment = async (
  request: PaymentRequest,
): Promise<PaymentResponse> => {
  await delay();

  const config = getMockConfig();

  const paymentKey = `${request.quoteId}-${request.amount}`;
  if (pendingPayments.has(paymentKey)) {
    throw new Error(
      "DUPLICATE_PAYMENT: Payment already in progress for this quote.",
    );
  }

  pendingPayments.add(paymentKey);

  try {
    if (shouldFail(config.paymentFailureRate)) {
      throw new Error(
        "INSUFFICIENT_FUNDS: Payment failed due to insufficient funds.",
      );
    }

    const transactionId = generateId();
    const rate = await getExchangeRate(
      request.sourceCurrency,
      request.destinationCurrency,
    );
    const fee = calculateFee(request.amount);
    const destinationAmount = request.amount * rate;

    const transaction: Transaction = {
      transactionId,
      status: "PROCESSING",
      sourceCurrency: request.sourceCurrency,
      destinationCurrency: request.destinationCurrency,
      sourceAmount: request.amount,
      destinationAmount,
      rate,
      fee,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      statusMessage: "Payment is being processed",
    };

    transactionStore.set(transactionId, transaction);

    // Simulate async
    setTimeout(() => {
      const tx = transactionStore.get(transactionId);
      if (tx && tx.status === "PROCESSING") {
        if (shouldFail(config.transactionFailureRate)) {
          tx.status = "FAILED";
          tx.statusMessage =
            "Transaction failed during processing. Please contact support.";
          tx.updatedAt = Date.now();
        } else {
          tx.status = "SENT";
          tx.statusMessage = "Payment has been sent to recipient";
          tx.updatedAt = Date.now();

          // Settlement logic with delay
          setTimeout(() => {
            const sentTx = transactionStore.get(transactionId);
            if (sentTx && sentTx.status === "SENT") {
              sentTx.status = "SETTLED";
              sentTx.statusMessage = "Payment has been successfully settled";
              sentTx.updatedAt = Date.now();
            }
          }, config.transactionSettlementTime);
        }
      }
    }, config.transactionProcessingTime);

    return {
      transactionId,
      status: "PROCESSING",
      message: "Payment submitted successfully",
    };
  } finally {
    // Remove from pending after a delay to prevent immediate resubmission
    setTimeout(() => pendingPayments.delete(paymentKey), 2000);
  }
};

// GET /transaction/:id
export const getTransactionStatus = async (
  transactionId: string,
): Promise<Transaction> => {
  await delay();

  const transaction = transactionStore.get(transactionId);

  if (!transaction) {
    throw new Error("TRANSACTION_NOT_FOUND: Transaction not found.");
  }

  return { ...transaction };
};

export const clearMockData = () => {
  transactionStore.clear();
  pendingPayments.clear();
};

export const getAllTransactions = (): Transaction[] => {
  return Array.from(transactionStore.values());
};
