import type { ContainerPlugin } from '../types';

/**
 * Plugin manager for container extensions
 */
export class PluginManager {
  private readonly plugins = new Map<string, ContainerPlugin>();

  async install(plugin: ContainerPlugin, container: unknown): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already installed`);
    }

    await plugin.install(container);
    this.plugins.set(plugin.name, plugin);
  }

  async uninstall(pluginName: string, container: unknown): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' is not installed`);
    }

    if (plugin.uninstall) {
      await plugin.uninstall(container);
    }

    this.plugins.delete(pluginName);
  }

  getPlugin(name: string): ContainerPlugin | undefined {
    return this.plugins.get(name);
  }

  listPlugins(): ContainerPlugin[] {
    return Array.from(this.plugins.values());
  }

  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }
}
