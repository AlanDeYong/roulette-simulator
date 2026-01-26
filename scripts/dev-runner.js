import { spawn } from 'child_process';
console.log("SCRIPT LOADED");
import net from 'net';
import fs from 'fs';

const logFile = fs.createWriteStream('dev-runner-debug.log', { flags: 'a' });
const log = (msg) => {
    const line = `[Dev Runner] ${msg}\n`;
    process.stdout.write(line);
    logFile.write(line);
};

// Helper to find a free port
const findFreePort = (startPort) => {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            server.close(() => resolve(startPort));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findFreePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
};

const start = async () => {
    try {
        log("Starting...");
        const apiPort = await findFreePort(3001);
        log(`Found free port for API: ${apiPort}`);

        const env = { ...process.env, API_PORT: apiPort.toString() };

        // Start Backend
        log("Spawning Backend...");
        const backend = spawn('node', ['server/server.js'], {
            stdio: 'pipe',
            env: env,
            shell: true
        });

        backend.stdout.on('data', d => log(`[Backend] ${d.toString().trim()}`));
        backend.stderr.on('data', d => log(`[Backend ERR] ${d.toString().trim()}`));
        backend.on('exit', code => log(`Backend exited with code ${code}`));
        backend.on('error', err => log(`Backend failed to start: ${err}`));

        // Start Frontend (Vite)
        log("Spawning Frontend...");
        const frontend = spawn('node', ['./node_modules/vite/bin/vite.js', '--host'], {
            stdio: 'pipe',
            env: env,
            shell: true
        });

        frontend.stdout.on('data', d => log(`[Frontend] ${d.toString().trim()}`));
        frontend.stderr.on('data', d => log(`[Frontend ERR] ${d.toString().trim()}`));
        frontend.on('exit', code => log(`Frontend exited with code ${code}`));
        frontend.on('error', err => log(`Frontend failed to start: ${err}`));

        // Handle cleanup
        const cleanup = (signal) => {
            log(`Cleanup triggered by ${signal}`);
            try {
                backend.kill();
                frontend.kill();
            } catch (e) {
                log(`Error during kill: ${e}`);
            }
            if (signal !== 'exit') {
                process.exit();
            }
        };

        process.on('SIGINT', () => cleanup('SIGINT'));
        process.on('SIGTERM', () => cleanup('SIGTERM'));
        process.on('exit', () => cleanup('exit'));

        // Keep the process alive
        log("Setup complete, keeping alive...");
        setInterval(() => {}, 1000);

    } catch (e) {
        log(`Failed to start dev environment: ${e}`);
        process.exit(1);
    }
};

start();
