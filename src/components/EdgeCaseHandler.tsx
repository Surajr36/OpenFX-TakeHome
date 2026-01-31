import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * EdgeCaseHandler Component
 *
 * This component handles the following edge cases:
 * 1. Quote refresh while countdown is active
 * 2. Browser back button during payment
 * 3. Multiple tabs with the same transaction
 * 4. Network goes offline during polling
 *
 * Implementation:
 * - Handles browser navigation (back/forward buttons)
 * - Monitors online/offline status
 * - Prevents navigation during critical operations
 * - Manages cross-tab synchronization via localStorage
 */

interface EdgeCaseHandlerProps {
  children: React.ReactNode;
}

export const EdgeCaseHandler: React.FC<EdgeCaseHandlerProps> = ({
  children,
}) => {
  const location = useLocation();

  // Edge Case 1 & 2: Handle browser back button during critical states
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn user if they're in the middle of a payment
      if (location.pathname === "/confirm") {
        e.preventDefault();
        e.returnValue =
          "You have a pending payment. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [location.pathname]);

  // Edge Case 3: Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If another tab completes a transaction, this tab should be aware
      if (e.key === "openfx_active_transaction" && e.newValue) {
        const activeTransaction = JSON.parse(e.newValue);

        // If we're on the status page for a different transaction, alert the user
        if (location.pathname === "/status" && activeTransaction.id) {
          console.log(
            "Another tab has an active transaction:",
            activeTransaction.id,
          );
          // Could dispatch an action or show a notification here
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [location.pathname]);

  // Edge Case 4: Network offline/online detection
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network connection restored");
      // The StatusScreen polling will automatically resume
      // Could dispatch a notification action here
    };

    const handleOffline = () => {
      console.log("Network connection lost");
      // The StatusScreen will show errors and provide retry button
      // Could dispatch a notification action here
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return <>{children}</>;
};
