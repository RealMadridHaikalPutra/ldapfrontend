import React, { useState, useEffect } from 'react';
import { X, Users, FileText, Calendar, Shield, Eye, ExternalLink } from 'lucide-react';
import { groupAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const GroupDetailsModal = ({ group, isOpen, onClose }) => {
  const [groupDetails, setGroupDetails] = useState(null);
  const [memberDetails, setMemberDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && group) {
      loadGroupDetails();
    }
  }, [isOpen, group]);

  const loadGroupDetails = async () => {
    setLoading(true);
    try {
      // Get detailed group information
      const details = await groupAPI.getGroup(group.cn, 'cn');
      setGroupDetails(details);

      // Load member details - prioritize memberUid
      if (details.memberUid) {
        const members = Array.isArray(details.memberUid) ? details.memberUid : [details.memberUid];
        const memberPromises = members.map(async (memberDn) => {
          try {
            // Extract UID from DN
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
              uid: memberDn,
              cn: memberDn,
              error: 'Could not resolve user details'
            };
          } catch (error) {
            console.error(`Error loading user details for ${memberDn}:`, error);
            return {
              dn: memberDn,
              uid: memberDn,
              cn: memberDn,
              error: 'Failed to load user details'
            };
          }
        });

        const resolvedMembers = await Promise.all(memberPromises);
        setMemberDetails(resolvedMembers);
      } else if (details.member) {
        const members = Array.isArray(details.member) ? details.member : [details.member];
        const memberPromises = members.map(async (memberDn) => {
          try {
            // Extract UID from DN
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
              uid: memberDn,
              cn: memberDn,
              error: 'Could not resolve user details'
            };
          } catch (error) {
            console.error(`Error loading user details for ${memberDn}:`, error);
            return {
              dn: memberDn,
              uid: memberDn,
              cn: memberDn,
              error: 'Failed to load user details'
            };
          }
        });

        const resolvedMembers = await Promise.all(memberPromises);
        setMemberDetails(resolvedMembers);
      } else {
        setMemberDetails([]);
      }
    } catch (error) {
      console.error('Error loading group details:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const formatAttribute = (value) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || 'Not specified';
  };

  const getMemberCount = () => {
    return memberDetails.length;
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Group Details</h2>
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

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group Name (CN)
                    </label>
                    <p className="text-gray-900 bg-white px-3 py-2 rounded border">
                      {groupDetails?.cn || group.cn}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distinguished Name (DN)
                    </label>
                    <p className="text-gray-900 bg-white px-3 py-2 rounded border text-sm break-all">
                      {groupDetails?.dn || group.dn}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-gray-900 bg-white px-3 py-2 rounded border min-h-[3rem]">
                      {formatAttribute(groupDetails?.description || group.description) !== 'Not specified' 
                        ? formatAttribute(groupDetails?.description || group.description)
                        : <span className="text-gray-500 italic">No description provided</span>
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Object Classes */}
              {groupDetails?.objectClass && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Object Classes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(groupDetails.objectClass) 
                      ? groupDetails.objectClass 
                      : [groupDetails.objectClass]
                    ).map((objectClass, index) => (
                      <span 
                        key={index}
                        className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                      >
                        {objectClass}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Members */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Group Members
                    <span className="ml-2 text-sm text-gray-500">
                      ({getMemberCount()} members)
                    </span>
                  </h3>
                </div>

                {memberDetails.length > 0 ? (
                  <div className="space-y-3">
                    {memberDetails.map((member, index) => (
                      <div 
                        key={member.dn || index}
                        className="bg-white rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-600" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">
                                {member.cn || member.uid || 'Unknown User'}
                              </h4>
                              {member.uid && member.uid !== member.cn && (
                                <span className="text-sm text-gray-500">({member.uid})</span>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              {member.mail && (
                                <p className="flex items-center">
                                  <span className="font-medium mr-2">Email:</span>
                                  {member.mail}
                                </p>
                              )}
                              {member.title && (
                                <p className="flex items-center">
                                  <span className="font-medium mr-2">Title:</span>
                                  {member.title}
                                </p>
                              )}
                              <p className="flex items-center">
                                <span className="font-medium mr-2">DN:</span>
                                <span className="text-xs break-all">{member.dn}</span>
                              </p>
                            </div>

                            {member.error && (
                              <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                                {member.error}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                // TODO: Open user details modal
                                toast('User details feature coming soon', {
                                  icon: 'ℹ️',
                                  duration: 2000,
                                });
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              title="View user details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Members</h4>
                    <p className="text-gray-600">This group doesn't have any members yet.</p>
                  </div>
                )}
              </div>

              {/* Additional Attributes */}
              {groupDetails && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Additional Attributes
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(groupDetails)
                      .filter(([key]) => 
                        !['cn', 'dn', 'description', 'member', 'memberUid', 'objectClass', 'gidNumber'].includes(key)
                      )
                      .map(([key, value]) => (
                        <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="font-medium text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </div>
                          <div className="md:col-span-2 text-gray-900 bg-white px-3 py-2 rounded border text-sm break-all">
                            {formatAttribute(value)}
                          </div>
                        </div>
                      ))
                    }
                    
                    {Object.entries(groupDetails)
                      .filter(([key]) => 
                        !['cn', 'dn', 'description', 'member', 'memberUid', 'objectClass', 'gidNumber'].includes(key)
                      ).length === 0 && (
                      <p className="text-gray-500 italic text-center py-4">
                        No additional attributes found
                      </p>
                    )}
                  </div>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailsModal;