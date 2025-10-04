import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Eye,
  Mail,
  Phone,
  Building,
  User as UserIcon,
  MoreVertical,
  RefreshCw,
  Download,
  Upload,
  X,
  FileText,
  Users as UsersIcon,
  Calendar,
  MapPin
} from 'lucide-react';
import { userAPI } from '../services/api';
import UserForm from '../components/Users/UserForm';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // File upload ref
  const fileInputRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterDepartment]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const userData = await userAPI.getUsers();
      setUsers(userData || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.cn && user.cn.toLowerCase().includes(query)) ||
        (user.uid && user.uid.toLowerCase().includes(query)) ||
        (user.mail && user.mail.toLowerCase().includes(query)) ||
        (user.givenName && user.givenName.toLowerCase().includes(query)) ||
        (user.sn && user.sn.toLowerCase().includes(query))
      );
    }

    // Department filter
    if (filterDepartment) {
      filtered = filtered.filter(user => 
        user.department && user.department.toLowerCase().includes(filterDepartment.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setFormMode('create');
    setShowUserForm(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormMode('edit');
    setShowUserForm(true);
    setDropdownOpen(null);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
    setDropdownOpen(null);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userAPI.deleteUser(userToDelete.uid, 'uid');
      toast.success('User deleted successfully');
      await loadUsers(); // Reload users
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleUserSaved = async () => {
    await loadUsers(); // Reload users after save
  };

  const handleViewDetails = async (user) => {
    setLoadingDetails(true);
    setShowUserDetails(true);
    setDropdownOpen(null);
    
    try {
      // Get detailed user information
      const userDetails = await userAPI.getUserDetails(user.uid, 'uid');
      setSelectedUserDetails(userDetails);
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
      setSelectedUserDetails(user); // Fallback to basic user data
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExportLDIF = async () => {
    try {
      const blob = await userAPI.exportLDIF();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.ldif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Users exported successfully');
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Failed to export users');
    }
  };

  const handleImportLDIF = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.ldif')) {
      toast.error('Please select a valid LDIF file');
      return;
    }

    try {
      const loadingToast = toast.loading('Importing users from LDIF...');
      
      const result = await userAPI.importLDIF(file);
      
      toast.dismiss(loadingToast);
      toast.success(`Successfully imported ${result.imported || 0} users from LDIF file`);
      
      // Reload users
      await loadUsers();
    } catch (error) {
      console.error('Error importing LDIF:', error);
      toast.error(`Failed to import LDIF: ${error.response?.data?.message || error.message}`);
    }

    // Reset file input
    event.target.value = '';
  };

  // Get unique departments for filter dropdown
  const departments = [...new Set(users.filter(user => user.department).map(user => user.department))];

  // Pagination calculations
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const UserCard = ({ user, index }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-primary-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {user.cn || user.uid}
            </h3>
            
            <div className="mt-3 space-y-1">
              {user.mail && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>{user.mail}</span>
                </div>
              )}
              
              {user.telephoneNumber && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{user.telephoneNumber}</span>
                </div>
              )}
              
              {user.department && (
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="w-4 h-4 mr-2" />
                  <span>{user.department}</span>
                </div>
              )}
            </div>

            {/* Manager info */}
            {user.manager && user.manager.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Reports to:</p>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(user.manager) ? user.manager : [user.manager]).map((manager, idx) => (
                    <span key={idx} className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {manager.includes('uid=') ? manager.split(',')[0].replace('uid=', '') : manager}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(dropdownOpen === index ? null : index)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          
          {dropdownOpen === index && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="py-1">
                <button
                  onClick={() => handleEditUser(user)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit User
                </button>
                <button
                  onClick={() => handleViewDetails(user)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </button>
                <button
                  onClick={() => handleDeleteUser(user)}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-700">
          Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
            <button
              key={pageNumber}
              onClick={() => setCurrentPage(pageNumber)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                pageNumber === currentPage
                  ? 'text-white bg-primary-600 border border-primary-600'
                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {pageNumber}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage LDAP users and their information</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button 
            onClick={handleExportLDIF}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export LDIF
          </button>
          
          <button 
            onClick={handleImportLDIF}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import LDIF
          </button>
          
          <button
            onClick={handleCreateUser}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {(searchQuery || filterDepartment) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {filteredUsers.length} of {users.length} users shown
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterDepartment('');
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {users.length === 0 ? 'No users found' : 'No users match your filters'}
          </h3>
          <p className="text-gray-600 mb-6">
            {users.length === 0 
              ? 'Get started by creating your first user'
              : 'Try adjusting your search criteria or filters'
            }
          </p>
          {users.length === 0 && (
            <button
              onClick={handleCreateUser}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First User
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentUsers.map((user, index) => (
              <UserCard 
                key={user.uid || user.dn || index} 
                user={user} 
                index={indexOfFirstUser + index}
              />
            ))}
          </div>
          
          <Pagination />
        </>
      )}

      {/* User Details Modal */}
      {showUserDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <UserIcon className="w-6 h-6 mr-2" />
                User Details
              </h2>
              <button
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUserDetails(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : selectedUserDetails ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2" />
                      Basic Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">UID (Username)</label>
                          <p className="text-gray-900">{selectedUserDetails.uid || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Common Name</label>
                          <p className="text-gray-900">{selectedUserDetails.cn || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">First Name</label>
                          <p className="text-gray-900">{selectedUserDetails.givenName || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Last Name</label>
                          <p className="text-gray-900">{selectedUserDetails.sn || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Distinguished Name</label>
                          <p className="text-gray-900 text-sm break-all">{selectedUserDetails.dn || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Mail className="w-5 h-5 mr-2" />
                      Contact Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900">{selectedUserDetails.mail || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manager Information */}
                  {selectedUserDetails.manager && selectedUserDetails.manager.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <UsersIcon className="w-5 h-5 mr-2" />
                        Reporting Structure
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 mb-2">Reports To</label>
                        <div className="space-y-2">
                          {(Array.isArray(selectedUserDetails.manager) ? selectedUserDetails.manager : [selectedUserDetails.manager]).map((manager, idx) => (
                            <div key={idx} className="bg-white rounded-md p-3 border border-gray-200">
                              <p className="text-gray-900 font-medium">
                                {manager.includes('uid=') ? manager.split(',')[0].replace('uid=', '') : manager}
                              </p>
                              <p className="text-sm text-gray-500 break-all">{manager}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technical Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Technical Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Object Classes</label>
                          <div className="mt-1">
                            {selectedUserDetails.objectClass ? (
                              <div className="flex flex-wrap gap-1">
                                {(Array.isArray(selectedUserDetails.objectClass) ? selectedUserDetails.objectClass : [selectedUserDetails.objectClass]).map((cls, idx) => (
                                  <span key={idx} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {cls}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-900">N/A</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Attributes */}
                  {selectedUserDetails.additionalAttributes && Object.keys(selectedUserDetails.additionalAttributes).length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Attributes</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(selectedUserDetails.additionalAttributes).map(([key, value]) => (
                            <div key={key}>
                              <label className="block text-sm font-medium text-gray-500">{key}</label>
                              <p className="text-gray-900 break-all">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No user details available</h3>
                  <p className="text-gray-600">Unable to load user details</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUserDetails(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {selectedUserDetails && (
                <button
                  onClick={() => {
                    setShowUserDetails(false);
                    handleEditUser(selectedUserDetails);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Edit User
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for LDIF import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ldif"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* User Form Modal */}
      <UserForm
        user={selectedUser}
        isOpen={showUserForm}
        onClose={() => setShowUserForm(false)}
        onSave={handleUserSaved}
        mode={formMode}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete user <strong>{userToDelete?.cn || userToDelete?.uid}</strong>? 
                This will permanently remove the user from the LDAP directory.
              </p>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {dropdownOpen !== null && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setDropdownOpen(null)}
        />
      )}
    </div>
  );
};

export default Users;