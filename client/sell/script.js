// ═══════════════════════════════════════
//  UniTrade — sell/script.js
//  3-step listing form — REAL API connected
// ═══════════════════════════════════════

const API = 'http://localhost:5000';

// Category slug → database ID (must match your categories table)
const CATEGORY_IDS = {
  books: 1, electronics: 2, furniture: 3,
  accessories: 4, stationery: 5, clothing: 6
};

/* ─────────────────────────────────────
   STATE
───────────────────────────────────── */
const form = {
  title:       '',
  category:    '',
  description: '',
  price:       '',
  origPrice:   '',
  condition:   '',
  location:    '',
  contact:     'chat',
  photos:      [],  // { file, url, name }
};

let currentStep  = 1;
let newListingId = null; // real ID from server after publish

/* ─────────────────────────────────────
   HELPERS
───────────────────────────────────── */
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

function navigate(path) {
  const fade = document.getElementById('pageFade');
  if (fade) { fade.classList.add('on'); setTimeout(() => { window.location.href = path; }, 320); }
  else window.location.href = path;
}

function setStep(n) {
  document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(n === 'success' ? 'stepSuccess' : `step${n}`);
  if (target) {
    target.classList.add('active');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('.step[data-s]').forEach(el => {
    const s = Number(el.dataset.s);
    el.classList.remove('active', 'done');
    if (typeof n === 'number') {
      if (s === n) el.classList.add('active');
      if (s < n)  el.classList.add('done');
    } else {
      el.classList.add('done');
    }
  });

  currentStep = n;
}

/* ─────────────────────────────────────
   STEP 1 VALIDATION
───────────────────────────────────── */
function validateStep1() {
  if (!form.title.trim())                  { showToast('Please enter a product title.', true); return false; }
  if (form.title.trim().length < 5)        { showToast('Title must be at least 5 characters.', true); return false; }
  if (!form.category)                      { showToast('Please select a category.', true); return false; }
  if (!form.description.trim())            { showToast('Please add a description.', true); return false; }
  if (form.description.trim().length < 20) { showToast('Description must be at least 20 characters.', true); return false; }
  if (!form.price || Number(form.price) < 1){ showToast('Please enter a valid price.', true); return false; }
  if (!form.condition)                     { showToast('Please select the condition.', true); return false; }
  return true;
}

/* ─────────────────────────────────────
   STEP 2 — PHOTO UPLOAD
───────────────────────────────────── */
function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  const MAX  = 5;
  let html   = '';

  form.photos.forEach((p, i) => {
    html += `
    <div class="photo-thumb" data-idx="${i}">
      <img src="${p.url}" alt="${p.name}"/>
      ${i === 0 ? '<div class="thumb-main">Cover</div>' : ''}
      <button class="thumb-del" data-del="${i}" title="Remove">✕</button>
    </div>`;
  });

  if (form.photos.length < MAX) {
    html += `
    <div class="thumb-add" id="thumbAddBtn" title="Add more photos">
      <span class="thumb-add-icon">+</span>
      <span>Add photo</span>
    </div>`;
  }

  grid.innerHTML = html;

  // Delete buttons
  grid.querySelectorAll('.thumb-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = Number(btn.dataset.del);
      URL.revokeObjectURL(form.photos[idx].url);
      form.photos.splice(idx, 1);
      renderPhotoGrid();
    });
  });

  // Add more button
  const addBtn = document.getElementById('thumbAddBtn');
  if (addBtn) addBtn.addEventListener('click', () => document.getElementById('fileInput').click());
}

function handleFiles(files) {
  const MAX      = 5;
  const MAX_SIZE = 5 * 1024 * 1024;

  for (const file of files) {
    if (form.photos.length >= MAX) {
      showToast(`Maximum ${MAX} photos allowed.`, true);
      break;
    }
    if (!file.type.startsWith('image/')) {
      showToast(`"${file.name}" is not an image file.`, true);
      continue;
    }
    if (file.size > MAX_SIZE) {
      showToast(`"${file.name}" exceeds 5 MB limit.`, true);
      continue;
    }
    const url = URL.createObjectURL(file);
    form.photos.push({ file, url, name: file.name });
  }

  renderPhotoGrid();
}

/* ─────────────────────────────────────
   STEP 3 — PREVIEW
───────────────────────────────────── */
const CAT_ICONS   = { books:'📗', electronics:'💻', furniture:'🛋️', accessories:'🎒', stationery:'✏️', clothing:'👕' };
const COND_LABELS = { new:'Like New', good:'Good', fair:'Fair' };

function renderPreview() {
  const user     = JSON.parse(localStorage.getItem('ut_user') || '{}');
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';
  const price    = Number(form.price).toLocaleString('en-IN');
  const orig     = form.origPrice ? Number(form.origPrice).toLocaleString('en-IN') : '';
  const discount = form.origPrice && Number(form.origPrice) > Number(form.price)
    ? Math.round((1 - Number(form.price) / Number(form.origPrice)) * 100) + '% off'
    : '';
  const icon     = CAT_ICONS[form.category] || '📦';
  const coverUrl = form.photos.length > 0 ? form.photos[0].url : null;

  document.getElementById('previewCard').innerHTML = `
    <div class="preview-img">
      ${coverUrl ? `<img src="${coverUrl}" alt="cover"/>` : icon}
    </div>
    <div class="preview-body">
      <div class="preview-cat">${form.category}</div>
      <div class="preview-title">${form.title}</div>
      <div class="preview-price">₹${price}</div>
      ${orig ? `<div class="preview-orig">₹${orig} original · ${discount}</div>` : ''}
      <div class="preview-meta">
        <span class="prev-pill">${COND_LABELS[form.condition]}</span>
        <span class="prev-pill">📍 ${form.location || 'Campus'}</span>
        <span class="prev-pill">📸 ${form.photos.length} photo${form.photos.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="preview-desc">${form.description}</div>
      <div class="preview-seller">
        <div class="ps-av">${initials}</div>
        <div>
          <div class="ps-name">${user.name || 'You'}</div>
          <div class="ps-info">Verified student · Campus seller</div>
        </div>
      </div>
    </div>`;

  document.getElementById('summaryRows').innerHTML = [
    ['Title',     form.title],
    ['Category',  form.category],
    ['Price',     `₹${price}`],
    ['Condition', COND_LABELS[form.condition]],
    ['Photos',    `${form.photos.length} uploaded`],
    ['Location',  form.location || 'Not specified'],
    ['Contact',   form.contact],
  ].map(([l, v]) =>
    `<div class="sum-row"><span class="sum-label">${l}</span><span class="sum-val">${v}</span></div>`
  ).join('');
}

/* ─────────────────────────────────────
   PUBLISH — REAL API
───────────────────────────────────── */
async function publishListing() {
  const btn   = document.getElementById('publishBtn');
  const token = localStorage.getItem('ut_token');

  // Check token first
  if (!token) {
    showToast('Session expired. Please log in again.', true);
    setTimeout(() => navigate('../loginpage/index.html'), 1500);
    return;
  }

  btn.classList.add('loading');
  btn.disabled    = true;
  btn.textContent = '⏳ Publishing…';

  try {
    // ── Build FormData with real files ──────────────────────────
    const fd         = new FormData();
    const categoryId = CATEGORY_IDS[form.category] || 1;

    fd.append('title',          form.title.trim());
    fd.append('category_id',    categoryId);
    fd.append('description',    form.description.trim());
    fd.append('price',          form.price);
    fd.append('condition_type', form.condition);
    fd.append('location',       form.location || '');
    fd.append('contact_pref',   form.contact  || 'chat');

    if (form.origPrice && Number(form.origPrice) > 0) {
      fd.append('orig_price', form.origPrice);
    }

    // Attach real photo files — key must be 'images' (plural)
    form.photos.forEach((p, i) => {
      const ext = p.file.name.split('.').pop() || 'jpg';
      fd.append('images', p.file, `photo_${i}.${ext}`);
    });

    // ── POST to real server ────────────────────────────────────
    // ⚠️ Do NOT set Content-Type — browser sets it automatically for FormData
    const res  = await fetch(`${API}/api/products`, {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body:    fd
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to publish listing.');

    // Save real product ID from database
    newListingId = data.productId || data.id;

    // ── Success ────────────────────────────────────────────────
    btn.classList.remove('loading');
    btn.classList.add('done');
    btn.textContent = '✓ Published!';

    // Wire up "View Listing" button with real ID before showing success
    const viewBtn = document.getElementById('viewListingBtn');
    if (viewBtn) {
      viewBtn.onclick = () => navigate(`../product/index.html?id=${newListingId}`);
    }

    setStep('success');

  } catch (err) {
    btn.classList.remove('loading');
    btn.disabled    = false;
    btn.textContent = '🚀 Publish Listing';
    showToast(err.message || 'Something went wrong. Is your server running?', true);
  }
}

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard ───────────────────────────────────────────────
  const userStr = localStorage.getItem('ut_user');
  if (!userStr) { window.location.href = '../loginpage/index.html'; return; }
  const user = JSON.parse(userStr);
  const navAv = document.getElementById('navAv');
  if (navAv) navAv.textContent = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';

  // ── Nav uname ────────────────────────────────────────────────
  const navUname = document.getElementById('navUname');
  if (navUname) navUname.textContent = user.name ? user.name.split(' ')[0] : 'User';

  // ── Title input ──────────────────────────────────────────────
  const titleInput = document.getElementById('fTitle');
  titleInput.addEventListener('input', () => {
    form.title = titleInput.value;
    document.getElementById('titleCount').textContent = titleInput.value.length;
  });

  // ── Description textarea ─────────────────────────────────────
  const descInput = document.getElementById('fDesc');
  descInput.addEventListener('input', () => {
    form.description = descInput.value;
    document.getElementById('descCount').textContent = descInput.value.length;
  });

  // ── Price inputs ─────────────────────────────────────────────
  document.getElementById('fPrice').addEventListener('input', e => {
    form.price = e.target.value;
    updateDiscount();
  });
  document.getElementById('fOrigPrice').addEventListener('input', e => {
    form.origPrice = e.target.value;
    updateDiscount();
  });

  function updateDiscount() {
    const hint = document.getElementById('discountHint');
    if (!hint) return;
    if (form.price && form.origPrice && Number(form.origPrice) > Number(form.price)) {
      const pct = Math.round((1 - Number(form.price) / Number(form.origPrice)) * 100);
      hint.textContent = `🏷️ ${pct}% off from original price`;
      hint.style.color = 'var(--green)';
    } else {
      hint.textContent = '';
    }
  }

  // ── Category buttons ─────────────────────────────────────────
  document.getElementById('catGrid').addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    form.category = btn.dataset.cat;
    const fCat = document.getElementById('fCategory');
    if (fCat) fCat.value = form.category;
  });

  // ── Condition buttons ────────────────────────────────────────
  document.getElementById('condGrid').addEventListener('click', e => {
    const btn = e.target.closest('.cond-btn');
    if (!btn) return;
    document.querySelectorAll('.cond-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    form.condition = btn.dataset.cond;
    const fCond = document.getElementById('fCondition');
    if (fCond) fCond.value = form.condition;
  });

  // ── Location ─────────────────────────────────────────────────
  document.getElementById('fLocation').addEventListener('input', e => {
    form.location = e.target.value;
  });

  // ── Contact preference ────────────────────────────────────────
  const contactOpts = document.getElementById('contactOpts');
  if (contactOpts) {
    contactOpts.addEventListener('click', e => {
      const btn = e.target.closest('.copt-btn');
      if (!btn) return;
      document.querySelectorAll('.copt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      form.contact = btn.dataset.c;
      const fContact = document.getElementById('fContact');
      if (fContact) fContact.value = form.contact;
    });
  }

  // ── Step 1 → 2 ───────────────────────────────────────────────
  document.getElementById('step1Next').addEventListener('click', () => {
    if (validateStep1()) {
      setStep(2);
      renderPhotoGrid();
    }
  });

  // ── Step 2: Drop zone & file input ───────────────────────────
  const dropZone  = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  // browseBtn opens file picker
  const browseBtn = document.getElementById('browseBtn');
  if (browseBtn) {
    browseBtn.addEventListener('click', e => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // clicking the drop zone also opens file picker
  dropZone.addEventListener('click', () => {
    if (form.photos.length < 5) fileInput.click();
  });

  // file selected from picker
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFiles(fileInput.files);
      fileInput.value = ''; // reset so same file can be picked again
    }
  });

  // drag and drop
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  // ── Step 2 → 1 (back) ────────────────────────────────────────
  document.getElementById('step2Back').addEventListener('click', () => setStep(1));

  // ── Step 2 → 3 ───────────────────────────────────────────────
  document.getElementById('step2Next').addEventListener('click', () => {
    if (form.photos.length === 0) {
      showToast('Please add at least 1 photo.', true);
      return;
    }
    setStep(3);
    renderPreview();
  });

  // ── Step 3 → 2 (back) ────────────────────────────────────────
  document.getElementById('step3Back').addEventListener('click', () => setStep(2));

  // ── Publish → real API ────────────────────────────────────────
  document.getElementById('publishBtn').addEventListener('click', publishListing);

  // ── Success: View Listing ─────────────────────────────────────
  const viewListingBtn = document.getElementById('viewListingBtn');
  if (viewListingBtn) {
    viewListingBtn.addEventListener('click', () => {
      navigate(`../product/index.html?id=${newListingId}`);
    });
  }

  // ── Success: Sell Another ─────────────────────────────────────
  const sellAnotherBtn = document.getElementById('sellAnotherBtn');
  if (sellAnotherBtn) {
    sellAnotherBtn.addEventListener('click', () => window.location.reload());
  }

  // ── Nav dropdown ──────────────────────────────────────────────
  const navUser = document.getElementById('navUser');
  if (navUser) {
    navUser.addEventListener('click', e => {
      e.stopPropagation();
      navUser.classList.toggle('open');
    });
    document.addEventListener('click', () => navUser.classList.remove('open'));
  }

  // ── Logout ────────────────────────────────────────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (!confirm('Log out of UniTrade?')) return;
      localStorage.clear();
      navigate('../loginpage/index.html');
    });
  }

});