'use client';

import React from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useRouter } from 'next/navigation';
import Header from './Header';
import 'react-toastify/dist/ReactToastify.css';

function Admin({ children }) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profiles, setProfiles] = useState(null);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email);
            
          if (error) throw error;
          
          if (!data || data.length === 0) {
            router.push('/upload');
            return;
          }

          if (!data[0].gender) {
            router.push('/upload');
            return;
          }
          
          setProfiles(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'An unexpected error occurred');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-500">
      {error}
    </div>;
  }

  if (!profiles) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="group fixed md:static left-0 bottom-0 md:top-0 h-16 md:h-screen w-full md:w-16 hover:md:w-64 transition-all duration-300 ease-in-out bg-white  border-t md:border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="hidden md:flex justify-around md:justify-center">
          <Sidebar />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0 w-full transition-all duration-300 ease-in-out">
        <Header />
        <div className="overflow-auto h-[calc(100vh-4rem)]">
          {children}
          <footer className="hidden md:block bg-white dark:bg-gray-800 text-center text-sm p-4 border-t border-gray-200 dark:border-gray-700">
            <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
          </footer>
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around items-center h-16">
          <a href="/account" className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </a>
          <a href="/profile" className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">Profile</span>
          </a>
          <a href="/youtube" className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">Videos</span>
          </a>
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs mt-1">Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Admin