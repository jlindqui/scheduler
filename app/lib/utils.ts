import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isYesterday, isThisYear } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

/**
 * Smart date formatting that shows relative dates for recent times
 * Examples: "Today at 3:45pm", "Yesterday at 2:30pm", "Nov 15th", "Dec 31st, 2023"
 */
export function formatSmartDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isToday(d)) {
    return `Today at ${format(d, 'h:mmaaa')}`.toLowerCase().replace('am', 'am').replace('pm', 'pm');
  }

  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mmaaa')}`.toLowerCase().replace('am', 'am').replace('pm', 'pm');
  }

  // Within this year: "Nov 15th at 3:45pm"
  if (isThisYear(d)) {
    const day = format(d, 'd');
    const suffix = getDaySuffix(parseInt(day));
    return `${format(d, 'MMM')} ${day}${suffix}`;
  }

  // Different year: "Dec 31st, 2023"
  const day = format(d, 'd');
  const suffix = getDaySuffix(parseInt(day));
  return `${format(d, 'MMM')} ${day}${suffix}, ${format(d, 'yyyy')}`;
}

/**
 * Smart date formatting for dates only (no time)
 * Examples: "Nov 15th", "Dec 31st, 2023"
 */
export function formatSmartDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const day = format(d, 'd');
  const suffix = getDaySuffix(parseInt(day));

  // Within this year: "Nov 15th"
  if (isThisYear(d)) {
    return `${format(d, 'MMM')} ${day}${suffix}`;
  }

  // Different year: "Dec 31st, 2023"
  return `${format(d, 'MMM')} ${day}${suffix}, ${format(d, 'yyyy')}`;
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export const generatePagination = (currentPage: number, totalPages: number) => {
  // If the total number of pages is 7 or less,
  // display all pages without any ellipsis.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If the current page is among the first 3 pages,
  // show the first 3, an ellipsis, and the last 2 pages.
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  // If the current page is among the last 3 pages,
  // show the first 2, an ellipsis, and the last 3 pages.
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // If the current page is somewhere in the middle,
  // show the first page, an ellipsis, the current page and its neighbors,
  // another ellipsis, and the last page.
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
};
