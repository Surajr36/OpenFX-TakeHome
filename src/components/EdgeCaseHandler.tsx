import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Currently I handle quote refresh during countdown, going back in browser during payment, multiple tabs and offline during polling

interface EdgeCaseHandlerProps {
  children: React.ReactNode;
}

export const EdgeCaseHandler: React.FC<EdgeCaseHandlerProps> = ({
  children,
}) => {
  const location = useLocation();

  // Handling back buttno issue
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
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

  // Multiple tab issue
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "openfx_active_transaction" && e.newValue) {
        const activeTransaction = JSON.parse(e.newValue);

        // Alert user if same transaction is active
        if (location.pathname === "/status" && activeTransaction.id) {
          console.log(
            "Another tab has an active transaction:",
            activeTransaction.id,
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [location.pathname]);

  // Network offline issue
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network connection restored");
    };

    const handleOffline = () => {
      console.log("Network connection lost");
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
