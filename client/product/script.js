// ═══════════════════════════════════════
//  UniTrade — product/script.js
//  Connected to real API
// ═══════════════════════════════════════

const API = 'https://unitrade-project.onrender.com';

/* ─────────────────────────────────────
   HELPERS
───────────────────────────────────── */
function getParam(k) {
  return new URLSearchParams(window.location.search).get(k);
}

let wishlist = JSON.parse(localStorage.getItem('ut_wishlist') || '[]');
function saveWishlist() {
  localStorage.setItem('ut_wishlist', JSON.stringify(wishlist));
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function conditionBadge(c) {
  const cls = { new: 'badge-new', good: 'badge-good', fair: 'badge-fair' };
  const lbl = { new: 'Like New',  good: 'Good',       fair: 'Fair'      };
  return [cls[c] || '', lbl[c] || c];
}

function navigate(path) {
  const fade = document.getElementById('pageFade');
  fade.classList.add('on');
  setTimeout(() => { window.location.href = path; }, 300);
}

function getCategoryIcon(slug) {
  const icons = {
    books: '📗', electronics: '💻', furniture: '🛋️',
    accessories: '🎒', stationery: '✏️', clothing: '👕'
  };
  return icons[slug] || '📦';
}

/* ─────────────────────────────────────
   FETCH PRODUCT FROM REAL API
───────────────────────────────────── */
async function loadProduct(id) {
  try {
    const res  = await fetch(`${API}/api/products/${id}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Product not found.');
    return data.product;

  } catch (err) {
    console.error('Load product error:', err);
    return null;
  }
}

/* ─────────────────────────────────────
   FETCH SIMILAR PRODUCTS
───────────────────────────────────── */
async function loadSimilar(categorySlug, excludeId) {
  try {
    const res  = await fetch(`${API}/api/products?category=${categorySlug}`);
    const data = await res.json();
    return (data.products || [])
      .filter(p => p.id !== excludeId)
      .slice(0, 4);
  } catch (err) {
    return [];
  }
}

/* ─────────────────────────────────────
   BUILD IMAGE GALLERY
───────────────────────────────────── */
function buildGallery(product) {
  const mainImg  = document.getElementById('mainImg');
  const thumbRow = document.getElementById('thumbRow');
  const images   = product.images || [];
  const icon     = getCategoryIcon(product.category_slug);

  if (images.length > 0) {
    // Real images from server
    const coverImg = images.find(i => i.is_cover) || images[0];

    mainImg.innerHTML = `
      <img src="${API}${coverImg.image_path}"
           alt="${product.title}"
           style="width:100%;height:100%;object-fit:cover;border-radius:var(--r)"
           onerror="this.outerHTML='<span style=\\'font-size:6rem\\'>${icon}</span>'"
      />`;

    thumbRow.innerHTML = images.map((img, i) => `
      <div class="thumb${i === 0 ? ' active' : ''}" data-idx="${i}" data-src="${API}${img.image_path}">
        <img src="${API}${img.image_path}"
             alt="photo ${i+1}"
             style="width:100%;height:100%;object-fit:cover;border-radius:6px"
             onerror="this.outerHTML='<span>${icon}</span>'"
        />
      </div>`).join('');

    thumbRow.querySelectorAll('.thumb').forEach(th => {
      th.addEventListener('click', () => {
        thumbRow.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
        th.classList.add('active');
        mainImg.innerHTML = `
          <img src="${th.dataset.src}"
               alt="${product.title}"
               style="width:100%;height:100%;object-fit:cover;border-radius:var(--r)"
               onerror="this.outerHTML='<span style=\\'font-size:6rem\\'>${icon}</span>'"
          />`;
      });
    });

  } else {
    // No images — show category emoji
    mainImg.innerHTML = `<span style="font-size:6rem">${icon}</span>`;
    thumbRow.innerHTML = `<div class="thumb active"><span style="font-size:1.6rem">${icon}</span></div>`;
  }
}

/* ─────────────────────────────────────
   RENDER PRODUCT
───────────────────────────────────── */
function renderProduct(product, user) {
  document.title = `UniTrade — ${product.title}`;

  // Breadcrumb
  const bcEl = document.getElementById('bcCurrent');
  if (bcEl) bcEl.textContent = product.title;

  // Gallery
  buildGallery(product);

  // Condition badge
  const [badgeCls, badgeLbl] = conditionBadge(product.condition_type);
  const badge = document.getElementById('conditionBadge');
  if (badge) { badge.textContent = badgeLbl; badge.className = `img-badge ${badgeCls}`; }

  // Main info
  document.getElementById('infoCat').textContent   = (product.category_name || product.category_slug || 'General').toUpperCase();
  document.getElementById('infoTitle').textContent = product.title;
  document.getElementById('infoPrice').textContent = `₹${Number(product.price).toLocaleString('en-IN')}`;

  // Location
  const locEl = document.getElementById('priceOg');
  if (locEl) locEl.textContent = product.location ? `📍 ${product.location}` : '📍 Campus';

  // Description
  document.getElementById('infoDesc').textContent = product.description || 'No description provided.';

  // Meta chips
  const posted   = new Date(product.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const metaEl   = document.getElementById('metaChips');
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="meta-chip">📅 ${posted}</span>
      <span class="meta-chip">🏷️ ${product.category_name || product.category_slug}</span>
      <span class="meta-chip ${badgeCls}">${badgeLbl}</span>
      <span class="meta-chip">👁️ ${product.views || 0} views</span>`;
  }

  // Original price / discount
  if (product.orig_price && Number(product.orig_price) > Number(product.price)) {
    const discount = Math.round((1 - product.price / product.orig_price) * 100);
    const origEl   = document.getElementById('origPrice');
    if (origEl) {
      origEl.innerHTML = `
        <span style="text-decoration:line-through;color:var(--txt-muted)">
          ₹${Number(product.orig_price).toLocaleString('en-IN')}
        </span>
        <span style="background:#f0fdf4;color:#15803d;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:700">
          ${discount}% off
        </span>`;
    }
  }

  // Seller info
  const initials = (product.seller_name || 'U').slice(0, 2).toUpperCase();
  document.getElementById('sellerAv').textContent    = initials;
  document.getElementById('sellerName').textContent  = product.seller_name || 'Student';
  document.getElementById('sellerMeta').textContent  = 'Verified campus student · UniTrade seller';
  document.getElementById('sellerStats').innerHTML   =
    `<div class="sv">${product.seller_id || ''}</div><div class="sl">Seller ID</div>`;
  const mbSellerEl = document.getElementById('mbSellerName');
  if (mbSellerEl) mbSellerEl.textContent = product.seller_name || 'Seller';

  // Wishlist button state
  updateWishlistUI(product.id);

  // Owner vs buyer view
  const isOwner = user && (user.id === product.seller_id || user.email === product.seller_email);
  const ownerEl = document.getElementById('ownerActions');
  const buyerEl = document.getElementById('buyerActions');
  if (ownerEl) ownerEl.style.display = isOwner ? 'flex' : 'none';
  if (buyerEl) buyerEl.style.display = isOwner ? 'none' : 'flex';

  // Sold overlay
  if (product.status === 'sold') {
    const soldBanner = document.createElement('div');
    soldBanner.style.cssText = 'background:#ef4444;color:#fff;text-align:center;padding:8px;font-weight:700;font-size:13px;border-radius:var(--r) var(--r) 0 0;';
    soldBanner.textContent   = '🔴 This item has been sold';
    document.getElementById('mainImg').prepend(soldBanner);
    if (buyerEl) buyerEl.style.pointerEvents = 'none', buyerEl.style.opacity = '0.5';
  }

  // Show layout
  document.getElementById('skeletonWrap').style.display  = 'none';
  document.getElementById('productLayout').style.display = 'grid';
}

/* ─────────────────────────────────────
   RENDER SIMILAR PRODUCTS
───────────────────────────────────── */
function renderSimilar(products) {
  const grid = document.getElementById('similarGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = '<div style="color:var(--txt-muted);font-size:13px;padding:1rem">No similar listings found.</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const icon = getCategoryIcon(p.category_slug);
    const img  = p.cover_image
      ? `<img src="${API}${p.cover_image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='<span style=\\'font-size:1.6rem\\'>${icon}</span>'">`
      : `<span style="font-size:1.6rem">${icon}</span>`;

    return `
      <div class="sim-card" onclick="navigate('index.html?id=${p.id}')">
        <div class="sim-icon">${img}</div>
        <div class="sim-info">
          <div class="sim-title">${p.title}</div>
          <div class="sim-price">₹${Number(p.price).toLocaleString('en-IN')}</div>
        </div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────
   WISHLIST — calls real API
───────────────────────────────────── */
function updateWishlistUI(id) {
  const w     = wishlist.includes(id);
  const fab   = document.getElementById('wishlistFab');
  const lgBtn = document.getElementById('wishlistLg');
  if (fab)   fab.textContent   = w ? '❤️' : '🤍';
  if (lgBtn) lgBtn.textContent = w ? '❤️ Saved' : '🤍 Save';
}

async function toggleWishlist(id) {
  const token = localStorage.getItem('ut_token');

  if (token) {
    try {
      const res  = await fetch(`${API}/api/users/me/wishlist`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: id })
      });
      const data = await res.json();
      if (data.wishlisted) {
        if (!wishlist.includes(id)) wishlist.push(id);
        showToast('Added to wishlist ❤️');
      } else {
        wishlist = wishlist.filter(x => x !== id);
        showToast('Removed from wishlist');
      }
    } catch (err) {
      toggleWishlistLocal(id);
    }
  } else {
    toggleWishlistLocal(id);
  }

  saveWishlist();
  updateWishlistUI(id);
}

function toggleWishlistLocal(id) {
  const idx = wishlist.indexOf(id);
  if (idx >= 0) { wishlist.splice(idx, 1); showToast('Removed from wishlist'); }
  else          { wishlist.push(id);       showToast('Added to wishlist ❤️'); }
}

/* ─────────────────────────────────────
   SEND MESSAGE — calls real API
───────────────────────────────────── */
async function sendMessage(productId, sellerId, body) {
  const token = localStorage.getItem('ut_token');
  if (!token) {
    showToast('Please log in to contact the seller.');
    return false;
  }

  try {
    const res  = await fetch(`${API}/api/messages`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        product_id:  productId,
        receiver_id: sellerId,
        body
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return true;
  } catch (err) {
    showToast(err.message || 'Could not send message. Try again.');
    return false;
  }
}

/* ─────────────────────────────────────
   DELETE PRODUCT — calls real API
───────────────────────────────────── */
async function deleteProduct(id) {
  const token = localStorage.getItem('ut_token');
  try {
    const res = await fetch(`${API}/api/products/${id}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return true;
  } catch (err) {
    showToast(err.message || 'Could not delete listing.');
    return false;
  }
}

/* ─────────────────────────────────────
   SHARE HELPERS
───────────────────────────────────── */
window.copyLink = function() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => showToast('Link copied! 🔗'));
};
window.shareWhatsApp = function() {
  window.open(
    `https://wa.me/?text=${encodeURIComponent('Check out this listing on UniTrade: ' + window.location.href)}`,
    '_blank'
  );
};

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
  const initials = (user.name || 'U').slice(0, 2).toUpperCase();
  document.getElementById('navAv').textContent    = initials;
  document.getElementById('navUname').textContent = user.name || 'User';

  // ── Get product ID from URL ──────────────────────────────────
  const id = Number(getParam('id'));
  if (!id) {
    document.getElementById('skeletonWrap').style.display = 'none';
    document.getElementById('notFound').style.display     = 'block';
    return;
  }

  // ── Load product from real API ───────────────────────────────
  const product = await loadProduct(id);

  if (!product) {
    document.getElementById('skeletonWrap').style.display = 'none';
    document.getElementById('notFound').style.display     = 'block';
    return;
  }

  // ── Render product ───────────────────────────────────────────
  renderProduct(product, user);

  // ── Load and render similar products ────────────────────────
  const similar = await loadSimilar(product.category_slug, product.id);
  renderSimilar(similar);

  // ── Wishlist buttons ─────────────────────────────────────────
  document.getElementById('wishlistFab')?.addEventListener('click', () => toggleWishlist(id));
  document.getElementById('wishlistLg')?.addEventListener('click',  () => toggleWishlist(id));

  // ── Contact seller / send message ────────────────────────────
  document.getElementById('contactBtn')?.addEventListener('click', () => {
    const mb = document.getElementById('messageBox');
    if (!mb) return;
    mb.style.display = mb.style.display === 'none' ? 'flex' : 'none';
    if (mb.style.display === 'flex') document.getElementById('mbText')?.focus();
  });

  document.getElementById('cancelMsgBtn')?.addEventListener('click', () => {
    const mb = document.getElementById('messageBox');
    if (mb) mb.style.display = 'none';
  });

  document.getElementById('sendMsgBtn')?.addEventListener('click', async () => {
    const textEl = document.getElementById('mbText');
    const body   = textEl?.value.trim();
    if (!body) { showToast('Please write a message first'); return; }

    const sendBtn = document.getElementById('sendMsgBtn');
    sendBtn.disabled    = true;
    sendBtn.textContent = 'Sending…';

    const ok = await sendMessage(product.id, product.seller_id, body);

    sendBtn.disabled    = false;
    sendBtn.textContent = 'Send';

    if (ok) {
      showToast('Message sent! ✓ The seller will be notified.');
      const mb = document.getElementById('messageBox');
      if (mb) mb.style.display = 'none';
      if (textEl) textEl.value = '';
    }
  });

  // ── Owner: edit and delete ────────────────────────────────────
  document.getElementById('editBtn')?.addEventListener('click', () => {
    navigate(`../sell/index.html?edit=${id}`);
  });

  document.getElementById('deleteBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;

    const ok = await deleteProduct(id);
    if (ok) {
      showToast('Listing deleted successfully.');
      setTimeout(() => navigate('../home/index.html'), 1000);
    }
  });

  // ── Nav user dropdown ─────────────────────────────────────────
  document.getElementById('navUser')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('navUser').classList.toggle('open');
  });
  document.addEventListener('click', () =>
    document.getElementById('navUser')?.classList.remove('open')
  );

  // ── Logout ────────────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (!confirm('Log out of UniTrade?')) return;
    localStorage.removeItem('ut_user');
    localStorage.removeItem('ut_token');
    localStorage.removeItem('ut_wishlist');
    navigate('../loginpage/index.html');
  });

});