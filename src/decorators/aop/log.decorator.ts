/**
 * Logs method calls with arguments and return values to console.
 *
 * Outputs two log entries per method call:
 * - Before execution: method name and arguments array
 * - After execution: method name and return value
 *
 * Logs are written using `console.info()` and include the method name for easy filtering.
 * Does not intercept exceptions - failed calls will only show the "called with" log.
 *
 * @param tag - Optional prefix/tag to prepend to all log messages.
 * Useful for filtering and grouping logs by feature or module.
 *
 * @example
 * ```ts
 * class UserService {
 *   ＠Log()
 *   createUser(name: string, email: string) {
 *     return { id: 1, name, email };
 *   }
 *
 *   ＠Log('[Auth]')
 *   login(email: string) {
 *     return { token: 'abc123' };
 *   }
 * }
 * // Console output:
 * // createUser called with: ['John', 'john@example.com']
 * // createUser returned: { id: 1, name: 'John', email: 'john@example.com' }
 * // [Auth] login called with: ['john@example.com']
 * // [Auth] login returned: { token: 'abc123' }
 * ```
 */
export function Log(tag?: string): MethodDecorator {
  const prefix = tag !== undefined && tag.length > 0 ? tag + ' ' : '';

  return (_target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const original = descriptor.value;

    descriptor.value = function(this: unknown, ...args: unknown[]) {
      console.info(`${prefix}${String(propertyKey)} called with:`, args);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = original.apply(this, args) as unknown;
      console.info(`${prefix}${String(propertyKey)} returned:`, result);

      return result;
    };

    return descriptor;
  };
}
