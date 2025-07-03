// src/pages/staff/PatientRecords.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiDownload, FiEye, FiTrash2, FiFileText, FiX, FiPrinter } from 'react-icons/fi';
import { toast } from 'react-toastify';
import supabase from '../../config/supabaseClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Define bucket name as a constant to avoid typos
const BUCKET_NAME = 'patient-files';

const PatientRecords = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isFileDeleting, setIsFileDeleting] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  
  // New state for file preview modal
  const [filePreview, setFilePreview] = useState(null);

  // State for the printable content
  const [printWindow, setPrintWindow] = useState(null);

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    } else {
      setIsLoading(false);
    }
    return () => {
      // Close any open print windows when component unmounts
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
    };
  }, [patientId]);

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
      
      // Process the files to add additional display information
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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-US', options);
    } catch (e) {
      return dateStr || 'Not set';
    }
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  // Function to handle file viewing with modal instead of new tab
  const handleViewFile = (file) => {
    if (!file || !file.file_url) {
      toast.error('File information is missing or incomplete');
      return;
    }

    // Set the file to preview in the modal
    setFilePreview(file);
  };

  // Improved function to handle file printing based on file type
  const handlePrintFile = (file) => {
    if (!file || !file.file_url) {
      toast.error('File information is missing or incomplete');
      return;
    }

    const toastId = toast.info('Preparing to print...', { autoClose: false });
    
    try {
      // Close any previously opened print window
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }

      // Determine the file type to handle printing differently
      const isPdf = file.file_type && file.file_type.includes('pdf');
      const isImage = file.file_type && file.file_type.includes('image');
      
      // Create a new window
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
        // For images: create a simple HTML document with just the image
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
        
        // Fallback if onload print doesn't work
        newWindow.addEventListener('load', function() {
          setTimeout(() => {
            if (!newWindow.closed) {
              newWindow.print();
            }
          }, 1000);
        });
      } else if (isPdf) {
        // For PDFs: Load the PDF in the new window then print
        newWindow.location.href = file.file_url;
        
        // Add a print button that floats on top of the PDF
        newWindow.addEventListener('load', function() {
          const printButton = newWindow.document.createElement('div');
          printButton.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 9999; background: #4F46E5; color: white; padding: 10px 15px; border-radius: 5px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
              Print Document
            </div>
          `;
          newWindow.document.body.appendChild(printButton);
          
          printButton.addEventListener('click', function() {
            newWindow.print();
          });
          
          // Auto-trigger print after a delay to ensure PDF is loaded
          setTimeout(() => {
            if (!newWindow.closed) {
              newWindow.print();
            }
          }, 2000);
        });
      } else {
        // For other file types: Redirect to file URL with instructions
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
      
      // Update toast
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

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsFileUploading(true);
    const toastId = toast.info('Uploading file...', { autoClose: false });
    
    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${patientId}/${fileName}`;
      
      // Try uploading to storage
      let fileUrl = null;
      
      try {
        const { error: uploadError, data } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }
        
        // Get public URL if upload succeeded
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        
        fileUrl = urlData?.publicUrl;
        
        if (!fileUrl) {
          throw new Error('Could not generate public URL for file');
        }
      } catch (storageError) {
        console.error('Storage error details:', storageError);
        
        // Construct a fallback URL (may not work, but gives database a value)
        fileUrl = `${window.location.origin}/storage/${BUCKET_NAME}/${filePath}`;
        toast.update(toastId, {
          render: 'Storage system unreachable. File record will be created but may not be accessible.',
          type: toast.TYPE.WARNING,
          autoClose: 5000
        });
      }
      
      // Get the current user's ID (the staff) from supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      const staffId = user?.id;
      
      // Save file record in database regardless of storage status
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
            uploaded_by: staffId || null, // Using staff's ID instead of patient
          }
        ])
        .select();
      
      if (recordError) throw recordError;
      
      // Update toast and UI
      toast.update(toastId, {
        render: 'File uploaded successfully',
        type: toast.TYPE.SUCCESS,
        autoClose: 3000
      });
      
      // Update local state instead of re-fetching everything
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
      // Reset the file input
      e.target.value = null;
    }
  };

  // Prompt for file deletion
  const handleDeleteFile = (file) => {
    setFileToDelete(file);
  };

  // Confirm file deletion
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    
    setIsFileDeleting(true);
    const toastId = toast.info('Deleting file...', { autoClose: false });
    
    try {
      // First try to delete from storage, but continue even if it fails
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
      
      // Delete record from database (this must succeed)
      const { error: dbError } = await supabase
        .from('patient_files')
        .delete()
        .eq('id', fileToDelete.id);
      
      if (dbError) throw dbError;
      
      // Update toast and UI
      toast.update(toastId, {
        render: 'File deleted successfully',
        type: toast.TYPE.SUCCESS,
        autoClose: 3000
      });
      
      // Update local state
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

  // Cancel file deletion
  const cancelDeleteFile = () => {
    setFileToDelete(null);
  };

  // Close file preview modal
  const closeFilePreview = () => {
    setFilePreview(null);
  };

  // Calculate age from birthday
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
              onClick={() => window.location.href = '/staff/patients'}
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
        <a
          href="/staff/patients"
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <FiArrowLeft className="mr-1 -ml-1 h-4 w-4" />
          Back to Patient List
        </a>
      </div>

      {/* Patient Information Card - Simplified */}
      {patient && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{patient.full_name}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Patient ID: {patient.id && patient.id.substring(0, 8)}
                </p>
                {patient.birthday && (
                  <p className="mt-1 text-sm text-gray-500">
                    Age: {calculateAge(patient.birthday)} years ({formatDate(patient.birthday)})
                  </p>
                )}
                {patient.gender && (
                  <p className="mt-1 text-sm text-gray-500">
                    Gender: {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                  </p>
                )}
                {patient.phone && (
                  <p className="mt-1 text-sm text-gray-500">
                    Phone: {patient.phone}
                  </p>
                )}
                {patient.email && (
                  <p className="mt-1 text-sm text-gray-500">
                    Email: {patient.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Files Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Patient Files</h2>
            <p className="text-sm text-gray-500">View documents uploaded by both patients and dental staff</p>
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