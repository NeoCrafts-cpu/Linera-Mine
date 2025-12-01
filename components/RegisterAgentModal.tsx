import React, { useState } from 'react';
import { registerAgentOnChain, isLineraEnabled } from '../services/api';

interface RegisterAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: () => void;
}

// Pixel art robot icon
const RobotIcon = () => (
  <svg width="32" height="32" viewBox="0 0 16 16" className="pixel-art">
    <rect x="6" y="0" width="4" height="2" fill="#5DADE2"/>
    <rect x="4" y="2" width="8" height="2" fill="#373737"/>
    <rect x="3" y="4" width="10" height="6" fill="#505050"/>
    <rect x="4" y="5" width="3" height="3" fill="#5DADE2"/>
    <rect x="9" y="5" width="3" height="3" fill="#5DADE2"/>
    <rect x="5" y="6" width="1" height="1" fill="#1B1B2F"/>
    <rect x="10" y="6" width="1" height="1" fill="#1B1B2F"/>
    <rect x="6" y="9" width="4" height="1" fill="#3A3A3A"/>
    <rect x="4" y="10" width="8" height="2" fill="#696969"/>
    <rect x="3" y="12" width="4" height="3" fill="#505050"/>
    <rect x="9" y="12" width="4" height="3" fill="#505050"/>
  </svg>
);

export const RegisterAgentModal: React.FC<RegisterAgentModalProps> = ({ isOpen, onClose, onRegistered }) => {
  const [name, setName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !serviceDescription.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    try {
      if (isLineraEnabled()) {
        await registerAgentOnChain(name.trim(), serviceDescription.trim());
        setSuccess('🎉 Agent registered on Linera blockchain!');
      } else {
        setSuccess('Agent registered (mock mode)');
      }
      
      onRegistered();
      
      setTimeout(() => {
        setName('');
        setServiceDescription('');
        setSuccess(null);
        onClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('AlreadyRegistered')) {
        setError('You are already registered as an agent!');
      } else {
        setError(`Failed to register: ${message}`);
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-mc-obsidian w-full max-w-lg border-4 border-mc-stone shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-mc-diamond px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg text-mc-ui-bg-dark flex items-center gap-3 font-bold">
            <RobotIcon />
            Register as Agent
          </h2>
          <button 
            onClick={onClose} 
            className="text-mc-ui-bg-dark hover:text-white text-xl transition-colors w-8 h-8 flex items-center justify-center bg-mc-diamond-dark border-2 border-mc-ui-bg-dark/30 hover:border-white/50"
          >
            ✕
          </button>
        </div>

        {/* Connection indicator */}
        <div className={`px-6 py-2 text-[9px] flex items-center gap-2 ${isLineraEnabled() ? 'bg-mc-emerald/20' : 'bg-mc-gold/20'}`}>
          <span className={`w-2 h-2 rounded-full ${isLineraEnabled() ? 'bg-mc-emerald animate-pulse' : 'bg-mc-gold'}`}></span>
          <span className={isLineraEnabled() ? 'text-mc-emerald' : 'text-mc-gold'}>
            {isLineraEnabled() ? 'Connected to Linera Testnet' : 'Mock Mode (No Blockchain)'}
          </span>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Info Banner */}
          <div className="bg-mc-ui-bg-dark border-2 border-mc-stone p-4 mb-6">
            <p className="text-mc-text-light text-[10px] leading-relaxed">
              🤖 Register as an agent to bid on jobs and earn emeralds. Your profile will be 
              <span className="text-mc-diamond"> permanently recorded</span> on the Linera blockchain.
            </p>
          </div>

          {/* Agent Name Field */}
          <div className="mb-5">
            <label htmlFor="agentName" className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-2">
              Agent Name
            </label>
            <input
              id="agentName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-mc-ui-bg-dark border-4 border-mc-stone focus:border-mc-diamond p-4 text-mc-text-light text-xs focus:outline-none transition-colors placeholder-mc-text-dark"
              placeholder="e.g., CodeBot 5000, DataMiner Pro"
              required
              maxLength={50}
            />
            <div className="flex justify-between mt-1">
              <span className="text-mc-text-dark text-[8px]">Choose a memorable name</span>
              <span className={`text-[8px] ${name.length > 40 ? 'text-mc-gold' : 'text-mc-text-dark'}`}>
                {name.length}/50
              </span>
            </div>
          </div>
          
          {/* Service Description Field */}
          <div className="mb-6">
            <label htmlFor="serviceDescription" className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-2">
              Service Description
            </label>
            <textarea
              id="serviceDescription"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              className="w-full bg-mc-ui-bg-dark border-4 border-mc-stone focus:border-mc-diamond p-4 text-mc-text-light text-xs focus:outline-none transition-colors placeholder-mc-text-dark"
              rows={4}
              placeholder="Describe your skills and services...&#10;Example: Expert in Rust smart contract development, specializing in DeFi applications. 5+ years experience building on blockchain platforms."
              required
              maxLength={500}
            />
            <div className="flex justify-between mt-1">
              <span className="text-mc-text-dark text-[8px]">Describe your expertise</span>
              <span className={`text-[8px] ${serviceDescription.length > 450 ? 'text-mc-gold' : 'text-mc-text-dark'}`}>
                {serviceDescription.length}/500
              </span>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-mc-redstone/20 border-2 border-mc-redstone px-4 py-3 text-[10px] mb-4 flex items-center gap-2">
              <span className="text-lg">❌</span>
              <span className="text-mc-text-light">{error}</span>
            </div>
          )}
          
          {/* Success Message */}
          {success && (
            <div className="bg-mc-emerald/20 border-2 border-mc-emerald px-4 py-3 text-[10px] mb-4 flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span className="text-mc-text-light">{success}</span>
            </div>
          )}
          
          {/* Blockchain Notice */}
          <div className="bg-mc-amethyst/10 border-2 border-mc-amethyst/30 p-3 mb-6">
            <p className="text-mc-amethyst text-[9px] flex items-center gap-2">
              <span>⛓️</span>
              {isLineraEnabled() 
                ? 'Registration will be permanently recorded on Linera' 
                : 'Running in mock mode - no blockchain transaction'}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-mc-stone text-mc-text-light py-3 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark text-[10px] uppercase tracking-wider hover:brightness-110 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-mc-diamond text-mc-ui-bg-dark py-3 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-diamond-dark border-r-mc-diamond-dark text-[10px] uppercase tracking-wider font-bold hover:brightness-110 transition-all disabled:bg-mc-stone disabled:text-mc-text-dark disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </>
              ) : (
                <>
                  <span>🤖</span>
                  Register Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterAgentModal;