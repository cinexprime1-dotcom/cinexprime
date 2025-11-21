import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl',
    xl: 'text-6xl',
  };

  return (
    <h1 className={`${sizes[size]} tracking-tight select-none ${className}`} style={{ fontFamily: 'Inter, sans-serif' }}>
      <span className="text-white font-semibold">Cine</span>
      <span className="text-blue-500 font-bold">xprime</span>
    </h1>
  );
}