import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { sessionManager } from './sessionManager';

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_CHECK_INTERVAL = 180 * 1000; // 3 minutes
const WARNING_THRESHOLD = 1 * 60 * 1000; // 1 minute

export default function withSessionTimeout(WrappedComponent) {
  return function WithSessionTimeoutComponent(props) {
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
      let lastActivity = Date.now();
      let warningShown = false;

      const updateLastActivity = () => {
        lastActivity = Date.now();
        warningShown = false;
      };

      const checkSessionTimeout = async () => {
        const currentTime = Date.now();
        const timeUntilTimeout = SESSION_TIMEOUT - (currentTime - lastActivity);
        
        // Show warning when 1 minute remaining
        if (timeUntilTimeout <= WARNING_THRESHOLD && timeUntilTimeout > 0 && !warningShown) {
          warningShown = true;
          // You can use your preferred notification system here
          alert('Your session will expire in 1 minute. Please save your work.');
        }
        
        if (currentTime - lastActivity > SESSION_TIMEOUT) {
          await supabase.auth.signOut();
          router.push('/auth/signin?error=Session expired due to inactivity. Please sign in again.');
        }
      };

      // Set up activity listeners
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
      
      activityEvents.forEach(event => {
        window.addEventListener(event, updateLastActivity);
      });

      // Set up periodic session check
      const sessionCheckInterval = setInterval(checkSessionTimeout, ACTIVITY_CHECK_INTERVAL);

      // Initialize session management
      sessionManager.initialize();

      return () => {
        activityEvents.forEach(event => {
          window.removeEventListener(event, updateLastActivity);
        });
        clearInterval(sessionCheckInterval);
        sessionManager.cleanup();
      };
    }, [router, supabase]);

    return <WrappedComponent {...props} />;
  };
} 