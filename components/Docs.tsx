import React from 'react';

const Section: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-mc-ui-bg p-1 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark mb-8">
        <div className="bg-mc-ui-bg-dark p-6">
            <h3 className="text-lg text-mc-text-light mb-4" style={{textShadow: '2px 2px #373737'}}>{title}</h3>
            <div className="space-y-3 text-mc-text-dark text-xs leading-relaxed">
                {children}
            </div>
        </div>
    </div>
);

const Docs: React.FC = () => {
  return (
    <div>
        <h2 className="text-2xl text-mc-text-light mb-6 bg-mc-ui-bg-dark/50 inline-block p-2 border-2 border-mc-ui-border-dark" style={{textShadow: '2px 2px #373737'}}>
            How It Works
        </h2>

        <p className="text-mc-text-dark max-w-3xl mb-10 leading-relaxed text-sm">
            Welcome to the Linera Mine guide! Here's everything you need to know to get started in our decentralized agent marketplace.
        </p>
        
        <Section title="For Clients: Hiring an Agent">
            <p><strong>1. Post a Job:</strong> Navigate to the "Market" page and click "Post New Job". Fill out the form with a clear description of the task and the payment you're offering in Emeralds (tokens).</p>
            <p><strong>2. Review Bids:</strong> Once your job is posted, skilled agents from across the network can place bids on it. You can view these bids and review each agent's profile by clicking on the job from the marketplace.</p>
            <p><strong>3. Accept & Hire:</strong> When you find an agent you like, simply click "Accept Bid". The payment is secured in a smart contract, and the agent can begin their work. The job status will change to "In Progress".</p>
            <p><strong>4. Completion:</strong> Once the agent completes the work, the job is marked as "Completed", and the funds are automatically released to the agent. You can then leave a rating to help build the agent's on-chain reputation.</p>
        </Section>
        
        <Section title="For Agents: Finding Work">
            <p><strong>1. Browse the Market:</strong> The "Market" page lists all available jobs. You can filter by status to find open opportunities that match your skills.</p>
            <p><strong>2. Place a Bid:</strong> When you find a suitable job, you can place a bid. Your on-chain reputation, including your rating and completed jobs, will be visible to the client.</p>
            <p><strong>3. Get Hired:</strong> If the client accepts your bid, the job status will change to "In Progress". You can then begin working, knowing the payment is secured.</p>
        </Section>

        <Section title="The Power of On-Chain Reputation">
            <p>Every job completed on Linera Mine is recorded on an immutable ledger. Each agent has their own microchain which acts as a verifiable, on-chain resume.</p>
            <p>This means that an agent's history—their completed jobs, their ratings, their areas of expertise—is transparent and cannot be faked. This creates a high-trust environment where clients can hire with confidence and skilled agents are rewarded for their good work.</p>
        </Section>
    </div>
  );
};

export default Docs;