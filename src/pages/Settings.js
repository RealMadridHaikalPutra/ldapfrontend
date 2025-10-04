import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RefreshCw, 
  Settings as SettingsIcon,
  Database,
  Shield,
  Network,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Download,
  Upload,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import  { getAPI }  from '../services/api';
import configService from '../services/configService';
import { toast } from 'react-hot-toast';

const configAPI = configService;

const Settings = () => {
  const [settings, setSettings] = useState({});
  const [originalSettings, setOriginalSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Profile management
  const [profiles, setProfiles] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  
  // Import/Export
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');

  useEffect(() => {
    loadSettings();
    loadProfiles();
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    // Check for unsaved changes
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasUnsavedChanges(hasChanges);
    
    // Validate settings when they change
    if (Object.keys(settings).length > 0) {
      const validation = configAPI.validateConfig(settings);
      setValidationErrors(validation.errors);
    }
  }, [settings, originalSettings]);

  const loadSettings = () => {
    try {
      const config = configAPI.getConfig();
      setSettings(config);
      setOriginalSettings({ ...config });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const loadProfiles = () => {
    try {
      const profileNames = configAPI.getProfileNames();
      setProfiles(profileNames);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const api = await getAPI();
      const response = await api.get('/ldap/status');
      setConnectionStatus(response.data.connected ? 'success' : 'error');
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestConnection = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before testing connection');
      return;
    }

    setTesting(true);
    try {
      const api = await getAPI();
      console.log("api", api)
      const response = await api.get('/ldap/test');
      
      if (response.data.success) {
        setConnectionStatus('success');
        toast.success('Connection test successful');
      } else {
        setConnectionStatus('error');
        toast.error('Connection test failed');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      toast.error('Connection test failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setLoading(true);
    try {
      await configAPI.saveConfig(settings);
      setOriginalSettings({ ...settings });
      setHasUnsavedChanges(false);
      toast.success('Settings saved successfully');
      
      // Force refresh of all API instances
      window.location.reload();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      const defaultConfig = configAPI.getDefaultConfig();
      setSettings(defaultConfig);
    }
  };

  const handleCancelChanges = () => {
    setSettings({ ...originalSettings });
    setHasUnsavedChanges(false);
  };

  // Profile management functions
  const saveAsProfile = () => {
    if (!newProfileName.trim()) {
      toast.error('Please enter a profile name');
      return;
    }

    try {
      configAPI.saveProfile(newProfileName, settings);
      setProfiles(configAPI.getProfileNames());
      setNewProfileName('');
      setShowProfileModal(false);
      toast.success(`Profile "${newProfileName}" saved successfully`);
    } catch (error) {
      toast.error('Failed to save profile: ' + error.message);
    }
  };

  const loadProfile = (profileName) => {
    try {
      const profile = configAPI.loadProfile(profileName);
      setSettings(profile);
      setOriginalSettings({ ...profile });
      setSelectedProfile(profileName);
      setHasUnsavedChanges(false);
      toast.success(`Profile "${profileName}" loaded`);
    } catch (error) {
      toast.error('Failed to load profile: ' + error.message);
    }
  };

  const deleteProfile = (profileName) => {
    if (window.confirm(`Are you sure you want to delete profile "${profileName}"?`)) {
      try {
        configAPI.deleteProfile(profileName);
        setProfiles(configAPI.getProfileNames());
        if (selectedProfile === profileName) {
          setSelectedProfile('');
        }
        toast.success(`Profile "${profileName}" deleted`);
      } catch (error) {
        toast.error('Failed to delete profile: ' + error.message);
      }
    }
  };

  // Import/Export functions
  const exportConfig = () => {
    try {
      const exported = configAPI.exportConfig();
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ldap-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully');
    } catch (error) {
      toast.error('Failed to export configuration: ' + error.message);
    }
  };

  const importConfig = () => {
    try {
      const imported = configAPI.importConfig(importData);
      setSettings(imported);
      setOriginalSettings({ ...imported });
      
      // Reload profiles in case any were imported
      loadProfiles();
      
      toast.success('Configuration imported successfully');
      setImportData('');
      setShowImportModal(false);
    } catch (error) {
      toast.error('Failed to import configuration: ' + error.message);
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportData(e.target.result);
        setShowImportModal(true);
      };
      reader.readAsText(file);
    }
  };

  const ConnectionStatusIndicator = () => {
    if (!connectionStatus) {
      return (
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-sm">Unknown</span>
        </div>
      );
    }

    const isConnected = connectionStatus === 'success';
    
    return (
      <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure LDAP connection and system preferences</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <ConnectionStatusIndicator />
          
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Network className="w-5 h-5 mr-2" />
            Connection Status
          </h2>
          
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {connectionStatus && (
          <div className={`p-4 rounded-lg ${
            connectionStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {connectionStatus === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <h3 className={`font-medium ${
                    connectionStatus === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {connectionStatus === 'success' ? 'LDAP Connected' : 'LDAP Disconnected'}
                  </h3>
                  <p className={`text-sm ${
                    connectionStatus === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Status: {connectionStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Configuration Profiles
          </h2>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center px-3 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Save Profile
            </button>
            
            <button
              onClick={exportConfig}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <label className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {profiles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Saved Profiles:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {profiles.map((profile) => (
                <div
                  key={profile}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProfile === profile
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-sm font-medium text-gray-900 flex-1"
                      onClick={() => loadProfile(profile)}
                    >
                      {profile}
                    </span>
                    <button
                      onClick={() => deleteProfile(profile)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 mb-2">Configuration Errors:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* LDAP Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Database className="w-5 h-5 mr-2" />
          LDAP Configuration
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Connection Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Base URL
              </label>
              <input
                type="text"
                value={settings.apiBaseUrl || ''}
                onChange={(e) => handleInputChange('apiBaseUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="http://localhost:3000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Base URL for the backend API server
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LDAP URL
              </label>
              <input
                type="text"
                value={settings.ldapUrl || ''}
                onChange={(e) => handleInputChange('ldapUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="ldaps://localhost:636"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use ldaps:// for SSL/TLS or ldap:// for unencrypted
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bind DN
              </label>
              <input
                type="text"
                value={settings.bindDN || ''}
                onChange={(e) => handleInputChange('bindDN', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="cn=admin,dc=example,dc=com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Distinguished name of the admin user
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bind Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={settings.bindCredentials || ''}
                  onChange={(e) => handleInputChange('bindCredentials', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connection Timeout (ms)
                </label>
                <input
                  type="number"
                  value={settings.connectionTimeout || 10000}
                  onChange={(e) => handleInputChange('connectionTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  min="1000"
                  max="60000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Idle Timeout (ms)
                </label>
                <input
                  type="number"
                  value={settings.idleTimeout || 3600000}
                  onChange={(e) => handleInputChange('idleTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  min="60000"
                  max="7200000"
                />
              </div>
            </div>
          </div>

          {/* Search Settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Search Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Base DN
              </label>
              <input
                type="text"
                value={settings.searchBase || ''}
                onChange={(e) => handleInputChange('searchBase', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="dc=example,dc=com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Search Base
              </label>
              <input
                type="text"
                value={settings.userSearchBase || ''}
                onChange={(e) => handleInputChange('userSearchBase', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="ou=users,dc=example,dc=com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Search Base
              </label>
              <input
                type="text"
                value={settings.groupSearchBase || ''}
                onChange={(e) => handleInputChange('groupSearchBase', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="ou=groups,dc=example,dc=com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Search Filter
              </label>
              <input
                type="text"
                value={settings.userSearchFilter || ''}
                onChange={(e) => handleInputChange('userSearchFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="(objectClass=inetOrgPerson)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Search Filter
              </label>
              <input
                type="text"
                value={settings.groupSearchFilter || ''}
                onChange={(e) => handleInputChange('groupSearchFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="(objectClass=posixGroup)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Security Settings
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Enable TLS/SSL
              </label>
              <p className="text-xs text-gray-500">
                Use encrypted connection to LDAP server
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.tlsEnabled || false}
              onChange={(e) => handleInputChange('tlsEnabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Reject Unauthorized Certificates
              </label>
              <p className="text-xs text-gray-500">
                Verify SSL certificates (disable for self-signed certificates)
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.tlsRejectUnauthorized || false}
              onChange={(e) => handleInputChange('tlsRejectUnauthorized', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              disabled={!settings.tlsEnabled}
            />
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Configuration Notes</h3>
            <div className="text-sm text-blue-800 mt-2 space-y-1">
              <p>• Changes require a server restart to take full effect</p>
              <p>• Test the connection before saving to avoid lockouts</p>
              <p>• Use strong passwords for the bind user account</p>
              <p>• Enable TLS for production environments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleResetSettings}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset to Defaults
          </button>
          
          {hasUnsavedChanges && (
            <button
              onClick={handleCancelChanges}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel Changes
            </button>
          )}
        </div>
        
        <button
          onClick={handleSaveSettings}
          disabled={loading || validationErrors.length > 0}
          className="flex items-center px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Profile Save Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Configuration Profile</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Name
              </label>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter profile name"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setNewProfileName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAsProfile}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Configuration</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configuration JSON
              </label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                placeholder="Paste your configuration JSON here..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={importConfig}
                disabled={!importData.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;