import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/useApp";
import { getTransactionStatus } from "../api/mockApi";
import { CURRENCIES } from "../constants/currencies";
import type { TransactionStatus as TxStatus } from "../types";

const StatusScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { transaction } = state;

  const [isPolling, setIsPolling] = useState(true);
  const pollingIntervalRef = useRef<number | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction) {
      navigate("/");
      return;
    }

    const pollStatus = async () => {
      try {
        const updatedTransaction = await getTransactionStatus(
          transaction.transactionId,
        );
        dispatch({ type: "UPDATE_TRANSACTION", payload: updatedTransaction });

        if (
          updatedTransaction.status === "SETTLED" ||
          updatedTransaction.status === "FAILED"
        ) {
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }

        setPollingError(null);
      } catch (error) {
        console.error("Polling error:", error);
        const message =
          error instanceof Error ? error.message : "Connection error";
        setPollingError(message);
      }
    };

    pollStatus();

    pollingIntervalRef.current = setInterval(
      pollStatus,
      2000,
    ) as unknown as number;

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [transaction, dispatch, navigate]);

  const handleRetry = async () => {
    if (!transaction) return;

    try {
      setPollingError(null);
      const updatedTransaction = await getTransactionStatus(
        transaction.transactionId,
      );
      dispatch({ type: "UPDATE_TRANSACTION", payload: updatedTransaction });

      if (
        updatedTransaction.status !== "SETTLED" &&
        updatedTransaction.status !== "FAILED"
      ) {
        setIsPolling(true);
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const tx = await getTransactionStatus(transaction.transactionId);
            dispatch({ type: "UPDATE_TRANSACTION", payload: tx });
            if (tx.status === "SETTLED" || tx.status === "FAILED") {
              setIsPolling(false);
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          } catch (error) {
            console.error("Polling error:", error);
          }
        }, 2000) as unknown as number;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to retry";
      setPollingError(message);
    }
  };

  const handleNewTransaction = () => {
    dispatch({ type: "RESET" });
    navigate("/");
  };

  if (!transaction) {
    return null;
  }

  const formatCurrency = (value: number, currency: string) => {
    const currencyData = CURRENCIES.find((c) => c.code === currency);
    return `${currencyData?.symbol || ""}${value.toFixed(2)}`;
  };

  const getStatusColor = (status: TxStatus) => {
    switch (status) {
      case "PROCESSING":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "SENT":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "SETTLED":
        return "bg-green-100 text-green-800 border-green-300";
      case "FAILED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: TxStatus) => {
    switch (status) {
      case "PROCESSING":
        return "⏳";
      case "SENT":
        return "✈️";
      case "SETTLED":
        return "✅";
      case "FAILED":
        return "❌";
      default:
        return "❓";
    }
  };

  const renderProgressBar = () => {
    let progress = 0;
    switch (transaction.status) {
      case "PROCESSING":
        progress = 33;
        break;
      case "SENT":
        progress = 66;
        break;
      case "SETTLED":
        progress = 100;
        break;
      case "FAILED":
        progress = 0;
        break;
    }

    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            transaction.status === "FAILED" ? "bg-red-600" : "bg-green-600"
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };

  const renderStatusSteps = () => {
    const steps = [
      { status: "PROCESSING", label: "Processing" },
      { status: "SENT", label: "Sent" },
      { status: "SETTLED", label: "Settled" },
    ];

    const currentIndex = steps.findIndex(
      (step) => step.status === transaction.status,
    );

    return (
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => {
          const isActive =
            index <= currentIndex && transaction.status !== "FAILED";
          const isCurrent = step.status === transaction.status;

          return (
            <div
              key={step.status}
              className="flex flex-col items-center flex-1"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 ${
                  isActive
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-gray-200 text-gray-500 border-gray-300"
                }`}
              >
                {isActive ? "✓" : index + 1}
              </div>
              <span
                className={`mt-2 text-sm font-medium ${
                  isCurrent ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Transaction Status
          </h1>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
            <p className="text-sm font-mono font-semibold text-gray-900 break-all">
              {transaction.transactionId}
            </p>
          </div>

          <div className="mb-6 flex justify-center">
            <div
              className={`px-6 py-3 rounded-lg border-2 ${getStatusColor(
                transaction.status,
              )} inline-flex items-center gap-2`}
            >
              <span className="text-2xl">
                {getStatusIcon(transaction.status)}
              </span>
              <span className="text-xl font-bold uppercase">
                {transaction.status}
              </span>
            </div>
          </div>

          {transaction.status !== "FAILED" && renderStatusSteps()}

          {renderProgressBar()}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 font-medium">
              {transaction.statusMessage}
            </p>
            {isPolling && transaction.status !== "FAILED" && (
              <p className="text-sm text-blue-700 mt-2 flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
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
                Checking for updates...
              </p>
            )}
          </div>

          {pollingError && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-900 font-medium mb-2">
                ⚠️ Connection Issue
              </p>
              <p className="text-sm text-yellow-800 mb-3">{pollingError}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transaction Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span className="font-semibold">
                  {formatCurrency(
                    transaction.sourceAmount,
                    transaction.sourceCurrency,
                  )}{" "}
                  {transaction.sourceCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-semibold">
                  {formatCurrency(
                    transaction.destinationAmount,
                    transaction.destinationCurrency,
                  )}{" "}
                  {transaction.destinationCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Exchange Rate:</span>
                <span className="font-medium">
                  1 {transaction.sourceCurrency} = {transaction.rate.toFixed(4)}{" "}
                  {transaction.destinationCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fee:</span>
                <span className="font-medium">
                  {formatCurrency(transaction.fee, transaction.sourceCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {new Date(transaction.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {transaction.status === "FAILED" && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-900 font-semibold mb-2">
                Transaction Failed
              </p>
              <p className="text-sm text-red-800 mb-4">
                Please contact support with your transaction ID or try again
                with a new transaction.
              </p>
              <button
                onClick={handleNewTransaction}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Start New Transaction
              </button>
            </div>
          )}

          {transaction.status === "SETTLED" && (
            <div className="mb-6">
              <button
                onClick={handleNewTransaction}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Make Another Transfer
              </button>
            </div>
          )}

          <button
            onClick={handleNewTransaction}
            className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusScreen;
