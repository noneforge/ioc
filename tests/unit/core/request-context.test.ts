import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestContext } from '../../../src';

describe('RequestContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createdAt', () => {
    it('should record creation timestamp', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const context = new RequestContext('test-id');

      expect(context.createdAt).toBe(now);
    });
  });

  describe('getDuration', () => {
    it('should return elapsed time since creation', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const context = new RequestContext('test-id');

      vi.advanceTimersByTime(100);

      expect(context.getDuration()).toBe(100);
    });

    it('should continue tracking duration over time', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const context = new RequestContext('test-id');

      vi.advanceTimersByTime(50);
      expect(context.getDuration()).toBe(50);

      vi.advanceTimersByTime(150);
      expect(context.getDuration()).toBe(200);
    });
  });

  describe('id', () => {
    it('should use provided string id', () => {
      const context = new RequestContext('my-request');
      expect(context.id).toBe('my-request');
    });

    it('should use provided symbol id', () => {
      const id = Symbol('my-request');
      const context = new RequestContext(id);
      expect(context.id).toBe(id);
    });

    it('should generate symbol id when not provided', () => {
      const context = new RequestContext();
      expect(typeof context.id).toBe('symbol');
    });
  });

  describe('metadata', () => {
    it('should initialize with empty metadata map', () => {
      const context = new RequestContext();
      expect(context.metadata).toBeInstanceOf(Map);
      expect(context.metadata.size).toBe(0);
    });

    it('should allow storing and retrieving metadata', () => {
      const context = new RequestContext();
      context.metadata.set('userId', 'user-123');
      expect(context.metadata.get('userId')).toBe('user-123');
    });
  });

  describe('instances', () => {
    it('should store and retrieve instances by token', () => {
      const context = new RequestContext();
      const token = Symbol('service');
      const instance = { name: 'test-service' };

      context.setInstance(token, instance);

      expect(context.getInstance(token)).toBe(instance);
    });

    it('should return undefined for unknown tokens', () => {
      const context = new RequestContext();
      expect(context.getInstance(Symbol('unknown'))).toBeUndefined();
    });

    it('should look up instances from parent context', () => {
      const parent = new RequestContext('parent');
      const child = new RequestContext('child', parent);

      const token = Symbol('service');
      const instance = { name: 'parent-service' };
      parent.setInstance(token, instance);

      expect(child.getInstance(token)).toBe(instance);
    });

    it('should prefer child instance over parent', () => {
      const parent = new RequestContext('parent');
      const child = new RequestContext('child', parent);

      const token = Symbol('service');
      const parentInstance = { name: 'parent' };
      const childInstance = { name: 'child' };

      parent.setInstance(token, parentInstance);
      child.setInstance(token, childInstance);

      expect(child.getInstance(token)).toBe(childInstance);
    });
  });

  describe('createChild', () => {
    it('should create child context with parent reference', () => {
      const parent = new RequestContext('parent');
      const child = parent.createChild();

      const token = Symbol('service');
      const instance = { name: 'test' };
      parent.setInstance(token, instance);

      expect(child.getInstance(token)).toBe(instance);
    });

    it('should give child unique symbol id', () => {
      const parent = new RequestContext('parent');
      const child = parent.createChild();

      expect(typeof child.id).toBe('symbol');
      expect(child.id).not.toBe(parent.id);
    });
  });

  describe('dispose', () => {
    it('should call onDestroy on instances', async () => {
      const context = new RequestContext();
      const onDestroy = vi.fn();
      const instance = { onDestroy };

      context.setInstance(Symbol('service'), instance);
      await context.dispose();

      expect(onDestroy).toHaveBeenCalledOnce();
    });

    it('should call dispose on Disposable instances', async () => {
      const context = new RequestContext();
      const dispose = vi.fn();
      const instance = { dispose };

      context.setInstance(Symbol('service'), instance);
      await context.dispose();

      expect(dispose).toHaveBeenCalledOnce();
    });

    it('should clear all instances after dispose', async () => {
      const context = new RequestContext();
      const token = Symbol('service');
      context.setInstance(token, { name: 'test' });

      await context.dispose();

      expect(context.getInstance(token)).toBeUndefined();
    });

    it('should dispose instances in reverse order', async () => {
      const context = new RequestContext();
      const order: string[] = [];

      context.setInstance(Symbol('first'), {
        onDestroy: () => order.push('first'),
      });
      context.setInstance(Symbol('second'), {
        onDestroy: () => order.push('second'),
      });
      context.setInstance(Symbol('third'), {
        onDestroy: () => order.push('third'),
      });

      await context.dispose();

      expect(order).toEqual(['third', 'second', 'first']);
    });
  });
});
