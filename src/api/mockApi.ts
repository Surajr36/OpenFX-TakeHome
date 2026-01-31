import type {
  Quote,
  PaymentRequest,
  PaymentResponse,
  Transaction,
} from "../types";
import { getMockConfig } from "./mockConfig";

// In-memory storage for tracking transactions and preventing double submissions
const transactionStore = new Map<string, Transaction>();
const pendingPayments = new Set<string>();

// Base exchange rates (simplified - in production would fetch from real API)
const BASE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  JPY: 149.5,
  GBP: 0.79,
  AUD: 1.52,
  CAD: 1.35,
  CHF: 0.88,
  CNY: 7.24,
  SEK: 10.45,
  NZD: 1.64,
  MXN: 17.15,
  SGD: 1.34,
  HKD: 7.83,
  NOK: 10.68,
  KRW: 1335.5,
  TRY: 32.15,
  INR: 83.25,
  RUB: 92.5,
  BRL: 4.97,
  ZAR: 18.75,
};

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

// Calculate exchange rate with realistic spread
const calculateRate = (from: string, to: string): number => {
  const fromRate = BASE_RATES[from] || 1;
  const toRate = BASE_RATES[to] || 1;
  const midRate = toRate / fromRate;

  // Add 0.5% - 2% spread
  const config = getMockConfig();
  const spread = config.deterministicMode
    ? 0.01
    : Math.random() * 0.015 + 0.005;
  return midRate * (1 - spread);
};

// Calculate fee based on amount
const calculateFee = (amount: number): number => {
  if (amount < 100) return 2.5;
  if (amount < 1000) return 3.5;
  if (amount < 10000) return 5.0;
  return amount * 0.001; // 0.1% for large amounts
};

/**
 * POST /quote - Get FX quote
 * Simulates fetching a real-time exchange rate with expiry
 */
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

  if (!BASE_RATES[sourceCurrency] || !BASE_RATES[destinationCurrency]) {
    throw new Error("UNSUPPORTED_CURRENCY: Currency not supported.");
  }

  const rate = calculateRate(sourceCurrency, destinationCurrency);
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

/**
 * POST /pay - Submit payment
 * Validates quote and creates transaction
 */
export const submitPayment = async (
  request: PaymentRequest,
): Promise<PaymentResponse> => {
  await delay();

  const config = getMockConfig();

  // Check for duplicate submission
  const paymentKey = `${request.quoteId}-${request.amount}`;
  if (pendingPayments.has(paymentKey)) {
    throw new Error(
      "DUPLICATE_PAYMENT: Payment already in progress for this quote.",
    );
  }

  pendingPayments.add(paymentKey);

  try {
    // Simulate failure
    if (shouldFail(config.paymentFailureRate)) {
      throw new Error(
        "INSUFFICIENT_FUNDS: Payment failed due to insufficient funds.",
      );
    }

    // Validate quote hasn't expired (in real scenario, backend would validate)
    // For simulation, we skip this check since we don't store quotes server-side

    const transactionId = generateId();
    const rate = calculateRate(
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

    // Simulate async processing
    setTimeout(() => {
      const tx = transactionStore.get(transactionId);
      if (tx && tx.status === "PROCESSING") {
        // Check if should fail during processing
        if (shouldFail(config.transactionFailureRate)) {
          tx.status = "FAILED";
          tx.statusMessage =
            "Transaction failed during processing. Please contact support.";
          tx.updatedAt = Date.now();
        } else {
          tx.status = "SENT";
          tx.statusMessage = "Payment has been sent to recipient";
          tx.updatedAt = Date.now();

          // Schedule settlement
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

/**
 * GET /transaction/:id - Get transaction status
 * Returns current transaction state
 */
export const getTransactionStatus = async (
  transactionId: string,
): Promise<Transaction> => {
  await delay();

  const transaction = transactionStore.get(transactionId);

  if (!transaction) {
    throw new Error("TRANSACTION_NOT_FOUND: Transaction not found.");
  }

  // Return a copy to prevent external mutation
  return { ...transaction };
};

/**
 * Utility function to clear all mock data (useful for testing)
 */
export const clearMockData = () => {
  transactionStore.clear();
  pendingPayments.clear();
};

/**
 * Utility function to get all transactions (for debugging)
 */
export const getAllTransactions = (): Transaction[] => {
  return Array.from(transactionStore.values());
};
