import { addDays, addHours, addMinutes, format, isAfter, isBefore, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export class DateUtils {
  /**
   * Add time to date
   */
  static addTime(date: Date, amount: number, unit: 'days' | 'hours' | 'minutes'): Date {
    switch (unit) {
      case 'days':
        return addDays(date, amount);
      case 'hours':
        return addHours(date, amount);
      case 'minutes':
        return addMinutes(date, amount);
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  /**
   * Format date to string
   */
  static format(date: Date | string, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatString);
  }

  /**
   * Check if date is expired
   */
  static isExpired(date: Date | string): boolean {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isBefore(d, new Date());
  }

  /**
   * Check if date is in future
   */
  static isFuture(date: Date | string): boolean {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isAfter(d, new Date());
  }

  /**
   * Convert to timezone
   */
  static toTimezone(date: Date | string, timezone: string): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return utcToZonedTime(d, timezone);
  }

  /**
   * Convert from timezone to UTC
   */
  static fromTimezone(date: Date | string, timezone: string): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return zonedTimeToUtc(d, timezone);
  }

  /**
   * Get start of current billing period
   */
  static getBillingPeriodStart(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get end of current billing period
   */
  static getBillingPeriodEnd(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /**
   * Get timestamp in seconds
   */
  static getTimestamp(date: Date = new Date()): number {
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * Parse duration string to milliseconds
   */
  static parseDuration(duration: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * units[unit];
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}