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

function condClass(c) {
  const cls = { new: 'gtag-new', good: 'gtag-good', fair: 'gtag-fair' };
  const lbl = { new: 'Like New',  good: 'Good',      fair: 'Fair'     };
  return [cls[c] || 'gtag-good', lbl[c] || c];
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
    const coverImg = images.find(i => i.is_cover) || images[0];
    mainImg.innerHTML = `
      <img src="${API}${coverImg.image_path}"
           alt="${product.title}"
           style="width:100%;height:100%;object-fit:cover"
           onerror="this.outerHTML='<div class=main-img-inner style=font-size:6rem>${icon}</div>'"
      />`;

    thumbRow.innerHTML = images.map((img, i) => `
      <div class="thumb${i === 0 ? ' active' : ''}" data-src="${API}${img.image_path}">
        <img src="${API}${img.image_path}"
             alt="photo ${i+1}"
             style="width:100%;height:100%;object-fit:cover"
             onerror="this.outerHTML='${icon}'"
        />
      </div>`).join('');

    thumbRow.querySelectorAll('.thumb').forEach(th => {
      th.addEventListener('click', () => {
        thumbRow.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
        th.classList.add('active');
        mainImg.innerHTML = `
          <img src="${th.dataset.src}"
               alt="${product.title}"
               style="width:100%;height:100%;object-fit:cover"
               onerror="this.outerHTML='<div class=main-img-inner style=font-size:6rem>${icon}</div>'"
          />`;
      });
    });
  } else {
    mainImg.innerHTML = `<div class="main-img-inner" style="font-size:6rem">${icon}</div>`;
    thumbRow.innerHTML = `<div class="thumb active"><div style="font-size:1.6rem">${icon}</div></div>`;
  }
}

/* ─────────────────────────────────────
   RENDER PRODUCT
───────────────────────────────────── */
function renderProduct(product, user) {
  document.title = `UniTrade — ${product.title}`;

  // Breadcrumb
  const bcEl  = document.getElementById('bcCurrent');
  const bcCat = document.getElementById('bcCategory');
  if (bcEl)  bcEl.textContent  = product.title;
  if (bcCat) bcCat.textContent = product.category_name || product.category_slug || 'Category';

  // Gallery
  buildGallery(product);

  // Condition tag under image  — CSS: .gtag .gtag-new/good/fair
  const [condCls, condLbl] = condClass(product.condition_type);
  const galleryTags = document.getElementById('galleryTags');
  if (galleryTags) {
    galleryTags.innerHTML = `<span class="gtag ${condCls}">${condLbl}</span>`;
    if (product.status === 'sold') galleryTags.innerHTML += `<span class="gtag gtag-sold">🔴 Sold</span>`;
  }

  // Main info  — CSS: .info-category, .info-title, .info-price, .info-desc
  document.getElementById('infoCat').textContent   = (product.category_name || product.category_slug || 'General').toUpperCase();
  document.getElementById('infoTitle').textContent = product.title;
  document.getElementById('infoPrice').textContent = `₹${Number(product.price).toLocaleString('en-IN')}`;
  document.getElementById('infoDesc').textContent  = product.description || 'No description provided.';

  // Pay button amount
  const payAmountEl = document.getElementById('payAmount');
  if (payAmountEl) payAmountEl.textContent = Number(product.price).toLocaleString('en-IN');

  // Wire pay button
  document.getElementById('payBtn')?.addEventListener('click', () => initiatePayment(product));

  // Location
  const locEl = document.getElementById('priceOg');
  if (locEl) locEl.textContent = product.location ? `📍 ${product.location}` : '📍 Campus';

  // Meta pills  — CSS: .meta-pills .mpill
  const posted = new Date(product.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const metaEl = document.getElementById('metaChips');
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="mpill">📅 ${posted}</span>
      <span class="mpill">🏷️ ${product.category_name || product.category_slug}</span>
      <span class="mpill">${condLbl}</span>
      <span class="mpill">👁️ ${product.views || 0} views</span>`;
  }

  // Original price / discount
  if (product.orig_price && Number(product.orig_price) > Number(product.price)) {
    const discount = Math.round((1 - product.price / product.orig_price) * 100);
    const origEl   = document.getElementById('origPrice');
    if (origEl) {
      origEl.innerHTML = `
        <span style="text-decoration:line-through;color:var(--txt3)">
          ₹${Number(product.orig_price).toLocaleString('en-IN')}
        </span>
        <span class="price-tag">${discount}% off</span>`;
    }
  }

  // Seller  — CSS: .sc-av, .sc-name, .sc-meta, .sc-stats
  const initials = (product.seller_name || 'U').slice(0, 2).toUpperCase();
  document.getElementById('sellerAv').textContent   = initials;
  document.getElementById('sellerName').textContent = product.seller_name || 'Student';
  document.getElementById('sellerMeta').textContent = 'Verified campus student · UniTrade seller';
  const sellerStats = document.getElementById('sellerStats');
  if (sellerStats) {
    sellerStats.innerHTML = `
      <div class="sc-stat">
        <span>${product.seller_id || ''}</span>
        Seller ID
      </div>`;
  }

  // Mirror seller name into contact modal
  const modalSellerAv   = document.getElementById('modalSellerAv');
  const modalSellerName = document.getElementById('modalSellerName');
  if (modalSellerAv)   modalSellerAv.textContent   = initials;
  if (modalSellerName) modalSellerName.textContent = product.seller_name || 'Seller';

  // Wishlist state
  updateWishlistUI(product.id);

  // Owner vs buyer  — CSS: .own-panel, .buyer-actions
  const isOwner = user && (user.id === product.seller_id || user.email === product.seller_email);
  const ownerEl = document.getElementById('ownerActions');
  const buyerEl = document.getElementById('buyerActions');
  if (ownerEl) ownerEl.style.display = isOwner ? 'block' : 'none';
  if (buyerEl) buyerEl.style.display = isOwner ? 'none'  : 'flex';

  // Sold state
  if (product.status === 'sold' && buyerEl) {
    buyerEl.style.pointerEvents = 'none';
    buyerEl.style.opacity = '0.5';
  }

  // Show layout, hide skeleton
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
    grid.innerHTML = '<div style="color:var(--txt3);font-size:13px;padding:1rem">No similar listings found.</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const icon = getCategoryIcon(p.category_slug);
    const img  = p.cover_image
      ? `<img src="${API}${p.cover_image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover">`
      : icon;
    return `
      <div class="rc" onclick="navigate('index.html?id=${p.id}')">
        <div class="rc-img">${img}</div>
        <div class="rc-body">
          <div class="rc-title">${p.title}</div>
          <div class="rc-price">₹${Number(p.price).toLocaleString('en-IN')}</div>
        </div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────
   WISHLIST
───────────────────────────────────── */
function updateWishlistUI(id) {
  const btn = document.getElementById('wishlistLg');
  if (btn) btn.textContent = wishlist.includes(id) ? '❤️' : '🤍';
}

async function toggleWishlist(id) {
  const token = localStorage.getItem('ut_token');
  if (token) {
    try {
      const res  = await fetch(`${API}/api/users/me/wishlist`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    } catch (err) { toggleWishlistLocal(id); }
  } else { toggleWishlistLocal(id); }
  saveWishlist();
  updateWishlistUI(id);
}

function toggleWishlistLocal(id) {
  const idx = wishlist.indexOf(id);
  if (idx >= 0) { wishlist.splice(idx, 1); showToast('Removed from wishlist'); }
  else          { wishlist.push(id);       showToast('Added to wishlist ❤️'); }
}

/* ─────────────────────────────────────
   SEND MESSAGE
───────────────────────────────────── */
async function sendMessage(productId, sellerId, body) {
  const token = localStorage.getItem('ut_token');
  if (!token) { showToast('Please log in to contact the seller.'); return false; }
  try {
    const res  = await fetch(`${API}/api/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId, receiver_id: sellerId, body })
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
   DELETE PRODUCT
───────────────────────────────────── */
async function deleteProduct(id) {
  const token = localStorage.getItem('ut_token');
  try {
    const res  = await fetch(`${API}/api/products/${id}`, {
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
   PAYMENT — Razorpay Integration
───────────────────────────────────── */
async function initiatePayment(product) {
  const token = localStorage.getItem('ut_token');
  try {
    const res = await fetch(`${API}/api/payment/create-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ amount: product.price, product_id: product.id })
    });
    const { orderId, amount } = await res.json();
    const user = JSON.parse(localStorage.getItem('ut_user'));
    const options = {
      key:         'PASTE_YOUR_RAZORPAY_KEY_HERE',
      amount,
      currency:    'INR',
      name:        'UniTrade',
      description: product.title,
      order_id:    orderId,
      handler: async function(response) {
        const verify = await fetch(`${API}/api/payment/verify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body:    JSON.stringify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            product_id:          product.id,
            amount:              product.price
          })
        });
        const data = await verify.json();
        if (data.message === 'Payment successful!') {
          showToast('Payment done! Listing marked as sold.');
          setTimeout(() => navigate('../home/index.html'), 1500);
        }
      },
      prefill: { name: user.name, email: user.email },
      theme:   { color: '#4F46E5' }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    showToast('Could not initiate payment. Please try again.');
    console.error('Payment error:', err);
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
  if (!userStr) { window.location.href = '../loginpage/index.html'; return; }
  const user     = JSON.parse(userStr);
  const initials = (user.name || 'U').slice(0, 2).toUpperCase();
  document.getElementById('navAv').textContent    = initials;
  document.getElementById('navUname').textContent = user.name || 'User';

  // ── Get product ID ───────────────────────────────────────────
  const id = Number(getParam('id'));
  if (!id) {
    document.getElementById('skeletonWrap').style.display = 'none';
    document.getElementById('notFound').style.display     = 'block';
    return;
  }

  // ── Load product ─────────────────────────────────────────────
  const product = await loadProduct(id);
  if (!product) {
    document.getElementById('skeletonWrap').style.display = 'none';
    document.getElementById('notFound').style.display     = 'block';
    return;
  }

  // ── Render ───────────────────────────────────────────────────
  renderProduct(product, user);

  // ── Similar products ─────────────────────────────────────────
  const similar = await loadSimilar(product.category_slug, product.id);
  renderSimilar(similar);

  // ── Wishlist ─────────────────────────────────────────────────
  document.getElementById('wishlistLg')?.addEventListener('click', () => toggleWishlist(id));

  // ── Contact modal ─────────────────────────────────────────────
  // CSS uses .overlay.open to show the modal (not inline display style)
  const contactModal = document.getElementById('contactModal');
  document.getElementById('contactBtn')?.addEventListener('click', () => {
    contactModal?.classList.add('open');
    document.getElementById('mbText')?.focus();
  });
  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    contactModal?.classList.remove('open');
  });
  contactModal?.addEventListener('click', e => {
    if (e.target === contactModal) contactModal.classList.remove('open');
  });

  // Quick chips
  document.querySelectorAll('.qchip').forEach(btn => {
    btn.addEventListener('click', () => {
      const ta = document.getElementById('mbText');
      if (ta) { ta.value = btn.dataset.msg; ta.focus(); }
    });
  });

  // Send message
  document.getElementById('sendMsgBtn')?.addEventListener('click', async () => {
    const textEl = document.getElementById('mbText');
    const body   = textEl?.value.trim();
    if (!body) { showToast('Please write a message first'); return; }

    const sendBtn = document.getElementById('sendMsgBtn');
    sendBtn.disabled    = true;
    sendBtn.textContent = 'Sending…';
    sendBtn.classList.add('loading');

    const ok = await sendMessage(product.id, product.seller_id, body);

    sendBtn.disabled = false;
    sendBtn.classList.remove('loading');

    if (ok) {
      sendBtn.textContent = 'Message Sent ✓';
      sendBtn.classList.add('sent');
      showToast('Message sent! ✓ The seller will be notified.');
      setTimeout(() => {
        contactModal?.classList.remove('open');
        sendBtn.textContent = 'Send Message ↑';
        sendBtn.classList.remove('sent');
        if (textEl) textEl.value = '';
      }, 1400);
    } else {
      sendBtn.textContent = 'Send Message ↑';
    }
  });

  // ── Owner: edit and delete ────────────────────────────────────
  document.getElementById('editBtn')?.addEventListener('click', () => {
    navigate(`../sell/index.html?edit=${id}`);
  });
  document.getElementById('deleteBtn')?.addEventListener('click', () => {
    document.getElementById('deleteModal')?.classList.add('open');
  });
  document.getElementById('deleteCancelBtn')?.addEventListener('click', () => {
    document.getElementById('deleteModal')?.classList.remove('open');
  });
  document.getElementById('deleteConfirmBtn')?.addEventListener('click', async () => {
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