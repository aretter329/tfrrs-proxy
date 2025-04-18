const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Get request parameters
  const params = JSON.parse(event.body || '{}');
  const { action, name, url } = params;
  
  try {
    if (action === 'search') {
      // Search for athlete
      const searchUrl = `https://www.tfrrs.org/athletes/search.html?q=${encodeURIComponent(name)}`;
      const response = await axios.get(searchUrl);
      const $ = cheerio.load(response.data);
      
      // Extract athlete links
      const athletes = [];
      $('a.athlete-name, a.athlete_name, a[href*="/athletes/"]').each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        if (href && href.includes('/athletes/')) {
          athletes.push({
            name: $el.text().trim(),
            url: href.startsWith('http') ? href : `https://www.tfrrs.org${href}`
          });
        }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ athletes })
      };
      
    } else if (action === 'getPRs') {
      // Get athlete PRs
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract PR data
      const prs = {};
      
      // Look for tables that might contain PR data
      $('table').each((i, table) => {
        const $table = $(table);
        const headerText = $table.find('th').text().toLowerCase();
        
        // Check if this looks like a PR table
        if (headerText.includes('pr') || headerText.includes('personal') || headerText.includes('best')) {
          $table.find('tr').each((j, row) => {
            if (j === 0) return; // Skip header row
            
            const $cols = $(row).find('td');
            if ($cols.length >= 2) {
              const event = $cols.eq(0).text().trim();
              const time = $cols.eq(1).text().trim();
              if (event && time) {
                prs[event] = time;
              }
            }
          });
        }
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ prs })
      };
    }
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    };
    
  } catch (error) {
    console.log('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};