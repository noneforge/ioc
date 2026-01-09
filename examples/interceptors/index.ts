/**
 * Interceptors Example
 *
 * This example demonstrates:
 * - Using built-in interceptors (Caching, Logging, Validation)
 * - Creating custom class-based interceptors
 * - Creating functional interceptors (Angular 15+ style)
 * - Using inject() inside functional interceptors
 * - Helper functions: createInterceptor, composeInterceptors, when
 * - Combining multiple interceptors
 */

import 'reflect-metadata';
import {
  Container,
  Injectable,
  InjectionToken,
  CachingInterceptor,
  LoggingInterceptor,
  ValidationInterceptor,
  createInterceptor,
  composeInterceptors,
  when,
  inject,
} from '../../src';
import type { Interceptor, InterceptorFn, InjectionContext } from '../../src';

// Custom Interceptor

/**
 * Timing interceptor - measures resolution time
 */
class TimingInterceptor implements Interceptor {
  intercept<T>(context: InjectionContext, next: () => T): T {
    const start = performance.now();
    const result = next();
    const duration = performance.now() - start;

    console.log(`[TIMING] ${String(context.token)}: ${duration.toFixed(2)}ms`);

    return result;
  }
}

/**
 * Wrapper interceptor - wraps instances with proxy
 */
class ProxyInterceptor implements Interceptor {
  intercept<T>(_context: InjectionContext, next: () => T): T {
    const result = next();

    if (typeof result === 'object' && result !== null) {
      return new Proxy(result as object, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === 'function') {
            return function (this: unknown, ...args: unknown[]) {
              console.log(`[PROXY] ${String(prop)} called with:`, args);

              return value.apply(this, args);
            };
          }

          return value;
        },
      }) as T;
    }

    return result;
  }
}

// Functional Interceptors

/**
 * Timing interceptor as a function (simpler syntax)
 */
const timingInterceptorFn: InterceptorFn = (context, next) => {
  const start = performance.now();
  const result = next();
  const duration = performance.now() - start;

  console.log(`[TIMING-FN] ${String(context.token)}: ${duration.toFixed(2)}ms`);

  return result;
};

/**
 * Debug interceptor - logs resolution details
 */
const debugInterceptor: InterceptorFn = (context, next) => {
  console.log(`[DEBUG] Resolving: ${String(context.token)}`);
  console.log(`[DEBUG] Depth: ${context.depth}`);
  console.log(`[DEBUG] Strategy: ${context.strategy}`);

  return next();
};

/**
 * Uppercase transformer for string results
 */
const uppercaseInterceptor: InterceptorFn = (_context, next) => {
  const result = next();
  if (typeof result === 'string') {
    return result.toUpperCase();
  }

  return result;
};

// Services

interface ExpensiveData {
  id: number;
  data: string;
  timestamp: number;
}

@Injectable()
class ExpensiveService {
  private callCount = 0;

  compute(): ExpensiveData {
    this.callCount++;
    
    console.log(`[ExpensiveService] Computing... (call #${this.callCount})`);
    
    // Simulate expensive operation
    return {
      id: this.callCount,
      data: `Result from call #${this.callCount}`,
      timestamp: Date.now(),
    };
  }
}

@Injectable()
class CalculatorService {
  add(a: number, b: number): number {
    return a + b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }
}

// Tokens

const EXPENSIVE_SERVICE = new InjectionToken<ExpensiveService>('EXPENSIVE_SERVICE');
const VALIDATED_CONFIG = new InjectionToken<{ port: number }>('VALIDATED_CONFIG');
const CALCULATOR = new InjectionToken<CalculatorService>('CALCULATOR');

// Main

async function main() {
  console.log('** Interceptors Example **\n');

  // Caching Interceptor
  console.log('* Caching Interceptor *\n');

  const container1 = new Container([
    {
      provide: EXPENSIVE_SERVICE,
      useFactory: () => new ExpensiveService(),
      interceptors: [new CachingInterceptor(5000)], // Cache for 5 seconds
    },
  ]);

  const service1 = container1.get(EXPENSIVE_SERVICE);
  console.log('First call:', service1.compute());
  console.log('Second call (cached):', service1.compute());

  // Logging Interceptor
  console.log('\n* Logging Interceptor *\n');

  const customLogger = {
    debug: (msg: string, ...args: unknown[]) => console.log(`[CUSTOM DEBUG] ${msg}`, ...args),
    error: (msg: string, err?: Error) => console.error(`[CUSTOM ERROR] ${msg}`, err),
  };

  const container2 = new Container([
    {
      provide: CALCULATOR,
      useClass: CalculatorService,
      interceptors: [new LoggingInterceptor(customLogger)],
    },
  ]);

  container2.get(CALCULATOR);

  // Validation Interceptor
  console.log('\n* Validation Interceptor *\n');

  const container3 = new Container([
    {
      provide: VALIDATED_CONFIG,
      useValue: { port: 8080 },
      interceptors: [
        new ValidationInterceptor(
          (value) => {
            const config = value as { port: number };
            return config.port > 0 && config.port < 65536;
          },
          'Port must be between 1 and 65535'
        ),
      ],
    },
  ]);

  try {
    const config = container3.get(VALIDATED_CONFIG);
    console.log('Valid config:', config);
  } catch (error) {
    console.error('Validation failed:', error);
  }

  // Try with invalid config
  const container4 = new Container([
    {
      provide: VALIDATED_CONFIG,
      useValue: { port: -1 },
      interceptors: [
        new ValidationInterceptor(
          (value) => {
            const config = value as { port: number };
            return config.port > 0 && config.port < 65536;
          },
          'Port must be between 1 and 65535'
        ),
      ],
    },
  ]);

  try {
    container4.get(VALIDATED_CONFIG);
  } catch (error) {
    console.log('Caught validation error (expected):', (error as Error).message);
  }

  // Custom Interceptors
  console.log('\n* Custom Interceptors *\n');

  const container5 = new Container([
    {
      provide: CALCULATOR,
      useClass: CalculatorService,
      interceptors: [
        new TimingInterceptor(),
        new ProxyInterceptor(),
      ],
    },
  ]);

  const calc = container5.get(CALCULATOR);
  console.log('Result:', calc.add(5, 3));
  console.log('Result:', calc.multiply(4, 7));

  // Combined Interceptors
  console.log('\n* Combined Interceptors *\n');

  const container6 = new Container([
    {
      provide: EXPENSIVE_SERVICE,
      useFactory: () => new ExpensiveService(),
      interceptors: [
        new LoggingInterceptor(),
        new CachingInterceptor(10000),
        new TimingInterceptor(),
      ],
    },
  ]);

  console.log('First resolution:');
  const s1 = container6.get(EXPENSIVE_SERVICE);

  console.log('\nSecond resolution (from cache):');
  const s2 = container6.get(EXPENSIVE_SERVICE);

  console.log('\nSame instance?', s1 === s2);

  // Functional Interceptors
  console.log('\n* Functional Interceptors *\n');

  const STRING_VALUE = new InjectionToken<string>('STRING_VALUE');

  const container7 = new Container([
    {
      provide: STRING_VALUE,
      useValue: 'hello world',
      interceptors: [
        timingInterceptorFn,
        uppercaseInterceptor,
      ],
    },
  ]);

  const stringResult = container7.get(STRING_VALUE);
  console.log('Result (uppercased):', stringResult);

  // Mixing Class and Functional Interceptors
  console.log('\n* Mixing Class and Functional Interceptors *\n');

  const container8 = new Container([
    {
      provide: CALCULATOR,
      useClass: CalculatorService,
      interceptors: [
        new LoggingInterceptor(), // class-based
        timingInterceptorFn, // functional
        (_ctx, next) => { // inline functional
          console.log('[INLINE] Before resolution');
          const result = next();
          console.log('[INLINE] After resolution');

          return result;
        },
      ],
    },
  ]);

  container8.get(CALCULATOR);

  // Using inject() in Functional Interceptors
  console.log('\n* Using inject() in Functional Interceptors *\n');

  const LOGGER = new InjectionToken<{ log: (msg: string) => void }>('LOGGER');
  const GREETING = new InjectionToken<string>('GREETING');

  const loggingInterceptorWithInject: InterceptorFn = (context, next) => {
    // inject() works because we're in injection context
    const logger = inject(LOGGER);
    logger.log(`Resolving: ${String(context.token)}`);

    const result = next();
    logger.log(`Resolved: ${String(context.token)}`);

    return result;
  };

  const container9 = new Container([
    {
      provide: LOGGER,
      useValue: { log: (msg: string) => console.log(`[INJECTED LOGGER] ${msg}`) },
    },
    {
      provide: GREETING,
      useValue: 'Hello from injected interceptor!',
      interceptors: [loggingInterceptorWithInject],
    },
  ]);

  console.log('Greeting:', container9.get(GREETING));

  // Helper Functions
  console.log('\n* Helper Functions *\n');

  // createInterceptor - create from pre/post hooks
  const metricsInterceptor = createInterceptor({
    pre: (ctx) => {
      ctx.metadata.set('startTime', performance.now());

      console.log('[METRICS] Starting resolution');
    },
    post: (ctx, result) => {
      const startTime = ctx.metadata.get('startTime') as number;
      const duration = performance.now() - startTime;
      console.log(`[METRICS] Completed in ${duration.toFixed(2)}ms`);

      return result;
    },
  });

  const container10 = new Container([
    {
      provide: CALCULATOR,
      useClass: CalculatorService,
      interceptors: [metricsInterceptor],
    },
  ]);

  container10.get(CALCULATOR);

  // composeInterceptors - combine multiple into one
  console.log('\n[composeInterceptors example]');

  const combinedInterceptor = composeInterceptors(
    new LoggingInterceptor(),
    timingInterceptorFn,
    (_ctx, next) => {
      console.log('[COMPOSED] Middle interceptor');
      return next();
    },
  );

  const container11 = new Container([
    {
      provide: STRING_VALUE,
      useValue: 'composed example',
      interceptors: [combinedInterceptor],
    },
  ]);

  container11.get(STRING_VALUE);

  // when - conditional interceptor
  console.log('\n[when example - conditional]');

  const conditionalDebug = when(
    (ctx) => ctx.metadata.get('debug') === true,
    debugInterceptor,
  );

  const container12 = new Container([
    {
      provide: STRING_VALUE,
      useValue: 'conditional test',
      interceptors: [conditionalDebug],
      metadata: { debug: false },
    },
  ]);

  console.log('Without debug flag:');
  container12.get(STRING_VALUE);

  const container13 = new Container([
    {
      provide: STRING_VALUE,
      useValue: 'conditional test',
      interceptors: [conditionalDebug],
      metadata: { debug: true },
    },
  ]);

  console.log('\nWith debug flag:');
  container13.get(STRING_VALUE);

  console.log('\n** Example Complete **');
}

main().catch(console.error);
