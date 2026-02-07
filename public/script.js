const filenameInput = document.getElementById('filename');
const setFilenameBtn = document.getElementById('setFilenameBtn');
const portSelect = document.getElementById('portSelect');
const baudRateSelect = document.getElementById('baudRate');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const mockInput = document.getElementById('mockInput');
const sendMockBtn = document.getElementById('sendMockBtn');
const dataDisplay = document.getElementById('dataDisplay');
const mockGroup = document.getElementById('mockGroup');

let isConnected = false;
let pollingInterval = null;

// Initialize
async function init() {
    await loadPorts();
    await checkStatusAndFilename();
}

// Generate YYYYMMDDHHmm timestamp
function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
}

// Check server status and load filename
async function checkStatusAndFilename() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const status = await response.json();

            // Update connection state
            setConnectedState(status.isConnected);
            if (status.isConnected && status.port) {
                // If connected, select the port in dropdown if available
                portSelect.value = status.port;
            }

            // Filename logic
            if (status.isConnected) {
                // If connected, show the active filename
                filenameInput.value = status.filename;
            } else {
                // If not connected, propose a new fresh filename (current timestamp)
                filenameInput.value = getFormattedTimestamp();
            }
        } else {
            // Fallback if status endpoint fails (e.g. older server version)
            loadFilename();
            // Default to not connected
            setConnectedState(false);
        }
    } catch (err) {
        console.error('Failed to load status:', err);
        // Fallback
        filenameInput.value = getFormattedTimestamp();
    }
}

// Legacy load filename (fallback)
async function loadFilename() {
    try {
        const response = await fetch('/api/filename');
        const result = await response.json();
        if (result.filename) {
            filenameInput.value = result.filename;
        }
    } catch (err) {
        console.error('Failed to load filename:', err);
    }
}

// Load available serial ports
async function loadPorts() {
    try {
        const response = await fetch('/api/ports');
        const ports = await response.json();

        portSelect.innerHTML = '<option value="">Select Port</option>';
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port.path;
            option.textContent = `${port.path} ${port.manufacturer || ''}`;
            portSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to load ports:', err);
    }
}

// Set Filename
setFilenameBtn.addEventListener('click', async () => {
    const filename = filenameInput.value;
    if (!filename) return alert('Please enter a filename');

    try {
        const response = await fetch('/api/filename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        const result = await response.json();
        alert(result.message + ': ' + result.filename);
    } catch (err) {
        console.error('Error setting filename:', err);
    }
});

// Connect
connectBtn.addEventListener('click', async () => {
    const path = portSelect.value;
    const baudRate = baudRateSelect.value;

    if (!path) return alert('Please select a port');

    try {
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, baudRate })
        });

        if (response.ok) {
            const result = await response.json();
            console.log(result.message);
            setConnectedState(true);
        } else {
            const err = await response.json();
            alert('Connection failed: ' + err.error);
        }
    } catch (err) {
        console.error('Connection error:', err);
    }
});

// Disconnect
disconnectBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/disconnect', { method: 'POST' });
        if (response.ok) {
            setConnectedState(false);
        }
    } catch (err) {
        console.error('Disconnect error:', err);
    }
});

// Send Mock Data
sendMockBtn.addEventListener('click', async () => {
    const data = mockInput.value;
    if (!data) return;

    try {
        await fetch('/api/mock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data })
        });
        mockInput.value = ''; // Clear input
        // Immediate fetch to show update
        fetchData();
    } catch (err) {
        console.error('Mock data error:', err);
    }
});

// UI State Management
function setConnectedState(connected) {
    isConnected = connected;
    connectBtn.disabled = connected;
    disconnectBtn.disabled = !connected;
    portSelect.disabled = connected;
    baudRateSelect.disabled = connected;

    // Determine if mock data should be allowed. 
    // Requirement says: "mock data... if status is disconnect"
    // So we enable mock group only if NOT connected? 
    // Usually mock is for testing, so let's follow requirement strictly.
    if (!connected) {
        mockGroup.style.display = 'block';
    } else {
        mockGroup.style.display = 'none';
        // Or specific requirement: "textbox for mock data if status is disconnect"
    }
}

// Poll Data
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const result = await response.json();
        if (result.content !== undefined) {
            // Only update if content changed to avoid cursor jumping if we were editing (but it's a pre tag)
            // For simple display, just replace
            dataDisplay.textContent = result.content;
            // Auto scroll to bottom
            dataDisplay.scrollTop = dataDisplay.scrollHeight;
        }
    } catch (err) {
        console.error('Polling error:', err);
    }
}

// Start polling
setInterval(fetchData, 1000);

init();
