"use client";

import { useSession } from "@/lib/auth/use-auth-session";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface SessionContextType {
  refreshSession: () => Promise<void>;
  isSessionValid: boolean;
  lastActivity: Date | null;
  session: any; // Better Auth session type
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
}

function SessionManager({ children }: { children: ReactNode }) {
  const { data: session, isPending, refetch } = useSession();
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(true);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(new Date());
    };

    // Track various user interactions
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      document.addEventListener(event, updateActivity, true);
    });

    // Initial activity
    updateActivity();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // Proactive session refresh for active users
  useEffect(() => {
    if (!session?.user || isPending) return;

    const refreshInterval = setInterval(
      async () => {
        const now = new Date();
        const timeSinceActivity = lastActivity
          ? now.getTime() - lastActivity.getTime()
          : 0;

        // Only refresh if user has been active in the last 5 minutes
        if (timeSinceActivity < 5 * 60 * 1000) {
          try {
            await refetch();
            console.log("Session refreshed automatically");
          } catch (error) {
            console.error("Failed to refresh session:", error);
            setIsSessionValid(false);
          }
        }
      },
      5 * 60 * 1000
    ); // Every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [session, lastActivity, refetch, isPending]);

  // Validate session and organization access
  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        const hasValidOrganization = session.user.organization?.id;
        setIsSessionValid(!!hasValidOrganization);

        if (!hasValidOrganization) {
          console.warn("Session exists but no organization access found");
        }
      } else {
        setIsSessionValid(false);
      }
    }
  }, [session, isPending]);

  const refreshSession = async () => {
    try {
      await refetch();
      setIsSessionValid(true);
      console.log("Session refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh session:", error);
      setIsSessionValid(false);
      throw error;
    }
  };

  const contextValue: SessionContextType = {
    refreshSession,
    isSessionValid,
    lastActivity,
    session,
    isLoading: isPending,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  return <SessionManager>{children}</SessionManager>;
}
