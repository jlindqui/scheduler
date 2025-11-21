'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function GoogleAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // Track page views on route changes
  useEffect(() => {
    if (!gaId) return;
    
    // Skip tracking for product pages (double safety check)
    if (pathname?.startsWith('/product')) {
      console.warn('GA: Blocked product page tracking attempt:', pathname);
      return;
    }
    
    // Function to send page view
    const sendPageView = () => {
      if (typeof window === 'undefined' || !window.gtag) {
        setTimeout(sendPageView, 500);
        return;
      }
      
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      
      // Wait for document.title to update (Next.js updates it after navigation)
      const checkTitle = () => {
        const title = document.title;
        
        // Send as explicit pageview event (more reliable for SPAs)
        window.gtag('event', 'page_view', {
          page_path: url,
          page_title: title,
          page_location: `${window.location.origin}${url}`,
          send_to: gaId
        });
      };
      
      // Wait a bit for title to update after navigation
      setTimeout(checkTitle, 250);
    };
    
    // Send page view
    sendPageView();
  }, [pathname, searchParams, gaId]);

  // Don't render the component if GA ID is not available
  if (!gaId) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              send_page_view: false
            });
            
            // Make gtag available globally for custom events
            window.gtag = gtag;
          `,
        }}
      />
    </>
  );
}

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner />
    </Suspense>
  );
}

// Helper function to track conversion events
export const trackConversion = (eventName: string, parameters: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      event_category: 'conversion',
      event_label: 'waitlist_signup',
      value: 1,
      ...parameters
    });
  }
};

// Helper function to track waitlist button clicks (funnel tracking)
export const trackWaitlistButtonClick = (source: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'waitlist_button_click', {
      event_category: 'engagement',
      event_label: source,
      value: 1,
      page_location: window.location.href,
      click_source: source
    });
  }
};

// Helper function to track waitlist signup conversion
export const trackWaitlistSignup = (userRole?: string, organization?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    const referrer = document.referrer || 'direct';
    const source = new URLSearchParams(window.location.search).get('utm_source') || 'organic';
    
    // Track the main conversion event
    window.gtag('event', 'conversion', {
      send_to: process.env.NEXT_PUBLIC_GA_ID,
      event_category: 'lead_generation',
      event_label: 'waitlist_signup',
      value: 1,
      custom_parameters: {
        user_role: userRole || 'unknown',
        organization_type: organization || 'unknown',
        referrer: referrer,
        traffic_source: source
      }
    });

    // Also track as a custom goal
    window.gtag('event', 'waitlist_signup', {
      event_category: 'engagement',
      event_label: 'signup_form',
      value: 1,
      user_role: userRole,
      organization: organization,
      referrer: referrer,
      traffic_source: source
    });

    // Track specific conversion action for Google Ads (if applicable)
    window.gtag('event', 'signup', {
      event_category: 'conversion',
      send_to: process.env.NEXT_PUBLIC_GA_ID,
      value: 1,
      currency: 'USD'
    });
  }
}; 