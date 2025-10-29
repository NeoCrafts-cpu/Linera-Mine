import React, { useState, useCallback, useEffect } from 'react';
import Marketplace from './components/Marketplace';
import AgentDirectory from './components/AgentDirectory';
import JobDetails from './components/JobDetails';
import { Header } from './components/Header';
import { Home } from './components/Home';
import Docs from './components/Docs';
import { Owner } from './types';
import { Footer } from './components/Footer';

type View = 'home' | 'marketplace' | 'agents' | 'job-details' | 'docs';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('home');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<Owner | null>(null);

  // This effect safely handles inconsistent states. If the view is 'job-details'
  // but no job is selected, it redirects to the marketplace.
  useEffect(() => {
    if (activeView === 'job-details' && !selectedJobId) {
      setActiveView('marketplace');
    }
  }, [activeView, selectedJobId]);

  const handleSelectJob = useCallback((jobId: number) => {
    setSelectedJobId(jobId);
    setActiveView('job-details');
  }, []);
  
  const handleBack = useCallback(() => {
    setSelectedJobId(null);
    setActiveView('marketplace');
  }, []);

  const handleConnect = () => {
    // This is a mock connection. In a real app, you'd use a wallet library.
    const mockUser: Owner = '0x' + 'a'.repeat(64) as Owner;
    setUserAddress(mockUser);
    setIsConnected(true);
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
        return <AgentDirectory />;
      case 'docs':
        return <Docs />;
      case 'job-details':
        // Only render JobDetails if an ID is present.
        // Otherwise, render null while the useEffect handles the view change.
        return selectedJobId ? <JobDetails jobId={selectedJobId} onBack={handleBack} /> : null;
      default:
        return <Home setView={setActiveView} />;
    }
  };

  return (
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
  );
};

export default App;