import { type Constructor, InjectionToken, type Provider, type Token } from '../types';
import { isDefined } from './is-defined';

/**
 * Converts a token to a string representation
 */
export function tokenToString(token: Token): string {
  if (typeof token === 'string') {
    return token;
  }

  if (typeof (token as unknown) === 'symbol') {
    return token.toString();
  }

  if (token instanceof InjectionToken) {
    return token.toString();
  }

  if (typeof token === 'function') {
    return token.name.length === 0 ? 'Anonymous' : token.name;
  }

  return String(token);
}

/** Checks if a value is a constructor function */
export function isConstructor(value: unknown): value is Constructor {
  return (
    typeof value === 'function'
    && isDefined(value.prototype)
    && (value.prototype as Function).constructor === value
  );
}

/** Checks if a value is a provider */
export function isProvider(value: unknown): value is Provider {
  return (
    isConstructor(value)
    || (isDefined(value) && typeof value === 'object' && 'provide' in value)
  );
}
