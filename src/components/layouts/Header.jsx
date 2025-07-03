// src/components/layouts/Header.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { FiBell, FiUser, FiLogOut, FiSettings, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Header = ({ role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [archivedUsersCount, setArchivedUsersCount] = useState(0);

  useEffect(() => {
    fetchProfileData();
    if (role === 'admin') {
      checkArchivedUsers();
    }
  }, [user, role]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const checkArchivedUsers = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('is_active', false);

      if (error) throw error;
      setArchivedUsersCount(count || 0);
    } catch (error) {
      console.error('Error checking archived users:', error);
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/login');
    }
  };

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    doctor: 'bg-blue-100 text-blue-800',
    staff: 'bg-purple-100 text-purple-800',
    patient: 'bg-green-100 text-green-800'
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Welcome back, {profileData?.full_name || ''}
            </h2>
            <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
              {role?.charAt(0).toUpperCase() + role?.slice(1)}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Admin archived users notification */}
            {role === 'admin' && archivedUsersCount > 0 && (
              <div 
                className="flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-md cursor-pointer"
                onClick={() => navigate('/admin/users')}
                title={`${archivedUsersCount} archived users`}
              >
                <FiAlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">{archivedUsersCount} Archived</span>
              </div>
            )}

            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none">
              <FiBell className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <FiUser className="w-5 h-5" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate(`/${role}/profile`);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <FiUser className="mr-3" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate(`/${role}/settings`);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <FiSettings className="mr-3" />
                      Settings
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        handleLogout();
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <FiLogOut className="mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;