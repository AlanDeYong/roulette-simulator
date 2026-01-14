import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useSimulationStore } from '../store/useSimulationStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Code, BookOpen, Save, List, Trash2, Copy, Play } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
  const { strategy, setStrategyCode, status, saveStrategy, savedStrategies, loadStrategy, deleteStrategy, duplicateStrategy } = useSimulationStore();
  const isRunning = status === 'running';
  const [view, setView] = useState<'editor' | 'list'>('editor');
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setStrategyCode(value);
    }
  };

  const loadPreset = () => {
    if (window.confirm('This will overwrite your current code. Continue?')) {
        setStrategyCode(THE_ONE_STRATEGY);
    }
  };

  const handleSave = () => {
      if (!saveName.trim()) return;
      saveStrategy(saveName, 'User saved strategy');
      setSaveName('');
      setIsSaving(false);
      setView('list');
  };

  return (
    <Card className="h-full flex flex-col border-t-4 border-t-primary">
      <CardHeader className="flex flex-col gap-2 py-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-primary" />
            <CardTitle>{view === 'editor' ? 'Strategy Editor' : 'Saved Strategies'}</CardTitle>
            </div>
            <div className="flex gap-2">
                {view === 'editor' ? (
                    <>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsSaving(!isSaving)}
                            disabled={isRunning}
                            className="text-xs"
                        >
                            <Save className="w-3 h-3 mr-2" />
                            Save
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setView('list')}
                            className="text-xs"
                        >
                            <List className="w-3 h-3 mr-2" />
                            Manage
                        </Button>
                    </>
                ) : (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setView('editor')}
                        className="text-xs"
                    >
                        <Code className="w-3 h-3 mr-2" />
                        Back to Editor
                    </Button>
                )}
            </div>
        </div>
        
        {view === 'editor' && isSaving && (
            <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
                <Input 
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Strategy Name"
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleSave} className="h-8 text-xs">Confirm</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsSaving(false)} className="h-8 text-xs">Cancel</Button>
            </div>
        )}

        {view === 'editor' && !isSaving && (
            <div className="flex justify-end">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadPreset}
                    disabled={isRunning}
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-primary"
                >
                <BookOpen className="w-3 h-3 mr-2" />
                Load "The One" Preset
                </Button>
            </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-[400px] border-t border-primary/10 relative overflow-hidden">
        {view === 'editor' ? (
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
        ) : (
            <div className="p-4 space-y-4 overflow-y-auto h-full bg-background/50">
                {savedStrategies.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        No saved strategies yet.
                    </div>
                ) : (
                    savedStrategies.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-primary/10 bg-card hover:bg-accent/5 transition-colors">
                            <div>
                                <h3 className="font-semibold text-primary">{s.name}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                        if (window.confirm(`Load "${s.name}" into editor?`)) {
                                            loadStrategy(s.id);
                                            setView('editor');
                                        }
                                    }}
                                    title="Load"
                                >
                                    <Play className="w-3 h-3" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => duplicateStrategy(s.id)}
                                    title="Duplicate"
                                >
                                    <Copy className="w-3 h-3" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="danger"
                                    onClick={() => {
                                        if (window.confirm(`Delete "${s.name}"?`)) {
                                            deleteStrategy(s.id);
                                        }
                                    }}
                                    title="Delete"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
};
