const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Map to store active connections
// Key: portPath, Value: { port: SerialPort, parser: ReadlineParser, filename: String, clients: Set<String> } 
// Note: We might have multiple clients listening to one port, but we only have one filename per port for logging in this simple model.
// Or effectively, we map Port -> LogFile.
const connections = new Map();

// Helper to generate default filename (yyyymmddhhmm)
function generateFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}.txt`;
}

// Ensure the file exists
function ensureFileExists(filename) {
    // If no filename provided, use default
    if (!filename) filename = generateFilename();
    // Ensure .txt extension
    if (!filename.endsWith('.txt')) filename += '.txt';

    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf8');
    }
    return filePath;
}

// Append data to file
function logData(filename, data) {
    // Basic validation
    if (!filename) return;

    // Ensure extension for safety if passed purely as name
    const safeFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;

    const filePath = ensureFileExists(safeFilename);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${data}\n`;
    fs.appendFileSync(filePath, logEntry, 'utf8');
    console.log(`Logged: ${data.trim()} to ${safeFilename}`);
}

// API: Get available ports
app.get('/api/ports', async (req, res) => {
    try {
        const ports = await SerialPort.list();
        res.json(ports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Connect to port
app.post('/api/connect', (req, res) => {
    const { path: portPath, baudRate, filename } = req.body;

    if (!portPath) return res.status(400).json({ error: 'Port path is required' });
    if (!filename) return res.status(400).json({ error: 'Filename is required' });

    if (connections.has(portPath)) {
        return res.status(409).json({ error: 'Port is already in use' });
    }

    try {
        const port = new SerialPort({ path: portPath, baudRate: parseInt(baudRate) || 9600 });
        const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

        connections.set(portPath, { port, parser, filename });

        port.on('open', () => {
            console.log(`Connected to ${portPath}, logging to ${filename}`);
        });

        parser.on('data', (data) => {
            console.log(`Data received from ${portPath}: ${data}`);
            // Get current filename for this port (in case it changes dynamically, though simplistic here)
            const conn = connections.get(portPath);
            if (conn) {
                logData(conn.filename, data);
            }
        });

        port.on('error', (err) => {
            console.error(`Error on ${portPath}:`, err.message);
            // Optionally remove connection on fatal error
        });

        // Handle close
        port.on('close', () => {
            console.log(`Connection to ${portPath} closed`);
            connections.delete(portPath);
        });

        res.json({ message: 'Connected', port: portPath, filename: filename });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Disconnect
app.post('/api/disconnect', (req, res) => {
    const { path: portPath } = req.body;

    if (!portPath) return res.status(400).json({ error: 'Port path is required' });

    const conn = connections.get(portPath);
    if (conn && conn.port.isOpen) {
        conn.port.close((err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            connections.delete(portPath);
            res.json({ message: 'Disconnected' });
        });
    } else {
        // Just ensure it's removed if it was lingering
        connections.delete(portPath);
        res.json({ message: 'No active connection or already disconnected' });
    }
});

// API: Mock data
app.post('/api/mock', (req, res) => {
    const { data, filename } = req.body;
    if (data && filename) {
        logData(filename, data);
        res.json({ message: 'Mock data logged' });
    } else {
        res.status(400).json({ error: 'Data and filename are required' });
    }
});

// API: Get file content (Poll)
app.get('/api/data', (req, res) => {
    const filename = req.query.filename;
    if (!filename) return res.json({ content: '' });

    const safeFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    const filePath = path.join(__dirname, safeFilename);

    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ content });
    } else {
        res.json({ content: '' });
    }
});

// API: Get capabilities and status
app.get('/api/status', (req, res) => {
    // Return list of active ports
    const activePorts = Array.from(connections.keys());
    res.json({
        activePorts: activePorts
    });
});

// API: Serve .txt logs securely from root
app.get('/:filename', (req, res, next) => {
    const filename = req.params.filename;
    // Only serve .txt files
    if (filename.endsWith('.txt')) {
        const filePath = path.join(__dirname, filename);
        // Basic security: avoid directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).send('Invalid filename.');
        }

        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            // Pass to next middleware (404) if not found, or handle here
            res.status(404).send('File not found.');
        }
    } else {
        // Not a txt file, pass to next middleware (e.g., could be another route or 404)
        next();
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Server ready for multi-session connections');
});
