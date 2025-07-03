// src/pages/admin/Appointments.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FiCalendar, FiClock, FiMapPin, FiUser, FiMessageSquare,
  FiCheck, FiX, FiEdit, FiFilter, FiSearch, FiAlertTriangle, 
  FiClipboard, FiRefreshCw, FiUserPlus, FiUsers
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const AdminAppointments = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isAssigningDoctor, setIsAssigningDoctor] = useState(false);
  
  // Filters
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Reschedule states
  const [rescheduleDate, setRescheduleDate] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  
  // Doctor assignment
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  
  // Fetch data
  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [user]);

  // Filter appointments when filters change
  useEffect(() => {
    filterAppointments();
  }, [activeTab, searchQuery, selectedBranch, selectedDoctor, dateRange, appointments]);

  // Replace the fetchAppointments function in your AdminAppointments.jsx with this version
const fetchAppointments = async () => {
  setIsLoading(true);
  try {
    console.log('Fetching appointments...');
    
    // First test if we can connect to Supabase at all with a simple query
    const { data: testData, error: testError } = await supabase
      .from('appointments')
      .select('count')
      .limit(1)
      .single();
    
    if (testError) {
      console.error('Connection test failed:', testError);
      throw new Error('Database connection test failed. Please check your authentication status.');
    }
    
    console.log('Connection test successful, proceeding with appointments query');
    
    // Now fetch the actual appointment data with a simplified query first
    const { data: simpleData, error: simpleError } = await supabase
      .from('appointments')
      .select('id, patient_id, appointment_date, appointment_time, status, branch')
      .order('created_at', { ascending: false })
      .limit(10); // Just getting a few to test
    
    if (simpleError) {
      console.error('Simple fetch error:', simpleError);
      throw simpleError;
    }
    
    // If simple fetch worked, now try the full complex query
    console.log('Simple fetch successful, proceeding with full query');
    
    // Break up the query to identify where it's failing
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, 
        patient_id,
        doctor_id,
        appointment_date, 
        appointment_time, 
        status, 
        branch,
        teeth_involved,
        notes,
        is_emergency,
        created_at,
        patients:profiles!patient_id(id, full_name, email, phone),
        doctors:profiles!doctor_id(id, full_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching appointments part 1:', error);
      throw error;
    }
    
    // Now get the services in a separate query
    const appointmentIds = data.map(app => app.id);
    
    const { data: servicesData, error: servicesError } = await supabase
      .from('appointment_services')
      .select(`
        appointment_id, 
        service_id,
        services:service_id(id, name, description, price)
      `)
      .in('appointment_id', appointmentIds);
    
    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      // Don't throw here, we can still show appointments without services
    }
    
    // Group services by appointment
    const servicesMap = {};
    if (servicesData) {
      servicesData.forEach(item => {
        if (!servicesMap[item.appointment_id]) {
          servicesMap[item.appointment_id] = [];
        }
        servicesMap[item.appointment_id].push({
          service_id: item.services
        });
      });
    }
    
    // Format the appointments with services
    const formattedAppointments = data.map(appointment => ({
      ...appointment,
      services: servicesMap[appointment.id] || [],
      serviceIds: servicesMap[appointment.id] 
        ? servicesMap[appointment.id].map(s => s.service_id.id) 
        : [],
      serviceNames: servicesMap[appointment.id] 
        ? servicesMap[appointment.id].map(s => s.service_id.name) 
        : [],
      patientName: appointment.patients?.full_name || 'Unknown',
      doctorName: appointment.doctors?.full_name || null
    }));
    
    console.log(`Successfully loaded ${formattedAppointments.length} appointments`);
    setAppointments(formattedAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    toast.error(`Failed to load appointments: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

const fetchDoctors = async () => {
  try {
    // First do a simple test query to check connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .eq('role', 'doctor')
      .limit(1);
    
    if (testError) {
      console.error('Doctor connection test failed:', testError);
      throw new Error('Database connection test failed for doctors query.');
    }
    
    // Proceed with fetching doctors
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'doctor');
    
    if (error) {
      console.error('Error details:', error);
      throw error;
    }
    
    console.log(`Successfully loaded ${data?.length || 0} doctors`);
    setDoctors(data || []);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    toast.error(`Failed to load doctors: ${error.message}`);
  }
};

  const filterAppointments = () => {
    if (!appointments.length) return;
    
    let filtered = [...appointments];
    
    // Filter by status (tab)
    if (activeTab === 'pending') {
      filtered = filtered.filter(app => app.status === 'pending');
    } else if (activeTab === 'confirmed') {
      filtered = filtered.filter(app => app.status === 'confirmed');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(app => app.status === 'completed');
    } else if (activeTab === 'cancelled') {
      filtered = filtered.filter(app => app.status === 'cancelled' || app.status === 'rejected');
    } else if (activeTab === 'emergency') {
      filtered = filtered.filter(app => app.is_emergency === true);
    }
    
    // Filter by branch
    if (selectedBranch) {
      filtered = filtered.filter(app => app.branch === selectedBranch);
    }
    
    // Filter by doctor
    if (selectedDoctor) {
      filtered = filtered.filter(app => app.doctor_id === selectedDoctor);
    }
    
    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter(app => {
        const appDate = new Date(app.appointment_date);
        return appDate >= startDate && appDate <= endDate;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        (app.patientName && app.patientName.toLowerCase().includes(query)) ||
        (app.doctorName && app.doctorName.toLowerCase().includes(query)) ||
        (app.branch && app.branch.toLowerCase().includes(query)) ||
        (app.serviceNames && app.serviceNames.some(service => service.toLowerCase().includes(query)))
      );
    }
    
    setFilteredAppointments(filtered);
  };

  // Get available time slots based on selected date and branch
  const fetchAvailableTimeSlots = async (date, branch) => {
    if (!date || !branch) return;

    const formattedDate = date.toISOString().split('T')[0];
    
    try {
      // Get branch working hours
      let startHour, endHour, interval = 30; // 30-minute intervals
      
      // Define branch hours
      if (branch === 'Cabugao') {
        // Cabugao Branch: Monday to Friday: 8:00 AM - 12:00 PM, Saturday: 8:00 AM - 5:00 PM
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        if (dayOfWeek === 0) { // Sunday
          setAvailableTimeSlots([]);
          return;
        } else if (dayOfWeek === 6) { // Saturday
          startHour = 8;
          endHour = 17;
        } else { // Monday to Friday
          startHour = 8;
          endHour = 12;
        }
      } else if (branch === 'San Juan') {
        // San Juan Branch: Monday to Friday: 1:00 PM - 5:00 PM, Sunday: 8:00 AM - 5:00 PM
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 6) { // Saturday
          setAvailableTimeSlots([]);
          return;
        } else if (dayOfWeek === 0) { // Sunday
          startHour = 8;
          endHour = 17;
        } else { // Monday to Friday
          startHour = 13;
          endHour = 17;
        }
      }

      // Get booked slots
      const { data: bookedSlots, error } = await supabase
        .from('appointments')
        .select('appointment_time, doctor_id')
        .eq('appointment_date', formattedDate)
        .eq('branch', branch)
        .neq('status', 'cancelled')
        .neq('id', selectedAppointment?.id); // Exclude current appointment when rescheduling
      
      if (error) throw error;

      // Generate all possible time slots
      const allTimeSlots = [];
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          allTimeSlots.push(timeString);
        }
      }

      // If doctor is assigned, only show time slots when doctor is available
      let availableSlots = [...allTimeSlots];
      
      if (selectedDoctorId) {
        const doctorBookedSlots = bookedSlots
          .filter(slot => slot.doctor_id === selectedDoctorId)
          .map(slot => slot.appointment_time);
        
        availableSlots = allTimeSlots.filter(time => !doctorBookedSlots.includes(time));
      } else {
        // If no doctor is assigned yet, just check general availability
        const allBookedTimeStrings = bookedSlots.map(slot => slot.appointment_time);
        availableSlots = allTimeSlots.filter(time => !allBookedTimeStrings.includes(time));
      }
      
      setAvailableTimeSlots(availableSlots);
    } catch (error) {
      console.error('Error fetching available time slots:', error);
      toast.error('Failed to load available time slots');
    }
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

  const handleReschedule = async () => {
    if (!rescheduleDate || !selectedTimeSlot) {
      toast.error('Please select a date and time');
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          appointment_date: rescheduleDate.toISOString().split('T')[0], 
          appointment_time: selectedTimeSlot
        })
        .eq('id', selectedAppointment.id);
      
      if (error) throw error;
      
      // Update local state
      setAppointments(appointments.map(appointment => 
        appointment.id === selectedAppointment.id 
          ? { 
              ...appointment, 
              appointment_date: rescheduleDate.toISOString().split('T')[0], 
              appointment_time: selectedTimeSlot
            } 
          : appointment
      ));
      
      toast.success('Appointment rescheduled successfully');
      setIsRescheduling(false);
      setIsViewingDetails(false);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
    }
  };

  const handleAssignDoctor = async () => {
    if (!selectedDoctorId) {
      toast.error('Please select a doctor');
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ doctor_id: selectedDoctorId })
        .eq('id', selectedAppointment.id);
      
      if (error) throw error;
      
      // Get doctor name for UI update
      const doctor = doctors.find(d => d.id === selectedDoctorId);
      
      // Update local state
      setAppointments(appointments.map(appointment => 
        appointment.id === selectedAppointment.id 
          ? { 
              ...appointment, 
              doctor_id: selectedDoctorId,
              doctorName: doctor?.full_name || 'Unknown'
            } 
          : appointment
      ));
      
      toast.success('Doctor assigned successfully');
      setIsAssigningDoctor(false);
    } catch (error) {
      console.error('Error assigning doctor:', error);
      toast.error('Failed to assign doctor');
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
    switch (status.toLowerCase()) {
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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Appointment Management</h1>
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
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-gray-500"
              title="Filter"
            >
              <FiFilter className="h-5 w-5" />
            </button>
            <button 
              onClick={fetchAppointments}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-gray-500"
              title="Refresh"
            >
              <FiRefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {isFilterOpen && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  id="branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Branches</option>
                  <option value="Cabugao">Cabugao Branch</option>
                  <option value="San Juan">San Juan Branch</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor
                </label>
                <select
                  id="doctor"
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Doctors</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => {
                    setDateRange(update);
                  }}
                  isClearable={true}
                  placeholderText="Select date range"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSelectedBranch('');
                  setSelectedDoctor('');
                  setDateRange([null, null]);
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

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
              onClick={() => setActiveTab('confirmed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'confirmed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'completed'
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
              Cancelled
            </button>
            
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Appointments
            </button>
          </nav>
        </div>
        
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
                      <span className="font-medium">Assigned Doctor:</span> 
                      {selectedAppointment.doctorName ? selectedAppointment.doctorName : ' Not assigned'}
                      <button 
                        onClick={() => {
                          setIsAssigningDoctor(true);
                          setSelectedDoctorId(selectedAppointment.doctor_id || '');
                        }} 
                        className="ml-2 text-primary-600 hover:text-primary-700 text-sm px-2 py-0.5 border border-primary-300 rounded-md"
                      >
                        {selectedAppointment.doctorName ? 'Change Doctor' : 'Assign Doctor'}
                      </button>
                    </p>
                  </div>
                </div>
                
                {/* Services */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-700 mb-2">Requested Services</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedAppointment.serviceNames.map((service, index) => (
                      <li key={index} className="text-gray-700">{service}</li>
                    ))}
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
                  
                  {/* Reschedule Button (for any non-completed/cancelled status) */}
                  {['pending', 'confirmed'].includes(selectedAppointment.status) && (
                    <button
                      onClick={() => {
                        setIsRescheduling(true);
                        setRescheduleDate(new Date(selectedAppointment.appointment_date));
                        fetchAvailableTimeSlots(
                          new Date(selectedAppointment.appointment_date),
                          selectedAppointment.branch
                        );
                      }}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      <FiEdit className="inline-block mr-1" /> Reschedule Appointment
                    </button>
                  )}
                  
                  {/* Mark as Completed (for confirmed appointments) */}
                  {selectedAppointment.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedAppointment.id, 'completed');
                        setIsViewingDetails(false);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <FiCheck className="inline-block mr-1" /> Mark as Completed
                    </button>
                  )}
                  {/* Cancel Button (for pending/confirmed appointments) */}
                  {['pending', 'confirmed'].includes(selectedAppointment.status) && (
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedAppointment.id, 'cancelled');
                        setIsViewingDetails(false);
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      <FiX className="inline-block mr-1" /> Cancel Appointment
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Assign Doctor Modal */}
        {isAssigningDoctor && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Assign Doctor</h2>
                <button 
                  onClick={() => setIsAssigningDoctor(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="mb-2 text-sm text-gray-600">
                  <span className="font-medium">Patient:</span> {selectedAppointment.patientName}
                </p>
                <p className="mb-2 text-sm text-gray-600">
                  <span className="font-medium">Date & Time:</span> {formatDate(selectedAppointment.appointment_date)} at {formatTime(selectedAppointment.appointment_time)}
                </p>
                <p className="mb-4 text-sm text-gray-600">
                  <span className="font-medium">Branch:</span> {selectedAppointment.branch}
                </p>
                
                <label htmlFor="doctor-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Doctor
                </label>
                <select
                  id="doctor-select"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Please select a doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsAssigningDoctor(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignDoctor}
                  disabled={!selectedDoctorId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300"
                >
                  Assign Doctor
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Reschedule Modal */}
        {isRescheduling && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Reschedule Appointment</h2>
                <button 
                  onClick={() => setIsRescheduling(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="mb-2 text-sm text-gray-600">
                  <span className="font-medium">Patient:</span> {selectedAppointment.patientName}
                </p>
                <p className="mb-4 text-sm text-gray-600">
                  <span className="font-medium">Current Schedule:</span> {formatDate(selectedAppointment.appointment_date)} at {formatTime(selectedAppointment.appointment_time)}
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="reschedule-date" className="block text-sm font-medium text-gray-700 mb-1">
                      Select New Date
                    </label>
                    <DatePicker
                      id="reschedule-date"
                      selected={rescheduleDate}
                      onChange={(date) => {
                        setRescheduleDate(date);
                        setSelectedTimeSlot('');
                        fetchAvailableTimeSlots(date, selectedAppointment.branch);
                      }}
                      minDate={new Date()}
                      dateFormat="MMMM d, yyyy"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholderText="Select date"
                    />
                  </div>
                  
                  {rescheduleDate && (
                    <div>
                      <label htmlFor="reschedule-time" className="block text-sm font-medium text-gray-700 mb-1">
                        Select New Time
                      </label>
                      <select
                        id="reschedule-time"
                        value={selectedTimeSlot}
                        onChange={(e) => setSelectedTimeSlot(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Time</option>
                        {availableTimeSlots.map((timeSlot) => (
                          <option key={timeSlot} value={timeSlot}>
                            {formatTime(timeSlot)}
                          </option>
                        ))}
                      </select>
                      
                      {availableTimeSlots.length === 0 && (
                        <p className="mt-2 text-sm text-yellow-600 flex items-center">
                          <FiAlertTriangle className="mr-1" />
                          No available slots for this date. Please select another date.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsRescheduling(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={!rescheduleDate || !selectedTimeSlot}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300"
                >
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appointment List */}
        <div className="bg-white overflow-hidden border border-gray-200 rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {activeTab === 'pending' ? 'Pending Appointments' : 
                activeTab === 'confirmed' ? 'Confirmed Appointments' :
                activeTab === 'completed' ? 'Completed Appointments' :
                activeTab === 'cancelled' ? 'Cancelled/Rejected Appointments' :
                activeTab === 'emergency' ? 'Emergency Appointments' : 'All Appointments'}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {filteredAppointments.length} appointments found
              </p>
            </div>
          </div>
          
          {filteredAppointments.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">No appointments found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
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
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} 
                      className={`hover:bg-gray-50 ${appointment.is_emergency ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patientName}
                              {appointment.is_emergency && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  <FiAlertTriangle className="mr-1" />
                                  Emergency
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.patients?.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(appointment.appointment_date)}</div>
                        <div className="text-sm text-gray-500">{formatTime(appointment.appointment_time)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.branch}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {appointment.doctorName ? (
                          <div className="text-sm text-gray-900">{appointment.doctorName}</div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setIsViewingDetails(true);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                            title="View Details"
                          >
                            <FiClipboard className="h-5 w-5" />
                          </button>
                          
                          {/* Assign Doctor Button */}
                          {!appointment.doctorName && ['pending', 'confirmed'].includes(appointment.status) && (
                            <button
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setSelectedDoctorId('');
                                setIsAssigningDoctor(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Assign Doctor"
                            >
                              <FiUserPlus className="h-5 w-5" />
                            </button>
                          )}
                          
                          {/* Approve Button (for pending appointments) */}
                          {appointment.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <FiCheck className="h-5 w-5" />
                            </button>
                          )}
                          
                          {/* Reject Button (for pending appointments) */}
                          {appointment.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(appointment.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <FiX className="h-5 w-5" />
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
    </div>
  );
};

export default AdminAppointments;