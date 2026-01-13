
import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color, className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };
  
  const finalColor = color || 'border-blue-500';

  return (
    <div
      className={`animate-spin rounded-full border-solid border-t-transparent ${sizeClasses[size]} ${finalColor} ${className}`}
      role="status"
      aria-label="loading"
    ></div>
  );
};

export default Spinner;
