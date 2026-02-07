# Serial Data Logger

A web-based application for logging and monitoring serial data from external devices (e.g., RS232 converters). Built with Node.js, Express, and SerialPort.

## Features

- **Real-time Data Logging**: Captures incoming serial data and saves it to text files.
- **Automatic Filename Generation**: Defaults to the current timestamp (`YYYYMMDDHHmm.txt`) for easy organization.
- **Live Monitoring**: Displays received data in real-time on the dashboard.
- **Connection Management**:
    - Scans and lists available serial ports.
    - Supports configurable baud rates (9600, 19200, 38400, 57600, 115200).
- **Mock Data Simulation**: Allows manual data entry for testing without a physical device (enabled when disconnected).

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- Drivers for your specific Serial-to-USB converter (if applicable)

## Installation

1.  Clone or download the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

1.  Start the server:
    ```bash
    node server.js
    ```
    The server will start at `http://localhost:3000`.

2.  Open your browser and navigate to `http://localhost:3000`.

3.  **Configure Logging**:
    - The filename defaults to the current date/time. You can modify it and click "Set Filename".

4.  **Connect to Device**:
    - Select the COM port from the dropdown.
    - Select the Baud Rate.
    - Click "Connect".

5.  **View Data**:
    - Incoming data will appear in the "Live Data" section and also be appended to the log file in the project directory.

6.  **Simulation (Optional)**:
    - If no device is connected, use the "Mock Data" section to type and send test data.

## Project Structure

- `server.js`: Main backend logic (Express server, SerialPort handling).
- `public/`: Frontend assets (HTML, CSS, JS).
- `public/script.js`: Client-side logic for UI updates and API calls.
- `*.txt`: Generated log files (ignored by git).
