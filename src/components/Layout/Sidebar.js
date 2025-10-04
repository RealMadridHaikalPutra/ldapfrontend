import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Layers, 
  BarChart3, 
  Settings,
  Database,
  GitBranch
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    {
      path: '/dashboard',
      icon: BarChart3,
      label: 'Dashboard',
      description: 'Overview & Statistics'
    },
    {
      path: '/users',
      icon: Users,
      label: 'Users',
      description: 'User Management'
    },
    {
      path: '/groups',
      icon: Layers,
      label: 'Groups',
      description: 'Group Management'
    },
    {
      path: '/hierarchy',
      icon: GitBranch,
      label: 'Hierarchy',
      description: 'Organizational Chart'
    },
    {
      path: '/settings',
      icon: Settings,
      label: 'Settings',
      description: 'LDAP Configuration'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-gray-200 z-40">
      {/* Logo Section */}
      <div className="flex items-center p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">LDAP Manager</h1>
            <p className="text-xs text-gray-500">Directory Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center px-3 py-3 rounded-lg transition-all duration-200
                  ${active 
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <IconComponent 
                  className={`
                    w-5 h-5 mr-3 transition-colors duration-200
                    ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}
                  `} 
                />
                <div className="flex-1">
                  <div className={`font-medium ${active ? 'text-primary-700' : 'text-gray-700'}`}>
                    {item.label}
                  </div>
                  <div className={`text-xs ${active ? 'text-primary-500' : 'text-gray-500'}`}>
                    {item.description}
                  </div>
                </div>
                
                {active && (
                  <div className="w-2 h-2 bg-primary-600 rounded-full ml-2"></div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">LDAP Admin</div>
            <div className="text-xs text-gray-500">Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;