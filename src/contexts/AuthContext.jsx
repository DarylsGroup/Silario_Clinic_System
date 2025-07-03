// src/contexts/AuthContext.jsx - Updated with disabled user check
import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../config/supabaseClient';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check for active session on component mount
    const checkSession = async () => {
      try {
        console.log("Checking session...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session check error:", error);
          setAuthError(error);
          setLoading(false);
          return;
        }

        if (data?.session) {
          console.log("Session found:", data.session.user.id);
          
          // Fetch user profile to check disabled status and role
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('role, full_name, disabled')
              .eq('id', data.session.user.id)
              .single();
            
            if (profileError) {
              console.error("Profile fetch error:", profileError);
              // Don't set auth error here, just log it
              // We still have a valid user, just couldn't get their role
            }
            
            // Check if user is disabled
            if (profileData && profileData.disabled === true) {
              console.warn("User account is disabled:", data.session.user.id);
              // Sign out if user is disabled
              await supabase.auth.signOut();
              toast.error('Your account has been disabled. Please contact an administrator.');
              setUser(null);
              setUserRole(null);
            } else if (profileData) {
              // User is not disabled, proceed normally
              setUser(data.session.user);
              console.log("User role found:", profileData.role);
              setUserRole(profileData.role);
            } else {
              // No profile found but user is authenticated
              console.warn("No profile found for user:", data.session.user.id);
              setUser(data.session.user);
              // Set a default role if none found
              setUserRole('patient');
            }
          } catch (profileFetchError) {
            console.error("Error in profile fetch:", profileFetchError);
            // Continue with user logged in but unknown role
            setUser(data.session.user);
          }
        } else {
          console.log("No active session found");
        }
      } catch (error) {
        console.error('Error checking session:', error.message);
        setAuthError(error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (session) {
        console.log("New session established for user:", session.user.id);
        
        // Check for disabled status
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role, full_name, disabled')
            .eq('id', session.user.id)
            .single();
          
          if (!profileError && profileData) {
            // Check if user is disabled
            if (profileData.disabled === true) {
              console.warn("Disabled user attempted to log in:", session.user.id);
              await supabase.auth.signOut();
              toast.error('Your account has been disabled. Please contact an administrator.');
              setUser(null);
              setUserRole(null);
            } else {
              setUser(session.user);
              console.log("User role updated:", profileData.role);
              setUserRole(profileData.role);
            }
          } else {
            console.warn("Could not fetch role on auth change:", profileError);
            // Keep existing role or set default
            setUser(session.user);
            setUserRole(userRole || 'patient');
          }
        } catch (profileError) {
          console.error("Error getting role on auth change:", profileError);
          setUser(session.user);
        }
      } else {
        console.log("Session ended, clearing user data");
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      console.log("Cleaning up auth subscription");
      authListener.subscription.unsubscribe();
    };
  }, []);

  const register = async (email, password, userData) => {
    try {
      setLoading(true);
      console.log("Registering new user:", email);
      
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("Registration error:", error);
        throw error;
      }

      if (data?.user) {
        console.log("User created, setting up profile");
        
        // Wait a moment to ensure the auth user is fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              full_name: userData.full_name,
              phone: userData.phone,
              address: userData.address,
              birthday: userData.birthday,
              age: userData.age,
              gender: userData.gender,
              role: 'patient', // Default role for self-registration
              disabled: false, // Default to not disabled
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
          ]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          
          // If profile creation fails, try to delete the auth user
          await supabase.auth.admin.deleteUser(data.user.id).catch(err => 
            console.error("Failed to cleanup auth user:", err)
          );
          
          throw profileError;
        }

        toast.success('Registration successful! Please check your email to verify your account.');
        return { success: true };
      }
    } catch (error) {
      console.error("Registration process failed:", error);
      toast.error(error.message || 'Registration failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      console.log("Attempting login for:", email);
      
      // First check if the user account is disabled
      // This extra check helps prevent even attempting to log in with disabled accounts
      const { data: emailCheck, error: emailCheckError } = await supabase
        .from('profiles')
        .select('disabled')
        .eq('email', email)
        .single();
        
      if (!emailCheckError && emailCheck && emailCheck.disabled === true) {
        console.warn("Attempt to login to disabled account:", email);
        throw new Error('Your account has been disabled. Please contact an administrator.');
      }
      
      // Proceed with normal login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      if (data?.user) {
        console.log("Login successful for user:", data.user.id);
        
        // Fetch user profile to get role and check disabled status
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role, full_name, disabled')
            .eq('id', data.user.id)
            .single();
          
          if (profileError) {
            console.error("Error fetching profile after login:", profileError);
            throw profileError;
          }
          
          // Final check to ensure the account is not disabled
          if (profileData.disabled === true) {
            console.warn("Disabled user logged in, forcing logout:", data.user.id);
            await supabase.auth.signOut();
            throw new Error('Your account has been disabled. Please contact an administrator.');
          }
          
          // Account is active, proceed normally
          setUser(data.user);
          console.log("Setting user role:", profileData.role);
          setUserRole(profileData.role);
          toast.success(`Welcome back, ${profileData.full_name}!`);
          return { success: true, role: profileData.role };
        } catch (profileError) {
          console.error("Profile fetch failed after login:", profileError);
          
          // If we can't verify disabled status, err on the side of caution
          if (profileError.message && profileError.message.includes('disabled')) {
            await supabase.auth.signOut();
            throw profileError;
          }
          
          // Otherwise continue with default role
          setUser(data.user);
          toast.success(`Welcome back!`);
          return { success: true, role: 'patient' };
        }
      }
    } catch (error) {
      console.error("Login process failed:", error);
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      console.log("Logging out user");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        throw error;
      }
      
      console.log("Logout successful");
      setUser(null);
      setUserRole(null);
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error) {
      console.error("Logout process failed:", error);
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      console.log("Password reset requested for:", email);
      
      // Check if the account is disabled before sending reset email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('disabled')
        .eq('email', email)
        .single();
      
      if (!profileError && profileData && profileData.disabled === true) {
        console.warn("Password reset requested for disabled account:", email);
        throw new Error('This account has been disabled. Please contact an administrator.');
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error("Password reset error:", error);
        throw error;
      }
      
      console.log("Password reset email sent");
      toast.success('Password reset instructions sent to your email');
      return { success: true };
    } catch (error) {
      console.error("Password reset process failed:", error);
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (newPassword) => {
    try {
      setLoading(true);
      console.log("Attempting to reset password");
      
      // Check if the account is disabled
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('disabled')
          .eq('id', user.id)
          .single();
        
        if (!profileError && profileData && profileData.disabled === true) {
          console.warn("Password reset attempted for disabled account:", user.id);
          throw new Error('This account has been disabled. Please contact an administrator.');
        }
      }
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        console.error("Password update error:", error);
        throw error;
      }
      
      console.log("Password updated successfully");
      toast.success('Password updated successfully');
      return { success: true };
    } catch (error) {
      console.error("Password reset process failed:", error);
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      console.log("Updating profile for user:", user?.id);
      
      // Prevent updating the disabled status through this method
      const { disabled, ...safeProfileData } = profileData;
      
      // Update profile in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update(safeProfileData)
        .eq('id', user.id);
      
      if (error) {
        console.error("Profile update error:", error);
        throw error;
      }
      
      console.log("Profile updated successfully");
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error("Profile update process failed:", error);
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userRole,
    loading,
    authError,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}