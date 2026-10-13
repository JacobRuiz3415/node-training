const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Configure Port and MIME Type Mapping
const PORT = 8080;
const MIME_TYPES = {
    '.js': 'application/javascript',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.html': 'text/html',
    '.css': 'text/css'
};

// 2. Initialize the Server
const server = http.createServer((req, res) => {
    // Prevent directory traversal vulnerabilities by parsing safe paths
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath).toLowerCase();
    
    // Resolve proper MIME Type, fallback to octet-stream if unknown
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // 3. Check if the static asset exists on disk
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Handle File Not Found
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404: Resource Not Found');
            return;
        }

        // 4. Stream the dynamic file to the local browser port
        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        
        // Handle stream errors (e.g., file permissions issues during read)
        stream.on('error', (streamErr) => {
            console.error(streamErr);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500: Internal Server Error');
            }
        });

        // Pipe the file chunks directly to the HTTP response wrapper
        stream.pipe(res);
    });
});

// 5. Start Listening on targeted port
server.listen(PORT, () => {
    console.log(`Server successfully running at http://localhost:${PORT}/`);
});