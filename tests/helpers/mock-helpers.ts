import { vi } from 'vitest';

// Console mocks
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  const mocks = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  console.log = mocks.log;
  console.warn = mocks.warn;
  console.error = mocks.error;
  console.info = mocks.info;
  console.debug = mocks.debug;

  return {
    mocks,
    restore: () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    },
  };
}

// Process mocks
export function mockProcess() {
  const originalProcess = { ...process };
  const mockExit = vi.fn();
  const mockOn = vi.fn();

  process.exit = mockExit as any;
  process.on = mockOn as any;

  return {
    mocks: {
      exit: mockExit,
      on: mockOn,
    },
    restore: () => {
      Object.assign(process, originalProcess);
    },
  };
}

// Reflect metadata mocks
export function mockReflectMetadata() {
  const originalReflect = { ...Reflect };
  const mockDefineMetadata = vi.fn();
  const mockGetMetadata = vi.fn();
  const mockGetOwnMetadata = vi.fn();
  const mockHasMetadata = vi.fn();

  Reflect.defineMetadata = mockDefineMetadata;
  Reflect.getMetadata = mockGetMetadata;
  Reflect.getOwnMetadata = mockGetOwnMetadata;
  Reflect.hasMetadata = mockHasMetadata;

  return {
    mocks: {
      defineMetadata: mockDefineMetadata,
      getMetadata: mockGetMetadata,
      getOwnMetadata: mockGetOwnMetadata,
      hasMetadata: mockHasMetadata,
    },
    restore: () => {
      Object.assign(Reflect, originalReflect);
    },
  };
}
