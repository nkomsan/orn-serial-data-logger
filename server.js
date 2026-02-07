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

let currentPort = null;
let currentParser = null;
let currentFilename = generateFilename();

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
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf8');
    }
    return filePath;
}

// Append data to file
function logData(data) {
    const filePath = ensureFileExists(currentFilename);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${data}\n`;
    fs.appendFileSync(filePath, logEntry, 'utf8');
    console.log(`Logged: ${data.trim()} to ${currentFilename}`);
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
    const { path: portPath, baudRate } = req.body;

    if (currentPort && currentPort.isOpen) {
        currentPort.close();
    }

    try {
        currentPort = new SerialPort({ path: portPath, baudRate: parseInt(baudRate) || 9600 });
        currentParser = currentPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

        currentPort.on('open', () => {
            console.log(`Connected to ${portPath}`);
        });

        currentParser.on('data', (data) => {
            console.log(`Data received from port: ${data}`);
            logData(data);
        });

        currentPort.on('error', (err) => {
            console.error('Error: ', err.message);
        });

        res.json({ message: 'Connected', port: portPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Disconnect
app.post('/api/disconnect', (req, res) => {
    if (currentPort && currentPort.isOpen) {
        currentPort.close((err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            currentPort = null;
            res.json({ message: 'Disconnected' });
        });
    } else {
        res.json({ message: 'No active connection' });
    }
});

// API: Get current filename
app.get('/api/filename', (req, res) => {
    res.json({ filename: currentFilename });
});

// API: Set filename
app.post('/api/filename', (req, res) => {
    const { filename } = req.body;
    if (filename) {
        currentFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
        ensureFileExists(currentFilename);
        res.json({ message: 'Filename updated', filename: currentFilename });
    } else {
        res.status(400).json({ error: 'Filename is required' });
    }
});

// API: Mock data
app.post('/api/mock', (req, res) => {
    const { data } = req.body;
    if (data) {
        logData(data);
        res.json({ message: 'Mock data logged' });
    } else {
        res.status(400).json({ error: 'Data is required' });
    }
});

// API: Get file content
app.get('/api/data', (req, res) => {
    const filePath = path.join(__dirname, currentFilename);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ content });
    } else {
        res.json({ content: '' });
    }
});

// API: Get capabilities and status
app.get('/api/status', (req, res) => {
    res.json({
        isConnected: !!(currentPort && currentPort.isOpen),
        port: currentPort && currentPort.isOpen ? currentPort.path : null,
        filename: currentFilename
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Default filename: ${currentFilename}`);
});
