import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AppProvider } from "../context/AppContext";
import { useApp } from "../context/useApp";
import type { Quote, Transaction } from "../types";

describe("AppContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider>{children}</AppProvider>
  );

  it("should provide initial state", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.state).toEqual({
      currentStep: "quote",
      quote: null,
      transaction: null,
      isLoading: false,
      error: null,
    });
  });

  it("should set quote and navigate to confirm step", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const mockQuote: Quote = {
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      sourceAmount: 1000,
      rate: 0.92,
      fee: 5.0,
      destinationAmount: 920,
      totalPayable: 1005,
      expiresAt: Date.now() + 30000,
      quoteId: "test-quote-id",
    };

    act(() => {
      result.current.dispatch({ type: "SET_QUOTE", payload: mockQuote });
    });

    expect(result.current.state.quote).toEqual(mockQuote);
    expect(result.current.state.currentStep).toBe("confirm");
    expect(result.current.state.error).toBeNull();
  });

  it("should clear quote", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const mockQuote: Quote = {
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      sourceAmount: 1000,
      rate: 0.92,
      fee: 5.0,
      destinationAmount: 920,
      totalPayable: 1005,
      expiresAt: Date.now() + 30000,
      quoteId: "test-quote-id",
    };

    act(() => {
      result.current.dispatch({ type: "SET_QUOTE", payload: mockQuote });
    });

    expect(result.current.state.quote).not.toBeNull();

    act(() => {
      result.current.dispatch({ type: "CLEAR_QUOTE" });
    });

    expect(result.current.state.quote).toBeNull();
  });

  it("should set transaction and navigate to status step", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const mockTransaction: Transaction = {
      transactionId: "test-tx-id",
      status: "PROCESSING",
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      sourceAmount: 1000,
      destinationAmount: 920,
      rate: 0.92,
      fee: 5.0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      statusMessage: "Processing payment",
    };

    act(() => {
      result.current.dispatch({
        type: "SET_TRANSACTION",
        payload: mockTransaction,
      });
    });

    expect(result.current.state.transaction).toEqual(mockTransaction);
    expect(result.current.state.currentStep).toBe("status");
    expect(result.current.state.isLoading).toBe(false);
  });

  it("should update transaction", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const initialTransaction: Transaction = {
      transactionId: "test-tx-id",
      status: "PROCESSING",
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      sourceAmount: 1000,
      destinationAmount: 920,
      rate: 0.92,
      fee: 5.0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      statusMessage: "Processing payment",
    };

    act(() => {
      result.current.dispatch({
        type: "SET_TRANSACTION",
        payload: initialTransaction,
      });
    });

    const updatedTransaction: Transaction = {
      ...initialTransaction,
      status: "SENT",
      statusMessage: "Payment sent",
      updatedAt: Date.now(),
    };

    act(() => {
      result.current.dispatch({
        type: "UPDATE_TRANSACTION",
        payload: updatedTransaction,
      });
    });

    expect(result.current.state.transaction?.status).toBe("SENT");
    expect(result.current.state.transaction?.statusMessage).toBe(
      "Payment sent",
    );
  });

  it("should handle loading state", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({ type: "SET_LOADING", payload: true });
    });

    expect(result.current.state.isLoading).toBe(true);

    act(() => {
      result.current.dispatch({ type: "SET_LOADING", payload: false });
    });

    expect(result.current.state.isLoading).toBe(false);
  });

  it("should handle error state", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({
        type: "SET_ERROR",
        payload: "Test error message",
      });
    });

    expect(result.current.state.error).toBe("Test error message");
    expect(result.current.state.isLoading).toBe(false);

    act(() => {
      result.current.dispatch({ type: "SET_ERROR", payload: null });
    });

    expect(result.current.state.error).toBeNull();
  });

  it("should clear error when loading starts", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({ type: "SET_ERROR", payload: "Test error" });
    });

    expect(result.current.state.error).toBe("Test error");

    act(() => {
      result.current.dispatch({ type: "SET_LOADING", payload: true });
    });

    expect(result.current.state.error).toBeNull();
  });

  it("should navigate between steps", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({ type: "GO_TO_STEP", payload: "confirm" });
    });

    expect(result.current.state.currentStep).toBe("confirm");

    act(() => {
      result.current.dispatch({ type: "GO_TO_STEP", payload: "status" });
    });

    expect(result.current.state.currentStep).toBe("status");
  });

  it("should reset to initial state", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    // Set some state
    act(() => {
      result.current.dispatch({ type: "SET_ERROR", payload: "Error" });
      result.current.dispatch({ type: "SET_LOADING", payload: true });
      result.current.dispatch({ type: "GO_TO_STEP", payload: "status" });
    });

    // Reset
    act(() => {
      result.current.dispatch({ type: "RESET" });
    });

    expect(result.current.state).toEqual({
      currentStep: "quote",
      quote: null,
      transaction: null,
      isLoading: false,
      error: null,
    });
  });
});
