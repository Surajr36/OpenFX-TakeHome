export const API_CONFIG = {
  //Keep it as true to use Frankfurter API. Else false and it'll point to mockApi.ts
  useRealAPI: true,
  realAPIEndpoint: "https://api.frankfurter.app",

  // In case if we want to use mock if real fetch doesn't work
  fallbackToMock: true,
};

export const setUseRealAPI = (value: boolean) => {
  API_CONFIG.useRealAPI = value;
};
