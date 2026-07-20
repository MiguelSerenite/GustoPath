const STORAGE_KEYS = {
  RESTAURANTS: 'gustoPath.restaurants',
  REVIEWS:     'gustoPath.reviews',
  FAVORITES:   'gustoPath.favorites',
  VISITED:     'gustoPath.visited',
  NOTES:       'gustoPath.notes',
  FILTERS:     'gustoPath.filters',
  THEME:       'gustoPath.theme',
  ADMIN_AUTH:  'gustoPath.adminAuth'
};

const Storage = {
  _get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  },
  _set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} },

  init() {
    if (!this._get(STORAGE_KEYS.RESTAURANTS)) this._set(STORAGE_KEYS.RESTAURANTS, window.RESTO_DATA.SEED_RESTAURANTS);
    if (!this._get(STORAGE_KEYS.REVIEWS))     this._set(STORAGE_KEYS.REVIEWS, window.RESTO_DATA.SEED_REVIEWS);
    if (!this._get(STORAGE_KEYS.FAVORITES))   this._set(STORAGE_KEYS.FAVORITES, []);
    if (!this._get(STORAGE_KEYS.VISITED))     this._set(STORAGE_KEYS.VISITED, []);
    if (!this._get(STORAGE_KEYS.NOTES))       this._set(STORAGE_KEYS.NOTES, {});
  },

  getRestaurants()     { return this._get(STORAGE_KEYS.RESTAURANTS, []); },
  setRestaurants(list) { this._set(STORAGE_KEYS.RESTAURANTS, list); },
  addRestaurant(r)     { const l = this.getRestaurants(); l.push(r); this.setRestaurants(l); },
  updateRestaurant(id, patch) { this.setRestaurants(this.getRestaurants().map(r => r.id === id ? { ...r, ...patch } : r)); },
  deleteRestaurant(id) { this.setRestaurants(this.getRestaurants().filter(r => r.id !== id)); this.setReviews(this.getReviews().filter(rv => rv.restaurantId !== id)); },

  getReviews()      { return this._get(STORAGE_KEYS.REVIEWS, []); },
  setReviews(list)  { this._set(STORAGE_KEYS.REVIEWS, list); },
  addReview(review) { const l = this.getReviews(); l.push(review); this.setReviews(l); },
  deleteReview(id)  { this.setReviews(this.getReviews().filter(r => r.id !== id)); },

  getFavorites()     { return this._get(STORAGE_KEYS.FAVORITES, []); },
  toggleFavorite(id) { const f = this.getFavorites(); const i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); this._set(STORAGE_KEYS.FAVORITES, f); return f.includes(id); },
  isFavorite(id)     { return this.getFavorites().includes(id); },

  getVisited()      { return this._get(STORAGE_KEYS.VISITED, []); },
  toggleVisited(id) { const v = this.getVisited(); const i = v.indexOf(id); if (i >= 0) v.splice(i, 1); else v.push(id); this._set(STORAGE_KEYS.VISITED, v); return v.includes(id); },
  isVisited(id)     { return this.getVisited().includes(id); },

  getNote(id)       { return (this._get(STORAGE_KEYS.NOTES, {}))[id] || ''; },
  setNote(id, text) { const n = this._get(STORAGE_KEYS.NOTES, {}); n[id] = text; this._set(STORAGE_KEYS.NOTES, n); },

  getFilters() { return this._get(STORAGE_KEYS.FILTERS, { cuisines: [], maxDistance: 10, minRating: 0, maxPrice: 4, query: '' }); },
  setFilters(f) { this._set(STORAGE_KEYS.FILTERS, f); },

  getTheme()  { return this._get(STORAGE_KEYS.THEME, 'dark'); },
  setTheme(t) { this._set(STORAGE_KEYS.THEME, t); },

  isAdmin()   { return this._get(STORAGE_KEYS.ADMIN_AUTH, false); },
  setAdmin(v) { this._set(STORAGE_KEYS.ADMIN_AUTH, v); },

  exportAll() { return { restaurants: this.getRestaurants(), reviews: this.getReviews(), favorites: this.getFavorites(), visited: this.getVisited(), notes: this._get(STORAGE_KEYS.NOTES, {}) }; },
  resetAll()  { Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k)); this.init(); }
};

window.Storage = Storage;
