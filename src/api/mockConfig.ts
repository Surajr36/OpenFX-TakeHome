// Mock API Configuration
export interface MockConfig {
  networkDelay: {
    min: number;
    max: number;
  };
  quoteFailureRate: number;
  paymentFailureRate: number;
  transactionFailureRate: number;
  deterministicMode: boolean;
  quoteExpirySeconds: number;
  transactionProcessingTime: number; // Time to move from PROCESSING to SENT
  transactionSettlementTime: number; // Time to move from SENT to SETTLED
}

export const DEFAULT_MOCK_CONFIG: MockConfig = {
  networkDelay: { min: 300, max: 1000 },
  quoteFailureRate: 0.1, // 10% chance of failure
  paymentFailureRate: 0.05, // 5% chance of failure
  transactionFailureRate: 0.03, // 3% chance of failure
  deterministicMode: false,
  quoteExpirySeconds: 30,
  transactionProcessingTime: 5000, // 5 seconds
  transactionSettlementTime: 8000, // 8 seconds additional
};

let mockConfig = { ...DEFAULT_MOCK_CONFIG };

export const getMockConfig = (): MockConfig => mockConfig;

export const setMockConfig = (config: Partial<MockConfig>) => {
  mockConfig = { ...mockConfig, ...config };
};

export const resetMockConfig = () => {
  mockConfig = { ...DEFAULT_MOCK_CONFIG };
};
