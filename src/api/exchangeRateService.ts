import { API_CONFIG } from "../config/apiConfig";

// Mock data
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

const fetchRealExchangeRate = async (
  from: string,
  to: string,
): Promise<number> => {
  try {
    const response = await fetch(
      `${API_CONFIG.realAPIEndpoint}/latest?from=${from}&to=${to}`,
    );

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    const rate = data.rates[to];

    if (!rate) {
      throw new Error(`Rate not found for ${from} to ${to}`);
    }

    return rate;
  } catch (error) {
    console.error("Failed to fetch real exchange rate:", error);

    if (API_CONFIG.fallbackToMock) {
      console.warn("Falling back to mock exchange rate");
      return calculateMockRate(from, to);
    }

    throw new Error("Unable to fetch exchange rate. Please try again.");
  }
};

export const calculateMockRate = (from: string, to: string): number => {
  const fromRate = BASE_RATES[from] || 1;
  const toRate = BASE_RATES[to] || 1;
  const midRate = toRate / fromRate;

  const spread = Math.random() * 0.015 + 0.005;
  return midRate * (1 - spread);
};

export const getExchangeRate = async (
  from: string,
  to: string,
): Promise<number> => {
  //   Currency validation
  if (!BASE_RATES[from] || !BASE_RATES[to]) {
    throw new Error("UNSUPPORTED_CURRENCY: Currency not supported.");
  }
  //Corner case
  if (from === to) {
    return 1.0;
  }

  if (API_CONFIG.useRealAPI) {
    console.log(`📊 Fetching real exchange rate: ${from} → ${to}`);
    return fetchRealExchangeRate(from, to);
  } else {
    console.log(`🎭 Using mock exchange rate: ${from} → ${to}`);
    return calculateMockRate(from, to);
  }
};

export const checkRealAPIHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(
      `${API_CONFIG.realAPIEndpoint}/latest?from=USD&to=EUR`,
    );
    return response.ok;
  } catch {
    return false;
  }
};
