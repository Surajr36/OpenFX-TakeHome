import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "../context/AppContext";
import QuoteScreen from "../pages/QuoteScreen";
import * as mockApi from "../api/mockApi";

// Mock the API
vi.mock("../api/mockApi");

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AppProvider>
      <BrowserRouter>{component}</BrowserRouter>
    </AppProvider>,
  );
};

describe("QuoteScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render quote form with currency selectors", () => {
    renderWithProviders(<QuoteScreen />);

    expect(screen.getByText("Get Exchange Quote")).toBeInTheDocument();
    expect(screen.getByLabelText(/from currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get quote/i }),
    ).toBeInTheDocument();
  });

  it("should fetch and display quote on form submission", async () => {
    const mockQuote = {
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

    vi.mocked(mockApi.getQuote).mockResolvedValue(mockQuote);

    renderWithProviders(<QuoteScreen />);

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "1000" } });

    const getQuoteButton = screen.getByRole("button", { name: /get quote/i });
    fireEvent.click(getQuoteButton);

    await waitFor(() => {
      expect(screen.getByText("Your Quote")).toBeInTheDocument();
    });

    expect(screen.getByText(/exchange rate:/i)).toBeInTheDocument();
    expect(screen.getByText(/recipient gets:/i)).toBeInTheDocument();
    expect(screen.getByText(/total payable:/i)).toBeInTheDocument();
  });

  it("should show countdown timer for quote expiry", async () => {
    const mockQuote = {
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      sourceAmount: 1000,
      rate: 0.92,
      fee: 5.0,
      destinationAmount: 920,
      totalPayable: 1005,
      expiresAt: Date.now() + 10000, // 10 seconds
      quoteId: "test-quote-id",
    };

    vi.mocked(mockApi.getQuote).mockResolvedValue(mockQuote);

    renderWithProviders(<QuoteScreen />);

    const getQuoteButton = screen.getByRole("button", { name: /get quote/i });
    fireEvent.click(getQuoteButton);

    await waitFor(() => {
      expect(screen.getByText(/expires in/i)).toBeInTheDocument();
    });
  });

  it("should disable continue button when quote is expired", async () => {
    const mockQuote = {
      sourceCurrency: "USD",
      destinationCurrency: "EUR",
      sourceAmount: 1000,
      rate: 0.92,
      fee: 5.0,
      destinationAmount: 920,
      totalPayable: 1005,
      expiresAt: Date.now() - 1000, // Already expired
      quoteId: "test-quote-id",
    };

    vi.mocked(mockApi.getQuote).mockResolvedValue(mockQuote);

    renderWithProviders(<QuoteScreen />);

    const getQuoteButton = screen.getByRole("button", { name: /get quote/i });
    fireEvent.click(getQuoteButton);

    await waitFor(() => {
      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });
  });

  it("should show error message on API failure", async () => {
    vi.mocked(mockApi.getQuote).mockRejectedValue(new Error("Network error"));

    renderWithProviders(<QuoteScreen />);

    const getQuoteButton = screen.getByRole("button", { name: /get quote/i });
    fireEvent.click(getQuoteButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("should validate amount input", async () => {
    renderWithProviders(<QuoteScreen />);

    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: "-100" } });

    const getQuoteButton = screen.getByRole("button", { name: /get quote/i });
    fireEvent.click(getQuoteButton);

    await waitFor(() => {
      expect(screen.getByText(/valid amount/i)).toBeInTheDocument();
    });
  });

  it("should allow refreshing quote", async () => {
    const mockQuote = {
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

    vi.mocked(mockApi.getQuote).mockResolvedValue(mockQuote);

    renderWithProviders(<QuoteScreen />);

    const getQuoteButton = screen.getByRole("button", { name: /get quote/i });
    fireEvent.click(getQuoteButton);

    await waitFor(() => {
      expect(screen.getByText("Your Quote")).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole("button", {
      name: /refresh quote/i,
    });
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockApi.getQuote).toHaveBeenCalledTimes(2);
    });
  });
});
