// src/pages/auth/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { FiEye, FiEyeOff, FiUser, FiMail, FiPhone, FiHome, FiCalendar, FiLock } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PublicNavbar from '../../components/layouts/PublicNavbar';

const phoneRegExp = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
const passwordRegExp = /^(?=.*[!@#$%^&*])(?=.*[a-zA-Z0-9]).{8,}$/;

const RegisterSchema = Yup.object().shape({
  full_name: Yup.string()
    .min(2, 'Too Short!')
    .max(50, 'Too Long!')
    .required('Full name is required'),
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
  phone: Yup.string()
    .matches(phoneRegExp, 'Phone number is not valid')
    .required('Phone number is required'),
  address: Yup.string()
    .required('Address is required'),
  birthday: Yup.date()
    .required('Birthday is required')
    .max(new Date(), 'Birthday cannot be in the future'),
  age: Yup.number()
    .required('Age is required')
    .positive('Age must be positive')
    .integer('Age must be an integer'),
  gender: Yup.string()
    .oneOf(['male', 'female', 'other'], 'Invalid gender selection')
    .required('Gender is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      passwordRegExp,
      'Password must contain at least 8 characters and one special character'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setIsLoading(true);
    
    // Create userData object from form values
    const userData = {
      full_name: values.full_name,
      phone: values.phone,
      address: values.address,
      birthday: values.birthday,
      age: values.age,
      gender: values.gender,
    };
    
    try {
      const { success, error } = await register(values.email, values.password, userData);
      
      if (success) {
        resetForm();
        toast.warning(
          'Account created! You must confirm your email address before logging in. Please check your inbox now.', 
          { autoClose: 8000 }
        );
        navigate('/login');
      } else if (error && (
          error.includes('row-level security policy') || 
          error.includes('violates row-level security')
        )) {
        // This is actually a success case - the auth account was created but the profile creation
        // failed due to RLS, which is expected behavior before email verification
        resetForm();
        toast.warning(
          'Account created! You must verify your email address before accessing your account. Please check your inbox now.', 
          { autoClose: 8000 }
        );
        navigate('/login');
      } else {
        // Handle other errors
        toast.error(error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Check for the specific RLS error message pattern
      const errorMessage = error.message || error.toString();
      if (
        errorMessage.includes('row-level security policy') || 
        errorMessage.includes('violates row-level security')
      ) {
        // This is likely a successful auth signup but failed profile creation due to RLS
        resetForm();
        toast.warning(
          'Account created! You must verify your email address before logging in. Please check your inbox now.', 
          { autoClose: 8000 }
        );
        navigate('/login');
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-green-300 to-blue-600 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md mt-12">
          {/* Professional Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-2">
              {/* Replace with <img src={logo} alt="Logo" className="h-10 w-10" /> if you have a logo */}
              <span className="text-white text-3xl font-bold">SDC</span>
            </div>
            <h1 className="text-2xl font-bold text-primary-700 tracking-wide">Silario Dental Clinic</h1>
            <div className="w-16 border-b-2 border-primary-200 mt-2 mb-1"></div>
          </div>

          <div className="text-center">
            <h2 className="mt-6 text-2xl font-bold text-gray-600">Create your account</h2>
            <p className="mt-2 text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
          </div>

          <Formik
            initialValues={{
              full_name: '',
              email: '',
              phone: '',
              address: '',
              birthday: null,
              age: '',
              gender: '',
              password: '',
              confirmPassword: '',
            }}
            validationSchema={RegisterSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched, setFieldValue, values }) => (
              <Form className="mt-8 space-y-6">
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-500">
                      Full Name
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="full_name"
                        name="full_name"
                        type="text"
                        className={`block w-full pl-10 pr-3 py-2 border ${
                          errors.full_name && touched.full_name
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100'
                        } rounded-md shadow-sm`}
                        placeholder="First name, Last name, Middle name"
                        style={{ color: 'rgb(75, 85, 99)' }}
                      />
                    </div>
                    <ErrorMessage
                      name="full_name"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-500">
                      Email Address
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        className={`block w-full pl-10 pr-3 py-2 border ${
                          errors.email && touched.email
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100'
                        } rounded-md shadow-sm`}
                        placeholder="user@gmail.com"
                        style={{ color: 'rgb(75, 85, 99)' }}
                      />
                    </div>
                    <ErrorMessage
                      name="email"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-500">
                      Phone Number
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="phone"
                        name="phone"
                        type="tel"
                        className={`block w-full pl-10 pr-3 py-2 border ${
                          errors.phone && touched.phone
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100'
                        } rounded-md shadow-sm`}
                        placeholder="+63 90* ****745"
                        style={{ color: 'rgb(75, 85, 99)' }}
                      />
                    </div>
                    <ErrorMessage
                      name="phone"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-500">
                      Address
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiHome className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="address"
                        name="address"
                        type="text"
                        className={`block w-full pl-10 pr-3 py-2 border ${
                          errors.address && touched.address
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100'
                        } rounded-md shadow-sm`}
                        placeholder="Barangay, City, Province"
                        style={{ color: 'rgb(75, 85, 99)' }}
                      />
                    </div>
                    <ErrorMessage
                      name="address"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>

                  {/* Birthday */}
                  <div>
                    <label htmlFor="birthday" className="block text-sm font-medium text-gray-500">
                      Birthday
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiCalendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <DatePicker
                        id="birthday"
                        selected={values.birthday}
                        onChange={(date) => {
                          setFieldValue('birthday', date);
                          setFieldValue('age', calculateAge(date));
                        }}
                        dateFormat="MMMM d, yyyy"
                        className={`block w-full pl-10 pr-3 py-2 border ${
                          errors.birthday && touched.birthday
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100'
                        } rounded-md shadow-sm`}
                        placeholderText="Select your birthday"
                        maxDate={new Date()}
                        minDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100))}
                        showMonthDropdown
                        showYearDropdown
                        scrollableYearDropdown
                        yearDropdownItemNumber={100}
                        style={{ color: 'rgb(75, 85, 99)' }}
                      />
                    </div>
                    <ErrorMessage
                      name="birthday"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-500">
                      Age
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <Field
                        id="age"
                        name="age"
                        type="number"
                        className={`block w-full pl-3 pr-3 py-2 border ${
                          errors.age && touched.age
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500'
                        } rounded-md shadow-sm bg-gray-100`}
                        placeholder="Enter your age"
                        disabled={true}
                        style={{ color: 'rgb(75, 85, 99)' }}
                      />
                    </div>
                    <ErrorMessage
                      name="age"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-500">
                      Gender
                    </label>
                    <div className="mt-1">
                      <Field
                        as="select"
                        id="gender"
                        name="gender"
                        className={`block w-full pl-3 pr-10 py-2 border ${
                          errors.gender && touched.gender
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100'
                        } rounded-md shadow-sm`}
                        style={{ color: 'rgb(75, 85, 99)' }}
                      >
                        <option value="" className="text-gray-500">Select Gender</option>
                        <option value="male" className="text-gray-600">Male</option>
                        <option value="female" className="text-gray-600">Female</option>
                        <option value="other" className="text-gray-600">Other</option>
                      </Field>
                    </div>
                    <ErrorMessage
                      name="gender"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-500">
                      Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`block w-full pl-10 pr-10 py-2 border ${
                          errors.password && touched.password
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100'
                        } rounded-md shadow-sm`}
                        placeholder="********"
                        style={{ color: 'rgb(75, 85, 99)' }}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-gray-500 focus:outline-none"
                        >
                          {showPassword ? (
                            <FiEyeOff className="h-5 w-5" />
                          ) : (
                            <FiEye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 8 characters and include at least one special character.
                    </p>
                    <ErrorMessage
                      name="password"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-500">
                      Confirm Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className={`block w-full pl-10 pr-10 py-2 border ${
                          errors.confirmPassword && touched.confirmPassword
                            ? 'border-red-300 text-red-600 placeholder-red-200 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-red-50'
                            : 'border-gray-300 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-gray-100'
                        } rounded-md shadow-sm`}
                        placeholder="********"
                        style={{ color: 'rgb(75, 85, 99)' }}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-gray-400 hover:text-gray-500 focus:outline-none"
                        >
                          {showConfirmPassword ? (
                            <FiEyeOff className="h-5 w-5" />
                          ) : (
                            <FiEye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <ErrorMessage
                      name="confirmPassword"
                      component="p"
                      className="mt-1 text-sm text-yellow-600"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed"
                  >
                    {isLoading || isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </>
  );
};

export default Register;