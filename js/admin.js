/* admin.js -- GustoPath Admin / Manager Dashboard */
(function () {
  'use strict';

  const $ = (s, ctx) => (ctx || document).querySelector(s);
  const $$ = (s, ctx) => [...(ctx || document).querySelectorAll(s)];
  const CUISINES = () => window.RESTO_DATA.CUISINES;

  /* ── Helpers ─────────────────────────────────────────────── */

  function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  }

  function stars(n) {
    let out = '';
    for (let i = 1; i <= 5; i++) out += i <= n ? '★' : '☆';
    return out;
  }

  function averageRating(restaurantId) {
    const revs = Storage.getReviews().filter(r => r.restaurantId === restaurantId);
    if (!revs.length) return 0;
    return revs.reduce((s, r) => s + r.rating, 0) / revs.length;
  }

  function reviewCount(restaurantId) {
    return Storage.getReviews().filter(r => r.restaurantId === restaurantId).length;
  }

  function cuisineLabel(id) {
    const c = CUISINES().find(c => c.id === id);
    return c ? c.icon + ' ' + c.label : id;
  }

  function showToast(message, type) {
    type = type || 'info';
    let container = $('#toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 2800);
  }

  function generateId(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ── Theme ───────────────────────────────────────────────── */

  function applyTheme() {
    var theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }

  function bindThemeToggle() {
    var btn = $('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = Storage.getTheme() === 'dark' ? 'light' : 'dark';
      Storage.setTheme(next);
      applyTheme();
    });
  }

  /* ── Login Gate ──────────────────────────────────────────── */

  function showLoginGate() {
    var gate = $('#login-gate');
    if (gate) gate.classList.remove('hidden');
    var dash = $('#admin-app');
    if (dash) dash.classList.add('hidden');

    var form = $('#login-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = ($('#login-user') || {}).value || '';
      var pass = ($('#login-pass') || {}).value || '';

      if (user === 'admin' && pass === 'admin') {
        Storage.setAdmin(true);
        gate.classList.add('hidden');
        if (dash) dash.classList.remove('hidden');
        enterAdmin();
        showToast('Connexion réussie', 'success');
      } else {
        showToast('Identifiants incorrects', 'error');
      }
    });
  }

  /* ── Admin Entry ─────────────────────────────────────────── */

  function enterAdmin() {
    var app = $('#admin-app');
    if (app) app.classList.remove('hidden');

    bindAdminNav();
    bindDashboard();
    bindRestaurants();
    bindReviews();
    bindSettings();
    showView('dashboard');
  }

  /* ── Navigation ──────────────────────────────────────────── */

  function bindAdminNav() {
    $$('.nav-btn[data-admin-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showView(btn.getAttribute('data-admin-view'));
      });
    });
  }

  function showView(name) {
    $$('.admin-view').forEach(function (v) { v.classList.add('hidden'); });
    var target = $('#admin-' + name);
    if (target) target.classList.remove('hidden');

    $$('.nav-btn[data-admin-view]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-admin-view') === name);
    });

    if (name === 'dashboard') renderDashboard();
    if (name === 'restaurants') renderRestaurants();
    if (name === 'reviews') renderReviews();
  }

  /* ── Dashboard View ──────────────────────────────────────── */

  function bindDashboard() { /* rendering handled on showView */ }

  function renderDashboard() {
    var restaurants = Storage.getRestaurants();
    var reviews = Storage.getReviews();

    /* Stat cards */
    var elCount = $('#stat-restaurants');
    if (elCount) elCount.textContent = restaurants.length;

    var elReviews = $('#stat-reviews');
    if (elReviews) elReviews.textContent = reviews.length;

    /* Average rating across all reviews */
    var globalAvg = reviews.length
      ? (reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length).toFixed(1)
      : '--';
    var elAvg = $('#stat-avg-rating');
    if (elAvg) elAvg.textContent = globalAvg;

    /* Top cuisine */
    var cuisineCounts = {};
    restaurants.forEach(function (r) {
      cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] || 0) + 1;
    });
    var topCuisine = Object.keys(cuisineCounts).sort(function (a, b) {
      return cuisineCounts[b] - cuisineCounts[a];
    })[0];
    var elTop = $('#stat-top-cuisine');
    if (elTop) elTop.textContent = topCuisine ? cuisineLabel(topCuisine) : '--';

    /* Top 5 restaurants ranked by average rating */
    var ranked = restaurants.map(function (r) {
      return { restaurant: r, avg: averageRating(r.id), count: reviewCount(r.id) };
    }).filter(function (r) { return r.count > 0; })
      .sort(function (a, b) { return b.avg - a.avg || b.count - a.count; })
      .slice(0, 5);

    var topEl = $('#top-restaurants');
    if (topEl) {
      if (!ranked.length) {
        topEl.innerHTML = '<p class="empty-state">Aucun avis pour le moment.</p>';
      } else {
        topEl.innerHTML = '<ol class="top-list">' + ranked.map(function (item) {
          return '<li class="top-list__item">'
            + '<span class="top-list__name">' + escapeHtml(item.restaurant.name) + '</span>'
            + '<span class="top-list__stars">' + stars(Math.round(item.avg)) + ' ' + item.avg.toFixed(1) + '</span>'
            + '<span class="top-list__count">(' + item.count + ' avis)</span>'
            + '</li>';
        }).join('') + '</ol>';
      }
    }

    /* Cuisine distribution bars */
    var barsEl = $('#cuisine-bars');
    if (barsEl) {
      var max = Math.max.apply(null, Object.values(cuisineCounts).concat([1]));
      var sorted = Object.keys(cuisineCounts).sort(function (a, b) {
        return cuisineCounts[b] - cuisineCounts[a];
      });
      barsEl.innerHTML = sorted.map(function (cid) {
        var pct = Math.round((cuisineCounts[cid] / max) * 100);
        return '<div class="bar-row">'
          + '<span class="bar-row__label">' + escapeHtml(cuisineLabel(cid)) + '</span>'
          + '<div class="bar-row__track"><div class="bar-row__fill" style="width:' + pct + '%"></div></div>'
          + '<span class="bar-row__value">' + cuisineCounts[cid] + '</span>'
          + '</div>';
      }).join('');
    }
  }

  /* ── Restaurants CRUD ────────────────────────────────────── */

  var _editingId = null;

  function bindRestaurants() {
    var addBtn = $('#add-restaurant-btn');
    if (addBtn) addBtn.addEventListener('click', function () { openRestaurantModal(null); });

    var searchInput = $('#restaurant-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () { renderRestaurants(); });
    }

    /* Modal close */
    var closeBtn = $('#restaurant-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeRestaurantModal);

    /* Locate button */
    var locateBtn = $('#locate-btn');
    if (locateBtn) {
      locateBtn.addEventListener('click', function () {
        Geo.getCurrentPosition().then(function (pos) {
          var latField = $('#field-lat');
          var lngField = $('#field-lng');
          if (latField) latField.value = pos.lat.toFixed(6);
          if (lngField) lngField.value = pos.lng.toFixed(6);
          showToast('Position détectée', 'success');
        }).catch(function (err) {
          showToast(err.message, 'error');
        });
      });
    }

    /* Form submit */
    var form = $('#restaurant-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveRestaurant();
      });
    }
  }

  function renderRestaurants() {
    var list = Storage.getRestaurants();
    var search = ($('#restaurant-search') || {}).value || '';
    if (search) {
      var q = search.toLowerCase();
      list = list.filter(function (r) {
        return r.name.toLowerCase().indexOf(q) >= 0
          || r.address.toLowerCase().indexOf(q) >= 0
          || cuisineLabel(r.cuisine).toLowerCase().indexOf(q) >= 0;
      });
    }

    var tbody = $('#restaurants-tbody');
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucun restaurant trouvé.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (r) {
      var avg = averageRating(r.id);
      var count = reviewCount(r.id);
      return '<tr>'
        + '<td>' + escapeHtml(r.name) + '</td>'
        + '<td>' + escapeHtml(cuisineLabel(r.cuisine)) + '</td>'
        + '<td>' + escapeHtml(r.address) + '</td>'
        + '<td>' + '€'.repeat(r.price) + '</td>'
        + '<td>' + (count ? stars(Math.round(avg)) + ' ' + avg.toFixed(1) : '--') + '</td>'
        + '<td class="actions-cell">'
        + '<button class="btn btn--sm btn--edit" data-edit="' + escapeHtml(r.id) + '">Modifier</button> '
        + '<button class="btn btn--sm btn--danger" data-delete="' + escapeHtml(r.id) + '">Supprimer</button>'
        + '</td>'
        + '</tr>';
    }).join('');

    /* Delegate events */
    $$('[data-edit]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-edit');
        var r = Storage.getRestaurants().find(function (x) { return x.id === id; });
        if (r) openRestaurantModal(r);
      });
    });
    $$('[data-delete]', tbody).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete');
        if (confirm('Supprimer ce restaurant et tous ses avis ?')) {
          Storage.deleteRestaurant(id);
          renderRestaurants();
          showToast('Restaurant supprimé', 'success');
        }
      });
    });
  }

  function openRestaurantModal(restaurant) {
    _editingId = restaurant ? restaurant.id : null;
    var modal = $('#restaurant-form-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    var title = $('#restaurant-modal-title');
    if (title) title.textContent = restaurant ? 'Modifier le restaurant' : 'Ajouter un restaurant';

    /* Populate cuisine select */
    var cuisineSelect = $('#field-cuisine');
    if (cuisineSelect && !cuisineSelect.children.length) {
      cuisineSelect.innerHTML = CUISINES().map(function (c) {
        return '<option value="' + c.id + '">' + c.icon + ' ' + escapeHtml(c.label) + '</option>';
      }).join('');
    }

    /* Fill or clear fields */
    ($('#field-name') || {}).value       = restaurant ? restaurant.name : '';
    ($('#field-cuisine') || {}).value     = restaurant ? restaurant.cuisine : CUISINES()[0].id;
    ($('#field-address') || {}).value     = restaurant ? restaurant.address : '';
    ($('#field-lat') || {}).value         = restaurant ? restaurant.lat : '';
    ($('#field-lng') || {}).value         = restaurant ? restaurant.lng : '';
    ($('#field-price') || {}).value       = restaurant ? restaurant.price : 2;
    ($('#field-phone') || {}).value       = restaurant ? restaurant.phone : '';
    ($('#field-description') || {}).value = restaurant ? restaurant.description : '';
  }

  function closeRestaurantModal() {
    var modal = $('#restaurant-form-modal');
    if (modal) modal.classList.add('hidden');
    _editingId = null;
  }

  function saveRestaurant() {
    var name        = ($('#field-name') || {}).value || '';
    var cuisine     = ($('#field-cuisine') || {}).value || '';
    var address     = ($('#field-address') || {}).value || '';
    var lat         = parseFloat(($('#field-lat') || {}).value) || 0;
    var lng         = parseFloat(($('#field-lng') || {}).value) || 0;
    var price       = parseInt(($('#field-price') || {}).value, 10) || 2;
    var phone       = ($('#field-phone') || {}).value || '';
    var description = ($('#field-description') || {}).value || '';

    if (!name.trim()) { showToast('Le nom est requis.', 'error'); return; }
    if (!address.trim()) { showToast("L'adresse est requise.", 'error'); return; }

    var data = {
      name: name.trim(),
      cuisine: cuisine,
      address: address.trim(),
      lat: lat,
      lng: lng,
      price: Math.max(1, Math.min(4, price)),
      phone: phone.trim(),
      description: description.trim()
    };

    if (_editingId) {
      Storage.updateRestaurant(_editingId, data);
      showToast('Restaurant mis à jour', 'success');
    } else {
      data.id = generateId('r');
      Storage.addRestaurant(data);
      showToast('Restaurant ajouté', 'success');
    }

    closeRestaurantModal();
    renderRestaurants();
  }

  /* ── Reviews Moderation ──────────────────────────────────── */

  function bindReviews() { /* rendering handled on showView */ }

  function renderReviews() {
    var reviews = Storage.getReviews().slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });
    var restaurants = Storage.getRestaurants();
    var nameMap = {};
    restaurants.forEach(function (r) { nameMap[r.id] = r.name; });

    var container = $('#reviews-list');
    if (!container) return;

    if (!reviews.length) {
      container.innerHTML = '<p class="empty-state">Aucun avis.</p>';
      return;
    }

    container.innerHTML = reviews.map(function (rv) {
      var restoName = nameMap[rv.restaurantId] || 'Restaurant supprimé';
      return '<div class="review-card" data-review-id="' + escapeHtml(rv.id) + '">'
        + '<div class="review-card__header">'
        + '<strong>' + escapeHtml(rv.author) + '</strong>'
        + '<span class="review-card__stars">' + stars(rv.rating) + '</span>'
        + '<span class="review-card__date">' + escapeHtml(rv.date || '') + '</span>'
        + '</div>'
        + '<div class="review-card__restaurant">' + escapeHtml(restoName) + '</div>'
        + '<p class="review-card__comment">' + escapeHtml(rv.comment) + '</p>'
        + '<button class="btn btn--sm btn--danger" data-delete-review="' + escapeHtml(rv.id) + '">Supprimer</button>'
        + '</div>';
    }).join('');

    $$('[data-delete-review]', container).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete-review');
        if (confirm('Supprimer cet avis ?')) {
          Storage.deleteReview(id);
          renderReviews();
          showToast('Avis supprimé', 'success');
        }
      });
    });
  }

  /* ── Settings ────────────────────────────────────────────── */

  function bindSettings() {
    var exportBtn = $('#btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var data = Storage.exportAll();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'gustopath-export-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Données exportées', 'success');
      });
    }

    var resetBtn = $('#btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) {
          Storage.resetAll();
          showToast('Données réinitialisées', 'success');
          renderDashboard();
          renderRestaurants();
          renderReviews();
        }
      });
    }

    var logoutBtn = $('#btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        Storage.setAdmin(false);
        location.reload();
      });
    }
  }

  /* ── Boot ────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    Storage.init();
    applyTheme();
    bindThemeToggle();

    if (!Storage.isAdmin()) {
      showLoginGate();
    } else {
      var gate = $('#login-gate');
      if (gate) gate.classList.add('hidden');
      enterAdmin();
    }
  });
})();
