// src/pages/doctor/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { 
  FiCalendar, FiClock, FiUser, FiUsers, 
  FiGrid, FiAlertCircle, FiBarChart2, FiCheckCircle,
  FiXCircle, FiChevronRight, FiCheck
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BracesCalendar from "../../pages/doctor/BracesCalendar";
import { toast } from 'react-toastify';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const formatTime = (timeStr) => {
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    const [hours, minutes] = timeStr.split(':');
    return new Date(0, 0, 0, hours, minutes).toLocaleTimeString('en-US', options);
  };

  const handleCompletePatient = async () => {
    if (!currentPatient) return;
    
    try {
      // Update queue status to completed
      const { error: queueError } = await supabase
        .from('queue')
        .update({ status: 'completed' })
        .eq('id', currentPatient.id);
      
      if (queueError) throw queueError;
      
      // If there's an associated appointment, mark it as completed
      if (currentPatient.appointment_id) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', currentPatient.appointment_id);
        
        if (appointmentError) throw appointmentError;
      }
      
      toast.success(`Patient ${currentPatient.patients.full_name} has been marked as completed.`);
      
      // Call the next patient in the queue
      if (waitingPatients.length > 0) {
        const nextPatient = waitingPatients[0];
        
        const { error: nextError } = await supabase
          .from('queue')
          .update({ status: 'serving' })
          .eq('id', nextPatient.id);
        
        if (nextError) throw nextError;
        
        toast.info(`Now serving: Patient #${nextPatient.queue_number} - ${nextPatient.patients.full_name}`);
      } else {
        setCurrentPatient(null);
      }
    } catch (error) {
      console.error('Error completing patient:', error);
      toast.error('Failed to update patient status');
    }
  };
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch doctor profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch today's appointments
        const today = new Date().toISOString().split('T')[0];
        const { data: todayData, error: todayError } = await supabase
          .from('appointments')
          .select(`
            id, 
            appointment_date, 
            appointment_time, 
            status, 
            branch,
            is_emergency,
            teeth_involved,
            notes,
            patients:patient_id (id, full_name, phone),
            services:appointment_services(
              service_id (id, name)
            )
          `)
          .eq('appointment_date', today)
          .eq('status', 'confirmed')
          .order('appointment_time');
        
        if (todayError) throw todayError;
        
        // Format the services for each appointment
        const formattedTodayAppointments = todayData.map(appointment => ({
          ...appointment,
          serviceNames: appointment.services.map(s => s.service_id.name),
        }));
        
        setTodayAppointments(formattedTodayAppointments);

        // Fetch upcoming appointments (future dates)
        const { data: upcomingData, error: upcomingError } = await supabase
          .from('appointments')
          .select(`
            id, 
            appointment_date, 
            appointment_time, 
            status, 
            branch,
            is_emergency,
            patients:patient_id (id, full_name)
          `)
          .gt('appointment_date', today)
          .eq('status', 'confirmed')
          .order('appointment_date')
          .order('appointment_time')
          .limit(5);
        
        if (upcomingError) throw upcomingError;
        setUpcomingAppointments(upcomingData);

        // Fetch current patient in queue (being served)
        const { data: currentData, error: currentError } = await supabase
          .from('queue')
          .select(`
            id,
            queue_number,
            status,
            created_at,
            patient_id,
            patients:patient_id (id, full_name),
            appointment_id,
            appointments:appointment_id (
              branch,
              services:appointment_services(
                service_id (name)
              )
            )
          `)
          .eq('status', 'serving')
          .order('created_at')
          .limit(1)
          .single();
        
        if (currentError && currentError.code !== 'PGRST116') {
          throw currentError;
        }
        
        setCurrentPatient(currentData || null);

        // Fetch waiting patients in queue
        const { data: waitingData, error: waitingError } = await supabase
          .from('queue')
          .select(`
            id,
            queue_number,
            status,
            created_at,
            estimated_wait_time,
            patient_id,
            patients:patient_id (id, full_name),
            appointment_id,
            appointments:appointment_id (
              branch,
              services:appointment_services(
                service_id (name)
              )
            )
          `)
          .eq('status', 'waiting')
          .order('queue_number')
          .limit(5);
        
        if (waitingError) throw waitingError;
        setWaitingPatients(waitingData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }

    // Setup real-time subscription for queue updates
    const queueSubscription = supabase
      .channel('public:queue')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'queue' 
      }, (payload) => {
        // Refresh queue data when there's a change
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(queueSubscription);
    };
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Render specific tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'braces':
        return <BracesCalendar />;
      case 'dashboard':
      default:
        return renderDashboardContent();
    }
  };

  // Main dashboard content
  const renderDashboardContent = () => {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, Dr. {profile?.full_name || 'Doctor'}!
          </h1>
          <p className="text-gray-600 mt-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Current Patient and Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Patient */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Now Serving</h2>
            
            {currentPatient ? (
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-3 py-1 bg-primary-100 text-primary-800 text-lg font-semibold rounded-full mb-2">
                      Patient #{currentPatient.queue_number}
                    </span>
                    <h3 className="text-xl font-medium text-gray-900">
                      {currentPatient.patients.full_name}
                    </h3>
                    <div className="mt-3 space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Branch:</span>{' '}
                        {currentPatient.appointments?.branch || 'Walk-in'}
                      </p>
                      <p>
                        <span className="font-medium">Services:</span>{' '}
                        {currentPatient.appointments?.services.map(s => s.service_id.name).join(', ') || 'Consultation'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between">
                  
                  <button
                    onClick={handleCompletePatient}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <FiCheck className="mr-1" />
                    Complete
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No patient currently being served</p>
                {waitingPatients.length > 0 && (
                  <button
                    onClick={() => {
                      const nextPatient = waitingPatients[0];
                      supabase
                        .from('queue')
                        .update({ status: 'serving' })
                        .eq('id', nextPatient.id)
                        .then(({ error }) => {
                          if (error) {
                            toast.error('Failed to call next patient');
                          } else {
                            toast.success(`Now serving: Patient #${nextPatient.queue_number}`);
                          }
                        });
                    }}
                    className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <FiUser className="mr-1" />
                    Call Next Patient
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Waiting Queue */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Waiting Queue</h2>
              <Link
                to="/doctor/queue"
                className="text-primary-600 hover:text-primary-800 flex items-center text-sm font-medium"
              >
                Manage Queue <FiChevronRight className="ml-1" />
              </Link>
            </div>
            
            <div className="p-6">
              {waitingPatients.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {waitingPatients.map((patient, index) => (
                    <div key={patient.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full mb-2">
                            Queue #{patient.queue_number}
                          </span>
                          <h3 className="font-medium text-gray-900">{patient.patients.full_name}</h3>
                          <div className="mt-1 text-sm text-gray-600">
                            <p>Wait time: ~{patient.estimated_wait_time || ((index + 1) * 15)} mins</p>
                            <p className="truncate">
                              Services: {patient.appointments?.services.map(s => s.service_id.name).join(', ') || 'Consultation'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No patients in the waiting queue</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Today's Appointments</h2>
            <Link
              to="/doctor/appointments"
              className="text-primary-600 hover:text-primary-800 flex items-center text-sm font-medium"
            >
              View All <FiChevronRight className="ml-1" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            {todayAppointments.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Services
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayAppointments.map((appointment) => (
                    <tr key={appointment.id} className={appointment.is_emergency ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(appointment.appointment_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patients.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.patients.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {appointment.serviceNames.join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {appointment.branch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          appointment.is_emergency 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {appointment.is_emergency ? 'Emergency' : 'Confirmed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => {
                            // Check if patient is already in queue
                            supabase
                              .from('queue')
                              .select('id')
                              .eq('patient_id', appointment.patients.id)
                              .in('status', ['waiting', 'serving'])
                              .then(({ data, error }) => {
                                if (error) {
                                  toast.error('Error checking queue status');
                                  return;
                                }
                                
                                if (data && data.length > 0) {
                                  toast.info('Patient is already in the queue');
                                  return;
                                }
                                
                                // Add patient to queue
                                supabase
                                  .from('queue')
                                  .insert({
                                    patient_id: appointment.patients.id,
                                    appointment_id: appointment.id,
                                    status: 'waiting',
                                    created_at: new Date().toISOString(),
                                    estimated_wait_time: 15, // Default 15 min wait time
                                  })
                                  .then(({ error: insertError }) => {
                                    if (insertError) {
                                      toast.error('Failed to add patient to queue');
                                    } else {
                                      toast.success('Patient added to waiting queue');
                                    }
                                  });
                              });
                          }}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Add to Queue
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No appointments scheduled for today</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary-800">
                <FiCalendar className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Today's Appointments</h3>
                <p className="text-2xl font-semibold text-gray-900">{todayAppointments.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-800">
                <FiUser className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Patients in Queue</h3>
                <p className="text-2xl font-semibold text-gray-900">{waitingPatients.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-800">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Upcoming Appointments</h3>
                <p className="text-2xl font-semibold text-gray-900">{upcomingAppointments.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-800">
                <FiAlertCircle className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Emergency Cases</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {todayAppointments.filter(a => a.is_emergency).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Dashboard Navigation Tabs */}
      <div className="bg-white rounded-lg shadow px-6 py-4">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium text-sm rounded-md mr-2 ${
              activeTab === 'dashboard'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Main Dashboard
          </button>
          <button
            onClick={() => setActiveTab('braces')}
            className={`px-4 py-2 font-medium text-sm rounded-md mr-2 ${
              activeTab === 'braces'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Braces Calendar
          </button>
        </div>
      </div>

      {/* Content Area */}
      {renderTabContent()}
    </div>
  );
};

export default DoctorDashboard;