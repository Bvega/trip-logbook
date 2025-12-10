/**
 * Trip Logbook - IndexedDB Database Handler
 * 
 * @description Handles all local storage operations using IndexedDB.
 *              Provides a clean async/await API for CRUD operations on trips and photos.
 * @version 1.0.0
 * 
 * Database Structure:
 * - trips: Stores trip data (title, country, city, dates, notes, tags, coordinates)
 * - photos: Stores photo data as Base64 strings, linked to trips via tripId
 * 
 * Features:
 * - Full CRUD operations for trips and photos
 * - Search functionality across trip fields
 * - Statistics generation (countries, cities, places, photos count)
 * - Data export/import for backup and restore
 * - Automatic database versioning and upgrades
 */

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

const DB_NAME = 'TripLogbookDB';   // IndexedDB database name
const DB_VERSION = 1;               // Database version (increment for schema changes)

// =============================================================================
// TRIP DATABASE CLASS
// =============================================================================

/**
 * TripDatabase - IndexedDB wrapper class
 * Provides async methods for all database operations
 */
class TripDatabase {
    /**
     * Initialize the database connection
     * @constructor
     */
    constructor() {
        this.db = null;
        this.dbReady = this.initDB();  // Promise that resolves when DB is ready
    }

    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open database');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Trips store
                if (!db.objectStoreNames.contains('trips')) {
                    const tripStore = db.createObjectStore('trips', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    tripStore.createIndex('country', 'country', { unique: false });
                    tripStore.createIndex('city', 'city', { unique: false });
                    tripStore.createIndex('startDate', 'startDate', { unique: false });
                    tripStore.createIndex('favorite', 'favorite', { unique: false });
                    tripStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Photos store (separate for better performance)
                if (!db.objectStoreNames.contains('photos')) {
                    const photoStore = db.createObjectStore('photos', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    photoStore.createIndex('tripId', 'tripId', { unique: false });
                }
            };
        });
    }

    async ensureDB() {
        if (!this.db) {
            await this.dbReady;
        }
        return this.db;
    }

    // Trip CRUD Operations
    async addTrip(tripData) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['trips'], 'readwrite');
            const store = transaction.objectStore('trips');

            const trip = {
                ...tripData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const request = store.add(trip);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateTrip(id, tripData) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['trips'], 'readwrite');
            const store = transaction.objectStore('trips');

            const trip = {
                ...tripData,
                id: parseInt(id),
                updatedAt: new Date().toISOString()
            };

            const request = store.put(trip);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTrip(id) {
        const db = await this.ensureDB();

        // First delete associated photos
        await this.deletePhotosByTripId(id);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['trips'], 'readwrite');
            const store = transaction.objectStore('trips');
            const request = store.delete(parseInt(id));

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getTrip(id) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['trips'], 'readonly');
            const store = transaction.objectStore('trips');
            const request = store.get(parseInt(id));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllTrips() {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['trips'], 'readonly');
            const store = transaction.objectStore('trips');
            const request = store.getAll();

            request.onsuccess = () => {
                const trips = request.result.sort((a, b) =>
                    new Date(b.startDate) - new Date(a.startDate)
                );
                resolve(trips);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentTrips(limit = 5) {
        const trips = await this.getAllTrips();
        return trips.slice(0, limit);
    }

    async getFavoriteTrips() {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['trips'], 'readonly');
            const store = transaction.objectStore('trips');
            const index = store.index('favorite');
            const request = index.getAll(true);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchTrips(query) {
        const trips = await this.getAllTrips();
        const lowerQuery = query.toLowerCase();

        return trips.filter(trip =>
            trip.title?.toLowerCase().includes(lowerQuery) ||
            trip.country?.toLowerCase().includes(lowerQuery) ||
            trip.city?.toLowerCase().includes(lowerQuery) ||
            trip.place?.toLowerCase().includes(lowerQuery) ||
            trip.notes?.toLowerCase().includes(lowerQuery) ||
            trip.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    // Photo Operations
    async addPhoto(photoData) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.add(photoData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPhotosByTripId(tripId) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const index = store.index('tripId');
            const request = index.getAll(parseInt(tripId));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deletePhoto(id) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.delete(parseInt(id));

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deletePhotosByTripId(tripId) {
        const photos = await this.getPhotosByTripId(tripId);
        for (const photo of photos) {
            await this.deletePhoto(photo.id);
        }
    }

    async getAllPhotos() {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Statistics
    async getStats() {
        const trips = await this.getAllTrips();
        const photos = await this.getAllPhotos();

        const countries = new Set(trips.map(t => t.country).filter(Boolean));
        const cities = new Set(trips.map(t => t.city).filter(Boolean));
        const places = trips.filter(t => t.place).length;

        return {
            countries: countries.size,
            cities: cities.size,
            places: places,
            photos: photos.length,
            trips: trips.length
        };
    }

    async getCountriesList() {
        const trips = await this.getAllTrips();
        const countryMap = {};

        trips.forEach(trip => {
            if (trip.country) {
                if (!countryMap[trip.country]) {
                    countryMap[trip.country] = 0;
                }
                countryMap[trip.country]++;
            }
        });

        return Object.entries(countryMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    async getTagsList() {
        const trips = await this.getAllTrips();
        const tagMap = {};

        trips.forEach(trip => {
            if (trip.tags && Array.isArray(trip.tags)) {
                trip.tags.forEach(tag => {
                    if (!tagMap[tag]) {
                        tagMap[tag] = 0;
                    }
                    tagMap[tag]++;
                });
            }
        });

        return Object.entries(tagMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    // Export/Import
    async exportData() {
        const trips = await this.getAllTrips();
        const photos = await this.getAllPhotos();

        return {
            version: DB_VERSION,
            exportDate: new Date().toISOString(),
            trips,
            photos
        };
    }

    async importData(data) {
        if (!data.trips) {
            throw new Error('Invalid data format');
        }

        const db = await this.ensureDB();

        // Clear existing data
        await this.clearAllData();

        // Import trips
        for (const trip of data.trips) {
            const { id, ...tripData } = trip;
            await this.addTrip(tripData);
        }

        // Import photos if available
        if (data.photos) {
            for (const photo of data.photos) {
                const { id, ...photoData } = photo;
                await this.addPhoto(photoData);
            }
        }

        return true;
    }

    async clearAllData() {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['trips', 'photos'], 'readwrite');

            transaction.objectStore('trips').clear();
            transaction.objectStore('photos').clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Create global instance
const tripDB = new TripDatabase();
