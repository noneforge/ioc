/** JavaScript falsy values including NaN */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type Falsy = false | 0 | 0n | '' | null | undefined | typeof NaN;

/** Type guard that checks if a value is any JavaScript falsy value */
export const isFalsy = (value: unknown): value is Falsy => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  return !value || (typeof value === 'number' && Number.isNaN(value));
};
