/**
 * Dependency Graph Example
 *
 * This example demonstrates:
 * - Creating and populating a dependency graph
 * - Detecting circular dependencies with detectCycles()
 * - Analyzing cycles with getCycleAnalysis()
 * - Finding missing dependencies with getMissingDependencies()
 * - Computing resolution order with getResolutionOrder()
 * - Visualizing the graph with visualize()
 * - Using container.validate() for validation
 */

import 'reflect-metadata';
import { Container, DependencyGraph, Injectable, inject } from '../../src';
import type { DependencyNode, ProviderScope, Token } from '../../src';

// Helper to create nodes

function createNode(
  token: Token,
  dependencies: Token[] = [],
  scope: ProviderScope = 'singleton'
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

// Main

function main() {
  console.log('** Dependency Graph Example **\n');

  // 1. Basic Graph Usage
  console.log('* 1. Basic Graph Usage *');

  const graph = new DependencyGraph();

  // Add nodes representing our services
  graph.addNode(createNode('DatabaseConnection'));
  graph.addNode(createNode('UserRepository', ['DatabaseConnection']));
  graph.addNode(createNode('UserService', ['UserRepository']));
  graph.addNode(createNode('EmailService', ['UserService']));

  // Visualize the graph
  console.log(graph.visualize());

  // 2. Cycle Detection
  console.log('\n* 2. Cycle Detection *');

  const cycles = graph.detectCycles();
  if (cycles.length === 0) {
    console.log('No circular dependencies detected');
  } else {
    console.log('Cycles found:', cycles);
  }

  // 3. Cycle Analysis
  console.log('\n* 3. Cycle Analysis *');

  const analysis = graph.getCycleAnalysis();
  console.log('Analysis:', {
    cycleCount: analysis.cycles.length,
    maxDepth: analysis.depth,
    totalNodes: analysis.totalNodes,
    nodesInCycles: analysis.cycleNodes,
  });

  // 4. Resolution Order
  console.log('\n* 4. Resolution Order (Topological Sort) *');

  const order = graph.getResolutionOrder();
  console.log('Order:', order);
  // Dependencies come before dependents

  // 5. Missing Dependencies
  console.log('\n* 5. Missing Dependencies *');

  const graphWithMissing = new DependencyGraph();
  graphWithMissing.addNode(createNode('ServiceA', ['MissingDep1', 'MissingDep2']));

  const missing = graphWithMissing.getMissingDependencies();
  console.log('Missing dependencies:', missing);

  // 6. Circular Dependency Detection
  console.log('\n* 6. Circular Dependency Detection *');

  const circularGraph = new DependencyGraph();

  // Create a cycle: A -> B -> C -> A
  circularGraph.addNode(createNode('ServiceA', ['ServiceB']));
  circularGraph.addNode(createNode('ServiceB', ['ServiceC']));
  circularGraph.addNode(createNode('ServiceC', ['ServiceA'])); // Creates cycle!

  console.log(circularGraph.visualize());

  const circularCycles = circularGraph.detectCycles();
  console.log('\nDetected cycles:');

  for (const cycle of circularCycles) {
    console.log(`  ${cycle.join(' -> ')} -> ${String(cycle[0])}`);
  }

  const circularAnalysis = circularGraph.getCycleAnalysis();
  console.log('\nCycle analysis:', {
    cycleCount: circularAnalysis.cycles.length,
    maxDepth: circularAnalysis.depth,
    totalNodes: circularAnalysis.totalNodes,
    nodesInCycles: circularAnalysis.cycleNodes,
  });

  // 7. Container Validation
  console.log('\n* 7. Container Validation *');

  @Injectable()
  class Logger {
    log(msg: string) {
      console.log(`[LOG] ${msg}`);
    }
  }

  @Injectable()
  class Database {
    private logger = inject(Logger);

    connect() {
      this.logger.log('Connected');
    }
  }

  const container = new Container([Logger, Database]);

  // Resolve to populate internal state
  container.get(Database);

  // Validate the container
  const result = container.validate();
  console.log('Container valid:', result.valid);

  if (result.errors.length > 0) {
    console.log('Errors:', result.errors);
  }

  if (result.warnings.length > 0) {
    console.log('Warnings:', result.warnings);
  }

  // 8. Complex Graph Example
  console.log('\n* 8. Complex Graph (Diamond Dependency) *');

  const diamondGraph = new DependencyGraph();

  // Diamond pattern:
  //     A
  //    / \
  //   B   C
  //    \ /
  //     D
  diamondGraph.addNode(createNode('D'));
  diamondGraph.addNode(createNode('B', ['D']));
  diamondGraph.addNode(createNode('C', ['D']));
  diamondGraph.addNode(createNode('A', ['B', 'C']));

  console.log(diamondGraph.visualize());
  console.log('\nResolution order:', diamondGraph.getResolutionOrder());

  console.log('\n** Example Complete **');
}

main();
