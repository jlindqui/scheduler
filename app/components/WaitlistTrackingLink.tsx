'use client';

import Link from 'next/link';
import { trackWaitlistButtonClick } from './GoogleAnalytics';

interface WaitlistTrackingLinkProps {
  source: string;
  children: React.ReactNode;
  className?: string;
  href?: string;
}

export default function WaitlistTrackingLink({ 
  source, 
  children, 
  className = "",
  href = "/waitlist" 
}: WaitlistTrackingLinkProps) {
  const handleClick = () => {
    trackWaitlistButtonClick(source);
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}