// src/pages/admin/Settings.jsx
import React, { useState, useEffect } from 'react';
import { FiSettings, FiUser, FiLock, FiGlobe, FiAlertCircle, FiSave, FiCheck, FiCalendar, FiMapPin, FiEye, FiEyeOff } from 'react-icons/fi';
import { useClinic } from '../../contexts/ClinicContext';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Get clinic information from context
  const { clinicInfo, updateClinicInfo, loading: clinicLoading } = useClinic();
  
  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    birthday: '',
    age: '',
    gender: ''
  });

  // Security state
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Clinic state - Initialize from context
  const [clinicData, setClinicData] = useState(clinicInfo);
  
  // System state
  const [systemData, setSystemData] = useState({
    appointmentReminders: true,
    newPatients: true,
    systemUpdates: false,
    theme: 'light',
    language: 'en'
  });
  
  // Error states
  const [profileErrors, setProfileErrors] = useState({});
  const [securityErrors, setSecurityErrors] = useState({});
  const [clinicErrors, setClinicErrors] = useState({});

  // Add state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Update clinic data when clinicInfo changes
  useEffect(() => {
    if (!clinicLoading) {
      setClinicData(clinicInfo);
    }
  }, [clinicInfo, clinicLoading]);

  // Fetch user profile from API/database
  useEffect(() => {
    // Simulating API call to fetch user profile from database
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        // In a real application, you would fetch this from your API
        // For now, we're using the profile data from the SQL file
        const userData = {
          id: '2acd143e-0d73-4943-849e-835a854eacc4',
          email: 'admin@silario.com',
          fullName: 'Admin User', 
          phone: null,
          address: null,
          birthday: null,
          age: null,
          gender: null,
          role: 'admin'
        };
        
        setProfileData({
          fullName: userData.fullName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          birthday: userData.birthday || '',
          age: userData.age || '',
          gender: userData.gender || ''
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);

  // Handle profile input changes
  const handleProfileChange = (e) => {
    const { id, value } = e.target;
    setProfileData({
      ...profileData,
      [id]: value
    });
    
    // Clear error for this field if it exists
    if (profileErrors[id]) {
      setProfileErrors({
        ...profileErrors,
        [id]: ''
      });
    }
  };

  // Handle security input changes
  const handleSecurityChange = (e) => {
    const { id, value } = e.target;
    setSecurityData({
      ...securityData,
      [id]: value
    });
    
    // Clear error for this field if it exists
    if (securityErrors[id]) {
      setSecurityErrors({
        ...securityErrors,
        [id]: ''
      });
    }
  };
  
  // Handle clinic input changes
  const handleClinicChange = (e) => {
    const { id, value } = e.target;
    setClinicData({
      ...clinicData,
      [id]: value
    });
    
    // Clear error for this field if it exists
    if (clinicErrors[id]) {
      setClinicErrors({
        ...clinicErrors,
        [id]: ''
      });
    }
  };
  
  // Handle system input changes
  const handleSystemChange = (e) => {
    const { id, checked, value, type, name } = e.target;
    
    if (type === 'checkbox') {
      setSystemData({
        ...systemData,
        [id]: checked
      });
    } else if (type === 'radio') {
      setSystemData({
        ...systemData,
        [name]: value
      });
    } else {
      setSystemData({
        ...systemData,
        [id]: value
      });
    }
  };

  // Validate profile data
  const validateProfile = () => {
    const errors = {};
    
    if (!profileData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!profileData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (profileData.phone && !/^\+?[0-9]{10,15}$/.test(profileData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Phone number is invalid';
    }
    
    if (profileData.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(profileData.birthday)) {
      errors.birthday = 'Birthday must be in YYYY-MM-DD format';
    }
    
    if (profileData.age && (isNaN(profileData.age) || parseInt(profileData.age) < 0 || parseInt(profileData.age) > 120)) {
      errors.age = 'Please enter a valid age';
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate security data
  const validateSecurity = () => {
    const errors = {};
    
    if (!securityData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!securityData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (securityData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!securityData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (securityData.newPassword !== securityData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setSecurityErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Validate clinic data
  const validateClinic = () => {
    const errors = {};
    
    if (!clinicData.clinicName.trim()) {
      errors.clinicName = 'Clinic name is required';
    }
    
    if (clinicData.clinicEmail && !/\S+@\S+\.\S+/.test(clinicData.clinicEmail)) {
      errors.clinicEmail = 'Email is invalid';
    }
    
    setClinicErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile save
  const handleProfileSave = async () => {
    if (validateProfile()) {
      // Simulating API call to update profile
      setLoading(true);
      try {
        // In a real application, you would make an API call here
        // UPDATE "public"."profiles" SET full_name = ..., email = ..., etc. WHERE id = '2acd143e-0d73-4943-849e-835a854eacc4'
        console.log('Saving profile data:', profileData);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLoading(false);
        
        // Show success message
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('Error updating profile:', error);
        setLoading(false);
        setSuccessMessage('Failed to update profile. Please try again.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    }
  };

  // Handle security save
  const handleSecuritySave = async () => {
    if (validateSecurity()) {
      // Simulating API call to update password
      setLoading(true);
      try {
        // In a real application, you would make an API call here
        console.log('Updating password...');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reset form after successful update
        setSecurityData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setLoading(false);
        
        // Show success message
        setSuccessMessage('Password updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('Error updating password:', error);
        setLoading(false);
        setSuccessMessage('Failed to update password. Please try again.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    }
  };
  
  // Handle clinic save
  const handleClinicSave = async () => {
    if (validateClinic()) {
      // Simulating API call to update clinic information
      setLoading(true);
      try {
        // Update clinic information in the context
        const result = await updateClinicInfo(clinicData);
        
        if (result.success) {
          setLoading(false);
          
          // Show success message
          setSuccessMessage('Clinic information updated successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          throw new Error('Failed to update clinic information');
        }
      } catch (error) {
        console.error('Error updating clinic information:', error);
        setLoading(false);
        setSuccessMessage('Failed to update clinic information. Please try again.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    }
  };
  
  // Handle system save
  const handleSystemSave = async () => {
    // Simulating API call to update system settings
    setLoading(true);
    try {
      // In a real application, you would make an API call here
      console.log('Saving system settings:', systemData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoading(false);
      
      // Show success message
      setSuccessMessage('System settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating system settings:', error);
      setLoading(false);
      setSuccessMessage('Failed to update system settings. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Clear success message when changing tabs
  useEffect(() => {
    setSuccessMessage('');
    setProfileErrors({});
    setSecurityErrors({});
    setClinicErrors({});
  }, [activeTab]);
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
        
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiCheck className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {loading || clinicLoading ? (
          <div className="mb-4 p-4 bg-blue-50 rounded-md">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-3"></div>
              <p className="text-sm text-blue-700">Loading...</p>
            </div>
          </div>
        ) : null}
        
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
                <span>Profile Settings</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'security' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiLock className="mr-3 h-5 w-5" />
                <span>Security</span>
              </button>
              
            
            </div>
          </div>
          
          {/* Content */}
          <div className="md:w-3/4 bg-white rounded-lg border border-gray-200 p-6">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Settings</h2>
                <p className="text-sm text-gray-500 mb-4">Update your personal information.</p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input 
                      type="text" 
                      id="fullName" 
                      value={profileData.fullName}
                      onChange={handleProfileChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        profileErrors.fullName ? 'border-red-300' : ''
                      }`}
                      placeholder="Enter your full name"
                    />
                    {profileErrors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.fullName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        profileErrors.email ? 'border-red-300' : ''
                      }`}
                      placeholder="Enter your email"
                    />
                    {profileErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        profileErrors.phone ? 'border-red-300' : ''
                      }`}
                      placeholder="Enter your phone number"
                    />
                    {profileErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.phone}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                    <input 
                      type="text" 
                      id="address" 
                      value={profileData.address}
                      onChange={handleProfileChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        profileErrors.address ? 'border-red-300' : ''
                      }`}
                      placeholder="Enter your address"
                    />
                    {profileErrors.address && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.address}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">Birthday</label>
                    <div className="flex items-center">
                      <FiCalendar className="text-gray-400 mr-2" />
                      <input 
                        type="date" 
                        id="birthday" 
                        value={profileData.birthday}
                        onChange={handleProfileChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                          profileErrors.birthday ? 'border-red-300' : ''
                        }`}
                      />
                    </div>
                    {profileErrors.birthday && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.birthday}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                      <input 
                        type="number" 
                        id="age" 
                        value={profileData.age}
                        onChange={handleProfileChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                          profileErrors.age ? 'border-red-300' : ''
                        }`}
                        placeholder="Enter your age"
                      />
                      {profileErrors.age && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.age}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                      <select
                        id="gender"
                        value={profileData.gender}
                        onChange={handleProfileChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={handleProfileSave}
                      disabled={loading}
                      className={`inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                        loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h2>
                <p className="text-sm text-gray-500 mb-4">Manage your account security.</p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        id="currentPassword"
                        value={securityData.currentPassword}
                        onChange={handleSecurityChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${securityErrors.currentPassword ? 'border-red-300' : ''}`}
                        placeholder="********"
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
                    {securityErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{securityErrors.currentPassword}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="newPassword"
                        value={securityData.newPassword}
                        onChange={handleSecurityChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${securityErrors.newPassword ? 'border-red-300' : ''}`}
                        placeholder="********"
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
                    {securityErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{securityErrors.newPassword}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={securityData.confirmPassword}
                        onChange={handleSecurityChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${securityErrors.confirmPassword ? 'border-red-300' : ''}`}
                        placeholder="********"
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
                    {securityErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{securityErrors.confirmPassword}</p>
                    )}
                  </div>
                  
                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={handleSecuritySave}
                      disabled={loading}
                      className={`inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'}`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2 h-4 w-4" />
                          Update Password
                        </>
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