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
    const USE_LINERA = import.meta.env.VITE_USE_LINERA === 'true';
    const CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID;
    
    const formatAddress = (address: string) => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const NavButton: React.FC<{ view: HeaderView; label: string; icon?: React.ReactNode }> = ({ view, label, icon }) => {
        const isActive = activeView === view || (view === 'marketplace' && activeView === 'job-details');
        return (
            <button
                onClick={() => setActiveView(view)}
                className={`mc-btn px-4 py-2 text-[10px] border-4 flex items-center gap-2 transition-all ${
                    isActive 
                        ? 'bg-mc-stone text-white border-t-mc-stone-dark border-l-mc-stone-dark border-b-mc-ui-border-light border-r-mc-ui-border-light shadow-mc-inset' 
                        : 'bg-mc-inventory text-mc-ui-bg-dark border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark hover:bg-mc-stone hover:text-white'
                }`}
            >
                {icon}
                {label}
            </button>
        );
    };

    return (
        <header className="bg-gradient-to-b from-mc-wood to-mc-wood-dark sticky top-0 z-50 border-b-4 border-mc-ui-bg-dark shadow-lg">
            <nav className="container mx-auto px-4 md:px-8 py-3 flex justify-between items-center">
                {/* Logo */}
                <button onClick={() => setActiveView('home')} className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative">
                        <div className="w-10 h-10 bg-mc-diamond rounded-sm border-2 border-mc-diamond-dark flex items-center justify-center animate-float">
                            <span className="text-mc-ui-bg-dark text-lg">⛏</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-mc-emerald rounded-sm border border-mc-emerald-dark"></div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base text-mc-text-light group-hover:text-mc-diamond transition-colors" style={{textShadow: '2px 2px #1B1B2F'}}>
                            LINERA MINE
                        </h1>
                        <span className="text-[8px] text-mc-gold">⛓️ Blockchain Powered</span>
                    </div>
                </button>

                {/* Navigation */}
                <div className="flex items-center space-x-2 md:space-x-3">
                    <NavButton view="marketplace" label="Market" icon={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                    } />
                    <NavButton view="agents" label="Agents" icon={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                    } />
                    <NavButton view="docs" label="Docs" icon={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                        </svg>
                    } />

                    {/* Wallet Connection */}
                    {isConnected && userAddress ? (
                        <div className="bg-mc-ui-bg-dark border-4 border-t-mc-ui-border-dark border-l-mc-ui-border-dark border-b-mc-stone border-r-mc-stone flex items-center px-3 py-2 ml-2">
                            <div className="flex items-center">
                                <span className="inline-block w-3 h-3 bg-mc-emerald rounded-full mr-2 animate-pulse shadow-lg shadow-mc-emerald/50"></span>
                                <div className="flex flex-col">
                                    <span className="text-mc-text-light text-[10px]" title={userAddress}>{formatAddress(userAddress)}</span>
                                    {USE_LINERA && CHAIN_ID && (
                                        <span className="text-mc-diamond text-[8px]" title={`Chain: ${CHAIN_ID}`}>
                                            ⛓️ Testnet
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={onDisconnect} 
                                className="ml-3 text-mc-text-dark hover:text-mc-redstone transition-colors" 
                                title="Disconnect"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onConnect}
                            className="mc-btn bg-mc-diamond hover:bg-mc-diamond-dark text-mc-ui-bg-dark py-2 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-diamond-dark border-r-mc-diamond-dark flex items-center text-[10px] ml-2 font-bold"
                        >
                            <span className="mr-2">⛓️</span>
                            Connect Wallet
                        </button>
                    )}
                </div>
            </nav>
        </header>
    );
}