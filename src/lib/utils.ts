import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely joins elements of an array into a string.
 * If the input is not an array, it converts it to a string.
 * Handles null or undefined inputs gracefully.
 * @param arr The array or value to join.
 * @param sep The separator to use.
 * @returns A joined string.
 */
export function safeJoin(arr: any, sep = ', '): string {
  if (Array.isArray(arr)) {
    return arr.join(sep);
  }
  return String(arr ?? '');
}
