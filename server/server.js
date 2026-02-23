import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting server script...");

const app = express();
// Allow port to be set via environment variable, default to 3001 if not provided
const PORT = process.env.API_PORT || 3001;
const STRATEGIES_DIR = path.join(__dirname, '../strategies');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Helper to ensure directory exists
async function ensureDir() {
    try {
        await fs.access(STRATEGIES_DIR);
    } catch {
        await fs.mkdir(STRATEGIES_DIR, { recursive: true });
    }
}

// Helper to map FS to Virtual Node structure
// We will flatten the structure for now or recursively build it
// The frontend VirtualFileSystem expects a flat map of ID -> Node
// To simplify syncing, we will treat the file path (relative to strategies/) as the ID.
async function buildFileTree(dir, parentId = 'root') {
    const nodes = {};
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(STRATEGIES_DIR, fullPath).replace(/\\/g, '/'); // Normalize separators
        const id = relativePath; // Use path as ID for stability
        
        const stats = await fs.stat(fullPath);
        
        if (entry.isDirectory()) {
            nodes[id] = {
                id,
                parentId: parentId === 'root' ? (await getRootId()) : parentId,
                name: entry.name,
                type: 'directory',
                children: [], // Will fill later
                metadata: {
                    createdAt: stats.birthtimeMs,
                    updatedAt: stats.mtimeMs,
                    size: 0
                }
            };
            
            // Recursively get children
            const childNodes = await buildFileTree(fullPath, id);
            Object.assign(nodes, childNodes);
            
            // Link children
            Object.values(childNodes).forEach(child => {
                if (child.parentId === id) {
                    nodes[id].children.push(child.id);
                }
            });

        } else {
            // It's a file
            // Allow .js, .txt, .json, .csv
            if (!entry.name.match(/\.(js|txt|json|csv)$/i)) continue;

            const content = await fs.readFile(fullPath, 'utf-8');
            nodes[id] = {
                id,
                parentId: parentId === 'root' ? (await getRootId()) : parentId,
                name: entry.name,
                type: 'file',
                content,
                metadata: {
                    createdAt: stats.birthtimeMs,
                    updatedAt: stats.mtimeMs,
                    size: content.length
                }
            };
        }
    }
    return nodes;
}

// Special Root handling
async function getRootId() {
    // We treat the strategies folder itself as the parent of top-level items
    // But the VirtualFS needs a 'root' node.
    return 'root-node-id'; // Constant ID for root
}

// GET /api/files - Return full FS state
app.get('/api/files', async (req, res) => {
    try {
        await ensureDir();
        const rootId = await getRootId();
        
        const rootNode = {
            id: rootId,
            parentId: null,
            name: 'Strategies',
            type: 'directory',
            children: [],
            metadata: { createdAt: Date.now(), updatedAt: Date.now(), size: 0 }
        };

        const fileNodes = await buildFileTree(STRATEGIES_DIR, rootId);
        
        // Link top-level items to root
        Object.values(fileNodes).forEach(node => {
            if (node.parentId === rootId) {
                rootNode.children.push(node.id);
            }
        });

        // Sort root children: Directories first, then Files, alphabetically
        rootNode.children.sort((a, b) => {
            const nodeA = fileNodes[a];
            const nodeB = fileNodes[b];
            if (nodeA.type !== nodeB.type) return nodeA.type === 'directory' ? -1 : 1;
            return nodeA.name.localeCompare(nodeB.name);
        });

        // Sort children of all other directories
        Object.values(fileNodes).forEach(node => {
            if (node.type === 'directory' && node.children.length > 0) {
                node.children.sort((a, b) => {
                    const childA = fileNodes[a];
                    const childB = fileNodes[b];
                    // Safety check if child exists (it should)
                    if (!childA || !childB) return 0;
                    if (childA.type !== childB.type) return childA.type === 'directory' ? -1 : 1;
                    return childA.name.localeCompare(childB.name);
                });
            }
        });

        const allNodes = { [rootId]: rootNode, ...fileNodes };
        res.json(allNodes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/save - Save a file
app.post('/api/save', async (req, res) => {
    try {
        const { id, content } = req.body;
        // ID is relative path: "MyFolder/MyStrat.js"
        if (!id || content === undefined) return res.status(400).json({ error: 'Missing id or content' });

        const fullPath = path.join(STRATEGIES_DIR, id);
        
        // Ensure parent dir exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        await fs.writeFile(fullPath, content, 'utf-8');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/delete - Delete a file/folder
app.post('/api/delete', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing id' });

        const fullPath = path.join(STRATEGIES_DIR, id);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
        } else {
            await fs.unlink(fullPath);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rename - Rename/Move
app.post('/api/rename', async (req, res) => {
    try {
        const { oldId, newId } = req.body;
        if (!oldId || !newId) return res.status(400).json({ error: 'Missing ids' });

        const oldPath = path.join(STRATEGIES_DIR, oldId);
        const newPath = path.join(STRATEGIES_DIR, newId);

        // Ensure new parent dir exists
        await fs.mkdir(path.dirname(newPath), { recursive: true });

        await fs.rename(oldPath, newPath);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/create-dir - Create Directory
app.post('/api/create-dir', async (req, res) => {
    try {
        const { id } = req.body; // Relative path
        const fullPath = path.join(STRATEGIES_DIR, id);
        await fs.mkdir(fullPath, { recursive: true });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Helper to copy recursively with renaming if needed
async function copyRecursive(src, dest) {
    const stats = await fs.stat(src);
    if (stats.isDirectory()) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src);
        for (const entry of entries) {
            await copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
    } else {
        await fs.copyFile(src, dest);
    }
}

// POST /api/duplicate - Duplicate file or folder
app.post('/api/duplicate', async (req, res) => {
    try {
        console.log('Duplicate request received:', req.body);
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing id' });

        const srcPath = path.join(STRATEGIES_DIR, id);
        console.log('Source path:', srcPath);
        
        // Verify source exists first
        try {
            await fs.access(srcPath);
        } catch (e) {
            console.error('Source file not found:', srcPath);
            return res.status(404).json({ error: 'Source file not found' });
        }

        const dirname = path.dirname(srcPath);
        const ext = path.extname(id);
        const basename = path.basename(id, ext); // Filename without extension

        let counter = 1;
        let destPath = '';
        let newId = '';

        // Find next available name: "Name (1).js", "Name (2).js"
        while (true) {
            const newName = `${basename} (${counter})${ext}`;
            destPath = path.join(dirname, newName);
            newId = path.join(path.dirname(id), newName).replace(/\\/g, '/'); // Relative path for ID
            
            try {
                await fs.access(destPath);
                counter++;
            } catch {
                // File doesn't exist, we can use this name
                break;
            }
        }
        
        console.log('Destination path:', destPath);

        await copyRecursive(srcPath, destPath);
        res.json({ success: true, newId });
    } catch (err) {
        console.error('Error in /api/duplicate:', err);
        res.status(500).json({ error: err.message });
    }
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Strategies directory: ${STRATEGIES_DIR}`);
});

server.on('error', (e) => {
    console.error('Server error:', e);
});
