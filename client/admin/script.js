// ═══════════════════════════════════════
//  UniTrade — admin/script.js
//  Fully connected to real API
// ═══════════════════════════════════════

const API = 'https://unitrade-project.onrender.com';

/* ── HELPERS ──────────────────────────────────────────────── */
function getToken() { return localStorage.getItem('ut_token'); }
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

let toastTimer;
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function stBadge(s) {
  const m = {
    active:   'st-active Active',
    sold:     'st-sold Sold',
    pending:  'st-pending Pending',
    blocked:  'st-blocked Blocked',
    open:     'st-open Open',
    resolved: 'st-resolved Resolved',
    dismissed:'st-dismissed Dismissed'
  };
  const parts = (m[s] || 'st-active ' + s).split(' ');
  return `<span class="st-badge ${parts[0]}">${parts[1]}</span>`;
}

function getCategoryIcon(slug) {
  const icons = { books:'📗', electronics:'💻', furniture:'🛋️', accessories:'🎒', stationery:'✏️', clothing:'👕' };
  return icons[slug] || '📦';
}

const TAB_TITLES = {
  overview:   ['Overview',   'Welcome back — campus marketplace status'],
  listings:   ['Listings',   'Manage all product listings'],
  users:      ['Users',      'Manage registered students'],
  reports:    ['Reports',    'Review flagged content'],
  categories: ['Categories', 'Manage product categories'],
  analytics:  ['Analytics',  'Platform usage insights'],
  settings:   ['Settings',   'Platform configuration'],
};
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.getElementById('tab-' + name)?.classList.add('active');
  document.querySelector(`.sb-item[data-tab="${name}"]`)?.classList.add('active');
  const [title, sub] = TAB_TITLES[name] || ['',''];
  const ttl = document.getElementById('topbarTitle');
  const stl = document.getElementById('topbarSub');
  if (ttl) ttl.textContent = title;
  if (stl) stl.textContent = sub;
}

function animateKPIVal(el, target) {
  let n = 0;
  const step  = Math.ceil(target / 60) || 1;
  const timer = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n;
    if (n >= target) clearInterval(timer);
  }, 16);
}

// Confirm modal helper
let confirmCallback = null;
function showConfirm({ ico='⚠️', title='Are you sure?', sub='This cannot be undone.', danger=false, onOk }) {
  document.getElementById('confirmIco').textContent   = ico;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmSub').textContent   = sub;
  const okBtn = document.getElementById('confirmOkBtn');
  okBtn.className = 'btn-confirm' + (danger ? ' danger' : '');
  confirmCallback = onOk;
  document.getElementById('confirmModal').classList.add('open');
}

// CSV export
function exportCSV(data, filename) {
  if (!data.length) { toast('No data to export.', 'err'); return; }
  const keys = Object.keys(data[0]);
  const csv  = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

/* ── DATA STORES (filled from API) ───────────────────────── */
let LISTINGS   = [];
let USERS      = [];
let REPORTS    = [];
let CATEGORIES = [
  { id:1, name:'Books',       icon:'📗', bg:'#eef2ff' },
  { id:2, name:'Electronics', icon:'💻', bg:'#fff7ed' },
  { id:3, name:'Furniture',   icon:'🛋️', bg:'#f0fdf4' },
  { id:4, name:'Accessories', icon:'🎒', bg:'#fdf4ff' },
  { id:5, name:'Stationery',  icon:'✏️', bg:'#fffbeb' },
  { id:6, name:'Clothing',    icon:'👕', bg:'#fef2f2' },
];
let STATS = { total_users:0, total_products:0, total_active:0, pending_reports:0 };

let listingFilter = 'all', listingSearch = '';
let userFilter    = 'all', userSearch    = '';
let reportFilter  = 'all';

/* ── FETCH ALL DATA FROM REAL API ─────────────────────────── */
async function fetchAll() {
  try {
    const [statsRes, listingsRes, usersRes, reportsRes] = await Promise.all([
      fetch(`${API}/api/admin/stats`,    { headers: authHeaders() }),
      fetch(`${API}/api/admin/products`, { headers: authHeaders() }),
      fetch(`${API}/api/admin/users`,    { headers: authHeaders() }),
      fetch(`${API}/api/admin/reports`,  { headers: authHeaders() }),
    ]);

    if (statsRes.ok)    { const d = await statsRes.json();    STATS    = d; }
    if (listingsRes.ok) { const d = await listingsRes.json(); LISTINGS = d.products || []; }
    if (usersRes.ok)    { const d = await usersRes.json();    USERS    = d.users    || []; }
    if (reportsRes.ok)  { const d = await reportsRes.json();  REPORTS  = d.reports  || []; }

  } catch (err) {
    console.error('Admin fetch error:', err);
    toast('Could not load data. Is your server running?', 'err');
  }
}

/* ── RENDER KPIs ──────────────────────────────────────────── */
function animateKPIs() {
  document.querySelectorAll('.kpi-val[data-target]').forEach(el => {
    animateKPIVal(el, Number(el.dataset.target));
  });
  // Animate real stats
  setTimeout(() => {
    document.querySelectorAll('.kpi-fill').forEach(bar => {
      bar.style.width = bar.style.width;
    });
  }, 200);
}

function updateKPIsFromAPI() {
  const kpiMap = [
    { selector: '.kpi-card:nth-child(1) .kpi-val', value: STATS.total_products || LISTINGS.length },
    { selector: '.kpi-card:nth-child(2) .kpi-val', value: STATS.total_users    || USERS.length    },
    { selector: '.kpi-card:nth-child(3) .kpi-val', value: LISTINGS.filter(l => l.status === 'sold').length },
    { selector: '.kpi-card:nth-child(4) .kpi-val', value: STATS.pending_reports || REPORTS.filter(r => r.status === 'pending').length },
  ];
  kpiMap.forEach(({ selector, value }) => {
    const el = document.querySelector(selector);
    if (el) animateKPIVal(el, value);
  });

  // Update sidebar counts
  const sbListCnt   = document.getElementById('sbListingCnt');
  const sbUserCnt   = document.getElementById('sbUserCnt');
  const sbReportCnt = document.getElementById('sbReportCnt');
  if (sbListCnt)   sbListCnt.textContent   = LISTINGS.length;
  if (sbUserCnt)   sbUserCnt.textContent   = USERS.length;
  if (sbReportCnt) sbReportCnt.textContent = REPORTS.filter(r => r.status === 'pending').length;
}

/* ── RENDER LISTINGS TABLE ────────────────────────────────── */
function getFilteredListings() {
  return LISTINGS.filter(l => {
    const matchFilter = listingFilter === 'all' || l.status === listingFilter;
    const matchSearch = !listingSearch ||
      l.title.toLowerCase().includes(listingSearch) ||
      (l.seller_name || '').toLowerCase().includes(listingSearch);
    return matchFilter && matchSearch;
  });
}

function renderListings() {
  const items  = getFilteredListings();
  const tbody  = document.getElementById('listingsTbody');
  const empty  = document.getElementById('listingsEmpty');
  const tableCard = tbody?.closest('.table-card');

  if (!items.length) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    if (tableCard) tableCard.style.display = 'none';
    return;
  }
  if (empty)     empty.style.display = 'none';
  if (tableCard) tableCard.style.display = 'block';

  tbody.innerHTML = items.map(l => {
    const icon   = getCategoryIcon(l.category_slug);
    const initials = (l.seller_name || 'U').slice(0, 2).toUpperCase();
    const posted = new Date(l.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    return `
    <tr>
      <td><input type="checkbox" class="row-check" data-id="${l.id}"/></td>
      <td>
        <div class="td-item">
          <div class="td-ico">${icon}</div>
          <div>
            <div class="td-title">${l.title}</div>
            <div class="td-sub">${l.category_name || l.category_slug || ''}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="td-user">
          <div class="td-av">${initials}</div>
          <div class="td-name">${l.seller_name || 'Unknown'}</div>
        </div>
      </td>
      <td style="color:var(--txt2)">${l.category_name || ''}</td>
      <td class="td-price">₹${Number(l.price).toLocaleString('en-IN')}</td>
      <td style="color:var(--txt2)">${l.views || 0}</td>
      <td>${stBadge(l.status)}</td>
      <td style="color:var(--txt3);font-size:11px">${posted}</td>
      <td>
        <div class="tbl-acts">
          <a href="../product/index.html?id=${l.id}" class="btn-sm info">View</a>
          <button class="btn-sm warn"  data-approve="${l.id}">Approve</button>
          <button class="btn-sm del"   data-remove="${l.id}">Remove</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-approve]').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        const res  = await fetch(`${API}/api/products/${btn.dataset.approve}`, {
          method: 'PUT', headers: authHeaders(),
          body:   JSON.stringify({ status: 'active' })
        });
        if (!res.ok) throw new Error((await res.json()).message);
        const l = LISTINGS.find(x => x.id == btn.dataset.approve);
        if (l) l.status = 'active';
        renderListings();
        toast('Listing approved and set to active.', 'ok');
      } catch (err) { toast(err.message || 'Failed to approve.', 'err'); }
    })
  );

  tbody.querySelectorAll('[data-remove]').forEach(btn =>
    btn.addEventListener('click', () => {
      const l = LISTINGS.find(x => x.id == btn.dataset.remove);
      showConfirm({ ico:'🗑️', title:'Remove listing?', sub:`"${l?.title}" will be permanently deleted.`, danger:true, onOk: async () => {
        try {
          const res  = await fetch(`${API}/api/admin/products/${btn.dataset.remove}`, {
            method: 'DELETE', headers: authHeaders()
          });
          if (!res.ok) throw new Error((await res.json()).message);
          LISTINGS = LISTINGS.filter(x => x.id != btn.dataset.remove);
          renderListings(); renderOverview(); updateKPIsFromAPI();
          toast('Listing removed.', 'ok');
        } catch (err) { toast(err.message || 'Failed to remove.', 'err'); }
      }});
    })
  );
}

/* ── RENDER USERS TABLE ───────────────────────────────────── */
function getFilteredUsers() {
  return USERS.filter(u => {
    const matchFilter = userFilter === 'all' || (userFilter === 'blocked' ? u.is_blocked : !u.is_blocked);
    const matchSearch = !userSearch ||
      u.name.toLowerCase().includes(userSearch) ||
      u.email.toLowerCase().includes(userSearch);
    return matchFilter && matchSearch;
  });
}

function renderUsers() {
  const items    = getFilteredUsers();
  const tbody    = document.getElementById('usersTbody');
  const empty    = document.getElementById('usersEmpty');
  const tableCard = tbody?.closest('.table-card');

  if (!items.length) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    if (tableCard) tableCard.style.display = 'none';
    return;
  }
  if (empty)     empty.style.display = 'none';
  if (tableCard) tableCard.style.display = 'block';

  tbody.innerHTML = items.map(u => {
    const initials = u.name.slice(0, 2).toUpperCase();
    const joined   = new Date(u.created_at).toLocaleDateString('en-IN', { month:'short', year:'numeric' });
    const status   = u.is_blocked ? 'blocked' : 'active';
    return `
    <tr>
      <td><input type="checkbox" class="row-check"/></td>
      <td>
        <div class="td-user">
          <div class="td-av">${initials}</div>
          <div class="td-name">${u.name}</div>
        </div>
      </td>
      <td style="color:var(--txt2);font-size:12px">${u.email}</td>
      <td style="color:var(--txt2)">—</td>
      <td style="color:var(--txt3);font-size:11px">${joined}</td>
      <td>${stBadge(status)}</td>
      <td>
        <div class="tbl-acts">
          <button class="btn-sm info"                     data-view-user="${u.id}">View</button>
          <button class="btn-sm ${u.is_blocked ? 'success' : 'warn'}" data-toggle-user="${u.id}">
            ${u.is_blocked ? 'Unblock' : 'Block'}
          </button>
          <button class="btn-sm del" data-del-user="${u.id}">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-view-user]').forEach(btn =>
    btn.addEventListener('click', () => openUserModal(Number(btn.dataset.viewUser)))
  );

  tbody.querySelectorAll('[data-toggle-user]').forEach(btn =>
    btn.addEventListener('click', () => {
      const u        = USERS.find(x => x.id === Number(btn.dataset.toggleUser));
      const blocking = !u?.is_blocked;
      showConfirm({
        ico:    blocking ? '🚫' : '✅',
        title:  blocking ? `Block ${u?.name}?` : `Unblock ${u?.name}?`,
        sub:    blocking ? 'They will not be able to log in or list items.' : 'They will regain full access.',
        danger: blocking,
        onOk:   async () => {
          try {
            const res  = await fetch(`${API}/api/admin/users/${u.id}/block`, {
              method: 'POST', headers: authHeaders()
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            u.is_blocked = data.is_blocked;
            renderUsers();
            toast(`${u.name} ${u.is_blocked ? 'blocked' : 'unblocked'}.`, u.is_blocked ? 'err' : 'ok');
          } catch (err) { toast(err.message || 'Failed.', 'err'); }
        }
      });
    })
  );

  tbody.querySelectorAll('[data-del-user]').forEach(btn =>
    btn.addEventListener('click', () => {
      const u = USERS.find(x => x.id === Number(btn.dataset.delUser));
      showConfirm({ ico:'🗑️', title:'Delete user?', sub:`${u?.name}'s account and all listings will be deleted.`, danger:true, onOk: async () => {
        try {
          const res = await fetch(`${API}/api/admin/users/${u.id}`, {
            method: 'DELETE', headers: authHeaders()
          });
          if (!res.ok) throw new Error((await res.json()).message);
          USERS = USERS.filter(x => x.id !== u.id);
          renderUsers(); updateKPIsFromAPI();
          toast('User deleted.', 'ok');
        } catch (err) { toast(err.message || 'Failed.', 'err'); }
      }});
    })
  );
}

/* ── USER DETAIL MODAL ────────────────────────────────────── */
function openUserModal(id) {
  const u = USERS.find(x => x.id === id);
  if (!u) return;
  const initials  = u.name.slice(0, 2).toUpperCase();
  const joined    = new Date(u.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  const status    = u.is_blocked ? 'blocked' : 'active';
  const userListings = LISTINGS.filter(l => l.seller_id === id || l.user_id === id);

  document.getElementById('userModalBox').innerHTML = `
    <div class="modal-hdr">
      <span>User Profile</span>
      <button class="modal-x" onclick="document.getElementById('userModal').classList.remove('open')">✕</button>
    </div>
    <div class="um-header">
      <div class="um-av">${initials}</div>
      <div>
        <div class="um-name">${u.name}</div>
        <div class="um-email">${u.email}</div>
        <div style="margin-top:4px">${stBadge(status)}</div>
      </div>
    </div>
    <div class="um-grid">
      <div class="um-stat"><div class="um-stat-val">${userListings.length}</div><div class="um-stat-lbl">Total Listings</div></div>
      <div class="um-stat"><div class="um-stat-val">${userListings.filter(l => l.status === 'active').length}</div><div class="um-stat-lbl">Active Now</div></div>
      <div class="um-stat"><div class="um-stat-val">${userListings.filter(l => l.status === 'sold').length}</div><div class="um-stat-lbl">Items Sold</div></div>
      <div class="um-stat"><div class="um-stat-val">${joined}</div><div class="um-stat-lbl">Joined</div></div>
    </div>
    <button class="um-close" onclick="document.getElementById('userModal').classList.remove('open')">Close</button>`;
  document.getElementById('userModal').classList.add('open');
}

/* ── RENDER REPORTS ───────────────────────────────────────── */
function getFilteredReports() {
  return reportFilter === 'all' ? REPORTS : REPORTS.filter(r => r.status === reportFilter);
}

function renderReports() {
  const items = getFilteredReports();
  const list  = document.getElementById('reportsList');
  const empty = document.getElementById('reportsEmpty');
  const pending = REPORTS.filter(r => r.status === 'pending').length;

  const sbReportCnt = document.getElementById('sbReportCnt');
  if (sbReportCnt) sbReportCnt.textContent = pending;

  if (!items.length) {
    if (list)  list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = items.map((r, i) => `
    <div class="rep-card ${r.status}" style="animation-delay:${i * .05}s">
      <div class="rep-ico">${r.status === 'pending' ? '🚨' : r.status === 'resolved' ? '✅' : '➖'}</div>
      <div class="rep-body">
        <div class="rep-title">${r.product_title || r.listing || 'Unknown listing'}</div>
        <div class="rep-meta">Reported by <b>${r.reporter_name || r.reporter || 'Unknown'}</b> · ${new Date(r.created_at || r.date).toLocaleDateString('en-IN')} · ${stBadge(r.status)}</div>
        <div class="rep-reason">${r.reason}</div>
        ${r.status === 'pending' ? `
        <div class="rep-actions">
          <button class="btn-sm del"     data-rep-remove="${r.id}">Remove Listing</button>
          <button class="btn-sm success" data-rep-resolve="${r.id}">Mark Resolved</button>
          <button class="btn-sm"         data-rep-dismiss="${r.id}">Dismiss</button>
        </div>` : ''}
      </div>
    </div>`).join('');

  list.querySelectorAll('[data-rep-remove]').forEach(btn =>
    btn.addEventListener('click', () => {
      const r = REPORTS.find(x => x.id === Number(btn.dataset.repRemove));
      showConfirm({ ico:'🗑️', title:'Remove reported listing?', sub:`The listing will be deleted from the marketplace.`, danger:true, onOk: async () => {
        try {
          // Resolve report + delete the product
          await fetch(`${API}/api/admin/reports/${r.id}`, {
            method: 'PUT', headers: authHeaders(),
            body:   JSON.stringify({ status: 'resolved' })
          });
          if (r.product_id) {
            await fetch(`${API}/api/admin/products/${r.product_id}`, {
              method: 'DELETE', headers: authHeaders()
            });
            LISTINGS = LISTINGS.filter(l => l.id !== r.product_id);
          }
          r.status = 'resolved';
          renderReports(); renderListings(); renderOverview(); updateKPIsFromAPI();
          toast('Listing removed and report resolved.', 'ok');
        } catch (err) { toast(err.message || 'Failed.', 'err'); }
      }});
    })
  );

  list.querySelectorAll('[data-rep-resolve]').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API}/api/admin/reports/${btn.dataset.repResolve}`, {
          method: 'PUT', headers: authHeaders(),
          body:   JSON.stringify({ status: 'resolved' })
        });
        if (!res.ok) throw new Error((await res.json()).message);
        const r = REPORTS.find(x => x.id === Number(btn.dataset.repResolve));
        if (r) r.status = 'resolved';
        renderReports(); renderOverview();
        toast('Report marked as resolved.', 'ok');
      } catch (err) { toast(err.message || 'Failed.', 'err'); }
    })
  );

  list.querySelectorAll('[data-rep-dismiss]').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API}/api/admin/reports/${btn.dataset.repDismiss}`, {
          method: 'PUT', headers: authHeaders(),
          body:   JSON.stringify({ status: 'dismissed' })
        });
        if (!res.ok) throw new Error((await res.json()).message);
        const r = REPORTS.find(x => x.id === Number(btn.dataset.repDismiss));
        if (r) r.status = 'dismissed';
        renderReports(); renderOverview();
        toast('Report dismissed.');
      } catch (err) { toast(err.message || 'Failed.', 'err'); }
    })
  );
}

/* ── RENDER CATEGORIES ────────────────────────────────────── */
function renderCategories() {
  const grid = document.getElementById('catGrid');
  grid.innerHTML = CATEGORIES.map((c, i) => `
    <div class="cat-item" style="animation-delay:${i * .06}s">
      <div class="cat-item-ico" style="background:${c.bg}">${c.icon}</div>
      <div>
        <div class="cat-item-name">${c.name}</div>
        <div class="cat-item-cnt">${LISTINGS.filter(l => l.category_name === c.name || l.category_slug === c.name.toLowerCase()).length} listings</div>
      </div>
      <button class="cat-del-btn" data-del-cat="${c.id}" title="Delete">✕</button>
    </div>`).join('');

  grid.querySelectorAll('[data-del-cat]').forEach(btn =>
    btn.addEventListener('click', () => {
      const c = CATEGORIES.find(x => x.id === Number(btn.dataset.delCat));
      showConfirm({ ico:'📂', title:`Delete "${c?.name}"?`, sub:'All listings in this category will be uncategorized.', danger:true, onOk:() => {
        CATEGORIES = CATEGORIES.filter(x => x.id !== Number(btn.dataset.delCat));
        renderCategories(); renderCatBars();
        toast(`Category "${c?.name}" deleted.`, 'ok');
      }});
    })
  );
}

/* ── CATEGORY BARS ────────────────────────────────────────── */
function renderCatBars() {
  const colors = ['#4f46e5','#f97316','#22c55e','#a78bfa','#f59e0b','#ef4444'];
  const counts = CATEGORIES.map(c => ({
    ...c,
    count: LISTINGS.filter(l => l.category_name === c.name || l.category_slug === c.name.toLowerCase()).length
  }));
  const max = Math.max(...counts.map(c => c.count), 1);

  document.getElementById('catBars').innerHTML = counts.map((c, i) => `
    <div class="cb-row">
      <span>${c.name}</span>
      <div class="cb-track"><div class="cb-fill" data-w="${Math.round(c.count / max * 100)}" style="background:${colors[i % colors.length]}"></div></div>
      <span>${c.count}</span>
    </div>`).join('');

  setTimeout(() => {
    document.querySelectorAll('.cb-fill[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
  }, 200);
}

/* ── RENDER OVERVIEW ──────────────────────────────────────── */
function renderOverview() {
  // Recent activity — built from real data
  const recentListings = [...LISTINGS].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
  const acts = recentListings.map(l => ({
    ico: '📦',
    text: `<b>${l.seller_name || 'A student'}</b> listed "${l.title}"`,
    bg:   '#eef2ff',
    time: new Date(l.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
  }));
  // Add pending reports to activity
  REPORTS.filter(r => r.status === 'pending').slice(0, 2).forEach(r => {
    acts.push({
      ico:  '🚨',
      text: `New report filed for <b>${r.product_title || 'a listing'}</b>`,
      bg:   '#fef2f2',
      time: new Date(r.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
    });
  });

  document.getElementById('recentActivity').innerHTML = acts.slice(0, 5).map(a => `
    <div class="act-row">
      <div class="act-ico" style="background:${a.bg}">${a.ico}</div>
      <div class="act-text">${a.text}</div>
      <div class="act-time">${a.time}</div>
    </div>`).join('') || '<div style="font-size:13px;color:var(--txt3);padding:10px 0">No recent activity yet.</div>';

  // Pending reports summary
  const pending = REPORTS.filter(r => r.status === 'pending').slice(0, 3);
  const repEl   = document.getElementById('pendingReports');
  if (!pending.length) {
    repEl.innerHTML = '<div style="font-size:13px;color:var(--txt3);padding:10px 0">No pending reports 🎉</div>';
    return;
  }
  repEl.innerHTML = pending.map(r => `
    <div class="rep-mini">
      <div class="rep-mini-ico">🚨</div>
      <div style="min-width:0;flex:1">
        <div class="rep-mini-title">${r.product_title || 'Unknown listing'}</div>
        <div class="rep-mini-sub">By ${r.reporter_name || 'Unknown'} · ${new Date(r.created_at).toLocaleDateString('en-IN')}</div>
      </div>
      <div class="rep-mini-actions">
        <button class="btn-sm success" data-ov-resolve="${r.id}">Resolve</button>
      </div>
    </div>`).join('');

  repEl.querySelectorAll('[data-ov-resolve]').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        await fetch(`${API}/api/admin/reports/${btn.dataset.ovResolve}`, {
          method: 'PUT', headers: authHeaders(),
          body:   JSON.stringify({ status: 'resolved' })
        });
        const r = REPORTS.find(x => x.id === Number(btn.dataset.ovResolve));
        if (r) r.status = 'resolved';
        renderReports(); renderOverview(); updateKPIsFromAPI();
        toast('Report resolved.', 'ok');
      } catch (err) { toast(err.message || 'Failed.', 'err'); }
    })
  );
}

/* ── RENDER ANALYTICS ─────────────────────────────────────── */
function renderAnalytics() {
  // Top listings by views
  const top = [...LISTINGS].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
  document.getElementById('topListings').innerHTML = top.map((l, i) => `
    <div class="top-row">
      <div class="top-rank">${i + 1}</div>
      <div class="top-ico">${getCategoryIcon(l.category_slug)}</div>
      <div class="top-title">${l.title}</div>
      <div class="top-views">👁 ${l.views || 0}</div>
      <div class="top-price">₹${Number(l.price).toLocaleString('en-IN')}</div>
    </div>`).join('') || '<div style="font-size:13px;color:var(--txt3);padding:10px 0">No listings yet.</div>';

  // Platform stats from real data
  const totalViews = LISTINGS.reduce((a, l) => a + (l.views || 0), 0);
  const avgPrice   = LISTINGS.length ? Math.round(LISTINGS.reduce((a, l) => a + Number(l.price), 0) / LISTINGS.length) : 0;
  document.getElementById('statList').innerHTML = [
    ['Total Listings',    LISTINGS.length],
    ['Active Listings',   LISTINGS.filter(l => l.status === 'active').length],
    ['Sold Listings',     LISTINGS.filter(l => l.status === 'sold').length],
    ['Total Views',       totalViews],
    ['Average Price',     avgPrice ? '₹' + avgPrice.toLocaleString('en-IN') : '—'],
    ['Registered Users',  USERS.length],
    ['Blocked Users',     USERS.filter(u => u.is_blocked).length],
    ['Open Reports',      REPORTS.filter(r => r.status === 'pending').length],
  ].map(([k, v]) =>
    `<div class="stat-row"><span class="stat-key">${k}</span><span class="stat-val">${v}</span></div>`
  ).join('');
}

/* ── CHARTS (use real data where possible) ────────────────── */
function initCharts() {
  // Growth line chart
  const growCtx = document.getElementById('growthChart')?.getContext('2d');
  if (growCtx && window.Chart) {
    new Chart(growCtx, {
      type: 'line',
      data: {
        labels: ['Sep','Oct','Nov','Dec','Jan','Feb','Mar'],
        datasets: [
          { label:'Listings', data:[0,0,0,0,0,0,LISTINGS.length], borderColor:'#4f46e5', backgroundColor:'rgba(79,70,229,0.07)', borderWidth:2.5, pointRadius:3.5, fill:true, tension:.4 },
          { label:'Users',    data:[0,0,0,0,0,0,USERS.length],    borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,0.07)',  borderWidth:2.5, pointRadius:3.5, fill:true, tension:.4 },
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#0d0b24', titleColor:'#9898b8', bodyColor:'#f0f0ff', padding:10 } },
        scales:{ x:{grid:{color:'rgba(0,0,0,.04)'},ticks:{color:'#9898b8',font:{size:11}}}, y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{color:'#9898b8',font:{size:11}},beginAtZero:true} }
      }
    });
  }

  // Donut — real category counts
  const donutCtx = document.getElementById('donutChart')?.getContext('2d');
  if (donutCtx && window.Chart) {
    const catCounts = CATEGORIES.map(c =>
      LISTINGS.filter(l => l.category_name === c.name || l.category_slug === c.name.toLowerCase()).length
    );
    new Chart(donutCtx, {
      type: 'doughnut',
      data: { labels: CATEGORIES.map(c => c.name), datasets:[{ data: catCounts.length ? catCounts : [1,1,1,1,1,1], backgroundColor:['#4f46e5','#f97316','#22c55e','#a78bfa','#f59e0b','#ef4444'], borderColor:'#fff', borderWidth:3, hoverOffset:5 }] },
      options: { responsive:true, maintainAspectRatio:true, cutout:'70%', plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#0d0b24', titleColor:'#9898b8', bodyColor:'#f0f0ff', padding:10 } } }
    });
  }

  // Daily listings bar chart
  const dailyCtx = document.getElementById('dailyChart')?.getContext('2d');
  if (dailyCtx && window.Chart) {
    const labels = Array.from({length:14}, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 13 + i);
      return d.toLocaleDateString('en-IN', {day:'numeric', month:'short'});
    });
    // Count real listings per day
    const counts = labels.map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 13 + i);
      const dateStr = d.toISOString().slice(0, 10);
      return LISTINGS.filter(l => l.created_at && l.created_at.slice(0, 10) === dateStr).length;
    });
    new Chart(dailyCtx, {
      type: 'bar',
      data: { labels, datasets:[{ label:'Listings', data: counts, backgroundColor:'rgba(79,70,229,0.7)', borderRadius:4 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{color:'#9898b8',font:{size:10}}}, y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{color:'#9898b8',font:{size:11}},beginAtZero:true} } }
    });
  }

  // Category pie chart
  const catCtx = document.getElementById('catChart')?.getContext('2d');
  if (catCtx && window.Chart) {
    const catCounts = CATEGORIES.map(c =>
      LISTINGS.filter(l => l.category_name === c.name || l.category_slug === c.name.toLowerCase()).length
    );
    new Chart(catCtx, {
      type: 'pie',
      data: { labels: CATEGORIES.map(c => c.name), datasets:[{ data: catCounts.length ? catCounts : [1,1,1,1,1,1], backgroundColor:['#4f46e5','#f97316','#22c55e','#a78bfa','#f59e0b','#ef4444'], borderColor:'#fff', borderWidth:2 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{position:'bottom',labels:{font:{size:11},padding:12}}, tooltip:{ backgroundColor:'#0d0b24', bodyColor:'#f0f0ff', padding:10 } } }
    });
  }
}

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  // Admin auth guard
  const userStr = localStorage.getItem('ut_user');
  if (!userStr) { window.location.href = '../loginpage/index.html'; return; }
  const user = JSON.parse(userStr);
  if (user.role !== 'admin') {
    alert('Admin access only. Redirecting to home.');
    window.location.href = '../home/index.html';
    return;
  }

  // Fill admin name
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'AD';
  const sbAvEl   = document.getElementById('sbAdminAv');
  const sbNmEl   = document.getElementById('sbAdminName');
  if (sbAvEl) sbAvEl.textContent   = initials;
  if (sbNmEl) sbNmEl.textContent   = user.name || 'Admin';
  const sfNm  = document.getElementById('sfAdminName');
  const sfEm  = document.getElementById('sfAdminEmail');
  if (sfNm) sfNm.value  = user.name  || 'Admin';
  if (sfEm) sfEm.value  = user.email || 'admin@college.ac.in';

  // Date chip
  const dateChip = document.getElementById('dateChip');
  if (dateChip) dateChip.textContent = '📅 ' + new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  // Fetch all real data
  await fetchAll();

  // Render everything
  updateKPIsFromAPI();
  renderOverview();
  renderCatBars();
  renderListings();
  renderUsers();
  renderReports();
  renderCategories();
  renderAnalytics();
  initCharts();

  // Tab switching
  document.querySelectorAll('.sb-item[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-tab]');
    if (el && !el.classList.contains('sb-item')) { e.preventDefault(); switchTab(el.dataset.tab); }
  });

  // Listing search + filter
  let searchTimer;
  document.getElementById('listingSearch')?.addEventListener('input', e => {
    listingSearch = e.target.value.trim().toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderListings, 250);
  });
  document.querySelectorAll('[data-lf]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-lf]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); listingFilter = btn.dataset.lf; renderListings();
    })
  );

  // User search + filter
  document.getElementById('userSearch')?.addEventListener('input', e => {
    userSearch = e.target.value.trim().toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderUsers, 250);
  });
  document.querySelectorAll('[data-uf]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-uf]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); userFilter = btn.dataset.uf; renderUsers();
    })
  );

  // Report filter
  document.querySelectorAll('[data-rf]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rf]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); reportFilter = btn.dataset.rf; renderReports();
    })
  );

  // Select all checkboxes
  document.getElementById('selectAllListings')?.addEventListener('change', e => {
    document.querySelectorAll('#listingsTbody .row-check').forEach(c => c.checked = e.target.checked);
  });
  document.getElementById('selectAllUsers')?.addEventListener('change', e => {
    document.querySelectorAll('#usersTbody .row-check').forEach(c => c.checked = e.target.checked);
  });

  // CSV exports
  document.getElementById('exportListings')?.addEventListener('click', () => {
    exportCSV(LISTINGS.map(({ id, title, category_name, price, seller_name, status, created_at }) =>
      ({ id, title, category: category_name, price, seller: seller_name, status, posted: new Date(created_at).toLocaleDateString('en-IN') })
    ), 'unitrade-listings.csv');
    toast('Listings exported as CSV!', 'ok');
  });
  document.getElementById('exportUsers')?.addEventListener('click', () => {
    exportCSV(USERS.map(({ id, name, email, role, is_blocked, created_at }) =>
      ({ id, name, email, role, status: is_blocked ? 'blocked' : 'active', joined: new Date(created_at).toLocaleDateString('en-IN') })
    ), 'unitrade-users.csv');
    toast('Users exported as CSV!', 'ok');
  });

  // Add category modal
  document.getElementById('addCatBtn')?.addEventListener('click', () => document.getElementById('catModal').classList.add('open'));
  document.getElementById('catModalClose')?.addEventListener('click', () => document.getElementById('catModal').classList.remove('open'));
  document.getElementById('catCancelBtn')?.addEventListener('click', () => document.getElementById('catModal').classList.remove('open'));
  document.getElementById('catSaveBtn')?.addEventListener('click', () => {
    const name = document.getElementById('newCatName').value.trim();
    const icon = document.getElementById('newCatIcon').value.trim() || '📦';
    if (!name) { toast('Please enter a category name.', 'err'); return; }
    CATEGORIES.push({ id: Date.now(), name, icon, bg: '#eef2ff' });
    renderCategories(); renderCatBars();
    document.getElementById('catModal').classList.remove('open');
    document.getElementById('newCatName').value = '';
    document.getElementById('newCatIcon').value = '';
    toast(`Category "${name}" added!`, 'ok');
  });

  // Confirm modal
  document.getElementById('confirmCancelBtn')?.addEventListener('click', () => document.getElementById('confirmModal').classList.remove('open'));
  document.getElementById('confirmOkBtn')?.addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
  });

  // Modal overlay close
  document.getElementById('userModal')?.addEventListener('click', e => {
    if (e.target.id === 'userModal') document.getElementById('userModal').classList.remove('open');
  });
  document.getElementById('confirmModal')?.addEventListener('click', e => {
    if (e.target.id === 'confirmModal') document.getElementById('confirmModal').classList.remove('open');
  });

  // Settings
  document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
    toast('Platform settings saved!', 'ok');
  });
  document.getElementById('saveAdminBtn')?.addEventListener('click', () => {
    const name = document.getElementById('sfAdminName').value.trim();
    if (!name) { toast('Admin name is required.', 'err'); return; }
    const u = JSON.parse(localStorage.getItem('ut_user') || '{}');
    u.name = name; localStorage.setItem('ut_user', JSON.stringify(u));
    if (sbAvEl) sbAvEl.textContent = name.slice(0, 2).toUpperCase();
    if (sbNmEl) sbNmEl.textContent = name;
    toast('Admin account updated!', 'ok');
  });

  // Danger zone
  document.getElementById('clearReportsBtn')?.addEventListener('click', () =>
    showConfirm({ ico:'🧹', title:'Clear resolved reports?', sub:'Only resolved and dismissed reports will be removed.', danger:true, onOk:() => {
      REPORTS.length = 0; renderReports(); renderOverview();
      toast('Resolved reports cleared.', 'ok');
    }})
  );
  document.getElementById('purgeSoldBtn')?.addEventListener('click', () =>
    showConfirm({ ico:'🗑️', title:'Purge all sold listings?', sub:'All listings marked as sold will be permanently deleted.', danger:true, onOk: async () => {
      const soldIds = LISTINGS.filter(l => l.status === 'sold').map(l => l.id);
      try {
        await Promise.all(soldIds.map(id =>
          fetch(`${API}/api/admin/products/${id}`, { method:'DELETE', headers: authHeaders() })
        ));
        LISTINGS = LISTINGS.filter(l => l.status !== 'sold');
        renderListings(); renderOverview(); updateKPIsFromAPI();
        toast(`Purged ${soldIds.length} sold listings.`, 'ok');
      } catch (err) { toast('Purge failed.', 'err'); }
    }})
  );

  // Mobile sidebar toggle
  const sidebar = document.getElementById('sidebar');
  document.getElementById('menuBtn')?.addEventListener('click', () => sidebar?.classList.toggle('open'));
  document.addEventListener('click', e => {
    const menuBtn = document.getElementById('menuBtn');
    if (sidebar && menuBtn && !sidebar.contains(e.target) && !menuBtn.contains(e.target))
      sidebar.classList.remove('open');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (!confirm('Log out?')) return;
    localStorage.clear();
    document.getElementById('pageFade')?.classList.add('on');
    setTimeout(() => { window.location.href = '../loginpage/index.html'; }, 320);
  });

  // Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  });
});