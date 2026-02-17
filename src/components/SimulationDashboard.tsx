<<<<<<< HEAD
import React from 'react';
import { MetricsPanel } from './dashboard/MetricsPanel';
import { BankrollChart } from './dashboard/BankrollChart';
import { ExecutionLog } from './dashboard/ExecutionLog';

export const SimulationDashboard: React.FC = () => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <MetricsPanel />
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        <div className="h-1/2">
          <BankrollChart />
        </div>
        <div className="h-1/2">
          <ExecutionLog />
        </div>
      </div>
    </div>
  );
};
=======
import React from 'react';
import { MetricsPanel } from './dashboard/MetricsPanel';
import { BankrollChart } from './dashboard/BankrollChart';
import { ExecutionLog } from './dashboard/ExecutionLog';

export const SimulationDashboard: React.FC = () => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <MetricsPanel />
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        <div className="h-1/2">
          <BankrollChart />
        </div>
        <div className="h-1/2">
          <ExecutionLog />
        </div>
      </div>
    </div>
  );
};
>>>>>>> origin/main
