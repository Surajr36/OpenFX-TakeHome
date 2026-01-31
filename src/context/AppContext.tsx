import React, { createContext, useReducer } from "react";
import type { ReactNode } from "react";
import type { Quote, Transaction } from "../types";

// Application State
export interface AppState {
  currentStep: "quote" | "confirm" | "status";
  quote: Quote | null;
  transaction: Transaction | null;
  isLoading: boolean;
  error: string | null;
}

// Action Types
export type AppAction =
  | { type: "SET_QUOTE"; payload: Quote }
  | { type: "CLEAR_QUOTE" }
  | { type: "SET_TRANSACTION"; payload: Transaction }
  | { type: "UPDATE_TRANSACTION"; payload: Transaction }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "GO_TO_STEP"; payload: "quote" | "confirm" | "status" }
  | { type: "RESET" };

// Initial State
const initialState: AppState = {
  currentStep: "quote",
  quote: null,
  transaction: null,
  isLoading: false,
  error: null,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_QUOTE":
      return {
        ...state,
        quote: action.payload,
        error: null,
        currentStep: "confirm",
      };

    case "CLEAR_QUOTE":
      return {
        ...state,
        quote: null,
      };

    case "SET_TRANSACTION":
      return {
        ...state,
        transaction: action.payload,
        currentStep: "status",
        isLoading: false,
        error: null,
      };

    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transaction: action.payload,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error, // Clear error when starting new loading
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case "GO_TO_STEP":
      return {
        ...state,
        currentStep: action.payload,
        error: null,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
};

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Props
interface AppProviderProps {
  children: ReactNode;
}

// Provider Component
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
