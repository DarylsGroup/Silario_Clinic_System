// src/pages/admin/UserManagement.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FiUsers, FiUserPlus, FiEdit, FiSearch, 
  FiRefreshCw, FiCheck, FiX, FiEye, 
  FiLock, FiUserX, FiUserCheck, FiAlertTriangle,
  FiMail
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const UserManagement = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDisablingUser, setIsDisablingUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'patient',
    phone: '',
    address: '',
    password: '',
  });

  // Fetch all users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on active tab and search query
  useEffect(() => {
    filterUsers();
  }, [activeTab, searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get all profiles with disabled status
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Process profiles data and keep the disabled status if it exists
      const processedUsers = profilesData.map(profile => ({
        ...profile,
        // If disabled property exists in database, use it, otherwise default to false
        disabled: profile.disabled === true
      }));
      
      setUsers(processedUsers || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    // Filter by role (tab)
    if (activeTab !== 'all') {
      filtered = filtered.filter(user => user.role === activeTab);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.includes(query))
      );
    }
    
    setFilteredUsers(filtered);
  };

  const handleAddUser = async () => {
    // Validate form data
    if (!formData.email || !formData.full_name || !formData.role || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Check if user already exists to avoid duplicates
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email);
      
      if (checkError) throw checkError;
      
      if (existingUsers && existingUsers.length > 0) {
        toast.error('A user with this email already exists');
        return;
      }
      
      // Create user with Supabase signup (avoid using admin API)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role
          }
        }
      });
      
      if (authError) throw authError;
      
      // Create or update profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone || null,
          address: formData.address || null,
          disabled: false
        });
      
      if (profileError) throw profileError;
      
      toast.success('User created successfully. A confirmation email has been sent.');
      setIsAddingUser(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !formData.full_name || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Update the profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone || null,
          address: formData.address || null
        })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      toast.success('User updated successfully');
      setIsEditingUser(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(`Failed to update user: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableUser = async () => {
    if (!selectedUser) return;
    
    setIsProcessing(true);
    
    try {
      // Check if the disabled column exists in profiles table
      const { data: checkData, error: checkError } = await supabase
        .from('profiles')
        .select('disabled')
        .eq('id', selectedUser.id)
        .limit(1);
      
      // Handle case where column doesn't exist
      if (checkError && checkError.code === 'PGRST116') {
        const sqlCommand = "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE;";
        
        toast.error('The "disabled" column is missing from profiles table. Database update required.');
        
        // Show SQL command to run
        alert(
          "Database Schema Update Required:\n\n" +
          "Please run the following SQL in your Supabase SQL Editor:\n\n" +
          sqlCommand +
          "\n\nAfter running this SQL command, refresh this page and try again."
        );
        
        return;
      }
      
      // Update the user's disabled status
      const { error } = await supabase
        .from('profiles')
        .update({
          disabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      toast.success(`${selectedUser.full_name} has been disabled successfully`);
      setIsDisablingUser(false);
      
      // Update the user in the local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === selectedUser.id ? {...u, disabled: true} : u
        )
      );
    } catch (error) {
      console.error('Error disabling user:', error);
      toast.error(`Failed to disable user: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnableUser = async (userId) => {
    setIsProcessing(true);
    
    try {
      // First find user details for the success message
      const user = users.find(u => u.id === userId);
      
      // Update the user status in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          disabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Failed to enable user. The "disabled" column needs to be added to the profiles table.');
          return;
        } else {
          throw error;
        }
      }
      
      toast.success(`${user?.full_name || 'User'} has been enabled successfully`);
      
      // Update the user locally without refetching
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId ? {...u, disabled: false} : u
        )
      );
    } catch (error) {
      console.error('Error enabling user:', error);
      toast.error(`Failed to enable user: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Updated to use password reset email instead of direct password change
  const handleResetPassword = async () => {
    if (!selectedUser || !selectedUser.email) {
      toast.error('User email is required');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Use the password reset email flow instead of direct reset
      const { error } = await supabase.auth.resetPasswordForEmail(
        selectedUser.email,
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );
      
      if (error) throw error;
      
      toast.success(`Password reset email sent to ${selectedUser.email}`);
      setIsResettingPassword(false);
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error(`Failed to send password reset: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: 'patient',
      phone: '',
      address: '',
      password: '',
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                resetForm();
                setIsAddingUser(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <div className="flex items-center">
                <FiUserPlus className="mr-2" />
                <span>Add New User</span>
              </div>
            </button>
            <button
              onClick={fetchUsers}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-gray-500"
              title="Refresh"
            >
              <FiRefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* User Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 font-medium text-sm rounded-md mr-2 ${
                activeTab === 'all'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => setActiveTab('doctor')}
              className={`px-4 py-2 font-medium text-sm rounded-md mr-2 ${
                activeTab === 'doctor'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Doctors
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 font-medium text-sm rounded-md mr-2 ${
                activeTab === 'staff'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => setActiveTab('patient')}
              className={`px-4 py-2 font-medium text-sm rounded-md mr-2 ${
                activeTab === 'patient'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Patients
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 font-medium text-sm rounded-md ${
                activeTab === 'admin'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Admins
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="bg-white overflow-hidden border border-gray-200 rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {activeTab === 'all' ? 'All Users' : 
                 activeTab === 'doctor' ? 'Doctors' :
                 activeTab === 'staff' ? 'Staff' :
                 activeTab === 'patient' ? 'Patients' : 'Admins'}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {filteredUsers.length} users found
              </p>
            </div>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">No users found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                            <span className="font-medium text-lg">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-sm text-gray-500">{user.phone || 'No phone'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${user.role === 'doctor' ? 'bg-blue-100 text-blue-800' : 
                            user.role === 'staff' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          !user.disabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {!user.disabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsViewingDetails(true);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                            title="View Details"
                          >
                            <FiEye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setFormData({
                                ...formData,
                                full_name: user.full_name,
                                role: user.role,
                                phone: user.phone || '',
                                address: user.address || '',
                              });
                              setIsEditingUser(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit User"
                          >
                            <FiEdit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsResettingPassword(true);
                            }}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Reset Password"
                          >
                            <FiLock className="h-5 w-5" />
                          </button>
                          {!user.disabled ? (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDisablingUser(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Disable User"
                              disabled={isProcessing}
                            >
                              <FiUserX className="h-5 w-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnableUser(user.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Enable User"
                              disabled={isProcessing}
                            >
                              <FiUserCheck className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Add New User</h2>
              <button 
                onClick={() => setIsAddingUser(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsAddingUser(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-400"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Adding...
                  </div>
                ) : (
                  'Add User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditingUser && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Edit User</h2>
              <button 
                onClick={() => setIsEditingUser(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>
              
              <div>
                <label htmlFor="edit_full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="edit_full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="edit_role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="edit_role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="edit_phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="edit_phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label htmlFor="edit_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  id="edit_address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <p className="text-sm text-gray-600">
                  Status: <span className={`font-medium ${!selectedUser.disabled ? 'text-green-600' : 'text-red-600'}`}>
                    {!selectedUser.disabled ? 'Active' : 'Disabled'}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Account status can be changed from the user list page
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsEditingUser(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-400"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Update User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {isViewingDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
              <button 
                onClick={() => setIsViewingDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-16 w-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                  <span className="font-medium text-2xl">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{selectedUser.full_name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedUser.role === 'doctor' ? 'bg-blue-100 text-blue-800' : 
                    selectedUser.role === 'staff' ? 'bg-purple-100 text-purple-800' :
                    selectedUser.role === 'admin' ? 'bg-red-100 text-red-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Email Address</span>
                    <span className="block text-sm text-gray-900 mt-1">{selectedUser.email}</span>
                  </div>
                  
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Phone</span>
                    <span className="block text-sm text-gray-900 mt-1">{selectedUser.phone || 'Not provided'}</span>
                  </div>
                  
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Address</span>
                    <span className="block text-sm text-gray-900 mt-1">{selectedUser.address || 'Not provided'}</span>
                  </div>
                  
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      !selectedUser.disabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {!selectedUser.disabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Created At</span>
                    <span className="block text-sm text-gray-900 mt-1">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'Unknown'}
                    </span>
                  </div>
                  
                  {selectedUser.role === 'doctor' && (
                    <div>
                      <span className="block text-sm font-medium text-gray-700">Specialty</span>
                      <span className="block text-sm text-gray-900 mt-1">
                        {selectedUser.specialty || 'Not specified'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedUser.role === 'patient' && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Medical Information</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <span className="block text-sm font-medium text-gray-700">Allergies</span>
                      <span className="block text-sm text-gray-900 mt-1">{selectedUser.allergies || 'None reported'}</span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-700">Medical Conditions</span>
                      <span className="block text-sm text-gray-900 mt-1">{selectedUser.medical_conditions || 'None reported'}</span>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-700">Medications</span>
                      <span className="block text-sm text-gray-900 mt-1">{selectedUser.medications || 'None reported'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsViewingDetails(false);
                  setFormData({
                    ...formData,
                    full_name: selectedUser.full_name,
                    role: selectedUser.role,
                    phone: selectedUser.phone || '',
                    address: selectedUser.address || '',
                  });
                  setIsEditingUser(true);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
              >
                <FiEdit className="mr-2" />
                Edit User
              </button>
              <button
                onClick={() => setIsViewingDetails(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResettingPassword && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Reset Password</h2>
              <button 
                onClick={() => setIsResettingPassword(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div>
              <p className="text-gray-600 mb-4">
                You are about to send a password reset email to <span className="font-semibold">{selectedUser.full_name}</span>.
              </p>
              
              <div className="p-4 bg-blue-50 rounded-md border border-blue-100 mb-4 flex items-start">
                <FiMail className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800">
                    A password reset link will be sent to:
                  </p>
                  <p className="text-sm font-medium mt-1">{selectedUser.email}</p>
                  <p className="text-sm text-blue-600 mt-2">
                    Note: The user will need to click the link in the email to set a new password.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsResettingPassword(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-400"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable User Confirmation Modal */}
      {isDisablingUser && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Disable User</h2>
              <button 
                onClick={() => setIsDisablingUser(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div>
              <p className="text-gray-600 mb-4">
                Are you sure you want to disable <span className="font-semibold">{selectedUser.full_name}</span>? 
                This will prevent them from logging into their account.
              </p>
              
              <div className="p-3 bg-red-50 rounded-md border border-red-100 mb-4">
                <p className="text-sm text-red-800">
                  <FiAlertTriangle className="h-4 w-4 text-red-600 inline-block mr-1" />
                  Disabled users will not be able to log in or access the system. 
                  You can restore access later by enabling their account again.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDisablingUser(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleDisableUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-400"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Disabling...
                  </div>
                ) : (
                  'Disable User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;