import axios from 'axios';
import configService from './configService';

// Create API instance with dynamic configuration
let apiInstance = null;

const createAPIInstance = () => {
  const config = configService.getConfig();
  
  const instance = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: config.connectionTimeout || 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - menambahkan konfigurasi LDAP ke setiap request
  instance.interceptors.request.use(
    (requestConfig) => {
      // Ambil konfigurasi LDAP saat ini
      const currentConfig = configService.getConfig();
      
      // Konfigurasi LDAP yang akan dikirim ke backend
      const ldapConfig = {
        ldapUrl: currentConfig.ldapUrl,
        bindDN: currentConfig.bindDN,
        bindCredentials: currentConfig.bindCredentials,
        searchBase: currentConfig.searchBase,
        userSearchBase: currentConfig.userSearchBase,
        groupSearchBase: currentConfig.groupSearchBase,
        userSearchFilter: currentConfig.userSearchFilter,
        groupSearchFilter: currentConfig.groupSearchFilter,
        tlsEnabled: currentConfig.tlsEnabled,
        tlsRejectUnauthorized: currentConfig.tlsRejectUnauthorized,
        connectionTimeout: currentConfig.connectionTimeout,
        idleTimeout: currentConfig.idleTimeout
      };

      // Tambahkan LDAP config sebagai header
      requestConfig.headers['X-LDAP-Config'] = JSON.stringify(ldapConfig);

      // Untuk POST/PUT requests, tambahkan juga ke body
      if (['post', 'put', 'patch'].includes(requestConfig.method.toLowerCase())) {
        if (requestConfig.data && typeof requestConfig.data === 'object') {
          // Jika sudah ada data, tambahkan ldapConfig
          requestConfig.data = {
            ...requestConfig.data,
            ldapConfig: ldapConfig
          };
        } else if (!requestConfig.data) {
          // Jika tidak ada data, buat data baru dengan ldapConfig
          requestConfig.data = { ldapConfig: ldapConfig };
        }
      }
      // Hapus bagian untuk GET/DELETE query parameter yang menyebabkan URL terlalu panjang

      console.log(`Making ${requestConfig.method.toUpperCase()} request to ${requestConfig.url} with LDAP config`);
      return requestConfig;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      console.error('API Error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout. Please check your connection settings.';
      } else if (error.code === 'ECONNREFUSED') {
        error.message = 'Connection refused. Please check if the server is running.';
      } else if (error.response?.status === 500) {
        error.message = 'Server error. Please check LDAP configuration.';
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

// Initialize API instance
const getAPI = () => {
  if (!apiInstance) {
    apiInstance = createAPIInstance();
  }
  return apiInstance;
};

// Recreate API instance when configuration changes
configService.subscribe((newConfig) => {
  console.log('Configuration changed, recreating API instance with new base URL:', newConfig.apiBaseUrl);
  apiInstance = createAPIInstance();
});

// Get current API instance
const api = getAPI();

// User API methods
export const userAPI = {
  // Get users count only (efficient for dashboard)
  getUsersCount: async () => {
    const response = await getAPI().get('/users/count');
    return response.data.count;
  },

  // Get all users
  getUsers: async (filter = '', limit = 0) => {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (limit) params.append('limit', limit.toString());
    
    const response = await getAPI().get(`/users?${params}`);
    return response.data;
  },

  // Get user by identifier
  getUser: async (identifier, searchBy = 'cn') => {
    const response = await getAPI().get(`/users/${identifier}?searchBy=${searchBy}`);
    return response.data;
  },

  // Get user hierarchy
  getUserHierarchy: async (identifier, searchBy = 'uid') => {
    const response = await getAPI().get(`/users/${identifier}/hierarchy?searchBy=${searchBy}`);
    return response.data;
  },

  // Get user groups
  getUserGroups: async (identifier, searchBy = 'uid') => {
    const response = await getAPI().get(`/users/${identifier}/groups?searchBy=${searchBy}`);
    return response.data;
  },

  // Batch update hierarchy and groups
  batchUpdateHierarchy: async (draggedUserId, targetUserId) => {
    const response = await getAPI().post('/hierarchy/batch-update', {
      draggedUserId,
      targetUserId
    });
    return response.data;
  },

  // Move user to top level (remove manager and update DN)
  moveToTopLevel: async (userId) => {
    const response = await getAPI().post('/move-to-top-level', {
      userId
    });
    return response.data;
  },

  // Create new user
  createUser: async (userData) => {
    const response = await getAPI().post('/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (identifier, userData, searchBy = 'cn') => {
    const response = await getAPI().put(`/users/${identifier}?searchBy=${searchBy}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (identifier, searchBy = 'cn') => {
    const response = await getAPI().delete(`/users/${identifier}?searchBy=${searchBy}`);
    return response.data;
  },

  // Add manager to user
  addManager: async (userIdentifier, managerIdentifier, userSearchBy = 'uid', managerSearchBy = 'uid') => {
    const response = await getAPI().post(
      `/users/${userIdentifier}/managers?userSearchBy=${userSearchBy}&managerSearchBy=${managerSearchBy}`,
      { managerIdentifier }
    );
    return response.data;
  },

  // Remove manager from user
  removeManager: async (userIdentifier, managerIdentifier, userSearchBy = 'uid', managerSearchBy = 'uid') => {
    const response = await getAPI().delete(
      `/users/${userIdentifier}/managers?userSearchBy=${userSearchBy}&managerSearchBy=${managerSearchBy}`,
      { data: { managerIdentifier } }
    );
    return response.data;
  },

  // Export users to LDIF
  exportLDIF: async () => {
    const response = await getAPI().get('/users/export/ldif', {
      responseType: 'blob'
    });
    return response.data;
  },

  // Import users from LDIF
  importLDIF: async (file) => {
    const formData = new FormData();
    formData.append('ldifFile', file);
    
    const response = await getAPI().post('/users/import/ldif', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get user details with full information
  getUserDetails: async (identifier, searchBy = 'uid') => {
    const response = await getAPI().get(`/users/${identifier}/details?searchBy=${searchBy}`);
    return response.data;
  },
};

// Group API methods
export const groupAPI = {
  // Get groups count only (efficient for dashboard)
  getGroupsCount: async () => {
    const response = await getAPI().get('/groups/count');
    return response.data.count;
  },

  // Get all groups
  getGroups: async (filter = '', limit = 0) => {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (limit) params.append('limit', limit.toString());
    
    const response = await getAPI().get(`/groups?${params}`);
    return response.data;
  },

  // Get group by identifier
  getGroup: async (identifier, searchBy = 'cn') => {
    const response = await getAPI().get(`/groups/${identifier}?searchBy=${searchBy}`);
    return response.data;
  },

  // Create new group
  createGroup: async (groupData) => {
    const response = await getAPI().post('/groups', groupData);
    return response.data;
  },

  // Update group
  updateGroup: async (identifier, groupData, searchBy = 'cn') => {
    const response = await getAPI().put(`/groups/${identifier}?searchBy=${searchBy}`, groupData);
    return response.data;
  },

  // Delete group
  deleteGroup: async (identifier, searchBy = 'cn') => {
    const response = await getAPI().delete(`/groups/${identifier}?searchBy=${searchBy}`);
    return response.data;
  },

  // Add user to group
  addUserToGroup: async (groupIdentifier, userIdentifier, groupSearchBy = 'cn', userSearchBy = 'cn') => {
    const response = await getAPI().post(
      `/groups/${groupIdentifier}/members?searchBy=${groupSearchBy}`,
      { userIdentifier, userSearchBy }
    );
    return response.data;
  },

  // Remove user from group
  removeUserFromGroup: async (groupIdentifier, userIdentifier, groupSearchBy = 'cn', userSearchBy = 'cn') => {
    const response = await getAPI().delete(
      `/groups/${groupIdentifier}/members?searchBy=${groupSearchBy}`,
      { data: { userIdentifier, userSearchBy } }
    );
    return response.data;
  },
};

// System API methods
export const systemAPI = {
  // Health check
  healthCheck: async () => {
    const response = await getAPI().get('/health');
    return response.data;
  },

  // Custom search
  customSearch: async (searchBase, filter, options = {}) => {
    const response = await getAPI().post('/search', {
      searchBase,
      filter,
      options
    });
    return response.data;
  },

  // Disconnect LDAP
  disconnect: async () => {
    const response = await getAPI().post('/disconnect');
    return response.data;
  },

  // Update LDAP configuration (send to backend)
  updateConfig: async (config) => {
    const response = await getAPI().post('/config/update', config);
    return response.data;
  },

  // Get current backend configuration
  getConfig: async () => {
    const response = await getAPI().get('/config');
    return response.data;
  },
};

// Configuration API methods
export const configAPI = {
  // Get current configuration
  getConfig: () => configService.getConfig(),

  // Save configuration
  saveConfig: (config) => configService.saveConfig(config),

  // Reset configuration
  resetConfig: () => configService.resetConfig(),

  // Test connection
  testConnection: (config) => configService.testConnection(config),

  // Validate configuration
  validateConfig: (config) => configService.validateConfig(config),

  // Profile management
  getProfiles: () => configService.getProfiles(),
  saveProfile: (name, config) => configService.saveProfile(name, config),
  loadProfile: (name) => configService.loadProfile(name),
  deleteProfile: (name) => configService.deleteProfile(name),

  // Import/Export
  exportConfig: () => configService.exportConfig(),
  importConfig: (jsonString) => configService.importConfig(jsonString),

  // Subscribe to changes
  subscribe: (listener) => configService.subscribe(listener),
};

// Export both the function and a default instance
export { getAPI };
export default getAPI();
