import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/useApp";
import { getQuote } from "../api/mockApi";
import { CURRENCIES } from "../constants/currencies";
import type { Quote } from "../types";

const QuoteScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();

  const [sourceCurrency, setSourceCurrency] = useState("USD");
  const [destinationCurrency, setDestinationCurrency] = useState("EUR");
  const [amount, setAmount] = useState("1000");
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isQuoteExpired, setIsQuoteExpired] = useState(false);

  useEffect(() => {
    if (!currentQuote) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((currentQuote.expiresAt - Date.now()) / 1000),
      );
      setTimeRemaining(remaining);
      setIsQuoteExpired(remaining === 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentQuote]);

  const handleGetQuote = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid amount greater than zero");
      }

      const quote = await getQuote(
        sourceCurrency,
        destinationCurrency,
        numAmount,
      );
      setCurrentQuote(quote);
      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      dispatch({ type: "SET_ERROR", payload: message });
      setCurrentQuote(null);
    }
  };

  const handleContinue = () => {
    if (currentQuote && !isQuoteExpired) {
      dispatch({ type: "SET_QUOTE", payload: currentQuote });
      navigate("/confirm");
    }
  };

  const handleRefreshQuote = () => {
    setCurrentQuote(null);
    setIsQuoteExpired(false);
    handleGetQuote();
  };

  const formatCurrency = (value: number, currency: string) => {
    const currencyData = CURRENCIES.find((c) => c.code === currency);
    return `${currencyData?.symbol || ""}${value.toFixed(2)}`;
  };

  const formatTime = (seconds: number): string => {
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Get Exchange Quote
          </h1>

          <div className="space-y-4 mb-6">
            <div>
              <label
                htmlFor="source-currency"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                From Currency
              </label>
              <select
                id="source-currency"
                value={sourceCurrency}
                onChange={(e) => setSourceCurrency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={state.isLoading}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="destination-currency"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                To Currency
              </label>
              <select
                id="destination-currency"
                value={destinationCurrency}
                onChange={(e) => setDestinationCurrency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={state.isLoading}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Amount
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter amount"
                disabled={state.isLoading}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {state.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{state.error}</p>
            </div>
          )}

          <button
            onClick={handleGetQuote}
            disabled={state.isLoading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {state.isLoading ? "Fetching Quote..." : "Get Quote"}
          </button>

          {currentQuote && (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Quote
                </h2>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    isQuoteExpired
                      ? "bg-red-100 text-red-800"
                      : timeRemaining <= 10
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                  }`}
                >
                  {isQuoteExpired
                    ? "EXPIRED"
                    : `Expires in ${formatTime(timeRemaining)}`}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Exchange Rate:</span>
                  <span className="font-semibold">
                    1 {sourceCurrency} = {currentQuote.rate.toFixed(4)}{" "}
                    {destinationCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">
                    {formatCurrency(currentQuote.sourceAmount, sourceCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee:</span>
                  <span className="font-semibold">
                    {formatCurrency(currentQuote.fee, sourceCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recipient Gets:</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(
                      currentQuote.destinationAmount,
                      destinationCurrency,
                    )}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-300 flex justify-between">
                  <span className="text-gray-900 font-semibold">
                    Total Payable:
                  </span>
                  <span className="font-bold text-xl text-blue-600">
                    {formatCurrency(currentQuote.totalPayable, sourceCurrency)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleRefreshQuote}
                  disabled={state.isLoading}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                >
                  Refresh Quote
                </button>
                <button
                  onClick={handleContinue}
                  disabled={isQuoteExpired || state.isLoading}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>

              {isQuoteExpired && (
                <p className="mt-3 text-sm text-red-600 text-center">
                  This quote has expired. Please refresh to get a new quote.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteScreen;
