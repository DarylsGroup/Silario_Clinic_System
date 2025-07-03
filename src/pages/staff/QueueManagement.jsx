// src/pages/staff/QueueManagement.jsx
import React, { useState, useEffect } from 'react';
import { FiUser, FiClock, FiCheck, FiX, FiArrowRight, FiPlus, FiRefreshCw } from 'react-icons/fi';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const QueueManagement = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [activityLogs, setActivityLogs] = useState([]);
  const [completingPatient, setCompletingPatient] = useState(false);
  const [activeBranch, setActiveBranch] = useState('all');

  // Fetch initial data
  useEffect(() => {
    fetchQueueData();
    fetchPatients();
  }, [activeBranch]);

  const fetchQueueData = async () => {
    setIsLoading(true);
    try {
      // Build query based on selected branch
      let query = supabase
        .from('queue')
        .select(`
          id, 
          patient_id,
          queue_number,
          status,
          estimated_wait_time,
          created_at,
          profiles:patient_id(id, full_name, phone, email),
          appointments!queue_appointment_id_fkey(branch)
        `)
        .in('status', ['waiting', 'serving'])
        .order('queue_number', { ascending: true });
      
      // Apply branch filter if not 'all'
      if (activeBranch !== 'all') {
        const branchName = activeBranch === 'cabugao' ? 'Cabugao' : 'San Juan';
        query = query.eq('appointments.branch', branchName);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Format queue data for display
      const formattedQueue = data.map(item => ({
        id: item.id,
        patientId: item.patient_id,
        queueNumber: item.queue_number,
        status: item.status,
        name: item.profiles?.full_name || 'Unknown',
        phone: item.profiles?.phone || 'N/A',
        email: item.profiles?.email || 'N/A',
        waitingTime: calculateWaitingTime(item.created_at),
        services: ['Dental Consultation'], // Default service
        branch: item.appointments?.branch || 'Not specified'
      }));
      
      // Set currently serving patient
      const serving = formattedQueue.find(p => p.status === 'serving');
      if (serving) {
        setSelectedPatient(serving);
        
        // Remove serving patient from waiting list
        const waiting = formattedQueue.filter(p => p.status === 'waiting');
        setWaitingPatients(waiting);
      } else {
        setSelectedPatient(null);
        setWaitingPatients(formattedQueue.filter(p => p.status === 'waiting'));
      }
      
      // Add some sample activity logs if none exist yet
      if (activityLogs.length === 0) {
        setActivityLogs([
          {
            id: 1,
            patientName: 'Recent Patients',
            queueNumber: '-',
            status: 'completed',
            timestamp: new Date().toLocaleString()
          }
        ]);
      }
      
    } catch (error) {
      console.error('Error fetching queue data:', error);
      toast.error('Failed to load queue data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to calculate waiting time in minutes
  const calculateWaitingTime = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    return Math.floor(diffMs / (1000 * 60)); // Convert ms to minutes
  };
  
  // Fetch patients list for adding to queue
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .eq('role', 'patient')
        .order('full_name');
      
      if (error) throw error;
      setPatientsList(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };
  
  // Call next patient
  const callNextPatient = async () => {
    if (waitingPatients.length === 0) {
      toast.info('No patients in waiting queue');
      return;
    }
    
    const nextPatient = waitingPatients[0];
    
    try {
      // Update the queue status to 'serving'
      const { error } = await supabase
        .from('queue')
        .update({ status: 'serving' })
        .eq('id', nextPatient.id);
      
      if (error) throw error;
      
      setSelectedPatient(nextPatient);
      setWaitingPatients(waitingPatients.slice(1)); // Remove patient from waiting list
      
      toast.success(`Now serving: ${nextPatient.name}`);
    } catch (error) {
      console.error('Error calling next patient:', error);
      toast.error('Failed to call next patient');
    }
  };
  
  // Call a specific patient from the waiting list
  const callPatient = async (patient) => {
    try {
      // If there's already a patient being served, complete their session first
      if (selectedPatient) {
        await completeCurrentPatient();
      }
      
      // Update the queue status to 'serving'
      const { error } = await supabase
        .from('queue')
        .update({ status: 'serving' })
        .eq('id', patient.id);
      
      if (error) throw error;
      
      setSelectedPatient(patient);
      setWaitingPatients(waitingPatients.filter(p => p.id !== patient.id));
      
      toast.success(`Now serving: ${patient.name}`);
    } catch (error) {
      console.error('Error calling patient:', error);
      toast.error('Failed to call patient');
      
      // Refresh data in case of error
      fetchQueueData();
    }
  };
  
  // Complete current patient's session
  const completeCurrentPatient = async () => {
    if (!selectedPatient) return;
    
    setCompletingPatient(true);
    
    try {
      // Update the queue status to 'completed'
      const { error } = await supabase
        .from('queue')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPatient.id);
      
      if (error) throw error;
      
      toast.success(`Completed: ${selectedPatient.name}`);
      
      // Update the local activity logs
      const newLog = {
        id: Date.now(),
        patientName: selectedPatient.name,
        queueNumber: selectedPatient.queueNumber,
        status: 'completed',
        timestamp: new Date().toLocaleString()
      };
      setActivityLogs([newLog, ...activityLogs.slice(0, 9)]);
      
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error completing patient session:', error);
      toast.error('Failed to complete patient session');
    } finally {
      setCompletingPatient(false);
    }
  };
  
  // Complete current patient session
  const completePatient = async () => {
    await completeCurrentPatient();
    fetchQueueData(); // Refresh the queue
  };
  
  // Cancel current patient's session
  const cancelPatient = async () => {
    if (!selectedPatient) return;
    
    if (!window.confirm(`Are you sure you want to cancel the session for ${selectedPatient.name}?`)) {
      return;
    }
    
    try {
      // Update the queue status to 'cancelled'
      const { error } = await supabase
        .from('queue')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPatient.id);
      
      if (error) throw error;
      
      // Update the local activity logs
      const newLog = {
        id: Date.now(),
        patientName: selectedPatient.name,
        queueNumber: selectedPatient.queueNumber,
        status: 'cancelled',
        timestamp: new Date().toLocaleString()
      };
      setActivityLogs([newLog, ...activityLogs.slice(0, 9)]);
      
      toast.info(`Cancelled: ${selectedPatient.name}`);
      setSelectedPatient(null);
      
      // Refresh queue data
      fetchQueueData();
    } catch (error) {
      console.error('Error cancelling patient session:', error);
      toast.error('Failed to cancel patient session');
    }
  };
  
  // Add a new patient to the queue
  const addPatientToQueue = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    
    try {
      // Get the next queue number
      const { data: maxQueue, error: maxQueueError } = await supabase
        .from('queue')
        .select('queue_number')
        .order('queue_number', { ascending: false })
        .limit(1);
      
      if (maxQueueError) throw maxQueueError;
      
      const nextQueueNumber = maxQueue && maxQueue.length > 0 ? maxQueue[0].queue_number + 1 : 1;
      
      // Get selected patient info
      const patient = patientsList.find(p => p.id === selectedPatientId);
      
      // Create minimal queue entry
      const queueData = {
        patient_id: selectedPatientId,
        queue_number: nextQueueNumber,
        status: 'waiting',
        estimated_wait_time: 15
      };
      
      // Insert into queue table
      const { error } = await supabase
        .from('queue')
        .insert([queueData]);
      
      if (error) throw error;
      
      toast.success(`Added ${patient.full_name} to queue`);
      
      // Update the local activity logs
      const newLog = {
        id: Date.now(),
        patientName: patient.full_name,
        queueNumber: nextQueueNumber,
        status: 'added to queue',
        timestamp: new Date().toLocaleString()
      };
      setActivityLogs([newLog, ...activityLogs.slice(0, 9)]);
      
      // Reset form fields
      setSelectedPatientId('');
      setShowAddPatientModal(false);
      
      // Refresh queue data
      fetchQueueData();
    } catch (error) {
      console.error('Error adding patient to queue:', error);
      toast.error('Failed to add patient to queue: ' + error.message);
    }
  };
  
  // Remove a patient from the waiting list
  const removeFromQueue = async (patientId) => {
    if (!window.confirm('Are you sure you want to remove this patient from the queue?')) {
      return;
    }
    
    try {
      const patientToRemove = waitingPatients.find(p => p.id === patientId);
      
      // Update the queue status to 'cancelled'
      const { error } = await supabase
        .from('queue')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', patientId);
      
      if (error) throw error;
      
      // Update waiting list
      setWaitingPatients(waitingPatients.filter(p => p.id !== patientId));
      
      // Update activity logs
      const newLog = {
        id: Date.now(),
        patientName: patientToRemove.name,
        queueNumber: patientToRemove.queueNumber,
        status: 'removed from queue',
        timestamp: new Date().toLocaleString()
      };
      setActivityLogs([newLog, ...activityLogs.slice(0, 9)]);
      
      toast.info(`Removed patient from queue`);
    } catch (error) {
      console.error('Error removing patient from queue:', error);
      toast.error('Failed to remove patient from queue');
    }
  };
  
  // Refresh queue data
  const refreshQueue = () => {
    fetchQueueData();
    toast.info('Queue refreshed');
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Queue Management</h1>
          <div className="flex space-x-2">
            <button 
              onClick={refreshQueue}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              title="Refresh queue"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Branch Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveBranch('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeBranch === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Branches
            </button>
            <button
              onClick={() => setActiveBranch('cabugao')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeBranch === 'cabugao'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cabugao Branch
            </button>
            <button
              onClick={() => setActiveBranch('sanjuan')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeBranch === 'sanjuan'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              San Juan Branch
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Patient */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-primary-50 border-b border-primary-100">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Now Serving</h3>
              </div>
              <div className="p-6">
                {selectedPatient ? (
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <FiUser className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-gray-900">{selectedPatient.name}</h4>
                        <p className="text-sm text-gray-500">Queue #{selectedPatient.queueNumber}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start">
                        <FiClock className="mt-1 mr-2 h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Waiting time: {selectedPatient.waitingTime} minutes
                        </span>
                      </div>
                      <div className="flex items-start">
                        <div className="mr-2 h-4 w-4 text-gray-400">🦷</div>
                        <div className="text-sm text-gray-600">
                          <div>Services:</div>
                          <ul className="list-disc list-inside ml-1 mt-1">
                            {selectedPatient.services.map((service, idx) => (
                              <li key={idx}>{service}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
                        onClick={completePatient}
                        disabled={completingPatient}
                      >
                        {completingPatient ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        ) : (
                          <FiCheck className="mr-2" />
                        )}
                        Complete
                      </button>
                      <button 
                        className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={cancelPatient}
                      >
                        <FiX className="mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto h-12 w-12 text-gray-400">
                      <FiUser className="h-full w-full" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active patient</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Call the next patient from the waiting list.
                    </p>
                    {waitingPatients.length > 0 && (
                      <div className="mt-6">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={callNextPatient}
                        >
                          <FiArrowRight className="-ml-1 mr-2 h-5 w-5" />
                          Call Next Patient
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Waiting List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Waiting List</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Patients in queue: {waitingPatients.length}</p>
                </div>
                <button 
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setShowAddPatientModal(true)}
                >
                  <FiPlus className="mr-1" />
                  Add Patient
                </button>
              </div>
              <div>
                {waitingPatients.length > 0 ? (
                  <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {waitingPatients.map((patient) => (
                      <li key={patient.id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <FiUser className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                              <div className="flex items-center flex-wrap">
                                <span className="text-xs text-gray-500">Queue #{patient.queueNumber}</span>
                                <span className="mx-1.5 text-gray-500">•</span>
                                <span className="text-xs text-gray-500">Waiting: {patient.waitingTime} mins</span>
                                {patient.branch && activeBranch === 'all' && (
                                  <>
                                    <span className="mx-1.5 text-gray-500">•</span>
                                    <span className="text-xs text-gray-500">{patient.branch}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                              onClick={() => callPatient(patient)}
                            >
                              Call
                            </button>
                            <button
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              onClick={() => removeFromQueue(patient.id)}
                            >
                              <FiX className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No patients in the waiting queue.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="mt-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Queue Activity Log</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Recent queue management activities</p>
            </div>
            {activityLogs.length > 0 ? (
              <div className="overflow-x-auto">
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
                        Queue #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.timestamp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{log.patientName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.queueNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${log.status === 'completed' ? 'bg-green-100 text-green-800' : 
                             log.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                             log.status === 'called' ? 'bg-blue-100 text-blue-800' :
                             log.status === 'added to queue' ? 'bg-yellow-100 text-yellow-800' :
                             'bg-gray-100 text-gray-800'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500">No recent queue activity.</p>
              </div>
            )}
          </div>
        </div>

        {/* Digital Display for Waiting Area */}
        <div className="mt-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Queue Display</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Digital display for waiting area</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-6 bg-blue-50 text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Now Serving</h4>
                  <div className="text-4xl font-bold text-blue-700">
                    {selectedPatient ? selectedPatient.queueNumber : '-'}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedPatient ? selectedPatient.name : 'No patient currently being served'}
                  </p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-6 bg-green-50 text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Next in Line</h4>
                  <div className="text-4xl font-bold text-green-700">
                    {waitingPatients.length > 0 ? waitingPatients[0].queueNumber : '-'}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {waitingPatients.length > 0 ? waitingPatients[0].name : 'No patients waiting'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Waiting List</h4>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  {waitingPatients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {waitingPatients.slice(0, 6).map((patient) => (
                        <div key={patient.id} className="text-center">
                          <div className="text-lg font-semibold text-gray-700">#{patient.queueNumber}</div>
                          <div className="text-sm text-gray-600">{patient.name}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">No patients in the waiting queue.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Patient to Queue Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiPlus className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Add Patient to Queue</h3>
                    <div className="mt-4">
                      <div className="space-y-4">
                        {/* Patient Selector */}
                        <div>
                          <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700">
                            Select Patient
                          </label>
                          <div className="mt-1">
                            <select
                              id="patient-select"
                              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-100 text-gray-600"
                              value={selectedPatientId}
                              onChange={(e) => setSelectedPatientId(e.target.value)}
                              style={{ color: 'rgb(75, 85, 99)' }}
                            >
                              <option value="" className="text-gray-600">Select a patient</option>
                              {patientsList.map(patient => (
                                <option key={patient.id} value={patient.id} className="text-gray-600">
                                  {patient.full_name} {patient.phone ? `(${patient.phone})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={addPatientToQueue}
                >
                  Add to Queue
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowAddPatientModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueManagement;