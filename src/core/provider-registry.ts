import type { Provider, ProviderScope, Token } from '../types';
import { isConstructor } from '../utils';

/**
 * Stores and indexes providers for efficient lookup by token, tag, or scope.
 * Supports multiple providers per token, maintaining registration order.
 */
export class ProviderRegistry {
  private readonly providers = new Map<Token, Provider[]>();
  private readonly tagIndex = new Map<string, Set<Token>>();
  private readonly scopeIndex = new Map<ProviderScope, Set<Token>>();

  /**
   * Registers a provider and updates all relevant indexes.
   * Multiple providers can be registered for the same token.
   */
  register(provider: Provider): void {
    const token = this.getToken(provider);

    const existing = this.providers.get(token) ?? [];
    existing.push(provider);
    this.providers.set(token, existing);

    if ('tags' in provider && Array.isArray(provider.tags)) {
      for (const tag of provider.tags) {
        let tagSet = this.tagIndex.get(tag);
        if (tagSet === undefined) {
          tagSet = new Set();
          this.tagIndex.set(tag, tagSet);
        }

        tagSet.add(token);
      }
    }

    const scope = this.getScope(provider);
    let scopeSet = this.scopeIndex.get(scope);

    if (scopeSet === undefined) {
      scopeSet = new Set();
      this.scopeIndex.set(scope, scopeSet);
    }

    scopeSet.add(token);
  }

  /** Returns all providers registered for a token, or empty array if none exist */
  getProviders(token: Token): Provider[] {
    return this.providers.get(token) ?? [];
  }

  /** Checks if any providers are registered for a token */
  has(token: Token): boolean {
    return this.providers.has(token);
  }

  /** Returns all providers across all tokens that have the specified tag */
  getProvidersByTag(tag: string): Provider[] {
    const tokens = this.tagIndex.get(tag) ?? new Set<Token>();

    return Array.from(tokens).flatMap((token) =>
      this.providers.get(token) ?? [],
    );
  }

  /** Returns all providers across all tokens that have the specified scope */
  getProvidersByScope(scope: ProviderScope): Provider[] {
    const tokens = this.scopeIndex.get(scope) ?? new Set<Token>();

    return Array.from(tokens).flatMap((token) =>
      this.providers.get(token) ?? [],
    );
  }

  /** Returns all registered providers from all tokens */
  getAllProviders(): Provider[] {
    return Array.from(this.providers.values()).flat();
  }

  /** Removes all providers and clears all indexes */
  clear(): void {
    this.providers.clear();
    this.tagIndex.clear();
    this.scopeIndex.clear();
  }

  /**
   * Extracts the token from a provider.
   * Constructors are their own token; object providers have a `provide` property.
   */
  private getToken(provider: Provider): Token {
    if (isConstructor(provider)) {
      return provider;
    }

    return (provider as { provide: Token }).provide;
  }

  /**
   * Extracts the scope from a provider.
   * Defaults to 'singleton' if not specified.
   */
  private getScope(provider: Provider): ProviderScope {
    if (typeof provider === 'object' && 'scope' in provider && provider.scope !== undefined) {
      return provider.scope;
    }

    return 'singleton';
  }
}

/** Global provider registry instance */
export const GlobalProviderRegistry = new ProviderRegistry();
