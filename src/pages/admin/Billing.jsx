// src/pages/admin/Billing.jsx - Updated with Payment Confirmation Feature
import React, { useState, useEffect } from 'react';
import { FiFileText, FiCreditCard, FiSearch, FiFilter, FiDownload, FiCheck, FiX, FiEye, FiEdit, FiClock } from 'react-icons/fi';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const Billing = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingConfirmations: 0
  });
  const [invoices, setInvoices] = useState([]);
  const [paymentConfirmations, setPaymentConfirmations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [filteredConfirmations, setFilteredConfirmations] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedConfirmation, setSelectedConfirmation] = useState(null);
  const [confirmationRemarks, setConfirmationRemarks] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchQuery, dateFilter, statusFilter]);

  useEffect(() => {
    filterConfirmations();
  }, [paymentConfirmations, searchQuery]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRevenueStats(),
        fetchInvoices(),
        fetchPaymentConfirmations()
      ]);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRevenueStats = async () => {
    try {
      // Total Revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid')
        .eq('status', 'paid');
      
      if (revenueError) throw revenueError;
      
      const totalRevenue = revenueData?.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0) || 0;
      
      // Pending Payments
      const { data: pendingData, error: pendingError } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid')
        .eq('status', 'pending');
      
      if (pendingError) throw pendingError;
      
      const pendingPayments = pendingData?.reduce((sum, invoice) => 
        sum + ((invoice.total_amount || 0) - (invoice.amount_paid || 0)), 0) || 0;
      
      // Counts
      const { count: totalCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });
      
      const { count: paidCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid');
      
      const { count: pendingConfirmCount } = await supabase
        .from('payment_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_confirmation');
      
      setStats({
        totalRevenue,
        pendingPayments,
        totalInvoices: totalCount || 0,
        paidInvoices: paidCount || 0,
        pendingConfirmations: pendingConfirmCount || 0
      });
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
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
          created_at,
          profiles:patient_id(id, full_name, phone, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setInvoices(data || []);
      setFilteredInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchPaymentConfirmations = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_confirmations')
        .select(`
          id,
          invoice_id,
          amount,
          payment_method,
          reference_number,
          proof_url,
          status,
          remarks,
          confirmed_by,
          created_at,
          patient:patient_id(id, full_name, phone),
          invoice:invoice_id(invoice_number)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPaymentConfirmations(data || []);
      setFilteredConfirmations(data || []);
    } catch (error) {
      console.error('Error fetching payment confirmations:', error);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoice_number?.toLowerCase().includes(query) ||
        invoice.profiles?.full_name?.toLowerCase().includes(query) ||
        invoice.profiles?.phone?.toLowerCase().includes(query)
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(invoice => 
        new Date(invoice.created_at) >= startDate
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => 
        invoice.status === statusFilter
      );
    }

    setFilteredInvoices(filtered);
  };

  const filterConfirmations = () => {
    let filtered = [...paymentConfirmations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(confirmation =>
        confirmation.reference_number?.toLowerCase().includes(query) ||
        confirmation.patient?.full_name?.toLowerCase().includes(query) ||
        confirmation.invoice?.invoice_number?.toLowerCase().includes(query)
      );
    }

    setFilteredConfirmations(filtered);
  };

  const handleViewInvoice = async (invoice) => {
    setIsLoading(true);
    try {
      const { data: items, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      
      if (error) throw error;
      
      setSelectedInvoice({
        ...invoice,
        items: items || []
      });
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to fetch invoice details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInvoice = (invoice) => {
    // Navigate to edit invoice page
    navigate(`/admin/edit-invoice/${invoice.id}`);
  };

  const processPaymentConfirmation = async (action) => {
    if (!selectedConfirmation) return;
    
    setIsLoading(true);
    try {
      // Update payment confirmation status
      const { error: confirmError } = await supabase
        .from('payment_confirmations')
        .update({
          status: action === 'confirm' ? 'payment_confirmed' : 'rejected',
          remarks: confirmationRemarks,
          confirmed_by: 'admin', // You should get this from the auth context
          confirmed_at: new Date().toISOString()
        })
        .eq('id', selectedConfirmation.id);
      
      if (confirmError) throw confirmError;
      
      if (action === 'confirm') {
        // Update invoice payment status
        const { data: invoice } = await supabase
          .from('invoices')
          .select('total_amount, amount_paid')
          .eq('id', selectedConfirmation.invoice_id)
          .single();
        
        const newAmountPaid = (invoice.amount_paid || 0) + selectedConfirmation.amount;
        const isFullyPaid = newAmountPaid >= invoice.total_amount;
        
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            amount_paid: newAmountPaid,
            status: isFullyPaid ? 'paid' : 'pending',
            payment_method: selectedConfirmation.payment_method
          })
          .eq('id', selectedConfirmation.invoice_id);
        
        if (invoiceError) throw invoiceError;
        
        // Create payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            invoice_id: selectedConfirmation.invoice_id,
            amount: selectedConfirmation.amount,
            payment_date: new Date().toISOString(),
            payment_method: selectedConfirmation.payment_method,
            reference_number: selectedConfirmation.reference_number,
            created_by: 'admin' // You should get this from the auth context
          });
        
        if (paymentError) throw paymentError;
        
        toast.success('Payment confirmed successfully');
      } else {
        toast.success('Payment rejected');
      }
      
      setShowConfirmationModal(false);
      setSelectedConfirmation(null);
      setConfirmationRemarks('');
      fetchAllData();
    } catch (error) {
      console.error('Error processing payment confirmation:', error);
      toast.error('Failed to process payment confirmation');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
      case 'payment_confirmed':
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

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Billing & Payments</h1>
          
        </div>

        {/* Revenue Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <span className="text-2xl font-bold">₱</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FiCreditCard className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pending Payments</h3>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.pendingPayments)}</p>
                <p className="text-xs text-gray-500 mt-1">To be collected</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <FiClock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pending Confirmations</h3>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingConfirmations}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoices ({stats.totalInvoices})
            </button>
            <button
              onClick={() => setActiveTab('confirmations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'confirmations'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment Confirmations ({stats.pendingConfirmations})
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'invoices' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by invoice # or patient..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Invoices Table */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <div className="overflow-x-auto">
                {filteredInvoices.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.invoice_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{invoice.profiles?.full_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{invoice.profiles?.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(invoice.invoice_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(invoice.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(invoice.amount_paid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => handleViewInvoice(invoice)}
                              className="text-primary-600 hover:text-primary-900 mr-3"
                            >
                              <FiEye className="h-5 w-5" />
                            </button>
                            
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No invoices found.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'confirmations' && (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by reference # or patient..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Payment Confirmations Table */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <div className="overflow-x-auto">
                {filteredConfirmations.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference #
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredConfirmations.map((confirmation) => (
                        <tr key={confirmation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {confirmation.invoice?.invoice_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{confirmation.patient?.full_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{confirmation.patient?.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {confirmation.reference_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(confirmation.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {confirmation.payment_method}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(confirmation.status)}`}>
                              {confirmation.status === 'pending_confirmation' ? 'Pending' : 
                               confirmation.status === 'payment_confirmed' ? 'Confirmed' :
                               confirmation.status === 'rejected' ? 'Rejected' : confirmation.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a
                              href={confirmation.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-900 mr-3"
                              title="View Proof"
                            >
                              <FiEye className="h-5 w-5" />
                            </a>
                            {confirmation.status === 'pending_confirmation' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedConfirmation(confirmation);
                                    setShowConfirmationModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900 mr-3"
                                  title="Confirm Payment"
                                >
                                  <FiCheck className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedConfirmation(confirmation);
                                    setShowConfirmationModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                  title="Reject Payment"
                                >
                                  <FiX className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No payment confirmations found.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Invoice #{selectedInvoice.invoice_number}
              </h3>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Patient</p>
                  <p className="text-lg font-medium">{selectedInvoice.profiles?.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.profiles?.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-lg font-medium">{formatDate(selectedInvoice.invoice_date)}</p>
                  <p className="text-sm text-gray-500">Due: {formatDate(selectedInvoice.due_date)}</p>
                </div>
              </div>

              <div className="border-t border-b py-4">
                <h4 className="font-medium mb-2">Invoice Items</h4>
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-sm text-gray-500">Description</th>
                      <th className="text-right text-sm text-gray-500">Qty</th>
                      <th className="text-right text-sm text-gray-500">Price</th>
                      <th className="text-right text-sm text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="py-2">{item.service_name}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                        <td className="py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-right">
                <div className="flex justify-between mb-2">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Amount Paid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(selectedInvoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Balance Due:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(selectedInvoice.total_amount - selectedInvoice.amount_paid)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showConfirmationModal && selectedConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Payment
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Review the payment proof and confirm or reject the payment.
              </p>
            </div>

            <div className="mb-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p className="font-medium">{selectedConfirmation.invoice?.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient</p>
                <p className="font-medium">{selectedConfirmation.patient?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium">{formatCurrency(selectedConfirmation.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium">{selectedConfirmation.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reference Number</p>
                <p className="font-medium">{selectedConfirmation.reference_number}</p>
              </div>
              <div>
                <a
                  href={selectedConfirmation.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-900 underline"
                >
                  View Payment Proof
                </a>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                value={confirmationRemarks}
                onChange={(e) => setConfirmationRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                rows="3"
                placeholder="Add any remarks..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setSelectedConfirmation(null);
                  setConfirmationRemarks('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => processPaymentConfirmation('reject')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => processPaymentConfirmation('confirm')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;