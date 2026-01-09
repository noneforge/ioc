import { ValidationError } from '../../errors';
import type { InjectionContext, Interceptor } from '../../types';

/**
 * Validates resolved dependencies against custom validation rules.
 *
 * Runs validation after dependency resolution completes. Supports both
 * synchronous and asynchronous dependencies, throwing ValidationError
 * when validation fails.
 *
 * **Note:** Validation occurs after resolution, not before. The dependency
 * is instantiated even if validation fails. For expensive resources, consider
 * provider-level validation instead.
 *
 * @example
 * ```ts
 * // Validate that database connections are established
 * const dbValidator = new ValidationInterceptor(
 *   (db: unknown) => (db as DatabaseService).isConnected,
 *   'Database connection failed'
 * );
 * container.addInterceptor(dbValidator);
 *
 * // Validate configuration values are within range
 * const configValidator = new ValidationInterceptor(
 *   (config: unknown) => (config as Config).port > 0 && (config as Config).port < 65536,
 *   'Invalid port number'
 * );
 * container.register(Config, { interceptors: [configValidator] });
 * ```
 */
export class ValidationInterceptor implements Interceptor {
  private readonly validator: (value: unknown) => boolean;
  private readonly errorMessage: string;

  /**
   * @param validator - Function returning true if the resolved value is valid
   * @param errorMessage - Error message included in ValidationError when validation fails
   */
  constructor(validator: (value: unknown) => boolean, errorMessage = 'Validation failed') {
    this.validator = validator;
    this.errorMessage = errorMessage;
  }

  /**
   * Validates the resolved dependency against the configured validator.
   *
   * For async dependencies, waits for resolution before validating. If validation
   * fails, throws ValidationError with the original token and injection context.
   *
   * @throws {ValidationError} When the validator function returns false
   */
  intercept<T>(context: InjectionContext, next: () => T | Promise<T>): T | Promise<T> {
    const result = next();
    const token = context.token ?? Symbol('unknown');

    if (result instanceof Promise) {
      return result.then((value) => {
        if (!this.validator(value)) {
          throw new ValidationError(token, value, this.errorMessage, context);
        }

        return value;
      });
    }

    if (!this.validator(result)) {
      throw new ValidationError(token, result, this.errorMessage, context);
    }

    return result;
  }
}
