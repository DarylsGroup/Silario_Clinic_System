// src/pages/doctor/DentalChart.jsx - Enhanced with Official Forms Layout
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPrinter, FiDownload, FiEdit, FiEye } from 'react-icons/fi';
import { toast } from 'react-toastify';
import supabase from '../../config/supabaseClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DentalChart = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dentalChart, setDentalChart] = useState({});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Dental chart symbols from the official form
  const chartSymbols = {
    'A': 'Decayed (Caries Indicated for filling)',
    'B': 'Missing due to caries',
    'C': 'Caries Indicated for Extraction',
    'D': 'Filled Fragment',
    'E': 'Filled tooth for caries',
    'F': 'Impacted Tooth',
    'G': 'Jacket Crown',
    'H': 'Abutment Filling',
    'I': 'Pontic',
    'J': 'Full Crown Prosthetic',
    'K': 'Removable Denture',
    'L': 'Extraction due to other causes',
    'M': 'Congenitally missing',
    'N': 'Supernumerary tooth',
    'O': 'Root Fragment',
    'P': 'Unerupted'
  };

  // Medical History Questions
  const medicalHistory = [
    'Are you under any form of medication? If yes, please specify',
    'Have you been hospitalized or seriously ill? If yes, when and why?',
    'Are you pregnant?',
    'Are you nursing?',
    'Are you taking birth control pills?',
    'Do you have or have you had any of the following? Check which apply:'
  ];

  const medicalConditions = [
    'High Blood Pressure', 'Low Blood Pressure', 'Epilepsy or Seizures', 'AIDS or HIV Positive',
    'Sexually Transmitted Disease', 'Stomach Troubles', 'Fainting Spells', 'Rapid Weight Loss',
    'Radiation Treatment', 'Joint Replacement', 'Heart Surgery', 'Heart Attack',
    'Heart Murmur', 'Heart Disease', 'Heart Pacemaker', 'Thyroid Problems',
    'Respiratory Problems', 'Hepatitis/Liver Disease', 'Rheumatic Fever', 'Diabetes',
    'Chemotherapy', 'Kidney Problems', 'Tuberculosis', 'Persistent Cough',
    'Bleeding Problems', 'Blood Disease', 'Head Injuries', 'Arthritis or Rheumatism'
  ];

  const dentalHistory = [
    'What is your chief dental concern?',
    'Previous Dentist:',
    'Last Dental Visit:',
    'Do you have toothache now?',
    'Do you clench or grind your teeth?',
    'Have you ever had serious trouble with any previous dental treatment?',
    'Have you ever had complications from anesthetics?'
  ];

  const conditions = {
    'Gingivitis': false,
    'Early Periodontitis': false,
    'Moderate Periodontitis': false,
    'Advanced Periodontitis': false,
    'Cervical': false,
    'Chronic': false,
    'Operative': false,
    'Relative Periodontal': false,
    'Composite': false
  };

  const applications = {
    'Preventive': false,
    'Restorative': false,
    'Extraction': false,
    'Operative': false,
    'Bleaching': false,
    'Cosmetic': false
  };

  const tmdConditions = {
    'Clenching': false,
    'Clicking': false,
    'Locking': false,
    'Muscle Spasm': false
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
      fetchDentalChart();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      setPatient(data);
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast.error('Failed to load patient data');
    }
  };

  const fetchDentalChart = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dental_charts')
        .select('*')
        .eq('patient_id', patientId)
        .single();
      
      if (data) {
        setDentalChart(data.chart_data || {});
      }
    } catch (error) {
      console.error('Error fetching dental chart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDentalChart = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const chartData = {
        patient_id: patientId,
        chart_data: dentalChart,
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('dental_charts')
        .upsert(chartData, {
          onConflict: 'patient_id'
        });

      if (error) throw error;
      
      toast.success('Dental chart saved successfully');
      setEditMode(false);
    } catch (error) {
      console.error('Error saving dental chart:', error);
      toast.error('Failed to save dental chart');
    } finally {
      setIsSaving(false);
    }
  };

  const updateToothData = (toothNumber, field, value) => {
    setDentalChart(prev => ({
      ...prev,
      teeth: {
        ...prev.teeth,
        [toothNumber]: {
          ...prev.teeth?.[toothNumber],
          [field]: value
        }
      }
    }));
  };

  const updateChartData = (section, field, value) => {
    setDentalChart(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    try {
      const today = new Date();
      const birthDate = new Date(birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return '';
    }
  };

  const printDentalChart = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dental Chart - ${patient?.full_name}</title>
        <style>
          @page {
            size: A4;
            margin: 0.3in;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 9px;
            line-height: 1.1;
            color: #000;
          }
          .header-section {
            border: 2px solid #000;
            margin-bottom: 5px;
            padding: 8px;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .clinic-logo {
            display: flex;
            align-items: center;
          }
          .logo-circle {
            width: 45px;
            height: 45px;
            border: 2px solid #1e40af;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #3b82f6;
            color: white;
            font-weight: bold;
            font-size: 16px;
            margin-right: 10px;
          }
          .clinic-info h1 {
            margin: 0;
            font-size: 18px;
            color: #1e40af;
            font-weight: bold;
          }
          .clinic-info p {
            margin: 2px 0;
            font-size: 10px;
            color: #666;
          }
          .form-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            letter-spacing: 1px;
          }
          .patient-info {
            border: 1px solid #000;
            padding: 8px;
            margin-bottom: 5px;
          }
          .patient-info h3 {
            margin: 0 0 8px 0;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            background: #f0f0f0;
            padding: 4px;
            border: 1px solid #000;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 8px;
            font-size: 8px;
          }
          .info-item {
            display: flex;
            align-items: center;
            border-bottom: 1px solid #000;
            padding: 2px 0;
          }
          .info-label {
            font-weight: bold;
            min-width: 50px;
            margin-right: 5px;
          }
          .info-value {
            flex: 1;
            padding: 2px;
          }
          
          /* Medical History Section */
          .medical-section {
            border: 1px solid #000;
            margin-bottom: 5px;
            font-size: 8px;
          }
          .section-header {
            background: #f0f0f0;
            padding: 4px 8px;
            border-bottom: 1px solid #000;
            font-weight: bold;
            text-align: center;
            font-size: 10px;
          }
          .medical-content {
            padding: 8px;
          }
          .medical-questions {
            margin-bottom: 8px;
          }
          .medical-question {
            margin-bottom: 6px;
            display: flex;
            align-items: flex-start;
          }
          .question-number {
            font-weight: bold;
            margin-right: 5px;
            min-width: 15px;
          }
          .conditions-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 4px;
            margin-top: 8px;
          }
          .condition-item {
            display: flex;
            align-items: center;
            font-size: 7px;
          }
          .checkbox {
            width: 8px;
            height: 8px;
            border: 1px solid #000;
            margin-right: 4px;
            display: inline-block;
          }
          .checkbox.checked {
            background: #000;
          }
          
          /* Dental Chart Section */
          .dental-chart-section {
            border: 2px solid #000;
            margin: 5px 0;
          }
          .chart-title {
            background: #f0f0f0;
            text-align: center;
            font-weight: bold;
            padding: 6px;
            border-bottom: 1px solid #000;
            font-size: 12px;
          }
          .teeth-container {
            padding: 10px;
            display: flex;
            justify-content: center;
          }
          .teeth-side {
            text-align: center;
            margin: 0 15px;
          }
          .side-label {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 11px;
          }
          .teeth-row {
            display: flex;
            justify-content: center;
            margin: 4px 0;
          }
          .tooth {
            width: 20px;
            height: 25px;
            border: 1px solid #000;
            margin: 0.5px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 6px;
            position: relative;
            background: white;
          }
          .tooth-number {
            font-weight: bold;
            font-size: 6px;
          }
          .tooth-symbol {
            font-weight: bold;
            color: red;
            font-size: 8px;
          }
          
          /* Legend and Bottom Sections */
          .bottom-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 5px;
          }
          .legend-section {
            border: 1px solid #000;
            padding: 6px;
            font-size: 7px;
          }
          .legend-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 6px;
            font-size: 8px;
            text-decoration: underline;
          }
          .legend-item {
            display: flex;
            margin: 2px 0;
            align-items: flex-start;
          }
          .legend-symbol {
            font-weight: bold;
            width: 12px;
            text-align: center;
            margin-right: 4px;
            flex-shrink: 0;
          }
          .conditions-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
          }
          .condition-box {
            border: 1px solid #000;
            padding: 4px;
            font-size: 7px;
          }
          .condition-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 4px;
            text-decoration: underline;
            font-size: 8px;
          }
          .checkbox-item {
            display: flex;
            align-items: center;
            margin: 2px 0;
          }
          
          /* Informed Consent Section */
          .consent-section {
            border: 1px solid #000;
            margin: 5px 0;
            padding: 6px;
            font-size: 7px;
            line-height: 1.2;
          }
          .consent-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 6px;
            font-size: 10px;
            text-decoration: underline;
          }
          .consent-content {
            text-align: justify;
            margin-bottom: 8px;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 8px;
            border-top: 1px solid #000;
          }
          .signature-box {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 30px;
            padding-top: 4px;
            font-size: 7px;
          }
          
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <!-- Header Section -->
        <div class="header-section">
          <div class="header-row">
            <div class="clinic-logo">
              <div class="logo-circle">SDC</div>
              <div class="clinic-info">
                <h1>SILARIO DENTAL CLINIC</h1>
                <p>Elaine Mae Frando Silario D.M.D</p>
              </div>
            </div>
            <div class="form-title">PATIENT INFORMATION RECORD</div>
          </div>
        </div>

        <!-- Patient Information -->
        <div class="patient-info">
          <h3>PATIENT INFORMATION</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Name:</span>
              <span class="info-value">${patient?.full_name || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Nickname:</span>
              <span class="info-value">${patient?.nickname || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Age:</span>
              <span class="info-value">${patient?.birthday ? calculateAge(patient.birthday) : ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sex:</span>
              <span class="info-value">${patient?.gender ? patient.gender.charAt(0).toUpperCase() : ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Address:</span>
              <span class="info-value">${patient?.address || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Nationality:</span>
              <span class="info-value">${patient?.nationality || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Home No.:</span>
              <span class="info-value">${patient?.phone || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date:</span>
              <span class="info-value">${currentDate}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Occupation:</span>
              <span class="info-value">${patient?.occupation || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Office No.:</span>
              <span class="info-value">${patient?.office_phone || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Birthdate:</span>
              <span class="info-value">${patient?.birthday || ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cell/Mobile:</span>
              <span class="info-value">${patient?.mobile || patient?.phone || ''}</span>
            </div>
          </div>
        </div>

        <!-- Medical History Section -->
        <div class="medical-section">
          <div class="section-header">MEDICAL HISTORY</div>
          <div class="medical-content">
            <div class="medical-questions">
              ${medicalHistory.map((question, index) => `
                <div class="medical-question">
                  <span class="question-number">${index + 1}.</span>
                  <span>${question}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="conditions-grid">
              ${medicalConditions.map(condition => `
                <div class="condition-item">
                  <div class="checkbox ${dentalChart.medicalConditions?.[condition] ? 'checked' : ''}"></div>
                  <span>${condition}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Dental History Section -->
        <div class="medical-section">
          <div class="section-header">DENTAL HISTORY</div>
          <div class="medical-content">
            ${dentalHistory.map((question, index) => `
              <div class="medical-question">
                <span class="question-number">${index + 1}.</span>
                <span>${question}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Dental Chart -->
        <div class="dental-chart-section">
          <div class="chart-title">DENTAL RECORD CHART</div>
          <div class="teeth-container">
            <div class="teeth-side">
              <div class="side-label">RIGHT</div>
              <!-- Upper Right -->
              <div class="teeth-row">
                ${[8, 7, 6, 5, 4, 3, 2, 1].map(num => `
                  <div class="tooth">
                    <div class="tooth-symbol">${dentalChart.teeth?.[num]?.symbol || ''}</div>
                    <div class="tooth-number">${num}</div>
                  </div>
                `).join('')}
              </div>
              <!-- Lower Right -->
              <div class="teeth-row">
                ${[25, 26, 27, 28, 29, 30, 31, 32].map(num => `
                  <div class="tooth">
                    <div class="tooth-number">${num}</div>
                    <div class="tooth-symbol">${dentalChart.teeth?.[num]?.symbol || ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="teeth-side">
              <div class="side-label">LEFT</div>
              <!-- Upper Left -->
              <div class="teeth-row">
                ${[9, 10, 11, 12, 13, 14, 15, 16].map(num => `
                  <div class="tooth">
                    <div class="tooth-symbol">${dentalChart.teeth?.[num]?.symbol || ''}</div>
                    <div class="tooth-number">${num}</div>
                  </div>
                `).join('')}
              </div>
              <!-- Lower Left -->
              <div class="teeth-row">
                ${[24, 23, 22, 21, 20, 19, 18, 17].map(num => `
                  <div class="tooth">
                    <div class="tooth-number">${num}</div>
                    <div class="tooth-symbol">${dentalChart.teeth?.[num]?.symbol || ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Legend and Conditions -->
        <div class="bottom-section">
          <div class="legend-section">
            <div class="legend-title">Legend</div>
            ${Object.entries(chartSymbols).map(([symbol, description]) => `
              <div class="legend-item">
                <div class="legend-symbol">${symbol}</div>
                <div>${description}</div>
              </div>
            `).join('')}
          </div>

          <div class="conditions-section">
            <div class="condition-box">
              <div class="condition-title">Conditions</div>
              ${Object.entries(conditions).map(([condition, checked]) => `
                <div class="checkbox-item">
                  <div class="checkbox ${dentalChart.conditions?.[condition] ? 'checked' : ''}"></div>
                  <span>${condition}</span>
                </div>
              `).join('')}
            </div>

            <div class="condition-box">
              <div class="condition-title">Applications</div>
              ${Object.entries(applications).map(([application, checked]) => `
                <div class="checkbox-item">
                  <div class="checkbox ${dentalChart.applications?.[application] ? 'checked' : ''}"></div>
                  <span>${application}</span>
                </div>
              `).join('')}
            </div>

            <div class="condition-box">
              <div class="condition-title">TMD</div>
              ${Object.entries(tmdConditions).map(([condition, checked]) => `
                <div class="checkbox-item">
                  <div class="checkbox ${dentalChart.tmd?.[condition] ? 'checked' : ''}"></div>
                  <span>${condition}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Informed Consent Section -->
        <div class="consent-section">
          <div class="consent-title">INFORMED CONSENT</div>
          <div class="consent-content">
            <p><strong>TREATMENT TO BE DONE:</strong> I understand and consent to have any treatment done by the dentist as deemed necessary or advisable, including the use and administration of anesthetics and or medications.</p>
            
            <p><strong>CHANGES IN TREATMENT PLAN:</strong> I understand that during treatment it may be necessary or advisable to change or add procedures because of conditions found while working on the teeth that were not discovered during examination, the most common being root canal therapy following routine restorative procedures. I give my permission to the dentist to make any/all changes that he/she deems appropriate.</p>
            
            <p><strong>DRUGS & MEDICATIONS:</strong> I understand that antibiotics, analgesics and other medications can cause allergic reactions causing redness and swelling of tissues, pain, itching, vomiting, and/or anaphylactic shock (severe allergic reaction).</p>
            
            <p><strong>CHANGES IN TREATMENT PLAN:</strong> I understand that a perfect result is not guaranteed, and that reperfect procedures may be necessary at patient to charge. I acknowledge that the practice of dentistry is not an exact science and that, therefore, reperfect or alternative treatment methods may be required.</p>
            
            <p><strong>PERIODONTAL DISEASE:</strong> I understand that I may have a serious condition causing gum and/or bone inflammation or loss and that it can lead to the loss of my teeth. Alternative treatments were explained to me including non-surgical cleaning, surgical cleaning, replacements and/or extractions. I understand that undertreated periodontal disease can lead to pain, infection, swelling, bleeding gums, loss of teeth, and bad breath.</p>
            
            <p><strong>CROWNS & CAPS & BRIDGES:</strong> I understand that sometimes it is not possible to match the color of natural teeth exactly with artificial teeth. I further understand that I may be wearing temporary crowns, which may come off easily and that I must be careful to ensure that they are kept on until the permanent crowns are delivered. I realize the final opportunity to make changes in my new crown, cap, or bridge (including shape, fit, size, and color) will be before cementation.</p>
            
            <p><strong>DENTURE CARE:</strong> I realize the final opportunity to make changes in my new denture (including shape, fit, size, placement of teeth, and color) will be the "teeth in wax" try-in visit. I understand that most dentures require several adjustments, and that I will be appointed several times. I realize that sore spots are likely and I understand that talking and chewing may be different with new dentures.</p>
            
            <p><strong>ENDODONTIC TREATMENT (ROOT CANAL):</strong> I realize there is no guarantee that root canal treatment will be successful, and that complications can occur from the treatment, and that occasionally metal instruments may separate during treatment and remain in the tooth. I understand that occasionally additional surgical procedures may be necessary following root canal treatment (apicoectomy). I understand the alternative to root canal therapy is extraction of the tooth.</p>
            
            <p><strong>SURGERY:</strong> I understand that a more extensive procedure may sometimes be required than initially planned. I understand that receiving an injection in some circumstances may result in residual numbness of the lip, tongue, teeth, chin or gums that is sometimes temporary and, on occasion, permanent. I understand that complications may result from surgery, drugs, medications, or anesthetics. These complications include but are not limited to: post-operative discomfort and swelling that may necessitate several days of recuperation; prolonged bleeding; injury to adjacent teeth or fillings; referred pain to ear, neck and head; delayed healing; allergic reaction to drugs or medications used; injury to nerve resulting in altered sensation which may be temporary and on occasion permanent; opening into the sinus requiring additional treatment; breakage of instruments.</p>
            
            <p><strong>ORTHODONTIC TREATMENT:</strong> I understand that orthodontic treatment is a biological process that is generally quite successful but does have some inherent limitations. Complete alignment and ideal bite relationships may not be possible to achieve. During treatment, good oral hygiene is extremely important. Poor oral hygiene can cause permanent markings of the teeth (decalcification), decay, and gum disease. These conditions can lead to loss of teeth. I understand that retainers may have to be worn indefinitely to maintain tooth position, and that without retainers the teeth will tend to move.</p>
          </div>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Patient / Guardian Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Doctor Signature & Date</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              setTimeout(function() {
                window.close();
              }, 1000);
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    toast.success('Opening print dialog...');
  };

  const renderTooth = (toothNumber, position = 'upper') => {
    const toothData = dentalChart.teeth?.[toothNumber] || {};
    const isSelected = selectedTooth === toothNumber;
    
    return (
      <div
        key={toothNumber}
        className={`relative w-8 h-10 border border-gray-400 m-0.5 cursor-pointer flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 ${
          isSelected ? 'bg-blue-200 border-blue-500 border-2' : 'bg-white hover:bg-gray-50'
        } ${editMode ? 'hover:border-primary-500' : ''}`}
        onClick={() => editMode && setSelectedTooth(toothNumber)}
        title={`Tooth ${toothNumber}`}
      >
        {position === 'upper' && (
          <div className="text-red-600 font-bold text-sm">
            {toothData.symbol || ''}
          </div>
        )}
        <div className="text-xs font-bold text-gray-700">
          {toothNumber}
        </div>
        {position === 'lower' && (
          <div className="text-red-600 font-bold text-sm">
            {toothData.symbol || ''}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!patient) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Patient not found</h3>
          <button
            onClick={() => navigate('/doctor/patients')}
            className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <FiArrowLeft className="mr-2 -ml-1 h-5 w-5" />
            Back to Patient List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/doctor/patients')}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 hover:bg-primary-50"
          >
            <FiArrowLeft className="mr-1 h-4 w-4" />
            Back to Patients
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comprehensive Dental Chart</h1>
            <p className="text-sm text-gray-500">{patient.full_name}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={printDentalChart}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiPrinter className="mr-2 -ml-1 h-5 w-5" />
            Print Chart
          </button>
          {editMode ? (
            <button
              onClick={saveDentalChart}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <FiSave className="mr-2 -ml-1 h-5 w-5" />
              )}
              Save Chart
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <FiEdit className="mr-2 -ml-1 h-5 w-5" />
              Edit Chart
            </button>
          )}
        </div>
      </div>

      {/* Main Dental Chart Layout */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-300">
        {/* Header with Logo */}
        <div className="flex items-center justify-center p-6 border-b-2 border-black bg-gray-50">
          <div className="flex items-center">
            <div className="w-16 h-16 border-3 border-blue-600 rounded-full flex items-center justify-center bg-blue-500 text-white font-bold text-xl mr-4">
              SDC
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 tracking-wide">
                SILARIO DENTAL CLINIC
              </div>
              <div className="text-sm text-gray-600 italic">
                Elaine Mae Frando Silario D.M.D
              </div>
            </div>
          </div>
          <div className="ml-8 text-lg font-bold tracking-widest">
            PATIENT INFORMATION RECORD
          </div>
        </div>

        {/* Patient Information Grid */}
        <div className="p-6 border-b border-gray-300">
          <h3 className="text-lg font-bold text-center mb-4 bg-gray-100 p-2 border border-gray-400">
            PATIENT INFORMATION
          </h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Name:</span>
              <span className="flex-1">{patient.full_name}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Nickname:</span>
              <span className="flex-1">{patient.nickname || ''}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Age:</span>
              <span className="flex-1">{patient.birthday ? calculateAge(patient.birthday) : ''}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Sex:</span>
              <span className="flex-1">{patient.gender ? patient.gender.charAt(0).toUpperCase() : ''}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Address:</span>
              <span className="flex-1">{patient.address}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Nationality:</span>
              <span className="flex-1">{patient.nationality || ''}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Home No.:</span>
              <span className="flex-1">{patient.phone}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Date:</span>
              <span className="flex-1">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Occupation:</span>
              <span className="flex-1">{patient.occupation || ''}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Office No.:</span>
              <span className="flex-1">{patient.office_phone || ''}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Birthdate:</span>
              <span className="flex-1">{patient.birthday}</span>
            </div>
            <div className="flex items-center border-b border-black pb-1">
              <span className="font-bold mr-2">Cell/Mobile:</span>
              <span className="flex-1">{patient.mobile || patient.phone}</span>
            </div>
          </div>
        </div>

        {/* Medical History Section */}
        <div className="border-b border-gray-300">
          <div className="bg-gray-100 p-3 border-b border-gray-400">
            <h3 className="font-bold text-center text-lg">MEDICAL HISTORY</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3 mb-6">
              {medicalHistory.map((question, index) => (
                <div key={index} className="flex items-start">
                  <span className="font-bold mr-3 text-sm">{index + 1}.</span>
                  <span className="text-sm">{question}</span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-xs">
              {medicalConditions.map(condition => (
                <label key={condition} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dentalChart.medicalConditions?.[condition] || false}
                    onChange={(e) => updateChartData('medicalConditions', condition, e.target.checked)}
                    disabled={!editMode}
                    className="mr-2 h-3 w-3"
                  />
                  <span>{condition}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Dental History Section */}
        <div className="border-b border-gray-300">
          <div className="bg-gray-100 p-3 border-b border-gray-400">
            <h3 className="font-bold text-center text-lg">DENTAL HISTORY</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dentalHistory.map((question, index) => (
                <div key={index} className="flex items-start">
                  <span className="font-bold mr-3 text-sm">{index + 1}.</span>
                  <span className="text-sm">{question}</span>
                  {editMode && (
                    <input
                      type="text"
                      className="ml-4 flex-1 border-b border-gray-300 text-sm"
                      placeholder="Response"
                      value={dentalChart.dentalHistory?.[`question_${index}`] || ''}
                      onChange={(e) => updateChartData('dentalHistory', `question_${index}`, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dental Chart */}
        <div className="border-2 border-black">
          <div className="bg-gray-100 p-3 border-b border-black">
            <h3 className="font-bold text-center text-xl">DENTAL RECORD CHART</h3>
          </div>
          <div className="p-6">
            <div className="flex justify-center space-x-12">
              {/* Right Side */}
              <div className="text-center">
                <div className="font-bold text-lg mb-4">RIGHT</div>
                
                {/* Upper Right Teeth */}
                <div className="flex mb-4">
                  {[8, 7, 6, 5, 4, 3, 2, 1].map(num => renderTooth(num, 'upper'))}
                </div>
                
                {/* Lower Right Teeth */}
                <div className="flex">
                  {[25, 26, 27, 28, 29, 30, 31, 32].map(num => renderTooth(num, 'lower'))}
                </div>
              </div>

              {/* Left Side */}
              <div className="text-center">
                <div className="font-bold text-lg mb-4">LEFT</div>
                
                {/* Upper Left Teeth */}
                <div className="flex mb-4">
                  {[9, 10, 11, 12, 13, 14, 15, 16].map(num => renderTooth(num, 'upper'))}
                </div>
                
                {/* Lower Left Teeth */}
                <div className="flex">
                  {[24, 23, 22, 21, 20, 19, 18, 17].map(num => renderTooth(num, 'lower'))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tooth Symbol Selection (Only in Edit Mode) */}
        {editMode && selectedTooth && (
          <div className="p-4 bg-blue-50 border-t border-blue-200">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Tooth #{selectedTooth}
              </h3>
              <div className="grid grid-cols-8 gap-2">
                {Object.entries(chartSymbols).map(([symbol, description]) => (
                  <button
                    key={symbol}
                    onClick={() => updateToothData(selectedTooth, 'symbol', symbol)}
                    className={`p-3 border rounded-md text-center hover:bg-blue-100 ${
                      dentalChart.teeth?.[selectedTooth]?.symbol === symbol
                        ? 'bg-blue-200 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                    title={description}
                  >
                    <div className="font-bold text-lg text-red-600">{symbol}</div>
                    <div className="text-xs text-gray-600 mt-1">{description.substring(0, 20)}...</div>
                  </button>
                ))}
                <button
                  onClick={() => updateToothData(selectedTooth, 'symbol', '')}
                  className="p-3 border rounded-md text-center hover:bg-red-100 bg-red-50 border-red-300"
                  title="Clear symbol"
                >
                  <div className="font-bold text-lg text-red-600">Clear</div>
                  <div className="text-xs text-gray-600 mt-1">Remove symbol</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legend and Conditions */}
        <div className="grid grid-cols-2 gap-6 p-6 border-t border-gray-300 bg-gray-50">
          {/* Legend */}
          <div className="border border-gray-400 p-4">
            <h3 className="font-bold text-center mb-4 underline">Legend</h3>
            <div className="grid grid-cols-1 gap-1 text-xs">
              {Object.entries(chartSymbols).map(([symbol, description]) => (
                <div key={symbol} className="flex">
                  <span className="font-bold w-6 text-center">{symbol}</span>
                  <span className="ml-2">{description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conditions, Applications, TMD */}
          <div className="grid grid-cols-1 gap-4">
            {/* Conditions */}
            <div className="border border-gray-400 p-3">
              <h4 className="font-bold text-center mb-2 underline text-xs">Conditions</h4>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(conditions).map(([condition, checked]) => (
                  <label key={condition} className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={dentalChart.conditions?.[condition] || false}
                      onChange={(e) => updateChartData('conditions', condition, e.target.checked)}
                      disabled={!editMode}
                      className="mr-2 h-3 w-3"
                    />
                    <span>{condition}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Applications */}
              <div className="border border-gray-400 p-3">
                <h4 className="font-bold text-center mb-2 underline text-xs">Applications</h4>
                <div className="space-y-1">
                  {Object.entries(applications).map(([application, checked]) => (
                    <label key={application} className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={dentalChart.applications?.[application] || false}
                        onChange={(e) => updateChartData('applications', application, e.target.checked)}
                        disabled={!editMode}
                        className="mr-2 h-3 w-3"
                      />
                      <span>{application}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* TMD */}
              <div className="border border-gray-400 p-3">
                <h4 className="font-bold text-center mb-2 underline text-xs">TMD</h4>
                <div className="space-y-1">
                  {Object.entries(tmdConditions).map(([condition, checked]) => (
                    <label key={condition} className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={dentalChart.tmd?.[condition] || false}
                        onChange={(e) => updateChartData('tmd', condition, e.target.checked)}
                        disabled={!editMode}
                        className="mr-2 h-3 w-3"
                      />
                      <span>{condition}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informed Consent Section */}
        <div className="border-t-2 border-black p-6 bg-blue-50">
          <h3 className="font-bold text-center text-xl mb-4 underline">INFORMED CONSENT</h3>
          <div className="text-xs space-y-3 text-justify leading-relaxed">
            <div>
              <strong>TREATMENT TO BE DONE:</strong> I understand and consent to have any treatment done by the dentist as deemed necessary or advisable, including the use and administration of anesthetics and or medications.
            </div>
            <div>
              <strong>CHANGES IN TREATMENT PLAN:</strong> I understand that during treatment it may be necessary or advisable to change or add procedures because of conditions found while working on the teeth that were not discovered during examination, the most common being root canal therapy following routine restorative procedures. I give my permission to the dentist to make any/all changes that he/she deems appropriate.
            </div>
            <div>
              <strong>DRUGS & MEDICATIONS:</strong> I understand that antibiotics, analgesics and other medications can cause allergic reactions causing redness and swelling of tissues, pain, itching, vomiting, and/or anaphylactic shock (severe allergic reaction).
            </div>
            <div>
              <strong>PERIODONTAL DISEASE:</strong> I understand that I may have a serious condition causing gum and/or bone inflammation or loss and that it can lead to the loss of my teeth. Alternative treatments were explained to me including non-surgical cleaning, surgical cleaning, replacements and/or extractions.
            </div>
          </div>
          
          {/* Signature Section */}
          <div className="flex justify-between mt-8 pt-4 border-t border-black">
            <div className="text-center w-64">
              <div className="border-t border-black mt-12 pt-2 text-xs">
                Patient / Guardian Signature
              </div>
            </div>
            <div className="text-center w-64">
              <div className="border-t border-black mt-12 pt-2 text-xs">
                Doctor Signature & Date
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <FiEye className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Editing Mode Instructions
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Click on any tooth to select it and assign a dental symbol</li>
                  <li>Check medical conditions and dental history responses</li>
                  <li>Mark conditions, applications, and TMD symptoms as needed</li>
                  <li>All sections will be included in the printed chart</li>
                  <li>Click "Save Chart" to save all your changes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentalChart;