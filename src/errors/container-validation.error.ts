import { InjectionError } from './injection.error';

/**
 * Error thrown when container validation fails during bootstrap.
 *
 * This error occurs when the dependency graph validation detects issues such as
 * missing providers, unresolved dependencies, or other structural problems.
 * The error includes all validation failures to help identify and fix problems.
 */
export class ContainerValidationError extends InjectionError {
  /** Array of validation error messages describing each detected issue */
  readonly errors: string[];

  /**
   * @param message - Error message describing the failure
   * @param errors - Array of individual validation error messages
   */
  constructor(message: string, errors: string[]) {
    super(message);
    this.errors = errors;
  }
}
