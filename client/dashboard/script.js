// ═══════════════════════════════════════
//  UniTrade — dashboard/script.js
//  Fully connected to real API
// ═══════════════════════════════════════

const API = 'http://localhost:5000';

/* ── HELPERS ──────────────────────────────────────────────── */
function getToken() { return localStorage.getItem('ut_token'); }

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

let toastTimer;
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function statusBadge(s) {
  const map = {
    active:  ['st-active',  'Active'],
    sold:    ['st-sold',    'Sold'],
    pending: ['st-pending', 'Pending'],
    removed: ['st-pending', 'Removed'],
  };
  const [cls, lbl] = map[s] || ['', s];
  return `<span class="st-badge ${cls}">${lbl}</span>`;
}

function getCategoryIcon(slug) {
  const icons = {
    books:'📗', electronics:'💻', furniture:'🛋️',
    accessories:'🎒', stationery:'✏️', clothing:'👕'
  };
  return icons[slug] || '📦';
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.mtab').forEach(i => i.classList.remove('active'));
  document.getElementById('tab-' + tabName)?.classList.add('active');
  document.querySelector(`.sb-item[data-tab="${tabName}"]`)?.classList.add('active');
  document.querySelector(`.mtab[data-tab="${tabName}"]`)?.classList.add('active');
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let n = 0;
  const step  = Math.ceil(target / 50) || 1;
  const timer = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n;
    if (n >= target) clearInterval(timer);
  }, 16);
}

/* ── USER ─────────────────────────────────────────────────── */
async function loadUser() {
  const u        = JSON.parse(localStorage.getItem('ut_user') || '{}');
  const name     = u.name  || 'Student';
  const email    = u.email || 'student@college.ac.in';
  const initials = name.slice(0, 2).toUpperCase();

  ['navAv','ndropAv','sbAv','scAv'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = initials;
  });
  const navUnameEl = document.getElementById('navUname');
  if (navUnameEl) navUnameEl.textContent = name;
  ['ndropName','sbName'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = name; });
  ['ndropEmail','sbEmail','scEmail'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = email; });

  const h     = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const gEl   = document.getElementById('greetMsg');
  if (gEl) gEl.textContent = `${greet}, ${name.split(' ')[0]} 👋`;

  // Fetch fresh profile from real API
  try {
    const res  = await fetch(`${API}/api/users/me`, { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.user) {
      const u2 = data.user;
      localStorage.setItem('ut_user', JSON.stringify({ ...u, name:u2.name, email:u2.email, phone:u2.phone, location:u2.location, bio:u2.bio }));
      const parts = (u2.name || '').split(' ');
      const el1 = document.getElementById('scFirst'); if (el1) el1.value = parts[0] || '';
      const el2 = document.getElementById('scLast');  if (el2) el2.value = parts.slice(1).join(' ') || '';
      const el3 = document.getElementById('scPhone'); if (el3) el3.value = u2.phone || '';
      const el4 = document.getElementById('scLocation'); if (el4) el4.value = u2.location || '';
      const el5 = document.getElementById('scBio'); if (el5) el5.value = u2.bio || '';
    }
  } catch (err) {
    const parts = name.split(' ');
    const el1 = document.getElementById('scFirst'); if (el1) el1.value = parts[0] || '';
    const el2 = document.getElementById('scLast');  if (el2) el2.value = parts.slice(1).join(' ') || '';
    const el3 = document.getElementById('scPhone'); if (el3) el3.value = u.phone || '';
    const el4 = document.getElementById('scLocation'); if (el4) el4.value = u.location || '';
    const el5 = document.getElementById('scBio'); if (el5) el5.value = u.bio || '';
  }

  return { name, email, initials };
}

/* ── MY LISTINGS ──────────────────────────────────────────── */
let myListings    = [];
let editingId     = null;
let deletingId    = null;
let listingFilter = 'all';

async function fetchMyListings() {
  try {
    const res  = await fetch(`${API}/api/users/me/products`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    myListings = data.products || [];
  } catch (err) {
    console.error('Fetch listings error:', err);
    myListings = [];
  }
}

function getFilteredListings() {
  return listingFilter === 'all' ? myListings : myListings.filter(p => p.status === listingFilter);
}

function renderListings() {
  const tbody     = document.getElementById('listingsTbody');
  const empty     = document.getElementById('listingsEmpty');
  const items     = getFilteredListings();
  const active    = myListings.filter(p => p.status === 'active').length;
  const sold      = myListings.filter(p => p.status === 'sold').length;
  const totalViews= myListings.reduce((a, p) => a + (p.views || 0), 0);

  animateCount('kActive', active);
  animateCount('kSold',   sold);
  animateCount('kViews',  totalViews);
  animateCount('kWish',   myListings.length);

  const cntEl = document.getElementById('listingCnt');
  if (cntEl) cntEl.textContent = myListings.length;

  const tableWrap = tbody?.closest('.table-wrap');

  if (!items.length) {
    if (tbody)     tbody.innerHTML = '';
    if (empty)     empty.style.display = 'block';
    if (tableWrap) tableWrap.style.display = 'none';
    return;
  }
  if (empty)     empty.style.display = 'none';
  if (tableWrap) tableWrap.style.display = 'block';

  tbody.innerHTML = items.map(p => {
    const icon   = getCategoryIcon(p.category_slug);
    const posted = new Date(p.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
    return `
    <tr>
      <td>
        <div class="td-item">
          <div class="td-ico">${icon}</div>
          <div>
            <div class="td-name">${p.title}</div>
            <div class="td-cat">${p.category_name || p.category_slug || ''}</div>
          </div>
        </div>
      </td>
      <td class="td-price">₹${Number(p.price).toLocaleString('en-IN')}</td>
      <td>${p.views || 0}</td>
      <td>—</td>
      <td>${statusBadge(p.status)}</td>
      <td style="color:var(--txt3);font-size:11px">${posted}</td>
      <td>
        <div class="tbl-acts">
          <a href="../product/index.html?id=${p.id}" class="btn-sm view">View</a>
          <button class="btn-sm edit" data-edit="${p.id}">Edit</button>
          <button class="btn-sm del"  data-del="${p.id}">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(Number(btn.dataset.edit)))
  );
  tbody.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => openDeleteModal(Number(btn.dataset.del)))
  );
}

function renderRecentListings() {
  const el    = document.getElementById('recentList');
  if (!el) return;
  const items = myListings.filter(p => p.status === 'active').slice(0, 4);
  if (!items.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--txt3);padding:10px 0">No active listings yet.</div>';
    return;
  }
  el.innerHTML = items.map(p => `
    <div class="ri-row">
      <div class="ri-ico">${getCategoryIcon(p.category_slug)}</div>
      <div style="min-width:0;flex:1">
        <div class="ri-title">${p.title}</div>
        <div class="ri-price">₹${Number(p.price).toLocaleString('en-IN')}</div>
      </div>
      <div class="ri-right">${statusBadge(p.status)}</div>
    </div>`).join('');
}

/* ── EDIT MODAL ───────────────────────────────────────────── */
function openEditModal(id) {
  const p = myListings.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('efTitle').value  = p.title;
  document.getElementById('efPrice').value  = p.price;
  document.getElementById('efStatus').value = p.status;
  document.getElementById('efDesc').value   = p.description || '';
  document.getElementById('editModal').classList.add('open');
}
function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

/* ── DELETE MODAL ─────────────────────────────────────────── */
function openDeleteModal(id) {
  deletingId = id;
  document.getElementById('deleteModal').classList.add('open');
}
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
  deletingId = null;
}

/* ── WISHLIST ─────────────────────────────────────────────── */
async function renderWishlist() {
  const grid  = document.getElementById('wishGrid');
  const empty = document.getElementById('wishEmpty');
  const cntEl = document.getElementById('wishCnt');

  try {
    const res  = await fetch(`${API}/api/users/me/wishlist`, { headers: authHeaders() });
    const data = await res.json();
    const items = data.products || [];

    if (cntEl) cntEl.textContent = items.length;

    if (!items.length) {
      if (grid)  grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = items.map((p, i) => {
      const icon    = getCategoryIcon(p.category_slug);
      const imgHtml = p.cover_image
        ? `<img src="${API}${p.cover_image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='<span style=\\'font-size:2rem\\'>${icon}</span>'">`
        : `<span style="font-size:2rem">${icon}</span>`;
      return `
      <div class="wish-card" style="animation-delay:${i * .05}s">
        <div class="wc-img">${imgHtml}</div>
        <div class="wc-body">
          <div class="wc-title">${p.title}</div>
          <div class="wc-price">₹${Number(p.price).toLocaleString('en-IN')}</div>
          <div class="wc-actions">
            <a href="../product/index.html?id=${p.id}" class="btn-sm view">View</a>
            <button class="btn-sm del" data-wid="${p.id}">Remove</button>
          </div>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('[data-wid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await fetch(`${API}/api/users/me/wishlist`, {
            method: 'POST', headers: authHeaders(),
            body:   JSON.stringify({ product_id: Number(btn.dataset.wid) })
          });
          const local = JSON.parse(localStorage.getItem('ut_wishlist') || '[]');
          localStorage.setItem('ut_wishlist', JSON.stringify(local.filter(x => x !== Number(btn.dataset.wid))));
          toast('Removed from wishlist');
          renderWishlist();
        } catch (err) {
          toast('Could not remove. Try again.', 'err');
        }
      });
    });

  } catch (err) {
    console.error('Wishlist error:', err);
    if (empty) empty.style.display = 'block';
  }
}

/* ── MESSAGES ─────────────────────────────────────────────── */
let conversations = [];
let activeConvId  = null;

async function fetchConversations() {
  try {
    const res  = await fetch(`${API}/api/messages`, { headers: authHeaders() });
    const data = await res.json();
    conversations = data.conversations || [];
  } catch (err) {
    conversations = [];
  }
}

function renderConvList() {
  const msgCntEl = document.getElementById('msgCnt');
  const unread   = conversations.filter(c => c.unread_count > 0).length;
  if (msgCntEl) msgCntEl.textContent = unread || 0;

  const list = document.getElementById('convList');
  if (!list) return;

  if (!conversations.length) {
    list.innerHTML = '<div style="padding:1rem;font-size:13px;color:var(--txt3)">No messages yet.</div>';
    return;
  }

  list.innerHTML = conversations.map(c => {
    const initials = (c.other_user_name || 'U').slice(0, 2).toUpperCase();
    const lastMsg  = c.last_message || '';
    const convKey  = c.other_user_id + '-' + c.product_id;
    return `
    <div class="conv-item${activeConvId === convKey ? ' active' : ''}"
         data-uid="${c.other_user_id}" data-pid="${c.product_id}">
      <div class="ci-row">
        <div class="ci-av">${initials}</div>
        <div style="min-width:0;flex:1">
          <div class="ci-name">${c.other_user_name || 'User'}</div>
          <div class="ci-prod">${c.product_title || 'Item'}</div>
        </div>
      </div>
      <div class="ci-last">${lastMsg.slice(0, 40)}${lastMsg.length > 40 ? '…' : ''}</div>
      ${c.unread_count > 0 ? '<div class="ci-dot"></div>' : ''}
    </div>`;
  }).join('');

  list.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => openChat(item.dataset.uid, item.dataset.pid));
  });
}

async function openChat(otherUserId, productId) {
  activeConvId = otherUserId + '-' + productId;
  const conv   = conversations.find(c => c.other_user_id == otherUserId && c.product_id == productId);
  const initials = (conv?.other_user_name || 'U').slice(0, 2).toUpperCase();

  document.getElementById('chatPlaceholder').style.display = 'none';
  document.getElementById('chatActive').style.display      = 'flex';
  document.getElementById('chatHdr').innerHTML = `
    <div class="ch-av">${initials}</div>
    <div>
      <div class="ch-name">${conv?.other_user_name || 'User'}</div>
      <div class="ch-prod">Re: ${conv?.product_title || 'Item'}</div>
    </div>`;

  try {
    const res  = await fetch(`${API}/api/messages/${productId}/${otherUserId}`, { headers: authHeaders() });
    const data = await res.json();
    const msgs = data.messages || [];
    const user = JSON.parse(localStorage.getItem('ut_user') || '{}');
    const msgsEl = document.getElementById('chatMsgs');
    msgsEl.innerHTML = msgs.map(m => {
      const isSent = m.sender_id == user.id;
      const time   = new Date(m.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
      return `
      <div>
        <div class="msg-bubble ${isSent ? 'sent' : 'recv'}">${m.body}</div>
        <div class="msg-time ${isSent ? '' : 'recv'}">${time}</div>
      </div>`;
    }).join('');
    msgsEl.scrollTop = msgsEl.scrollHeight;
  } catch (err) {
    document.getElementById('chatMsgs').innerHTML =
      '<div style="padding:1rem;font-size:12px;color:var(--txt3)">Could not load messages.</div>';
  }

  if (conv) conv.unread_count = 0;
  renderConvList();
}

async function sendChatMessage() {
  const inp  = document.getElementById('chatInput');
  const text = inp.value.trim();
  if (!text || !activeConvId) return;
  const [otherUserId, productId] = activeConvId.split('-');

  inp.value = '';
  const msgsEl = document.getElementById('chatMsgs');
  const div    = document.createElement('div');
  const time   = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
  div.innerHTML = `<div class="msg-bubble sent">${text}</div><div class="msg-time">${time}</div>`;
  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;

  try {
    await fetch(`${API}/api/messages`, {
      method: 'POST', headers: authHeaders(),
      body:   JSON.stringify({ receiver_id: Number(otherUserId), product_id: Number(productId), body: text })
    });
  } catch (err) {
    toast('Message could not be sent.', 'err');
  }
}

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  const userStr = localStorage.getItem('ut_user');
  if (!userStr) { window.location.href = '../loginpage/index.html'; return; }

  await loadUser();
  await Promise.all([ fetchMyListings(), fetchConversations() ]);
  renderListings();
  renderRecentListings();
  renderConvList();
  await renderWishlist();

  // Tab switching
  document.querySelectorAll('.sb-item[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
  document.querySelectorAll('.mtab[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-tab]');
    if (el && !el.classList.contains('sb-item') && !el.classList.contains('mtab')) {
      e.preventDefault(); switchTab(el.dataset.tab);
    }
  });

  // Filter bar
  document.querySelectorAll('.fb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      listingFilter = btn.dataset.filter;
      renderListings();
    });
  });

  // Edit modal
  document.getElementById('editClose')?.addEventListener('click', closeEditModal);
  document.getElementById('editCancelBtn')?.addEventListener('click', closeEditModal);
  document.getElementById('editSaveBtn')?.addEventListener('click', async () => {
    if (!editingId) return;
    const title  = document.getElementById('efTitle').value.trim();
    const price  = Number(document.getElementById('efPrice').value);
    const status = document.getElementById('efStatus').value;
    const desc   = document.getElementById('efDesc').value.trim();
    try {
      const res  = await fetch(`${API}/api/products/${editingId}`, {
        method: 'PUT', headers: authHeaders(),
        body:   JSON.stringify({ title, price, status, description: desc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const p = myListings.find(x => x.id === editingId);
      if (p) { p.title = title; p.price = price; p.status = status; p.description = desc; }
      closeEditModal(); renderListings(); renderRecentListings();
      toast('Listing updated!', 'ok');
    } catch (err) { toast(err.message || 'Update failed.', 'err'); }
  });

  // Delete modal
  document.getElementById('delCancelBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('delConfirmBtn')?.addEventListener('click', async () => {
    if (!deletingId) return;
    try {
      const res  = await fetch(`${API}/api/products/${deletingId}`, {
        method: 'DELETE', headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      myListings = myListings.filter(p => p.id !== deletingId);
      closeDeleteModal(); renderListings(); renderRecentListings();
      toast('Listing deleted.', 'ok');
    } catch (err) { toast(err.message || 'Delete failed.', 'err'); }
  });

  ['editModal','deleteModal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) document.getElementById(id).classList.remove('open');
    });
  });

  // Chat
  document.getElementById('chatSendBtn')?.addEventListener('click', sendChatMessage);
  document.getElementById('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });

  // Settings — save profile
  document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    const first    = document.getElementById('scFirst').value.trim();
    const last     = document.getElementById('scLast').value.trim();
    const phone    = document.getElementById('scPhone').value.trim();
    const location = document.getElementById('scLocation').value.trim();
    const bio      = document.getElementById('scBio').value.trim();
    if (!first) { toast('First name is required.', 'err'); return; }
    try {
      const name = `${first} ${last}`.trim();
      const res  = await fetch(`${API}/api/users/me`, {
        method: 'PUT', headers: authHeaders(),
        body:   JSON.stringify({ name, phone, location, bio })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const u = JSON.parse(localStorage.getItem('ut_user') || '{}');
      Object.assign(u, { name, phone, location, bio });
      localStorage.setItem('ut_user', JSON.stringify(u));
      await loadUser();
      toast('Profile saved!', 'ok');
    } catch (err) { toast(err.message || 'Could not save profile.', 'err'); }
  });

  // Delete account
  document.getElementById('deleteAccBtn')?.addEventListener('click', () => {
    if (confirm('Are you absolutely sure? This will permanently delete your account and all listings.')) {
      toast('Account deleted. Redirecting…', 'err');
      setTimeout(() => { localStorage.clear(); window.location.href = '../loginpage/index.html'; }, 1500);
    }
  });

  // Nav dropdown
  document.getElementById('navUser')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('navUser').classList.toggle('open');
  });
  document.addEventListener('click', () => document.getElementById('navUser')?.classList.remove('open'));

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (!confirm('Log out of UniTrade?')) return;
    localStorage.removeItem('ut_user');
    localStorage.removeItem('ut_token');
    const fade = document.getElementById('pageFade');
    if (fade) { fade.classList.add('on'); setTimeout(() => { window.location.href = '../loginpage/index.html'; }, 320); }
    else window.location.href = '../loginpage/index.html';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeEditModal(); closeDeleteModal(); }
  });
});

/* ═══════════════════════════════════════════════════════════
   NOTIFICATIONS — real API
═══════════════════════════════════════════════════════════ */
let notifications = [];

async function fetchNotifications() {
  try {
    const res  = await fetch(`${API}/api/requests/notifications`, { headers: authHeaders() });
    const data = await res.json();
    notifications = data.notifications || [];
    const unread  = data.unread || 0;

    // Update bell badge
    const badge = document.getElementById('bellBadge');
    if (badge) {
      badge.textContent  = unread > 9 ? '9+' : unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }

    renderBellList();
  } catch (err) {
    console.error('Fetch notifications error:', err);
  }
}

function renderBellList() {
  const list = document.getElementById('bellList');
  if (!list) return;

  if (!notifications.length) {
    list.innerHTML = '<div class="bell-empty">No notifications yet 🔔</div>';
    return;
  }

  list.innerHTML = notifications.map(n => {
    const time = new Date(n.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    const typeIco = {
      request_match:   '🎉',
      request_created: '📋',
      general:         '📢',
      message:         '💬',
    }[n.type] || '🔔';

    return `
    <div class="bell-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}" data-link="${n.link || ''}">
      <div class="bi-ico">${typeIco}</div>
      <div style="flex:1;min-width:0">
        <div class="bi-title">${n.title}</div>
        <div class="bi-body">${n.body}</div>
        <div class="bi-time">${time}</div>
      </div>
      ${!n.is_read ? '<div class="bi-dot"></div>' : ''}
    </div>`;
  }).join('');

  // Click notification → mark read + navigate if has link
  list.querySelectorAll('.bell-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id   = item.dataset.notifId;
      const link = item.dataset.link;

      // Mark as read
      try {
        await fetch(`${API}/api/requests/notifications/${id}/read`, {
          method: 'PUT', headers: authHeaders()
        });
        const n = notifications.find(x => x.id == id);
        if (n) n.is_read = 1;
        item.classList.remove('unread');
        item.querySelector('.bi-dot')?.remove();

        // Update badge count
        const unread = notifications.filter(x => !x.is_read).length;
        const badge  = document.getElementById('bellBadge');
        if (badge) {
          badge.textContent   = unread > 9 ? '9+' : unread;
          badge.style.display = unread > 0 ? 'flex' : 'none';
        }
      } catch (err) { /* silent */ }

      // Navigate to product if link exists
      if (link) {
        document.getElementById('notifBell')?.classList.remove('open');
        window.location.href = link;
      }
    });
  });
}

// Bell button toggle
document.addEventListener('DOMContentLoaded', () => {
  const bellBtn      = document.getElementById('bellBtn');
  const notifBell    = document.getElementById('notifBell');
  const markAllBtn   = document.getElementById('markAllReadBtn');

  bellBtn?.addEventListener('click', e => {
    e.stopPropagation();
    notifBell.classList.toggle('open');
    // Close nav user dropdown if open
    document.getElementById('navUser')?.classList.remove('open');
  });

  document.addEventListener('click', e => {
    if (notifBell && !notifBell.contains(e.target)) {
      notifBell.classList.remove('open');
    }
  });

  markAllBtn?.addEventListener('click', async () => {
    try {
      await fetch(`${API}/api/requests/notifications/read`, {
        method: 'PUT', headers: authHeaders()
      });
      notifications.forEach(n => n.is_read = 1);
      const badge = document.getElementById('bellBadge');
      if (badge) badge.style.display = 'none';
      renderBellList();
      toast('All notifications marked as read.', 'ok');
    } catch (err) { toast('Failed.', 'err'); }
  });

  // Auto-refresh notifications every 30 seconds
  fetchNotifications();
  setInterval(fetchNotifications, 30000);
});

/* ═══════════════════════════════════════════════════════════
   MY REQUESTS TAB — real API
═══════════════════════════════════════════════════════════ */
let myRequests = [];

async function fetchMyRequests() {
  try {
    const res  = await fetch(`${API}/api/requests/my`, { headers: authHeaders() });
    const data = await res.json();
    myRequests = data.requests || [];

    const cntEl = document.getElementById('requestCnt');
    if (cntEl) cntEl.textContent = myRequests.filter(r => r.status === 'open').length;

    renderRequests();
  } catch (err) {
    console.error('Fetch requests error:', err);
  }
}

function renderRequests() {
  const list  = document.getElementById('reqList');
  const empty = document.getElementById('reqEmpty');
  if (!list) return;

  if (!myRequests.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  const catIcons = { books:'📗', electronics:'💻', furniture:'🛋️', accessories:'🎒', stationery:'✏️', clothing:'👕' };

  list.innerHTML = myRequests.map((r, i) => {
    const icon   = catIcons[r.category_slug] || '📋';
    const posted = new Date(r.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const statusColors = { open:'var(--p)', fulfilled:'var(--green)', cancelled:'var(--txt3)' };

    return `
    <div class="req-card ${r.status}" style="animation-delay:${i*.05}s;border-left-color:${statusColors[r.status]}">
      <div class="rc-ico">${icon}</div>
      <div class="rc-body">
        <div class="rc-title">${r.title}</div>
        <div class="rc-meta">
          ${r.category_name ? `<span class="rc-pill">${r.category_name}</span>` : ''}
          ${r.max_price ? `<span class="rc-pill">Budget ₹${Number(r.max_price).toLocaleString('en-IN')}</span>` : ''}
          <span class="rc-pill">📅 ${posted}</span>
        </div>
        ${r.description ? `<div class="rc-desc">${r.description}</div>` : ''}
        <div class="rc-actions">
          ${r.status === 'open'
            ? `<button class="btn-sm del" data-cancel-req="${r.id}">Cancel Request</button>`
            : `<span class="st-badge ${r.status === 'fulfilled' ? 'st-sold' : 'st-pending'}">${r.status === 'fulfilled' ? '✅ Fulfilled' : '❌ Cancelled'}</span>`
          }
        </div>
      </div>
      <div class="rc-status">
        <span class="st-badge ${r.status === 'open' ? 'st-active' : r.status === 'fulfilled' ? 'st-sold' : 'st-pending'}">
          ${r.status.charAt(0).toUpperCase() + r.status.slice(1)}
        </span>
      </div>
    </div>`;
  }).join('');

  // Cancel request
  list.querySelectorAll('[data-cancel-req]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this request?')) return;
      try {
        const res = await fetch(`${API}/api/requests/${btn.dataset.cancelReq}`, {
          method: 'DELETE', headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        const r = myRequests.find(x => x.id == btn.dataset.cancelReq);
        if (r) r.status = 'cancelled';
        renderRequests();
        toast('Request cancelled.', 'ok');
      } catch (err) { toast(err.message || 'Failed.', 'err'); }
    });
  });
}

// Submit new request
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('submitReqBtn')?.addEventListener('click', async () => {
    const title    = document.getElementById('reqTitle').value.trim();
    const catId    = document.getElementById('reqCategory').value;
    const maxPrice = document.getElementById('reqMaxPrice').value;
    const desc     = document.getElementById('reqDesc').value.trim();

    if (!title) { toast('Please enter what you are looking for.', 'err'); return; }
    if (title.length < 3) { toast('Please be more specific (at least 3 characters).', 'err'); return; }

    const btn = document.getElementById('submitReqBtn');
    btn.textContent = 'Submitting…';
    btn.classList.add('loading');

    try {
      const res  = await fetch(`${API}/api/requests`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({
          title,
          description:  desc || null,
          category_id:  catId ? Number(catId) : null,
          max_price:    maxPrice ? Number(maxPrice) : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Clear form
      document.getElementById('reqTitle').value    = '';
      document.getElementById('reqCategory').value = '';
      document.getElementById('reqMaxPrice').value  = '';
      document.getElementById('reqDesc').value      = '';

      toast('Request submitted! You will be notified when a matching item is listed. 🎉', 'ok');

      // Refresh list and notifications
      await fetchMyRequests();
      await fetchNotifications();

    } catch (err) {
      toast(err.message || 'Failed to submit request.', 'err');
    } finally {
      btn.textContent = '📋 Submit Request';
      btn.classList.remove('loading');
    }
  });

  // Fetch requests when requests tab is clicked
  document.querySelector('.sb-item[data-tab="requests"]')?.addEventListener('click', fetchMyRequests);
  document.querySelector('.mtab[data-tab="requests"]')?.addEventListener('click', fetchMyRequests);
});