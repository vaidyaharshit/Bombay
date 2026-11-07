# THE 12 CHRONICLES
### A Private Travel Website for 12 Friends • IIT Bombay Techfest × Mumbai 2026

> *"12 Friends. One Journey. A Thousand Memories."*

**The 12 Chronicles** is a luxury, minimal, collaborative trip planning website and digital travel journal designed for a private group of 12 friends traveling to **IIT Bombay Techfest** and exploring **Mumbai** in December 2026.

Built with an editorial magazine aesthetic, the platform combines modern trip logistics, live itinerary timelines, shared photography vaults, equal-split expense ledgers, and group decision polls into a cohesive, responsive experience.

---

## 🎨 Design Philosophy & Color Palette

The visual identity follows an editorial travel journal aesthetic—warm, spacious, tactile, and free from dark blue/purple AI gradients or fluorescent neon lights.

| Token | Hex Code | Primary Usage |
| :--- | :--- | :--- |
| **Warm Ivory** | `#F7F4EC` | Master canvas & textured background |
| **Forest Green** | `#354B3A` | Primary actions, headings, progress meters |
| **Terracotta** | `#C76B4A` | Accent highlights, alerts, category badges |
| **Muted Olive** | `#A4A88A` | Secondary metadata, dividers, borders |
| **Charcoal** | `#282824` | Core typography, titles, high-contrast text |
| **White** | `#FFFFFF` | Journal cards, modals, content panels |

---

## 🛠️ Technology Stack

- **Markup & Styling:** Semantic HTML5, Tailwind CSS (via CDN with customized color tokens), Google Fonts (`Playfair Display` + `Plus Jakarta Sans`).
- **Client Scripting:** Pure Vanilla JavaScript (ES6+ modular controllers, event-driven state updates).
- **3D Hero Visuals:** [Three.js](https://threejs.org/) for a lightweight, optimized low-poly Mumbai skyline, coastal arc, and orbiting airplane.
- **Backend & Cloud Storage:**
  - **Firebase Authentication:** Role-based access control (Admin & Member).
  - **Firebase Firestore:** Real-time synchronized itinerary, expenses, photo metadata, tasks, and polls.
  - **Firebase Cloud Storage:** Full-resolution multi-photo uploads across Android, iOS, and desktop.
  - **Zero-Config Local Synchronization Fallback:** Full offline/instant functionality out of the box using event-driven local storage with pre-seeded data for the 12 squad members.

---

## 📂 Project Architecture

```
/
├── index.html            # Cinematic Hero, 3D Three.js Skyline, Live Countdown, Overview
├── schedule.html         # Day-wise vertical timeline, map links, add/edit/delete activity
├── explore.html          # Mumbai Explorer: 8 curated landmarks, visited status, tips
├── hall-of-fame.html     # Photo Gallery, multi-device uploader, albums, fullscreen lightbox
├── planner.html          # Train PNR, Quad-sharing rooms, prep checklist, group polls
├── squad.html            # 12 Friends editorial profile grid, roles, fun facts
├── expenses.html         # Shared expense tracker, smart debt simplification, UPI settle
├── memories.html         # Post-trip digital scrapbook, Trip Wrapped 2026 stats
├── css/
│   └── style.css         # Custom typography, masonry grid, animations, theme tokens
├── js/
│   ├── firebase-config.js# Firebase project configuration & key validation
│   ├── auth.js           # 12 squad member profiles, roles, invite passkey, identity switcher
│   ├── firebase.js       # Unified data bridge (Firestore & local persistence engine)
│   ├── hero-three.js     # Lightweight 3D Mumbai skyline & plane orbit (Three.js)
│   ├── main.js           # Shared navbar, mobile drawer, toasts, live countdown, modals
│   ├── schedule.js       # Itinerary timeline controller & status toggles
│   ├── explore.js        # Mumbai explorer search, filters & visited tracker
│   ├── gallery.js        # Hall of fame masonry, multi-upload, progress bar, lightbox
│   ├── planner.js        # Logistics, checklists, task assignment, and poll voting
│   ├── expenses.js       # Expense calculations, member splits, and debt simplification
│   ├── squad.js          # Squad profile grid and profile editor
│   └── memories.js       # Trip Wrapped statistics and group memory board
├── vercel.json           # Vercel deployment configuration
└── README.md             # Documentation and setup instructions
```

---

## 👥 The 12 Squad Members

1. **Aryan Sharma** (Admin) — *Trip Lead & Techfest Hackathon Head*
2. **Kabir Verma** — *Maps, Routes & Metro Master*
3. **Rohan Mehta** — *Vada Pav & Street Food Connoisseur*
4. **Siddharth Rao** (Admin) — *Budget Keeper & Splitwise Guru*
5. **Ananya Iyer** — *Chief Photographer & Aesthetics Lead*
6. **Diya Sen** — *Music Playlists & Energy Booster*
7. **Tanvi Deshmukh** — *Timeline Keeper & PNR Tracker*
8. **Vihaan Joshi** — *IIT Bombay Robotics Competitor*
9. **Aditi Patel** — *First-Aid, Essentials & Safety Lead*
10. **Arjun Kulkarni** — *Board Games, Mafia & Night Talks*
11. **Riya Nair** — *Colaba Causeway & Shopping Queen*
12. **Dev Malhotra** — *Marine Drive Midnight Strolls Lead*

> **Testing Tip:** Click the member pill in the navigation header to switch your active identity instantly to test both Admin privileges and Member views.

---

## 🚀 Getting Started & Local Development

No Node.js or compiler installation is required. The website runs natively in any modern web browser.

### 1. Simple Local Server
To run locally, you can use any static file server:

```powershell
# Using Python
python -m http.server 3000

# Or using npx serve
npx serve .
```

Open `http://localhost:3000` in your browser.

---

## 🔥 Firebase Setup Instructions

The application works immediately out-of-the-box with complete local state persistence. To connect your live Firebase backend:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Enable:
   - **Firestore Database** in test or production mode.
   - **Firebase Storage** for media uploads.
   - **Authentication** (Email/Password or Anonymous).
3. Copy your project configuration object and replace the values in `js/firebase-config.js`:

```javascript
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

*(Alternatively, click **"🔥 Firebase Sync"** in the website footer at any time to paste your Firebase credentials directly into the web UI without modifying files!)*

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Restrict to authenticated squad members in production
    }
  }
}
```

---

## 🌐 Deploying to Vercel

The repository is configured for one-click deployment on [Vercel](https://vercel.com):

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. In the Vercel Dashboard, select **Add New Project** and import the repository.
3. Keep default settings (Framework Preset: **Other** / Root Directory: `./`).
4. Click **Deploy**.

Vercel will detect `vercel.json` and deploy the static site globally with high-speed CDN caching.

---

## 🔒 Security & Privacy

- Private invite code system: Passkey `TECHFEST2026` protects squad updates.
- Admin-gated controls: Itinerary mutations and important announcements require Admin identity (`Aryan Sharma` or `Siddharth Rao`).
- Content Security: Zero external ads, tracking cookies, or intrusive dependencies.

---

© 2026 The 12 Chronicles. Built for the adventure of a lifetime.
