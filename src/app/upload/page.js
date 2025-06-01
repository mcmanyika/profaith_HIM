'use client';
import React, { useState, useEffect } from 'react';
import SmallLayout from '../../components/layout/SmallLayout';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ToastContainer, toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import 'react-toastify/dist/ReactToastify.css';
import withAuth from '../../utils/withAuth';
import { useRouter } from 'next/navigation';
import withSessionTimeout from '../../utils/withSessionTimeout';

function UploadProfile() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [formData, setFormData] = useState({
    gender: '',
    dateOfBirth: '',
    country: '',
    occupation: '',
    availability: false
  });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [countries, setCountries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching countries:', error);
        toast.error('Failed to load countries');
        return;
      }
      
      setCountries(data || []);
    };

    fetchCountries();
  }, [supabase]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No session found, redirecting to login...');
          router.push('/auth/signin');
          return;
        }
        console.log('Session found:', session.user.id);
        setUserEmail(session.user.email);
        setUserId(session.user.id);

        // Check if profile exists with all required data
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error checking existing profile:', fetchError);
          return;
        }

        // Check if all required fields are filled
        if (existingProfile && 
            existingProfile.gender && 
            existingProfile.date_of_birth && 
            existingProfile.country && 
            existingProfile.occupation) {
          console.log('Profile complete, redirecting to account...');
          setIsRedirecting(true);
          router.push('/account');
          return;
        }
      } catch (error) {
        console.error('Error during session check:', error);
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router, supabase]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      
      if (!session) {
        console.error('No session found');
        throw new Error('No session found - please log in again');
      }

      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select()
        .eq('id', session.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing profile:', fetchError);
        throw fetchError;
      }

      if (existingProfile) {
        setHasExistingProfile(true);
      }

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update({
            full_name: session.user.display_name,
            email: session.user.email,
            gender: formData.gender,
            date_of_birth: formData.dateOfBirth,
            phone_number: session.user.phone,
            country: formData.country,
            occupation: formData.occupation,
            user_level: 1,
            availability: formData.availability ? 'full-time' : 'part-time',
            updated_at: new Date()
          })
          .eq('id', session.user.id)
          .select();
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert([
            {
              id: session.user.id,
              full_name: session.user.display_name,
              email: session.user.email,
              gender: formData.gender,
              date_of_birth: formData.dateOfBirth,
              phone_number: session.user.phone,
              country: formData.country,
              occupation: formData.occupation,
              user_level: 1,
              availability: formData.availability ? 'full-time' : 'part-time',
              created_at: new Date()
            }
          ])
          .select();
      }

      if (result.error) {
        console.error('Supabase operation error:', JSON.stringify(result.error, null, 2));
        throw result.error;
      }

      console.log('Operation successful, data:', result.data);
      toast.success(existingProfile ? 'Profile updated successfully!' : 'Profile created successfully!');
      setFormData({
        gender: '',
        dateOfBirth: '',
        country: '',
        occupation: '',
        availability: false
      });
      
      router.push('/account');
      
    } catch (error) {
      console.error('Error handling profile:', error);
      let errorMessage = 'An unexpected error occurred';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast.error('Failed to handle profile: ' + errorMessage);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  if (checkingSession || isRedirecting) {
    return (
      <SmallLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">&nbsp;</div>
        </div>
      </SmallLayout>
    );
  }

  return (
    <SmallLayout>
      <>
        <ToastContainer
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <h1 className="text-2xl font-bold mb-6 uppercase">Personal Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-4 w-full  px-4 sm:px-0">
         
          <div>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block mb-2">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          

          <div>
            <input
              type="text"
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
              placeholder="Occupation"
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          <div>
            <select
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-sm text-gray-500">Would you like to be considered for active participation in projects?</span>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                name="availability"
                checked={formData.availability}
                onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="availability" className="ml-2 text-sm text-gray-700">
                Yes, I would like to participate
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isSubmitting || hasExistingProfile}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : hasExistingProfile ? 'Profile Already Exists' : 'Save Profile'}
          </button>
        </form>
      </>
    </SmallLayout>
  );
}

export default withSessionTimeout(UploadProfile);