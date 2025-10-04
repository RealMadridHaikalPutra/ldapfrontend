import React, { useState, useEffect } from 'react';
import { X, Users, FileText, UserPlus } from 'lucide-react';
import { groupAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const GroupForm = ({ group, isOpen, onClose, onSave, mode = 'create' }) => {
  const [formData, setFormData] = useState({
    cn: '',
    description: '',
    members: []
  });
  
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableUsers();
      
      if (mode === 'edit' && group) {
        setFormData({
          cn: group.cn || '',
          description: group.description || '',
          members: Array.isArray(group.memberUid) ? group.memberUid : (group.memberUid ? [group.memberUid] : [])
        });
        
        // Set selected members based on group data - prioritize memberUid
        if (group.memberUid) {
          const memberDNs = Array.isArray(group.memberUid) ? group.memberUid : [group.memberUid];
          setSelectedMembers(memberDNs);
        } else if (group.member) {
          const memberDNs = Array.isArray(group.member) ? group.member : [group.member];
          setSelectedMembers(memberDNs);
        }
      } else {
        // Reset form for create mode
        setFormData({
          cn: '',
          description: '',
          members: []
        });
        setSelectedMembers([]);
      }
      setErrors({});
      setUserSearchQuery('');
    }
  }, [isOpen, mode, group]);

  const loadAvailableUsers = async () => {
    try {
      const users = await userAPI.getUsers();
      setAvailableUsers(users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.cn) {
      newErrors.cn = 'Group name is required';
    }

    // Group name format validation (no spaces, special characters)
    const cnRegex = /^[a-zA-Z0-9._-]+$/;
    if (formData.cn && !cnRegex.test(formData.cn)) {
      newErrors.cn = 'Group name can only contain letters, numbers, dots, hyphens, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);
    
    try {
      const groupData = {
        cn: formData.cn,
        description: formData.description,
        memberUid: selectedMembers
      };

      let result;
      if (mode === 'create') {
        result = await groupAPI.createGroup(groupData);
        toast.success('Group created successfully');
      } else {
        // For updates, only include changed fields
        const updateData = {};
        if (formData.description !== group.description) {
          updateData.description = formData.description;
        }
        
        // Update members if changed
        const currentMembers = Array.isArray(group.memberUid) ? group.memberUid : (group.memberUid ? [group.memberUid] : []);
        if (JSON.stringify(selectedMembers.sort()) !== JSON.stringify(currentMembers.sort())) {
          updateData.memberUid = selectedMembers;
        }

        if (Object.keys(updateData).length > 0) {
          result = await groupAPI.updateGroup(group.cn, updateData, 'cn');
          toast.success('Group updated successfully');
        } else {
          toast('No changes to save', {
            icon: 'ℹ️',
            duration: 2000,
          });
          onClose();
          return;
        }
      }

      onSave(result);
      onClose();
    } catch (error) {
      console.error('Error saving group:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      toast.error(`Failed to ${mode} group: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleMemberToggle = (userDn, checked) => {
    if (checked) {
      setSelectedMembers(prev => [...prev, userDn]);
    } else {
      setSelectedMembers(prev => prev.filter(dn => dn !== userDn));
    }
  };

  const getUserDN = (user) => {
    return user.dn || `uid=${user.uid},ou=users,dc=mirorim,dc=ddns,dc=net`;
  };

  const getUserDisplayName = (user) => {
    return user.cn || user.uid || 'Unknown User';
  };

  const filteredUsers = availableUsers.filter(user => {
    if (!userSearchQuery) return true;
    const query = userSearchQuery.toLowerCase();
    return (
      (user.cn && user.cn.toLowerCase().includes(query)) ||
      (user.uid && user.uid.toLowerCase().includes(query)) ||
      (user.mail && user.mail.toLowerCase().includes(query))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create New Group' : 'Edit Group'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Group Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={formData.cn}
                    onChange={(e) => handleInputChange('cn', e.target.value)}
                    disabled={mode === 'edit'}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.cn ? 'border-red-500' : 'border-gray-300'
                    } ${mode === 'edit' ? 'bg-gray-100' : ''}`}
                    placeholder="e.g., developers, admins, marketing"
                  />
                  {errors.cn && <p className="text-red-500 text-xs mt-1">{errors.cn}</p>}
                  {mode === 'edit' && (
                    <p className="text-gray-500 text-xs mt-1">Group name cannot be changed</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe the purpose and role of this group"
                  />
                </div>
              </div>
            </div>

            {/* Members */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                Group Members
                <span className="ml-2 text-sm text-gray-500">
                  ({selectedMembers.length} selected)
                </span>
              </h3>
              
              {/* Search users */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search users to add..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Users list */}
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const userDn = getUserDN(user);
                      const isSelected = selectedMembers.includes(userDn);
                      
                      return (
                        <label 
                          key={user.uid || user.dn} 
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleMemberToggle(userDn, e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-3"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-primary-600" />
                              </div>
                              
                              <div>
                                <div className="font-medium text-gray-900">
                                  {getUserDisplayName(user)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.mail} {user.title && `• ${user.title}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {userSearchQuery ? 'No users match your search' : 'No users available'}
                  </div>
                )}
              </div>

              {/* Selected members summary */}
              {selectedMembers.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Selected Members ({selectedMembers.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((memberDn) => {
                      // Find user by DN
                      const user = availableUsers.find(u => getUserDN(u) === memberDn);
                      const displayName = user ? getUserDisplayName(user) : 
                        (memberDn.includes('uid=') ? memberDn.split(',')[0].replace('uid=', '') : memberDn);
                      
                      return (
                        <span 
                          key={memberDn}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {displayName}
                          <button
                            type="button"
                            onClick={() => handleMemberToggle(memberDn, false)}
                            className="ml-1 hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </div>
              ) : (
                mode === 'create' ? 'Create Group' : 'Update Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupForm;