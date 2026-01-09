import { describe, expect, it } from 'vitest';

import { Inject, InjectionToken, Lazy, METADATA } from '../../../src';

const TEST_TOKEN = new InjectionToken<string>('TEST_TOKEN');

describe('@Lazy', () => {
  describe('Parameter decorator', () => {
    it('should mark parameter as lazy', () => {
      class TestService {
        constructor(@Lazy() value: string) {}
      }

      const lazyTokens = Reflect.getMetadata(METADATA.LAZY_TOKENS, TestService);

      expect(lazyTokens).toBeDefined();
      expect(lazyTokens[0]).toBe(true);
    });

    it('should handle multiple lazy parameters', () => {
      class TestService {
        constructor(
          @Lazy() first: string,
          @Lazy() second: number,
        ) {}
      }

      const lazyTokens = Reflect.getMetadata(METADATA.LAZY_TOKENS, TestService);

      expect(lazyTokens[0]).toBe(true);
      expect(lazyTokens[1]).toBe(true);
    });

    it('should handle non-consecutive lazy parameters', () => {
      class TestService {
        constructor(
          eager: string,
          @Lazy() lazy: string,
          alsoEager: number,
        ) {}
      }

      const lazyTokens = Reflect.getMetadata(METADATA.LAZY_TOKENS, TestService);

      expect(lazyTokens[0]).toBeUndefined();
      expect(lazyTokens[1]).toBe(true);
      expect(lazyTokens[2]).toBeUndefined();
    });

    it('should work with @Inject decorator', () => {
      class TestService {
        constructor(
          @Inject(TEST_TOKEN) @Lazy() value: string,
        ) {}
      }

      const injectTokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);
      const lazyTokens = Reflect.getMetadata(METADATA.LAZY_TOKENS, TestService);

      expect(injectTokens[0]).toBe(TEST_TOKEN);
      expect(lazyTokens[0]).toBe(true);
    });

    it('should work when @Lazy comes first', () => {
      class TestService {
        constructor(
          @Lazy() @Inject(TEST_TOKEN) value: string,
        ) {}
      }

      const injectTokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);
      const lazyTokens = Reflect.getMetadata(METADATA.LAZY_TOKENS, TestService);

      expect(injectTokens[0]).toBe(TEST_TOKEN);
      expect(lazyTokens[0]).toBe(true);
    });
  });

  describe('Property decorator', () => {
    it('should mark property as lazy', () => {
      class TestService {
        @Lazy()
        value!: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties).toBeInstanceOf(Map);
      expect(properties.get('value').lazy).toBe(true);
    });

    it('should handle multiple lazy properties', () => {
      class TestService {
        @Lazy()
        first!: string;

        @Lazy()
        second!: number;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('first').lazy).toBe(true);
      expect(properties.get('second').lazy).toBe(true);
    });

    it('should work with @Inject decorator on property when applied manually', () => {
      // When using both decorators, apply Lazy after Inject
      class TestService {
        @Inject(TEST_TOKEN)
        value!: string;
      }

      // Apply Lazy manually after Inject
      Lazy()(TestService.prototype, 'value');

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('value').token).toBe(TEST_TOKEN);
      expect(properties.get('value').lazy).toBe(true);
    });

    it('should update existing property config', () => {
      class TestService {
        @Inject(TEST_TOKEN)
        value!: string;
      }

      // Apply Lazy after Inject
      Lazy()(TestService.prototype, 'value');

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('value').token).toBe(TEST_TOKEN);
      expect(properties.get('value').lazy).toBe(true);
    });

    it('should handle symbol property key', () => {
      const PROP_KEY = Symbol('lazyProp');

      class TestService {
        @Lazy()
        [PROP_KEY]!: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get(PROP_KEY).lazy).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should create empty array if no metadata exists', () => {
      class TestService {
        constructor(@Lazy() value: string) {}
      }

      const lazyTokens = Reflect.getMetadata(METADATA.LAZY_TOKENS, TestService);

      expect(Array.isArray(lazyTokens)).toBe(true);
    });

    it('should preserve existing lazy metadata', () => {
      class TestService {
        constructor(
          @Lazy() first: string,
          second: string,
        ) {}
      }

      // Add another lazy decorator
      Lazy()(TestService, undefined, 1);

      const lazyTokens = Reflect.getMetadata(METADATA.LAZY_TOKENS, TestService);

      expect(lazyTokens[0]).toBe(true);
      expect(lazyTokens[1]).toBe(true);
    });

    it('should create property config if none exists', () => {
      class TestService {
        @Lazy()
        newProp!: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('newProp')).toBeDefined();
      expect(properties.get('newProp').lazy).toBe(true);
    });
  });

  describe('Combined with other decorators', () => {
    it('should update existing config when using manual apply', () => {
      class TestService {
        @Inject(TEST_TOKEN)
        value!: string;
      }

      // Apply Lazy after Inject manually
      Lazy()(TestService.prototype, 'value');

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);
      const config = properties.get('value');

      expect(config.token).toBe(TEST_TOKEN);
      expect(config.lazy).toBe(true);
    });
  });
});
