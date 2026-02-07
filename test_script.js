const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        const req = http.request(options, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3000${path}`, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log('Testing Ports...');
        const ports = await get('/api/ports');
        console.log('Ports:', ports);

        console.log('Testing Filename...');
        const filenameRes = await post('/api/filename', JSON.stringify({ filename: 'node_test_log' }));
        console.log('Filename Set:', filenameRes);

        console.log('Testing Mock Data...');
        const mockRes = await post('/api/mock', JSON.stringify({ data: 'Hello from Node Test' }));
        console.log('Mock Data Sent:', mockRes);

        console.log('Testing Get Data...');
        const dataRes = await get('/api/data');
        console.log('Data Retrieved:', dataRes);

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

run();
