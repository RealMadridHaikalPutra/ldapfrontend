import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, User, Mail, Lock, Building, Phone, MapPin } from 'lucide-react';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const UserForm = ({ user, isOpen, onClose, onSave, mode = 'create' }) => {
  const [formData, setFormData] = useState({
    uid: '',
    cn: '',
    sn: '',
    givenName: '',
    mail: '',
    userPassword: '',
    confirmPassword: '',
    telephoneNumber: '',
    title: '',
    department: '',
    description: '',
    postalAddress: '',
    manager: []
  });
  
  const [availableManagers, setAvailableManagers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadAvailableManagers();
      
      if (mode === 'edit' && user) {
        // Extract manager UIDs from DNs for form display
        let managerUids = [];
        if (user.manager) {
          const managers = Array.isArray(user.manager) ? user.manager : [user.manager];
          managerUids = managers.map(managerDn => {
            // Extract UID from DN format: uid=username,ou=users,dc=...
            const match = managerDn.match(/uid=([^,]+)/);
            return match ? match[1] : managerDn;
          }).filter(Boolean);
        }

        setFormData({
          uid: user.uid || '',
          cn: user.cn || '',
          sn: user.sn || '',
          givenName: user.givenName || '',
          mail: user.mail || '',
          userPassword: '',
          confirmPassword: '',
          telephoneNumber: user.telephoneNumber || '',
          title: user.title || '',
          department: user.department || '',
          description: user.description || '',
          postalAddress: user.postalAddress || '',
          manager: managerUids
        });
      } else {
        // Reset form for create mode
        setFormData({
          uid: '',
          cn: '',
          sn: '',
          givenName: '',
          mail: '',
          userPassword: '',
          confirmPassword: '',
          telephoneNumber: '',
          title: '',
          department: '',
          description: '',
          postalAddress: '',
          manager: []
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, user]);

  const loadAvailableManagers = async () => {
    try {
      const users = await userAPI.getUsers();
      // Filter out current user if editing
      const managers = users.filter(u => mode === 'create' || u.uid !== user?.uid);
      setAvailableManagers(managers);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.uid) newErrors.uid = 'UID is required';
    if (!formData.cn) newErrors.cn = 'Common Name is required';
    if (!formData.sn) newErrors.sn = 'Surname is required';
    if (!formData.givenName) newErrors.givenName = 'Given Name is required';
    if (!formData.mail) newErrors.mail = 'Email is required';
    
    // Password validation for create mode or when password is provided
    if (mode === 'create' || formData.userPassword) {
      if (!formData.userPassword) {
        newErrors.userPassword = 'Password is required';
      } else if (formData.userPassword.length < 6) {
        newErrors.userPassword = 'Password must be at least 6 characters';
      }
      
      if (formData.userPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.mail && !emailRegex.test(formData.mail)) {
      newErrors.mail = 'Invalid email format';
    }

    // UID format validation (no spaces, special characters)
    const uidRegex = /^[a-zA-Z0-9._-]+$/;
    if (formData.uid && !uidRegex.test(formData.uid)) {
      newErrors.uid = 'UID can only contain letters, numbers, dots, hyphens, and underscores';
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
      // Convert manager UIDs to DNs for backend
      const managerDNs = formData.manager.map(managerUid => {
        return `uid=${managerUid},ou=users,dc=mirorim,dc=ddns,dc=net`;
      });

      const userData = {
        uid: formData.uid,
        cn: formData.cn,
        sn: formData.sn,
        givenName: formData.givenName,
        mail: formData.mail,
        manager: managerDNs
      };

      // Only include optional attributes if they have values
      if (formData.telephoneNumber?.trim()) {
        userData.telephoneNumber = formData.telephoneNumber;
      }
      if (formData.title?.trim()) {
        userData.title = formData.title;
      }
      if (formData.department?.trim()) {
        userData.department = formData.department;
      }
      if (formData.description?.trim()) {
        userData.description = formData.description;
      }
      if (formData.postalAddress?.trim()) {
        userData.postalAddress = formData.postalAddress;
      }

      // Only include password if provided
      if (formData.userPassword) {
        userData.userPassword = formData.userPassword;
      }

      let result;
      if (mode === 'create') {
        result = await userAPI.createUser(userData);
        toast.success('User created successfully');
      } else {
        // For updates, prepare clean data
        const updateData = {
          cn: formData.cn,
          sn: formData.sn,
          givenName: formData.givenName,
          mail: formData.mail,
          manager: managerDNs
        };

        // Add password if provided
        if (formData.userPassword) {
          updateData.userPassword = formData.userPassword;
        }

        // Add optional attributes if they have values
        if (formData.telephoneNumber) updateData.telephoneNumber = formData.telephoneNumber;
        if (formData.title) updateData.title = formData.title;
        if (formData.department) updateData.department = formData.department;
        if (formData.description) updateData.description = formData.description;
        if (formData.postalAddress) updateData.postalAddress = formData.postalAddress;

        result = await userAPI.updateUser(user.uid, updateData, 'uid');
        toast.success('User updated successfully');
      }

      onSave(result);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      toast.error(`Failed to ${mode} user: ${errorMessage}`);
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

  const handleManagerChange = (managerUid, checked) => {
    setFormData(prev => ({
      ...prev,
      manager: checked 
        ? [...prev.manager, managerUid]
        : prev.manager.filter(m => m !== managerUid)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create New User' : 'Edit User'}
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
                <User className="w-5 h-5 mr-2" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UID (Username) *
                  </label>
                  <input
                    type="text"
                    value={formData.uid}
                    onChange={(e) => handleInputChange('uid', e.target.value)}
                    disabled={mode === 'edit'}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.uid ? 'border-red-500' : 'border-gray-300'
                    } ${mode === 'edit' ? 'bg-gray-100' : ''}`}
                    placeholder="e.g., jdoe"
                  />
                  {errors.uid && <p className="text-red-500 text-xs mt-1">{errors.uid}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Common Name (Display Name) *
                  </label>
                  <input
                    type="text"
                    value={formData.cn}
                    onChange={(e) => handleInputChange('cn', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.cn ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., John Doe"
                  />
                  {errors.cn && <p className="text-red-500 text-xs mt-1">{errors.cn}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.givenName}
                    onChange={(e) => handleInputChange('givenName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.givenName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., John"
                  />
                  {errors.givenName && <p className="text-red-500 text-xs mt-1">{errors.givenName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.sn}
                    onChange={(e) => handleInputChange('sn', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.sn ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Doe"
                  />
                  {errors.sn && <p className="text-red-500 text-xs mt-1">{errors.sn}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.mail}
                    onChange={(e) => handleInputChange('mail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.mail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., john.doe@company.com"
                  />
                  {errors.mail && <p className="text-red-500 text-xs mt-1">{errors.mail}</p>}
                </div>
              </div>
            </div>
            {/* Password Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Security
                {mode === 'edit' && (
                  <span className="ml-2 text-sm text-gray-500">(Leave blank to keep current password)</span>
                )}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {mode === 'create' && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.userPassword}
                      onChange={(e) => handleInputChange('userPassword', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        errors.userPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={mode === 'edit' ? 'Enter new password' : 'Enter password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {errors.userPassword && <p className="text-red-500 text-xs mt-1">{errors.userPassword}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password {mode === 'create' && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Managers */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Reporting Structure
              </h3>
              
              <div className="border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Managers
                </label>
                
                {availableManagers.length > 0 ? (
                  <div className="space-y-2">
                    {availableManagers.map((manager) => (
                      <label key={manager.uid} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.manager.includes(manager.uid)}
                          onChange={(e) => handleManagerChange(manager.uid, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          {manager.cn || manager.uid} ({manager.mail})
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No available managers</p>
                )}
              </div>
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
                mode === 'create' ? 'Create User' : 'Update User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;