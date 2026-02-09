/**
 * Escape user input before using it in a regular expression.
 */
export const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
