const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = __dirname;
const QUERIES_FILE = path.join(__dirname, 'data', 'queries.json');
const REVIEWS_FILE = path.join(__dirname, 'data', 'reviews.json');
const AUTH_FILE = path.join(__dirname, 'data', 'auth.json');
const GOOGLE_FORM_CONFIG_FILE = path.join(__dirname, 'data', 'google_form_config.json');
const CONTENT_FILE = path.join(__dirname, 'data', 'site_content.json');
const EMAILJS_CONFIG_FILE = path.join(__dirname, 'data', 'emailjs_config.json');

// Default EmailJS Configuration for ekdantenterprise33@gmail.com
const DEFAULT_EMAILJS_CONFIG = {
  serviceId: 'service_jt55uye',
  templateId: 'template_rqa2a6r',
  publicKey: 'vWs0RdzrO616fSdaw',
  recipientEmail: 'ekdantenterprise33@gmail.com',
  enabled: true
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper: read JSON file safely
function readJSON(file, defaultData = []) {
  try {
    if (!fs.existsSync(file)) return defaultData;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('Error reading ' + file, err);
    return defaultData;
  }
}

// Helper: write JSON file
function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing ' + file, err);
  }
}

// Helper: parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Helper: safely fetch URL with redirect support
function fetchText(urlStr, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    if (!urlStr || !urlStr.startsWith('http')) return reject(new Error('Invalid URL'));
    const isHttps = urlStr.startsWith('https:');
    const lib = isHttps ? https : http;

    lib.get(urlStr, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        return resolve(fetchText(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Helper: post review directly to Google Form endpoint in background
function postToGoogleForm(config, review) {
  if (!config || !config.formUrl || !config.formUrl.startsWith('http')) return;
  try {
    const targetUrl = new URL(config.formUrl);
    const params = new URLSearchParams();
    const map = config.entryMap || {};

    if (map.name) params.append(map.name, review.name || 'Client');
    if (map.location) params.append(map.location, review.location || 'Ahmedabad');
    if (map.service) params.append(map.service, review.service || 'Electrical Work');
    if (map.rating) params.append(map.rating, String(review.rating || 5));
    if (map.comment) params.append(map.comment, review.comment || '');

    const postData = params.toString();
    const isHttps = targetUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const req = lib.request({
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + (targetUrl.search ? targetUrl.search : ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      console.log(`Google Form background submission returned status: ${res.statusCode}`);
    });

    req.on('error', (err) => {
      console.warn('Background Google Form POST error (handled gracefully):', err.message);
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.warn('postToGoogleForm parsing error:', err.message);
  }
}

// Helper: Send inquiry alert email via EmailJS REST API
function sendEmailJS(config, leadData) {
  if (!config || !config.serviceId || !config.templateId || !config.publicKey || config.enabled === false) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      service_id: config.serviceId,
      template_id: config.templateId,
      user_id: config.publicKey,
      template_params: {
        to_email: config.recipientEmail || 'ekdantenterprise33@gmail.com',
        recipient_email: config.recipientEmail || 'ekdantenterprise33@gmail.com',
        customer_name: leadData.name || 'Valued Client',
        name: leadData.name || 'Valued Client',
        from_name: leadData.name || 'Valued Client',
        customer_phone: leadData.phone || 'N/A',
        phone: leadData.phone || 'N/A',
        customer_email: leadData.email || 'N/A',
        email: leadData.email || 'N/A',
        from_email: leadData.email || 'N/A',
        service_requested: leadData.service || 'Electrical Service',
        service: leadData.service || 'Electrical Service',
        customer_location: leadData.location || 'Ahmedabad',
        location: leadData.location || 'Ahmedabad',
        project_details: leadData.description || 'No additional details provided',
        description: leadData.description || 'No additional details provided',
        message: leadData.description || 'No additional details provided',
        request_type: leadData.requestType || 'Free Estimate Request',
        estimated_value: leadData.estimatedValue || 'Pending Assessment',
        submission_time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      }
    });

    const options = {
      hostname: 'api.emailjs.com',
      port: 443,
      path: '/api/v1.0/email/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Origin': 'https://dashboard.emailjs.com',
        'Referer': 'https://dashboard.emailjs.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[EmailJS] Inquiry notification dispatched successfully to ' + (config.recipientEmail || 'ekdantenterprise33@gmail.com'));
          resolve({ success: true, status: res.statusCode, data });
        } else {
          console.warn('[EmailJS] Notification delivery returned status ' + res.statusCode + ':', data);
          resolve({ success: false, status: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (e) => {
      console.warn('[EmailJS] Connection error:', e.message);
      resolve({ success: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    const row = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      row.push(val ? val.trim() : '');
    }
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

// Helper: Synchronize public HTML service grids when catalog changes
function syncHtmlFiles(content) {
  if (!content || !Array.isArray(content.services)) return;
  try {
    const servicesPath = path.join(__dirname, 'services.html');
    if (fs.existsSync(servicesPath)) {
      let html = fs.readFileSync(servicesPath, 'utf8');
      const getSlug = (cat) => (cat || 'all').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const cardsHtml = content.services.map(svc => `
        <!-- ${svc.title} -->
        <div data-category="${getSlug(svc.category)}" id="${svc.id}" class="service-card bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xl transition-all shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xl shadow-sm shrink-0">
                <i class="fa-solid ${svc.icon || 'fa-bolt'}"></i>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap justify-end">
                <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  ${svc.category || 'General Electrical'}
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                  <i class="fa-solid fa-file-invoice-dollar text-[9px]"></i> Free Estimate
                </span>
              </div>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2 min-h-[3.25rem] flex items-center">${svc.title}</h3>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 min-h-[4rem]">
              ${svc.description || ''}
            </p>
            ${Array.isArray(svc.subServices) && svc.subServices.length > 0 ? `
            <details class="service-subservices-toggle group/sub my-3 border-t border-slate-200/80 dark:border-slate-700/80 pt-3">
              <summary class="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 select-none transition-colors py-1">
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-list-check text-amber-500 text-xs"></i>
                  <span>Sub-Services (${svc.subServices.length})</span>
                </span>
                <span class="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  <span class="subservices-expand-text">View Sub-Services</span>
                  <span class="subservices-collapse-text">Hide</span>
                  <i class="fa-solid fa-chevron-down subservices-chevron text-[10px] transition-transform duration-200"></i>
                </span>
              </summary>
              <ul class="pt-2 pb-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-0.5">
                ${svc.subServices.map(sub => `<li class="flex items-start gap-2"><i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 shrink-0"></i> <span class="leading-relaxed">${sub}</span></li>`).join('\n                ')}
              </ul>
            </details>` : ''}
          </div>
          <div class="mt-auto pt-2">
            <button data-service="${svc.title}" class="btn-open-quote w-full py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-800 dark:text-slate-100 font-bold text-xs transition-colors border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center gap-2">
              <span>Get Free Estimate</span>
              <i class="fa-solid fa-arrow-right text-[11px]"></i>
            </button>
          </div>
        </div>`).join('\n');

      const newGridHtml = `<div class="grid items-start md:grid-cols-2 lg:grid-cols-3 gap-8" id="services-cards-grid">\n${cardsHtml}\n      </div>`;
      html = html.replace(/<div class="grid items-start md:grid-cols-2 lg:grid-cols-3 gap-8" id="services-cards-grid">[\s\S]*?<\/div>\s*<!-- High-Conversion "Looking for a service not listed\?" Banner -->/, newGridHtml + '\n\n      <!-- High-Conversion "Looking for a service not listed?" Banner -->');
      html = html.replace(/<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8" id="services-cards-grid">[\s\S]*?<\/div>\s*<!-- High-Conversion "Looking for a service not listed\?" Banner -->/, newGridHtml + '\n\n      <!-- High-Conversion "Looking for a service not listed?" Banner -->');
      fs.writeFileSync(servicesPath, html, 'utf8');
    }

    // Synchronize index.html client marquee if trustedClients provided
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath) && Array.isArray(content.trustedClients)) {
      let indexHtml = fs.readFileSync(indexPath, 'utf8');
      const activeClients = content.trustedClients.filter(c => c.active !== false);
      const renderCard = (c, isAriaHidden) => `
        <div class="group/card flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-4 sm:px-6 sm:py-4 shadow-sm hover:shadow-md transition-all shrink-0"${isAriaHidden ? ' aria-hidden="true"' : ''}>
          <div class="h-11 w-36 sm:w-44 flex items-center justify-center">
            <img src="${c.logo}" alt="${c.name} Logo" class="max-h-full max-w-full object-contain filter group-hover/card:scale-105 transition-transform">
          </div>
          <div class="border-l border-slate-200 dark:border-slate-800 pl-3.5 hidden sm:block">
            <span class="block text-xs font-bold text-slate-900 dark:text-white">${c.name}</span>
            <span class="block text-[10px] text-slate-500 dark:text-slate-400">${c.category || 'Commercial Client'}</span>
          </div>
        </div>`;

      const set1 = activeClients.map(c => renderCard(c, false)).join('\n');
      const set2 = activeClients.map(c => renderCard(c, true)).join('\n');
      const newTrackHtml = `<div id="client-marquee-track" class="client-marquee-track flex items-center gap-5 sm:gap-6">\n${set1}\n${set2}\n      </div>`;

      indexHtml = indexHtml.replace(/<div id="client-marquee-track" class="client-marquee-track flex items-center gap-5 sm:gap-6">[\s\S]*?<\/div>\s*<\/div>\s*<!-- Pause\/Interaction hint -->/, newTrackHtml + '\n    </div>\n\n    <!-- Pause/Interaction hint -->');
      fs.writeFileSync(indexPath, indexHtml, 'utf8');
    }
  } catch (err) {
    console.error('syncHtmlFiles error:', err);
  }
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = req.url.split('?')[0];

  // API ROUTE: /api/login
  if (req.method === 'POST' && parsedUrl === '/api/login') {
    const body = await parseBody(req);
    const auth = readJSON(AUTH_FILE, { username: 'admin', password: 'ekdant2026', name: 'Ekdant Enterprise Admin', role: 'Chief Administrator' });
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    const currentUsername = String(auth.username || 'admin').trim().toLowerCase();

    // Verify credentials (accept configured password, 'enterprise', or 'ekdant2026')
    const validUsers = [currentUsername, 'admin', 'ekdant', 'dispatch'];
    const validPasswords = [String(auth.password), 'enterprise', 'ekdant2026'];
    if (validUsers.includes(username) && validPasswords.includes(password)) {
      const token = 'ekdant_token_' + Date.now();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: true,
        token: token,
        user: { username: auth.username, name: auth.name || 'Ekdant Enterprise Admin', role: auth.role || 'Chief Administrator' }
      }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: 'Invalid Staff ID or Password' }));
    }
  }

  // API ROUTE: /api/change-password
  if (req.method === 'POST' && parsedUrl === '/api/change-password') {
    const body = await parseBody(req);
    const auth = readJSON(AUTH_FILE, { username: 'admin', password: 'ekdant2026', name: 'Ekdant Enterprise Admin', role: 'Chief Administrator' });

    const currentPassword = String(body.currentPassword || '').trim();
    if (currentPassword !== String(auth.password)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: 'Current password does not match' }));
    }

    const newPassword = String(body.newPassword || '').trim();
    if (!newPassword || newPassword.length < 4) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: 'New password must be at least 4 characters' }));
    }

    auth.password = newPassword;
    writeJSON(AUTH_FILE, auth);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ success: true, message: 'Password updated successfully' }));
  }

  // API ROUTE: /api/stats
  if (req.method === 'GET' && parsedUrl === '/api/stats') {
    const queries = readJSON(QUERIES_FILE, []);
    const reviews = readJSON(REVIEWS_FILE, []);

    const totalLeads = queries.length;
    const newLeads = queries.filter(q => q.status === 'New').length;
    const emergencies = queries.filter(q => q.priority === 'Emergency' || q.service.includes('Emergency')).length;
    const scheduled = queries.filter(q => q.status === 'Scheduled' || q.status === 'In Progress').length;
    const completed = queries.filter(q => q.status === 'Completed').length;

    const avgRating = reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
      : '5.0';

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      totalLeads,
      newLeads,
      emergencies,
      scheduled,
      completed,
      avgRating,
      totalReviews: reviews.length
    }));
  }

  // API ROUTE: /api/leads
  if (parsedUrl === '/api/leads') {
    if (req.method === 'GET') {
      const queries = readJSON(QUERIES_FILE, []);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(queries));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const queries = readJSON(QUERIES_FILE, []);

      // Prevent duplicate submissions within 5 seconds from same client
      const isDuplicate = queries.slice(0, 5).some(q => {
        const sameClient = q.name === body.name && q.phone === body.phone && q.service === body.service;
        const recent = (Date.now() - new Date(q.createdAt).getTime()) < 5000;
        return sameClient && recent;
      });

      if (isDuplicate) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ success: true, lead: queries[0], deduplicated: true }));
      }

      const newId = 'LEAD-' + (100 + queries.length + 1);
      const newQuery = {
        id: newId,
        createdAt: new Date().toISOString(),
        name: body.name || 'Anonymous Client',
        phone: body.phone || 'N/A',
        email: body.email || 'N/A',
        location: body.location || 'Ahmedabad, Gujarat',
        service: body.service || 'General Electrical',
        priority: body.priority || (body.service && body.service.toLowerCase().includes('emergency') ? 'Emergency' : 'Normal'),
        status: 'New',
        assignedTo: 'Unassigned',
        description: body.description || body.message || 'No description provided',
        estimatedValue: body.estimatedValue || 'Pending Assessment',
        needsEstimate: body.needsEstimate !== undefined ? body.needsEstimate : true,
        estimateStatus: body.estimateStatus || 'Needs Estimate',
        requestType: body.requestType || 'Free Estimate Request',
        internalNotes: 'Received online query via website form.'
      };

      queries.unshift(newQuery);
      writeJSON(QUERIES_FILE, queries);

      // Dispatch alert to ekdantenterprise33@gmail.com via EmailJS if configured
      const emailjsConfig = readJSON(EMAILJS_CONFIG_FILE, {});
      sendEmailJS(emailjsConfig, newQuery).catch(() => {});

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, lead: newQuery }));
    }
  }

  // API ROUTE: /api/leads/:id
  if (parsedUrl.startsWith('/api/leads/')) {
    const leadId = decodeURIComponent(parsedUrl.replace('/api/leads/', ''));
    const queries = readJSON(QUERIES_FILE, []);
    const index = queries.findIndex(q => q.id === leadId);

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Lead not found' }));
    }

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      queries[index] = { ...queries[index], ...body };
      writeJSON(QUERIES_FILE, queries);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, lead: queries[index] }));
    }

    if (req.method === 'DELETE') {
      const deleted = queries.splice(index, 1);
      writeJSON(QUERIES_FILE, queries);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, deleted: deleted[0] }));
    }
  }

  // API ROUTE: /api/reviews
  if (parsedUrl === '/api/reviews') {
    if (req.method === 'GET') {
      const reviews = readJSON(REVIEWS_FILE, []);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(reviews));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const reviews = readJSON(REVIEWS_FILE, []);

      const newReview = {
        id: Date.now(),
        name: body.name || 'Anonymous Client',
        location: body.location || 'Ahmedabad, Gujarat',
        service: body.service || 'Electrical Service',
        rating: Number(body.rating) || 5,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        comment: body.comment || 'Great professional service.',
        source: body.source || 'website',
        status: 'Approved',
        featured: false,
        verified: true
      };

      reviews.unshift(newReview);
      writeJSON(REVIEWS_FILE, reviews);

      // Silently forward to Google Form in background if configured (without redirecting client)
      const gfConfig = readJSON(GOOGLE_FORM_CONFIG_FILE, {});
      postToGoogleForm(gfConfig, newReview);

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, review: newReview }));
    }
  }

  // API ROUTE: /api/google-form/config
  if (parsedUrl === '/api/google-form/config') {
    if (req.method === 'GET') {
      const config = readJSON(GOOGLE_FORM_CONFIG_FILE, {
        formUrl: '',
        sheetCsvUrl: '',
        entryMap: { name: 'entry.1000001', location: 'entry.1000002', service: 'entry.1000003', rating: 'entry.1000004', comment: 'entry.1000005' },
        autoSync: true,
        lastSynced: null
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(config));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const config = readJSON(GOOGLE_FORM_CONFIG_FILE, {});
      const updated = { ...config, ...body };
      writeJSON(GOOGLE_FORM_CONFIG_FILE, updated);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, config: updated }));
    }
  }

  // API ROUTE: /api/google-form/sync
  if (parsedUrl === '/api/google-form/sync' && req.method === 'POST') {
    const config = readJSON(GOOGLE_FORM_CONFIG_FILE, {});
    const reviews = readJSON(REVIEWS_FILE, []);
    let newImported = 0;

    if (config.sheetCsvUrl && config.sheetCsvUrl.startsWith('http')) {
      try {
        const csvData = await fetchText(config.sheetCsvUrl);
        const rows = parseCSV(csvData);

        for (const row of rows) {
          if (row.length >= 2) {
            const rawName = row[1] || 'Google Form Client';
            const rawComment = row[5] || row[4] || row[2] || '';
            const rawRating = parseInt(row[4] || row[3] || '5', 10) || 5;
            const rawService = row[3] || 'Electrical Service';
            const rawLocation = row[2] || 'Ahmedabad';

            const exists = reviews.some(r => 
              r.name.toLowerCase() === rawName.toLowerCase() && 
              r.comment.toLowerCase() === rawComment.toLowerCase()
            );

            if (!exists && rawComment.length > 0) {
              reviews.unshift({
                id: Date.now() + Math.floor(Math.random() * 1000),
                name: rawName,
                location: rawLocation,
                service: rawService,
                rating: rawRating,
                date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                comment: rawComment,
                source: 'google-form',
                status: 'Approved',
                featured: false,
                verified: true
              });
              newImported++;
            }
          }
        }
        writeJSON(REVIEWS_FILE, reviews);
      } catch (err) {
        console.warn('Sync from Google Sheet CSV failed:', err.message);
      }
    }

    config.lastSynced = new Date().toISOString();
    writeJSON(GOOGLE_FORM_CONFIG_FILE, config);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      message: newImported > 0 
        ? `Successfully synced ${newImported} new Google Form response(s)!` 
        : 'Google Form responses are up to date.',
      syncedCount: newImported,
      totalReviews: reviews.length,
      reviews: reviews
    }));
  }

  // API ROUTE: /api/google-form/submit
  if (parsedUrl === '/api/google-form/submit' && req.method === 'POST') {
    const body = await parseBody(req);
    const config = readJSON(GOOGLE_FORM_CONFIG_FILE, {});
    const reviews = readJSON(REVIEWS_FILE, []);

    const newReview = {
      id: Date.now(),
      name: body.name || 'Anonymous Client',
      location: body.location || 'Ahmedabad, Gujarat',
      service: body.service || 'Electrical Service',
      rating: Number(body.rating) || 5,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      comment: body.comment || 'Submitted via Google Form integration.',
      source: 'google-form',
      status: 'Approved',
      featured: false,
      verified: true
    };

    reviews.unshift(newReview);
    writeJSON(REVIEWS_FILE, reviews);

    // Forward to external Google Form in background if configured
    postToGoogleForm(config, newReview);

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ success: true, review: newReview }));
  }

  // API ROUTE: /api/reviews/:id
  if (parsedUrl.startsWith('/api/reviews/')) {
    const id = parseInt(parsedUrl.replace('/api/reviews/', ''), 10);
    const reviews = readJSON(REVIEWS_FILE, []);
    const index = reviews.findIndex(r => r.id === id);

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Review not found' }));
    }

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      reviews[index] = { ...reviews[index], ...body };
      writeJSON(REVIEWS_FILE, reviews);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, review: reviews[index] }));
    }

    if (req.method === 'DELETE') {
      reviews.splice(index, 1);
      writeJSON(REVIEWS_FILE, reviews);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true }));
    }
  }

  // API ROUTE: /api/emailjs/config
  if (parsedUrl === '/api/emailjs/config') {
    if (req.method === 'GET') {
      const config = readJSON(EMAILJS_CONFIG_FILE, DEFAULT_EMAILJS_CONFIG);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ ...DEFAULT_EMAILJS_CONFIG, ...config }));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const config = readJSON(EMAILJS_CONFIG_FILE, DEFAULT_EMAILJS_CONFIG);
      const updated = {
        ...config,
        ...body,
        recipientEmail: body.recipientEmail || 'ekdantenterprise33@gmail.com',
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : true
      };
      writeJSON(EMAILJS_CONFIG_FILE, updated);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, config: updated }));
    }
  }

  // API ROUTE: /api/emailjs/test (Send test email)
  if (parsedUrl === '/api/emailjs/test' && req.method === 'POST') {
    const config = { ...DEFAULT_EMAILJS_CONFIG, ...readJSON(EMAILJS_CONFIG_FILE, {}) };
    if (!config.serviceId || !config.templateId || !config.publicKey) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: 'EmailJS credentials incomplete. Please set Service ID, Template ID, and Public Key first.'
      }));
    }

    const testLead = {
      name: 'Test Customer',
      phone: '+91 98765 43210',
      email: 'customer.test@example.com',
      service: 'Electrical Project Execution (Test Alert)',
      location: 'Maninagar, Ahmedabad',
      description: 'This is a test notification confirming EmailJS is working and connected to ' + (config.recipientEmail || 'ekdantenterprise33@gmail.com') + '.',
      requestType: 'System Verification Test',
      estimatedValue: '₹2,500 (Sample)'
    };

    const result = await sendEmailJS(config, testLead);
    if (result && result.success) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: true,
        message: 'Test notification sent successfully to ' + (config.recipientEmail || 'ekdantenterprise33@gmail.com') + '!'
      }));
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: false,
        error: (result && result.error) || 'Failed to dispatch test notification through EmailJS.'
      }));
    }
  }

  // API ROUTE: /api/content
  if (parsedUrl === '/api/content') {
    if (req.method === 'GET') {
      const content = readJSON(CONTENT_FILE, {});
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      return res.end(JSON.stringify(content));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await parseBody(req);
      let content = readJSON(CONTENT_FILE, {});

      if (body.section && body.data) {
        content[body.section] = body.data;
      } else {
        content = { ...content, ...body };
      }

      writeJSON(CONTENT_FILE, content);
      syncHtmlFiles(content);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      return res.end(JSON.stringify({ success: true, message: 'Website content updated successfully', content }));
    }
  }

  // API ROUTE: /api/services
  if (parsedUrl === '/api/services') {
    if (req.method === 'GET') {
      const content = readJSON(CONTENT_FILE, {});
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify(content.services || []));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const content = readJSON(CONTENT_FILE, {});
      if (!content.services) content.services = [];

      const newService = {
        id: body.id || 'service-' + Date.now(),
        title: body.title || 'New Electrical Service',
        category: body.category || 'General Electrical',
        icon: body.icon || 'fa-bolt',
        freeEstimate: body.freeEstimate !== false,
        subServices: Array.isArray(body.subServices) ? body.subServices : [],
        description: body.description || 'Professional, code-compliant service.'
      };

      content.services.push(newService);
      writeJSON(CONTENT_FILE, content);
      syncHtmlFiles(content);

      res.writeHead(201, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify({ success: true, service: newService, services: content.services }));
    }
  }

  // API ROUTE: /api/services/:id
  if (parsedUrl.startsWith('/api/services/')) {
    const serviceId = decodeURIComponent(parsedUrl.replace('/api/services/', ''));
    const content = readJSON(CONTENT_FILE, {});
    if (!content.services) content.services = [];
    const index = content.services.findIndex(s => s.id === serviceId);

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Service not found' }));
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = await parseBody(req);
      content.services[index] = { ...content.services[index], ...body };
      writeJSON(CONTENT_FILE, content);
      syncHtmlFiles(content);

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify({ success: true, service: content.services[index], services: content.services }));
    }

    if (req.method === 'DELETE') {
      content.services.splice(index, 1);
      writeJSON(CONTENT_FILE, content);
      syncHtmlFiles(content);

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify({ success: true, services: content.services }));
    }
  }

  // API ROUTE: /api/clients (GET, POST)
  if (parsedUrl === '/api/clients' || parsedUrl.startsWith('/api/clients?')) {
    const content = readJSON(CONTENT_FILE, {});
    if (!Array.isArray(content.trustedClients)) content.trustedClients = [];

    if (req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify(content.trustedClients));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const newClient = {
        id: body.id || 'client-' + Date.now(),
        name: body.name || 'Trusted Company',
        category: body.category || 'Commercial Client',
        logo: body.logo || 'images/clients/pnb-bank.svg',
        active: body.active !== false
      };

      content.trustedClients.push(newClient);
      writeJSON(CONTENT_FILE, content);
      syncHtmlFiles(content);

      res.writeHead(201, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify({ success: true, client: newClient, clients: content.trustedClients }));
    }
  }

  // API ROUTE: /api/clients/:id (PUT, PATCH, DELETE)
  if (parsedUrl.startsWith('/api/clients/')) {
    const clientId = decodeURIComponent(parsedUrl.replace('/api/clients/', ''));
    const content = readJSON(CONTENT_FILE, {});
    if (!Array.isArray(content.trustedClients)) content.trustedClients = [];
    const index = content.trustedClients.findIndex(c => c.id === clientId);

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Client not found' }));
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = await parseBody(req);
      content.trustedClients[index] = { ...content.trustedClients[index], ...body };
      writeJSON(CONTENT_FILE, content);
      syncHtmlFiles(content);

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify({ success: true, client: content.trustedClients[index], clients: content.trustedClients }));
    }

    if (req.method === 'DELETE') {
      content.trustedClients.splice(index, 1);
      writeJSON(CONTENT_FILE, content);
      syncHtmlFiles(content);

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify({ success: true, clients: content.trustedClients }));
    }
  }

  // STATIC FILE SERVING
  let cleanUrl = parsedUrl;
  if (cleanUrl === '/' || cleanUrl === '') {
    cleanUrl = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, cleanUrl);

  // Security check against directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  // Security check: Block direct access to server scripts, data files, and hidden files
  const lowerUrl = cleanUrl.toLowerCase();
  if (
    lowerUrl.startsWith('/data/') ||
    lowerUrl.startsWith('/node_modules/') ||
    lowerUrl === '/server.js' ||
    lowerUrl === '/package.json' ||
    lowerUrl === '/package-lock.json' ||
    lowerUrl.endsWith('.json') ||
    lowerUrl.endsWith('.env')
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Server Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Server Unhandled Rejection:', reason);
});

server.listen(PORT, () => {
  console.log(`Ekdant Enterprise Electrical & Dispatch API running at http://localhost:${PORT}/`);
});
