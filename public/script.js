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

// Initialize
async function init() {
    await loadPorts();

    // Default to current timestamp if not set
    if (!filenameInput.value) {
        filenameInput.value = getFormattedTimestamp();
    }
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

// Load available serial ports
async function loadPorts() {
    try {
        const response = await fetch('/api/ports');
        const ports = await response.json();

        // Preserve selection if possible
        const currentSelection = portSelect.value;

        portSelect.innerHTML = '<option value="">Select Port</option>';
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port.path;
            option.textContent = `${port.path} ${port.manufacturer || ''}`;
            portSelect.appendChild(option);
        });

        if (currentSelection) {
            portSelect.value = currentSelection;
        }
    } catch (err) {
        console.error('Failed to load ports:', err);
    }
}

// Set Filename Button (Logic mostly client-side now)
setFilenameBtn.addEventListener('click', () => {
    const filename = filenameInput.value;
    if (!filename) return alert('Please enter a filename');
    alert('Filename set for this session: ' + filename);
});

// Connect
connectBtn.addEventListener('click', async () => {
    const path = portSelect.value;
    const baudRate = baudRateSelect.value;
    const filename = filenameInput.value;

    if (!path) return alert('Please select a port');
    if (!filename) return alert('Please enter a filename');

    try {
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, baudRate, filename })
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
    const path = portSelect.value;
    if (!path) return;

    try {
        const response = await fetch('/api/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
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
    const filename = filenameInput.value;

    if (!data) return;
    if (!filename) return alert('Please enter a filename to log mock data to.');

    try {
        await fetch('/api/mock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, filename })
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

    // We allow changing ports only when disconnected
    portSelect.disabled = connected;
    baudRateSelect.disabled = connected;

    // Mock group display
    if (!connected) {
        mockGroup.style.display = 'block';
    } else {
        mockGroup.style.display = 'none';
    }
}

// Poll Data
async function fetchData() {
    const filename = filenameInput.value;
    if (!filename) return;

    try {
        const response = await fetch(`/api/data?filename=${encodeURIComponent(filename)}`);
        const result = await response.json();
        if (result.content !== undefined) {
            dataDisplay.textContent = result.content;
            dataDisplay.scrollTop = dataDisplay.scrollHeight;
        }
    } catch (err) {
        console.error('Polling error:', err);
    }
}

// Start polling
setInterval(fetchData, 1000);

init();
