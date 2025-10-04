import React, { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  User,
  ChevronDown,
  ChevronRight,
  Crown,
  Users,
  Mail,
  Phone,
  Building,
  MoreHorizontal,
  UserPlus,
  Edit,
  GitBranch,
  AlertTriangle,
} from "lucide-react";

const HierarchyNode = ({
  user,
  depth = 0,
  isExpanded,
  onToggle,
  onAddSubordinate,
  onEditUser,
  onRemoveManager,
  children,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showHierarchyDetails, setShowHierarchyDetails] = useState(false);

  // Setup draggable
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: user.uid,
    data: {
      type: "user",
      user,
      depth,
    },
  });

  // Setup droppable
  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: user.uid,
    data: {
      type: "user",
      user,
      depth,
    },
  });

  // Combine refs
  const setNodeRef = (node) => {
    setDragRef(node);
    setDropRef(node);
  };

  // Create custom drag handle listeners that exclude buttons
  const dragHandleListeners = {
    ...dragListeners,
    onPointerDown: (e) => {
      // Don't start drag if clicking on button elements
      if (e.target.closest("button")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      dragListeners.onPointerDown?.(e);
    },
    onMouseDown: (e) => {
      // Don't start drag if clicking on button elements
      if (e.target.closest("button")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      dragListeners.onMouseDown?.(e);
    },
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const hasSubordinates = children && children.length > 0;
  const indentLevel = depth * 24;

  // Hierarchy Details Component
  const HierarchyDetails = ({ user, hierarchy }) => {
    if (!hierarchy || hierarchy.error) {
      return (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-700">
              {hierarchy?.error || "No detailed hierarchy data available"}
            </span>
          </div>
        </div>
      );
    }

    const renderManager = (manager, level = 0) => {
      if (!manager || manager.error) {
        return (
          <div
            className={`ml-${
              level * 4
            } p-2 bg-red-50 border border-red-200 rounded mb-1`}
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">
                {manager?.error || "Error loading manager data"}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div
          className={`ml-${
            level * 4
          } p-2 bg-blue-50 border border-blue-200 rounded mb-2`}
        >
          <div className="flex items-center space-x-2 mb-1">
            <Crown className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              {manager.hierarchy?.cn || manager.cn || manager.uid}
            </span>
          </div>
          {manager.hierarchy?.mail && (
            <div className="flex items-center space-x-1 text-xs text-blue-700">
              <Mail className="w-3 h-3" />
              <span>{manager.hierarchy.mail}</span>
            </div>
          )}

          {/* Render nested managers */}
          {manager.hierarchy?.managers &&
            manager.hierarchy.managers.length > 0 && (
              <div className="mt-2">
                {manager.hierarchy.managers.map((nestedManager, index) => (
                  <div key={index}>
                    {renderManager(nestedManager, level + 1)}
                  </div>
                ))}
              </div>
            )}
        </div>
      );
    };

    return (
      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded">
        <div className="flex items-center space-x-2 mb-2">
          <GitBranch className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-700">
            Complete Reporting Chain
          </span>
        </div>

        {hierarchy.managers && hierarchy.managers.length > 0 ? (
          <div className="space-y-1">
            {hierarchy.managers.map((manager, index) => (
              <div key={index}>{renderManager(manager, 0)}</div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">
            No reporting relationships found
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <div
        ref={setNodeRef}
        style={{
          ...style,
          marginLeft: `${indentLevel}px`,
        }}
        className={`
          group relative flex items-center p-3 bg-white border border-gray-200 rounded-lg 
          hover:shadow-md transition-all duration-200 cursor-move
          ${isDragging ? "shadow-lg ring-2 ring-primary-500 bg-primary-50 opacity-50" : ""}
          ${isOver ? "ring-2 ring-green-500 bg-green-50 shadow-lg" : ""}
        `}
        {...dragAttributes}
        {...dragHandleListeners}
      >
        {/* Connection Lines */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300 -translate-x-3" />
        )}
        {depth > 0 && (
          <div className="absolute left-0 top-1/2 w-3 h-px bg-gray-300 -translate-x-3" />
        )}

        {/* Expand/Collapse Button */}
        <div className="flex items-center mr-3">
          {hasSubordinates ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log(
                  `Toggle clicked for ${user.uid}, isExpanded: ${isExpanded}`
                );
                onToggle(user.uid);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors duration-200 relative z-10"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6 h-6" /> // Spacer
          )}
        </div>

        {/* User Avatar */}
        <div className="relative mr-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              user.hierarchyDepth === 0
                ? "bg-yellow-100"
                : user.hasSubordinates
                ? "bg-blue-100"
                : "bg-gray-100"
            }`}
          >
            {user.hierarchyDepth === 0 ? (
              <Crown className="w-5 h-5 text-yellow-600" />
            ) : user.hasSubordinates ? (
              <Users className="w-5 h-5 text-blue-600" />
            ) : (
              <User className="w-5 h-5 text-gray-600" />
            )}
          </div>

          {/* Subordinate count indicator */}
          {hasSubordinates && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-green-600">
                {user.subordinateCount || children.length}
              </span>
            </div>
          )}
        </div>

        {/* User Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {user.cn || user.uid}
            </h3>
          </div>

          <div className="mt-1 space-y-1">
            {user.title && (
              <p className="text-sm text-gray-600 truncate">{user.title}</p>
            )}

            {/* Display user groups */}
            {user.userGroups && user.userGroups.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {user.userGroups.slice(0, 3).map((group, index) => {
                  const groupName =
                    typeof group === "string"
                      ? group
                      : group.cn ||
                        group.dn?.match(/cn=([^,]+)/)?.[1] ||
                        "Unknown";
                  return (
                    <span
                      key={index}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {groupName}
                    </span>
                  );
                })}
                {user.userGroups.length > 3 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-50 text-gray-600">
                    +{user.userGroups.length - 3} more
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {user.mail && (
                <div className="flex items-center space-x-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{user.mail}</span>
                </div>
              )}
              {user.department && (
                <div className="flex items-center space-x-1">
                  <Building className="w-3 h-3" />
                  <span>{user.department}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subordinate Count */}
        {hasSubordinates && (
          <div className="mr-3 text-right">
            <div className="text-sm font-medium text-gray-900">
              {user.subordinateCount || children.length}
            </div>
            <div className="text-xs text-gray-500">
              {(user.subordinateCount || children.length) === 1
                ? "direct report"
                : "direct reports"}
            </div>
          </div>
        )}

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log(`Actions menu clicked for ${user.uid}`);
              setShowActions(!showActions);
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 relative z-10"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>

          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onEditUser(user);
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit User
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAddSubordinate(user);
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Subordinate
                </button>
                {user.fullHierarchy && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowHierarchyDetails(!showHierarchyDetails);
                      setShowActions(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <GitBranch className="w-4 h-4 mr-2" />
                    {showHierarchyDetails ? "Hide" : "Show"} Full Hierarchy
                  </button>
                )}
                {depth > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onRemoveManager(user);
                      setShowActions(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Remove Manager
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drag indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary-500 bg-opacity-20 rounded-lg border-2 border-dashed border-primary-500" />
        )}

        {/* Drop indicator */}
        {isOver && !isDragging && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-10 rounded-lg border-2 border-dashed border-green-500">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
              Drop to make manager
            </div>
          </div>
        )}
      </div>

      {/* Hierarchy Details */}
      {showHierarchyDetails && user.fullHierarchy && (
        <div style={{ marginLeft: `${indentLevel}px` }}>
          <HierarchyDetails user={user} hierarchy={user.fullHierarchy} />
        </div>
      )}

      {/* Subordinates */}
      {hasSubordinates && isExpanded && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <HierarchyNode
              key={child.user.uid}
              user={child.user}
              depth={depth + 1}
              isExpanded={child.isExpanded}
              onToggle={onToggle}
              onAddSubordinate={onAddSubordinate}
              onEditUser={onEditUser}
              onRemoveManager={onRemoveManager}
              children={child.children}
            />
          ))}
        </div>
      )}

      {/* Click outside to close actions */}
      {showActions && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
};

export default HierarchyNode;
