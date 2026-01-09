/**
 * Basic Dependency Injection Example
 *
 * This example demonstrates:
 * - Creating an injectable service
 * - Using inject() for dependencies
 * - Using InjectionToken for configuration
 * - Optional dependencies with injectOptional()
 * - Conditional providers with defaultMetadata
 */

import 'reflect-metadata';
import {
  Container,
  Injectable,
  inject,
  injectOptional,
  InjectionToken,
} from '../../src';

// Configuration Tokens

const API_URL = new InjectionToken<string>('API_URL');
const DEBUG_MODE = new InjectionToken<boolean>('DEBUG_MODE');

// Services

/** Logger service - logs messages to console */
@Injectable()
class LoggerService {
  private debug = injectOptional(DEBUG_MODE) ?? false;

  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }

  debug_log(message: string): void {
    if (this.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

/** API Client - makes HTTP requests */
@Injectable()
class ApiClient {
  private apiUrl = inject(API_URL);
  private logger = inject(LoggerService);

  async get<T>(path: string): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    this.logger.log(`GET ${url}`);

    // Simulated response
    return { data: `Response from ${url}` } as T;
  }
}

/** User Service - manages users */
@Injectable()
class UserService {
  private api = inject(ApiClient);
  private logger = inject(LoggerService);

  async getUser(id: number) {
    this.logger.debug_log(`Fetching user ${id}`);
    const response = await this.api.get<{ data: string }>(`/users/${id}`);

    return { id, ...response };
  }

  async createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);

    return { id: Date.now(), name };
  }
}

// Main

async function main() {
  console.log('** Basic DI Example **\n');

  // Create container with configuration
  const container = new Container([
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: DEBUG_MODE, useValue: true },
    LoggerService,
    ApiClient,
    UserService,
  ]);

  // Resolve UserService - all dependencies are automatically injected
  const userService = container.get(UserService);

  // Use the service
  console.log('\n* Fetching User *');
  const user = await userService.getUser(1);
  console.log('User:', user);

  console.log('\n* Creating User *');
  const newUser = await userService.createUser('Alice');
  console.log('Created:', newUser);

  // Demonstrate optional dependency
  console.log('\n* Optional Dependency *');
  const containerWithoutDebug = new Container([
    { provide: API_URL, useValue: 'https://api.example.com' },
    // DEBUG_MODE is NOT provided
    LoggerService,
  ]);

  const logger = containerWithoutDebug.get(LoggerService);
  logger.log('This will be logged');
  logger.debug_log('This will NOT be logged (debug mode is off)');

  // Demonstrate conditional providers with defaultMetadata
  console.log('\n* Conditional Providers *');

  interface AppMetadata {
    environment: 'development' | 'production';
  }

  const LOGGER_TOKEN = new InjectionToken<{ log: (msg: string) => void }>('LOGGER');

  const containerWithMetadata = new Container<AppMetadata>(
    [
      {
        provide: LOGGER_TOKEN,
        useValue: {
          log: (msg: string) => console.log(`[DEV] ${msg}`),
        },
        when: (ctx) => ctx.metadata.get('environment') === 'development',
      },
      {
        provide: LOGGER_TOKEN,
        useValue: {
          log: (msg: string) => console.log(`[PROD] ${msg}`),
        },
        when: (ctx) => ctx.metadata.get('environment') === 'production',
      },
    ],
    undefined,
    {
      defaultMetadata: {
        environment: 'development', // Change to 'production' to see different output
      },
    }
  );

  const conditionalLogger = containerWithMetadata.get(LOGGER_TOKEN);
  conditionalLogger.log('Hello from conditional provider!');

  console.log('\n** Example Complete **');
}

main().catch(console.error);
