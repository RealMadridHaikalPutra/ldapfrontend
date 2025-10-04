// Configuration Service untuk mengelola pengaturan LDAP
class ConfigService {
  constructor() {
    this.storageKey = 'ldap_config';
    this.listeners = new Set();
    
    // Default configuration
    this.defaultConfig = {
      apiBaseUrl: 'http://localhost:3000',
      ldapUrl: 'ldaps://localhost:389',
      bindDN: 'cn=admin,dc=servertest,dc=com',
      bindCredentials: '1234',
      searchBase: 'dc=servertest,dc=com',
      userSearchBase: 'ou=users,dc=servertest,dc=com',
      groupSearchBase: 'ou=groups,dc=servertest,dc=com',
      userSearchFilter: '(objectClass=inetOrgPerson)',
      groupSearchFilter: '(objectClass=posixGroup)',
      tlsEnabled: true,
      tlsRejectUnauthorized: false,
      connectionTimeout: 10000,
      idleTimeout: 3600000,
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  // Get current configuration
  getConfig() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const config = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist
        return { ...this.defaultConfig, ...config };
      }
    } catch (error) {
      console.error('Error loading config from localStorage:', error);
    }
    return { ...this.defaultConfig };
  }

  // Save configuration
  saveConfig(config) {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      localStorage.setItem(this.storageKey, JSON.stringify(mergedConfig));
      
      // Notify listeners about config change
      this.notifyListeners(mergedConfig);
      
      return mergedConfig;
    } catch (error) {
      console.error('Error saving config to localStorage:', error);
      throw new Error('Failed to save configuration');
    }
  }

  // Reset to default configuration
  resetConfig() {
    try {
      localStorage.removeItem(this.storageKey);
      const defaultConfig = { ...this.defaultConfig };
      this.notifyListeners(defaultConfig);
      return defaultConfig;
    } catch (error) {
      console.error('Error resetting config:', error);
      throw new Error('Failed to reset configuration');
    }
  }

  // Import configuration from JSON
  importConfig(jsonString) {
    try {
      const importedConfig = JSON.parse(jsonString);
      
      // Validate required fields
      const requiredFields = ['apiBaseUrl', 'ldapUrl', 'bindDN', 'searchBase'];
      for (const field of requiredFields) {
        if (!importedConfig[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      return this.saveConfig(importedConfig);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  // Export configuration as JSON
  exportConfig() {
    const config = this.getConfig();
    
    // Remove sensitive data from export
    const exportConfig = { ...config };
    delete exportConfig.bindCredentials;
    
    return JSON.stringify(exportConfig, null, 2);
  }

  // Get connection profiles (for multiple LDAP servers)
  getProfiles() {
    try {
      const stored = localStorage.getItem('ldap_profiles');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading profiles:', error);
      return [];
    }
  }

  // Get profile names only
  getProfileNames() {
    try {
      const profiles = this.getProfiles();
      return profiles.map(p => p.name);
    } catch (error) {
      console.error('Error loading profile names:', error);
      return [];
    }
  }

  // Save connection profile
  saveProfile(name, config) {
    try {
      const profiles = this.getProfiles();
      const existingIndex = profiles.findIndex(p => p.name === name);
      
      const profile = {
        name,
        config: { ...config }, // Keep all config including sensitive data
        createdAt: existingIndex >= 0 ? profiles[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
      } else {
        profiles.push(profile);
      }
      
      localStorage.setItem('ldap_profiles', JSON.stringify(profiles));
      return profiles;
    } catch (error) {
      console.error('Error saving profile:', error);
      throw new Error('Failed to save profile');
    }
  }

  // Load profile
  loadProfile(name) {
    const profiles = this.getProfiles();
    const profile = profiles.find(p => p.name === name);
    
    if (!profile) {
      throw new Error(`Profile '${name}' not found`);
    }
    
    return this.saveConfig(profile.config);
  }

  // Delete profile
  deleteProfile(name) {
    try {
      const profiles = this.getProfiles();
      const filteredProfiles = profiles.filter(p => p.name !== name);
      localStorage.setItem('ldap_profiles', JSON.stringify(filteredProfiles));
      return filteredProfiles;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw new Error('Failed to delete profile');
    }
  }

  // Subscribe to configuration changes
  subscribe(listener) {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners about config changes
  notifyListeners(config) {
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('Error in config change listener:', error);
      }
    });
  }

  // Validate configuration
  validateConfig(config) {
    const errors = [];
    
    // Required fields
    if (!config.apiBaseUrl) errors.push('API Base URL is required');
    if (!config.ldapUrl) errors.push('LDAP URL is required');
    if (!config.bindDN) errors.push('Bind DN is required');
    if (!config.searchBase) errors.push('Search Base is required');
    
    // URL validation
    try {
      new URL(config.apiBaseUrl);
    } catch {
      errors.push('Invalid API Base URL format');
    }
    
    // LDAP URL validation
    if (config.ldapUrl && !config.ldapUrl.match(/^ldaps?:\/\/.+/)) {
      errors.push('LDAP URL must start with ldap:// or ldaps://');
    }
    
    // DN validation (basic)
    const dnPattern = /^([a-zA-Z]+=.+,)*[a-zA-Z]+=.+$/;
    if (config.bindDN && !dnPattern.test(config.bindDN)) {
      errors.push('Invalid Bind DN format');
    }
    if (config.searchBase && !dnPattern.test(config.searchBase)) {
      errors.push('Invalid Search Base DN format');
    }
    
    // Timeout validation
    if (config.connectionTimeout < 1000 || config.connectionTimeout > 60000) {
      errors.push('Connection timeout must be between 1000ms and 60000ms');
    }
    if (config.idleTimeout < 60000 || config.idleTimeout > 7200000) {
      errors.push('Idle timeout must be between 60000ms and 7200000ms');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Test connection with current config
  async testConnection(config = null) {
    const testConfig = config || this.getConfig();
    
    try {
      const response = await fetch(`${testConfig.apiBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: testConfig.connectionTimeout || 10000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return {
        success: true,
        data: result,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Connection failed'
      };
    }
  }
}

// Create singleton instance
const configService = new ConfigService();

export default configService;