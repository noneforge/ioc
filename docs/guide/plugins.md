# Plugin System

Plugins extend container functionality through a simple install/uninstall lifecycle. They provide a clean way to add cross-cutting concerns like logging, metrics, or feature flags to your application.

## ContainerPlugin Interface

The `ContainerPlugin` interface defines the contract for plugins:

```typescript
interface ContainerPlugin {
  name: string;
  version?: string;
  install(container: unknown): void | Promise<void>;
  uninstall?(container: unknown): void | Promise<void>;
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Unique identifier for the plugin |
| `version` | `string` | No | Semantic version of the plugin |
| `install` | `function` | Yes | Called when the plugin is installed |
| `uninstall` | `function` | No | Called when the plugin is uninstalled |

## PluginManager

The `PluginManager` class manages plugin lifecycle:

```typescript
import { PluginManager } from '@noneforge/ioc';

const pluginManager = new PluginManager();
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `install` | `install(plugin: ContainerPlugin, container: unknown): Promise<void>` | Install a plugin |
| `uninstall` | `uninstall(pluginName: string, container: unknown): Promise<void>` | Uninstall a plugin by name |
| `getPlugin` | `getPlugin(name: string): ContainerPlugin \| undefined` | Get a plugin by name |
| `listPlugins` | `listPlugins(): ContainerPlugin[]` | Get all installed plugins |
| `hasPlugin` | `hasPlugin(name: string): boolean` | Check if a plugin is installed |

## Creating Plugins

### Simple Plugin

```typescript
import type { ContainerPlugin } from '@noneforge/ioc';

const loggingPlugin: ContainerPlugin = {
  name: 'logging',
  version: '1.0.0',

  install(container) {
    console.log('Logging plugin installed');
    // Add your initialization logic here
  },
};
```

### Plugin with Cleanup

```typescript
const resourcePlugin: ContainerPlugin = {
  name: 'resources',
  version: '1.0.0',

  install(container) {
    console.log('Allocating resources...');
    // Initialize resources
  },

  uninstall(container) {
    console.log('Releasing resources...');
    // Clean up resources
  },
};
```

### Async Plugin

Plugins support async operations for initialization that requires I/O:

```typescript
const databasePlugin: ContainerPlugin = {
  name: 'database',
  version: '1.0.0',

  async install(container) {
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected');
  },

  async uninstall(container) {
    console.log('Disconnecting from database...');
    await disconnectFromDatabase();
    console.log('Database disconnected');
  },
};
```

## Using PluginManager

### Installing Plugins

```typescript
import { PluginManager, Container } from '@noneforge/ioc';
import type { ContainerPlugin } from '@noneforge/ioc';

const container = new Container();
const pluginManager = new PluginManager();

const myPlugin: ContainerPlugin = {
  name: 'my-plugin',
  install(container) {
    console.log('Plugin installed');
  },
};

// Install the plugin
await pluginManager.install(myPlugin, container);
```

### Checking Plugin Status

```typescript
// Check if a plugin is installed
if (pluginManager.hasPlugin('my-plugin')) {
  console.log('Plugin is active');
}

// Get a specific plugin
const plugin = pluginManager.getPlugin('my-plugin');
console.log(plugin?.version); // '1.0.0'

// List all plugins
const allPlugins = pluginManager.listPlugins();
console.log(`${allPlugins.length} plugins installed`);
```

### Uninstalling Plugins

```typescript
// Uninstall by name
await pluginManager.uninstall('my-plugin', container);

// Verify removal
console.log(pluginManager.hasPlugin('my-plugin')); // false
```

## Error Handling

### Duplicate Plugin Names

Each plugin must have a unique name. Installing a duplicate throws an error:

```typescript
await pluginManager.install(pluginA, container);

try {
  await pluginManager.install(pluginA, container);
} catch (error) {
  console.error(error.message);
  // "Plugin 'my-plugin' is already installed"
}
```

### Uninstalling Non-Existent Plugin

Attempting to uninstall a plugin that isn't installed throws an error:

```typescript
try {
  await pluginManager.uninstall('unknown-plugin', container);
} catch (error) {
  console.error(error.message);
  // "Plugin 'unknown-plugin' is not installed"
}
```

## Real-World Examples

### Logging Plugin

```typescript
const loggingPlugin: ContainerPlugin = {
  name: 'logging',
  version: '1.0.0',

  install(container) {
    const originalGet = container.get.bind(container);

    container.get = function(token, options) {
      console.log(`Resolving: ${String(token)}`);
      const result = originalGet(token, options);
      console.log(`Resolved: ${String(token)}`);
       
      return result;
    };
  },
};
```

### Metrics Plugin

```typescript
interface Metrics {
  resolutions: number;
  errors: number;
}

const metricsPlugin: ContainerPlugin = {
  name: 'metrics',
  version: '1.0.0',

  install(container) {
    const metrics: Metrics = {
      resolutions: 0,
      errors: 0,
    };

    // Store metrics on container for access
    (container as any).__metrics = metrics;

    // Wrap resolution to track metrics
    const originalGet = container.get.bind(container);
    container.get = function(token, options) {
      try {
        const result = originalGet(token, options);
        metrics.resolutions += 1;
         
        return result;
      } catch (error) {
        metrics.errors++;
         
        throw error;
      }
    };
  },

  uninstall(container) {
    delete (container as any).__metrics;
  },
};

// Usage
await pluginManager.install(metricsPlugin, container);

// Later, access metrics
const metrics = (container as any).__metrics;
console.log(`Resolutions: ${metrics.resolutions}, Errors: ${metrics.errors}`);
```

### Feature Flags Plugin

```typescript
interface FeatureFlags {
  [key: string]: boolean;
}

const featureFlagsPlugin: ContainerPlugin = {
  name: 'feature-flags',
  version: '1.0.0',

  async install(container) {
    // Load feature flags from external source
    const response = await fetch('/api/feature-flags');
    const flags: FeatureFlags = await response.json();

    // Make flags available through container
    (container as any).__featureFlags = flags;
  },

  uninstall(container) {
    delete (container as any).__featureFlags;
  },
};

// Usage
function isFeatureEnabled(container: any, feature: string): boolean {
  return container.__featureFlags?.[feature] ?? false;
}
```

## Best Practices

1. **Use unique, descriptive names** - Prefix with organization or package name to avoid conflicts:
   ```typescript
   name: '@myorg/logging-plugin'
   ```

2. **Always include version** - Helps with debugging and compatibility:
   ```typescript
   version: '1.2.3'
   ```

3. **Clean up in uninstall** - Release resources, restore original behavior:
   ```typescript
   uninstall(container) {
     this.closeConnections();
     this.restoreOriginalMethods();
   }
   ```

4. **Handle async errors** - Wrap async operations in try/catch:
   ```typescript
   async install(container) {
     try {
       await this.initialize();
     } catch (error) {
       console.error('Plugin initialization failed:', error);
       throw error;
     }
   }
   ```

5. **Document plugin requirements** - Specify what your plugin needs from the container or environment.

## Next Steps

- [Lifecycle Hooks](/guide/lifecycle-hooks) - Lifecycle hooks and disposal
- [API Reference](/guide/api-reference) - Complete API documentation
- [Testing](/guide/testing) - Testing with plugins
