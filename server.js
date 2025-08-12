const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const TARGET_URL = 'http://xn--s39aqy283b66bj2x.kr';

// Main proxy route
app.get('/proxy', async (req, res) => {
  try {
    const response = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || 'text/html; charset=euc-kr';
    const iconv = require('iconv-lite');
    
    // Try to detect encoding more accurately
    let html;
    try {
      // First try EUC-KR (most Korean sites use this)
      html = iconv.decode(response.data, 'euc-kr');
      
      // If the result contains replacement characters, try UTF-8
      if (html.includes('�')) {
        html = iconv.decode(response.data, 'utf-8');
        
        // If still has issues, try CP949
        if (html.includes('�')) {
          html = iconv.decode(response.data, 'cp949');
        }
      }
    } catch (err) {
      // Fallback to UTF-8
      html = response.data.toString('utf-8');
    }

    const $ = cheerio.load(html);
    
    // Get the current host for proxy URLs
    const currentHost = req.get('host');
    const protocol = req.secure || req.get('x-forwarded-proto') === 'https' || req.get('host').includes('railway.app') ? 'https' : 'http';
    const baseUrl = `${protocol}://${currentHost}`;
    
    // Remove ALL meta tags with target-densitydpi
    $('meta').each(function() {
      const content = $(this).attr('content');
      if (content && content.includes('target-densitydpi')) {
        const newContent = content
          .replace(/target-densitydpi=[^,]+,?\s*/gi, '')
          .replace(/,\s*,/g, ',')
          .replace(/,\s*$/g, '')
          .replace(/^\s*,/g, '')
          .trim();
        
        if (newContent) {
          $(this).attr('content', newContent);
        } else {
          $(this).remove();
        }
      }
    });

    // Handle FRAMESET - completely replace with modern HTML
    if ($('frameset').length > 0) {
      const framesetElement = $('frameset').first();
      const frameElement = framesetElement.find('frame').first();
      const frameSrc = frameElement.attr('src');
      
      if (frameSrc && frameSrc.startsWith('http://')) {
        // Create completely new HTML structure
        const newHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
    <title>컴시간알리미</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        iframe {
            width: 100%;
            height: 100vh;
            border: none;
            display: block;
        }
    </style>
</head>
<body>
    <iframe src="${baseUrl}/iframe?url=${encodeURIComponent(frameSrc)}" 
            title="컴시간알리미" 
            allow="fullscreen"
            loading="lazy">
    </iframe>
</body>
</html>`;
        
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(newHtml);
        return;
      }
    }
    
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send($.html());
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>프록시 오류</title>
        <style>
          body {
            font-family: sans-serif;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h2>연결 오류</h2>
        <p>컴시간알리미 사이트에 연결할 수 없습니다.</p>
        <small>${error.message}</small>
      </body>
      </html>
    `);
  }
});

// Iframe proxy route
app.get('/iframe', async (req, res) => {
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

    const contentType = response.headers['content-type'] || 'text/html; charset=euc-kr';
    const iconv = require('iconv-lite');
    
    // Try to detect encoding more accurately
    let html;
    try {
      // First try EUC-KR (most Korean sites use this)
      html = iconv.decode(response.data, 'euc-kr');
      
      // If the result contains replacement characters, try UTF-8
      if (html.includes('�')) {
        html = iconv.decode(response.data, 'utf-8');
        
        // If still has issues, try CP949
        if (html.includes('�')) {
          html = iconv.decode(response.data, 'cp949');
        }
      }
    } catch (err) {
      // Fallback to UTF-8
      html = response.data.toString('utf-8');
    }

    const $ = cheerio.load(html);
    
    // Get base URL for relative paths
    const baseUrl = new URL(decodedUrl);
    const baseHref = `${baseUrl.protocol}//${baseUrl.host}`;
    
    // Add base tag for relative URLs
    $('head').prepend(`<base href="${baseHref}/">`);
    
    // Get proxy URL for iframe
    const currentHost = req.get('host');
    const protocol = req.secure || req.get('x-forwarded-proto') === 'https' || req.get('host').includes('railway.app') ? 'https' : 'http';
    const proxyBaseUrl = `${protocol}://${currentHost}`;
    
    // Fix JavaScript and AJAX calls
    $('script').each(function() {
      let scriptContent = $(this).html();
      if (scriptContent) {
        // Replace all AJAX URL patterns
        scriptContent = scriptContent.replace(/url:\s*['"`]\.\/([^'"`]+)['"`]/g, `url: '${proxyBaseUrl}/api/$1'`);
        scriptContent = scriptContent.replace(/\$\.ajax\(\s*\{\s*url:\s*(['"`])([^'"`]+)\1/g, function(match, quote, url) {
          if (!url.startsWith('http')) {
            return match.replace(url, `${proxyBaseUrl}/api/${url.replace(/^\.?\//, '')}`);
          }
          return match;
        });
        
        // Replace specific comcigan patterns
        scriptContent = scriptContent.replace(/(['"`])\.\/36179_T\?([^'"`]+)\1/g, `$1${proxyBaseUrl}/api/36179_T?$2$1`);
        scriptContent = scriptContent.replace(/url:\s*sc3/g, `url: '${proxyBaseUrl}/api/' + sc3.replace('./36179_T?', '36179_T?')`);
        
        // Fix the sc_data function specifically
        if (scriptContent.includes('36179_T?')) {
          scriptContent = scriptContent.replace(
            /var sc3='\.\/36179_T\?'\+btoa\(([^)]+)\);/g,
            `var sc3='${proxyBaseUrl}/api/36179_T?'+btoa($1);`
          );
        }
        
        $(this).html(scriptContent);
      }
    });
    
    // Add some basic styling and JavaScript fixes
    $('head').append(`
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: auto;
        }
      </style>
      <script>
        // Get proxy base URL
        const proxyBase = window.location.origin;
        
        // Wait for jQuery to load and then override
        function setupAjaxInterceptor() {
          if (typeof jQuery !== 'undefined' && typeof $ !== 'undefined') {
            console.log('Setting up AJAX interceptor...');
            
            // Override jQuery.ajax globally
            jQuery.ajaxPrefilter(function(options, originalOptions, jqXHR) {
              if (options.url && !options.url.startsWith('http')) {
                const originalUrl = options.url;
                options.url = proxyBase + '/api/' + options.url.replace(/^\.?\//, '');
                console.log('AJAX intercepted:', originalUrl, '->', options.url);
              }
            });
            
            // Also override the main $.ajax function
            const originalAjax = $.ajax;
            $.ajax = function(settings) {
              if (typeof settings === 'object' && settings.url && !settings.url.startsWith('http')) {
                const originalUrl = settings.url;
                settings.url = proxyBase + '/api/' + settings.url.replace(/^\.?\//, '');
                console.log('$.ajax intercepted:', originalUrl, '->', settings.url);
              }
              return originalAjax.call(this, settings);
            };
            
            console.log('AJAX interceptor installed successfully');
          } else {
            // Retry after a short delay
            setTimeout(setupAjaxInterceptor, 100);
          }
        }
        
        // Start trying to setup the interceptor
        setupAjaxInterceptor();
        
        // Also setup immediate overrides in case they're needed
        if (typeof XMLHttpRequest !== 'undefined') {
          const originalOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            if (url && !url.startsWith('http') && !url.startsWith(proxyBase)) {
              const originalUrl = url;
              url = proxyBase + '/api/' + url.replace(/^\.?\//, '');
              console.log('XMLHttpRequest intercepted:', originalUrl, '->', url);
            }
            return originalOpen.call(this, method, url, async, user, password);
          };
        }
        
        console.log('Proxy interceptors setup initiated');
      </script>
    `);

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
});

// API proxy route for AJAX calls
app.all('/api/*', async (req, res) => {
  const apiPath = req.params[0];
  const targetUrl = `http://comci.net:4082/${apiPath}`;
  
  console.log(`API Request: ${req.method} ${targetUrl}`, req.query);
  
  try {
    const config = {
      method: req.method.toLowerCase(),
      url: targetUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
        'Referer': 'http://comci.net:4082/th',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 10000,
      responseType: 'arraybuffer'
    };
    
    if (req.method === 'GET') {
      config.params = req.query;
    } else {
      config.data = req.body;
    }
    
    const response = await axios(config);
    
    // Handle encoding for Korean content
    let responseData;
    const contentType = response.headers['content-type'] || 'application/json';
    
    if (contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript')) {
      const iconv = require('iconv-lite');
      try {
        responseData = iconv.decode(response.data, 'euc-kr');
        if (responseData.includes('�')) {
          responseData = iconv.decode(response.data, 'utf-8');
        }
      } catch (err) {
        responseData = response.data.toString('utf-8');
      }
    } else {
      responseData = response.data;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    console.log(`API Response: ${response.status} - Length: ${responseData.length}`);
    
    res.send(responseData);
  } catch (error) {
    console.error('API proxy error:', error.message, error.response?.status);
    res.status(error.response?.status || 500).json({ 
      error: error.message,
      url: targetUrl,
      method: req.method
    });
  }
});

// Image proxy route
app.get('/image', async (req, res) => {
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
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': decodedUrl.split('/').slice(0, 3).join('/')
      },
      responseType: 'stream',
      timeout: 10000
    });

    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    
    // Send a 1x1 transparent pixel as fallback
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.send(pixel);
  }
});

// Homepage
app.get('/', (req, res) => {
  const currentHost = req.get('host');
  const protocol = req.secure || req.get('x-forwarded-proto') === 'https' || req.get('host').includes('railway.app') ? 'https' : 'http';
  const baseUrl = `${protocol}://${currentHost}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>컴시간알리미 프록시 서버</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          border-bottom: 2px solid #4CAF50;
          padding-bottom: 10px;
        }
        .url-box {
          background: #f8f8f8;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #4CAF50;
        }
        code {
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🖥️ 컴시간알리미 프록시 서버</h1>
        <p>이 서버는 컴시간알리미 사이트를 Notion에 임베드할 수 있도록 프록시 기능을 제공합니다.</p>
        <div class="url-box">
          <strong>프록시 URL:</strong><br>
          <code>${baseUrl}/proxy</code>
        </div>
        <h2>📝 Notion에 임베드하는 방법</h2>
        <ol>
          <li>Notion 페이지를 엽니다</li>
          <li><code>/embed</code>를 입력합니다</li>
          <li>위의 프록시 URL을 복사하여 붙여넣습니다</li>
          <li>Enter를 누르면 임베드가 완성됩니다</li>
        </ol>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`프록시 서버가 포트 ${PORT}에서 실행 중입니다`);
});