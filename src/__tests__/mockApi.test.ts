import { describe, it, expect, beforeEach } from "vitest";
import {
  getQuote,
  submitPayment,
  getTransactionStatus,
  clearMockData,
} from "../api/mockApi";
import { setMockConfig, resetMockConfig } from "../api/mockConfig";

describe("Mock API - getQuote", () => {
  beforeEach(() => {
    resetMockConfig();
    clearMockData();
    // Enable deterministic mode for testing
    setMockConfig({ deterministicMode: true });
  });

  it("should return a valid quote with correct structure", async () => {
    const quote = await getQuote("USD", "EUR", 1000);

    expect(quote).toHaveProperty("sourceCurrency", "USD");
    expect(quote).toHaveProperty("destinationCurrency", "EUR");
    expect(quote).toHaveProperty("sourceAmount", 1000);
    expect(quote).toHaveProperty("rate");
    expect(quote).toHaveProperty("fee");
    expect(quote).toHaveProperty("destinationAmount");
    expect(quote).toHaveProperty("totalPayable");
    expect(quote).toHaveProperty("expiresAt");
    expect(quote).toHaveProperty("quoteId");
  });

  it("should calculate total payable as amount + fee", async () => {
    const quote = await getQuote("USD", "EUR", 1000);

    expect(quote.totalPayable).toBe(quote.sourceAmount + quote.fee);
  });

  it("should calculate destination amount using rate", async () => {
    const quote = await getQuote("USD", "EUR", 1000);

    expect(quote.destinationAmount).toBeCloseTo(
      quote.sourceAmount * quote.rate,
      2,
    );
  });

  it("should set expiry time to 30 seconds in the future", async () => {
    const before = Date.now();
    const quote = await getQuote("USD", "EUR", 1000);
    const after = Date.now();

    const expectedExpiry = before + 30000;
    expect(quote.expiresAt).toBeGreaterThanOrEqual(expectedExpiry);
    expect(quote.expiresAt).toBeLessThanOrEqual(after + 30000);
  });

  it("should throw error for zero or negative amounts", async () => {
    await expect(getQuote("USD", "EUR", 0)).rejects.toThrow("INVALID_AMOUNT");
    await expect(getQuote("USD", "EUR", -100)).rejects.toThrow(
      "INVALID_AMOUNT",
    );
  });

  it("should throw error for same source and destination currency", async () => {
    await expect(getQuote("USD", "USD", 1000)).rejects.toThrow("SAME_CURRENCY");
  });

  it("should throw error for unsupported currencies", async () => {
    await expect(getQuote("XXX", "EUR", 1000)).rejects.toThrow(
      "UNSUPPORTED_CURRENCY",
    );
    await expect(getQuote("USD", "YYY", 1000)).rejects.toThrow(
      "UNSUPPORTED_CURRENCY",
    );
  });

  it("should apply lower fees for smaller amounts", async () => {
    const quote1 = await getQuote("USD", "EUR", 50);
    const quote2 = await getQuote("USD", "EUR", 500);
    const quote3 = await getQuote("USD", "EUR", 5000);

    expect(quote1.fee).toBe(2.5);
    expect(quote2.fee).toBe(3.5);
    expect(quote3.fee).toBe(5.0);
  });
});

describe("Mock API - submitPayment", () => {
  beforeEach(() => {
    resetMockConfig();
    clearMockData();
    setMockConfig({ deterministicMode: true });
  });

  it("should return a transaction ID and status", async () => {
    const quote = await getQuote("USD", "EUR", 1000);
    const payment = await submitPayment({
      quoteId: quote.quoteId,
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      amount: 1000,
    });

    expect(payment).toHaveProperty("transactionId");
    expect(payment).toHaveProperty("status", "PROCESSING");
    expect(payment).toHaveProperty("message");
    expect(typeof payment.transactionId).toBe("string");
    expect(payment.transactionId.length).toBeGreaterThan(0);
  });

  it("should prevent duplicate payment submissions", async () => {
    const quote = await getQuote("USD", "EUR", 1000);
    const paymentRequest = {
      quoteId: quote.quoteId,
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      amount: 1000,
    };

    // First submission should succeed
    const payment1 = await submitPayment(paymentRequest);
    expect(payment1.transactionId).toBeDefined();

    // Second immediate submission should fail
    await expect(submitPayment(paymentRequest)).rejects.toThrow(
      "DUPLICATE_PAYMENT",
    );
  });

  it("should create a transaction that can be retrieved", async () => {
    const quote = await getQuote("USD", "EUR", 1000);
    const payment = await submitPayment({
      quoteId: quote.quoteId,
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      amount: 1000,
    });

    const transaction = await getTransactionStatus(payment.transactionId);
    expect(transaction.transactionId).toBe(payment.transactionId);
    expect(transaction.status).toBe("PROCESSING");
  });
});

describe("Mock API - getTransactionStatus", () => {
  beforeEach(() => {
    resetMockConfig();
    clearMockData();
    setMockConfig({ deterministicMode: true });
  });

  it("should return transaction details", async () => {
    const quote = await getQuote("USD", "EUR", 1000);
    const payment = await submitPayment({
      quoteId: quote.quoteId,
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      amount: 1000,
    });

    const transaction = await getTransactionStatus(payment.transactionId);

    expect(transaction).toHaveProperty("transactionId");
    expect(transaction).toHaveProperty("status");
    expect(transaction).toHaveProperty("sourceCurrency", "USD");
    expect(transaction).toHaveProperty("destinationCurrency", "EUR");
    expect(transaction).toHaveProperty("sourceAmount", 1000);
    expect(transaction).toHaveProperty("destinationAmount");
    expect(transaction).toHaveProperty("rate");
    expect(transaction).toHaveProperty("fee");
    expect(transaction).toHaveProperty("createdAt");
    expect(transaction).toHaveProperty("updatedAt");
    expect(transaction).toHaveProperty("statusMessage");
  });

  it("should throw error for non-existent transaction", async () => {
    await expect(getTransactionStatus("non-existent-id")).rejects.toThrow(
      "TRANSACTION_NOT_FOUND",
    );
  });

  it("should progress transaction through states over time", async () => {
    clearMockData(); // Clear before setting up test
    setMockConfig({
      deterministicMode: true,
      transactionProcessingTime: 300,
      transactionSettlementTime: 300,
    });

    const quote = await getQuote("USD", "EUR", 1000);
    const payment = await submitPayment({
      quoteId: quote.quoteId,
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      amount: 1000,
    });

    // PaymentResponse tells us initial status
    expect(payment.status).toBe("PROCESSING");

    // The transaction starts as PROCESSING, progresses to SENT, then to SETTLED
    // Let's just verify it reaches SETTLED eventually
    await new Promise((resolve) => setTimeout(resolve, 800));
    const finalTx = await getTransactionStatus(payment.transactionId);
    expect(finalTx.status).toBe("SETTLED");
  }, 10000); // Increase test timeout
});

describe("Mock API - Edge Cases", () => {
  beforeEach(() => {
    resetMockConfig();
    clearMockData();
  });

  it("should handle network delays", async () => {
    setMockConfig({
      deterministicMode: true,
      networkDelay: { min: 100, max: 100 },
    });

    const start = Date.now();
    await getQuote("USD", "EUR", 1000);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it("should simulate quote failures when configured", async () => {
    setMockConfig({
      deterministicMode: false,
      quoteFailureRate: 1.0, // 100% failure rate
    });

    await expect(getQuote("USD", "EUR", 1000)).rejects.toThrow();
  });

  it("should simulate payment failures when configured", async () => {
    // Set deterministic mode for quote, but enable payment failures
    setMockConfig({
      deterministicMode: true,
      quoteFailureRate: 0, // Don't fail quotes
      paymentFailureRate: 1.0, // 100% payment failure rate
    });

    const quote = await getQuote("USD", "EUR", 1000);

    // Now disable deterministic mode for payment to trigger failure
    setMockConfig({
      deterministicMode: false,
      paymentFailureRate: 1.0,
    });

    await expect(
      submitPayment({
        quoteId: quote.quoteId,
        sourceCurrency: "USD",
        destinationCurrency: "EUR",
        amount: 1000,
      }),
    ).rejects.toThrow();
  });
});
