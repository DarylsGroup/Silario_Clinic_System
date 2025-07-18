// src/components/layouts/Sidebar.jsx (Updated)
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useClinic } from '../../contexts/ClinicContext';
import { 
  FiHome, FiUsers, FiCalendar, FiList, 
  FiGrid, FiBarChart2, FiSettings, FiClipboard,
  FiUser, FiCreditCard, FiClock, FiFileText, FiAlertCircle, FiHeart,
  FiChevronDown, FiChevronRight, FiMenu, FiX
} from 'react-icons/fi';
import logo from '../../assets/Logo.png'; // Import the logo properly

const Sidebar = ({ role }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { clinicInfo } = useClinic();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (menu) => {
    setExpandedMenus({
      ...expandedMenus,
      [menu]: !expandedMenus[menu]
    });
  };

 
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  // Define navigation items based on user role
  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return [
          { to: '/admin/dashboard', icon: <FiHome />, text: 'Dashboard' },
          { to: '/admin/users', icon: <FiUsers />, text: 'User Management' },
          { to: '/admin/appointments', icon: <FiCalendar />, text: 'Appointments' },
          { to: '/admin/billing', icon: <FiFileText />, text: 'Billing & Payments' },
          { to: '/admin/services', icon: <FiList />, text: 'Service Management' },
          { to: '/admin/queue', icon: <FiGrid />, text: 'Queue Monitoring' },
          
          { to: '/admin/settings', icon: <FiSettings />, text: 'Settings' },
        ];
      case 'doctor':
        return [
          { to: '/doctor/dashboard', icon: <FiHome />, text: 'Dashboard' },
          { to: '/doctor/appointments', icon: <FiCalendar />, text: 'Appointments' },
          { to: '/doctor/patients', icon: <FiUsers />, text: 'Patient Records' },
          { to: '/doctor/queue', icon: <FiGrid />, text: 'Queue Management' },
          { to: '/doctor/billing', icon: <FiFileText />, text: 'Billing' },
          { to: '/doctor/settings', icon: <FiSettings />, text: 'Settings' },
        ];
      case 'staff':
        return [
          { to: '/staff/dashboard', icon: <FiHome />, text: 'Dashboard' },
          { to: '/staff/appointments', icon: <FiCalendar />, text: 'Appointments' },
          { to: '/staff/queue', icon: <FiGrid />, text: 'Queue Management' },
          { to: '/staff/patients', icon: <FiUsers />, text: 'Patient Records' },
          { to: '/staff/settings', icon: <FiSettings />, text: 'Settings' },
        ];
      case 'patient':
        return [
          { to: '/patient/dashboard', icon: <FiHome />, text: 'Dashboard' },
          { to: '/patient/services', icon: <FiList />, text: 'Dental Services' },
          { to: '/patient/appointments', icon: <FiCalendar />, text: 'My Appointments' },
          { to: '/patient/payments', icon: <FiCreditCard />, text: 'Payments' },
          { to: '/patient/history', icon: <FiFileText />, text: 'Dental Chart' },
          { to: '/patient/settings', icon: <FiSettings />, text: 'Settings' },
          { to: '/patient/profile', icon: <FiUser />, text: 'My Profile' }
        ];
      default:
        return [];
    }
};

const navItems = getNavItems();

return (
  <>
    {/* Mobile menu backdrop */}
    {isMobileMenuOpen && (
      <div
        className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>
    )}

    {/* Mobile menu button */}
    <div className="fixed bottom-4 right-4 z-50 lg:hidden">
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="p-3 bg-primary-600 rounded-full text-white shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>
    </div>

    {/* Sidebar for desktop */}
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-white lg:border-r lg:border-gray-200">
      <div className="flex items-center justify-center h-20 px-4 border-b border-gray-200 bg-primary-600">
        <div className="flex items-center">
          {/* Logo Image - Made Larger */}
          <img 
            src={logo}
            alt={`${clinicInfo.clinicName} Logo`}
            className="w-12 h-12 mr-3 object-contain"
          />
          <h1 className="text-xl font-bold text-white">{clinicInfo.clinicName}</h1>
        </div>
      </div>
      <div className="flex flex-col flex-grow p-4 overflow-y-auto">
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span>{item.text}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>

    {/* Mobile sidebar */}
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:hidden`}
    >
      <div className="flex items-center justify-between h-20 px-4 border-b border-gray-200 bg-primary-600">
        <div className="flex items-center">
          {/* Logo Image - Made Larger */}
          <img 
            src={logo}
            alt={`${clinicInfo.clinicName} Logo`}
            className="w-12 h-12 mr-3 object-contain"
          />
          <h1 className="text-xl font-bold text-white">{clinicInfo.clinicName}</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="p-1 rounded-md text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <FiX className="w-6 h-6" />
        </button>
      </div>
      <div className="flex flex-col flex-grow p-4 overflow-y-auto">
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span>{item.text}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  </>
);
};

export default Sidebar;