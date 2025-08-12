const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url } = req.query;
  
  if (!url) {
    res.status(400).send('URL parameter is required');
    return;
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    
    const response = await axios.get(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || 'text/html; charset=utf-8';
    let html = response.data.toString('utf-8');
    
    // Handle Korean encoding
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      const encoding = contentType.includes('euc-kr') ? 'euc-kr' : 'utf-8';
      const iconv = require('iconv-lite');
      html = iconv.decode(response.data, encoding);
    }

    const $ = cheerio.load(html);
    
    // Get base URL for relative paths
    const baseUrl = new URL(decodedUrl);
    const baseHref = `${baseUrl.protocol}//${baseUrl.host}`;
    
    // Add base tag for relative URLs
    $('head').prepend(`<base href="${baseHref}/">`);
    
    // Convert all HTTP resources to use our proxy
    $('script').each(function() {
      const src = $(this).attr('src');
      if (src) {
        if (!src.startsWith('http')) {
          $(this).attr('src', new URL(src, baseHref).href);
        } else if (src.startsWith('http://')) {
          // Try to use HTTPS version
          $(this).attr('src', src.replace('http://', 'https://'));
        }
      }
    });
    
    $('link').each(function() {
      const href = $(this).attr('href');
      if (href) {
        if (!href.startsWith('http')) {
          $(this).attr('href', new URL(href, baseHref).href);
        } else if (href.startsWith('http://')) {
          $(this).attr('href', href.replace('http://', 'https://'));
        }
      }
    });
    
    $('img').each(function() {
      const src = $(this).attr('src');
      if (src) {
        if (!src.startsWith('http')) {
          const fullUrl = new URL(src, baseHref).href;
          if (fullUrl.startsWith('http://')) {
            const proxyUrl = `https://comtime-proxy-nm9nr7w8u-parkkiyuns-projects.vercel.app/api/image?url=${encodeURIComponent(fullUrl)}`;
            $(this).attr('src', proxyUrl);
          } else {
            $(this).attr('src', fullUrl);
          }
        } else if (src.startsWith('http://')) {
          const proxyUrl = `https://comtime-proxy-nm9nr7w8u-parkkiyuns-projects.vercel.app/api/image?url=${encodeURIComponent(src)}`;
          $(this).attr('src', proxyUrl);
        }
      }
    });
    
    // Handle nested iframes
    $('iframe').each(function() {
      const src = $(this).attr('src');
      if (src) {
        if (!src.startsWith('http')) {
          const fullUrl = new URL(src, baseHref).href;
          if (fullUrl.startsWith('http://')) {
            const proxyUrl = `https://comtime-proxy-nm9nr7w8u-parkkiyuns-projects.vercel.app/api/iframe?url=${encodeURIComponent(fullUrl)}`;
            $(this).attr('src', proxyUrl);
          } else {
            $(this).attr('src', fullUrl);
          }
        } else if (src.startsWith('http://')) {
          const proxyUrl = `https://comtime-proxy-nm9nr7w8u-parkkiyuns-projects.vercel.app/api/iframe?url=${encodeURIComponent(src)}`;
          $(this).attr('src', proxyUrl);
        }
      }
    });
    
    // Add some basic styling
    $('head').append(`
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: auto;
        }
      </style>
    `);

    // Remove X-Frame-Options header
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    res.send($.html());
  } catch (error) {
    console.error('Iframe proxy error:', error.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: sans-serif;
            padding: 20px;
            text-align: center;
            background: #f5f5f5;
          }
        </style>
      </head>
      <body>
        <p>Failed to load iframe content</p>
        <small>${error.message}</small>
      </body>
      </html>
    `);
  }
};