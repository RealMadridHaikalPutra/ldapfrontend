import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Users as UsersIcon,
  MoreVertical,
  RefreshCw,
  UserPlus,
  UserMinus,
  Layers,
} from "lucide-react";
import { groupAPI } from "../services/api";
import GroupForm from "../components/Groups/GroupForm";
import GroupDetailsModal from "../components/Groups/GroupDetailsModal";
import ManageMembersModal from "../components/Groups/ManageMembersModal";
import toast from "react-hot-toast";

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formMode, setFormMode] = useState("create");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [groupsPerPage] = useState(12);

  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [groups, searchQuery]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const groupData = await groupAPI.getGroups();
      setGroups(groupData || []);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Failed to load groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const filterGroups = () => {
    let filtered = groups;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          (group.cn && group.cn.toLowerCase().includes(query)) ||
          (group.description && group.description.toLowerCase().includes(query))
      );
    }

    setFilteredGroups(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setFormMode("create");
    setShowGroupForm(true);
  };

  const handleEditGroup = (group) => {
    setSelectedGroup(group);
    setFormMode("edit");
    setShowGroupForm(true);
    setDropdownOpen(null);
  };

  const handleDeleteGroup = (group) => {
    setGroupToDelete(group);
    setShowDeleteConfirm(true);
    setDropdownOpen(null);
  };

  const handleViewDetails = (group) => {
    setSelectedGroupForDetails(group);
    setShowDetailsModal(true);
    setDropdownOpen(null);
  };

  const handleManageMembers = (group) => {
    setSelectedGroupForDetails(group);
    setShowMembersModal(true);
    setDropdownOpen(null);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      await groupAPI.deleteGroup(groupToDelete.cn, "cn");
      toast.success("Group deleted successfully");
      await loadGroups(); // Reload groups
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  };

  const handleGroupSaved = async () => {
    await loadGroups(); // Reload groups after save
  };

  // Pagination calculations
  const indexOfLastGroup = currentPage * groupsPerPage;
  const indexOfFirstGroup = indexOfLastGroup - groupsPerPage;
  const currentGroups = filteredGroups.slice(
    indexOfFirstGroup,
    indexOfLastGroup
  );
  const totalPages = Math.ceil(filteredGroups.length / groupsPerPage);

  const getMemberCount = (group) => {
    // Check both member and memberUid attributes
    const memberAttr = group.memberUid || group.member;
    if (!memberAttr) return 0;
    return Array.isArray(memberAttr) ? memberAttr.length : 1;
  };

  const getMemberNames = (group) => {
    // Check both member and memberUid attributes
    const memberAttr = group.memberUid || group.member;
    if (!memberAttr) return [];
    const members = Array.isArray(memberAttr) ? memberAttr : [memberAttr];
    return members.map((member) => {
      // Extract UID from DN (handles both full DN and simple uid)
      const match = member.match(/uid=([^,]+)/);
      return match ? match[1] : member;
    });
  };

  const GroupCard = ({ group, index }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Layers className="w-6 h-6 text-green-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {group.cn}
            </h3>

            {group.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {group.description}
              </p>
            )}

            <div className="mt-3 flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <UsersIcon className="w-4 h-4 mr-1" />
                <span>{getMemberCount(group)} members</span>
              </div>
            </div>

            {/* Members preview */}
            {getMemberCount(group) > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Members:</p>
                <div className="flex flex-wrap gap-1">
                  {getMemberNames(group)
                    .slice(0, 5)
                    .map((memberName, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {memberName}
                      </span>
                    ))}
                  {getMemberCount(group) > 5 && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{getMemberCount(group) - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions dropdown */}
        <div className="relative">
          <button
            onClick={() =>
              setDropdownOpen(dropdownOpen === index ? null : index)
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {dropdownOpen === index && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="py-1">
                <button
                  onClick={() => handleEditGroup(group)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Group
                </button>
                <button
                  onClick={() => handleViewDetails(group)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </button>
                <button
                  onClick={() => handleManageMembers(group)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Manage Members
                </button>
                <button
                  onClick={() => handleDeleteGroup(group)}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
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
          Showing {indexOfFirstGroup + 1} to{" "}
          {Math.min(indexOfLastGroup, filteredGroups.length)} of{" "}
          {filteredGroups.length} groups
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pageNumber === currentPage
                    ? "text-white bg-primary-600 border border-primary-600"
                    : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {pageNumber}
              </button>
            )
          )}

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
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
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600">Manage LDAP groups and memberships</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadGroups}
            disabled={loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            onClick={handleCreateGroup}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Group
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {filteredGroups.length} of {groups.length} groups shown
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {groups.length}
              </h3>
              <p className="text-sm text-gray-600">Total Groups</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {groups.reduce(
                  (total, group) => total + getMemberCount(group),
                  0
                )}
              </h3>
              <p className="text-sm text-gray-600">Total Memberships</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <UserMinus className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {groups.filter((group) => getMemberCount(group) === 0).length}
              </h3>
              <p className="text-sm text-gray-600">Empty Groups</p>
            </div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {groups.length === 0
              ? "No groups found"
              : "No groups match your search"}
          </h3>
          <p className="text-gray-600 mb-6">
            {groups.length === 0
              ? "Get started by creating your first group"
              : "Try adjusting your search criteria"}
          </p>
          {groups.length === 0 && (
            <button
              onClick={handleCreateGroup}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Group
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentGroups.map((group, index) => (
              <GroupCard
                key={group.cn || group.dn || index}
                group={group}
                index={indexOfFirstGroup + index}
              />
            ))}
          </div>

          <Pagination />
        </>
      )}

      {/* Group Form Modal */}
      <GroupForm
        group={selectedGroup}
        isOpen={showGroupForm}
        onClose={() => setShowGroupForm(false)}
        onSave={handleGroupSaved}
        mode={formMode}
      />

      {/* Group Details Modal */}
      <GroupDetailsModal
        group={selectedGroupForDetails}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedGroupForDetails(null);
        }}
      />

      {/* Manage Members Modal */}
      <ManageMembersModal
        group={selectedGroupForDetails}
        isOpen={showMembersModal}
        onClose={() => {
          setShowMembersModal(false);
          setSelectedGroupForDetails(null);
        }}
        onSave={handleGroupSaved}
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Group
                  </h3>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete group{" "}
                <strong>{groupToDelete?.cn}</strong>? This will remove the group
                and all its memberships.
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setGroupToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteGroup}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete Group
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

export default Groups;
