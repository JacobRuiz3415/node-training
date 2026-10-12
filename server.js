const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Configure Port and MIME Type Mapping
const PORT = 8080;
const MIME_TYPES = {
    '.js': 'application/javascript',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.html': 'text/html',
    '.css': 'text/css'
};