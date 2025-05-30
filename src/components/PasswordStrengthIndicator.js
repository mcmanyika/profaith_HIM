import React from 'react';
import { getPasswordStrength } from '../utils/passwordValidation';

const PasswordStrengthIndicator = ({ password }) => {
  const { percentage, level } = getPasswordStrength(password);

  const getColor = () => {
    switch (level) {
      case 'strong':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const getTextColor = () => {
    switch (level) {
      case 'strong':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-red-500';
    }
  };

  return (
    <div className="mt-2">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${getColor()}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className={`text-sm mt-1 ${getTextColor()}`}>
        Password strength: {level.charAt(0).toUpperCase() + level.slice(1)}
      </p>
    </div>
  );
};

export default PasswordStrengthIndicator; 