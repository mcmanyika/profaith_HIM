const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export const getLoginAttempts = () => {
  if (typeof window === 'undefined') return { attempts: 0, lastAttempt: null };
  
  const attempts = parseInt(localStorage.getItem('loginAttempts') || '0');
  const lastAttempt = localStorage.getItem('lastLoginAttempt');
  
  return {
    attempts,
    lastAttempt: lastAttempt ? new Date(lastAttempt) : null
  };
};

export const incrementLoginAttempts = () => {
  if (typeof window === 'undefined') return;
  
  const { attempts } = getLoginAttempts();
  const newAttempts = attempts + 1;
  
  localStorage.setItem('loginAttempts', newAttempts.toString());
  localStorage.setItem('lastLoginAttempt', new Date().toISOString());
  
  return newAttempts;
};

export const resetLoginAttempts = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('loginAttempts');
  localStorage.removeItem('lastLoginAttempt');
};

export const isAccountLocked = () => {
  const { attempts, lastAttempt } = getLoginAttempts();
  
  if (attempts >= MAX_ATTEMPTS && lastAttempt) {
    const lockoutEndTime = new Date(lastAttempt.getTime() + LOCKOUT_DURATION);
    const now = new Date();
    
    if (now < lockoutEndTime) {
      return {
        locked: true,
        remainingTime: Math.ceil((lockoutEndTime - now) / 1000 / 60) // remaining minutes
      };
    } else {
      // Lockout period has expired
      resetLoginAttempts();
      return { locked: false, remainingTime: 0 };
    }
  }
  
  return { locked: false, remainingTime: 0 };
}; 