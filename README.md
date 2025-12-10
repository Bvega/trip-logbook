# 🌍 Trip Logbook PWA

A Progressive Web App for tracking your travels, capturing memories, and sharing your adventures.

## ✨ Features

- **📱 PWA** - Installable on any device, works offline
- **💾 Local Storage** - All data stored locally using IndexedDB
- **📸 Photo Upload** - Capture and store trip photos
- **📝 Notes & Thoughts** - Document your travel experiences
- **🗺️ Interactive Map** - Visualize your visited places with Leaflet
- **📊 Statistics** - Track countries, cities, and places visited
- **🏷️ Tags & Categories** - Organize trips with custom tags
- **📅 Timeline View** - Chronological view of your travels
- **🔍 Search & Filter** - Find trips by name, location, or tags
- **📤 Social Sharing** - Share to Facebook and Instagram

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- For development: Node.js (optional, for local server)

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/trip-logbook.git
cd trip-logbook
```

2. Start a local server:
```bash
npx serve -l 3000
```

3. Open http://localhost:3000 in your browser

### Installing as PWA

1. Open the app in Chrome/Safari
2. Click "Add to Home Screen" or the install icon in the address bar
3. The app will be installed like a native app!

## 📁 Project Structure

```
trip-logbook/
├── index.html           # Main HTML with all views
├── manifest.json        # PWA manifest
├── sw.js               # Service worker for offline support
├── css/
│   └── styles.css      # Complete styling
├── js/
│   ├── db.js           # IndexedDB database handler
│   └── app.js          # Main application logic
└── icons/
    └── icon-512.svg    # App icon
```

## 🛠️ Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables, flexbox, grid
- **JavaScript (ES6+)** - Vanilla JS, no frameworks
- **IndexedDB** - Local database for trips and photos
- **Leaflet.js** - Interactive maps
- **Service Worker** - Offline functionality and caching

## 🎨 Design Features

- Dark mode (default) with light mode toggle
- Glassmorphism effects
- Smooth animations and transitions
- Responsive design for all screen sizes
- Modern typography (Outfit font family)
- Gradient accents with purple/violet theme

## 📱 Screenshots

Coming soon...

## 🗺️ Roadmap

- [x] Core PWA functionality
- [x] Trip CRUD operations
- [x] Photo upload and storage
- [x] Interactive map visualization
- [x] Timeline view
- [x] Search and filter
- [x] Social media sharing
- [ ] Offline map tiles for China
- [ ] Multi-language support
- [ ] Trip expense tracking
- [ ] Weather integration

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👤 Author

Built with ❤️ for travelers everywhere.

---

**Note**: This is the first milestone version. Upcoming updates will include offline map support for the Cantonese region (Guangzhou, Zhuhai, Macau, Hong Kong).
