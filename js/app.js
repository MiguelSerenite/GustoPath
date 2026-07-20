/* ==========================================================
   GustoPath  --  app.js
   Main user-facing controller (vanilla JS, IIFE)
   ========================================================== */
(function () {
  'use strict';

  /* ---------- shortcuts ---------- */
  const $ = (s, ctx) => (ctx || document).querySelector(s);
  const $$ = (s, ctx) => [...(ctx || document).querySelectorAll(s)];

  /* ---------- application state ---------- */
  const state = {
    userPos: null,            // {lat, lng}
    filters: null,            // mirrors Storage.getFilters()
    sort: 'distance',         // distance | rating | name | price
    currentView: 'search',    // search | favorites | visited | map
    map: null,                // Leaflet map instance (main)
    modalMap: null,            // Leaflet map instance (detail modal)
    markers: [],               // current Leaflet markers on main map
    debounceTimer: null
  };

  /* ==========================================================
     INIT
     ========================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    Storage.init();
    applyTheme(Storage.getTheme());
    state.filters = Storage.getFilters();

    bindNavigation();
    bindThemeToggle();
    bindFilters();
    bindSearch();
    bindSort();
    bindModal();

    tryGeolocation();
  });

  /* ==========================================================
     GEOLOCATION
     ========================================================== */
  function tryGeolocation() {
    var geoGate = $('#geo-gate');
    var viewSearch = $('#view-search');

    Geo.getCurrentPosition()
      .then(function (pos) {
        state.userPos = pos;
        if (geoGate) geoGate.classList.add('hidden');
        if (viewSearch) viewSearch.classList.remove('hidden');
        renderCuisineFilters();
        syncFiltersUI();
        renderResults();
      })
      .catch(function (err) {
        if (geoGate) {
          geoGate.classList.remove('hidden');
          var msg = $('#geo-gate-msg');
          if (msg) msg.textContent = err.message || 'Geolocalisation indisponible.';
        }
        if (viewSearch) viewSearch.classList.add('hidden');
      });
  }

  /* ==========================================================
     THEME
     ========================================================== */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var icon = $('#theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function bindThemeToggle() {
    var btn = $('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
      Storage.setTheme(next);
      applyTheme(next);
    });
  }

  /* ==========================================================
     NAVIGATION
     ========================================================== */
  function bindNavigation() {
    $$('.nav-btn[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var view = btn.getAttribute('data-view');
        switchView(view);
      });
    });
  }

  function switchView(view) {
    state.currentView = view;

    /* highlight active nav button */
    $$('.nav-btn[data-view]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });

    /* toggle view panels */
    $$('.view-panel').forEach(function (p) { p.classList.add('hidden'); });
    var panel = $('#view-' + view);
    if (panel) panel.classList.remove('hidden');

    /* render view-specific content */
    if (view === 'search') renderResults();
    else if (view === 'favorites') renderFavorites();
    else if (view === 'visited') renderVisited();
    else if (view === 'map') renderMap();
  }

  /* ==========================================================
     FILTERS
     ========================================================== */
  function bindFilters() {
    /* distance slider */
    var distSlider = $('#distance-slider');
    if (distSlider) {
      distSlider.addEventListener('input', function () {
        var val = Number(distSlider.value);
        state.filters.maxDistance = val;
        var label = $('#distance-value');
        if (label) label.textContent = val + ' km';
      });
    }

    /* rating slider */
    var ratingSlider = $('#rating-slider');
    if (ratingSlider) {
      ratingSlider.addEventListener('input', function () {
        var val = Number(ratingSlider.value);
        state.filters.minRating = val;
        var label = $('#rating-value');
        if (label) label.textContent = val + ' / 5';
      });
    }

    /* price buttons */
    $$('.price-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = Number(btn.getAttribute('data-price'));
        btn.classList.toggle('active');
        state.filters.maxPrice = p;
        /* recalc: highest active price button wins */
        var activePrices = $$('.price-btn.active').map(function (b) {
          return Number(b.getAttribute('data-price'));
        });
        state.filters.maxPrice = activePrices.length ? Math.max.apply(null, activePrices) : 4;
      });
    });

    /* apply button */
    var applyBtn = $('#filters-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        /* gather selected cuisines from checkboxes */
        state.filters.cuisines = $$('.cuisine-cb:checked').map(function (cb) {
          return cb.value;
        });
        Storage.setFilters(state.filters);
        renderResults();
        closeFilterPanel();
      });
    }

    /* reset button */
    var resetBtn = $('#filters-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.filters = { cuisines: [], maxDistance: 10, minRating: 0, maxPrice: 4, query: '' };
        Storage.setFilters(state.filters);
        syncFiltersUI();
        renderResults();
      });
    }

    /* toggle filter panel */
    var toggleBtn = $('#filters-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var panel = $('#filters-panel');
        if (panel) panel.classList.toggle('hidden');
      });
    }
  }

  function renderCuisineFilters() {
    var container = $('#cuisine-filters');
    if (!container) return;

    var cuisines = window.RESTO_DATA.CUISINES;
    var html = '';
    cuisines.forEach(function (c) {
      var checked = state.filters.cuisines.indexOf(c.id) !== -1 ? ' checked' : '';
      html += '<label class="cuisine-filter-label">'
            + '<input type="checkbox" class="cuisine-cb" value="' + c.id + '"' + checked + '>'
            + '<span class="cuisine-chip" data-cuisine="' + c.id + '">'
            + c.icon + ' ' + c.label
            + '</span>'
            + '</label>';
    });
    container.innerHTML = html;

    /* chip click toggles checkbox */
    $$('.cuisine-chip', container).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var cb = chip.previousElementSibling;
        if (cb) cb.checked = !cb.checked;
      });
    });
  }

  function syncFiltersUI() {
    var f = state.filters;

    var distSlider = $('#distance-slider');
    if (distSlider) {
      distSlider.value = f.maxDistance;
      var dv = $('#distance-value');
      if (dv) dv.textContent = f.maxDistance + ' km';
    }

    var ratingSlider = $('#rating-slider');
    if (ratingSlider) {
      ratingSlider.value = f.minRating;
      var rv = $('#rating-value');
      if (rv) rv.textContent = f.minRating + ' / 5';
    }

    $$('.price-btn').forEach(function (btn) {
      var p = Number(btn.getAttribute('data-price'));
      btn.classList.toggle('active', p <= f.maxPrice);
    });

    $$('.cuisine-cb').forEach(function (cb) {
      cb.checked = f.cuisines.indexOf(cb.value) !== -1;
    });

    var searchInput = $('#search-input');
    if (searchInput) searchInput.value = f.query || '';
  }

  function closeFilterPanel() {
    var panel = $('#filters-panel');
    if (panel) panel.classList.add('hidden');
  }

  /* ==========================================================
     SEARCH
     ========================================================== */
  function bindSearch() {
    var input = $('#search-input');
    if (!input) return;
    input.addEventListener('input', function () {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(function () {
        state.filters.query = input.value.trim();
        Storage.setFilters(state.filters);
        renderResults();
      }, 300);
    });
  }

  /* ==========================================================
     SORT
     ========================================================== */
  function bindSort() {
    var sel = $('#sort-select');
    if (!sel) return;
    sel.addEventListener('change', function () {
      state.sort = sel.value;
      renderResults();
    });
  }

  /* ==========================================================
     DATA HELPERS
     ========================================================== */
  function averageRating(restaurantId) {
    var reviews = Storage.getReviews().filter(function (r) {
      return r.restaurantId === restaurantId;
    });
    if (reviews.length === 0) return 0;
    var sum = reviews.reduce(function (acc, r) { return acc + r.rating; }, 0);
    return sum / reviews.length;
  }

  function reviewCount(restaurantId) {
    return Storage.getReviews().filter(function (r) {
      return r.restaurantId === restaurantId;
    }).length;
  }

  function cuisineLabel(cuisineId) {
    var found = window.RESTO_DATA.CUISINES.find(function (c) {
      return c.id === cuisineId;
    });
    return found ? found.label : cuisineId;
  }

  function cuisineIcon(cuisineId) {
    var found = window.RESTO_DATA.CUISINES.find(function (c) {
      return c.id === cuisineId;
    });
    return found ? found.icon : '🍽️';
  }

  function stars(rating) {
    var full = Math.round(rating);
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += i <= full
        ? '<span class="star filled">★</span>'
        : '<span class="star empty">☆</span>';
    }
    return html;
  }

  function priceTag(level) {
    var s = '';
    for (var i = 0; i < level; i++) s += '€';
    return s;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ==========================================================
     TOAST
     ========================================================== */
  function showToast(message) {
    var container = $('#toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }

  /* ==========================================================
     FILTERING + SORTING
     ========================================================== */
  function getFilteredRestaurants() {
    var all = Storage.getRestaurants();
    var f = state.filters;
    var q = (f.query || '').toLowerCase();

    var results = all.map(function (r) {
      var copy = Object.assign({}, r);
      copy.distance = state.userPos
        ? Geo.distanceKm(state.userPos, { lat: r.lat, lng: r.lng })
        : 0;
      copy.avgRating = averageRating(r.id);
      copy.reviewCount = reviewCount(r.id);
      return copy;
    });

    /* apply filters */
    results = results.filter(function (r) {
      /* distance */
      if (state.userPos && r.distance > f.maxDistance) return false;

      /* rating */
      if (f.minRating > 0 && r.avgRating < f.minRating) return false;

      /* price */
      if (r.price > f.maxPrice) return false;

      /* cuisines */
      if (f.cuisines.length > 0 && f.cuisines.indexOf(r.cuisine) === -1) return false;

      /* text search */
      if (q) {
        var haystack = (r.name + ' ' + r.address + ' ' + cuisineLabel(r.cuisine)).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      return true;
    });

    /* sort */
    var sortKey = state.sort;
    results.sort(function (a, b) {
      if (sortKey === 'distance') return a.distance - b.distance;
      if (sortKey === 'rating') return b.avgRating - a.avgRating;
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'fr');
      if (sortKey === 'price') return a.price - b.price;
      return 0;
    });

    return results;
  }

  /* ==========================================================
     RENDER RESULTS
     ========================================================== */
  function renderResults() {
    var grid = $('#results-grid');
    if (!grid) return;

    var restaurants = getFilteredRestaurants();
    var countEl = $('#results-count');
    if (countEl) countEl.textContent = restaurants.length + ' restaurant' + (restaurants.length !== 1 ? 's' : '');

    if (restaurants.length === 0) {
      grid.innerHTML = '<div class="empty-state">'
        + '<p class="empty-icon">🔍</p>'
        + '<p>Aucun restaurant ne correspond a vos criteres.</p>'
        + '</div>';
      return;
    }

    var html = '';
    restaurants.forEach(function (r) {
      var isFav = Storage.isFavorite(r.id);
      html += '<article class="resto-card" data-id="' + escapeHtml(r.id) + '">'
        + '<div class="card-cover" data-cuisine="' + escapeHtml(r.cuisine) + '">'
          + '<span class="card-cover-icon">' + cuisineIcon(r.cuisine) + '</span>'
          + '<button class="btn-fav' + (isFav ? ' active' : '') + '" data-fav="' + escapeHtml(r.id) + '" title="Favori">'
            + (isFav ? '❤️' : '🤍')
          + '</button>'
          + '<span class="badge-distance">' + Geo.formatDistance(r.distance) + '</span>'
        + '</div>'
        + '<div class="card-body">'
          + '<h3 class="card-name">' + escapeHtml(r.name) + '</h3>'
          + '<p class="card-cuisine">' + cuisineIcon(r.cuisine) + ' ' + escapeHtml(cuisineLabel(r.cuisine)) + '</p>'
          + '<p class="card-address">' + escapeHtml(r.address) + '</p>'
          + '<div class="card-meta">'
            + '<span class="card-stars">' + stars(r.avgRating) + '</span>'
            + '<span class="card-price">' + priceTag(r.price) + '</span>'
          + '</div>'
        + '</div>'
      + '</article>';
    });

    grid.innerHTML = html;

    /* card click -> detail modal */
    $$('.resto-card', grid).forEach(function (card) {
      card.addEventListener('click', function (e) {
        /* don't open modal if user clicked the fav button */
        if (e.target.closest('.btn-fav')) return;
        var id = card.getAttribute('data-id');
        openModal(id);
      });
    });

    /* favorite buttons */
    $$('.btn-fav', grid).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-fav');
        var nowFav = Storage.toggleFavorite(id);
        btn.classList.toggle('active', nowFav);
        btn.textContent = nowFav ? '❤️' : '🤍';
        showToast(nowFav ? 'Ajoute aux favoris' : 'Retire des favoris');
      });
    });
  }

  /* ==========================================================
     FAVORITES VIEW
     ========================================================== */
  function renderFavorites() {
    var grid = $('#favorites-grid');
    if (!grid) return;

    var favIds = Storage.getFavorites();
    var all = getFilteredRestaurants();
    var restaurants = all.filter(function (r) {
      return favIds.indexOf(r.id) !== -1;
    });

    if (restaurants.length === 0) {
      grid.innerHTML = '<div class="empty-state">'
        + '<p class="empty-icon">❤️</p>'
        + '<p>Aucun favori pour le moment.</p>'
        + '<p class="empty-hint">Appuyez sur le coeur d\'un restaurant pour l\'ajouter.</p>'
        + '</div>';
      return;
    }

    var html = '';
    restaurants.forEach(function (r) {
      html += buildMiniCard(r, true);
    });
    grid.innerHTML = html;
    bindMiniCards(grid);
  }

  /* ==========================================================
     VISITED VIEW
     ========================================================== */
  function renderVisited() {
    var grid = $('#visited-grid');
    if (!grid) return;

    var visitedIds = Storage.getVisited();
    var all = getFilteredRestaurants();
    var restaurants = all.filter(function (r) {
      return visitedIds.indexOf(r.id) !== -1;
    });

    if (restaurants.length === 0) {
      grid.innerHTML = '<div class="empty-state">'
        + '<p class="empty-icon">👣</p>'
        + '<p>Aucun restaurant visite.</p>'
        + '<p class="empty-hint">Marquez vos restaurants visites depuis leur fiche.</p>'
        + '</div>';
      return;
    }

    var html = '';
    restaurants.forEach(function (r) {
      html += buildMiniCard(r, false);
    });
    grid.innerHTML = html;
    bindMiniCards(grid);
  }

  /** Shared small card used by favorites + visited views */
  function buildMiniCard(r, showFavBtn) {
    var isFav = Storage.isFavorite(r.id);
    return '<article class="resto-card mini" data-id="' + escapeHtml(r.id) + '">'
      + '<div class="card-cover" data-cuisine="' + escapeHtml(r.cuisine) + '">'
        + '<span class="card-cover-icon">' + cuisineIcon(r.cuisine) + '</span>'
        + (showFavBtn
            ? '<button class="btn-fav active" data-fav="' + escapeHtml(r.id) + '" title="Favori">❤️</button>'
            : '')
        + '<span class="badge-distance">' + Geo.formatDistance(r.distance) + '</span>'
      + '</div>'
      + '<div class="card-body">'
        + '<h3 class="card-name">' + escapeHtml(r.name) + '</h3>'
        + '<p class="card-cuisine">' + cuisineIcon(r.cuisine) + ' ' + escapeHtml(cuisineLabel(r.cuisine)) + '</p>'
        + '<div class="card-meta">'
          + '<span class="card-stars">' + stars(r.avgRating) + '</span>'
          + '<span class="card-price">' + priceTag(r.price) + '</span>'
        + '</div>'
      + '</div>'
    + '</article>';
  }

  function bindMiniCards(grid) {
    $$('.resto-card', grid).forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.btn-fav')) return;
        openModal(card.getAttribute('data-id'));
      });
    });
    $$('.btn-fav', grid).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-fav');
        Storage.toggleFavorite(id);
        /* re-render current view */
        if (state.currentView === 'favorites') renderFavorites();
        else if (state.currentView === 'visited') renderVisited();
        showToast('Retire des favoris');
      });
    });
  }

  /* ==========================================================
     MAP VIEW
     ========================================================== */
  function renderMap() {
    var container = $('#map-container');
    if (!container) return;

    /* destroy previous map */
    if (state.map) {
      state.map.remove();
      state.map = null;
    }
    state.markers = [];

    var center = state.userPos || { lat: 48.8566, lng: 2.3522 };
    state.map = L.map('map-container').setView([center.lat, center.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(state.map);

    /* user marker */
    if (state.userPos) {
      var userIcon = L.divIcon({
        html: '<span style="font-size:28px;">📍</span>',
        className: 'marker-user',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
      L.marker([state.userPos.lat, state.userPos.lng], { icon: userIcon })
        .addTo(state.map)
        .bindPopup('<strong>Vous etes ici</strong>');
    }

    /* restaurant markers */
    var restaurants = getFilteredRestaurants();
    var bounds = [];
    if (state.userPos) bounds.push([state.userPos.lat, state.userPos.lng]);

    restaurants.forEach(function (r) {
      var icon = L.divIcon({
        html: '<span style="font-size:24px;">' + cuisineIcon(r.cuisine) + '</span>',
        className: 'marker-resto',
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      var popupHtml = '<div class="map-popup">'
        + '<strong>' + escapeHtml(r.name) + '</strong><br>'
        + stars(r.avgRating) + ' <small>(' + r.reviewCount + ')</small><br>'
        + '<em>' + escapeHtml(cuisineLabel(r.cuisine)) + '</em> &middot; ' + priceTag(r.price) + '<br>'
        + '<small>' + Geo.formatDistance(r.distance) + '</small><br>'
        + '<button class="popup-detail-btn" data-id="' + escapeHtml(r.id) + '">Voir la fiche</button>'
        + '</div>';

      var marker = L.marker([r.lat, r.lng], { icon: icon })
        .addTo(state.map)
        .bindPopup(popupHtml);

      marker.on('popupopen', function () {
        var btn = $('.popup-detail-btn[data-id="' + r.id + '"]');
        if (btn) {
          btn.addEventListener('click', function () {
            openModal(r.id);
          });
        }
      });

      state.markers.push(marker);
      bounds.push([r.lat, r.lng]);
    });

    /* fit bounds */
    if (bounds.length > 1) {
      state.map.fitBounds(bounds, { padding: [40, 40] });
    }

    /* force Leaflet to recalculate size after panel becomes visible */
    setTimeout(function () {
      if (state.map) state.map.invalidateSize();
    }, 200);
  }

  /* ==========================================================
     RESTAURANT DETAIL MODAL
     ========================================================== */
  function bindModal() {
    var overlay = $('#restaurant-modal');
    if (!overlay) return;

    /* close button */
    var closeBtn = $('#modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    /* close on overlay click */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    /* close on Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  function openModal(restaurantId) {
    var modal = $('#restaurant-modal');
    if (!modal) return;

    var restaurants = Storage.getRestaurants();
    var r = restaurants.find(function (x) { return x.id === restaurantId; });
    if (!r) return;

    var dist = state.userPos ? Geo.distanceKm(state.userPos, { lat: r.lat, lng: r.lng }) : 0;
    var avg = averageRating(r.id);
    var count = reviewCount(r.id);
    var isFav = Storage.isFavorite(r.id);
    var isVis = Storage.isVisited(r.id);
    var note = Storage.getNote(r.id);

    var body = $('#modal-body');
    if (!body) return;

    body.innerHTML =
      /* cover */
      '<div class="modal-cover" data-cuisine="' + escapeHtml(r.cuisine) + '">'
        + '<span class="modal-cover-icon">' + cuisineIcon(r.cuisine) + '</span>'
      + '</div>'

      /* name + cuisine */
      + '<h2 class="modal-name">' + escapeHtml(r.name) + '</h2>'
      + '<p class="modal-cuisine">' + cuisineIcon(r.cuisine) + ' ' + escapeHtml(cuisineLabel(r.cuisine)) + '</p>'

      /* meta grid */
      + '<div class="modal-meta-grid">'
        + '<div class="meta-item">'
          + '<span class="meta-label">Note</span>'
          + '<span class="meta-value">' + (avg > 0 ? avg.toFixed(1) + ' / 5' : '--') + '</span>'
          + '<span class="meta-sub">' + count + ' avis</span>'
        + '</div>'
        + '<div class="meta-item">'
          + '<span class="meta-label">Distance</span>'
          + '<span class="meta-value">' + Geo.formatDistance(dist) + '</span>'
        + '</div>'
        + '<div class="meta-item">'
          + '<span class="meta-label">Budget</span>'
          + '<span class="meta-value">' + priceTag(r.price) + '</span>'
        + '</div>'
        + '<div class="meta-item">'
          + '<span class="meta-label">Telephone</span>'
          + '<span class="meta-value"><a href="tel:' + escapeHtml(r.phone) + '">' + escapeHtml(r.phone) + '</a></span>'
        + '</div>'
      + '</div>'

      /* address */
      + '<p class="modal-address">📍 ' + escapeHtml(r.address) + '</p>'

      /* description */
      + '<p class="modal-description">' + escapeHtml(r.description) + '</p>'

      /* action buttons */
      + '<div class="modal-actions">'
        + '<button class="modal-btn btn-toggle-fav' + (isFav ? ' active' : '') + '" data-id="' + escapeHtml(r.id) + '">'
          + (isFav ? '❤️ Favori' : '🤍 Favori')
        + '</button>'
        + '<button class="modal-btn btn-toggle-visited' + (isVis ? ' active' : '') + '" data-id="' + escapeHtml(r.id) + '">'
          + (isVis ? '✅ Visite' : '👣 Visite')
        + '</button>'
        + '<button class="modal-btn btn-itinerary" data-lat="' + r.lat + '" data-lng="' + r.lng + '">'
          + '🗺️ Itineraire'
        + '</button>'
      + '</div>'

      /* mini-map */
      + '<div id="modal-resto-map" class="modal-map"></div>'

      /* personal notes */
      + '<div class="modal-notes">'
        + '<h3>Notes personnelles</h3>'
        + '<textarea id="modal-notes-input" class="notes-textarea" placeholder="Ajoutez vos notes ici...">'
          + escapeHtml(note)
        + '</textarea>'
      + '</div>'

      /* star rating input */
      + '<div class="modal-rating-input">'
        + '<h3>Votre note</h3>'
        + '<div id="modal-star-input" class="star-input">'
          + buildStarInput(0)
        + '</div>'
      + '</div>'

      /* review form */
      + '<div class="modal-review-form">'
        + '<h3>Laisser un avis</h3>'
        + '<input id="review-author" class="review-input" type="text" placeholder="Votre nom" maxlength="50">'
        + '<textarea id="review-comment" class="review-textarea" placeholder="Votre commentaire..." maxlength="500"></textarea>'
        + '<button id="review-submit" class="modal-btn btn-submit-review">Publier l\'avis</button>'
      + '</div>'

      /* existing reviews */
      + '<div class="modal-reviews">'
        + '<h3>Avis (' + count + ')</h3>'
        + '<div id="modal-reviews-list">'
          + renderReviewsList(r.id)
        + '</div>'
      + '</div>';

    /* -- bind modal interactions -- */

    /* favorite toggle */
    var favBtn = $('.btn-toggle-fav', body);
    if (favBtn) {
      favBtn.addEventListener('click', function () {
        var nowFav = Storage.toggleFavorite(r.id);
        favBtn.classList.toggle('active', nowFav);
        favBtn.textContent = nowFav ? '❤️ Favori' : '🤍 Favori';
        showToast(nowFav ? 'Ajoute aux favoris' : 'Retire des favoris');
      });
    }

    /* visited toggle */
    var visBtn = $('.btn-toggle-visited', body);
    if (visBtn) {
      visBtn.addEventListener('click', function () {
        var nowVis = Storage.toggleVisited(r.id);
        visBtn.classList.toggle('active', nowVis);
        visBtn.textContent = nowVis ? '✅ Visite' : '👣 Visite';
        showToast(nowVis ? 'Marque comme visite' : 'Retire des visites');
      });
    }

    /* itinerary button */
    var itiBtn = $('.btn-itinerary', body);
    if (itiBtn) {
      itiBtn.addEventListener('click', function () {
        var lat = itiBtn.getAttribute('data-lat');
        var lng = itiBtn.getAttribute('data-lng');
        var url = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
        window.open(url, '_blank');
      });
    }

    /* notes auto-save */
    var notesInput = $('#modal-notes-input');
    var noteTimer = null;
    if (notesInput) {
      notesInput.addEventListener('input', function () {
        clearTimeout(noteTimer);
        noteTimer = setTimeout(function () {
          Storage.setNote(r.id, notesInput.value);
          showToast('Note enregistree');
        }, 800);
      });
    }

    /* interactive star rating */
    var starContainer = $('#modal-star-input');
    var selectedRating = 0;
    if (starContainer) {
      starContainer.addEventListener('click', function (e) {
        var starEl = e.target.closest('.star-btn');
        if (!starEl) return;
        selectedRating = Number(starEl.getAttribute('data-value'));
        starContainer.innerHTML = buildStarInput(selectedRating);
      });
    }

    /* review submit */
    var submitBtn = $('#review-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var author = ($('#review-author') || {}).value || '';
        var comment = ($('#review-comment') || {}).value || '';

        if (!author.trim()) { showToast('Veuillez entrer votre nom.'); return; }
        if (selectedRating === 0) { showToast('Veuillez donner une note.'); return; }
        if (!comment.trim()) { showToast('Veuillez ecrire un commentaire.'); return; }

        var review = {
          id: 'rv-' + Date.now(),
          restaurantId: r.id,
          author: author.trim(),
          rating: selectedRating,
          comment: comment.trim(),
          date: new Date().toISOString().slice(0, 10)
        };

        Storage.addReview(review);

        /* refresh reviews list */
        var listEl = $('#modal-reviews-list');
        if (listEl) listEl.innerHTML = renderReviewsList(r.id);

        /* refresh review count in header */
        var newCount = reviewCount(r.id);
        var h3 = body.querySelector('.modal-reviews > h3');
        if (h3) h3.textContent = 'Avis (' + newCount + ')';

        /* clear form */
        if ($('#review-author')) $('#review-author').value = '';
        if ($('#review-comment')) $('#review-comment').value = '';
        selectedRating = 0;
        if (starContainer) starContainer.innerHTML = buildStarInput(0);

        showToast('Avis publie !');
      });
    }

    /* modal Leaflet mini-map */
    if (state.modalMap) {
      state.modalMap.remove();
      state.modalMap = null;
    }
    setTimeout(function () {
      var mapEl = $('#modal-resto-map');
      if (!mapEl) return;
      state.modalMap = L.map('modal-resto-map', {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false
      }).setView([r.lat, r.lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM',
        maxZoom: 19
      }).addTo(state.modalMap);

      var mIcon = L.divIcon({
        html: '<span style="font-size:28px;">' + cuisineIcon(r.cuisine) + '</span>',
        className: 'marker-resto',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
      L.marker([r.lat, r.lng], { icon: mIcon }).addTo(state.modalMap);

      state.modalMap.invalidateSize();
    }, 150);

    /* show modal */
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    var modal = $('#restaurant-modal');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('modal-open');

    if (state.modalMap) {
      state.modalMap.remove();
      state.modalMap = null;
    }

    /* refresh results in case favs/visited changed */
    if (state.currentView === 'search') renderResults();
    else if (state.currentView === 'favorites') renderFavorites();
    else if (state.currentView === 'visited') renderVisited();
  }

  function buildStarInput(current) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += '<button class="star-btn' + (i <= current ? ' selected' : '') + '" data-value="' + i + '">'
        + (i <= current ? '★' : '☆')
        + '</button>';
    }
    return html;
  }

  function renderReviewsList(restaurantId) {
    var reviews = Storage.getReviews().filter(function (r) {
      return r.restaurantId === restaurantId;
    });

    if (reviews.length === 0) {
      return '<p class="no-reviews">Aucun avis pour le moment.</p>';
    }

    /* newest first */
    reviews.sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    var html = '';
    reviews.forEach(function (rv) {
      html += '<div class="review-item">'
        + '<div class="review-header">'
          + '<strong class="review-author">' + escapeHtml(rv.author) + '</strong>'
          + '<span class="review-date">' + escapeHtml(rv.date) + '</span>'
        + '</div>'
        + '<div class="review-stars">' + stars(rv.rating) + '</div>'
        + '<p class="review-comment">' + escapeHtml(rv.comment) + '</p>'
      + '</div>';
    });
    return html;
  }

})();
