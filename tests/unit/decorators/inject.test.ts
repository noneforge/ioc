import { describe, expect, it } from 'vitest';

import { forwardRef, Inject, InjectionToken, METADATA, Optional } from '../../../src';

const TEST_TOKEN = new InjectionToken<string>('TEST_TOKEN');
const OTHER_TOKEN = new InjectionToken<number>('OTHER_TOKEN');

describe('@Inject', () => {
  describe('Parameter decorator', () => {
    it('should store token for constructor parameter', () => {
      class TestService {
        constructor(@Inject(TEST_TOKEN) value: string) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(tokens).toBeDefined();
      expect(tokens[0]).toBe(TEST_TOKEN);
    });

    it('should handle multiple parameter injections', () => {
      class TestService {
        constructor(
          @Inject(TEST_TOKEN) first: string,
          @Inject(OTHER_TOKEN) second: number,
        ) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(tokens[0]).toBe(TEST_TOKEN);
      expect(tokens[1]).toBe(OTHER_TOKEN);
    });

    it('should handle non-consecutive parameter indexes', () => {
      class TestService {
        constructor(
          first: string,
          @Inject(TEST_TOKEN) second: string,
          third: number,
        ) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(tokens[0]).toBeUndefined();
      expect(tokens[1]).toBe(TEST_TOKEN);
      expect(tokens[2]).toBeUndefined();
    });

    it('should handle string token', () => {
      class TestService {
        constructor(@Inject('STRING_TOKEN') value: string) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(tokens[0]).toBe('STRING_TOKEN');
    });

    it('should handle symbol token', () => {
      const SYMBOL_TOKEN = Symbol('SYMBOL_TOKEN');

      class TestService {
        constructor(@Inject(SYMBOL_TOKEN) value: string) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(tokens[0]).toBe(SYMBOL_TOKEN);
    });

    it('should handle class token', () => {
      class DependencyService {}

      class TestService {
        constructor(@Inject(DependencyService) dep: DependencyService) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(tokens[0]).toBe(DependencyService);
    });

    it('should resolve forward reference', () => {
      class LazyService {}
      const ref = forwardRef(() => LazyService);

      class TestService {
        constructor(@Inject(ref) lazy: LazyService) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(tokens[0]).toBe(LazyService);
    });
  });

  describe('Property decorator', () => {
    it('should store property injection config', () => {
      class TestService {
        @Inject(TEST_TOKEN)
        value!: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties).toBeInstanceOf(Map);
      expect(properties.get('value')).toBeDefined();
      expect(properties.get('value').token).toBe(TEST_TOKEN);
    });

    it('should handle multiple property injections', () => {
      class TestService {
        @Inject(TEST_TOKEN)
        first!: string;

        @Inject(OTHER_TOKEN)
        second!: number;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('first').token).toBe(TEST_TOKEN);
      expect(properties.get('second').token).toBe(OTHER_TOKEN);
    });

    it('should set optional to false by default', () => {
      class TestService {
        @Inject(TEST_TOKEN)
        value!: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('value').optional).toBe(false);
    });

    it('should set lazy to false by default', () => {
      class TestService {
        @Inject(TEST_TOKEN)
        value!: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('value').lazy).toBe(false);
    });

    it('should handle symbol property key', () => {
      const PROP_KEY = Symbol('prop');

      class TestService {
        @Inject(TEST_TOKEN)
        [PROP_KEY]!: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get(PROP_KEY).token).toBe(TEST_TOKEN);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty existing metadata', () => {
      class TestService {
        constructor(@Inject(TEST_TOKEN) value: string) {}
      }

      // First access creates the array
      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(Array.isArray(tokens)).toBe(true);
    });

    it('should preserve existing parameter metadata', () => {
      class TestService {
        constructor(
          @Inject(TEST_TOKEN) first: string,
          second: string,
        ) {}
      }

      // Add another decorator
      Inject(OTHER_TOKEN)(TestService, undefined, 1);

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);

      expect(tokens[0]).toBe(TEST_TOKEN);
      expect(tokens[1]).toBe(OTHER_TOKEN);
    });
  });
});

describe('@Optional', () => {
  describe('Parameter decorator', () => {
    it('should mark parameter as optional', () => {
      class TestService {
        constructor(@Optional() value?: string) {}
      }

      const optionals = Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, TestService);

      expect(optionals).toBeDefined();
      expect(optionals[0]).toBe(true);
    });

    it('should handle multiple optional parameters', () => {
      class TestService {
        constructor(
          @Optional() first?: string,
          @Optional() second?: number,
        ) {}
      }

      const optionals = Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, TestService);

      expect(optionals[0]).toBe(true);
      expect(optionals[1]).toBe(true);
    });

    it('should handle non-consecutive optional parameters', () => {
      class TestService {
        constructor(
          required: string,
          @Optional() optional?: string,
          alsoRequired = 0,
        ) {}
      }

      const optionals = Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, TestService);

      expect(optionals[0]).toBeUndefined();
      expect(optionals[1]).toBe(true);
      expect(optionals[2]).toBeUndefined();
    });

    it('should work with @Inject decorator', () => {
      class TestService {
        constructor(
          @Inject(TEST_TOKEN) @Optional() value?: string,
        ) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);
      const optionals = Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, TestService);

      expect(tokens[0]).toBe(TEST_TOKEN);
      expect(optionals[0]).toBe(true);
    });
  });

  describe('Property decorator', () => {
    it('should mark property as optional', () => {
      class TestService {
        @Optional()
        value?: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties).toBeInstanceOf(Map);
      expect(properties.get('value').optional).toBe(true);
    });

    it('should work with @Inject decorator on property after @Optional', () => {
      // When using both decorators, apply them manually in correct order
      class TestService {
        @Inject(TEST_TOKEN)
        value?: string;
      }

      // Apply Optional manually after Inject (property decorator has 2 args)
      Optional()(TestService.prototype, 'value');

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('value').token).toBe(TEST_TOKEN);
      expect(properties.get('value').optional).toBe(true);
    });

    it('should update existing property config', () => {
      class TestService {
        @Inject(TEST_TOKEN)
        value?: string;
      }

      // Apply Optional after Inject (property decorator has 2 args)
      Optional()(TestService.prototype, 'value');

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get('value').token).toBe(TEST_TOKEN);
      expect(properties.get('value').optional).toBe(true);
    });

    it('should handle symbol property key', () => {
      const PROP_KEY = Symbol('optionalProp');

      class TestService {
        @Optional()
        [PROP_KEY]?: string;
      }

      const properties = Reflect.getMetadata(METADATA.INJECT_PROPERTIES, TestService.prototype);

      expect(properties.get(PROP_KEY).optional).toBe(true);
    });
  });

  describe('Decorator order', () => {
    it('should work when @Optional comes before @Inject', () => {
      class TestService {
        constructor(
          @Optional() @Inject(TEST_TOKEN) value?: string,
        ) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);
      const optionals = Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, TestService);

      expect(tokens[0]).toBe(TEST_TOKEN);
      expect(optionals[0]).toBe(true);
    });

    it('should work when @Inject comes before @Optional', () => {
      class TestService {
        constructor(
          @Inject(TEST_TOKEN) @Optional() value?: string,
        ) {}
      }

      const tokens = Reflect.getMetadata(METADATA.INJECT_TOKENS, TestService);
      const optionals = Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, TestService);

      expect(tokens[0]).toBe(TEST_TOKEN);
      expect(optionals[0]).toBe(true);
    });
  });
});
