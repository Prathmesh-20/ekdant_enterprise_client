/**
 * Ekdant Enterprise - Main JavaScript
 * Interactive functionality, LocalStorage + API integration, Before/After slider, Modals & Toast
 */

const API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
  ? window.location.origin
  : 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileNav();
  initQuoteModal();
  initHeroEstimateForm();
  initServiceFilters();
  initActiveNavLink();
  initBeforeAfterSliders();
  initGalleryFiltersAndLightbox();
  initFeedbackForm();
  initReviewsDisplay();
  initContactPageForm();
  initLiveSiteContent();
  initStealthAdminAccess();
  initHighConversionLeadTools();
});

// Stealth Admin / Dispatch Portal Access (Invisible to clients)
function initStealthAdminAccess() {
  // 1. Keyboard Shortcut: Ctrl + Shift + A (or Alt + Shift + D)
  window.addEventListener('keydown', (e) => {
    const isCtrlShiftA = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a');
    const isAltShiftD = e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd');
    if (isCtrlShiftA || isAltShiftD) {
      e.preventDefault();
      window.location.href = 'admin.html';
    }
  });

  // 2. Triple-Click on Footer Copyright Text
  const triggers = document.querySelectorAll('.site-copyright-trigger, footer p');
  triggers.forEach(el => {
    let clickCount = 0;
    let timer = null;
    el.addEventListener('click', () => {
      clickCount++;
      clearTimeout(timer);
      if (clickCount >= 3) {
        clickCount = 0;
        window.location.href = 'admin.html';
      } else {
        timer = setTimeout(() => { clickCount = 0; }, 500);
      }
    });
  });
}

// High-Conversion Lead Tools: Direct Floating WhatsApp & Mobile Sticky Action Dock
function initHighConversionLeadTools() {
  if (window.location.pathname.includes('admin.html')) return;

  const phoneDisplay = '+91 91068 33627';
  const whatsappNumber = '919106833627';
  const defaultMessage = 'Hello Ekdant Enterprise, I would like to get an electrical estimate / inquiry for my project in Ahmedabad.';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultMessage)}`;

  // 1. Inject Floating WhatsApp Direct Redirect Button
  if (!document.getElementById('whatsapp-lead-container')) {
    const waContainer = document.createElement('div');
    waContainer.id = 'whatsapp-lead-container';
    waContainer.className = 'whatsapp-float-container';

    waContainer.innerHTML = `
      <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" id="whatsapp-toggle-btn" class="whatsapp-float-btn" aria-label="Chat directly on WhatsApp with Ekdant Enterprise">
        <div class="whatsapp-pulse-ring"></div>
        <i class="fa-brands fa-whatsapp"></i>
        <div class="whatsapp-online-dot"></div>
        <span class="whatsapp-pill-label">💬 Chat on WhatsApp</span>
      </a>
    `;

    document.body.appendChild(waContainer);
  }
}

// 0. Theme Toggle (Dark & Light Mode)
function initThemeToggle() {
  const savedTheme = localStorage.getItem('ekdant_theme') || localStorage.getItem('voltcraft_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Bind to all theme toggle buttons across page
  const buttons = document.querySelectorAll('.theme-toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const isDark = document.documentElement.classList.toggle('dark');
      const mode = isDark ? 'dark' : 'light';
      localStorage.setItem('ekdant_theme', mode);
      localStorage.setItem('voltcraft_theme', mode);
      window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: mode } }));
    });
  });
}

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
  }, 4500);
}

// 1. Mobile Navigation
function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-drawer-close');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-overlay');

  if (!toggleBtn || !drawer) return;

  function openMenu() {
    drawer.classList.remove('translate-x-full');
    drawer.classList.add('translate-x-0');
    if (overlay) overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    drawer.classList.add('translate-x-full');
    drawer.classList.remove('translate-x-0');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
}

// 7. Active Nav Link Highlighter
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('text-amber-600', 'dark:text-amber-400', 'font-bold', 'border-b-2', 'border-amber-600', 'dark:border-amber-400');
      link.classList.remove('text-slate-600', 'text-slate-700', 'dark:text-slate-300');
    }
  });
}

// EmailJS Configuration & Dispatch Helpers
let cachedEmailJSConfig = null;

async function getEmailJSConfig() {
  if (cachedEmailJSConfig) return cachedEmailJSConfig;
  try {
    if (API_BASE) {
      const res = await fetch(`${API_BASE}/api/emailjs/config`);
      if (res.ok) {
        cachedEmailJSConfig = await res.json();
        return cachedEmailJSConfig;
      }
    }
  } catch (e) {}

  try {
    const local = localStorage.getItem('emailjs_config');
    if (local) {
      cachedEmailJSConfig = JSON.parse(local);
      return cachedEmailJSConfig;
    }
  } catch (e) {}

  return {
    serviceId: 'service_jt55uye',
    templateId: 'template_rqa2a6r',
    publicKey: 'vWs0RdzrO616fSdaw',
    recipientEmail: 'ekdantenterprise33@gmail.com',
    enabled: true
  };
}

async function sendEmailJSAlert(leadData) {
  try {
    const config = await getEmailJSConfig();
    if (!config || !config.serviceId || !config.templateId || !config.publicKey || config.enabled === false) {
      return;
    }

    if (typeof emailjs === 'undefined') {
      console.warn('EmailJS SDK not yet loaded.');
      return;
    }

    emailjs.init({ publicKey: config.publicKey });

    const templateParams = {
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
    };

    const res = await emailjs.send(config.serviceId, config.templateId, templateParams);
    console.log('[EmailJS] Inquiry notification delivered to', config.recipientEmail, res);
  } catch (err) {
    console.warn('[EmailJS] Notification dispatch notice:', err);
  }
}

// 3. Universal Quote Modal & Submission to API + LocalStorage
function initQuoteModal() {
  const modal = document.getElementById('quote-modal');
  const closeBtn = document.getElementById('close-quote-modal');
  const form = document.getElementById('quick-quote-form');

  if (!modal) return;

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Only bind modal background & close button once
  if (!modal.dataset.modalBound) {
    modal.dataset.modalBound = 'true';
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Bind all quote trigger buttons (only once per button)
  const openButtons = document.querySelectorAll('.btn-open-quote');
  openButtons.forEach(btn => {
    if (btn.dataset.quoteBound) return;
    btn.dataset.quoteBound = 'true';

    btn.addEventListener('click', (e) => {
      e.preventDefault();

      // Pre-select service in modal if provided via data-service
      const requestedService = btn.getAttribute('data-service');
      if (requestedService && form) {
        const serviceSelect = form.querySelector('[name="service"]');
        if (serviceSelect) {
          let found = false;
          for (let i = 0; i < serviceSelect.options.length; i++) {
            if (serviceSelect.options[i].value === requestedService ||
                serviceSelect.options[i].text.trim().toLowerCase() === requestedService.trim().toLowerCase()) {
              serviceSelect.selectedIndex = i;
              found = true;
              break;
            }
          }
          if (!found) {
            const opt = new Option(requestedService, requestedService, true, true);
            serviceSelect.add(opt);
          }
        }
      }

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  // Only bind form submission ONCE to prevent duplicate posts
  if (form && !form.dataset.submitBound) {
    form.dataset.submitBound = 'true';
    let isSubmitting = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return; // Prevent double submission
      isSubmitting = true;

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Submitting Request...';
      }

      try {
        const name = form.querySelector('[name="name"]')?.value || 'Client';
        const phone = form.querySelector('[name="phone"]')?.value || '';
        const email = form.querySelector('[name="email"]')?.value || '';
        const service = form.querySelector('[name="service"]')?.value || 'Service';
        const description = form.querySelector('[name="description"]')?.value || '';

        const leadData = {
          name,
          phone,
          email,
          service,
          description,
          location: 'Online Request',
          priority: service.toLowerCase().includes('emergency') ? 'Emergency' : 'Normal',
          needsEstimate: true,
          estimateStatus: 'Free Estimate Requested',
          requestType: 'Free Estimate Request',
          estimatedValue: service.toLowerCase().includes('power restoration') ? '₹1,500 - ₹3,500' :
            (service.toLowerCase().includes('ground wire') ? '₹3,500 - ₹8,500' :
            (service.toLowerCase().includes('fan') ? '₹350 - ₹950' :
            (service.toLowerCase().includes('outdoor') ? '₹2,500 - ₹6,500' :
            (service.toLowerCase().includes('light') ? '₹500 - ₹1,800' :
            (service.toLowerCase().includes('outlet') ? '₹350 - ₹1,200' : '₹1,500 - ₹3,000')))))
        };

        if (API_BASE) {
          try {
            await fetch(`${API_BASE}/api/leads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(leadData)
            });
          } catch (err) {
            console.warn('Backend API offline, saving to fallback', err);
          }
        }

        // Dispatch instant alert to ekdantenterprise33@gmail.com via EmailJS
        sendEmailJSAlert(leadData);

        // Also persist to localStorage for offline resilience
        saveLeadToStorage(leadData);

        closeModal();
        form.reset();
        showToast(`Thank you, ${name}! Your request for ${service} has been logged in our dispatch system. We will call you within 15 minutes.`, 'success');
      } catch (err) {
        console.error('Submission error:', err);
        showToast('Something went wrong. Please try calling us directly.', 'error');
      } finally {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
        }
      }
    });
  }
}

// 3B. Fast Hero Section Estimate Form Handler (Right-Side Hero)
function initHeroEstimateForm() {
  const form = document.getElementById('hero-estimate-form');
  if (!form || form.dataset.submitBound) return;
  form.dataset.submitBound = 'true';

  let isSubmitting = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Logging Request...';
    }

    try {
      const name = form.querySelector('[name="name"]')?.value.trim() || 'Client';
      const phone = form.querySelector('[name="phone"]')?.value.trim() || '';
      const location = form.querySelector('[name="location"]')?.value.trim() || 'Ahmedabad';
      const service = form.querySelector('[name="service"]')?.value || 'General Electrical';
      const description = form.querySelector('[name="description"]')?.value.trim() || '';

      const leadData = {
        name,
        phone,
        email: '',
        service,
        description: description ? `${description} (Area: ${location})` : `Area: ${location}`,
        location: location,
        priority: 'Normal',
        needsEstimate: true,
        estimateStatus: 'Free Estimate Requested',
        requestType: 'Fast Hero Free Estimate',
        estimatedValue: 'Pending Assessment'
      };

      if (API_BASE) {
        try {
          await fetch(`${API_BASE}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadData)
          });
        } catch (err) {
          console.warn('Backend API offline, saving to fallback storage', err);
        }
      }

      // Dispatch instant alert to ekdantenterprise33@gmail.com via EmailJS
      sendEmailJSAlert(leadData);

      saveLeadToStorage(leadData);
      form.reset();
      showToast(`Thank you, ${name}! Your free estimate request for ${service} has been logged. Our engineer will call you shortly.`, 'success');
    } catch (err) {
      console.error('Hero estimate form submission error:', err);
      showToast('Could not submit request. Please call us directly at +91 91068 33627.', 'error');
    } finally {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
}

// 4. Contact Page Form Handler
function initContactPageForm() {
  const form = document.getElementById('contact-page-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('input[type="text"]')?.value || 'Client';
    const email = form.querySelector('input[type="email"]')?.value || '';
    const phone = form.querySelector('input[type="tel"]')?.value || '';
    const service = form.querySelector('select')?.value || 'General Inquiry';
    const description = form.querySelector('textarea')?.value || '';

    const leadData = {
      name,
      phone,
      email,
      service,
      description,
      location: 'Website Contact Page',
      priority: 'Normal'
    };

    try {
      if (API_BASE) {
        await fetch(`${API_BASE}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData)
        });
      }
    } catch (err) {
      console.warn('API error:', err);
    }

    // Dispatch instant alert to ekdantenterprise33@gmail.com via EmailJS
    sendEmailJSAlert(leadData);

    saveLeadToStorage(leadData);
    form.reset();
    showToast(`Thanks ${name}! Your inquiry has been sent to our dispatch team.`, 'success');
  });
}

function saveLeadToStorage(lead) {
  try {
    const list = JSON.parse(localStorage.getItem('ekdant_leads') || localStorage.getItem('voltcraft_leads') || '[]');
    list.unshift({
      ...lead,
      id: 'LEAD-' + (100 + list.length + 1),
      createdAt: new Date().toISOString(),
      status: 'New',
      assignedTo: 'Unassigned'
    });
    localStorage.setItem('ekdant_leads', JSON.stringify(list));
    localStorage.setItem('voltcraft_leads', JSON.stringify(list));
  } catch (e) {}
}

// 5. Before / After Image Slider
function initBeforeAfterSliders() {
  const sliders = document.querySelectorAll('.ba-slider-container');

  sliders.forEach(slider => {
    const beforeWrapper = slider.querySelector('.ba-before-wrapper');
    const handle = slider.querySelector('.ba-handle');
    let isDragging = false;

    if (!beforeWrapper || !handle) return;

    function updateSlider(xPos) {
      const rect = slider.getBoundingClientRect();
      let pos = (xPos - rect.left) / rect.width;
      if (pos < 0) pos = 0;
      if (pos > 1) pos = 1;

      const percentage = pos * 100;
      beforeWrapper.style.width = `${percentage}%`;
      handle.style.left = `${percentage}%`;
    }

    slider.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateSlider(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      updateSlider(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    slider.addEventListener('touchstart', (e) => {
      isDragging = true;
      updateSlider(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      updateSlider(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });
  });
}

// 6. Media Gallery Filtering & Lightbox Modal
function initGalleryFiltersAndLightbox() {
  const filterBtns = document.querySelectorAll('.gallery-filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-card');
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDesc = document.getElementById('lightbox-desc');
  const lightboxClose = document.getElementById('lightbox-close');

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('bg-amber-500', 'text-white', 'font-bold');
          b.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200', 'border', 'border-slate-200', 'dark:border-slate-700');
        });
        btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200', 'border', 'border-slate-200', 'dark:border-slate-700');
        btn.classList.add('bg-amber-500', 'text-white', 'font-bold');

        const filter = btn.getAttribute('data-filter');

        galleryItems.forEach(item => {
          const category = item.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            item.style.display = 'block';
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'scale(1)'; }, 10);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => { item.style.display = 'none'; }, 200);
          }
        });
      });
    });
  }

  if (lightboxModal && galleryItems.length > 0) {
    galleryItems.forEach(item => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        const title = item.querySelector('.project-title')?.innerText || 'Completed Electrical Project';
        const desc = item.querySelector('.project-desc')?.innerText || 'Certified, code-compliant installation.';

        if (img && lightboxImg) {
          lightboxImg.src = img.src;
          if (lightboxTitle) lightboxTitle.innerText = title;
          if (lightboxDesc) lightboxDesc.innerText = desc;
          lightboxModal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    if (lightboxClose) {
      lightboxClose.addEventListener('click', () => {
        lightboxModal.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
}

// Helper: Silently submit to Google Form in background via hidden iframe with NO user redirection
function submitSilentGoogleForm(config, review) {
  if (!config || !config.formUrl || !config.formUrl.startsWith('http')) return;
  try {
    let silentForm = document.getElementById('silent-google-form-sender');
    if (silentForm) silentForm.remove();

    silentForm = document.createElement('form');
    silentForm.id = 'silent-google-form-sender';
    silentForm.method = 'POST';
    silentForm.action = config.formUrl;
    silentForm.target = 'google_form_silent_target';
    silentForm.style.display = 'none';

    const map = config.entryMap || {};
    const addField = (name, val) => {
      if (!name) return;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = val;
      silentForm.appendChild(input);
    };

    if (map.name) addField(map.name, review.name || 'Client');
    if (map.location) addField(map.location, review.location || 'Ahmedabad');
    if (map.service) addField(map.service, review.service || 'Electrical Work');
    if (map.rating) addField(map.rating, String(review.rating || 5));
    if (map.comment) addField(map.comment, review.comment || '');

    document.body.appendChild(silentForm);
    silentForm.submit();
    setTimeout(() => { if (silentForm) silentForm.remove(); }, 2000);
  } catch (err) {
    console.warn('Silent Google Form submission failed:', err);
  }
}

// Predefined Authentic Client Review Repository for Auto-Generator
const PREDEFINED_REVIEWS = {
  "Electrical Project Execution": [
    "Ekdant Enterprise executed the complete electrical project for our new commercial complex in Ahmedabad. From HT/LT substation setup to final distribution panels, everything was delivered strictly on time and with 100% statutory clearance. Truly master engineers!",
    "Turnkey industrial electrification executed with extreme technical precision. The load balancing, PCC/MCC panel installation, and plant wiring were flawlessly handled by Mr. Siddharth Bhagwat and team. Highly recommended for heavy projects!",
    "Professional project execution from engineering blueprints to successful commissioning. Excellent communication and safe, timely execution throughout."
  ],
  "Torrent Power Liasioning Work": [
    "Getting our commercial Torrent Power load extension and new meter sanction was effortless thanks to Ekdant Enterprise. They prepared all documents, test certificates, and handled full liaisoning without any hassle. Saved us weeks of effort!",
    "Handled our Torrent Power meter shifting and contract demand regularisation smoothly. Transparent updates and fast approvals in Ahmedabad. Outstanding liaisoning service!",
    "Fast and reliable Torrent Power documentation and inspection approval. Their government contractor credentials made the entire process swift and seamless."
  ],
  "Interior Electrical Installation": [
    "Installed complete architectural concealed conduit wiring, designer profile LEDs, and modular switchboards in our 4BHK apartment. The alignment, circuit distribution, and clean finishes are world-class!",
    "Flawless interior electrification for our corporate office. Clean drywall cutting, concealed cable raceways, and smart dimmer automation. No visible wires anywhere!",
    "Top-notch interior electrical work for our retail showroom. Punctual, polite technicians who respected our premises and cleaned up thoroughly."
  ],
  "Test Reports Provided": [
    "Provided official Government Approved Electrical Contractor Test Reports (Form A/B) and megger insulation tests for our Torrent Power connection. Approved immediately without any objection. Trustworthy and compliant!",
    "Accurate earth pit resistance test certificates and high-voltage insulation reports generated with calibrated digital instruments. Essential compliance documentation done right!",
    "Fast turnaround on statutory electrical test reports and CEIG safety certificates. Very thorough inspection by certified engineers."
  ],
  "Electrical Maintenance Services": [
    "We have an Annual Maintenance Contract (AMC) with Ekdant Enterprise for our residential society. Their team conducts regular panel servicing, thermal imaging, and responds immediately to any emergency breakdown. Zero power downtime!",
    "Rapid emergency power restoration when our main commercial breaker tripped. Reached in 20 minutes, traced the neutral fault, and restored safe power quickly. Lifesavers!",
    "Proactive electrical maintenance and transformer oil testing. Prevented severe equipment failure with their thermal hotspot audit. Excellent service!"
  ],
  "Electrical Inspection Services": [
    "Comprehensive electrical safety audit conducted for our manufacturing unit. Identified multiple ungrounded lines and overloaded circuits with detailed mitigation reports. Essential for industrial safety!",
    "Conducted a complete pre-purchase electrical audit of our property. Gave us honest, clear insight into wiring conditions and earthing values. Invaluable peace of mind!",
    "Professional power quality and harmonic analysis that helped us optimize our power factor and avoid utility penalties. Highly skilled engineering team."
  ],
  "All Type Of Cabling & Wiring Work": [
    "Laid over 300 meters of armoured LT power cables with heavy-duty perforated cable trays in our industrial facility. Perfect glanding, heat-shrink termination, and neat cable dressing throughout!",
    "Underground trench cabling and sub-main distribution wiring done with outstanding craftsmanship. High-grade materials and strict safety compliance.",
    "Clean, structured low-voltage and heavy feeder cable routing. Fast, organized, and reliable team."
  ],
  "Other Electrical Work": [
    "Outstanding service from Ekdant Enterprise! The team arrived right on time, explained the electrical scope thoroughly, and completed all work cleanly with top safety standards. Will definitely call them again!",
    "Extremely professional and honest electrical contractor. Transparent communication, polite manners, and tidy craftsmanship. A truly reliable 5-star experience!",
    "The best electrical contractor experience in Ahmedabad. Fast response, certified mastery, and spotless cleanup. Highly recommended to everyone!"
  ]
};

// Reusable Auto-Review Generator Engine
function setupReviewAutoGenerator({
  serviceSelect,
  commentTextarea,
  btnAutoFill,
  btnShuffle,
  topicChips,
  appendChips,
  onAutoFill
}) {
  if (!commentTextarea) return;

  let currentVariationIndex = 0;

  function getSelectedService() {
    return (serviceSelect && serviceSelect.value) ? serviceSelect.value : "Other Electrical Work";
  }

  function getTemplatesForService(srv) {
    return PREDEFINED_REVIEWS[srv] || PREDEFINED_REVIEWS["Other Electrical Work"] || [];
  }

  function applyReview(serviceName, cycle = false) {
    const templates = getTemplatesForService(serviceName);
    if (!templates.length) return;

    if (cycle) {
      currentVariationIndex = (currentVariationIndex + 1) % templates.length;
    } else {
      currentVariationIndex = Math.floor(Math.random() * templates.length);
    }

    const reviewText = templates[currentVariationIndex];
    commentTextarea.value = reviewText;

    // Trigger visual pulse effect on textarea
    commentTextarea.classList.add('ring-2', 'ring-amber-500', 'bg-amber-50/40', 'dark:bg-amber-950/20');
    setTimeout(() => {
      commentTextarea.classList.remove('ring-2', 'ring-amber-500', 'bg-amber-50/40', 'dark:bg-amber-950/20');
    }, 700);

    commentTextarea.dispatchEvent(new Event('input'));

    if (typeof onAutoFill === 'function') {
      onAutoFill(serviceName, reviewText);
    }
  }

  // Update character status helper if present
  commentTextarea.addEventListener('input', () => {
    const len = commentTextarea.value.trim().length;
    const countEl = document.getElementById('review-char-count');
    if (countEl) {
      if (len === 0) {
        countEl.textContent = 'Ready to submit';
        countEl.className = 'text-[11px] text-slate-400';
      } else if (len < 30) {
        countEl.textContent = `${len} chars (brief)`;
        countEl.className = 'text-[11px] text-amber-500';
      } else {
        countEl.textContent = `${len} chars (great review!)`;
        countEl.className = 'text-[11px] text-emerald-500 font-medium';
      }
    }
  });

  if (btnAutoFill) {
    btnAutoFill.addEventListener('click', (e) => {
      e.preventDefault();
      applyReview(getSelectedService(), false);
      showToast('✨ Relatable review auto-filled! You can edit or submit directly.', 'success');
    });
  }

  if (btnShuffle) {
    btnShuffle.addEventListener('click', (e) => {
      e.preventDefault();
      applyReview(getSelectedService(), true);
      showToast('🎲 Tried another review suggestion!', 'info');
    });
  }

  // Topic selector pills
  if (topicChips) {
    topicChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const targetService = chip.getAttribute('data-service');
        if (serviceSelect && targetService) {
          serviceSelect.value = targetService;
        }
        topicChips.forEach(c => c.classList.remove('bg-amber-500', 'text-white'));
        chip.classList.add('bg-amber-500', 'text-white');
        applyReview(targetService || getSelectedService(), false);
      });
    });
  }

  // Append highlight phrase chips
  if (appendChips) {
    appendChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const phrase = chip.getAttribute('data-phrase') || chip.getAttribute('data-append');
        if (!phrase) return;

        let cur = commentTextarea.value.trim();
        if (!cur) {
          commentTextarea.value = phrase;
        } else if (!cur.includes(phrase)) {
          commentTextarea.value = cur + ' ' + phrase;
        }

        chip.classList.add('bg-amber-500', 'text-white');
        setTimeout(() => {
          chip.classList.remove('bg-amber-500', 'text-white');
        }, 600);
      });
    });
  }
}

// 7. Feedback Form Handling (No Redirection, Seamless Background Sync to Google Form)
function initFeedbackForm() {
  const form = document.getElementById('client-feedback-form');
  const starContainer = document.getElementById('star-rating-selector');
  let selectedRating = 5;

  let updateStarsFn = null;
  if (starContainer) {
    const stars = starContainer.querySelectorAll('i');
    function updateStars(val) {
      stars.forEach(s => {
        const starVal = parseInt(s.getAttribute('data-value'), 10);
        if (starVal <= val) {
          s.classList.add('text-amber-400');
          s.classList.remove('text-slate-600');
        } else {
          s.classList.remove('text-amber-400');
          s.classList.add('text-slate-600');
        }
      });
      const ratingText = document.getElementById('rating-score-label');
      if (ratingText) {
        const labels = {
          1: "1 Star - Unsatisfactory",
          2: "2 Stars - Needs Improvement",
          3: "3 Stars - Average",
          4: "4 Stars - Great Experience",
          5: "5 Stars - Exceptional Service!"
        };
        ratingText.textContent = labels[val] || `${val} Stars`;
      }
    }
    updateStarsFn = updateStars;

    stars.forEach(star => {
      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.getAttribute('data-value'), 10);
        updateStars(val);
      });

      star.addEventListener('click', () => {
        selectedRating = parseInt(star.getAttribute('data-value'), 10);
        updateStars(selectedRating);
      });
    });

    starContainer.addEventListener('mouseleave', () => {
      updateStars(selectedRating);
    });
  }

  // Hook up Auto Review Generator on feedback.html
  setupReviewAutoGenerator({
    serviceSelect: document.getElementById('feedback-service-type') || form?.querySelector('[name="service_type"]'),
    commentTextarea: document.getElementById('feedback-client-comment') || form?.querySelector('[name="client_comment"]'),
    btnAutoFill: document.getElementById('btn-auto-fill-review'),
    btnShuffle: document.getElementById('btn-shuffle-review'),
    topicChips: document.querySelectorAll('#preset-topic-chips .preset-topic-chip'),
    appendChips: document.querySelectorAll('.btn-append-phrase'),
    onAutoFill: () => {
      selectedRating = 5;
      if (updateStarsFn) updateStarsFn(5);
    }
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = form.querySelector('[name="client_name"]').value.trim();
      const location = form.querySelector('[name="client_location"]').value.trim() || 'Local Customer';
      const service = form.querySelector('[name="service_type"]').value;
      const comment = form.querySelector('[name="client_comment"]').value.trim();

      if (!name || !comment) {
        showToast('Please fill out all required fields before submitting.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-feedback');
      const submitText = document.getElementById('btn-submit-text');
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Submitting & Syncing to Google Form...';

      const newReview = {
        id: Date.now(),
        name: name,
        location: location,
        service: service,
        rating: selectedRating,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        comment: comment,
        source: 'website',
        status: 'Approved',
        featured: false,
        verified: true
      };

      try {
        if (API_BASE) {
          await fetch(`${API_BASE}/api/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newReview)
          });
        }
      } catch (err) {
        console.warn('API error:', err);
      }

      // Silent Google Form background submission via hidden iframe (No Redirect)
      try {
        const cachedConfig = localStorage.getItem('ekdant_google_form_config');
        if (cachedConfig) {
          const cfg = JSON.parse(cachedConfig);
          submitSilentGoogleForm(cfg, newReview);
        } else if (API_BASE) {
          fetch(`${API_BASE}/api/google-form/config`)
            .then(r => r.json())
            .then(cfg => {
              if (cfg && cfg.formUrl) {
                localStorage.setItem('ekdant_google_form_config', JSON.stringify(cfg));
                submitSilentGoogleForm(cfg, newReview);
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        console.warn('Silent Google Form sync handled:', err);
      }

      // Local storage fallback
      const existingReviews = getStoredReviews();
      existingReviews.unshift(newReview);
      localStorage.setItem('ekdant_reviews', JSON.stringify(existingReviews));
      localStorage.setItem('voltcraft_reviews', JSON.stringify(existingReviews));

      // Show on-page confirmation banner without redirection
      const successBanner = document.getElementById('review-success-banner');
      if (successBanner) {
        successBanner.classList.remove('hidden');
        successBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      form.reset();
      selectedRating = 5;
      if (starContainer) {
        const stars = starContainer.querySelectorAll('i');
        stars.forEach(s => {
          s.classList.add('text-amber-400');
          s.classList.remove('text-slate-600');
        });
      }

      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = 'Submit Review & Sync to Google Form';

      showToast('Thank you! Your review has been saved and synced directly to Google Form.', 'success');
      renderFeedbackList();
    });

    renderFeedbackList();
  }
}

const INITIAL_REVIEWS = [
  {
    id: 1,
    name: "Bhavin Patel",
    location: "Maninagar, Ahmedabad",
    service: "Fan installation",
    rating: 5,
    date: "October 22, 2026",
    comment: "Ekdant Enterprise installed 4 ceiling fans and modular switches in our new apartment. Superb balancing, zero wobble, very neat wiring and honest flat-rate pricing. Highly recommend!",
    source: "google",
    verified: true
  },
  {
    id: 2,
    name: "Kavita Shah",
    location: "Hatkeshwar, Ahmedabad",
    service: "Electrical power restoration",
    rating: 5,
    date: "October 18, 2026",
    comment: "Had an emergency power trip issue on our main line late in the evening. Ekdant Enterprise reached our home within 25 minutes, tested the circuit breaker with their digital meters, and restored full power safely.",
    source: "google",
    verified: true
  },
  {
    id: 3,
    name: "Rajesh Sharma",
    location: "Karnavati Society, Ahmedabad",
    service: "Light fixture installation",
    rating: 5,
    date: "October 14, 2026",
    comment: "Installed false-ceiling LED profile lights and a heavy dining chandelier. Precision laser alignment and clean work. Best licensed electrician team near C.T.M & Maninagar.",
    source: "google",
    verified: true
  },
  {
    id: 4,
    name: "Deepak Prajapati",
    location: "Vatva GIDC, Ahmedabad",
    service: "Ground wire installation",
    rating: 5,
    date: "October 9, 2026",
    comment: "Upgraded our entire premises earthing with dedicated ground wires and dual copper ground rods. Complete earth resistance testing carried out and verified on the spot.",
    source: "google",
    verified: true
  },
  {
    id: 5,
    name: "Amit Desai",
    location: "Khokhra, Ahmedabad",
    service: "Electrical outlet & switch repair",
    rating: 5,
    date: "October 4, 2026",
    comment: "Sparking socket in our kitchen was a huge fire hazard. The technician diagnosed the loose back-stabbed wire immediately and replaced it with a modern safety outlet. Excellent work.",
    source: "website",
    verified: true
  },
  {
    id: 6,
    name: "Sanjay Mehta",
    location: "Baroda Express Hwy, Ahmedabad",
    service: "Outdoor lighting installation",
    rating: 5,
    date: "September 28, 2026",
    comment: "Installed waterproof motion-sensor security floodlights and facade illumination. Weather-sealed conduit work is top notch and provides exceptional security at night.",
    source: "google",
    verified: true
  },
  {
    id: 7,
    name: "Pooja Joshi",
    location: "Maninagar East, Ahmedabad",
    service: "Electrical outlet & switch relocation",
    rating: 5,
    date: "September 20, 2026",
    comment: "Concealed all messy cables behind our 65-inch television by relocating the power outlet and switchbox inside the drywall. Perfectly clean and aesthetic result!",
    source: "website",
    verified: true
  }
];

function getStoredReviews() {
  const stored = localStorage.getItem('ekdant_reviews');
  if (!stored) {
    localStorage.setItem('ekdant_reviews', JSON.stringify(INITIAL_REVIEWS));
    return INITIAL_REVIEWS;
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_REVIEWS;
  } catch (e) {
    return INITIAL_REVIEWS;
  }
}

async function renderFeedbackList() {
  const container = document.getElementById('recent-feedback-feed');
  if (!container) return;

  let reviews = getStoredReviews();
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/reviews`);
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote) && remote.length > 0) reviews = remote;
      }
    } catch (e) {}
  }

  container.innerHTML = reviews.slice(0, 6).map(rev => {
    const isGoogleForm = rev.source === 'google-form';
    const isGoogle = rev.source === 'google';
    const sourceBadge = isGoogleForm
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
          <i class="fa-solid fa-file-lines text-indigo-500"></i> Google Form
        </span>`
      : (isGoogle
          ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
              <i class="fa-brands fa-google text-blue-500"></i> Google Verified
            </span>`
          : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
              <i class="fa-solid fa-circle-check text-emerald-500"></i> Website Verified
            </span>`);

    return `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-1 text-amber-500 text-sm">
          ${'<i class="fa-solid fa-star"></i>'.repeat(rev.rating)}
          ${'<i class="fa-regular fa-star text-slate-300 dark:text-slate-600"></i>'.repeat(5 - rev.rating)}
        </div>
        <div class="flex items-center gap-2">
          ${sourceBadge}
          <span class="text-xs text-slate-400 dark:text-slate-500">${rev.date}</span>
        </div>
      </div>
      <p class="text-slate-700 dark:text-slate-300 text-sm italic mb-4 leading-relaxed">"${rev.comment}"</p>
      <div class="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div class="min-w-0">
          <h4 class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
            ${rev.name}
            ${rev.verified ? '<i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-xs" title="Verified Customer"></i>' : ''}
          </h4>
          <span class="text-xs text-slate-500 dark:text-slate-400">${rev.location}</span>
        </div>
        <div class="shrink-0">
          <span class="review-service-badge inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/60 text-xs whitespace-nowrap shadow-sm">
            <i class="fa-solid fa-wrench text-[10px] mr-1.5 text-amber-500"></i>${rev.service}
          </span>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

// 8. Reviews Display Page Logic with Merged Google & Website Filter
async function initReviewsDisplay() {
  const container = document.getElementById('all-reviews-grid');
  if (!container) return;

  let reviews = getStoredReviews();
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/reviews`);
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote) && remote.length > 0) reviews = remote;
      }
    } catch (e) {}
  }

  const filterBtns = document.querySelectorAll('.review-filter-btn');

  function render(filter = 'all') {
    let filtered = reviews;
    if (filter === 'google-form') {
      filtered = reviews.filter(r => r.source === 'google-form');
    } else if (filter === 'google') {
      filtered = reviews.filter(r => r.source === 'google');
    } else if (filter === 'website') {
      filtered = reviews.filter(r => r.source === 'website' || (!r.source || (r.source !== 'google' && r.source !== 'google-form')));
    } else if (filter !== 'all') {
      filtered = reviews.filter(r => 
        (r.service && r.service.toLowerCase().includes(filter.toLowerCase())) ||
        (r.comment && r.comment.toLowerCase().includes(filter.toLowerCase()))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
          <i class="fa-solid fa-comments text-4xl mb-3 text-slate-400"></i>
          <p class="text-lg font-medium text-slate-600 dark:text-slate-300">No reviews found for this filter category.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(rev => {
      const isGoogleForm = rev.source === 'google-form';
      const isGoogle = rev.source === 'google';
      const sourceBadge = isGoogleForm
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold">
            <i class="fa-solid fa-file-lines text-indigo-500"></i> Google Form Verified
          </span>`
        : (isGoogle
            ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                <i class="fa-brands fa-google text-blue-500"></i> Google Maps Verified
              </span>`
            : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                <i class="fa-solid fa-circle-check text-emerald-500"></i> Website Verified
              </span>`);

      return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500 transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-1 text-amber-500">
              ${'<i class="fa-solid fa-star"></i>'.repeat(rev.rating)}
              ${'<i class="fa-regular fa-star text-slate-300 dark:text-slate-600"></i>'.repeat(5 - rev.rating)}
            </div>
            ${sourceBadge}
          </div>
          <p class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-6">"${rev.comment}"</p>
        </div>
        
        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div class="min-w-0">
            <div class="font-bold text-slate-900 dark:text-white text-sm">${rev.name}</div>
            <div class="text-slate-500 dark:text-slate-400 text-xs">${rev.location} &bull; <span>${rev.date}</span></div>
          </div>
          <div class="shrink-0">
            <span class="review-service-badge inline-flex items-center px-2.5 py-1 rounded-full text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-semibold whitespace-nowrap shadow-sm">
              <i class="fa-solid fa-wrench text-[10px] mr-1.5 text-amber-500"></i>${rev.service}
            </span>
          </div>
        </div>
      </div>
    `;
    }).join('');
  }

  render('all');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-amber-500', 'text-white', 'font-bold');
        b.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200', 'border', 'border-slate-200', 'dark:border-slate-700');
      });
      btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200', 'border', 'border-slate-200', 'dark:border-slate-700');
      btn.classList.add('bg-amber-500', 'text-white', 'font-bold');

      const filter = btn.getAttribute('data-filter') || 'all';
      render(filter);
    });
  });

  // Wire up Modal on reviews.html
  const openModalBtn = document.getElementById('btn-open-review-modal');
  const reviewModal = document.getElementById('review-modal');
  const closeModalBtn = document.getElementById('close-review-modal');
  const modalForm = document.getElementById('modal-review-form');

  if (openModalBtn && reviewModal) {
    openModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      reviewModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeReviewModal() {
    if (reviewModal) {
      reviewModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (closeModalBtn && reviewModal) {
    closeModalBtn.addEventListener('click', closeReviewModal);
    reviewModal.addEventListener('click', (e) => {
      if (e.target === reviewModal) closeReviewModal();
    });
  }

  // Modal star rating & generator
  let modalRating = 5;
  const modalStarContainer = document.getElementById('modal-star-rating');
  let updateModalStarsFn = null;
  if (modalStarContainer) {
    const stars = modalStarContainer.querySelectorAll('i');
    function updateModalStars(val) {
      modalRating = val;
      stars.forEach(s => {
        const starVal = parseInt(s.getAttribute('data-value'), 10);
        if (starVal <= val) {
          s.classList.add('text-amber-500');
          s.classList.remove('text-slate-600');
        } else {
          s.classList.remove('text-amber-500');
          s.classList.add('text-slate-600');
        }
      });
      const lbl = document.getElementById('modal-rating-label');
      if (lbl) {
        const labels = {
          1: "1 Star - Unsatisfactory",
          2: "2 Stars - Needs Improvement",
          3: "3 Stars - Average",
          4: "4 Stars - Great Experience",
          5: "5 Stars - Exceptional Service!"
        };
        lbl.textContent = labels[val] || `${val} Stars`;
      }
    }
    updateModalStarsFn = updateModalStars;

    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.getAttribute('data-value'), 10);
        updateModalStars(val);
      });
    });

    setupReviewAutoGenerator({
      serviceSelect: document.getElementById('modal-review-service'),
      commentTextarea: document.getElementById('modal-review-comment'),
      btnAutoFill: document.getElementById('modal-btn-auto-fill'),
      btnShuffle: document.getElementById('modal-btn-shuffle'),
      topicChips: document.querySelectorAll('.modal-preset-chip'),
      appendChips: document.querySelectorAll('.modal-append-chip'),
      onAutoFill: () => {
        modalRating = 5;
        if (updateModalStarsFn) updateModalStarsFn(5);
      }
    });
  }

  if (modalForm) {
    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-review-name').value.trim();
      const location = document.getElementById('modal-review-location').value.trim() || 'Local Customer';
      const service = document.getElementById('modal-review-service').value;
      const comment = document.getElementById('modal-review-comment').value.trim();

      if (!name || !comment) {
        showToast('Please provide your name and review details.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-modal-submit-review');
      const submitText = document.getElementById('modal-submit-text');
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Submitting & Syncing...';

      const newReview = {
        id: Date.now(),
        name: name,
        location: location,
        service: service,
        rating: modalRating,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        comment: comment,
        source: 'website',
        status: 'Approved',
        featured: false,
        verified: true
      };

      try {
        if (API_BASE) {
          await fetch(`${API_BASE}/api/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newReview)
          });
        }
      } catch (err) {}

      // Silent Google Form submission via hidden iframe
      try {
        const cachedConfig = localStorage.getItem('ekdant_google_form_config');
        if (cachedConfig) {
          const cfg = JSON.parse(cachedConfig);
          submitSilentGoogleForm(cfg, newReview);
        } else if (API_BASE) {
          fetch(`${API_BASE}/api/google-form/config`)
            .then(r => r.json())
            .then(cfg => {
              if (cfg && cfg.formUrl) {
                localStorage.setItem('ekdant_google_form_config', JSON.stringify(cfg));
                submitSilentGoogleForm(cfg, newReview);
              }
            })
            .catch(() => {});
        }
      } catch (err) {}

      reviews.unshift(newReview);
      render('all');

      modalForm.reset();
      if (updateModalStarsFn) updateModalStarsFn(5);
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = 'Submit Review & Sync to Google Form';
      closeReviewModal();

      showToast('Thank you! Your review has been published and recorded into Google Form.', 'success');
    });
  }
}

// 9. Service Card Category Filter for services.html
function initServiceFilters() {
  const filterBtns = document.querySelectorAll('.service-filter-btn');
  const cards = document.querySelectorAll('.service-card');
  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = btn.getAttribute('data-filter') || 'all';

      // Update button active styles
      filterBtns.forEach(b => {
        b.classList.remove('bg-amber-500', 'text-white', 'font-bold');
        b.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200', 'border', 'border-slate-200', 'dark:border-slate-700');
      });
      btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200', 'border', 'border-slate-200', 'dark:border-slate-700');
      btn.classList.add('bg-amber-500', 'text-white', 'font-bold');

      // Filter cards
      cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// =========================================================================
// 10. DYNAMIC LIVE SITE CONTENT (CMS CONSUMER)
// =========================================================================
async function initLiveSiteContent() {
  let content = null;
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/content?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) content = await res.json();
    } catch (e) {}
  }

  if (!content) {
    const cached = localStorage.getItem('ekdant_site_content');
    if (cached) {
      try { content = JSON.parse(cached); } catch (e) {}
    }
  }

  if (!content) return;

  // 1. Apply Company Details (Name, Phone, Address, Map)
  if (content.company) {
    const comp = content.company;
    if (comp.name) {
      document.querySelectorAll('.brand-company-name, .brand-name').forEach(el => el.textContent = comp.name);
    }
    if (comp.phone) {
      document.querySelectorAll('.brand-phone-text').forEach(el => el.textContent = comp.phone);
    }
    if (comp.phoneRaw || comp.phone) {
      const tel = comp.phoneRaw || comp.phone.replace(/[^0-9+]/g, '');
      document.querySelectorAll('a[href^="tel:"]').forEach(el => el.href = `tel:${tel}`);
    }
    if (comp.shortAddress || comp.fullAddress) {
      document.querySelectorAll('.brand-address-text').forEach(el => el.textContent = comp.shortAddress || comp.fullAddress);
    }
    if (comp.googleMapsUrl) {
      document.querySelectorAll('a[href*="maps.app.goo.gl"]').forEach(el => el.href = comp.googleMapsUrl);
    }
  }

  // 2. Apply Homepage Content (if on index.html)
  if (content.home) {
    const h = content.home;
    const heroBadge = document.getElementById('hero-badge-text');
    if (heroBadge && h.heroBadge) heroBadge.textContent = h.heroBadge;

    const heroTitle = document.getElementById('hero-main-title');
    if (heroTitle && h.heroTitle) heroTitle.textContent = h.heroTitle;

    const heroDesc = document.getElementById('hero-main-desc');
    if (heroDesc && h.heroSubtitle) heroDesc.textContent = h.heroSubtitle;

    const bannerText = document.getElementById('hero-emergency-banner');
    if (bannerText && h.emergencyBannerText) bannerText.textContent = h.emergencyBannerText;

    if (h.stats) {
      const st = h.stats;
      const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.textContent = val;
      };
      setEl('stat-counter-projects', st.projects);
      setEl('stat-counter-time', st.dispatchTime);
      setEl('stat-counter-rating', st.satisfaction);
      setEl('stat-counter-exp', st.experience);
    }
  }

  // 3. Apply Services Dynamically (if on services.html or index.html)
  if (Array.isArray(content.services) && content.services.length > 0) {
    const isGlobalFreeEst = !content.estimateSettings || content.estimateSettings.enableFreeEstimateGlobal !== false;

    // Services Page Category Filters
    const filterContainer = document.getElementById('services-filter-buttons');
    if (filterContainer) {
      const categories = [];
      content.services.forEach(s => {
        if (s.category && !categories.some(c => c.slug === getCategorySlug(s.category))) {
          categories.push({ name: s.category, slug: getCategorySlug(s.category) });
        }
      });
      filterContainer.innerHTML = `
        <button data-filter="all" class="service-filter-btn px-5 py-2.5 rounded-full bg-amber-500 text-white text-xs font-bold transition-all shadow-sm">
          <i class="fa-solid fa-list-check mr-1.5"></i> All Services (${content.services.length})
        </button>
        ${categories.map(c => `
          <button data-filter="${c.slug}" class="service-filter-btn px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
            ${c.name}
          </button>
        `).join('')}
      `;
    }

    // Services Page Grid
    const servicesGrid = document.getElementById('services-cards-grid');
    if (servicesGrid) {
      servicesGrid.classList.add('items-start');
      servicesGrid.innerHTML = content.services.map(svc => `
        <div data-category="${getCategorySlug(svc.category)}" id="${svc.id}" class="service-card bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xl transition-all shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xl shadow-sm shrink-0">
                <i class="fa-solid ${svc.icon || 'fa-bolt'}"></i>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap justify-end">
                <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  ${svc.category || 'General Electrical'}
                </span>
                ${isGlobalFreeEst && svc.freeEstimate !== false ? `
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                    <i class="fa-solid fa-file-invoice-dollar text-[9px]"></i> Free Estimate
                  </span>
                ` : ''}
              </div>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2 min-h-[3.25rem] flex items-center">${svc.title}</h3>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 min-h-[4rem]">
              ${svc.description}
            </p>

            ${Array.isArray(svc.subServices) && svc.subServices.length > 0 ? `
              <details class="service-subservices-toggle group/sub rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 mb-4 overflow-hidden transition-all shadow-sm">
                <summary class="cursor-pointer list-none flex items-center justify-between p-3.5 text-xs font-bold text-amber-700 dark:text-amber-400 select-none hover:bg-amber-50/50 dark:hover:bg-slate-800/60 transition-colors">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] shrink-0">
                      <i class="fa-solid fa-list-check"></i>
                    </div>
                    <span class="text-xs font-bold text-slate-900 dark:text-white">Included Sub-Services</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold border border-amber-500/20">${svc.subServices.length}</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    <span class="subservices-expand-text flex items-center gap-1"><span>View List</span></span>
                    <span class="subservices-collapse-text flex items-center gap-1"><span>Hide</span></span>
                    <i class="fa-solid fa-chevron-down subservices-chevron text-[10px] transition-transform duration-200"></i>
                  </div>
                </summary>
                <div class="px-4 pb-4 pt-1 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60">
                  <ul class="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2">
                    ${svc.subServices.map(sub => `
                      <li class="flex items-start gap-2.5">
                        <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 shrink-0"></i>
                        <span class="leading-tight">${sub}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </details>
            ` : ''}
          </div>
          <div class="mt-auto pt-2">
            <button data-service="${svc.title}" class="btn-open-quote w-full py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-800 dark:text-slate-100 font-bold text-xs transition-colors border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center gap-2">
              <span>${isGlobalFreeEst && svc.freeEstimate !== false ? 'Get Free Estimate' : 'Book ' + svc.title}</span>
              <i class="fa-solid fa-arrow-right text-[11px]"></i>
            </button>
          </div>
        </div>
      `).join('');

      initQuoteModal();
      initServiceFilters();
    }

    // Index Page Core Services Grid
    const indexGrid = document.getElementById('index-services-grid');
    if (indexGrid) {
      indexGrid.innerHTML = content.services.slice(0, 6).map(svc => `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-xl transition-all flex flex-col justify-between shadow-sm">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xl shadow-sm">
                <i class="fa-solid ${svc.icon || 'fa-bolt'}"></i>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-amber-600 dark:text-amber-400">${svc.category || 'Certified Service'}</span>
                ${isGlobalFreeEst && svc.freeEstimate !== false ? `
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    Free Estimate
                  </span>
                ` : ''}
              </div>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">${svc.title}</h3>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
              ${svc.description}
            </p>

            ${Array.isArray(svc.subServices) && svc.subServices.length > 0 ? `
              <details class="service-subservices-toggle group/sub mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 transition-all">
                <summary class="cursor-pointer list-none flex items-center justify-between py-1.5 text-xs select-none hover:text-amber-500 transition-colors">
                  <div class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-amber-600 dark:text-amber-400">
                    <i class="fa-solid fa-list-check text-[10px]"></i>
                    <span>Key Inclusions</span>
                    <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold">${svc.subServices.length}</span>
                  </div>
                  <div class="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span class="subservices-expand-text">View (${svc.subServices.length})</span>
                    <span class="subservices-collapse-text">Hide</span>
                    <i class="fa-solid fa-chevron-down subservices-chevron text-[9px] transition-transform duration-200"></i>
                  </div>
                </summary>
                <ul class="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pt-2 pb-1">
                  ${svc.subServices.map(sub => `
                    <li class="flex items-start gap-1.5">
                      <i class="fa-solid fa-check text-emerald-500 text-[10px] mt-0.5 shrink-0"></i>
                      <span class="leading-tight">${sub}</span>
                    </li>
                  `).join('')}
                </ul>
              </details>
            ` : ''}
          </div>
          <div class="px-6 pb-6 pt-0">
            <button data-service="${svc.title}" class="btn-open-quote w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-800 dark:text-slate-100 font-bold text-sm transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
              <span>${isGlobalFreeEst && svc.freeEstimate !== false ? 'Request Free Estimate' : 'Book ' + svc.title}</span>
              <i class="fa-solid fa-arrow-right text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
      initQuoteModal();
    }

    // Dynamic Service Dropdown Population
    const serviceSelects = document.querySelectorAll('select[name="service"], select[name="service_type"], #estimate-service, #modal-review-service');
    serviceSelects.forEach(sel => {
      const currentVal = sel.value;
      let html = '<option value="">Select an electrical service...</option>';
      content.services.forEach(svc => {
        if (Array.isArray(svc.subServices) && svc.subServices.length > 0) {
          html += `<optgroup label="${svc.title}">`;
          html += `<option value="${svc.title}">${svc.title} (All)</option>`;
          svc.subServices.forEach(sub => {
            html += `<option value="${svc.title} - ${sub}">${sub}</option>`;
          });
          html += `</optgroup>`;
        } else {
          html += `<option value="${svc.title}">${svc.title}</option>`;
        }
      });
      html += '<option value="Other Electrical Service / Custom Project">Other Electrical Service / Custom Project</option>';
      sel.innerHTML = html;
      if (currentVal) sel.value = currentVal;
    });
  }

  // 4. Apply About Us (if on about.html)
  if (content.about) {
    const a = content.about;
    const headlineEl = document.getElementById('about-main-headline');
    if (headlineEl && a.headline) headlineEl.textContent = a.headline;

    const storyEl = document.getElementById('about-main-story');
    if (storyEl && a.story) {
      storyEl.innerHTML = formatClassyAboutStory(a.story);
    }

    const missionEl = document.getElementById('about-main-mission');
    if (missionEl && a.mission) {
      if (a.mission.includes('<') && a.mission.includes('>')) {
        missionEl.innerHTML = a.mission;
      } else {
        let m = a.mission.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        m = m.replace(/clear communication/gi, '<strong class="text-amber-800 dark:text-amber-300 font-bold">clear communication</strong>')
             .replace(/effective coordination/gi, '<strong class="text-amber-800 dark:text-amber-300 font-bold">effective coordination</strong>')
             .replace(/dependable service/gi, '<strong class="text-amber-800 dark:text-amber-300 font-bold">dependable service</strong>');
        missionEl.innerHTML = m;
      }
    }

    const badgeEl = document.getElementById('about-main-badge');
    if (badgeEl && a.experienceBadge) badgeEl.textContent = a.experienceBadge;
  }

  // 5. Apply Global Estimate & Free Quote Settings
  if (content.estimateSettings) {
    const est = content.estimateSettings;

    // Header buttons
    if (est.headerButtonText) {
      document.querySelectorAll('.btn-open-quote').forEach(btn => {
        if (btn.classList.contains('header-cta-btn') || btn.closest('header')) {
          const span = btn.querySelector('span');
          if (span) span.textContent = est.headerButtonText;
        }
      });
    }

    // Modal title & subtext
    if (est.modalTitle) {
      const modalTitleEl = document.querySelector('#quote-modal h3');
      if (modalTitleEl) modalTitleEl.textContent = est.modalTitle;
    }
    if (est.modalSubtitle) {
      const modalSubEl = document.querySelector('#quote-modal p');
      if (modalSubEl) modalSubEl.textContent = est.modalSubtitle;
    }

    // Hero CTA
    if (est.heroCtaText) {
      const heroCtaEl = document.getElementById('hero-quote-cta-btn');
      if (heroCtaEl) {
        const span = heroCtaEl.querySelector('span') || heroCtaEl;
        span.textContent = est.heroCtaText;
      }
    }
  }

  // 6. Apply Trusted Client Logos (Home Page Marquee)
  if (Array.isArray(content.trustedClients) && content.trustedClients.length > 0) {
    const track = document.getElementById('client-marquee-track');
    if (track) {
      const activeClients = content.trustedClients.filter(c => c.active !== false);
      if (activeClients.length > 0) {
        const renderClientCard = (c, isAriaHidden) => `
          <div class="group/card flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-4 sm:px-6 sm:py-4 shadow-sm hover:shadow-md transition-all shrink-0"${isAriaHidden ? ' aria-hidden="true"' : ''}>
            <div class="h-11 w-36 sm:w-44 flex items-center justify-center">
              <img src="${c.logo}" alt="${c.name} Logo" class="max-h-full max-w-full object-contain filter group-hover/card:scale-105 transition-transform" onerror="this.src='https://via.placeholder.com/140x50?text=Brand'">
            </div>
            <div class="border-l border-slate-200 dark:border-slate-800 pl-3.5 hidden sm:block">
              <span class="block text-xs font-bold text-slate-900 dark:text-white">${c.name}</span>
              <span class="block text-[10px] text-slate-500 dark:text-slate-400">${c.category || 'Commercial Client'}</span>
            </div>
          </div>
        `;
        const set1 = activeClients.map(c => renderClientCard(c, false)).join('');
        const set2 = activeClients.map(c => renderClientCard(c, true)).join('');
        track.innerHTML = set1 + set2;
      }
    }
  }
}

function getCategorySlug(cat) {
  if (!cat) return 'all';
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'all';
}

function formatClassyAboutStory(rawText) {
  if (!rawText) return '';
  if (rawText.includes('<') && rawText.includes('>')) return rawText;

  const paras = rawText.split('\n\n').filter(p => p.trim().length > 0);
  return paras.map((p, idx) => {
    let html = p.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Highlight key brand & accreditation
    html = html.replace(/Ekdant Enterprise/g, '<strong class="font-bold text-slate-900 dark:text-white">Ekdant Enterprise</strong>');
    html = html.replace(/Government approved Electrical Contractor/gi, '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/20 text-xs sm:text-sm"><i class="fa-solid fa-shield-halved text-amber-600 dark:text-amber-400 text-xs"></i> Government Approved Electrical Contractor</span>');
    html = html.replace(/Ahmedabad, Gujarat/g, '<span class="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white"><i class="fa-solid fa-location-dot text-amber-500 text-xs"></i> Ahmedabad, Gujarat</span>');
    html = html.replace(/safety, convenience, and long-term performance/gi, '<span class="text-amber-700 dark:text-amber-400 font-medium">safety, convenience, and long-term performance</span>');
    html = html.replace(/residential, commercial and Industrial projects/gi, '<span class="font-semibold text-slate-900 dark:text-white">residential, commercial and industrial projects</span>');

    // Highlight Leadership
    html = html.replace(/Mr\. Siddharth Bhagwat/g, '<strong class="font-bold text-slate-900 dark:text-white">Mr. Siddharth Bhagwat</strong>');
    html = html.replace(/Electrical Engineer/g, '<span class="text-amber-700 dark:text-amber-400 font-semibold">Electrical Engineer</span>');
    html = html.replace(/Mr\. Shyam Bhagwat/g, '<strong class="font-bold text-slate-900 dark:text-white">Mr. Shyam Bhagwat</strong>');
    html = html.replace(/Proprietor/g, '<span class="text-amber-700 dark:text-amber-400 font-semibold">Proprietor</span>');
    html = html.replace(/safety, timely execution, and lasting client satisfaction/gi, '<span class="font-semibold text-slate-900 dark:text-white border-b border-amber-500/40 pb-0.5">safety, timely execution, and lasting client satisfaction</span>');

    // Highlight Services scope
    html = html.replace(/residential and commercial electrical installations/gi, '<strong class="font-semibold text-slate-900 dark:text-white">residential and commercial electrical installations</strong>');
    html = html.replace(/\bupgradation\b/gi, '<strong class="font-semibold text-slate-900 dark:text-white">upgradation</strong>');
    html = html.replace(/\bmodification\b/gi, '<strong class="font-semibold text-slate-900 dark:text-white">modification</strong>');
    html = html.replace(/\bmaintenance\b/gi, '<strong class="font-semibold text-slate-900 dark:text-white">maintenance</strong>');
    html = html.replace(/\btroubleshooting\b/gi, '<strong class="font-semibold text-slate-900 dark:text-white">troubleshooting</strong>');

    // Box Paragraph 2 (Leadership) for visual distinction
    if (p.includes('Siddharth Bhagwat')) {
      return `
        <div class="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-800 space-y-2">
          <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <i class="fa-solid fa-user-tie"></i> Engineering Leadership &amp; Direction
          </div>
          <p class="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">${html}</p>
        </div>
      `;
    }

    // Paragraph 1 gets a neat accent border
    if (idx === 0) {
      return `<p class="border-l-2 border-amber-500/80 pl-4 py-0.5 text-slate-700 dark:text-slate-200">${html}</p>`;
    }

    // Paragraph 3 gets scope badges
    if (p.includes('specialise') || p.includes('specialize')) {
      return `
        <div class="space-y-3">
          <p class="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">${html}</p>
          <div class="flex flex-wrap gap-2 pt-1 text-xs">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 font-medium">
              <i class="fa-solid fa-bolt text-amber-500 text-[11px]"></i> Turnkey Installations
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 font-medium">
              <i class="fa-solid fa-wrench text-amber-500 text-[11px]"></i> Maintenance &amp; Troubleshooting
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 font-medium">
              <i class="fa-solid fa-clock-check text-amber-500 text-[11px]"></i> Timely Project Delivery
            </span>
          </div>
        </div>
      `;
    }

    return `<p class="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">${html}</p>`;
  }).join('');
}
