import React, { useRef, useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { parseFileInChunks } from '../utils/fileParser';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Settings, Upload, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';

// Helper component for collapsible sections
const CollapsibleSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-primary/10 rounded-md overflow-hidden">
            <button
                className="w-full flex items-center justify-between p-2 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center space-x-2">
                    {icon}
                    <span className="text-xs font-semibold">{title}</span>
                </div>
                {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </button>
            {isOpen && (
                <div className="p-2 space-y-2 bg-background/50">
                    {children}
                </div>
            )}
        </div>
    );
};

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

    const [isLoadingFile, setIsLoadingFile] = React.useState(false);
    const [loadingProgress, setLoadingProgress] = React.useState(0);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Clear old data and set loading state immediately
        setIsLoadingFile(true);
        setLoadingProgress(0);
        setImportedData([]);
        setImportedFileName(file.name); // Set filename so user sees what they picked

        // Use standard FileReader first to see if chunking is actually needed or causing issues
        // For files < 10MB, standard read is often faster and less error prone
        if (file.size < 10 * 1024 * 1024) {
             const reader = new FileReader();
             reader.onload = (e) => {
                 const text = e.target?.result as string;
                 parseAndSetData(text);
                 setIsLoadingFile(false);
             };
             reader.onerror = (e) => {
                 console.error("File reading failed", e);
                 setIsLoadingFile(false);
             };
             reader.readAsText(file);
        } else {
            // Use chunked parser for massive files
            parseFileInChunks(
                file,
                (count) => {
                    setLoadingProgress(count);
                },
                (data) => {
                    setImportedData(data);
                    setIsLoadingFile(false);
                },
                (error) => {
                    console.error("File reading failed", error);
                    setIsLoadingFile(false);
                }
            );
        }
    };

    const handleBulkDataChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        parseAndSetData(event.target.value);
    };

    const parseAndSetData = (text: string) => {
        // Match all numbers in the text (handling commas, spaces, newlines)
        const matches = text.match(/-?\d+/g);
        if (matches) {
            const numbers = matches.map(Number).filter(n => !isNaN(n));
            // Force a new array reference AND ensure config updates to use it
            setImportedData([...numbers]);

            // Auto-enable "Use Imported Data" when a file is loaded
            if (!config.useImportedData) {
                setConfig({ useImportedData: true });
            }
        } else {
            setImportedData([]);
        }
    };

    return (
        <Card className="h-full border-t-4 border-t-primary flex flex-col overflow-hidden">
            <CardHeader className="flex-none pb-3 pt-4 px-4">
                <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-primary" />
                    <CardTitle>Configuration</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-1 pl-3 pb-2">
                {/* Bankroll & Spins */}
                <div className="grid grid-cols-2 gap-2 items-start">
                    <div className="space-y-1">
                        <Label className="h-4 block text-[10px] text-muted-foreground">Starting Bankroll ($)</Label>
                        <Input
                            type="number"
                            value={config.startingBankroll}
                            onChange={(e) => handleChange('startingBankroll', Number(e.target.value))}
                            disabled={isRunning}
                            min={1}
                            className="h-7 px-2 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="h-4 block text-[10px] text-muted-foreground">Max Spins</Label>
                        <Input
                            type="number"
                            value={config.maxSpins}
                            onChange={(e) => handleChange('maxSpins', Number(e.target.value))}
                            disabled={isRunning}
                            min={1}
                            className="h-7 px-2 text-xs"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 items-start">
                    {/* Table Type */}
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Table Type</Label>
                        <select
                            className="flex h-7 w-full rounded-md border border-primary/20 bg-background px-1 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 text-text"
                            value={config.tableType}
                            onChange={(e) => handleChange('tableType', e.target.value)}
                            disabled={isRunning}
                        >
                            <option value="european">European (Single)</option>
                            <option value="american">American (Double)</option>
                        </select>
                    </div>

                    {/* Minimum Incremental Bet */}
                    <div className="space-y-1">
                         <Label className="text-[10px] text-muted-foreground">Min Incr. Bet</Label>
                         <Input
                            type="number"
                            value={config.minIncrementalBet ?? 1}
                            onChange={(e) => handleChange('minIncrementalBet', Number(e.target.value))}
                            disabled={isRunning}
                            min={0.1}
                            step={0.1}
                            className="h-7 px-2 text-xs"
                         />
                    </div>
                </div>

                {/* Bet Limits */}
                <div className="space-y-1 pt-1">
                    <Label className="text-xs font-semibold">Bets Size & Increment</Label>
                    <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 rounded-md border border-white/5">
                        <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">Min (Inside)</span>
                            <Input
                                type="number"
                                value={config.betLimits.min}
                                onChange={(e) => handleChange('betLimits.min', Number(e.target.value))}
                                disabled={isRunning}
                                min={0}
                                className="h-6 px-2 text-xs"
                            />
                        </div>
                        <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">Min (Outside)</span>
                            <Input
                                type="number"
                                value={config.betLimits.minOutside}
                                onChange={(e) => handleChange('betLimits.minOutside', Number(e.target.value))}
                                disabled={isRunning}
                                min={0}
                                className="h-6 px-2 text-xs"
                            />
                        </div>
                        <div>
                           <span className="text-[10px] text-muted-foreground block mb-0.5">Max Bet</span>
                           <Input
                               type="number"
                               value={config.betLimits.max}
                               onChange={(e) => handleChange('betLimits.max', Number(e.target.value))}
                               disabled={isRunning}
                               min={1}
                                className="h-6 px-2 text-xs"
                           />
                        </div>
                        <div>
                             <span className="text-[10px] text-muted-foreground block mb-0.5">Increment Mode</span>
                             <select
                                 className="flex h-6 w-full rounded-md border border-primary/20 bg-background px-1 py-0 text-[10px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 text-text"
                                 value={config.incrementMode || 'fixed'}
                                 onChange={(e) => handleChange('incrementMode', e.target.value)}
                                 disabled={isRunning}
                             >
                                 <option value="fixed">Fixed</option>
                                 <option value="base">Base Bet</option>
                             </select>
                        </div>
                    </div>
                </div>

                {/* Data Import Section (Collapsible) */}
                <CollapsibleSection 
                    title="Data Import" 
                    icon={<FileText className="w-3.5 h-3.5 text-primary" />}
                    defaultOpen={true}
                >
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="useImportedData"
                            checked={config.useImportedData}
                            onChange={(e) => handleChange('useImportedData', e.target.checked)}
                            disabled={isRunning || importedData.length === 0}
                            className="accent-primary h-3 w-3"
                        />
                        <Label htmlFor="useImportedData" className="text-[10px] font-normal cursor-pointer">Use Imported Data</Label>
                    </div>

                    <div className="space-y-1">
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
                                className="w-full h-7 text-xs"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isRunning}
                            >
                                <Upload className="w-3 h-3 mr-2" />
                                Upload File
                            </Button>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex justify-between h-4">
                            <span>
                                {isLoadingFile ? (
                                    <span className="text-yellow-500 animate-pulse">
                                        Loading...
                                    </span>
                                ) : (
                                    `Loaded: ${importedData.length}`
                                )}
                            </span>
                            {importedFileName && <span className="text-primary truncate max-w-[100px]" title={importedFileName}>{importedFileName}</span>}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Bulk Data Entry</Label>
                        <textarea
                            className="flex min-h-[50px] w-full rounded-md border border-primary/20 bg-background px-2 py-1 text-[10px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 text-text resize-none"
                            placeholder="Paste numbers..."
                            onChange={handleBulkDataChange}
                            disabled={isRunning}
                        />
                    </div>

                    {/* Data Range */}
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Data Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-[10px] text-muted-foreground block mb-0.5">Start</span>
                                <Input
                                    type="number"
                                    value={config.dataRange.start}
                                    onChange={(e) => handleChange('dataRange.start', Number(e.target.value))}
                                    disabled={isRunning}
                                    min={1}
                                    className="h-6 px-2 text-xs"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-muted-foreground block mb-0.5">End</span>
                                <Input
                                    type="number"
                                    value={config.dataRange.end || ''}
                                    onChange={(e) => handleChange('dataRange.end', e.target.value ? Number(e.target.value) : null)}
                                    disabled={isRunning}
                                    min={1}
                                    placeholder="All"
                                    className="h-6 px-2 text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="checkbox"
                                id="fromEnd"
                                checked={config.dataRange.fromEnd}
                                onChange={(e) => handleChange('dataRange.fromEnd', e.target.checked)}
                                disabled={isRunning}
                                className="accent-primary h-3 w-3"
                            />
                            <Label htmlFor="fromEnd" className="text-[10px] font-normal cursor-pointer">Start from end</Label>
                        </div>
                    </div>
                </CollapsibleSection>
            </CardContent>
        </Card>
    );
};

