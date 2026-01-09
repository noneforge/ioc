/**
 * Testing Example
 *
 * This example demonstrates:
 * - Using TestContainer for unit tests
 * - Mocking dependencies
 * - Using spies
 * - Snapshot and restore functionality
 * - createMockProvider and createSpyProvider
 */

import 'reflect-metadata';
import {
  TestContainer,
  createTestContainer,
  createMockProvider,
  createSpyProvider,
  Injectable,
  inject,
  InjectionToken,
} from '../../src';
import type { Provider } from '../../src';

// Services to Test

interface Logger {
  log(message: string): void;
  error(message: string, error?: Error): void;
}

const LOGGER = new InjectionToken<Logger>('LOGGER');
const API_URL = new InjectionToken<string>('API_URL');

@Injectable()
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }

  error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`, error);
  }
}

@Injectable()
class UserRepository {
  private logger = inject(LOGGER);
  private apiUrl = inject(API_URL);

  findById(id: number) {
    this.logger.log(`Finding user ${id} from ${this.apiUrl}`);

    return { id, name: `User ${id}` };
  }

  save(user: { name: string }) {
    this.logger.log(`Saving user ${user.name}`);

    return { id: Date.now(), ...user };
  }
}

@Injectable()
class UserService {
  private repo = inject(UserRepository);
  private logger = inject(LOGGER);

  getUser(id: number) {
    this.logger.log(`Getting user ${id}`);

    return this.repo.findById(id);
  }

  createUser(name: string) {
    this.logger.log(`Creating user ${name}`);

    return this.repo.save({ name });
  }
}

// Test Helpers

function createMockLogger() {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  return {
    mock: {
      log: (message: string) => {
        calls.push({ method: 'log', args: [message] });
      },
      error: (message: string, error?: Error) => {
        calls.push({ method: 'error', args: [message, error] });
      },
    },
    getCalls: () => calls,
    clear: () => calls.length = 0,
  };
}

function expect(value: unknown) {
  return {
    toBe: (expected: unknown) => {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }

      console.log(`  OK: ${value} === ${expected}`);
    },
    toEqual: (expected: unknown) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      }

      console.log(`  OK: value equals expected`);
    },
    toHaveLength: (length: number) => {
      if (!Array.isArray(value) || value.length !== length) {
        throw new Error(`Expected array of length ${length}`);
      }

      console.log(`  OK: array has length ${length}`);
    },
  };
}

// Tests

function testOverride() {
  console.log('\n** Test: override() **\n');

  const container = new TestContainer([
    { provide: API_URL, useValue: 'https://production.api.com' },
  ]);

  console.log('Initial value:');
  expect(container.get(API_URL)).toBe('https://production.api.com');

  console.log('\nAfter override:');
  container.override(API_URL, 'https://test.api.com');
  expect(container.get(API_URL)).toBe('https://test.api.com');
}

function testMock() {
  console.log('\n** Test: mock() **\n');

  const mockLogger = createMockLogger();

  const container = new TestContainer([
    { provide: LOGGER, useClass: ConsoleLogger },
    { provide: API_URL, useValue: 'https://test.api.com' },
    UserRepository,
    UserService,
  ]);

  // Replace logger with mock
  container.mock(LOGGER, mockLogger.mock);

  console.log('Using mocked logger:');
  const userService = container.get(UserService);
  const user = userService.getUser(1);

  console.log('  Returned user:', user);
  console.log('  Logger calls:', mockLogger.getCalls());
  expect(mockLogger.getCalls()).toHaveLength(2); // "Getting user" + "Finding user"
}

function testSpy() {
  console.log('\n** Test: spy() **\n');

  const container = new TestContainer([
    { provide: LOGGER, useClass: ConsoleLogger },
    { provide: API_URL, useValue: 'https://test.api.com' },
    UserRepository,
  ]);

  console.log('Creating spy on UserRepository:');
  const spy = container.spy(UserRepository);

  console.log('Calling spied method:');
  const result = spy.findById(42);
  console.log('  Result:', result);
  // Console should show: "Spy: findById called with [42]"
}

function testSnapshot() {
  console.log('\n** Test: snapshot() **\n');

  const container = new TestContainer([
    { provide: API_URL, useValue: 'https://original.api.com' },
  ]);

  console.log('Taking snapshot:');
  const snap = container.snapshot();

  console.log('  Original value:', container.get(API_URL));

  console.log('\nModifying container:');
  container.override(API_URL, 'https://modified.api.com');
  console.log('  Modified value:', container.get(API_URL));

  console.log('\nRestoring snapshot:');
  snap.restore();
  console.log('  Restored value:', container.get(API_URL));

  expect(container.get(API_URL)).toBe('https://original.api.com');
}

function testCreateTestContainer() {
  console.log('\n** Test: createTestContainer() **\n');

  const mockLogger = createMockLogger();

  const container = createTestContainer(
    { provide: API_URL, useValue: 'https://test.api.com' } as Provider,
    createMockProvider(LOGGER, mockLogger.mock) as Provider,
    UserRepository as Provider,
    UserService as Provider,
  );

  console.log('Container created with providers');

  const service = container.get(UserService);
  const user = service.createUser('TestUser');

  console.log('  Created user:', user);
  console.log('  Logger calls:', mockLogger.getCalls());
}

function testCreateSpyProvider() {
  console.log('\n** Test: createSpyProvider() **\n');

  // Create a spy implementation
  const spyImpl = {
    findById: (id: number) => {
      console.log(`  [Spy impl] findById(${id})`);

      return { id, name: 'Spy User' };
    },
    save: (user: { name: string }) => {
      console.log(`  [Spy impl] save(${user.name})`);

      return { id: 999, ...user };
    },
  };

  const container = createTestContainer(
    { provide: API_URL, useValue: 'https://test.api.com' },
    { provide: LOGGER, useValue: { log: () => {}, error: () => {} } },
    createSpyProvider(UserRepository, spyImpl as UserRepository),
  );

  console.log('Using spy provider:');
  const repo = container.get(UserRepository);
  const user = repo.findById(123);
  console.log('  Result:', user);
}

function testIntegration() {
  console.log('\n** Test: Integration Pattern **\n');

  // Simulate a typical test setup
  class UserServiceTest {
    private container!: TestContainer;
    private mockLogger!: ReturnType<typeof createMockLogger>;
    private snapshot!: ReturnType<TestContainer['snapshot']>;

    beforeEach() {
      this.mockLogger = createMockLogger();

      this.container = new TestContainer([
        { provide: API_URL, useValue: 'https://test.api.com' },
        createMockProvider(LOGGER, this.mockLogger.mock) as Provider,
        UserRepository,
        UserService,
      ]);

      this.snapshot = this.container.snapshot();
    }

    afterEach() {
      this.snapshot.restore();
      this.mockLogger.clear();
    }

    testGetUser() {
      console.log('Test: should get user by id');

      const service = this.container.get(UserService);
      const user = service.getUser(1);

      expect(user.id).toBe(1);
      console.log('  User retrieved successfully');
    }

    testCreateUser() {
      console.log('Test: should create user');

      const service = this.container.get(UserService);
      const user = service.createUser('Alice');

      expect(user.name).toBe('Alice');
      expect(this.mockLogger.getCalls().some((c) => c.args[0]?.toString().includes('Creating'))).toBe(
        true
      );

      console.log('  User created successfully');
    }

    testWithOverride() {
      console.log('Test: should use overridden API URL');

      this.container.override(API_URL, 'https://custom.api.com');

      const repo = this.container.get(UserRepository);
      repo.findById(1);

      // Verify the custom URL was used
      const calls = this.mockLogger.getCalls();
      const hasCustomUrl = calls.some((c) => c.args[0]?.toString().includes('custom.api.com'));
      expect(hasCustomUrl).toBe(true);

      console.log('  Override worked correctly');
    }

    run() {
      console.log('Running UserService tests:\n');

      this.beforeEach();
      this.testGetUser();
      this.afterEach();

      this.beforeEach();
      this.testCreateUser();
      this.afterEach();

      this.beforeEach();
      this.testWithOverride();
      this.afterEach();

      console.log('\nAll tests passed!');
    }
  }

  new UserServiceTest().run();
}

// Main

function main() {
  console.log('** Testing Example **');

  testOverride();
  testMock();
  testSpy();
  testSnapshot();
  testCreateTestContainer();
  testCreateSpyProvider();
  testIntegration();

  console.log('\n** All Examples Complete **');
}

main();
