import { Injectable, InjectionToken } from '../../src';

// Test classes
@Injectable()
export class TestServiceA {
  public readonly name = 'TestServiceA';
  public getValue() { return 'A'; }
}

@Injectable()
export class TestServiceB {
  constructor(public serviceA: TestServiceA) {}
  public getValue() { return 'B' + this.serviceA.getValue(); }
}

export class TestServiceC {
  constructor(public serviceA: TestServiceA, public serviceB: TestServiceB) {}
  public getValue() { return 'C' + this.serviceA.getValue() + this.serviceB.getValue(); }
}

// Abstract classes and interfaces
export abstract class AbstractService {
  abstract getName(): string;
}

@Injectable()
export class ConcreteService extends AbstractService {
  getName(): string { return 'ConcreteService'; }
}

export interface ITestInterface {
  getValue(): string;
}

@Injectable()
export class InterfaceImplementation implements ITestInterface {
  getValue(): string { return 'InterfaceImplementation'; }
}

// Tokens
export const TEST_TOKEN = new InjectionToken<string>('TEST_TOKEN');
export const NUMBER_TOKEN = new InjectionToken<number>('NUMBER_TOKEN');
export const INTERFACE_TOKEN = new InjectionToken<ITestInterface>('INTERFACE_TOKEN');

// Functions for testing
export function testFactory(): string {
  return 'factory-result';
}

export function asyncTestFactory(): Promise<string> {
  return Promise.resolve('async-factory-result');
}

export function testFactoryWithDeps(serviceA: TestServiceA): string {
  return `factory-with-${serviceA.getValue()}`;
}

// Test values
export const TEST_VALUE = 'test-value';
export const TEST_NUMBER = 42;
export const TEST_OBJECT = { key: 'value', nested: { prop: 123 } };
