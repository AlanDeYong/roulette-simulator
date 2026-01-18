
import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { VirtualFileSystem, FSNode, DirectoryNode, FileNode } from '../lib/FileSystem';
import { Folder, FileText, ChevronRight, ChevronDown, Plus, Trash2, Edit2, FolderPlus, FilePlus } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';
import { ConfirmationDialog } from './ui/ConfirmationDialog';

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
    const [creatingType, setCreatingType] = useState<'file' | 'directory' | null>(null);
    const [newItemName, setNewItemName] = useState('');

    // Dialog State
    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

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
        setCreatingType('file');
        setNewItemName('');
    };

    const handleCreateDir = () => {
        setCreatingType('directory');
        setNewItemName('');
    };

    const handleConfirmCreate = () => {
        if (!newItemName.trim() || !creatingType) return;
        try {
            const parentId = (selectedId && fs.getNode(selectedId).type === 'directory') ? selectedId : fs.getRootId();
            if (creatingType === 'file') {
                fs.createFile(parentId, newItemName, "// New Strategy");
            } else {
                fs.createDirectory(parentId, newItemName);
            }
            saveFS();
            setCreatingType(null);
            setNewItemName('');
        } catch (e: any) {
            setError(e.message);
            setTimeout(() => setError(null), 3000);
        }
    };
    
    const handleCancelCreate = () => {
        setCreatingType(null);
        setNewItemName('');
    };

    const handleDelete = () => {
        if (!selectedId) return;
        
        setDialog({
            isOpen: true,
            title: "Delete Item",
            message: "Are you sure you want to delete this item? This action cannot be undone.",
            onConfirm: () => {
                try {
                    fs.delete(selectedId);
                    saveFS();
                    if (selectedId === currentFileId) {
                        setCurrentFileId(null);
                    }
                    setSelectedId(null);
                    setDialog(prev => ({ ...prev, isOpen: false }));
                } catch (e: any) {
                    setError(e.message);
                    setTimeout(() => setError(null), 3000);
                }
            }
        });
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

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('application/fs-node', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        const node = fs.getNode(id);
        // Only allow dropping on directories
        if (node.type === 'directory') {
            e.dataTransfer.dropEffect = 'move';
            e.currentTarget.classList.add('bg-primary/10');
        } else {
             // For files, we could technically drop "into parent", but let's keep it simple: drop ON folder.
             e.dataTransfer.dropEffect = 'none';
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-primary/10');
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-primary/10');
        
        const draggedId = e.dataTransfer.getData('application/fs-node');
        if (!draggedId || draggedId === targetId) return;

        try {
            // Check if we are dropping on a file or folder to reorder/move
            const targetNode = fs.getNode(targetId);
            const draggedNode = fs.getNode(draggedId);
            
            // Reordering logic
            // If target is NOT a directory we are dropping INTO, but a sibling we are dropping NEAR
            // OR if it IS a directory but we want to drop INTO it (handled by standard drop)
            
            // Simplified Reorder:
            // If dropping on a node (targetId), we move draggedId to targetId's parent, 
            // inserted BEFORE targetId.
            
            if (targetId !== fs.getRootId() && targetId !== draggedNode.parentId) {
                // Moving to a different folder (handled by dropping on folder)
                 if (targetNode.type === 'directory') {
                     fs.move(draggedId, targetId);
                 } else {
                     // Dropping on a file -> Move to that file's parent?
                     // Let's assume reorder is intended if dropping on a sibling
                     // Complex without specific drop zones.
                     // Fallback: Move to parent of target
                     if (targetNode.parentId) {
                         fs.move(draggedId, targetNode.parentId);
                     }
                 }
            } else if (targetId !== fs.getRootId() && targetNode.parentId) {
                // Same parent -> Reorder
                // Find index of target
                const parent = fs.getNode(targetNode.parentId) as DirectoryNode;
                const targetIndex = parent.children.indexOf(targetId);
                if (targetIndex !== -1) {
                     fs.move(draggedId, targetNode.parentId, targetIndex);
                }
            } else {
                 // Fallback
                 if (targetNode.type === 'directory') {
                    fs.move(draggedId, targetId);
                 }
            }

            saveFS();
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleRootDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('application/fs-node');
        if (!draggedId) return;
        
        try {
            // Move to Root
            fs.move(draggedId, fs.getRootId());
            saveFS();
        } catch (err: any) {
             setError(err.message);
             setTimeout(() => setError(null), 3000);
        }
    };

    const handleRootDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
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
                    draggable
                    onDragStart={(e) => handleDragStart(e, nodeId)}
                    onDragOver={(e) => {
                         // If directory, handle nest (original behavior)
                         // BUT we also want to allow reordering if hovering edges?
                         // For simplicity, let's allow 'handleDrop' to decide based on logic
                         // We just need to preventDefault to allow drop
                         e.preventDefault();
                         e.stopPropagation(); // Stop root from handling it
                         if (isDir) {
                             e.dataTransfer.dropEffect = 'move';
                             e.currentTarget.classList.add('bg-primary/10');
                         } else {
                             // Allow drop on files for reordering
                             e.dataTransfer.dropEffect = 'move';
                         }
                    }}
                    onDragLeave={(e) => isDir ? handleDragLeave(e) : undefined}
                    onDrop={(e) => {
                        e.stopPropagation(); // Stop root from handling it
                        handleDrop(e, nodeId);
                    }}
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
        <div 
            className="flex flex-col h-full bg-black/20 rounded-lg overflow-hidden border border-white/5 relative"
            onDragOver={handleRootDragOver}
            onDrop={handleRootDrop}
        >
             <ConfirmationDialog 
                isOpen={dialog.isOpen}
                title={dialog.title}
                message={dialog.message}
                onConfirm={dialog.onConfirm}
                onCancel={() => setDialog(prev => ({ ...prev, isOpen: false }))}
            />

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

            {/* Creation Input */}
            {creatingType && (
                <div className="p-2 border-b border-white/5 bg-white/5 flex gap-1 items-center animate-in fade-in slide-in-from-top-2">
                    <span className="text-muted-foreground">
                        {creatingType === 'directory' ? <FolderPlus className="w-4 h-4" /> : <FilePlus className="w-4 h-4" />}
                    </span>
                    <Input 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={creatingType === 'directory' ? "Folder name..." : "File name..."}
                        className="h-6 text-xs py-0 px-1 flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmCreate();
                            if (e.key === 'Escape') handleCancelCreate();
                        }}
                    />
                    <div className="flex gap-1">
                        <Button size="sm" className="h-6 px-2 text-[10px]" onClick={handleConfirmCreate}>OK</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={handleCancelCreate}>X</Button>
                    </div>
                </div>
            )}

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
