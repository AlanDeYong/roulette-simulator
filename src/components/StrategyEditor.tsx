import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useSimulationStore } from '../store/useSimulationStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Code, Save, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FileManager } from './FileManager';
import { VirtualFileSystem } from '../lib/FileSystem';

const THE_ONE_STRATEGY = `function bet(spinHistory, bankroll, config) {
  // "The One" Strategy: Progressive betting on Red
  // 1. If no history, bet 1 unit on Red.
  // 2. If last spin was Red (Win), switch to Black (1 unit).
  // 3. If last spin was Black (Loss), stay on Red and bet 5% of bankroll.

  const minBet = config.betLimits.min;
  const maxBet = config.betLimits.max;
  const unit = Math.max(minBet, 1);

  if (spinHistory.length === 0) {
    return { type: 'red', amount: unit };
  }

  const lastSpin = spinHistory[spinHistory.length - 1];
  
  if (lastSpin.winningColor === 'red') {
      // Won on Red (presumably), switch to Black
      return { type: 'black', amount: unit };
  } else {
      // Lost or Zero, try to recover on Red
      const recoveryBet = Math.floor(bankroll * 0.05);
      // Ensure bet is within limits
      const amount = Math.min(Math.max(recoveryBet, minBet), maxBet);
      return { type: 'red', amount: amount };
  }
}
`;

export const StrategyEditor: React.FC = () => {
  const { 
    strategy, 
    setStrategyCode, 
    status, 
    fsNodes, 
    setFSNodes, 
    currentFileId, 
    setCurrentFileId 
  } = useSimulationStore();
  
  const isRunning = status === 'running';
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Check dirty state
  useEffect(() => {
    if (currentFileId) {
        try {
            const fs = new VirtualFileSystem(fsNodes);
            const content = fs.readFile(currentFileId);
            setIsDirty(content !== strategy.code);
        } catch (e) {
            // File might have been deleted
            setIsDirty(true);
        }
    } else {
        setIsDirty(strategy.code.length > 0);
    }
  }, [strategy.code, currentFileId, fsNodes]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
      setFeedback({ type, message });
      setTimeout(() => setFeedback(null), 3000);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setStrategyCode(value);
    }
  };

  const loadPreset = () => {
    if (window.confirm('This will overwrite your current code. Continue?')) {
        setStrategyCode(THE_ONE_STRATEGY);
        setCurrentFileId(null); // Detach from file since it's a preset
    }
  };

  const handleOpenFile = (fileId: string, content: string) => {
      if (isDirty) {
          if (!window.confirm("You have unsaved changes. Discard them?")) return;
      }
      setStrategyCode(content);
      setCurrentFileId(fileId);
  };

  const handleSave = () => {
      const fs = new VirtualFileSystem(fsNodes);
      
      if (currentFileId) {
          // Direct Overwrite
          try {
              fs.writeFile(currentFileId, strategy.code);
              setFSNodes(fs.serialize());
              showFeedback('success', 'File saved successfully');
          } catch (e: any) {
              showFeedback('error', e.message);
          }
      } else {
          // Save As
          setIsSaving(true);
      }
  };

  const handleConfirmSaveAs = () => {
      if (!saveName.trim()) return;
      
      try {
          const fs = new VirtualFileSystem(fsNodes);
          const rootId = fs.getRootId();
          const newFile = fs.createFile(rootId, saveName, strategy.code);
          setFSNodes(fs.serialize());
          setCurrentFileId(newFile.id);
          setIsSaving(false);
          setSaveName('');
          showFeedback('success', 'File saved successfully');
      } catch (e: any) {
          showFeedback('error', e.message);
      }
  };

  const currentFileName = currentFileId ? new VirtualFileSystem(fsNodes).getNode(currentFileId).name : 'Untitled';

  return (
    <Card className="h-full flex flex-col border-t-4 border-t-primary">
      <CardHeader className="py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-primary" />
                <CardTitle className="flex items-center gap-2">
                    {currentFileName}
                    {isDirty && <span className="text-yellow-500 text-xs font-normal">● Modified</span>}
                </CardTitle>
            </div>
            
            <div className="flex gap-2 items-center">
                {feedback && (
                    <div className={`text-xs flex items-center gap-1 ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {feedback.message}
                    </div>
                )}

                {isSaving ? (
                    <div className="flex gap-2 items-center animate-in fade-in slide-in-from-right-2">
                        <Input 
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="Filename..."
                            className="h-7 text-xs w-32"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmSaveAs()}
                        />
                        <Button size="sm" onClick={handleConfirmSaveAs} className="h-7 text-xs">Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsSaving(false)} className="h-7 text-xs">Cancel</Button>
                    </div>
                ) : (
                    <>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={loadPreset}
                            disabled={isRunning}
                            className="text-xs h-7 px-2 text-muted-foreground hover:text-primary"
                            title="Load Preset Strategy"
                        >
                            <BookOpen className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant={isDirty ? "default" : "outline"}
                            size="sm" 
                            onClick={handleSave}
                            disabled={isRunning}
                            className="text-xs h-7"
                        >
                            <Save className="w-3 h-3 mr-2" />
                            {currentFileId ? 'Save' : 'Save As...'}
                        </Button>
                    </>
                )}
            </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-0 flex overflow-hidden">
        {/* File Manager Sidebar */}
        <div className="w-64 border-r border-white/10 bg-black/10 flex flex-col">
            <FileManager onOpenFile={handleOpenFile} />
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative">
            <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={strategy.code}
                onChange={handleEditorChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    readOnly: isRunning,
                    automaticLayout: true,
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    padding: { top: 16, bottom: 16 },
                }}
            />
        </div>
      </CardContent>
    </Card>
  );
};

