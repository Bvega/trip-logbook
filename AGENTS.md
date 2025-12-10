# AGENTS.md - Trip Logbook PWA

> Instructions for AI coding agents working on this project.

## Project Overview

**Trip Logbook** is a Progressive Web App (PWA) for tracking travel experiences. Users can log trips with photos, notes, and locations, view them on an interactive map, and share to social media.

### Key Characteristics
- **Mobile-first**: Designed primarily for phones, responsive on all devices
- **Offline-capable**: Works without internet via Service Worker
- **Local storage**: All data stored in IndexedDB (no backend server)
- **China-ready**: Planned offline map support for Cantonese region

## Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Semantic markup |
| CSS3 | Styling with CSS variables, no frameworks |
| Vanilla JavaScript | Application logic (ES6+, no frameworks) |
| IndexedDB | Local database for trips and photos |
| Leaflet.js | Interactive maps (via CDN) |
| Service Worker | Offline functionality and caching |

**Important**: This project intentionally uses **vanilla JavaScript** with no frameworks (React, Vue, etc.). Maintain this approach.

## File Structure

```
trip-logbook/
├── index.html          # Single-page app with all views
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
├── AGENTS.md          # This file (AI instructions)
├── README.md          # Human-readable documentation
├── css/
│   └── styles.css     # All styling (~1500 lines)
├── js/
│   ├── app.js         # Main application (~1200 lines)
│   └── db.js          # IndexedDB handler (~380 lines)
└── icons/
    └── icon-512.svg   # App icon
```

## Build & Run Commands

```bash
# Start local development server
npx serve -l 3000

# Test on mobile (same WiFi network)
# Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
# Open http://YOUR_IP:3000 on phone
```

**No build step required** - vanilla JS runs directly in browser.

## Code Style Guidelines

### JavaScript
- Use **JSDoc comments** for functions: `@param`, `@returns`, `@description`
- Use **section separators**: `// ===== SECTION NAME =====`
- Use **camelCase** for variables and functions
- Use **async/await** for asynchronous operations
- Add **inline comments** for non-obvious logic

### CSS
- Use **CSS custom properties** (variables) defined in `:root`
- Follow the **existing design system** (colors, spacing, radii)
- Use **BEM-like naming** for complex components
- **Dark theme** is default, light theme via `.light-theme` class

### HTML
- Use **semantic elements** (`<main>`, `<nav>`, `<section>`, etc.)
- Add **aria-labels** for accessibility
- Use **unique IDs** for JavaScript-interactive elements

## Database Schema (IndexedDB)

### `trips` store
```javascript
{
  id: auto,           // Primary key
  title: string,      // Trip name
  country: string,    // Country visited
  city: string,       // City visited
  place: string,      // Specific location (optional)
  startDate: string,  // ISO date
  endDate: string,    // ISO date (optional)
  notes: string,      // User notes
  tags: string[],     // Array of tags
  favorite: boolean,  // Favorite flag
  lat: number,        // Latitude (from geocoding)
  lng: number,        // Longitude (from geocoding)
  coverPhoto: string, // Base64 image (optional)
  createdAt: string,  // ISO timestamp
  updatedAt: string   // ISO timestamp
}
```

### `photos` store
```javascript
{
  id: auto,         // Primary key
  tripId: number,   // Foreign key to trips
  data: string,     // Base64 encoded image
  name: string,     // Original filename
  type: string      // MIME type
}
```

## Testing Guidelines

1. **Test on actual mobile devices** via local network
2. **Test IndexedDB** operations in browser DevTools → Application → IndexedDB
3. **Test Service Worker** caching in DevTools → Application → Service Workers
4. **Test offline mode** by disabling network in DevTools
5. **Verify PWA install** prompt appears on mobile browsers

## Key Application Functions

| Function | File | Purpose |
|----------|------|---------|
| `initApp()` | app.js | Application entry point |
| `loadDashboard()` | app.js | Load stats and recent trips |
| `handleTripSubmit()` | app.js | Save new/edited trip |
| `geocodeLocation()` | app.js | Convert address to coordinates |
| `tripDB.addTrip()` | db.js | Add trip to IndexedDB |
| `tripDB.getAllTrips()` | db.js | Retrieve all trips |

## Current Roadmap

- [x] Core PWA functionality
- [x] Trip CRUD operations
- [x] Interactive map with search
- [x] Theme-aware map tiles
- [ ] **Offline map tiles for China** (Cantonese region: Guangzhou, Zhuhai, Macau, Hong Kong)
- [ ] Multi-language support
- [ ] Trip expense tracking

## Git Commit Conventions

Use emoji prefixes for commit types:
- 🎉 `:tada:` - Initial/milestone commits
- ✨ `:sparkles:` - New features
- 🐛 `:bug:` - Bug fixes
- 📝 `:memo:` - Documentation
- 🎨 `:art:` - Code style/formatting
- ♻️ `:recycle:` - Refactoring
- 🔧 `:wrench:` - Configuration

## Security Considerations

- **No sensitive data** should be stored (API keys, passwords)
- **Sanitize user input** with `escapeHtml()` before rendering
- **Photos are Base64 encoded** and stored locally only
- **No external API calls** except:
  - Nominatim (OpenStreetMap geocoding)
  - CartoDB (map tiles)
  - Facebook/Instagram (share links only, no API)

## Contact

Repository: https://github.com/Bvega/trip-logbook
