/** Type guard that narrows a value to `NonNullable<T>` by checking it is neither undefined nor null */
export const isDefined = <T>(value: T): value is NonNullable<T> => {
  return value !== undefined && value !== null;
};
