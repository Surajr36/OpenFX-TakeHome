import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/useApp";
import { submitPayment } from "../api/mockApi";
import { CURRENCIES } from "../constants/currencies";

const ConfirmScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { quote } = state;

  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isQuoteExpired, setIsQuoteExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if payment has been submitted to prevent double submission
  const paymentSubmittedRef = useRef(false);

  useEffect(() => {
    if (!quote) {
      navigate("/");
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((quote.expiresAt - Date.now()) / 1000),
      );
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setIsQuoteExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [quote, navigate]);

  const handlePay = async () => {
    // Prevent double submission
    if (
      !quote ||
      isQuoteExpired ||
      isSubmitting ||
      paymentSubmittedRef.current
    ) {
      return;
    }

    if (Date.now() >= quote.expiresAt) {
      setIsQuoteExpired(true);
      dispatch({
        type: "SET_ERROR",
        payload: "Quote has expired. Please go back and get a new quote.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      paymentSubmittedRef.current = true;
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const paymentRequest = {
        quoteId: quote.quoteId,
        sourceCurrency: quote.sourceCurrency,
        destinationCurrency: quote.destinationCurrency,
        amount: quote.sourceAmount,
      };

      const response = await submitPayment(paymentRequest);

      const transaction = {
        transactionId: response.transactionId,
        status: response.status,
        sourceCurrency: quote.sourceCurrency,
        destinationCurrency: quote.destinationCurrency,
        sourceAmount: quote.sourceAmount,
        destinationAmount: quote.destinationAmount,
        rate: quote.rate,
        fee: quote.fee,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        statusMessage: response.message,
      };

      dispatch({ type: "SET_TRANSACTION", payload: transaction });
      navigate("/status");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      dispatch({ type: "SET_ERROR", payload: message });
      setIsSubmitting(false);
      paymentSubmittedRef.current = false;
    }
  };

  const handleBack = () => {
    dispatch({ type: "CLEAR_QUOTE" });
    navigate("/");
  };

  if (!quote) {
    return null;
  }

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
            Confirm Payment
          </h1>

          <div
            className={`mb-6 p-4 rounded-lg border ${
              isQuoteExpired
                ? "bg-red-50 border-red-200"
                : timeRemaining <= 10
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold">
                {isQuoteExpired ? "⏰ Quote Expired" : "⏰ Quote Expiry"}
              </span>
              <span
                className={`font-bold ${
                  isQuoteExpired
                    ? "text-red-600"
                    : timeRemaining <= 10
                      ? "text-yellow-600"
                      : "text-blue-600"
                }`}
              >
                {isQuoteExpired ? "EXPIRED" : formatTime(timeRemaining)}
              </span>
            </div>
            {isQuoteExpired && (
              <p className="mt-2 text-sm text-red-600">
                This quote has expired. Please go back and request a new quote.
              </p>
            )}
          </div>

          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Transaction Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">From:</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(quote.sourceAmount, quote.sourceCurrency)}{" "}
                  {quote.sourceCurrency}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">To:</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(
                    quote.destinationAmount,
                    quote.destinationCurrency,
                  )}{" "}
                  {quote.destinationCurrency}
                </span>
              </div>

              <div className="pt-3 border-t border-gray-300">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Exchange Rate:</span>
                  <span className="font-medium">
                    1 {quote.sourceCurrency} = {quote.rate.toFixed(4)}{" "}
                    {quote.destinationCurrency}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Transfer Fee:</span>
                  <span className="font-medium">
                    {formatCurrency(quote.fee, quote.sourceCurrency)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-gray-400 flex justify-between">
                <span className="text-gray-900 font-bold text-lg">
                  Total to Pay:
                </span>
                <span className="font-bold text-2xl text-blue-600">
                  {formatCurrency(quote.totalPayable, quote.sourceCurrency)}
                </span>
              </div>
            </div>
          </div>

          {state.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-semibold">
                ⚠️ {state.error}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              onClick={handlePay}
              disabled={isQuoteExpired || isSubmitting}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors relative"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "💳 Pay Now"
              )}
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> By clicking "Pay Now", you authorize this
              payment. The transaction will be processed and you will be able to
              track its status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmScreen;
