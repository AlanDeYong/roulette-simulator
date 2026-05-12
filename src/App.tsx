import { useEffect, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [configWidth, setConfigWidth] = useState(layout.configPanelWidth || 420);

  // Sync with server on mount
  useEffect(() => {
      syncWithServer();
  }, [syncWithServer]);

  useEffect(() => {
      setConfigWidth(layout.configPanelWidth || 420);
  }, [layout.configPanelWidth]);

  const handleStart = () => {
     runSimulation();
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDraggingRef.current || !containerRef.current) return;
          const minWidth = 280;
          const maxWidth = 720;
          const deltaX = e.clientX - startXRef.current;
          const nextWidth = startWidthRef.current + deltaX;
          const clamped = Math.max(minWidth, Math.min(maxWidth, nextWidth));
          setConfigWidth(clamped);
      };

      const handleMouseUp = () => {
          if (!isDraggingRef.current) return;
          isDraggingRef.current = false;
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
          setLayout({ configPanelWidth: configWidth });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [configWidth, setLayout]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = configWidth;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
  };

  return (
    <Layout>
      <div ref={containerRef} className="flex h-full overflow-y-hidden overflow-x-auto">
        {/* Left Column: Config & Controls */}
        <div style={{ width: configWidth }} className="shrink-0 flex flex-col gap-4 h-full overflow-hidden pr-3">
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

        <div
            onMouseDown={handleResizeMouseDown}
            className="w-2 flex-none cursor-col-resize select-none relative hover:bg-primary/10 transition-colors"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize configuration panel"
        >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-primary/20" />
        </div>

        {/* Right Column: Strategy & Dashboard */}
        <div className="min-w-0 flex-1 h-full overflow-y-auto pl-3 pr-2 custom-scrollbar flex flex-col gap-4">
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
