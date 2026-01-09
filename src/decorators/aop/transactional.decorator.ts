import 'reflect-metadata';

import { METADATA } from '../../constants';

/**
 * Marks a method as transactional for use with transaction middleware.
 *
 * This is a marker decorator that sets metadata but doesn't execute any logic itself.
 * Transaction boundaries and rollback behavior are handled by interceptors or middleware
 * that check for this metadata.
 *
 * @example
 * ```ts
 * class OrderService {
 *   @Transactional()
 *   createOrder(items: Item[]): Order {
 *     // Runs within transaction context when transaction middleware is active
 *     this.saveOrder(order);
 *     this.updateInventory(items);
 *     return order;
 *   }
 * }
 * ```
 */
export function Transactional(): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(METADATA.TRANSACTIONAL, true, target, propertyKey);

    return descriptor;
  };
}
