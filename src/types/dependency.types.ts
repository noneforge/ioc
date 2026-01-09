import type { Token } from './common.types';
import type { ProviderScope } from './scope.types';

/**
 * Represents a provider node in the dependency resolution graph.
 * Used by DependencyGraph for cycle detection, validation, and resolution ordering.
 */
export interface DependencyNode {
  token: Token;
  /** Tokens this provider depends on (outgoing edges in the graph) */
  dependencies: Token[];
  scope: ProviderScope;
  optional: boolean;
  /** Indicates this node participates in a circular dependency */
  circular: boolean;
  /** Distance from the resolution entry point */
  depth: number;
}
