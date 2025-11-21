import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date consistently across the application
 * Shows year only if it's not the current year (like email format)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = dateObj.getFullYear();
  
  if (dateYear === currentYear) {
    return dateObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  } else {
    return dateObj.toLocaleDateString("en-US", {
      month: "long", 
      day: "numeric",
      year: "numeric",
    });
  }
}

/**
 * Formats a date with time for detailed views
 * Shows year only if it's not the current year
 * @param date - Date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = dateObj.getFullYear();
  
  if (dateYear === currentYear) {
    return dateObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    return dateObj.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

/**
 * Formats dates for complaint headers with smart relative dates
 * Shows "Today" or "Yesterday" when applicable, otherwise shows month and day
 * @param createdAt - Creation date
 * @param updatedAt - Last update date
 * @param updatedBy - Name of person who last updated
 * @returns Formatted date string
 */
export function formatComplaintDates(
  createdAt: Date | string | null | undefined,
  updatedAt: Date | string | null | undefined,
  updatedBy?: string | null
): string {
  if (!createdAt || !updatedAt) return "N/A";
  
  const createdDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const updatedDate = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
  const now = new Date();
  
  // Helper function to check if date is today or yesterday
  const isToday = (date: Date) => {
    return date.toDateString() === now.toDateString();
  };
  
  const isYesterday = (date: Date) => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };
  
  // Format creation date
  let createdText: string;
  if (isToday(createdDate)) {
    createdText = "Created Today";
  } else if (isYesterday(createdDate)) {
    createdText = "Created Yesterday";
  } else {
    createdText = `Created ${createdDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }
  
  // Format update date
  let updatedText: string;
  if (isToday(updatedDate)) {
    const timeString = updatedDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    updatedText = `Last updated Today at ${timeString}`;
  } else if (isYesterday(updatedDate)) {
    const timeString = updatedDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    updatedText = `Last updated Yesterday at ${timeString}`;
  } else {
    updatedText = `Last updated ${updatedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }
  
  // Add user name if available
  if (updatedBy) {
    updatedText += ` by ${updatedBy}`;
  }
  
  return `${createdText}. ${updatedText}`;
}

/**
 * Formats a date with smart relative dates for date-only fields (no time)
 * Shows "Today", "Yesterday", "Nov 15th", or "Nov 15th, 2024" for other years
 * Use for: file dates, agreement dates, deadlines, creation dates (date-only)
 * @param date - Date to format
 * @returns Formatted date string without time
 * @example formatSmartDate(new Date()) // "Today" or "Nov 15th"
 */
export function formatSmartDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Helper function to check if date is today or yesterday
  const isToday = (date: Date) => {
    return date.toDateString() === now.toDateString();
  };
  
  const isYesterday = (date: Date) => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };
  
  if (isToday(dateObj)) {
    return "Today";
  } else if (isYesterday(dateObj)) {
    return "Yesterday";
  } else {
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

type DateDisplayOptions = {
  createdAt?: Date | string | null | undefined;
  updatedAt?: Date | string | null | undefined;
  createdBy?: string | null;
  updatedBy?: string | null;
  prefix?: 'Created' | 'Added';
  includeTime?: boolean;
};

/**
 * Formats a date with time and smart relative dates for timestamp fields
 * Shows "Today at 3:45pm", "Yesterday at 2:30pm", "Nov 15th", or "Nov 15th, 2024"
 * Use for: updatedAt, createdAt timestamps, last modified times
 * @param date - Date to format
 * @returns Formatted date and time string
 * @example formatSmartDateTime(new Date()) // "Today at 3:45pm" or "Nov 15th"
 * "Added Sept 22nd, 2023 by Joe Sawada, last updated Sept 23rd, 2023 by Joe Sawada"
  formatSmartDateTime({
    createdAt: new Date('2023-09-22'),
    updatedAt: new Date('2023-09-23'),
    createdBy: 'Joe Sawada',
    updatedBy: 'Joe Sawada',
    prefix: 'Added'
  })
 */
export function formatSmartDateTime(date: Date | string | null | undefined): string;
export function formatSmartDateTime(options: DateDisplayOptions): string;
export function formatSmartDateTime(
  dateOrOptions: Date | string | null | undefined | DateDisplayOptions
): string {
  // Handle single date parameter (backward compatibility)
  if (!dateOrOptions || dateOrOptions instanceof Date || typeof dateOrOptions === 'string') {
    const date = dateOrOptions as Date | string | null | undefined;
    if (!date) return "N/A";

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    const isToday = (date: Date) => {
      return date.toDateString() === now.toDateString();
    };

    const isYesterday = (date: Date) => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return date.toDateString() === yesterday.toDateString();
    };

    const getOrdinalSuffix = (day: number): string => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const timeString = dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).toLowerCase().replace(' ', '');

    if (isToday(dateObj)) {
      return `Today at ${timeString}`;
    } else if (isYesterday(dateObj)) {
      return `Yesterday at ${timeString}`;
    } else {
      const month = dateObj.toLocaleDateString("en-US", { month: "short" });
      const day = dateObj.getDate();
      const dayWithSuffix = `${day}${getOrdinalSuffix(day)}`;

      if (dateObj.getFullYear() === now.getFullYear()) {
        return `${month} ${dayWithSuffix}`;
      } else {
        return `${month} ${dayWithSuffix}, ${dateObj.getFullYear()}`;
      }
    }
  }

  // Handle options object
  const options = dateOrOptions as DateDisplayOptions;
  const { createdAt, updatedAt, createdBy, updatedBy, prefix = 'Created', includeTime = true } = options;

  if (!createdAt && !updatedAt) return "N/A";

  const now = new Date();

  const isToday = (date: Date) => {
    return date.toDateString() === now.toDateString();
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatDateWithTime = (date: Date, showTime: boolean = true) => {
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    const dayWithSuffix = `${day}${getOrdinalSuffix(day)}`;
    const year = date.getFullYear() !== now.getFullYear() ? `, ${date.getFullYear()}` : '';

    if (isToday(date)) {
      const timeString = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).toLowerCase().replace(' ', '');
      return `Today at ${timeString}`;
    } else if (isYesterday(date) && showTime) {
      const timeString = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).toLowerCase().replace(' ', '');
      return `Yesterday at ${timeString}`;
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return `${month} ${dayWithSuffix}${year}`;
    }
  };

  const parts: string[] = [];

  // Add creation info
  if (createdAt) {
    const createdDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const createdText = formatDateWithTime(createdDate, isToday(createdDate));
    const createdPart = `${prefix} ${createdText}${createdBy ? ` by ${createdBy}` : ''}`;
    parts.push(createdPart);
  }

  // Add update info if different from creation
  if (updatedAt) {
    const updatedDate = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
    const createdDate = createdAt ? (typeof createdAt === 'string' ? new Date(createdAt) : createdAt) : null;

    // Only show update info if it's different from creation date or if there's no creation date
    const shouldShowUpdate = !createdDate || updatedDate.getTime() !== createdDate.getTime();

    if (shouldShowUpdate) {
      const updatedText = formatDateWithTime(updatedDate, includeTime);
      const updatedPart = `last updated ${updatedText}${updatedBy ? ` by ${updatedBy}` : ''}`;
      parts.push(updatedPart);
    }
  }

  return parts.join(', ');
}

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 * Accepts numbers with or without country code
 * @param phoneNumber - Phone number to format (can include country code, spaces, dashes, etc.)
 * @returns Formatted phone number string or empty string if invalid
 * @example formatPhoneNumber("4444444444") // "(444) 444-4444"
 * @example formatPhoneNumber("1-444-444-4444") // "(444) 444-4444"
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return "";

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Handle different lengths
  // If it starts with 1 (country code), remove it
  const number = cleaned.startsWith('1') && cleaned.length === 11 ? cleaned.slice(1) : cleaned;

  // Only format if we have exactly 10 digits
  if (number.length === 10) {
    const areaCode = number.slice(0, 3);
    const firstPart = number.slice(3, 6);
    const secondPart = number.slice(6, 10);
    return `(${areaCode}) ${firstPart}-${secondPart}`;
  }

  // If not 10 digits, return as-is (don't format invalid numbers)
  return phoneNumber;
}

/**
 * Formats a phone number as the user types, applying (XXX) XXX-XXXX format in real-time
 * This function is more lenient and formats partial numbers
 * @param value - Current input value
 * @returns Formatted phone number
 */
export function formatPhoneInput(value: string): string {
  if (!value) return "";

  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');

  // Limit to 10 digits
  const limited = cleaned.slice(0, 10);

  // Format based on length
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  } else {
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
}
