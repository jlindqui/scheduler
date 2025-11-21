"use client";

import { usePathname } from "next/navigation";
import SiteNavigation from "./SiteNavigation";
import GoogleAnalytics from "./GoogleAnalytics";
import SessionProvider from "./SessionProvider";
import ErrorBoundary from "./ErrorBoundary";
import ModalProvider from "./ModalProvider";
import { Analytics } from "@vercel/analytics/react";

export default function RootClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith("/product");

  return (
    <SessionProvider>
      <ErrorBoundary>
        {!isProductPage && <GoogleAnalytics />}
        {!isProductPage && <SiteNavigation />}
        <div>
          <ModalProvider>{children}</ModalProvider>
        </div>
        {!isProductPage && <Analytics />}
      </ErrorBoundary>
    </SessionProvider>
  );
}
