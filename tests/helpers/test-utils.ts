import { expect, vi } from 'vitest';

import type { ContainerLike, InjectionContext, Token } from '../../src';

// Mock InjectionContext factory
export function createMockContext(overrides?: Partial<InjectionContext>): InjectionContext {
  const mockContainer: ContainerLike = {
    get: vi.fn() as any,
    getAsync: vi.fn() as any,
    has: vi.fn(() => false),
    getAll: vi.fn(() => []),
  };

  return {
    container: mockContainer,
    metadata: new Map(),
    depth: 0,
    path: [],
    strategy: 'default',
    ...overrides,
  };
}

// Mock helpers
export function createMockFunction<T extends (...args: any[]) => any>(implementation?: T): T & { mock: any } {
  return vi.fn(implementation) as unknown as T & { mock: any };
}

export function createSpyFunction<T extends (...args: any[]) => any>(target: any, method: string): T & { mock: any } {
  return vi.spyOn(target, method) as unknown as T & { mock: any };
}

// Assertion helpers
export function expectToThrow(fn: () => void, errorType?: new (...args: any[]) => Error): void {
  expect(fn).toThrow();
  if (errorType) {
    expect(fn).toThrow(errorType);
  }
}

export async function expectToThrowAsync(
  fn: () => Promise<any>,
  errorType?: new (...args: any[]) => Error,
): Promise<void> {
  await expect(fn()).rejects.toThrow();
  if (errorType) {
    await expect(fn()).rejects.toThrow(errorType);
  }
}

// Time helpers
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function advanceTimersByTime(ms: number): void {
  vi.advanceTimersByTime(ms);
}

export function useFakeTimers(): void {
  vi.useFakeTimers();
}

export function useRealTimers(): void {
  vi.useRealTimers();
}

// Memory testing helpers
export function measureMemoryUsage<T>(fn: () => T): { result: T; memoryDelta: number } {
  const startMemory = process.memoryUsage().heapUsed;
  const result = fn();
  const endMemory = process.memoryUsage().heapUsed;

  return {
    result,
    memoryDelta: endMemory - startMemory,
  };
}

// Performance testing helpers
export function measureExecutionTime<T>(fn: () => T): { result: T; executionTime: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  return {
    result,
    executionTime: end - start,
  };
}

export async function measureExecutionTimeAsync<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; executionTime: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  return {
    result,
    executionTime: end - start,
  };
}
