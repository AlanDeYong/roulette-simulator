
import React, { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { VirtualFileSystem, FSNode, DirectoryNode, FileNode } from '../lib/FileSystem';
import { Folder, FileText, ChevronRight, ChevronDown, Plus, Trash2, Edit2, FolderPlus, FilePlus, Copy } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';
import { ConfirmationDialog } from './ui/ConfirmationDialog';
import { Tooltip } from './ui/Tooltip';

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
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        // When FS nodes change (e.g. from sync), we rebuild the virtual FS
        const newFs = new VirtualFileSystem(fsNodes);
        setFs(newFs);
        
        // IMPORTANT: If the root ID changed (local -> server sync), we need to update expanded state
        // Otherwise we are trying to expand a root that doesn't exist
        const rootId = newFs.getRootId();
        setExpanded(prev => {
             // If we already have this root, keep state
             if (prev[rootId]) return prev;
             // Otherwise, reset or add root
             return { ...prev, [rootId]: true };
        });
        
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

    const handleAutoScroll = (e: React.DragEvent) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { top, bottom } = container.getBoundingClientRect();
        const mouseY = e.clientY;
        const threshold = 50; 

        if (mouseY < top + threshold) {
            container.scrollTop -= 5;
        } else if (mouseY > bottom - threshold) {
            container.scrollTop += 5;
        }
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

    // Helper to get relative path for API
    const getRelativePath = (id: string): string => {
        // This assumes ID is the path, which is true for our new server logic
        // But for local state creation, we need to build it or use the ID if we switch to path-based IDs
        // For now, let's assume the server will handle the flat ID structure mapping if we stick to local IDs,
        // OR we switch entirely to server-side IDs.
        
        // Simpler approach: Just send the content and let server save by ID if it matches path
        // For Create, we need to construct path.
        
        // Actually, to fully switch to server-sync, we should probably rely on the server to tell us the IDs
        // But for "Hybrid" mode where we want instant feedback, we keep local optimistic updates.
        
        // Let's implement basic "save on change" for file content in StrategyEditor, 
        // and here we handle Create/Delete/Rename/Move sync.
        return id; 
    };

    const saveFS = async () => {
        setFSNodes(fs.serialize());
        // We don't save the whole tree to server, we assume individual ops handled it
        // But if we want to "Save All Structure", we might need an endpoint.
        // For now, let's just trigger individual API calls in the handlers below.
    };

    const handleCreateFile = () => {
        setCreatingType('file');
        setNewItemName('');
    };

    const handleCreateDir = () => {
        setCreatingType('directory');
        setNewItemName('');
    };

    const handleCancelCreate = () => {
        setCreatingType(null);
        setNewItemName('');
    };

    const handleConfirmCreate = async () => {
        if (!newItemName.trim() || !creatingType) return;
        try {
            // Safe parent resolution
            let parentId = fs.getRootId();
            if (selectedId) {
                try {
                    const node = fs.getNode(selectedId);
                    if (node.type === 'directory') {
                        parentId = selectedId;
                    } else if (node.parentId) {
                         parentId = node.parentId;
                    }
                } catch {
                    // Selected ID no longer exists, default to root
                    parentId = fs.getRootId();
                }
            }
            
            // Optimistic Update
            let newId;
            if (creatingType === 'file') {
                const file = fs.createFile(parentId, newItemName + (newItemName.endsWith('.js') ? '' : '.js'), "// New Strategy");
                newId = file.id;
                
                // Server Sync
                // We need to construct the full path for the server
                // This is tricky if IDs are UUIDs locally but Paths remotely.
                // ideally we switch to using Paths as IDs everywhere.
                
                // For this iteration, let's just create the file with the relative path from root
                // We need to traverse up from parentId to build path
                let current = parentId;
                let pathParts = [];
                while (current !== fs.getRootId()) {
                    const node = fs.getNode(current);
                    pathParts.unshift(node.name);
                    current = node.parentId!;
                }
                const fullPath = [...pathParts, newItemName + (newItemName.endsWith('.js') ? '' : '.js')].join('/');
                
                await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: fullPath, content: "// New Strategy" })
                });

            } else {
                const dir = fs.createDirectory(parentId, newItemName);
                newId = dir.id;
                
                let current = parentId;
                let pathParts = [];
                while (current !== fs.getRootId()) {
                    const node = fs.getNode(current);
                    pathParts.unshift(node.name);
                    current = node.parentId!;
                }
                const fullPath = [...pathParts, newItemName].join('/');
                
                await fetch('/api/create-dir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: fullPath })
                });
            }
            
            saveFS();
            setCreatingType(null);
            setNewItemName('');
            
            // Refresh from server to get canonical IDs (Paths)
            useSimulationStore.getState().syncWithServer();
            
        } catch (e: any) {
            setError(e.message);
            setTimeout(() => setError(null), 3000);
        }
    };
    
    const handleDelete = () => {
        if (!selectedId) return;
        
        setDialog({
            isOpen: true,
            title: "Delete Item",
            message: "Are you sure you want to delete this item? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    // Get Path
                    // If we synced with server, ID is the path
                    // If local UUID, we might fail.
                    // Let's try sending ID as path
                    await fetch('/api/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: selectedId })
                    });
                    
                    fs.delete(selectedId);
                    saveFS();
                    if (selectedId === currentFileId) {
                        setCurrentFileId(null);
                    }
                    setSelectedId(null);
                    setDialog(prev => ({ ...prev, isOpen: false }));
                    
                    useSimulationStore.getState().syncWithServer();
                } catch (e: any) {
                    setError(e.message);
                    setTimeout(() => setError(null), 3000);
                }
            }
        });
    };

    const handleDuplicate = async () => {
        if (!selectedId) return;
        try {
            const res = await fetch('/api/duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedId })
            });
            const data = await res.json();
            
            if (data.success) {
                // Refresh list
                useSimulationStore.getState().syncWithServer();
                // We could optimistically update local FS but duplication logic is complex (recursive),
                // simpler to just wait for sync.
            } else {
                setError(data.error);
                setTimeout(() => setError(null), 3000);
            }
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

    const handleFinishRename = async () => {
        if (!editingId) return;
        try {
            if (renameValue !== fs.getNode(editingId).name) {
                // Determine old and new paths
                // Since ID is the path (in sync mode), or ID is UUID (local mode).
                // If we are renaming, we are effectively moving.
                
                // Construct new path
                // We need to know parent path to construct new path
                // This logic is getting complex with mixed ID types.
                // Assuming ID = Path for now as per sync logic
                
                // Wait, if ID = Path, then renaming changes the ID.
                // The backend expects { oldId, newId }
                
                // Let's assume editingId is the OLD path (or ID)
                // We need to construct NEW path.
                const node = fs.getNode(editingId);
                const parentId = node.parentId;
                
                // Construct parent path
                let pathParts = [];
                let current = parentId;
                while (current && current !== fs.getRootId()) {
                    const pNode = fs.getNode(current);
                    pathParts.unshift(pNode.name);
                    current = pNode.parentId;
                }
                
                const newName = renameValue + (node.type === 'file' && !renameValue.endsWith('.js') ? '.js' : '');
                const newPath = [...pathParts, newName].join('/');
                
                // Call API
                await fetch('/api/rename', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldId: editingId, newId: newPath })
                });

                fs.rename(editingId, newName);
                saveFS();
                
                // Clear editing/selected state BEFORE sync to prevent trying to render deleted ID
                setEditingId(null);
                if (selectedId === editingId) {
                     setSelectedId(newPath); // Optimistically select new path (assuming ID=Path)
                     setCurrentFileId(newPath); 
                }
                
                useSimulationStore.getState().syncWithServer();
            } else {
                setEditingId(null);
            }
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

    // Helper to perform move on server
    const performMove = async (draggedId: string, newParentId: string) => {
        try {
            const draggedNode = fs.getNode(draggedId);
            // If moving to same parent, do nothing (server doesn't support manual reordering yet)
            if (draggedNode.parentId === newParentId) return;

            const isRoot = newParentId === fs.getRootId();
            
            // Construct new path
            // We assume ID of folder is its path (e.g. "Folder")
            // New path = "Folder/File.js"
            let newPath = draggedNode.name;
            if (!isRoot) {
                newPath = `${newParentId}/${draggedNode.name}`;
            }
            
            await fetch('/api/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldId: draggedId, newId: newPath })
            });
            
            useSimulationStore.getState().syncWithServer();
            
        } catch (e: any) {
            setError(e.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-primary/10');
        
        const draggedId = e.dataTransfer.getData('application/fs-node');
        if (!draggedId || draggedId === targetId) return;

        try {
            const targetNode = fs.getNode(targetId);
            
            // Determine destination parent
            let destParentId = targetId;
            if (targetNode.type === 'file') {
                // If dropping on a file, move to its parent
                destParentId = targetNode.parentId!;
            }
            
            await performMove(draggedId, destParentId);

        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleRootDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('application/fs-node');
        if (!draggedId) return;
        
        try {
            await performMove(draggedId, fs.getRootId());
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
        let node;
        try {
            node = fs.getNode(nodeId);
        } catch {
            return null;
        }
        
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
                         handleAutoScroll(e);
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
                        <Tooltip content={node.name} className="truncate flex-1 select-none">
                            <span className="truncate">{node.name}</span>
                        </Tooltip>
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

    // Safe node getter for render logic
    const getSafeNode = (id: string | null) => {
        if (!id) return null;
        try {
            return fs.getNode(id);
        } catch {
            return null;
        }
    };

    const selectedNode = getSafeNode(selectedId);

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
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleDuplicate} disabled={!selectedId} title="Duplicate">
                        <Copy className="w-3 h-3" />
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
            <div className="flex-1 overflow-auto p-2 custom-scrollbar relative" ref={scrollContainerRef}>
                {renderTree(fs.getRootId())}
            </div>

            {/* Status Bar */}
            <div className="p-1 border-t border-white/5 bg-white/5 text-[10px] text-muted-foreground flex justify-between px-2">
                <span>{selectedNode ? selectedNode.name : 'No selection'}</span>
                <span>{selectedNode && selectedNode.type === 'file' ? `${(selectedNode as FileNode).content.length} B` : ''}</span>
            </div>
        </div>
    );
};
