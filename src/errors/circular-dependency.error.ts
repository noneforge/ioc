import type { InjectionContext, Token } from '../types';
import { tokenToString } from '../utils';
import { InjectionError } from './injection.error';

/**
 * Error thrown when a circular dependency is detected during dependency resolution.
 *
 * This error occurs when a dependency chain forms a cycle (A depends on B, B depends on A).
 * The error message includes the full cycle path to help identify the problematic dependencies.
 */
export class CircularDependencyError extends InjectionError {
  /** The dependency cycle represented as an array of tokens forming the circular path */
  readonly cycle: Token[];

  /**
   * @param cycle - Array of tokens forming the circular dependency path
   * @param context - Optional injection context for resolution path tracking
   */
  constructor(cycle: Token[], context?: InjectionContext) {
    const cycleStr = cycle.map((token) => tokenToString(token)).join(' -> ');
    super(`Circular dependency detected: ${cycleStr}`, context);

    this.cycle = cycle;
  }
}
