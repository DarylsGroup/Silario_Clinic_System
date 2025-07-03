// src/pages/patient/History.jsx - Enhanced with Professional Forms Integration
import React, { useState, useEffect } from 'react';
import { FiCalendar, FiFilter, FiUser, FiFileText, FiEye, FiX, FiPrinter, FiDownload, FiClock, FiMapPin, FiActivity } from 'react-icons/fi';
import supabase from '../../config/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const History = () => {
  const { user } = useAuth();
  const [treatments, setTreatments] = useState([]);
  const [filteredTreatments, setFilteredTreatments] = useState([]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedTooth, setSelectedTooth] = useState('all');
  const [selectedProcedure, setSelectedProcedure] = useState('all');
  const [procedures, setProcedures] = useState([]);
  const [teeth, setTeeth] = useState([]);
  const [years, setYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDentalChart, setShowDentalChart] = useState(false);
  const [selectedToothInChart, setSelectedToothInChart] = useState(null);
  const [toothTreatments, setToothTreatments] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);

  useEffect(() => {
    if (user) {
      fetchTreatmentHistory();
      fetchPatientProfile();
    }
  }, [user]);

  useEffect(() => {
    filterTreatments();
  }, [treatments, selectedYear, selectedTooth, selectedProcedure]);

  useEffect(() => {
    if (selectedToothInChart) {
      const toothSpecificTreatments = treatments.filter(
        treatment => treatment.tooth_number === selectedToothInChart
      );
      setToothTreatments(toothSpecificTreatments);
    } else {
      setToothTreatments([]);
    }
  }, [selectedToothInChart, treatments]);

  const fetchPatientProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setPatientProfile(data);
    } catch (error) {
      console.error('Error fetching patient profile:', error);
    }
  };
  
  const fetchTreatmentHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select(`
          id, 
          procedure, 
          tooth_number, 
          diagnosis,
          notes, 
          treatment_date,
          doctor:doctor_id (id, full_name)
        `)
        .eq('patient_id', user.id)
        .order('treatment_date', { ascending: false });
      
      if (error) throw error;
      
      setTreatments(data || []);
      
      // Extract unique years
      const uniqueYears = [...new Set(data.map(
        treatment => new Date(treatment.treatment_date).getFullYear()
      ))].sort((a, b) => b - a);
      
      setYears(['all', ...uniqueYears.map(year => year.toString())]);
      
      // Extract unique teeth
      const uniqueTeeth = [...new Set(data
        .filter(treatment => treatment.tooth_number)
        .map(treatment => treatment.tooth_number)
      )].sort((a, b) => a - b);
      
      setTeeth(['all', ...uniqueTeeth.map(tooth => tooth.toString())]);
      
      // Extract unique procedures
      const uniqueProcedures = [...new Set(data.map(treatment => treatment.procedure))].sort();
      
      setProcedures(['all', ...uniqueProcedures]);
    } catch (error) {
      console.error('Error fetching treatment history:', error);
      toast.error('Failed to load treatment history');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTreatments = () => {
    let filtered = [...treatments];
    
    if (selectedYear !== 'all') {
      filtered = filtered.filter(treatment => 
        new Date(treatment.treatment_date).getFullYear().toString() === selectedYear
      );
    }
    
    if (selectedTooth !== 'all') {
      filtered = filtered.filter(treatment => 
        treatment.tooth_number && treatment.tooth_number.toString() === selectedTooth
      );
    }
    
    if (selectedProcedure !== 'all') {
      filtered = filtered.filter(treatment => treatment.procedure === selectedProcedure);
    }
    
    setFilteredTreatments(filtered);
  };

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
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

  const handleToothClick = (toothNumber) => {
    setSelectedToothInChart(toothNumber === selectedToothInChart ? null : toothNumber);
  };

  // Enhanced print treatment history with professional styling
  const printTreatmentHistory = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>My Dental Treatment History - ${patientProfile?.full_name || 'Patient'}</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.4;
            color: #333;
            font-size: 11px;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 20px;
            margin-bottom: 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px 20px;
            border-radius: 8px;
            margin: -20px -20px 25px -20px;
          }
          .clinic-logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .clinic-tagline {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 5px;
          }
          .report-title {
            font-size: 24px;
            font-weight: bold;
            margin: 15px 0 10px 0;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          
          /* Patient Information Card */
          .patient-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px solid #4F46E5;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .patient-card h2 {
            margin: 0 0 15px 0;
            color: #4F46E5;
            font-size: 18px;
            text-align: center;
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 8px;
          }
          .patient-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 15px;
          }
          .info-item {
            display: flex;
            align-items: center;
            background: white;
            padding: 10px 15px;
            border-radius: 6px;
            border-left: 4px solid #4F46E5;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .info-label {
            font-weight: bold;
            color: #374151;
            min-width: 80px;
            margin-right: 10px;
          }
          .info-value {
            color: #1f2937;
            flex: 1;
          }
          .report-meta {
            text-align: center;
            background: white;
            padding: 12px;
            border-radius: 6px;
            font-size: 12px;
            color: #64748b;
            border: 1px solid #e2e8f0;
          }
          
          /* Filter Information */
          .filters-applied {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 5px solid #2196f3;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .filters-applied h4 {
            margin-top: 0;
            color: #1976d2;
            font-size: 14px;
          }
          .filter-item {
            background: white;
            display: inline-block;
            padding: 4px 8px;
            margin: 2px 4px 2px 0;
            border-radius: 4px;
            font-size: 11px;
            color: #1976d2;
            border: 1px solid #bbdefb;
          }
          
          /* Treatment Statistics */
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 25px;
          }
          .stat-card {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
          }
          .stat-card:hover {
            transform: translateY(-2px);
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 5px;
          }
          .stat-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .stat-icon {
            font-size: 20px;
            margin-bottom: 8px;
            opacity: 0.7;
          }
          
          /* Treatment Timeline */
          .treatments-section {
            margin-top: 25px;
          }
          .section-title {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 15px 25px;
            margin: 0 0 20px 0;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            border-radius: 8px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          .treatment-timeline {
            position: relative;
            padding-left: 30px;
          }
          .timeline-line {
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            width: 3px;
            background: linear-gradient(to bottom, #4F46E5, #7C3AED);
            border-radius: 2px;
          }
          .treatment-item {
            position: relative;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 18px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
          }
          .treatment-item:hover {
            transform: translateX(5px);
          }
          .treatment-item::before {
            content: '🦷';
            position: absolute;
            left: -28px;
            top: 22px;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            border: 3px solid #4F46E5;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .treatment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f1f5f9;
          }
          .treatment-procedure {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
          }
          .treatment-date-badge {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          .treatment-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 12px;
          }
          .detail-item {
            display: flex;
            align-items: flex-start;
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 6px;
            border-left: 3px solid #4F46E5;
          }
          .detail-label {
            font-weight: bold;
            color: #475569;
            min-width: 70px;
            margin-right: 8px;
          }
          .detail-value {
            color: #1e293b;
            flex: 1;
          }
          .tooth-badge {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 8px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          .notes-section {
            grid-column: 1 / -1;
            margin-top: 8px;
          }
          .notes-content {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            font-style: italic;
            color: #64748b;
          }
          
          /* Empty State */
          .empty-state {
            text-align: center;
            padding: 50px 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            border: 2px dashed #cbd5e1;
          }
          .empty-icon {
            font-size: 48px;
            color: #cbd5e1;
            margin-bottom: 15px;
          }
          .empty-title {
            color: #64748b;
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 8px 0;
          }
          .empty-subtitle {
            color: #94a3b8;
            margin: 0;
          }
          
          /* Footer */
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #64748b;
            border-top: 2px solid #e2e8f0;
            padding-top: 20px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
          }
          .footer-logo {
            font-size: 16px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 8px;
          }
          .footer-tagline {
            font-style: italic;
            margin-bottom: 5px;
          }
          
          @media print {
            body { 
              margin: 0; 
              padding: 10px;
            }
            .no-print { display: none; }
            .treatment-item:hover {
              transform: none;
            }
            .stat-card:hover {
              transform: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-logo">🦷 SILARIO DENTAL CLINIC</div>
          <div class="clinic-tagline">Excellence in Dental Care Since 2020</div>
          <div class="clinic-tagline">📧 info@silariodental.com | 📞 (123) 456-7890 | 🏥 Cabugao & San Juan Branches</div>
          <div class="report-title">MY PERSONAL DENTAL TREATMENT HISTORY</div>
        </div>

        <div class="patient-card">
          <h2>👤 Patient Information</h2>
          <div class="patient-info-grid">
            <div class="info-item">
              <span class="info-label">Full Name:</span>
              <span class="info-value">${patientProfile?.full_name || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Patient ID:</span>
              <span class="info-value">${patientProfile?.id ? patientProfile.id.substring(0, 8) : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date of Birth:</span>
              <span class="info-value">${patientProfile?.birthday ? formatDate(patientProfile.birthday) : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Age:</span>
              <span class="info-value">${patientProfile?.birthday ? calculateAge(patientProfile.birthday) + ' years' : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Gender:</span>
              <span class="info-value">${patientProfile?.gender ? patientProfile.gender.charAt(0).toUpperCase() + patientProfile.gender.slice(1) : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Contact:</span>
              <span class="info-value">${patientProfile?.phone || 'N/A'}</span>
            </div>
          </div>
          <div class="report-meta">
            📧 ${patientProfile?.email || 'N/A'} | 📍 ${patientProfile?.address || 'N/A'} | 📅 Report Generated: ${currentDate}
          </div>
        </div>

        ${selectedYear !== 'all' || selectedTooth !== 'all' || selectedProcedure !== 'all' ? `
          <div class="filters-applied">
            <h4>🔍 Applied Filters:</h4>
            ${selectedYear !== 'all' ? `<span class="filter-item">📅 Year: ${selectedYear}</span>` : ''}
            ${selectedTooth !== 'all' ? `<span class="filter-item">🦷 Tooth: #${selectedTooth}</span>` : ''}
            ${selectedProcedure !== 'all' ? `<span class="filter-item">⚕️ Procedure: ${selectedProcedure}</span>` : ''}
          </div>
        ` : ''}

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-number">${filteredTreatments.length}</div>
            <div class="stat-label">Total Treatments</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⚕️</div>
            <div class="stat-number">${new Set(filteredTreatments.map(t => t.procedure)).size}</div>
            <div class="stat-label">Different Procedures</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🦷</div>
            <div class="stat-number">${new Set(filteredTreatments.filter(t => t.tooth_number).map(t => t.tooth_number)).size}</div>
            <div class="stat-label">Teeth Treated</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">👨‍⚕️</div>
            <div class="stat-number">${new Set(filteredTreatments.map(t => t.doctor?.full_name)).size}</div>
            <div class="stat-label">Attending Doctors</div>
          </div>
        </div>

        <div class="treatments-section">
          <h3 class="section-title">📋 Complete Treatment History Timeline</h3>
          
          ${filteredTreatments.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <h3 class="empty-title">No Treatment Records Found</h3>
              <p class="empty-subtitle">${treatments.length === 0 ? 'You have no recorded treatments yet.' : 'No records match your current filters.'}</p>
            </div>
          ` : `
            <div class="treatment-timeline">
              <div class="timeline-line"></div>
              ${filteredTreatments.map((treatment, index) => `
                <div class="treatment-item">
                  <div class="treatment-header">
                    <div class="treatment-procedure">
                      ${treatment.procedure || 'Unspecified Procedure'}
                      ${treatment.tooth_number ? `<span class="tooth-badge">Tooth #${treatment.tooth_number}</span>` : ''}
                    </div>
                    <div class="treatment-date-badge">📅 ${formatDate(treatment.treatment_date)}</div>
                  </div>
                  
                  <div class="treatment-details">
                    ${treatment.diagnosis ? `
                      <div class="detail-item">
                        <span class="detail-label">🔬 Diagnosis:</span>
                        <span class="detail-value">${treatment.diagnosis}</span>
                      </div>
                    ` : ''}
                    
                    <div class="detail-item">
                      <span class="detail-label">👨‍⚕️ Doctor:</span>
                      <span class="detail-value">Dr. ${treatment.doctor?.full_name || 'Unknown'}</span>
                    </div>
                    
                    ${treatment.notes ? `
                      <div class="detail-item notes-section">
                        <span class="detail-label">📝 Notes:</span>
                        <div class="notes-content">${treatment.notes}</div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="footer">
          <div class="footer-logo">🦷 SILARIO DENTAL CLINIC</div>
          <div class="footer-tagline">Committed to Excellence in Dental Care</div>
          <p>Professional Dental Services | Advanced Technology | Compassionate Care</p>
          <p>Cabugao Branch & San Juan Branch | Serving the Community Since 2020</p>
          <p><strong>📋 Personal Treatment History Report</strong> - Generated on ${currentDate}</p>
          <p style="font-size: 9px; margin-top: 10px; color: #94a3b8;">
            🔒 <strong>Confidential Document:</strong> This report contains your personal dental information. Please keep it secure and confidential.
          </p>
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

    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
    toast.success('Opening print dialog...');
  };

  // Enhanced download function
  const downloadTreatmentHistory = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let content = `SILARIO DENTAL CLINIC\n`;
    content += `Excellence in Dental Care Since 2020\n`;
    content += `Email: info@silariodental.com | Phone: (123) 456-7890\n`;
    content += `Cabugao Branch & San Juan Branch\n\n`;
    content += `MY PERSONAL DENTAL TREATMENT HISTORY\n`;
    content += `${'='.repeat(60)}\n\n`;
    
    content += `PATIENT INFORMATION:\n`;
    content += `Name: ${patientProfile?.full_name || 'N/A'}\n`;
    content += `Patient ID: ${patientProfile?.id ? patientProfile.id.substring(0, 8) : 'N/A'}\n`;
    content += `Date of Birth: ${patientProfile?.birthday ? formatDate(patientProfile.birthday) : 'N/A'}\n`;
    content += `Age: ${patientProfile?.birthday ? calculateAge(patientProfile.birthday) + ' years' : 'N/A'}\n`;
    content += `Gender: ${patientProfile?.gender ? patientProfile.gender.charAt(0).toUpperCase() + patientProfile.gender.slice(1) : 'N/A'}\n`;
    content += `Contact: ${patientProfile?.phone || 'N/A'}\n`;
    content += `Email: ${patientProfile?.email || 'N/A'}\n`;
    content += `Address: ${patientProfile?.address || 'N/A'}\n`;
    content += `Report Generated: ${currentDate}\n\n`;

    if (selectedYear !== 'all' || selectedTooth !== 'all' || selectedProcedure !== 'all') {
      content += `APPLIED FILTERS:\n`;
      if (selectedYear !== 'all') content += `- Year: ${selectedYear}\n`;
      if (selectedTooth !== 'all') content += `- Tooth Number: #${selectedTooth}\n`;
      if (selectedProcedure !== 'all') content += `- Procedure Type: ${selectedProcedure}\n`;
      content += `\n`;
    }

    content += `TREATMENT STATISTICS:\n`;
    content += `- Total Treatments: ${filteredTreatments.length}\n`;
    content += `- Different Procedures: ${new Set(filteredTreatments.map(t => t.procedure)).size}\n`;
    content += `- Teeth Treated: ${new Set(filteredTreatments.filter(t => t.tooth_number).map(t => t.tooth_number)).size}\n`;
    content += `- Attending Doctors: ${new Set(filteredTreatments.map(t => t.doctor?.full_name)).size}\n\n`;

    content += `COMPLETE TREATMENT HISTORY:\n`;
    content += `${'='.repeat(60)}\n\n`;

    if (filteredTreatments.length === 0) {
      content += `No treatment records found${selectedYear !== 'all' || selectedTooth !== 'all' || selectedProcedure !== 'all' ? ' with the applied filters' : ''}.\n`;
      if (treatments.length === 0) {
        content += `You have no recorded treatments yet. Your treatment history will appear here after your first dental appointment.\n`;
      }
    } else {
      filteredTreatments.forEach((treatment, index) => {
        content += `${index + 1}. ${treatment.procedure || 'Unspecified Procedure'}\n`;
        content += `   Date: ${formatDate(treatment.treatment_date)}\n`;
        if (treatment.tooth_number) content += `   Tooth Number: #${treatment.tooth_number}\n`;
        if (treatment.diagnosis) content += `   Diagnosis: ${treatment.diagnosis}\n`;
        if (treatment.notes) content += `   Treatment Notes: ${treatment.notes}\n`;
        content += `   Attending Doctor: Dr. ${treatment.doctor?.full_name || 'Unknown'}\n`;
        content += `   ${'-'.repeat(50)}\n\n`;
      });
    }

    content += `\n${'='.repeat(60)}\n`;
    content += `END OF TREATMENT HISTORY REPORT\n\n`;
    content += `Silario Dental Clinic\n`;
    content += `Professional Dental Care Services\n`;
    content += `Committed to Excellence in Dental Care\n`;
    content += `Generated on ${currentDate}\n\n`;
    content += `CONFIDENTIAL DOCUMENT\n`;
    content += `This report contains your personal dental information.\n`;
    content += `Please keep it secure and confidential.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_dental_history_${patientProfile?.full_name?.replace(/\s+/g, '_') || 'patient'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('📱 Treatment history downloaded successfully!');
  };

  // Function to render a tooth in the dental chart
  const renderTooth = (toothNumber) => {
    const hasHistory = treatments.some(t => t.tooth_number === toothNumber);
    const isSelected = selectedToothInChart === toothNumber;
    
    let toothClass = "tooth cursor-pointer transition-all duration-200 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold m-1 shadow-sm";
    
    if (isSelected) {
      toothClass += " bg-primary-200 border-primary-500 shadow-lg transform scale-110";
    } else if (hasHistory) {
      toothClass += " bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400 hover:from-yellow-200 hover:to-yellow-300";
    } else {
      toothClass += " bg-gradient-to-br from-white to-gray-50 border-gray-300 hover:from-gray-50 hover:to-gray-100";
    }
    
    return (
      <div 
        key={toothNumber}
        className={toothClass}
        onClick={() => handleToothClick(toothNumber)}
        title={`Tooth ${toothNumber}${hasHistory ? ' - Has treatment history (click to view)' : ' - No treatment history'}`}
      >
        {toothNumber}
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl shadow-xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <FiActivity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">My Treatment History</h1>
              <p className="text-blue-100 text-lg">Personal dental care journey and records</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-20 backdrop-blur-sm">
                  <FiUser className="w-4 h-4 mr-2" />
                  {patientProfile?.full_name || 'Patient'}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-20 backdrop-blur-sm">
                  <FiFileText className="w-4 h-4 mr-2" />
                  {treatments.length} Total Records
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={downloadTreatmentHistory}
              className="inline-flex items-center px-6 py-3 border border-white border-opacity-30 text-sm font-medium rounded-lg text-white bg-white bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white backdrop-blur-sm transition-all duration-200"
            >
              <FiDownload className="mr-2 -ml-1 h-5 w-5" />
              Download Report
            </button>
            <button
              onClick={printTreatmentHistory}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
            >
              <FiPrinter className="mr-2 -ml-1 h-5 w-5" />
              Print History
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500 text-white">
              <FiFileText className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-900">Total Treatments</p>
              <p className="text-3xl font-bold text-blue-600">{treatments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 shadow-lg">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500 text-white">
              <FiActivity className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-900">Procedures Types</p>
              <p className="text-3xl font-bold text-green-600">{new Set(treatments.map(t => t.procedure)).size}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-200 shadow-lg">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-500 text-white">
              <FiUser className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-900">Teeth Treated</p>
              <p className="text-3xl font-bold text-yellow-600">{new Set(treatments.filter(t => t.tooth_number).map(t => t.tooth_number)).size}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 shadow-lg">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500 text-white">
              <FiClock className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-900">Last Visit</p>
              <p className="text-sm font-bold text-purple-600">
                {treatments.length > 0 ? formatDate(treatments[0].treatment_date) : 'No visits yet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <FiFilter className="h-6 w-6 text-gray-400 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Filter Treatment History</h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="year-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                📅 Filter by Year
              </label>
              <select
                id="year-filter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year === 'all' ? '🗓️ All Years' : `📅 ${year}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="tooth-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                🦷 Filter by Tooth
              </label>
              <select
                id="tooth-filter"
                value={selectedTooth}
                onChange={(e) => setSelectedTooth(e.target.value)}
                className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              >
                {teeth.map(tooth => (
                  <option key={tooth} value={tooth}>
                    {tooth === 'all' ? '🦷 All Teeth' : `🦷 Tooth #${tooth}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="procedure-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                ⚕️ Filter by Procedure
              </label>
              <select
                id="procedure-filter"
                value={selectedProcedure}
                onChange={(e) => setSelectedProcedure(e.target.value)}
                className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              >
                {procedures.map(procedure => (
                  <option key={procedure} value={procedure}>
                    {procedure === 'all' ? '⚕️ All Procedures' : `⚕️ ${procedure}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {(selectedYear !== 'all' || selectedTooth !== 'all' || selectedProcedure !== 'all') && (
            <div className="mt-6 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="flex items-center space-x-4">
                <FiFilter className="h-5 w-5 text-blue-600" />
                <div className="text-sm">
                  <span className="font-semibold text-blue-900">Filters Active:</span>
                  <span className="text-blue-700 ml-2">
                    Showing {filteredTreatments.length} of {treatments.length} records
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedYear('all');
                  setSelectedTooth('all');
                  setSelectedProcedure('all');
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white border-2 border-blue-200 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <FiX className="w-4 h-4 mr-2" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Treatment Records */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FiFileText className="w-6 h-6 mr-3 text-gray-600" />
            Treatment Records Timeline
          </h2>
        </div>
        
        <div className="p-6">
          {filteredTreatments.length > 0 ? (
            <div className="space-y-6">
              {filteredTreatments.map((treatment, index) => (
                <div key={treatment.id} className="relative bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  {/* Timeline connector */}
                  {index < filteredTreatments.length - 1 && (
                    <div className="absolute left-8 top-20 w-0.5 h-8 bg-gradient-to-b from-blue-400 to-blue-600"></div>
                  )}
                  
                  {/* Timeline dot */}
                  <div className="absolute left-6 top-6 w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white shadow-lg"></div>
                  
                  <div className="pl-12">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-gray-900">{treatment.procedure}</h3>
                        {treatment.tooth_number && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-sm">
                            🦷 Tooth #{treatment.tooth_number}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg mt-2 sm:mt-0">
                        📅 {formatDate(treatment.treatment_date)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {treatment.diagnosis && (
                        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                          <p className="text-sm font-semibold text-blue-900 mb-1">🔬 Diagnosis</p>
                          <p className="text-blue-800">{treatment.diagnosis}</p>
                        </div>
                      )}
                      
                      <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
                        <p className="text-sm font-semibold text-green-900 mb-1">👨‍⚕️ Attending Doctor</p>
                        <p className="text-green-800">Dr. {treatment.doctor?.full_name || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    {treatment.notes && (
                      <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
                        <p className="text-sm font-semibold text-gray-900 mb-2">📝 Treatment Notes</p>
                        <p className="text-gray-700 italic">{treatment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                <FiFileText className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {treatments.length === 0 ? 'No Treatment Records Yet' : 'No Records Match Your Filters'}
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                {treatments.length === 0 
                  ? 'Your treatment history will appear here after your first dental appointment.'
                  : 'Try adjusting your filters to see more results, or clear all filters to view your complete history.'
                }
              </p>
              {(selectedYear !== 'all' || selectedTooth !== 'all' || selectedProcedure !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedYear('all');
                    setSelectedTooth('all');
                    setSelectedProcedure('all');
                  }}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
                >
                  <FiEye className="mr-2 -ml-1 h-5 w-5" />
                  View All Records
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Dental Chart Overview */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
              <FiUser className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Interactive Dental Chart</h2>
              <p className="text-sm text-gray-600">Visual overview of your dental treatment history</p>
            </div>
          </div>
          <button
            onClick={() => setShowDentalChart(!showDentalChart)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
          >
            {showDentalChart ? (
              <>
                <FiX className="mr-2 -ml-1 h-4 w-4" />
                Hide Chart
              </>
            ) : (
              <>
                <FiEye className="mr-2 -ml-1 h-4 w-4" />
                View Chart
              </>
            )}
          </button>
        </div>

        {showDentalChart ? (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center px-6 py-3 rounded-full text-sm bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 border-2 border-blue-200">
                <FiEye className="w-5 h-5 mr-3" />
                <span className="font-semibold">Interactive Dental Chart</span>
                <span className="mx-2">•</span>
                <span>Click on any tooth to view its treatment history</span>
              </div>
            </div>

            {/* Upper Teeth Chart */}
            <div className="mb-12">
              <h3 className="text-lg font-bold text-gray-700 mb-6 text-center">🦷 Upper Teeth</h3>
              <div className="flex justify-center">
                <div className="grid grid-cols-8 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => renderTooth(num))}
                </div>
                <div className="grid grid-cols-8 gap-2 ml-8">
                  {[9, 10, 11, 12, 13, 14, 15, 16].map(num => renderTooth(num))}
                </div>
              </div>
            </div>
            
            {/* Lower Teeth Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-700 mb-6 text-center">🦷 Lower Teeth</h3>
              <div className="flex justify-center">
                <div className="grid grid-cols-8 gap-2">
                  {[32, 31, 30, 29, 28, 27, 26, 25].map(num => renderTooth(num))}
                </div>
                <div className="grid grid-cols-8 gap-2 ml-8">
                  {[24, 23, 22, 21, 20, 19, 18, 17].map(num => renderTooth(num))}
                </div>
              </div>
            </div>

            {/* Selected Tooth Details */}
            {selectedToothInChart && (
              <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 text-white">
                  <h3 className="font-bold text-xl flex items-center">
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                      🦷
                    </div>
                    Tooth #{selectedToothInChart} Treatment History
                  </h3>
                </div>
                
                <div className="p-6">
                  {toothTreatments.length > 0 ? (
                    <div className="space-y-4">
                      {toothTreatments.map(treatment => (
                        <div key={treatment.id} className="bg-white p-6 rounded-lg border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-lg text-gray-800">{treatment.procedure}</h4>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                              📅 {formatDate(treatment.treatment_date)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {treatment.diagnosis && (
                              <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                                <span className="font-semibold text-blue-900 text-sm">🔬 Diagnosis:</span>
                                <p className="text-blue-800 mt-1">{treatment.diagnosis}</p>
                              </div>
                            )}
                            <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-400">
                              <span className="font-semibold text-green-900 text-sm">👨‍⚕️ Doctor:</span>
                              <p className="text-green-800 mt-1">Dr. {treatment.doctor?.full_name || 'Unknown'}</p>
                            </div>
                          </div>
                          {treatment.notes && (
                            <div className="mt-4 bg-gray-50 rounded-lg p-3 border-l-4 border-gray-400">
                              <span className="font-semibold text-gray-900 text-sm">📝 Notes:</span>
                              <p className="text-gray-700 mt-1 italic">{treatment.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <FiFileText className="w-8 h-8 text-gray-500" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">No Treatment History</h4>
                      <p className="text-gray-600">This tooth has no recorded treatments yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Enhanced Legend */}
            <div className="mt-10 flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center bg-white rounded-lg px-4 py-2 shadow-sm border-2 border-gray-200">
                <div className="w-6 h-6 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 rounded-lg mr-3"></div>
                <span className="font-medium text-gray-700">No treatment</span>
              </div>
              <div className="flex items-center bg-yellow-50 rounded-lg px-4 py-2 shadow-sm border-2 border-yellow-200">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-400 rounded-lg mr-3"></div>
                <span className="font-medium text-yellow-800">Has treatment history</span>
              </div>
              <div className="flex items-center bg-blue-50 rounded-lg px-4 py-2 shadow-sm border-2 border-blue-200">
                <div className="w-6 h-6 bg-blue-200 border-2 border-blue-500 rounded-lg mr-3 transform scale-110"></div>
                <span className="font-medium text-blue-800">Currently selected</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                <FiUser className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Interactive Dental Chart Preview</h3>
              <p className="text-gray-600 text-lg mb-6">
                Click the "View Chart" button to see a visual representation of your dental treatment history.
              </p>
              <button
                onClick={() => setShowDentalChart(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-lg"
              >
                <FiEye className="mr-2 -ml-1 h-5 w-5" />
                View Interactive Chart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;