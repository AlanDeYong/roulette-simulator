const fs = require('fs');
const path = require('path');

const strategiesDir = path.join(__dirname, 'strategies');

// Files I specifically modified and want to keep my version of
const MY_MODIFIED_FILES = [
    'Bear Hug.js',
    '65 Eliminator.js',
    'Basiers Money Maker.js',
    'Moving Half Moon Hot Cold.js', // Also modified this one
    'Moving Half Moon Hot Only.js' // And this one maybe? Let's check.
];

function resolveFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('<<<<<<< HEAD')) return;

        console.log(`Resolving conflict in: ${filePath}`);

        // Regex to find conflict blocks
        // This is a simple regex assuming standard git markers
        const conflictRegex = /<<<<<<< HEAD([\s\S]*?)=======([\s\S]*?)>>>>>>> origin\/main/g;

        const resolvedContent = content.replace(conflictRegex, (match, localContent, remoteContent) => {
            const localTrimmed = localContent.trim();
            const remoteTrimmed = remoteContent.trim();

            if (localTrimmed === remoteTrimmed) {
                console.log('  -> Identical content (ignoring whitespace). Using Local.');
                return localContent; // Or remote, doesn't matter
            }

            const filename = path.basename(filePath);
            if (MY_MODIFIED_FILES.some(f => filename.includes(f))) {
                console.log('  -> My modified file. Keeping Local (HEAD).');
                return localContent;
            } else {
                console.log('  -> Remote update. Taking Remote (origin/main).');
                return remoteContent;
            }
        });

        fs.writeFileSync(filePath, resolvedContent, 'utf8');

    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            resolveFile(fullPath);
        }
    }
}

console.log('Starting conflict resolution...');
walkDir(strategiesDir);
console.log('Conflict resolution complete.');
