// src/pages/auth/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { FiEye, FiEyeOff, FiUser, FiLock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PublicNavbar from '../../components/layouts/PublicNavbar';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setIsLoading(true);
    try {
      const { success, role, error } = await login(values.email, values.password);
      
      if (success) {
        resetForm();
        // Redirect to the appropriate dashboard based on role
        switch (role) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'doctor':
            navigate('/doctor/dashboard');
            break;
          case 'staff':
            navigate('/staff/dashboard');
            break;
          case 'patient':
            navigate('/patient/dashboard');
            break;
          default:
            navigate('/');
        }
      } else {
        toast.error(error || 'Failed to login. Please try again.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-400 via-green-300 to-blue-600 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
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
            <h2 className="mt-3 text-xl font-semibold text-gray-800">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-500">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
          
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="mt-6 space-y-5">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                    </div>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        className={`
                          appearance-none block w-full pl-10 pr-3 py-2.5 border rounded-lg shadow-sm text-gray-700
                          focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all
                          ${
                            errors.email && touched.email
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300'
                          }
                        `}
                        placeholder="you@example.com"
                      />
                    </div>
                    <ErrorMessage
                      name="email"
                      component="p"
                      className="mt-1 text-sm text-red-600"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <div className="text-sm">
                        <Link
                          to="/forgot-password"
                          className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </div>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <Field
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`
                          appearance-none block w-full pl-10 pr-10 py-2.5 border rounded-lg shadow-sm text-gray-700
                          focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all
                          ${
                            errors.password && touched.password
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300'
                          }
                        `}
                        placeholder="••••••••"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <FiEyeOff className="h-5 w-5" />
                          ) : (
                            <FiEye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <ErrorMessage
                      name="password"
                      component="p"
                      className="mt-1 text-sm text-red-600"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading || isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Sign in'
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

export default Login;