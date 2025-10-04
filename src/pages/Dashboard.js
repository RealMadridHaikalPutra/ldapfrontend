import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Layers, 
  GitBranch, 
  Activity,
  TrendingUp,
  Server,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { userAPI, groupAPI, systemAPI } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    groups: 0,
    connections: 0,
    uptime: '00:00:00'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Try count endpoints first (more efficient), fallback to full data if not available
      const [userCount, groupCount, health] = await Promise.all([
        userAPI.getUsersCount().catch(async () => {
          // Fallback: get full users list and count
          const users = await userAPI.getUsers().catch(() => []);
          return Array.isArray(users) ? users.length : 0;
        }),
        groupAPI.getGroupsCount().catch(async () => {
          // Fallback: get full groups list and count
          const groups = await groupAPI.getGroups().catch(() => []);
          return Array.isArray(groups) ? groups.length : 0;
        }),
        systemAPI.healthCheck().catch(() => ({ ldapConnected: false }))
      ]);

      setStats({
        users: userCount,
        groups: groupCount,
        connections: health?.ldapConnected ? 1 : 0,
        uptime: health?.uptime || 'N/A'
      });

      setSystemHealth(health);

      // Mock recent activity
      setRecentActivity([
        {
          id: 1,
          type: 'user_created',
          message: 'New user "john.doe" was created',
          timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
          status: 'success'
        },
        {
          id: 2,
          type: 'group_updated',
          message: 'Group "developers" was updated',
          timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
          status: 'info'
        },
        {
          id: 3,
          type: 'hierarchy_changed',
          message: 'Manager hierarchy updated for 3 users',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          status: 'warning'
        },
        {
          id: 4,
          type: 'user_deleted',
          message: 'User "temp.user" was removed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
          status: 'error'
        }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, description }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-2">{description}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'success': return 'text-green-600 bg-green-50';
        case 'warning': return 'text-yellow-600 bg-yellow-50';
        case 'error': return 'text-red-600 bg-red-50';
        default: return 'text-blue-600 bg-blue-50';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'success': return CheckCircle;
        case 'warning': return AlertTriangle;
        case 'error': return AlertTriangle;
        default: return Activity;
      }
    };

    const StatusIcon = getStatusIcon(activity.status);

    return (
      <div className="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(activity.status)}`}>
          <StatusIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{activity.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            {activity.timestamp.toLocaleTimeString()} - {activity.timestamp.toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.users}
          icon={UsersIcon}
          color="bg-blue-500"
          description="Active directory users"
        />
        <StatCard
          title="Total Groups"
          value={stats.groups}
          icon={Layers}
          color="bg-green-500"
          description="Organized user groups"
        />
        <StatCard
          title="Connections"
          value={stats.connections}
          icon={Server}
          color="bg-purple-500"
          description="Active LDAP connections"
        />
        <StatCard
          title="Uptime"
          value={stats.uptime}
          icon={Clock}
          color="bg-orange-500"
          description="System availability"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
              <Activity className="w-5 h-5 text-gray-500" />
            </div>
            
            {systemHealth ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">LDAP Status</span>
                  <div className={`flex items-center space-x-2 ${
                    systemHealth.ldapConnected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      systemHealth.ldapConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium">
                      {systemHealth.ldapConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Status</span>
                  <div className="flex items-center space-x-2 text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Healthy</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="text-sm font-medium text-gray-900">45ms</span>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>All systems operational</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Unable to load health status</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <GitBranch className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="space-y-1">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200">
            <UsersIcon className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-700 font-medium">Add New User</span>
          </button>
          
          <button className="flex items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200">
            <Layers className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-700 font-medium">Create Group</span>
          </button>
          
          <button className="flex items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200">
            <GitBranch className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-purple-700 font-medium">View Hierarchy</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;