import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Bell, 
  Search, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { systemAPI } from '../../services/api';

const Header = () => {
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/':
      case '/dashboard':
        return 'Dashboard';
      case '/users':
        return 'User Management';
      case '/groups':
        return 'Group Management';
      case '/hierarchy':
        return 'Organization Hierarchy';
      case '/settings':
        return 'Settings';
      default:
        return 'LDAP Manager';
    }
  };

  const getPageDescription = () => {
    const path = location.pathname;
    switch (path) {
      case '/':
      case '/dashboard':
        return 'Monitor your LDAP directory and view key metrics';
      case '/users':
        return 'Manage users, create accounts, and set permissions';
      case '/groups':
        return 'Organize users into groups and manage memberships';
      case '/hierarchy':
        return 'Visualize and modify organizational structure';
      case '/settings':
        return 'Configure LDAP connection and system preferences';
      default:
        return 'LDAP Directory Management System';
    }
  };

  // Check LDAP connection health
  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const health = await systemAPI.healthCheck();
      setHealthStatus(health);
    } catch (error) {
      setHealthStatus({
        status: 'error',
        ldapConnected: false,
        message: 'Connection failed'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // TODO: Implement global search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title & Description */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {getPageTitle()}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {getPageDescription()}
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users, groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Health Status */}
          <div className="flex items-center space-x-2">
            <button
              onClick={checkHealth}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              title="Refresh connection status"
            >
              <RefreshCw 
                className={`h-4 w-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </button>
            
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50">
              {healthStatus?.ldapConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Disconnected</span>
                </>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            {healthStatus?.status === 'ok' ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Healthy</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Error</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Status Details */}
      {healthStatus && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                Status: <span className="font-medium">{healthStatus.status}</span>
              </span>
              <span className="text-gray-600">
                LDAP: <span className={`font-medium ${healthStatus.ldapConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {healthStatus.ldapConnected ? 'Connected' : 'Disconnected'}
                </span>
              </span>
            </div>
            
            {healthStatus.timestamp && (
              <span className="text-gray-500">
                Last checked: {new Date(healthStatus.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {healthStatus.message && healthStatus.status === 'error' && (
            <div className="mt-2 text-sm text-red-600">
              Error: {healthStatus.message}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;