// src/pages/doctor/Settings.jsx
import React, { useState, useEffect } from 'react';
import { FiUser, FiLock, FiCalendar, FiBriefcase, FiSave } from 'react-icons/fi';
import supabase from '../../config/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    specialization: '',
    certificates: '',
    address: ''
  });
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Schedule state
  const [schedule, setSchedule] = useState({
    cabugao: {
      monday: { enabled: false, start: '08:00', end: '12:00' },
      tuesday: { enabled: false, start: '08:00', end: '12:00' },
      wednesday: { enabled: false, start: '08:00', end: '12:00' },
      thursday: { enabled: false, start: '08:00', end: '12:00' },
      friday: { enabled: false, start: '08:00', end: '12:00' },
      saturday: { enabled: false, start: '08:00', end: '17:00' },
      sunday: { enabled: false, start: '08:00', end: '17:00' },
    },
    sanjuan: {
      monday: { enabled: false, start: '13:00', end: '17:00' },
      tuesday: { enabled: false, start: '13:00', end: '17:00' },
      wednesday: { enabled: false, start: '13:00', end: '17:00' },
      thursday: { enabled: false, start: '13:00', end: '17:00' },
      friday: { enabled: false, start: '13:00', end: '17:00' },
      saturday: { enabled: false, start: '08:00', end: '17:00' },
      sunday: { enabled: false, start: '08:00', end: '17:00' },
    }
  });
  
  // Specialization state
  const [specialization, setSpecialization] = useState({
    primary: 'General Dentistry',
    procedures: {
      examination: false,
      filling: false,
      rootCanal: false,
      extraction: false,
      implants: false,
      orthodontic: false
    }
  });

  // Fetch doctor's data on component mount
  useEffect(() => {
    if (user) {
      fetchDoctorData();
    }
  }, [user]);

  // Load certificates from localStorage when showing profile tab
  useEffect(() => {
    if (activeTab === 'specialization' || activeTab === 'profile') {
      try {
        const certificates = localStorage.getItem(`doctor_certificates_${user?.id}`);
        if (certificates) {
          setProfile(prev => ({
            ...prev,
            certificates
          }));
        }
      } catch (e) {
        console.log('Could not load certificates from localStorage:', e);
      }
    }
  }, [activeTab, user]);

  const fetchDoctorData = async () => {
    setIsLoading(true);
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Set profile data
      setProfile({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        bio: profileData.notes || '',
        address: profileData.address || '',
        certificates: '',
        specialization: 'General Dentistry'
      });
      
      // Try to load specialization from localStorage
      try {
        const savedSpecialization = localStorage.getItem(`doctor_specialization_${user.id}`);
        if (savedSpecialization) {
          setSpecialization(prev => ({
            ...prev,
            primary: savedSpecialization
          }));
          
          setProfile(prev => ({
            ...prev,
            specialization: savedSpecialization
          }));
        }
      } catch (e) {
        console.log('Could not load specialization from localStorage:', e);
      }
      
      // Try to load schedule from localStorage
      try {
        const savedSchedule = localStorage.getItem(`doctor_schedule_${user.id}`);
        if (savedSchedule) {
          setSchedule(JSON.parse(savedSchedule));
        }
      } catch (e) {
        console.log('Could not load schedule from localStorage:', e);
      }

      // Try to load procedures from localStorage
      try {
        const savedProcedures = localStorage.getItem(`doctor_procedures_${user.id}`);
        if (savedProcedures) {
          const procedures = JSON.parse(savedProcedures);
          const proceduresState = {
            examination: procedures.includes('Dental Examination & Cleaning'),
            filling: procedures.includes('Filling & Restorations'),
            rootCanal: procedures.includes('Root Canal Treatment'),
            extraction: procedures.includes('Tooth Extraction'),
            implants: procedures.includes('Dental Implants'),
            orthodontic: procedures.includes('Orthodontic Treatment')
          };
          
          setSpecialization(prev => ({
            ...prev,
            procedures: proceduresState
          }));
        }
      } catch (e) {
        console.log('Could not load procedures from localStorage:', e);
      }

      // Try to load certificates from localStorage
      try {
        const certificates = localStorage.getItem(`doctor_certificates_${user.id}`);
        if (certificates) {
          setProfile(prev => ({
            ...prev,
            certificates
          }));
        }
      } catch (e) {
        console.log('Could not load certificates from localStorage:', e);
      }
      
    } catch (error) {
      console.error('Error fetching doctor data:', error);
      toast.error('Could not load your profile information');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile form input changes
  const handleProfileChange = (e) => {
    const { id, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle password form input changes
  const handlePasswordChange = (e) => {
    const { id, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Clear errors when typing
    if (passwordErrors[id]) {
      setPasswordErrors(prev => ({
        ...prev,
        [id]: null
      }));
    }
  };

  // Handle schedule changes
  const handleScheduleChange = (branch, day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [branch]: {
        ...prev[branch],
        [day]: {
          ...prev[branch][day],
          [field]: value
        }
      }
    }));
  };

  // Handle specialization changes
  const handleSpecializationChange = (field, value) => {
    if (field === 'primary') {
      setSpecialization(prev => ({
        ...prev,
        primary: value
      }));
    } else if (field.startsWith('proc')) {
      const procedure = field.replace('proc', '').toLowerCase();
      setSpecialization(prev => ({
        ...prev,
        procedures: {
          ...prev.procedures,
          [procedure]: value
        }
      }));
    }
  };

  // Save profile changes
  const saveProfile = async () => {
    setIsSaving(true);
    try {
      // Only update fields that definitely exist in the database
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          notes: profile.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Store certificates in localStorage
      localStorage.setItem(`doctor_certificates_${user.id}`, profile.certificates);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const changePassword = async () => {
    // Validate passwords
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    setIsSaving(true);
    try {
      // Supabase password change
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to update password: ' + error.message);
      
      if (error.message.includes('auth')) {
        setPasswordErrors({
          currentPassword: 'Current password may be incorrect'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Save schedule
  const saveSchedule = async () => {
    setIsSaving(true);
    try {
      // Store schedule in localStorage
      localStorage.setItem(`doctor_schedule_${user.id}`, JSON.stringify(schedule));
      
      toast.success('Working schedule saved successfully');
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Save specialization
  const saveSpecialization = async () => {
    setIsSaving(true);
    try {
      // Convert procedures object to array of procedure names for display
      const proceduresList = Object.entries(specialization.procedures)
        .filter(([key, value]) => value)
        .map(([key]) => {
          switch(key) {
            case 'examination': return 'Dental Examination & Cleaning';
            case 'filling': return 'Filling & Restorations';
            case 'rootCanal': return 'Root Canal Treatment';
            case 'extraction': return 'Tooth Extraction';
            case 'implants': return 'Dental Implants';
            case 'orthodontic': return 'Orthodontic Treatment';
            default: return '';
          }
        })
        .filter(name => name); // Remove empty strings
      
      // Store everything in localStorage instead of trying to update the database
      localStorage.setItem(`doctor_specialization_${user.id}`, specialization.primary);
      localStorage.setItem(`doctor_procedures_${user.id}`, JSON.stringify(proceduresList));
      localStorage.setItem(`doctor_certificates_${user.id}`, profile.certificates);
      
      toast.success('Specialization saved successfully');
    } catch (error) {
      console.error('Error saving specialization:', error);
      toast.error('Failed to save specialization: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate time options for select elements
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        const time = `${formattedHour}:${formattedMinute}`;
        const displayTime = new Date(`2000-01-01T${time}:00`).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        options.push(
          <option key={time} value={time}>{displayTime}</option>
        );
      }
    }
    return options;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
        
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
              
              <button 
                onClick={() => setActiveTab('schedule')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'schedule' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiCalendar className="mr-3 h-5 w-5" />
                <span>Working Schedule</span>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="md:w-3/4 bg-white rounded-lg border border-gray-200 p-6">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
                <p className="text-sm text-gray-500 mb-4">Update your personal information.</p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input 
                      type="text" 
                      id="full_name" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Dr. John Doe"
                      value={profile.full_name}
                      onChange={handleProfileChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="doctor@silariodental.com"
                      value={profile.email}
                      disabled
                      onChange={handleProfileChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed as it's used for login.</p>
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="+63 912 345 6789"
                      value={profile.phone}
                      onChange={handleProfileChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                    <input 
                      type="text" 
                      id="address" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Your address"
                      value={profile.address}
                      onChange={handleProfileChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio / Professional Summary</label>
                    <textarea 
                      id="bio" 
                      rows="4" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Brief description of your professional background, expertise, and qualifications..."
                      value={profile.bio}
                      onChange={handleProfileChange}
                    ></textarea>
                  </div>

                  <div>
                    <label htmlFor="certificates" className="block text-sm font-medium text-gray-700">Certificates & Credentials</label>
                    <textarea 
                      id="certificates" 
                      rows="3" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="List your professional certifications..."
                      value={profile.certificates}
                      onChange={handleProfileChange}
                    ></textarea>
                  </div>
                  
                  <div className="pt-5">
                    <button
                      type="button"
                      className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                      onClick={saveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2 -ml-1 h-5 w-5" />
                          Save Changes
                        </>
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
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
                    <input 
                      type="password" 
                      id="currentPassword" 
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        passwordErrors.currentPassword ? 'border-red-300' : ''
                      }`}
                      placeholder="********"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                    <input 
                      type="password" 
                      id="newPassword" 
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        passwordErrors.newPassword ? 'border-red-300' : ''
                      }`}
                      placeholder="********"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                    />
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input 
                      type="password" 
                      id="confirmPassword" 
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                        passwordErrors.confirmPassword ? 'border-red-300' : ''
                      }`}
                      placeholder="********"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                  
                  <div className="pt-5">
                    <button
                      type="button"
                      className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                      onClick={changePassword}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : (
                        <>
                          <FiLock className="mr-2 -ml-1 h-5 w-5" />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'schedule' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Working Schedule</h2>
                <p className="text-sm text-gray-500 mb-4">Set your availability at both clinic branches.</p>
                
                <div className="space-y-6">
                  {/* Cabugao Branch Schedule */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Cabugao Branch</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Monday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="monday-cabugao" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.cabugao.monday.enabled}
                            onChange={(e) => handleScheduleChange('cabugao', 'monday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="monday-cabugao" className="ml-2 block text-sm text-gray-700">Monday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.monday.start}
                            onChange={(e) => handleScheduleChange('cabugao', 'monday', 'start', e.target.value)}
                            disabled={!schedule.cabugao.monday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.monday.end}
                            onChange={(e) => handleScheduleChange('cabugao', 'monday', 'end', e.target.value)}
                            disabled={!schedule.cabugao.monday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Tuesday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="tuesday-cabugao" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.cabugao.tuesday.enabled}
                            onChange={(e) => handleScheduleChange('cabugao', 'tuesday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="tuesday-cabugao" className="ml-2 block text-sm text-gray-700">Tuesday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.tuesday.start}
                            onChange={(e) => handleScheduleChange('cabugao', 'tuesday', 'start', e.target.value)}
                            disabled={!schedule.cabugao.tuesday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.tuesday.end}
                            onChange={(e) => handleScheduleChange('cabugao', 'tuesday', 'end', e.target.value)}
                            disabled={!schedule.cabugao.tuesday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Wednesday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="wednesday-cabugao" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.cabugao.wednesday.enabled}
                            onChange={(e) => handleScheduleChange('cabugao', 'wednesday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="wednesday-cabugao" className="ml-2 block text-sm text-gray-700">Wednesday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.wednesday.start}
                            onChange={(e) => handleScheduleChange('cabugao', 'wednesday', 'start', e.target.value)}
                            disabled={!schedule.cabugao.wednesday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.wednesday.end}
                            onChange={(e) => handleScheduleChange('cabugao', 'wednesday', 'end', e.target.value)}
                            disabled={!schedule.cabugao.wednesday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Thursday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="thursday-cabugao" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.cabugao.thursday.enabled}
                            onChange={(e) => handleScheduleChange('cabugao', 'thursday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="thursday-cabugao" className="ml-2 block text-sm text-gray-700">Thursday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.thursday.start}
                            onChange={(e) => handleScheduleChange('cabugao', 'thursday', 'start', e.target.value)}
                            disabled={!schedule.cabugao.thursday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.thursday.end}
                            onChange={(e) => handleScheduleChange('cabugao', 'thursday', 'end', e.target.value)}
                            disabled={!schedule.cabugao.thursday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Friday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="friday-cabugao" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.cabugao.friday.enabled}
                            onChange={(e) => handleScheduleChange('cabugao', 'friday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="friday-cabugao" className="ml-2 block text-sm text-gray-700">Friday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.friday.start}
                            onChange={(e) => handleScheduleChange('cabugao', 'friday', 'start', e.target.value)}
                            disabled={!schedule.cabugao.friday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.friday.end}
                            onChange={(e) => handleScheduleChange('cabugao', 'friday', 'end', e.target.value)}
                            disabled={!schedule.cabugao.friday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Saturday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="saturday-cabugao" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.cabugao.saturday.enabled}
                            onChange={(e) => handleScheduleChange('cabugao', 'saturday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="saturday-cabugao" className="ml-2 block text-sm text-gray-700">Saturday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.saturday.start}
                            onChange={(e) => handleScheduleChange('cabugao', 'saturday', 'start', e.target.value)}
                            disabled={!schedule.cabugao.saturday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.saturday.end}
                            onChange={(e) => handleScheduleChange('cabugao', 'saturday', 'end', e.target.value)}
                            disabled={!schedule.cabugao.saturday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Sunday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="sunday-cabugao" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.cabugao.sunday.enabled}
                            onChange={(e) => handleScheduleChange('cabugao', 'sunday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="sunday-cabugao" className="ml-2 block text-sm text-gray-700">Sunday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.sunday.start}
                            onChange={(e) => handleScheduleChange('cabugao', 'sunday', 'start', e.target.value)}
                            disabled={!schedule.cabugao.sunday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.cabugao.sunday.end}
                            onChange={(e) => handleScheduleChange('cabugao', 'sunday', 'end', e.target.value)}
                            disabled={!schedule.cabugao.sunday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* San Juan Branch Schedule */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">San Juan Branch</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Monday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="monday-sanjuan" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.sanjuan.monday.enabled}
                            onChange={(e) => handleScheduleChange('sanjuan', 'monday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="monday-sanjuan" className="ml-2 block text-sm text-gray-700">Monday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.monday.start}
                            onChange={(e) => handleScheduleChange('sanjuan', 'monday', 'start', e.target.value)}
                            disabled={!schedule.sanjuan.monday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.monday.end}
                            onChange={(e) => handleScheduleChange('sanjuan', 'monday', 'end', e.target.value)}
                            disabled={!schedule.sanjuan.monday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Tuesday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="tuesday-sanjuan" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.sanjuan.tuesday.enabled}
                            onChange={(e) => handleScheduleChange('sanjuan', 'tuesday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="tuesday-sanjuan" className="ml-2 block text-sm text-gray-700">Tuesday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.tuesday.start}
                            onChange={(e) => handleScheduleChange('sanjuan', 'tuesday', 'start', e.target.value)}
                            disabled={!schedule.sanjuan.tuesday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.tuesday.end}
                            onChange={(e) => handleScheduleChange('sanjuan', 'tuesday', 'end', e.target.value)}
                            disabled={!schedule.sanjuan.tuesday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Wednesday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="wednesday-sanjuan" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.sanjuan.wednesday.enabled}
                            onChange={(e) => handleScheduleChange('sanjuan', 'wednesday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="wednesday-sanjuan" className="ml-2 block text-sm text-gray-700">Wednesday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.wednesday.start}
                            onChange={(e) => handleScheduleChange('sanjuan', 'wednesday', 'start', e.target.value)}
                            disabled={!schedule.sanjuan.wednesday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.wednesday.end}
                            onChange={(e) => handleScheduleChange('sanjuan', 'wednesday', 'end', e.target.value)}
                            disabled={!schedule.sanjuan.wednesday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Thursday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="thursday-sanjuan" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.sanjuan.thursday.enabled}
                            onChange={(e) => handleScheduleChange('sanjuan', 'thursday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="thursday-sanjuan" className="ml-2 block text-sm text-gray-700">Thursday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.thursday.start}
                            onChange={(e) => handleScheduleChange('sanjuan', 'thursday', 'start', e.target.value)}
                            disabled={!schedule.sanjuan.thursday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.thursday.end}
                            onChange={(e) => handleScheduleChange('sanjuan', 'thursday', 'end', e.target.value)}
                            disabled={!schedule.sanjuan.thursday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Friday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="friday-sanjuan" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.sanjuan.friday.enabled}
                            onChange={(e) => handleScheduleChange('sanjuan', 'friday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="friday-sanjuan" className="ml-2 block text-sm text-gray-700">Friday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.friday.start}
                            onChange={(e) => handleScheduleChange('sanjuan', 'friday', 'start', e.target.value)}
                            disabled={!schedule.sanjuan.friday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.friday.end}
                            onChange={(e) => handleScheduleChange('sanjuan', 'friday', 'end', e.target.value)}
                            disabled={!schedule.sanjuan.friday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Saturday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="saturday-sanjuan" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.sanjuan.saturday.enabled}
                            onChange={(e) => handleScheduleChange('sanjuan', 'saturday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="saturday-sanjuan" className="ml-2 block text-sm text-gray-700">Saturday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.saturday.start}
                            onChange={(e) => handleScheduleChange('sanjuan', 'saturday', 'start', e.target.value)}
                            disabled={!schedule.sanjuan.saturday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.saturday.end}
                            onChange={(e) => handleScheduleChange('sanjuan', 'saturday', 'end', e.target.value)}
                            disabled={!schedule.sanjuan.saturday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                      
                      {/* Sunday */}
                      <div>
                        <div className="flex items-center mb-2">
                          <input 
                            id="sunday-sanjuan" 
                            type="checkbox" 
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={schedule.sanjuan.sunday.enabled}
                            onChange={(e) => handleScheduleChange('sanjuan', 'sunday', 'enabled', e.target.checked)}
                          />
                          <label htmlFor="sunday-sanjuan" className="ml-2 block text-sm text-gray-700">Sunday</label>
                        </div>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.sunday.start}
                            onChange={(e) => handleScheduleChange('sanjuan', 'sunday', 'start', e.target.value)}
                            disabled={!schedule.sanjuan.sunday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                          <span className="flex items-center">to</span>
                          <select 
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            value={schedule.sanjuan.sunday.end}
                            onChange={(e) => handleScheduleChange('sanjuan', 'sunday', 'end', e.target.value)}
                            disabled={!schedule.sanjuan.sunday.enabled}
                          >
                            {generateTimeOptions()}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-5">
                    <button
                      type="button"
                      className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                      onClick={saveSchedule}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiCalendar className="mr-2 -ml-1 h-5 w-5" />
                          Save Schedule
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