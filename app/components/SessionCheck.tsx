"use client";

import { useSession } from "@/lib/auth/use-auth-session";
import { useRouter } from "next/navigation";
import { useEffect, memo } from "react";

const SessionCheck = memo(function SessionCheck() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If the session status is 'unauthenticated', redirect to login
    if (!isPending && session === null) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  // This component doesn't render anything
  return null;
});

export default SessionCheck;
