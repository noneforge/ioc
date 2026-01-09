import { beforeEach, describe, expect, it } from 'vitest';

import type { DependencyNode, ProviderScope, Token } from '../../../src';
import { DependencyGraph, InjectionToken } from '../../../src';

// Helper to create dependency nodes
function createNode(
  token: Token,
  dependencies: Token[] = [],
  scope: ProviderScope = 'singleton',
): DependencyNode {
  return {
    token,
    dependencies,
    scope,
    optional: false,
    circular: false,
    depth: 0,
  };
}

// Test tokens
const TOKEN_A = new InjectionToken<string>('A');
const TOKEN_B = new InjectionToken<string>('B');
const TOKEN_C = new InjectionToken<string>('C');
const TOKEN_D = new InjectionToken<string>('D');
const TOKEN_E = new InjectionToken<string>('E');

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  // ========== addNode() ==========

  describe('addNode()', () => {
    it('should add a node without dependencies', () => {
      const node = createNode(TOKEN_A);

      graph.addNode(node);

      // Verify by checking missing dependencies (should be empty)
      expect(graph.getMissingDependencies()).toHaveLength(0);
    });

    it('should add a node with dependencies', () => {
      const nodeA = createNode(TOKEN_A);
      const nodeB = createNode(TOKEN_B, [TOKEN_A]);

      graph.addNode(nodeA);
      graph.addNode(nodeB);

      expect(graph.getMissingDependencies()).toHaveLength(0);
    });

    it('should handle multiple dependencies', () => {
      const nodeA = createNode(TOKEN_A);
      const nodeB = createNode(TOKEN_B);
      const nodeC = createNode(TOKEN_C, [TOKEN_A, TOKEN_B]);

      graph.addNode(nodeA);
      graph.addNode(nodeB);
      graph.addNode(nodeC);

      expect(graph.getMissingDependencies()).toHaveLength(0);
    });

    it('should overwrite existing node', () => {
      const nodeA1 = createNode(TOKEN_A, [], 'singleton');
      const nodeA2 = createNode(TOKEN_A, [TOKEN_B], 'transient');

      graph.addNode(nodeA1);
      graph.addNode(nodeA2);

      // Node A should now have TOKEN_B as dependency
      const missing = graph.getMissingDependencies();
      expect(missing).toContain(TOKEN_B);
    });
  });

  // ========== detectCycles() ==========

  describe('detectCycles()', () => {
    it('should return empty array for empty graph', () => {
      const cycles = graph.detectCycles();

      expect(cycles).toEqual([]);
    });

    it('should return empty array for single node without dependencies', () => {
      graph.addNode(createNode(TOKEN_A));

      const cycles = graph.detectCycles();

      expect(cycles).toEqual([]);
    });

    it('should return empty array for linear dependency chain', () => {
      // A -> B -> C (no cycles)
      graph.addNode(createNode(TOKEN_A));
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_B]));

      const cycles = graph.detectCycles();

      expect(cycles).toEqual([]);
    });

    it('should detect simple two-node cycle', () => {
      // A -> B -> A
      graph.addNode(createNode(TOKEN_A, [TOKEN_B]));
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));

      const cycles = graph.detectCycles();

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toHaveLength(2);
      expect(cycles[0]).toContain(TOKEN_A);
      expect(cycles[0]).toContain(TOKEN_B);
    });

    it('should detect three-node cycle', () => {
      // A -> B -> C -> A
      graph.addNode(createNode(TOKEN_A, [TOKEN_B]));
      graph.addNode(createNode(TOKEN_B, [TOKEN_C]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_A]));

      const cycles = graph.detectCycles();

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toHaveLength(3);
      expect(cycles[0]).toContain(TOKEN_A);
      expect(cycles[0]).toContain(TOKEN_B);
      expect(cycles[0]).toContain(TOKEN_C);
    });

    it('should NOT detect self-reference as cycle (Tarjan behavior)', () => {
      // A -> A (self-loop is SCC of size 1, not counted as cycle)
      graph.addNode(createNode(TOKEN_A, [TOKEN_A]));

      const cycles = graph.detectCycles();

      // Tarjan's algorithm only counts SCCs with size > 1
      expect(cycles).toHaveLength(0);
    });

    it('should detect multiple separate cycles', () => {
      // Cycle 1: A -> B -> A
      // Cycle 2: C -> D -> C
      graph.addNode(createNode(TOKEN_A, [TOKEN_B]));
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_D]));
      graph.addNode(createNode(TOKEN_D, [TOKEN_C]));

      const cycles = graph.detectCycles();

      expect(cycles).toHaveLength(2);
    });

    it('should handle diamond dependency without cycle', () => {
      //     A
      //    / \
      //   B   C
      //    \ /
      //     D
      graph.addNode(createNode(TOKEN_D));
      graph.addNode(createNode(TOKEN_B, [TOKEN_D]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_D]));
      graph.addNode(createNode(TOKEN_A, [TOKEN_B, TOKEN_C]));

      const cycles = graph.detectCycles();

      expect(cycles).toEqual([]);
    });

    it('should detect cycle within larger graph', () => {
      // E -> A -> B -> C -> A (cycle), D (no cycle)
      graph.addNode(createNode(TOKEN_A, [TOKEN_B]));
      graph.addNode(createNode(TOKEN_B, [TOKEN_C]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_A])); // Creates cycle
      graph.addNode(createNode(TOKEN_D)); // Independent
      graph.addNode(createNode(TOKEN_E, [TOKEN_A])); // Points to cycle

      const cycles = graph.detectCycles();

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toHaveLength(3);
    });
  });

  // ========== getCycleAnalysis() ==========

  describe('getCycleAnalysis()', () => {
    it('should return correct analysis for empty graph', () => {
      const analysis = graph.getCycleAnalysis();

      expect(analysis.cycles).toEqual([]);
      expect(analysis.depth).toBe(0);
      expect(analysis.totalNodes).toBe(0);
      expect(analysis.cycleNodes).toBe(0);
    });

    it('should return correct analysis for graph without cycles', () => {
      graph.addNode(createNode(TOKEN_A));
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_B]));

      const analysis = graph.getCycleAnalysis();

      expect(analysis.cycles).toEqual([]);
      expect(analysis.depth).toBe(0);
      expect(analysis.totalNodes).toBe(3);
      expect(analysis.cycleNodes).toBe(0);
    });

    it('should return correct analysis for graph with cycle', () => {
      // A -> B -> C -> A
      graph.addNode(createNode(TOKEN_A, [TOKEN_B]));
      graph.addNode(createNode(TOKEN_B, [TOKEN_C]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_A]));

      const analysis = graph.getCycleAnalysis();

      expect(analysis.cycles).toHaveLength(1);
      expect(analysis.depth).toBe(3); // max cycle length
      expect(analysis.totalNodes).toBe(3);
      expect(analysis.cycleNodes).toBe(3);
    });

    it('should return correct depth for multiple cycles', () => {
      // Cycle 1: A -> B -> A (length 2)
      // Cycle 2: C -> D -> E -> C (length 3)
      graph.addNode(createNode(TOKEN_A, [TOKEN_B]));
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_D]));
      graph.addNode(createNode(TOKEN_D, [TOKEN_E]));
      graph.addNode(createNode(TOKEN_E, [TOKEN_C]));

      const analysis = graph.getCycleAnalysis();

      expect(analysis.cycles).toHaveLength(2);
      expect(analysis.depth).toBe(3); // max of 2 and 3
      expect(analysis.totalNodes).toBe(5);
      expect(analysis.cycleNodes).toBe(5);
    });

    it('should count unique cycle nodes correctly', () => {
      // Only A and B are in cycle, C and D are not
      graph.addNode(createNode(TOKEN_A, [TOKEN_B]));
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_A])); // Points to cycle
      graph.addNode(createNode(TOKEN_D)); // Independent

      const analysis = graph.getCycleAnalysis();

      expect(analysis.totalNodes).toBe(4);
      expect(analysis.cycleNodes).toBe(2); // Only A and B
    });
  });

  // ========== getMissingDependencies() ==========

  describe('getMissingDependencies()', () => {
    it('should return empty array when all dependencies exist', () => {
      graph.addNode(createNode(TOKEN_A));
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));

      const missing = graph.getMissingDependencies();

      expect(missing).toEqual([]);
    });

    it('should return missing dependency token', () => {
      // B depends on A, but A is not added
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));

      const missing = graph.getMissingDependencies();

      expect(missing).toHaveLength(1);
      expect(missing).toContain(TOKEN_A);
    });

    it('should return multiple missing dependencies', () => {
      // C depends on A and B, but neither is added
      graph.addNode(createNode(TOKEN_C, [TOKEN_A, TOKEN_B]));

      const missing = graph.getMissingDependencies();

      expect(missing).toHaveLength(2);
      expect(missing).toContain(TOKEN_A);
      expect(missing).toContain(TOKEN_B);
    });

    it('should handle partial missing dependencies', () => {
      // C depends on A and B, but only A is added
      graph.addNode(createNode(TOKEN_A));
      graph.addNode(createNode(TOKEN_C, [TOKEN_A, TOKEN_B]));

      const missing = graph.getMissingDependencies();

      expect(missing).toHaveLength(1);
      expect(missing).toContain(TOKEN_B);
    });

    it('should return empty for graph with no dependencies', () => {
      graph.addNode(createNode(TOKEN_A));
      graph.addNode(createNode(TOKEN_B));
      graph.addNode(createNode(TOKEN_C));

      const missing = graph.getMissingDependencies();

      expect(missing).toEqual([]);
    });
  });

  // ========== getResolutionOrder() ==========

  describe('getResolutionOrder()', () => {
    it('should return empty array for empty graph', () => {
      const order = graph.getResolutionOrder();

      expect(order).toEqual([]);
    });

    it('should return single node for single-node graph', () => {
      graph.addNode(createNode(TOKEN_A));

      const order = graph.getResolutionOrder();

      expect(order).toEqual([TOKEN_A]);
    });

    it('should return correct order for linear chain', () => {
      // A -> B -> C (C has no deps, B depends on C, A depends on B)
      graph.addNode(createNode(TOKEN_C));
      graph.addNode(createNode(TOKEN_B, [TOKEN_C]));
      graph.addNode(createNode(TOKEN_A, [TOKEN_B]));

      const order = graph.getResolutionOrder();

      // Dependencies should come before dependents
      const indexC = order.indexOf(TOKEN_C);
      const indexB = order.indexOf(TOKEN_B);
      const indexA = order.indexOf(TOKEN_A);

      expect(indexC).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexA);
    });

    it('should handle diamond dependency correctly', () => {
      //     A
      //    / \
      //   B   C
      //    \ /
      //     D
      graph.addNode(createNode(TOKEN_D));
      graph.addNode(createNode(TOKEN_B, [TOKEN_D]));
      graph.addNode(createNode(TOKEN_C, [TOKEN_D]));
      graph.addNode(createNode(TOKEN_A, [TOKEN_B, TOKEN_C]));

      const order = graph.getResolutionOrder();

      const indexD = order.indexOf(TOKEN_D);
      const indexB = order.indexOf(TOKEN_B);
      const indexC = order.indexOf(TOKEN_C);
      const indexA = order.indexOf(TOKEN_A);

      // D should come before B and C
      expect(indexD).toBeLessThan(indexB);
      expect(indexD).toBeLessThan(indexC);
      // B and C should come before A
      expect(indexB).toBeLessThan(indexA);
      expect(indexC).toBeLessThan(indexA);
    });

    it('should include all nodes', () => {
      graph.addNode(createNode(TOKEN_A));
      graph.addNode(createNode(TOKEN_B));
      graph.addNode(createNode(TOKEN_C));

      const order = graph.getResolutionOrder();

      expect(order).toHaveLength(3);
      expect(order).toContain(TOKEN_A);
      expect(order).toContain(TOKEN_B);
      expect(order).toContain(TOKEN_C);
    });
  });

  // ========== visualize() ==========

  describe('visualize()', () => {
    it('should return header for empty graph', () => {
      const result = graph.visualize();

      expect(result).toBe('Dependency Graph:');
    });

    it('should include node without dependencies', () => {
      graph.addNode(createNode(TOKEN_A));

      const result = graph.visualize();

      expect(result).toContain('Dependency Graph:');
      expect(result).toContain('InjectionToken(A)');
      expect(result).toContain('[singleton]');
      expect(result).toContain('-> []');
    });

    it('should include node with dependencies', () => {
      graph.addNode(createNode(TOKEN_A));
      graph.addNode(createNode(TOKEN_B, [TOKEN_A]));

      const result = graph.visualize();

      expect(result).toContain('InjectionToken(B)');
      expect(result).toContain('[InjectionToken(A)]');
    });

    it('should include node with multiple dependencies', () => {
      graph.addNode(createNode(TOKEN_A));
      graph.addNode(createNode(TOKEN_B));
      graph.addNode(createNode(TOKEN_C, [TOKEN_A, TOKEN_B]));

      const result = graph.visualize();

      expect(result).toContain('InjectionToken(C)');
      // Dependencies should be comma-separated
      expect(result).toMatch(/-> \[.*InjectionToken\(A\).*,.*InjectionToken\(B\).*\]/);
    });

    it('should show different scopes', () => {
      graph.addNode(createNode(TOKEN_A, [], 'singleton'));
      graph.addNode(createNode(TOKEN_B, [], 'transient'));

      const result = graph.visualize();

      expect(result).toContain('[singleton]');
      expect(result).toContain('[transient]');
    });
  });

  // ========== Edge Cases ==========

  describe('Edge Cases', () => {
    it('should handle class tokens', () => {
      class ServiceA {}
      class ServiceB {}

      graph.addNode(createNode(ServiceA));
      graph.addNode(createNode(ServiceB, [ServiceA]));

      expect(graph.getMissingDependencies()).toEqual([]);
      expect(graph.detectCycles()).toEqual([]);
    });

    it('should handle string tokens', () => {
      graph.addNode(createNode('SERVICE_A'));
      graph.addNode(createNode('SERVICE_B', ['SERVICE_A']));

      expect(graph.getMissingDependencies()).toEqual([]);
    });

    it('should handle symbol tokens', () => {
      const SYM_A = Symbol('A');
      const SYM_B = Symbol('B');

      graph.addNode(createNode(SYM_A));
      graph.addNode(createNode(SYM_B, [SYM_A]));

      expect(graph.getMissingDependencies()).toEqual([]);
    });

    it('should handle mixed token types', () => {
      class ServiceA {}
      const TOKEN_STR = 'STRING_TOKEN';

      graph.addNode(createNode(ServiceA));
      graph.addNode(createNode(TOKEN_STR, [ServiceA]));
      graph.addNode(createNode(TOKEN_A, [TOKEN_STR]));

      expect(graph.getMissingDependencies()).toEqual([]);
    });
  });
});
