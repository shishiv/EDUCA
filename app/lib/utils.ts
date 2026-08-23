/**
 * UI utility — Tailwind CSS class merging.
 *
 * Re-exports a single `cn` helper that combines `clsx` conditional classes
 * with `tailwind-merge` conflict resolution.
 *
 * ## Mode availability
 *
 * Pure utility, available in all modes and environments.
 *
 * @module utils
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 * @example
 * cn("px-2 py-1", condition && "bg-red-500", "px-4")
 * // => "py-1 bg-red-500 px-4" (px-4 wins over px-2)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
