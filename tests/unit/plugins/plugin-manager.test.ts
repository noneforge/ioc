import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginManager } from '../../../src';
import type { ContainerPlugin } from '../../../src';

describe('PluginManager', () => {
  let manager: PluginManager;
  let mockContainer: Record<string, unknown>;

  beforeEach(() => {
    manager = new PluginManager();
    mockContainer = { name: 'test-container' };
  });

  describe('install', () => {
    it('should install plugin with sync install method', async () => {
      const plugin: ContainerPlugin = {
        name: 'sync-plugin',
        install: vi.fn(),
      };

      await manager.install(plugin, mockContainer);

      expect(plugin.install).toHaveBeenCalledWith(mockContainer);
      expect(manager.hasPlugin('sync-plugin')).toBe(true);
    });

    it('should install plugin with async install method', async () => {
      const plugin: ContainerPlugin = {
        name: 'async-plugin',
        install: vi.fn().mockResolvedValue(undefined),
      };

      await manager.install(plugin, mockContainer);

      expect(plugin.install).toHaveBeenCalledWith(mockContainer);
      expect(manager.hasPlugin('async-plugin')).toBe(true);
    });

    it('should throw error when installing plugin with duplicate name', async () => {
      const plugin1: ContainerPlugin = {
        name: 'duplicate-plugin',
        install: vi.fn(),
      };
      const plugin2: ContainerPlugin = {
        name: 'duplicate-plugin',
        install: vi.fn(),
      };

      await manager.install(plugin1, mockContainer);

      await expect(manager.install(plugin2, mockContainer)).rejects.toThrow(
        "Plugin 'duplicate-plugin' is already installed",
      );
      expect(plugin2.install).not.toHaveBeenCalled();
    });

    it('should store plugin after successful installation', async () => {
      const plugin: ContainerPlugin = {
        name: 'stored-plugin',
        version: '1.0.0',
        install: vi.fn(),
      };

      await manager.install(plugin, mockContainer);

      const retrieved = manager.getPlugin('stored-plugin');
      expect(retrieved).toBe(plugin);
      expect(retrieved?.version).toBe('1.0.0');
    });

    it('should propagate error from plugin install method', async () => {
      const plugin: ContainerPlugin = {
        name: 'error-plugin',
        install: vi.fn().mockRejectedValue(new Error('Installation failed')),
      };

      await expect(manager.install(plugin, mockContainer)).rejects.toThrow(
        'Installation failed',
      );
      expect(manager.hasPlugin('error-plugin')).toBe(false);
    });
  });

  describe('uninstall', () => {
    it('should uninstall plugin with uninstall method', async () => {
      const plugin: ContainerPlugin = {
        name: 'uninstallable-plugin',
        install: vi.fn(),
        uninstall: vi.fn(),
      };

      await manager.install(plugin, mockContainer);
      await manager.uninstall('uninstallable-plugin', mockContainer);

      expect(plugin.uninstall).toHaveBeenCalledWith(mockContainer);
      expect(manager.hasPlugin('uninstallable-plugin')).toBe(false);
    });

    it('should uninstall plugin without uninstall method', async () => {
      const plugin: ContainerPlugin = {
        name: 'no-uninstall-plugin',
        install: vi.fn(),
      };

      await manager.install(plugin, mockContainer);
      await manager.uninstall('no-uninstall-plugin', mockContainer);

      expect(manager.hasPlugin('no-uninstall-plugin')).toBe(false);
    });

    it('should throw error when uninstalling non-existent plugin', async () => {
      await expect(
        manager.uninstall('non-existent', mockContainer),
      ).rejects.toThrow("Plugin 'non-existent' is not installed");
    });

    it('should handle async uninstall method', async () => {
      const plugin: ContainerPlugin = {
        name: 'async-uninstall-plugin',
        install: vi.fn(),
        uninstall: vi.fn().mockResolvedValue(undefined),
      };

      await manager.install(plugin, mockContainer);
      await manager.uninstall('async-uninstall-plugin', mockContainer);

      expect(plugin.uninstall).toHaveBeenCalledWith(mockContainer);
      expect(manager.hasPlugin('async-uninstall-plugin')).toBe(false);
    });

    it('should propagate error from plugin uninstall method', async () => {
      const plugin: ContainerPlugin = {
        name: 'error-uninstall-plugin',
        install: vi.fn(),
        uninstall: vi.fn().mockRejectedValue(new Error('Uninstall failed')),
      };

      await manager.install(plugin, mockContainer);

      await expect(
        manager.uninstall('error-uninstall-plugin', mockContainer),
      ).rejects.toThrow('Uninstall failed');
    });
  });

  describe('getPlugin', () => {
    it('should return plugin by name', async () => {
      const plugin: ContainerPlugin = {
        name: 'get-plugin',
        version: '2.0.0',
        install: vi.fn(),
      };

      await manager.install(plugin, mockContainer);

      const retrieved = manager.getPlugin('get-plugin');
      expect(retrieved).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      const retrieved = manager.getPlugin('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listPlugins', () => {
    it('should return empty array when no plugins installed', () => {
      const plugins = manager.listPlugins();
      expect(plugins).toEqual([]);
    });

    it('should return all installed plugins', async () => {
      const plugin1: ContainerPlugin = {
        name: 'plugin-1',
        install: vi.fn(),
      };
      const plugin2: ContainerPlugin = {
        name: 'plugin-2',
        install: vi.fn(),
      };
      const plugin3: ContainerPlugin = {
        name: 'plugin-3',
        install: vi.fn(),
      };

      await manager.install(plugin1, mockContainer);
      await manager.install(plugin2, mockContainer);
      await manager.install(plugin3, mockContainer);

      const plugins = manager.listPlugins();
      expect(plugins).toHaveLength(3);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
      expect(plugins).toContain(plugin3);
    });

    it('should not include uninstalled plugins', async () => {
      const plugin1: ContainerPlugin = {
        name: 'keep-plugin',
        install: vi.fn(),
      };
      const plugin2: ContainerPlugin = {
        name: 'remove-plugin',
        install: vi.fn(),
      };

      await manager.install(plugin1, mockContainer);
      await manager.install(plugin2, mockContainer);
      await manager.uninstall('remove-plugin', mockContainer);

      const plugins = manager.listPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins).toContain(plugin1);
    });
  });

  describe('hasPlugin', () => {
    it('should return true for installed plugin', async () => {
      const plugin: ContainerPlugin = {
        name: 'has-plugin',
        install: vi.fn(),
      };

      await manager.install(plugin, mockContainer);

      expect(manager.hasPlugin('has-plugin')).toBe(true);
    });

    it('should return false for non-existent plugin', () => {
      expect(manager.hasPlugin('non-existent')).toBe(false);
    });

    it('should return false after plugin is uninstalled', async () => {
      const plugin: ContainerPlugin = {
        name: 'was-installed',
        install: vi.fn(),
      };

      await manager.install(plugin, mockContainer);
      expect(manager.hasPlugin('was-installed')).toBe(true);

      await manager.uninstall('was-installed', mockContainer);
      expect(manager.hasPlugin('was-installed')).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should work with multiple plugins', async () => {
      const plugins: ContainerPlugin[] = [
        { name: 'auth', version: '1.0.0', install: vi.fn() },
        { name: 'logging', version: '2.0.0', install: vi.fn() },
        { name: 'cache', version: '1.5.0', install: vi.fn() },
      ];

      for (const plugin of plugins) {
        await manager.install(plugin, mockContainer);
      }

      expect(manager.listPlugins()).toHaveLength(3);
      expect(manager.hasPlugin('auth')).toBe(true);
      expect(manager.hasPlugin('logging')).toBe(true);
      expect(manager.hasPlugin('cache')).toBe(true);

      for (const plugin of plugins) {
        expect(plugin.install).toHaveBeenCalledWith(mockContainer);
      }
    });

    it('should allow reinstalling plugin after uninstall', async () => {
      const plugin: ContainerPlugin = {
        name: 'reinstall-plugin',
        install: vi.fn(),
        uninstall: vi.fn(),
      };

      await manager.install(plugin, mockContainer);
      await manager.uninstall('reinstall-plugin', mockContainer);
      await manager.install(plugin, mockContainer);

      expect(manager.hasPlugin('reinstall-plugin')).toBe(true);
      expect(plugin.install).toHaveBeenCalledTimes(2);
    });

    it('should support plugins with version property', async () => {
      const plugin: ContainerPlugin = {
        name: 'versioned-plugin',
        version: '3.2.1',
        install: vi.fn(),
      };

      await manager.install(plugin, mockContainer);

      const retrieved = manager.getPlugin('versioned-plugin');
      expect(retrieved?.name).toBe('versioned-plugin');
      expect(retrieved?.version).toBe('3.2.1');
    });

    it('should maintain plugin isolation between instances', async () => {
      const manager1 = new PluginManager();
      const manager2 = new PluginManager();

      const plugin: ContainerPlugin = {
        name: 'isolated-plugin',
        install: vi.fn(),
      };

      await manager1.install(plugin, mockContainer);

      expect(manager1.hasPlugin('isolated-plugin')).toBe(true);
      expect(manager2.hasPlugin('isolated-plugin')).toBe(false);
    });
  });
});
