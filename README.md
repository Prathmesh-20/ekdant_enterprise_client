# ⚡ Ekdant Enterprise - Professional Electrical Contractor Website

A modern, responsive, high-converting website built for electrical contracting businesses. Built with clean semantic HTML5, modern Tailwind CSS, FontAwesome icons, and interactive vanilla JavaScript.

---

## 📁 Website Pages & Architecture

| File | Page Name | Key Features |
| :--- | :--- | :--- |
| `index.html` | **Home** | Hero section with primary CTAs, 24/7 emergency dispatch alert, interactive Before/After comparison slider, core services preview, trust badges, customer review highlight, and local service area summary. |
| `about.html` | **About Us** | Contractor backstory, company mission & core values (Safety First, Upfront Pricing, Respect), master electrician credentials, license badges (#EC-98241), and team bios. |
| `services.html` | **Services** | Detailed breakdown of Residential Electrical (200A panel upgrades, EV chargers, recessed lighting, rewiring), Commercial Electrical (LED retrofits, 3-phase machinery circuits, tenant fit-outs), and 24/7 Emergency Repairs. Includes key benefits and quick booking buttons for each service. |
| `reviews.html` | **Reviews & Testimonials** | Live 4.9/5-star aggregate rating card, verified client testimonial cards with category filters (Panels, EV Chargers, Emergency, Commercial), trust metrics (99.4% on-time arrival), and external platform links (Google, Yelp, Nextdoor). |
| `media.html` | **Media & Project Gallery** | Interactive project gallery with category filters (All, Panels, EV Chargers, Lighting, Commercial) and interactive Lightbox modal for full-detail project inspection. |
| `feedback.html` | **Feedback & Rating Form** | Client review submission form featuring an interactive 5-star rating selector, detailed criteria, consent checkbox, and **instant live publishing** to the recent reviews feed via `localStorage`. |
| `contact.html` | **Map & Contact** | Embedded interactive Google Map showing the shop location, 30–45 minute emergency dispatch zones, contact details, dispatch inquiry form, and FAQ accordion. |
| `admin.html` | **Admin & Dispatch Dashboard** | Complete command center for handling all client inquiries: real-time KPI metrics, search & filtering, lead status updates, technician/van assignment, emergency queue with 1-click dispatch, and review moderation. Protected with Staff ID & Password authentication. |

---

## 🔒 Dispatch Portal Credentials

Access to the Dispatch Portal (`admin.html`) is protected to ensure only authorized staff can view client inquiries and modify technician schedules:

The Staff ID and password are configured in `data/auth.json`. The portal checks credentials against the running Node.js server; old or legacy passwords are not accepted.

*(You can customize or change the password at any time by clicking the key icon 🔑 in the top-right header of the admin dashboard).*

---

## 🚀 Key Functional Features

1. **Interactive Before/After Slider:** Allows prospective clients to slide and compare messy, hazardous fuse boxes against clean, modern 200A breaker panels.
2. **Universal Free Estimate Modal:** Accessible from any page via `"Request Free Estimate"` or `"Book an Inspection"` buttons.
3. **Dynamic Feedback & Review System:** Reviews submitted through `feedback.html` automatically save to browser `localStorage` and immediately display on both the feedback stream and the reviews grid.
4. **Mobile-First Responsive Navigation:** Smooth slide-out mobile drawer with prominent click-to-call phone buttons.
5. **Toast Notification System:** Beautiful notifications when clients submit estimates or reviews.
6. **Local SEO Ready:**
   - Pre-configured `schema.org/Electrician` JSON-LD structured data.
   - Optimized Open Graph tags and meta descriptions for search visibility.
   - Target keywords for local searches (e.g. *"licensed electrician"*, *"200A panel upgrade"*, *"emergency electrician"*).

---

## 🛠️ How to Open & Run

### Method 1: Double-Click
Simply double-click `index.html` to open it in any web browser (Chrome, Edge, Firefox, Safari). All assets and dependencies load smoothly over fast CDNs without needing any compilation step.

### Method 2: Local Web Server
Run the Node.js server from the project directory to use the Dispatch Portal and API:

```bash
node server.js
```

Then open `http://localhost:5000` for the public site or `http://localhost:5000/admin.html` for the Dispatch Portal. If you serve the static pages on another local port, the portal still sends API requests to `localhost:5000`, so keep the Node.js server running as well.

For static-only preview (without the Dispatch Portal API), you can use Python:

```bash
python -m http.server 8000
```
Then visit: `http://localhost:8000`.

---

## 🎨 Customization Guide

- **Business Name & Phone:** Search & replace `VoltCraft Electric` and `(555) 782-9344` across HTML files.
- **Shop Address & Coordinates:** Update the address in the footer, `contact.html`, and the schema JSON-LD block in `index.html`.
- **Google Maps Iframe:** To change the map pin to your exact business address, open [Google Maps](https://maps.google.com), search your business, click **Share > Embed a map**, and paste the `iframe src` into `contact.html`.
