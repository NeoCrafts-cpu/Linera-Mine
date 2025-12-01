import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div className="relative">
      {/* Pixel art pickaxe spinner */}
      <div className="animate-spin-slow">
        <svg width="48" height="48" viewBox="0 0 16 16" className="pixel-art">
          {/* Pickaxe head */}
          <rect x="3" y="0" width="4" height="2" fill="#8B4513"/>
          <rect x="7" y="0" width="2" height="3" fill="#A0522D"/>
          <rect x="2" y="2" width="5" height="3" fill="#8B4513"/>
          <rect x="7" y="3" width="3" height="3" fill="#A0522D"/>
          <rect x="10" y="2" width="2" height="2" fill="#5DADE2"/>
          <rect x="1" y="5" width="3" height="2" fill="#8B4513"/>
          <rect x="4" y="5" width="4" height="4" fill="#A0522D"/>
          <rect x="8" y="6" width="3" height="3" fill="#5DADE2"/>
          {/* Handle */}
          <rect x="0" y="7" width="2" height="3" fill="#696969"/>
          <rect x="2" y="9" width="5" height="3" fill="#696969"/>
          <rect x="7" y="9" width="4" height="2" fill="#5DADE2"/>
          <rect x="3" y="12" width="6" height="2" fill="#505050"/>
          <rect x="4" y="14" width="4" height="2" fill="#404040"/>
        </svg>
      </div>
      
      {/* Particle effects */}
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-mc-diamond animate-pulse opacity-75"></div>
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-mc-emerald animate-pulse delay-150 opacity-75"></div>
    </div>
  );
};

// CSS class for slower spin animation (add to tailwind or style tag)
// .animate-spin-slow { animation: spin 2s linear infinite; }