const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// The Proxy Route
app.get('/proxy', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('URL is required');
    }

    try {
        // Validate URL format and default to HTTPS
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;

        const response = await axios.get(targetUrl, {
            // Use arraybuffer for binary content (like images, fonts)
            responseType: 'arraybuffer',
            headers: {
                // Mimic a standard browser user agent to avoid being blocked
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Strip security headers that prevent embedding (crucial for proxying)
        const headersToStrip = [
            'x-frame-options',
            'content-security-policy',
            'x-content-type-options',
            'strict-transport-security' // Often causes issues when proxying
        ];

        // Forward allowed headers to the client
        Object.keys(response.headers).forEach(key => {
            if (!headersToStrip.includes(key.toLowerCase())) {
                res.setHeader(key, response.headers[key]);
            }
        });

        // Send the data buffer back
        res.send(response.data);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        // Provide a clearer error message in the console and to the client
        res.status(500).send(`Error fetching URL. Possible issues: Invalid URL, site is blocking the request, or a network error. Details: ${error.message}`);
    }
});

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
