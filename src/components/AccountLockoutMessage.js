import React, { useEffect, useState } from 'react';
import { isAccountLocked } from '../utils/loginAttempts';

const AccountLockoutMessage = ({ email }) => {
  const [lockoutStatus, setLockoutStatus] = useState({ locked: false, remainingTime: 0 });

  useEffect(() => {
    const checkLockout = () => {
      const status = isAccountLocked();
      setLockoutStatus(status);
    };

    // Check immediately
    checkLockout();

    // Check every minute
    const interval = setInterval(checkLockout, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!lockoutStatus.locked) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
      <p className="font-medium">Account Temporarily Locked</p>
      <p className="mt-1">
        Too many failed login attempts. Please try again in {lockoutStatus.remainingTime} minutes.
      </p>
      <p className="mt-2 text-sm">
        If you've forgotten your password, you can reset it using the email address: {email}
      </p>
    </div>
  );
};

export default AccountLockoutMessage; 