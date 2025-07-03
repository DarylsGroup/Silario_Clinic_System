// src/pages/doctor/Appointments.jsx - Complete Enhanced Version
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FiCalendar, FiClock, FiMapPin, FiUser, FiMessageSquare,
  FiCheck, FiX, FiEdit, FiFilter, FiSearch, FiAlertTriangle, 
  FiClock as FiDuration, FiRefreshCw, FiAlertCircle, FiEye
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DoctorAppointments = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [appointmentDurations, setAppointmentDurations] = useState({});
  const [isSettingDuration, setIsSettingDuration] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSelectingPatient, setIsSelectingPatient] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Check user role and permissions
  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Role check error:', error);
        throw error;
      }
      
      console.log('User role:', data.role);
      setUserRole(data.role);
      
      if (['doctor', 'admin', 'staff'].includes(data.role)) {
        // User has permission, proceed with fetching data
        await Promise.all([
          fetchAppointments(),
          fetchPatients(),
          fetchServices()
        ]);
      } else {
        // User doesn't have permission
        toast.error('You do not have permission to view this page');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      toast.error('Failed to verify your account permissions');
      setIsLoading(false);
    }
  };

  // Filter appointments when activeTab, searchQuery, or selectedPatient changes
  useEffect(() => {
    filterAppointments();
  }, [activeTab, searchQuery, appointments, selectedPatient]);

  // Filter patients when patientSearchQuery changes
  useEffect(() => {
    if (patients.length > 0) {
      const filtered = patients.filter(patient => {
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
        const searchLower = patientSearchQuery.toLowerCase();
        
        return (
          fullName.includes(searchLower) ||
          (patient.email && patient.email.toLowerCase().includes(searchLower)) ||
          (patient.phone && patient.phone.includes(searchLower))
        );
      });
      setFilteredPatients(filtered);
    }
  }, [patientSearchQuery, patients]);

  // Fetch services
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, price, duration, category')
        .order('name');
      
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    }
  };

  // Fetch patients
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('role', 'patient')
        .order('full_name');
      
      if (error) throw error;
      
      // Map the profiles data to match the expected structure
      const formattedPatients = (data || []).map(patient => {
        const nameParts = (patient.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        return {
          id: patient.id,
          first_name: firstName,
          last_name: lastName,
          full_name: patient.full_name,
          email: patient.email,
          phone: patient.phone
        };
      });
      
      setPatients(formattedPatients);
      setFilteredPatients(formattedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  };

  // Fetch appointment durations
  const fetchAppointmentDurations = async (appointmentIds) => {
    if (!appointmentIds || appointmentIds.length === 0) return {};
    
    try {
      const { data, error } = await supabase
        .from('appointment_durations')
        .select('appointment_id, duration_minutes, created_at, updated_at')
        .in('appointment_id', appointmentIds);
      
      if (error) {
        console.error('Error fetching durations:', error);
        return {};
      }
      
      const durationsMap = {};
      (data || []).forEach(record => {
        durationsMap[record.appointment_id] = parseInt(record.duration_minutes, 10);
      });
      
      return durationsMap;
    } catch (err) {
      console.error('Error in fetchAppointmentDurations:', err);
      return {};
    }
  };

  // Main function to fetch appointments
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching appointments...');
      
      // Base query for appointments
      let query = supabase
        .from('appointments')
        .select(`
          id, 
          patient_id,
          appointment_date, 
          appointment_time, 
          status, 
          branch,
          teeth_involved,
          notes,
          is_emergency,
          created_at,
          updated_at
        `)
        .order('appointment_date', { ascending: true });
      
      // Filter by patient if selected
      if (selectedPatient) {
        query = query.eq('patient_id', selectedPatient.id);
      }
      
      const { data: appointmentData, error: appointmentError } = await query;
      
      if (appointmentError) {
        console.error('Error fetching appointments:', appointmentError);
        throw appointmentError;
      }
      
      console.log(`Fetched ${appointmentData.length} appointments`);
      
      if (appointmentData.length === 0) {
        setAppointments([]);
        setIsLoading(false);
        return;
      }
      
      // Get unique patient IDs and appointment IDs
      const patientIds = [...new Set(appointmentData.map(a => a.patient_id))];
      const appointmentIds = appointmentData.map(a => a.id);
      
      // Fetch patient profiles
      const { data: patientData, error: patientError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', patientIds);
      
      if (patientError) {
        console.error('Error fetching patient profiles:', patientError);
      }
      
      // Fetch appointment services
      const { data: appointmentServicesData, error: servicesError } = await supabase
        .from('appointment_services')
        .select('appointment_id, service_id')
        .in('appointment_id', appointmentIds);
      
      if (servicesError) {
        console.error('Error fetching appointment services:', servicesError);
      }
      
      // Fetch appointment durations
      const durationMap = await fetchAppointmentDurations(appointmentIds);
      setAppointmentDurations(durationMap);
      
      // Create lookup maps
      const patientMap = {};
      (patientData || []).forEach(patient => {
        patientMap[patient.id] = patient;
      });
      
      const serviceMap = {};
      services.forEach(service => {
        serviceMap[service.id] = service;
      });
      
      // Group services by appointment
      const appointmentServicesMap = {};
      (appointmentServicesData || []).forEach(as => {
        if (!appointmentServicesMap[as.appointment_id]) {
          appointmentServicesMap[as.appointment_id] = [];
        }
        
        const service = serviceMap[as.service_id];
        if (service) {
          appointmentServicesMap[as.appointment_id].push(service);
        }
      });
      
      // Combine all data
      const formattedAppointments = appointmentData.map(appointment => {
        const patient = patientMap[appointment.patient_id] || { full_name: 'Unknown Patient' };
        const appointmentServices = appointmentServicesMap[appointment.id] || [];
        
        return {
          ...appointment,
          patients: patient,
          patientName: patient.full_name,
          services: appointmentServices,
          serviceIds: appointmentServices.map(s => s.id),
          serviceNames: appointmentServices.map(s => s.name),
          duration: durationMap[appointment.id] || 30
        };
      });
      
      setAppointments(formattedAppointments);
      console.log('Appointments processed successfully');
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setDebugInfo(JSON.stringify(error, null, 2));
      toast.error(`Failed to load appointments: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter appointments based on active tab and search query
  const filterAppointments = () => {
    if (!appointments.length) return;
    
    let filtered = [...appointments];
    
    // Filter by status
    if (activeTab === 'pending') {
      filtered = filtered.filter(app => app.status === 'pending');
    } else if (activeTab === 'upcoming') {
      filtered = filtered.filter(app => {
        const isConfirmed = app.status === 'confirmed';
        const appointmentDateTime = new Date(`${app.appointment_date}T${app.appointment_time}`);
        const now = new Date();
        return isConfirmed && appointmentDateTime > now;
      });
    } else if (activeTab === 'today') {
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      filtered = filtered.filter(app => {
        return app.appointment_date === todayDate && app.status === 'confirmed';
      });
    } else if (activeTab === 'past') {
      filtered = filtered.filter(app => {
        if (app.status === 'completed') return true;
        
        const appointmentDateTime = new Date(`${app.appointment_date}T${app.appointment_time}`);
        const now = new Date();
        return appointmentDateTime < now;
      });
    } else if (activeTab === 'cancelled') {
      filtered = filtered.filter(app => 
        app.status === 'cancelled' || app.status === 'rejected'
      );
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.patientName?.toLowerCase().includes(query) ||
        app.branch?.toLowerCase().includes(query) ||
        (app.serviceNames && app.serviceNames.some(service => 
          service?.toLowerCase().includes(query)
        ))
      );
    }
    
    setFilteredAppointments(filtered);
  };

  // Enhanced status update function with comprehensive error handling
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      console.log('Updating appointment status:', { appointmentId, newStatus, userRole });
      
      // Validate inputs
      if (!appointmentId || !newStatus) {
        throw new Error('Missing appointment ID or status');
      }

      // Check permissions
      if (!['doctor', 'admin', 'staff'].includes(userRole)) {
        throw new Error('You do not have permission to update appointments');
      }

      // First, verify the appointment exists
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('id, status, patient_id')
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        console.error('Error fetching current appointment:', fetchError);
        throw new Error('Could not find the appointment');
      }

      if (!currentAppointment) {
        throw new Error('Appointment not found');
      }

      console.log('Current appointment found:', currentAppointment);

      // Handle reject status - try 'rejected' first, fallback to 'cancelled'
      let finalStatus = newStatus;
      let updateError = null;

      // Try the requested status first
      const { data: updateData, error: directUpdateError } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select();

      if (directUpdateError) {
        console.error('Direct update error:', directUpdateError);
        
        // If it's a constraint error and we're trying to reject, try cancelled
        if (newStatus === 'rejected' && directUpdateError.message.includes('constraint')) {
          console.log('Rejected status failed, trying cancelled');
          
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('appointments')
            .update({ 
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId)
            .select();

          if (fallbackError) {
            throw fallbackError;
          }

          finalStatus = 'cancelled';
          console.log('Successfully updated with cancelled status');
        } else {
          throw directUpdateError;
        }
      }

      console.log('Successfully updated appointment to:', finalStatus);
      
      // Update local state
      setAppointments(prevAppointments => 
        prevAppointments.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: finalStatus, updated_at: new Date().toISOString() } 
            : appointment
        )
      );
      
      // Show success message
      const actionText = newStatus === 'rejected' ? 'rejected' : newStatus;
      toast.success(`Appointment ${actionText} successfully`);
      
      // Refresh appointments to ensure consistency
      setTimeout(() => {
        fetchAppointments();
      }, 500);
      
    } catch (error) {
      console.error(`Error updating appointment status to ${newStatus}:`, error);
      
      let errorMessage = `Failed to ${newStatus} appointment`;
      
      if (error.message.includes('permission')) {
        errorMessage = 'You do not have permission to perform this action';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Appointment not found';
      } else if (error.message.includes('constraint')) {
        errorMessage = 'Invalid status value. Please contact support.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  // Set duration function
  const handleSetDuration = async () => {
    try {
      if (!selectedAppointment) return;
      
      console.log('Setting duration:', { appointmentId: selectedAppointment.id, duration: selectedDuration });
      
      // Check if duration record exists
      const { data: existingData, error: checkError } = await supabase
        .from('appointment_durations')
        .select('id')
        .eq('appointment_id', selectedAppointment.id)
        .single();
      
      let result;
      if (existingData) {
        // Update existing duration
        result = await supabase
          .from('appointment_durations')
          .update({ 
            duration_minutes: selectedDuration,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('appointment_id', selectedAppointment.id);
      } else {
        // Insert new duration
        result = await supabase
          .from('appointment_durations')
          .insert({ 
            appointment_id: selectedAppointment.id, 
            duration_minutes: selectedDuration,
            created_by: user.id,
            created_at: new Date().toISOString()
          });
      }
      
      if (result.error) {
        console.error('Duration update error:', result.error);
        throw result.error;
      }
      
      // Update local state
      setAppointmentDurations(prev => ({
        ...prev,
        [selectedAppointment.id]: selectedDuration
      }));
      
      toast.success('Appointment duration set successfully');
      setIsSettingDuration(false);
      
      // Refresh appointments
      setTimeout(() => {
        fetchAppointments();
      }, 500);
      
    } catch (error) {
      console.error('Error setting appointment duration:', error);
      toast.error(`Failed to set appointment duration: ${error.message}`);
    }
  };

  // Patient selection handlers
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setIsSelectingPatient(false);
    fetchAppointments();
  };

  const clearPatientFilter = () => {
    setSelectedPatient(null);
    fetchAppointments();
  };

  // Utility functions
  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const formatTime = (timeStr) => {
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    const [hours, minutes] = timeStr.split(':');
    return new Date(0, 0, 0, hours, minutes).toLocaleTimeString('en-US', options);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Manage Appointments</h1>
            {selectedPatient && (
              <div className="mt-1 flex items-center text-gray-600">
                <span className="text-sm">
                  Patient: <span className="font-medium">{selectedPatient.full_name}</span>
                </span>
                <button 
                  onClick={clearPatientFilter}
                  className="ml-2 text-xs text-primary-600 hover:text-primary-800"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button 
              onClick={() => setIsSelectingPatient(true)}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-gray-500"
              title="Filter by Patient"
            >
              <FiUser className="h-5 w-5" />
            </button>
            <button 
              onClick={() => fetchAppointments()}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-gray-500"
              title="Refresh"
            >
              <FiRefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'pending', label: 'Pending' },
              { key: 'today', label: 'Today' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'past', label: 'Past/Completed' },
              { key: 'cancelled', label: 'Cancelled/Rejected' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Patient Selection Modal */}
        {isSelectingPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Select Patient</h2>
                <button 
                  onClick={() => setIsSelectingPatient(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              
              <div className="mt-4 border rounded-md divide-y max-h-96 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No patients found matching your search.
                  </div>
                ) : (
                  filteredPatients.map(patient => (
                    <div 
                      key={patient.id} 
                      className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <div>
                        <div className="font-medium">{patient.full_name}</div>
                        <div className="text-sm text-gray-500">
                          {patient.email && <div>{patient.email}</div>}
                          {patient.phone && <div>{patient.phone}</div>}
                        </div>
                      </div>
                      <FiCheck className="h-5 w-5 text-primary-600" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Appointment Details Modal */}
        {isViewingDetails && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Appointment Details</h2>
                <button 
                  onClick={() => setIsViewingDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Patient Info */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                    <FiUser className="mr-2 text-primary-500" /> Patient Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <p className="text-gray-700">
                      <span className="font-medium">Name:</span> {selectedAppointment.patientName}
                    </p>
                    {selectedAppointment.patients?.email && (
                      <p className="text-gray-700">
                        <span className="font-medium">Email:</span> {selectedAppointment.patients.email}
                      </p>
                    )}
                    {selectedAppointment.patients?.phone && (
                      <p className="text-gray-700">
                        <span className="font-medium">Phone:</span> {selectedAppointment.patients.phone}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Appointment Info */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                    <FiCalendar className="mr-2 text-primary-500" /> Appointment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <p className="text-gray-700">
                      <span className="font-medium">Date:</span> {formatDate(selectedAppointment.appointment_date)}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Time:</span> {formatTime(selectedAppointment.appointment_time)}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Branch:</span> {selectedAppointment.branch}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Status:</span> 
                      <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${getStatusBadgeClass(selectedAppointment.status)}`}>
                        {selectedAppointment.status}
                      </span>
                    </p>
                    <p className="text-gray-700 md:col-span-2">
                      <span className="font-medium">Duration:</span> 
                      {selectedAppointment.duration ? 
                        ` ${selectedAppointment.duration} minutes` : 
                        ' Not set'}
                      <button 
                        onClick={() => setIsSettingDuration(true)} 
                        className="ml-2 text-primary-600 hover:text-primary-700 text-sm px-2 py-0.5 border border-primary-300 rounded-md"
                      >
                        {selectedAppointment.duration ? 'Change' : 'Set Duration'}
                      </button>
                    </p>
                  </div>
                </div>
                
                {/* Services */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-700 mb-2">Services</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Requested Services:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {selectedAppointment.serviceNames && selectedAppointment.serviceNames.length > 0 ? (
                          selectedAppointment.serviceNames.map((service, index) => (
                            <li key={index} className="flex items-center">
                              <FiCheck className="text-green-500 mr-2 h-4 w-4 flex-shrink-0" />
                              {service}
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400 italic">No services specified</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Service Details:</p>
                      <div className="space-y-2">
                        {selectedAppointment.services && selectedAppointment.services.length > 0 ? (
                          selectedAppointment.services.map((service, index) => (
                            <div key={index} className="text-sm text-gray-600 border rounded p-2">
                              <div className="font-medium">{service.name}</div>
                              {service.description && (
                                <div className="text-xs text-gray-500 mt-1">{service.description}</div>
                              )}
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>₱{service.price}</span>
                                <span>{service.duration || 30} mins</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 italic text-sm">No service details available</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional Info */}
                {(selectedAppointment.teeth_involved || selectedAppointment.notes) && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-medium text-gray-700 mb-2">Additional Information</h3>
                    {selectedAppointment.teeth_involved && (
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">Teeth Involved:</span> {selectedAppointment.teeth_involved}
                      </p>
                    )}
                    {selectedAppointment.notes && (
                      <p className="text-gray-700">
                        <span className="font-medium">Notes:</span> {selectedAppointment.notes}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Emergency Alert */}
                {selectedAppointment.is_emergency && (
                  <div className="bg-red-50 p-4 rounded-md border border-red-100">
                    <div className="flex items-center text-red-800">
                      <FiAlertTriangle className="h-5 w-5 mr-2" />
                      <span className="font-medium">This is marked as an emergency appointment</span>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t">
                  {selectedAppointment.status === 'pending' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedAppointment.id, 'confirmed');
                          setIsViewingDetails(false);
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                      >
                        <FiCheck className="mr-1" /> Approve
                      </button>
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedAppointment.id, 'rejected');
                          setIsViewingDetails(false);
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center"
                      >
                        <FiX className="mr-1" /> Reject
                      </button>
                    </div>
                  )}
                  
                  {selectedAppointment.status === 'confirmed' && (
                    <div className="flex flex-col space-y-3">
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedAppointment.id, 'completed');
                          setIsViewingDetails(false);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                      >
                        <FiCheck className="mr-1" /> Mark as Completed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Duration Setting Modal */}
        {isSettingDuration && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Set Duration</h2>
                <button 
                  onClick={() => setIsSettingDuration(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  id="duration"
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsSettingDuration(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetDuration}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appointments List */}
        <div>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">
                {selectedPatient 
                  ? `No ${activeTab} appointments found for ${selectedPatient.full_name}.` 
                  : `No ${activeTab} appointments found.`}
              </p>
              {selectedPatient && (
                <button
                  onClick={clearPatientFilter}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  View All Appointments
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div 
                  key={appointment.id}
                  className="bg-white rounded-lg border border-gray-300 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800">{appointment.patientName}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        {appointment.is_emergency && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full flex items-center">
                            <FiAlertTriangle className="mr-1" />
                            Emergency
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <FiCalendar className="mr-2 text-primary-500" />
                          {formatDate(appointment.appointment_date)}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FiClock className="mr-2 text-primary-500" />
                          {formatTime(appointment.appointment_time)}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FiMapPin className="mr-2 text-primary-500" />
                          {appointment.branch}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FiDuration className="mr-2 text-primary-500" />
                          {appointment.duration} mins
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Services:</span> {
                          appointment.serviceNames && appointment.serviceNames.length > 0 ? 
                          appointment.serviceNames.join(', ') : 
                          'None specified'
                        }
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setSelectedDuration(appointment.duration || 30);
                          setIsViewingDetails(true);
                        }}
                        className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 flex items-center"
                      >
                        <FiEye className="mr-1" />
                        View
                      </button>
                      
                      {/* Quick Actions */}
                      {appointment.status === 'pending' && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            title="Approve"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appointment.id, 'rejected')}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            title="Reject"
                          >
                            <FiX />
                          </button>
                        </div>
                      )}
                      
                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorAppointments;