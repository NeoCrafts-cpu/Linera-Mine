import React, { useState, useEffect } from 'react';
import { getAgents } from '../services/api';
import { AgentProfile } from '../types';
import { AgentCard } from './AgentCard';
import { Spinner } from './Spinner';

const AgentDirectory: React.FC = () => {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        // In a real app, this would be a GraphQL query using useQuery from @apollo/client
        const agentData = await getAgents();
        setAgents(agentData);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl text-mc-text-light mb-6 bg-mc-ui-bg-dark/50 inline-block p-2 border-2 border-mc-ui-border-dark" style={{textShadow: '2px 2px #373737'}}>Agent Directory</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <AgentCard key={agent.owner} agent={agent} />
        ))}
      </div>
    </div>
  );
};

export default AgentDirectory;