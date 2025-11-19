import React from 'react';

type HeaderView = 'home' | 'marketplace' | 'agents' | 'docs';

interface HeaderProps {
    activeView: string;
    setActiveView: (view: HeaderView) => void;
    isConnected: boolean;
    userAddress: string | null;
    onConnect: () => void;
    onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, isConnected, userAddress, onConnect, onDisconnect }) => {
    const navItemClasses = "px-4 py-2 text-xs border-2 transition-colors";
    const activeClasses = "bg-mc-stone text-white border-mc-ui-border-dark";
    const inactiveClasses = "bg-mc-ui-bg text-black border-mc-ui-border-light hover:bg-mc-stone hover:text-white";
    
    const USE_LINERA = import.meta.env.VITE_USE_LINERA === 'true';
    const CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID;
    
    const formatAddress = (address: string) => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    return (
        <header className="bg-mc-wood/80 backdrop-blur-sm sticky top-0 z-10 border-b-4 border-mc-ui-bg-dark">
            <nav className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
                <button onClick={() => setActiveView('home')} className="flex items-center space-x-3 cursor-pointer">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-mc-diamond" fill="none" viewBox="0 0 48 48"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M11 42h26M13 32l6-6-6-6M24 16v10m9-4l-6 6 6 6m-1-18h8V8h-8v4zM4 42V8h12v11" /></svg>
                    <h1 className="text-xl text-mc-text-light" style={{textShadow: '2px 2px #373737'}}>Linera Mine</h1>
                </button>
                <div className="flex items-center space-x-2 md:space-x-4">
                    <button 
                        onClick={() => setActiveView('marketplace')}
                        className={`${navItemClasses} ${activeView === 'marketplace' || activeView === 'job-details' ? activeClasses : inactiveClasses}`}
                    >
                        Market
                    </button>
                    <button 
                        onClick={() => setActiveView('agents')}
                        className={`${navItemClasses} ${activeView === 'agents' ? activeClasses : inactiveClasses}`}
                    >
                        Agents
                    </button>
                    <button 
                        onClick={() => setActiveView('docs')}
                        className={`${navItemClasses} ${activeView === 'docs' ? activeClasses : inactiveClasses}`}
                    >
                        Docs
                    </button>

                    {isConnected && userAddress ? (
                        <div className="bg-mc-ui-bg-dark border-2 border-mc-ui-border-dark flex items-center p-2 text-xs">
                            <span className="text-mc-grass mr-2 text-lg">●</span>
                            <div className="flex flex-col">
                                <span className="text-mc-text-light" title={userAddress}>{formatAddress(userAddress)}</span>
                                {USE_LINERA && CHAIN_ID && (
                                    <span className="text-mc-text-dark text-[10px]" title={`Chain: ${CHAIN_ID}`}>
                                        ⛓️ Linera
                                    </span>
                                )}
                            </div>
                             <button onClick={onDisconnect} className="ml-3 text-mc-text-dark hover:text-white" title="Disconnect">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                         <button
                            onClick={onConnect}
                            className="bg-mc-diamond hover:bg-opacity-80 text-white py-2 px-4 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark flex items-center text-xs"
                        >
                            {USE_LINERA ? '⛓️ Connect to Linera' : 'Connect Wallet'}
                        </button>
                    )}
                </div>
            </nav>
        </header>
    );
}