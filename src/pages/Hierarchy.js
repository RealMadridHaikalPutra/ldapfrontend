import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  GitBranch,
  RefreshCw,
  Search,
  Filter,
  Users,
  Crown,
  ChevronDown,
  ChevronUp,
  Download,
  Settings,
  AlertTriangle,
  User,
  UserPlus,
  Building2,
} from "lucide-react";
import { userAPI } from "../services/api";
import HierarchyNode from "../components/Hierarchy/HierarchyNode";
import UserForm from "../components/Users/UserForm";
import toast from "react-hot-toast";

// Top Level Drop Zone Component
const TopLevelDropZone = ({ activeId }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'TOP_LEVEL',
    data: {
      type: 'top-level',
    },
  });

  if (!activeId) return null;

  return (
    <div
      ref={setNodeRef}
      className={`
        mb-6 p-4 border-2 border-dashed rounded-lg transition-all duration-200
        ${isOver 
          ? 'border-green-500 bg-green-50 shadow-lg' 
          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }
      `}
    >
      <div className="flex items-center justify-center space-x-2">
        <Building2 className="w-5 h-5 text-gray-500" />
        <span className={`text-sm font-medium ${isOver ? 'text-green-700' : 'text-gray-600'}`}>
          {isOver 
            ? 'Drop here to move to Top Level (no manager)' 
            : 'Drag here to promote to Top Level'
          }
        </span>
      </div>
    </div>
  );
};

const Hierarchy = () => {
  const [users, setUsers] = useState([]);
  const [hierarchyTree, setHierarchyTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showOrphans, setShowOrphans] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [draggedUser, setDraggedUser] = useState(null);

  // User form states
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formMode, setFormMode] = useState("create");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    loadHierarchyData();
  }, []);

  useEffect(() => {
    buildHierarchyTree();
  }, [users, searchQuery, departmentFilter, showOrphans]);

  // Separate useEffect for updating expand/collapse states without rebuilding tree
  useEffect(() => {
    updateTreeExpandState();
  }, [expandedNodes]);

  // Function to get role based on user groups
  const getGroupBasedRole = (groups) => {
    if (!groups || groups.length === 0) {
      return "No Group";
    }

    // Extract group names from group objects
    const groupNames = groups.map(group => {
      if (typeof group === 'string') {
        return group;
      } else if (group.cn) {
        return group.cn;
      } else if (group.name) {
        return group.name;
      } else if (group.dn) {
        // Extract cn from DN
        const match = group.dn.match(/cn=([^,]+)/);
        return match ? match[1] : 'Unknown Group';
      }
      return 'Unknown Group';
    });

    // If user has multiple groups, show the most relevant ones
    if (groupNames.length > 1) {
      // Prioritize certain groups
      const priorityGroups = ['CEO', 'Manager', 'Leader', 'Admin'];
      const foundPriorityGroup = groupNames.find(name => 
        priorityGroups.some(priority => name.toLowerCase().includes(priority.toLowerCase()))
      );
      
      if (foundPriorityGroup) {
        return foundPriorityGroup;
      }
      
      // Otherwise show up to 2 groups
      return groupNames.slice(0, 2).join(' & ');
    }

    // Return the group name
    return groupNames[0] || "No Group";
  };

  // Function to update tree expand state without rebuilding
  const updateTreeExpandState = () => {
    if (hierarchyTree.length === 0) return;

    const updateNodeExpandState = (node) => {
      node.isExpanded = expandedNodes.has(node.user.uid);
      if (node.children && node.children.length > 0) {
        node.children.forEach(updateNodeExpandState);
      }
    };

    hierarchyTree.forEach(updateNodeExpandState);
    // Force re-render by updating state
    setHierarchyTree([...hierarchyTree]);
  };

  const loadHierarchyData = async () => {
    setLoading(true);
    try {
      // Get all users with limit of 100 for hierarchy display
      const userData = await userAPI.getUsers("", 100);
      console.log("fetched user", userData)

      // Fetch detailed hierarchy and groups for each user
      if (userData && userData.length > 0) {
        console.log(`Fetching hierarchy and groups for ${userData.length} users...`);
        
        const usersWithHierarchyAndGroups = await Promise.all(
          userData.map(async (user) => {
            try {
              // Fetch hierarchy
              const hierarchyPromise = userAPI.getUserHierarchy(user.uid).catch(error => {
                console.warn(`Failed to fetch hierarchy for ${user.uid}:`, error);
                return null;
              });

              // Fetch user groups
              const groupsPromise = userAPI.getUserGroups(user.uid).catch(error => {
                console.warn(`Failed to fetch groups for ${user.uid}:`, error);
                return [];
              });

              const [hierarchy, groups] = await Promise.all([hierarchyPromise, groupsPromise]);

              return {
                ...user,
                fullHierarchy: hierarchy,
                userGroups: groups || [],
                groupBasedRole: getGroupBasedRole(groups || [])
              };
            } catch (error) {
              console.warn(`Failed to fetch data for ${user.uid}:`, error);
              return {
                ...user,
                fullHierarchy: null,
                userGroups: []
              };
            }
          })
        );

        setUsers(usersWithHierarchyAndGroups);
        console.log(`Loaded ${usersWithHierarchyAndGroups.length} users with hierarchy and groups data`);
      } else {
        setUsers(userData || []);
      }

      // Auto-expand all nodes after refresh
      const allUserIds = new Set((userData || []).map((user) => user.uid));
      setExpandedNodes(allUserIds);
    } catch (error) {
      console.error("Error loading hierarchy data:", error);
      toast.error("Failed to load hierarchy data");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchyTree = () => {
    console.log('🔄 buildHierarchyTree called - rebuilding hierarchy tree');
    
    if (!users.length) {
      setHierarchyTree([]);
      return;
    }

    console.log(`Building hierarchy from ${users.length} users...`);

    // Filter users based on search and department
    let filteredUsers = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredUsers = users.filter(
        (user) =>
          (user.cn && user.cn.toLowerCase().includes(query)) ||
          (user.uid && user.uid.toLowerCase().includes(query)) ||
          (user.mail && user.mail.toLowerCase().includes(query)) ||
          (user.title && user.title.toLowerCase().includes(query))
      );
    }

    if (departmentFilter) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.department &&
          user.department.toLowerCase().includes(departmentFilter.toLowerCase())
      );
    }

    // Create user map for quick lookup - use ALL users to build complete tree
    const userMap = new Map();
    
    // Initialize all users in the map (not just filtered)
    users.forEach((user) => {
      userMap.set(user.uid, {
        user: {
          ...user,
          subordinateCount: 0,
          hasSubordinates: false,
          dynamicRole: getGroupBasedRole(user.userGroups) // Use groups-based role
        },
        children: [],
        isExpanded: expandedNodes.has(user.uid),
      });
    });

    // Helper function to extract UID from DN
    const extractUidFromDn = (dn) => {
      if (!dn) return null;
      // Handle both comma-separated DN format and simple uid format
      const match = dn.match(/uid=([^,]+)/);
      return match ? match[1] : null;
    };

    // First pass: Build parent-child relationships using ALL users
    users.forEach((user) => {
      if (user.manager) {
        // Handle both single manager and multiple managers
        const managers = Array.isArray(user.manager) ? user.manager : [user.manager];

        managers.forEach((managerDn) => {
          const managerUid = extractUidFromDn(managerDn);

          // CRITICAL: Prevent circular reference (self as manager)
          if (managerUid === user.uid) {
            console.warn(`Circular reference detected: User ${user.uid} has itself as manager`);
            return;
          }

          if (managerUid && userMap.has(managerUid)) {
            const managerNode = userMap.get(managerUid);
            const subordinateNode = userMap.get(user.uid);
            
            // Avoid duplicate children
            if (!managerNode.children.find(child => child.user.uid === user.uid)) {
              managerNode.children.push(subordinateNode);
              managerNode.user.subordinateCount++;
              managerNode.user.hasSubordinates = true;
            }
          } else if (managerUid) {
            console.log(`Manager ${managerUid} not found for user ${user.uid}`);
          }
        });
      }
    });

    // Second pass: Assign dynamic roles based on actual hierarchy depth and position
    const assignDynamicRoles = () => {
      // Calculate hierarchy depth for each user with cycle detection
      const getUserDepth = (userId, visited = new Set(), ancestorChain = []) => {
        // Check for circular reference
        if (visited.has(userId)) {
          console.warn(`Circular reference detected in chain: ${ancestorChain.join(' -> ')} -> ${userId}`);
          return ancestorChain.length; // Return current depth to break cycle
        }
        
        visited.add(userId);
        ancestorChain.push(userId);

        const user = users.find(u => u.uid === userId);
        if (!user || !user.manager || user.manager.length === 0) {
          return 0; // Top level
        }

        const managers = Array.isArray(user.manager) ? user.manager : [user.manager];
        let maxManagerDepth = 0;

        managers.forEach((managerDn) => {
          const managerUid = extractUidFromDn(managerDn);
          
          // Skip self-reference
          if (managerUid === userId) {
            console.warn(`Self-reference detected for user ${userId}`);
            return;
          }
          
          if (managerUid && userMap.has(managerUid)) {
            const managerDepth = getUserDepth(
              managerUid, 
              new Set(visited), 
              [...ancestorChain]
            );
            maxManagerDepth = Math.max(maxManagerDepth, managerDepth);
          }
        });

        return maxManagerDepth + 1;
      };

      // Assign roles based on groups only
      userMap.forEach((node) => {
        const user = node.user;
        const depth = getUserDepth(user.uid);
        const subordinateCount = user.subordinateCount;

        // Use only the group-based role without hierarchy indicators
        const groupRole = getGroupBasedRole(user.userGroups);
        user.dynamicRole = groupRole;

        // Store depth for sorting and display
        user.hierarchyDepth = depth;
      });
    };

    assignDynamicRoles();

    // Find root nodes (users without managers)
    const rootNodes = [];

    users.forEach((user) => {
      const userNode = userMap.get(user.uid);

      if (!user.manager || user.manager.length === 0) {
        // No manager - this is a root node (top level)
        rootNodes.push(userNode);
      }
    });

    // Filter tree for display if needed
    const filterTreeForDisplay = (node, visitedInPath = new Set()) => {
      // Ensure visitedInPath is always a Set
      if (!(visitedInPath instanceof Set)) {
        visitedInPath = new Set();
      }
      
      // Detect circular reference in display tree
      if (visitedInPath.has(node.user.uid)) {
        console.warn(`Circular display detected for ${node.user.uid}`);
        return null;
      }
      
      const newVisitedSet = new Set(visitedInPath);
      newVisitedSet.add(node.user.uid);
      
      // Check if this node matches filter
      const matchesFilter = () => {
        if (!searchQuery && !departmentFilter) return true;
        
        const user = node.user;
        let matches = true;
        
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          matches = matches && (
            (user.cn && user.cn.toLowerCase().includes(query)) ||
            (user.uid && user.uid.toLowerCase().includes(query)) ||
            (user.mail && user.mail.toLowerCase().includes(query)) ||
            (user.title && user.title.toLowerCase().includes(query))
          );
        }
        
        if (departmentFilter) {
          matches = matches && (
            user.department &&
            user.department.toLowerCase().includes(departmentFilter.toLowerCase())
          );
        }
        
        return matches;
      };

      // Recursively filter children
      const filteredChildren = node.children
        .map(child => filterTreeForDisplay(child, newVisitedSet))
        .filter(child => child !== null);

      // Include node if it matches OR has matching children
      if (matchesFilter() || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
          isExpanded: expandedNodes.has(node.user.uid) // Ensure isExpanded is current
        };
      }

      return null;
    };

    // Sort nodes by hierarchy depth, subordinate count, and name
    const sortNodes = (nodes) => {
      return nodes.sort((a, b) => {
        // First sort by hierarchy depth (top level first)
        if (a.user.hierarchyDepth !== b.user.hierarchyDepth) {
          return a.user.hierarchyDepth - b.user.hierarchyDepth;
        }

        // Then sort by subordinate count (descending - managers first)
        if (a.user.subordinateCount !== b.user.subordinateCount) {
          return b.user.subordinateCount - a.user.subordinateCount;
        }

        // Finally sort by name
        const nameA = (a.user.cn || a.user.uid).toLowerCase();
        const nameB = (b.user.cn || b.user.uid).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    };

    // Recursively sort all children
    const sortTreeRecursive = (node) => {
      // Update isExpanded state for this node
      node.isExpanded = expandedNodes.has(node.user.uid);
      
      if (node.children.length > 0) {
        node.children = sortNodes(node.children);
        node.children.forEach(sortTreeRecursive);
      }
    };

    // Sort root nodes and their children recursively
    const sortedRootNodes = sortNodes(rootNodes);
    sortedRootNodes.forEach(node => {
      // Ensure root nodes also have correct isExpanded state
      node.isExpanded = expandedNodes.has(node.user.uid);
      sortTreeRecursive(node);
    });

    // Apply filters if any
    let finalTree = sortedRootNodes;
    
    if (searchQuery || departmentFilter) {
      finalTree = sortedRootNodes
        .map(node => filterTreeForDisplay(node, new Set()))
        .filter(node => node !== null);
    }

    console.log(`Built hierarchy tree with ${rootNodes.length} root nodes`);
    console.log('Root nodes:', rootNodes.map(n => `${n.user.cn || n.user.uid} (${n.user.subordinateCount} subordinates, depth ${n.user.hierarchyDepth})`));
    
    setHierarchyTree(finalTree);
  };

  const handleNodeToggle = (userId) => {
    console.log(`handleNodeToggle called for: ${userId}`);
    console.log('Current expandedNodes before toggle:', Array.from(expandedNodes));
    
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      const wasExpanded = newSet.has(userId);
      
      if (wasExpanded) {
        newSet.delete(userId);
        console.log(`Collapsing node: ${userId}`);
      } else {
        newSet.add(userId);
        console.log(`Expanding node: ${userId}`);
      }
      
      console.log('New expandedNodes after toggle:', Array.from(newSet));
      return newSet;
    });
  };

  const handleExpandAll = () => {
    const allUserIds = new Set(users.map((user) => user.uid));
    setExpandedNodes(allUserIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);

    // Find the dragged user
    const user = users.find((u) => u.uid === active.id);
    setDraggedUser(user);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveId(null);
    setDraggedUser(null);

    if (!over || active.id === over.id) {
      return;
    }

    try {
      const draggedUserId = active.id;
      const draggedUser = users.find((u) => u.uid === draggedUserId);

      if (!draggedUser) {
        toast.error("Invalid drag operation - user not found");
        return;
      }

      // Check if dropping to TOP_LEVEL
      if (over.id === 'TOP_LEVEL') {
        // Move to top level (remove manager and update DN)
        const loadingToast = toast.loading("Moving user to top level...");
        
        try {
          // Use the moveToTopLevel API
          const result = await userAPI.moveToTopLevel(draggedUserId);
          
          toast.dismiss(loadingToast);
          
          // Show reloading toast
          const reloadingToast = toast.loading("Refreshing hierarchy view...");
          
          // Force clear current state first
          setUsers([]);
          setHierarchyTree([]);
          
          // Reload hierarchy data first
          await loadHierarchyData();
          
          toast.dismiss(reloadingToast);
          
          toast.success(
            `Successfully moved ${draggedUserId} to top level. DN: ${result.changes.oldDn} → ${result.changes.newDn}. Updated ${result.changes.descendantsUpdated} descendants, ${result.changes.updatedGroups} groups, and ${result.changes.updatedUsers} user references.`,
            { duration: 8000 }
          );
        } catch (error) {
          console.error("Error moving to top level:", error);
          toast.dismiss(loadingToast);
          toast.error(`Failed to move to top level: ${error.response?.data?.message || error.message || 'Unknown error'}`);
        }
        return;
      }

      // Regular hierarchy move
      const targetUserId = over.id;
      const targetUser = users.find((u) => u.uid === targetUserId);

      if (!targetUser) {
        toast.error("Invalid drag operation - target user not found");
        return;
      }

      // Show loading state for hierarchy move
      const loadingToast = toast.loading("Updating hierarchy, DN, users, and group memberships...");

      // Prevent self-assignment and circular relationships
      if (isCircularRelationship(draggedUserId, targetUserId)) {
        toast.dismiss(loadingToast);
        
        if (draggedUserId === targetUserId) {
          toast.error("Cannot assign user as their own manager");
        } else {
          // Get all subordinates (direct and indirect) of the dragged user
          const allSubordinates = getAllSubordinates(draggedUserId);
          const targetUserName = targetUser.cn || targetUserId;
          const draggedUserName = draggedUser.cn || draggedUserId;
          
          // Check if target is a direct subordinate
          const directSubordinates = users.filter(user => {
            if (!user.manager || user.manager.length === 0) return false;
            const managers = Array.isArray(user.manager) ? user.manager : [user.manager];
            return managers.some(managerDn => {
              const match = managerDn.match(/uid=([^,]+)/);
              return match && match[1] === draggedUserId;
            });
          });
          
          const isDirectSubordinate = directSubordinates.some(sub => sub.uid === targetUserId);
          
          if (isDirectSubordinate) {
            // Direct subordinate - provide specific guidance
            const otherDirectSubordinates = directSubordinates
              .filter(sub => sub.uid !== targetUserId)
              .map(sub => sub.cn || sub.uid);
            
            let message = `Cannot move ${draggedUserName} under ${targetUserName}. ${targetUserName} is currently a direct subordinate of ${draggedUserName}.`;
            
            if (otherDirectSubordinates.length > 0) {
              message += ` Please move ${targetUserName} and any other subordinates (${otherDirectSubordinates.join(', ')}) to different managers first.`;
            } else {
              message += ` Please move ${targetUserName} to a different manager first.`;
            }
            
            toast.error(message, { duration: 8000 });
          } else {
            // Indirect subordinate - show the chain
            const subordinateNames = allSubordinates.map(sub => sub.cn || sub.uid);
            toast.error(
              `Cannot move ${draggedUserName} under ${targetUserName}. This would create a circular reporting relationship. ${targetUserName} is in the reporting chain under ${draggedUserName}. Current subordinates: ${subordinateNames.join(', ')}.`,
              { duration: 8000 }
            );
          }
        }
        return;
      }

      console.log(`Processing comprehensive hierarchy update: ${draggedUser.cn} -> ${targetUser.cn}`);

      // Use the batch update endpoint to reorganize hierarchy and update all references
      const result = await userAPI.batchUpdateHierarchy(draggedUserId, targetUserId);
      
      console.log('Hierarchy update result:', result);

      toast.dismiss(loadingToast);
      
      // Show reloading toast
      const reloadingToast = toast.loading("Refreshing hierarchy view...");
      
      // Force clear current state first
      setUsers([]);
      setHierarchyTree([]);
      
      // Reload hierarchy data to reflect all changes first
      await loadHierarchyData();
      
      toast.dismiss(reloadingToast);
      
      toast.success(
        `Successfully moved`,
        { duration: 8000 }
      );

    } catch (error) {
      console.error("Error updating hierarchy:", error);
      toast.error(`Failed to update hierarchy: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  const isCircularRelationship = (draggedUserId, targetUserId) => {
    // Only prevent direct self-assignment (A -> A)
    if (draggedUserId === targetUserId) {
      console.log(`Preventing self-assignment: ${draggedUserId} -> ${targetUserId}`);
      return true;
    }

    // Check if target user is a direct or indirect subordinate of dragged user
    const isSubordinate = (managerId, subordinateId, visited = new Set()) => {
      if (visited.has(subordinateId)) return false; // Prevent infinite loops
      visited.add(subordinateId);

      // Find subordinate user
      const subordinate = users.find(u => u.uid === subordinateId);
      if (!subordinate || !subordinate.manager || subordinate.manager.length === 0) {
        return false;
      }

      // Check managers of the subordinate
      const managers = Array.isArray(subordinate.manager) ? subordinate.manager : [subordinate.manager];
      
      for (const managerDn of managers) {
        // Extract manager UID from DN
        const match = managerDn.match(/uid=([^,]+)/);
        const managerUid = match ? match[1] : null;
        
        if (managerUid === managerId) {
          return true; // Direct subordinate
        }
        
        // Check recursively for indirect subordinates
        if (managerUid && isSubordinate(managerId, managerUid, visited)) {
          return true;
        }
      }
      
      return false;
    };

    if (isSubordinate(draggedUserId, targetUserId)) {
      console.log(`Preventing circular relationship: ${draggedUserId} -> ${targetUserId} (target is subordinate of dragged user)`);
      return true;
    }

    return false;
  };

  // Helper function to get all subordinates (direct and indirect) of a user
  const getAllSubordinates = (managerId, visited = new Set()) => {
    if (visited.has(managerId)) return []; // Prevent infinite loops
    visited.add(managerId);

    const directSubordinates = users.filter(user => {
      if (!user.manager || user.manager.length === 0) return false;
      const managers = Array.isArray(user.manager) ? user.manager : [user.manager];
      return managers.some(managerDn => {
        const match = managerDn.match(/uid=([^,]+)/);
        return match && match[1] === managerId;
      });
    });

    let allSubordinates = [...directSubordinates];
    
    // Recursively get subordinates of each direct subordinate
    directSubordinates.forEach(subordinate => {
      const indirectSubordinates = getAllSubordinates(subordinate.uid, new Set(visited));
      allSubordinates = [...allSubordinates, ...indirectSubordinates];
    });

    return allSubordinates;
  };

  const handleAddSubordinate = (manager) => {
    setSelectedUser(null);
    setFormMode("create");
    setShowUserForm(true);
    // TODO: Pre-fill manager in form
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormMode("edit");
    setShowUserForm(true);
  };

  const handleRemoveManager = async (user) => {
    try {
      if (!user.manager || user.manager.length === 0) {
        toast.error("User has no manager to remove");
        return;
      }

      // Update user with empty manager array using PUT endpoint
      const updateData = {
        manager: []
      };

      await userAPI.updateUser(user.uid, updateData, 'uid');

      toast.success(`Removed manager relationship for ${user.cn || user.uid}`);
      
      // Force clear current state first
      setUsers([]);
      setHierarchyTree([]);
      
      // Reload hierarchy data and rebuild tree
      await loadHierarchyData();
    } catch (error) {
      console.error("Error removing manager:", error);
      toast.error("Failed to remove manager relationship");
    }
  };

  const handleUserSaved = async () => {
    // Force clear current state first
    setUsers([]);
    setHierarchyTree([]);
    
    // Reload hierarchy data and rebuild tree after user save
    await loadHierarchyData();
  };

  // Get unique departments for filter
  const departments = [
    ...new Set(
      users.filter((user) => user.department).map((user) => user.department)
    ),
  ];

  // Statistics
  const stats = {
    totalUsers: users.length,
    topLevel: users.filter((user) => !user.manager || user.manager.length === 0).length,
    managers: users.filter((user) =>
      users.some(
        (u) =>
          u.manager &&
          (Array.isArray(u.manager) ? u.manager : [u.manager]).some(
            (managerDn) => managerDn.includes(`uid=${user.uid}`)
          )
      )
    ).length,
    employees: users.filter((user) => {
      const hasSubordinates = users.some(
        (u) =>
          u.manager &&
          (Array.isArray(u.manager) ? u.manager : [u.manager]).some(
            (managerDn) => managerDn.includes(`uid=${user.uid}`)
          )
      );
      return !hasSubordinates && user.manager && user.manager.length > 0;
    }).length,
    maxDepth: calculateMaxDepth(),
    organizationLeaders: users.filter(user => 
      (!user.manager || user.manager.length === 0) && 
      users.some(u => u.manager && (Array.isArray(u.manager) ? u.manager : [u.manager]).some(managerDn => managerDn.includes(`uid=${user.uid}`)))
    ).length,
    independentRoles: users.filter(user => 
      (!user.manager || user.manager.length === 0) && 
      !users.some(u => u.manager && (Array.isArray(u.manager) ? u.manager : [u.manager]).some(managerDn => managerDn.includes(`uid=${user.uid}`)))
    ).length,
  };

  function calculateMaxDepth() {
    let maxDepth = 0;

    // Helper function to extract UID from DN
    const extractUidFromDn = (dn) => {
      if (!dn) return null;
      const match = dn.match(/uid=([^,]+)/);
      return match ? match[1] : null;
    };

    const calculateDepth = (userId, visited = new Set(), currentDepth = 0) => {
      if (visited.has(userId)) return currentDepth; // Prevent infinite loops
      visited.add(userId);

      // Find all users who report directly to this user (subordinates)
      const subordinates = users.filter((user) => {
        if (!user.manager) return false;
        
        const managers = Array.isArray(user.manager) ? user.manager : [user.manager];
        return managers.some((managerDn) => {
          const managerUid = extractUidFromDn(managerDn);
          return managerUid === userId;
        });
      });

      if (subordinates.length === 0) {
        return currentDepth;
      }

      let deepestSubordinate = currentDepth;
      subordinates.forEach((subordinate) => {
        const depth = calculateDepth(
          subordinate.uid,
          new Set(visited), // Create new visited set for each branch
          currentDepth + 1
        );
        deepestSubordinate = Math.max(deepestSubordinate, depth);
      });

      return deepestSubordinate;
    };

    // Calculate depth starting from top-level users (users with no manager)
    const topLevelUsers = users.filter((user) => !user.manager || user.manager.length === 0);
    
    console.log(`Calculating max depth from ${topLevelUsers.length} top-level users...`);
    
    topLevelUsers.forEach((user) => {
      const depth = calculateDepth(user.uid);
      maxDepth = Math.max(maxDepth, depth);
      console.log(`User ${user.cn || user.uid} has depth: ${depth}`);
    });

    console.log(`Maximum hierarchy depth: ${maxDepth}`);
    return maxDepth;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Organization Hierarchy
          </h1>
          <p className="text-gray-600">
            Drag and drop to reorganize reporting structure
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCollapseAll}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-4 h-4 mr-2" />
            Collapse All
          </button>

          <button
            onClick={handleExpandAll}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            Expand All
          </button>

          <button
            onClick={loadHierarchyData}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold text-gray-900">
                {stats.totalUsers}
              </h3>
              <p className="text-xs text-gray-600">Total Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Crown className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold text-gray-900">
                {stats.organizationLeaders}
              </h3>
              <p className="text-xs text-gray-600">Organization Leaders</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-orange-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold text-gray-900">
                {stats.independentRoles}
              </h3>
              <p className="text-xs text-gray-600">Independent Roles</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-green-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold text-gray-900">
                {stats.managers}
              </h3>
              <p className="text-xs text-gray-600">Have Subordinates</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold text-gray-900">
                {stats.employees}
              </h3>
              <p className="text-xs text-gray-600">Individual Contributors</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-purple-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold text-gray-900">
                {stats.maxDepth}
              </h3>
              <p className="text-xs text-gray-600">Max Hierarchy Depth</p>
            </div>
          </div>
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
                placeholder="Search users by name, email, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {hierarchyTree.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hierarchy data
            </h3>
            <p className="text-gray-600">
              {users.length === 0
                ? "No users found in the system"
                : "No users match your current filters"}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Top Level Drop Zone */}
            <TopLevelDropZone activeId={activeId} />
            
            <div className="space-y-4">
              {hierarchyTree.map((node) => (
                <HierarchyNode
                  key={node.user.uid}
                  user={node.user}
                  depth={0}
                  isExpanded={node.isExpanded}
                  onToggle={handleNodeToggle}
                  onAddSubordinate={handleAddSubordinate}
                  onEditUser={handleEditUser}
                  onRemoveManager={handleRemoveManager}
                  children={node.children}
                />
              ))}
            </div>

            <DragOverlay>
              {activeId && draggedUser ? (
                <div className="bg-white border-2 border-primary-500 rounded-lg p-3 shadow-lg max-w-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {draggedUser.cn || draggedUser.uid}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {draggedUser.title || "No title"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* User Form Modal */}
      <UserForm
        user={selectedUser}
        isOpen={showUserForm}
        onClose={() => setShowUserForm(false)}
        onSave={handleUserSaved}
        mode={formMode}
      />
    </div>
  );
};

export default Hierarchy;