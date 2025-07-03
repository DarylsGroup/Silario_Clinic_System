// src/pages/staff/Settings.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { FiUser, FiLock, FiCheck, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Settings = () => {
  const { user } = useAuth();  // Remove setUser from here
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Form errors
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Success messages
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Add state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // First get the user's email from auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          throw new Error('User not authenticated');
        }
        
        // Then get the profile data
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        // Set the form data with fallbacks for missing values
        setProfileForm({
          full_name: data?.full_name || '',
          email: authUser?.email || '',
          phone: data?.phone || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  // Handle profile form input changes
  const handleProfileInputChange = (e) => {
    const { id, value } = e.target;
    setProfileForm(prevForm => ({
      ...prevForm,
      [id]: value
    }));
    
    // Clear error for this field if it exists
    if (profileErrors[id]) {
      setProfileErrors(prevErrors => ({
        ...prevErrors,
        [id]: ''
      }));
    }
    
    // Clear success message when user starts editing
    setProfileSuccess('');
  };
  
  // Handle password form input changes
  const handlePasswordInputChange = (e) => {
    const { id, value } = e.target;
    setPasswordForm(prevForm => ({
      ...prevForm,
      [id]: value
    }));
    
    // Clear error for this field if it exists
    if (passwordErrors[id]) {
      setPasswordErrors(prevErrors => ({
        ...prevErrors,
        [id]: ''
      }));
    }
    
    // Clear success message when user starts editing
    setPasswordSuccess('');
  };
  
  // Validate profile form
  const validateProfileForm = () => {
    const errors = {};
    
    if (!profileForm.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    if (!profileForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileForm.email)) {
      errors.email = 'Email is invalid';
    }
    
    // Phone is optional, but if provided, validate basic format
    if (profileForm.phone && profileForm.phone.trim() !== '') {
      // Simple validation - allow different formats but must have at least 7 digits
      const digitsOnly = profileForm.phone.replace(/\D/g, '');
      if (digitsOnly.length < 7) {
        errors.phone = 'Phone number must have at least 7 digits';
      }
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle profile save
  const handleSaveProfile = async () => {
    // Clear previous success message
    setProfileSuccess('');
    
    // Validate form
    if (!validateProfileForm()) return;
    
    setIsSaving(true);
    try {
      // Check if email has changed
      const isEmailChanged = user.email !== profileForm.email;
      
      // Update profile in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // If email has changed, update auth email
      if (isEmailChanged) {
        const { data, error: emailError } = await supabase.auth.updateUser({
          email: profileForm.email
        });
        
        if (emailError) throw emailError;
        
        toast.info('Verification email sent. Please check your inbox to confirm your new email.');
      }
      
      // Update local user state - removed the setUser call that was causing the error
      // No need to manually update the context here - it should refresh on next auth state change
      
      // Success message
      setProfileSuccess('Profile updated successfully!');
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle password change
  const handleChangePassword = async () => {
    // Clear previous success message
    setPasswordSuccess('');
    
    // Validate form
    if (!validatePasswordForm()) return;
    
    setIsChangingPassword(true);
    try {
      // Get the current user's session to verify the password
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Your session has expired. Please log in again.');
      }
      
      // Try to sign in with the current password to verify it's correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      });
      
      if (signInError) {
        setPasswordErrors({
          ...passwordErrors,
          currentPassword: 'Current password is incorrect'
        });
        throw new Error('Current password is incorrect');
      }
      
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      
      if (error) throw error;
      
      // Reset the form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Success message
      setPasswordSuccess('Password updated successfully!');
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      if (!error.message.includes('Current password is incorrect')) {
        toast.error(`Failed to change password: ${error.message}`);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h1>
        
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          {/* Tabs */}
          <div className="md:w-1/4 bg-gray-50 rounded-lg p-4">
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'profile' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiUser className="mr-3 h-5 w-5" />
                <span>My Profile</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('password')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'password' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiLock className="mr-3 h-5 w-5" />
                <span>Change Password</span>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="md:w-3/4 bg-white rounded-lg border border-gray-200 p-6">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
                <p className="text-sm text-gray-500 mb-4">Update your personal information.</p>
                
                {/* Success message */}
                {profileSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center text-green-700">
                    <FiCheck className="h-5 w-5 mr-2 text-green-500" />
                    <span>{profileSuccess}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input 
                      type="text" 
                      id="full_name" 
                      value={profileForm.full_name}
                      onChange={handleProfileInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        profileErrors.full_name 
                          ? 'border-red-300' 
                          : 'border-gray-300'
                      }`}
                      placeholder="Your full name"
                    />
                    {profileErrors.full_name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {profileErrors.full_name}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      value={profileForm.email}
                      onChange={handleProfileInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        profileErrors.email 
                          ? 'border-red-300' 
                          : 'border-gray-300'
                      }`}
                      placeholder="your.email@example.com"
                    />
                    {profileErrors.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {profileErrors.email}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Note: Changing your email will require verification.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      value={profileForm.phone}
                      onChange={handleProfileInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        profileErrors.phone 
                          ? 'border-red-300' 
                          : 'border-gray-300'
                      }`}
                      placeholder="+63 912 345 6789"
                    />
                    {profileErrors.phone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {profileErrors.phone}
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'password' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Change Password</h2>
                <p className="text-sm text-gray-500 mb-4">Update your account password.</p>
                
                {/* Success message */}
                {passwordSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center text-green-700">
                    <FiCheck className="h-5 w-5 mr-2 text-green-500" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        id="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordInputChange}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {passwordErrors.currentPassword}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordInputChange}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {passwordErrors.newPassword}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 8 characters long.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordInputChange}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <FiAlertCircle className="h-4 w-4 mr-1" />
                        {passwordErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;