// src/pages/patient/Services.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiSearch, FiFilter } from 'react-icons/fi';
import supabase from '../../config/supabaseClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Services = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [categorizedServices, setCategorizedServices] = useState({});
  
  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, activeCategory, searchQuery]);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      // Use patient_service_view if it exists, otherwise use services table
      const { data, error } = await supabase
        .from('patient_service_view')
        .select('*')
        .order('name');
      
      if (error) {
        // If view doesn't exist, fallback to regular services table
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .order('name');
          
        if (servicesError) throw servicesError;
        setServices(servicesData || []);
        
        // Process categories
        const uniqueCategories = [...new Set(servicesData.map(service => service.category))].filter(Boolean);
        setCategories(['all', ...uniqueCategories]);
        
        // Group services by category
        const grouped = {};
        servicesData.forEach(service => {
          const category = service.category || 'Other';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(service);
        });
        setCategorizedServices(grouped);
      } else {
        setServices(data || []);
        
        // Process categories
        const uniqueCategories = [...new Set(data.map(service => service.category))].filter(Boolean);
        setCategories(['all', ...uniqueCategories]);
        
        // Group services by category
        const grouped = {};
        data.forEach(service => {
          const category = service.category || 'Other';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(service);
        });
        setCategorizedServices(grouped);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = [...services];
    
    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(service => service.category === activeCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        service =>
          (service.name && service.name.toLowerCase().includes(query)) ||
          (service.description && service.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredServices(filtered);
    
    // Recategorize filtered services
    const grouped = {};
    filtered.forEach(service => {
      const category = service.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(service);
    });
    setCategorizedServices(grouped);
  };

  // Function to format category name for display
  const formatCategoryName = (category) => {
    if (!category) return 'Other Services';
    
    // Convert category keys like 'general' to 'General Dentistry'
    const categoryMap = {
      'general': 'General Dentistry',
      'cosmetic': 'Cosmetic Dentistry',
      'orthodontics': 'Orthodontics',
      'surgery': 'Oral Surgery',
      'other': 'Other Services'
    };
    
    return categoryMap[category] || category.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format price display
  const formatPrice = (service) => {
    // Check if we have price range
    if (service.price_min && service.price_max) {
      return `₱${service.price_min.toLocaleString()} - ₱${service.price_max.toLocaleString()}`;
    }
    // Otherwise use base price
    else if (service.price) {
      return `₱${service.price.toLocaleString()}`;
    }
    // If neither, show as variable
    return 'Price varies';
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dental Services</h1>
        </div>

        {/* Search and filter */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          <div className="relative max-w-xs sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search services..."
              className="block w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100 text-gray-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ color: 'rgb(75, 85, 99)' }}
            />
          </div>
          <div className="w-full sm:w-56">
            <div className="relative">
              <FiFilter className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="block w-full pl-8 pr-6 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md bg-gray-100 text-gray-600"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                style={{ color: 'rgb(75, 85, 99)' }}
              >
                <option value="all" className="text-gray-600">All Categories</option>
                {categories.filter(cat => cat !== 'all').map((category) => (
                  <option key={category} value={category} className="text-gray-600">
                    {formatCategoryName(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Services List */}
        {Object.keys(categorizedServices).length > 0 ? (
          Object.entries(categorizedServices).map(([category, categoryServices]) => (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{formatCategoryName(category)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryServices.map((service) => (
                  <div 
                    key={service.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    <div className="mt-1 flex justify-between text-sm">
                      <span className="text-primary-600 font-medium">{formatPrice(service)}</span>
                      <span className="text-gray-500">{service.duration || '-'} min</span>
                    </div>
                    <p className="mt-2 text-gray-600 text-sm line-clamp-3">
                      {service.description || 'No description available.'}
                    </p>
                    <div className="mt-4">
                     
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No services found. Please try a different search or filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;