/**
 * Scopes Example
 *
 * This example demonstrates all 5 provider scopes:
 * - Singleton scope (default) - shared instances
 * - Transient scope - new instance every time
 * - Request scope - one instance per request ID
 * - Prototype scope - new instance with shared prototype
 * - Scoped scope - custom named scopes with ScopeManager
 */

import 'reflect-metadata';
import { Container, Injectable, inject, ScopeManager } from '../../src';

// Counter for tracking instances

let instanceCounter = 0;
function getNextId(): number {
  instanceCounter += 1;

  return instanceCounter;
}

// Singleton Scope

@Injectable({ scope: 'singleton' })
class SingletonService {
  readonly id = getNextId();

  getId(): number {
    return this.id;
  }
}

// Transient Scope

@Injectable({ scope: 'transient' })
class TransientService {
  readonly id = getNextId();

  getId(): number {
    return this.id;
  }
}

// Request Scope

@Injectable({ scope: 'request' })
class RequestContext {
  readonly id = getNextId();
  userId?: string;
  startTime = Date.now();

  setUser(userId: string): void {
    this.userId = userId;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

// Services that use scoped dependencies

@Injectable()
class ServiceA {
  private singleton = inject(SingletonService);
  private transient = inject(TransientService);

  getIds() {
    return {
      singleton: this.singleton.getId(),
      transient: this.transient.getId(),
    };
  }
}

@Injectable()
class ServiceB {
  private singleton = inject(SingletonService);
  private transient = inject(TransientService);

  getIds() {
    return {
      singleton: this.singleton.getId(),
      transient: this.transient.getId(),
    };
  }
}

@Injectable()
class RequestHandler {
  private context = inject(RequestContext);

  processRequest(userId: string): void {
    this.context.setUser(userId);

    console.log(`Processing request for user ${userId}`);
    console.log(`Request context ID: ${this.context.id}`);
  }

  finishRequest(): void {
    console.log(`Request completed in ${this.context.getDuration()}ms`);
  }
}

// Prototype Scope

/**
 * Prototype scope creates new instances each time,
 * but all instances share the same prototype chain.
 * Useful for object factories.
 */
@Injectable({ scope: 'prototype' })
class GameEntity {
  readonly id = getNextId();
  x = 0;
  y = 0;

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  getPosition(): string {
    return `Entity ${this.id} at (${this.x}, ${this.y})`;
  }
}

// Main

async function main() {
  console.log('** Scopes Example **\n');

  const container = new Container([
    SingletonService,
    TransientService,
    RequestContext,
    ServiceA,
    ServiceB,
    RequestHandler,
    GameEntity,
  ]);

  // Singleton vs Transient
  console.log('* Singleton vs Transient *\n');

  const serviceA = container.get(ServiceA);
  const serviceB = container.get(ServiceB);

  console.log('ServiceA IDs:', serviceA.getIds());
  console.log('ServiceB IDs:', serviceB.getIds());
  console.log();

  // Get services again
  const serviceA2 = container.get(ServiceA);
  const serviceB2 = container.get(ServiceB);

  console.log('ServiceA IDs (second get):', serviceA2.getIds());
  console.log('ServiceB IDs (second get):', serviceB2.getIds());
  console.log();

  console.log('Observations:');
  console.log('- Singleton IDs are the same across all services');
  console.log('- Transient IDs are different for each resolution');
  console.log('- ServiceA/B are singletons, so their transient deps were resolved once');

  // Request Scope
  console.log('\n* Request Scope *\n');

  // Simulate two concurrent requests
  const request1Id = Symbol('request-1');
  const request2Id = Symbol('request-2');

  console.log('Request 1:');
  const handler1a = container.get(RequestHandler, { requestId: request1Id });
  handler1a.processRequest('user-alice');
  handler1a.finishRequest();

  console.log('\nRequest 2:');
  const handler2a = container.get(RequestHandler, { requestId: request2Id });
  handler2a.processRequest('user-bob');
  handler2a.finishRequest();

  // Get handlers again within same requests
  console.log('\nGetting handlers again (same request IDs):');
  // These demonstrate that handlers share context within the same request
  void container.get(RequestHandler, { requestId: request1Id });
  void container.get(RequestHandler, { requestId: request2Id });

  // They should share the same RequestContext within their request
  const ctx1a = container.get(RequestContext, { requestId: request1Id });
  const ctx1b = container.get(RequestContext, { requestId: request1Id });
  const ctx2a = container.get(RequestContext, { requestId: request2Id });

  console.log(`\nRequest 1 context ID (first get):  ${ctx1a.id}`);
  console.log(`Request 1 context ID (second get): ${ctx1b.id}`);
  console.log(`Request 2 context ID:              ${ctx2a.id}`);
  console.log(`Same context within request 1? ${ctx1a === ctx1b}`);
  console.log(`Different context between requests? ${ctx1a !== ctx2a}`);

  // Prototype Scope
  console.log('\n* Prototype Scope *\n');

  const entity1 = container.get(GameEntity);
  const entity2 = container.get(GameEntity);
  const entity3 = container.get(GameEntity);

  console.log('Created 3 entities:');
  console.log(`  ${entity1.getPosition()}`);
  console.log(`  ${entity2.getPosition()}`);
  console.log(`  ${entity3.getPosition()}`);

  // Move entities independently
  entity1.move(10, 20);
  entity2.move(-5, 15);

  console.log('\nAfter moving:');
  console.log(`  ${entity1.getPosition()}`);
  console.log(`  ${entity2.getPosition()}`);
  console.log(`  ${entity3.getPosition()} (not moved)`);

  // Check shared prototype
  const samePrototype = Object.getPrototypeOf(entity1) === Object.getPrototypeOf(entity2);
  console.log(`\nShared prototype: ${samePrototype}`);
  console.log('Each entity has unique ID but shares prototype methods');

  // Custom Scopes with ScopeManager
  console.log('\n* Custom Scopes (Multi-tenant) *\n');

  /**
   * ScopeManager allows manual scope management for custom lifecycles.
   * Useful for multi-tenant applications where each tenant has isolated instances.
   */
  const scopeManager = new ScopeManager();

  // Create scopes for different tenants
  scopeManager.createScope('tenant-acme');
  scopeManager.createScope('tenant-globex');

  console.log('Created scopes:', scopeManager.listScopes());

  // Store tenant-specific instances in scopes
  const TENANT_CONFIG = 'tenant-config';

  // Create config for ACME tenant
  const acmeConfig = { name: 'ACME Corp', maxUsers: 100 };
  scopeManager.setInScope('tenant-acme', TENANT_CONFIG, acmeConfig);

  // Create config for Globex tenant
  const globexConfig = { name: 'Globex Inc', maxUsers: 500 };
  scopeManager.setInScope('tenant-globex', TENANT_CONFIG, globexConfig);

  // Retrieve from specific scopes
  console.log('\nRetrieving configs:');
  console.log('ACME config:', scopeManager.getFromScope('tenant-acme', TENANT_CONFIG));
  console.log('Globex config:', scopeManager.getFromScope('tenant-globex', TENANT_CONFIG));

  // Same scope returns same instance
  const acme1 = scopeManager.getFromScope('tenant-acme', TENANT_CONFIG);
  const acme2 = scopeManager.getFromScope('tenant-acme', TENANT_CONFIG);
  console.log(`\nSame instance in scope: ${acme1 === acme2}`);

  // Different scopes have different instances
  const globex = scopeManager.getFromScope('tenant-globex', TENANT_CONFIG);
  console.log(`Different from other scope: ${acme1 !== globex}`);

  // Check scope existence
  console.log(`\nHas 'tenant-acme': ${scopeManager.hasScope('tenant-acme')}`);
  console.log(`Has 'tenant-unknown': ${scopeManager.hasScope('tenant-unknown')}`);

  // Cleanup scope (calls onDestroy if instances implement it)
  console.log('\nClearing tenant-acme scope...');
  await scopeManager.clearScope('tenant-acme');

  // Delete scope entirely
  scopeManager.deleteScope('tenant-acme');
  console.log('Remaining scopes:', scopeManager.listScopes());

  // Simulating HTTP Request Flow
  console.log('\n* HTTP Request Simulation *\n');

  function handleHttpRequest(userId: string) {
    const requestId = Symbol(`http-request-${Date.now()}`);

    // All services within this request share the same RequestContext
    const context = container.get(RequestContext, { requestId });
    context.setUser(userId);

    console.log(`[${requestId.toString()}] Started for user: ${userId}`);
    console.log(`[${requestId.toString()}] Context ID: ${context.id}`);

    // Simulate async work
    setTimeout(() => {
      // Get context again - should be the same instance
      const ctx = container.get(RequestContext, { requestId });
      console.log(`[${requestId.toString()}] Finished, duration: ${ctx.getDuration()}ms`);
    }, 50);
  }

  handleHttpRequest('alice');
  handleHttpRequest('bob');
  handleHttpRequest('charlie');

  // Wait for async operations
  await new Promise((resolve) => setTimeout(resolve, 200));

  console.log('\n** Example Complete **');
}

main().catch(console.error);
