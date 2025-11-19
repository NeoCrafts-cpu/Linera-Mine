import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-mc-ui-bg-dark border-t-4 border-mc-ui-border-dark mt-auto">
      <div className="container mx-auto px-4 md:px-8 py-4 text-center text-mc-text-dark text-xs">
        <p>&copy; {new Date().getFullYear()} Linera Mine. All Rights Reserved.</p>
        <p className="mt-1">
          Powered by the{' '}
          <a href="https://linera.io" target="_blank" rel="noopener noreferrer" className="text-mc-diamond hover:underline">
            Linera Blockchain
          </a>
        </p>
      </div>
    </footer>
  );
};