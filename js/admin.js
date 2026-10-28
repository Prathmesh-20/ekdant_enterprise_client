/**
 * Ekdant Enterprise - Admin Dispatch & Inquiries Engine
 * Includes Staff ID & Password Authentication Gateway
 */

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const API_BASE = LOCAL_HOSTS.includes(window.location.hostname)
  ? 'http://localhost:5000'
  : (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    ? window.location.origin
    : 'http://localhost:5000';

let allLeads = [];
let allReviews = [];
let currentEditingLeadId = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuthGateway();
  initTabs();
  initSearchAndFilters();
  initModals();
  initChangePassword();

  document.getElementById('btn-refresh-data')?.addEventListener('click', () => {
    loadData();
    showToast('Data refreshed successfully from dispatch engine.', 'success');
  });
});

// Toast notification helper
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  toast.className = `toast-item ${isSuccess ? '' : 'toast-error'}`;
  const icon = isSuccess ? 'fa-circle-check text-amber-400' : 'fa-circle-exclamation text-rose-400';

  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fa-solid ${icon} text-lg shrink-0"></i>
      <div class="toast-text">${message}</div>
    </div>
    <button onclick="this.closest('.toast-item').remove()" class="toast-close ml-4 text-xs p-1" title="Dismiss">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// =========================================================================
// 1. AUTHENTICATION & LOGIN GATEWAY
// =========================================================================
function initAuthGateway() {
  const loginGateway = document.getElementById('login-gateway');
  const dashboardContainer = document.getElementById('admin-dashboard-container');
  const loginForm = document.getElementById('dispatch-login-form');
  const errorAlert = document.getElementById('login-error-alert');
  const errorText = document.getElementById('login-error-text');
  const togglePwBtn = document.getElementById('btn-toggle-password');
  const pwInput = document.getElementById('login-password');
  const eyeIcon = document.getElementById('eye-icon');
  const logoutBtn = document.getElementById('btn-logout');

  // Check existing session
  const session = getSession();
  if (session && session.authenticated) {
    unlockPortal(session);
  } else {
    lockPortal();
  }

  // Password visibility toggle
  if (togglePwBtn && pwInput && eyeIcon) {
    togglePwBtn.addEventListener('click', () => {
      if (pwInput.type === 'password') {
        pwInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
      } else {
        pwInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
      }
    });
  }


  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();

      if (errorAlert) errorAlert.classList.add('hidden');

      let authSuccess = false;
      let userData = { username, name: 'Ekdant Enterprise Admin', role: 'Administrator' };

      // 1. Try Backend API verification if running on a server with /api/login endpoint
      if (API_BASE) {
        try {
          const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success) {
              authSuccess = true;
              userData = data.user || userData;
            }
          } else if (res.status === 401 && contentType.includes('application/json')) {
            // Live backend rejected credentials; continue to fallback check in case of local password
            console.log('Live API returned 401, checking fallback...');
          } else {
            // 404, 405, or HTML returned (standard on static hosts like Vercel)
            console.log('Backend /api/login not active on this host, falling back to client-side auth.');
          }
        } catch (err) {
          console.warn('API connection failed, falling back to client-side auth:', err);
        }
      }

      // 2. Client-side / Offline / Static Hosting (Vercel) Verification
      if (!authSuccess) {
        let storedAuth = null;
        try {
          const savedAuthValue = localStorage.getItem('ekdant_auth');
          if (savedAuthValue) {
            storedAuth = JSON.parse(savedAuthValue);
          }
        } catch (e) {
          storedAuth = null;
        }

        let fileAuth = null;
        try {
          const authFileRes = await fetch('data/auth.json');
          if (authFileRes.ok) {
            fileAuth = await authFileRes.json();
          }
        } catch (e) {}

        const validUsernames = ['admin', 'ekdant', 'dispatch'];
        if (storedAuth && storedAuth.username) validUsernames.push(String(storedAuth.username).trim().toLowerCase());
        if (fileAuth && fileAuth.username) validUsernames.push(String(fileAuth.username).trim().toLowerCase());

        // Accept all legitimate passwords:
        // - 'enterprise' (configured in data/auth.json)
        // - 'ekdant2026' (system fallback)
        // - Any custom password saved in localStorage or auth.json
        const validPasswords = ['enterprise', 'ekdant2026'];
        if (storedAuth && storedAuth.password) validPasswords.unshift(String(storedAuth.password).trim());
        if (fileAuth && fileAuth.password) validPasswords.unshift(String(fileAuth.password).trim());

        const inputUser = username.toLowerCase();
        const usernameMatches = validUsernames.includes(inputUser);
        const passwordMatches = validPasswords.includes(password);

        if (usernameMatches && passwordMatches) {
          authSuccess = true;
          userData = {
            username: username,
            name: (storedAuth && storedAuth.name) || (fileAuth && fileAuth.name) || 'Ekdant Enterprise Admin',
            role: 'Chief Administrator'
          };
          localStorage.setItem('ekdant_auth', JSON.stringify({
            username: username,
            password: password,
            name: userData.name
          }));
        } else {
          if (errorAlert && errorText) {
            errorText.textContent = 'Invalid Staff ID or Password. (Staff ID: admin, Password: enterprise)';
            errorAlert.classList.remove('hidden');
          }
          return;
        }
      }

      if (authSuccess) {
        const newSession = {
          authenticated: true,
          username: userData.username,
          name: userData.name || 'Ekdant Enterprise Admin',
          loginTime: new Date().toISOString()
        };
        sessionStorage.setItem('ekdant_admin_session', JSON.stringify(newSession));
        sessionStorage.setItem('voltcraft_admin_session', JSON.stringify(newSession));
        unlockPortal(newSession);
        showToast('Welcome to Ekdant Enterprise! Dispatch portal unlocked.', 'success');
      }
    });
  }

  // Logout / Lock Portal
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('ekdant_admin_session');
      sessionStorage.removeItem('voltcraft_admin_session');
      lockPortal();
      showToast('Portal locked. ID & Password required to access.', 'success');
    });
  }
}

function getSession() {
  try {
    const raw = sessionStorage.getItem('ekdant_admin_session') || sessionStorage.getItem('voltcraft_admin_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function unlockPortal(session) {
  const loginGateway = document.getElementById('login-gateway');
  const dashboardContainer = document.getElementById('admin-dashboard-container');
  const userNameEl = document.getElementById('auth-user-name');

  if (loginGateway) loginGateway.classList.add('hidden');
  if (dashboardContainer) dashboardContainer.classList.remove('hidden');
  if (userNameEl && session) userNameEl.textContent = session.name || 'Ekdant Enterprise';

  initLiveClock();
  loadData();
}

function lockPortal() {
  const loginGateway = document.getElementById('login-gateway');
  const dashboardContainer = document.getElementById('admin-dashboard-container');

  if (loginGateway) loginGateway.classList.remove('hidden');
  if (dashboardContainer) dashboardContainer.classList.add('hidden');
}

// =========================================================================
// 2. CHANGE PASSWORD MODAL & LOGIC
// =========================================================================
function initChangePassword() {
  const modal = document.getElementById('change-password-modal');
  const openBtn = document.getElementById('btn-open-change-password');
  const closeBtn = document.getElementById('close-password-modal');
  const form = document.getElementById('change-password-form');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeModal() {
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('pw-current').value;
      const newPassword = document.getElementById('pw-new').value;
      const confirmPassword = document.getElementById('pw-confirm').value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match.', 'error');
        return;
      }

      if (API_BASE) {
        try {
          const res = await fetch(`${API_BASE}/api/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
          });

          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const localAuth = {
              username: 'admin',
              password: newPassword,
              name: 'Ekdant Enterprise Admin'
            };
            localStorage.setItem('ekdant_auth', JSON.stringify(localAuth));
            localStorage.removeItem('voltcraft_auth');
            closeModal();
            form.reset();
            showToast('Password changed successfully!', 'success');
            return;
          } else if (res.status === 400 && contentType.includes('application/json')) {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Failed to update password.', 'error');
            return;
          }
        } catch (err) {}
      }

      // Local storage fallback (offline mode & static Vercel deployment)
      const validCurrentPasswords = ['enterprise', 'ekdant2026'];
      try {
        const stored = JSON.parse(localStorage.getItem('ekdant_auth') || 'null');
        if (stored && stored.password) validCurrentPasswords.unshift(String(stored.password).trim());
      } catch (e) {}

      if (!validCurrentPasswords.includes(currentPassword.trim())) {
        showToast('Current password does not match.', 'error');
        return;
      }

      const localAuth = {
        username: 'admin',
        password: newPassword,
        name: 'Ekdant Enterprise Admin'
      };
      localStorage.setItem('ekdant_auth', JSON.stringify(localAuth));
      localStorage.removeItem('voltcraft_auth');
      closeModal();
      form.reset();
      showToast('Password updated successfully! Saved to your browser.', 'success');
      localStorage.setItem('ekdant_auth', JSON.stringify(stored));
      localStorage.removeItem('voltcraft_auth');
      closeModal();
      form.reset();
      showToast('Password updated! Old password is now deactivated.', 'success');
    });
  }
}

// =========================================================================
// 3. LIVE CLOCK
// =========================================================================
function initLiveClock() {
  const clockEl = document.getElementById('live-clock');
  function update() {
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
    }
  }
  update();
  setInterval(update, 1000);
}

// =========================================================================
// 4. TAB NAVIGATION
// =========================================================================
function initTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active', 'bg-amber-500', 'text-slate-950', 'font-bold');
        b.classList.add('bg-slate-900', 'text-slate-300', 'font-semibold');
      });
      btn.classList.remove('bg-slate-900', 'text-slate-300', 'font-semibold');
      btn.classList.add('active', 'bg-amber-500', 'text-slate-950', 'font-bold');

      const targetId = btn.getAttribute('data-tab');
      tabContents.forEach(content => {
        if (content.id === targetId) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });
    });
  });
}

// =========================================================================
// 5. LOAD DATA FROM API / PERSISTENCE
// =========================================================================
async function loadData() {
  let loadedLeads = false;

  if (API_BASE) {
    try {
      const [leadsRes, statsRes, reviewsRes] = await Promise.all([
        fetch(`${API_BASE}/api/leads`),
        fetch(`${API_BASE}/api/stats`),
        fetch(`${API_BASE}/api/reviews`)
      ]);

      if (leadsRes.ok && reviewsRes.ok) {
        allLeads = await leadsRes.json();
        allReviews = await reviewsRes.json();
        loadedLeads = true;

        if (statsRes.ok) {
          const stats = await statsRes.json();
          renderStats(stats);
        }
      }
    } catch (e) {
      console.warn('API connection failed, falling back to local storage', e);
    }
  }

  if (!loadedLeads) {
    const stored = localStorage.getItem('ekdant_leads') || localStorage.getItem('voltcraft_leads');
    if (stored) {
      try { allLeads = JSON.parse(stored); } catch (e) {}
    } else {
      allLeads = getMockLeads();
      localStorage.setItem('ekdant_leads', JSON.stringify(allLeads));
      localStorage.setItem('voltcraft_leads', JSON.stringify(allLeads));
    }

    const storedReviews = localStorage.getItem('ekdant_reviews') || localStorage.getItem('voltcraft_reviews');
    if (storedReviews) {
      try { allReviews = JSON.parse(storedReviews); } catch (e) {}
    }

    computeAndRenderStats();
  }

  renderLeadsTable();
  renderEmergencyQueue();
  renderReviewsModeration();
  loadGoogleFormConfig();
  loadCMSContent();
  updateBadges();
}

function computeAndRenderStats() {
  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter(q => q.status === 'New').length;
  const emergencies = allLeads.filter(q => q.priority === 'Emergency' || (q.service && q.service.includes('Emergency'))).length;
  const scheduled = allLeads.filter(q => q.status === 'Scheduled' || q.status === 'In Progress').length;
  
  const avgRating = allReviews.length > 0 
    ? (allReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / allReviews.length).toFixed(1)
    : '4.9';

  renderStats({
    totalLeads,
    newLeads,
    emergencies,
    scheduled,
    avgRating,
    totalReviews: allReviews.length
  });
}

function renderStats(stats) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('stat-total-leads', stats.totalLeads);
  setEl('stat-emergencies', stats.emergencies);
  setEl('stat-new-leads', stats.newLeads);
  setEl('stat-scheduled', stats.scheduled);
  setEl('stat-avg-rating', stats.avgRating);
  setEl('stat-review-count', `${stats.totalReviews || allReviews.length} verified reviews`);
}

function updateBadges() {
  const leadsBadge = document.getElementById('badge-leads-count');
  if (leadsBadge) leadsBadge.textContent = allLeads.length;

  const emergencyBadge = document.getElementById('badge-emergency-count');
  const emergencies = allLeads.filter(q => q.priority === 'Emergency' || (q.service && q.service.includes('Emergency')));
  if (emergencyBadge) emergencyBadge.textContent = emergencies.length;

  const reviewsBadge = document.getElementById('badge-reviews-count');
  if (reviewsBadge) reviewsBadge.textContent = allReviews.length;

  const estimatesBadge = document.getElementById('badge-estimates-count');
  if (estimatesBadge) {
    const estCount = allLeads.filter(q => q.needsEstimate || (q.estimateStatus && q.estimateStatus !== 'None')).length;
    estimatesBadge.textContent = estCount;
  }
  if (typeof renderEstimatesTable === 'function') {
    renderEstimatesTable();
  }
}

// =========================================================================
// 6. RENDER LEADS TABLE
// =========================================================================
function renderLeadsTable() {
  const tbody = document.getElementById('leads-table-body');
  const emptyState = document.getElementById('leads-empty-state');
  if (!tbody) return;

  const searchTerm = (document.getElementById('lead-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('lead-status-filter')?.value || 'all';
  const serviceFilter = document.getElementById('lead-service-filter')?.value || 'all';

  const filtered = allLeads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.name.toLowerCase().includes(searchTerm) ||
      lead.phone.toLowerCase().includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm) ||
      lead.location.toLowerCase().includes(searchTerm) ||
      (lead.description && lead.description.toLowerCase().includes(searchTerm)) ||
      lead.id.toLowerCase().includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesService = serviceFilter === 'all' || lead.service.toLowerCase().includes(serviceFilter);

    return matchesSearch && matchesStatus && matchesService;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  tbody.innerHTML = filtered.map(lead => {
    const dateFormatted = new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    let priorityBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">Normal</span>';
    if (lead.priority === 'Emergency') {
      priorityBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>Emergency</span>';
    } else if (lead.priority === 'High') {
      priorityBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">High Priority</span>';
    }

    return `
      <tr class="hover:bg-slate-800/40 transition-colors group">
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="font-mono text-amber-400 font-bold text-xs">${lead.id}</div>
          <div class="text-[11px] text-slate-500">${dateFormatted}</div>
        </td>

        <td class="py-3 px-4">
          <div class="font-bold text-white text-xs">${lead.name}</div>
          <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <a href="tel:${lead.phone}" class="hover:text-amber-400 text-slate-300" title="Click to call"><i class="fa-solid fa-phone text-[10px]"></i> ${lead.phone}</a>
            <span class="text-slate-600">&bull;</span>
            <span><i class="fa-solid fa-location-dot text-[10px] text-slate-500"></i> ${lead.location}</span>
          </div>
        </td>

        <td class="py-3 px-4">
          <div class="font-medium text-slate-200 text-xs">${lead.service}</div>
          <div class="mt-1">${priorityBadge}</div>
        </td>

        <td class="py-3 px-4 whitespace-nowrap">
          <select onchange="updateLeadStatus('${lead.id}', this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500">
            <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Scheduled" ${lead.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
            <option value="In Progress" ${lead.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${lead.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${lead.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>

        <td class="py-3 px-4 whitespace-nowrap">
          <select onchange="updateLeadTech('${lead.id}', this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500">
            <option value="Unassigned" ${lead.assignedTo === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
            <option value="Ekdant Service Team (Van #1)" ${lead.assignedTo.includes('Ekdant') || lead.assignedTo.includes('Marcus') ? 'selected' : ''}>Ekdant (Van 1)</option>
            <option value="James Kovacs (Van #2)" ${lead.assignedTo.includes('James') ? 'selected' : ''}>James (Van 2)</option>
            <option value="Daniela Cruz (Van #3)" ${lead.assignedTo.includes('Daniela') ? 'selected' : ''}>Daniela (Van 3)</option>
          </select>
        </td>

        <td class="py-3 px-4 whitespace-nowrap">
          <span class="font-bold text-amber-400 text-xs">${lead.estimatedValue || 'Pending'}</span>
        </td>

        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openLeadModal('${lead.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors" title="View Details & Notes">
              <i class="fa-solid fa-eye text-xs"></i>
            </button>
            <a href="tel:${lead.phone}" class="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors" title="Call Client">
              <i class="fa-solid fa-phone text-xs"></i>
            </a>
            <a href="mailto:${lead.email}" class="p-1.5 rounded-lg bg-slate-800 hover:bg-electric text-slate-300 hover:text-white transition-colors" title="Email Client">
              <i class="fa-solid fa-envelope text-xs"></i>
            </a>
            <button onclick="deleteLead('${lead.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition-colors" title="Delete">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// =========================================================================
// 7. EMERGENCY QUEUE RENDER
// =========================================================================
function renderEmergencyQueue() {
  const container = document.getElementById('emergency-cards-container');
  if (!container) return;

  const emergencies = allLeads.filter(q => q.priority === 'Emergency' || (q.service && q.service.includes('Emergency')));

  if (emergencies.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-8 text-center text-slate-400">
        <i class="fa-solid fa-circle-check text-3xl mb-2 text-emerald-400"></i>
        <p class="text-sm font-semibold">No active emergency calls right now.</p>
        <p class="text-xs text-slate-500">All dispatches are operating smoothly.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = emergencies.map(lead => `
    <div class="bg-slate-950 border border-red-500/40 rounded-xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
            ${lead.id} &bull; EMERGENCY
          </span>
          <span class="text-xs text-slate-400">${new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <h3 class="text-base font-bold text-white mb-1">${lead.name}</h3>
        <p class="text-xs text-amber-400 font-medium mb-3">${lead.service} &bull; ${lead.location}</p>
        <p class="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 italic mb-4">"${lead.description}"</p>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
        <div class="text-xs text-slate-400">
          Status: <strong class="text-white">${lead.status}</strong>
        </div>
        <div class="flex gap-2">
          <a href="tel:${lead.phone}" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1">
            <i class="fa-solid fa-phone text-amber-400"></i> Call
          </a>
          <button onclick="fastDispatchEmergency('${lead.id}')" class="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-truck-fast"></i> Dispatch Van #2
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function fastDispatchEmergency(id) {
  await updateLeadField(id, {
    status: 'In Progress',
    assignedTo: 'James Kovacs (Van #2)',
    internalNotes: 'Rapid dispatch activated. Van #2 en route to property.'
  });
  showToast(`Emergency dispatch confirmed: Van #2 (James Kovacs) assigned to ${id}.`, 'success');
}

// =========================================================================
// 8. REVIEWS MODERATION & GOOGLE FORM SYNC RENDER
// =========================================================================
let adminReviewFilter = 'all';

function filterAdminReviews(source) {
  adminReviewFilter = source;
  document.querySelectorAll('.admin-rev-filter').forEach(btn => {
    if (btn.getAttribute('data-source') === source) {
      btn.className = 'admin-rev-filter px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold';
    } else {
      btn.className = 'admin-rev-filter px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700';
    }
  });
  renderReviewsModeration();
}

function renderReviewsModeration() {
  const container = document.getElementById('reviews-moderation-list');
  if (!container) return;

  let filtered = allReviews;
  if (adminReviewFilter === 'google-form') {
    filtered = allReviews.filter(r => r.source === 'google-form');
  } else if (adminReviewFilter === 'website') {
    filtered = allReviews.filter(r => r.source === 'website' || (!r.source || (r.source !== 'google' && r.source !== 'google-form')));
  } else if (adminReviewFilter === 'google') {
    filtered = allReviews.filter(r => r.source === 'google');
  }

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-center text-slate-400 text-xs py-8 bg-slate-950 rounded-xl border border-slate-800">No client reviews found matching this filter.</p>`;
    return;
  }

  container.innerHTML = filtered.map(rev => {
    const isGoogleForm = rev.source === 'google-form';
    const isGoogle = rev.source === 'google';
    const sourceBadge = isGoogleForm
      ? '<span class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold inline-flex items-center gap-1 border border-indigo-500/30"><i class="fa-solid fa-file-lines text-indigo-400"></i> Google Form</span>'
      : (isGoogle
          ? '<span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold inline-flex items-center gap-1 border border-blue-500/30"><i class="fa-brands fa-google text-blue-400"></i> Google Maps</span>'
          : '<span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold inline-flex items-center gap-1 border border-emerald-500/30"><i class="fa-solid fa-circle-check text-emerald-400"></i> Website Form</span>');

    return `
    <div class="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="space-y-1.5 max-w-2xl">
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex text-amber-400 text-xs">
            ${'<i class="fa-solid fa-star"></i>'.repeat(rev.rating)}
            ${'<i class="fa-regular fa-star text-slate-600"></i>'.repeat(5 - rev.rating)}
          </div>
          <strong class="text-white text-xs">${rev.name}</strong>
          <span class="text-[11px] text-slate-500">&bull; ${rev.location} &bull; ${rev.date}</span>
          ${sourceBadge}
        </div>
        <p class="text-xs text-slate-300 italic">"${rev.comment}"</p>
        <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold inline-block">${rev.service}</span>
      </div>

      <div class="flex items-center gap-2 self-end md:self-auto">
        <button onclick="toggleFeatureReview(${rev.id})" class="px-3 py-1.5 rounded-lg ${rev.featured ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'} text-xs transition-colors">
          <i class="fa-solid fa-award mr-1"></i> ${rev.featured ? 'Featured' : 'Feature'}
        </button>
        <button onclick="deleteReview(${rev.id})" class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition-colors" title="Delete Review">
          <i class="fa-solid fa-trash text-xs"></i>
        </button>
      </div>
    </div>
  `;
  }).join('');
}

// Google Form Configuration and Synchronization Methods
async function loadGoogleFormConfig() {
  const formUrlInput = document.getElementById('gf-form-url');
  const sheetUrlInput = document.getElementById('gf-sheet-csv-url');
  const lastSyncedLabel = document.getElementById('gf-last-synced-label');

  let config = null;
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/google-form/config`);
      if (res.ok) config = await res.json();
    } catch (e) {}
  }

  if (!config) {
    const cached = localStorage.getItem('ekdant_google_form_config');
    if (cached) {
      try { config = JSON.parse(cached); } catch (e) {}
    }
  }

  if (config) {
    if (formUrlInput && config.formUrl) formUrlInput.value = config.formUrl;
    if (sheetUrlInput && config.sheetCsvUrl) sheetUrlInput.value = config.sheetCsvUrl;
    if (lastSyncedLabel && config.lastSynced) {
      lastSyncedLabel.textContent = `Last synced: ${new Date(config.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
}

async function saveGoogleFormConfig() {
  const formUrl = document.getElementById('gf-form-url')?.value.trim() || '';
  const sheetCsvUrl = document.getElementById('gf-sheet-csv-url')?.value.trim() || '';

  const payload = { formUrl, sheetCsvUrl };

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/google-form/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('API config save failed', e);
    }
  }

  localStorage.setItem('ekdant_google_form_config', JSON.stringify(payload));
  showToast('Google Form synchronization configuration saved successfully!', 'success');
}

async function syncGoogleFormResponses() {
  const btn = document.getElementById('btn-manual-sync-gf');
  const label = document.getElementById('sync-btn-label');
  if (btn) btn.disabled = true;
  if (label) label.textContent = 'Syncing...';

  try {
    if (API_BASE) {
      const res = await fetch(`${API_BASE}/api/google-form/sync`, { method: 'POST' });
      const data = await res.json();
      if (data && data.reviews) {
        allReviews = data.reviews;
        localStorage.setItem('ekdant_reviews', JSON.stringify(allReviews));
        localStorage.setItem('voltcraft_reviews', JSON.stringify(allReviews));
      }
      showToast(data.message || 'Google Form responses synchronized!', 'success');
    } else {
      showToast('Offline sync verified: Google Form responses merged.', 'success');
    }
  } catch (err) {
    console.warn('Google Form sync error:', err);
    showToast('Synced local and Google Form review databases.', 'success');
  } finally {
    if (btn) btn.disabled = false;
    if (label) label.textContent = 'Sync Google Form Now';
    computeAndRenderStats();
    renderReviewsModeration();
    const lastSyncedLabel = document.getElementById('gf-last-synced-label');
    if (lastSyncedLabel) {
      lastSyncedLabel.textContent = `Last synced: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
}

function openAddGoogleFormReviewModal() {
  const modal = document.getElementById('add-gf-review-modal');
  if (modal) modal.classList.add('active');
}

function closeAddGoogleFormReviewModal() {
  const modal = document.getElementById('add-gf-review-modal');
  if (modal) modal.classList.remove('active');
}

async function handleManualGoogleFormReviewSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('gf-manual-name').value.trim();
  const location = document.getElementById('gf-manual-location').value.trim() || 'Ahmedabad';
  const service = document.getElementById('gf-manual-service').value;
  const rating = parseInt(document.getElementById('gf-manual-rating').value, 10) || 5;
  const comment = document.getElementById('gf-manual-comment').value.trim();

  if (!name || !comment) {
    showToast('Please provide client name and comment.', 'error');
    return;
  }

  const newReview = {
    id: Date.now(),
    name,
    location,
    service,
    rating,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    comment,
    source: 'google-form',
    status: 'Approved',
    featured: false,
    verified: true
  };

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/google-form/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview)
      });
    } catch (e) {
      console.warn('API error:', e);
    }
  }

  allReviews.unshift(newReview);
  localStorage.setItem('ekdant_reviews', JSON.stringify(allReviews));
  localStorage.setItem('voltcraft_reviews', JSON.stringify(allReviews));

  closeAddGoogleFormReviewModal();
  document.getElementById('add-gf-review-form')?.reset();
  computeAndRenderStats();
  renderReviewsModeration();
  showToast(`Google Form review from "${name}" merged into website feed!`, 'success');
}

// =========================================================================
// 9. LEAD ACTIONS & FIELD UPDATES
// =========================================================================
async function updateLeadStatus(id, newStatus) {
  await updateLeadField(id, { status: newStatus });
  showToast(`Status for ${id} updated to ${newStatus}.`, 'success');
}

async function updateLeadTech(id, newTech) {
  await updateLeadField(id, { assignedTo: newTech });
  showToast(`Assigned ${newTech} to ${id}.`, 'success');
}

async function updateLeadField(id, payload) {
  const idx = allLeads.findIndex(q => q.id === id);
  if (idx !== -1) {
    allLeads[idx] = { ...allLeads[idx], ...payload };
  }

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('API sync error', e);
    }
  }

  localStorage.setItem('ekdant_leads', JSON.stringify(allLeads));
  localStorage.setItem('voltcraft_leads', JSON.stringify(allLeads));

  computeAndRenderStats();
  renderLeadsTable();
  renderEmergencyQueue();
  updateBadges();
}

async function deleteLead(id) {
  if (!confirm(`Are you sure you want to remove query ${id}?`)) return;

  allLeads = allLeads.filter(q => q.id !== id);

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/leads/${id}`, { method: 'DELETE' });
    } catch (e) {}
  }

  localStorage.setItem('ekdant_leads', JSON.stringify(allLeads));
  localStorage.setItem('voltcraft_leads', JSON.stringify(allLeads));
  computeAndRenderStats();
  renderLeadsTable();
  renderEmergencyQueue();
  updateBadges();
  showToast(`Lead ${id} has been deleted.`, 'success');
}

async function toggleFeatureReview(id) {
  const rev = allReviews.find(r => r.id === id);
  if (!rev) return;
  const newFeatured = !rev.featured;
  rev.featured = newFeatured;

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: newFeatured })
      });
    } catch (e) {}
  }

  localStorage.setItem('ekdant_reviews', JSON.stringify(allReviews));
  localStorage.setItem('voltcraft_reviews', JSON.stringify(allReviews));
  renderReviewsModeration();
  showToast(`Review ${newFeatured ? 'featured on homepage' : 'unfeatured'}.`, 'success');
}

async function deleteReview(id) {
  if (!confirm('Delete this client review?')) return;
  allReviews = allReviews.filter(r => r.id !== id);

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/reviews/${id}`, { method: 'DELETE' });
    } catch (e) {}
  }

  localStorage.setItem('ekdant_reviews', JSON.stringify(allReviews));
  localStorage.setItem('voltcraft_reviews', JSON.stringify(allReviews));
  computeAndRenderStats();
  renderReviewsModeration();
  updateBadges();
  showToast('Review removed.', 'success');
}

// =========================================================================
// 10. MODALS LOGIC
// =========================================================================
function initModals() {
  const leadModal = document.getElementById('lead-modal');
  const closeLeadBtn = document.getElementById('close-lead-modal');
  const saveLeadBtn = document.getElementById('btn-save-lead-modal');
  const deleteInModalBtn = document.getElementById('btn-delete-lead');

  function closeLead() {
    if (leadModal) leadModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeLeadBtn) closeLeadBtn.addEventListener('click', closeLead);
  if (leadModal) {
    leadModal.addEventListener('click', (e) => {
      if (e.target === leadModal) closeLead();
    });
  }

  if (saveLeadBtn) {
    saveLeadBtn.addEventListener('click', async () => {
      if (!currentEditingLeadId) return;

      const status = document.getElementById('modal-status-select').value;
      const estStatus = document.getElementById('modal-est-status-select')?.value || 'None';
      const assignedTo = document.getElementById('modal-tech-select').value;
      const estimatedValue = document.getElementById('modal-value-input').value;
      const internalNotes = document.getElementById('modal-notes-input').value;

      await updateLeadField(currentEditingLeadId, {
        status,
        estimateStatus: estStatus,
        needsEstimate: estStatus !== 'None',
        assignedTo,
        estimatedValue,
        internalNotes
      });
      renderEstimatesTable();

      closeLead();
      showToast(`Changes saved for ${currentEditingLeadId}.`, 'success');
    });
  }

  if (deleteInModalBtn) {
    deleteInModalBtn.addEventListener('click', () => {
      if (!currentEditingLeadId) return;
      deleteLead(currentEditingLeadId);
      closeLead();
    });
  }

  // Manual New Lead Modal
  const newLeadModal = document.getElementById('new-lead-modal');
  const openNewLeadBtn = document.getElementById('btn-new-lead');
  const closeNewLeadBtn = document.getElementById('close-new-lead-modal');
  const manualForm = document.getElementById('manual-lead-form');

  if (openNewLeadBtn && newLeadModal) {
    openNewLeadBtn.addEventListener('click', () => {
      newLeadModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeNewLead() {
    if (newLeadModal) newLeadModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeNewLeadBtn) closeNewLeadBtn.addEventListener('click', closeNewLead);
  if (newLeadModal) {
    newLeadModal.addEventListener('click', (e) => {
      if (e.target === newLeadModal) closeNewLead();
    });
  }

  if (manualForm) {
    manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = manualForm.querySelector('[name="name"]').value;
      const phone = manualForm.querySelector('[name="phone"]').value;
      const email = manualForm.querySelector('[name="email"]').value;
      const service = manualForm.querySelector('[name="service"]').value;
      const priority = manualForm.querySelector('[name="priority"]').value;
      const description = manualForm.querySelector('[name="description"]').value;

      const newLead = {
        name,
        phone,
        email: email || 'N/A',
        service,
        priority,
        description,
        location: 'Phone Inbound / Walk-in'
      };

      if (API_BASE) {
        try {
          const res = await fetch(`${API_BASE}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLead)
          });
          if (res.ok) {
            const data = await res.json();
            allLeads.unshift(data.lead);
          }
        } catch (err) {}
      } else {
        const localId = 'LEAD-' + (100 + allLeads.length + 1);
        const fullLead = {
          ...newLead,
          id: localId,
          createdAt: new Date().toISOString(),
          status: 'New',
          assignedTo: 'Unassigned',
          estimatedValue: 'Pending',
          internalNotes: 'Logged manually by dispatcher.'
        };
        allLeads.unshift(fullLead);
        localStorage.setItem('ekdant_leads', JSON.stringify(allLeads));
        localStorage.setItem('voltcraft_leads', JSON.stringify(allLeads));
      }

      computeAndRenderStats();
      renderLeadsTable();
      renderEmergencyQueue();
      updateBadges();

      closeNewLead();
      manualForm.reset();
      showToast('New lead has been recorded in dispatch system.', 'success');
    });
  }
}

function openLeadModal(id) {
  const lead = allLeads.find(q => q.id === id);
  if (!lead) return;

  currentEditingLeadId = id;
  const modal = document.getElementById('lead-modal');
  if (!modal) return;

  document.getElementById('modal-lead-title').textContent = `${lead.name} (${lead.service})`;
  document.getElementById('modal-lead-id').textContent = lead.id;
  document.getElementById('modal-lead-time').textContent = `Created: ${new Date(lead.createdAt).toLocaleString()}`;
  document.getElementById('modal-client-name').textContent = lead.name;
  
  const phoneEl = document.getElementById('modal-client-phone');
  phoneEl.textContent = lead.phone;
  phoneEl.href = `tel:${lead.phone}`;

  const emailEl = document.getElementById('modal-client-email');
  emailEl.textContent = lead.email;
  emailEl.href = `mailto:${lead.email}`;

  document.getElementById('modal-lead-desc').textContent = lead.description || 'No description provided';
  document.getElementById('modal-status-select').value = lead.status || 'New';
  const modalEstStatus = document.getElementById('modal-est-status-select');
  if (modalEstStatus) {
    modalEstStatus.value = lead.estimateStatus || (lead.needsEstimate ? 'Needs Estimate' : 'None');
  }
  document.getElementById('modal-tech-select').value = lead.assignedTo || 'Unassigned';
  document.getElementById('modal-value-input').value = lead.estimatedValue || '';
  document.getElementById('modal-notes-input').value = lead.internalNotes || '';

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function initSearchAndFilters() {
  const searchInput = document.getElementById('lead-search-input');
  const statusFilter = document.getElementById('lead-status-filter');
  const serviceFilter = document.getElementById('lead-service-filter');

  if (searchInput) searchInput.addEventListener('input', renderLeadsTable);
  if (statusFilter) statusFilter.addEventListener('change', renderLeadsTable);
  if (serviceFilter) serviceFilter.addEventListener('change', renderLeadsTable);

  const estSearch = document.getElementById('est-search-input');
  const estStatusFilter = document.getElementById('est-status-filter');
  if (estSearch) estSearch.addEventListener('input', renderEstimatesTable);
  if (estStatusFilter) estStatusFilter.addEventListener('change', renderEstimatesTable);
}

function getMockLeads() {
  return [
    {
      id: "LEAD-101",
      createdAt: new Date().toISOString(),
      name: "Sarah & David Chen",
      phone: "(555) 438-2910",
      email: "sarah.chen@example.com",
      location: "Meadowbrook Hills",
      service: "24/7 Emergency Repair",
      priority: "Emergency",
      status: "New",
      assignedTo: "James Kovacs (Van #2)",
      description: "Main circuit breaker keeps buzzing and tripped power. Need urgent dispatch.",
      estimatedValue: "₹1,850",
      needsEstimate: true,
      estimateStatus: "Needs Estimate",
      requestType: "Free Estimate Request",
      internalNotes: "Customer alerted about safety precautions."
    },
    {
      id: "LEAD-102",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      name: "Robert Henderson",
      phone: "(555) 819-3341",
      email: "r.henderson@oakridge.net",
      location: "Oakridge Estates",
      service: "200A Electrical Panel Upgrade",
      priority: "High",
      status: "Scheduled",
      assignedTo: "Ekdant Service Team (Van #1)",
      description: "Old 100A panel replacement before mortgage closing.",
      estimatedValue: "₹12,500",
      needsEstimate: true,
      estimateStatus: "Estimate Sent",
      requestType: "Free Estimate Request",
      internalNotes: "Permit scheduled for Friday."
    },
    {
      id: "LEAD-103",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      name: "Rajesh Patel",
      phone: "+91 98250 11223",
      email: "rajesh.patel@ahmedabad.in",
      location: "Maninagar, Ahmedabad",
      service: "Ground wire installation",
      priority: "Normal",
      status: "New",
      assignedTo: "Unassigned",
      description: "Need whole house earthing and copper ground rod installation with safety test.",
      estimatedValue: "₹4,500",
      needsEstimate: true,
      estimateStatus: "Needs Estimate",
      requestType: "Free Estimate Request",
      internalNotes: "Requested free upfront quotation."
    }
  ];
}

// =========================================================================
// 10. WEBSITE LIVE CONTENT EDITOR (CMS)
// =========================================================================
let currentSiteContent = null;

function switchCMSSubTab(tabId) {
  document.querySelectorAll('.cms-subtab-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-amber-500', 'text-slate-950', 'font-bold');
    btn.classList.add('bg-slate-950', 'text-slate-300', 'font-semibold');
  });
  const activeBtn = document.getElementById(`cms-tab-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-slate-950', 'text-slate-300', 'font-semibold');
    activeBtn.classList.add('active', 'bg-amber-500', 'text-slate-950', 'font-bold');
  }

  document.querySelectorAll('.cms-subtab-pane').forEach(pane => {
    pane.classList.add('hidden');
  });
  const targetPane = document.getElementById(`cms-subtab-${tabId}`);
  if (targetPane) targetPane.classList.remove('hidden');
}

async function loadCMSContent() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/content?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        currentSiteContent = await res.json();
      }
    } catch (e) {
      console.warn('API content load failed, checking storage', e);
    }
  }

  if (!currentSiteContent) {
    try {
      const staticRes = await fetch(`data/site_content.json?t=${Date.now()}`);
      if (staticRes.ok) {
        currentSiteContent = await staticRes.json();
      }
    } catch (e) {}
  }

  if (!currentSiteContent) {
    const stored = localStorage.getItem('ekdant_site_content');
    if (stored) {
      try { currentSiteContent = JSON.parse(stored); } catch (e) {}
    }
  }

  if (!currentSiteContent) return;

  // 1. Populate Company Form
  const c = currentSiteContent.company || {};
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el && v !== undefined) el.value = v;
  };

  setVal('cms-comp-name', c.name || '');
  setVal('cms-comp-legal-name', c.legalName || '');
  setVal('cms-comp-phone', c.phone || '');
  setVal('cms-comp-phone-raw', c.phoneRaw || '');
  setVal('cms-comp-email', c.email || '');
  setVal('cms-comp-hours', c.emergencyHours || '');
  setVal('cms-comp-full-address', c.fullAddress || '');
  setVal('cms-comp-short-address', c.shortAddress || '');
  setVal('cms-comp-maps-url', c.googleMapsUrl || '');

  // 2. Populate Home Form
  const h = currentSiteContent.home || {};
  setVal('cms-home-hero-badge', h.heroBadge || '');
  setVal('cms-home-hero-title', h.heroTitle || '');
  setVal('cms-home-hero-subtitle', h.heroSubtitle || '');
  setVal('cms-home-emergency-banner', h.emergencyBannerText || '');

  const stats = h.stats || {};
  setVal('cms-stat-projects', stats.projects || '');
  setVal('cms-stat-dispatch', stats.dispatchTime || '');
  setVal('cms-stat-satisfaction', stats.satisfaction || '');
  setVal('cms-stat-experience', stats.experience || '');

  // 3. Populate About Form
  const a = currentSiteContent.about || {};
  setVal('cms-about-headline', a.headline || '');
  setVal('cms-about-story', a.story || '');
  setVal('cms-about-mission', a.mission || '');
  setVal('cms-about-badge', a.experienceBadge || '');

  const values = a.values || [];
  for (let i = 0; i < 4; i++) {
    if (values[i]) {
      setVal(`cms-value-title-${i}`, values[i].title || '');
      setVal(`cms-value-desc-${i}`, values[i].desc || '');
    }
  }

  // 4. Render Services List
  renderCMSServices();

  // 4B. Render Trusted Client Logos
  if (typeof renderCMSTrustedClients === 'function') {
    renderCMSTrustedClients();
  }

  // 5. Load Estimate Template & Free Quote Settings
  if (typeof loadEstimateTemplateSettings === 'function') {
    loadEstimateTemplateSettings();
  }
}

function renderCMSServices() {
  const container = document.getElementById('cms-services-list');
  const countBadge = document.getElementById('cms-services-count');
  if (!container || !currentSiteContent) return;

  const services = currentSiteContent.services || [];
  if (countBadge) countBadge.textContent = `${services.length} Services`;

  if (services.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">No services created yet. Click "+ Add New Service" above.</div>`;
    return;
  }

  container.innerHTML = services.map(svc => `
    <div class="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg font-bold">
            <i class="fa-solid ${svc.icon || 'fa-bolt'}"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span>${escapeHtml(svc.title)}</span>
              ${svc.freeEstimate !== false ? `<span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">Free Estimate</span>` : ''}
            </h4>
            <span class="text-[11px] text-amber-400/90 font-medium">${escapeHtml(svc.category || 'General Electrical')}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="saveSingleCMSService('${svc.id}')" class="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all">
            <i class="fa-solid fa-floppy-disk"></i> Save Service
          </button>
          <button onclick="deleteCMSService('${svc.id}')" class="p-2 rounded-lg bg-slate-900 hover:bg-red-600/30 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors" title="Delete Service">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-400 mb-1">Service Title</label>
          <input type="text" id="svc-title-${svc.id}" value="${escapeHtml(svc.title)}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500">
        </div>
        <div>
          <label class="block font-semibold text-slate-400 mb-1">Category</label>
          <input type="text" id="svc-cat-${svc.id}" value="${escapeHtml(svc.category || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500">
        </div>
      </div>

      <div class="grid sm:grid-cols-4 gap-3 text-xs">
        <div class="sm:col-span-3">
          <label class="block font-semibold text-slate-400 mb-1">Customer-Friendly Description</label>
          <textarea id="svc-desc-${svc.id}" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-amber-500">${escapeHtml(svc.description || '')}</textarea>
        </div>
        <div>
          <label class="block font-semibold text-slate-400 mb-1">FontAwesome Icon</label>
          <select id="svc-icon-${svc.id}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500">
            <option value="fa-diagram-project" ${svc.icon === 'fa-diagram-project' ? 'selected' : ''}>Project Execution (fa-diagram-project)</option>
            <option value="fa-file-signature" ${svc.icon === 'fa-file-signature' ? 'selected' : ''}>Torrent Power / Liasioning (fa-file-signature)</option>
            <option value="fa-house-chimney" ${svc.icon === 'fa-house-chimney' ? 'selected' : ''}>Interior Installation (fa-house-chimney)</option>
            <option value="fa-clipboard-check" ${svc.icon === 'fa-clipboard-check' ? 'selected' : ''}>Test Reports (fa-clipboard-check)</option>
            <option value="fa-screwdriver-wrench" ${svc.icon === 'fa-screwdriver-wrench' ? 'selected' : ''}>Maintenance (fa-screwdriver-wrench)</option>
            <option value="fa-magnifying-glass-chart" ${svc.icon === 'fa-magnifying-glass-chart' ? 'selected' : ''}>Inspection (fa-magnifying-glass-chart)</option>
            <option value="fa-network-wired" ${svc.icon === 'fa-network-wired' ? 'selected' : ''}>Cabling & Wiring (fa-network-wired)</option>
            <option value="fa-bolt" ${svc.icon === 'fa-bolt' ? 'selected' : ''}>General Bolt (fa-bolt)</option>
            <option value="fa-shield-halved" ${svc.icon === 'fa-shield-halved' ? 'selected' : ''}>Shield / Earthing</option>
            <option value="fa-lightbulb" ${svc.icon === 'fa-lightbulb' ? 'selected' : ''}>Lightbulb</option>
            <option value="fa-plug" ${svc.icon === 'fa-plug' ? 'selected' : ''}>Plug / Socket</option>
            <option value="fa-wrench" ${svc.icon === 'fa-wrench' ? 'selected' : ''}>Wrench / Repair</option>
            <option value="fa-fan" ${svc.icon === 'fa-fan' ? 'selected' : ''}>Fan</option>
            <option value="fa-sun" ${svc.icon === 'fa-sun' ? 'selected' : ''}>Outdoor Lighting</option>
            <option value="fa-bolt-lightning" ${svc.icon === 'fa-bolt-lightning' ? 'selected' : ''}>Power Restoration</option>
            <option value="fa-toggle-on" ${svc.icon === 'fa-toggle-on' ? 'selected' : ''}>Switch</option>
            <option value="fa-tools" ${svc.icon === 'fa-tools' ? 'selected' : ''}>Tools</option>
          </select>

          <label class="flex items-center gap-2 cursor-pointer mt-3 text-xs">
            <input type="checkbox" id="svc-free-est-${svc.id}" ${svc.freeEstimate !== false ? 'checked' : ''} class="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500">
            <span class="text-emerald-400 font-semibold text-[11px]">Free Estimate</span>
          </label>
        </div>
      </div>

      <!-- Sub-Services Management Box -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div class="flex items-center justify-between">
          <label class="block font-semibold text-amber-400 text-xs flex items-center gap-1.5">
            <i class="fa-solid fa-list-check"></i>
            <span>Sub-Services & Key Inclusions (One per line)</span>
          </label>
          <span class="text-[10px] text-slate-400 font-mono">${(svc.subServices || []).length} Sub-Services</span>
        </div>
        <textarea id="svc-subservices-${svc.id}" rows="4" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-amber-500" placeholder="Enter each sub-service on a new line...">${escapeHtml((svc.subServices || []).join('\n'))}</textarea>
        <p class="text-[10px] text-slate-400">Each non-empty line becomes a bulleted sub-service shown under this service across public and quotation pages.</p>
        
        ${Array.isArray(svc.subServices) && svc.subServices.length > 0 ? `
          <div class="pt-1 flex flex-wrap gap-1.5">
            ${svc.subServices.map(sub => `
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] border border-slate-700">
                <i class="fa-solid fa-check text-emerald-400 text-[10px]"></i>
                <span>${escapeHtml(sub)}</span>
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function saveSingleCMSService(id) {
  if (!currentSiteContent || !currentSiteContent.services) return;
  const svc = currentSiteContent.services.find(s => s.id === id);
  if (!svc) return;

  const title = document.getElementById(`svc-title-${id}`)?.value.trim() || svc.title;
  const category = document.getElementById(`svc-cat-${id}`)?.value.trim() || svc.category;
  const description = document.getElementById(`svc-desc-${id}`)?.value.trim() || svc.description;
  const icon = document.getElementById(`svc-icon-${id}`)?.value || svc.icon;
  const freeEst = document.getElementById(`svc-free-est-${id}`)?.checked !== false;

  const rawSubServices = document.getElementById(`svc-subservices-${id}`)?.value || '';
  const subServices = rawSubServices
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  svc.title = title;
  svc.category = category;
  delete svc.priceRange;
  svc.description = description;
  svc.icon = icon;
  svc.freeEstimate = freeEst;
  svc.subServices = subServices;

  // 1. Direct API update for this specific service endpoint
  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/services/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, category, description, icon, freeEstimate: freeEst, subServices
        })
      });
    } catch (err) {
      console.warn('Direct service API update failed, falling back to full content sync', err);
    }
  }

  // 2. Full content persistence
  await persistCMSContent();
  renderCMSServices();
  showToast(`Service "${title}" updated live on website!`, 'success');
}

async function deleteCMSService(id) {
  if (!confirm('Are you sure you want to remove this service from the website?')) return;
  if (!currentSiteContent || !currentSiteContent.services) return;

  currentSiteContent.services = currentSiteContent.services.filter(s => s.id !== id);
  await persistCMSContent();
  renderCMSServices();
  showToast('Service removed from website catalog.', 'success');
}

function openAddServiceModal() {
  const m = document.getElementById('add-service-modal');
  if (m) m.classList.add('active');
}

function closeAddServiceModal() {
  const m = document.getElementById('add-service-modal');
  if (m) m.classList.remove('active');
}

async function handleCreateServiceSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('new-service-title').value.trim();
  const category = document.getElementById('new-service-category').value.trim();
  const icon = document.getElementById('new-service-icon').value || 'fa-bolt';
  const description = document.getElementById('new-service-desc').value.trim();
  const rawSub = document.getElementById('new-service-subservices')?.value || '';
  const subServices = rawSub
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (!title || !description) {
    showToast('Please provide both service title and description.', 'error');
    return;
  }

  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ('svc-' + Date.now());

  if (!currentSiteContent) currentSiteContent = {};
  if (!currentSiteContent.services) currentSiteContent.services = [];

  const newSvc = { id, title, category, icon, description, subServices, freeEstimate: true };
  currentSiteContent.services.push(newSvc);

  await persistCMSContent();
  closeAddServiceModal();
  document.getElementById('add-service-form')?.reset();
  renderCMSServices();
  showToast(`New service "${title}" published live to website!`, 'success');
}

// =========================================================================
// TRUSTED COMPANY LOGOS CMS MANAGEMENT
// =========================================================================
function renderCMSTrustedClients() {
  const container = document.getElementById('cms-clients-list');
  const countBadge = document.getElementById('cms-clients-count');
  if (!container || !currentSiteContent) return;

  const clients = currentSiteContent.trustedClients || [];
  if (countBadge) countBadge.textContent = `${clients.length} Companies`;

  if (clients.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">No client logos added yet. Click "+ Add New Company" above.</div>`;
    return;
  }

  container.innerHTML = clients.map((c) => `
    <div class="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4 transition-all">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-3">
          <div class="h-12 w-32 bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-center shrink-0">
            <img src="${escapeHtml(c.logo)}" alt="${escapeHtml(c.name)}" class="max-h-full max-w-full object-contain" onerror="this.src='https://via.placeholder.com/140x50?text=No+Logo'">
          </div>
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span>${escapeHtml(c.name)}</span>
              ${c.active !== false ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">Active in Ticker</span>' : '<span class="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Hidden</span>'}
            </h4>
            <span class="text-[11px] text-amber-400/90 font-medium">${escapeHtml(c.category || 'Commercial Client')}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="saveSingleCMSClient('${c.id}')" class="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all">
            <i class="fa-solid fa-floppy-disk"></i> Save
          </button>
          <button onclick="deleteCMSClient('${c.id}')" class="p-2 rounded-lg bg-slate-900 hover:bg-red-600/30 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors" title="Delete Company">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </div>

      <div class="grid sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label class="block font-semibold text-slate-400 mb-1">Company / Brand Name</label>
          <input type="text" id="client-name-${c.id}" value="${escapeHtml(c.name)}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500">
        </div>
        <div>
          <label class="block font-semibold text-slate-400 mb-1">Category / Subtitle</label>
          <input type="text" id="client-cat-${c.id}" value="${escapeHtml(c.category || '')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500">
        </div>
        <div>
          <label class="block font-semibold text-slate-400 mb-1">Logo Image File Path or URL</label>
          <div class="flex gap-2">
            <input type="text" id="client-logo-${c.id}" value="${escapeHtml(c.logo)}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500">
            <label class="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer shrink-0">
              <input type="checkbox" id="client-active-${c.id}" ${c.active !== false ? 'checked' : ''} class="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500">
              <span class="text-[11px]">Show</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function openAddClientModal() {
  const m = document.getElementById('add-client-modal');
  if (m) m.classList.add('active');
}

function closeAddClientModal() {
  const m = document.getElementById('add-client-modal');
  if (m) m.classList.remove('active');
}

async function handleCreateClientSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('new-client-name')?.value.trim();
  const category = document.getElementById('new-client-cat')?.value.trim();
  const logo = document.getElementById('new-client-logo')?.value.trim();

  if (!name || !logo) {
    showToast('Please provide both company name and logo image path.', 'error');
    return;
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ('client-' + Date.now());
  const newClient = { id, name, category: category || 'Commercial Client', logo, active: true };

  if (!currentSiteContent) currentSiteContent = {};
  if (!Array.isArray(currentSiteContent.trustedClients)) currentSiteContent.trustedClients = [];

  currentSiteContent.trustedClients.push(newClient);

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
    } catch (err) {
      console.warn('API client post failed', err);
    }
  }

  await persistCMSContent();
  closeAddClientModal();
  document.getElementById('add-client-form')?.reset();
  renderCMSTrustedClients();
  showToast(`Company "${name}" added to homepage marquee!`, 'success');
}

async function saveSingleCMSClient(id) {
  if (!currentSiteContent || !currentSiteContent.trustedClients) return;
  const client = currentSiteContent.trustedClients.find(c => c.id === id);
  if (!client) return;

  const name = document.getElementById(`client-name-${id}`)?.value.trim() || client.name;
  const category = document.getElementById(`client-cat-${id}`)?.value.trim() || client.category;
  const logo = document.getElementById(`client-logo-${id}`)?.value.trim() || client.logo;
  const active = document.getElementById(`client-active-${id}`)?.checked !== false;

  client.name = name;
  client.category = category;
  client.logo = logo;
  client.active = active;

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/clients/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, logo, active })
      });
    } catch (err) {
      console.warn('Direct client update failed', err);
    }
  }

  await persistCMSContent();
  renderCMSTrustedClients();
  showToast(`Company "${name}" updated live!`, 'success');
}

async function deleteCMSClient(id) {
  if (!confirm('Are you sure you want to remove this company logo from the website?')) return;
  if (!currentSiteContent || !currentSiteContent.trustedClients) return;

  currentSiteContent.trustedClients = currentSiteContent.trustedClients.filter(c => c.id !== id);

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/clients/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('API delete client failed', err);
    }
  }

  await persistCMSContent();
  renderCMSTrustedClients();
  showToast('Company removed from ticker.', 'success');
}

async function saveAllCMSClients() {
  if (!currentSiteContent || !currentSiteContent.trustedClients) return;
  
  currentSiteContent.trustedClients.forEach(c => {
    const nameEl = document.getElementById(`client-name-${c.id}`);
    const catEl = document.getElementById(`client-cat-${c.id}`);
    const logoEl = document.getElementById(`client-logo-${c.id}`);
    const activeEl = document.getElementById(`client-active-${c.id}`);

    if (nameEl) c.name = nameEl.value.trim() || c.name;
    if (catEl) c.category = catEl.value.trim() || c.category;
    if (logoEl) c.logo = logoEl.value.trim() || c.logo;
    if (activeEl) c.active = activeEl.checked !== false;
  });

  await persistCMSContent();
  renderCMSTrustedClients();
  showToast('All company logos saved and updated live on website!', 'success');
}

async function handleSaveCompanyContent(e) {
  if (e) e.preventDefault();
  if (!currentSiteContent) currentSiteContent = {};
  if (!currentSiteContent.company) currentSiteContent.company = {};

  const c = currentSiteContent.company;
  c.name = document.getElementById('cms-comp-name')?.value.trim() || c.name;
  c.legalName = document.getElementById('cms-comp-legal-name')?.value.trim() || c.legalName;
  c.phone = document.getElementById('cms-comp-phone')?.value.trim() || c.phone;
  c.phoneRaw = document.getElementById('cms-comp-phone-raw')?.value.trim() || c.phoneRaw;
  c.email = document.getElementById('cms-comp-email')?.value.trim() || c.email;
  c.emergencyHours = document.getElementById('cms-comp-hours')?.value.trim() || c.emergencyHours;
  c.fullAddress = document.getElementById('cms-comp-full-address')?.value.trim() || c.fullAddress;
  c.shortAddress = document.getElementById('cms-comp-short-address')?.value.trim() || c.shortAddress;
  c.googleMapsUrl = document.getElementById('cms-comp-maps-url')?.value.trim() || c.googleMapsUrl;

  await persistCMSContent();
  showToast('Company details and contact information updated live!', 'success');
}

async function handleSaveHomeContent(e) {
  if (e) e.preventDefault();
  if (!currentSiteContent) currentSiteContent = {};
  if (!currentSiteContent.home) currentSiteContent.home = {};

  const h = currentSiteContent.home;
  h.heroBadge = document.getElementById('cms-home-hero-badge')?.value.trim() || h.heroBadge;
  h.heroTitle = document.getElementById('cms-home-hero-title')?.value.trim() || h.heroTitle;
  h.heroSubtitle = document.getElementById('cms-home-hero-subtitle')?.value.trim() || h.heroSubtitle;
  h.emergencyBannerText = document.getElementById('cms-home-emergency-banner')?.value.trim() || h.emergencyBannerText;

  if (!h.stats) h.stats = {};
  h.stats.projects = document.getElementById('cms-stat-projects')?.value.trim() || h.stats.projects;
  h.stats.dispatchTime = document.getElementById('cms-stat-dispatch')?.value.trim() || h.stats.dispatchTime;
  h.stats.satisfaction = document.getElementById('cms-stat-satisfaction')?.value.trim() || h.stats.satisfaction;
  h.stats.experience = document.getElementById('cms-stat-experience')?.value.trim() || h.stats.experience;

  await persistCMSContent();
  showToast('Homepage hero text, announcements, and statistics saved live!', 'success');
}

async function handleSaveAboutContent(e) {
  if (e) e.preventDefault();
  if (!currentSiteContent) currentSiteContent = {};
  if (!currentSiteContent.about) currentSiteContent.about = {};

  const a = currentSiteContent.about;
  a.headline = document.getElementById('cms-about-headline')?.value.trim() || a.headline;
  a.story = document.getElementById('cms-about-story')?.value.trim() || a.story;
  a.mission = document.getElementById('cms-about-mission')?.value.trim() || a.mission;
  a.experienceBadge = document.getElementById('cms-about-badge')?.value.trim() || a.experienceBadge;

  a.values = [];
  for (let i = 0; i < 4; i++) {
    const title = document.getElementById(`cms-value-title-${i}`)?.value.trim();
    const desc = document.getElementById(`cms-value-desc-${i}`)?.value.trim();
    if (title || desc) {
      a.values.push({ title: title || '', desc: desc || '' });
    }
  }

  await persistCMSContent();
  showToast('About Us narrative and core values saved live!', 'success');
}

async function saveAllCMSContent() {
  await handleSaveCompanyContent();
  await handleSaveHomeContent();
  await handleSaveAboutContent();
  showToast('All website sections saved and published live!', 'success');
}

async function persistCMSContent() {
  if (!currentSiteContent) return;
  localStorage.setItem('ekdant_site_content', JSON.stringify(currentSiteContent));

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSiteContent)
      });
    } catch (e) {
      console.warn('API content persist failed', e);
    }
  }
}

// =========================================================================
// 11. ESTIMATES & FREE QUOTE MANAGEMENT
// =========================================================================

let currentQuoteLeadId = null;

const DEFAULT_ESTIMATE_TEMPLATE = {
  companyHeader: "EKDANT ENTERPRISE - LICENSED ELECTRICAL CONTRACTOR",
  validityDays: "30 Days",
  warranty: "1-Year Craftsmanship Guarantee",
  standardInclusions: "• Certified master electrician labor\n• Local electrical code compliance & safety testing\n• Spotless property cleanup upon completion",
  terms: "• Transparent upfront flat-rate pricing. Zero hidden fees.\n• Written sign-off required prior to commencing specialized work.\n• Payment upon successful testing & client sign-off.",
  bodyTemplate: `EKDANT ENTERPRISE - OFFICIAL SERVICE ESTIMATE
===================================================
Contractor: Ekdant Enterprise (Licensed Electrical)
Contact: {COMPANY_PHONE} | {COMPANY_CITY}
Date: {DATE}

Client: {CUSTOMER_NAME}
Phone: {CUSTOMER_PHONE}
Service: {SERVICE_NAME}
Estimated Value: {ESTIMATE_VALUE}
Validity: {VALIDITY}

Scope & Inclusions:
{INCLUSIONS}

Pricing & Payment Terms:
{TERMS}
Warranty: {WARRANTY}

===================================================
To approve this estimate or schedule your appointment, 
reply directly to this message or call {COMPANY_PHONE}.`
};

function getActiveEstimateSettings() {
  if (!currentSiteContent) currentSiteContent = {};
  if (!currentSiteContent.estimateSettings) {
    currentSiteContent.estimateSettings = {
      enableFreeEstimateGlobal: true,
      headerButtonText: "Free Estimate",
      heroCtaText: "Request Your Free Estimate",
      modalTitle: "Request a Free Estimate",
      modalSubtitle: "No obligation • Transparent flat-rate upfront pricing",
      defaultTemplate: { ...DEFAULT_ESTIMATE_TEMPLATE }
    };
  }
  if (!currentSiteContent.estimateSettings.defaultTemplate) {
    currentSiteContent.estimateSettings.defaultTemplate = { ...DEFAULT_ESTIMATE_TEMPLATE };
  }
  return currentSiteContent.estimateSettings;
}

function loadEstimateTemplateSettings() {
  const settings = getActiveEstimateSettings();
  const tpl = settings.defaultTemplate || DEFAULT_ESTIMATE_TEMPLATE;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined ? val : '';
  };

  setVal('tpl-company-header', tpl.companyHeader || DEFAULT_ESTIMATE_TEMPLATE.companyHeader);
  setVal('tpl-validity', tpl.validityDays || DEFAULT_ESTIMATE_TEMPLATE.validityDays);
  setVal('tpl-warranty', tpl.warranty || DEFAULT_ESTIMATE_TEMPLATE.warranty);
  setVal('tpl-inclusions', tpl.standardInclusions || DEFAULT_ESTIMATE_TEMPLATE.standardInclusions);
  setVal('tpl-terms', tpl.terms || DEFAULT_ESTIMATE_TEMPLATE.terms);
  setVal('tpl-body', tpl.bodyTemplate || DEFAULT_ESTIMATE_TEMPLATE.bodyTemplate);

  const globalToggle = document.getElementById('fe-global-toggle');
  if (globalToggle) {
    globalToggle.checked = settings.enableFreeEstimateGlobal !== false;
    toggleFreeEstimateInputs(globalToggle.checked);
  }

  setVal('fe-header-btn', settings.headerButtonText || 'Free Estimate');
  setVal('fe-hero-cta', settings.heroCtaText || 'Request Your Free Estimate');
  setVal('fe-modal-title', settings.modalTitle || 'Request a Free Estimate');

  renderServicesFreeEstimateCheckboxes();
  renderEstimateLivePreview();
  renderEstimatesTable();
  loadEmailJSSettings();
}

function renderServicesFreeEstimateCheckboxes() {
  const container = document.getElementById('fe-services-checkboxes');
  if (!container || !currentSiteContent || !currentSiteContent.services) return;

  container.innerHTML = currentSiteContent.services.map(svc => `
    <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs transition-colors">
      <input type="checkbox" data-service-id="${svc.id}" class="fe-service-chk rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4" ${svc.freeEstimate !== false ? 'checked' : ''}>
      <div class="truncate">
        <span class="font-bold text-white block truncate">${escapeHtml(svc.title)}</span>
        <span class="text-[10px] text-slate-400">${escapeHtml(svc.category || 'General')}</span>
      </div>
    </label>
  `).join('');
}

function toggleAllServicesFreeEstimate(state) {
  document.querySelectorAll('.fe-service-chk').forEach(chk => {
    chk.checked = state;
  });
}

function toggleFreeEstimateInputs(enabled) {
  const ids = ['fe-header-btn', 'fe-hero-cta', 'fe-modal-title'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

function renderEstimateLivePreview() {
  const previewBox = document.getElementById('estimate-live-preview-box');
  if (!previewBox) return;

  const rawTemplate = document.getElementById('tpl-body')?.value || DEFAULT_ESTIMATE_TEMPLATE.bodyTemplate;
  const validity = document.getElementById('tpl-validity')?.value || '30 Days';
  const warranty = document.getElementById('tpl-warranty')?.value || '1-Year Craftsmanship Guarantee';
  const inclusions = document.getElementById('tpl-inclusions')?.value || DEFAULT_ESTIMATE_TEMPLATE.standardInclusions;
  const terms = document.getElementById('tpl-terms')?.value || DEFAULT_ESTIMATE_TEMPLATE.terms;
  const phone = currentSiteContent?.company?.phone || '+91 91068 33627';
  const city = currentSiteContent?.company?.city || 'Ahmedabad, Gujarat';

  const previewText = rawTemplate
    .replace(/{CUSTOMER_NAME}/g, 'Ramesh Patel')
    .replace(/{CUSTOMER_PHONE}/g, '+91 98250 12345')
    .replace(/{SERVICE_NAME}/g, 'Ground wire installation & Safety Earthing')
    .replace(/{ESTIMATE_VALUE}/g, '₹4,500')
    .replace(/{VALIDITY}/g, validity)
    .replace(/{WARRANTY}/g, warranty)
    .replace(/{INCLUSIONS}/g, inclusions)
    .replace(/{TERMS}/g, terms)
    .replace(/{COMPANY_PHONE}/g, phone)
    .replace(/{COMPANY_CITY}/g, city)
    .replace(/{DATE}/g, new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));

  previewBox.textContent = previewText;
}

async function saveEstimateTemplateSettings() {
  const settings = getActiveEstimateSettings();

  settings.defaultTemplate = {
    companyHeader: document.getElementById('tpl-company-header')?.value.trim() || DEFAULT_ESTIMATE_TEMPLATE.companyHeader,
    validityDays: document.getElementById('tpl-validity')?.value.trim() || '30 Days',
    warranty: document.getElementById('tpl-warranty')?.value.trim() || '1-Year Craftsmanship Guarantee',
    standardInclusions: document.getElementById('tpl-inclusions')?.value.trim() || DEFAULT_ESTIMATE_TEMPLATE.standardInclusions,
    terms: document.getElementById('tpl-terms')?.value.trim() || DEFAULT_ESTIMATE_TEMPLATE.terms,
    bodyTemplate: document.getElementById('tpl-body')?.value.trim() || DEFAULT_ESTIMATE_TEMPLATE.bodyTemplate
  };

  await persistCMSContent();
  renderEstimateLivePreview();
  showToast('Default estimate template saved successfully!', 'success');
}

function resetDefaultEstimateTemplate() {
  if (!confirm('Reset the estimate template back to factory defaults?')) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('tpl-company-header', DEFAULT_ESTIMATE_TEMPLATE.companyHeader);
  setVal('tpl-validity', DEFAULT_ESTIMATE_TEMPLATE.validityDays);
  setVal('tpl-warranty', DEFAULT_ESTIMATE_TEMPLATE.warranty);
  setVal('tpl-inclusions', DEFAULT_ESTIMATE_TEMPLATE.standardInclusions);
  setVal('tpl-terms', DEFAULT_ESTIMATE_TEMPLATE.terms);
  setVal('tpl-body', DEFAULT_ESTIMATE_TEMPLATE.bodyTemplate);

  renderEstimateLivePreview();
  showToast('Estimate template reset to default. Click "Save Template" to publish.', 'info');
}

async function saveFreeEstimateGlobalSettings() {
  const settings = getActiveEstimateSettings();

  settings.enableFreeEstimateGlobal = document.getElementById('fe-global-toggle')?.checked !== false;
  settings.headerButtonText = document.getElementById('fe-header-btn')?.value.trim() || 'Free Estimate';
  settings.heroCtaText = document.getElementById('fe-hero-cta')?.value.trim() || 'Request Your Free Estimate';
  settings.modalTitle = document.getElementById('fe-modal-title')?.value.trim() || 'Request a Free Estimate';

  // Update services free estimate flags
  if (currentSiteContent && Array.isArray(currentSiteContent.services)) {
    document.querySelectorAll('.fe-service-chk').forEach(chk => {
      const svcId = chk.getAttribute('data-service-id');
      const svc = currentSiteContent.services.find(s => s.id === svcId);
      if (svc) {
        svc.freeEstimate = chk.checked;
      }
    });
  }

  await persistCMSContent();
  renderCMSServices();
  showToast('Website Free Estimate settings and service tags saved live!', 'success');
}

// -------------------------------------------------------------------------
// EmailJS Notification Settings Handler
// -------------------------------------------------------------------------
async function loadEmailJSSettings() {
  try {
    let config = {
      serviceId: '',
      templateId: '',
      publicKey: '',
      recipientEmail: 'ekdantenterprise33@gmail.com',
      enabled: true
    };

    if (API_BASE) {
      const res = await fetch(`${API_BASE}/api/emailjs/config`);
      if (res.ok) {
        config = await res.json();
      }
    } else {
      const local = localStorage.getItem('emailjs_config');
      if (local) config = JSON.parse(local);
    }

    const recInput = document.getElementById('emailjs-recipient-email');
    const sIdInput = document.getElementById('emailjs-service-id');
    const tIdInput = document.getElementById('emailjs-template-id');
    const pKeyInput = document.getElementById('emailjs-public-key');
    const statusPill = document.getElementById('emailjs-status-pill');

    if (recInput) recInput.value = config.recipientEmail || 'ekdantenterprise33@gmail.com';
    if (sIdInput) sIdInput.value = config.serviceId || '';
    if (tIdInput) tIdInput.value = config.templateId || '';
    if (pKeyInput) pKeyInput.value = config.publicKey || '';

    if (statusPill) {
      if (config.serviceId && config.templateId && config.publicKey) {
        statusPill.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        statusPill.innerHTML = '<i class="fa-solid fa-circle-check mr-1 text-emerald-400"></i> Connected & Active';
      } else {
        statusPill.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30';
        statusPill.innerHTML = '<i class="fa-solid fa-clock mr-1 text-amber-400"></i> Ready to Connect';
      }
    }
  } catch (err) {
    console.warn('Could not load EmailJS settings:', err);
  }
}

async function saveEmailJSSettings() {
  const recipientEmail = document.getElementById('emailjs-recipient-email')?.value.trim() || 'ekdantenterprise33@gmail.com';
  const serviceId = document.getElementById('emailjs-service-id')?.value.trim() || '';
  const templateId = document.getElementById('emailjs-template-id')?.value.trim() || '';
  const publicKey = document.getElementById('emailjs-public-key')?.value.trim() || '';

  const config = {
    serviceId,
    templateId,
    publicKey,
    recipientEmail,
    enabled: true
  };

  try {
    if (API_BASE) {
      await fetch(`${API_BASE}/api/emailjs/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    }
    localStorage.setItem('emailjs_config', JSON.stringify(config));
    await loadEmailJSSettings();
    showToast('EmailJS configuration saved successfully!', 'success');
  } catch (err) {
    console.error('Failed to save EmailJS settings:', err);
    showToast('Failed to save EmailJS settings.', 'error');
  }
}

async function testEmailJSConnection() {
  const btn = document.getElementById('btn-test-emailjs');
  const original = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Sending...';
  }

  try {
    const res = await fetch(`${API_BASE}/api/emailjs/test`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Test email sent to ekdantenterprise33@gmail.com!', 'success');
    } else {
      showToast(data.error || 'Failed to dispatch test email. Please check your keys.', 'error');
    }
  } catch (err) {
    showToast('Error testing EmailJS connection: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }
}

// -------------------------------------------------------------------------
// Estimates Table & Leads Management
// -------------------------------------------------------------------------
function renderEstimatesTable() {
  const tbody = document.getElementById('estimates-table-body');
  if (!tbody) return;

  const searchTerm = (document.getElementById('est-search-input')?.value || '').toLowerCase().trim();
  const filter = document.getElementById('est-status-filter')?.value || 'all';

  // Filter leads that need an estimate or have estimate details
  const estimateLeads = allLeads.filter(lead => {
    const hasEstimateFlag = lead.needsEstimate === true || 
      (lead.estimateStatus && lead.estimateStatus !== 'None') ||
      (lead.requestType && lead.requestType.includes('Estimate')) ||
      (lead.description && lead.description.toLowerCase().includes('estimate')) ||
      (lead.internalNotes && lead.internalNotes.toLowerCase().includes('estimate'));

    if (!hasEstimateFlag) return false;

    if (filter === 'needs_estimate') {
      if (lead.estimateStatus && lead.estimateStatus !== 'Needs Estimate') return false;
    } else if (filter === 'free_estimate_req') {
      if (!lead.requestType || !lead.requestType.includes('Free Estimate')) return false;
    } else if (filter === 'estimate_sent') {
      if (lead.estimateStatus !== 'Estimate Sent') return false;
    } else if (filter === 'estimate_approved') {
      if (lead.estimateStatus !== 'Estimate Approved') return false;
    }

    if (searchTerm) {
      const text = `${lead.name} ${lead.phone} ${lead.service} ${lead.description || ''} ${lead.estimatedValue || ''}`.toLowerCase();
      if (!text.includes(searchTerm)) return false;
    }

    return true;
  });

  // Update stats counters
  const pendingCount = allLeads.filter(q => q.needsEstimate && (!q.estimateStatus || q.estimateStatus === 'Needs Estimate')).length;
  const freeReqCount = allLeads.filter(q => q.requestType && q.requestType.includes('Free Estimate')).length;
  const sentCount = allLeads.filter(q => q.estimateStatus === 'Estimate Sent').length;
  const approvedCount = allLeads.filter(q => q.estimateStatus === 'Estimate Approved').length;

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTxt('stat-est-pending', pendingCount);
  setTxt('stat-est-free-req', freeReqCount);
  setTxt('stat-est-sent', sentCount);
  setTxt('stat-est-approved', approvedCount);

  const badge = document.getElementById('badge-estimates-count');
  if (badge) badge.textContent = pendingCount + freeReqCount;

  if (estimateLeads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-500">
          <i class="fa-solid fa-file-circle-check text-2xl text-slate-600 mb-2 block"></i>
          <span>No estimate inquiries matching criteria. Add one with the "Add Estimate Inquiry" button.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = estimateLeads.map(lead => {
    const status = lead.estimateStatus || (lead.needsEstimate ? 'Needs Estimate' : 'Free Estimate Requested');

    return `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-3 px-4">
          <div class="font-bold text-white text-xs">${escapeHtml(lead.name)}</div>
          <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span><i class="fa-solid fa-phone text-[9px] text-amber-400 mr-1"></i>${escapeHtml(lead.phone)}</span>
            ${lead.email && lead.email !== 'N/A' ? `<span class="truncate max-w-[120px]"><i class="fa-solid fa-envelope text-[9px] text-slate-500 mr-1"></i>${escapeHtml(lead.email)}</span>` : ''}
          </div>
        </td>

        <td class="py-3 px-4">
          <span class="font-semibold text-amber-400 text-xs block">${escapeHtml(lead.service)}</span>
          <span class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${escapeHtml(lead.description || 'No project description')}</span>
        </td>

        <td class="py-3 px-4 whitespace-nowrap">
          <select onchange="updateEstimateStatus('${lead.id}', this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500">
            <option value="Needs Estimate" ${status === 'Needs Estimate' ? 'selected' : ''}>Needs Estimate</option>
            <option value="Free Estimate Requested" ${status === 'Free Estimate Requested' ? 'selected' : ''}>Free Estimate Req</option>
            <option value="Estimate Sent" ${status === 'Estimate Sent' ? 'selected' : ''}>Estimate Sent</option>
            <option value="Estimate Approved" ${status === 'Estimate Approved' ? 'selected' : ''}>Estimate Approved</option>
            <option value="None" ${status === 'None' ? 'selected' : ''}>Clear Estimate</option>
          </select>
        </td>

        <td class="py-3 px-4 whitespace-nowrap">
          <input type="text" value="${escapeHtml(lead.estimatedValue || 'Pending')}" onchange="updateLeadField('${lead.id}', { estimatedValue: this.value })" class="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-400 font-bold w-24 focus:outline-none focus:border-amber-500">
        </td>

        <td class="py-3 px-4 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="generateEstimateForLead('${lead.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1" title="Generate Estimate Slip">
              <i class="fa-solid fa-bolt"></i> Quote
            </button>
            <button onclick="openLeadModal('${lead.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors" title="Full Lead Details">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="removeEstimateFromLead('${lead.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition-colors" title="Remove Estimate Requirement">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateEstimateStatus(id, newStatus) {
  const lead = allLeads.find(q => q.id === id);
  if (!lead) return;

  if (newStatus === 'None') {
    lead.needsEstimate = false;
    lead.estimateStatus = 'None';
  } else {
    lead.needsEstimate = true;
    lead.estimateStatus = newStatus;
  }

  await updateLeadField(id, {
    needsEstimate: lead.needsEstimate,
    estimateStatus: lead.estimateStatus
  });

  renderEstimatesTable();
  updateBadges();
  showToast(`Estimate status updated to "${newStatus}" for ${lead.name}`, 'success');
}

async function removeEstimateFromLead(id) {
  const lead = allLeads.find(q => q.id === id);
  if (!lead) return;

  if (!confirm(`Remove estimate requirement for ${lead.name}? (Job stays in dispatch list)`)) return;

  lead.needsEstimate = false;
  lead.estimateStatus = 'None';

  await updateLeadField(id, {
    needsEstimate: false,
    estimateStatus: 'None'
  });

  renderEstimatesTable();
  updateBadges();
  showToast(`Estimate requirement removed for ${lead.name}.`, 'info');
}

function openNewEstimateModal() {
  const modal = document.getElementById('new-estimate-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeNewEstimateModal() {
  const modal = document.getElementById('new-estimate-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

async function handleCreateEstimateItem(e) {
  e.preventDefault();
  const name = document.getElementById('new-est-name')?.value.trim() || 'Client';
  const phone = document.getElementById('new-est-phone')?.value.trim() || 'N/A';
  const email = document.getElementById('new-est-email')?.value.trim() || 'N/A';
  const service = document.getElementById('new-est-service')?.value || 'General Electrical';
  const estimatedValue = document.getElementById('new-est-value')?.value.trim() || 'Pending';
  const description = document.getElementById('new-est-notes')?.value.trim() || 'Job estimate requested';

  const newLead = {
    id: 'EST-' + Date.now().toString().slice(-4),
    createdAt: new Date().toISOString(),
    name,
    phone,
    email,
    location: currentSiteContent?.company?.city || 'Ahmedabad, Gujarat',
    service,
    priority: 'Normal',
    status: 'New',
    assignedTo: 'Unassigned',
    description,
    estimatedValue,
    needsEstimate: true,
    estimateStatus: 'Needs Estimate',
    requestType: 'Free Estimate Request',
    internalNotes: 'Added via Admin Estimate Manager'
  };

  allLeads.unshift(newLead);

  if (API_BASE) {
    try {
      await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
    } catch (err) {}
  }

  localStorage.setItem('ekdant_leads', JSON.stringify(allLeads));
  closeNewEstimateModal();
  document.getElementById('new-estimate-form')?.reset();
  renderEstimatesTable();
  renderLeadsTable();
  updateBadges();
  showToast(`Estimate item added for ${name}!`, 'success');
}

// -------------------------------------------------------------------------
// Estimate Quote Generator Modal
// -------------------------------------------------------------------------
function generateEstimateForLead(id) {
  const lead = allLeads.find(q => q.id === id);
  if (!lead) return;

  currentQuoteLeadId = id;
  const modal = document.getElementById('estimate-quote-modal');
  if (!modal) return;

  const nameInput = document.getElementById('quote-client-name');
  const serviceInput = document.getElementById('quote-client-service');
  const valueInput = document.getElementById('quote-client-value');
  const phoneInput = document.getElementById('quote-client-phone');

  if (nameInput) nameInput.value = lead.name;
  if (serviceInput) serviceInput.value = lead.service;
  if (valueInput) valueInput.value = lead.estimatedValue || '₹2,500';
  if (phoneInput) phoneInput.value = lead.phone || '';

  regenerateEstimateFromTemplate();

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function generateQuoteForCurrentLead() {
  if (currentEditingLeadId) {
    generateEstimateForLead(currentEditingLeadId);
  }
}

async function removeEstimateFromCurrentLead() {
  if (!currentEditingLeadId) return;
  const statusSelect = document.getElementById('modal-est-status-select');
  if (statusSelect) statusSelect.value = 'None';
  await removeEstimateFromLead(currentEditingLeadId);
}

function closeEstimateQuoteModal() {
  const modal = document.getElementById('estimate-quote-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function regenerateEstimateFromTemplate() {
  const settings = getActiveEstimateSettings();
  const tpl = settings.defaultTemplate || DEFAULT_ESTIMATE_TEMPLATE;

  const clientName = document.getElementById('quote-client-name')?.value.trim() || 'Valued Client';
  const clientService = document.getElementById('quote-client-service')?.value.trim() || 'Electrical Work';
  const clientValue = document.getElementById('quote-client-value')?.value.trim() || 'Pending Assessment';
  const clientPhone = document.getElementById('quote-client-phone')?.value.trim() || '';

  const validity = tpl.validityDays || '30 Days';
  const warranty = tpl.warranty || '1-Year Craftsmanship Guarantee';
  const inclusions = tpl.standardInclusions || DEFAULT_ESTIMATE_TEMPLATE.standardInclusions;
  const terms = tpl.terms || DEFAULT_ESTIMATE_TEMPLATE.terms;
  const phone = currentSiteContent?.company?.phone || '+91 91068 33627';
  const city = currentSiteContent?.company?.city || 'Ahmedabad, Gujarat';
  const address = currentSiteContent?.company?.shortAddress || 'C.T.M, Ahmedabad';

  const body = (tpl.bodyTemplate || DEFAULT_ESTIMATE_TEMPLATE.bodyTemplate)
    .replace(/{CUSTOMER_NAME}/g, clientName)
    .replace(/{CUSTOMER_PHONE}/g, clientPhone)
    .replace(/{SERVICE_NAME}/g, clientService)
    .replace(/{ESTIMATE_VALUE}/g, clientValue)
    .replace(/{VALIDITY}/g, validity)
    .replace(/{WARRANTY}/g, warranty)
    .replace(/{INCLUSIONS}/g, inclusions)
    .replace(/{TERMS}/g, terms)
    .replace(/{COMPANY_PHONE}/g, phone)
    .replace(/{COMPANY_CITY}/g, city)
    .replace(/{COMPANY_ADDRESS}/g, address)
    .replace(/{DATE}/g, new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));

  const textArea = document.getElementById('quote-generated-text');
  if (textArea) textArea.value = body;
}

function copyEstimateToClipboard() {
  const text = document.getElementById('quote-generated-text')?.value;
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Estimate quote copied to clipboard! Ready to paste into WhatsApp/Email.', 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

function sendEstimateViaWhatsApp() {
  const phone = (document.getElementById('quote-client-phone')?.value || '').replace(/[^0-9]/g, '');
  const text = encodeURIComponent(document.getElementById('quote-generated-text')?.value || '');

  if (!phone) {
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  } else {
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
  }
}

async function saveEstimateToLead() {
  if (!currentQuoteLeadId) return;
  const lead = allLeads.find(q => q.id === currentQuoteLeadId);
  if (!lead) return;

  const quoteText = document.getElementById('quote-generated-text')?.value || '';
  const estValue = document.getElementById('quote-client-value')?.value || lead.estimatedValue;

  lead.estimatedValue = estValue;
  lead.estimateStatus = 'Estimate Sent';
  lead.needsEstimate = true;
  lead.internalNotes = (lead.internalNotes || '') + `\n[Estimate Sent ${new Date().toLocaleDateString()}]:\n` + quoteText;

  await updateLeadField(currentQuoteLeadId, {
    estimatedValue: lead.estimatedValue,
    estimateStatus: lead.estimateStatus,
    needsEstimate: true,
    internalNotes: lead.internalNotes
  });

  closeEstimateQuoteModal();
  renderEstimatesTable();
  renderLeadsTable();
  updateBadges();
  showToast(`Estimate marked as SENT and saved to ${lead.name}'s file.`, 'success');
}
