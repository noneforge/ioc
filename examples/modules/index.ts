/**
 * Module System Example
 *
 * This example demonstrates:
 * - Creating modules with @Module decorator
 * - Module imports and exports
 * - Dynamic modules with createDynamicModule
 * - Configurable modules with forRoot/forChild
 */

import 'reflect-metadata';
import {
  Container,
  Module,
  Injectable,
  inject,
  InjectionToken,
  createDynamicModule,
  createConfigurableModule,
} from '../../src';

// Configuration

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
}

const DB_CONFIG = new InjectionToken<DatabaseConfig>('DB_CONFIG');
const API_KEY = new InjectionToken<string>('API_KEY');

// Core Module

@Injectable()
class LoggerService {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
class CoreModule {}

// Database Module (Configurable)

@Injectable()
class DatabaseService {
  private config = inject(DB_CONFIG);
  private logger = inject(LoggerService);

  connect(): void {
    const { host, port, database } = this.config;
    this.logger.log(`Connecting to ${host}:${port}/${database}`);
  }

  query(sql: string): void {
    this.logger.log(`Executing: ${sql}`);
  }
}

// Create configurable module
const DatabaseModule = createConfigurableModule<DatabaseConfig>((config) => ({
  imports: [CoreModule],
  providers: [
    { provide: DB_CONFIG, useValue: config },
    DatabaseService,
  ],
  exports: [DatabaseService],
}));

// API Module (Dynamic)

@Injectable()
class ApiService {
  private apiKey = inject(API_KEY);
  private logger = inject(LoggerService);

  call(endpoint: string): void {
    this.logger.log(`API call to ${endpoint} with key: ${this.apiKey.slice(0, 4)}****`);
  }
}

function createApiModule(apiKey: string) {
  return createDynamicModule({
    module: class ApiModule {},
    imports: [CoreModule],
    providers: [
      { provide: API_KEY, useValue: apiKey },
      ApiService,
    ],
    exports: [ApiService],
  });
}

// Feature Module

@Injectable()
class UserRepository {
  private db = inject(DatabaseService);
  private logger = inject(LoggerService);

  findById(id: number) {
    this.logger.log(`Finding user ${id}`);
    this.db.query(`SELECT * FROM users WHERE id = ${id}`);

    return { id, name: 'John' };
  }
}

@Injectable()
class UserService {
  private repo = inject(UserRepository);
  private api = inject(ApiService);
  private logger = inject(LoggerService);

  getUser(id: number) {
    this.logger.log(`Getting user ${id}`);
    this.api.call('/validate-session');

    return this.repo.findById(id);
  }
}

// Main Application Module

const ApiModule = createApiModule('sk-secret-key-12345');

@Module({
  imports: [
    CoreModule,
    DatabaseModule.forRoot({
      host: 'localhost',
      port: 5432,
      database: 'myapp',
    }),
    ApiModule,
  ],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
class AppModule {}

// Main

function main() {
  console.log('** Module System Example **\n');

  // Create container and load main module
  const container = new Container();
  container.loadModule(AppModule);

  // Get services
  const userService = container.get(UserService);
  const dbService = container.get(DatabaseService);

  // Connect to database
  console.log('* Database Connection *');
  dbService.connect();

  // Use user service
  console.log('\n* User Service *');
  const user = userService.getUser(1);
  console.log('User:', user);

  // Demonstrate forChild for feature module
  console.log('\n* Feature Module with forChild *');

  @Module({
    imports: [
      DatabaseModule.forChild({
        database: 'analytics', // Override only database name
        host: 'localhost',
        port: 5432,
      }),
    ],
  })
  class AnalyticsModule {}

  const analyticsContainer = new Container();
  analyticsContainer.loadModule(CoreModule);
  analyticsContainer.loadModule(AnalyticsModule);

  const analyticsDb = analyticsContainer.get(DatabaseService);
  analyticsDb.connect(); // Uses 'analytics' database

  console.log('\n** Example Complete **');
}

main();
