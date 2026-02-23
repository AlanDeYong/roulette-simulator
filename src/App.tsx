import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { StrategyEditor } from './components/StrategyEditor';
import { SimulationDashboard } from './components/SimulationDashboard';
import { useSimulationRunner } from './hooks/useSimulationRunner';
import { useSimulationStore } from './store/useSimulationStore';
import { Button } from './components/ui/Button';
import { Play, Square, RotateCcw } from 'lucide-react';
import { ResizableContainer } from './components/ui/ResizableContainer';

function App() {
  const { runSimulation, stopSimulation } = useSimulationRunner();
  const { status, resetSimulation, syncWithServer, layout, setLayout } = useSimulationStore();
  
  const isRunning = status === 'running';

  // Sync with server on mount
  useEffect(() => {
      syncWithServer();
  }, [syncWithServer]);

  const handleStart = () => {
     runSimulation();
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full overflow-hidden">
        {/* Left Column: Config & Controls */}
        <div className="xl:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
            <div className="flex-1 min-h-0">
                <ConfigurationPanel />
            </div>
            
            <div className="flex-none grid grid-cols-2 gap-4 pb-2">
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

        {/* Right Column: Strategy & Dashboard */}
        <div className="xl:col-span-9 h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
            <ResizableContainer
                height={layout.strategyEditorHeight || 500}
                onResize={(h) => setLayout({ strategyEditorHeight: h })}
                minHeight={200}
                maxHeight={1200}
                resizeHandlePosition="bottom"
            >
                <StrategyEditor />
            </ResizableContainer>
            
            <SimulationDashboard />
        </div>
      </div>
    </Layout>
  );
}

export default App;
