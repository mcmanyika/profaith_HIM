"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ProfileView({ profiles: propProfiles }) {
  const [profiles, setProfiles] = useState(propProfiles || []);
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [countries, setCountries] = useState([]);
  const [isPhoneVerificationStep, setIsPhoneVerificationStep] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [tempPhoneNumber, setTempPhoneNumber] = useState('');

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data: countryData, error: countryError } = await supabase
          .from('countries')
          .select('*')
          .order('name');
          
        if (countryError) throw countryError;
        setCountries(countryData);
      } catch (err) {
        console.error('Error fetching countries:', err);
        setError(err.message || 'An unexpected error occurred');
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    if (propProfiles) {
      setProfiles(propProfiles);
    }
  }, [propProfiles]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleEdit = (profile) => {
    console.log('Editing profile:', profile);
    if (!profile || !profile.id) {
      console.error('Invalid profile data:', profile);
      toast.error('Invalid profile data. Please try again.');
      return;
    }
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!editingProfile || !editingProfile.id) {
        throw new Error('Invalid profile data');
      }

      // If phone number has changed, initiate verification
      if (editingProfile.phone_number !== profiles.find(p => p.id === editingProfile.id)?.phone_number) {
        setTempPhoneNumber(editingProfile.phone_number);
        setIsPhoneVerificationStep(true);
        setLoading(false);
        return;
      }

      console.log('Saving profile:', editingProfile);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          gender: editingProfile.gender,
          date_of_birth: editingProfile.date_of_birth,
          country: editingProfile.country,
          occupation: editingProfile.occupation,
          phone_number: editingProfile.phone_number,
        })
        .eq('id', editingProfile.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to update profile');
      }

      console.log('Update response:', data);

      if (!data || data.length === 0) {
        console.error('No profile found with ID:', editingProfile.id);
        throw new Error('No profile was found to update. Please try again.');
      }

      // Update the profiles state with the new data
      const updatedProfiles = profiles.map(p => 
        p.id === editingProfile.id ? { ...p, ...data[0] } : p
      );
      setProfiles(updatedProfiles);
      setIsModalOpen(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err.message || 'An unexpected error occurred while updating the profile';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerification = async () => {
    setLoading(true);
    try {
      // Send verification code
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: tempPhoneNumber,
        options: {
          data: {
            type: 'phone_verification'
          }
        }
      });

      if (otpError) throw otpError;

      toast.success('Verification code sent to your phone');
    } catch (err) {
      console.error('Error sending verification code:', err);
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: tempPhoneNumber,
        token: phoneVerificationCode,
        type: 'sms'
      });

      if (verifyError) throw verifyError;

      // If verification successful, update the profile
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...editingProfile,
          phone_number: tempPhoneNumber
        })
        .eq('id', editingProfile.id)
        .select();

      if (error) throw error;

      const updatedProfiles = profiles.map(p => 
        p.id === editingProfile.id ? { ...p, ...data[0] } : p
      );
      setProfiles(updatedProfiles);
      setIsPhoneVerificationStep(false);
      setIsModalOpen(false);
      toast.success('Phone number verified and profile updated successfully!');
    } catch (err) {
      console.error('Error verifying code:', err);
      toast.error(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    await handlePhoneVerification();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">View and manage your profile information</p>
        </div>
        
        <div className="space-y-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
              onClick={() => handleEdit(profile)}
            >
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Gender</p>
                          <p className="mt-1 text-base text-gray-900 capitalize">
                            {profile.gender || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                          <p className="mt-1 text-base text-gray-900">
                            {profile.date_of_birth || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Country</p>
                          <p className="mt-1 text-base text-gray-900">
                            {profile.country || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Details</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Occupation</p>
                          <p className="mt-1 text-base text-gray-900">
                            {profile.occupation || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Phone</p>
                          <p className="mt-1 text-base text-gray-900">
                            {profile.phone_number || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    className="inline-flex mt-2 items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && editingProfile && !isPhoneVerificationStep && (
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity ${isModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className={`fixed inset-y-0 right-0 h-screen bg-white transform transition-transform duration-300 ease-in-out ${
              isModalOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ width: windowWidth > 600 ? '50%' : '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-full flex flex-col p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Profile</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <input
                      type="text"
                      name="gender"
                      value={editingProfile?.gender || ''}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 text-sm rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={editingProfile?.date_of_birth || ''}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 text-sm rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select
                      name="country"
                      value={editingProfile?.country || ''}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 text-sm rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50 bg-white text-gray-900"
                    >
                      <option value="">Select a country</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                    <input
                      type="text"
                      name="occupation"
                      value={editingProfile?.occupation || ''}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 text-sm rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone_number"
                      value={editingProfile?.phone_number || ''}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 text-sm rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50 bg-white text-gray-900"
                    />
                  </div>
                </form>
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-700"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPhoneVerificationStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity">
          <div 
            className="fixed inset-y-0 right-0 h-screen bg-white transform transition-transform duration-300 ease-in-out"
            style={{ width: windowWidth > 600 ? '50%' : '100%' }}
          >
            <div className="h-full flex flex-col p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Verify Phone Number</h2>
                <button
                  onClick={() => {
                    setIsPhoneVerificationStep(false);
                    setPhoneVerificationCode('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Please enter the verification code sent to {tempPhoneNumber}
                  </p>
                  <input
                    type="text"
                    value={phoneVerificationCode}
                    onChange={(e) => setPhoneVerificationCode(e.target.value)}
                    placeholder="Enter verification code"
                    className="block w-full px-3 py-2 text-sm rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleResendVerification}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      disabled={loading}
                    >
                      Resend Code
                    </button>
                    <button
                      onClick={handleVerifyCode}
                      className="px-3 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-700"
                      disabled={loading || !phoneVerificationCode}
                    >
                      {loading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 