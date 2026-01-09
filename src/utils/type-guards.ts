import type {
  Disposable,
  Interceptor,
  InterceptorFn,
  InterceptorLike,
  OnDestroy,
  OnInit,
  OnInject,
  OnRequest,
} from '../types';

/**
 * Runtime type guard that narrows an object to type `T` if it has the specified method.
 * Safely handles null/undefined and verifies the hook is a function.
 *
 * @template T - The target type to narrow to
 *
 * @example
 * ```ts
 * interface MyLifecycle {
 *   onStart(): void;
 * }
 *
 * if (hasLifecycleHook<MyLifecycle>(instance, 'onStart')) {
 *   instance.onStart(); // TypeScript knows instance has onStart()
 * }
 * ```
 */
export function hasLifecycleHook<T>(obj: unknown, hook: keyof T): obj is T {
  return obj !== null && typeof obj === 'object' && typeof (obj as Record<string | symbol, unknown>)[hook as string] === 'function';
}

/** Type guard that narrows to objects implementing the OnInit lifecycle hook */
export function hasOnInit(obj: unknown): obj is OnInit {
  return hasLifecycleHook<OnInit>(obj, 'onInit');
}

/** Type guard that narrows to objects implementing the OnDestroy lifecycle hook */
export function hasOnDestroy(obj: unknown): obj is OnDestroy {
  return hasLifecycleHook<OnDestroy>(obj, 'onDestroy');
}

/** Type guard that narrows to objects implementing the OnInject lifecycle hook */
export function hasOnInject(obj: unknown): obj is OnInject {
  return hasLifecycleHook<OnInject>(obj, 'onInject');
}

/** Type guard that narrows to objects implementing the OnRequest lifecycle hook */
export function hasOnRequest(obj: unknown): obj is OnRequest {
  return hasLifecycleHook<OnRequest>(obj, 'onRequest');
}

/** Type guard that narrows to objects implementing the Disposable interface */
export function isDisposable(obj: object): obj is Disposable {
  return hasLifecycleHook<Disposable>(obj, 'dispose');
}

/** Checks if value is a class-based interceptor with `intercept` method */
export function isClassInterceptor(value: InterceptorLike): value is Interceptor {
  return (
    typeof value === 'object'
    && 'intercept' in value
    && typeof value.intercept === 'function'
  );
}

/** Checks if value is a functional interceptor (plain function) */
export function isFunctionalInterceptor(value: InterceptorLike): value is InterceptorFn {
  return typeof value === 'function';
}
