/* Dispensa di casa — app principale */
(() => {
  'use strict';

  // ───────────────────────── Utilità ─────────────────────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n * 1000) / 1000;
  const fmtQ = (n) => round(n).toLocaleString('it-IT', { maximumFractionDigits: 2 });
  const byName = (a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };
  const loadScript = (src) => new Promise((res, rej) => {
    if ($$('script').some((s) => s.src === src)) return res();
    const s = document.createElement('script'); s.src = src; s.async = false;
    s.onload = res; s.onerror = () => { s.remove(); rej(new Error('Impossibile caricare ' + src)); };
    document.head.appendChild(s);
  });
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const daysTo = (iso) => { if (!iso) return null; const t = new Date(iso + 'T00:00:00'); return Math.round((t - today()) / 86400000); };
  const fmtDate = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y.slice(2)}`; };

  const FB = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const QR_URL = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
  const EXP_DAYS = 3;
  const UNITS = ['pz', 'conf', 'g', 'kg', 'ml', 'L'];
  const ZONES = { frigo: { label: 'Frigo', icon: 'fridge' }, freezer: { label: 'Freezer', icon: 'snow' }, dispensa: { label: 'Dispensa', icon: 'jar' } };
  const CATS = ['Tutte', 'Primi', 'Secondi', 'Contorni', 'Zuppe', 'Piatti unici', 'Dolci'];
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  // ───────────────────────── Icone ─────────────────────────
  const ICONS = {
    fridge: '<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M5 10h14M9 5.5v2M9 13v3"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/><path d="m9 3.5 3 2 3-2M9 20.5l3-2 3 2"/>',
    jar: '<path d="M8 2h8v3H8z"/><path d="M7 5h10a2 2 0 0 1 2 2v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2z"/><path d="M5 11h14"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10.5 8v8M14 8v8M17 8v8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    cloud: '<path d="M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    text: '<path d="M4 20 9 6l5 14M5.8 15h6.4M15 20l3-8 3 8M16 17.5h4"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 18h.01"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    chef: '<path d="M6 13.9A4 4 0 0 1 7.5 6a5 5 0 0 1 9 0A4 4 0 0 1 18 13.9V21H6z"/><path d="M6 17h12"/>'
  };
  const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  // ───────────────────────── Stato ─────────────────────────
  const COLS = ['products', 'shopping', 'recipes', 'barcodes'];
  const S = {
    products: [], shopping: [], recipes: [], barcodes: [],
    view: 'dispensa', zone: 'tutto', q: '', filter: null,
    rq: '', rcat: 'Tutte', rmode: 'tutte',
    mode: 'local', user: null, fb: 'off', online: navigator.onLine,
    prefs: LS.get('dd_prefs', { big: false })
  };
  let installPrompt = null;

  // ───────────────────────── Archivio (locale / Firebase) ─────────────────────────
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const Store = {
    db: null, unsubs: [],
    loadLocal() { COLS.forEach((c) => { S[c] = LS.get('dd_' + c, []); }); },
    saveLocal(c) { LS.set('dd_' + c, S[c]); },
    col(c) { return this.db.collection('households').doc(S.user.uid).collection(c); },
    mem(c, o) { const a = S[c]; const i = a.findIndex((x) => x.id === o.id); if (i >= 0) a[i] = o; else a.push(o); },
    fail(e) { console.error(e); toast('Errore di salvataggio: ' + (e.code || e.message)); },
    put(c, o) {
      o = clean({ ...o, updatedAt: Date.now() });
      this.mem(c, o);
      if (S.mode === 'cloud') this.col(c).doc(o.id).set(o).catch((e) => this.fail(e));
      else this.saveLocal(c);
      refresh();
      return o;
    },
    del(c, id) {
      S[c] = S[c].filter((x) => x.id !== id);
      if (S.mode === 'cloud') this.col(c).doc(id).delete().catch((e) => this.fail(e));
      else this.saveLocal(c);
      refresh();
    },
    inc(id, d, extra = {}) {
      const p = S.products.find((x) => x.id === id); if (!p) return;
      const nq = round(p.qty + d); if (nq < 0) return;
      Object.assign(p, extra, { qty: nq, updatedAt: Date.now() });
      if (nq > (p.min || 0)) { p.skip = false; extra.skip = false; }
      if (S.mode === 'cloud') {
        this.col('products').doc(id).update(clean({ ...extra, qty: firebase.firestore.FieldValue.increment(round(d)), updatedAt: p.updatedAt }))
          .catch((e) => this.fail(e));
      } else this.saveLocal('products');
      refresh();
    },
    putMany(c, arr) {
      arr = arr.map((o) => clean({ ...o, updatedAt: o.updatedAt || Date.now() }));
      arr.forEach((o) => this.mem(c, o));
      if (S.mode === 'cloud') {
        for (let i = 0; i < arr.length; i += 400) {
          const b = this.db.batch();
          arr.slice(i, i + 400).forEach((o) => b.set(this.col(c).doc(o.id), o));
          b.commit().catch((e) => this.fail(e));
        }
      } else this.saveLocal(c);
      refresh();
    }
  };

  // ───────────────────────── Firebase ─────────────────────────
  async function initFirebase() {
    const cfg = window.FIREBASE_CONFIG || {};
    if (!cfg.apiKey) { S.fb = 'off'; return; }
    S.fb = 'loading'; refresh();
    try {
      await loadScript(FB + 'firebase-app-compat.js');
      await loadScript(FB + 'firebase-auth-compat.js');
      await loadScript(FB + 'firebase-firestore-compat.js');
    } catch (e) { S.fb = 'error'; refresh(); return; }
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    Store.db = firebase.firestore();
    try { await Store.db.enablePersistence({ synchronizeTabs: true }); } catch (_) { /* già attiva o non supportata */ }
    S.fb = 'ready';
    firebase.auth().onAuthStateChanged((u) => { if (u) startCloud(u); else stopCloud(); });
    refresh();
  }

  function startCloud(u) {
    Store.unsubs.forEach((f) => f()); Store.unsubs = [];
    const local = {}; COLS.forEach((c) => { local[c] = LS.get('dd_' + c, []); });
    S.user = { uid: u.uid, email: u.email }; S.mode = 'cloud';
    Store.db.collection('households').doc(u.uid).set({ email: u.email || '', lastSeen: Date.now() }, { merge: true }).catch(() => {});
    COLS.forEach((c) => { S[c] = []; });
    let checked = !!LS.get('dd_migrated_' + u.uid, false);
    COLS.forEach((c) => {
      const un = Store.col(c).onSnapshot((snap) => {
        S[c] = snap.docs.map((d) => d.data());
        if (c === 'products' && !checked && !snap.metadata.fromCache) {
          checked = true; LS.set('dd_migrated_' + u.uid, true);
          if (snap.empty && local.products.length) offerMigration(local);
        }
        refresh();
      }, (e) => { console.error(e); toast('Sincronizzazione: ' + (e.code || e.message)); });
      Store.unsubs.push(un);
    });
    refresh();
  }
  async function offerMigration(local) {
    const ok = await confirmBox({ title: 'Caricare i dati di questo dispositivo?', text: `Su questo dispositivo ci sono ${local.products.length} prodotti salvati prima del login. Vuoi copiarli nell'account di casa?`, ok: 'Sì, caricali' });
    if (!ok) return;
    COLS.forEach((c) => { if (local[c].length) Store.putMany(c, local[c]); });
    toast('Dati caricati sul cloud');
  }
  function stopCloud() {
    Store.unsubs.forEach((f) => f()); Store.unsubs = [];
    S.user = null; S.mode = 'local'; Store.loadLocal(); refresh();
  }
  const AUTH_ERR = {
    'auth/invalid-credential': 'Email o password sbagliate.', 'auth/wrong-password': 'Password sbagliata.',
    'auth/user-not-found': 'Nessun account con questa email.', 'auth/email-already-in-use': 'Esiste già un account con questa email: usa Accedi.',
    'auth/weak-password': 'La password deve avere almeno 6 caratteri.', 'auth/invalid-email': 'Email non valida.',
    'auth/network-request-failed': 'Serve internet per accedere la prima volta.', 'auth/too-many-requests': 'Troppi tentativi, riprova tra qualche minuto.',
    'auth/operation-not-allowed': 'Attiva "Email/password" in Firebase → Authentication (vedi guida).'
  };
  async function doAuth(kind, email, pw) {
    try {
      if (kind === 'login') await firebase.auth().signInWithEmailAndPassword(email, pw);
      else await firebase.auth().createUserWithEmailAndPassword(email, pw);
      toast('Accesso effettuato');
    } catch (e) { toast(AUTH_ERR[e.code] || e.message); }
  }

  // ───────────────────────── Notifiche ─────────────────────────
  const deviceName = () => isIOS ? 'iPhone/iPad' : /Android/i.test(navigator.userAgent) ? (Math.min(screen.width, screen.height) >= 600 ? 'Tablet Android' : 'Telefono Android') : 'Computer';
  async function enablePush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return toast(isIOS && !isStandalone() ? 'Su iPhone prima aggiungi l\'app alla schermata Home, poi riprova da lì.' : 'Questo browser non supporta le notifiche.');
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { refresh(); return toast('Notifiche non autorizzate: puoi attivarle dalle impostazioni del browser.'); }
    if (S.mode !== 'cloud' || !window.FIREBASE_VAPID_KEY) {
      refresh(); return toast('Avvisi attivi quando apri l\'app. Per le push vere serve il login (vedi guida).');
    }
    try {
      await loadScript(FB + 'firebase-messaging-compat.js');
      if (!(await firebase.messaging.isSupported())) return toast('Notifiche push non supportate qui.');
      const reg = await navigator.serviceWorker.ready;
      const token = await firebase.messaging().getToken({ vapidKey: window.FIREBASE_VAPID_KEY, serviceWorkerRegistration: reg });
      if (!token) throw new Error('nessun token');
      await Store.col('devices').doc(token).set({ token, name: deviceName(), createdAt: Date.now() });
      LS.set('dd_push', token); refresh();
      toast('Notifiche push attivate su questo dispositivo ✓');
    } catch (e) { console.error(e); toast('Non riesco ad attivare le push: ' + (e.code || e.message)); }
  }
  async function testNotif() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return toast('Prima attiva le notifiche.');
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('Dispensa', { body: 'Le notifiche funzionano ✓', icon: 'icons/icon-192.png', tag: 'test' });
  }
  async function openReminder() {
    // Promemoria locale una volta al giorno all'apertura (utile se le push non sono configurate)
    if (!('Notification' in window) || Notification.permission !== 'granted' || LS.get('dd_push', null)) return;
    const key = new Date().toISOString().slice(0, 10);
    if (LS.get('dd_lastnotif', '') === key) return;
    const low = lowList().length, exp = expList().length;
    if (!low && !exp) return;
    LS.set('dd_lastnotif', key);
    const parts = []; if (low) parts.push(`${low} da ricomprare`); if (exp) parts.push(`${exp} in scadenza`);
    try { (await navigator.serviceWorker.ready).showNotification('Dispensa', { body: parts.join(' · '), icon: 'icons/icon-192.png', tag: 'riepilogo' }); } catch (_) {}
  }

  // ───────────────────────── Logica dispensa ─────────────────────────
  const isLow = (p) => !p.skip && p.qty <= (p.min || 0);
  const isExp = (p) => p.qty > 0 && p.expiry && daysTo(p.expiry) <= EXP_DAYS;
  const lowList = () => S.products.filter(isLow).sort(byName);
  const expList = () => S.products.filter(isExp).sort((a, b) => daysTo(a.expiry) - daysTo(b.expiry));
  const openShopping = () => S.shopping.filter((s) => !s.done);
  const getP = (id) => S.products.find((p) => p.id === id);
  const stepOf = (p) => p.step || (['g', 'ml'].includes(p.unit) ? 100 : 1);

  function changeQty(id, dir) {
    const p = getP(id); if (!p) return;
    const step = stepOf(p);
    const wasLow = isLow(p);
    const d = dir < 0 ? -Math.min(step, p.qty) : step;
    if (d === 0) return toast(`${p.name} è già finito`);
    const prev = p.qty;
    Store.inc(id, d);
    const now = getP(id);
    if (dir < 0 && !wasLow && now && isLow(now)) toast(`${p.name} sta finendo: aggiunto alla spesa`, () => Store.inc(id, round(prev - now.qty)));
    else if (dir < 0) toast(`${p.name}: ${fmtQ(now.qty)} ${p.unit}`, () => Store.inc(id, round(prev - now.qty)));
  }

  // ───────────────────────── Ricette ─────────────────────────
  const BASE = new Set(['sale', 'pepe', 'olio', 'acqu', 'acqua']);
  const STOP = new Set(('gr kg ml cl dl cucchiai cucchiaio cucchiaini cucchiaino bicchiere bicchieri pizzico spicchi spicchio qb circa fette fetta etti etto litro litri mezzo mezza una uno del della dei degli delle con per grammi confezione confezioni scatola scatole bustina bustine noce pezzi pezzo vasetto vasetti tazza tazze rametto foglie foglia poco poca abbondante').split(' '));
  function parseIng(str) {
    let s = str, base = false, opt = false;
    if (s[0] === '*') { base = true; s = s.slice(1); } else if (s[0] === '?') { opt = true; s = s.slice(1); }
    const k = s.indexOf(':');
    return { label: s.slice(k + 1), stems: s.slice(0, k).split('|').map(norm).filter(Boolean), base, opt };
  }
  function autoIng(line) {
    let s = line.trim(), opt = false;
    if (s[0] === '?') { opt = true; s = s.slice(1).trim(); }
    if (/facoltativ/i.test(s)) opt = true;
    const words = norm(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d/.test(w));
    const w = words[0] || norm(s);
    const stem = w.length > 4 ? w.slice(0, -1) : w;
    return { label: s, stems: [stem], base: BASE.has(stem), opt };
  }
  const BUILTIN = (window.RICETTE || []).map((r) => ({ id: r.id, t: r.t, c: r.c, min: r.min, p: r.p, ings: r.i.map(parseIng), s: r.s, custom: false }));
  const allRecipes = () => BUILTIN.concat(S.recipes.map((r) => ({ id: r.id, t: r.t, c: r.c, min: r.min, p: r.p, ings: (r.ing || []).filter(Boolean).map(autoIng), s: r.s || [], custom: true, author: r.author || 'Mamma' })));
  function pantryIndex() { return S.products.filter((p) => p.qty > 0).map((p) => ' ' + norm(p.name)); }
  function matchRecipe(r, pantry) {
    const res = r.ings.map((g) => ({ ...g, have: g.stems.some((st) => pantry.some((n) => n.includes(' ' + st))) }));
    const counted = res.filter((g) => !g.base && !g.opt);
    const have = counted.filter((g) => g.have).length;
    return { ings: res, total: counted.length, have, missing: counted.filter((g) => !g.have) };
  }
  const shortLabel = (l) => l.replace(/\s*\(.*?\)/g, '').replace(/\s+\d.*$/, '').replace(/\s+(q\.?b\.?|abbondante)$/i, '').trim();

  // ───────────────────────── Fogli modali ─────────────────────────
  const stack = [];
  function openSheet({ title, body, foot = '', wide = false, onClose, onMount }) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-a="close-sheet" aria-label="Chiudi">${ic('x')}</button></div>
      <div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div>`;
    ov.addEventListener('click', (e) => { if (e.target === ov) closeSheet(); });
    $('#sheets').appendChild(ov);
    stack.push({ el: ov, onClose });
    document.body.classList.add('has-sheet');
    if (!(history.state && history.state.sheet)) history.pushState({ sheet: 1 }, '', location.hash);
    if (onMount) onMount(ov);
    return ov;
  }
  function closeSheet() { const o = stack.pop(); if (!o) return; o.el.remove(); if (!stack.length) document.body.classList.remove('has-sheet'); if (o.onClose) o.onClose(); }
  window.addEventListener('popstate', () => { while (stack.length) closeSheet(); });
  function confirmBox({ title, text, ok = 'Conferma', danger = false }) {
    return new Promise((resolve) => {
      let done = false;
      const fin = (v) => { if (done) return; done = true; resolve(v); };
      const ov = openSheet({
        title, body: `<p class="mt0">${esc(text)}</p>`,
        foot: `<button class="btn" data-c="no">Annulla</button><button class="btn ${danger ? 'danger' : 'primary'}" data-c="ok">${esc(ok)}</button>`,
        onClose: () => fin(false)
      });
      ov.querySelector('[data-c=ok]').onclick = () => { fin(true); closeSheet(); };
      ov.querySelector('[data-c=no]').onclick = () => closeSheet();
    });
  }

  let toastT;
  function toast(msg, undo) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Annulla</button>' : ''}`;
    if (undo) t.querySelector('button').onclick = () => { undo(); t.classList.remove('show'); };
    t.classList.add('show'); clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), undo ? 4500 : 2800);
  }

  // ───────────────────────── Navigazione ─────────────────────────
  const NAV = [
    { id: 'dispensa', label: 'Dispensa', icon: 'box' },
    { id: 'spesa', label: 'Spesa', icon: 'cart' },
    { id: 'ricette', label: 'Ricette', icon: 'book' },
    { id: 'impostazioni', label: 'Impostazioni', icon: 'sliders' }
  ];
  function renderNav() {
    const n = lowList().length + openShopping().length;
    const e = expList().length;
    const badge = (id) => id === 'spesa' && n ? `<span class="badge">${n}</span>` : id === 'dispensa' && e ? `<span class="badge">${e}</span>` : '';
    const html = NAV.map((x) => `<button class="${S.view === x.id ? 'on' : ''}" data-a="go" data-v="${x.id}" aria-current="${S.view === x.id ? 'page' : 'false'}">${ic(x.icon)}<span>${x.label}</span>${badge(x.id)}</button>`).join('');
    $('#navSide').innerHTML = html; $('#navTab').innerHTML = html;
    let dot, txt;
    if (S.mode === 'cloud') { dot = S.online ? 'ok' : 'warn'; txt = S.online ? 'Sincronizzato' : 'Offline · invio appena torna la rete'; }
    else { dot = ''; txt = S.fb === 'loading' ? 'Connessione…' : 'Solo su questo dispositivo'; }
    $('#syncSide').innerHTML = `<span class="dot ${dot}"></span><span>${txt}</span>`;
  }
  function go(v) {
    if (!VIEWS[v]) v = 'dispensa';
    S.view = v;
    try { history.replaceState(history.state, '', '#' + v); } catch (_) {}
    renderView();
  }
  function renderView() {
    document.body.classList.toggle('with-side', S.view === 'dispensa');
    const m = $('#main');
    m.innerHTML = VIEWS[S.view].shell();
    VIEWS[S.view].content();
    renderNav(); renderSide();
    m.scrollTop = 0; window.scrollTo(0, 0);
  }
  function refresh() {
    renderNav();
    if (VIEWS[S.view]) VIEWS[S.view].content();
    renderSide();
    if (S._quick) S._quick();
  }

  // ───────────────────────── Vista: Dispensa ─────────────────────────
  function tagsFor(p, showZone) {
    const t = [];
    if (showZone) t.push(`<span class="tag ${p.zone}">${ic(ZONES[p.zone].icon)}${ZONES[p.zone].label}</span>`);
    if (p.qty <= 0) t.push('<span class="tag danger">Finito</span>');
    else if (isLow(p)) t.push('<span class="tag warn">Quasi finito</span>');
    const d = daysTo(p.expiry);
    if (d !== null && p.qty > 0) {
      if (d < 0) t.push(`<span class="tag danger">${ic('clock')}Scaduto</span>`);
      else if (d === 0) t.push(`<span class="tag danger">${ic('clock')}Scade oggi</span>`);
      else if (d === 1) t.push(`<span class="tag warn">${ic('clock')}Scade domani</span>`);
      else if (d <= EXP_DAYS) t.push(`<span class="tag warn">${ic('clock')}Tra ${d} giorni</span>`);
      else t.push(`<span class="tag">${ic('clock')}${fmtDate(p.expiry)}</span>`);
    }
    return t.join('');
  }
  function prodCard(p, showZone) {
    const cls = [p.qty <= 0 ? 'zero' : '', isLow(p) ? 'low' : ''].join(' ');
    return `<div class="prod ${cls}" data-zone="${p.zone}">
      <button class="main" data-a="edit" data-id="${p.id}"><span class="pname">${esc(p.name)}</span><span class="tags">${tagsFor(p, showZone)}</span></button>
      <div class="qrow">
        <button class="qbtn" data-a="dec" data-id="${p.id}" aria-label="Togli ${esc(p.name)}">${ic('minus')}</button>
        <div class="qty">${fmtQ(p.qty)}<small>${esc(p.unit)}</small></div>
        <button class="qbtn plus" data-a="inc" data-id="${p.id}" aria-label="Aggiungi ${esc(p.name)}">${ic('plus')}</button>
      </div></div>`;
  }
  const VIEWS = {};
  VIEWS.dispensa = {
    shell: () => `
      <div class="head"><div><h1>Dispensa</h1><p id="dsub"></p></div>
        <div class="actions"><button class="btn" data-a="add">${ic('plus')}Aggiungi</button><button class="btn primary" data-a="scan">${ic('scan')}Scansiona</button></div></div>
      <div class="alerts" id="dalerts"></div>
      <div class="toolbar"><div class="chips" id="zchips"></div>
        <div class="search">${ic('search')}<input class="input" id="dq" type="search" placeholder="Cerca un prodotto…" value="${esc(S.q)}" autocomplete="off"></div></div>
      <div id="dlist"></div>`,
    content() {
      const P = S.products, low = lowList(), exp = expList();
      const tot = P.filter((p) => p.qty > 0).length;
      $('#dsub').textContent = P.length ? `${tot} prodotti in casa` : 'Inizia inserendo quello che hai';
      $('#dalerts').innerHTML = (low.length ? `<button class="alert warn ${S.filter === 'low' ? 'on' : ''}" data-a="filter" data-f="low">${ic('cart')}<div><strong>${low.length} da ricomprare</strong><span>${S.filter === 'low' ? 'Tocca per vedere tutto' : 'Finiti o quasi finiti'}</span></div></button>` : '')
        + (exp.length ? `<button class="alert danger ${S.filter === 'exp' ? 'on' : ''}" data-a="filter" data-f="exp">${ic('clock')}<div><strong>${exp.length} in scadenza</strong><span>${S.filter === 'exp' ? 'Tocca per vedere tutto' : `Scaduti o entro ${EXP_DAYS} giorni`}</span></div></button>` : '');
      const cnt = (z) => P.filter((p) => z === 'tutto' || p.zone === z).length;
      $('#zchips').innerHTML = [['tutto', 'Tutto', 'box'], ['frigo', 'Frigo', 'fridge'], ['freezer', 'Freezer', 'snow'], ['dispensa', 'Dispensa', 'jar']]
        .map(([z, l, i]) => `<button class="chip ${S.zone === z ? 'on' : ''}" data-a="zone" data-z="${z}">${ic(i)}${l}<span class="n">${cnt(z)}</span></button>`).join('');

      const el = $('#dlist');
      if (!P.length) {
        el.innerHTML = `<div class="empty">${ic('jar', 'big')}<h3>La dispensa è vuota</h3>
          <p>Il modo più veloce per iniziare: scegli dai prodotti più comuni, poi sistema le quantità. Oppure scansiona i codici a barre uno alla volta.</p>
          <div class="actions"><button class="btn primary" data-a="starter">${ic('zap')}Inizio rapido</button><button class="btn" data-a="scan">${ic('scan')}Scansiona</button><button class="btn" data-a="add">${ic('plus')}Aggiungi a mano</button></div></div>`;
        return;
      }
      const q = norm(S.q);
      let list = P.filter((p) => (S.zone === 'tutto' || p.zone === S.zone) && (!q || norm(p.name).includes(q)));
      if (S.filter === 'low') list = list.filter(isLow);
      if (S.filter === 'exp') list = list.filter(isExp).sort((a, b) => daysTo(a.expiry) - daysTo(b.expiry));
      else list.sort(byName);
      if (!list.length) { el.innerHTML = `<div class="empty">${ic('search', 'big')}<h3>Nessun prodotto trovato</h3><p>Prova a cambiare zona o ricerca.</p><div class="actions"><button class="btn" data-a="add">${ic('plus')}Aggiungi “${esc(S.q || 'nuovo')}”</button></div></div>`; return; }
      if (S.zone === 'tutto' && !S.filter && !q) {
        el.innerHTML = Object.keys(ZONES).map((z) => {
          const items = list.filter((p) => p.zone === z);
          if (!items.length) return '';
          return `<h2 class="sec-title">${ic(ZONES[z].icon, 'zi')}${ZONES[z].label} · ${items.length}</h2><div class="grid">${items.map((p) => prodCard(p, false)).join('')}</div>`;
        }).join('');
      } else {
        el.innerHTML = `<div class="grid" style="margin-top:12px">${list.map((p) => prodCard(p, S.zone === 'tutto')).join('')}</div>`;
      }
    }
  };

  // ───────────────────────── Vista: Spesa ─────────────────────────
  function autoRow(p, compact) {
    return `<div class="li"><button class="check" data-a="bought" data-id="${p.id}" aria-label="Comprato ${esc(p.name)}"></button>
      <div class="txt"><strong>${esc(p.name)}</strong><span>Hai ${fmtQ(p.qty)} ${esc(p.unit)} · ${ZONES[p.zone].label}</span></div>
      ${compact ? '' : `<button class="icon-btn" data-a="skip" data-id="${p.id}" aria-label="Non serve" title="Non serve ricomprarlo">${ic('x')}</button>`}</div>`;
  }
  function manRow(s, compact) {
    return `<div class="li ${s.done ? 'done' : ''}"><button class="check" data-a="toggle-s" data-id="${s.id}" aria-label="Spunta ${esc(s.name)}">${ic('check')}</button>
      <div class="txt"><strong>${esc(s.name)}</strong>${s.note ? `<span>${esc(s.note)}</span>` : ''}</div>
      ${compact ? '' : `<button class="icon-btn" data-a="del-s" data-id="${s.id}" aria-label="Elimina">${ic('trash')}</button>`}</div>`;
  }
  const sortShop = (a, b) => (a.done - b.done) || (a.createdAt || 0) - (b.createdAt || 0);
  VIEWS.spesa = {
    shell: () => `
      <div class="head"><div><h1>Lista della spesa</h1><p id="ssub"></p></div>
        <div class="actions"><button class="btn" data-a="share-list">${ic('share')}Condividi</button></div></div>
      <form class="addbar" data-f="add-shop"><input class="input" name="n" placeholder="Aggiungi qualcosa alla lista…" autocomplete="off" enterkeyhint="done"><button class="btn primary">${ic('plus')}<span>Aggiungi</span></button></form>
      <div id="slist"></div>`,
    content() {
      const low = lowList(), man = S.shopping.slice().sort(sortShop), done = man.filter((s) => s.done).length;
      $('#ssub').textContent = low.length + openShopping().length ? `${low.length + openShopping().length} cose da prendere` : 'Non manca niente';
      let h = '';
      if (low.length) h += `<h2 class="sec-title">${ic('alert', 'zi')}Da ricomprare · dalla dispensa</h2><div class="list">${low.map((p) => autoRow(p)).join('')}</div>
        <p class="muted" style="font-size:.82rem;margin:8px 4px 0">Spunta quando l'hai comprato: la quantità in dispensa si aggiorna da sola.</p>`;
      if (man.length) h += `<h2 class="sec-title">${ic('cart', 'zi')}Altre cose</h2><div class="list">${man.map((s) => manRow(s)).join('')}</div>
        ${done ? `<div style="margin-top:10px"><button class="btn ghost" data-a="clear-done">${ic('trash')}Togli le cose spuntate (${done})</button></div>` : ''}`;
      if (!h) h = `<div class="empty">${ic('check', 'big')}<h3>Tutto a posto</h3><p>Quando un prodotto finisce o scende sotto la scorta minima comparirà qui da solo.</p></div>`;
      $('#slist').innerHTML = h;
    }
  };
  function renderSide() {
    const side = $('#side');
    if (S.view !== 'dispensa') { side.innerHTML = ''; return; }
    const low = lowList(), man = S.shopping.slice().sort(sortShop);
    side.innerHTML = `<h2>Lista della spesa</h2><div class="sub">${low.length + openShopping().length} cose da prendere</div>
      ${low.length ? `<h3 class="sec-title mt0">Dalla dispensa</h3><div class="list">${low.map((p) => autoRow(p, true)).join('')}</div>` : ''}
      ${man.length ? `<h3 class="sec-title">Altre cose</h3><div class="list">${man.map((s) => manRow(s, true)).join('')}</div>` : ''}
      ${!low.length && !man.length ? '<p class="muted">Non manca niente.</p>' : ''}
      <form class="addbar" data-f="add-shop" style="margin-top:14px"><input class="input" name="n" placeholder="Aggiungi…" autocomplete="off"><button class="btn primary" aria-label="Aggiungi">${ic('plus')}</button></form>
      <button class="btn block" data-a="go" data-v="spesa">Apri la lista completa</button>`;
  }
  function addShop(name, note) {
    name = (name || '').trim(); if (!name) return false;
    if (S.shopping.some((s) => !s.done && norm(s.name) === norm(name))) return false;
    Store.put('shopping', { id: uid(), name, note: note || '', done: false, createdAt: Date.now() });
    return true;
  }
  async function shareList() {
    const lines = lowList().map((p) => '• ' + p.name).concat(openShopping().map((s) => '• ' + s.name));
    if (!lines.length) return toast('La lista è vuota');
    const text = 'Lista della spesa\n' + lines.join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'Lista della spesa', text });
      else { await navigator.clipboard.writeText(text); toast('Lista copiata: incollala dove vuoi'); }
    } catch (_) {}
  }
  function openBought(p) {
    const step = stepOf(p);
    const def = Math.max(step, round((p.min || 0) - p.qty + step));
    const ov = openSheet({
      title: 'Comprato: ' + p.name,
      body: `<div class="field"><span class="lbl">Quanto ne hai comprato?</span>
        <div class="stepper"><button class="qbtn" type="button" data-s="-">${ic('minus')}</button><input class="input" name="q" type="number" inputmode="decimal" min="0" step="any" value="${def}"><button class="qbtn plus" type="button" data-s="+">${ic('plus')}</button><span style="min-width:40px;font-weight:700">${esc(p.unit)}</span></div></div>
        <div class="field"><label>Nuova scadenza <span class="muted">(facoltativa)</span></label><input class="input" name="e" type="date" value=""></div>`,
      foot: `<button class="btn" data-a="close-sheet">Annulla</button><button class="btn primary" data-c="ok">${ic('check')}Fatto</button>`
    });
    const qi = ov.querySelector('[name=q]');
    ov.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { qi.value = Math.max(0, round((+qi.value || 0) + (b.dataset.s === '+' ? step : -step))); });
    ov.querySelector('[data-c=ok]').onclick = () => {
      const q = +qi.value || 0, e = ov.querySelector('[name=e]').value;
      const extra = { skip: false }; if (e) extra.expiry = e;
      closeSheet(); Store.inc(p.id, q, extra); toast(`${p.name}: ora ne hai ${fmtQ(getP(p.id).qty)} ${p.unit}`);
    };
  }

  // ───────────────────────── Vista: Ricette ─────────────────────────
  VIEWS.ricette = {
    shell: () => `
      <div class="head"><div><h1>Ricette</h1><p id="rsub"></p></div>
        <div class="actions"><button class="btn primary" data-a="new-recipe">${ic('plus')}Ricetta di mamma</button></div></div>
      <div class="toolbar">
        <div class="chips" id="rmodes"></div>
        <div class="chips" id="rcats"></div>
        <div class="search">${ic('search')}<input class="input" id="rq" type="search" placeholder="Cerca una ricetta o un ingrediente…" value="${esc(S.rq)}" autocomplete="off"></div>
      </div>
      <div id="rnote"></div>
      <div class="rgrid" id="rlist" style="margin-top:12px"></div>`,
    content() {
      const pantry = pantryIndex();
      const all = allRecipes().map((r) => ({ r, m: matchRecipe(r, pantry) }));
      const ready = all.filter((x) => x.m.missing.length === 0).length;
      $('#rsub').textContent = `${all.length} ricette · ${ready} si possono fare con quello che hai`;
      const modes = [['tutte', 'Tutte', 'book'], ['pronte', `Si possono fare · ${ready}`, 'check'], ['quasi', 'Manca poco', 'cart'], ['mamma', 'Di mamma', 'heart']];
      $('#rmodes').innerHTML = modes.map(([k, l, i]) => `<button class="chip ${S.rmode === k ? 'on' : ''}" data-a="rmode" data-k="${k}">${ic(i)}${l}</button>`).join('');
      $('#rcats').innerHTML = CATS.map((c) => `<button class="chip ${S.rcat === c ? 'on' : ''}" data-a="rcat" data-c="${c}">${c}</button>`).join('');
      $('#rnote').innerHTML = S.products.length ? '' : `<div class="alert warn">${ic('alert')}<div><strong>La dispensa è vuota</strong><span>Inserisci i prodotti e qui vedrai subito cosa puoi cucinare.</span></div></div>`;
      const q = norm(S.rq);
      let list = all.filter(({ r, m }) =>
        (S.rcat === 'Tutte' || r.c === S.rcat) &&
        (S.rmode !== 'pronte' || m.missing.length === 0) &&
        (S.rmode !== 'quasi' || (m.missing.length > 0 && m.missing.length <= 2)) &&
        (S.rmode !== 'mamma' || r.custom) &&
        (!q || norm(r.t).includes(q) || r.ings.some((g) => norm(g.label).includes(q))));
      list.sort((a, b) => (a.m.missing.length === 0 ? 0 : 1) - (b.m.missing.length === 0 ? 0 : 1)
        || (b.m.have / (b.m.total || 1)) - (a.m.have / (a.m.total || 1)) || a.m.missing.length - b.m.missing.length || a.r.t.localeCompare(b.r.t, 'it'));
      const el = $('#rlist');
      if (!list.length) {
        el.innerHTML = `<div class="empty" style="grid-column:1/-1">${ic(S.rmode === 'mamma' ? 'heart' : 'book', 'big')}<h3>${S.rmode === 'mamma' ? 'Nessuna ricetta di mamma, per ora' : 'Nessuna ricetta trovata'}</h3>
          <p>${S.rmode === 'mamma' ? 'Aggiungi le ricette di famiglia: compariranno qui e verranno abbinate alla dispensa come le altre.' : 'Prova a cambiare filtro o categoria.'}</p>
          ${S.rmode === 'mamma' ? `<div class="actions"><button class="btn primary" data-a="new-recipe">${ic('plus')}Aggiungi una ricetta</button></div>` : ''}</div>`;
        return;
      }
      el.innerHTML = list.map(({ r, m }) => {
        const full = m.missing.length === 0;
        const pct = Math.round((m.have / (m.total || 1)) * 100);
        const miss = m.missing.slice(0, 3).map((g) => shortLabel(g.label).toLowerCase()).join(', ') + (m.missing.length > 3 ? '…' : '');
        return `<button class="rcard" data-a="recipe" data-id="${r.id}">
          <h3>${esc(r.t)}</h3>
          <div class="meta"><span class="tag">${esc(r.c)}</span>${r.min ? `<span class="tag">${ic('clock')}${r.min} min</span>` : ''}${r.custom ? `<span class="tag ok">${ic('heart')}${esc(r.author)}</span>` : ''}</div>
          <div class="match"><span>${full ? 'Hai tutto quello che serve' : `Hai ${m.have} di ${m.total} · manca ${esc(miss)}`}</span><div class="bar"><i class="${full ? 'full' : ''}" style="width:${pct}%"></i></div></div>
        </button>`;
      }).join('');
    }
  };
  function openRecipe(id) {
    const r = allRecipes().find((x) => x.id === id); if (!r) return;
    const m = matchRecipe(r, pantryIndex());
    const li = m.ings.map((g) => {
      const cls = g.base ? 'base' : g.opt ? (g.have ? 'have' : 'opt') : g.have ? 'have' : 'miss';
      const mark = cls === 'have' ? ic('check') : cls === 'miss' ? ic('x') : ic('minus');
      const note = g.base ? 'di base' : g.opt ? 'facoltativo' : g.have ? 'in casa' : 'da comprare';
      return `<li class="${cls}"><span class="st">${mark}</span><span>${esc(g.label)}</span><small>${note}</small></li>`;
    }).join('');
    const ov = openSheet({
      title: r.t, wide: true,
      body: `<div class="meta" style="display:flex;gap:6px;flex-wrap:wrap"><span class="tag">${esc(r.c)}</span>${r.min ? `<span class="tag">${ic('clock')}${r.min} min</span>` : ''}${r.p ? `<span class="tag">${ic('users')}${r.p} persone</span>` : ''}${r.custom ? `<span class="tag ok">${ic('heart')}${esc(r.author)}</span>` : ''}</div>
        <div><h3 class="sec-title mt0">Ingredienti</h3><ul class="ings">${li}</ul></div>
        ${m.missing.length ? `<button class="btn" data-c="miss">${ic('cart')}Aggiungi i ${m.missing.length} mancanti alla spesa</button>` : `<div class="status">${ic('check')}<span>Hai tutto quello che serve. Buon appetito!</span></div>`}
        <div><h3 class="sec-title mt0">Preparazione</h3><ol class="steps">${r.s.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol></div>`,
      foot: r.custom ? `<button class="btn danger" data-c="del">${ic('trash')}Elimina</button><button class="btn" data-c="edit">${ic('edit')}Modifica</button>` : ''
    });
    const mb = ov.querySelector('[data-c=miss]');
    if (mb) mb.onclick = () => { let n = 0; m.missing.forEach((g) => { if (addShop(shortLabel(g.label), 'per ' + r.t)) n++; }); toast(n ? `Aggiunti ${n} ingredienti alla spesa` : 'Erano già in lista'); };
    if (r.custom) {
      ov.querySelector('[data-c=edit]').onclick = () => { closeSheet(); openRecipeForm(S.recipes.find((x) => x.id === id)); };
      ov.querySelector('[data-c=del]').onclick = async () => {
        if (await confirmBox({ title: 'Eliminare la ricetta?', text: `“${r.t}” verrà eliminata su tutti i dispositivi.`, ok: 'Elimina', danger: true })) { closeSheet(); Store.del('recipes', id); toast('Ricetta eliminata'); }
      };
    }
  }
  function openRecipeForm(r) {
    const e = r || { t: '', c: 'Primi', min: '', p: 4, ing: [], s: [], author: 'Mamma' };
    const ov = openSheet({
      title: r ? 'Modifica ricetta' : 'Nuova ricetta', wide: true,
      body: `<form class="form" data-f="recipe">
        <div class="field"><label>Nome della ricetta</label><input class="input" name="t" required value="${esc(e.t)}" placeholder="Es. Lasagne della nonna"></div>
        <div class="row3">
          <div class="field"><label>Categoria</label><select class="input" name="c">${CATS.slice(1).map((c) => `<option ${c === e.c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label>Minuti</label><input class="input" name="min" type="number" inputmode="numeric" min="0" value="${esc(e.min)}"></div>
          <div class="field"><label>Persone</label><input class="input" name="p" type="number" inputmode="numeric" min="1" value="${esc(e.p)}"></div>
        </div>
        <div class="field"><label>Ingredienti</label><textarea class="input" name="ing" rows="6" placeholder="Uno per riga, prima il nome:\nSpaghetti 320 g\nUova 4\nGuanciale 150 g\nPecorino 60 g">${esc((e.ing || []).join('\n'))}</textarea>
          <span class="hint">Scrivi prima il nome dell'ingrediente: serve per capire se ce l'hai in casa. Metti “(facoltativo)” se non è indispensabile.</span></div>
        <div class="field"><label>Preparazione</label><textarea class="input" name="s" rows="7" placeholder="Un passaggio per riga">${esc((e.s || []).join('\n'))}</textarea></div>
        <div class="field"><label>Scritta da</label><input class="input" name="author" value="${esc(e.author || 'Mamma')}"></div>
      </form>`,
      foot: `<button class="btn" data-a="close-sheet">Annulla</button><button class="btn primary" data-c="ok">${ic('check')}Salva ricetta</button>`
    });
    ov.querySelector('[data-c=ok]').onclick = () => {
      const f = ov.querySelector('form');
      const t = f.t.value.trim(); if (!t) { f.t.focus(); return toast('Scrivi il nome della ricetta'); }
      const lines = (v) => v.split('\n').map((x) => x.trim()).filter(Boolean);
      const obj = { id: (r && r.id) || 'm_' + uid(), t, c: f.c.value, min: +f.min.value || 0, p: +f.p.value || 0, ing: lines(f.ing.value), s: lines(f.s.value), author: f.author.value.trim() || 'Mamma', createdAt: (r && r.createdAt) || Date.now() };
      Store.put('recipes', obj); closeSheet(); toast('Ricetta salvata');
      if (S.view === 'ricette') { S.rmode = 'mamma'; refresh(); }
    };
  }

  // ───────────────────────── Prodotto: form e azioni ─────────────────────────
  function openProductForm(init = {}, notice) {
    const editing = !!init.id;
    const p = { name: '', zone: S.zone !== 'tutto' ? S.zone : 'frigo', qty: 1, unit: 'pz', step: '', min: 0, expiry: '', barcode: '', ...init };
    const stepVal = p.step || stepOf(p);
    const ov = openSheet({
      title: editing ? 'Modifica prodotto' : 'Nuovo prodotto',
      body: `${notice ? `<div class="status">${ic('alert')}<span>${esc(notice)}</span></div>` : ''}
      <form class="form" data-f="product">
        <div class="field"><label>Nome</label><input class="input" name="name" required value="${esc(p.name)}" placeholder="Es. Latte intero" autocomplete="off"></div>
        <div class="field"><span class="lbl">Dove si trova</span><div class="seg" data-seg="zone">${Object.entries(ZONES).map(([k, z]) => `<button type="button" data-v="${k}" class="${p.zone === k ? 'on' : ''}">${ic(z.icon)}${z.label}</button>`).join('')}</div></div>
        <div class="row">
          <div class="field"><label>Quantità</label><div class="stepper"><button class="qbtn" type="button" data-s="-">${ic('minus')}</button><input class="input" name="qty" type="number" inputmode="decimal" min="0" step="any" value="${p.qty}"><button class="qbtn plus" type="button" data-s="+">${ic('plus')}</button></div></div>
          <div class="field"><label>Unità</label><select class="input" name="unit">${UNITS.map((u) => `<option ${u === p.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        </div>
        <div class="row">
          <div class="field"><label>Avvisami quando ne restano</label><input class="input" name="min" type="number" inputmode="decimal" min="0" step="any" value="${p.min ?? 0}"><span class="hint">o meno → va nella spesa</span></div>
          <div class="field"><label>Ogni tocco di − / +</label><input class="input" name="step" type="number" inputmode="decimal" min="0" step="any" value="${stepVal}"><span class="hint">Es. 100 per i grammi</span></div>
        </div>
        <div class="field"><label>Scadenza <span class="muted">(facoltativa)</span></label><div style="display:flex;gap:8px"><input class="input" name="expiry" type="date" value="${esc(p.expiry || '')}"><button class="btn" type="button" data-c="noexp">Nessuna</button></div></div>
        <div class="field"><label>Codice a barre <span class="muted">(facoltativo)</span></label><div style="display:flex;gap:8px"><input class="input" name="barcode" inputmode="numeric" value="${esc(p.barcode || '')}" placeholder="—"><button class="btn" type="button" data-c="scan">${ic('scan')}</button></div></div>
      </form>`,
      foot: `${editing ? `<button class="btn danger" data-c="del">${ic('trash')}Elimina</button>` : '<button class="btn" data-a="close-sheet">Annulla</button>'}<button class="btn primary" data-c="ok">${ic('check')}Salva</button>`
    });
    const f = ov.querySelector('form');
    let zone = p.zone, stepTouched = !!init.step;
    ov.querySelectorAll('[data-seg=zone] button').forEach((b) => b.onclick = () => { zone = b.dataset.v; ov.querySelectorAll('[data-seg=zone] button').forEach((x) => x.classList.toggle('on', x === b)); });
    ov.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { const st = +f.step.value || 1; f.qty.value = Math.max(0, round((+f.qty.value || 0) + (b.dataset.s === '+' ? st : -st))); });
    f.step.oninput = () => { stepTouched = true; };
    f.unit.onchange = () => { if (!stepTouched) f.step.value = ['g', 'ml'].includes(f.unit.value) ? 100 : 1; };
    ov.querySelector('[data-c=noexp]').onclick = () => { f.expiry.value = ''; };
    ov.querySelector('[data-c=scan]').onclick = () => openScanner((code) => { f.barcode.value = code; });
    if (!editing && !p.name) setTimeout(() => f.name.focus(), 250);
    if (editing) ov.querySelector('[data-c=del]').onclick = async () => {
      if (await confirmBox({ title: 'Eliminare il prodotto?', text: `“${p.name}” verrà tolto dalla dispensa.`, ok: 'Elimina', danger: true })) { closeSheet(); Store.del('products', p.id); toast('Prodotto eliminato'); }
    };
    ov.querySelector('[data-c=ok]').onclick = async () => {
      const name = f.name.value.trim(); if (!name) { f.name.focus(); return toast('Scrivi il nome del prodotto'); }
      const obj = { ...p, id: p.id || uid(), name, zone, qty: Math.max(0, +f.qty.value || 0), unit: f.unit.value, step: +f.step.value || 1, min: Math.max(0, +f.min.value || 0), expiry: f.expiry.value || '', barcode: f.barcode.value.trim() };
      if (obj.qty > obj.min) obj.skip = false;
      if (!editing) {
        const dup = S.products.find((x) => x.zone === zone && norm(x.name) === norm(name));
        if (dup) {
          const add = await confirmBox({ title: 'Prodotto già presente', text: `“${dup.name}” c'è già in ${ZONES[zone].label} (${fmtQ(dup.qty)} ${dup.unit}). Aggiungo ${fmtQ(obj.qty)} alla quantità?`, ok: 'Sì, aggiungi' });
          if (!add) return;
          closeSheet();
          const extra = {}; if (obj.barcode && !dup.barcode) extra.barcode = obj.barcode; if (obj.expiry) extra.expiry = obj.expiry;
          Store.inc(dup.id, obj.qty, extra); toast(`${dup.name}: ${fmtQ(getP(dup.id).qty)} ${dup.unit}`);
          return;
        }
      }
      closeSheet();
      Store.put('products', obj);
      if (obj.barcode) Store.put('barcodes', { id: obj.barcode, name: obj.name, zone: obj.zone, unit: obj.unit, step: obj.step, min: obj.min });
      toast(editing ? 'Salvato' : `${obj.name} aggiunto`);
    };
  }

  function openQuick(p) {
    const step = stepOf(p);
    const ov = openSheet({
      title: p.name,
      body: `<div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap" id="qtags"></div>
        <div class="big-qty" id="qq"></div>
        <div class="big-actions">
          <button class="btn lg" data-c="dec">${ic('minus')}Consumato ${fmtQ(step)}</button>
          <button class="btn lg primary" data-c="inc">${ic('plus')}Aggiunto ${fmtQ(step)}</button>
        </div>
        <button class="btn ghost" data-c="edit">${ic('edit')}Modifica scadenza, zona, quantità…</button>`,
      onClose: () => { S._quick = null; }
    });
    S._quick = () => {
      const x = getP(p.id); if (!x) return;
      $('#qq', ov).innerHTML = `${fmtQ(x.qty)} <small>${esc(x.unit)}</small>`;
      $('#qtags', ov).innerHTML = tagsFor(x, true);
    };
    S._quick();
    ov.querySelector('[data-c=dec]').onclick = () => changeQty(p.id, -1);
    ov.querySelector('[data-c=inc]').onclick = () => Store.inc(p.id, step);
    ov.querySelector('[data-c=edit]').onclick = () => { closeSheet(); openProductForm(getP(p.id)); };
  }

  // ───────────────────────── Scanner codici a barre ─────────────────────────
  function openScanner(onCode) {
    let scanner = null, done = false;
    const stop = async () => { try { if (scanner) { if (scanner.isScanning) await scanner.stop(); scanner.clear(); } } catch (_) {} scanner = null; };
    const finish = (code) => {
      code = String(code || '').replace(/\s+/g, ''); if (!code || done) return; done = true;
      if (navigator.vibrate) navigator.vibrate(60);
      stop().then(() => { closeSheet(); onCode(code); });
    };
    const ov = openSheet({
      title: 'Scansiona il codice a barre',
      body: `<div class="scanbox"><div id="reader"></div><div class="msg" id="scanmsg">Avvio della fotocamera…</div></div>
        <p class="muted mt0" style="font-size:.85rem;margin:0">Inquadra il codice a barre in orizzontale, con buona luce.</p>
        <form class="addbar" data-f="none" style="margin:0"><input class="input" name="code" inputmode="numeric" placeholder="Oppure scrivi i numeri del codice" autocomplete="off"><button class="btn primary">Cerca</button></form>`,
      onClose: () => { done = true; stop(); }
    });
    ov.querySelector('form').onsubmit = (e) => { e.preventDefault(); finish(e.target.code.value); };
    const msg = (t) => { const m = $('#scanmsg', ov); if (m) { m.textContent = t; m.style.display = t ? '' : 'none'; } };
    (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return msg('Fotocamera non disponibile qui. Scrivi il codice qui sotto.');
      try { await loadScript(QR_URL); } catch (_) { return msg('Lo scanner si scarica da internet la prima volta: collegati e riprova. Intanto puoi scrivere il codice qui sotto.'); }
      if (done) return;
      try {
        const F = window.Html5QrcodeSupportedFormats || {};
        const formats = [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF].filter((x) => x !== undefined);
        scanner = new window.Html5Qrcode('reader', { formatsToSupport: formats.length ? formats : undefined, verbose: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
        await scanner.start({ facingMode: 'environment' },
          { fps: 12, qrbox: (w, h) => ({ width: Math.floor(Math.min(w * 0.88, 340)), height: Math.floor(Math.min(h * 0.5, 170)) }) },
          (text) => finish(text), () => {});
        msg('');
        if (done) stop();
      } catch (e) {
        console.error(e);
        msg('Non riesco ad aprire la fotocamera. Controlla di aver dato il permesso al browser, poi riprova.');
      }
    })();
  }
  async function lookupOFF(code) {
    if (!navigator.onLine) return '';
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name_it,product_name,generic_name_it,brands`, { signal: ctl.signal });
      clearTimeout(t);
      const j = await r.json();
      if (j.status !== 1 || !j.product) return '';
      const pr = j.product;
      const name = (pr.product_name_it || pr.product_name || pr.generic_name_it || '').trim();
      const brand = (pr.brands || '').split(',')[0].trim();
      if (!name) return brand;
      return brand && !norm(name).includes(norm(brand)) ? `${name} ${brand}` : name;
    } catch (_) { return ''; }
  }
  async function handleBarcode(code) {
    const p = S.products.find((x) => x.barcode === code);
    if (p) return openQuick(p);
    const known = S.barcodes.find((b) => b.id === code);
    if (known) return openProductForm({ name: known.name, zone: known.zone, unit: known.unit, step: known.step, min: known.min, barcode: code, qty: 1 });
    toast('Cerco il prodotto…');
    const name = await lookupOFF(code);
    openProductForm({ name, barcode: code, qty: 1 }, name ? 'Nome trovato su Open Food Facts: controllalo e scegli dove metterlo.' : 'Prodotto non trovato: scrivi tu il nome. La prossima volta lo riconoscerò da solo.');
  }

  // ───────────────────────── Inizio rapido ─────────────────────────
  function openStarter() {
    const have = new Set(S.products.map((p) => norm(p.name)));
    const ST = window.STARTER || {};
    const body = Object.keys(ZONES).map((z) => {
      const items = (ST[z] || []).filter(([n]) => !have.has(norm(n)));
      if (!items.length) return '';
      return `<div><h3 class="sec-title mt0">${ic(ZONES[z].icon, 'zi')}${ZONES[z].label}</h3><div class="pick">${items.map(([n, u, st, mn], i) =>
        `<label><input type="checkbox" data-z="${z}" data-i="${(ST[z] || []).findIndex((x) => x[0] === n)}"><span>${esc(n)}</span></label>`).join('')}</div></div>`;
    }).join('');
    const ov = openSheet({
      title: 'Inizio rapido', wide: true,
      body: `<p class="mt0">Spunta quello che hai in casa adesso. Dopo potrai sistemare quantità e scadenze toccando ogni prodotto.</p>${body || '<p>Hai già inserito tutti i prodotti comuni.</p>'}`,
      foot: `<button class="btn" data-a="close-sheet">Annulla</button><button class="btn primary" data-c="ok">${ic('check')}<span id="stn">Aggiungi</span></button>`
    });
    const upd = () => { const n = ov.querySelectorAll('input:checked').length; $('#stn', ov).textContent = n ? `Aggiungi ${n} prodotti` : 'Aggiungi'; };
    ov.addEventListener('change', upd);
    ov.querySelector('[data-c=ok]').onclick = () => {
      const sel = Array.from(ov.querySelectorAll('input:checked')).map((i) => { const [n, u, st, mn] = ST[i.dataset.z][+i.dataset.i]; return { id: uid(), name: n, zone: i.dataset.z, unit: u, step: st, min: mn, qty: round(mn + st), expiry: '', barcode: '' }; });
      if (!sel.length) return toast('Spunta almeno un prodotto');
      closeSheet(); Store.putMany('products', sel); toast(`Aggiunti ${sel.length} prodotti: ora sistema le quantità`);
    };
  }

  // ───────────────────────── Vista: Impostazioni ─────────────────────────
  VIEWS.impostazioni = {
    shell: () => `<div class="head"><div><h1>Impostazioni</h1><p>Account, notifiche e dati</p></div></div><div class="cards" id="setc"></div>`,
    content() {
      const cfg = window.FIREBASE_CONFIG || {};
      let acc;
      if (!cfg.apiKey) acc = `<div class="status"><span class="dot"></span><span>Solo su questo dispositivo</span></div>
        <p>Per avere gli stessi dati su tablet e cellulare va collegato Firebase (gratis). Segui il <strong>passo 2 della guida</strong>, poi ricarica l'app.</p>`;
      else if (S.fb === 'loading') acc = '<div class="status"><span class="dot warn"></span><span>Connessione a Firebase…</span></div>';
      else if (S.fb === 'error') acc = `<div class="status"><span class="dot warn"></span><span>Non riesco a caricare Firebase</span></div><p>La prima volta serve internet. Collegati e riprova.</p><button class="btn" data-a="retry-fb">Riprova</button>`;
      else if (!S.user) acc = `<p>Accedi con l'account di casa: tu e la mamma usate <strong>la stessa email e password</strong> su tutti i dispositivi.</p>
        <form class="form" data-f="auth"><input class="input" name="email" type="email" placeholder="Email" autocomplete="username" required>
        <input class="input" name="pw" type="password" placeholder="Password (almeno 6 caratteri)" autocomplete="current-password" required>
        <div class="row"><button class="btn primary" data-k="login">Accedi</button><button class="btn" data-k="register" type="button">Crea account</button></div></form>
        <p class="note">“Crea account” serve solo la prima volta, su un dispositivo. Sugli altri usa “Accedi”.</p>`;
      else acc = `<div class="status"><span class="dot ${S.online ? 'ok' : 'warn'}"></span><span>${S.online ? 'Sincronizzato' : 'Offline: le modifiche partono appena torna internet'}<br><strong>${esc(S.user.email)}</strong></span></div>
        <button class="btn" data-a="logout">Esci da questo dispositivo</button>`;

      const perm = 'Notification' in window ? Notification.permission : 'unsupported';
      const pushTok = LS.get('dd_push', null);
      let notif = '<p>Ricevi un avviso quando qualcosa sta finendo o sta per scadere.</p>';
      if (perm === 'unsupported') notif += `<div class="status">${ic('alert')}<span>${isIOS ? 'Su iPhone le notifiche funzionano solo dall\'app aggiunta alla schermata Home (iOS 16.4 o più recente).' : 'Questo browser non supporta le notifiche.'}</span></div>`;
      else if (perm === 'denied') notif += `<div class="status">${ic('alert')}<span>Notifiche bloccate. Riattivale dalle impostazioni del browser per questo sito.</span></div>`;
      else {
        notif += `<div class="status"><span class="dot ${perm === 'granted' ? 'ok' : ''}"></span><span>${pushTok ? 'Push attive su questo dispositivo' : perm === 'granted' ? 'Avvisi all\'apertura dell\'app attivi' : 'Non ancora attive'}</span></div>`;
        if (!pushTok) notif += `<button class="btn primary" data-a="push">${ic('bell')}Attiva notifiche</button>`;
        if (perm === 'granted') notif += `<button class="btn" data-a="test-notif">Invia una notifica di prova</button>`;
        notif += `<p class="note">Le push arrivano una volta al giorno con il riepilogo (serve il login e il passo 4 della guida).</p>`;
      }

      const inst = isStandalone() ? '<div class="status"><span class="dot ok"></span><span>App installata</span></div>'
        : `${installPrompt ? `<button class="btn primary" data-a="install">${ic('download')}Installa l'app</button>` : ''}
          <p><strong>Android:</strong> menu ⋮ di Chrome → “Installa app” o “Aggiungi a schermata Home”.</p>
          <p><strong>iPhone:</strong> in Safari tocca Condividi → “Aggiungi alla schermata Home”.</p>`;

      $('#setc').innerHTML = `
        <section class="panel"><h2>${ic('cloud')}Account di casa</h2>${acc}</section>
        <section class="panel"><h2>${ic('bell')}Notifiche</h2>${notif}</section>
        <section class="panel"><h2>${ic('text')}Lettura</h2>
          <label class="switch"><span>Testo più grande</span><input type="checkbox" data-a="big" ${S.prefs.big ? 'checked' : ''}></label>
          <p class="note">Vale solo per questo dispositivo.</p></section>
        <section class="panel"><h2>${ic('phone')}Installa sul dispositivo</h2>${inst}<p class="note">Una volta installata funziona anche senza internet.</p></section>
        <section class="panel"><h2>${ic('download')}Dati</h2>
          <button class="btn" data-a="starter">${ic('zap')}Inizio rapido: prodotti comuni</button>
          <button class="btn" data-a="export">${ic('download')}Scarica un backup</button>
          <button class="btn" data-a="import">${ic('upload')}Ripristina da backup</button>
          <input type="file" id="impf" accept="application/json,.json" hidden>
          <p class="note">${S.products.length} prodotti · ${S.shopping.length} voci in lista · ${S.recipes.length} ricette di mamma</p></section>`;
    }
  };
  function exportData() {
    const data = { app: 'dispensa', v: 1, exportedAt: new Date().toISOString() };
    COLS.forEach((c) => { data[c] = S[c]; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = `dispensa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function importData(file) {
    try {
      const d = JSON.parse(await file.text());
      if (d.app !== 'dispensa') throw new Error('file non valido');
      const n = (d.products || []).length;
      if (!(await confirmBox({ title: 'Ripristinare il backup?', text: `Il backup contiene ${n} prodotti. Verranno uniti ai dati attuali (quelli con lo stesso codice vengono sostituiti).`, ok: 'Ripristina' }))) return;
      COLS.forEach((c) => { if (Array.isArray(d[c]) && d[c].length) Store.putMany(c, d[c]); });
      toast('Backup ripristinato');
    } catch (e) { toast('Impossibile leggere il backup: ' + e.message); }
  }

  // ───────────────────────── Eventi ─────────────────────────
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, id = b.dataset.id;
    switch (a) {
      case 'go': go(b.dataset.v); break;
      case 'close-sheet': closeSheet(); break;
      case 'zone': S.zone = b.dataset.z; refresh(); break;
      case 'filter': S.filter = S.filter === b.dataset.f ? null : b.dataset.f; if (S.filter) S.zone = 'tutto'; refresh(); break;
      case 'inc': Store.inc(id, stepOf(getP(id))); break;
      case 'dec': changeQty(id, -1); break;
      case 'edit': openProductForm(getP(id)); break;
      case 'add': openProductForm(S.view === 'dispensa' && S.q ? { name: S.q } : {}); break;
      case 'scan': openScanner(handleBarcode); break;
      case 'starter': openStarter(); break;
      case 'bought': openBought(getP(id)); break;
      case 'skip': { const p = getP(id); Store.put('products', { ...p, skip: true }); toast(`${p.name} tolto dalla lista`, () => Store.put('products', { ...getP(id), skip: false })); break; }
      case 'toggle-s': { const s = S.shopping.find((x) => x.id === id); if (s) Store.put('shopping', { ...s, done: !s.done }); break; }
      case 'del-s': { const s = S.shopping.find((x) => x.id === id); Store.del('shopping', id); toast(`${s.name} eliminato`, () => Store.put('shopping', s)); break; }
      case 'clear-done': S.shopping.filter((s) => s.done).forEach((s) => Store.del('shopping', s.id)); break;
      case 'share-list': shareList(); break;
      case 'rmode': S.rmode = b.dataset.k; refresh(); break;
      case 'rcat': S.rcat = b.dataset.c; refresh(); break;
      case 'recipe': openRecipe(id); break;
      case 'new-recipe': openRecipeForm(); break;
      case 'logout': if (await confirmBox({ title: 'Uscire?', text: 'Su questo dispositivo non vedrai più i dati di casa finché non accedi di nuovo.', ok: 'Esci' })) { LS.set('dd_push', null); firebase.auth().signOut(); } break;
      case 'retry-fb': initFirebase(); break;
      case 'push': enablePush(); break;
      case 'test-notif': testNotif(); break;
      case 'install': if (installPrompt) { installPrompt.prompt(); installPrompt = null; } break;
      case 'export': exportData(); break;
      case 'import': $('#impf').click(); break;
      case 'big': break;
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-a=big]')) { S.prefs.big = e.target.checked; LS.set('dd_prefs', S.prefs); document.documentElement.classList.toggle('big', S.prefs.big); }
    if (e.target.id === 'impf' && e.target.files[0]) { importData(e.target.files[0]); e.target.value = ''; }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'dq') { S.q = e.target.value; VIEWS.dispensa.content(); }
    if (e.target.id === 'rq') { S.rq = e.target.value; VIEWS.ricette.content(); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target; const k = f.dataset.f; if (!k) return;
    if (k === 'none') return;
    e.preventDefault();
    if (k === 'add-shop') { const v = f.n.value; if (addShop(v)) { f.n.value = ''; f.n.focus(); toast(`${v.trim()} aggiunto alla lista`); } else if (v.trim()) toast('È già nella lista'); }
    if (k === 'auth') { const btn = e.submitter && e.submitter.dataset.k; doAuth(btn === 'register' ? 'register' : 'login', f.email.value.trim(), f.pw.value); }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k=register]'); if (!b) return;
    const f = b.closest('form'); if (!f.reportValidity()) return;
    doAuth('register', f.email.value.trim(), f.pw.value);
  });
  window.addEventListener('online', () => { S.online = true; refresh(); if (S.fb === 'error') initFirebase(); });
  window.addEventListener('offline', () => { S.online = false; refresh(); });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (S.view === 'impostazioni') refresh(); });
  window.addEventListener('storage', (e) => { if (S.mode === 'local' && e.key && e.key.startsWith('dd_')) { Store.loadLocal(); refresh(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.view === 'dispensa') refresh(); });

  // ───────────────────────── Avvio ─────────────────────────
  document.documentElement.classList.toggle('big', !!S.prefs.big);
  Store.loadLocal();
  go((location.hash || '#dispensa').slice(1));
  initFirebase();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(() => setTimeout(openReminder, 2500)).catch((e) => console.warn('SW', e));
  }
  window.__dispensa = { S, Store, matchRecipe, allRecipes, pantryIndex };
})();
