import React from 'react';
import { Dice5 } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-text font-sans flex flex-col">
      <header className="border-b border-primary/20 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full border border-primary/20">
              <Dice5 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-hover">
              Roulette<span className="text-white">Simulator</span>
            </h1>
          </div>
          <div className="text-sm text-text-muted hidden md:block">
            Professional Strategy Tester
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-1">
        {children}
      </main>
      <footer className="border-t border-primary/10 py-6 bg-surface/30">
        <div className="container mx-auto px-4 text-center text-sm text-text-muted">
          Roulette Strategy Simulator &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};
