import type { DependencyNode, Token } from '../types';
import { tokenToString } from '../utils';

/** Cycle analysis result with detected circular dependencies and statistics */
export interface DependencyGraphCycleAnalysis {
  /** Each inner array represents one circular dependency chain */
  cycles: Token[][];
  /** Length of the longest cycle detected */
  depth: number;
  /** Total number of nodes in the dependency graph */
  totalNodes: number;
  /** Count of unique nodes participating in any cycle */
  cycleNodes: number;
}

/**
 * Tracks provider dependencies for cycle detection, validation, and resolution ordering.
 * Uses Tarjan's algorithm for strongly connected component detection.
 */
export class DependencyGraph {
  private readonly nodes = new Map<Token, DependencyNode>();
  private readonly edges = new Map<Token, Set<Token>>();

  /** Adds a dependency node and its edges to the graph */
  addNode(node: DependencyNode): void {
    this.nodes.set(node.token, node);

    let edgeSet = this.edges.get(node.token);
    if (edgeSet === undefined) {
      edgeSet = new Set();
      this.edges.set(node.token, edgeSet);
    }

    for (const dep of node.dependencies) {
      edgeSet.add(dep);
    }
  }

  /** Detects circular dependencies using Tarjan's strongly connected components algorithm */
  detectCycles(): Token[][] {
    const cycles: Token[][] = [];
    const index = new Map<Token, number>();
    const lowLink = new Map<Token, number>();
    const onStack = new Set<Token>();
    const stack: Token[] = [];
    let indexCounter = 0;

    const tarjan = (v: Token) => {
      index.set(v, indexCounter);
      lowLink.set(v, indexCounter);

      indexCounter += 1;

      stack.push(v);
      onStack.add(v);

      const neighbors = this.edges.get(v) ?? new Set<Token>();
      for (const w of neighbors) {
        if (!index.has(w)) {
          tarjan(w);

          const vLowLink = lowLink.get(v) ?? 0;
          const wLowLink = lowLink.get(w) ?? 0;

          lowLink.set(v, Math.min(vLowLink, wLowLink));
        } else if (onStack.has(w)) {
          const vLowLink = lowLink.get(v) ?? 0;
          const wIndex = index.get(w) ?? 0;

          lowLink.set(v, Math.min(vLowLink, wIndex));
        }
      }

      if (lowLink.get(v) === index.get(v)) {
        const scc: Token[] = [];
        let w: Token | undefined;

        do {
          w = stack.pop();
          if (w === undefined) {
            break;
          }

          onStack.delete(w);
          scc.push(w);
        } while (w !== v);

        if (scc.length > 1) {
          cycles.push(scc);
        }
      }
    };

    for (const token of this.nodes.keys()) {
      if (!index.has(token)) {
        tarjan(token);
      }
    }

    return cycles;
  }

  /** Analyzes cycles with statistics including cycle depth and affected node count */
  getCycleAnalysis(): DependencyGraphCycleAnalysis {
    const cycles = this.detectCycles();
    const cycleNodes = new Set<Token>();

    for (const cycle of cycles) {
      for (const node of cycle) {
        cycleNodes.add(node);
      }
    }

    let maxDepth = 0;
    for (const cycle of cycles) {
      maxDepth = Math.max(maxDepth, cycle.length);
    }

    return {
      cycles,
      depth: maxDepth,
      totalNodes: this.nodes.size,
      cycleNodes: cycleNodes.size,
    };
  }

  /** Finds dependencies referenced in edges but not registered as nodes */
  getMissingDependencies(): Token[] {
    const missing: Token[] = [];

    for (const deps of this.edges.values()) {
      for (const dep of deps) {
        if (!this.nodes.has(dep)) {
          missing.push(dep);
        }
      }
    }

    return missing;
  }

  /**
   * Computes topological sort order where dependencies appear before their dependents.
   * Uses depth-first traversal to ensure correct resolution order.
   */
  getResolutionOrder(): Token[] {
    const sorted: Token[] = [];
    const visited = new Set<Token>();

    const visit = (token: Token) => {
      if (visited.has(token)) {
        return;
      }

      visited.add(token);

      const deps = this.edges.get(token) ?? new Set<Token>();
      for (const dep of deps) {
        visit(dep);
      }

      sorted.push(token);
    };

    for (const token of this.nodes.keys()) {
      visit(token);
    }

    return sorted;
  }

  /** Generates a human-readable multi-line representation showing tokens, scopes, and dependencies */
  visualize(): string {
    const lines: string[] = ['Dependency Graph:'];

    for (const [token, node] of this.nodes) {
      const tokenName = tokenToString(token);
      const deps = node.dependencies.map((d) => tokenToString(d)).join(', ');
      lines.push(`  ${tokenName} [${node.scope}] -> [${deps}]`);
    }

    return lines.join('\n');
  }
}
