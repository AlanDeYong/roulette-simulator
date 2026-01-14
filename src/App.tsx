import { Layout } from './components/Layout';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { StrategyEditor } from './components/StrategyEditor';
import { SimulationDashboard } from './components/SimulationDashboard';
import { useSimulationRunner } from './hooks/useSimulationRunner';
import { useSimulationStore } from './store/useSimulationStore';
import { Button } from './components/ui/Button';
import { Play, Square, RotateCcw } from 'lucide-react';

function App() {
  const { runSimulation, stopSimulation } = useSimulationRunner();
  const { status, resetSimulation } = useSimulationStore();
  
  const isRunning = status === 'running';

  const handleStart = () => {
     runSimulation();
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[calc(100vh-10rem)]">
        {/* Left Column: Config & Strategy */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="flex-none">
            <ConfigurationPanel />
          </div>
          <div className="flex-1 min-h-[400px]">
            <StrategyEditor />
          </div>
          <div className="flex-none grid grid-cols-2 gap-4">
             <Button 
                onClick={handleStart} 
                disabled={isRunning}
                className="w-full"
                size="lg"
             >
                <Play className="w-4 h-4 mr-2" />
                Start Simulation
             </Button>
             {isRunning ? (
                 <Button 
                    onClick={stopSimulation} 
                    variant="danger"
                    className="w-full"
                    size="lg"
                 >
                    <Square className="w-4 h-4 mr-2 fill-current" />
                    Stop
                 </Button>
             ) : (
                 <Button
                    onClick={resetSimulation}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={status === 'idle'}
                 >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Results
                 </Button>
             )}
          </div>
        </div>

        {/* Right Column: Dashboard */}
        <div className="xl:col-span-8 flex flex-col h-full">
          <SimulationDashboard />
        </div>
      </div>
    </Layout>
  );
}

export default App;
