Deployed on https://open-fx-take-home.vercel.app/ . You can have a look. 

Rest of the README written using AI
# OpenFX - International Money Transfer
A simplified frontend for international money transfers built with React, TypeScript, and Tailwind CSS.

## Features

- **Quote Screen**: Get real-time exchange rates with countdown timer
- **Confirm & Pay**: Review and submit payment with double-submit prevention
- **Transaction Status**: Track payment progress with polling updates
- **Edge Case Handling**: Browser back button, offline detection, cross-tab sync
- **Real-Time Exchange Rates**: Toggle between mock rates and live API (Frankfurter)

## Tech Stack

- **Vite 7.2.4**: Build tool and dev server
- **React 19.2.0**: UI library
- **TypeScript 5.9.3**: Type safety
- **React Router 7.13.0**: Client-side routing
- **Tailwind CSS 3.x**: Utility-first CSS
- **Vitest 4.0.18**: Testing framework with 41 comprehensive tests
- **Context API + useReducer**: Global state management

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Build for Production

```bash
npm run build
```

## Exchange Rate Configuration

The app supports two modes for exchange rates:

### Mock Mode (Default)

Uses simulated exchange rates with realistic spreads. Ideal for demos and testing.

```typescript
// src/config/apiConfig.ts
export const API_CONFIG = {
  useRealAPI: false, // Use mock rates
  // ...
};
```

### Real API Mode

Fetches live exchange rates from [Frankfurter API](https://www.frankfurter.app/).

**To enable real-time rates:**

```typescript
// src/config/apiConfig.ts
export const API_CONFIG = {
  useRealAPI: true, // Use live rates
  realAPIEndpoint: "https://api.frankfurter.app",
  fallbackToMock: true, // Fall back to mock if API fails
};
```

**Features:**

- Live exchange rates updated in real-time
- No API key required
- Automatic fallback to mock rates if API is unavailable
- Same quote expiry logic (30 seconds) applies

**Note:** The Frankfurter API returns current exchange rates but doesn't provide quote IDs or expiry. The 30-second quote expiry logic is handled by the application layer.

## Project Structure

```
src/
├── api/
│   ├── exchangeRateService.ts  # Exchange rate abstraction (mock/real)
│   ├── mockApi.ts              # Mock backend API
│   └── mockConfig.ts           # Mock configuration
├── components/
│   └── EdgeCaseHandler.tsx     # Edge case handling
├── config/
│   └── apiConfig.ts            # API configuration (toggle real/mock)
├── constants/
│   └── currencies.ts           # Top 20 currencies
├── context/
│   ├── AppContext.tsx          # Global state management
│   └── useApp.ts               # Context hook
├── pages/
│   ├── QuoteScreen.tsx         # Currency selection & quote
│   ├── ConfirmScreen.tsx       # Payment confirmation
│   └── StatusScreen.tsx        # Transaction status
├── types/
│   └── index.ts                # TypeScript interfaces
└── __tests__/                  # 41 comprehensive tests
    ├── exchangeRateService.test.ts  # Exchange rate tests (7)
    ├── mockApi.test.ts         # API tests (17)
    ├── AppContext.test.tsx     # State management tests (10)
    └── QuoteScreen.test.tsx    # Component tests (7)
```

## Edge Cases Handled

1. **Quote Refresh**: Countdown timer warns when quote is about to expire
2. **Browser Back**: Warns users about losing unsaved data during payment
3. **Multiple Tabs**: Syncs transaction state across browser tabs
4. **Network Offline**: Detects offline status and shows appropriate warnings

## Testing

- Basic testing scenarios covered

## License

MIT
