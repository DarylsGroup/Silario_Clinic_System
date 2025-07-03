// src/pages/admin/ServiceManagement.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../config/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FiPlus, FiEdit, FiTrash2, FiDollarSign, FiClock, 
  FiSave, FiX, FiFilter, FiTag
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ServiceManagement = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [doctorPricing, setDoctorPricing] = useState({});

  // New service form state
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    category: 'general',
    price: '',
    price_min: '',
    price_max: '',
    duration: 30,
  });

  useEffect(() => {
    fetchUserRole();
    fetchServices();
  }, []);

  // Filter services based on selected category
  useEffect(() => {
    if (!services.length) {
      setFilteredServices([]);
      return;
    }
    
    let filtered = [...services];
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(service => service.category === activeCategory);
    }
    
    setFilteredServices(filtered);
  }, [services, activeCategory]);

  // Fetch user role
  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setUserRole(data.role);
      
      // If user is a doctor, fetch their specific pricing
      if (data.role === 'doctor') {
        fetchDoctorPricing();
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  // Fetch doctor-specific pricing
  const fetchDoctorPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_service_pricing')
        .select('service_id, price')
        .eq('doctor_id', user.id);
      
      if (error) throw error;
      
      // Create a map of service_id to price
      const pricingMap = {};
      data.forEach(item => {
        pricingMap[item.service_id] = item.price;
      });
      
      setDoctorPricing(pricingMap);
    } catch (error) {
      console.error('Error fetching doctor pricing:', error);
    }
  };

  // Fetch services
  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (editingService) {
      setEditingService({
        ...editingService,
        [name]: name === 'price' || name === 'price_min' || name === 'price_max' || name === 'duration' 
          ? parseFloat(value) || 0
          : value
      });
    } else {
      setNewService({
        ...newService,
        [name]: name === 'price' || name === 'price_min' || name === 'price_max' || name === 'duration' 
          ? parseFloat(value) || 0
          : value
      });
    }
  };

  // Handle doctor price changes
  const handleDoctorPriceChange = (serviceId, price) => {
    setDoctorPricing({
      ...doctorPricing,
      [serviceId]: parseFloat(price) || 0
    });
  };

  // Save doctor pricing
  const saveDoctorPricing = async (serviceId) => {
    try {
      const price = doctorPricing[serviceId];
      
      // Upsert the doctor pricing record
      const { error } = await supabase
        .from('doctor_service_pricing')
        .upsert({
          doctor_id: user.id,
          service_id: serviceId,
          price: price
        });
      
      if (error) throw error;
      
      toast.success('Price updated successfully');
    } catch (error) {
      console.error('Error saving doctor pricing:', error);
      toast.error('Failed to update price');
    }
  };

  // Handle adding a new service
  const handleAddService = async () => {
    try {
      // Validate form
      if (!newService.name || !newService.price) {
        toast.error('Name and price are required');
        return;
      }
      
      // Set default price range if not provided
      const priceMin = newService.price_min || Math.round(newService.price * 0.8);
      const priceMax = newService.price_max || Math.round(newService.price * 1.2);
      
      // Insert new service
      const { data, error } = await supabase
        .from('services')
        .insert({
          name: newService.name,
          description: newService.description,
          category: newService.category,
          price: newService.price,
          price_min: priceMin,
          price_max: priceMax,
          duration: newService.duration
        })
        .select();
      
      if (error) throw error;
      
      // Reset form
      setNewService({
        name: '',
        description: '',
        category: 'general',
        price: '',
        price_min: '',
        price_max: '',
        duration: 30,
      });
      
      setShowAddForm(false);
      
      // Refresh services
      fetchServices();
      
      toast.success('Service added successfully');
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service');
    }
  };

  // Handle updating a service
  const handleUpdateService = async () => {
    try {
      // Validate form
      if (!editingService.name || !editingService.price) {
        toast.error('Name and price are required');
        return;
      }
      
      // Set default price range if not provided
      const priceMin = editingService.price_min || Math.round(editingService.price * 0.8);
      const priceMax = editingService.price_max || Math.round(editingService.price * 1.2);
      
      // Update service
      const { error } = await supabase
        .from('services')
        .update({
          name: editingService.name,
          description: editingService.description,
          category: editingService.category,
          price: editingService.price,
          price_min: priceMin,
          price_max: priceMax,
          duration: editingService.duration
        })
        .eq('id', editingService.id);
      
      if (error) throw error;
      
      // Reset editing state
      setEditingService(null);
      
      // Refresh services
      fetchServices();
      
      toast.success('Service updated successfully');
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };

  // Handle deleting a service
  const handleDeleteService = async (serviceId) => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);
      
      if (error) throw error;
      
      // Refresh services
      fetchServices();
      
      toast.success('Service deleted successfully');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Service Management</h1>
          {userRole === 'admin' && (
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <div className="flex items-center">
                {showAddForm ? (
                  <>
                    <FiX className="mr-2" />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="mr-2" />
                    <span>Add New Service</span>
                  </>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-md ${
                activeCategory === 'all' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setActiveCategory('general')}
              className={`px-3 py-1.5 rounded-md ${
                activeCategory === 'general' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              General Dentistry
            </button>
            <button
              onClick={() => setActiveCategory('cosmetic')}
              className={`px-3 py-1.5 rounded-md ${
                activeCategory === 'cosmetic' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cosmetic Dentistry
            </button>
            <button
              onClick={() => setActiveCategory('orthodontics')}
              className={`px-3 py-1.5 rounded-md ${
                activeCategory === 'orthodontics' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Orthodontics
            </button>
            <button
              onClick={() => setActiveCategory('surgery')}
              className={`px-3 py-1.5 rounded-md ${
                activeCategory === 'surgery' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Oral Surgery
            </button>
          </div>
        </div>

        {/* Add Service Form */}
        {showAddForm && userRole === 'admin' && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Service</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newService.name}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={newService.category}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="general">General Dentistry</option>
                  <option value="cosmetic">Cosmetic Dentistry</option>
                  <option value="orthodontics">Orthodontics</option>
                  <option value="surgery">Oral Surgery</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={newService.price}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="100"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={newService.duration}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="15"
                />
              </div>
              
              <div>
                <label htmlFor="price_min" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Price (₱)
                </label>
                <input
                  type="number"
                  id="price_min"
                  name="price_min"
                  value={newService.price_min}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="100"
                  placeholder={newService.price ? `Default: ${Math.round(newService.price * 0.8)}` : ""}
                />
              </div>
              
              <div>
                <label htmlFor="price_max" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Price (₱)
                </label>
                <input
                  type="number"
                  id="price_max"
                  name="price_max"
                  value={newService.price_max}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="100"
                  placeholder={newService.price ? `Default: ${Math.round(newService.price * 1.2)}` : ""}
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newService.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddService}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Add Service
              </button>
            </div>
          </div>
        )}

        {/* Edit Service Form */}
        {editingService && userRole === 'admin' && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Service</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={editingService.name}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="edit-category"
                  name="category"
                  value={editingService.category}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="general">General Dentistry</option>
                  <option value="cosmetic">Cosmetic Dentistry</option>
                  <option value="orthodontics">Orthodontics</option>
                  <option value="surgery">Oral Surgery</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="edit-price"
                  name="price"
                  value={editingService.price}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="100"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="edit-duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="edit-duration"
                  name="duration"
                  value={editingService.duration}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="15"
                />
              </div>
              
              <div>
                <label htmlFor="edit-price_min" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Price (₱)
                </label>
                <input
                  type="number"
                  id="edit-price_min"
                  name="price_min"
                  value={editingService.price_min}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="100"
                />
              </div>
              
              <div>
                <label htmlFor="edit-price_max" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Price (₱)
                </label>
                <input
                  type="number"
                  id="edit-price_max"
                  name="price_max"
                  value={editingService.price_max}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="100"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editingService.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateService}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Update Service
              </button>
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="bg-white overflow-hidden border border-gray-200 sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Dental Services</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {userRole === 'admin' 
                ? 'Manage all services offered by the clinic.' 
                : userRole === 'doctor' 
                  ? 'Set your specific pricing for services.'
                  : 'View all services offered by the clinic.'}
            </p>
          </div>
          
          <div className="border-t border-gray-200">
            {filteredServices.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No services found in this category.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <li key={service.id} className="p-4 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row justify-between">
                      <div className="flex-grow mb-2 sm:mb-0">
                        <div className="flex items-center">
                          <h4 className="text-lg font-medium text-gray-900">{service.name}</h4>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {service.category === 'general' && 'General Dentistry'}
                            {service.category === 'cosmetic' && 'Cosmetic Dentistry'}
                            {service.category === 'orthodontics' && 'Orthodontics'}
                            {service.category === 'surgery' && 'Oral Surgery'}
                            {service.category === 'other' && 'Other'}
                          </span>
                        </div>
                        
                        <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                        
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center text-gray-500">
                            <FiClock className="mr-1" />
                            <span>{service.duration} mins</span>
                          </div>
                          
                          <div className="flex items-center text-gray-700">
                            
                            <span>Base: ₱{service.price.toLocaleString()}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-500">
                            <FiTag className="mr-1" />
                            <span>Range: ₱{service.price_min?.toLocaleString() || Math.round(service.price * 0.8).toLocaleString()} - ₱{service.price_max?.toLocaleString() || Math.round(service.price * 1.2).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {userRole === 'admin' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingService(service)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Edit Service"
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Delete Service"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                        
                        {userRole === 'doctor' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={doctorPricing[service.id] || ''}
                              onChange={(e) => handleDoctorPriceChange(service.id, e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                              placeholder="Set your price"
                              min="0"
                              step="100"
                            />
                            <button
                              onClick={() => saveDoctorPricing(service.id)}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Save Price"
                            >
                              <FiSave className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceManagement;