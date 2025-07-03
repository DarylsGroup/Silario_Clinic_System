// src/pages/public/Contact.jsx
import React, { useState } from 'react';
import PublicNavbar from '../../components/layouts/PublicNavbar';
import PublicFooter from '../../components/layouts/PublicFooter';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    try {
      // In a real app, this would be an API call to send the form data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Message sent successfully!');
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="bg-primary-600 text-white">
        <div className="container mx-auto px-4 py-7">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
            <p className="text-xl text-primary-100">
              We're here to answer your questions and help you schedule your next visit
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Cabugao Branch */}
            <div className="bg-gray-50 rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Cabugao Branch</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiMapPin className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">Address</p>
                    <p className="text-gray-600">Salomague road, Turod, Cabugao, Ilocos Sur</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiPhone className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">Phone</p>
                    <p className="text-gray-600">09064782745</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiMail className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">Email</p>
                    <p className="text-gray-600">docsilariosaplor@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiClock className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">Hours</p>
                    <div className="text-gray-600">
                      <p>Monday to Friday: 8:00 AM - 12:00 PM</p>
                      <p>Saturday: 8:00 AM - 5:00 PM</p>
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* San Juan Branch */}
            <div className="bg-gray-50 rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">San Juan Branch</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiMapPin className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">Address</p>
                    <p className="text-gray-600">Luna Street, Ressurection, San Juan, Ilocos Sur</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiPhone className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">Phone</p>
                    <p className="text-gray-600">09064782745</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiMail className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">Email</p>
                    <p className="text-gray-600">docsilariosaplor@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiClock className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-900 font-medium">Hours</p>
                    <div className="text-gray-600">
                      <p>Monday to Friday: 1:00 PM - 5:00 PM</p>
                    
                      <p>Sunday: 8:00 AM - 5:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Maps */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  <div className="rounded-lg overflow-hidden h-64">
    <iframe 
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d61339.63367044403!2d120.42563967068251!3d17.80009237360089!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x338e89d2fe87f8c5%3A0x2e91c218b26ba132!2sCabugao%2C%20Ilocos%20Sur!5e0!3m2!1sen!2sph!4v1683179262796!5m2!1sen!2sph"
      width="100%" 
      height="100%" 
      style={{ border: 0 }} 
      allowFullScreen 
      loading="lazy" 
      referrerPolicy="no-referrer-when-downgrade"
      className="w-full h-full"
    />
  </div>
  
  <div className="rounded-lg overflow-hidden h-64">
    <iframe 
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d61371.45399090823!2d120.44268162161767!3d17.725366038617513!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x338e85302b335a91%3A0xb0ed5abcff0e976c!2sSan%20Juan%2C%20Ilocos%20Sur!5e0!3m2!1sen!2sph!4v1683179378525!5m2!1sen!2sph"
      width="100%" 
      height="100%" 
      style={{ border: 0 }} 
      allowFullScreen 
      loading="lazy" 
      referrerPolicy="no-referrer-when-downgrade"
      className="w-full h-full"
    />
  </div>
</div>
</div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Contact;