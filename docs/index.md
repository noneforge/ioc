---
layout: home

hero:
  name: "@noneforge/ioc"
  text: "Type-safe Dependency Injection"
  tagline: Modern DI container for TypeScript with decorators, modules, and interceptors
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/noneforge/ioc

features:
  - icon: 🎯
    title: Type-Safe
    details: Full TypeScript support with InjectionToken<T> for compile-time safety
  - icon: 🔌
    title: 5 Provider Types
    details: Class, Value, Factory, Existing, and Async providers for any use case
  - icon: 📦
    title: Module System
    details: Organize code with @Module, dynamic modules, and configurable modules
  - icon: 🎭
    title: Interceptors
    details: Built-in caching, logging, retry, and validation interceptors
  - icon: 🧪
    title: Testing Ready
    details: TestContainer with mock, spy, and snapshot support out of the box
  - icon: ⚡
    title: Zero Dependencies
    details: Only requires reflect-metadata as peer dependency
---

## Quick Example

```typescript
import 'reflect-metadata';
import { Container, Injectable, inject } from '@noneforge/ioc';

@Injectable()
class LoggerService {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

@Injectable()
class UserService {
  private logger = inject(LoggerService);

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
    return { id: 1, name };
  }
}

const container = new Container();
container.addProvider(LoggerService);
container.addProvider(UserService);

const userService = container.get(UserService);
userService.createUser('John');
```
