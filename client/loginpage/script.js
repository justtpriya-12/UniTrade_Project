// ═══════════════════════════════════════
//  UniTrade — loginpage/script.js
//  Canvas campus animation + REAL API
// ═══════════════════════════════════════

// ── Change this if your server runs on different port ──
const API = 'https://unitrade-project.onrender.com';

/* ─────────────────────────────────────
   CAMPUS CANVAS ANIMATION
───────────────────────────────────── */
(function () {
  const canvas = document.getElementById('campusCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, stars, particles, students;
  let t = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeStars() {
    return Array.from({ length: 130 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.65,
      r: Math.random() * 1.4 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.007 + 0.003
    }));
  }

  function makeParticles() {
    const icons = ['📚','💻','🎒','📱','✏️','📝','🔬','🎓','💡','📐'];
    return Array.from({ length: 16 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.7,
      icon: icons[Math.floor(Math.random() * icons.length)],
      vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.28,
      scale: Math.random() * 0.55 + 0.45,
      alpha: Math.random() * 0.3 + 0.1,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.009
    }));
  }

  function makeStudents() {
    return [
      { x: W * 0.08, y: H * 0.73, type: 'read',  dir: 1,  vx: 0,    ph: 0 },
      { x: W * 0.18, y: H * 0.80, type: 'walk',  dir: 1,  vx: 0.42, ph: 0 },
      { x: W * 0.88, y: H * 0.73, type: 'laptop',dir: -1, vx: 0,    ph: 1.2 },
      { x: W * 0.78, y: H * 0.80, type: 'walk',  dir: -1, vx: -0.38,ph: 2.4 },
      { x: W * 0.04, y: H * 0.79, type: 'sit',   dir: 1,  vx: 0,    ph: 0.8 },
      { x: W * 0.92, y: H * 0.78, type: 'cycle', dir: -1, vx: -1.0, ph: 0 },
      { x: W * 0.14, y: H * 0.75, type: 'phone', dir: 1,  vx: 0,    ph: 0.4 },
    ];
  }

  function drawStudent(s) {
    const { x, y, type, dir, ph } = s;
    const bob = Math.sin(t * 2 + ph) * (type === 'walk' || type === 'cycle' ? 2 : 0.7);
    const a = 0.52;
    ctx.save();
    ctx.translate(x, y);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.strokeStyle = `rgba(180,190,255,${a})`;
    ctx.fillStyle   = `rgba(180,190,255,${a})`;
    ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (type === 'walk') {
      const leg = Math.sin(t * 4 + ph) * 13;
      const arm = Math.cos(t * 4 + ph) * 9;
      ctx.beginPath(); ctx.arc(0, -38 + bob, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -31 + bob); ctx.lineTo(0, -10 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25 + bob); ctx.lineTo(10 + arm, -16 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -25 + bob); ctx.lineTo(-10 - arm, -16 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -10 + bob); ctx.lineTo(7 + leg, 9 + bob); ctx.lineTo(7 + leg, 20 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -10 + bob); ctx.lineTo(-7 - leg, 9 + bob); ctx.lineTo(-7 - leg, 20 + bob); ctx.stroke();
    } else if (type === 'read') {
      ctx.beginPath(); ctx.arc(0, -42, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(0, -14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(-14, -20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(14, -20); ctx.stroke();
      ctx.fillStyle = 'rgba(100,180,255,0.3)'; ctx.fillRect(-16, -24, 32, 10); ctx.strokeRect(-16, -24, 32, 10);
      ctx.strokeStyle = `rgba(180,190,255,${a})`;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-13, 0); ctx.lineTo(-13, 11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(13, 0); ctx.lineTo(13, 11); ctx.stroke();
    } else if (type === 'laptop') {
      ctx.beginPath(); ctx.arc(0, -42 + bob, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -35 + bob); ctx.lineTo(0, -14 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -28 + bob); ctx.lineTo(-16, -18 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -28 + bob); ctx.lineTo(16, -18 + bob); ctx.stroke();
      ctx.fillStyle = 'rgba(79,70,229,0.28)'; ctx.fillRect(-18, -24 + bob, 36, 20); ctx.strokeRect(-18, -24 + bob, 36, 20);
      ctx.fillStyle = 'rgba(100,120,255,0.12)'; ctx.fillRect(-14, -22 + bob, 28, 14);
      ctx.strokeStyle = `rgba(180,190,255,${a})`;
      ctx.beginPath(); ctx.moveTo(0, -14 + bob); ctx.lineTo(-13, 2 + bob); ctx.lineTo(-13, 13 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -14 + bob); ctx.lineTo(13, 2 + bob); ctx.lineTo(13, 13 + bob); ctx.stroke();
    } else if (type === 'sit') {
      ctx.beginPath(); ctx.arc(-7, -42, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -35); ctx.lineTo(-7, -14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -28); ctx.lineTo(4, -22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -28); ctx.lineTo(-19, -22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(-17, 4); ctx.lineTo(-17, 13); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(3, 4); ctx.lineTo(3, 13); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.roundRect(8, -52, 26, 13, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath(); ctx.roundRect(8, -52, 26, 13, 4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 3; i++) {
        const ps = Math.sin(t * 3 + i * 1.2) > 0.3 ? 2.2 : 1.4;
        ctx.beginPath(); ctx.arc(14 + i * 6, -46, ps, 0, Math.PI * 2); ctx.fill();
      }
    } else if (type === 'phone') {
      ctx.beginPath(); ctx.arc(0, -42 + bob, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -35 + bob); ctx.lineTo(0, -10 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -28 + bob); ctx.lineTo(13, -34 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -28 + bob); ctx.lineTo(-11, -18 + bob); ctx.stroke();
      ctx.fillStyle = 'rgba(255,180,60,0.28)'; ctx.fillRect(10, -40 + bob, 7, 11);
      ctx.strokeStyle = 'rgba(255,180,60,0.55)'; ctx.strokeRect(10, -40 + bob, 7, 11);
      ctx.strokeStyle = `rgba(180,190,255,${a})`;
      ctx.beginPath(); ctx.moveTo(0, -10 + bob); ctx.lineTo(-6, 9 + bob); ctx.lineTo(-6, 20 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -10 + bob); ctx.lineTo(6, 9 + bob); ctx.lineTo(6, 20 + bob); ctx.stroke();
    } else if (type === 'cycle') {
      const pr = t * 5 + ph;
      ctx.beginPath(); ctx.arc(0, -46 + bob, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -39 + bob); ctx.lineTo(7, -20 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -32 + bob); ctx.lineTo(18, -28 + bob); ctx.stroke();
      ctx.strokeStyle = 'rgba(180,190,255,0.38)';
      ctx.beginPath(); ctx.arc(-13, 8 + bob, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(13, 8 + bob, 13, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const ang = pr + i * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(-13, 8 + bob); ctx.lineTo(-13 + Math.cos(ang) * 12, 8 + bob + Math.sin(ang) * 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(13, 8 + bob); ctx.lineTo(13 + Math.cos(ang) * 12, 8 + bob + Math.sin(ang) * 12); ctx.stroke();
      }
      ctx.strokeStyle = `rgba(180,190,255,${a})`;
      ctx.beginPath(); ctx.moveTo(-13, 8 + bob); ctx.lineTo(4, -6 + bob); ctx.lineTo(13, 8 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -6 + bob); ctx.lineTo(13, -20 + bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -4 + bob); ctx.lineTo(4 + Math.cos(pr) * 9, -4 + bob + Math.sin(pr) * 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -4 + bob); ctx.lineTo(4 - Math.cos(pr) * 9, -4 + bob - Math.sin(pr) * 9); ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.011;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#03020e'); sky.addColorStop(0.45, '#07061c');
    sky.addColorStop(0.8, '#0c0926'); sky.addColorStop(1, '#0f0c2e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    stars.forEach(s => {
      s.phase += s.speed;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,220,255,${0.3 + 0.5 * Math.sin(s.phase)})`; ctx.fill();
    });
    const aur = ctx.createRadialGradient(W*.5, H*.08, 0, W*.5, H*.08, W*.65);
    aur.addColorStop(0, `rgba(79,70,229,${0.05 + 0.02*Math.sin(t*0.4)})`);
    aur.addColorStop(1, 'transparent');
    ctx.fillStyle = aur; ctx.fillRect(0, 0, W, H);
    const gnd = ctx.createLinearGradient(0, H*0.82, 0, H);
    gnd.addColorStop(0, 'rgba(79,70,229,0.05)'); gnd.addColorStop(1, 'transparent');
    ctx.fillStyle = gnd; ctx.fillRect(0, H*0.82, W, H*0.18);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
      if (p.x > W+40) p.x=-40; if (p.x<-40) p.x=W+40;
      if (p.y > H*0.75) p.y=-40; if (p.y<-40) p.y=H*0.75;
      ctx.save(); ctx.globalAlpha=p.alpha;
      ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.scale(p.scale,p.scale);
      ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(p.icon,0,0); ctx.restore();
    });
    students.forEach(s => {
      if (s.vx!==0) {
        s.x+=s.vx;
        if (s.dir>0&&s.x>W+60) s.x=-60;
        if (s.dir<0&&s.x<-60) s.x=W+60;
      }
      drawStudent(s);
    });
    for (let i=0;i<10;i++) {
      const fx=(W*0.1*i+t*16*(i%2===0?1:-1)+W)%W;
      const fy=H*0.79+Math.sin(t*1.4+i*0.8)*15;
      ctx.beginPath(); ctx.arc(fx,fy,1.4,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,230,100,${0.12+0.1*Math.sin(t*2.2+i)})`; ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  function init() { resize(); stars=makeStars(); particles=makeParticles(); students=makeStudents(); draw(); }
  window.addEventListener('resize', init);
  init();
})();

/* ─────────────────────────────────────
   CLOCK HANDS
───────────────────────────────────── */
(function tickClock() {
  const cmin = document.getElementById('cmin');
  const chr  = document.getElementById('chr');
  if (!cmin||!chr) return;
  function tick() {
    const now=new Date();
    cmin.setAttribute('transform',`rotate(${(now.getMinutes()+now.getSeconds()/60)*6},450,18)`);
    chr.setAttribute('transform', `rotate(${((now.getHours()%12)+now.getMinutes()/60)*30},450,18)`);
  }
  tick(); setInterval(tick,1000);
})();

/* ─────────────────────────────────────
   FORM LOGIC — Real API connected
───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  const pageFade   = document.getElementById('pageFade');
  const errorMsg   = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');

  // Already logged in → skip to home
  if (localStorage.getItem('ut_token') && localStorage.getItem('ut_user')) {
    window.location.href = '../home/index.html';
    return;
  }

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(
        tab.dataset.tab === 'signin' ? 'signinForm' : 'signupForm'
      ).classList.add('active');
      clearAlerts();
    });
  });

  // Password toggle
  document.querySelectorAll('.eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁️';
    });
  });

  // Email hint
  document.getElementById('suEmail').addEventListener('input', e => {
    const v = e.target.value;
    const hint = document.getElementById('emailHint');
    if (!v.includes('@')) { hint.textContent=''; return; }
    if (v.includes('.ac.in') || v.includes('.edu')) {
      hint.textContent = '✓ Valid college email'; hint.style.color = '#4ade80';
    } else {
      hint.textContent = '💡 Use yourname@college.ac.in'; hint.style.color = '#f97316';
    }
  });

  // Password strength
  document.getElementById('suPass').addEventListener('input', e => {
    const v = e.target.value;
    const bar = document.getElementById('strengthBar');
    let s = 0;
    if (v.length>=6) s++; if (v.length>=10) s++;
    if (/[A-Z]/.test(v)) s++; if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    bar.style.width = (s/5*100)+'%';
    bar.style.background = s<=1?'#ef4444':s<=3?'#f97316':'#22c55e';
  });

  function clearAlerts() {
    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');
  }
  function showError(msg) {
    clearAlerts();
    errorMsg.textContent = msg;
    errorMsg.classList.add('show');
    errorMsg.style.animation = 'none';
    void errorMsg.offsetWidth;
    errorMsg.style.animation = '';
  }
  function showSuccess(msg) {
    clearAlerts();
    successMsg.textContent = msg;
    successMsg.classList.add('show');
  }
  function navigate(path) {
    pageFade.classList.add('on');
    setTimeout(() => { window.location.href = path; }, 360);
  }

  // ════════════════════════════════════
  //  SIGN IN — Real API
  // ════════════════════════════════════
  document.getElementById('signinForm').addEventListener('submit', async e => {
    e.preventDefault();

    const email    = document.getElementById('siEmail').value.trim();
    const password = document.getElementById('siPass').value;

    if (!email)                                     { showError('Please enter your college email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Invalid email address.'); return; }
    if (!password)                                  { showError('Please enter your password.'); return; }
    if (password.length < 6)                        { showError('Password must be at least 6 characters.'); return; }

    const btn = document.getElementById('siBtn');
    btn.classList.add('loading'); btn.disabled = true; btn.textContent = 'Signing in…';

    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid email or password.');

      // Save real token + user from database
      localStorage.setItem('ut_token', data.token);
      localStorage.setItem('ut_user',  JSON.stringify(data.user));

      btn.classList.remove('loading');
      btn.classList.add('done');
      btn.textContent = '✓ Welcome back!';
      setTimeout(() => navigate('../home/index.html'), 800);

    } catch (err) {
      btn.classList.remove('loading'); btn.disabled = false; btn.textContent = 'Sign In';
      showError(err.message || 'Something went wrong. Please try again.');
    }
  });

  // ════════════════════════════════════
  //  SIGN UP — Real API
  // ════════════════════════════════════
  document.getElementById('signupForm').addEventListener('submit', async e => {
    e.preventDefault();

    const first    = document.getElementById('suFirst').value.trim();
    const last     = document.getElementById('suLast').value.trim();
    const email    = document.getElementById('suEmail').value.trim();
    const password = document.getElementById('suPass').value;
    const confirm  = document.getElementById('suConfirm').value;
    const agreed   = document.getElementById('agreeCheck').checked;

    if (!first || !last)                            { showError('Please enter your full name.'); return; }
    if (!email)                                     { showError('Please enter your college email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Invalid email address.'); return; }
    if (!password || password.length < 6)           { showError('Password must be at least 6 characters.'); return; }
    if (password !== confirm)                       { showError('Passwords do not match.'); return; }
    if (!agreed)                                    { showError('Please agree to the Terms of Service.'); return; }

    const btn = document.getElementById('suBtn');
    btn.classList.add('loading'); btn.disabled = true; btn.textContent = 'Creating account…';

    try {
      const res  = await fetch(`${API}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: `${first} ${last}`, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed.');

      // Save real token + user from database
      localStorage.setItem('ut_token', data.token);
      localStorage.setItem('ut_user',  JSON.stringify(data.user));

      btn.classList.remove('loading');
      btn.classList.add('done');
      btn.textContent = '✓ Account created!';
      showSuccess(`Welcome, ${first}! Redirecting to the marketplace…`);
      setTimeout(() => navigate('../home/index.html'), 1200);

    } catch (err) {
      btn.classList.remove('loading'); btn.disabled = false; btn.textContent = 'Create Account';
      showError(err.message || 'Registration failed. Please try again.');
    }
  });

  // Google placeholder
  document.querySelectorAll('.btn-google').forEach(b =>
    b.addEventListener('click', () =>
      alert('Google OAuth not configured yet. Please use email and password.')
    )
  );
});