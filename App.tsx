import React, { useState, useCallback, useEffect } from 'react';
import Marketplace from './components/Marketplace';
import AgentDirectory from './components/AgentDirectory';
import JobDetails from './components/JobDetails';
import { Header } from './components/Header';
import { Home } from './components/Home';
import Docs from './components/Docs';
import MyDashboard from './components/MyDashboard';
import AgentProfilePage from './components/AgentProfilePage';
import { ToastProvider } from './components/ToastNotifications';
import { Owner } from './types';
import { Footer } from './components/Footer';
import { useLineraConnection } from './hooks';

type View = 'home' | 'marketplace' | 'agents' | 'job-details' | 'docs' | 'dashboard' | 'agent-profile';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('home');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedAgentOwner, setSelectedAgentOwner] = useState<Owner | null>(null);
  
  // Use the Linera connection hook
  const { 
    isConnecting, 
    isConnected, 
    isAppConnected,
    error: connectionError,
    walletAddress,
    chainId,
    connect,
    disconnect 
  } = useLineraConnection();

  // Log connection status changes
  useEffect(() => {
    if (isAppConnected) {
      console.log('✅ Connected to Job Marketplace on Linera!');
      console.log(`   Chain ID: ${chainId}`);
      console.log(`   Address: ${walletAddress}`);
    }
  }, [isAppConnected, chainId, walletAddress]);

  // Log any connection errors
  useEffect(() => {
    if (connectionError) {
      console.error('❌ Connection error:', connectionError);
    }
  }, [connectionError]);

  // This effect safely handles inconsistent states. If the view is 'job-details'
  // but no job is selected, it redirects to the marketplace.
  useEffect(() => {
    if (activeView === 'job-details' && !selectedJobId) {
      setActiveView('marketplace');
    }
    if (activeView === 'agent-profile' && !selectedAgentOwner) {
      setActiveView('agents');
    }
  }, [activeView, selectedJobId, selectedAgentOwner]);

  const handleSelectJob = useCallback((jobId: number) => {
    setSelectedJobId(jobId);
    setActiveView('job-details');
  }, []);
  
  const handleBack = useCallback(() => {
    setSelectedJobId(null);
    setActiveView('marketplace');
  }, []);

  const handleSelectAgent = useCallback((agentOwner: Owner) => {
    setSelectedAgentOwner(agentOwner);
    setActiveView('agent-profile');
  }, []);

  const handleBackFromAgent = useCallback(() => {
    setSelectedAgentOwner(null);
    setActiveView('agents');
  }, []);

  const handleConnect = async () => {
    // Generate a unique user address (in production, this would come from a wallet)
    // For now, we use a random address or one from localStorage
    let userAddr = localStorage.getItem('linera_user_address');
    
    if (!userAddr) {
      // Generate a pseudo-random address
      userAddr = '0x' + Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      localStorage.setItem('linera_user_address', userAddr);
    }
    
    try {
      await connect(userAddr);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect to Linera. Check console for details.');
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return <Home setView={setActiveView} />;
      case 'marketplace':
        return <Marketplace onSelectJob={handleSelectJob} />;
      case 'agents':
        return <AgentDirectory onSelectAgent={handleSelectAgent} />;
      case 'docs':
        return <Docs />;
      case 'dashboard':
        return <MyDashboard onSelectJob={handleSelectJob} />;
      case 'agent-profile':
        return selectedAgentOwner ? (
          <AgentProfilePage 
            agentOwner={selectedAgentOwner} 
            onBack={handleBackFromAgent} 
            onSelectJob={handleSelectJob} 
          />
        ) : null;
      case 'job-details':
        // Only render JobDetails if an ID is present.
        // Otherwise, render null while the useEffect handles the view change.
        return selectedJobId ? <JobDetails jobId={selectedJobId} onBack={handleBack} /> : null;
      default:
        return <Home setView={setActiveView} />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen font-sans flex flex-col">
        {/* Connection status banner */}
        {isConnecting && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-blue-900/80 border-b border-blue-500 p-2 text-center">
            <span className="text-blue-200 text-sm animate-pulse">
              🔄 Connecting to Linera blockchain...
            </span>
          </div>
        )}
        
        {connectionError && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-red-900/80 border-b border-red-500 p-2 text-center">
            <span className="text-red-200 text-sm">
              ⚠️ {connectionError}
            </span>
          </div>
        )}

        <Header 
          activeView={activeView} 
          setActiveView={setActiveView}
          isConnected={isAppConnected}
          userAddress={walletAddress as Owner | null}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
        <main className="container mx-auto p-4 md:p-8 flex-grow">
          {renderContent()}
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
};

export default App;