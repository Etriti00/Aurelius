// Type guard utilities for professional type checking
// No shortcuts or workarounds

/**
 * Checks if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Checks if a string is not null, undefined, or empty
 */
export function isNotEmpty(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Checks if a value is a non-empty array
 */
export function isNonEmptyArray<T>(value: T[] | null | undefined): value is T[] {
  return value !== null && value !== undefined && value.length > 0;
}

/**
 * Checks if a value is a valid number (not NaN)
 */
export function isValidNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !isNaN(value);
}

/**
 * Checks if a value is a positive number
 */
export function isPositiveNumber(value: number | null | undefined): value is number {
  return isValidNumber(value) && value > 0;
}

/**
 * Safely gets a value with a default fallback
 */
export function getOrDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return isDefined(value) ? value : defaultValue;
}

/**
 * Safely gets a string value with empty string fallback
 */
export function getStringOrEmpty(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Safely parses a boolean value
 */
export function parseBoolean(value: boolean | string | null | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}
