/**
 * TownPulse Business Hours Calculator
 * Calculates real-time Open/Closed status based on current day and time.
 */

export interface OpenStatus {
  isOpen: boolean;
  statusText: string;
  is24Hours?: boolean;
}

/**
 * Parses time string like "9:00 AM" or "18:00" into minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number | null {
  const clean = timeStr.trim().toUpperCase();
  if (!clean) return null;

  // Match 12-hour format: "9:00 AM", "09:30 PM", "9 AM"
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const modifier = match12[3];

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Match 24-hour format: "09:00", "18:30"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Calculates whether a business is currently open based on its hours dict.
 * Handles strings like "9:00 AM - 6:00 PM", "24 Hours", "Open 24/7", or day-specific keys.
 */
export function getOpenStatus(hours?: Record<string, string> | null): OpenStatus {
  if (!hours || Object.keys(hours).length === 0) {
    return { isOpen: true, statusText: 'Hours not specified' };
  }

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[now.getDay()];

  // Check today's specific hours, or fallback to general keys like 'all_days', 'daily', 'monday'
  const timeString =
    hours[todayKey] ||
    hours['all_days'] ||
    hours['daily'] ||
    hours['monday_friday'] ||
    Object.values(hours)[0];

  if (!timeString) {
    return { isOpen: true, statusText: 'Open' };
  }

  const lower = timeString.toLowerCase().trim();

  // Check 24 hours
  if (lower.includes('24 hour') || lower.includes('24/7') || lower.includes('24 hrs') || lower.includes('24x7')) {
    return { isOpen: true, statusText: 'Open 24/7', is24Hours: true };
  }

  // Check closed
  if (lower === 'closed' || lower.includes('holiday')) {
    return { isOpen: false, statusText: 'Closed Today' };
  }

  // Range split e.g. "9:00 AM - 6:00 PM" or "09:00 - 18:00"
  const parts = timeString.split(/[-–—to]/i).map((s) => s.trim());
  if (parts.length === 2) {
    const openMinutes = parseTimeToMinutes(parts[0]);
    const closeMinutes = parseTimeToMinutes(parts[1]);

    if (openMinutes !== null && closeMinutes !== null) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Standard daytime shift (e.g. 9:00 AM to 6:00 PM)
      if (openMinutes < closeMinutes) {
        const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
        return {
          isOpen,
          statusText: isOpen ? `Open until ${parts[1]}` : `Closed • Opens at ${parts[0]}`,
        };
      }

      // Overnight shift (e.g. 8:00 PM to 4:00 AM)
      const isOpen = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
      return {
        isOpen,
        statusText: isOpen ? `Open until ${parts[1]}` : `Closed • Opens at ${parts[0]}`,
      };
    }
  }

  return { isOpen: true, statusText: timeString };
}
