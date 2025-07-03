// src/pages/doctor/QueueManagement.jsx - Enhanced with Auto-Payment Flow
import React, { useState, useEffect } from 'react';
import { FiUser, FiClock, FiCheck, FiX, FiArrowRight, FiPlus, FiRefreshCw, FiDollarSign, FiFileText } from 'react-icons/fi';
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [patientToCancel, setPatientToCancel] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [completedPatientData, setCompletedPatientData] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  useEffect(() => {
    fetchQueueData();
    fetchPatients();
  }, []);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const fetchQueueData = async () => {
    setIsLoading(true);
    try {
      const todayDate = getTodayDate();
      console.log('Fetching queue data for today:', todayDate);
      
      // Fetch services for pricing
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*');
        
      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        throw servicesError;
      }
      
      const servicesMap = {};
      if (servicesData) {
        servicesData.forEach(service => {
          servicesMap[service.id] = service;
        });
      }
      
      // Fetch today's appointments
      const { data: todayAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id, 
          patient_id,
          appointment_date,
          appointment_time,
          status,
          notes,
          teeth_involved,
          profiles:patient_id(id, full_name, phone, email),
          appointment_services(id, service_id)
        `)
        .eq('appointment_date', todayDate)
        .in('status', ['confirmed', 'in_progress'])
        .order('appointment_time', { ascending: true });
      
      if (appointmentsError) {
        console.error('Error fetching today\'s appointments:', appointmentsError);
        throw appointmentsError;
      }
      
      console.log(`Found ${todayAppointments?.length || 0} appointments for today`);
      
      // Enrich appointments with service data
      if (todayAppointments && todayAppointments.length > 0) {
        todayAppointments.forEach(appointment => {
          if (appointment.appointment_services && appointment.appointment_services.length > 0) {
            appointment.enrichedServices = appointment.appointment_services
              .map(as => {
                const service = servicesMap[as.service_id];
                return service ? {
                  id: service.id,
                  name: service.name,
                  description: service.description,
                  price: service.price,
                  duration: service.duration || 30
                } : null;
              })
              .filter(s => s !== null);
            
            console.log(`Appointment ${appointment.id} has ${appointment.enrichedServices.length} services:`,
              appointment.enrichedServices.map(s => s.name).join(', '));
          } else {
            console.log(`Appointment ${appointment.id} has no services associated`);
            appointment.enrichedServices = [];
          }
        });
      }
      
      // Fetch queue entries
      const { data: queueData, error: queueError } = await supabase
        .from('queue')
        .select(`
          id, 
          patient_id,
          appointment_id,
          queue_number,
          status,
          estimated_wait_time,
          created_at,
          updated_at,
          profiles:patient_id(id, full_name, phone, email)
        `)
        .in('status', ['waiting', 'serving'])
        .gte('created_at', `${todayDate}T00:00:00`)
        .lte('created_at', `${todayDate}T23:59:59`)
        .order('queue_number', { ascending: true });
      
      if (queueError) {
        console.error('Error fetching queue data:', queueError);
        throw queueError;
      }
      
      console.log(`Found ${queueData?.length || 0} queue entries for today`);
      
      // Merge queue data with appointment data
      let formattedQueue = [];
      
      if (queueData && queueData.length > 0) {
        const appointmentsMap = {};
        if (todayAppointments) {
          todayAppointments.forEach(appointment => {
            appointmentsMap[appointment.id] = appointment;
          });
        }
        
        formattedQueue = queueData.map(item => {
          const matchingAppointment = item.appointment_id ? 
            appointmentsMap[item.appointment_id] : 
            todayAppointments?.find(a => a.patient_id === item.patient_id);
          
          let services = [];
          if (matchingAppointment && matchingAppointment.enrichedServices) {
            services = matchingAppointment.enrichedServices.map(service => ({
              id: service.id,
              name: service.name,
              description: service.description,
              price: service.price,
              duration: service.duration || 30
            }));
          } else {
            if (matchingAppointment) {
              if (matchingAppointment.teeth_involved && matchingAppointment.teeth_involved.trim() !== '') {
                services.push({
                  name: `Treatment for: ${matchingAppointment.teeth_involved}`,
                  description: '',
                  price: '',
                  duration: 30
                });
              }
              
              if (matchingAppointment.notes && matchingAppointment.notes.trim() !== '') {
                services.push({
                  name: matchingAppointment.notes,
                  description: '',
                  price: '',
                  duration: 30
                });
              }
            }
            
            if (services.length === 0) {
              services.push({
                name: 'Dental Consultation',
                description: '',
                price: '500', // Default consultation price
                duration: 30
              });
            }
          }
          
          return {
            id: item.id,
            patientId: item.patient_id,
            appointmentId: item.appointment_id,
            queueNumber: item.queue_number,
            status: item.status,
            name: item.profiles?.full_name || 'Unknown',
            phone: item.profiles?.phone || 'N/A',
            email: item.profiles?.email || 'N/A',
            waitingTime: calculateWaitingTime(item.created_at),
            services: services,
            appointmentData: matchingAppointment
          };
        });
      }
      
      // Set currently serving patient
      const serving = formattedQueue.find(p => p.status === 'serving');
      if (serving) {
        setSelectedPatient(serving);
        const waiting = formattedQueue.filter(p => p.status === 'waiting');
        setWaitingPatients(waiting);
      } else {
        setSelectedPatient(null);
        setWaitingPatients(formattedQueue.filter(p => p.status === 'waiting'));
      }
      
      // Fetch today's activity
      const { data: todayActivity, error: activityError } = await supabase
        .from('queue')
        .select(`
          id, 
          patient_id,
          queue_number,
          status,
          created_at,
          updated_at,
          profiles:patient_id(id, full_name)
        `)
        .in('status', ['completed', 'cancelled'])
        .gte('updated_at', `${todayDate}T00:00:00`)
        .lte('updated_at', `${todayDate}T23:59:59`)
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (activityError) {
        console.error('Error fetching today\'s activity:', activityError);
      } else {
        const newLogs = todayActivity?.map(item => ({
          id: item.id,
          patientName: item.profiles?.full_name || 'Unknown Patient',
          queueNumber: item.queue_number,
          status: item.status,
          timestamp: new Date(item.updated_at).toLocaleString()
        })) || [];
        
        setActivityLogs(newLogs);
      }
      
    } catch (error) {
      console.error('Error in fetchQueueData:', error);
      toast.error('Failed to load queue data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const calculateWaitingTime = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    return Math.floor(diffMs / (1000 * 60));
  };
  
  const fetchPatients = async () => {
    try {
      const todayDate = getTodayDate();
      
      const { data: todayAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          appointment_time,
          profiles:patient_id(id, full_name, phone, email)
        `)
        .eq('appointment_date', todayDate)
        .in('status', ['confirmed', 'in_progress'])
        .order('appointment_time');
      
      if (appointmentsError) throw appointmentsError;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .eq('role', 'patient')
        .order('full_name');
      
      if (error) throw error;
      
      let priorityPatients = [];
      let otherPatients = [];
      
      if (data) {
        data.forEach(patient => {
          const hasAppointment = todayAppointments?.some(
            appointment => appointment.patient_id === patient.id
          );
          
          if (hasAppointment) {
            priorityPatients.push({
              ...patient,
              hasAppointment: true
            });
          } else {
            otherPatients.push({
              ...patient,
              hasAppointment: false
            });
          }
        });
        
        setPatientsList([...priorityPatients, ...otherPatients]);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patient list');
    }
  };
  
  const callNextPatient = async () => {
    if (waitingPatients.length === 0) {
      toast.info('No patients in waiting queue');
      return;
    }
    
    const nextPatient = waitingPatients[0];
    
    try {
      const { error } = await supabase
        .from('queue')
        .update({ status: 'serving' })
        .eq('id', nextPatient.id);
      
      if (error) throw error;
      
      if (nextPatient.appointmentId) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'in_progress' })
          .eq('id', nextPatient.appointmentId);
        
        if (appointmentError) {
          console.error('Could not update appointment status:', appointmentError);
        }
      }
      
      setSelectedPatient(nextPatient);
      setWaitingPatients(waitingPatients.slice(1));
      
      const newLog = {
        id: Date.now(),
        patientName: nextPatient.name,
        queueNumber: nextPatient.queueNumber,
        status: 'called',
        timestamp: new Date().toLocaleString()
      };
      setActivityLogs([newLog, ...activityLogs]);
      
      toast.success(`Now serving: ${nextPatient.name}`);
    } catch (error) {
      console.error('Error calling next patient:', error);
      toast.error('Failed to call next patient');
    }
  };
  
  const callPatient = async (patient) => {
    try {
      if (selectedPatient) {
        await completeCurrentPatient();
      }
      
      const { error } = await supabase
        .from('queue')
        .update({ status: 'serving' })
        .eq('id', patient.id);
      
      if (error) throw error;
      
      if (patient.appointmentId) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'in_progress' })
          .eq('id', patient.appointmentId);
        
        if (appointmentError) {
          console.error('Could not update appointment status:', appointmentError);
        }
      }
      
      setSelectedPatient(patient);
      setWaitingPatients(waitingPatients.filter(p => p.id !== patient.id));
      
      const newLog = {
        id: Date.now(),
        patientName: patient.name,
        queueNumber: patient.queueNumber,
        status: 'called',
        timestamp: new Date().toLocaleString()
      };
      setActivityLogs([newLog, ...activityLogs]);
      
      toast.success(`Now serving: ${patient.name}`);
    } catch (error) {
      console.error('Error calling patient:', error);
      toast.error('Failed to call patient');
      fetchQueueData();
    }
  };
  
  // Enhanced completion with auto-invoice generation
  const completeCurrentPatient = async () => {
    if (!selectedPatient) return;
    
    setCompletingPatient(true);
    
    try {
      // Update queue status to completed
      const { error } = await supabase
        .from('queue')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPatient.id);
      
      if (error) throw error;
      
      // Update appointment status if exists
      if (selectedPatient.appointmentId) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', selectedPatient.appointmentId);
        
        if (appointmentError) {
          console.error('Could not update appointment status:', appointmentError);
        }
      }
      
      // Prepare for invoice generation
      const completedPatient = {
        ...selectedPatient,
        completedAt: new Date().toISOString()
      };
      
      setCompletedPatientData(completedPatient);
      
      // Calculate invoice items from services
      const items = selectedPatient.services.map(service => ({
        service_name: service.name,
        description: service.description || service.name,
        quantity: 1,
        price: parseFloat(service.price) || 0,
        total: parseFloat(service.price) || 0
      }));
      
      setInvoiceItems(items);
      
      const total = items.reduce((sum, item) => sum + item.total, 0);
      setInvoiceTotal(total);
      
      // Show invoice generation modal
      setShowInvoiceModal(true);
      
      toast.success(`Completed session for: ${selectedPatient.name}`);
      
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
  
  // Generate invoice after service completion
  const generateInvoiceForCompletedPatient = async () => {
    if (!completedPatientData) return;
    
    setIsGeneratingInvoice(true);
    
    try {
      // Generate invoice number
      const generateInvoiceNumber = () => {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `INV-${year}${month}${day}-${random}`;
      };
      
      const invoiceData = {
        invoice_number: generateInvoiceNumber(),
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        patient_id: completedPatientData.patientId,
        total_amount: invoiceTotal,
        amount_paid: 0,
        status: 'pending',
        payment_method: '',
        notes: `Services completed on ${new Date().toLocaleDateString()} - Queue #${completedPatientData.queueNumber}`,
        subtotal: invoiceTotal,
        discount: 0,
        tax: 0,
        created_at: new Date().toISOString(),
        created_by: completedPatientData.patientId // Using patient ID as creator for this case
      };
      
      // Insert invoice
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select('id');
      
      if (invoiceError) throw invoiceError;
      
      const invoiceId = invoiceResult[0].id;
      
      // Insert invoice items
      const invoiceItemsData = invoiceItems.map(item => ({
        invoice_id: invoiceId,
        service_name: item.service_name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        discount: 0,
        created_at: new Date().toISOString()
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsData);
      
      if (itemsError) throw itemsError;
      
      toast.success(`Invoice ${invoiceData.invoice_number} generated successfully!`);
      
      // Close modal and refresh
      setShowInvoiceModal(false);
      setCompletedPatientData(null);
      setInvoiceItems([]);
      setInvoiceTotal(0);
      
      fetchQueueData();
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice: ' + error.message);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };
  
  const completePatient = async () => {
    await completeCurrentPatient();
  };
  
  const openCancelModal = () => {
    if (!selectedPatient) return;
    setPatientToCancel(selectedPatient);
    setShowCancelModal(true);
  };
  
  const confirmCancelPatient = async () => {
    if (!patientToCancel) return;
    
    try {
      const { error } = await supabase
        .from('queue')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', patientToCancel.id);
      
      if (error) throw error;
      
      const newLog = {
        id: Date.now(),
        patientName: patientToCancel.name,
        queueNumber: patientToCancel.queueNumber,
        status: 'cancelled',
        timestamp: new Date().toLocaleString()
      };
      setActivityLogs([newLog, ...activityLogs.slice(0, 9)]);
      
      toast.info(`Cancelled: ${patientToCancel.name}`);
      
      if (selectedPatient && selectedPatient.id === patientToCancel.id) {
        setSelectedPatient(null);
      }
      
      fetchQueueData();
    } catch (error) {
      console.error('Error cancelling patient session:', error);
      toast.error('Failed to cancel patient session');
    } finally {
      setShowCancelModal(false);
      setPatientToCancel(null);
    }
  };
  
  const addPatientToQueue = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    
    try {
      const { data: maxQueue, error: maxQueueError } = await supabase
        .from('queue')
        .select('queue_number')
        .order('queue_number', { ascending: false })
        .limit(1);
      
      if (maxQueueError) throw maxQueueError;
      
      const nextQueueNumber = maxQueue && maxQueue.length > 0 ? maxQueue[0].queue_number + 1 : 1;
      const patient = patientsList.find(p => p.id === selectedPatientId);
      
      const todayDate = getTodayDate();
      const { data: patientAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id, 
          status, 
          notes, 
          teeth_involved,
          appointment_services(id, service_id)
        `)
        .eq('patient_id', selectedPatientId)
        .eq('appointment_date', todayDate)
        .in('status', ['confirmed', 'in_progress'])
        .order('appointment_time', { ascending: true })
        .limit(1);
      
      if (appointmentError) {
        console.error('Error checking patient appointment:', appointmentError);
      }
      
      const queueData = {
        patient_id: selectedPatientId,
        appointment_id: patientAppointment && patientAppointment.length > 0 ? patientAppointment[0].id : null,
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
      
      toast.success(`Added ${patient.full_name} to queue`);
      
      const newLog = {
        id: Date.now(),
        patientName: patient.full_name,
        queueNumber: nextQueueNumber,
        status: 'added to queue',
        timestamp: new Date().toLocaleString()
      };
      setActivityLogs([newLog, ...activityLogs.slice(0, 9)]);
      
      setSelectedPatientId('');
      setShowAddPatientModal(false);
      
      fetchQueueData();
    } catch (error) {
      console.error('Error adding patient to queue:', error);
      toast.error('Failed to add patient to queue: ' + error.message);
    }
  };
  
  const removeFromQueue = async (patientId) => {
    if (!window.confirm('Are you sure you want to remove this patient from the queue?')) {
      return;
    }
    
    try {
      const patientToRemove = waitingPatients.find(p => p.id === patientId);
      
      const { error } = await supabase
        .from('queue')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', patientId);
      
      if (error) throw error;
      
      setWaitingPatients(waitingPatients.filter(p => p.id !== patientId));
      
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
  
  const refreshQueue = () => {
    fetchQueueData();
    toast.info('Queue refreshed');
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
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
                              <li key={idx} className="text-gray-700">
                                {service.name}
                                {service.price && (
                                  <span className="text-primary-600 ml-1">
                                    - {formatCurrency(service.price)}
                                  </span>
                                )}
                              </li>
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
                        onClick={openCancelModal}
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
                              </div>
                              {patient.services && patient.services.length > 0 && (
                                <div className="mt-1">
                                  <span className="text-xs text-gray-500">
                                    Services: {patient.services.map(s => s.name).join(', ')}
                                  </span>
                                </div>
                              )}
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
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Today's queue management activities</p>
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
                <p className="text-gray-500">No queue activity recorded today.</p>
              </div>
            )}
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
                              <optgroup label="Patients with today's appointments">
                                {patientsList
                                  .filter(patient => patient.hasAppointment)
                                  .map(patient => (
                                    <option key={patient.id} value={patient.id} className="text-gray-600 font-semibold">
                                      {patient.full_name} {patient.phone ? `(${patient.phone})` : ''} ⭐
                                    </option>
                                  ))
                                }
                              </optgroup>
                              <optgroup label="Other patients">
                                {patientsList
                                  .filter(patient => !patient.hasAppointment)
                                  .map(patient => (
                                    <option key={patient.id} value={patient.id} className="text-gray-600">
                                      {patient.full_name} {patient.phone ? `(${patient.phone})` : ''}
                                    </option>
                                  ))
                                }
                              </optgroup>
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

      {/* Enhanced Invoice Generation Modal */}
      {showInvoiceModal && completedPatientData && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiDollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Generate Invoice</h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Treatment completed for <strong>{completedPatientData.name}</strong> (Queue #{completedPatientData.queueNumber})
                      </p>
                      
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-700 mb-2">Services Provided:</h4>
                        <div className="space-y-2">
                          {invoiceItems.map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-sm">{item.service_name}</div>
                                {item.description && item.description !== item.service_name && (
                                  <div className="text-xs text-gray-500">{item.description}</div>
                                )}
                              </div>
                              <div className="text-sm font-medium">
                                {formatCurrency(item.price)}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="border-t border-gray-300 pt-2 mt-3">
                          <div className="flex justify-between items-center font-bold">
                            <span>Total Amount:</span>
                            <span className="text-lg">{formatCurrency(invoiceTotal)}</span>
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
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  onClick={generateInvoiceForCompletedPatient}
                  disabled={isGeneratingInvoice}
                >
                  {isGeneratingInvoice ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FiFileText className="mr-2 h-4 w-4" />
                      Generate Invoice
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setCompletedPatientData(null);
                    setInvoiceItems([]);
                    setInvoiceTotal(0);
                  }}
                >
                  Skip Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowCancelModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiX className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Cancel Patient Session
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to cancel the session for this patient? This action cannot be undone.
                      </p>
                      
                      {patientToCancel && (
                        <div className="mt-3 bg-gray-50 p-3 rounded-md">
                          <div className="flex items-center text-sm">
                            <FiUser className="mr-2 text-gray-500" />
                            <span className="font-medium">{patientToCancel.name}</span>
                          </div>
                          <div className="flex items-center text-sm mt-1">
                            <span className="text-gray-500">Queue #{patientToCancel.queueNumber}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmCancelPatient}
                >
                  Cancel Session
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowCancelModal(false);
                    setPatientToCancel(null);
                  }}
                >
                  Go Back
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