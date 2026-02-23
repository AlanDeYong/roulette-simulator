import { v4 as uuidv4 } from 'uuid';

export type FileType = 'file' | 'directory';

export interface FileSystemMetadata {
    createdAt: number;
    updatedAt: number;
    size: number; // in bytes (characters for string content)
}

export interface FileSystemNode {
    id: string;
    parentId: string | null;
    name: string;
    type: FileType;
    metadata: FileSystemMetadata;
}

export interface FileNode extends FileSystemNode {
    type: 'file';
    content: string;
}

export interface DirectoryNode extends FileSystemNode {
    type: 'directory';
    children: string[]; // IDs of children
}

export type FSNode = FileNode | DirectoryNode;

export class FileSystemError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'FileSystemError';
    }
}

export class VirtualFileSystem {
    private nodes: Map<string, FSNode>;
    private rootId: string;

    constructor(initialNodes?: Record<string, FSNode>) {
        this.nodes = new Map();
        if (initialNodes && Object.keys(initialNodes).length > 0) {
            Object.values(initialNodes).forEach(node => this.nodes.set(node.id, node));
            // Find root (node with no parent or named root)
            const root = Array.from(this.nodes.values()).find(n => n.parentId === null);
            if (root) {
                this.rootId = root.id;
            } else {
                this.rootId = this.createRoot();
            }
        } else {
            this.rootId = this.createRoot();
        }
    }

    private createRoot(): string {
        // Use a constant ID for root to match server sync
        const ROOT_ID = 'root-node-id';
        const root: DirectoryNode = {
            id: ROOT_ID,
            parentId: null,
            name: 'Strategies', // Match server name
            type: 'directory',
            children: [],
            metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                size: 0
            }
        };
        this.nodes.set(root.id, root);
        return root.id;
    }

    public getRootId(): string {
        return this.rootId;
    }

    public serialize(): Record<string, FSNode> {
        return Object.fromEntries(this.nodes);
    }

    public getNode(id: string): FSNode {
        const node = this.nodes.get(id);
        if (!node) throw new FileSystemError('Node not found', 'ENOENT');
        return node;
    }

    public getChildren(dirId: string): FSNode[] {
        const dir = this.getNode(dirId);
        if (dir.type !== 'directory') throw new FileSystemError('Not a directory', 'ENOTDIR');
        return (dir as DirectoryNode).children.map(id => this.getNode(id));
    }

    // --- CRUD ---

    public createFile(parentId: string, name: string, content: string = ''): FileNode {
        this.validateName(name);
        this.checkExists(parentId, name);

        const parent = this.getNode(parentId);
        if (parent.type !== 'directory') throw new FileSystemError('Parent is not a directory', 'ENOTDIR');

        const file: FileNode = {
            id: uuidv4(),
            parentId,
            name,
            type: 'file',
            content,
            metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                size: content.length
            }
        };

        this.nodes.set(file.id, file);
        (parent as DirectoryNode).children.push(file.id);
        this.updateMetadata(parentId);

        return file;
    }

    public createDirectory(parentId: string, name: string): DirectoryNode {
        this.validateName(name);
        this.checkExists(parentId, name);

        const parent = this.getNode(parentId);
        if (parent.type !== 'directory') throw new FileSystemError('Parent is not a directory', 'ENOTDIR');

        const dir: DirectoryNode = {
            id: uuidv4(),
            parentId,
            name,
            type: 'directory',
            children: [],
            metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                size: 0
            }
        };

        this.nodes.set(dir.id, dir);
        (parent as DirectoryNode).children.push(dir.id);
        this.updateMetadata(parentId);

        return dir;
    }

    public readFile(id: string): string {
        const node = this.getNode(id);
        if (node.type !== 'file') throw new FileSystemError('Not a file', 'EISDIR');
        return (node as FileNode).content;
    }

    public writeFile(id: string, content: string): FileNode {
        const node = this.getNode(id);
        if (node.type !== 'file') throw new FileSystemError('Not a file', 'EISDIR');

        const updatedNode = {
            ...node,
            content,
            metadata: {
                ...node.metadata,
                updatedAt: Date.now(),
                size: content.length
            }
        } as FileNode;

        this.nodes.set(id, updatedNode);
        return updatedNode;
    }

    public delete(id: string): void {
        const node = this.getNode(id);
        if (node.id === this.rootId) throw new FileSystemError('Cannot delete root', 'EPERM');

        // Recursive delete for directories
        if (node.type === 'directory') {
            const dir = node as DirectoryNode;
            [...dir.children].forEach(childId => this.delete(childId));
        }

        // Remove from parent
        if (node.parentId) {
            const parent = this.nodes.get(node.parentId) as DirectoryNode;
            if (parent) {
                parent.children = parent.children.filter(childId => childId !== id);
                this.updateMetadata(parent.id);
            }
        }

        this.nodes.delete(id);
    }

    public rename(id: string, newName: string): FSNode {
        this.validateName(newName);
        const node = this.getNode(id);
        if (node.parentId) {
            this.checkExists(node.parentId, newName);
        }

        const updatedNode = {
            ...node,
            name: newName,
            metadata: {
                ...node.metadata,
                updatedAt: Date.now()
            }
        };

        this.nodes.set(id, updatedNode);
        return updatedNode;
    }

    // --- File Manipulation Primitives ---

    public move(id: string, newParentId: string, index?: number): void {
        const node = this.getNode(id);
        const newParent = this.getNode(newParentId);
        
        if (newParent.type !== 'directory') throw new FileSystemError('Destination is not a directory', 'ENOTDIR');
        
        // Cycle detection
        let current: FSNode = newParent;
        while (current.parentId) {
            if (current.id === id) throw new FileSystemError('Cannot move directory into itself', 'EINVAL');
            current = this.nodes.get(current.parentId)!;
        }

        // Check exists only if moving to a different parent
        if (node.parentId !== newParentId) {
            this.checkExists(newParentId, node.name);
        }

        // Remove from old parent
        if (node.parentId) {
            const oldParent = this.nodes.get(node.parentId) as DirectoryNode;
            oldParent.children = oldParent.children.filter(childId => childId !== id);
            this.updateMetadata(oldParent.id);
        }

        // Add to new parent
        node.parentId = newParentId;
        const parentDir = newParent as DirectoryNode;
        
        if (typeof index === 'number' && index >= 0 && index <= parentDir.children.length) {
             parentDir.children.splice(index, 0, id);
        } else {
             parentDir.children.push(id);
        }
        
        this.updateMetadata(newParentId);
        
        this.nodes.set(id, node);
    }

    public copy(id: string, destParentId: string): FSNode {
        const node = this.getNode(id);
        const destParent = this.getNode(destParentId);

        if (destParent.type !== 'directory') throw new FileSystemError('Destination is not a directory', 'ENOTDIR');

        // Generate unique name if collision
        let newName = node.name;
        let counter = 1;
        while (this.childExists(destParentId, newName)) {
            const parts = node.name.split('.');
            const ext = parts.length > 1 ? '.' + parts.pop() : '';
            const base = parts.join('.');
            newName = `${base} (${counter})${ext}`;
            counter++;
        }

        if (node.type === 'file') {
            return this.createFile(destParentId, newName, (node as FileNode).content);
        } else {
            const newDir = this.createDirectory(destParentId, newName);
            const dir = node as DirectoryNode;
            dir.children.forEach(childId => this.copy(childId, newDir.id));
            return newDir;
        }
    }

    // --- Helpers ---

    private validateName(name: string): void {
        if (!name || name.trim() === '') throw new FileSystemError('Invalid name', 'EINVAL');
        if (name.includes('/') || name.includes('\\')) throw new FileSystemError('Invalid characters in name', 'EINVAL');
    }

    private checkExists(parentId: string, name: string): void {
        if (this.childExists(parentId, name)) {
            throw new FileSystemError(`File '${name}' already exists`, 'EEXIST');
        }
    }

    private childExists(parentId: string, name: string): boolean {
        const parent = this.getNode(parentId);
        if (parent.type !== 'directory') return false;
        const children = (parent as DirectoryNode).children.map(id => this.nodes.get(id));
        return children.some(child => child && child.name === name);
    }

    private updateMetadata(id: string): void {
        const node = this.nodes.get(id);
        if (node) {
            node.metadata.updatedAt = Date.now();
            this.nodes.set(id, node);
        }
    }
}

