// North American timezones only (for Canadian labour relations focus)
export const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Halifax", label: "Atlantic Time" },
  { value: "America/St_Johns", label: "Newfoundland Time" },
];

// Get timezone display name from value
export function getTimezoneLabel(value: string): string {
  const timezone = TIMEZONES.find(tz => tz.value === value);
  return timezone?.label || value;
}

/**
 * Map any browser-detected timezone to the closest North American timezone
 * This ensures users get an appropriate default even if they're in a different timezone
 */
export function mapToNorthAmericanTimezone(browserTimezone: string): string {
  // Direct matches first
  const directMatch = TIMEZONES.find(tz => tz.value === browserTimezone);
  if (directMatch) {
    return directMatch.value;
  }

  // Common timezone mappings to North American equivalents
  const timezoneMap: Record<string, string> = {
    // Pacific variations
    'America/Vancouver': 'America/Los_Angeles',
    'America/Tijuana': 'America/Los_Angeles',
    'America/Whitehorse': 'America/Los_Angeles',
    'America/Dawson': 'America/Los_Angeles',
    'US/Pacific': 'America/Los_Angeles',
    'Canada/Pacific': 'America/Los_Angeles',

    // Mountain variations
    'America/Phoenix': 'America/Denver',
    'America/Edmonton': 'America/Denver',
    'America/Calgary': 'America/Denver',
    'America/Yellowknife': 'America/Denver',
    'America/Boise': 'America/Denver',
    'US/Mountain': 'America/Denver',
    'Canada/Mountain': 'America/Denver',

    // Central variations
    'America/Winnipeg': 'America/Chicago',
    'America/Regina': 'America/Chicago',
    'America/Mexico_City': 'America/Chicago',
    'US/Central': 'America/Chicago',
    'Canada/Central': 'America/Chicago',

    // Eastern variations
    'America/Toronto': 'America/New_York',
    'America/Montreal': 'America/New_York',
    'America/Detroit': 'America/New_York',
    'America/Kentucky/Louisville': 'America/New_York',
    'America/Indiana/Indianapolis': 'America/New_York',
    'US/Eastern': 'America/New_York',
    'Canada/Eastern': 'America/New_York',

    // Atlantic variations
    'America/Moncton': 'America/Halifax',
    'America/Glace_Bay': 'America/Halifax',
    'America/Goose_Bay': 'America/Halifax',
    'America/Blanc-Sablon': 'America/Halifax',
    'Canada/Atlantic': 'America/Halifax',

    // Newfoundland variations
    "America/St_John's": 'America/St_Johns', // Common typo
    'Canada/Newfoundland': 'America/St_Johns',
  };

  // Check if we have a mapping for this timezone
  const mapped = timezoneMap[browserTimezone];
  if (mapped) {
    return mapped;
  }

  // Default to Eastern Time if no match found (most common in Canada)
  return 'America/New_York';
}
