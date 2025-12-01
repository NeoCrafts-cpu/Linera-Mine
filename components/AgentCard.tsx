import React from 'react';
import { AgentProfile } from '../types';

interface AgentCardProps {
  agent: AgentProfile;
}

// Pixel art star component
const PixelStar: React.FC<{ filled: boolean; half?: boolean }> = ({ filled, half }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" className="pixel-art">
    {filled ? (
      <>
        <rect x="5" y="0" width="2" height="2" fill="#FFD700"/>
        <rect x="3" y="2" width="2" height="2" fill="#FFD700"/>
        <rect x="5" y="2" width="2" height="2" fill="#FFF8DC"/>
        <rect x="7" y="2" width="2" height="2" fill="#FFD700"/>
        <rect x="0" y="4" width="12" height="2" fill="#FFD700"/>
        <rect x="5" y="4" width="2" height="2" fill="#FFF8DC"/>
        <rect x="2" y="6" width="8" height="2" fill="#DAA520"/>
        <rect x="3" y="8" width="6" height="2" fill="#DAA520"/>
        <rect x="2" y="10" width="2" height="2" fill="#B8860B"/>
        <rect x="8" y="10" width="2" height="2" fill="#B8860B"/>
      </>
    ) : (
      <>
        <rect x="5" y="0" width="2" height="2" fill="#4A4A4A"/>
        <rect x="3" y="2" width="6" height="2" fill="#4A4A4A"/>
        <rect x="0" y="4" width="12" height="2" fill="#4A4A4A"/>
        <rect x="2" y="6" width="8" height="2" fill="#3A3A3A"/>
        <rect x="3" y="8" width="6" height="2" fill="#3A3A3A"/>
        <rect x="2" y="10" width="2" height="2" fill="#2A2A2A"/>
        <rect x="8" y="10" width="2" height="2" fill="#2A2A2A"/>
      </>
    )}
  </svg>
);

// Robot/Agent avatar based on name hash
const AgentAvatar: React.FC<{ name: string }> = ({ name }) => {
  const hash = name.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const colors = ['#50C878', '#5DADE2', '#9B59D0', '#E74C3C', '#F39C12'];
  const color = colors[Math.abs(hash) % colors.length];
  
  return (
    <div 
      className="w-12 h-12 rounded-sm border-2 border-mc-stone flex items-center justify-center"
      style={{ backgroundColor: color }}
    >
      <svg width="28" height="28" viewBox="0 0 16 16" fill="white">
        <rect x="2" y="2" width="12" height="10" fill="currentColor" opacity="0.3"/>
        <rect x="4" y="4" width="3" height="3" fill="currentColor"/>
        <rect x="9" y="4" width="3" height="3" fill="currentColor"/>
        <rect x="5" y="9" width="6" height="2" fill="currentColor"/>
        <rect x="3" y="12" width="4" height="3" fill="currentColor" opacity="0.6"/>
        <rect x="9" y="12" width="4" height="3" fill="currentColor" opacity="0.6"/>
      </svg>
    </div>
  );
};

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const fullStars = Math.floor(agent.rating);
  const hasHalfStar = agent.rating % 1 >= 0.5;
  
  return (
    <div className="group bg-mc-ui-bg-dark border-4 border-mc-stone hover:border-mc-emerald transition-all duration-200 hover:transform hover:-translate-y-1">
      {/* Header with gradient */}
      <div className="h-2 bg-gradient-to-r from-mc-emerald via-mc-diamond to-mc-amethyst"></div>
      
      <div className="p-5">
        {/* Agent info header */}
        <div className="flex items-start gap-4 mb-4">
          <AgentAvatar name={agent.name} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm text-mc-text-light truncate" style={{textShadow: '2px 2px #1B1B2F'}}>
              {agent.name}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <PixelStar key={i} filled={i < fullStars || (i === fullStars && hasHalfStar)} />
              ))}
              <span className="text-mc-gold text-[10px] ml-1">{agent.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-mc-text-dark text-[10px] leading-relaxed mb-4 min-h-[32px]">
          {agent.serviceDescription.length > 100 
            ? agent.serviceDescription.substring(0, 100) + '...' 
            : agent.serviceDescription}
        </p>

        {/* Stats bar */}
        <div className="flex items-center justify-between pt-3 border-t border-mc-stone">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-mc-emerald text-sm font-bold">{agent.jobsCompleted}</div>
              <div className="text-mc-text-dark text-[8px] uppercase">Jobs</div>
            </div>
            {agent.verified && (
              <div className="flex items-center gap-1 bg-mc-diamond/20 px-2 py-1 rounded-sm">
                <svg className="w-3 h-3 text-mc-diamond" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-[8px] text-mc-diamond">VERIFIED</span>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-[8px] text-mc-text-dark uppercase">Owner</div>
            <div 
              className="text-mc-diamond text-[9px] hover:underline cursor-pointer" 
              title={agent.owner}
            >
              {`${agent.owner.substring(0, 6)}...${agent.owner.substring(agent.owner.length - 4)}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};