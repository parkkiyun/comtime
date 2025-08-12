const axios = require('axios');
const cheerio = require('cheerio');

const TARGET_URL = 'http://xn--s39aqy283b66bj2x.kr';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests for proxy
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const response = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
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
    
    // Remove ALL meta tags with target-densitydpi
    $('meta').each(function() {
      const content = $(this).attr('content');
      if (content && content.includes('target-densitydpi')) {
        // Remove target-densitydpi completely
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
    <iframe src="https://comtime-proxy-nm9nr7w8u-parkkiyuns-projects.vercel.app/api/iframe?url=${encodeURIComponent(frameSrc)}" 
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
    
    // If no frameset, handle normally
    // Remove base tag as we'll handle URLs differently
    $('base').remove();
    
    // Handle any remaining iframes and frames
    $('iframe, frame').each(function() {
      const src = $(this).attr('src');
      if (src && src.startsWith('http://')) {
        const proxyUrl = `https://comtime-proxy-nm9nr7w8u-parkkiyuns-projects.vercel.app/api/iframe?url=${encodeURIComponent(src)}`;
        $(this).attr('src', proxyUrl);
      }
    });
    
    // Handle scripts
    $('script').each(function() {
      const src = $(this).attr('src');
      if (src && !src.startsWith('http')) {
        $(this).attr('src', TARGET_URL + '/' + src.replace(/^\//, ''));
      } else if (src && src.startsWith('http://')) {
        $(this).attr('src', src.replace('http://', 'https://'));
      }
    });
    
    // Handle stylesheets
    $('link').each(function() {
      const href = $(this).attr('href');
      if (href && !href.startsWith('http')) {
        $(this).attr('href', TARGET_URL + '/' + href.replace(/^\//, ''));
      } else if (href && href.startsWith('http://')) {
        $(this).attr('href', href.replace('http://', 'https://'));
      }
    });
    
    // Handle images
    $('img').each(function() {
      const src = $(this).attr('src');
      if (src && !src.startsWith('http')) {
        $(this).attr('src', TARGET_URL + '/' + src.replace(/^\//, ''));
      } else if (src && src.startsWith('http://')) {
        const proxyUrl = `https://comtime-proxy-nm9nr7w8u-parkkiyuns-projects.vercel.app/api/image?url=${encodeURIComponent(src)}`;
        $(this).attr('src', proxyUrl);
      }
    });
    
    // Handle links
    $('a').each(function() {
      const href = $(this).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        $(this).attr('href', TARGET_URL + '/' + href.replace(/^\//, ''));
      }
    });

    $('head').append(`
      <style>
        body {
          margin: 0;
          padding: 10px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        @media (max-width: 768px) {
          body {
            padding: 5px;
          }
        }
      </style>
    `);

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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            text-align: center;
          }
          .error {
            background: #f8f8f8;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            max-width: 500px;
            margin: 0 auto;
          }
          h2 { color: #e74c3c; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>연결 오류</h2>
          <p>컴시간알리미 사이트에 연결할 수 없습니다.</p>
          <p>잠시 후 다시 시도해주세요.</p>
          <small>Error: ${error.message}</small>
        </div>
      </body>
      </html>
    `);
  }
};