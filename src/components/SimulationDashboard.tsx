import React from 'react';
import { MetricsPanel } from './dashboard/MetricsPanel';
import { BankrollChart } from './dashboard/BankrollChart';
import { ExecutionLog } from './dashboard/ExecutionLog';
import { useSimulationStore } from '../store/useSimulationStore';
import { ResizableContainer } from './ui/ResizableContainer';

export const SimulationDashboard: React.FC = () => {
  const { layout, setLayout } = useSimulationStore();

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex-none">
         <MetricsPanel />
      </div>
      
      <ResizableContainer
        height={layout.chartHeight || 300}
        onResize={(h) => setLayout({ chartHeight: h })}
        minHeight={200}
        maxHeight={800}
        resizeHandlePosition="bottom"
        className="border-b border-primary/10 pb-1"
      >
        <BankrollChart />
      </ResizableContainer>

      <ResizableContainer
        height={layout.logHeight || 300}
        onResize={(h) => setLayout({ logHeight: h })}
        minHeight={200}
        maxHeight={1000}
        resizeHandlePosition="bottom"
      >
        <ExecutionLog />
      </ResizableContainer>
    </div>
  );
};

