// src/pages/patient/Appointments.jsx - Enhanced with Location-Based Branch Suggestion
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { 
  FiCalendar, FiClock, FiMapPin, FiUser, FiCheck, 
  FiX, FiEdit, FiTrash2, FiAlertTriangle, FiArrowLeft,
  FiBell, FiInfo, FiDownload, FiDollarSign, FiUsers,
  FiNavigation, FiTarget, FiGlobe
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Branch coordinates for distance calculation
const BRANCH_COORDINATES = {
  'Cabugao': {
    lat: 17.7641, // Approximate coordinates for Cabugao, Ilocos Sur
    lng: 120.4183,
    address: 'Cabugao, Ilocos Sur'
  },
  'San Juan': {
    lat: 17.7305, // Approximate coordinates for San Juan, Ilocos Sur  
    lng: 120.3428,
    address: 'San Juan, Ilocos Sur'
  }
};

// Validation schema
const appointmentSchema = Yup.object().shape({
  branch: Yup.string().required('Branch is required'),
  appointment_date: Yup.date()
    .required('Appointment date is required')
    .min(new Date(), 'Appointment date must be in the future'),
  appointment_time: Yup.string().required('Appointment time is required'),
  service_id: Yup.array()
    .min(1, 'Please select at least one service')
    .required('Please select at least one service'),
  teeth_involved: Yup.string(),
  notes: Yup.string().max(500, 'Notes must be less than 500 characters'),
  is_emergency: Yup.boolean(),
  agree_terms: Yup.boolean()
    .oneOf([true], 'You must agree to the cancellation policy')
});

const PatientAppointments = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [formattedTimeSlots, setFormattedTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState(30);
  const [serviceDurations, setServiceDurations] = useState({});
  const [filterStatus, setFilterStatus] = useState('upcoming');
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [setParentFormFieldValue, setSetParentFormFieldValue] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'cancel', 'reschedule'
  const [selectedAppointmentForAction, setSelectedAppointmentForAction] = useState(null);
  const [appointmentDurations, setAppointmentDurations] = useState({});
  const [autoJoinQueue, setAutoJoinQueue] = useState(true);
  const [showQueueJoinOptions, setShowQueueJoinOptions] = useState(false);
  
  // Location-based branch suggestion states
  const [userLocation, setUserLocation] = useState(null);
  const [nearestBranch, setNearestBranch] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [branchDistances, setBranchDistances] = useState({});
  const [showLocationSuggestion, setShowLocationSuggestion] = useState(false);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance; // Distance in kilometers
  };

  // Get user's current location
  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });

      // Calculate distances to branches
      const distances = {};
      let closest = null;
      let minDistance = Infinity;

      Object.entries(BRANCH_COORDINATES).forEach(([branchName, coords]) => {
        const distance = calculateDistance(latitude, longitude, coords.lat, coords.lng);
        distances[branchName] = {
          distance: distance,
          distanceText: distance < 1 
            ? `${Math.round(distance * 1000)}m away`
            : `${distance.toFixed(1)}km away`
        };

        if (distance < minDistance) {
          minDistance = distance;
          closest = branchName;
        }
      });

      setBranchDistances(distances);
      setNearestBranch(closest);
      setShowLocationSuggestion(true);

      toast.success(`Found your location! ${closest} branch is nearest to you.`);
    } catch (error) {
      console.error('Error getting location:', error);
      
      let errorMessage = 'Unable to get your location';
      if (error.code === 1) {
        errorMessage = 'Location access denied. Please enable location services to get branch suggestions.';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please check your GPS settings.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      
      setLocationError(errorMessage);
      toast.info(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  // Auto-suggest branch when form opens
  useEffect(() => {
    if (showForm && !editingAppointment && !userLocation && !locationError) {
      // Only try to get location if we haven't tried before and user is booking a new appointment
      getUserLocation();
    }
  }, [showForm, editingAppointment]);

  // Enhanced fetchAppointmentDurations function
  const fetchAppointmentDurations = async (appointmentIds) => {
    if (!appointmentIds || appointmentIds.length === 0) return {};
    
    try {
      const { data, error } = await supabase
        .from('appointment_durations')
        .select('*')
        .in('appointment_id', appointmentIds);
      
      if (error) {
        console.error('Error fetching durations:', error);
        return {};
      }
      
      if (!data || data.length === 0) return {};
      
      const durationsMap = {};
      data.forEach(record => {
        if (!durationsMap[record.appointment_id]) {
          durationsMap[record.appointment_id] = [];
        }
        durationsMap[record.appointment_id].push(record);
      });
      
      const result = {};
      Object.keys(durationsMap).forEach(appointmentId => {
        const sortedRecords = durationsMap[appointmentId].sort((a, b) => {
          const aDate = a.updated_at || a.created_at;
          const bDate = b.updated_at || b.created_at;
          return new Date(bDate) - new Date(aDate);
        });
        
        if (sortedRecords.length > 0) {
          result[appointmentId] = parseInt(sortedRecords[0].duration_minutes, 10);
        }
      });
      
      return result;
    } catch (err) {
      console.error('Error in fetchAppointmentDurations:', err);
      return {};
    }
  };

  const calculateEstimatedCost = (selectedServiceIds) => {
    if (!selectedServiceIds?.length) return 0;
    
    let totalPrice = 0;
    selectedServiceIds.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        totalPrice += parseFloat(service.price) || 0;
      }
    });
    
    return totalPrice;
  };

  const getDurationSourceText = (appointmentId) => {
    if (appointmentDurations[appointmentId]) {
      return "(Set by doctor)";
    }
    return "(Based on services)";
  };

  // Fetch appointments and services
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, description, price, duration, category')
          .order('name');
        
        if (servicesError) throw servicesError;
        
        const servicesMap = {};
        servicesData.forEach(service => {
          servicesMap[service.id] = service;
        });
        
        setServices(servicesData);
        
        const durationMap = {};
        servicesData.forEach(service => {
          durationMap[service.id] = service.duration || 30;
        });
        setServiceDurations(durationMap);
        
        // Fetch appointments
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
            created_at
          `)
          .eq('patient_id', user.id)
          .order('appointment_date', { ascending: false });
        
        if (appointmentsError) throw appointmentsError;
        
        const appointmentIds = appointmentsData.map(a => a.id);
        const doctorSetDurations = await fetchAppointmentDurations(appointmentIds);
        setAppointmentDurations(doctorSetDurations);
        
        // Fetch appointment services
        const { data: appointmentServicesData, error: appointmentServicesError } = await supabase
          .from('appointment_services')
          .select('id, appointment_id, service_id')
          .in('appointment_id', appointmentIds);
        
        if (appointmentServicesError) {
          console.error('Error fetching appointment services:', appointmentServicesError);
        }
        
        // Combine data
        const formattedAppointments = appointmentsData.map(appointment => {
          const appointmentServices = appointmentServicesData?.filter(
            as => as.appointment_id === appointment.id
          ) || [];
          
          const serviceObjects = appointmentServices.map(as => {
            const service = servicesMap[as.service_id];
            return service || null;
          }).filter(Boolean);
          
          const serviceIds = serviceObjects.map(s => s.id);
          const serviceNames = serviceObjects.map(s => s.name);
          
          const calculatedDuration = serviceObjects.reduce(
            (total, s) => total + (s.duration || 30), 
            0
          ) || 30;
          
          const finalDuration = doctorSetDurations[appointment.id] || calculatedDuration;
          
          return {
            ...appointment,
            serviceIds,
            serviceNames,
            duration: finalDuration
          };
        });
        
        setAppointments(formattedAppointments);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load appointments data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchData();
    }
  }, [user]);

  // Filter appointments
  useEffect(() => {
    if (!appointments.length) {
      setFilteredAppointments([]);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered;
    switch (filterStatus) {
      case 'upcoming':
        filtered = appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.appointment_date);
          return appointmentDate >= today && 
                appointment.status !== 'cancelled' && 
                appointment.status !== 'completed';
        });
        break;
      case 'past':
        filtered = appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.appointment_date);
          return appointmentDate < today || 
                appointment.status === 'cancelled' || 
                appointment.status === 'completed';
        });
        break;
      default:
        filtered = [...appointments];
        break;
    }

    setFilteredAppointments(filtered);
  }, [appointments, filterStatus]);

  const calculateAppointmentDuration = (selectedServiceIds) => {
    if (!selectedServiceIds || selectedServiceIds.length === 0) return 30;
    
    let totalDuration = 0;
    selectedServiceIds.forEach(serviceId => {
      totalDuration += serviceDurations[serviceId] || 30;
    });
    
    return Math.max(totalDuration, 30);
  };

  // Enhanced time slot fetching with queue awareness
  const fetchAvailableTimeSlots = async (date, branch, durationMinutes = 30) => {
    if (!date || !branch) return;
  
    const formattedDate = date.toISOString().split('T')[0];
    
    localStorage.setItem('temp_selected_branch', branch);
    localStorage.setItem('temp_selected_date', formattedDate);
    
    try {
      // Get branch working hours
      let startHour, endHour, interval = 30;
      
      if (branch === 'Cabugao') {
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 0) {
          setAvailableTimeSlots([]);
          setFormattedTimeSlots([]);
          return;
        } else if (dayOfWeek === 6) {
          startHour = 8;
          endHour = 17;
        } else {
          startHour = 8;
          endHour = 12;
        }
      } else if (branch === 'San Juan') {
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 6) {
          setAvailableTimeSlots([]);
          setFormattedTimeSlots([]);
          return;
        } else if (dayOfWeek === 0) {
          startHour = 8;
          endHour = 17;
        } else {
          startHour = 13;
          endHour = 17;
        }
      }
  
      // Get booked slots including queue considerations
      const { data: bookedAppointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          branch
        `)
        .eq('appointment_date', formattedDate)
        .eq('branch', branch)
        .neq('status', 'cancelled');
      
      if (error) throw error;
      
      const appointmentIds = bookedAppointments.map(a => a.id).filter(Boolean);
      const doctorSetDurations = await fetchAppointmentDurations(appointmentIds);
      
      const blockedTimeSlots = new Set();
  
      bookedAppointments.forEach(appointment => {
        let appointmentDuration = doctorSetDurations[appointment.id] || 30;
        
        const [hours, minutes] = appointment.appointment_time.split(':').map(Number);
        const startTimeMinutes = hours * 60 + minutes;
        
        for (let i = 0; i < appointmentDuration; i += interval) {
          const blockHour = Math.floor((startTimeMinutes + i) / 60);
          const blockMinute = (startTimeMinutes + i) % 60;
          const blockTimeString = `${blockHour.toString().padStart(2, '0')}:${blockMinute.toString().padStart(2, '0')}`;
          blockedTimeSlots.add(blockTimeString);
        }
      });

      // Generate available time slots
      const allTimeSlots = [];
      const formattedSlots = [];
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          let isSlotAvailable = true;
          for (let i = 0; i < durationMinutes; i += interval) {
            const checkHour = Math.floor((hour * 60 + minute + i) / 60);
            const checkMinute = (hour * 60 + minute + i) % 60;
            
            if (checkHour >= endHour) {
              isSlotAvailable = false;
              break;
            }
            
            const checkTimeString = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`;
            if (blockedTimeSlots.has(checkTimeString)) {
              isSlotAvailable = false;
              break;
            }
          }
          
          if (isSlotAvailable) {
            allTimeSlots.push(timeString);
            
            formattedSlots.push({
              time: timeString,
              available: true,
              displayTime: formatTime(timeString),
              endTime: formatTime(calculateEndTime(timeString, durationMinutes))
            });
          } else {
            formattedSlots.push({
              time: timeString,
              available: false,
              displayTime: formatTime(timeString),
              endTime: formatTime(calculateEndTime(timeString, durationMinutes))
            });
          }
        }
      }
      
      setAvailableTimeSlots(allTimeSlots);
      setFormattedTimeSlots(formattedSlots);
      
    } catch (error) {
      console.error('Error fetching available time slots:', error);
      toast.error('Failed to load available time slots');
    }
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

  // Enhanced booking with auto-queue functionality
  const handleBooking = async (values, { resetForm, setSubmitting }) => {
    try {
      const duration = calculateAppointmentDuration(values.service_id);
      
      const appointmentData = {
        patient_id: user.id,
        branch: values.branch,
        appointment_date: values.appointment_date.toISOString().split('T')[0],
        appointment_time: values.appointment_time,
        teeth_involved: values.teeth_involved || '',
        notes: values.notes || '',
        is_emergency: values.is_emergency || false,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
  
      let appointmentId;
      
      if (editingAppointment) {
        // Update existing appointment
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', editingAppointment.id)
          .select('id');
        
        if (error) throw error;
        appointmentId = editingAppointment.id;
        
        // Delete existing service associations
        await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', appointmentId);
        
        toast.success('Appointment updated successfully!');
      } else {
        // Insert new appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select('id');
        
        if (error) throw error;
        appointmentId = data[0].id;
        
        toast.success('Appointment booked successfully!');
      }

      // Insert appointment services
      if (values.service_id && values.service_id.length > 0) {
        const serviceAssociations = values.service_id.map(serviceId => ({
          appointment_id: appointmentId,
          service_id: serviceId,
        }));

        await supabase
          .from('appointment_services')
          .insert(serviceAssociations);
      }

      // Check if appointment is for today and auto-join queue if confirmed
      const appointmentDate = values.appointment_date.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      if (appointmentDate === today && autoJoinQueue) {
        setShowQueueJoinOptions(true);
        // Store appointment ID for queue joining
        localStorage.setItem('pending_queue_appointment', appointmentId);
      }

      // Clean up
      localStorage.removeItem('temp_selected_branch');
      localStorage.removeItem('temp_selected_date');
      localStorage.removeItem('temp_selected_time');
      localStorage.removeItem('temp_form_values');

      resetForm();
      setShowForm(false);
      setShowTimeSlots(false);
      setEditingAppointment(null);
      
      // Refresh appointments
      refreshAppointments();
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-join queue after appointment confirmation
  const handleQueueJoin = async (shouldJoin) => {
    const appointmentId = localStorage.getItem('pending_queue_appointment');
    
    if (shouldJoin && appointmentId) {
      try {
        // Get next queue number
        const { data: maxQueue, error: maxQueueError } = await supabase
          .from('queue')
          .select('queue_number')
          .order('queue_number', { ascending: false })
          .limit(1);
        
        if (maxQueueError) throw maxQueueError;
        
        const nextQueueNumber = maxQueue && maxQueue.length > 0 ? maxQueue[0].queue_number + 1 : 1;
        
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
      } catch (error) {
        console.error('Error joining queue:', error);
        toast.error('Failed to join queue: ' + error.message);
      }
    }
    
    localStorage.removeItem('pending_queue_appointment');
    setShowQueueJoinOptions(false);
  };

  const refreshAppointments = async () => {
    try {
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
          created_at
        `)
        .eq('patient_id', user.id)
        .order('appointment_date', { ascending: false });
      
      if (appointmentsError) throw appointmentsError;
      
      const appointmentIds = appointmentsData.map(a => a.id);
      const doctorSetDurations = await fetchAppointmentDurations(appointmentIds);
      setAppointmentDurations(doctorSetDurations);
      
      const { data: appointmentServicesData, error: appointmentServicesError } = await supabase
        .from('appointment_services')
        .select('id, appointment_id, service_id')
        .in('appointment_id', appointmentIds);
      
      if (appointmentServicesError) {
        console.error('Error fetching appointment services:', appointmentServicesError);
      }
      
      const formattedAppointments = appointmentsData.map(appointment => {
        const appointmentServices = appointmentServicesData?.filter(
          as => as.appointment_id === appointment.id
        ) || [];
        
        const serviceIds = [];
        const serviceNames = [];
        
        let calculatedDuration = 30;
        
        if (appointmentServices.length > 0) {
          appointmentServices.forEach(as => {
            const service = services.find(s => s.id === as.service_id);
            if (service) {
              serviceIds.push(service.id);
              serviceNames.push(service.name);
              calculatedDuration += (service.duration || 30) - 30;
            }
          });
        }
        
        const finalDuration = doctorSetDurations[appointment.id] || Math.max(calculatedDuration, 30);
        
        return {
          ...appointment,
          serviceIds,
          serviceNames,
          duration: finalDuration
        };
      });
      
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
      toast.error('Failed to refresh appointments');
    }
  };

  // Enhanced edit function with branch change support
  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
    setShowTimeSlots(false);
    
    const dateParts = appointment.appointment_date.split('-');
    const date = new Date(
      parseInt(dateParts[0]), 
      parseInt(dateParts[1]) - 1, 
      parseInt(dateParts[2])
    );
    
    setSelectedDate(date);
    setSelectedBranch(appointment.branch);
    
    const duration = appointment.duration || calculateAppointmentDuration(appointment.serviceIds);
    setEstimatedDuration(duration);
    
    fetchAvailableTimeSlots(date, appointment.branch, duration);
  };

  // Unified cancel/reschedule modal
  const openActionModal = (appointment, type) => {
    setSelectedAppointmentForAction(appointment);
    setActionType(type);
    setShowActionModal(true);
  };

  const handleAppointmentAction = async () => {
    if (!selectedAppointmentForAction) return;
    
    try {
      if (actionType === 'cancel') {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', selectedAppointmentForAction.id)
          .eq('patient_id', user.id);
        
        if (error) throw error;
        
        setAppointments(appointments.map(appointment => 
          appointment.id === selectedAppointmentForAction.id 
            ? { ...appointment, status: 'cancelled' } 
            : appointment
        ));
        
        toast.success('Appointment cancelled successfully');
      } else if (actionType === 'reschedule') {
        // Start reschedule process
        handleEditAppointment(selectedAppointmentForAction);
      }
    } catch (error) {
      console.error('Error handling appointment action:', error);
      toast.error(`Failed to ${actionType} appointment: ${error.message}`);
    } finally {
      setShowActionModal(false);
      setSelectedAppointmentForAction(null);
      setActionType('');
    }
  };

  const handleServiceChange = (selectedServices, setFieldValue) => {
    const duration = calculateAppointmentDuration(selectedServices);
    setEstimatedDuration(duration);
    
    if (selectedDate && selectedBranch) {
      fetchAvailableTimeSlots(selectedDate, selectedBranch, duration);
    }
    
    setFieldValue('service_id', selectedServices);
  };

  const addToCalendar = (appointment) => {
    const startDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const endDateTime = new Date(startDateTime.getTime() + (appointment.duration || 30) * 60000);
    
    const startTime = startDateTime.toISOString().replace(/-|:|\.\d+/g, '');
    const endTime = endDateTime.toISOString().replace(/-|:|\.\d+/g, '');
    
    const services = appointment.serviceNames.join(', ');
    const location = `${appointment.branch} Branch - Silario Dental Clinic`;
    
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Dental Appointment: ${services}&dates=${startTime}/${endTime}&details=Appointment at Silario Dental Clinic.${appointment.notes ? ' Notes: ' + appointment.notes : ''}&location=${encodeURIComponent(location)}`;
    
    window.open(gcalUrl, '_blank');
    toast.success('Opening Google Calendar');
  };

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
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
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'no-show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isAppointmentEditable = (appointment) => {
    const isPendingOrConfirmed = ['pending', 'confirmed'].includes(appointment.status.toLowerCase());
    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return isPendingOrConfirmed && appointmentDate >= today;
  };

  const canCancelAppointment = (appointment) => {
    const isPendingOrConfirmed = ['pending', 'confirmed'].includes(appointment.status.toLowerCase());
    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return isPendingOrConfirmed && appointmentDate >= today;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Appointments</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowTimeSlots(false);
              setEditingAppointment(null);
              setSelectedDate(null);
              setSelectedBranch('');
              setAvailableTimeSlots([]);
              setEstimatedDuration(30);
              setShowLocationSuggestion(false);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {showForm ? 'Cancel' : 'Book New Appointment'}
          </button>
        </div>

        {/* Time Slot Selection View */}
        {showForm && showTimeSlots && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <button 
                onClick={() => setShowTimeSlots(false)}
                className="mr-3 p-2 rounded-md hover:bg-gray-100"
                aria-label="Back to form"
              >
                <FiArrowLeft />
              </button>
              <h2 className="text-xl font-semibold text-gray-800">
                Available Time Slots
              </h2>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center text-gray-600 mb-2">
                <FiMapPin className="mr-2" /> {selectedBranch} Branch
                {branchDistances[selectedBranch] && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({branchDistances[selectedBranch].distanceText})
                  </span>
                )}
              </div>
              <div className="flex items-center text-gray-600">
                <FiCalendar className="mr-2" /> 
                {selectedDate && selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
              <div className="flex items-center text-gray-600 mt-2">
                <FiClock className="mr-2" /> 
                Estimated Duration: {estimatedDuration} minutes
              </div>
            </div>
            
            {formattedTimeSlots.length === 0 ? (
              <div className="py-8 text-center bg-yellow-50 rounded-md border border-yellow-100">
                <FiAlertTriangle className="mx-auto h-8 w-8 text-yellow-400 mb-2" />
                <p className="text-yellow-800">
                  No available slots for this date. The {selectedBranch} branch is 
                  {selectedBranch === 'Cabugao' && ' closed on Sundays.'}
                  {selectedBranch === 'San Juan' && ' closed on Saturdays.'}
                </p>
                <button
                  onClick={() => setShowTimeSlots(false)}
                  className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Select Another Date
                </button>
              </div>
            ) : (
              <Formik
                initialValues={{
                  formTime: editingAppointment?.appointment_time || localStorage.getItem('temp_selected_time') || '',
                }}
                onSubmit={(values, actions) => {
                  if (values.formTime) {
                    if (setParentFormFieldValue) {
                      localStorage.setItem('temp_selected_time', values.formTime);
                      setParentFormFieldValue('appointment_time', values.formTime);
                      setSelectedTimeSlot(values.formTime);
                      
                      setTimeout(() => {
                        setShowTimeSlots(false);
                        toast.success('Time slot selected');
                      }, 100);
                    } else {
                      toast.error('Unable to set time slot, please try again');
                    }
                  } else {
                    toast.error('Please select a time slot');
                  }
                  actions.setSubmitting(false);
                }}
              >
                {({ values, setFieldValue, handleSubmit, isSubmitting }) => (
                  <Form>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                      {formattedTimeSlots.map((slot) => (
                        <div key={slot.time}>
                          <label
                            className={`
                              block border rounded-md py-3 px-4 text-center cursor-pointer transition-all
                              ${values.formTime === slot.time 
                                ? 'bg-primary-600 text-white border-primary-600' 
                                : ''
                              }
                              ${!slot.available 
                                ? 'opacity-50 bg-gray-100 cursor-not-allowed' 
                                : 'hover:border-primary-500 hover:bg-primary-50'
                              }
                            `}
                          >
                            <Field
                              type="radio"
                              name="formTime"
                              value={slot.time}
                              disabled={!slot.available}
                              className="sr-only"
                              onClick={() => setFieldValue('formTime', slot.time)}
                            />
                            <span className="block font-medium">{slot.displayTime}</span>
                            <span className="block text-xs mt-1">
                              to {slot.endTime}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowTimeSlots(false)}
                        className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!values.formTime || isSubmitting}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300"
                      >
                        Confirm Selection
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            )}
          </div>
        )}

        {/* Enhanced Appointment Booking Form with Location-Based Branch Suggestion */}
        {showForm && !showTimeSlots && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingAppointment ? 'Reschedule Appointment' : 'Book a New Appointment'}
            </h2>
            
            {/* Location-Based Branch Suggestion */}
            {showLocationSuggestion && nearestBranch && !editingAppointment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <FiTarget className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-grow">
                    <h3 className="text-blue-900 font-medium">Recommended Branch Based on Your Location</h3>
                    <p className="text-blue-800 text-sm mt-1">
                      <strong>{nearestBranch} Branch</strong> is closest to you 
                      ({branchDistances[nearestBranch]?.distanceText}).
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBranch(nearestBranch);
                          localStorage.setItem('temp_selected_branch', nearestBranch);
                          setShowLocationSuggestion(false);
                          toast.success(`Selected ${nearestBranch} branch`);
                        }}
                        className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <FiMapPin className="mr-1 h-4 w-4" />
                        Select {nearestBranch}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLocationSuggestion(false)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
                      >
                        <FiX className="mr-1 h-4 w-4" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Location Request */}
            {!userLocation && !locationLoading && !showLocationSuggestion && !editingAppointment && !locationError && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <FiNavigation className="h-6 w-6 text-gray-500 mr-3" />
                  <div className="flex-grow">
                    <h3 className="text-gray-900 font-medium">Get Branch Recommendation</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Allow location access to find the nearest branch to you.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={getUserLocation}
                    className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <FiGlobe className="mr-1 h-4 w-4" />
                    Find Nearest Branch
                  </button>
                </div>
              </div>
            )}

            {/* Location Loading */}
            {locationLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                  <div>
                    <h3 className="text-blue-900 font-medium">Getting your location...</h3>
                    <p className="text-blue-800 text-sm">Please allow location access in your browser.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Location Error */}
            {locationError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <FiAlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-grow">
                    <h3 className="text-yellow-900 font-medium">Location Access Unavailable</h3>
                    <p className="text-yellow-800 text-sm mt-1">{locationError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationError(null);
                        getUserLocation();
                      }}
                      className="inline-flex items-center px-3 py-1 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 mt-2"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <Formik
              initialValues={{
                branch: editingAppointment?.branch || selectedBranch || localStorage.getItem('temp_selected_branch') || '',
                appointment_date: editingAppointment ? 
                  new Date(editingAppointment.appointment_date) : 
                  (localStorage.getItem('temp_selected_date') ? 
                    new Date(localStorage.getItem('temp_selected_date')) : null),
                appointment_time: editingAppointment?.appointment_time || localStorage.getItem('temp_selected_time') || '',
                service_id: editingAppointment?.serviceIds || [],
                teeth_involved: editingAppointment?.teeth_involved || '',
                notes: editingAppointment?.notes || '',
                is_emergency: editingAppointment?.is_emergency || false,
                agree_terms: editingAppointment ? true : false,
              }}
              validationSchema={appointmentSchema}
              onSubmit={handleBooking}
              enableReinitialize={true}
            >
              {({ isSubmitting, setFieldValue, values, errors, touched }) => {
                useEffect(() => {
                  setSetParentFormFieldValue(() => setFieldValue);
                  
                  const storedBranch = localStorage.getItem('temp_selected_branch');
                  const storedDate = localStorage.getItem('temp_selected_date');
                  const storedTime = localStorage.getItem('temp_selected_time');
                  
                  if (storedBranch && values.branch !== storedBranch) {
                    setFieldValue('branch', storedBranch);
                    setSelectedBranch(storedBranch);
                  }
                  
                  if (selectedBranch && values.branch !== selectedBranch) {
                    setFieldValue('branch', selectedBranch);
                  }
                  
                  if (storedDate && (!values.appointment_date || values.appointment_date.toISOString().split('T')[0] !== storedDate)) {
                    const dateObj = new Date(storedDate);
                    setFieldValue('appointment_date', dateObj);
                    setSelectedDate(dateObj);
                  }
                  
                  if (storedTime && values.appointment_time !== storedTime) {
                    setFieldValue('appointment_time', storedTime);
                    setSelectedTimeSlot(storedTime);
                  }
                }, [setFieldValue, values.branch, values.appointment_date, values.appointment_time, selectedBranch]);
                
                return (
                  <Form className="space-y-4">
                    {editingAppointment && (
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                        <p className="text-blue-800 font-medium">
                          Rescheduling appointment from {formatDate(editingAppointment.appointment_date)} at {formatTime(editingAppointment.appointment_time)}
                        </p>
                        <p className="text-blue-700 text-sm mt-1">
                          You can change the branch, date, and time as needed.
                        </p>
                      </div>
                    )}

                    {/* Branch and Date Selection */}
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
                          Select Branch <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiMapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <Field
                            as="select"
                            id="branch"
                            name="branch"
                            className="block w-full pl-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-100 text-gray-600"
                            onChange={(e) => {
                              const newBranch = e.target.value;
                              setFieldValue('branch', newBranch);
                              setSelectedBranch(newBranch);
                              localStorage.setItem('temp_selected_branch', newBranch);
                              setFieldValue('appointment_date', null);
                              setSelectedDate(null);
                              localStorage.removeItem('temp_selected_date');
                              setFieldValue('appointment_time', '');
                              localStorage.removeItem('temp_selected_time');
                            }}
                            style={{ color: 'rgb(75, 85, 99)' }}
                          >
                            <option value="" className="text-gray-600">Select Branch</option>
                            <option value="Cabugao" className="text-gray-600">
                              Cabugao Branch
                              {branchDistances.Cabugao && ` (${branchDistances.Cabugao.distanceText})`}
                            </option>
                            <option value="San Juan" className="text-gray-600">
                              San Juan Branch
                              {branchDistances['San Juan'] && ` (${branchDistances['San Juan'].distanceText})`}
                            </option>
                          </Field>
                        </div>
                        <ErrorMessage name="branch" component="p" className="mt-1 text-sm text-red-600" />
                        {values.branch && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p className="font-medium">{values.branch} Branch Hours:</p>
                            {values.branch === 'Cabugao' ? (
                              <div>
                                <p>Monday to Friday: 8:00 AM - 12:00 PM</p>
                                <p>Saturday: 8:00 AM - 5:00 PM</p>
                                <p>Sunday: Closed</p>
                              </div>
                            ) : (
                              <div>
                                <p>Monday to Friday: 1:00 PM - 5:00 PM</p>
                                <p>Saturday: Closed</p>
                                <p>Sunday: 8:00 AM - 5:00 PM</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <label htmlFor="appointment_date" className="block text-sm font-medium text-gray-700 mb-1">
                          Select Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiCalendar className="h-5 w-5 text-gray-400" />
                          </div>
                          <DatePicker
                            id="appointment_date"
                            selected={values.appointment_date}
                            onChange={(date) => {
                              setFieldValue('appointment_date', date);
                              setSelectedDate(date);
                              localStorage.setItem('temp_selected_date', date.toISOString().split('T')[0]);
                              setFieldValue('appointment_time', '');
                              localStorage.removeItem('temp_selected_time');
                              if (values.branch) {
                                fetchAvailableTimeSlots(date, values.branch, estimatedDuration);
                              }
                            }}
                            minDate={new Date()}
                            filterDate={(date) => {
                              const day = date.getDay();
                              if (values.branch === 'Cabugao') {
                                return day !== 0;
                              } else if (values.branch === 'San Juan') {
                                return day !== 6;
                              }
                              return true;
                            }}
                            dateFormat="MMMM d, yyyy"
                            className="block w-full pl-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            placeholderText="Select date"
                            disabled={!values.branch}
                          />
                        </div>
                        <ErrorMessage name="appointment_date" component="p" className="mt-1 text-sm text-red-600" />
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Time <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiClock className="h-5 w-5 text-gray-400" />
                        </div>
                        
                        {values.appointment_time ? (
                          <div className="flex items-center">
                            <div className="block w-full pl-10 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50">
                              {formatTime(values.appointment_time)} 
                              {estimatedDuration && (
                                <span className="text-gray-500">
                                  {" "} - {formatTime(calculateEndTime(values.appointment_time, estimatedDuration))}
                                  {" "} ({estimatedDuration} mins)
                                </span>
                              )}
                            </div>
                            <button
                              type="button" 
                              onClick={() => {
                                if (values.appointment_date && values.branch) {
                                  fetchAvailableTimeSlots(values.appointment_date, values.branch, estimatedDuration);
                                  setShowTimeSlots(true);
                                } else {
                                  toast.error('Please select a branch and date first');
                                }
                              }}
                              className="ml-2 p-2 bg-gray-100 rounded-md hover:bg-gray-200"
                              title="Change time"
                            >
                              <FiEdit className="h-5 w-5 text-gray-600" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (values.appointment_date && values.branch) {
                                fetchAvailableTimeSlots(values.appointment_date, values.branch, estimatedDuration);
                                setShowTimeSlots(true);
                              } else {
                                toast.error('Please select a branch and date first');
                              }
                            }}
                            disabled={!values.appointment_date || !values.branch}
                            className="w-full flex items-center pl-10 py-2 border border-gray-300 rounded-md text-left text-gray-700 disabled:bg-gray-100 disabled:text-gray-500 hover:bg-gray-50"
                          >
                            Select available time slot
                          </button>
                        )}
                      </div>
                      <ErrorMessage name="appointment_time" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    {/* Services Selection - Single Column */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Dental Services <span className="text-red-500">*</span>
                      </label>
                      
                      {services.length === 0 ? (
                        <div className="py-4 text-center bg-yellow-50 rounded-md border border-yellow-100">
                          <p className="text-yellow-800">
                            No services are available. Please contact the clinic for assistance.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 grid grid-cols-1 gap-3">
                            {services.map(service => (
                              <div 
                                key={service.id} 
                                className={`relative flex items-start p-3 rounded-md border ${
                                  values.service_id.includes(service.id) 
                                    ? 'bg-primary-50 border-primary-300' 
                                    : 'bg-gray-50 border-gray-200 hover:border-primary-300'
                                }`}
                              >
                                <div className="flex items-center h-5">
                                  <Field
                                    type="checkbox"
                                    id={`service_${service.id}`}
                                    name="service_id"
                                    value={service.id}
                                    onChange={(e) => {
                                      const currentServices = [...values.service_id];
                                      
                                      if (e.target.checked) {
                                        currentServices.push(service.id);
                                      } else {
                                        const index = currentServices.indexOf(service.id);
                                        if (index !== -1) {
                                          currentServices.splice(index, 1);
                                        }
                                      }
                                      
                                      handleServiceChange(currentServices, setFieldValue);
                                    }}
                                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                  />
                                </div>
                                <div className="ml-3 text-sm flex-grow">
                                  <label htmlFor={`service_${service.id}`} className="font-medium text-gray-700 cursor-pointer">
                                    {service.name || 'Unnamed Service'}
                                  </label>
                                  <p className="text-gray-500 text-xs mt-1">{service.description || 'No description available'}</p>
                                  <div className="flex justify-between mt-2">
                                    <span className="text-primary-600 font-medium">
                                      ₱{service.price ? parseFloat(service.price).toLocaleString() : '0'}
                                    </span>
                                    <span className="text-gray-500 text-xs">{service.duration || 30} mins</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {estimatedDuration > 0 && values.service_id.length > 0 && (
                            <div className="mt-3 bg-primary-50 p-2 rounded-md">
                              <div className="flex items-center">
                                <FiClock className="h-4 w-4 text-primary-600 mr-2" />
                                <span className="text-primary-700 text-sm">
                                  Estimated appointment duration: <strong>{estimatedDuration} minutes</strong>
                                </span>
                              </div>
                              <div className="flex items-center mt-2">
                              <span className="h-4 w-4 text-primary-600 mr-2">₱</span>
                                <span className="text-primary-700 text-sm">
                                  Estimated cost: <strong>₱{calculateEstimatedCost(values.service_id).toLocaleString()}</strong>
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <ErrorMessage name="service_id" component="div" className="mt-2 text-sm text-red-600 font-medium" />
                        </>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes (Optional)
                      </label>
                      <Field
                        as="textarea"
                        id="notes"
                        name="notes"
                        rows={3}
                        placeholder="Any additional information you'd like to provide"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage name="notes" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    {/* Auto-Queue Option */}
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <Field
                            id="auto_join_queue"
                            name="auto_join_queue"
                            type="checkbox"
                            checked={autoJoinQueue}
                            onChange={(e) => setAutoJoinQueue(e.target.checked)}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="auto_join_queue" className="font-medium text-blue-800">
                            Auto-join queue for today's appointments
                          </label>
                          <p className="text-blue-700">
                            If this appointment is scheduled for today, automatically join the waiting queue after booking.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <Field
                            id="agree_terms"
                            name="agree_terms"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="agree_terms" className="font-medium text-gray-700">
                            I agree to the cancellation policy <span className="text-red-500">*</span>
                          </label>
                          <p className="text-gray-500">
                            Appointments must be canceled at least 24 hours in advance. 
                          </p>
                        </div>
                      </div>
                      <ErrorMessage name="agree_terms" component="div" className="mt-2 text-sm text-red-600 font-medium" />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !values.appointment_time || values.service_id.length === 0 || !values.agree_terms}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          `${editingAppointment ? 'Update' : 'Book'} Appointment`
                        )}
                      </button>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        )}

        {/* Appointments List */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Appointments</h2>
          
          {/* Filter Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setFilterStatus('all')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                  filterStatus === 'all'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Appointments
              </button>
              <button
                onClick={() => setFilterStatus('upcoming')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                  filterStatus === 'upcoming'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilterStatus('past')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                  filterStatus === 'past'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Past
              </button>
            </nav>
          </div>
          
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              {appointments.length === 0 ? (
                <>
                  <p className="text-gray-500 mb-4">You don't have any appointments yet.</p>
                  {!showForm && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      Book Your First Appointment
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No {filterStatus} appointments found.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => {
                const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
                const now = new Date();
                const timeDiff = appointmentDate - now;
                const isWithin24Hours = timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000;
                const isPast = appointmentDate < now;
                
                return (
                  <div 
                    key={appointment.id}
                    className={`bg-white rounded-lg border p-4 ${
                      appointment.status.toLowerCase() === 'cancelled' ? 'border-gray-200 opacity-75' : 'border-gray-300'
                    } ${isWithin24Hours && appointment.status === 'confirmed' ? 'border-l-4 border-l-green-500' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <FiCalendar className="text-primary-500" />
                          <span className="font-medium">{formatDate(appointment.appointment_date)}</span>
                          <span className="text-gray-400">•</span>
                          <FiClock className="text-primary-500" />
                          <span>{formatTime(appointment.appointment_time)}</span>
                          <span className="text-gray-400">•</span>
                          <span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </span>
                          
                          {appointment.is_emergency && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center">
                              <FiAlertTriangle className="mr-1" />
                              Emergency
                            </span>
                          )}
                          
                          {isWithin24Hours && appointment.status === 'confirmed' && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                              <FiBell className="mr-1" />
                              Coming up soon
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center">
                          <FiMapPin className="mr-2 text-primary-500" />
                          <span>{appointment.branch} Branch</span>
                          {branchDistances[appointment.branch] && (
                            <span className="ml-2 text-sm text-gray-500">
                              ({branchDistances[appointment.branch].distanceText})
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-sm text-gray-600 flex items-center">
                          <FiClock className="mr-2 text-gray-400" />
                          <span>
                            Duration: {appointment.duration || 30} minutes
                            <span className="text-xs ml-1 text-gray-500">
                              {getDurationSourceText(appointment.id)}
                            </span>
                          </span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span>
                            Ends at: {formatTime(calculateEndTime(appointment.appointment_time, appointment.duration || 30))}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {isAppointmentEditable(appointment) && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditAppointment(appointment)}
                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full"
                            title="Reschedule Appointment"
                          >
                            <FiEdit className="h-5 w-5" />
                          </button>
                          {canCancelAppointment(appointment) && (
                            <button
                              onClick={() => openActionModal(appointment, 'cancel')}
                              className={`p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full ${
                                isWithin24Hours ? 'relative' : ''
                              }`}
                              title={isWithin24Hours 
                                ? "Late cancellation (within 24 hours)" 
                                : "Cancel Appointment"
                              }
                            >
                              <FiX className="h-5 w-5" />
                              {isWithin24Hours && (
                                <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3"></span>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Services:</p>
                          <ul className="text-sm text-gray-600 mt-1 space-y-1">
                            {appointment.serviceNames && appointment.serviceNames.length > 0 ? (
                              appointment.serviceNames.map((service, index) => (
                                <li key={index} className="flex items-center">
                                  <FiCheck className="text-green-500 mr-2 h-4 w-4 flex-shrink-0" />
                                  {service}
                                </li>
                              ))
                            ) : (
                              <li className="flex items-center text-gray-400 italic">
                                <FiInfo className="text-gray-300 mr-2 h-4 w-4 flex-shrink-0" />
                                No services specified
                              </li>
                            )}
                          </ul>
                        </div>
                        
                        <div>
                          {appointment.teeth_involved && (
                            <div className="mb-2">
                              <span className="text-sm font-medium text-gray-700">Teeth Involved:</span>{' '}
                              <span className="text-sm text-gray-600">{appointment.teeth_involved}</span>
                            </div>
                          )}

                          {appointment.notes && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Notes:</span>{' '}
                              <span className="text-sm text-gray-600">{appointment.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Appointment Actions */}
                    {appointment.status === 'confirmed' && !isPast && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleEditAppointment(appointment)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                        >
                          <FiCalendar className="mr-1" /> Reschedule
                        </button>
                        
                        <button
                          onClick={() => addToCalendar(appointment)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          <FiCalendar className="mr-1" /> Add to Calendar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Unified Action Modal (Cancel/Reschedule) */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowActionModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                    actionType === 'cancel' ? 'bg-red-100' : 'bg-blue-100'
                  } sm:mx-0 sm:h-10 sm:w-10`}>
                    {actionType === 'cancel' ? (
                      <FiX className="h-6 w-6 text-red-600" aria-hidden="true" />
                    ) : (
                      <FiEdit className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      {actionType === 'cancel' ? 'Cancel Appointment' : 'Reschedule Appointment'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {actionType === 'cancel' 
                          ? 'Are you sure you want to cancel this appointment? This action cannot be undone.'
                          : 'Would you like to reschedule this appointment to a different date, time, or branch?'
                        }
                      </p>
                      
                      {selectedAppointmentForAction && (
                        <div className="mt-3 bg-gray-50 p-3 rounded-md">
                          <div className="flex items-center text-sm">
                            <FiCalendar className="mr-2 text-gray-500" />
                            <span>{formatDate(selectedAppointmentForAction.appointment_date)}</span>
                          </div>
                          <div className="flex items-center text-sm mt-1">
                            <FiClock className="mr-2 text-gray-500" />
                            <span>{formatTime(selectedAppointmentForAction.appointment_time)}</span>
                          </div>
                          <div className="flex items-center text-sm mt-1">
                            <FiMapPin className="mr-2 text-gray-500" />
                            <span>{selectedAppointmentForAction.branch} Branch</span>
                            {branchDistances[selectedAppointmentForAction.branch] && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({branchDistances[selectedAppointmentForAction.branch].distanceText})
                              </span>
                            )}
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
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    actionType === 'cancel' 
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                  onClick={handleAppointmentAction}
                >
                  {actionType === 'cancel' ? 'Cancel Appointment' : 'Reschedule'}
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowActionModal(false);
                    setSelectedAppointmentForAction(null);
                    setActionType('');
                  }}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue Join Options Modal */}
      {showQueueJoinOptions && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900">
                Join Queue for Today?
              </h3>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500"
                onClick={() => handleQueueJoin(false)}
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center mb-4">
                <FiUsers className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">
                    Your appointment has been booked for today. Would you like to join the queue now?
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <p className="text-sm text-blue-800 font-medium">Benefits of joining the queue:</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>• Get real-time updates on your position</li>
                  <li>• Receive notifications when it's your turn</li>
                  <li>• No need to wait at the clinic</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => handleQueueJoin(false)}
              >
                Maybe Later
              </button>
              <button
                type="button"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => handleQueueJoin(true)}
              >
                Join Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;