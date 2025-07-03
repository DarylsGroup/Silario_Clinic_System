// src/pages/patient/Payments.jsx - Fixed Payment Flow
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiDollarSign, FiCreditCard, FiFileText, FiDownload, FiExternalLink, FiInfo, FiUpload, FiCheck, FiClock } from 'react-icons/fi';
import supabase from '../../config/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

// Import GCash QR Code
import gcashQR from '../../assets/gcash-qr.png';

const Payments = () => {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  // Track which invoices have payments in this session
  const [paidInvoicesInSession, setPaidInvoicesInSession] = useState([]);
  // Track if we're showing payment success view
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  // Track current payment info
  const [currentPaymentInfo, setCurrentPaymentInfo] = useState(null);

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchPaymentHistory();
    }
  }, [user]);

  useEffect(() => {
    if (invoiceId && invoices.length > 0) {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        setSelectedInvoice(invoice);
      }
    }
  }, [invoiceId, invoices]);

  // Helper function to extract URL properly from notes
  const extractProofUrlFromNotes = (notes) => {
    if (!notes || !notes.includes('Payment proof:')) return null;
    
    console.log('Extracting URL from notes:', notes);
    
    // Get the part after "Payment proof:"
    let url = notes.split('Payment proof: ')[1];
    console.log('Initial URL extraction:', url);
    
    // Handle all possible approval/rejection patterns by removing them
    const patterns = [
      '(Approved by doctor)',
      ' (Approved by doctor)',
      '(Approved)',
      ' (Approved)',
      'Approved by doctor',
      '(Rejected by doctor)',
      ' (Rejected by doctor)',
      '(Rejected)',
      ' (Rejected)',
      'Rejected by doctor'
    ];
    
    // Remove any matching pattern from the URL
    for (const pattern of patterns) {
      if (url.includes(pattern)) {
        url = url.split(pattern)[0].trim();
        console.log(`Found pattern "${pattern}", cleaned URL:`, url);
        break;
      }
    }
    
    console.log('Final extracted URL:', url);
    return url;
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching invoices for user:', user.id);
      
      // Correct way to use the IN operator with Supabase - ensure array is properly formatted
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          amount_paid,
          status,
          payment_method,
          invoice_items(
            id,
            service_name,
            description,
            quantity,
            price,
            discount
          )
        `)
        .eq('patient_id', user.id)
        .or('status.eq.pending,status.eq.partial')  // Use OR format instead of IN
        .order('invoice_date', { ascending: false });
      
      if (error) {
        console.error('Error in invoice query:', error);
        // Try the fallback approach with separate queries if OR fails
        await fetchWithSeparateQueries();
        return;
      }
      
      console.log(`Found ${data?.length || 0} invoices`);
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoice data: ' + error.message);
      // Try fallback approach
      await fetchWithSeparateQueries();
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback approach with separate queries
  const fetchWithSeparateQueries = async () => {
    try {
      console.log('Trying fallback approach with separate queries');
      
      // First query for pending invoices
      const { data: pendingData, error: pendingError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          amount_paid,
          status,
          payment_method,
          invoice_items(
            id,
            service_name,
            description,
            quantity,
            price,
            discount
          )
        `)
        .eq('patient_id', user.id)
        .eq('status', 'pending')
        .order('invoice_date', { ascending: false });
      
      if (pendingError) {
        console.error('Error fetching pending invoices:', pendingError);
        toast.error('Error loading pending invoices');
        return;
      }
      
      // Set initial data from pending invoices
      let allInvoices = pendingData || [];
      console.log(`Found ${allInvoices.length} pending invoices`);
      
      // Second query for partial invoices
      const { data: partialData, error: partialError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          amount_paid,
          status,
          payment_method,
          invoice_items(
            id,
            service_name,
            description,
            quantity,
            price,
            discount
          )
        `)
        .eq('patient_id', user.id)
        .eq('status', 'partial')
        .order('invoice_date', { ascending: false });
      
      if (!partialError && partialData) {
        console.log(`Found ${partialData.length} partial invoices`);
        // Combine with pending invoices
        allInvoices = [...allInvoices, ...partialData];
      }
      
      // Set all invoices
      setInvoices(allInvoices);
      console.log(`Total invoices: ${allInvoices.length}`);
      
      if (allInvoices.length > 0) {
        toast.success(`Found ${allInvoices.length} invoice(s) to process`);
      } else {
        console.log('No pending or partial invoices found');
      }
    } catch (error) {
      console.error('Error in fallback approach:', error);
      toast.error('Could not retrieve invoice data');
    }
  };

  // Helper function to extract approval status from notes
  const getApprovalStatusFromNotes = (notes) => {
    if (!notes) {
      console.log('Notes field is empty');
      return 'pending';
    }
    
    console.log('Payment notes (full content):', notes);
    
    // Add a check for space before parenthesis in the pattern
    if (notes.includes('(Approved by doctor)') || 
        notes.includes(' (Approved by doctor)') ||  // Added space before parenthesis
        notes.includes('Approved by doctor') || 
        notes.includes('(Approved)')) {
      console.log('APPROVED status detected in notes!');
      return 'approved';
    }
    
    // Check for various rejection patterns with space variations
    if (notes.includes('(Rejected by doctor)') || 
        notes.includes(' (Rejected by doctor)') ||  // Added space before parenthesis
        notes.includes('Rejected by doctor') || 
        notes.includes('(Rejected)')) {
      console.log('REJECTED status detected in notes!');
      return 'rejected';
    }
    
    console.log('No approval/rejection text found, defaulting to pending');
    return 'pending';
  };

  // Updated fetchPaymentHistory function
  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true);
      
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
          doctor_approval_status,
          approval_status
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch invoice data separately to avoid relationship issues
      if (data && data.length > 0) {
        const invoiceIds = data.map(payment => payment.invoice_id).filter(id => id);
        
        if (invoiceIds.length > 0) {
          const { data: invoicesData, error: invoicesError } = await supabase
            .from('invoices')
            .select('id, invoice_number, total_amount')
            .in('id', invoiceIds);
          
          if (!invoicesError && invoicesData) {
            // Safely combine the payment and invoice data
            const paymentsWithInvoices = data.map(payment => {
              const matchingInvoice = invoicesData.find(inv => inv.id === payment.invoice_id) || {
                invoice_number: 'Unknown',
                total_amount: 0
              };
              
              // Determine the actual status by checking all possible sources
              let approvalStatus = 'pending';
              
              // First check if either status field exists
              if (payment.doctor_approval_status) {
                approvalStatus = payment.doctor_approval_status;
              } else if (payment.approval_status) {
                approvalStatus = payment.approval_status;
              } else if (payment.notes) {
                // If no status field, extract from notes
                approvalStatus = getApprovalStatusFromNotes(payment.notes);
              }
              
              return {
                ...payment,
                doctor_approval_status: approvalStatus, // Normalize to one standard
                invoices: matchingInvoice
              };
            });
            
            setPaymentHistory(paymentsWithInvoices);
            console.log('Payment history loaded with statuses:', paymentsWithInvoices.map(p => p.doctor_approval_status));
          } else {
            // If there was an error fetching invoices, still show payment data
            console.warn('Could not fetch invoice details:', invoicesError);
            const simplifiedPayments = data.map(payment => {
              const approvalStatus = payment.doctor_approval_status || 
                                    payment.approval_status || 
                                    getApprovalStatusFromNotes(payment.notes) || 
                                    'pending';
              return {
                ...payment,
                doctor_approval_status: approvalStatus,
                invoices: { invoice_number: 'Unknown', total_amount: 0 }
              };
            });
            setPaymentHistory(simplifiedPayments);
          }
        } else {
          // Handle case where there are payments without invoice IDs
          const simplifiedPayments = data.map(payment => ({
            ...payment,
            doctor_approval_status: payment.doctor_approval_status || 
                                    payment.approval_status || 
                                    getApprovalStatusFromNotes(payment.notes) || 
                                    'pending',
            invoices: { invoice_number: 'Unknown', total_amount: 0 }
          }));
          setPaymentHistory(simplifiedPayments);
        }
      } else {
        // No payments found, set empty array
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history: ' + error.message);
      setPaymentHistory([]); // Ensure we always set a valid array even on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload an image (JPG, PNG, GIF) or PDF file');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setPaymentProof(file);
    }
  };

  // Add this function to force refresh payment data
  const forceRefreshPayments = async () => {
    if (!user) return;
    
    console.log('Force refreshing payment history...');
    toast.info('Refreshing payment status...');
    
    try {
      setIsLoading(true);
      await fetchPaymentHistory();
      toast.success('Payment history updated');
    } catch (error) {
      console.error('Error refreshing payments:', error);
      toast.error('Failed to refresh payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedInvoice) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    const remainingAmount = selectedInvoice.total_amount - selectedInvoice.amount_paid;
    if (amount > remainingAmount) {
      toast.error(`The maximum payment amount is ₱${remainingAmount.toFixed(2)}`);
      return;
    }
    
    // Make file upload optional if there are storage issues
    if (!paymentProof && !referenceNumber.trim()) {
      toast.error('Please enter a reference number');
      return;
    }
    
    setIsUploading(true);
    
    try {
      let fileUrl = null;
      
      // Check if file size is too large
      if (paymentProof) {
        try {
          // Upload payment proof to Supabase Storage
          const fileExt = paymentProof.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          console.log('Attempting to upload file:', fileName);
          
          // Check if file size is too large
          if (paymentProof.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            setIsUploading(false);
            return;
          }
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, paymentProof, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            
            if (uploadError.message && uploadError.message.includes('bucket')) {
              console.log('Storage bucket issue, proceeding without file upload');
              toast.warn('File upload not available. Proceeding with payment without receipt.');
            } else if (uploadError.message && uploadError.message.includes('policy')) {
              console.log('Security policy issue, proceeding without file upload');
              toast.warn('File upload restricted. Proceeding with payment without receipt.');
            } else {
              // For other upload errors, we'll still proceed but notify the user
              toast.warn(`File upload issue: ${uploadError.message}. Proceeding with payment.`);
            }
          } else {
            console.log('File uploaded successfully:', uploadData);
            
            // Get public URL for the uploaded file
            const { data: { publicUrl } } = supabase.storage
              .from('payment-proofs')
              .getPublicUrl(fileName);
            
            fileUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.error('Upload attempt failed completely:', uploadErr);
          toast.warn('Could not upload file. Proceeding with payment.');
        }
      }
      
      // Create payment record with or without the file
      const actualReferenceNumber = referenceNumber.trim() || `PAY-${Date.now()}`;
      
      // Create payment record (matches the structure in the SQL)
      const paymentData = {
        invoice_id: selectedInvoice.id,
        amount: amount,
        payment_date: new Date().toISOString(),
        payment_method: paymentMethod,
        reference_number: actualReferenceNumber,
        created_at: new Date().toISOString(),
        created_by: user.id,
        doctor_approval_status: 'pending' // Add this for doctor approval
      };
      
      if (fileUrl) {
        // If we have a file URL, add it to notes
        paymentData.notes = `Payment proof: ${fileUrl}`;
      }
      
      console.log('Creating payment record:', paymentData);
      
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData])
        .select();
      
      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        toast.error(`Database error: ${paymentError.message || 'Could not create payment record'}`);
        setIsUploading(false);
        return;
      }
      
      // Also update the invoice amount_paid and status if needed
      const newAmountPaid = selectedInvoice.amount_paid + amount;
      const newStatus = newAmountPaid >= selectedInvoice.total_amount ? 'paid' : 'partial';
      
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedInvoice.id);
      
      if (invoiceUpdateError) {
        console.error('Error updating invoice:', invoiceUpdateError);
        // Continue anyway since payment was created
      }

      // Store payment information for success view
      const paymentInfo = {
        id: paymentRecord?.[0]?.id || `payment-${Date.now()}`,
        invoiceNumber: selectedInvoice.invoice_number,
        amount: amount,
        date: new Date().toISOString(),
        method: paymentMethod,
        referenceNumber: actualReferenceNumber
      };
      setCurrentPaymentInfo(paymentInfo);
      
      // Add this invoice ID to paid invoices in session
      setPaidInvoicesInSession(prev => [...prev, selectedInvoice.id]);
      
      // Show payment success view
      setShowPaymentSuccess(true);
      
      toast.success('Payment submitted successfully!');
      
      // Reset form for next time
      setPaymentProof(null);
      setReferenceNumber('');
      setPaymentAmount('');
      
      // Refresh data (but don't close the modal yet - we'll show success view)
      fetchInvoices();
      fetchPaymentHistory();
      
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error(`Failed to submit payment: ${error.message || 'Unknown error'}. Please try again.`);
      setIsUploading(false);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const calculateRemainingAmount = (invoice) => {
    return invoice.total_amount - invoice.amount_paid;
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'confirmed':
      case 'payment_confirmed':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'pending_confirmation':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePaymentSuccessDone = () => {
    // Close the modal and reset everything for next payment
    setShowPaymentSuccess(false);
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setCurrentPaymentInfo(null);
  };

  // Enhanced renderPaymentStatusBadge function
  const renderPaymentStatusBadge = (payment) => {
    if (!payment) return null;
    
    // Get status from all possible sources and normalize it
    let status = payment.doctor_approval_status || 
                payment.approval_status || 
                getApprovalStatusFromNotes(payment.notes) || 
                'pending';
    
    let statusLabel = '';
    let statusClass = '';

    // Convert status to lowercase for consistent comparison
    switch(status.toLowerCase()) {
      case 'approved':
        statusLabel = 'Approved';
        statusClass = 'bg-green-100 text-green-800';
        break;
      case 'rejected':
        statusLabel = 'Rejected';
        statusClass = 'bg-red-100 text-red-800';
        break;
      case 'pending':
      default:
        statusLabel = 'Pending Approval';
        statusClass = 'bg-yellow-100 text-yellow-800';
        break;
    }

    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
        {statusLabel}
      </span>
    );
  };

  // Function to check if an invoice has already been paid in this session
  const isInvoicePaidInSession = (invoiceId) => {
    return paidInvoicesInSession.includes(invoiceId);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Payments</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Payments
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                fetchPaymentHistory(); // Refresh payment history data
              }}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment History
            </button>
          </nav>
        </div>

        {/* Pending Payments Tab */}
        {activeTab === 'pending' && (
          <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Invoices</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Make payments for your pending bills</p>
            </div>
            <div className="border-t border-gray-200">
              {invoices.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 hover:bg-gray-50">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            Invoice #{invoice.invoice_number || invoice.id.substring(0, 8)}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Date: {formatDate(invoice.invoice_date)} | Due: {formatDate(invoice.due_date)}
                          </p>
                        </div>
                        <div className="mt-2 md:mt-0">
                          <p className="text-sm font-medium text-gray-500">
                            Total: <span className="text-gray-900">₱{invoice.total_amount.toFixed(2)}</span>
                          </p>
                          {invoice.amount_paid > 0 && (
                            <p className="text-sm font-medium text-gray-500">
                              Paid: <span className="text-green-600">₱{invoice.amount_paid.toFixed(2)}</span>
                            </p>
                          )}
                          <p className="text-sm font-medium text-gray-500">
                            Balance: <span className="text-red-600">₱{calculateRemainingAmount(invoice).toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        {isInvoicePaidInSession(invoice.id) ? (
                          <span className="inline-flex items-center px-3 py-2 text-sm leading-4 font-medium text-green-700 bg-green-100 rounded-md">
                            <FiCheck className="mr-2" />
                            Payment Submitted
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentModal(true);
                              setPaymentAmount(calculateRemainingAmount(invoice).toFixed(2));
                              setShowPaymentSuccess(false);
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                           
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No pending payments</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    All your invoices are paid or waiting for confirmation.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History Tab */}
        {activeTab === 'history' && (
          <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Payment History</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Track your submitted payment confirmations</p>
              </div>
              <button 
                onClick={forceRefreshPayments}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Check for Updates
              </button>
            </div>
            <div className="border-t border-gray-200">
              {paymentHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Submitted
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{payment.invoices?.invoice_number || payment.invoice_id.substring(0, 8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₱{payment.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.reference_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(payment.payment_date || payment.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800`}>
                              {payment.payment_method}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {payment.notes && payment.notes.includes('Payment proof:') ? (
                              <a
                                href={extractProofUrlFromNotes(payment.notes)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-900"
                              >
                                View Proof
                              </a>
                            ) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiClock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No payment history</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't submitted any payment confirmations yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && !showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900">
                Invoice #{selectedInvoice.invoice_number || selectedInvoice.id.substring(0, 8)}
              </h3>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => setSelectedInvoice(null)}
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-4 border-b border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Invoice Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.invoice_date)}</p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-base font-medium text-gray-900">Invoice Items</h4>
                <div className="mt-2 -mx-4 sm:-mx-6 overflow-x-auto">
                  <div className="inline-block min-w-full py-2 align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedInvoice.invoice_items && selectedInvoice.invoice_items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div>
                                <div>{item.service_name}</div>
                                {item.description && (
                                  <div className="text-sm text-gray-500">{item.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                              ₱{item.price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                              ₱{(item.quantity * item.price).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-full sm:w-64">
                  <div className="flex justify-between py-2">
                    <span className="font-medium text-gray-700">Total Amount:</span>
                    <span className="font-medium text-gray-900">₱{selectedInvoice.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium text-gray-700">Amount Paid:</span>
                    <span className="font-medium text-green-600">₱{selectedInvoice.amount_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t pt-2">
                    <span className="font-medium text-gray-700">Balance Due:</span>
                    <span className="font-bold text-red-600">₱{calculateRemainingAmount(selectedInvoice).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Close
                </button>
                {selectedInvoice.status !== 'paid' && !isInvoicePaidInSession(selectedInvoice.id) && (
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    onClick={() => {
                      setShowPaymentModal(true);
                      setPaymentAmount(calculateRemainingAmount(selectedInvoice).toFixed(2));
                      setShowPaymentSuccess(false);
                    }}
                  >
                    
                    Pay Now
                  </button>
                )}
                {isInvoicePaidInSession(selectedInvoice.id) && (
                  <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md">
                    <FiCheck className="mr-2" />
                    Payment Submitted
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
            {showPaymentSuccess ? (
              // Payment Success View
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Payment Successful
                  </h3>
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={handlePaymentSuccessDone}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mt-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <FiCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-gray-900">Payment Submitted Successfully</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Your payment is waiting for approval from the doctor. You can view the status in your payment history.
                  </p>
                </div>
                
                <div className="mt-6 bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium text-gray-700 mb-2">Payment Details</h4>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Invoice</dt>
                      <dd className="mt-1 text-sm text-gray-900">#{currentPaymentInfo?.invoiceNumber}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Amount</dt>
                      <dd className="mt-1 text-sm text-gray-900">₱{parseFloat(currentPaymentInfo?.amount).toFixed(2)}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(currentPaymentInfo?.date)}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Reference Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{currentPaymentInfo?.referenceNumber}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending Doctor Approval
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div className="mt-6 flex justify-between">
                 
                  <button
                    type="button"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
                    onClick={handlePaymentSuccessDone}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              // Payment Form View
              <>
                <div className="flex justify-between items-start p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Make a Payment
                  </h3>
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-2">
                  {/* Left Column - Payment Details */}
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Invoice
                      </label>
                      <div className="mt-1 text-gray-700">
                        #{selectedInvoice.invoice_number || selectedInvoice.id.substring(0, 8)} - ₱{selectedInvoice.total_amount.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Amount Due
                      </label>
                      <div className="mt-1 text-gray-700">
                        ₱{calculateRemainingAmount(selectedInvoice).toFixed(2)}
                      </div>
                    </div>

                    <div>
  <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700">
    Payment Amount
  </label>
  <div className="mt-1 relative rounded-md shadow-sm">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <span className="text-gray-500 sm:text-sm">₱</span>
    </div>
    <input
      type="number"
      id="paymentAmount"
      name="paymentAmount"
      value={paymentAmount}
      readOnly
      className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2"
      placeholder="0.00"
    />
    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
      <span className="text-gray-500 sm:text-sm">PHP</span>
    </div>
  </div>
</div>

                    <div>
                      <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        id="referenceNumber"
                        name="referenceNumber"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        required
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="Enter transaction reference number"
                      />
                    </div>

                    <div>
                      <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">
                        Payment Method
                      </label>
                      <select
                        id="paymentMethod"
                        name="paymentMethod"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        required
                      >
                        <option value="gcash">GCash</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Right Column - QR Code */}
                  <div className="bg-blue-600 p-6 flex flex-col items-center text-white">
                    {paymentMethod === 'gcash' && (
                      <>
                        <div className="bg-white p-3 rounded mb-3 w-64">
                          <img 
                            src={gcashQR} 
                            alt="GCash QR Code" 
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }} 
                          />
                          <div className="hidden text-center">
                            <p className="text-gray-500">QR Code Not Available</p>
                          </div>
                        </div>
                        <p className="text-sm text-center text-blue-100">Transfer fees may apply.</p>
                        <p className="text-base font-semibold mt-2">EL***E M*** S.</p>
                        <p className="text-sm">Mobile No.: 090* ****745</p>
                        <p className="text-sm">User ID: *********J5EvWv</p>
                        <p className="text-xs mt-3 text-center">
                          Scan this QR code using your GCash app
                        </p>
                        <p className="text-xs mt-1 text-center">
                          After payment, upload your GCash invoice/receipt below and click "Make Payment" to confirm
                        </p>

                        {/* Upload Section */}
                        <div className="w-full mt-auto">
                          <div className="mt-4 bg-white rounded p-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Upload GCash Invoice/Receipt
                            </label>
                            <div className="flex items-center">
                              <label className="flex-1">
                                <div className="px-3 py-2 border border-gray-300 bg-white rounded text-sm text-blue-600 flex items-center justify-center cursor-pointer hover:bg-gray-50">
                                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  Choose File
                                  <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    onChange={handleFileUpload}
                                    accept="image/*,.pdf"
                                  />
                                </div>
                              </label>
                              {paymentProof && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentProof(null)}
                                  className="ml-2 text-sm text-red-600 hover:text-red-500"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            {paymentProof && (
                              <div className="mt-2 flex items-center">
                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-gray-200">
                                  {paymentProof.type.startsWith('image/') ? (
                                    <img
                                      src={URL.createObjectURL(paymentProof)}
                                      alt="Preview"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="ml-2">
                                  <p className="text-sm text-gray-700">{paymentProof.name}</p>
                                  <p className="text-xs text-gray-500">{(paymentProof.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {paymentMethod === 'cash' && (
                      <div className="text-center py-8">
                        <p className="text-lg font-medium">Cash Payment</p>
                        <p className="mt-2 text-sm">
                          Please pay at our clinic during office hours<br />
                          Mon-Sat: 9AM-5PM
                        </p>
                      </div>
                    )}

                    {paymentMethod === 'bank_transfer' && (
                      <div className="text-center py-8">
                        <p className="text-lg font-medium">Bank Transfer</p>
                        <p className="mt-2 text-sm">
                          Bank: BDO<br />
                          Account Name: Silario Dental Clinic<br />
                          Account Number: 1234-5678-9012
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer with buttons */}
                  <div className="col-span-1 md:col-span-2 flex justify-end space-x-3 p-4 border-t">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      onClick={() => setShowPaymentModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Make Payment'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;