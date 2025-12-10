/**
 * Trip Logbook - Main Application
 */

// App State
const state = {
    currentView: 'dashboard',
    currentTrip: null,
    currentFilter: 'all',
    searchQuery: '',
    mapPreview: null,
    fullMap: null,
    pendingPhotos: [],
    viewerImages: [],
    viewerIndex: 0
};

// DOM Elements
const elements = {
    splashScreen: null,
    app: null,
    searchToggle: null,
    searchBar: null,
    searchInput: null,
    settingsToggle: null,
    views: {},
    navItems: null,
    addTripBtn: null,
    modals: {}
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    // Cache DOM elements
    cacheElements();

    // Setup event listeners
    setupEventListeners();

    // Initialize maps
    initMaps();

    // Load initial data
    await loadDashboard();

    // Hide splash screen
    setTimeout(() => {
        elements.splashScreen.classList.add('fade-out');
        elements.app.classList.remove('hidden');
        setTimeout(() => {
            elements.splashScreen.style.display = 'none';
        }, 500);
    }, 1500);
}

function cacheElements() {
    elements.splashScreen = document.getElementById('splash-screen');
    elements.app = document.getElementById('app');
    elements.searchToggle = document.getElementById('search-toggle');
    elements.searchBar = document.getElementById('search-bar');
    elements.searchInput = document.getElementById('search-input');
    elements.settingsToggle = document.getElementById('settings-toggle');
    elements.addTripBtn = document.getElementById('add-trip-btn');
    elements.navItems = document.querySelectorAll('.nav-item[data-view]');

    // Views
    ['dashboard', 'trips', 'map', 'timeline', 'profile'].forEach(view => {
        elements.views[view] = document.getElementById(`view-${view}`);
    });

    // Modals
    ['trip', 'trip-detail', 'share', 'settings'].forEach(modal => {
        elements.modals[modal] = document.getElementById(`${modal}-modal`);
    });
}

function setupEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });

    // Add trip button
    elements.addTripBtn?.addEventListener('click', () => openTripModal());
    document.getElementById('add-first-trip')?.addEventListener('click', () => openTripModal());

    // Search
    elements.searchToggle?.addEventListener('click', toggleSearch);
    document.getElementById('search-close')?.addEventListener('click', toggleSearch);
    elements.searchInput?.addEventListener('input', debounce(handleSearch, 300));

    // Settings
    elements.settingsToggle?.addEventListener('click', () => openModal('settings'));
    document.getElementById('close-settings-modal')?.addEventListener('click', () => closeModal('settings'));

    // See all buttons
    document.querySelectorAll('.see-all-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    // Trip form
    setupTripForm();

    // Settings actions
    setupSettings();

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => handleFilter(tab));
    });
}

// View Management
function switchView(viewName) {
    state.currentView = viewName;

    // Update active view
    Object.values(elements.views).forEach(view => {
        view?.classList.remove('active');
    });
    elements.views[viewName]?.classList.add('active');

    // Update nav
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Load view data
    switch (viewName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'trips':
            loadTrips();
            break;
        case 'map':
            loadFullMap();
            break;
        case 'timeline':
            loadTimeline();
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    // Load stats
    const stats = await tripDB.getStats();
    document.getElementById('stat-countries').textContent = stats.countries;
    document.getElementById('stat-cities').textContent = stats.cities;
    document.getElementById('stat-places').textContent = stats.places;
    document.getElementById('stat-photos').textContent = stats.photos;

    // Load recent trips
    const trips = await tripDB.getRecentTrips(5);
    renderRecentTrips(trips);

    // Update map preview
    updateMapPreview();
}

async function renderRecentTrips(trips) {
    const container = document.getElementById('recent-trips');
    const emptyState = document.getElementById('empty-trips');

    if (trips.length === 0) {
        container.innerHTML = '';
        container.appendChild(createEmptyState());
        return;
    }

    container.innerHTML = trips.map(trip => createTripCard(trip)).join('');

    // Add click listeners
    container.querySelectorAll('.trip-card').forEach(card => {
        card.addEventListener('click', () => openTripDetail(card.dataset.id));
    });
}

function createEmptyState() {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <div class="empty-icon">✈️</div>
        <h3>No trips yet</h3>
        <p>Start your adventure by adding your first trip!</p>
        <button class="btn-primary" id="add-first-trip">Add Trip</button>
    `;
    div.querySelector('#add-first-trip').addEventListener('click', () => openTripModal());
    return div;
}

function createTripCard(trip) {
    const startDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    }) : '';

    const tags = trip.tags?.slice(0, 3) || [];
    const tagsHtml = tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');

    return `
        <div class="trip-card" data-id="${trip.id}">
            <div class="trip-card-image" style="background-image: url('${trip.coverPhoto || ''}')">
                ${trip.favorite ? '<span class="trip-card-favorite">⭐</span>' : ''}
                <span class="trip-card-date">${startDate}</span>
            </div>
            <div class="trip-card-body">
                <h3 class="trip-card-title">${escapeHtml(trip.title || 'Untitled Trip')}</h3>
                <div class="trip-card-location">
                    <span>📍</span>
                    <span>${escapeHtml(trip.city || '')}, ${escapeHtml(trip.country || '')}</span>
                </div>
                ${tagsHtml ? `<div class="trip-card-tags">${tagsHtml}</div>` : ''}
            </div>
        </div>
    `;
}

// Trips View
async function loadTrips() {
    let trips = await tripDB.getAllTrips();

    // Apply filter
    if (state.currentFilter === 'favorites') {
        trips = trips.filter(t => t.favorite);
    } else if (state.currentFilter === 'recent') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        trips = trips.filter(t => new Date(t.startDate) >= thirtyDaysAgo);
    }

    // Apply search
    if (state.searchQuery) {
        trips = await tripDB.searchTrips(state.searchQuery);
    }

    renderTripsGrid(trips);
}

function renderTripsGrid(trips) {
    const container = document.getElementById('trips-list');

    if (trips.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No trips found</h3><p>Try a different filter or add a new trip</p></div>';
        return;
    }

    container.innerHTML = trips.map(trip => createTripCard(trip)).join('');

    // Add click listeners
    container.querySelectorAll('.trip-card').forEach(card => {
        card.addEventListener('click', () => openTripDetail(card.dataset.id));
    });
}

function handleFilter(tab) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.currentFilter = tab.dataset.filter;
    loadTrips();
}

// Map Functions
function initMaps() {
    // Map Preview (Dashboard)
    if (document.getElementById('map-preview')) {
        state.mapPreview = L.map('map-preview', {
            zoomControl: false,
            attributionControl: false,
            dragging: false
        }).setView([20, 0], 1);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(state.mapPreview);
    }
}

function loadFullMap() {
    if (!state.fullMap) {
        state.fullMap = L.map('full-map', {
            zoomControl: false
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(state.fullMap);

        // Map controls
        document.getElementById('map-locate')?.addEventListener('click', locateUser);
    }

    updateFullMapMarkers();
}

async function updateMapPreview() {
    if (!state.mapPreview) return;

    const trips = await tripDB.getAllTrips();

    // Clear existing markers
    state.mapPreview.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            state.mapPreview.removeLayer(layer);
        }
    });

    // Add markers for trips with coordinates
    trips.forEach(trip => {
        if (trip.lat && trip.lng) {
            const marker = L.marker([trip.lat, trip.lng], {
                icon: createCustomIcon()
            }).addTo(state.mapPreview);
        }
    });
}

async function updateFullMapMarkers() {
    if (!state.fullMap) return;

    const trips = await tripDB.getAllTrips();

    // Clear existing markers
    state.fullMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            state.fullMap.removeLayer(layer);
        }
    });

    const bounds = [];

    trips.forEach(trip => {
        if (trip.lat && trip.lng) {
            const marker = L.marker([trip.lat, trip.lng], {
                icon: createCustomIcon()
            }).addTo(state.fullMap);

            marker.bindPopup(`
                <strong>${escapeHtml(trip.title)}</strong><br>
                📍 ${escapeHtml(trip.city)}, ${escapeHtml(trip.country)}
            `);

            marker.on('click', () => openTripDetail(trip.id));
            bounds.push([trip.lat, trip.lng]);
        }
    });

    if (bounds.length > 0) {
        state.fullMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

function createCustomIcon() {
    return L.divIcon({
        html: '<div class="custom-marker">📍</div>',
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
}

function locateUser() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                state.fullMap.setView([latitude, longitude], 10);
                showToast('Location found!');
            },
            () => {
                showToast('Could not get your location');
            }
        );
    }
}

// Timeline
async function loadTimeline() {
    const trips = await tripDB.getAllTrips();
    const container = document.getElementById('timeline-container');

    if (trips.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No trips in timeline</h3><p>Add trips to see them here</p></div>';
        return;
    }

    // Group by year and month
    const grouped = {};
    trips.forEach(trip => {
        const date = new Date(trip.startDate);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!grouped[yearMonth]) {
            grouped[yearMonth] = [];
        }
        grouped[yearMonth].push(trip);
    });

    // Render timeline
    let html = '';
    Object.keys(grouped).sort().reverse().forEach(yearMonth => {
        const [year, month] = yearMonth.split('-');
        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        grouped[yearMonth].forEach((trip, index) => {
            html += `
                <div class="timeline-item" data-id="${trip.id}">
                    ${index === 0 ? `<div class="timeline-date">${monthName}</div>` : ''}
                    <div class="timeline-card">
                        <h4>${escapeHtml(trip.title)}</h4>
                        <p>📍 ${escapeHtml(trip.city)}, ${escapeHtml(trip.country)}</p>
                    </div>
                </div>
            `;
        });
    });

    container.innerHTML = html;

    // Add click listeners
    container.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', () => openTripDetail(item.dataset.id));
    });
}

// Profile/Stats
async function loadProfile() {
    const countriesList = await tripDB.getCountriesList();
    const tagsList = await tripDB.getTagsList();

    // Render countries
    const countriesContainer = document.getElementById('countries-list');
    if (countriesList.length > 0) {
        countriesContainer.innerHTML = countriesList.map(c =>
            `<span class="stat-list-item">🌍 ${escapeHtml(c.name)} (${c.count})</span>`
        ).join('');
    } else {
        countriesContainer.innerHTML = '<p style="color: var(--text-muted)">No countries visited yet</p>';
    }

    // Render tags
    const tagsContainer = document.getElementById('tags-cloud');
    if (tagsList.length > 0) {
        tagsContainer.innerHTML = tagsList.map(t =>
            `<span class="tag-item">#${escapeHtml(t.name)}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '<p style="color: var(--text-muted)">No tags used yet</p>';
    }
}

// Modal Management
function openModal(name) {
    const modal = elements.modals[name];
    if (modal) {
        modal.classList.add('active');
        renderModalContent(name);
    }
}

function closeModal(name) {
    const modal = elements.modals[name];
    if (modal) {
        modal.classList.remove('active');
    }
}

function renderModalContent(name) {
    const modal = elements.modals[name];
    if (!modal) return;

    switch (name) {
        case 'trip':
            modal.innerHTML = getTripFormHTML();
            setupTripForm();
            break;
        case 'settings':
            modal.innerHTML = getSettingsHTML();
            setupSettings();
            break;
        case 'share':
            modal.innerHTML = getShareHTML();
            setupShare();
            break;
    }
}

function getTripFormHTML() {
    const trip = state.currentTrip || {};
    const isEdit = !!trip.id;

    return `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${isEdit ? 'Edit Trip' : 'Add New Trip'}</h2>
                <button class="modal-close" id="close-trip-modal">✕</button>
            </div>
            <form id="trip-form" class="modal-form">
                <input type="hidden" id="trip-id" value="${trip.id || ''}">
                
                <div class="form-group">
                    <label for="trip-title">Trip Title *</label>
                    <input type="text" id="trip-title" placeholder="e.g., Summer in Paris" value="${escapeHtml(trip.title || '')}" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="trip-country">Country *</label>
                        <input type="text" id="trip-country" placeholder="e.g., France" value="${escapeHtml(trip.country || '')}" required>
                    </div>
                    <div class="form-group">
                        <label for="trip-city">City *</label>
                        <input type="text" id="trip-city" placeholder="e.g., Paris" value="${escapeHtml(trip.city || '')}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="trip-place">Specific Place</label>
                    <input type="text" id="trip-place" placeholder="e.g., Eiffel Tower" value="${escapeHtml(trip.place || '')}">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="trip-start-date">Start Date *</label>
                        <input type="date" id="trip-start-date" value="${trip.startDate || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="trip-end-date">End Date</label>
                        <input type="date" id="trip-end-date" value="${trip.endDate || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="trip-notes">Notes & Thoughts</label>
                    <textarea id="trip-notes" rows="3" placeholder="Share your experience...">${escapeHtml(trip.notes || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="trip-tags">Tags</label>
                    <input type="text" id="trip-tags" placeholder="e.g., beach, adventure, food (comma separated)" value="${(trip.tags || []).join(', ')}">
                </div>
                
                <div class="form-group">
                    <label>Photos</label>
                    <div class="photo-upload-area" id="photo-upload-area">
                        <input type="file" id="photo-input" multiple accept="image/*" hidden>
                        <div class="upload-placeholder" id="upload-placeholder">
                            <p>📷 Tap to add photos</p>
                        </div>
                        <div id="photo-preview" class="photo-preview"></div>
                    </div>
                </div>
                
                <div class="form-group checkbox-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="trip-favorite" ${trip.favorite ? 'checked' : ''}>
                        <span class="checkbox-custom"></span>
                        <span>Mark as Favorite ⭐</span>
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-trip">Cancel</button>
                    <button type="submit" class="btn-primary">Save Trip</button>
                </div>
            </form>
        </div>
    `;
}

function setupTripForm() {
    const modal = elements.modals['trip'];
    if (!modal) return;

    const form = modal.querySelector('#trip-form');
    const closeBtn = modal.querySelector('#close-trip-modal');
    const cancelBtn = modal.querySelector('#cancel-trip');
    const photoUploadArea = modal.querySelector('#photo-upload-area');
    const photoInput = modal.querySelector('#photo-input');

    closeBtn?.addEventListener('click', () => {
        closeModal('trip');
        state.currentTrip = null;
        state.pendingPhotos = [];
    });

    cancelBtn?.addEventListener('click', () => {
        closeModal('trip');
        state.currentTrip = null;
        state.pendingPhotos = [];
    });

    photoUploadArea?.addEventListener('click', () => photoInput?.click());
    photoInput?.addEventListener('change', handlePhotoSelect);

    form?.addEventListener('submit', handleTripSubmit);
}

async function handlePhotoSelect(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('photo-preview');
    const placeholder = document.getElementById('upload-placeholder');

    for (const file of files) {
        const base64 = await fileToBase64(file);
        state.pendingPhotos.push({
            data: base64,
            name: file.name,
            type: file.type
        });
    }

    renderPhotoPreview();
    placeholder.style.display = state.pendingPhotos.length > 0 ? 'none' : 'block';
}

function renderPhotoPreview() {
    const preview = document.getElementById('photo-preview');
    if (!preview) return;

    preview.innerHTML = state.pendingPhotos.map((photo, index) => `
        <div class="photo-preview-item">
            <img src="${photo.data}" alt="Photo ${index + 1}">
            <button type="button" class="remove-photo" data-index="${index}">✕</button>
        </div>
    `).join('');

    preview.querySelectorAll('.remove-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            state.pendingPhotos.splice(index, 1);
            renderPhotoPreview();

            const placeholder = document.getElementById('upload-placeholder');
            placeholder.style.display = state.pendingPhotos.length > 0 ? 'none' : 'block';
        });
    });
}

async function handleTripSubmit(e) {
    e.preventDefault();

    const tripId = document.getElementById('trip-id')?.value;
    const tripData = {
        title: document.getElementById('trip-title')?.value,
        country: document.getElementById('trip-country')?.value,
        city: document.getElementById('trip-city')?.value,
        place: document.getElementById('trip-place')?.value,
        startDate: document.getElementById('trip-start-date')?.value,
        endDate: document.getElementById('trip-end-date')?.value,
        notes: document.getElementById('trip-notes')?.value,
        tags: document.getElementById('trip-tags')?.value.split(',').map(t => t.trim()).filter(Boolean),
        favorite: document.getElementById('trip-favorite')?.checked,
        coverPhoto: state.pendingPhotos[0]?.data || state.currentTrip?.coverPhoto || ''
    };

    // Get coordinates for the location
    try {
        const coords = await geocodeLocation(`${tripData.city}, ${tripData.country}`);
        if (coords) {
            tripData.lat = coords.lat;
            tripData.lng = coords.lng;
        }
    } catch (err) {
        console.warn('Could not geocode location');
    }

    try {
        let savedTripId;

        if (tripId) {
            // Update
            tripData.createdAt = state.currentTrip.createdAt;
            await tripDB.updateTrip(tripId, tripData);
            savedTripId = parseInt(tripId);
            showToast('Trip updated successfully!');
        } else {
            // Create
            savedTripId = await tripDB.addTrip(tripData);
            showToast('Trip added successfully!');
        }

        // Save photos
        for (const photo of state.pendingPhotos) {
            await tripDB.addPhoto({
                tripId: savedTripId,
                ...photo
            });
        }

        // Reset state
        state.currentTrip = null;
        state.pendingPhotos = [];

        // Close modal and refresh
        closeModal('trip');
        loadDashboard();

        if (state.currentView === 'trips') {
            loadTrips();
        }

    } catch (error) {
        console.error('Error saving trip:', error);
        showToast('Error saving trip');
    }
}

function openTripModal(trip = null) {
    state.currentTrip = trip;
    state.pendingPhotos = [];
    openModal('trip');
}

// Trip Detail
async function openTripDetail(tripId) {
    const trip = await tripDB.getTrip(tripId);
    if (!trip) return;

    const photos = await tripDB.getPhotosByTripId(tripId);
    state.currentTrip = trip;
    state.viewerImages = photos.map(p => p.data);

    const modal = elements.modals['trip-detail'];
    modal.innerHTML = getTripDetailHTML(trip, photos);
    modal.classList.add('active');

    // Setup event listeners
    modal.querySelector('#close-detail')?.addEventListener('click', () => {
        modal.classList.remove('active');
        state.currentTrip = null;
    });

    modal.querySelector('#edit-trip')?.addEventListener('click', () => {
        modal.classList.remove('active');
        openTripModal(trip);
    });

    modal.querySelector('#delete-trip')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this trip?')) {
            await tripDB.deleteTrip(tripId);
            modal.classList.remove('active');
            showToast('Trip deleted');
            loadDashboard();
            if (state.currentView === 'trips') loadTrips();
        }
    });

    modal.querySelector('#share-trip')?.addEventListener('click', () => {
        openShareModal(trip);
    });

    // Image viewer
    modal.querySelectorAll('.detail-gallery-item').forEach((item, index) => {
        item.addEventListener('click', () => openImageViewer(index));
    });
}

function getTripDetailHTML(trip, photos) {
    const startDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    }) : '';
    const endDate = trip.endDate ? new Date(trip.endDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    }) : '';

    const galleryHtml = photos.length > 0 ? `
        <div class="detail-gallery">
            ${photos.map((photo, i) => `
                <div class="detail-gallery-item" data-index="${i}">
                    <img src="${photo.data}" alt="Photo ${i + 1}">
                </div>
            `).join('')}
        </div>
    ` : '';

    const tagsHtml = trip.tags?.length > 0 ? `
        <div class="trip-card-tags" style="margin-top: 16px;">
            ${trip.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
        </div>
    ` : '';

    return `
        <div class="modal-content modal-fullscreen">
            <div class="detail-header">
                <button class="back-btn" id="close-detail">← Back</button>
                <div class="detail-actions">
                    <button class="icon-btn" id="share-trip" aria-label="Share">📤</button>
                    <button class="icon-btn" id="edit-trip" aria-label="Edit">✏️</button>
                    <button class="icon-btn" id="delete-trip" aria-label="Delete">🗑️</button>
                </div>
            </div>
            <div class="detail-content">
                ${galleryHtml}
                <div class="detail-info">
                    <h1 class="detail-title">${trip.favorite ? '⭐ ' : ''}${escapeHtml(trip.title)}</h1>
                    <div class="detail-location">
                        <span>📍</span>
                        <span>${escapeHtml(trip.city)}, ${escapeHtml(trip.country)}</span>
                        ${trip.place ? `<span>• ${escapeHtml(trip.place)}</span>` : ''}
                    </div>
                    <div class="detail-dates">
                        <span>📅</span>
                        <span>${startDate}${endDate ? ` - ${endDate}` : ''}</span>
                    </div>
                    ${tagsHtml}
                </div>
                ${trip.notes ? `
                    <div class="detail-notes">
                        <h3>Notes & Thoughts</h3>
                        <p>${escapeHtml(trip.notes)}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Image Viewer
function openImageViewer(index) {
    const viewer = document.getElementById('image-viewer');
    state.viewerIndex = index;

    viewer.innerHTML = `
        <button class="viewer-close" id="close-viewer">✕</button>
        <div class="viewer-content">
            <img id="viewer-image" src="${state.viewerImages[index]}" alt="Full size image">
        </div>
        <div class="viewer-nav">
            <button id="viewer-prev" class="viewer-nav-btn">◀</button>
            <button id="viewer-next" class="viewer-nav-btn">▶</button>
        </div>
    `;

    viewer.classList.add('active');

    viewer.querySelector('#close-viewer')?.addEventListener('click', () => {
        viewer.classList.remove('active');
    });

    viewer.querySelector('#viewer-prev')?.addEventListener('click', () => {
        state.viewerIndex = (state.viewerIndex - 1 + state.viewerImages.length) % state.viewerImages.length;
        document.getElementById('viewer-image').src = state.viewerImages[state.viewerIndex];
    });

    viewer.querySelector('#viewer-next')?.addEventListener('click', () => {
        state.viewerIndex = (state.viewerIndex + 1) % state.viewerImages.length;
        document.getElementById('viewer-image').src = state.viewerImages[state.viewerIndex];
    });
}

// Share Modal
function openShareModal(trip) {
    state.currentTrip = trip;
    openModal('share');
}

function getShareHTML() {
    const trip = state.currentTrip;
    const shareText = `Check out my trip to ${trip?.city}, ${trip?.country}! 🌍✈️ #TripLogbook #Travel`;

    return `
        <div class="modal-content modal-small">
            <div class="modal-header">
                <h2>Share to Social Media</h2>
                <button class="modal-close" id="close-share-modal">✕</button>
            </div>
            <div class="share-options">
                <button class="share-btn facebook" id="share-facebook">
                    📘 Share on Facebook
                </button>
                <button class="share-btn instagram" id="share-instagram">
                    📸 Share on Instagram
                </button>
                <div class="share-divider">
                    <span>or copy text</span>
                </div>
                <div class="share-link-container">
                    <input type="text" id="share-link" value="${escapeHtml(shareText)}" readonly>
                    <button class="copy-btn" id="copy-link">📋</button>
                </div>
            </div>
        </div>
    `;
}

function setupShare() {
    const modal = elements.modals['share'];
    if (!modal) return;

    modal.querySelector('#close-share-modal')?.addEventListener('click', () => closeModal('share'));

    modal.querySelector('#share-facebook')?.addEventListener('click', () => {
        const trip = state.currentTrip;
        const text = encodeURIComponent(`Check out my trip to ${trip?.city}, ${trip?.country}! 🌍✈️`);
        window.open(`https://www.facebook.com/sharer/sharer.php?quote=${text}`, '_blank');
        showToast('Opening Facebook...');
    });

    modal.querySelector('#share-instagram')?.addEventListener('click', () => {
        // Instagram doesn't support direct web sharing, so we copy the text
        const trip = state.currentTrip;
        const text = `Check out my trip to ${trip?.city}, ${trip?.country}! 🌍✈️ #TripLogbook #Travel #${trip?.country?.replace(/\s/g, '')}`;
        navigator.clipboard.writeText(text);
        showToast('Caption copied! Open Instagram to share your photo.');
    });

    modal.querySelector('#copy-link')?.addEventListener('click', () => {
        const input = modal.querySelector('#share-link');
        navigator.clipboard.writeText(input.value);
        showToast('Copied to clipboard!');
    });
}

// Settings
function getSettingsHTML() {
    const isDarkMode = !document.body.classList.contains('light-theme');

    return `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Settings</h2>
                <button class="modal-close" id="close-settings-modal">✕</button>
            </div>
            <div class="settings-content">
                <div class="setting-item">
                    <div class="setting-info">
                        <h3>Dark Mode</h3>
                        <p>Switch between light and dark theme</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="dark-mode-toggle" ${isDarkMode ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <h3>Export Data</h3>
                        <p>Download all your trips as JSON</p>
                    </div>
                    <button class="btn-secondary" id="export-data">Export</button>
                </div>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <h3>Import Data</h3>
                        <p>Restore from a backup file</p>
                    </div>
                    <button class="btn-secondary" id="import-data">Import</button>
                    <input type="file" id="import-file" accept=".json" hidden>
                </div>
                
                <div class="setting-item danger">
                    <div class="setting-info">
                        <h3>Clear All Data</h3>
                        <p>Delete all trips and photos</p>
                    </div>
                    <button class="btn-danger" id="clear-data">Clear</button>
                </div>
            </div>
        </div>
    `;
}

function setupSettings() {
    const modal = elements.modals['settings'];
    if (!modal) return;

    modal.querySelector('#close-settings-modal')?.addEventListener('click', () => closeModal('settings'));

    modal.querySelector('#dark-mode-toggle')?.addEventListener('change', (e) => {
        document.body.classList.toggle('light-theme', !e.target.checked);
        localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
    });

    modal.querySelector('#export-data')?.addEventListener('click', async () => {
        const data = await tripDB.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trip-logbook-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported successfully!');
    });

    const importFile = modal.querySelector('#import-file');
    modal.querySelector('#import-data')?.addEventListener('click', () => importFile?.click());

    importFile?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await tripDB.importData(data);
            showToast('Data imported successfully!');
            loadDashboard();
        } catch (error) {
            showToast('Error importing data');
            console.error(error);
        }
    });

    modal.querySelector('#clear-data')?.addEventListener('click', async () => {
        if (confirm('Are you sure? This will delete ALL your trips and photos permanently.')) {
            await tripDB.clearAllData();
            showToast('All data cleared');
            loadDashboard();
            closeModal('settings');
        }
    });
}

// Search
function toggleSearch() {
    elements.searchBar.classList.toggle('hidden');
    if (!elements.searchBar.classList.contains('hidden')) {
        elements.searchInput.focus();
    } else {
        elements.searchInput.value = '';
        state.searchQuery = '';
    }
}

async function handleSearch() {
    state.searchQuery = elements.searchInput.value;

    if (state.currentView === 'trips') {
        loadTrips();
    } else if (state.currentView === 'dashboard') {
        const trips = await tripDB.searchTrips(state.searchQuery);
        renderRecentTrips(trips.slice(0, 5));
    }
}

// Utility Functions
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function geocodeLocation(location) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
    } catch (error) {
        console.warn('Geocoding failed:', error);
    }
    return null;
}

// Theme initialization
(function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
})();
