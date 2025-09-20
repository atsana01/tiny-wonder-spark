import React from 'react';
import { CheckCircle } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = "", size = 16 }) => {
  return (
    <div title="ETEK Registered - Verified Professional Engineer" className="inline-flex">
      <CheckCircle 
        className={`text-accent ${className}`} 
        size={size}
      />
    </div>
  );
};

export default VerifiedBadge;