require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/search', async (req, res) => {
    try {
        const { query, page = 0 } = req.body;
        
        const response = await axios.post('https://api.indiankanoon.org/search/', 
            `formInput=${encodeURIComponent(query)}&pagenum=${page}`,
            {
                headers: {
                    'Authorization': 'Token 48eca4ec9c7adba42e81977df79a66c67d61bcbd',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch results',
            details: error.response?.data || error.message
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});