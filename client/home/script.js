// ═══════════════════════════════════════
//  UniTrade — home/script.js
//  Connected to real API
// ═══════════════════════════════════════

const API = 'https://unitrade-project.onrender.com';

/* ─────────────────────────────────────
   STATE
───────────────────────────────────── */
let allProducts = [];   // filled from real API

let state = {
  query:      '',
  category:   'all',
  priceMin:   '',
  priceMax:   '',
  sortBy:     'newest',
  conditions: ['new', 'good', 'fair'],
  page:       1,
  perPage:    8,
  view:       'grid',
  wishlist:   JSON.parse(localStorage.getItem('ut_wishlist') || '[]'),
};

function saveWishlist() {
  localStorage.setItem('ut_wishlist', JSON.stringify(state.wishlist));
}

/* ─────────────────────────────────────
   FETCH PRODUCTS FROM REAL API
───────────────────────────────────── */
async function loadProducts() {
  showSkeleton();

  try {
    // Build query string from state
    const params = new URLSearchParams();
    if (state.query)              params.set('search',    state.query);
    if (state.category !== 'all') params.set('category',  state.category);
    if (state.priceMin)           params.set('min_price', state.priceMin);
    if (state.priceMax)           params.set('max_price', state.priceMax);
    if (state.sortBy)             params.set('sort',      state.sortBy);

    const res  = await fetch(`${API}/api/products?${params}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Failed to load products.');

    // Filter by condition client-side (API doesn't have this param)
    allProducts = (data.products || []).filter(p =>
      state.conditions.includes(p.condition_type)
    );

    // Update hero stats from real count
    animateCount('statListings', allProducts.length || 0);

    renderGrid();

  } catch (err) {
    console.error('Load products error:', err);
    showToast('Could not load listings. Is your server running?', 'err');
    allProducts = [];
    renderGrid();
  }
}

/* ─────────────────────────────────────
   SKELETON LOADER
───────────────────────────────────── */
function showSkeleton() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = Array.from({ length: 8 }, () => `
    <div class="prod-card-wrap">
      <div class="prod-card skeleton-card">
        <div class="skeleton-img"></div>
        <div class="prod-body">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
        </div>
      </div>
    </div>`).join('');
  document.getElementById('emptyState').style.display = 'none';
}

/* ─────────────────────────────────────
   FILTER & SORT  (client-side, on loaded data)
───────────────────────────────────── */
function applyFilters(products) {
  let out = [...products];

  if (state.query) {
    const q = state.query.toLowerCase();
    out = out.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.category_name || '').toLowerCase().includes(q) ||
      (p.seller_name || '').toLowerCase().includes(q)
    );
  }
  if (state.priceMin) out = out.filter(p => p.price >= Number(state.priceMin));
  if (state.priceMax) out = out.filter(p => p.price <= Number(state.priceMax));
  out = out.filter(p => state.conditions.includes(p.condition_type));

  if (state.sortBy === 'price_asc')  out.sort((a, b) => a.price - b.price);
  if (state.sortBy === 'price_desc') out.sort((a, b) => b.price - a.price);
  if (state.sortBy === 'popular')    out.sort((a, b) => (b.views || 0) - (a.views || 0));

  return out;
}

/* ─────────────────────────────────────
   RENDER CARD
───────────────────────────────────── */
function conditionBadge(c) {
  const map = {
    new:  ['badge-new',  'Like New'],
    good: ['badge-good', 'Good'],
    fair: ['badge-fair', 'Fair']
  };
  const [cls, lbl] = map[c] || ['', c];
  return `<span class="prod-badge ${cls}">${lbl}</span>`;
}

function getImageSrc(p) {
  // If product has real image from server, use it
  if (p.cover_image) return `${API}${p.cover_image}`;
  // Fallback emoji based on category
  const icons = {
    books: '📗', electronics: '💻', furniture: '🛋️',
    accessories: '🎒', stationery: '✏️', clothing: '👕'
  };
  return null; // will use emoji fallback
}

function getCategoryIcon(slug) {
  const icons = {
    books: '📗', electronics: '💻', furniture: '🛋️',
    accessories: '🎒', stationery: '✏️', clothing: '👕'
  };
  return icons[slug] || '📦';
}

function renderCard(p, delay) {
  const wishlisted = state.wishlist.includes(p.id);
  const imgSrc     = getImageSrc(p);
  const initials   = (p.seller_name || 'U').slice(0, 2).toUpperCase();

  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${p.title}" class="prod-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const iconHtml = `<div class="prod-img-placeholder" style="${imgSrc ? 'display:none' : ''}">${getCategoryIcon(p.category_slug)}</div>`;

  return `
  <div class="prod-card-wrap">
    <div class="prod-card" style="animation-delay:${delay}s" data-id="${p.id}">
      <div class="prod-img-wrap">
        ${imgHtml}${iconHtml}
      </div>
      <div class="prod-body">
        <div class="prod-cat">${p.category_name || p.category_slug || 'General'}</div>
        <div class="prod-title">${p.title}</div>
        <div class="prod-price">₹${Number(p.price).toLocaleString('en-IN')} <span>/ item</span></div>
        <div class="prod-meta">
          <span class="prod-seller">
            <span class="seller-av">${initials}</span>
            ${p.seller_name || 'Student'}
          </span>
          ${conditionBadge(p.condition_type)}
        </div>
      </div>
    </div>
    <button class="prod-wishlist" data-wid="${p.id}" title="Wishlist">
      ${wishlisted ? '❤️' : '🤍'}
    </button>
  </div>`;
}

/* ─────────────────────────────────────
   RENDER GRID
───────────────────────────────────── */
function renderGrid() {
  const filtered   = applyFilters(allProducts);
  const totalPages = Math.ceil(filtered.length / state.perPage);
  const startIdx   = (state.page - 1) * state.perPage;
  const pageItems  = filtered.slice(startIdx, startIdx + state.perPage);

  const grid  = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('resultCount');

  count.textContent = `Showing ${filtered.length} listing${filtered.length !== 1 ? 's' : ''}`;
  grid.className    = `product-grid${state.view === 'list' ? ' list-view' : ''}`;

  if (pageItems.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = pageItems.map((p, i) => renderCard(p, i * 0.04)).join('');
  }

  renderPagination(totalPages);
  attachCardEvents();
}

/* ─────────────────────────────────────
   PAGINATION
───────────────────────────────────── */
function renderPagination(total) {
  const pgPages = document.getElementById('pgPages');
  const pgPrev  = document.getElementById('pgPrev');
  const pgNext  = document.getElementById('pgNext');

  pgPrev.disabled = state.page <= 1;
  pgNext.disabled = state.page >= total;
  pgPages.innerHTML = '';

  for (let i = 1; i <= total; i++) {
    const btn = document.createElement('button');
    btn.className   = 'pg-num' + (i === state.page ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => {
      state.page = i;
      renderGrid();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    pgPages.appendChild(btn);
  }
}

/* ─────────────────────────────────────
   MODAL — opens product detail page
───────────────────────────────────── */
function openProductPage(id) {
  // Navigate to product detail page with real product ID
  window.location.href = `../product/index.html?id=${id}`;
}

/* ─────────────────────────────────────
   WISHLIST TOGGLE — calls real API
───────────────────────────────────── */
window.toggleWishlist = async function(id) {
  const token = localStorage.getItem('ut_token');

  if (token) {
    // Real API call if logged in
    try {
      const res  = await fetch(`${API}/api/users/me/wishlist`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: id })
      });
      const data = await res.json();
      if (data.wishlisted) {
        if (!state.wishlist.includes(id)) state.wishlist.push(id);
        showToast('Added to wishlist ❤️');
      } else {
        state.wishlist = state.wishlist.filter(x => x !== id);
        showToast('Removed from wishlist');
      }
    } catch (err) {
      // Fallback to localStorage if API fails
      toggleWishlistLocal(id);
    }
  } else {
    // No token — just use localStorage
    toggleWishlistLocal(id);
  }

  saveWishlist();
  renderGrid();
};

function toggleWishlistLocal(id) {
  const idx = state.wishlist.indexOf(id);
  if (idx >= 0) {
    state.wishlist.splice(idx, 1);
    showToast('Removed from wishlist');
  } else {
    state.wishlist.push(id);
    showToast('Added to wishlist ❤️');
  }
}

/* ─────────────────────────────────────
   CARD EVENT DELEGATION
───────────────────────────────────── */
function attachCardEvents() {
  document.querySelectorAll('.prod-card').forEach(card => {
    card.addEventListener('click', () => openProductPage(Number(card.dataset.id)));
  });
  document.querySelectorAll('.prod-wishlist').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleWishlist(Number(btn.dataset.wid));
    });
  });
}

/* ─────────────────────────────────────
   TOAST
───────────────────────────────────── */
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ─────────────────────────────────────
   COUNT UP ANIMATION
───────────────────────────────────── */
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let n = 0;
  const step  = Math.ceil(target / 50) || 1;
  const timer = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n;
    if (n >= target) clearInterval(timer);
  }, 20);
}

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth guard ──────────────────────────────────────────────
  const userStr = localStorage.getItem('ut_user');
  if (!userStr) {
    window.location.href = '../loginpage/index.html';
    return;
  }
  const user     = JSON.parse(userStr);
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';
  document.getElementById('navAv').textContent    = initials;
  document.getElementById('navUname').textContent = user.name || 'User';

  // ── Load real products from API ─────────────────────────────
  await loadProducts();

  // ── Animate hero stats ──────────────────────────────────────
  setTimeout(() => {
    animateCount('statStudents',   312);
    animateCount('statCategories', 6);
  }, 300);

  // ── Search input ────────────────────────────────────────────
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  let searchTimer;

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value.trim();
    searchClear.classList.toggle('show', state.query.length > 0);
    state.page  = 1;
    clearTimeout(searchTimer);
    // Debounce — wait 400ms then re-fetch from API
    searchTimer = setTimeout(() => loadProducts(), 400);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.query = '';
    searchClear.classList.remove('show');
    state.page  = 1;
    loadProducts();
  });

  // ── Category chips ──────────────────────────────────────────
  document.getElementById('catChips').addEventListener('click', e => {
    const chip = e.target.closest('.cat-chip');
    if (!chip) return;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.category = chip.dataset.cat;
    state.page     = 1;
    loadProducts(); // re-fetch with new category
  });

  // ── Apply filters ───────────────────────────────────────────
  document.getElementById('applyFilters').addEventListener('click', () => {
    state.priceMin   = document.getElementById('priceMin').value;
    state.priceMax   = document.getElementById('priceMax').value;
    state.sortBy     = document.getElementById('sortBy').value;
    state.conditions = [...document.querySelectorAll('#condList input:checked')].map(i => i.value);
    state.page       = 1;
    loadProducts();
    showToast('Filters applied');
  });

  // ── Sort change (instant re-fetch) ──────────────────────────
  document.getElementById('sortBy').addEventListener('change', e => {
    state.sortBy = e.target.value;
    state.page   = 1;
    loadProducts();
  });

  // ── Reset all filters ───────────────────────────────────────
  document.getElementById('filterReset').addEventListener('click', () => {
    state.query      = '';
    state.category   = 'all';
    state.priceMin   = '';
    state.priceMax   = '';
    state.sortBy     = 'newest';
    state.conditions = ['new', 'good', 'fair'];
    state.page       = 1;
    searchInput.value = '';
    searchClear.classList.remove('show');
    document.getElementById('priceMin').value  = '';
    document.getElementById('priceMax').value  = '';
    document.getElementById('sortBy').value    = 'newest';
    document.querySelectorAll('#condList input').forEach(i => i.checked = true);
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.cat-chip[data-cat="all"]').classList.add('active');
    loadProducts();
  });
  document.getElementById('resetAll')?.addEventListener('click', () =>
    document.getElementById('filterReset').click()
  );

  // ── View toggle ─────────────────────────────────────────────
  document.getElementById('gridBtn').addEventListener('click', () => {
    state.view = 'grid';
    document.getElementById('gridBtn').classList.add('active');
    document.getElementById('listBtn').classList.remove('active');
    renderGrid();
  });
  document.getElementById('listBtn').addEventListener('click', () => {
    state.view = 'list';
    document.getElementById('listBtn').classList.add('active');
    document.getElementById('gridBtn').classList.remove('active');
    renderGrid();
  });

  // ── Pagination buttons ──────────────────────────────────────
  document.getElementById('pgPrev').addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      renderGrid();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  document.getElementById('pgNext').addEventListener('click', () => {
    const total = Math.ceil(applyFilters(allProducts).length / state.perPage);
    if (state.page < total) {
      state.page++;
      renderGrid();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // ── Mobile filter sidebar toggle ────────────────────────────
  document.getElementById('filterToggle')?.addEventListener('click', () => {
    document.getElementById('filterSidebar').classList.toggle('mobile-open');
  });

  // ── Nav user dropdown ───────────────────────────────────────
  document.getElementById('navUser').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('navUser').classList.toggle('open');
  });
  document.addEventListener('click', () =>
    document.getElementById('navUser').classList.remove('open')
  );

  // ── Logout ──────────────────────────────────────────────────
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (!confirm('Log out of UniTrade?')) return;
    localStorage.removeItem('ut_user');
    localStorage.removeItem('ut_token');
    localStorage.removeItem('ut_wishlist');
    const fade = document.getElementById('pageFade');
    fade.classList.add('on');
    setTimeout(() => { window.location.href = '../loginpage/index.html'; }, 320);
  });

});