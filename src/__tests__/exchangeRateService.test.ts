import { describe, it, expect, beforeEach } from "vitest";
import {
  getExchangeRate,
  checkRealAPIHealth,
} from "../api/exchangeRateService";
import { API_CONFIG, setUseRealAPI } from "../config/apiConfig";

describe("Exchange Rate Service", () => {
  beforeEach(() => {
    // Reset to mock mode for each test
    setUseRealAPI(false);
  });

  describe("Mock Mode", () => {
    it("should return exchange rate in mock mode", async () => {
      setUseRealAPI(false);

      const rate = await getExchangeRate("USD", "EUR");

      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(2); // Reasonable range
    });

    it("should apply spread to mock rates", async () => {
      setUseRealAPI(false);

      const rate1 = await getExchangeRate("USD", "EUR");
      const rate2 = await getExchangeRate("EUR", "USD");

      // The inverse should not be exact due to spread
      expect(Math.abs(rate1 * rate2 - 1)).toBeGreaterThan(0);
    });

    it("should handle same currency exchange", async () => {
      setUseRealAPI(false);

      const rate = await getExchangeRate("USD", "USD");

      expect(rate).toBe(1);
    });
  });

  describe("Real API Mode", () => {
    it("should fetch live exchange rate", async () => {
      setUseRealAPI(true);

      try {
        const rate = await getExchangeRate("USD", "EUR");

        expect(rate).toBeGreaterThan(0);
        expect(rate).toBeLessThan(2); // Reasonable range
      } catch (error) {
        // API might be unavailable - fallback should work
        if (API_CONFIG.fallbackToMock) {
          expect(error).toBeUndefined();
        }
      }
    }, 10000); // 10s timeout for network request

    it("should handle API health check", async () => {
      const isHealthy = await checkRealAPIHealth();

      // Should return boolean
      expect(typeof isHealthy).toBe("boolean");
    }, 10000);

    it("should fall back to mock when API fails", async () => {
      setUseRealAPI(true);
      API_CONFIG.realAPIEndpoint = "https://invalid-api-endpoint.example.com";

      const rate = await getExchangeRate("USD", "EUR");

      // Should still return a valid rate due to fallback
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(2);

      // Restore endpoint
      API_CONFIG.realAPIEndpoint = "https://api.frankfurter.app";
    });
  });

  describe("Configuration", () => {
    it("should toggle between mock and real API", () => {
      expect(API_CONFIG.useRealAPI).toBe(false);

      setUseRealAPI(true);
      expect(API_CONFIG.useRealAPI).toBe(true);

      setUseRealAPI(false);
      expect(API_CONFIG.useRealAPI).toBe(false);
    });
  });
});
