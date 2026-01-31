export type TransactionStatus = "PROCESSING" | "SENT" | "SETTLED" | "FAILED";

export interface Quote {
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  rate: number;
  fee: number;
  destinationAmount: number;
  totalPayable: number;
  expiresAt: number;
  quoteId: string;
}

export interface PaymentRequest {
  quoteId: string;
  sourceCurrency: string;
  destinationCurrency: string;
  amount: number;
}

export interface PaymentResponse {
  transactionId: string;
  status: TransactionStatus;
  message: string;
}

export interface Transaction {
  transactionId: string;
  status: TransactionStatus;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmount: number;
  rate: number;
  fee: number;
  createdAt: number;
  updatedAt: number;
  statusMessage: string;
}

export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
}
