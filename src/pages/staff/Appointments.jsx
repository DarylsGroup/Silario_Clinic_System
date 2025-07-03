// src/pages/doctor/Appointments.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FiCalendar, FiClock, FiMapPin, FiUser, FiMessageSquare,
  FiCheck, FiX, FiEdit, FiFilter, FiSearch, FiAlertTriangle, 
  FiClock as FiDuration, FiRefreshCw, FiAlertCircle
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
  const [selectedDuration, setSelectedDuration] = useState(30); // Default 30 minutes
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSelectingPatient, setIsSelectingPatient] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);

  // Fetch appointments
  useEffect(() => {
    if (user) {
      // First check if user has doctor/admin/staff role
      checkUserRole();
    }
  }, [user]);

  // Check user role before fetching data
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
      
      if (['doctor', 'admin', 'staff'].includes(data.role)) {
        // User has permission, proceed with fetching data
        fetchAppointments();
        fetchPatients();
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

  // Filter appointments when activeTab or searchQuery changes
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

  const fetchPatients = async () => {
    try {
      // Test connection with a simple query first
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count')
        .eq('role', 'patient')
        .single();
        
      if (testError) {
        console.error('Test connection error:', testError);
        throw new Error('Could not connect to database. Please check your network connection.');
      }
      
      // Proceed with the actual query
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('role', 'patient');
      
      if (error) {
        console.error('Patient fetch error:', error);
        throw error;
      }
      
      // Map the profiles data to match the expected structure
      const formattedPatients = data.map(patient => {
        // Split full_name for UI compatibility
        const nameParts = patient.full_name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        return {
          id: patient.id,
          first_name: firstName,
          last_name: lastName,
          email: patient.email,
          phone: patient.phone
        };
      });
      
      setPatients(formattedPatients);
      setFilteredPatients(formattedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error(`Failed to load patients: ${error.message}`);
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching appointments...');
      
      // 1. Test basic connection with a simple query
      const { data: testData, error: testError } = await supabase
        .from('appointments')
        .select('count')
        .limit(1)
        .single();
      
      if (testError) {
        console.error('Connection test failed:', testError);
        throw new Error('Database connection test failed. Please check your network connection.');
      }
      
      console.log('Connection test successful, proceeding with appointments query');
      
      // 2. Fetch basic appointment data first (without complex joins)
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
          created_at
        `)
        .order('appointment_date', { ascending: true });
      
      // If a patient is selected, filter by patient_id
      if (selectedPatient) {
        query = query.eq('patient_id', selectedPatient.id);
      }
      
      // Execute the base query
      const { data: appointmentData, error: appointmentError } = await query;
      
      if (appointmentError) {
        console.error('Error fetching appointments:', appointmentError);
        throw appointmentError;
      }
      
      console.log(`Fetched ${appointmentData.length} appointments`);
      
      // 3. Fetch patient profiles separately
      const patientIds = [...new Set(appointmentData.map(a => a.patient_id))];
      
      const { data: patientData, error: patientError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', patientIds);
      
      if (patientError) {
        console.error('Error fetching patient profiles:', patientError);
        // Continue anyway with empty patient data
      }
      
      // Create a lookup map for patient data
      const patientMap = {};
      if (patientData) {
        patientData.forEach(patient => {
          patientMap[patient.id] = patient;
        });
      }
      
      // 4. Fetch appointment services
      const appointmentIds = appointmentData.map(a => a.id);
      
      const { data: serviceJoinData, error: serviceJoinError } = await supabase
        .from('appointment_services')
        .select('appointment_id, service_id')
        .in('appointment_id', appointmentIds);
      
      if (serviceJoinError) {
        console.error('Error fetching appointment-service join data:', serviceJoinError);
        // Continue anyway with empty service data
      }
      
      // Get all service IDs to fetch
      const serviceIds = serviceJoinData ? [...new Set(serviceJoinData.map(s => s.service_id))] : [];
      
      // Fetch service details
      const { data: serviceData, error: serviceError } = serviceIds.length > 0 
        ? await supabase
            .from('services')
            .select('id, name, description, price')
            .in('id', serviceIds)
        : { data: [], error: null };
      
      if (serviceError) {
        console.error('Error fetching service details:', serviceError);
        // Continue anyway with empty service details
      }
      
      // Create a lookup map for service data
      const serviceMap = {};
      if (serviceData) {
        serviceData.forEach(service => {
          serviceMap[service.id] = service;
        });
      }
      
      // Create a map of appointment_id -> [services]
      const appointmentServicesMap = {};
      if (serviceJoinData) {
        serviceJoinData.forEach(joinRecord => {
          if (!appointmentServicesMap[joinRecord.appointment_id]) {
            appointmentServicesMap[joinRecord.appointment_id] = [];
          }
          
          const serviceInfo = serviceMap[joinRecord.service_id];
          if (serviceInfo) {
            appointmentServicesMap[joinRecord.appointment_id].push({
              service_id: serviceInfo
            });
          }
        });
      }
      
      // 5. Combine all the data
      const formattedAppointments = appointmentData.map(appointment => {
        const patient = patientMap[appointment.patient_id] || { full_name: 'Unknown' };
        const services = appointmentServicesMap[appointment.id] || [];
        
        return {
          ...appointment,
          patients: patient,
          patientName: patient.full_name,
          services: services,
          serviceIds: services.map(s => s.service_id.id),
          serviceNames: services.map(s => s.service_id.name)
        };
      });
      
      setAppointments(formattedAppointments);
      console.log('Appointments processed successfully');
      
      // 6. Try to fetch appointment durations if that table exists
      try {
        const { data: durationData, error: durationError } = await supabase
          .from('appointment_durations')
          .select('appointment_id, duration_minutes');
        
        if (!durationError && durationData) {
          // Convert to a map for easy lookup
          const durationMap = {};
          durationData.forEach(item => {
            durationMap[item.appointment_id] = item.duration_minutes;
          });
          
          setAppointmentDurations(durationMap);
        } else {
          console.log('Appointment durations may not exist yet:', durationError);
          // If the table doesn't exist, this is fine - just use empty durations
          setAppointmentDurations({});
        }
      } catch (durationErr) {
        console.log('Appointment durations table might not exist yet');
        setAppointmentDurations({});
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setDebugInfo(JSON.stringify(error, null, 2));
      toast.error(`Failed to load appointments: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAppointments = () => {
    if (!appointments.length) return;
    
    let filtered = [...appointments];
    
    // Filter by status
    if (activeTab === 'pending') {
      filtered = filtered.filter(app => app.status === 'pending');
    } else if (activeTab === 'upcoming') {
      filtered = filtered.filter(app => app.status === 'confirmed' && new Date(`${app.appointment_date}T${app.appointment_time}`) > new Date());
    } else if (activeTab === 'today') {
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      filtered = filtered.filter(app => app.appointment_date === todayDate && app.status === 'confirmed');
    } else if (activeTab === 'past') {
      const today = new Date();
      filtered = filtered.filter(app => {
        const appDate = new Date(`${app.appointment_date}T${app.appointment_time}`);
        return (appDate < today && app.status === 'completed') || app.status === 'completed';
      });
    } else if (activeTab === 'cancelled') {
      filtered = filtered.filter(app => app.status === 'cancelled' || app.status === 'rejected');
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.patientName?.toLowerCase().includes(query) ||
        app.branch?.toLowerCase().includes(query) ||
        (app.serviceNames && app.serviceNames.some(service => service?.toLowerCase().includes(query)))
      );
    }
    
    setFilteredAppointments(filtered);
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      // Update local state
      setAppointments(appointments.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, status: newStatus } 
          : appointment
      ));
      
      toast.success(`Appointment ${newStatus} successfully`);
    } catch (error) {
      console.error(`Error updating appointment status to ${newStatus}:`, error);
      toast.error(`Failed to ${newStatus} appointment`);
    }
  };

  const handleSetDuration = async () => {
    try {
      if (!selectedAppointment) return;
      
      // First check if appointment_durations table exists
      let tableExists = true;
      
      try {
        const { data: testData, error: testError } = await supabase
          .from('appointment_durations')
          .select('count')
          .limit(1)
          .single();
        
        if (testError && testError.code === 'PGRST116') {
          // Empty result is fine
        } else if (testError) {
          console.error('Error checking durations table:', testError);
          tableExists = false;
        }
      } catch (err) {
        console.error('Error checking durations table:', err);
        tableExists = false;
      }
      
      // If table doesn't exist, create it
      if (!tableExists) {
        toast.info('Setting up appointment durations table...');
        
        try {
          // We'll use the appointment itself to store the duration for now
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ duration_minutes: selectedDuration })
            .eq('id', selectedAppointment.id);
          
          if (updateError) throw updateError;
          
          // Update local state
          setAppointmentDurations({
            ...appointmentDurations,
            [selectedAppointment.id]: selectedDuration
          });
          
          toast.success('Appointment duration set successfully');
          setIsSettingDuration(false);
          return;
        } catch (err) {
          console.error('Error updating appointment with duration:', err);
          throw new Error('Failed to set duration. Durations table may need to be created by an administrator.');
        }
      }
      
      // Otherwise proceed with normal duration table
      // Check if duration record already exists
      const { data: existingData, error: checkError } = await supabase
        .from('appointment_durations')
        .select('id')
        .eq('appointment_id', selectedAppointment.id);
      
      if (checkError) throw checkError;
      
      let result;
      if (existingData && existingData.length > 0) {
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
      
      if (result.error) throw result.error;
      
      // Update local state
      setAppointmentDurations({
        ...appointmentDurations,
        [selectedAppointment.id]: selectedDuration
      });
      
      toast.success('Appointment duration set successfully');
      setIsSettingDuration(false);
    } catch (error) {
      console.error('Error setting appointment duration:', error);
      toast.error(`Failed to set appointment duration: ${error.message}`);
    }
  };

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
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setIsSelectingPatient(false);
    // Refresh appointments for this patient
    fetchAppointments();
  };

  const clearPatientFilter = () => {
    setSelectedPatient(null);
    fetchAppointments();
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
                <span className="text-sm">Patient: <span className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</span></span>
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
                placeholder="Search appointment..."
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
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'today'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'past'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'cancelled'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cancelled/Rejected
            </button>
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
                        <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                        <div className="text-sm text-gray-500">
                          {patient.email && <div>{patient.email}</div>}
                          {patient.phone && <div>{patient.phone}</div>}
                        </div>
                      </div>
                      <FiCheck className="h-5 w-5 text-primary-600 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Appointment Details View */}
        {isViewingDetails && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                      <span className="font-medium">Procedure Duration:</span> 
                      {appointmentDurations[selectedAppointment.id] ? 
                        ` ${appointmentDurations[selectedAppointment.id]} minutes` : 
                        ' Not set'}
                      <button 
                        onClick={() => setIsSettingDuration(true)} 
                        className="ml-2 text-primary-600 hover:text-primary-700 text-sm px-2 py-0.5 border border-primary-300 rounded-md"
                      >
                        {appointmentDurations[selectedAppointment.id] ? 'Change Duration' : 'Set Duration'}
                      </button>
                    </p>
                  </div>
                </div>
                
                {/* Services */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-700 mb-2">Requested Services</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedAppointment.serviceNames && selectedAppointment.serviceNames.length > 0 ? (
                      selectedAppointment.serviceNames.map((service, index) => (
                        <li key={index} className="text-gray-700">{service}</li>
                      ))
                    ) : (
                      <li className="text-gray-500">No services specified</li>
                    )}
                  </ul>
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
                
                {/* Duration Not Set Warning */}
                {selectedAppointment.status === 'confirmed' && !appointmentDurations[selectedAppointment.id] && (
                  <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                    <div className="flex items-center text-yellow-800">
                      <FiAlertCircle className="h-5 w-5 mr-2" />
                      <span>Please set the procedure duration for scheduling purposes. This helps prevent scheduling conflicts.</span>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                  {/* Pending Appointment Actions */}
                  {selectedAppointment.status === 'pending' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedAppointment.id, 'confirmed');
                          setIsViewingDetails(false);
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <FiCheck className="inline-block mr-1" /> Approve
                      </button>
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedAppointment.id, 'rejected');
                          setIsViewingDetails(false);
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        <FiX className="inline-block mr-1" /> Reject
                      </button>
                    </div>
                  )}
                  
                  {/* Confirmed Appointment Actions */}
                  {selectedAppointment.status === 'confirmed' && (
                    <div className="flex flex-col space-y-3">
                      {!appointmentDurations[selectedAppointment.id] && (
                        <button
                          onClick={() => setIsSettingDuration(true)}
                          className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                        >
                          <FiDuration className="inline-block mr-1" /> Set Procedure Duration
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedAppointment.id, 'completed');
                          setIsViewingDetails(false);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <FiCheck className="inline-block mr-1" /> Mark as Completed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Setting Duration Modal */}
        {isSettingDuration && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Set Procedure Duration</h2>
                <button 
                  onClick={() => setIsSettingDuration(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-2">
                <p className="text-sm text-gray-600 mb-4">
                  Please specify how long this procedure will take. This helps prevent scheduling conflicts and ensures sufficient time is allocated.
                </p>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
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
              
              <div className="text-sm text-gray-600 mb-4">
                <p className="font-medium">Procedure Services:</p>
                <ul className="list-disc list-inside mt-1">
                  {selectedAppointment.serviceNames && selectedAppointment.serviceNames.length > 0 ? (
                    selectedAppointment.serviceNames.map((service, index) => (
                      <li key={index}>{service}</li>
                    ))
                  ) : (
                    <li className="text-gray-500">No services specified</li>
                  )}
                </ul>
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
                  Save Duration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Debug info display for development */}
        {debugInfo && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md overflow-auto hidden">
            <h3 className="font-medium text-red-800 mb-2">Debug Information</h3>
            <pre className="text-xs text-red-700">{debugInfo}</pre>
          </div>
        )}

        {/* Content */}
        <div>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">
                {selectedPatient 
                  ? `No ${activeTab} appointments found for ${selectedPatient.first_name} ${selectedPatient.last_name}.` 
                  : `No ${activeTab} appointments found.`}
              </p>
              {selectedPatient && (
                <button
                  onClick={clearPatientFilter}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  View All Patients
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div 
                  key={appointment.id}
                  className={`bg-white rounded-lg border ${
                    !appointmentDurations[appointment.id] && appointment.status === 'confirmed'
                      ? 'border-yellow-300' 
                      : 'border-gray-300'
                  } p-4 hover:shadow-md transition-shadow`}
                >
                  <div className="flex justify-between">
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
                        {!appointmentDurations[appointment.id] && appointment.status === 'confirmed' && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center">
                            <FiAlertCircle className="mr-1" />
                            Duration Not Set
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
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
                          {appointmentDurations[appointment.id] ? 
                            `${appointmentDurations[appointment.id]} minutes` : 
                            'Duration not set'}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Services:</span> {appointment.serviceNames && appointment.serviceNames.length > 0 ? 
                          appointment.serviceNames.join(', ') : 'None specified'}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setSelectedDuration(appointmentDurations[appointment.id] || 30);
                          setIsViewingDetails(true);
                        }}
                        className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                      >
                        View Details
                      </button>
                      
                      {/* Quick Action Buttons */}
                      {appointment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appointment.id, 'rejected')}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {appointment.status === 'confirmed' && (
                        <>
                          {!appointmentDurations[appointment.id] && (
                            <button
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setSelectedDuration(30);
                                setIsSettingDuration(true);
                              }}
                              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                            >
                              Set Duration
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Complete
                          </button>
                        </>
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