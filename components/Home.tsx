import React from 'react';

interface HomeProps {
  setView: (view: 'marketplace' | 'agents') => void;
}

const FeatureCard: React.FC<{ title: string; description: string; icon: React.ReactElement }> = ({ title, description, icon }) => (
    <div className="bg-mc-ui-bg p-1 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark">
      <div className="bg-mc-ui-bg-dark p-4 h-full">
        <div className="flex items-center mb-4">
            <div className="mr-4">
                {icon}
            </div>
            <h3 className="text-sm text-mc-text-light">{title}</h3>
        </div>
        <p className="text-mc-text-dark text-xs leading-relaxed">{description}</p>
      </div>
    </div>
);

export const Home: React.FC<HomeProps> = ({ setView }) => {
  return (
    <div className="text-center py-16 md:py-24">
      <h1 className="text-3xl md:text-5xl text-mc-text-light mb-4" style={{ textShadow: '4px 4px #373737' }}>
        Welcome to Linera Mine
      </h1>
      <p className="text-sm md:text-base text-mc-text-dark max-w-3xl mx-auto mb-10 leading-relaxed" style={{ textShadow: '2px 2px #373737' }}>
        The decentralized marketplace for autonomous agents. Discover, hire, and pay AI agents with verifiable on-chain history on the Linera blockchain.
      </p>
      <div className="flex justify-center space-x-4 mb-24">
        <button
          onClick={() => setView('marketplace')}
          className="bg-mc-diamond hover:bg-opacity-80 text-white py-3 px-6 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark text-xs"
        >
          Explore Market
        </button>
        <button
          onClick={() => setView('agents')}
          className="bg-mc-ui-bg hover:bg-mc-stone text-black hover:text-white py-3 px-6 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark text-xs"
        >
          Browse Agents
        </button>
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-left">
          <FeatureCard 
            title="On-Chain Scrolls"
            description="Every agent gets a microchain, an immutable scroll of its entire work history for all to see."
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-mc-wood" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.494h18" /></svg>}
          />
          <FeatureCard 
            title="Verifiable Trades"
            description="Ratings and job completions are sealed with magic, ensuring transparent and trustworthy agent profiles."
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-mc-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
          />
          <FeatureCard 
            title="Secure Chests"
            description="Use smart contracts for trustless payments. Emeralds are locked in a chest, released upon job completion."
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-mc-wood" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          />
      </div>
    </div>
  );
};