import React, { useState, useEffect } from 'react';
import { X, Users, Search, UserPlus, UserMinus, Plus, Minus } from 'lucide-react';
import { groupAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ManageMembersModal = ({ group, isOpen, onClose, onSave }) => {
  const [currentMembers, setCurrentMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'available'
  const [changes, setChanges] = useState({
    toAdd: [],
    toRemove: []
  });

  useEffect(() => {
    if (isOpen && group) {
      loadData();
    }
  }, [isOpen, group]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current group details
      const groupDetails = await groupAPI.getGroup(group.cn, 'cn');
      
      // Load all available users
      const users = await userAPI.getUsers();
      setAvailableUsers(users || []);

      // Process current members - prioritize memberUid
      if (groupDetails.memberUid) {
        const memberDNs = Array.isArray(groupDetails.memberUid) ? groupDetails.memberUid : [groupDetails.memberUid];
        const memberPromises = memberDNs.map(async (memberDn) => {
          try {
            const uidMatch = memberDn.match(/uid=([^,]+)/);
            if (uidMatch) {
              const uid = uidMatch[1];
              const userDetails = await userAPI.getUser(uid, 'uid');
              return {
                ...userDetails,
                dn: memberDn
              };
            }
            return {
              dn: memberDn,
              uid: memberDn.includes('uid=') ? memberDn.split(',')[0].replace('uid=', '') : memberDn,
              cn: memberDn
            };
          } catch (error) {
            return {
              dn: memberDn,
              uid: memberDn.includes('uid=') ? memberDn.split(',')[0].replace('uid=', '') : memberDn,
              cn: memberDn
            };
          }
        });

        const resolvedMembers = await Promise.all(memberPromises);
        setCurrentMembers(resolvedMembers);
      } else if (groupDetails.member) {
        const memberDNs = Array.isArray(groupDetails.member) ? groupDetails.member : [groupDetails.member];
        const memberPromises = memberDNs.map(async (memberDn) => {
          try {
            const uidMatch = memberDn.match(/uid=([^,]+)/);
            if (uidMatch) {
              const uid = uidMatch[1];
              const userDetails = await userAPI.getUser(uid, 'uid');
              return {
                ...userDetails,
                dn: memberDn
              };
            }
            return {
              dn: memberDn,
              uid: memberDn.includes('uid=') ? memberDn.split(',')[0].replace('uid=', '') : memberDn,
              cn: memberDn
            };
          } catch (error) {
            return {
              dn: memberDn,
              uid: memberDn.includes('uid=') ? memberDn.split(',')[0].replace('uid=', '') : memberDn,
              cn: memberDn
            };
          }
        });

        const resolvedMembers = await Promise.all(memberPromises);
        setCurrentMembers(resolvedMembers);
      } else {
        setCurrentMembers([]);
      }

      // Reset changes
      setChanges({ toAdd: [], toRemove: [] });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const getUserDN = (user) => {
    return user.dn || `uid=${user.uid},ou=users,dc=mirorim,dc=ddns,dc=net`;
  };

  const getUserDisplayName = (user) => {
    return user.cn || user.uid || 'Unknown User';
  };

  const isUserMember = (user) => {
    const userDn = getUserDN(user);
    return currentMembers.some(member => getUserDN(member) === userDn) || 
           changes.toAdd.some(addUser => getUserDN(addUser) === userDn);
  };

  const isUserBeingRemoved = (user) => {
    const userDn = getUserDN(user);
    return changes.toRemove.some(removeUser => getUserDN(removeUser) === userDn);
  };

  const handleAddMember = (user) => {
    const userDn = getUserDN(user);
    
    // Check if user is in toRemove list (undo removal)
    const removeIndex = changes.toRemove.findIndex(removeUser => getUserDN(removeUser) === userDn);
    if (removeIndex >= 0) {
      setChanges(prev => ({
        ...prev,
        toRemove: prev.toRemove.filter((_, index) => index !== removeIndex)
      }));
      return;
    }

    // Check if user is already a current member
    const isCurrentMember = currentMembers.some(member => getUserDN(member) === userDn);
    if (!isCurrentMember) {
      setChanges(prev => ({
        ...prev,
        toAdd: [...prev.toAdd, user]
      }));
    }
  };

  const handleRemoveMember = (user) => {
    const userDn = getUserDN(user);
    
    // Check if user is in toAdd list (undo addition)
    const addIndex = changes.toAdd.findIndex(addUser => getUserDN(addUser) === userDn);
    if (addIndex >= 0) {
      setChanges(prev => ({
        ...prev,
        toAdd: prev.toAdd.filter((_, index) => index !== addIndex)
      }));
      return;
    }

    // Check if user is a current member
    const isCurrentMember = currentMembers.some(member => getUserDN(member) === userDn);
    if (isCurrentMember) {
      setChanges(prev => ({
        ...prev,
        toRemove: [...prev.toRemove, user]
      }));
    }
  };

  const handleSaveChanges = async () => {
    if (changes.toAdd.length === 0 && changes.toRemove.length === 0) {
      toast('No changes to save', {
        icon: 'ℹ️',
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      // Process additions
      for (const user of changes.toAdd) {
        await groupAPI.addUserToGroup(group.cn, user.uid, 'cn', 'uid');
      }

      // Process removals
      for (const user of changes.toRemove) {
        await groupAPI.removeUserFromGroup(group.cn, user.uid, 'cn', 'uid');
      }

      toast.success(`Successfully updated group members: ${changes.toAdd.length} added, ${changes.toRemove.length} removed`);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating group members:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      toast.error(`Failed to update group members: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = (users, query) => {
    if (!query) return users;
    const searchTerm = query.toLowerCase();
    return users.filter(user =>
      (user.cn && user.cn.toLowerCase().includes(searchTerm)) ||
      (user.uid && user.uid.toLowerCase().includes(searchTerm)) ||
      (user.mail && user.mail.toLowerCase().includes(searchTerm))
    );
  };

  const filteredCurrentMembers = filterUsers(currentMembers, searchQuery);
  const filteredAvailableUsers = filterUsers(
    availableUsers.filter(user => !isUserMember(user) || isUserBeingRemoved(user)), 
    searchQuery
  );

  const hasChanges = changes.toAdd.length > 0 || changes.toRemove.length > 0;

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Members</h2>
              <p className="text-sm text-gray-600">{group.cn}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Changes Summary */}
        {hasChanges && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm">
                {changes.toAdd.length > 0 && (
                  <span className="text-green-700">
                    <Plus className="w-4 h-4 inline mr-1" />
                    {changes.toAdd.length} to add
                  </span>
                )}
                {changes.toRemove.length > 0 && (
                  <span className="text-red-700">
                    <Minus className="w-4 h-4 inline mr-1" />
                    {changes.toRemove.length} to remove
                  </span>
                )}
              </div>
              <button
                onClick={() => setChanges({ toAdd: [], toRemove: [] })}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear changes
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'current'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Current Members ({currentMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'available'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Available Users ({filteredAvailableUsers.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="p-4">
              {activeTab === 'current' ? (
                <div>
                  {filteredCurrentMembers.length > 0 ? (
                    <div className="space-y-2">
                      {filteredCurrentMembers.map((member, index) => {
                        const isBeingRemoved = isUserBeingRemoved(member);
                        const isBeingAdded = changes.toAdd.some(user => getUserDN(user) === getUserDN(member));
                        
                        return (
                          <div 
                            key={getUserDN(member) || index}
                            className={`flex items-center justify-between p-3 border rounded-lg ${
                              isBeingRemoved 
                                ? 'bg-red-50 border-red-200' 
                                : isBeingAdded
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">
                                    {getUserDisplayName(member)}
                                  </span>
                                  {member.uid && member.uid !== member.cn && (
                                    <span className="text-sm text-gray-500">({member.uid})</span>
                                  )}
                                  {isBeingRemoved && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      Will be removed
                                    </span>
                                  )}
                                </div>
                                {member.mail && (
                                  <div className="text-sm text-gray-600">{member.mail}</div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleRemoveMember(member)}
                              className={`p-2 rounded-lg transition-colors ${
                                isBeingRemoved
                                  ? 'text-green-600 hover:bg-green-100'
                                  : 'text-red-600 hover:bg-red-100'
                              }`}
                              title={isBeingRemoved ? 'Undo removal' : 'Remove from group'}
                            >
                              {isBeingRemoved ? <Plus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {searchQuery ? 'No matching members' : 'No members yet'}
                      </h4>
                      <p className="text-gray-600">
                        {searchQuery 
                          ? 'Try adjusting your search criteria'
                          : 'Add users to this group from the Available Users tab'
                        }
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {filteredAvailableUsers.length > 0 ? (
                    <div className="space-y-2">
                      {filteredAvailableUsers.map((user, index) => {
                        const isBeingAdded = changes.toAdd.some(addUser => getUserDN(addUser) === getUserDN(user));
                        const isBeingRemoved = isUserBeingRemoved(user);
                        
                        return (
                          <div 
                            key={getUserDN(user) || index}
                            className={`flex items-center justify-between p-3 border rounded-lg ${
                              isBeingAdded 
                                ? 'bg-green-50 border-green-200' 
                                : isBeingRemoved
                                ? 'bg-red-50 border-red-200'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">
                                    {getUserDisplayName(user)}
                                  </span>
                                  {user.uid && user.uid !== user.cn && (
                                    <span className="text-sm text-gray-500">({user.uid})</span>
                                  )}
                                  {isBeingAdded && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                      Will be added
                                    </span>
                                  )}
                                  {isBeingRemoved && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      Currently member (will be removed)
                                    </span>
                                  )}
                                </div>
                                {user.mail && (
                                  <div className="text-sm text-gray-600">{user.mail}</div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => isBeingRemoved ? handleAddMember(user) : handleAddMember(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                isBeingAdded
                                  ? 'text-red-600 hover:bg-red-100'
                                  : 'text-green-600 hover:bg-green-100'
                              }`}
                              title={isBeingAdded ? 'Undo addition' : 'Add to group'}
                            >
                              {isBeingAdded ? <Minus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {searchQuery ? 'No matching users' : 'All users are already members'}
                      </h4>
                      <p className="text-gray-600">
                        {searchQuery 
                          ? 'Try adjusting your search criteria'
                          : 'All available users are already members of this group'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={!hasChanges || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              `Save Changes ${hasChanges ? `(${changes.toAdd.length + changes.toRemove.length})` : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageMembersModal;