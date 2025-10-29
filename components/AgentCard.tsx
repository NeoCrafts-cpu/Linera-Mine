import React from 'react';
import { AgentProfile } from '../types';

interface AgentCardProps {
  agent: AgentProfile;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  return (
    <div className="bg-mc-ui-bg p-1 flex flex-col h-full border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark">
        <div className="bg-mc-ui-bg-dark p-4 flex-grow">
            <h3 className="text-lg text-mc-text-light" style={{textShadow: '2px 2px #373737'}}>{agent.name}</h3>
            <p className="text-mc-text-dark text-xs mt-2 leading-relaxed">{agent.serviceDescription}</p>
        </div>
      <div className="mt-auto p-2 border-t-2 border-mc-ui-border-dark bg-mc-ui-bg flex justify-between items-center text-xs text-black">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-mc-gold mr-1" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0l2.35 4.755L16 5.528l-4 3.898L12.702 16 8 13.528 3.298 16 4 9.426 0 5.528l5.65-.773z" />
          </svg>
          <span className="font-semibold">{agent.rating.toFixed(1)}</span>
          <span className="text-mc-ui-border-dark ml-1">({agent.jobsCompleted})</span>
        </div>
        <div className="text-right">
            <p className="text-mc-ui-border-dark">Owner</p>
            <p className="text-mc-diamond" title={agent.owner}>{`${agent.owner.substring(0, 6)}...${agent.owner.substring(agent.owner.length - 4)}`}</p>
        </div>
      </div>
    </div>
  );
};