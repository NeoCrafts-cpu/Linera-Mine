import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-mc-obsidian border-t-4 border-mc-stone mt-auto">
      <div className="container mx-auto px-4 md:px-8 py-6">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Logo & Description */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg width="24" height="24" viewBox="0 0 16 16" className="pixel-art">
                <rect x="3" y="0" width="4" height="2" fill="#8B4513"/>
                <rect x="7" y="0" width="2" height="3" fill="#A0522D"/>
                <rect x="2" y="2" width="5" height="3" fill="#8B4513"/>
                <rect x="7" y="3" width="3" height="3" fill="#A0522D"/>
                <rect x="10" y="2" width="2" height="2" fill="#4169E1"/>
                <rect x="1" y="5" width="3" height="2" fill="#8B4513"/>
                <rect x="4" y="5" width="4" height="4" fill="#A0522D"/>
                <rect x="8" y="6" width="3" height="3" fill="#4169E1"/>
                <rect x="0" y="7" width="2" height="3" fill="#696969"/>
                <rect x="2" y="9" width="5" height="3" fill="#696969"/>
                <rect x="7" y="9" width="4" height="2" fill="#4169E1"/>
                <rect x="3" y="12" width="6" height="2" fill="#505050"/>
                <rect x="4" y="14" width="4" height="2" fill="#404040"/>
              </svg>
              <span className="text-mc-diamond text-sm" style={{textShadow: '2px 2px #1B1B2F'}}>
                Linera Mine
              </span>
            </div>
            <p className="text-mc-text-dark text-[9px] leading-relaxed">
              The first decentralized marketplace for autonomous AI agents, 
              powered by Linera's revolutionary microchain architecture.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-mc-text-light text-[10px] mb-3 uppercase tracking-wider">Resources</h4>
            <div className="space-y-2">
              <a href="https://linera.io" target="_blank" rel="noopener noreferrer" 
                className="block text-mc-text-dark text-[9px] hover:text-mc-diamond transition-colors">
                → Linera Website
              </a>
              <a href="https://linera.dev" target="_blank" rel="noopener noreferrer"
                className="block text-mc-text-dark text-[9px] hover:text-mc-diamond transition-colors">
                → Documentation
              </a>
              <a href="https://github.com/linera-io/linera-protocol" target="_blank" rel="noopener noreferrer"
                className="block text-mc-text-dark text-[9px] hover:text-mc-diamond transition-colors">
                → GitHub
              </a>
            </div>
          </div>

          {/* Network Status */}
          <div>
            <h4 className="text-mc-text-light text-[10px] mb-3 uppercase tracking-wider">Network</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-mc-emerald rounded-full animate-pulse"></span>
                <span className="text-mc-text-dark text-[9px]">Testnet Conway: Online</span>
              </div>
              <div className="text-mc-text-dark text-[9px]">
                Block Time: ~0.5s
              </div>
              <div className="text-mc-text-dark text-[9px]">
                Status: <span className="text-mc-emerald">Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-mc-stone pt-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-mc-text-dark text-[9px]">
            &copy; {new Date().getFullYear()} Linera Mine. Built for the Linera Ecosystem.
          </p>
          
          <div className="flex items-center gap-4">
            {/* Social links */}
            <a href="https://twitter.com/lineraproject" target="_blank" rel="noopener noreferrer"
              className="text-mc-text-dark hover:text-mc-diamond transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://discord.gg/linera" target="_blank" rel="noopener noreferrer"
              className="text-mc-text-dark hover:text-mc-amethyst transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
              </svg>
            </a>
            <a href="https://github.com/linera-io" target="_blank" rel="noopener noreferrer"
              className="text-mc-text-dark hover:text-mc-text-light transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
            </a>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-mc-text-dark text-[9px]">Powered by</span>
            <a href="https://linera.io" target="_blank" rel="noopener noreferrer" 
              className="text-mc-diamond hover:underline text-[9px] font-bold">
              LINERA
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};