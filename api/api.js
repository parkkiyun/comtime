const axios = require('axios');

const TARGET_URL = 'http://xn--s39aqy283b66bj2x.kr';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Extract the API path from the request URL
    const url = new URL(req.url, `https://${req.headers.host}`);
    let apiPath = url.pathname.replace('/api/api/', '').replace('/api/', '');
    
    // If no specific path, return error
    if (!apiPath || apiPath === '/') {
      return res.status(400).json({ error: 'API path required' });
    }
    
    const response = await axios.get(`${TARGET_URL}/${apiPath}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...req.headers
      },
      params: Object.fromEntries(url.searchParams)
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};