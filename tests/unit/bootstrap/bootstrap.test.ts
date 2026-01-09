import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bootstrap,
  Container,
  createApplication,
  Injectable,
  InjectionToken,
  Module,
} from '../../../src';

// Test tokens
const TOKEN_A = new InjectionToken<string>('A');

describe('bootstrap()', () => {
  // Mock process.on to avoid actual signal handlers
  const originalProcessOn = process.on.bind(process);
  const mockProcessOn = vi.fn();

  beforeEach(() => {
    process.on = mockProcessOn;
    mockProcessOn.mockClear();
  });

  afterEach(() => {
    process.on = originalProcessOn;
  });

  // ========== Basic Bootstrap ==========

  describe('basic bootstrap', () => {
    it('should bootstrap a simple class', async () => {
      @Injectable()
      class AppModule {
        getValue() {
          return 'app-value';
        }
      }

      const { app, container } = await bootstrap(AppModule);

      expect(app).toBeInstanceOf(AppModule);
      expect(app.getValue()).toBe('app-value');
      expect(container).toBeInstanceOf(Container);
    });

    it('should bootstrap a @Module decorated class', async () => {
      @Injectable()
      class AppService {
        getValue() {
          return 'service-value';
        }
      }

      @Module({
        providers: [AppService, { provide: TOKEN_A, useValue: 'module-token' }],
      })
      @Injectable()
      class AppModule {
        constructor(public service: AppService) {}
      }

      const { app, container } = await bootstrap(AppModule, {
        providers: [AppService],
      });

      expect(app).toBeInstanceOf(AppModule);
      expect(container.get(TOKEN_A)).toBe('module-token');
    });

    it('should accept additional providers', async () => {
      @Injectable()
      class AppModule {}

      const { container } = await bootstrap(AppModule, {
        providers: [{ provide: TOKEN_A, useValue: 'bootstrap-value' }],
      });

      expect(container.get(TOKEN_A)).toBe('bootstrap-value');
    });
  });

  // ========== Bootstrap Options ==========

  describe('bootstrap options', () => {
    it('should pass strict option to container', async () => {
      @Injectable()
      class AppModule {}

      const { container } = await bootstrap(AppModule, { strict: true });

      // Strict containers should throw for missing providers
      expect(() => container.get(TOKEN_A)).toThrow();
    });

    it('should pass debug option to container', async () => {
      @Injectable()
      class AppModule {}

      // Just verify it doesn't throw with debug option
      const { app } = await bootstrap(AppModule, { debug: true });

      expect(app).toBeInstanceOf(AppModule);
    });
  });

  // ========== Validation ==========

  describe('validation', () => {
    it('should validate when validate option is true', async () => {
      @Injectable()
      class AppModule {}

      // Should not throw when validation passes
      const { app } = await bootstrap(AppModule, { validate: true });

      expect(app).toBeInstanceOf(AppModule);
    });

    it('should log warnings in debug mode when validation has warnings', async () => {
      // This test verifies that validation runs without throwing for valid modules
      @Module({
        providers: [{ provide: TOKEN_A, useValue: 'test' }],
      })
      @Injectable()
      class ValidModule {}

      // Should not throw
      const { app } = await bootstrap(ValidModule, { validate: true, debug: true });

      expect(app).toBeInstanceOf(ValidModule);
    });
  });

  // ========== Signal Handlers ==========

  describe('signal handlers', () => {
    it('should register SIGTERM handler', async () => {
      @Injectable()
      class AppModule {}

      await bootstrap(AppModule);

      expect(mockProcessOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });

    it('should register SIGINT handler', async () => {
      @Injectable()
      class AppModule {}

      await bootstrap(AppModule);

      expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });

  // ========== Edge Cases ==========

  describe('edge cases', () => {
    it('should handle async onInit lifecycle hooks', async () => {
      let initCalled = false;

      @Injectable()
      class AppModule {
        async onInit() {
          await new Promise((resolve) => setTimeout(resolve, 10));
          initCalled = true;
        }
      }

      await bootstrap(AppModule);

      expect(initCalled).toBe(true);
    });

    it('should handle empty options', async () => {
      @Injectable()
      class AppModule {}

      const { app, container } = await bootstrap(AppModule, {});

      expect(app).toBeInstanceOf(AppModule);
      expect(container).toBeInstanceOf(Container);
    });

    it('should handle no options', async () => {
      @Injectable()
      class AppModule {}

      const { app, container } = await bootstrap(AppModule);

      expect(app).toBeInstanceOf(AppModule);
      expect(container).toBeInstanceOf(Container);
    });
  });
});

describe('createApplication()', () => {
  // ========== Basic createApplication ==========

  describe('basic createApplication', () => {
    it('should create container for module', () => {
      @Module({
        providers: [{ provide: TOKEN_A, useValue: 'app-value' }],
      })
      class AppModule {}

      const container = createApplication(AppModule);

      expect(container).toBeInstanceOf(Container);
      expect(container.get(TOKEN_A)).toBe('app-value');
    });

    it('should accept providers option', () => {
      @Injectable()
      class AppModule {}

      const container = createApplication(AppModule, {
        providers: [{ provide: TOKEN_A, useValue: 'provided-value' }],
      });

      expect(container.get(TOKEN_A)).toBe('provided-value');
    });

    it('should not automatically resolve the module', () => {
      let moduleCreated = false;

      @Injectable()
      class AppModule {
        constructor() {
          moduleCreated = true;
        }
      }

      createApplication(AppModule);

      // The module shouldn't be instantiated until explicitly requested
      expect(moduleCreated).toBe(false);
    });
  });

  // ========== Options ==========

  describe('options', () => {
    it('should pass strict option', () => {
      @Injectable()
      class AppModule {}

      const container = createApplication(AppModule, { strict: true });

      // Strict container should throw for missing providers
      expect(() => container.get(TOKEN_A)).toThrow();
    });

    it('should pass debug option', () => {
      @Injectable()
      class AppModule {}

      // Just verify it doesn't throw
      const container = createApplication(AppModule, { debug: true });

      expect(container).toBeInstanceOf(Container);
    });
  });

  // ========== Module Loading ==========

  describe('module loading', () => {
    it('should load @Module decorated class', () => {
      @Module({
        providers: [{ provide: TOKEN_A, useValue: 'module-value' }],
      })
      class AppModule {}

      const container = createApplication(AppModule);

      expect(container.get(TOKEN_A)).toBe('module-value');
    });

    it('should load imported modules', () => {
      const IMPORTED_TOKEN = new InjectionToken<string>('IMPORTED');

      @Module({
        providers: [{ provide: IMPORTED_TOKEN, useValue: 'imported' }],
        exports: [IMPORTED_TOKEN],
      })
      class ImportedModule {}

      @Module({
        imports: [ImportedModule],
      })
      class AppModule {}

      const container = createApplication(AppModule);

      expect(container.get(IMPORTED_TOKEN)).toBe('imported');
    });

    it('should not require @Module decorator', () => {
      @Injectable()
      class SimpleApp {}

      const container = createApplication(SimpleApp);

      expect(container).toBeInstanceOf(Container);
    });
  });
});
