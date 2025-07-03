// src/pages/doctor/Billing.jsx - Enhanced design with improved UI
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import { FiDollarSign, FiPlus, FiSearch, FiFilter, FiFileText, FiEdit, FiTrash2, FiDownload, FiPrinter, FiX, FiCheck, FiEye, FiCreditCard, FiCalendar, FiClock, FiUser, FiActivity } from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Billing = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [isLoading, setIsLoading] = useState(false);
  
  // Invoice creation states
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  // Selected services/products
  const [lineItems, setLineItems] = useState([]);
  const [tempItem, setTempItem] = useState({
    description: '',
    unit_price: '',
    quantity: 1
  });
  
  // Patient appointment history and services
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentServices, setAppointmentServices] = useState([]);
  const [showAppointmentDropdown, setShowAppointmentDropdown] = useState(false);
  const [allServices, setAllServices] = useState([]);
  
  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  
  // Invoice history states
  const [invoices, setInvoices] = useState([]);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Payment approval states
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('pending');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [historyView, setHistoryView] = useState('invoices'); // 'invoices' or 'payments'
  
  // Totals
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage');
  const [tax, setTax] = useState(0);
  
  // FETCH DATA
  useEffect(() => {
    fetchPatients();
    fetchInvoices();
    fetchPayments();
    fetchAllServices();
  }, [user]);
  
  // Update subtotal when line items change
  useEffect(() => {
    calculateTotals();
  }, [lineItems, discount, discountType, tax]);
  
  // Filter patients when search query changes
  useEffect(() => {
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = patients.filter(
        patient => patient.full_name.toLowerCase().includes(lowercasedQuery) ||
                  (patient.phone && patient.phone.includes(lowercasedQuery))
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchQuery, patients]);
  
  // Filter invoices when search query changes
  useEffect(() => {
    if (invoices.length === 0) return;
    
    let filtered = [...invoices];
    
    // Apply status filter
    if (invoiceFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === invoiceFilter);
    }
    
    // Apply search query
    if (invoiceSearchQuery) {
      const lowercasedQuery = invoiceSearchQuery.toLowerCase();
      filtered = filtered.filter(
        invoice => invoice.invoice_number.toLowerCase().includes(lowercasedQuery) ||
                  invoice.patientName.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    setFilteredInvoices(filtered);
  }, [invoiceSearchQuery, invoiceFilter, invoices]);

  // Filter payments when search query or status filter changes
  useEffect(() => {
    if (payments.length === 0) return;
    
    let filtered = [...payments];
    
    // Apply status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(payment => 
        payment.approval_status === paymentStatusFilter
      );
    }
    
    // Apply search query
    if (paymentSearchQuery) {
      const lowercasedQuery = paymentSearchQuery.toLowerCase();
      filtered = filtered.filter(
        payment => payment.patientName?.toLowerCase().includes(lowercasedQuery) ||
                  payment.invoiceNumber?.toLowerCase().includes(lowercasedQuery) ||
                  payment.reference_number?.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    setFilteredPayments(filtered);
  }, [paymentSearchQuery, paymentStatusFilter, payments]);
  
  // Direct Print function for invoices
  const printInvoice = (invoice) => {
    if (!invoice) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for printing.");
      return;
    }
    
    // Define print styles
    const printStyles = `
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
        color: #333;
        line-height: 1.6;
      }
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
      }
      .invoice-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 20px;
      }
      .invoice-title {
        font-size: 32px;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 10px;
      }
      .clinic-info {
        margin-bottom: 5px;
        color: #6b7280;
      }
      .clinic-name {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 5px;
      }
      .invoice-info {
        text-align: right;
        margin-bottom: 5px;
      }
      .invoice-number {
        font-size: 20px;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 10px;
      }
      .bill-section {
        display: flex;
        justify-content: space-between;
        background-color: #f8fafc;
        padding: 25px;
        margin: 25px 0;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      .bill-to, .payment-info {
        flex: 1;
      }
      .bill-to h2, .payment-info h2 {
        font-size: 16px;
        font-weight: bold;
        color: #374151;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .patient-info, .payment-details {
        color: #6b7280;
        line-height: 1.5;
      }
      .patient-name {
        font-weight: 600;
        color: #1f2937;
        font-size: 16px;
        margin-bottom: 5px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 25px 0;
        background-color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        overflow: hidden;
      }
      th, td {
        padding: 15px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
      }
      th {
        background-color: #f8fafc;
        font-weight: 600;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 12px;
      }
      .amount-right {
        text-align: right;
        font-weight: 500;
      }
      .summary {
        margin-left: auto;
        width: 350px;
        background-color: #f8fafc;
        padding: 25px;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 14px;
      }
      .summary-label {
        color: #6b7280;
        font-weight: 500;
      }
      .summary-value {
        font-weight: 600;
        color: #1f2937;
      }
      .total-row {
        font-weight: bold;
        border-top: 2px solid #2563eb;
        padding-top: 15px;
        margin-top: 10px;
        font-size: 18px;
      }
      .total-row .summary-label {
        color: #2563eb;
        font-weight: bold;
      }
      .total-row .summary-value {
        color: #2563eb;
        font-weight: bold;
      }
      .notes {
        margin-top: 30px;
        border-top: 1px solid #e5e7eb;
        padding-top: 20px;
      }
      .notes h2 {
        font-size: 16px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 10px;
      }
      .notes p {
        color: #6b7280;
        line-height: 1.6;
      }
      .footer {
        margin-top: 50px;
        text-align: center;
        color: #9ca3af;
        font-size: 14px;
        border-top: 1px solid #e5e7eb;
        padding-top: 25px;
      }
      .footer p {
        margin: 5px 0;
      }
      .thank-you {
        font-weight: 600;
        color: #2563eb;
        font-size: 16px;
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .badge-green {
        background-color: #d1fae5;
        color: #065f46;
      }
      .badge-yellow {
        background-color: #fef3c7;
        color: #92400e;
      }
      .badge-red {
        background-color: #fee2e2;
        color: #b91c1c;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;

    // Generate HTML for the invoice
    const getStatusBadgeClass = (status) => {
      switch (status?.toLowerCase()) {
        case 'paid':
        case 'approved':
          return 'badge badge-green';
        case 'partial':
        case 'pending':
          return 'badge badge-yellow';
        case 'rejected':
        case 'overdue':
          return 'badge badge-red';
        default:
          return 'badge';
      }
    };

    // Format currency function
    const formatCurrency = (amount) => {
      return `₱${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    };

    // Generate HTML content for the print window
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div>
              <div class="invoice-title">INVOICE</div>
              <div class="clinic-name">Silario Dental Clinic</div>
              <div class="clinic-info">Cabugao/San Juan, Ilocos Sur</div>
              <div class="clinic-info">silaroidentalclinic@gmail.com</div>
            </div>
            <div>
              <div class="invoice-number">#${invoice.invoice_number}</div>
              <div class="invoice-info"><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</div>
              <div class="invoice-info"><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="bill-section">
            <div class="bill-to">
              <h2>Billed To</h2>
              <div class="patient-info">
                <div class="patient-name">${invoice.patientName}</div>
                ${invoice.profiles?.address ? `<div>${invoice.profiles.address}</div>` : ''}
                ${invoice.profiles?.phone ? `<div>${invoice.profiles.phone}</div>` : ''}
                ${invoice.profiles?.email ? `<div>${invoice.profiles.email}</div>` : ''}
              </div>
            </div>
            
            <div class="payment-info">
              <h2>Payment Information</h2>
              <div class="payment-details">
                <div><strong>Method:</strong> ${invoice.payment_method || 'Not specified'}</div>
                <div><strong>Status:</strong> <span class="${getStatusBadgeClass(invoice.status)}">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></div>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Description</th>
                <th class="amount-right" style="width: 20%;">Unit Price</th>
                <th class="amount-right" style="width: 15%;">Quantity</th>
                <th class="amount-right" style="width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items && invoice.items.map((item) => `
                <tr>
                  <td>${item.service_name || item.description}</td>
                  <td class="amount-right">${formatCurrency(item.price)}</td>
                  <td class="amount-right">${item.quantity}</td>
                  <td class="amount-right">${formatCurrency(item.price * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-row">
              <span class="summary-label">Subtotal:</span>
              <span class="summary-value">${formatCurrency(invoice.subtotal || invoice.total_amount)}</span>
            </div>
            
            ${invoice.discount > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Discount:</span>
                <span class="summary-value">-${formatCurrency(invoice.discount)}</span>
              </div>
            ` : ''}
            
            ${invoice.tax > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Tax:</span>
                <span class="summary-value">${formatCurrency(invoice.tax)}</span>
              </div>
            ` : ''}
            
            <div class="summary-row total-row">
              <span class="summary-label">Total Amount:</span>
              <span class="summary-value">${formatCurrency(invoice.total_amount)}</span>
            </div>
            
            ${invoice.amount_paid > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Amount Paid:</span>
                <span class="summary-value">${formatCurrency(invoice.amount_paid)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Balance Due:</span>
                <span class="summary-value">${formatCurrency(invoice.total_amount - invoice.amount_paid)}</span>
              </div>
            ` : ''}
          </div>
          
          ${invoice.notes ? `
            <div class="notes">
              <h2>Notes</h2>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p class="thank-you">Thank you for choosing Silario Dental Clinic</p>
            <p>For any inquiries, please contact us at silaroidentalclinic@gmail.com</p>
          </div>
        </div>
        <script>
          // Auto print when loaded
          window.onload = function() {
            window.print();
            // Optional: Close after printing
            // setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;
    
    // Write to the new window and print
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };
  
  // HELPER FUNCTIONS
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, address')
        .eq('role', 'patient')
        .order('full_name');
      
      if (error) throw error;
      setPatients(data || []);
      setFilteredPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  };

  const fetchAllServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setAllServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };
  
  const fetchPatientAppointments = async (patientId) => {
    if (!patientId) return;
    
    setIsLoading(true);
    try {
      // Get completed appointments for the patient
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, 
          appointment_date, 
          appointment_time, 
          notes, 
          branch, 
          teeth_involved,
          status,
          doctor_id
        `)
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false });
      
      if (error) throw error;
      
      // Format appointment data
      const formattedAppointments = data.map(appointment => ({
        ...appointment,
        formattedDate: new Date(appointment.appointment_date).toLocaleDateString(),
        formattedTime: appointment.appointment_time ? appointment.appointment_time.substring(0, 5) : '',
        displayName: `${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time ? appointment.appointment_time.substring(0, 5) : 'N/A'}`
      }));
      
      setPatientAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      toast.error('Failed to load patient appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointmentServices = async (appointmentId) => {
    if (!appointmentId) return;
    
    setIsLoading(true);
    try {
      // Get services for the appointment
      const { data, error } = await supabase
        .from('appointment_services')
        .select(`
          service_id,
          services(id, name, description, price, duration, category)
        `)
        .eq('appointment_id', appointmentId);
      
      if (error) throw error;

      // Format service data and update line items
      const servicesData = data.map(item => item.services);
      setAppointmentServices(servicesData);
      
      // Convert to line items format
      const newLineItems = servicesData.map(service => ({
        id: Date.now() + Math.random(), // Unique temporary ID
        description: service.name,
        unit_price: parseFloat(service.price),
        quantity: 1,
        total: parseFloat(service.price),
        service_id: service.id
      }));
      
      // Update line items
      setLineItems(prevItems => [...prevItems, ...newLineItems]);
      
    } catch (error) {
      console.error('Error fetching appointment services:', error);
      toast.error('Failed to load appointment services');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      // Fetch invoices with patient details
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          patient_id,
          total_amount,
          amount_paid,
          status,
          payment_method,
          created_at,
          profiles:patient_id(full_name, phone, email, address)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Format invoices for display
      const formattedInvoices = data.map(invoice => ({
        ...invoice,
        patientName: invoice.profiles?.full_name || 'Unknown Patient',
        formattedDate: new Date(invoice.invoice_date).toLocaleDateString(),
        formattedTotal: formatCurrency(invoice.total_amount)
      }));
      
      setInvoices(formattedInvoices);
      setFilteredInvoices(formattedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      // First get basic payment data
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          invoice_id,
          amount,
          payment_method,
          reference_number,
          payment_date,
          notes,
          created_at,
          created_by,
          approval_status
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If we have payments, get additional data in separate queries
      if (data && data.length > 0) {
        // Get invoice info
        const invoiceIds = data.map(p => p.invoice_id).filter(id => id);
        const userIds = data.map(p => p.created_by).filter(id => id);
        
        let invoiceData = [];
        let userData = [];
        
        if (invoiceIds.length > 0) {
          const { data: invData } = await supabase
            .from('invoices')
            .select('id, invoice_number, total_amount, amount_paid, patient_id, status')
            .in('id', invoiceIds);
            
          if (invData) invoiceData = invData;
        }
        
        if (userIds.length > 0) {
          const { data: profData } = await supabase
            .from('profiles')
            .select('id, full_name, phone, email')
            .in('id', userIds);
            
          if (profData) userData = profData;
        }
        
        // Combine all data safely
        const formattedPayments = data.map(payment => {
          const invoice = invoiceData.find(inv => inv.id === payment.invoice_id) || {};
          const user = userData.find(u => u.id === payment.created_by) || {};
          
          return {
            ...payment,
            approval_status: payment.approval_status || 'pending',
            patientName: user.full_name || 'Unknown Patient',
            invoiceNumber: invoice.invoice_number || 'Unknown',
            formattedAmount: formatCurrency(payment.amount || 0),
            formattedDate: new Date(payment.payment_date || payment.created_at).toLocaleDateString(),
            proofUrl: payment.notes?.includes('Payment proof:') 
              ? payment.notes.split('Payment proof: ')[1] 
              : null,
            invoices: invoice
          };
        });

        setPayments(formattedPayments);
        setFilteredPayments(formattedPayments.filter(p => (p.approval_status || 'pending') === 'pending'));
      } else {
        // No payments found
        setPayments([]);
        setFilteredPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setShowPatientDropdown(false);
    setSearchQuery(patient.full_name);
    setLineItems([]); // Clear existing line items
    
    // Fetch patient appointments when patient is selected
    fetchPatientAppointments(patient.id);
    setShowAppointmentDropdown(true);
  };

  const handleAppointmentSelect = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDropdown(false);
    
    // Add appointment details to notes
    const appointmentDetails = 
      `Appointment on ${appointment.formattedDate} at ${appointment.formattedTime}` + 
      (appointment.teeth_involved ? ` - Teeth involved: ${appointment.teeth_involved}` : '') +
      (appointment.branch ? ` - Branch: ${appointment.branch}` : '');
    
    setNotes(appointmentDetails);
    
    // Fetch services for the selected appointment
    fetchAppointmentServices(appointment.id);
  };
  
  const handleAddLineItem = () => {
    // Validate
    if (!tempItem.description || !tempItem.unit_price) {
      toast.error('Please enter item description and price');
      return;
    }
    
    // Parse unit price as a number
    const unitPrice = parseFloat(tempItem.unit_price);
    if (isNaN(unitPrice) || unitPrice < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    // Parse quantity as a number
    const quantity = parseInt(tempItem.quantity, 10) || 1;
    if (isNaN(quantity) || quantity < 1) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    // Create new line item
    const newItem = {
      id: Date.now(), // Temporary ID
      description: tempItem.description,
      unit_price: unitPrice,
      quantity: quantity,
      total: unitPrice * quantity
    };
    
    // Add to line items
    setLineItems([...lineItems, newItem]);
    
    // Reset temp item
    setTempItem({
      description: '',
      unit_price: '',
      quantity: 1
    });
  };

  // Handle adding a service from available services list
  const handleAddService = (service) => {
    // Check if service is already added
    const existingItem = lineItems.find(item => 
      item.description === service.name || (item.service_id && item.service_id === service.id)
    );
    
    if (existingItem) {
      // Increment quantity if already exists
      const updatedItems = lineItems.map(item => {
        if (item.id === existingItem.id) {
          const newQuantity = item.quantity + 1;
          return {
            ...item,
            quantity: newQuantity,
            total: item.unit_price * newQuantity
          };
        }
        return item;
      });
      
      setLineItems(updatedItems);
      toast.info(`Increased quantity for "${service.name}"`);
    } else {
      // Add as new item
      const newItem = {
        id: Date.now() + Math.random(),
        description: service.name,
        unit_price: parseFloat(service.price),
        quantity: 1,
        total: parseFloat(service.price),
        service_id: service.id
      };
      
      setLineItems([...lineItems, newItem]);
      toast.success(`Added service: ${service.name}`);
    }
  };
  
  const handleRemoveLineItem = (itemId) => {
    setLineItems(lineItems.filter(item => item.id !== itemId));
  };
  
  const handleDiscountChange = (value) => {
    // Parse as a number
    const discountValue = parseFloat(value);
    
    // Validate
    if (isNaN(discountValue) || discountValue < 0) {
      setDiscount(0);
      return;
    }
    
    // If percentage, cap at 100%
    if (discountType === 'percentage' && discountValue > 100) {
      setDiscount(100);
      return;
    }
    
    setDiscount(discountValue);
  };
  
  const calculateTotals = () => {
    // Calculate subtotal
    const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    
    // Calculate discount
    let discountAmount = 0;
    if (discount > 0) {
      if (discountType === 'percentage') {
        discountAmount = (calculatedSubtotal * discount) / 100;
      } else {
        discountAmount = discount;
      }
    }
    
    // Calculate tax
    const taxAmount = ((calculatedSubtotal - discountAmount) * tax) / 100;
    
    // Set values
    setSubtotal(calculatedSubtotal);
    
    return {
      subtotal: calculatedSubtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: calculatedSubtotal - discountAmount + taxAmount
    };
  };
  
  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  };
  
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `INV-${year}${month}${day}-${random}`;
  };
  
  const handleGenerateInvoice = async () => {
    // Validate
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    
    if (lineItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    
    // Calculate totals
    const totals = calculateTotals();
    
    // Generate invoice - without appointment_id field since it doesn't exist in the schema
    const invoiceData = {
      invoice_number: generateInvoiceNumber(),
      invoice_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default due date: 30 days from now
      patient_id: selectedPatient.id,
      total_amount: totals.total,
      amount_paid: paymentStatus === 'paid' ? totals.total : (paymentStatus === 'partial' ? totals.total / 2 : 0),
      status: paymentStatus,
      payment_method: paymentMethod,
      notes: notes, // Already includes appointment info in notes if selected
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      created_at: new Date().toISOString(),
      created_by: user.id
      // Removed appointment_id field as it doesn't exist in the schema
    };
    
    setIsLoading(true);
    
    try {
      // Insert invoice
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select('id');
      
      if (invoiceError) throw invoiceError;
      
      // Get invoice ID
      const invoiceId = invoiceResult[0].id;
      
      // Insert invoice items
      const invoiceItems = lineItems.map(item => ({
        invoice_id: invoiceId,
        service_name: item.description,
        description: item.description,
        quantity: item.quantity,
        price: item.unit_price,
        discount: 0,
        created_at: new Date().toISOString()
        // Remove service_id field as it doesn't exist in the schema
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);
      
      if (itemsError) throw itemsError;
      
      // Reset form
      setSelectedPatient(null);
      setSearchQuery('');
      setLineItems([]);
      setPaymentMethod('');
      setPaymentStatus('pending');
      setNotes('');
      setDiscount(0);
      setTax(0);
      setSelectedAppointment(null);
      setPatientAppointments([]);
      
      toast.success('Invoice generated successfully');
      
      // Reload invoices
      fetchInvoices();
      
      // Switch to history tab
      setActiveTab('history');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewInvoice = async (invoice) => {
    setIsLoading(true);
    
    try {
      // Fetch invoice items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      
      if (itemsError) throw itemsError;

      // Fetch payments for this invoice
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (paymentError) throw paymentError;
      
      // Set selected invoice with items and payments
      setSelectedInvoice({
        ...invoice,
        items: items || [],
        payments: paymentData || []
      });
      
      // Show invoice preview
      setShowInvoicePreview(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to fetch invoice details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      setIsLoading(true);
      const payment = payments.find(p => p.id === paymentId);
      
      if (!payment) {
        toast.error('Payment not found');
        return;
      }

      // Use this specific format for approval status
      const notes = payment.notes || '';
      let updatedNotes = notes;
      
      // Remove any existing approval/rejection text
      if (updatedNotes.includes('(Approved by doctor)') || updatedNotes.includes('(Rejected by doctor)')) {
        updatedNotes = updatedNotes
          .replace('(Approved by doctor)', '')
          .replace('(Rejected by doctor)', '')
          .trim();
      }
      
      // Add approval text
      updatedNotes = updatedNotes ? `${updatedNotes} (Approved by doctor)` : '(Approved by doctor)';
      
      // Update payment record
      const { error } = await supabase
        .from('payments')
        .update({ 
          notes: updatedNotes,
          approval_status: 'approved' // Try to set this even if column doesn't exist
        })
        .eq('id', paymentId);
      
      if (error) {
        console.error('Error updating payment:', error);
        toast.error('Failed to approve payment. Please try again.');
        return;
      }
      
      // First try to update approval_status column if it exists
      let updateSucceeded = false;
      try {
        const { error } = await supabase
          .from('payments')
          .update({ approval_status: 'approved' })
          .eq('id', paymentId);
        
        if (!error) {
          updateSucceeded = true;
        }
      } catch (columnError) {
        console.log('Could not update approval_status column, might not exist');
      }

      // If approval_status update failed, use a workaround with notes field
      if (!updateSucceeded) {
        const notes = payment.notes || '';
        const updatedNotes = notes + ' (Approved by doctor)';
        
        const { error } = await supabase
          .from('payments')
          .update({ notes: updatedNotes })
          .eq('id', paymentId);
        
        if (error) throw error;
      }
      
      // Update the invoice status based on payment amount and invoice total
      const invoice = payment.invoices;
      
      if (invoice) {
        // Calculate new amount paid (current + payment amount)
        const amountPaid = parseFloat(invoice.amount_paid) + parseFloat(payment.amount);
        const totalAmount = parseFloat(invoice.total_amount);
        const newStatus = amountPaid >= totalAmount ? 'paid' : 'partial';

        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            amount_paid: amountPaid,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id);
        
        if (invoiceError) throw invoiceError;
      }

      toast.success('Payment approved successfully');
      
      // Refresh data
      fetchPayments();
      fetchInvoices();

      // Close payment modal if open
      if (showPaymentModal) {
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRejectPayment = async (paymentId) => {
    try {
      setIsLoading(true);
      const payment = payments.find(p => p.id === paymentId);
      
      if (!payment) {
        toast.error('Payment not found');
        return;
      }

      // First try to update approval_status column if it exists
      let updateSucceeded = false;
      try {
        const { error } = await supabase
          .from('payments')
          .update({ approval_status: 'rejected' })
          .eq('id', paymentId);
        
        if (!error) {
          updateSucceeded = true;
        }
      } catch (columnError) {
        console.log('Could not update approval_status column, might not exist');
      }

      // If approval_status update failed, use a workaround with notes field
      if (!updateSucceeded) {
        const notes = payment.notes || '';
        const updatedNotes = notes + ' (Rejected by doctor)';
        
        const { error } = await supabase
          .from('payments')
          .update({ notes: updatedNotes })
          .eq('id', paymentId);
        
        if (error) throw error;
      }

      toast.success('Payment rejected');
      
      // Refresh data
      fetchPayments();

      // Close payment modal if open
      if (showPaymentModal) {
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'partial':
      case 'pending':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getMethodBadgeClass = (method) => {
    switch (method?.toLowerCase()) {
      case 'gcash':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'cash':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'bank_transfer':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'other':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };
  
  if (isLoading && invoices.length === 0 && payments.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Billing Management</h1>
                <p className="text-blue-100 mt-1">Create invoices and manage payments efficiently</p>
              </div>
             
            </div>
          </div>

          <div className="p-8">
            {/* Enhanced Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`py-4 px-6 border-b-3 font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'create'
                      ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } rounded-t-lg`}
                >
                  <div className="flex items-center space-x-2">
                    <FiPlus className="h-4 w-4" />
                    <span>Create Invoice</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('history');
                    fetchInvoices();
                    fetchPayments();
                  }}
                  className={`py-4 px-6 border-b-3 font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } rounded-t-lg`}
                >
                  <div className="flex items-center space-x-2">
                    <FiFileText className="h-4 w-4" />
                    <span>Billing History</span>
                    {payments.filter(p => p.approval_status === 'pending').length > 0 && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {payments.filter(p => p.approval_status === 'pending').length}
                      </span>
                    )}
                  </div>
                </button>
              </nav>
            </div>

            {/* Content */}
            <div>
              {activeTab === 'create' && (
                <div className="space-y-8">
                  {/* Patient Selection */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                    <div className="flex items-center mb-4">
                      <FiUser className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search patient by name or phone..."
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowPatientDropdown(true);
                          if (!e.target.value) {
                            setSelectedPatient(null);
                          }
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                      />
                      {showPatientDropdown && filteredPatients.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-xl rounded-lg max-h-60 overflow-y-auto border border-gray-200">
                          <ul className="py-1">
                            {filteredPatients.map((patient) => (
                              <li
                                key={patient.id}
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                onClick={() => handlePatientSelect(patient)}
                              >
                                <div className="font-medium text-gray-900">{patient.full_name}</div>
                                {patient.phone && (
                                  <div className="text-sm text-gray-500">{patient.phone}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {selectedPatient && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                        <div className="text-sm">
                          <div className="font-semibold text-blue-700 mb-2">Selected Patient:</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div><span className="font-medium">Name:</span> {selectedPatient.full_name}</div>
                            {selectedPatient.phone && <div><span className="font-medium">Phone:</span> {selectedPatient.phone}</div>}
                            {selectedPatient.email && <div><span className="font-medium">Email:</span> {selectedPatient.email}</div>}
                            {selectedPatient.address && <div className="md:col-span-2"><span className="font-medium">Address:</span> {selectedPatient.address}</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Appointment Selection */}
                  {selectedPatient && patientAppointments.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                      <div className="flex items-center mb-4">
                        <FiCalendar className="h-5 w-5 text-green-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">Appointment Selection</h3>
                        <span className="ml-2 text-sm text-gray-500">(Optional)</span>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiClock className="h-5 w-5 text-gray-400" />
                        </div>
                        <button
                          type="button"
                          className="block w-full pl-10 pr-3 py-3 text-left border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white hover:bg-gray-50 transition-colors duration-150"
                          onClick={() => setShowAppointmentDropdown(!showAppointmentDropdown)}
                        >
                          {selectedAppointment 
                            ? `${selectedAppointment.formattedDate} at ${selectedAppointment.formattedTime}` 
                            : 'Select a completed appointment...'}
                        </button>
                        {showAppointmentDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
                            <ul className="max-h-60 overflow-y-auto py-1">
                              {patientAppointments.map((appointment) => (
                                <li
                                  key={appointment.id}
                                  className="px-4 py-3 hover:bg-green-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                  onClick={() => handleAppointmentSelect(appointment)}
                                >
                                  <div className="font-medium text-gray-900">
                                    {appointment.formattedDate} at {appointment.formattedTime}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {appointment.branch} {appointment.teeth_involved && `- Teeth: ${appointment.teeth_involved}`}
                                  </div>
                                  {appointment.notes && (
                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                      {appointment.notes}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {selectedAppointment && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                          <p className="text-sm text-green-700 font-medium">
                            ✓ Services from this appointment will be added to the invoice
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced Services Section */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center">
                        <FiActivity className="h-5 w-5 text-purple-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">Services & Products</h3>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      {/* Available Services */}
                      {selectedPatient && allServices.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Add Services:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {allServices.map(service => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => handleAddService(service)}
                                className="px-4 py-3 border border-gray-300 text-sm rounded-lg hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center transition-all duration-150 group"
                              >
                                <span className="truncate pr-2 group-hover:text-blue-700">{service.name}</span>
                                <span className="text-gray-600 font-medium group-hover:text-blue-600">{formatCurrency(service.price)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Add Custom Item */}
                      <div className="grid grid-cols-12 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="col-span-12 md:col-span-5">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Service/Product Description</label>
                          <input 
                            type="text" 
                            placeholder="Enter description..."
                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={tempItem.description}
                            onChange={(e) => setTempItem({...tempItem, description: e.target.value})}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (₱)</label>
                          <input 
                            type="number" 
                            placeholder="0.00"
                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={tempItem.unit_price}
                            onChange={(e) => setTempItem({...tempItem, unit_price: e.target.value})}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                          <input 
                            type="number" 
                            placeholder="1"
                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={tempItem.quantity}
                            onChange={(e) => setTempItem({...tempItem, quantity: e.target.value})}
                            min="1"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2 flex items-end">
                          <button
                            type="button"
                            className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                            onClick={handleAddLineItem}
                          >
                            <FiPlus className="mr-2" />
                            Add
                          </button>
                        </div>
                      </div>
                      
                      {/* Enhanced Line Items Table */}
                      {lineItems.length > 0 ? (
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Description
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Unit Price
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Qty
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Total
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {lineItems.map((item) => (
                                  <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      <div className="font-medium">{item.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                      {formatCurrency(item.unit_price)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                      {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                                      {formatCurrency(item.total)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                      <button
                                        onClick={() => handleRemoveLineItem(item.id)}
                                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors duration-150"
                                        title="Remove item"
                                      >
                                        <FiTrash2 className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                          <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-500">No items added yet</p>
                          <p className="text-sm text-gray-400">Add services or products using the form above</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Payment & Settings */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payment Details */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center mb-4">
                        <FiCreditCard className="h-5 w-5 text-green-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                          <select
                            className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm rounded-lg"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          >
                            <option value="">Select Payment Method</option>
                            <option value="gcash">GCash</option>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="other">Other E-Wallet</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                          <select
                            className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm rounded-lg"
                            value={paymentStatus}
                            onChange={(e) => setPaymentStatus(e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="partial">Partially Paid</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                          <div className="flex rounded-lg shadow-sm">
                            <input
                              type="number"
                              className="flex-1 border border-gray-300 rounded-l-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                              value={discount}
                              onChange={(e) => handleDiscountChange(e.target.value)}
                              min="0"
                            />
                            <select
                              className="border-l-0 border-gray-300 rounded-r-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={discountType}
                              onChange={(e) => setDiscountType(e.target.value)}
                            >
                              <option value="percentage">%</option>
                              <option value="amount">₱</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes & Summary */}
                    <div className="space-y-6">
                      {/* Notes */}
                      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                        <textarea
                          rows="4"
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Add any additional notes or appointment details..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                      </div>

                      {/* Enhanced Totals */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Discount:</span>
                            <span className="font-medium text-gray-900">
                              -{formatCurrency(discountType === 'percentage' ? (subtotal * discount) / 100 : discount)}
                              {discountType === 'percentage' && discount > 0 && ` (${discount}%)`}
                            </span>
                          </div>
                          {tax > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Tax ({tax}%):</span>
                              <span className="font-medium text-gray-900">{formatCurrency((subtotal - (discountType === 'percentage' ? (subtotal * discount) / 100 : discount)) * tax / 100)}</span>
                            </div>
                          )}
                          <div className="border-t border-blue-200 pt-3">
                            <div className="flex justify-between text-lg font-bold">
                              <span className="text-blue-700">Total Amount:</span>
                              <span className="text-blue-700">
                                {formatCurrency(
                                  subtotal - 
                                  (discountType === 'percentage' ? (subtotal * discount) / 100 : discount) + 
                                  ((subtotal - (discountType === 'percentage' ? (subtotal * discount) / 100 : discount)) * tax / 100)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Generate Button */}
                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleGenerateInvoice}
                      disabled={!selectedPatient || lineItems.length === 0}
                    >
                      <FiFileText className="mr-2 h-5 w-5" />
                      Generate Invoice
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  {/* Enhanced History View Selector */}
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="flex space-x-8">
                      <button
                        onClick={() => setHistoryView('invoices')}
                        className={`py-4 px-6 border-b-3 font-semibold text-sm transition-all duration-200 ${
                          historyView === 'invoices'
                            ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } rounded-t-lg`}
                      >
                        <div className="flex items-center space-x-2">
                          <FiFileText className="h-4 w-4" />
                          <span>Invoices</span>
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                            {filteredInvoices.length}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => setHistoryView('payments')}
                        className={`py-4 px-6 border-b-3 font-semibold text-sm transition-all duration-200 ${
                          historyView === 'payments'
                            ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } rounded-t-lg`}
                      >
                        <div className="flex items-center space-x-2">
                          <FiCreditCard className="h-4 w-4" />
                          <span>Payment Approvals</span>
                          {payments.filter(p => p.approval_status === 'pending').length > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                              {payments.filter(p => p.approval_status === 'pending').length}
                            </span>
                          )}
                        </div>
                      </button>
                    </nav>
                  </div>

                  {/* Content for Invoices View */}
                  {historyView === 'invoices' && (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <div className="relative w-full sm:w-96">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiSearch className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Search invoices by number or patient..."
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={invoiceSearchQuery}
                            onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="flex space-x-3">
                          <select
                            className="block pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm rounded-lg"
                            value={invoiceFilter}
                            onChange={(e) => setInvoiceFilter(e.target.value)}
                          >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="partial">Partially Paid</option>
                            <option value="overdue">Overdue</option>
                          </select>
                          <button 
                            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
                            onClick={fetchInvoices}
                            title="Refresh Invoices"
                          >
                            <FiFilter className="h-5 w-5 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
                          <p className="mt-1 text-sm text-gray-600">Manage and track all patient invoices</p>
                        </div>
                        
                        <div className="overflow-x-auto">
                          {filteredInvoices.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Invoice #
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Patient
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Amount
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {filteredInvoices.map((invoice) => (
                                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-semibold text-blue-600">#{invoice.invoice_number}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{invoice.patientName}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {invoice.formattedDate}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                      {invoice.formattedTotal}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${getStatusBadgeClass(invoice.status)}`}>
                                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex justify-end space-x-2">
                                        <button
                                          onClick={() => handleViewInvoice(invoice)}
                                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                                          title="View invoice"
                                        >
                                          <FiEye className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => printInvoice(invoice)}
                                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                                          title="Print invoice"
                                        >
                                          <FiPrinter className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-12 text-center">
                              <FiFileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <p className="text-gray-500 text-lg font-medium">No invoices found</p>
                              <p className="text-gray-400 text-sm">No invoices match your current search criteria</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Content for Payment Approvals View */}
                  {historyView === 'payments' && (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <div className="relative w-full sm:w-96">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiSearch className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Search payments by patient or reference..."
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={paymentSearchQuery}
                            onChange={(e) => setPaymentSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="flex space-x-3">
                          <select
                            className="block pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm rounded-lg"
                            value={paymentStatusFilter}
                            onChange={(e) => setPaymentStatusFilter(e.target.value)}
                          >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending Approval</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <button 
                            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
                            onClick={fetchPayments}
                            title="Refresh Payments"
                          >
                            <FiFilter className="h-5 w-5 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">Payment Approvals</h3>
                          <p className="mt-1 text-sm text-gray-600">Review and approve patient payment submissions</p>
                        </div>
                        
                        <div className="overflow-x-auto">
                          {filteredPayments.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Patient
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Invoice
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Amount
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Method
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {filteredPayments.map((payment) => (
                                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{payment.patientName}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-semibold text-blue-600">#{payment.invoiceNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                      {payment.formattedAmount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {payment.formattedDate}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getMethodBadgeClass(payment.payment_method)}`}>
                                        {payment.payment_method}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(payment.approval_status)}`}>
                                        {payment.approval_status === 'approved' ? 'Approved' : 
                                        payment.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex justify-end space-x-2">
                                        <button
                                          onClick={() => handleViewPayment(payment)}
                                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                                          title="View details"
                                        >
                                          <FiEye className="h-4 w-4" />
                                        </button>
                                        
                                        {payment.approval_status === 'pending' && (
                                          <>
                                            <button
                                              onClick={() => handleApprovePayment(payment.id)}
                                              className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors duration-150"
                                              title="Approve payment"
                                            >
                                              <FiCheck className="h-4 w-4" />
                                            </button>
                                            <button
                                              onClick={() => handleRejectPayment(payment.id)}
                                              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-150"
                                              title="Reject payment"
                                            >
                                              <FiX className="h-4 w-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-12 text-center">
                              <FiCreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <p className="text-gray-500 text-lg font-medium">No payments found</p>
                              <p className="text-gray-400 text-sm">No payments match your current search criteria</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Invoice Preview Modal */}
      {showInvoicePreview && selectedInvoice && (
        <div className="fixed inset-0 overflow-y-auto z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">
                Invoice #{selectedInvoice.invoice_number}
              </h3>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => printInvoice(selectedInvoice)}
                  className="inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-lg text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-150"
                >
                  <FiPrinter className="mr-2 h-4 w-4" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoicePreview(false)}
                  className="inline-flex items-center p-2 border border-white/20 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-150"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Enhanced Invoice Preview Content */}
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="max-w-4xl mx-auto bg-white">
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-3">INVOICE</h1>
                    <div className="text-gray-600 space-y-1">
                      <p className="text-lg font-semibold text-blue-600">Silario Dental Clinic</p>
                      <p>Cabugao/San Juan, Ilocos Sur</p>
                      <p>silaroidentalclinic@gmail.com</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600 mb-3">#{selectedInvoice.invoice_number}</p>
                    <div className="text-gray-600 space-y-1">
                      <p><span className="font-medium">Date:</span> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                      <p><span className="font-medium">Due Date:</span> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                
                {/* Bill To Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8 border border-blue-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                        <FiUser className="mr-2 h-5 w-5 text-blue-600" />
                        Billed To
                      </h2>
                      <div className="text-gray-700 space-y-1">
                        <p className="font-semibold text-lg">{selectedInvoice.patientName}</p>
                        {selectedInvoice.profiles?.address && (
                          <p>{selectedInvoice.profiles.address}</p>
                        )}
                        {selectedInvoice.profiles?.phone && (
                          <p>{selectedInvoice.profiles.phone}</p>
                        )}
                        {selectedInvoice.profiles?.email && (
                          <p>{selectedInvoice.profiles.email}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                        <FiCreditCard className="mr-2 h-5 w-5 text-green-600" />
                        Payment Information
                      </h2>
                      <div className="text-gray-700 space-y-1">
                        <p><span className="font-medium">Method:</span> {selectedInvoice.payment_method || 'Not specified'}</p>
                        <p><span className="font-medium">Status:</span> 
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(selectedInvoice.status)}`}>
                            {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Invoice Items Table */}
                <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedInvoice.items && selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium">{item.service_name || item.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Enhanced Invoice Summary */}
                <div className="flex justify-end mb-8">
                  <div className="w-full md:w-80">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium text-gray-900">{formatCurrency(selectedInvoice.subtotal || selectedInvoice.total_amount)}</span>
                        </div>
                        
                        {selectedInvoice.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Discount:</span>
                            <span className="font-medium text-gray-900">-{formatCurrency(selectedInvoice.discount)}</span>
                          </div>
                        )}
                        
                        {selectedInvoice.tax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(selectedInvoice.tax)}</span>
                          </div>
                        )}
                        
                        <div className="border-t border-blue-200 pt-3">
                          <div className="flex justify-between text-lg font-bold">
                            <span className="text-blue-700">Total Amount:</span>
                            <span className="text-blue-700">{formatCurrency(selectedInvoice.total_amount)}</span>
                          </div>
                        </div>
                        
                        {selectedInvoice.amount_paid > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Amount Paid:</span>
                              <span className="font-medium text-green-600">{formatCurrency(selectedInvoice.amount_paid)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                              <span className="text-gray-600 font-medium">Balance Due:</span>
                              <span className="font-semibold text-red-600">{formatCurrency(selectedInvoice.total_amount - selectedInvoice.amount_paid)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Notes Section */}
                {selectedInvoice.notes && (
                  <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h2 className="font-bold text-gray-700 mb-3 flex items-center">
                      <FiFileText className="mr-2 h-5 w-5 text-gray-600" />
                      Notes
                    </h2>
                    <p className="text-gray-600 leading-relaxed">{selectedInvoice.notes}</p>
                  </div>
                )}
                
                {/* Payment History Section */}
                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                  <div className="mb-8">
                    <h2 className="font-bold text-gray-700 mb-4 flex items-center">
                      <FiCreditCard className="mr-2 h-5 w-5 text-green-600" />
                      Payment History
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Method
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Reference
                            </th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedInvoice.payments.map((payment, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMethodBadgeClass(payment.payment_method)}`}>
                                  {payment.payment_method}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {payment.reference_number}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(payment.approval_status || 'pending')}`}>
                                  {payment.approval_status === 'approved' ? 'Approved' : 
                                   payment.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Footer */}
                <div className="text-center pt-8 border-t border-gray-200">
                  <p className="text-lg font-semibold text-blue-600 mb-2">Thank you for choosing Silario Dental Clinic</p>
                  <p className="text-sm text-gray-500">For any inquiries, please contact us at silaroidentalclinic@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Payment Detail Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">
                Payment Review
              </h3>
              <button
                type="button"
                className="p-2 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-150"
                onClick={() => setShowPaymentModal(false)}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Payment Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiCreditCard className="mr-2 h-5 w-5 text-blue-600" />
                    Payment Information
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Patient</dt>
                        <dd className="mt-1 text-sm font-semibold text-gray-900">{selectedPayment.patientName}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                        <dd className="mt-1 text-sm font-semibold text-blue-600">#{selectedPayment.invoiceNumber}</dd>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Amount</dt>
                        <dd className="mt-1 text-lg font-bold text-green-600">{selectedPayment.formattedAmount}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedPayment.formattedDate}</dd>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Method</dt>
                        <dd className="mt-1">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getMethodBadgeClass(selectedPayment.payment_method)}`}>
                            {selectedPayment.payment_method}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Reference Number</dt>
                        <dd className="mt-1 text-sm font-mono text-gray-900">{selectedPayment.reference_number}</dd>
                      </div>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(selectedPayment.approval_status)}`}>
                          {selectedPayment.approval_status === 'approved' ? 'Approved' : 
                           selectedPayment.approval_status === 'rejected' ? 'Rejected' : 'Pending Approval'}
                        </span>
                      </dd>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {selectedPayment.approval_status === 'pending' && (
                    <div className="mt-8 flex space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          handleApprovePayment(selectedPayment.id);
                          setShowPaymentModal(false);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150"
                      >
                        <FiCheck className="mr-2 h-4 w-4" />
                        Approve Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleRejectPayment(selectedPayment.id);
                          setShowPaymentModal(false);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-150"
                      >
                        <FiX className="mr-2 h-4 w-4" />
                        Reject Payment
                      </button>
                    </div>
                  )}
                </div>

                {/* Payment Proof */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiFileText className="mr-2 h-5 w-5 text-gray-600" />
                    Payment Proof
                  </h4>
                  {selectedPayment.proofUrl ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {selectedPayment.proofUrl.includes('.pdf') ? (
                        // PDF Viewer
                        <div className="p-8 text-center">
                          <div className="mb-4">
                            <FiFileText className="mx-auto h-16 w-16 text-red-500" />
                          </div>
                          <p className="mb-4 text-sm text-gray-600 font-medium">PDF Document</p>
                          <a 
                            href={selectedPayment.proofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                          >
                            <FiFileText className="mr-2 h-4 w-4" />
                            View PDF Document
                          </a>
                        </div>
                      ) : (
                        // Enhanced Image Viewer
                        <div className="p-4">
                          <div className="flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                            <img 
                              src={selectedPayment.proofUrl} 
                              alt="Payment Proof" 
                              className="max-w-full h-auto max-h-96 object-contain rounded-lg shadow-sm"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                              }}
                            />
                          </div>
                          <div className="mt-3 text-center">
                            <a 
                              href={selectedPayment.proofUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors duration-150"
                            >
                              <FiEye className="mr-1 h-3 w-3" />
                              View Full Size
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <FiFileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 font-medium">No payment proof submitted</p>
                      <p className="text-sm text-gray-400 mt-1">Patient did not upload payment proof</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                onClick={() => setShowPaymentModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;