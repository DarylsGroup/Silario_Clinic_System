// src/pages/public/Services.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/layouts/PublicNavbar';
import PublicFooter from '../../components/layouts/PublicFooter';
import supabase from '../../config/supabaseClient';
import { FiCalendar } from 'react-icons/fi';

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        setServices(data || []);
        
        // Extract categories from services
        const cats = ['all']; // Start with 'all' category
        data.forEach(service => {
          // For this example, we'll use the first word of the service name as a category
          // In a real app, you would have a proper category field
          const category = service.name.split(' ')[0];
          if (!cats.includes(category)) {
            cats.push(category);
          }
        });
        
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchServices();
  }, []);

  // Filter services by category
  const filteredServices = activeCategory === 'all' 
    ? services 
    : services.filter(service => service.name.startsWith(activeCategory));

  // For demonstration, we'll group services in predefined categories
  const serviceCategories = {
    'General Dentistry': [
      {
        name: 'Dental Examination',
        description: 'Comprehensive examination including X-rays and treatment planning.',
        price: 500,
        duration: 30
      },
      {
        name: 'Teeth Cleaning',
        description: 'Professional cleaning to remove plaque and tartar buildup.',
        price: 800,
        duration: 45
      },
      {
        name: 'Fluoride Treatment',
        description: 'Application of fluoride to strengthen teeth and prevent decay.',
        price: 400,
        duration: 20
      },
      {
        name: 'Dental Fillings',
        description: 'Restore damaged teeth with tooth-colored composite materials.',
        price: 1000,
        duration: 60
      }
    ],
    'Cosmetic Dentistry': [
      {
        name: 'Teeth Whitening',
        description: 'Professional whitening to remove stains and brighten your smile.',
        price: 3500,
        duration: 90
      },
      {
        name: 'Dental Veneers',
        description: 'Thin porcelain shells that cover the front surface of teeth.',
        price: 8000,
        duration: 120
      },
      {
        name: 'Composite Bonding',
        description: 'Repair damaged, discolored or gapped teeth using tooth-colored composite.',
        price: 2500,
        duration: 60
      }
    ],
    'Orthodontics': [
      {
        name: 'Braces Consultation',
        description: 'Initial assessment to determine if braces are right for you.',
        price: 1500,
        duration: 45
      },
      {
        name: 'Traditional Braces',
        description: 'Metal brackets and wires to straighten teeth and correct bite issues.',
        price: 45000,
        duration: 60
      },
      {
        name: 'Braces Adjustment',
        description: 'Regular adjustments for patients with braces.',
        price: 800,
        duration: 30
      }
    ],
    'Oral Surgery': [
      {
        name: 'Simple Extraction',
        description: 'Removal of visible teeth that are accessible.',
        price: 1500,
        duration: 45
      },
      {
        name: 'Surgical Extraction',
        description: 'Removal of teeth that are not easily accessible or partially erupted.',
        price: 3500,
        duration: 90
      },
      {
        name: 'Root Canal Therapy',
        description: 'Treatment for infected tooth pulp to save the tooth.',
        price: 5000,
        duration: 120
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="bg-primary-600 text-white">
        <div className="container mx-auto px-4 py-7">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Dental Services</h1>
            <p className="text-xl text-primary-100">
              Comprehensive care for all your dental needs
            </p>
          </div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          {Object.entries(serviceCategories).map(([category, categoryServices]) => (
            <div key={category} className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categoryServices.map((service, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 rounded-lg overflow-hidden shadow-md transition-transform hover:transform hover:scale-105"
                  >
                    <div className="bg-primary-600 h-2"></div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{service.name}</h3>
                      <div className="flex justify-between mb-3">
                        
                        
                      </div>
                      <p className="text-gray-600 mb-4">
                        {service.description}
                      </p>
                      <Link 
                        to="/login" 
                        className="inline-flex items-center text-primary-600 hover:text-primary-800"
                      >
                        <FiCalendar className="mr-1" />
                        <span>Book Appointment</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Schedule Your Visit?</h2>
            <p className="text-xl text-gray-600 mb-8">
              Our team is ready to provide you with exceptional dental care
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                to="/register"
                className="px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
              >
                Register Now
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 border border-primary-600 text-primary-600 font-medium rounded-md hover:bg-primary-50 transition-colors"
              >
                Login & Book
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Services;