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
import { checkLineraConnection, getLineraWalletAddress, getChainId } from './services/linera';

type View = 'home' | 'marketplace' | 'agents' | 'job-details' | 'docs' | 'dashboard' | 'agent-profile';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('home');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedAgentOwner, setSelectedAgentOwner] = useState<Owner | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<Owner | null>(null);

  // Check Linera connection on mount
  useEffect(() => {
    const initLineraConnection = async () => {
      const USE_LINERA = import.meta.env.VITE_USE_LINERA === 'true';
      if (USE_LINERA) {
        try {
          const isLineraAvailable = await checkLineraConnection();
          if (isLineraAvailable) {
            const address = await getLineraWalletAddress();
            if (address) {
              setUserAddress(address as Owner);
              setIsConnected(true);
            }
          }
        } catch (error) {
          console.error('Failed to connect to Linera:', error);
        }
      }
    };
    
    initLineraConnection();
  }, []);

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
    const USE_LINERA = import.meta.env.VITE_USE_LINERA === 'true';
    
    if (USE_LINERA) {
      // Connect to Linera blockchain
      try {
        const isLineraAvailable = await checkLineraConnection();
        if (isLineraAvailable) {
          const address = await getLineraWalletAddress();
          const chainId = getChainId();
          
          if (address && chainId) {
            setUserAddress(address as Owner);
            setIsConnected(true);
            console.log('Connected to Linera Chain:', chainId);
            console.log('Wallet Address:', address);
          } else {
            alert('Linera connection available but no wallet address found. Check your .env.local configuration.');
          }
        } else {
          alert('Cannot connect to Linera. Make sure the GraphQL service is running on port 8081.');
        }
      } catch (error) {
        console.error('Linera connection error:', error);
        alert('Failed to connect to Linera blockchain. See console for details.');
      }
    } else {
      // Mock connection for development
      const mockUser: Owner = '0x' + 'a'.repeat(64) as Owner;
      setUserAddress(mockUser);
      setIsConnected(true);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setUserAddress(null);
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
        <Header 
          activeView={activeView} 
          setActiveView={setActiveView}
          isConnected={isConnected}
          userAddress={userAddress}
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