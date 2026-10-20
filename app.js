// Ecolodges Domaine les Oyats — visionneuse 3D (DreamFly)
// Menu + routage par hash ; three.js chargé à la demande via l'importmap.

const MODELES = ['sirius24', 'sirius40'];
const EMBED = window.__EMBED__ || null; // version hors ligne : JSON + GLB intégrés
// nuancier de secours si le JSON n'en fournit pas (identique aux models/*.json du 13/10/2026)
const TEINTES_DEFAUT = [
  { ral: '6019', hex: '#A1C3A9', nom: 'Vert pastel', menuiserie: 'gris clair' },
  { ral: '1014', hex: '#F6EACE', nom: 'Ivoire', menuiserie: 'noir' },
  { ral: '1001', hex: '#DCB68C', nom: 'Beige', menuiserie: 'gris clair' },
  { ral: '7032', hex: '#D0C8BE', nom: 'Gris silex', menuiserie: 'noir' },
  { ral: '5024', hex: '#62A1D7', nom: 'Bleu pastel', menuiserie: 'blanc' },
  { ral: '5007', hex: '#2C6B98', nom: 'Bleu brillant', menuiserie: 'blanc' },
];
// 3 couleurs de menuiseries (retour Céline 15/10), associées aux teintes de bardage
const MENUISERIES = { blanc: '#F2F1EC', 'gris clair': '#C9CCCB', noir: '#262729' };
const NOM_MENUISERIE = { blanc: 'menuiseries blanches', 'gris clair': 'menuiseries gris clair', noir: 'menuiseries noires' };
const reduit = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DOMAINE = 'domaine'; // 3e écran : le Domaine vu du ciel, avec les 19 lodges implantés
const urlGlb = (id) => (EMBED ? EMBED.modeles[id]?.glb : `models/${id}.glb`);
const urlVignette = (f) => (EMBED ? EMBED.modeles[f.id]?.vignette : f.vignette && `models/${f.vignette}`);
const urlOrtho = () => (EMBED ? EMBED.site?.ortho : 'models/site_ortho.jpg');
const urlVignetteDomaine = () => (EMBED ? EMBED.site?.vignette : 'models/domaine.jpg');

/* ---------------- Fiches (JSON) ---------------- */
const fiches = {};
function normaliser(j, id) {
  const n = parseInt(id.replace(/\D/g, ''), 10);
  return {
    id,
    nom: j.nom || `Ecolodge ${n} m²`,
    accroche: j.accroche || '',
    dims: j.dims || '',
    surface: j.surface || `${n} m²`,
    caracteristiques: Array.isArray(j.caracteristiques) ? j.caracteristiques : [],
    pieces: Array.isArray(j.pieces) ? j.pieces.filter((p) => Array.isArray(p.position) && p.position.length === 3) : [],
    teintes: Array.isArray(j.teintes) && j.teintes.length ? j.teintes : TEINTES_DEFAUT,
    materiaux_teintables: j.materiaux_teintables || ['Bardage', 'Cadre lisse'],
    noeud_toit: j.noeud_toit || 'Toit',
    levee_toit: Number(j.levee_toit) || 2.2,
    vignette: j.vignette || `${id}.jpg`,
  };
}
async function chargerFiche(id) {
  if (fiches[id]) return fiches[id];
  let j = {};
  try {
    if (EMBED) j = EMBED.modeles[id]?.json || {};
    else {
      const r = await fetch(`models/${id}.json`, { cache: 'no-cache' });
      if (r.ok) j = await r.json();
    }
  } catch { /* fiche par défaut */ }
  return (fiches[id] = normaliser(j, id));
}
const longueur = (f) => parseFloat((f.dims.split('×')[0] || '').replace(',', '.')) || 8;
const surfaceNum = (f) => f.surface.replace(/\s*m²/, '');

/* ---------------- Dessin d'élévation (SVG) ---------------- */
function dessinLodge(L) {
  const W = 320, sol = 132;
  const s = Math.min(22, 250 / (L + 3.4));
  const lb = L * s, terr = 3 * s, x0 = (W - lb - terr) / 2, xb = x0 + terr;
  const pl = sol - 0.7 * s, eg = pl - 2.3 * s, fa = eg - 1.26 * s;
  const p = (n) => n.toFixed(1);
  const o = [];
  o.push(`<line class="s" x1="8" y1="${sol}" x2="${W - 8}" y2="${sol}" pathLength="1"/>`);
  for (let x = 14; x < W - 8; x += 9) o.push(`<line class="f" x1="${x}" y1="${sol + 1}" x2="${x - 5}" y2="${sol + 6}" pathLength="1"/>`);
  const nbP = Math.max(3, Math.round((L + 3) / 1.6));
  for (let i = 0; i <= nbP; i++) {
    const x = x0 + 4 + (i * (lb + terr - 8)) / nbP;
    o.push(`<line class="t" x1="${p(x)}" y1="${p(pl)}" x2="${p(x)}" y2="${sol}" pathLength="1"/>`);
  }
  o.push(`<line class="t" x1="${p(x0)}" y1="${p(pl)}" x2="${p(xb + lb)}" y2="${p(pl)}" pathLength="1"/>`);
  o.push(`<rect class="t" x="${p(xb)}" y="${p(eg)}" width="${p(lb)}" height="${p(pl - eg)}" pathLength="1"/>`);
  for (let x = xb + 0.5 * s; x < xb + lb - 0.2 * s; x += 0.5 * s) o.push(`<line class="f" x1="${p(x)}" y1="${p(eg + 2)}" x2="${p(x)}" y2="${p(pl - 1)}" pathLength="1"/>`);
  o.push(`<path class="t" d="M${p(xb - 0.4 * s)} ${p(eg + 0.12 * s)} L${p(xb + lb + 0.4 * s)} ${p(eg + 0.12 * s)} L${p(xb + lb + 0.25 * s)} ${p(fa)} L${p(xb - 0.25 * s)} ${p(fa)} Z" pathLength="1"/>`);
  for (let x = xb; x < xb + lb; x += 0.55 * s) o.push(`<line class="f" x1="${p(x)}" y1="${p(fa + 1)}" x2="${p(x)}" y2="${p(eg)}" pathLength="1"/>`);
  const fen = L > 7 ? [0.38, 0.62, 0.86] : [0.5, 0.82];
  fen.forEach((r, i) => {
    const w = (i === 0 ? 1.6 : 1.2) * s, h = 0.84 * s;
    o.push(`<rect class="v" x="${p(xb + r * lb - w / 2)}" y="${p(pl - 1.05 * s - h)}" width="${p(w)}" height="${p(h)}" pathLength="1"/>`);
  });
  o.push(`<rect class="v" x="${p(xb + 0.12 * lb)}" y="${p(pl - 2.05 * s)}" width="${p(0.9 * s)}" height="${p(2.05 * s)}" pathLength="1"/>`);
  const gc = pl - 0.95 * s;
  o.push(`<line class="t" x1="${p(x0)}" y1="${p(gc)}" x2="${p(xb)}" y2="${p(gc)}" pathLength="1"/>`);
  for (let x = x0; x < xb; x += 0.45 * s) o.push(`<line class="f" x1="${p(x)}" y1="${p(gc)}" x2="${p(x)}" y2="${p(pl)}" pathLength="1"/>`);
  const yc = sol + 18;
  o.push(`<path class="c" d="M${p(xb)} ${yc - 5}V${yc + 5}M${p(xb + lb)} ${yc - 5}V${yc + 5}M${p(xb)} ${yc}H${p(xb + lb)}" pathLength="1"/>`);
  o.push(`<text x="${p(xb + lb / 2)}" y="${yc - 5}" text-anchor="middle">${L.toFixed(2).replace('.', ',')} m</text>`);
  return `<svg class="dessin" viewBox="0 0 ${W} 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${o.join('')}</svg>`;
}

/* ---------------- Menu ---------------- */
// liste des fichiers présents dans models/ (générée par build.py) : évite les 404 sur les vignettes absentes
async function fichiersDisponibles() {
  if (EMBED) return null;
  try {
    const r = await fetch('models/manifest.json', { cache: 'no-cache' });
    return r.ok ? new Set((await r.json()).fichiers) : null;
  } catch { return null; }
}

function carteDomaine(num, fleche, vignette) {
  return `
    <article class="carte carte-domaine" data-id="${DOMAINE}">
      <div class="vignette">
        <span class="vignette-num">${String(num).padStart(2, '0')} / ${String(num).padStart(2, '0')}</span>
        ${vignette ? `<img alt="" loading="lazy" src="${esc(vignette)}">` : ''}
      </div>
      <div class="carte-corps">
        <div class="carte-ligne">
          <div><h2>Le Domaine demain</h2><p class="carte-accroche">19 Ecolodges implantés · vue du ciel</p></div>
          <p class="carte-surface" aria-hidden="true">19<small>lodges</small></p>
        </div>
        <p class="carte-dims">Domaine les Oyats d’Oléron</p>
        <ul class="puces"><li>9 × Ecolodge 24 m²</li><li>10 × Ecolodge 40 m²</li><li>Teintes du plan d’implantation</li></ul>
        <p class="cta">Survoler le Domaine <span class="cta-fleche" aria-hidden="true">${fleche}</span></p>
      </div>
      <a class="carte-lien" href="#${DOMAINE}" aria-label="Survoler le Domaine de demain en 3D"></a>
    </article>`;
}

async function construireMenu() {
  const [liste, dispo] = await Promise.all([Promise.all(MODELES.map(chargerFiche)), fichiersDisponibles()]);
  const vignette = (f) => (EMBED || !dispo || dispo.has(f.vignette) ? urlVignette(f) : null);
  const fleche = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  $('#cartes').innerHTML = liste.map((f, i) => `
    <article class="carte" data-id="${f.id}">
      <div class="vignette">
        <span class="vignette-num">${String(i + 1).padStart(2, '0')} / ${String(liste.length + 1).padStart(2, '0')}</span>
        ${dessinLodge(longueur(f))}
        ${vignette(f) ? `<img alt="" loading="lazy" src="${esc(vignette(f))}">` : ''}
      </div>
      <div class="carte-corps">
        <div class="carte-ligne">
          <div><h2>${esc(f.nom)}</h2>${f.accroche ? `<p class="carte-accroche">${esc(f.accroche)}</p>` : ''}</div>
          <p class="carte-surface" aria-hidden="true">${esc(surfaceNum(f))}<small>m²</small></p>
        </div>
        ${f.dims ? `<p class="carte-dims">${esc(f.dims)}</p>` : ''}
        ${f.caracteristiques.length ? `<ul class="puces">${f.caracteristiques.slice(0, 3).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
        <p class="cta">Explorer en 3D <span class="cta-fleche" aria-hidden="true">${fleche}</span></p>
      </div>
      <a class="carte-lien" href="#${f.id}" aria-label="Explorer ${esc(f.nom)} en 3D"></a>
    </article>`).join('') + carteDomaine(liste.length + 1, fleche, EMBED || !dispo || dispo.has('domaine.jpg') ? urlVignetteDomaine() : null);
  document.querySelectorAll('.vignette img').forEach((img) => {
    img.addEventListener('load', () => img.classList.add('ok'));
    img.addEventListener('error', () => img.remove());
  });
  document.querySelectorAll('.carte').forEach((c) => {
    const pre = c.dataset.id === DOMAINE
      ? () => { chargerSite(); MODELES.forEach((id) => prechargerModele(id).catch(() => {})); }
      : () => { prechargerModele(c.dataset.id).catch(() => {}); };
    c.addEventListener('pointerenter', pre, { once: true });
    c.addEventListener('touchstart', pre, { once: true, passive: true });
    c.addEventListener('focusin', pre, { once: true });
  });
}

/* ---------------- Moteur three.js ---------------- */
let THREE, GLTFLoader, OrbitControls, RoomEnvironment, mergeGeometries;
let libs = null;
function chargerLibs() {
  libs ??= Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/environments/RoomEnvironment.js'),
    import('three/addons/utils/BufferGeometryUtils.js'),
  ]).then(([t, g, o, r, u]) => {
    THREE = t; GLTFLoader = g.GLTFLoader; OrbitControls = o.OrbitControls; RoomEnvironment = r.RoomEnvironment; mergeGeometries = u.mergeGeometries;
  });
  libs.catch(() => { libs = null; });
  return libs;
}

const gltfs = {};
let suiviProgression = null;
function prechargerModele(id) {
  if (gltfs[id]) return gltfs[id];
  const p = chargerLibs().then(() => new Promise((ok, ko) => {
    new GLTFLoader().load(urlGlb(id), ok, (e) => suiviProgression?.(id, e), ko);
  }));
  gltfs[id] = p;
  p.catch(() => { delete gltfs[id]; });
  return p;
}

const etat = { id: null, m: null, vue: 'ext', toit: false, interagi: false, teinte: null, ambiance: 'jour', site: true };
let M = null; // moteur
const prepares = {};

function creerMoteur() {
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.75;
  controls.screenSpacePanning = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.autoRotateSpeed = 0.55;

  const hemi = new THREE.HemisphereLight(0xdfe7ff, 0x1b1e26, 0.45);
  const soleil = new THREE.DirectionalLight(0xfff4e6, 2.4);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  soleil.shadow.bias = -0.0004;
  soleil.shadow.normalBias = 0.03;
  soleil.shadow.radius = 6;
  soleil.shadow.blurSamples = 16;
  const contre = new THREE.DirectionalLight(0xbcd2ff, 0.6);
  scene.add(hemi, soleil, soleil.target, contre);

  const sol = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: 0x000814, opacity: 0.3 }));
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  sol.renderOrder = -2;

  // ombre de contact : dégradé radial doux sous l'emprise du lodge
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,4,14,.55)');
  gr.addColorStop(0.55, 'rgba(0,4,14,.28)');
  gr.addColorStop(1, 'rgba(0,4,14,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.renderOrder = -1;
  scene.add(sol, contact);

  M = { renderer, scene, camera, controls, hemi, soleil, contre, sol, contact, cadre: null, sale: true, actif: false, decalage: { x: 0, y: 0, hv: 1, wv: 1 }, zone: { haut: 0, bas: 0 } };

  controls.addEventListener('start', () => {
    annulerTween('cam');
    if (etat.vue === 'domaine') {
      interactionDomaine();
      controls.autoRotate = false;
      return;
    }
    if (!etat.interagi) { etat.interagi = true; $('#aide').classList.add('cachee'); }
    controls.autoRotate = false;
    if (etat.vue && etat.vue !== 'plan' && etat.vue !== 'visite') { etat.vue = null; majVues(); }
  });
  controls.addEventListener('change', () => { M.sale = true; });

  new ResizeObserver(redimensionner).observe($('#vue'));
  new ResizeObserver(redimensionner).observe($('#dock'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) M.sale = true; });
  redimensionner();
  renderer.setAnimationLoop(boucle);
  suivreClic();
  suivreDomaine();
}

function redimensionner() {
  if (!M) return;
  const vue = $('#vue');
  const W = vue.clientWidth, H = vue.clientHeight;
  if (!W || !H) return;
  M.renderer.setSize(W, H, false);
  M.camera.aspect = W / H;
  const haut = $('#barre').getBoundingClientRect().bottom + 8;
  const dock = $('#dock').getBoundingClientRect();
  const bas = H - dock.top + 8;
  vue.style.setProperty('--dock-h', `${Math.round(dock.height)}px`);
  const large = matchMedia('(min-width: 900px)').matches;
  const gauche = large && etat.id !== DOMAINE ? $('#fiche').getBoundingClientRect().right + 12 : 0;
  M.zone = { haut, bas: H - bas };
  const dx = -gauche / 2, dy = (bas - haut) / 2;
  M.decalage = { x: dx, y: dy, hv: Math.max(0.3, (H - haut - bas) / H), wv: Math.max(0.4, (W - gauche - 24) / W) };
  M.camera.setViewOffset(W, H, dx, dy, W, H);
  M.camera.updateProjectionMatrix();
  M.sale = true;
}

/* -------- tweens -------- */
const tweens = new Map();
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function tween(canal, duree, fn, ease = easeInOut) {
  annulerTween(canal);
  return new Promise((ok) => {
    if (reduit.matches || duree <= 0) { fn(1); ok(); return; }
    tweens.set(canal, { t0: performance.now(), duree, fn, ease, ok });
  });
}
function annulerTween(canal) {
  const t = tweens.get(canal);
  if (t) { tweens.delete(canal); t.ok(); }
}

function boucle(now) {
  if (!M.actif) return;
  for (const [canal, t] of tweens) {
    const p = Math.min(1, (now - t.t0) / t.duree);
    t.fn(t.ease(p));
    M.sale = true;
    if (p >= 1) { tweens.delete(canal); t.ok(); }
  }
  const domaine = etat.vue === 'domaine';
  if (!tweens.has('cam')) {
    M.controls.autoRotate = !reduit.matches && (domaine ? !etatDom.interagi : !etat.interagi && etat.vue === 'ext');
    if (domaine) bornerDomaine();
    if (M.controls.update()) M.sale = true;
  }
  if (!M.sale) return;
  M.sale = false;
  if (!domaine) couperVegetation();
  M.renderer.render(M.scene, M.camera);
  if (domaine) { placerCarteLodge(); majBoussole(); }
  else placerEtiquettes();
}

/* -------- préparation d'un modèle -------- */
const nomNettoye = (n) => n.replace(/\s/g, '_').replace(/[[\]./:]/g, '');
function boite(racine, exclu) {
  const b = new THREE.Box3(), tmp = new THREE.Box3();
  racine.updateWorldMatrix(true, true);
  racine.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (p === exclu) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    b.union(tmp);
  });
  return b;
}

function preparer(gltf, f) {
  const racine = gltf.scene;
  racine.traverse((o) => {
    if (!o.isMesh) return;
    const mats = [].concat(o.material);
    o.receiveShadow = true;
    o.castShadow = !mats.some((m) => m.transmission > 0 || m.name === 'Vitrage');
  });
  const toit = racine.getObjectByName(f.noeud_toit) || racine.getObjectByName(nomNettoye(f.noeud_toit)) || null;
  const matsToit = [];
  if (toit) {
    toit.traverse((o) => {
      if (!o.isMesh) return;
      const cl = [].concat(o.material).map((m) => {
        const c = m.clone();
        c.userData.orig = { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite };
        matsToit.push(c);
        return c;
      });
      o.material = Array.isArray(o.material) ? cl : cl[0];
    });
  }
  const teintables = [];
  const menuiseries = [];
  const noms = new Set(f.materiaux_teintables);
  racine.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (noms.has(m.name) && !teintables.includes(m)) teintables.push(m);
      else if (m.name === 'Menuiseries' && !menuiseries.includes(m)) menuiseries.push(m);
    }
  });
  const bTout = boite(racine);
  const bCorps = toit ? boite(racine, toit) : bTout;
  const lampes = f.pieces.map((p) => {
    const l = new THREE.PointLight(0xffc48a, 0, 6, 2);
    l.position.set(p.position[0], p.position[1] + 0.35, p.position[2]);
    racine.add(l);
    return l;
  });
  const points = new THREE.Group();
  points.visible = false;
  const matPt = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
  const matHalo = new THREE.MeshBasicMaterial({ color: 0x1f9ffa, transparent: true, opacity: 0.35, depthWrite: false });
  f.pieces.forEach((p, i) => {
    const g = new THREE.Group();
    const anneau = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.22, 40), matPt);
    const disque = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), matHalo);
    for (const o of [anneau, disque]) { o.rotation.x = -Math.PI / 2; o.userData.piece = i; o.renderOrder = 3; g.add(o); }
    g.position.set(p.position[0], p.position[1] - HAUT_ETIQUETTE + 0.012, p.position[2]);
    points.add(g);
  });
  racine.add(points);
  const surToiture = (TOITURES[f.id]?.objets || [])
    .map((n) => racine.getObjectByName(n) || racine.getObjectByName(nomNettoye(n))).filter(Boolean);
  const lumineux = [];
  racine.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) if (m.name in EMISSIFS && !lumineux.includes(m)) { m.emissive.set(EMISSIFS[m.name]); lumineux.push(m); }
  });
  return { racine, toit, toitY0: toit ? toit.position.y : 0, matsToit, teintables, menuiseries, bTout, bCorps, f, opaciteToit: 1, lampes, lumineux, points, surToiture, toiture: 'bois' };
}

/* -------- vues caméra -------- */
function centreInterieur(m) {
  if (!m.f.pieces.length) return m.bCorps.getCenter(new THREE.Vector3()).setY(m.bCorps.min.y + 0.8);
  const c = new THREE.Vector3();
  m.f.pieces.forEach((p) => c.add(new THREE.Vector3(...p.position)));
  return c.divideScalar(m.f.pieces.length);
}
function distancePour(rayon, fovDeg) {
  const t = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const aV = Math.atan(t * M.decalage.hv), aH = Math.atan(t * M.camera.aspect * M.decalage.wv);
  return rayon / Math.sin(Math.min(aV, aH));
}
function vueCible(nom) {
  const m = etat.m;
  const sph = m.bTout.getBoundingSphere(new THREE.Sphere());
  const portrait = M.camera.aspect * M.decalage.wv < M.decalage.hv;
  if (nom === 'plan') {
    const fov = 20;
    const taille = m.bCorps.getSize(new THREE.Vector3());
    const c = m.bCorps.getCenter(new THREE.Vector3()).setY(m.bCorps.min.y);
    // en portrait, la grande longueur du lodge passe à la verticale de l'écran
    const theta = portrait === taille.x > taille.z ? Math.PI / 2 : 0;
    const t = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    const grand = Math.max(taille.x, taille.z), petit = Math.min(taille.x, taille.z);
    const ecranH = portrait ? grand : petit, ecranL = portrait ? petit : grand;
    const d = 1.12 * Math.max(ecranH / 2 / (t * M.decalage.hv), ecranL / 2 / (t * M.camera.aspect * M.decalage.wv)) + taille.y;
    return { cible: c, rayon: d, phi: 0.02, theta, fov };
  }
  const fov = 35;
  // en portrait, on tourne davantage vers le pignon pour que le lodge tienne dans la largeur
  if (nom === 'int') return { cible: centreInterieur(m), rayon: distancePour(sph.radius * (portrait ? 0.9 : 0.95), fov), phi: 0.9, theta: portrait ? 0.9 : 0.5, fov };
  const c = sph.center.clone();
  c.y = m.bTout.min.y + (m.bTout.max.y - m.bTout.min.y) * 0.42;
  return { cible: c, rayon: distancePour(sph.radius * (portrait ? 0.9 : 0.95), fov), phi: 1.2, theta: portrait ? 1.0 : 0.62, fov };
}
function allerA(nom, duree = 1100, depart) {
  const v = vueCible(nom);
  const cam = M.camera, ctl = M.controls;
  const de = depart || {
    cible: ctl.target.clone(),
    sph: new THREE.Spherical().setFromVector3(cam.position.clone().sub(ctl.target)),
    fov: cam.fov,
  };
  let dT = v.theta - de.sph.theta;
  dT = ((((dT + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const s = new THREE.Spherical();
  const cible = new THREE.Vector3();
  ctl.minDistance = 0.1; ctl.maxDistance = 1000;
  return tween('cam', duree, (p) => {
    cible.lerpVectors(de.cible, v.cible, p);
    s.set(THREE.MathUtils.lerp(de.sph.radius, v.rayon, p), THREE.MathUtils.lerp(de.sph.phi, v.phi, p), de.sph.theta + dT * p);
    cam.position.setFromSpherical(s).add(cible);
    ctl.target.copy(cible);
    cam.fov = THREE.MathUtils.lerp(de.fov, v.fov, p);
    cam.updateProjectionMatrix();
    cam.lookAt(cible);
  }, depart ? easeOut : easeInOut).then(() => {
    if (!etat.m || etat.vue === 'domaine') return;
    const r = etat.m.bTout.getBoundingSphere(new THREE.Sphere()).radius;
    ctl.minDistance = Math.min(r * 0.45, v.rayon);
    ctl.maxDistance = Math.max(r * 4.5, v.rayon * 1.2, etat.site && SITE ? 230 : 0);
  });
}

/* -------- toit -------- */
function restaurerToit(m) {
  m.matsToit.forEach((mat) => {
    const o = mat.userData.orig;
    mat.transparent = o.transparent; mat.depthWrite = o.depthWrite; mat.opacity = o.opacity; mat.needsUpdate = true;
  });
}
function bougerToit(haut, opaciteFinale = 0.22) {
  const m = etat.m;
  etat.toit = haut;
  majToit();
  majEtiquettes();
  if (!m.toit) return Promise.resolve();
  const y0 = m.toit.position.y, y1 = m.toitY0 + (haut ? m.f.levee_toit : 0);
  const o0 = m.opaciteToit, o1 = haut ? opaciteFinale : 1;
  m.toit.visible = true;
  m.matsToit.forEach((mat) => { mat.transparent = true; mat.depthWrite = false; mat.needsUpdate = true; });
  return tween('toit', 850, (p) => {
    m.toit.position.y = THREE.MathUtils.lerp(y0, y1, p);
    m.opaciteToit = THREE.MathUtils.lerp(o0, o1, p);
    m.matsToit.forEach((mat) => { mat.opacity = mat.userData.orig.opacity * m.opaciteToit; });
  }).then(() => {
    if (m.opaciteToit <= 0.001) m.toit.visible = false;
    if (m.opaciteToit >= 0.999) restaurerToit(m);
    M.sale = true;
  });
}

// hauteur des étiquettes de pièces au-dessus du plancher (export Blender : sol + 1,10 m)
const HAUT_ETIQUETTE = 1.1, HAUT_YEUX = 1.6;
function reglerControles(nom) {
  const c = M.controls, plan = nom === 'plan', visite = nom === 'visite';
  c.enableRotate = !plan;
  c.enableZoom = !visite;
  c.enablePan = !visite;
  c.screenSpacePanning = true;
  c.rotateSpeed = visite ? -0.32 : 0.75;
  c.minPolarAngle = visite ? Math.PI / 2 - 0.8 : 0;
  c.maxPolarAngle = visite ? Math.PI / 2 + 0.6 : Math.PI / 2 - 0.06;
  c.mouseButtons.LEFT = plan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  c.touches.ONE = plan ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  if (etat.m) etat.m.points.visible = visite;
  M.renderer.toneMappingExposure = AMBIANCES[etat.ambiance].expo * (visite ? 0.8 : 1);
  M.sale = true;
  $('#visite-pieces').hidden = !visite;
  document.body.classList.toggle('en-visite', visite);
}
function oeil(i) {
  const p = etat.m.f.pieces[i].position;
  return new THREE.Vector3(p[0], p[1] - HAUT_ETIQUETTE + HAUT_YEUX, p[2]);
}
// points de vue de visite, en coordonnées du plan (m) : œil puis point regardé — choisis d'après les plans
const VISITE = {
  sirius40: { demi: [5, 2.186], vues: {
    'Pièce de vie': [[3.4, 3.0], [0.2, 1.6, 1.3]], 'Chambre 1': [[8.15, 2.3], [9.7, 0.6, 0.75]], 'Chambre 2': [[6.58, 2.3], [4.9, 0.8, 0.75]],
    'Salle d’eau': [[8.1, 2.95], [9.8, 3.9, 0.95]], 'WC': [[6.85, 3.5], [7.3, 4.2, 0.5]], 'Terrasse': [[-2.9, 2.19], [0.5, 2.19, 1.5]] } },
  sirius24: { demi: [3, 2.0], vues: {
    'Pièce de vie': [[5.45, 0.5], [2.0, 2.6, 0.9]], 'Salle d’eau': [[0.75, 1.2], [1.25, 3.3, 1.0]], 'WC': [[3.45, 3.3], [2.45, 3.8, 0.45]],
    'Terrasse': [[3.45, -1.9], [3.45, 1.5, 1.4]] } },
};
function vueAuteur(i) {
  const m = etat.m, def = VISITE[m.f.id], p = m.f.pieces[i];
  const v = def?.vues[p.nom];
  if (!v) return null;
  const sol = p.position[1] - HAUT_ETIQUETTE;
  const g = ([x, yp, h = HAUT_YEUX]) => new THREE.Vector3(x - def.demi[0], sol + h, def.demi[1] - yp);
  const oeil = g(v[0]);
  return { oeil, dir: g(v[1]).sub(oeil), incline: true };
}
// cadrage « photo » d'une pièce : regard vers la plus grande profondeur intérieure, œil reculé contre le mur opposé
function cadragePiece(centre) {
  const ray = new THREE.Raycaster(), cibles = [];
  etat.m.racine.traverse((o) => { if (o.isMesh && o.visible && !('piece' in o.userData)) cibles.push(o); });
  const portee = (d) => { ray.set(centre, d); ray.far = 9; const h = ray.intersectObjects(cibles, false)[0]; return h ? h.distance : Infinity; };
  let dir = new THREE.Vector3(-1, 0, 0), dmax = -1;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const dist = portee(d);
    if (dist !== Infinity && dist > dmax) { dmax = dist; dir = d; }
  }
  const dos = portee(dir.clone().negate());
  const recul = dos === Infinity ? 0 : Math.min(1.4, Math.max(0, dos - 0.45));
  return { dir, oeil: centre.clone().sub(dir.clone().multiplyScalar(recul)) };
}
function allerPiece(i, duree = 950, mode = 'degage') {
  const m = etat.m, cam = M.camera, ctl = M.controls;
  if (!m || !m.f.pieces[i]) return Promise.resolve();
  const depuis = ctl.target.clone();
  etat.piece = i;
  document.querySelectorAll('#visite-pieces button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.piece === i)));
  let cible = oeil(i);
  let dir;
  const auteur = vueAuteur(i);
  if (auteur) {
    cible = auteur.oeil; dir = auteur.dir;
  } else if (etat.vueAvant !== 'visite') {
    // première entrée : on regarde vers l'extérieur (verrière, porte-fenêtre), dos au centre du lodge
    dir = cible.clone().sub(m.bCorps.getCenter(new THREE.Vector3())).setY(0);
    if (dir.lengthSq() < 0.25) dir.set(-1, 0, 0);
  } else if (mode === 'marche' && cible.distanceTo(depuis) > 0.3) {
    dir = cible.clone().sub(depuis);
  } else {
    const c = cadragePiece(cible);
    dir = c.dir; cible = c.oeil;
  }
  if (!auteur) dir.setY(0);
  dir.normalize();
  const t0 = ctl.target.clone(), c0 = cam.position.clone(), f0 = cam.fov;
  const c1 = cible.clone().sub(dir.clone().multiplyScalar(0.05));
  ctl.minDistance = 0.01; ctl.maxDistance = 1000;
  return tween('cam', duree, (p) => {
    ctl.target.lerpVectors(t0, cible, p);
    cam.position.lerpVectors(c0, c1, p);
    cam.fov = THREE.MathUtils.lerp(f0, 68, p);
    cam.updateProjectionMatrix();
    cam.lookAt(ctl.target);
  }).then(() => { ctl.minDistance = ctl.maxDistance = 0.05; etat.vueAvant = 'visite'; });
}
function choisirVue(nom) {
  if (!etat.m) return;
  etat.vueAvant = etat.vue;
  etat.vue = nom;
  etat.interagi = true;
  $('#aide').classList.add('cachee');
  majVues();
  reglerControles(nom);
  if (nom === 'ext' || nom === 'visite') bougerToit(false);
  else bougerToit(true, nom === 'plan' ? 0 : 0.22);
  if (nom === 'visite') { allerPiece(etat.vueAvant === 'visite' ? etat.piece ?? 0 : 0, 1400); return; }
  allerA(nom);
}
function construireVisite(f) {
  $('#visite-pieces').innerHTML = f.pieces.map((p, i) => `<button type="button" data-piece="${i}" aria-pressed="false">${esc(p.nom)}</button>`).join('');
  document.querySelectorAll('#visite-pieces button').forEach((b) => b.addEventListener('click', () => allerPiece(+b.dataset.piece)));
}
// clic (sans glisser) sur un point au sol : on s'y rend
let appui = null;
function suivreClic() {
  const cv = $('#scene');
  cv.addEventListener('pointerdown', (e) => { appui = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', (e) => {
    if (!appui || etat.vue !== 'visite' || !etat.m) return;
    const d = Math.hypot(e.clientX - appui.x, e.clientY - appui.y);
    appui = null;
    if (d > 6) return;
    const r = cv.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, M.camera);
    const hit = ray.intersectObjects(etat.m.points.children, true)[0];
    if (hit) allerPiece(hit.object.userData.piece, 950, 'marche');
  });
}

/* -------- environnement réel : Domaine des Oyats (IGN ortho + LiDAR HD + BD TOPO, cadastre, plan masse) -------- */
const CIELS = { jour: 0xc3d5e6, soir: 0xe2ad86, nuit: 0x0c1428 };
let SITE = null, sitePromesse = null;
function chargerSite() {
  if (EMBED) return Promise.resolve(EMBED.site?.json || null);
  return (sitePromesse ??= fetch('models/site.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
}
const VW = (x, y, h = 0) => new THREE.Vector3(x, h, -y);
let VERTS;  // verts de feuillage (pins maritimes, chênes verts, haies)
function lodgeSimplifie(type, teinte) {
  const g = new THREE.Group();
  const mat = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const bard = mat(teinte), sombre = mat(0x2b2f35, 0.6), bois = mat(0x8a6446, 0.9), verre = mat(0x1d2633, 0.25);
  const boite = (sx, sy, sz, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const prisme = (larg, haut, long, y, m) => {
    const s = new THREE.Shape([new THREE.Vector2(-larg / 2, 0), new THREE.Vector2(larg / 2, 0), new THREE.Vector2(0, haut)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: long, bevelEnabled: false });
    geo.translate(0, 0, -long / 2); geo.rotateY(Math.PI / 2);
    const o = new THREE.Mesh(geo, m); o.position.y = y; o.castShadow = true; g.add(o); return o;
  };
  if (type === 'sirius40') {
    boite(10, 2.3, 4.37, 0, 0.7 + 1.15, 0, bard);
    prisme(4.75, 1.4, 10.2, 3.0, mat(0x7e848a, 0.5));
    boite(0.05, 2.1, 3.6, -5.03, 1.85, 0, verre);
    boite(2.6, 0.7, 4.0, -6.3, 0.35, 0, bois);
    boite(9.6, 0.6, 3.9, 0, 0.3, 0, sombre);
  } else {
    boite(6, 2.55, 4, 0, 0.35 + 1.27, 0, bard);
    boite(6.05, 0.08, 4.05, 0, 2.94, 0, sombre);
    prisme(4.8, 0.97, 6.7, 3.08, bois);
    boite(1.6, 2.1, 0.05, 0.45, 1.4, 2.03, verre);
    boite(3.6, 0.34, 2.15, 0.4, 0.17, 3.07, bois);
  }
  return g;
}
function construireSite(s) {
  VERTS = [0x3f5a2c, 0x4a6533, 0x56703a, 0x3a5230, 0x5d7440].map((c) => new THREE.Color(c));
  const exterieur = new THREE.Group(), interieur = new THREE.Group();
  exterieur.name = 'Domaine des Oyats';
  exterieur.add(interieur);
  const tex = new THREE.TextureLoader().load(urlOrtho(), () => { M.sale = true; });
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = M.renderer.capabilities.getMaxAnisotropy();
  const ortho = new THREE.Mesh(new THREE.PlaneGeometry(s.ortho.l, s.ortho.h), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  ortho.rotation.x = -Math.PI / 2; ortho.position.y = -0.03; ortho.receiveShadow = true;
  const autour = new THREE.Mesh(new THREE.CircleGeometry(700, 64), new THREE.MeshStandardMaterial({ color: 0x46512f, roughness: 1 }));
  autour.rotation.x = -Math.PI / 2; autour.position.y = -0.06; autour.receiveShadow = true;
  interieur.add(ortho, autour);
  // arbres : fût + houppier à la hauteur LiDAR
  const n = s.arbres.length, mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), col = new THREE.Color(), haut = new THREE.Vector3(0, 1, 0);
  const futs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.2, 1, 7), new THREE.MeshStandardMaterial({ color: 0x5a4535, roughness: 0.95 }), n);
  const houppiers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshStandardMaterial({ roughness: 0.92 }), n);
  s.arbres.forEach((a, i) => {
    const hc = Math.min(a.r * 0.95, a.h * 0.42), hf = Math.max(1.4, a.h - 1.6 * hc), e = 0.8 + a.h / 18;
    mtx.compose(VW(a.x, a.y, hf / 2), q.identity(), sc.set(e, hf, e)); futs.setMatrixAt(i, mtx);
    q.setFromAxisAngle(haut, (i * 2.399) % (Math.PI * 2));
    mtx.compose(VW(a.x, a.y, a.h - hc), q, sc.set(a.r, hc, a.r * (0.85 + (i % 5) * 0.06))); houppiers.setMatrixAt(i, mtx);
    houppiers.setColorAt(i, col.set(a.c).lerp(VERTS[i % VERTS.length], 0.62));
  });
  futs.castShadow = houppiers.castShadow = true;
  futs.frustumCulled = houppiers.frustumCulled = false;
  // haies et arbustes (LiDAR 1 à 4,5 m)
  const nh = s.haies.length;
  const haies = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ roughness: 0.95 }), nh);
  s.haies.forEach((t, i) => {
    q.setFromAxisAngle(haut, (i * 1.7) % (Math.PI * 2));
    mtx.compose(VW(t.x, t.y, t.h / 2), q, sc.set(1.05, t.h / 2, 1.05)); haies.setMatrixAt(i, mtx);
    haies.setColorAt(i, col.set(t.c).lerp(VERTS[(i * 7) % VERTS.length], 0.7));
  });
  haies.castShadow = true; haies.receiveShadow = true; haies.frustumCulled = false;
  interieur.add(futs, houppiers, haies);
  const inst = [
    { m: futs, pos: s.arbres, base: futs.instanceMatrix.array.slice(), r: s.arbres.map((a) => a.r + 1.5) },
    { m: houppiers, pos: s.arbres, base: houppiers.instanceMatrix.array.slice(), r: s.arbres.map((a) => a.r + 1.5) },
    { m: haies, pos: s.haies, base: haies.instanceMatrix.array.slice(), r: s.haies.map(() => 2.2) },
  ];
  // constructions voisines (BD TOPO + volumes LiDAR)
  const batiments = [];
  const toit = new THREE.MeshStandardMaterial({ color: 0xb9bcbe, roughness: 0.7 }), mur = new THREE.MeshStandardMaterial({ color: 0xe6e1d8, roughness: 0.85 });
  for (const b of s.batiments) {
    const forme = new THREE.Shape(b.pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(forme, { depth: b.h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const o = new THREE.Mesh(geo, [toit, mur]); o.castShadow = o.receiveShadow = true;
    o.userData.centre = b.pts.reduce((a, [x, y]) => [a[0] + x / b.pts.length, a[1] + y / b.pts.length], [0, 0]);
    interieur.add(o);
    batiments.push(o);
  }
  // lodges du plan masse (volumes simplifiés)
  const lodges = s.lodges.map((l) => {
    const o = lodgeSimplifie(l.type, l.teinte);
    o.position.copy(VW(l.x, l.y)); o.rotation.y = l.rot; o.userData.lot = l.lot;
    interieur.add(o);
    return o;
  });
  return { exterieur, interieur, lodges, s, inst, autour, houppiers, haies, batiments, camLocale: new THREE.Vector3(), derniere: new THREE.Vector3(1e9, 0, 0), derniereCible: new THREE.Vector3() };
}
async function majSite() {
  if (!etat.m) return;
  if (!SITE) {
    const s = await chargerSite();
    if (!s || !etat.m) { $('#bouton-site').hidden = $('#bouton-survol').hidden = true; return; }
    SITE = construireSite(s);
    M.scene.add(SITE.exterieur);
  }
  const emp = SITE.s.emplacements[etat.m.f.id];
  const on = etat.site && !!emp;
  SITE.exterieur.visible = on;
  if (emp) {
    SITE.exterieur.rotation.y = -emp.rot;
    SITE.interieur.position.copy(VW(emp.x, emp.y)).negate();
    SITE.lodges.forEach((o) => { o.visible = o.userData.lot !== emp.lot; });
  }
  M.sol.visible = !on;
  M.scene.background = on ? new THREE.Color(CIELS[etat.ambiance]) : null;
  M.scene.fog = on ? new THREE.Fog(CIELS[etat.ambiance], 70, 330) : null;
  const sc = M.soleil.shadow.camera, r = etat.m.bTout.getBoundingSphere(new THREE.Sphere()).radius;
  const t = on ? Math.max(r * 1.6, 16) : r * 1.25;
  sc.left = sc.bottom = -t; sc.right = sc.top = t; sc.updateProjectionMatrix();
  if (on && etat.vue !== 'visite') M.controls.maxDistance = Math.max(M.controls.maxDistance, 230);
  $('#bouton-site').setAttribute('aria-pressed', String(on));
  M.sale = true;
}
// végétation entre la caméra et le lodge : masquée quand elle est à quelques mètres de l'objectif (vue en coupe)
function couperVegetation() {
  if (!SITE || !SITE.exterieur.visible) return;
  const c = SITE.interieur.worldToLocal(SITE.camLocale.copy(M.camera.position));
  const t = SITE.interieur.worldToLocal(M.controls.target.clone());
  if (c.distanceToSquared(SITE.derniere) < 0.04 && t.distanceToSquared(SITE.derniereCible) < 0.04) return;
  SITE.derniere.copy(c); SITE.derniereCible.copy(t);
  const visite = etat.vue === 'visite', loin = c.y > 60;
  const sx = t.x - c.x, sz = t.z - c.z, l2 = sx * sx + sz * sz || 1;
  for (const it of SITE.inst) {
    const a = it.m.instanceMatrix.array;
    it.pos.forEach((p, i) => {
      // distance horizontale de la plante au segment caméra → lodge (jusqu'à 3 m avant le lodge)
      const px = p.x - c.x, pz = -p.y - c.z;
      const u = Math.max(0, Math.min(1, (px * sx + pz * sz) / l2));
      const dx = px - u * sx, dz = pz - u * sz, r = it.r[i];
      const avant = u < 1 - 3 / Math.sqrt(l2);
      const cache = !visite && !loin && avant && dx * dx + dz * dz < r * r * 1.4;
      for (let k = 0; k < 16; k++) a[i * 16 + k] = cache ? 0 : it.base[i * 16 + k];
    });
    it.m.instanceMatrix.needsUpdate = true;
  }
}
function survoler() {
  if (!SITE || !etat.m) return;
  if (!etat.site) { etat.site = true; majSite(); }
  if (etat.vue !== 'ext') choisirVue('ext');
  const emp = SITE.s.emplacements[etat.m.f.id];
  // centre du Domaine (moyenne des lodges) exprimé dans le repère du lodge présenté
  const c = new THREE.Vector3();
  SITE.s.lodges.forEach((l) => c.add(VW(l.x, l.y)));
  c.divideScalar(SITE.s.lodges.length).sub(VW(emp.x, emp.y)).applyAxisAngle(new THREE.Vector3(0, 1, 0), -emp.rot);
  const cam = M.camera, ctl = M.controls;
  const de = { cible: ctl.target.clone(), sph: new THREE.Spherical().setFromVector3(cam.position.clone().sub(ctl.target)), fov: cam.fov };
  const s = new THREE.Spherical(), cible = new THREE.Vector3();
  ctl.minDistance = 0.1; ctl.maxDistance = 1000;
  tween('cam', 2200, (p) => {
    cible.lerpVectors(de.cible, c, p);
    s.set(THREE.MathUtils.lerp(de.sph.radius, 175, p), THREE.MathUtils.lerp(de.sph.phi, 0.72, p), de.sph.theta + 0.5 * p);
    cam.position.setFromSpherical(s).add(cible);
    ctl.target.copy(cible);
    cam.fov = THREE.MathUtils.lerp(de.fov, 38, p); cam.updateProjectionMatrix();
    cam.lookAt(cible);
  }).then(() => { ctl.minDistance = 2; ctl.maxDistance = 260; });
  etat.interagi = true;
}

/* -------- Le Domaine demain : les 19 lodges du plan d'implantation, vus du ciel -------- */
// matériaux visibles de l'extérieur ; les autres (mobilier, cloisons…) sont retirés s'ils sont enfermés dans le volume
const MATS_EXTERIEUR = new Set(['Bardage', 'Cadre lisse', 'Menuiseries', 'Alu sombre', 'Toiture zinc', 'Zinc gouttière', 'Dessous sombre', 'Métal noir',
  'Terrasse 0', 'Terrasse 1', 'Terrasse 2', 'Charpente bois', 'Couvertine', 'Bac acier', 'Rives peintes', 'Planche de rive', 'Vitrage', 'Vitrage dépoli',
  'Applique', 'Lanterne', 'Poignée PVC']);
// teinte du plan d'implantation absente du nuancier actuel → RAL correspondant (ancien rendu du RAL 5024)
const TEINTES_PLAN = { '#92B0AE': '5024' };
const DOM_POLAIRE = [degres(25), degres(65)];
function degres(d) { return (d * Math.PI) / 180; }
let DOM = null;
const etatDom = { survol: -1, choisi: -1, type: null, interagi: false, surCarte: false, minuterie: 0 };

function teinteDuLot(hex, teintes) {
  const h = String(hex).toUpperCase();
  const t = teintes.find((x) => x.hex.toUpperCase() === h) || teintes.find((x) => x.ral === TEINTES_PLAN[h]);
  if (t) return t;
  const c = new THREE.Color(hex), k = new THREE.Color();
  let proche = teintes[0], dmin = Infinity;
  for (const x of teintes) {
    k.set(x.hex);
    const d = (k.r - c.r) ** 2 + (k.g - c.g) ** 2 + (k.b - c.b) ** 2;
    if (d < dmin) { dmin = d; proche = x; }
  }
  return proche;
}

function matDomaine(m, teintable) {
  if (m.name === 'Vitrage' || m.name === 'Vitrage dépoli') {
    // verre opaque et réfléchissant (pas de passe de transmission) qui s'allume le soir
    const depoli = m.name !== 'Vitrage';
    return new THREE.MeshStandardMaterial({ name: m.name, color: depoli ? 0xc9cfd2 : 0x1c2833, roughness: depoli ? 0.5 : 0.07, metalness: 0.2, emissive: 0xffbf7d, emissiveIntensity: 0 });
  }
  const c = m.clone();
  const o = m.userData.orig;
  if (o) { c.transparent = o.transparent; c.opacity = o.opacity; c.depthWrite = o.depthWrite; }
  if (c.transmission) c.transmission = 0;
  c.vertexColors = false;
  if (teintable) c.color.set(0xffffff); // la teinte de chaque lodge passe par la couleur d'instance
  if (m.name in EMISSIFS) { c.emissive.set(EMISSIFS[m.name]); c.emissiveIntensity = 0; }
  return c;
}

// gabarit d'un modèle : géométries extérieures fusionnées par matériau (≈ 25 appels de rendu pour tous les lodges du modèle)
function gabaritDomaine(id, gltf, f) {
  const racine = gltf.scene, prep = prepares[id];
  const toitY = prep?.toit ? prep.toit.position.y : null;
  if (prep?.toit) prep.toit.position.y = prep.toitY0;
  racine.updateWorldMatrix(true, true);
  const inv = racine.matrixWorld.clone().invert();
  const toit = prep?.toit || racine.getObjectByName(f.noeud_toit) || racine.getObjectByName(nomNettoye(f.noeud_toit));
  const bTout = boite(racine, prep?.points), bCorps = toit ? boite(racine, toit) : bTout.clone();
  const dedans = bCorps.clone().expandByVector(new THREE.Vector3(-0.22, -0.04, -0.22));
  const teintables = new Set(f.materiaux_teintables);
  const groupes = new Map(), mtx = new THREE.Matrix4(), bb = new THREE.Box3();
  const garder = ['position', 'normal', 'uv', 'uv1'];
  racine.traverse((o) => {
    if (!o.isMesh || 'piece' in o.userData || Array.isArray(o.material)) return;
    const mat = o.material;
    mtx.multiplyMatrices(inv, o.matrixWorld);
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    bb.copy(o.geometry.boundingBox).applyMatrix4(mtx);
    if (!MATS_EXTERIEUR.has(mat.name) && dedans.containsBox(bb)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!garder.includes(k)) g.deleteAttribute(k);
    g.morphAttributes = {};
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(mtx);
    const cle = `${mat.name || mat.uuid}|${Object.keys(g.attributes).sort().join(',')}`;
    if (!groupes.has(cle)) groupes.set(cle, { mat, geos: [] });
    groupes.get(cle).geos.push(g);
  });
  if (prep?.toit) prep.toit.position.y = toitY;
  const parts = [];
  for (const { mat, geos } of groupes.values()) {
    const geo = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
    if (!geo) continue;
    const teinte = teintables.has(mat.name) ? 'bardage' : mat.name === 'Menuiseries' ? 'menuiserie' : null;
    parts.push({ geo, mat: matDomaine(mat, !!teinte), teinte });
  }
  return { parts, bTout };
}

function textureHalo() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const rr = (m, r) => { g.beginPath(); g.roundRect(m, m, 256 - 2 * m, 256 - 2 * m, r); };
  g.shadowColor = 'rgba(255,255,255,.9)';
  g.shadowBlur = 30;
  g.fillStyle = 'rgba(255,255,255,.62)';
  rr(40, 40); g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 9;
  g.strokeStyle = '#fff';
  rr(44, 36); g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// le Domaine comme une maquette : l'orthophoto se fond dans le ciel au-delà de ses bords
// distance (m) au rectangle arrondi intérieur de l'orthophoto : < 0 dedans
function horsOrtho(o, x, z) {
  const bx = o.l / 2 - 24, bz = o.h / 2 - 24, r = 30;
  const qx = Math.max(Math.abs(x) - bx + r, 0), qz = Math.max(Math.abs(z) - bz + r, 0);
  return Math.hypot(qx, qz) - r;
}
function voileOrtho(o) {
  const N = 128, marge = 70, L = o.l + 2 * marge, H = o.h + 2 * marge;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d'), img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const d = horsOrtho(o, ((i + 0.5) / N - 0.5) * L, ((j + 0.5) / N - 0.5) * H);
    const t = Math.min(1, Math.max(0, d / 22));
    const v = Math.round(255 * t * t * (3 - 2 * t));
    const k = (j * N + i) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  // grand plan : au-delà de la texture (bord étiré), la couleur du ciel couvre tout
  const k = 12;
  // sans mipmaps : de loin, la moyenne des niveaux réduits voilerait tout le Domaine
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.repeat.set(k, k);
  tex.offset.set((1 - k) / 2, (1 - k) / 2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L * k, H * k), new THREE.MeshBasicMaterial({ color: CIELS.jour, alphaMap: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.015; m.renderOrder = -1;
  return m;
}

function construireDomaine(s, gltf) {
  const groupe = new THREE.Group();
  groupe.name = 'Le Domaine demain';
  const q = new THREE.Quaternion(), axeY = new THREE.Vector3(0, 1, 0), un = new THREE.Vector3(1, 1, 1);
  const lodges = s.lodges.filter((l) => MODELES.includes(l.type)).map((l, i) => {
    const f = fiches[l.type];
    return { lot: l.lot, type: l.type, f, t: teinteDuLot(l.teinte, f.teintes), i, mtx: new THREE.Matrix4().compose(VW(l.x, l.y), q.setFromAxisAngle(axeY, l.rot), un) };
  });
  const gabarits = {}, lumineux = [], vitrages = [];
  for (const id of MODELES) {
    const gab = (gabarits[id] = gabaritDomaine(id, gltf[id], fiches[id]));
    const liste = lodges.filter((l) => l.type === id);
    if (!liste.length) continue;
    for (const p of gab.parts) {
      const im = new THREE.InstancedMesh(p.geo, p.mat, liste.length);
      liste.forEach((l, k) => {
        im.setMatrixAt(k, l.mtx);
        if (p.teinte) im.setColorAt(k, new THREE.Color(p.teinte === 'bardage' ? l.t.hex : MENUISERIES[l.t.menuiserie] || l.t.hex));
      });
      im.castShadow = im.receiveShadow = true;
      im.computeBoundingSphere();
      groupe.add(im);
      if (p.mat.name in EMISSIFS) lumineux.push(p.mat);
      if (/^Vitrage/.test(p.mat.name)) vitrages.push(p.mat);
    }
  }
  // halos de sélection, volumes de détection, ancres des étiquettes
  const texHalo = textureHalo(), proxys = new THREE.Group(), coins = [];
  const v = new THREE.Vector3();
  lodges.forEach((l) => {
    const b = gabarits[l.type].bTout, taille = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const pivot = new THREE.Group();
    pivot.applyMatrix4(l.mtx);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texHalo, color: 0xfff1d2, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(c.x, b.min.y + 0.06, c.z); halo.scale.set(taille.x + 8, taille.z + 8, 1);
    halo.renderOrder = 1; halo.visible = false;
    pivot.add(halo);
    groupe.add(pivot);
    const px = new THREE.Mesh(new THREE.BoxGeometry(taille.x + 0.8, taille.y + 0.4, taille.z + 0.8));
    px.position.copy(c); px.userData.lodge = l.i;
    const pp = new THREE.Group(); pp.applyMatrix4(l.mtx); pp.add(px); proxys.add(pp);
    l.halo = halo; l.opacite = 0;
    l.ancre = new THREE.Vector3(c.x, b.max.y + 0.6, c.z).applyMatrix4(l.mtx);
    l.base = new THREE.Vector3(c.x, b.min.y, c.z).applyMatrix4(l.mtx);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [b.min.y, b.max.y]) {
      coins.push(v.set(sx > 0 ? b.max.x : b.min.x, y, sz > 0 ? b.max.z : b.min.z).clone().applyMatrix4(l.mtx));
    }
  });
  proxys.updateMatrixWorld(true);
  const voile = voileOrtho(s.ortho);
  groupe.add(voile);
  // emprise, axe principal (orientation du cadrage) et limites de déplacement
  const bb = new THREE.Box3().setFromPoints(coins);
  const centre = bb.getCenter(new THREE.Vector3()).setY(0);
  let sxx = 0, szz = 0, sxz = 0;
  lodges.forEach((l) => { v.setFromMatrixPosition(l.mtx).sub(centre); sxx += v.x * v.x; szz += v.z * v.z; sxz += v.x * v.z; });
  const rayon = bb.getSize(new THREE.Vector3()).setY(0).length() / 2;
  return {
    groupe, lodges, proxys, coins, centre, rayon, lumineux, vitrages, voile,
    masques: SITE.inst.map((it) => { const a = it.base.slice(); it.pos.forEach((p, i) => { if (horsOrtho(s.ortho, p.x, -p.y) > 6) a.fill(0, i * 16, i * 16 + 16); }); return a; }),
    axe: 0.5 * Math.atan2(2 * sxz, sxx - szz),
    min: new THREE.Vector2(bb.min.x - 18, bb.min.z - 18), max: new THREE.Vector2(bb.max.x + 18, bb.max.z + 18),
    dist: [40, 400], brume: [300, 800],
    geoHouppier: new THREE.IcosahedronGeometry(1, 2), geoHaie: new THREE.IcosahedronGeometry(1, 1),
    geoHouppierOrig: SITE.houppiers.geometry, geoHaieOrig: SITE.haies.geometry,
  };
}

// plan masse tracé pendant le chargement
function dessinDomaine(s) {
  const pts = s.lodges.map((l) => [l.x, -l.y]).concat(s.allee.map(([x, y]) => [x, -y]));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min(290 / (x1 - x0), 150 / (y1 - y0));
  const X = (x) => (160 + (x - (x0 + x1) / 2) * k).toFixed(1), Y = (y) => (78 + (y - (y0 + y1) / 2) * k).toFixed(1);
  const o = [`<polyline class="s" points="${s.allee.map(([x, y]) => `${X(x)},${Y(-y)}`).join(' ')}" pathLength="1"/>`];
  s.lodges.forEach((l) => {
    const [w, h] = l.type === 'sirius40' ? [10, 4.4] : [6, 4];
    o.push(`<rect class="${l.type === 'sirius40' ? 't' : 'v'}" x="${(-w * k) / 2}" y="${(-h * k) / 2}" width="${(w * k).toFixed(1)}" height="${(h * k).toFixed(1)}" transform="translate(${X(l.x)} ${Y(-l.y)}) rotate(${((-l.rot * 180) / Math.PI).toFixed(1)})" pathLength="1"/>`);
  });
  return `<svg class="dessin" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${o.join('')}</svg>`;
}

/* caméra du Domaine */
function camVers(v, duree = 1100, depart) {
  const cam = M.camera, ctl = M.controls;
  const de = depart || { cible: ctl.target.clone(), sph: new THREE.Spherical().setFromVector3(cam.position.clone().sub(ctl.target)), fov: cam.fov };
  let dT = v.theta - de.sph.theta;
  dT = ((((dT + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const s = new THREE.Spherical(), cible = new THREE.Vector3();
  ctl.minDistance = 0.1; ctl.maxDistance = 2000;
  return tween('cam', duree, (p) => {
    cible.lerpVectors(de.cible, v.cible, p);
    s.set(THREE.MathUtils.lerp(de.sph.radius, v.rayon, p), THREE.MathUtils.lerp(de.sph.phi, v.phi, p), de.sph.theta + dT * p);
    cam.position.setFromSpherical(s).add(cible);
    ctl.target.copy(cible);
    cam.fov = THREE.MathUtils.lerp(de.fov, v.fov, p);
    cam.updateProjectionMatrix();
    cam.lookAt(cible);
  }, depart ? easeOut : easeInOut).then(() => {
    if (etat.vue !== 'domaine') return;
    ctl.minDistance = DOM.dist[0]; ctl.maxDistance = DOM.dist[1];
  });
}
function distanceDomaine(theta, phi, fov) {
  const fwd = new THREE.Vector3().setFromSphericalCoords(1, phi, theta).negate();
  const droite = new THREE.Vector3().crossVectors(fwd, M.camera.up).normalize();
  const haut = new THREE.Vector3().crossVectors(droite, fwd);
  const t = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const tH = t * M.camera.aspect * M.decalage.wv * 0.8, tV = t * M.decalage.hv * 0.8;
  const p = new THREE.Vector3();
  let d = 0;
  for (const c of DOM.coins) {
    p.copy(c).sub(DOM.centre);
    const z = p.dot(fwd);
    d = Math.max(d, Math.abs(p.dot(droite)) / tH - z, Math.abs(p.dot(haut)) / tV - z);
  }
  return d;
}
function vueDomaine() {
  const portrait = M.camera.aspect * M.decalage.wv < M.decalage.hv;
  const a = DOM.axe;
  const angles = portrait ? [Math.PI / 2 - a, -Math.PI / 2 - a] : [-a, Math.PI - a];
  const norm = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  // des deux cadrages possibles, celui qui garde le nord vers le haut de l'écran
  const theta = angles.map(norm).sort((x, y) => Math.abs(x) - Math.abs(y))[0];
  const phi = degres(portrait ? 38 : 42), fov = 32;
  const rayon = distanceDomaine(theta, phi, fov);
  DOM.dist = [Math.max(26, rayon * 0.17), rayon * 1.45];
  DOM.brume = [rayon + DOM.rayon * 1.4, rayon + DOM.rayon * 5];
  return { cible: DOM.centre.clone(), rayon, phi, theta, fov };
}
function interactionDomaine() {
  etatDom.interagi = true;
  $('#aide').classList.add('cachee');
}
function recentrer() {
  interactionDomaine();
  camVers(vueDomaine(), 1200);
}
function orienterNord() {
  const ctl = M.controls, sph = new THREE.Spherical().setFromVector3(M.camera.position.clone().sub(ctl.target));
  interactionDomaine();
  camVers({ cible: ctl.target.clone(), rayon: sph.radius, phi: sph.phi, theta: 0, fov: M.camera.fov }, 900);
}
function bornerDomaine() {
  const t = M.controls.target;
  const x = Math.min(DOM.max.x, Math.max(DOM.min.x, t.x)), z = Math.min(DOM.max.y, Math.max(DOM.min.y, t.z));
  if (x === t.x && z === t.z && t.y === 0) return;
  const d = new THREE.Vector3(x - t.x, -t.y, z - t.z);
  t.add(d); M.camera.position.add(d);
}

/* sélection d'un lodge */
const rayDomaine = { ray: null, ndc: null };
function lodgeSous(e) {
  const r = $('#scene').getBoundingClientRect();
  rayDomaine.ray ??= new THREE.Raycaster();
  rayDomaine.ndc ??= new THREE.Vector2();
  rayDomaine.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  rayDomaine.ray.setFromCamera(rayDomaine.ndc, M.camera);
  const hit = rayDomaine.ray.intersectObject(DOM.proxys, true)[0];
  return hit ? hit.object.userData.lodge : -1;
}
function nomLodge(l) { return l.f.nom; }
function remplirCarteLodge(l) {
  const el = $('#lodge-carte');
  el.dataset.i = String(l.i);
  el.querySelector('.lc-pastille').style.background = l.t.hex;
  el.querySelector('.lc-nom').textContent = nomLodge(l);
  el.querySelector('.lc-meta').textContent = `Lot ${l.lot} · RAL ${l.t.ral} ${l.t.nom}`;
  const a = el.querySelector('.lc-voir');
  a.href = `#${l.type}`;
  a.dataset.ral = l.t.ral;
  a.setAttribute('aria-label', `Voir l’${nomLodge(l)} en 3D, teinte RAL ${l.t.ral} ${l.t.nom}`);
}
function majHalos(duree = 260) {
  if (!DOM) return;
  const actif = etatDom.choisi >= 0 ? etatDom.choisi : etatDom.survol;
  const depart = DOM.lodges.map((l) => l.opacite);
  const cible = DOM.lodges.map((l) => (l.i === actif ? 1 : etatDom.type === l.type ? 0.6 : 0));
  DOM.lodges.forEach((l, i) => { if (cible[i] > 0) l.halo.visible = true; });
  tween('halos', duree, (p) => {
    DOM.lodges.forEach((l, i) => {
      l.opacite = depart[i] + (cible[i] - depart[i]) * p;
      l.halo.material.opacity = l.opacite * 0.95;
      l.halo.visible = l.opacite > 0.005;
    });
  }, easeOut);
}
function choisirLodge(i, epingle) {
  if (!DOM) return;
  clearTimeout(etatDom.minuterie);
  if (epingle) etatDom.choisi = i;
  else etatDom.survol = i;
  const actif = etatDom.choisi >= 0 ? etatDom.choisi : etatDom.survol;
  majHalos();
  const el = $('#lodge-carte');
  if (actif < 0) {
    el.classList.remove('visible');
    el.inert = true;
  } else {
    if (el.dataset.i !== String(actif)) remplirCarteLodge(DOM.lodges[actif]);
    el.classList.add('visible');
    el.inert = false;
    el.classList.toggle('epinglee', etatDom.choisi >= 0);
  }
  if (M) M.sale = true;
}
function placerCarteLodge() {
  if (etat.vue !== 'domaine' || !DOM) return;
  const actif = etatDom.choisi >= 0 ? etatDom.choisi : etatDom.survol;
  if (actif < 0) return;
  const el = $('#lodge-carte'), l = DOM.lodges[actif];
  tmpV ??= new THREE.Vector3();
  const W = M.renderer.domElement.clientWidth, H = M.renderer.domElement.clientHeight;
  tmpV.copy(l.ancre).project(M.camera);
  const x = (tmpV.x * 0.5 + 0.5) * W, y = (-tmpV.y * 0.5 + 0.5) * H;
  const horsChamp = tmpV.z > 1 || x < -20 || x > W + 20 || y < -20 || y > H + 20;
  const w = el.offsetWidth, h = el.offsetHeight, ecart = 16;
  let top = y - h - ecart, dessous = false;
  if (top < M.zone.haut) {
    tmpV.copy(l.base).project(M.camera);
    top = (-tmpV.y * 0.5 + 0.5) * H + ecart;
    dessous = true;
  }
  top = Math.max(M.zone.haut, Math.min(M.zone.bas - h, top));
  const gauche = Math.max(8, Math.min(W - 8 - w, x - w / 2));
  el.style.transform = `translate(${gauche.toFixed(1)}px, ${top.toFixed(1)}px)`;
  el.style.setProperty('--pointe', `${Math.max(18, Math.min(w - 18, x - gauche)).toFixed(1)}px`);
  el.classList.toggle('dessous', dessous);
  el.style.visibility = horsChamp ? 'hidden' : '';
}
let dernierCap = null;
function majBoussole() {
  if (etat.vue !== 'domaine') return;
  const a = M.controls.getAzimuthalAngle();
  if (dernierCap !== null && Math.abs(a - dernierCap) < 0.002) return;
  dernierCap = a;
  $('#boussole-aiguille').style.transform = `rotate(${((a * 180) / Math.PI).toFixed(2)}deg)`;
}
function majLegende() {
  document.querySelectorAll('#legende button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === etatDom.type)));
}
function suivreDomaine() {
  const cv = $('#scene');
  let appuiD = null;
  const effacerSurvol = () => {
    clearTimeout(etatDom.minuterie);
    etatDom.minuterie = setTimeout(() => { if (!etatDom.surCarte) choisirLodge(-1, false); }, 420);
  };
  cv.addEventListener('pointerdown', (e) => { if (etat.vue === 'domaine') appuiD = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', (e) => {
    if (etat.vue !== 'domaine' || !appuiD || !DOM) return;
    const d = Math.hypot(e.clientX - appuiD.x, e.clientY - appuiD.y);
    appuiD = null;
    if (d > 8) return;
    const i = lodgeSous(e);
    if (i < 0) { etatDom.survol = -1; choisirLodge(-1, true); return; }
    choisirLodge(i, true);
    interactionDomaine();
  });
  cv.addEventListener('pointermove', (e) => {
    if (etat.vue !== 'domaine' || !DOM || e.pointerType !== 'mouse' || e.buttons) return;
    const i = lodgeSous(e);
    cv.style.cursor = i >= 0 ? 'pointer' : '';
    if (i >= 0 && i !== etatDom.survol) choisirLodge(i, false);
    else if (i < 0 && etatDom.survol >= 0) effacerSurvol();
    else if (i >= 0) clearTimeout(etatDom.minuterie);
  });
  cv.addEventListener('pointerleave', () => { if (etat.vue === 'domaine' && etatDom.survol >= 0) effacerSurvol(); });
  const carte = $('#lodge-carte');
  carte.addEventListener('pointerenter', () => { etatDom.surCarte = true; clearTimeout(etatDom.minuterie); });
  carte.addEventListener('pointerleave', () => { etatDom.surCarte = false; if (etatDom.choisi < 0 && etatDom.survol >= 0) effacerSurvol(); });
}

function remplirDomaine(s) {
  const n = s ? s.lodges.length : 19;
  document.title = 'Le Domaine demain — Visionneuse 3D';
  $('#titre-nom').textContent = 'Le Domaine demain';
  $('#titre-dims').textContent = `${n} Ecolodges · vue du ciel`;
  $('#chargement-nom').textContent = 'Le Domaine demain';
  $('#scene').setAttribute('aria-label', 'Le Domaine vu du ciel : glissez pour tourner, pincez pour zoomer, touchez un lodge pour le découvrir');
  majBascule(DOMAINE);
  if (s) {
    for (const id of MODELES) {
      const nb = s.lodges.filter((l) => l.type === id).length;
      const b = document.querySelector(`#legende button[data-type="${id}"]`);
      b.querySelector('b').textContent = nb;
      b.setAttribute('aria-label', `${fiches[id]?.nom || id} : ${nb} lodges, les mettre en évidence`);
    }
  }
}
function construireListeLodges() {
  $('#lodges-liste').innerHTML = DOM.lodges.map((l) =>
    `<li><a href="#${l.type}" data-i="${l.i}" data-ral="${esc(l.t.ral)}">${esc(nomLodge(l))}, lot ${esc(l.lot)}, RAL ${esc(l.t.ral)} ${esc(l.t.nom)} : voir ce modèle</a></li>`).join('');
  $('#lodges-liste').querySelectorAll('a').forEach((a) => a.addEventListener('focus', () => choisirLodge(+a.dataset.i, true)));
}

async function ouvrirDomaine() {
  const n = ++jeton;
  document.body.dataset.ecran = 'vue';
  document.body.classList.add('en-domaine');
  document.body.classList.remove('en-visite');
  $('#vue').hidden = false;
  fermerFiche();
  $('#ar').hidden = true;
  $('#visite-pieces').hidden = true;
  $('#etiquettes').innerHTML = '';
  remplirDomaine(null);
  const deja = !!DOM;
  if (!deja) {
    $('#chargement-dessin').innerHTML = '';
    chargementEtat('charge', 'Préparation du Domaine…', 0);
  }
  const prog = {};
  suiviProgression = (mid, e) => {
    if (n !== jeton || !e.total) return;
    prog[mid] = e;
    const vals = Object.values(prog);
    const pct = (vals.reduce((a, x) => a + x.loaded, 0) / vals.reduce((a, x) => a + x.total, 0)) * 100;
    chargementEtat('charge', `Chargement des Ecolodges · ${Math.round(pct)} %`, pct);
  };
  let s;
  try {
    await chargerLibs();
    if (!M) creerMoteur();
    s = await chargerSite();
    if (!s) throw new Error('Données du Domaine indisponibles');
    if (n !== jeton) return;
    remplirDomaine(s);
    if (!deja) $('#chargement-dessin').innerHTML = dessinDomaine(s);
    await Promise.all(MODELES.map(chargerFiche));
    const g = await Promise.all(MODELES.map(prechargerModele));
    if (!DOM) {
      if (!SITE) { SITE = construireSite(s); M.scene.add(SITE.exterieur); }
      DOM = construireDomaine(s, Object.fromEntries(MODELES.map((id, i) => [id, g[i]])));
      M.scene.add(DOM.groupe);
      construireListeLodges();
    }
  } catch (err) {
    if (n !== jeton) return;
    console.warn('Chargement impossible :', err);
    const webgl = !!document.createElement('canvas').getContext('webgl2');
    chargementEtat('erreur', webgl
      ? 'Le Domaine n’a pas pu être chargé. Vérifiez la connexion puis réessayez.'
      : 'Ce navigateur ne permet pas l’affichage 3D (WebGL indisponible).');
    return;
  }
  if (n !== jeton) return;
  M.actif = true;
  afficherDomaine(!deja);
  chargementEtat('fini', null, 100);
  $('#titre-nom').focus({ preventScroll: true });
}

function afficherDomaine(entree) {
  if (etat.m) { M.scene.remove(etat.m.racine); etat.m = null; }
  annulerTween('toit');
  etat.id = DOMAINE; etat.vue = 'domaine'; etat.toit = false;
  // le site de la visionneuse est remis dans le repère du plan d'implantation
  SITE.exterieur.visible = true;
  SITE.exterieur.rotation.y = 0;
  SITE.interieur.position.set(0, 0, 0);
  SITE.lodges.forEach((o) => { o.visible = false; });
  SITE.inst.forEach((it, k) => { it.m.instanceMatrix.array.set(DOM.masques[k]); it.m.instanceMatrix.needsUpdate = true; });
  SITE.batiments.forEach((o) => { o.visible = horsOrtho(SITE.s.ortho, o.userData.centre[0], -o.userData.centre[1]) < 4; });
  SITE.houppiers.geometry = DOM.geoHouppier;
  SITE.haies.geometry = DOM.geoHaie;
  SITE.autour.visible = false;
  DOM.groupe.visible = true;
  M.sol.visible = false;
  M.contact.visible = false;
  M.camera.far = 4000;
  M.camera.updateProjectionMatrix();
  const c = M.controls;
  c.enableRotate = c.enableZoom = c.enablePan = true;
  c.screenSpacePanning = false;
  c.rotateSpeed = 0.55;
  c.autoRotateSpeed = 0.35;
  c.minPolarAngle = DOM_POLAIRE[0]; c.maxPolarAngle = DOM_POLAIRE[1];
  c.mouseButtons.LEFT = THREE.MOUSE.ROTATE; c.touches.ONE = THREE.TOUCH.ROTATE;
  // lumière : soleil calé sur l'emprise ; scène immobile → ombres calculées une seule fois
  M.cadre = { c: DOM.centre.clone(), r: 120 };
  M.soleil.target.position.copy(DOM.centre);
  const sc = M.soleil.shadow.camera, e = DOM.rayon + 30;
  sc.left = sc.bottom = -e; sc.right = sc.top = e; sc.near = 60; sc.far = 760; sc.updateProjectionMatrix();
  M.soleil.shadow.normalBias = 0.3;
  M.soleil.shadow.bias = -0.0012;
  M.contre.position.copy(DOM.centre).add(new THREE.Vector3(0.8, 0.6, -1).multiplyScalar(240));
  M.renderer.shadowMap.autoUpdate = false;
  M.renderer.shadowMap.needsUpdate = true;
  etatDom.interagi = false;
  etatDom.type = null;
  etatDom.survol = -1;
  choisirLodge(-1, true);
  majLegende();
  dernierCap = null;
  $('#aide').classList.remove('cachee');
  redimensionner();
  const v = vueDomaine();
  appliquerAmbiance(etat.ambiance, 0);
  const depart = entree && !reduit.matches
    ? { cible: v.cible.clone(), sph: new THREE.Spherical(v.rayon * 1.55, v.phi - 0.3, v.theta - 0.75), fov: v.fov }
    : null;
  camVers(v, depart ? 2600 : 1000, depart);
  const vue = $('#vue');
  vue.classList.remove('prete');
  requestAnimationFrame(() => vue.classList.add('prete'));
}
function quitterDomaine() {
  document.body.classList.remove('en-domaine');
  if (!DOM || !DOM.groupe.visible) return;
  DOM.groupe.visible = false;
  SITE.houppiers.geometry = DOM.geoHouppierOrig;
  SITE.haies.geometry = DOM.geoHaieOrig;
  SITE.autour.visible = true;
  SITE.batiments.forEach((o) => { o.visible = true; });
  SITE.derniere.set(1e9, 0, 0);
  M.contact.visible = true;
  M.camera.far = 400;
  M.camera.updateProjectionMatrix();
  M.renderer.shadowMap.autoUpdate = true;
  M.soleil.shadow.normalBias = 0.03;
  M.soleil.shadow.bias = -0.0004;
  M.controls.screenSpacePanning = true;
  M.controls.autoRotateSpeed = 0.55;
  M.controls.minPolarAngle = 0;
  clearTimeout(etatDom.minuterie);
  etatDom.survol = etatDom.choisi = -1;
  $('#lodge-carte').classList.remove('visible');
  $('#lodge-carte').inert = true;
  $('#scene').style.cursor = '';
}

/* -------- toitures (24 m² : sur-toiture bois ou toit plat) -------- */
const TOITURES = {
  sirius24: { objets: ['Charpente', 'Couverture bac acier', 'Rives de toit', 'Pignons', 'Gouttière avant', 'Gouttière arrière', 'Descente avant', 'Descente arrière', 'Coude avant', 'Coude arrière'] },
};
const NOMS_TOITURE = { bois: 'Toiture oléronnaise', plat: 'Toit plat' };
function appliquerToiture(t) {
  const m = etat.m;
  if (!m) return;
  m.toiture = t;
  m.surToiture.forEach((o) => { o.visible = t === 'bois'; });
  $('#toiture-nom').textContent = NOMS_TOITURE[t];
  const li = [...document.querySelectorAll('#fiche-liste li')].find((x) => /toit/i.test(x.textContent));
  if (li) li.textContent = t === 'bois' ? 'Toiture oléronnaise, bac acier à joints debout' : 'Toit plat, bac acier';
  document.querySelectorAll('#toitures button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.toiture === t)));
  M.sale = true;
}

/* -------- ambiances -------- */
const EMISSIFS = { Applique: 0xffc487, 'Ampoule guirlande': 0xffc27a, Lanterne: 0xffb866, 'Abat jour': 0xffd9a8 };
const AMBIANCES = {
  jour: { expo: 1.0, env: 0.9, vitre: 0, hemi: [0xdfe7ff, 0.45], soleil: [0xfff4e6, 2.4], dir: [-0.55, 1.15, 0.8], contre: [0xbcd2ff, 0.6], ombre: 0.3, lampe: 0,
          emis: { Applique: 3, 'Ampoule guirlande': 0, Lanterne: 0, 'Abat jour': 0 } },
  soir: { expo: 1.05, env: 0.38, vitre: 0.55, hemi: [0xffc9a0, 0.3], soleil: [0xff9248, 2.0], dir: [-0.95, 0.38, 0.55], contre: [0x7d98ff, 0.35], ombre: 0.38, lampe: 3.5,
          emis: { Applique: 9, 'Ampoule guirlande': 7, Lanterne: 6, 'Abat jour': 1.6 } },
  nuit: { expo: 1.15, env: 0.07, vitre: 1.2, hemi: [0x5d70aa, 0.16], soleil: [0x9fb6ff, 0.35], dir: [0.4, 1.2, 0.6], contre: [0x4c66c4, 0.2], ombre: 0.18, lampe: 6,
          emis: { Applique: 16, 'Ampoule guirlande': 12, Lanterne: 9, 'Abat jour': 3 } },
};
function placerSoleil(dir) {
  if (!M.cadre) return;
  const { c, r } = M.cadre;
  M.soleil.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(r * 3));
}
function appliquerAmbiance(nom, duree = 700) {
  const a = AMBIANCES[nom] || AMBIANCES.jour;
  etat.ambiance = nom;
  $('#vue').dataset.ambiance = nom;
  document.querySelectorAll('.ambiance button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ambiance === nom)));
  if (!M) return;
  const domaine = etat.vue === 'domaine' && DOM;
  if (SITE && SITE.exterieur.visible) {
    M.scene.background = new THREE.Color(CIELS[nom]);
    M.scene.fog = domaine ? new THREE.Fog(CIELS[nom], DOM.brume[0], DOM.brume[1]) : new THREE.Fog(CIELS[nom], 70, 330);
  }
  if (DOM) DOM.voile.material.color.set(CIELS[nom]);
  const m = etat.m;
  const dDom = domaine ? { emis: DOM.lumineux.map((x) => x.emissiveIntensity), vitre: DOM.vitrages[0]?.emissiveIntensity ?? 0 } : null;
  const d = {
    expo: M.renderer.toneMappingExposure, env: M.scene.environmentIntensity, ombre: M.sol.material.opacity,
    hemi: [M.hemi.color.clone(), M.hemi.intensity], soleil: [M.soleil.color.clone(), M.soleil.intensity], contre: [M.contre.color.clone(), M.contre.intensity],
    dir: M.cadre ? M.soleil.position.clone().sub(M.cadre.c).normalize() : new THREE.Vector3(...a.dir),
    lampe: m?.lampes[0]?.intensity ?? 0, emis: m ? m.lumineux.map((x) => x.emissiveIntensity) : [],
  };
  const cible = (k) => new THREE.Color(a[k][0]);
  const dir = new THREE.Vector3(...a.dir).normalize();
  const lerp = (x, y, p) => x + (y - x) * p;
  tween('ambiance', duree, (p) => {
    M.renderer.toneMappingExposure = lerp(d.expo, a.expo * (etat.vue === 'visite' ? 0.8 : 1), p);
    M.scene.environmentIntensity = lerp(d.env, a.env, p);
    M.sol.material.opacity = lerp(d.ombre, a.ombre, p);
    for (const k of ['hemi', 'soleil', 'contre']) { M[k].color.lerpColors(d[k][0], cible(k), p); M[k].intensity = lerp(d[k][1], a[k][1], p); }
    placerSoleil(d.dir.clone().lerp(dir, p).toArray());
    if (m) {
      m.lampes.forEach((l) => { l.intensity = lerp(d.lampe, a.lampe, p); });
      m.lumineux.forEach((x, i) => { x.emissiveIntensity = lerp(d.emis[i], a.emis[x.name] ?? 0, p); });
    }
    if (dDom) {
      DOM.lumineux.forEach((x, i) => { x.emissiveIntensity = lerp(dDom.emis[i], a.emis[x.name] ?? 0, p); });
      DOM.vitrages.forEach((x) => { x.emissiveIntensity = lerp(dDom.vitre, a.vitre, p); });
      M.renderer.shadowMap.needsUpdate = true;
    }
  }, easeInOut);
}

/* -------- teintes -------- */
function appliquerTeinte(t, duree = 300) {
  const m = etat.m;
  etat.teinte = t.ral;
  $('#teinte-nom').textContent = libelleTeinte(t);
  document.querySelectorAll('.pastille').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ral === t.ral)));
  if (!m) return;
  const cible = new THREE.Color(t.hex);
  const cibleM = new THREE.Color(MENUISERIES[t.menuiserie] || t.hex);
  const depart = m.teintables.map((mat) => mat.color.clone());
  const departM = m.menuiseries.map((mat) => mat.color.clone());
  tween('teinte', duree, (p) => {
    m.teintables.forEach((mat, i) => mat.color.lerpColors(depart[i], cible, p));
    m.menuiseries.forEach((mat, i) => mat.color.lerpColors(departM[i], cibleM, p));
  }, easeOut);
  teinterAR();
}

/* -------- étiquettes -------- */
function construireEtiquettes(f) {
  $('#etiquettes').innerHTML = f.pieces.map((p) =>
    `<div class="etiquette"><span class="pt"></span><b>${esc(p.nom)}</b>${p.surface ? `<span>${esc(p.surface)}</span>` : ''}</div>`).join('');
}
function etiquettesActives() {
  if (!etat.m) return false;
  return etat.m.toit ? etat.toit : etat.vue === 'int' || etat.vue === 'plan';
}
function majEtiquettes() {
  const on = etiquettesActives();
  [...$('#etiquettes').children].forEach((el, i) => {
    clearTimeout(el._t);
    if (on) el._t = setTimeout(() => el.classList.add('visible'), reduit.matches ? 0 : 450 + i * 70);
    else el.classList.remove('visible');
  });
  if (M) M.sale = true;
}
let tmpV;
function placerEtiquettes() {
  const m = etat.m;
  if (!m || !m.f.pieces.length) return;
  tmpV ??= new THREE.Vector3();
  const W = M.renderer.domElement.clientWidth, H = M.renderer.domElement.clientHeight;
  const els = $('#etiquettes').children;
  const items = m.f.pieces.map((p, i) => {
    tmpV.set(...p.position).project(M.camera);
    const el = els[i];
    return el && { el, x: (tmpV.x * 0.5 + 0.5) * W, y: (-tmpV.y * 0.5 + 0.5) * H, w: el.offsetWidth, h: el.offsetHeight, cache: tmpV.z > 1 };
  }).filter(Boolean);
  // anti-chevauchement : on décale vers le bas une étiquette qui recouvre une précédente
  const posees = [];
  items.sort((a, b) => a.y - b.y).forEach((it) => {
    for (const b of posees) {
      if (Math.abs(it.x - b.x) < (it.w + b.w) / 2 + 4 && Math.abs(it.y - b.y) < (it.h + b.h) / 2 + 3) it.y = b.y + (it.h + b.h) / 2 + 3;
    }
    posees.push(it);
    it.el.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px) translate(-50%, -50%)`;
    it.el.style.visibility = it.cache ? 'hidden' : '';
  });
}

/* -------- réalité augmentée (model-viewer caché) -------- */
const appareilAR = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let mv = null;
function preparerAR(id) {
  const bouton = $('#ar');
  bouton.hidden = true;
  if (!appareilAR) return;
  if (!mv) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';
    delete window.__THREE__; // model-viewer embarque sa propre copie de three.js : évite l'avertissement de doublon
    document.head.appendChild(s);
    mv = document.createElement('model-viewer');
    mv.setAttribute('ar', '');
    mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    mv.setAttribute('ar-placement', 'floor');
    mv.setAttribute('ar-scale', 'fixed');
    mv.setAttribute('loading', 'eager');
    mv.setAttribute('aria-hidden', 'true');
    mv.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    document.body.appendChild(mv);
    mv.addEventListener('load', () => {
      teinterAR();
      bouton.hidden = !mv.canActivateAR || etat.id === DOMAINE;
    });
    bouton.addEventListener('click', () => mv.activateAR());
  }
  mv.setAttribute('alt', `${fiches[id].nom} en réalité augmentée`);
  mv.src = urlGlb(id);
}
function libelleTeinte(t) {
  return `RAL ${t.ral} · ${t.nom}` + (NOM_MENUISERIE[t.menuiserie] ? ` · ${NOM_MENUISERIE[t.menuiserie]}` : '');
}
function teinterAR() {
  if (!mv?.model || !etat.m) return;
  const t = etat.m.f.teintes.find((x) => x.ral === etat.teinte);
  if (!t) return;
  for (const mat of mv.model.materials) {
    if (etat.m.f.materiaux_teintables.includes(mat.name)) mat.pbrMetallicRoughness.setBaseColorFactor(t.hex);
    else if (mat.name === 'Menuiseries' && MENUISERIES[t.menuiserie]) mat.pbrMetallicRoughness.setBaseColorFactor(MENUISERIES[t.menuiserie]);
  }
}

/* ---------------- Interface de la visionneuse ---------------- */
function majVues() {
  document.querySelectorAll('.vues button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vue === etat.vue)));
}
function majToit() {
  const b = $('#toit');
  const dispo = !!etat.m?.toit;
  b.disabled = !dispo;
  b.setAttribute('aria-checked', String(dispo && etat.toit));
  $('#toit-sous').textContent = !dispo ? 'Indisponible sur ce modèle' : etat.toit ? 'Intérieur visible' : 'Pour voir l’intérieur';
}
function majBascule(courant) {
  $('#bascule').innerHTML = MODELES.map((id) => {
    const n = id.replace(/\D/g, '');
    return `<a href="#${id}" ${id === courant ? 'aria-current="page"' : ''} aria-label="${esc(fiches[id]?.nom || `Ecolodge ${n} m²`)}">${n}<small>m²</small></a>`;
  }).join('') + `<a href="#${DOMAINE}" class="bascule-domaine" ${courant === DOMAINE ? 'aria-current="page"' : ''} aria-label="Le Domaine demain, vue du ciel" title="Le Domaine demain"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4L3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg></a>`;
}
function remplirInterface(f) {
  document.title = `${f.nom} — Visionneuse 3D`;
  $('#titre-nom').textContent = f.nom;
  $('#titre-dims').textContent = f.dims || f.surface;
  $('#fiche-surface').textContent = f.surface;
  $('#fiche-dims').textContent = f.dims || '—';
  $('#fiche-liste').innerHTML = f.caracteristiques.map((c) => `<li>${esc(c)}</li>`).join('');
  majBascule(f.id);
  $('#scene').setAttribute('aria-label', 'Lodge en 3D : glissez pour tourner, pincez pour zoomer');
  const choisie = f.teintes.find((t) => t.ral === etat.teinte) || f.teintes[0];
  $('#pastilles').innerHTML = f.teintes.map((t) =>
    `<button type="button" class="pastille" role="radio" data-ral="${esc(t.ral)}" aria-checked="${t.ral === choisie.ral}" aria-label="RAL ${esc(t.ral)} ${esc(t.nom)}" title="RAL ${esc(t.ral)} · ${esc(t.nom)}"><i style="background:${esc(t.hex)}"></i></button>`).join('');
  $('#pastilles').querySelectorAll('.pastille').forEach((b) => {
    b.addEventListener('click', () => appliquerTeinte(f.teintes.find((t) => t.ral === b.dataset.ral)));
  });
  $('#teinte-nom').textContent = libelleTeinte(choisie);
  $('#chargement-nom').textContent = f.nom;
  construireEtiquettes(f);
  return choisie;
}

function chargementEtat(mode, texte, pct) {
  const c = $('#chargement');
  c.classList.toggle('fini', mode === 'fini');
  c.classList.toggle('erreur', mode === 'erreur');
  $('#chargement-erreur').hidden = mode !== 'erreur';
  if (texte) $('#chargement-txt').textContent = texte;
  if (pct != null) $('#jauge').style.width = `${pct}%`;
}

let jeton = 0;
async function ouvrirVisionneuse(id) {
  const n = ++jeton;
  document.body.dataset.ecran = 'vue';
  document.body.classList.remove('en-domaine');
  $('#vue').hidden = false;
  $('#fiche').classList.remove('ouverte');
  $('#titre').setAttribute('aria-expanded', 'false');
  const f = await chargerFiche(id);
  if (n !== jeton) return;
  const teinte = remplirInterface(f);
  const deja = !!prepares[id];
  if (!deja) {
    $('#chargement-dessin').innerHTML = dessinLodge(longueur(f));
    chargementEtat('charge', 'Préparation de la maquette…', 0);
  }
  suiviProgression = (mid, e) => {
    if (mid !== id || n !== jeton) return;
    if (e.total) chargementEtat('charge', `Chargement du modèle 3D · ${Math.round((e.loaded / e.total) * 100)} %`, (e.loaded / e.total) * 100);
    else chargementEtat('charge', `Chargement du modèle 3D · ${(e.loaded / 1e6).toFixed(1).replace('.', ',')} Mo`);
  };
  try {
    await chargerLibs();
    if (!M) creerMoteur();
    if (!deja) prepares[id] = preparer(await prechargerModele(id), f);
  } catch (err) {
    if (n !== jeton) return;
    console.warn('Chargement impossible :', err);
    const webgl = !!document.createElement('canvas').getContext('webgl2');
    chargementEtat('erreur', webgl
      ? 'Ce modèle n’a pas pu être chargé. Vérifiez la connexion puis réessayez.'
      : 'Ce navigateur ne permet pas l’affichage 3D (WebGL indisponible).');
    return;
  }
  if (n !== jeton) return;
  M.actif = true;
  afficherModele(prepares[id], teinte, !deja);
  chargementEtat('fini', null, 100);
  $('#titre-nom').focus({ preventScroll: true });
  preparerAR(id);
}

function afficherModele(m, teinte, entree) {
  quitterDomaine();
  if (etat.m && etat.m !== m) M.scene.remove(etat.m.racine);
  etat.m = m;
  etat.id = m.f.id;
  M.scene.add(m.racine);
  annulerTween('toit');
  if (m.toit) {
    m.toit.position.y = m.toitY0;
    m.toit.visible = true;
    m.opaciteToit = 1;
    restaurerToit(m);
  }
  etat.toit = false;
  etat.vue = 'ext';
  etat.vueAvant = null;
  $('#aide').classList.toggle('cachee', etat.interagi);
  construireVisite(m.f);
  reglerControles('ext');
  majVues();
  majToit();
  majEtiquettes();

  // sol, ombres et lumières calés sur l'emprise
  const b = m.bTout, r = b.getBoundingSphere(new THREE.Sphere()).radius;
  const c = b.getCenter(new THREE.Vector3());
  M.sol.position.set(c.x, b.min.y + 0.001, c.z);
  M.sol.scale.set(r * 8, r * 8, 1);
  const tCorps = m.bCorps.getSize(new THREE.Vector3()), cCorps = m.bCorps.getCenter(new THREE.Vector3());
  M.contact.position.set(cCorps.x, b.min.y + 0.004, cCorps.z);
  M.contact.scale.set(tCorps.x * 1.5, tCorps.z * 1.7, 1);
  M.cadre = { c: c.clone(), r };
  placerSoleil(AMBIANCES[etat.ambiance].dir);
  M.soleil.target.position.copy(c);
  const sc = M.soleil.shadow.camera;
  sc.left = sc.bottom = -r * 1.25; sc.right = sc.top = r * 1.25; sc.near = r * 0.5; sc.far = r * 6;
  sc.updateProjectionMatrix();
  M.contre.position.copy(c).add(new THREE.Vector3(0.8, 0.6, -1).multiplyScalar(r * 2));

  appliquerTeinte(teinte, 0);
  appliquerAmbiance(etat.ambiance, 0);
  $('#toitures').hidden = !m.surToiture.length;
  majSite();
  if (m.surToiture.length) appliquerToiture(m.toiture);

  // caméra : travelling d'arrivée à la première ouverture
  redimensionner();
  const v = vueCible('ext');
  const depart = entree && !reduit.matches
    ? { cible: v.cible.clone().add(new THREE.Vector3(0, r * 0.15, 0)), sph: new THREE.Spherical(v.rayon * 1.55, v.phi - 0.32, v.theta - 0.9), fov: v.fov }
    : null;
  allerA('ext', depart ? 2200 : 900, depart || undefined);
  const vue = $('#vue');
  vue.classList.remove('prete');
  requestAnimationFrame(() => vue.classList.add('prete'));
}

function afficherMenu() {
  jeton++;
  document.body.dataset.ecran = 'menu';
  document.body.classList.remove('en-domaine');
  document.title = 'Ecolodges · Domaine les Oyats — Visionneuse 3D';
  $('#vue').hidden = true;
  if (M) M.actif = false;
  window.scrollTo(0, 0);
}

function router() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (MODELES.includes(id)) ouvrirVisionneuse(id);
  else if (id === DOMAINE) ouvrirDomaine();
  else afficherMenu();
}

/* ---------------- Câblage ---------------- */
function fermerFiche() {
  $('#fiche').classList.remove('ouverte');
  $('#titre').setAttribute('aria-expanded', 'false');
}
$('#toit').addEventListener('click', () => choisirVue(etat.toit ? 'ext' : 'int'));
document.querySelectorAll('.vues button').forEach((b) => b.addEventListener('click', () => choisirVue(b.dataset.vue)));
document.querySelectorAll('.ambiance button').forEach((b) => b.addEventListener('click', () => appliquerAmbiance(b.dataset.ambiance)));
document.querySelectorAll('#toitures button').forEach((b) => b.addEventListener('click', () => appliquerToiture(b.dataset.toiture)));
$('#bouton-site').addEventListener('click', () => { etat.site = !etat.site; majSite(); });
$('#bouton-survol').addEventListener('click', survoler);
$('#titre').addEventListener('click', () => {
  if (matchMedia('(min-width: 900px)').matches || etat.id === DOMAINE) return;
  const ouverte = $('#fiche').classList.toggle('ouverte');
  $('#titre').setAttribute('aria-expanded', String(ouverte));
});
$('#scene').addEventListener('pointerdown', fermerFiche);
$('#reessayer').addEventListener('click', router);
$('#recentrer').addEventListener('click', recentrer);
$('#boussole').addEventListener('click', orienterNord);
document.querySelectorAll('#legende button').forEach((b) => b.addEventListener('click', () => {
  etatDom.type = etatDom.type === b.dataset.type ? null : b.dataset.type;
  majLegende();
  majHalos();
}));
// « Voir ce modèle » depuis le Domaine : la visionneuse s'ouvre dans la teinte du lodge choisi
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-ral]');
  if (a) etat.teinte = a.dataset.ral;
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || document.body.dataset.ecran !== 'vue') return;
  if ($('#fiche').classList.contains('ouverte')) fermerFiche();
  else location.hash = '';
});
window.addEventListener('hashchange', router);

// accès en lecture pour les tests
window.sirius = {
  get modele() { return etat.id; },
  get vue() { return etat.vue; },
  get toitLeve() { return etat.toit; },
  get toitPresent() { return !!etat.m?.toit; },
  get teinte() { return etat.teinte; },
  get ambiance() { return etat.ambiance; },
  get site() { return !!(SITE && SITE.exterieur.visible); },
  survoler() { survoler(); },
  get toiture() { return etat.m?.surToiture.length ? etat.m.toiture : null; },
  // diagnostic : objets touchés depuis l'œil dans une direction [x, y, z]
  sonde(d) {
    const ray = new THREE.Raycaster(M.controls.target.clone(), new THREE.Vector3(...d).normalize());
    return ray.intersectObject(etat.m.racine, true).slice(0, 4).map((h) => `${h.object.name} · ${[].concat(h.object.material)[0]?.name} · ${h.distance.toFixed(2)} · ${[].concat(h.object.material)[0]?.side}`);
  },
  get camera() { return M ? { pos: M.camera.position.toArray().map((v) => +v.toFixed(2)), cible: M.controls.target.toArray().map((v) => +v.toFixed(2)) } : null; },
  couleur(nom) {
    const mat = etat.m?.teintables.find((x) => x.name === nom);
    return mat ? '#' + mat.color.getHexString() : null;
  },
  get materiaux() { return etat.m ? etat.m.teintables.map((x) => x.name) : []; },
  get pixelRatio() { return M?.renderer.getPixelRatio(); },
  get domaine() {
    return DOM ? { brume: M.scene.fog && [Math.round(M.scene.fog.near), Math.round(M.scene.fog.far)], lodges: DOM.lodges.length, choisi: etatDom.choisi, survol: etatDom.survol, type: etatDom.type, appels: M.renderer.info.render.calls, triangles: M.renderer.info.render.triangles } : null;
  },
  choisirLodge(i) { choisirLodge(i, true); },
  lodgeEcran(i) {
    const p = DOM.lodges[i].base.clone().project(M.camera), c = M.renderer.domElement;
    return { x: (p.x * 0.5 + 0.5) * c.clientWidth, y: (-p.y * 0.5 + 0.5) * c.clientHeight };
  },
  // image du canevas (vignette du menu)
  capture(l = 1280, h = 800) {
    M.sale = true; boucle(performance.now());
    const src = M.renderer.domElement, cv = document.createElement('canvas');
    cv.width = l; cv.height = h;
    const k = Math.max(l / src.width, h / src.height), w = src.width * k, hh = src.height * k;
    cv.getContext('2d').drawImage(src, (l - w) / 2, (h - hh) / 2, w, hh);
    return cv.toDataURL('image/jpeg', 0.86);
  },
  // force une image (onglet masqué : requestAnimationFrame suspendu)
  rendre() { if (M) { M.sale = true; boucle(performance.now()); } },
};

construireMenu().then(() => {
  router();
  const inactif = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
  inactif(() => chargerLibs().catch(() => {}));
});
