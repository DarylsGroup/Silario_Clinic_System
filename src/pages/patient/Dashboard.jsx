// src/pages/patient/Dashboard.jsx - Enhanced with Queue Integration
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { 
  FiCalendar, FiClock, FiAlertCircle, FiFileText, 
  FiCreditCard, FiUser, FiPlus, FiChevronRight, FiActivity,
  FiUsers, FiBell, FiMapPin, FiArrowRight
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentTreatments, setRecentTreatments] = useState([]);
  const [queuePosition, setQueuePosition] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [waitingList, setWaitingList] = useState([]);
  const [currentlyServing, setCurrentlyServing] = useState(null);
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [isYourTurn, setIsYourTurn] = useState(false);
  const [showAutoJoinModal, setShowAutoJoinModal] = useState(false);
  const [availableToJoinQueue, setAvailableToJoinQueue] = useState([]);
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [showPaymentRedirect, setShowPaymentRedirect] = useState(false);
  const notificationSound = useRef(null);

  useEffect(() => {
    // Create audio element for notification
    notificationSound.current = new Audio('/notification-sound.mp3');
    
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch upcoming appointments
        const today = new Date().toISOString();
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id, 
            appointment_date, 
            appointment_time, 
            status, 
            branch,
            teeth_involved,
            notes,
            is_emergency,
            created_at,
            services:appointment_services(
              service_id(id, name, description, price, duration)
            ),
            durations:appointment_durations(
              duration_minutes
            )
          `)
          .eq('patient_id', user.id)
          .gte('appointment_date', today.split('T')[0])
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true })
          .limit(3);
        
        if (appointmentsError) throw appointmentsError;

        // Format the services for each appointment and add duration info
        const formattedAppointments = appointmentsData ? appointmentsData.map(appointment => ({
          ...appointment,
          serviceIds: appointment.services?.map(s => s.service_id.id) || [],
          serviceNames: appointment.services?.map(s => s.service_id.name) || [],
          duration: appointment.durations && appointment.durations.length > 0 
            ? appointment.durations[0].duration_minutes 
            : appointment.services?.reduce((total, s) => 
                total + (s.service_id.duration || 30), 0) || 30
        })) : [];
        
        setUpcomingAppointments(formattedAppointments);

        // Check for confirmed appointments today that can join queue
        const todayAppointments = formattedAppointments.filter(apt => {
          const today = new Date().toISOString().split('T')[0];
          return apt.appointment_date === today && apt.status === 'confirmed';
        });

        setAvailableToJoinQueue(todayAppointments);

        // Auto-show queue join modal if there are appointments today
        if (todayAppointments.length > 0) {
          const hasActiveQueue = await checkActiveQueue();
          if (!hasActiveQueue) {
            setShowAutoJoinModal(true);
          }
        }

        // Fetch recent treatments
        const { data: treatmentsData, error: treatmentsError } = await supabase
          .from('treatments')
          .select(`
            id,
            treatment_date,
            tooth_number,
            diagnosis,
            procedure,
            doctor:doctor_id (full_name)
          `)
          .eq('patient_id', user.id)
          .order('treatment_date', { ascending: false })
          .limit(3);
        
        if (treatmentsError) throw treatmentsError;
        setRecentTreatments(treatmentsData || []);

        // Fetch queue information
        await fetchQueueInformation();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }

    // Cleanup
    return () => {
      if (notificationSound.current) {
        notificationSound.current.pause();
        notificationSound.current.currentTime = 0;
      }
    };
  }, [user]);

  const checkActiveQueue = async () => {
    try {
      const todayDate = getTodayDate();
      const { data, error } = await supabase
        .from('queue')
        .select('id')
        .eq('patient_id', user.id)
        .in('status', ['waiting', 'serving'])
        .gte('created_at', `${todayDate}T00:00:00`)
        .lte('created_at', `${todayDate}T23:59:59`)
        .single();
      
      return !!data;
    } catch (error) {
      return false;
    }
  };

  const fetchQueueInformation = async () => {
    try {
      const todayDate = getTodayDate();
      
      // Get currently serving patient
      const { data: servingData, error: servingError } = await supabase
        .from('queue')
        .select(`
          id,
          queue_number,
          status,
          estimated_wait_time,
          created_at,
          profiles:patient_id(full_name)
        `)
        .eq('status', 'serving')
        .gte('created_at', `${todayDate}T00:00:00`)
        .lte('created_at', `${todayDate}T23:59:59`)
        .single();
      
      if (servingError && servingError.code !== 'PGRST116') {
        console.error('Error fetching serving patient:', servingError);
      }
      
      setCurrentlyServing(servingData || null);
      
      // Check if patient is in queue today
      const { data: myQueueData, error: myQueueError } = await supabase
        .from('queue')
        .select(`
          id, 
          queue_number, 
          status, 
          estimated_wait_time,
          created_at,
          appointment_id
        `)
        .eq('patient_id', user.id)
        .in('status', ['waiting', 'serving', 'completed'])
        .gte('created_at', `${todayDate}T00:00:00`)
        .lte('created_at', `${todayDate}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (myQueueError && myQueueError.code !== 'PGRST116') {
        console.error('Error fetching queue status:', myQueueError);
      }
      
      // Set your queue position
      setQueuePosition(myQueueData || null);
      
      // Check for completed session that needs payment
      if (myQueueData && myQueueData.status === 'completed' && !completedSession) {
        // Get appointment details for payment redirect
        if (myQueueData.appointment_id) {
          const { data: appointmentData } = await supabase
            .from('appointments')
            .select('id, status')
            .eq('id', myQueueData.appointment_id)
            .single();
          
          if (appointmentData && appointmentData.status === 'completed') {
            setCompletedSession(myQueueData);
            setShowPaymentRedirect(true);
          }
        }
      }
      
      // Update isYourTurn status
      if (myQueueData && myQueueData.status === 'serving') {
        if (!isYourTurn) {
          setIsYourTurn(true);
          // Play notification sound
          if (notificationSound.current) {
            notificationSound.current.play().catch(e => console.log('Could not play notification sound', e));
          }
          toast.success("🦷 It's your turn now! Please proceed to the dental clinic.", {
            position: "top-center",
            autoClose: false,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      } else {
        setIsYourTurn(false);
      }
      
      // Get waiting list
      const { data: waitingData, error: waitingError } = await supabase
        .from('queue')
        .select(`
          id,
          queue_number,
          status,
          estimated_wait_time,
          created_at,
          profiles:patient_id(full_name)
        `)
        .eq('status', 'waiting')
        .gte('created_at', `${todayDate}T00:00:00`)
        .lte('created_at', `${todayDate}T23:59:59`)
        .order('queue_number', { ascending: true });
      
      if (waitingError) {
        console.error('Error fetching waiting list:', waitingError);
      }
      
      // Format waiting list with anonymized names for privacy
      const formattedWaitingList = waitingData ? waitingData.map(patient => {
        const isCurrentUser = patient.profiles && 
                             myQueueData && 
                             patient.queue_number === myQueueData.queue_number;
        
        let displayName;
        if (isCurrentUser) {
          displayName = 'You';
        } else if (patient.profiles && patient.profiles.full_name) {
          const nameParts = patient.profiles.full_name.split(' ');
          displayName = nameParts.map(part => `${part.charAt(0)}.`).join(' ');
        } else {
          displayName = 'Patient';
        }
        
        return {
          id: patient.id,
          queueNumber: patient.queue_number,
          name: displayName,
          waitingTime: calculateWaitingTime(patient.created_at),
          isCurrentUser
        };
      }) : [];
      
      setWaitingList(formattedWaitingList);
      
      // Calculate queue status
      if (myQueueData && myQueueData.status !== 'completed') {
        const position = formattedWaitingList.findIndex(p => p.isCurrentUser);
        const patientsAhead = position >= 0 ? position : 0;
        const estimatedMinutes = patientsAhead * 15;
        
        setQueueStatus({
          patientsAhead,
          estimatedMinutes,
          queueNumber: myQueueData.queue_number,
          status: myQueueData.status
        });
      } else {
        setQueueStatus(null);
      }
      
    } catch (error) {
      console.error('Error fetching queue information:', error);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const calculateWaitingTime = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    return Math.floor(diffMs / (1000 * 60));
  };

  const joinQueue = async (appointmentId) => {
    setJoiningQueue(true);
    try {
      // Get the next queue number
      const { data: maxQueue, error: maxQueueError } = await supabase
        .from('queue')
        .select('queue_number')
        .order('queue_number', { ascending: false })
        .limit(1);
      
      if (maxQueueError) throw maxQueueError;
      
      const nextQueueNumber = maxQueue && maxQueue.length > 0 ? maxQueue[0].queue_number + 1 : 1;
      
      // Create queue entry
      const queueData = {
        patient_id: user.id,
        appointment_id: appointmentId,
        queue_number: nextQueueNumber,
        status: 'waiting',
        estimated_wait_time: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('queue')
        .insert([queueData]);
      
      if (error) throw error;
      
      toast.success(`Successfully joined the queue! Your number is ${nextQueueNumber}`);
      setShowAutoJoinModal(false);
      
      // Refresh queue information
      await fetchQueueInformation();
    } catch (error) {
      console.error('Error joining queue:', error);
      toast.error('Failed to join queue: ' + error.message);
    } finally {
      setJoiningQueue(false);
    }
  };

  const handlePaymentRedirect = () => {
    setShowPaymentRedirect(false);
    navigate('/patient/payments');
  };

  const dismissPaymentRedirect = () => {
    setShowPaymentRedirect(false);
    setCompletedSession(null);
  };

  // Setup subscription for real-time updates
  useEffect(() => {
    if (!user) return;
    
    const queueSubscription = supabase
      .channel('queue-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'queue'
      }, handleQueueChange)
      .subscribe();
    
    return () => {
      supabase.removeChannel(queueSubscription);
    };
  }, [user]);

  const handleQueueChange = async (payload) => {
    await fetchQueueInformation();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const formatTime = (timeStr) => {
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    const [hours, minutes] = timeStr.split(':');
    return new Date(0, 0, 0, hours, minutes).toLocaleTimeString('en-US', options);
  };

  const calculateEndTime = (startTimeStr, durationMinutes) => {
    if (!startTimeStr) return '';
    
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {profile?.full_name || 'Patient'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's an overview of your dental care information.
        </p>
      </div>

      {/* Payment Redirect Alert */}
      {showPaymentRedirect && completedSession && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow-md p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FiCreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3 flex-grow">
              <h3 className="text-lg font-bold text-green-800">
                Treatment Completed!
              </h3>
              <div className="mt-2">
                <p className="text-green-700 font-medium">
                  Your dental session has been completed. Please proceed to make your payment.
                </p>
                <p className="text-green-700 mt-2">
                  Queue session #{completedSession.queue_number} - Treatment completed
                </p>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handlePaymentRedirect}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <FiArrowRight className="mr-2 h-4 w-4" />
                  Go to Payment
                </button>
                <button
                  onClick={dismissPaymentRedirect}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IT'S YOUR TURN Alert */}
      {isYourTurn && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow-md p-6 animate-pulse">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FiBell className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-green-800">
                IT'S YOUR TURN NOW!
              </h3>
              <div className="mt-2">
                <p className="text-green-700 font-medium">
                  Please proceed to the dental clinic. The doctor is ready to see you.
                </p>
                <p className="text-green-700 mt-2">
                  Your queue number: <span className="font-bold text-xl">{queuePosition?.queue_number}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue Status Alert */}
      {queuePosition && queueStatus && !isYourTurn && queueStatus.status !== 'completed' && (
        <div className="bg-primary-50 border-l-4 border-primary-500 rounded-lg shadow-md p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-3 flex-grow">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary-800">
                  You're in the waiting queue!
                </h3>
                <button 
                  onClick={() => setShowWaitingList(!showWaitingList)}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
                >
                  {showWaitingList ? 'Hide waiting list' : 'Show waiting list'}
                  <FiChevronRight className={`ml-1 transform ${showWaitingList ? 'rotate-90' : ''} transition-transform`} />
                </button>
              </div>
              <div className="mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-primary-700">
                      Your queue number: <span className="font-bold text-xl">{queuePosition.queue_number}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-primary-700">
                      Patients ahead of you: <span className="font-bold">{queueStatus.patientsAhead}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-primary-700">
                      Estimated wait: <span className="font-bold">{queueStatus.estimatedMinutes} minutes</span>
                    </p>
                  </div>
                </div>
                
                {currentlyServing && (
                  <div className="mt-3 bg-white p-3 rounded-md">
                    <p className="text-gray-700 font-medium">Currently serving:</p>
                    <div className="flex items-center mt-1">
                      <div className="bg-green-100 rounded-full p-2">
                        <FiUser className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-gray-900 font-medium">Patient #{currentlyServing.queue_number}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Waiting List */}
                {showWaitingList && waitingList.length > 0 && (
                  <div className="mt-4 bg-white rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-700">Today's Waiting List</h4>
                        <span className="text-xs text-gray-500">{waitingList.length} patients waiting</span>
                      </div>
                    </div>
                    <ul className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                      {waitingList.map((patient) => (
                        <li 
                          key={patient.id} 
                          className={`px-4 py-2 ${patient.isCurrentUser ? 'bg-primary-50' : ''} flex justify-between items-center`}
                        >
                          <div className="flex items-center">
                            <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full ${
                              patient.isCurrentUser ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'
                            } text-sm font-medium mr-3`}>
                              {patient.queueNumber}
                            </span>
                            <span className={`text-sm ${patient.isCurrentUser ? 'font-bold text-primary-700' : 'text-gray-700'}`}>
                              {patient.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            Waiting: {patient.waitingTime} mins
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link
          to="/patient/appointments"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center h-full"
        >
          <div className="p-3 bg-primary-100 rounded-full">
            <FiCalendar className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-600">Book Appointment</h3>
          <p className="mt-1 text-sm text-gray-500">Schedule your next dental visit</p>
        </Link>

        <Link
          to="/patient/history"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center h-full"
        >
          <div className="p-3 bg-blue-100 rounded-full">
            <FiFileText className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-600">Dental Charts</h3>
          <p className="mt-1 text-sm text-gray-500">View your Dental Chart</p>
        </Link>

        <Link
          to="/patient/payments"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center h-full"
        >
          <div className="p-3 bg-green-100 rounded-full">
            <FiCreditCard className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-600">Payments</h3>
          <p className="mt-1 text-sm text-gray-500">Manage your billing and payments</p>
        </Link>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Upcoming Appointments</h2>
            <Link to="/patient/appointments" className="text-primary-600 hover:text-primary-900 text-sm font-medium flex items-center">
              View all <FiChevronRight className="ml-1" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-200">
            {upcomingAppointments.map((appointment) => (
              <li key={appointment.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <FiCalendar className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium text-gray-900">
                        {formatDate(appointment.appointment_date)}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTime(appointment.appointment_time)} - {formatTime(calculateEndTime(appointment.appointment_time, appointment.duration))}
                    </p>
                    
                    {appointment.serviceNames && appointment.serviceNames.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Services:</p>
                        <ul className="mt-1 text-sm text-gray-600 space-y-1">
                          {appointment.serviceNames.map((service, index) => (
                            <li key={index} className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2"></div>
                              {service}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {appointment.branch && (
                      <p className="mt-2 text-sm text-gray-600 flex items-center">
                        <FiMapPin className="mr-1 h-4 w-4" />
                        <span className="font-medium">Branch:</span> {appointment.branch}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Auto-Join Queue Modal */}
      {showAutoJoinModal && availableToJoinQueue.length > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900">
                Join Queue Today?
              </h3>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500"
                onClick={() => setShowAutoJoinModal(false)}
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-600">
                You have confirmed appointments today. Would you like to join the queue?
              </p>
              
              <div className="mt-4 space-y-3">
                {availableToJoinQueue.map((appointment) => (
                  <div key={appointment.id} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatTime(appointment.appointment_time)}
                        </p>
                        <p className="text-sm text-gray-600">{appointment.branch} Branch</p>
                        {appointment.serviceNames.length > 0 && (
                          <p className="text-xs text-gray-500">
                            {appointment.serviceNames.join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => joinQueue(appointment.id)}
                        disabled={joiningQueue}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                      >
                        {joiningQueue ? 'Joining...' : 'Join Queue'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setShowAutoJoinModal(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;