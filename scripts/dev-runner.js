import { spawn } from 'child_process';
import net from 'net';

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
        const apiPort = await findFreePort(3001);
        console.log(`[Dev Runner] Found free port for API: ${apiPort}`);

        process.env.API_PORT = apiPort.toString();

        // Start Backend
        const backend = spawn('node', ['server/server.js'], {
            stdio: 'inherit',
            env: process.env,
            shell: true
        });

        // Start Frontend (Vite)
        // Vite will read process.env.API_PORT from the environment we passed
        const frontend = spawn('npx', ['vite', '--host'], {
            stdio: 'inherit',
            env: process.env,
            shell: true
        });

        // Handle cleanup
        const cleanup = () => {
            backend.kill();
            frontend.kill();
            process.exit();
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('exit', cleanup);

    } catch (e) {
        console.error("Failed to start dev environment:", e);
        process.exit(1);
    }
};

start();
