'use client';
import React, { useState, useEffect } from 'react';
import Admin from '../../components/layout/Admin';
import YouTubeUpload from '../../modules/youtube/components/YouTubeUpload';
import VideoList from '../../modules/youtube/components/VideoList';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const YouTubePage = () => {
  const [userLevel, setUserLevel] = useState(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserLevel = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_level')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            setUserLevel(profile.user_level);
          }
        }
      } catch (error) {
        console.error('Error fetching user level:', error);
      }
    };

    fetchUserLevel();
  }, []);

  return (
    <Admin>
      <div className="p-6 space-y-6">
        <ToastContainer
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Investment Updates</h1>
          
          <div className="grid gap-6">
            {userLevel === 5 && <YouTubeUpload />}
            <VideoList />
          </div>
        </div>
      </div>
    </Admin>
  );
};

export default YouTubePage; 