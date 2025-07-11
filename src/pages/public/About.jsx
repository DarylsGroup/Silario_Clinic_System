// src/pages/public/About.jsx
import React from 'react';
import PublicNavbar from '../../components/layouts/PublicNavbar';
import PublicFooter from '../../components/layouts/PublicFooter';
import { FiUsers, FiClipboard, FiHeart, FiHome } from 'react-icons/fi';
import silarioImg from "../../assets/Silario.jpg";
import marvinImg from "../../assets/MarvinFrando.jpg";
import jeromeImg from "../../assets/JeromeEva.jpg";


const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="bg-primary-600 text-white">
        <div className="container mx-auto px-4 py-7">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About Silario Dental Clinic</h1>
            <p className="text-xl text-primary-100">
              Providing exceptional dental care with a gentle touch since 2021
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our History</h2>
            <div className="prose prose-lg mx-auto text-center">
              <p>
                The Silario Dental Clinic was established on October 7, 2020, and officially began operations in January 2021 under the ownership of Dr. Ellaine Mae Frando Silario. With the support of her husband, Saplor John Henry, and her parents, Marieta and Elymar Silario, she was able to build and expand her clinics, providing quality dental care to the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission & Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Vision & Mission</h2>
            <p className="text-xl text-gray-600">
           
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <FiHeart className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Our Mission</h3>
              <p className="text-gray-600">
              SDC aims to provide an exceptional quality of dental care to our community that improves their life and aims to create beautiful and healthy smiles for all ages.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <FiClipboard className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Our Values</h3>
              <p className="text-gray-600">
              SDC is wholeheartedly dedicated to provide dental services with honesty and integrity. Aims to promote dental education to the community and ensures our patients to have safe and comfortable dental experience with us.
              </p>
            </div>
          </div>
        </div>
      </section>

    {/* Our Team */}
<section className="py-16 bg-white">
  <div className="container mx-auto px-4">
    <div className="max-w-3xl mx-auto mb-12 text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Team</h2>
      <p className="text-xl text-gray-600">
        Meet the dedicated professionals behind our exceptional care
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {/* Dr. Silario */}
      <div className="bg-gray-50 rounded-lg overflow-hidden shadow-md">
      <img src={silarioImg} alt="Dr. Silario" className="h-48 w-full object-cover" />

        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-1">Ellaine Mae F. Silario-Saplor, D.M.D</h3>
          <p className="text-primary-600 mb-3">General Dentist and Orthodontist</p>
          <p className="text-gray-600">
            With over 5 years of experience, Dr. Silario leads the team with her expertise in comprehensive family dentistry.
          </p>
        </div>
      </div>

      {/* Marvin Frando */}
      <div className="bg-gray-50 rounded-lg overflow-hidden shadow-md">
        <img src={marvinImg} alt="Marvin Frando" className="h-48 w-full object-cover" />
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-1">Marvin Frando</h3>
          <p className="text-primary-600 mb-3">Dental Assistant</p>
          <p className="text-gray-600">
          Assist in preparing tools, supporting patient care, and maintaining a clean and organized dental environment.
          </p>
        </div>
      </div>

      {/* Jerome Eva */}
      <div className="bg-gray-50 rounded-lg overflow-hidden shadow-md">
      <img src={jeromeImg} alt="Jerome Eva" className="h-48 w-full object-cover" />
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-1">Jerome Eva</h3>
          <p className="text-primary-600 mb-3">Dental Assistant</p>
          <p className="text-gray-600">
          Helping ensure smooth and efficient treatment for every patient.
          </p>
        </div>
      </div>
    </div>

   
  </div>
</section>

      <PublicFooter />
    </div>
  );
};

export default About;