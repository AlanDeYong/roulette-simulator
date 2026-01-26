import React, { useRef } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Settings, Upload, FileText } from 'lucide-react';
import { Button } from './ui/Button';

export const ConfigurationPanel: React.FC = () => {
  const { config, setConfig, status, setImportedData, importedData, importedFileName, setImportedFileName } = useSimulationStore();
  const isRunning = status === 'running' || status === 'paused';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('betLimits.')) {
        const limitField = field.split('.')[1];
        setConfig({ betLimits: { ...config.betLimits, [limitField]: Number(value) } });
    } else if (field.startsWith('dataRange.')) {
        const rangeField = field.split('.')[1];
        setConfig({ dataRange: { ...config.dataRange, [rangeField]: value } });
    } else {
        setConfig({ [field]: value });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseAndSetData(text);
    };
    reader.readAsText(file);
  };

  const handleBulkDataChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    parseAndSetData(event.target.value);
  };

  const parseAndSetData = (text: string) => {
    // Match all numbers in the text (handling commas, spaces, newlines)
    const matches = text.match(/-?\d+/g);
    if (matches) {
      const numbers = matches.map(Number).filter(n => !isNaN(n));
      setImportedData(numbers);
    } else {
      setImportedData([]);
    }
  };

  return (
    <Card className="h-full border-t-4 border-t-primary overflow-y-auto max-h-[calc(100vh-2rem)]">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-primary" />
          <CardTitle>Configuration</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Bankroll & Spins */}
        <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
                <Label className="h-5 block">Starting Bankroll ($)</Label>
                <Input
                    type="number"
                    value={config.startingBankroll}
                    onChange={(e) => handleChange('startingBankroll', Number(e.target.value))}
                    disabled={isRunning}
                    min={1}
                />
            </div>
            <div className="space-y-2">
                <Label className="h-5 block">Max Spins</Label>
                <Input
                    type="number"
                    value={config.maxSpins}
                    onChange={(e) => handleChange('maxSpins', Number(e.target.value))}
                    disabled={isRunning}
                    min={1}
                />
            </div>
        </div>

        {/* Table Type */}
        <div className="space-y-2">
          <Label>Table Type</Label>
          <select
            className="flex h-10 w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 text-text"
            value={config.tableType}
            onChange={(e) => handleChange('tableType', e.target.value)}
            disabled={isRunning}
          >
            <option value="european">European (Single Zero)</option>
            <option value="american">American (Double Zero)</option>
          </select>
        </div>

        {/* Bet Limits */}
        <div className="space-y-2">
            <Label>Bets Size</Label>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <span className="text-xs text-muted-foreground block mb-1">Min (Inside)</span>
                    <Input
                        type="number"
                        value={config.betLimits.min}
                        onChange={(e) => handleChange('betLimits.min', Number(e.target.value))}
                        disabled={isRunning}
                        min={0}
                    />
                </div>
                <div>
                    <span className="text-xs text-muted-foreground block mb-1">Min (Outside)</span>
                    <Input
                        type="number"
                        value={config.betLimits.minOutside}
                        onChange={(e) => handleChange('betLimits.minOutside', Number(e.target.value))}
                        disabled={isRunning}
                        min={0}
                    />
                </div>
                <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block mb-1">Max Bet</span>
                    <Input
                        type="number"
                        value={config.betLimits.max}
                        onChange={(e) => handleChange('betLimits.max', Number(e.target.value))}
                        disabled={isRunning}
                        min={1}
                    />
                </div>
            </div>
        </div>

        {/* Data Import Section */}
        <div className="border-t border-primary/10 pt-4 space-y-4">
            <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Data Import</h3>
            </div>
            
            <div className="space-y-2">
                    <Label>Import File (.txt, .csv)</Label>
                    <div className="flex gap-2">
                        <input 
                            type="file" 
                            accept=".txt,.csv" 
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isRunning}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload File
                        </Button>
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between">
                        <span>Loaded: {importedData.length} spins</span>
                        {importedFileName && <span className="text-primary truncate max-w-[150px]" title={importedFileName}>{importedFileName}</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Bulk Data Entry</Label>
                    <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 text-text resize-none"
                        placeholder="Paste numbers (comma, space, or newline separated)"
                        onChange={handleBulkDataChange}
                        disabled={isRunning}
                    />
                </div>

            {/* Data Range */}
            <div className="space-y-2">
                <Label>Data Range</Label>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="text-xs text-muted-foreground block mb-1">Start Spin</span>
                        <Input
                            type="number"
                            value={config.dataRange.start}
                            onChange={(e) => handleChange('dataRange.start', Number(e.target.value))}
                            disabled={isRunning}
                            min={1}
                        />
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block mb-1">End Spin (Optional)</span>
                        <Input
                            type="number"
                            value={config.dataRange.end || ''}
                            onChange={(e) => handleChange('dataRange.end', e.target.value ? Number(e.target.value) : null)}
                            disabled={isRunning}
                            min={1}
                            placeholder="All"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="checkbox"
                        id="fromEnd"
                        checked={config.dataRange.fromEnd}
                        onChange={(e) => handleChange('dataRange.fromEnd', e.target.checked)}
                        disabled={isRunning}
                        className="accent-primary"
                    />
                    <Label htmlFor="fromEnd" className="text-xs font-normal cursor-pointer">Start from end of data</Label>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
