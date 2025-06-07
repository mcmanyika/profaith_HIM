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
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

function UploadProfile() {
  console.log('UploadProfile component rendered');
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [formData, setFormData] = useState({
    full_name: '',
    gender: '',
    dateOfBirth: '',
    country: '',
    occupation: '',
    availability: false,
    email: '',
    phone_number: ''
  });
  const [missingFields, setMissingFields] = useState({
    full_name: true,
    gender: true,
    dateOfBirth: true,
    country: true,
    occupation: true,
    availability: true,
    email: true,
    phone_number: true
  });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [countries, setCountries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Utility function to check for missing values
  const isMissing = (value) => !value || value === 'EMPTY' || value === 'null' || value === null;

  useEffect(() => {
    const fetchCountries = async () => {
      console.log('Fetching countries...');
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
      console.log('Countries loaded:', data);
    };

    fetchCountries();
  }, [supabase]);

  useEffect(() => {
    console.log('Checking session...');
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session result:', session);
        if (!session) {
          console.log('No session found, redirecting to login...');
          router.push('/auth/signin');
          return;
        }
        console.log('Session found:', session.user.id);
        console.log('Session email:', session.user.email);
        console.log('Session phone:', session.user.phone);
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

        // Set initial form data with session user info
        setFormData(prev => ({
          ...prev,
          full_name: existingProfile?.full_name || session.user.user_metadata?.full_name || '',
          email: session.user.email || '',
          phone_number: existingProfile?.phone_number || session.user.phone || ''
        }));

        // Track missing fields from session
        setMissingFields(prev => ({
          ...prev,
          full_name: !existingProfile?.full_name && !session.user.user_metadata?.full_name,
          email: !session.user.email,
          phone_number: !existingProfile?.phone_number && !session.user.phone
        }));

        if (existingProfile) {
          setHasExistingProfile(true);
          // Set form data from existing profile
          setFormData(prev => ({
            ...prev,
            full_name: existingProfile.full_name || session.user.user_metadata?.full_name || '',
            gender: existingProfile.gender || '',
            dateOfBirth: existingProfile.date_of_birth || '',
            country: existingProfile.country || '',
            occupation: existingProfile.occupation || '',
            availability: existingProfile.availability === 'full-time',
            email: existingProfile.email || session.user.email || '',
            phone_number: existingProfile.phone_number || session.user.phone || ''
          }));
          
          // Track which fields are missing
          setMissingFields(prev => ({
            ...prev,
            full_name: !existingProfile.full_name && !session.user.user_metadata?.full_name,
            gender: !existingProfile.gender,
            dateOfBirth: !existingProfile.date_of_birth,
            country: !existingProfile.country,
            occupation: !existingProfile.occupation,
            availability: !existingProfile.availability,
            email: isMissing(existingProfile.email) && isMissing(session.user.email),
            phone_number: isMissing(existingProfile.phone_number) && isMissing(session.user.phone)
          }));

          // Check if all required fields are filled
          if (
            existingProfile.gender &&
            existingProfile.date_of_birth &&
            existingProfile.country &&
            existingProfile.occupation &&
            existingProfile.availability &&
            (!isMissing(existingProfile.email) || !isMissing(session.user.email)) &&
            (!isMissing(existingProfile.phone_number) || !isMissing(session.user.phone))
          ) {
            console.log('Profile complete, redirecting to account...');
            setIsRedirecting(true);
            router.push('/account');
            return;
          }
        } else {
          // If no profile exists, check if we need to redirect based on email/phone
          if (isMissing(session.user.email) || isMissing(session.user.phone)) {
            console.log('Email or phone missing, showing upload form...');
            setCheckingSession(false);
            return;
          }
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
    console.log('Input change:', name, value);
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted', formData);
    if (isSubmitting) {
      console.log('Already submitting, abort.');
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
        console.log('Updating existing profile...');
        result = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            gender: formData.gender,
            date_of_birth: formData.dateOfBirth,
            phone_number: formData.phone_number,
            country: formData.country,
            occupation: formData.occupation,
            user_level: 1,
            availability: formData.availability ? 'full-time' : 'part-time',
            updated_at: new Date()
          })
          .eq('id', session.user.id)
          .select();
      } else {
        console.log('Inserting new profile...');
        result = await supabase
          .from('profiles')
          .insert([
            {
              id: session.user.id,
              full_name: formData.full_name,
              email: formData.email,
              gender: formData.gender,
              date_of_birth: formData.dateOfBirth,
              phone_number: formData.phone_number,
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
        full_name: '',
        gender: '',
        dateOfBirth: '',
        country: '',
        occupation: '',
        availability: false,
        email: '',
        phone_number: ''
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

  console.log('Render state:', { checkingSession, isRedirecting, formData, missingFields, loading, isSubmitting });
  if (checkingSession || isRedirecting) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
          <div className="animate-pulse">&nbsp;</div>
        </div>
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
        <h1 className="text-2xl font-bold mb-6 uppercase text-center">Personal Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-4 w-full px-4 sm:px-0">
          <div>
            <label htmlFor="full_name" className="block mb-2">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded-md ${!missingFields.full_name ? 'bg-gray-100' : ''}`}
              required
              disabled={!missingFields.full_name}
            />
          </div>
          <div>
            <label htmlFor="email" className="block mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded-md ${!missingFields.email ? 'bg-gray-100' : ''}`}
              disabled={!missingFields.email}
              required={missingFields.email}
            />
          </div>
          <div>
            <label htmlFor="phone_number" className="block mb-2">Phone Number</label>
            <PhoneInput
              international
              defaultCountry="US"
              value={formData.phone_number}
              onChange={value => setFormData(prev => ({ ...prev, phone_number: value }))}
              className={`p-2 border rounded-md w-full ${!missingFields.phone_number ? 'bg-gray-100' : ''}`}
              disabled={!missingFields.phone_number}
              required
            />
          </div>
          <div>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded-md ${!missingFields.gender ? 'bg-gray-100' : ''}`}
              required
              disabled={!missingFields.gender}
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
              className={`w-full p-2 border rounded-md ${!missingFields.dateOfBirth ? 'bg-gray-100' : ''}`}
              required
              max={new Date().toISOString().split('T')[0]}
              disabled={!missingFields.dateOfBirth}
            />
          </div>

          <div>
            <input
              type="text"
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
              placeholder="Occupation"
              className={`w-full p-2 border rounded-md ${!missingFields.occupation ? 'bg-gray-100' : ''}`}
              required
              disabled={!missingFields.occupation}
            />
          </div>

          <div>
            <select
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className={`w-full p-2 border rounded-md ${!missingFields.country ? 'bg-gray-100' : ''}`}
              required
              disabled={!missingFields.country}
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
                className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${!missingFields.availability ? 'bg-gray-100' : ''}`}
                disabled={!missingFields.availability}
              />
              <label htmlFor="availability" className="ml-2 text-sm text-gray-700">
                Yes, I would like to participate
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isSubmitting || (!missingFields.gender && !missingFields.dateOfBirth && !missingFields.country && !missingFields.occupation && !missingFields.availability)}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </>
    </SmallLayout>
  );
}

export default withSessionTimeout(UploadProfile);