import React from 'react';
import { Dice5 } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-screen bg-background text-text font-sans flex flex-col overflow-hidden">
      <header className="flex-none border-b border-primary/20 bg-surface/80 backdrop-blur-md z-50">
        <div className="w-full px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full border border-primary/20">
              <Dice5 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-hover">
              Roulette<span className="text-white">Simulator</span>
            </h1>
          </div>
          <div className="text-xs text-text-muted hidden md:block">
            Professional Strategy Tester
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative">
        <div className="w-full h-full p-4">
            {children}
        </div>
      </main>
    </div>
  );
};

