
import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { VirtualFileSystem, FSNode, DirectoryNode, FileNode } from '../lib/FileSystem';
import { Folder, FileText, ChevronRight, ChevronDown, Plus, Trash2, Edit2, FolderPlus, FilePlus } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';

interface FileManagerProps {
    onOpenFile: (fileId: string, content: string) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({ onOpenFile }) => {
    const { fsNodes, setFSNodes, currentFileId, setCurrentFileId } = useSimulationStore();
    const [fs, setFs] = useState<VirtualFileSystem>(new VirtualFileSystem(fsNodes));
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ [fs.getRootId()]: true });
    const [selectedId, setSelectedId] = useState<string | null>(currentFileId);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Sync FS instance when store updates
    useEffect(() => {
        setFs(new VirtualFileSystem(fsNodes));
    }, [fsNodes]);

    // Update selection when current file changes externally
    useEffect(() => {
        if (currentFileId) {
            setSelectedId(currentFileId);
            // Ensure parents are expanded
            let node = fsNodes[currentFileId];
            const newExpanded = { ...expanded };
            while (node && node.parentId) {
                newExpanded[node.parentId] = true;
                node = fsNodes[node.parentId];
            }
            setExpanded(newExpanded);
        }
    }, [currentFileId, fsNodes]);

    const handleToggle = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSelect = (id: string) => {
        setSelectedId(id);
        const node = fs.getNode(id);
        if (node.type === 'file') {
            try {
                const content = fs.readFile(id);
                onOpenFile(id, content);
                setCurrentFileId(id);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const saveFS = () => {
        setFSNodes(fs.serialize());
    };

    const handleCreateFile = () => {
        try {
            const parentId = (selectedId && fs.getNode(selectedId).type === 'directory') ? selectedId : fs.getRootId();
            const name = prompt("Enter file name:");
            if (name) {
                fs.createFile(parentId, name, "// New Strategy");
                saveFS();
            }
        } catch (e: any) {
            setError(e.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleCreateDir = () => {
        try {
            const parentId = (selectedId && fs.getNode(selectedId).type === 'directory') ? selectedId : fs.getRootId();
            const name = prompt("Enter directory name:");
            if (name) {
                fs.createDirectory(parentId, name);
                saveFS();
            }
        } catch (e: any) {
            setError(e.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleDelete = () => {
        if (!selectedId) return;
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            fs.delete(selectedId);
            saveFS();
            if (selectedId === currentFileId) {
                setCurrentFileId(null);
            }
            setSelectedId(null);
        } catch (e: any) {
            setError(e.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleStartRename = () => {
        if (!selectedId) return;
        setEditingId(selectedId);
        setRenameValue(fs.getNode(selectedId).name);
    };

    const handleFinishRename = () => {
        if (!editingId) return;
        try {
            if (renameValue !== fs.getNode(editingId).name) {
                fs.rename(editingId, renameValue);
                saveFS();
            }
            setEditingId(null);
        } catch (e: any) {
            setError(e.message);
            setTimeout(() => setError(null), 3000);
            setEditingId(null);
        }
    };

    const renderTree = (nodeId: string, depth: number = 0) => {
        const node = fs.getNode(nodeId);
        const isDir = node.type === 'directory';
        const isExpanded = expanded[nodeId];
        const isSelected = selectedId === nodeId;
        const isEditing = editingId === nodeId;

        // Skip rendering root node itself if we want a flat look, but usually root is invisible or top level
        // Let's render children of root at depth 0
        if (nodeId === fs.getRootId()) {
            return (
                <div className="space-y-0.5">
                    {(node as DirectoryNode).children.map(childId => renderTree(childId, depth))}
                </div>
            );
        }

        return (
            <div key={nodeId}>
                <div 
                    className={cn(
                        "flex items-center py-1 px-2 cursor-pointer hover:bg-white/5 transition-colors text-sm rounded",
                        isSelected && "bg-primary/20 text-primary"
                    )}
                    style={{ paddingLeft: `${depth * 12 + 4}px` }}
                    onClick={() => handleSelect(nodeId)}
                >
                    {isDir && (
                        <div 
                            className="mr-1 p-0.5 hover:bg-white/10 rounded cursor-pointer"
                            onClick={(e) => handleToggle(nodeId, e)}
                        >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                    )}
                    {!isDir && <div className="w-4 mr-1" />} {/* Spacer */}
                    
                    <span className="mr-2 text-muted-foreground">
                        {isDir ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </span>

                    {isEditing ? (
                        <Input 
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleFinishRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                            className="h-6 text-xs py-0 px-1 w-full"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="truncate flex-1 select-none">{node.name}</span>
                    )}
                </div>
                
                {isDir && isExpanded && (
                    <div>
                        {(node as DirectoryNode).children.map(childId => renderTree(childId, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-lg overflow-hidden border border-white/5">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-white/5 bg-white/5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreateFile} title="New File">
                        <FilePlus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreateDir} title="New Folder">
                        <FolderPlus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleStartRename} disabled={!selectedId} title="Rename">
                        <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={handleDelete} disabled={!selectedId} title="Delete">
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Error Toast */}
            {error && (
                <div className="bg-red-900/80 text-white text-xs p-2 text-center animate-in fade-in slide-in-from-top-1 absolute w-full z-10">
                    {error}
                </div>
            )}

            {/* Tree */}
            <div className="flex-1 overflow-auto p-2 custom-scrollbar relative">
                {renderTree(fs.getRootId())}
            </div>

            {/* Status Bar */}
            <div className="p-1 border-t border-white/5 bg-white/5 text-[10px] text-muted-foreground flex justify-between px-2">
                <span>{selectedId ? fs.getNode(selectedId).name : 'No selection'}</span>
                <span>{selectedId && fs.getNode(selectedId).type === 'file' ? `${(fs.getNode(selectedId) as FileNode).content.length} B` : ''}</span>
            </div>
        </div>
    );
};
