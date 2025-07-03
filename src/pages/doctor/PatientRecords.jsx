// src/pages/doctor/PatientRecords.jsx - Enhanced with Treatment History and Dental Chart
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiEye, FiTrash2, FiFileText, FiX, FiPrinter, FiPlus, FiEdit, FiSave, FiDownload, FiUser, FiCalendar, FiClock, FiMapPin } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import supabase from '../../config/supabaseClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Define bucket name as a constant to avoid typos
const BUCKET_NAME = 'patient-files';

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

// Validation schema for treatment history
const treatmentSchema = Yup.object().shape({
  procedure: Yup.string().required('Procedure is required'),
  tooth_number: Yup.number().min(1, 'Invalid tooth number').max(32, 'Invalid tooth number'),
  diagnosis: Yup.string(),
  notes: Yup.string().max(500, 'Notes must be less than 500 characters'),
  treatment_date: Yup.date().required('Treatment date is required').max(new Date(), 'Treatment date cannot be in the future')
});

const PatientRecords = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isFileDeleting, setIsFileDeleting] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  
  // Treatment History States
  const [treatments, setTreatments] = useState([]);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [isSubmittingTreatment, setIsSubmittingTreatment] = useState(false);
  const [showDentalChart, setShowDentalChart] = useState(false);
  const [selectedToothInChart, setSelectedToothInChart] = useState(null);
  const [toothTreatments, setToothTreatments] = useState([]);
  
  // Dental Chart States
  const [dentalChart, setDentalChart] = useState(null);
  const [showDentalChartDetails, setShowDentalChartDetails] = useState(false);
  
  // File preview and print states
  const [filePreview, setFilePreview] = useState(null);
  const [printWindow, setPrintWindow] = useState(null);

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
      fetchTreatmentHistory();
      fetchDentalChart();
    } else {
      setIsLoading(false);
    }
    return () => {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
    };
  }, [patientId]);

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

  const fetchPatientData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch patient profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (profileError) throw profileError;
      setPatient(profileData);
      
      // Fetch patient files
      const { data: filesData, error: filesError } = await supabase
        .from('patient_files')
        .select('*')
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false });
      
      if (filesError) throw filesError;
      
      const processedFiles = filesData?.map(file => {
        if (!file) return null;
        return {
          ...file,
          isPatientUploaded: file.uploaded_by === patientId,
          displayDate: formatDate(file.uploaded_at),
          uploaderType: file.uploaded_by === patientId ? 'patient' : 'staff'
        };
      }).filter(file => file !== null) || [];
      
      setUploadedFiles(processedFiles);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error('Failed to load patient data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTreatmentHistory = async () => {
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
          created_at,
          doctor:doctor_id (id, full_name)
        `)
        .eq('patient_id', patientId)
        .order('treatment_date', { ascending: false });
      
      if (error) throw error;
      setTreatments(data || []);
    } catch (error) {
      console.error('Error fetching treatment history:', error);
      toast.error('Failed to load treatment history');
    }
  };

  const fetchDentalChart = async () => {
    try {
      const { data, error } = await supabase
        .from('dental_charts')
        .select(`
          id,
          chart_data,
          medical_history,
          dental_history,
          created_at,
          updated_at,
          doctor:created_by (id, full_name)
        `)
        .eq('patient_id', patientId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setDentalChart(data);
    } catch (error) {
      console.error('Error fetching dental chart:', error);
      // Don't show error toast as dental chart might not exist yet
    }
  };

  const handleTreatmentSubmit = async (values, { resetForm }) => {
    setIsSubmittingTreatment(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const treatmentData = {
        ...values,
        patient_id: patientId,
        doctor_id: user.id,
        treatment_date: values.treatment_date.toISOString().split('T')[0]
      };

      if (editingTreatment) {
        const { error } = await supabase
          .from('treatments')
          .update(treatmentData)
          .eq('id', editingTreatment.id);
        
        if (error) throw error;
        toast.success('Treatment record updated successfully');
      } else {
        const { error } = await supabase
          .from('treatments')
          .insert([treatmentData]);
        
        if (error) throw error;
        toast.success('Treatment record added successfully');
      }

      resetForm();
      setShowTreatmentForm(false);
      setEditingTreatment(null);
      fetchTreatmentHistory();
    } catch (error) {
      console.error('Error saving treatment:', error);
      toast.error('Failed to save treatment record');
    } finally {
      setIsSubmittingTreatment(false);
    }
  };

  const handleDeleteTreatment = async (treatmentId) => {
    if (!window.confirm('Are you sure you want to delete this treatment record?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('treatments')
        .delete()
        .eq('id', treatmentId);
      
      if (error) throw error;
      
      toast.success('Treatment record deleted successfully');
      fetchTreatmentHistory();
    } catch (error) {
      console.error('Error deleting treatment:', error);
      toast.error('Failed to delete treatment record');
    }
  };

  const handleToothClick = (toothNumber) => {
    setSelectedToothInChart(toothNumber === selectedToothInChart ? null : toothNumber);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-US', options);
    } catch (e) {
      return dateStr || 'Not set';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
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

  // Generate and print treatment history report
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
        <title>Treatment History - ${patient.full_name}</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 15px;
            line-height: 1.4;
            color: #000;
            font-size: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .clinic-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
          }
          .logo-circle {
            width: 60px;
            height: 60px;
            border: 3px solid #1e40af;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            background: #3b82f6;
            color: white;
            font-weight: bold;
            font-size: 24px;
          }
          .clinic-text {
            text-align: left;
          }
          .clinic-name {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin: 0;
            letter-spacing: 1px;
          }
          .doctor-name {
            font-size: 14px;
            color: #374151;
            font-style: italic;
            margin: 5px 0;
          }
          .form-title {
            font-size: 18px;
            font-weight: bold;
            color: #000;
            margin: 15px 0 10px 0;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .patient-section {
            border: 2px solid #000;
            margin-bottom: 20px;
          }
          .section-header {
            background: #f3f4f6;
            padding: 8px 12px;
            border-bottom: 1px solid #000;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
          }
          .info-grid {
            padding: 15px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 30px;
          }
          .info-row {
            display: flex;
            border-bottom: 1px dotted #ccc;
            padding: 5px 0;
          }
          .info-label {
            font-weight: bold;
            width: 120px;
            color: #000;
          }
          .info-value {
            flex: 1;
            border-bottom: 1px solid #000;
            min-height: 16px;
            padding-left: 5px;
          }
          .treatments-section {
            border: 2px solid #000;
            margin-bottom: 20px;
          }
          .treatment-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .treatment-table th {
            background: #f3f4f6;
            border: 1px solid #000;
            padding: 8px 5px;
            text-align: left;
            font-weight: bold;
            font-size: 10px;
          }
          .treatment-table td {
            border: 1px solid #000;
            padding: 8px 5px;
            vertical-align: top;
          }
          .treatment-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 200px;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 50px;
            padding-top: 5px;
            font-size: 10px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
          }
          .date-box {
            text-align: right;
            margin-bottom: 10px;
            font-size: 11px;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 10px;
            }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-logo">
            <div class="logo-circle">SDC</div>
            <div class="clinic-text">
              <div class="clinic-name">SILARIO DENTAL CLINIC</div>
              <div class="doctor-name">Elaine Mae Frando Silario D.M.D</div>
            </div>
          </div>
          <div class="form-title">DENTAL TREATMENT HISTORY RECORD</div>
        </div>

        <div class="date-box">
          Date Generated: <u>${currentDate}</u>
        </div>

        <div class="patient-section">
          <div class="section-header">Patient Information Record</div>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${patient.full_name || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Age:</span>
              <span class="info-value">${patient.birthday ? calculateAge(patient.birthday) : ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${patient.address || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sex:</span>
              <span class="info-value">${patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Birthdate:</span>
              <span class="info-value">${patient.birthday ? formatDate(patient.birthday) : ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${currentDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nationality:</span>
              <span class="info-value">${patient.nationality || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Home No.:</span>
              <span class="info-value">${patient.phone || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Home Address:</span>
              <span class="info-value">${patient.address || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Office No.:</span>
              <span class="info-value">${patient.office_phone || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Occupation:</span>
              <span class="info-value">${patient.occupation || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cell/Mobile No.:</span>
              <span class="info-value">${patient.mobile || patient.phone || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Patient ID:</span>
              <span class="info-value">${patient.id ? patient.id.substring(0, 8) : ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email Add:</span>
              <span class="info-value">${patient.email || ''}</span>
            </div>
          </div>
        </div>

        <div class="treatments-section">
          <div class="section-header">Treatment History Summary (${treatments.length} Records)</div>
          
          ${treatments.length === 0 ? `
            <div style="text-align: center; padding: 30px; font-style: italic;">
              No treatment records found for this patient.
            </div>
          ` : `
            <table class="treatment-table">
              <thead>
                <tr>
                  <th style="width: 12%;">Date</th>
                  <th style="width: 25%;">Procedure</th>
                  <th style="width: 10%;">Tooth #</th>
                  <th style="width: 20%;">Diagnosis</th>
                  <th style="width: 25%;">Notes</th>
                  <th style="width: 15%;">Doctor</th>
                </tr>
              </thead>
              <tbody>
                ${treatments.map((treatment, index) => `
                  <tr>
                    <td>${formatDate(treatment.treatment_date)}</td>
                    <td><strong>${treatment.procedure || 'Not specified'}</strong></td>
                    <td style="text-align: center;">${treatment.tooth_number || '-'}</td>
                    <td>${treatment.diagnosis || '-'}</td>
                    <td>${treatment.notes || '-'}</td>
                    <td>Dr. ${treatment.doctor?.full_name || 'Unknown'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">
              Patient Signature
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              Attending Dentist Signature
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>SILARIO DENTAL CLINIC</strong></p>
          <p>Professional Dental Care Services | Cabugao Branch & San Juan Branch</p>
          <p>This is an official dental treatment history record generated on ${currentDate}</p>
          <p style="margin-top: 8px; font-size: 8px;">
            This document contains confidential patient information and should be handled according to medical privacy guidelines.
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
  };

  // File handling functions
  const handleViewFile = (file) => {
    if (!file || !file.file_url) {
      toast.error('File information is missing or incomplete');
      return;
    }
    setFilePreview(file);
  };

  const handlePrintFile = (file) => {
    if (!file || !file.file_url) {
      toast.error('File information is missing or incomplete');
      return;
    }

    const toastId = toast.info('Preparing to print...', { autoClose: false });
    
    try {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }

      const isPdf = file.file_type && file.file_type.includes('pdf');
      const isImage = file.file_type && file.file_type.includes('image');
      
      const newWindow = window.open('', '_blank');
      
      if (!newWindow) {
        toast.update(toastId, {
          render: 'Pop-up blocked. Please allow pop-ups for this site.',
          type: toast.TYPE.ERROR,
          autoClose: 5000
        });
        return;
      }
      
      setPrintWindow(newWindow);
      
      if (isImage) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Print: ${file.file_name}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              @media print {
                body { height: auto; }
                img { max-height: 100%; }
              }
            </style>
          </head>
          <body>
            <img src="${file.file_url}" alt="${file.file_name}" onload="window.print(); window.addEventListener('afterprint', function() { window.setTimeout(function() { window.close(); }, 1000); });">
          </body>
          </html>
        `);
        newWindow.document.close();
      } else if (isPdf) {
        newWindow.location.href = file.file_url;
        newWindow.addEventListener('load', function() {
          setTimeout(() => {
            if (!newWindow.closed) {
              newWindow.print();
            }
          }, 2000);
        });
      } else {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Download: ${file.file_name}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; }
              .icon { font-size: 48px; margin-bottom: 20px; color: #4F46E5; }
              .btn { display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">📄</div>
              <h2>${file.file_name}</h2>
              <p>This file type cannot be printed directly. Please download the file first.</p>
              <a href="${file.file_url}" download="${file.file_name}" class="btn">Download File</a>
            </div>
          </body>
          </html>
        `);
        newWindow.document.close();
      }
      
      toast.update(toastId, {
        render: 'Print dialog prepared',
        type: toast.TYPE.SUCCESS,
        autoClose: 3000
      });
    } catch (error) {
      console.error('Error printing file:', error);
      toast.update(toastId, {
        render: 'Failed to print: ' + error.message,
        type: toast.TYPE.ERROR,
        autoClose: 5000
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsFileUploading(true);
    const toastId = toast.info('Uploading file...', { autoClose: false });
    
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${patientId}/${fileName}`;
      
      let fileUrl = null;
      
      try {
        const { error: uploadError, data } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }
        
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        
        fileUrl = urlData?.publicUrl;
        
        if (!fileUrl) {
          throw new Error('Could not generate public URL for file');
        }
      } catch (storageError) {
        console.error('Storage error details:', storageError);
        fileUrl = `${window.location.origin}/storage/${BUCKET_NAME}/${filePath}`;
        toast.update(toastId, {
          render: 'Storage system unreachable. File record will be created but may not be accessible.',
          type: toast.TYPE.WARNING,
          autoClose: 5000
        });
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      const doctorId = user?.id;
      
      const { data: fileData, error: recordError } = await supabase
        .from('patient_files')
        .insert([
          {
            patient_id: patientId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_path: filePath,
            file_url: fileUrl,
            uploaded_at: new Date().toISOString(),
            uploaded_by: doctorId || null,
          }
        ])
        .select();
      
      if (recordError) throw recordError;
      
      toast.update(toastId, {
        render: 'File uploaded successfully',
        type: toast.TYPE.SUCCESS,
        autoClose: 3000
      });
      
      if (fileData && fileData.length > 0) {
        const newFile = {
          ...fileData[0],
          isPatientUploaded: false,
          displayDate: formatDate(fileData[0].uploaded_at),
          uploaderType: 'staff'
        };
        setUploadedFiles(currentFiles => [newFile, ...currentFiles]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.update(toastId, {
        render: `Failed to upload file: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000
      });
    } finally {
      setIsFileUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteFile = (file) => {
    setFileToDelete(file);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    
    setIsFileDeleting(true);
    const toastId = toast.info('Deleting file...', { autoClose: false });
    
    try {
      try {
        const { error: storageError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([fileToDelete.file_path]);
        
        if (storageError) {
          console.warn('Storage error:', storageError);
        }
      } catch (storageError) {
        console.warn('Failed to delete from storage:', storageError);
      }
      
      const { error: dbError } = await supabase
        .from('patient_files')
        .delete()
        .eq('id', fileToDelete.id);
      
      if (dbError) throw dbError;
      
      toast.update(toastId, {
        render: 'File deleted successfully',
        type: toast.TYPE.SUCCESS,
        autoClose: 3000
      });
      
      setUploadedFiles(currentFiles => 
        currentFiles.filter(f => f.id !== fileToDelete.id)
      );
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.update(toastId, {
        render: `Failed to delete file: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000
      });
    } finally {
      setIsFileDeleting(false);
      setFileToDelete(null);
    }
  };

  const cancelDeleteFile = () => {
    setFileToDelete(null);
  };

  const closeFilePreview = () => {
    setFilePreview(null);
  };

  // Render tooth in dental chart with symbols
  const renderTooth = (toothNumber) => {
    const hasHistory = treatments.some(t => t.tooth_number === toothNumber);
    const isSelected = selectedToothInChart === toothNumber;
    const toothSymbol = dentalChart?.chart_data?.teeth?.[toothNumber]?.symbol || '';
    
    let toothClass = "tooth cursor-pointer transition-all duration-200";
    
    if (isSelected) {
      toothClass += " bg-primary-200 border-primary-500 border-2 shadow-md";
    } else if (toothSymbol) {
      toothClass += " bg-red-100 hover:bg-red-200 border-red-300";
    } else if (hasHistory) {
      toothClass += " bg-yellow-100 hover:bg-yellow-200";
    } else {
      toothClass += " bg-white hover:bg-gray-100";
    }
    
    return (
      <div 
        key={toothNumber}
        className={`${toothClass} w-10 h-12 rounded border border-gray-300 flex flex-col items-center justify-center text-xs font-medium m-1 relative`}
        onClick={() => handleToothClick(toothNumber)}
        title={`Tooth ${toothNumber}${toothSymbol ? ` - ${chartSymbols[toothSymbol] || toothSymbol}` : ''}${hasHistory ? ' - Has treatment history' : ''}`}
      >
        {toothSymbol && (
          <div className="text-red-600 font-bold text-sm absolute top-0">
            {toothSymbol}
          </div>
        )}
        <div className="text-xs font-bold text-gray-700 mt-2">
          {toothNumber}
        </div>
        {hasHistory && (
          <div className="w-2 h-2 bg-blue-500 rounded-full absolute bottom-0 right-0 transform translate-x-1 translate-y-1"></div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!patient && patientId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Patient not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The patient you're looking for could not be found.
          </p>
          <div className="mt-3">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => navigate('/doctor/patients')}
            >
              <FiArrowLeft className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
              Back to Patient List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          onClick={() => navigate('/doctor/patients')}
        >
          <FiArrowLeft className="mr-1 -ml-1 h-4 w-4" />
          Back to Patient List
        </button>
      </div>

      {/* Patient Information Card */}
      {patient && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg overflow-hidden border-2 border-blue-200">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {patient.full_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{patient.full_name}</h1>
                  <p className="text-sm text-gray-600">
                    Patient ID: {patient.id && patient.id.substring(0, 8)}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    {patient.birthday && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FiCalendar className="w-3 h-3 mr-1" />
                        Age: {calculateAge(patient.birthday)} years
                      </span>
                    )}
                    {patient.gender && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <FiUser className="w-3 h-3 mr-1" />
                        {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                      </span>
                    )}
                    {patient.phone && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <FiClock className="w-3 h-3 mr-1" />
                        {patient.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-2">
                <button
                  onClick={() => navigate(`/doctor/patients/${patientId}/dental-chart`)}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    dentalChart 
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                      : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                  }`}
                >
                  <FiFileText className="mr-2 -ml-1 h-5 w-5" />
                  {dentalChart ? 'View/Edit Chart' : 'Create Chart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Dental Chart Details Section */}
      {dentalChart && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Complete Dental Chart</h2>
                <p className="text-sm text-gray-600">Comprehensive dental examination and history</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => navigate(`/doctor/patients/${patientId}/dental-chart`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <FiEdit className="mr-2 -ml-1 h-4 w-4" />
                Edit Chart
              </button>
              <button
                onClick={() => setShowDentalChartDetails(!showDentalChartDetails)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {showDentalChartDetails ? (
                  <>
                    <FiX className="mr-2 -ml-1 h-4 w-4" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <FiEye className="mr-2 -ml-1 h-4 w-4" />
                    View Details
                  </>
                )}
              </button>
            </div>
          </div>

          {showDentalChartDetails ? (
            <div className="p-6 space-y-8">
              {/* Chart Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Chart Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.keys(dentalChart.chart_data?.teeth || {}).length}
                    </div>
                    <div className="text-blue-800">Teeth with Symbols</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(dentalChart.chart_data?.conditions || {}).filter(Boolean).length}
                    </div>
                    <div className="text-green-800">Active Conditions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.values(dentalChart.chart_data?.applications || {}).filter(Boolean).length}
                    </div>
                    <div className="text-purple-800">Applications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatDate(dentalChart.updated_at).split(',')[0]}
                    </div>
                    <div className="text-orange-800">Last Updated</div>
                  </div>
                </div>
              </div>

              {/* Dental Symbols Legend */}
              {Object.keys(dentalChart.chart_data?.teeth || {}).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Dental Symbols Used</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(dentalChart.chart_data?.teeth || {}).map(([toothNum, toothData]) => (
                      <div key={toothNum} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <span className="font-bold text-red-600">{toothData.symbol}</span>
                        </div>
                        <div>
                          <div className="font-medium">Tooth #{toothNum}</div>
                          <div className="text-sm text-gray-600">
                            {chartSymbols[toothData.symbol] || toothData.symbol}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart Information */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Chart Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Created by:</span>
                    <span className="ml-2 text-gray-600">
                      Dr. {dentalChart.doctor?.full_name || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-600">{formatDate(dentalChart.created_at)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Updated:</span>
                    <span className="ml-2 text-gray-600">{formatDate(dentalChart.updated_at)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Chart ID:</span>
                    <span className="ml-2 text-gray-600 font-mono">{dentalChart.id.substring(0, 8)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <FiFileText className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Complete Dental Chart Available</h3>
                <p className="text-gray-600 mb-4">
                  This patient has a comprehensive dental chart with medical history, dental symbols, and treatment conditions.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowDentalChartDetails(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    <FiEye className="mr-2 -ml-1 h-5 w-5" />
                    View Chart Details
                  </button>
                  <button
                    onClick={() => navigate(`/doctor/patients/${patientId}/dental-chart`)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    <FiEdit className="mr-2 -ml-1 h-5 w-5" />
                    Edit Chart
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Dental Chart Message */}
      {!dentalChart && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <FiFileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Dental Chart Created</h3>
              <p className="text-gray-600 mb-6">
                This patient doesn't have a comprehensive dental chart yet. Create one to record medical history, dental symbols, and examination findings.
              </p>
              <button
                onClick={() => navigate(`/doctor/patients/${patientId}/dental-chart`)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiPlus className="mr-2 -ml-1 h-5 w-5" />
                Create Dental Chart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment History Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center text-white">
            <FiFileText className="h-6 w-6 mr-3" />
            <div>
              <h2 className="text-lg font-medium">Treatment History</h2>
              <p className="text-blue-100 text-sm">Comprehensive patient treatment records</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={printTreatmentHistory}
              className="inline-flex items-center px-4 py-2 border border-white border-opacity-30 text-sm font-medium rounded-md text-white bg-white bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
            >
              <FiPrinter className="mr-2 -ml-1 h-5 w-5" />
              Print History
            </button>
            <button
              onClick={() => {
                setShowTreatmentForm(true);
                setEditingTreatment(null);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus className="mr-2 -ml-1 h-5 w-5" />
              Add Treatment
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Treatment Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiFileText className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Total Treatments</p>
                  <p className="text-2xl font-bold text-blue-600">{treatments.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiCalendar className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Procedures</p>
                  <p className="text-2xl font-bold text-green-600">{new Set(treatments.map(t => t.procedure)).size}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiUser className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-900">Teeth Treated</p>
                  <p className="text-2xl font-bold text-yellow-600">{new Set(treatments.filter(t => t.tooth_number).map(t => t.tooth_number)).size}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiClock className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">Last Visit</p>
                  <p className="text-sm font-bold text-purple-600">
                    {treatments.length > 0 ? formatDate(treatments[0].treatment_date) : 'No visits'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Treatment Form */}
          {showTreatmentForm && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTreatment ? 'Edit Treatment Record' : 'Add New Treatment Record'}
              </h3>
              
              <Formik
                initialValues={{
                  procedure: editingTreatment?.procedure || '',
                  tooth_number: editingTreatment?.tooth_number || '',
                  diagnosis: editingTreatment?.diagnosis || '',
                  notes: editingTreatment?.notes || '',
                  treatment_date: editingTreatment?.treatment_date ? new Date(editingTreatment.treatment_date) : new Date()
                }}
                validationSchema={treatmentSchema}
                onSubmit={handleTreatmentSubmit}
                enableReinitialize={true}
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="procedure" className="block text-sm font-medium text-gray-700 mb-1">
                          Procedure <span className="text-red-500">*</span>
                        </label>
                        <Field
                          as="select"
                          id="procedure"
                          name="procedure"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select procedure</option>
                          <option value="Cleaning">Dental Cleaning</option>
                          <option value="Filling">Dental Filling</option>
                          <option value="Extraction">Tooth Extraction</option>
                          <option value="Root Canal">Root Canal Treatment</option>
                          <option value="Crown">Crown Placement</option>
                          <option value="Bridge">Bridge Installation</option>
                          <option value="Implant">Dental Implant</option>
                          <option value="Whitening">Teeth Whitening</option>
                          <option value="Orthodontics">Orthodontic Treatment</option>
                          <option value="Consultation">Consultation</option>
                          <option value="X-Ray">X-Ray Examination</option>
                          <option value="Other">Other</option>
                        </Field>
                        <ErrorMessage name="procedure" component="p" className="mt-1 text-sm text-red-600" />
                      </div>

                      <div>
                        <label htmlFor="tooth_number" className="block text-sm font-medium text-gray-700 mb-1">
                          Tooth Number (Optional)
                        </label>
                        <Field
                          type="number"
                          id="tooth_number"
                          name="tooth_number"
                          min="1"
                          max="32"
                          placeholder="1-32"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                        <ErrorMessage name="tooth_number" component="p" className="mt-1 text-sm text-red-600" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-1">
                        Diagnosis
                      </label>
                      <Field
                        type="text"
                        id="diagnosis"
                        name="diagnosis"
                        placeholder="Enter diagnosis"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage name="diagnosis" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="treatment_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Treatment Date <span className="text-red-500">*</span>
                      </label>
                      <Field
                        type="date"
                        id="treatment_date"
                        name="treatment_date"
                        max={new Date().toISOString().split('T')[0]}
                        value={values.treatment_date instanceof Date ? values.treatment_date.toISOString().split('T')[0] : values.treatment_date}
                        onChange={(e) => setFieldValue('treatment_date', new Date(e.target.value))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage name="treatment_date" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Treatment Notes
                      </label>
                      <Field
                        as="textarea"
                        id="notes"
                        name="notes"
                        rows={3}
                        placeholder="Enter detailed treatment notes"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage name="notes" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTreatmentForm(false);
                          setEditingTreatment(null);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FiSave className="mr-2 -ml-1 h-5 w-5 inline" />
                            {editingTreatment ? 'Update' : 'Save'} Treatment
                          </>
                        )}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          )}

          {/* Treatment Records List */}
          {treatments.length > 0 ? (
            <div className="space-y-4">
              {treatments.map((treatment) => (
                <div key={treatment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{treatment.procedure}</h4>
                        <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full font-medium">
                          {formatDate(treatment.treatment_date)}
                        </span>
                        {treatment.tooth_number && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                            Tooth #{treatment.tooth_number}
                          </span>
                        )}
                      </div>
                      
                      {treatment.diagnosis && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Diagnosis:</span> {treatment.diagnosis}
                        </p>
                      )}
                      
                      {treatment.notes && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Notes:</span> {treatment.notes}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Treated by: Dr. {treatment.doctor?.full_name || 'Unknown'}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingTreatment(treatment);
                          setShowTreatmentForm(true);
                        }}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="Edit Treatment"
                      >
                        <FiEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTreatment(treatment.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="Delete Treatment"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiFileText className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No treatment records</h3>
              <p className="mt-2 text-sm text-gray-500">
                Start by adding the first treatment record for this patient.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setShowTreatmentForm(true);
                    setEditingTreatment(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <FiPlus className="mr-2 -ml-1 h-5 w-5" />
                  Add First Treatment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dental Chart Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Interactive Dental Chart</h2>
          <button
            onClick={() => setShowDentalChart(!showDentalChart)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
          <div className="p-6">
            {/* Upper Teeth */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Upper Teeth</h3>
              <div className="flex justify-center">
                <div className="grid grid-cols-8 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => renderTooth(num))}
                </div>
                <div className="grid grid-cols-8 gap-1 ml-4">
                  {[9, 10, 11, 12, 13, 14, 15, 16].map(num => renderTooth(num))}
                </div>
              </div>
            </div>
            
            {/* Lower Teeth */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Lower Teeth</h3>
              <div className="flex justify-center">
                <div className="grid grid-cols-8 gap-1">
                  {[32, 31, 30, 29, 28, 27, 26, 25].map(num => renderTooth(num))}
                </div>
                <div className="grid grid-cols-8 gap-1 ml-4">
                  {[24, 23, 22, 21, 20, 19, 18, 17].map(num => renderTooth(num))}
                </div>
              </div>
            </div>

            {/* Selected Tooth Details */}
            {selectedToothInChart && (
              <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Tooth #{selectedToothInChart} Details</h3>
                </div>
                
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Treatment History</h4>
                  
                  {toothTreatments.length > 0 ? (
                    <div className="space-y-3">
                      {toothTreatments.map(treatment => (
                        <div key={treatment.id} className="bg-white p-3 rounded border border-gray-200">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-800">{treatment.procedure}</span>
                            <span className="text-xs text-gray-500">{formatDate(treatment.treatment_date)}</span>
                          </div>
                          {treatment.diagnosis && (
                            <div className="mt-1 text-sm">
                              <span className="font-medium text-gray-600">Diagnosis:</span> {treatment.diagnosis}
                            </div>
                          )}
                          {treatment.notes && (
                            <div className="mt-1 text-sm">
                              <span className="font-medium text-gray-600">Notes:</span> {treatment.notes}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-gray-500">
                            Dr. {treatment.doctor?.full_name || 'Unknown'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-600">No treatment history for this tooth.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Legend */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white border border-gray-300 rounded mr-2"></div>
                <span>No treatment/symbol</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
                <span>Has dental symbol</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-100 border border-gray-300 rounded mr-2"></div>
                <span>Has treatment</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
                <span>Selected</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="text-center py-8">
              <FiUser className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Dental chart preview</h3>
              <p className="mt-1 text-sm text-gray-500">
                Click the "View Chart" button to see an interactive dental chart with treatment history.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Patient Files Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Patient Files</h2>
            <p className="text-sm text-gray-500">Manage X-rays, documents, and other patient files</p>
          </div>
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer disabled:bg-primary-400 disabled:cursor-not-allowed"
            tabIndex="0"
          >
            {isFileUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <FiUpload className="mr-2 -ml-1 h-5 w-5" />
                Upload File
              </>
            )}
            <input
              id="file-upload"
              type="file"
              className="sr-only"
              onChange={handleFileUpload}
              disabled={isFileUploading}
            />
          </label>
        </div>
        
        <div className="p-6">
          {uploadedFiles.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 sm:rounded-md">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{uploadedFiles.length}</span> files total
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 mr-2">
                      Patient Uploaded
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                      Staff Uploaded
                    </span>
                  </div>
                </div>
              </div>
              <ul className="divide-y divide-gray-200">
                {uploadedFiles.map((file) => (
                  <li key={file.id} className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start">
                      <div className="flex items-center mb-2 sm:mb-0">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center">
                          {file && file.file_type && file.file_type.includes('image') ? (
                            <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : file && file.file_type && file.file_type.includes('pdf') ? (
                            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                          <div className="flex flex-wrap items-center">
                            <p className="text-xs text-gray-500 mr-2">
                              {file.displayDate} • {formatFileSize(file.file_size)}
                            </p>
                            {file.isPatientUploaded ? (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                                Patient Uploaded
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                                Staff Uploaded
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                        <button
                          onClick={() => handleViewFile(file)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <FiEye className="mr-1 h-4 w-4" />
                          View
                        </button>
                        <button
                          onClick={() => handlePrintFile(file)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <FiPrinter className="mr-1 h-4 w-4" />
                          Print
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <FiTrash2 className="mr-1 h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No files yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload X-rays, dental images, or other patient documents here.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Documents uploaded by patients in their profile will also appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {filePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{filePreview.file_name}</h3>
              <button
                onClick={closeFilePreview}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {filePreview.file_type && filePreview.file_type.includes('image') ? (
                <img 
                  src={filePreview.file_url} 
                  alt={filePreview.file_name}
                  className="max-w-full h-auto mx-auto"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Available';
                  }}
                />
              ) : filePreview.file_type && filePreview.file_type.includes('pdf') ? (
                <div className="h-[70vh]">
                  <iframe 
                    src={filePreview.file_url} 
                    title={filePreview.file_name}
                    className="w-full h-full"
                  ></iframe>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiFileText className="mx-auto h-16 w-16 text-gray-400" />
                  <p className="mt-4 text-sm text-gray-500">
                    This file type cannot be previewed directly. Please download the file to view it.
                  </p>
                  <button
                    onClick={() => handlePrintFile(filePreview)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <FiDownload className="mr-2 -ml-1 h-5 w-5" />
                    Print File
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between">
              <div className="text-sm text-gray-500">
                {filePreview.isPatientUploaded ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    Uploaded by Patient • {filePreview.displayDate}
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    Uploaded by Staff • {filePreview.displayDate}
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePrintFile(filePreview)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                >
                  <FiPrinter className="mr-1 h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => {
                    closeFilePreview();
                    handleDeleteFile(filePreview);
                  }}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                >
                  <FiTrash2 className="mr-1 h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the file "{fileToDelete.file_name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteFile}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFile}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300"
                disabled={isFileDeleting}
              >
                {isFileDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecords;