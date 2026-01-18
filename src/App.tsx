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
        {/* Left Column: Config & Controls */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="flex-none h-full max-h-[calc(100vh-12rem)] flex flex-col gap-4">
            <div className="flex-1 min-h-0 overflow-hidden">
                <ConfigurationPanel />
            </div>
            
            <div className="flex-none grid grid-cols-2 gap-4">
                <Button 
                    onClick={handleStart} 
                    disabled={isRunning}
                    className="w-full"
                    size="lg"
                >
                    <Play className="w-4 h-4 mr-2" />
                    Start
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
                        Reset
                    </Button>
                )}
            </div>
          </div>
        </div>

        {/* Right Column: Strategy & Dashboard */}
        <div className="xl:col-span-9 flex flex-col gap-6 h-full">
          <div className="h-[500px] flex-none">
            <StrategyEditor />
          </div>
          <div className="flex-1 min-h-[500px]">
            <SimulationDashboard />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default App;
