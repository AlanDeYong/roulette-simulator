import React from 'react';
import { MetricsPanel } from './dashboard/MetricsPanel';
import { BankrollChart } from './dashboard/BankrollChart';
import { ExecutionLog } from './dashboard/ExecutionLog';

export const SimulationDashboard: React.FC = () => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <MetricsPanel />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2">
          <BankrollChart />
        </div>
        <div className="lg:col-span-1">
          <ExecutionLog />
        </div>
      </div>
    </div>
  );
};
