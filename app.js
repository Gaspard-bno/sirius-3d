// Lodges SIRIUS — visionneuse 3D (DreamFly)
// Menu + routage par hash ; three.js chargé à la demande via l'importmap.

const MODELES = ['sirius24', 'sirius40'];
const EMBED = window.__EMBED__ || null; // version hors ligne : JSON + GLB intégrés
const TEINTES_DEFAUT = [
  { ral: '6019', hex: '#A1C3A9', nom: 'Vert pastel' },
  { ral: '1014', hex: '#F6EACE', nom: 'Ivoire' },
  { ral: '1001', hex: '#DCB68C', nom: 'Beige' },
  { ral: '7032', hex: '#D0C8BE', nom: 'Gris silex' },
  { ral: '5024', hex: '#92B0AE', nom: 'Bleu pastel' },
];
const reduit = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const urlGlb = (id) => (EMBED ? EMBED.modeles[id]?.glb : `models/${id}.glb`);
const urlVignette = (f) => (EMBED ? EMBED.modeles[f.id]?.vignette : f.vignette && `models/${f.vignette}`);

/* ---------------- Fiches (JSON) ---------------- */
const fiches = {};
function normaliser(j, id) {
  const n = parseInt(id.replace(/\D/g, ''), 10);
  return {
    id,
    nom: j.nom || `SIRIUS ${n} m²`,
    accroche: j.accroche || '',
    dims: j.dims || '',
    surface: j.surface || `${n} m²`,
    caracteristiques: Array.isArray(j.caracteristiques) ? j.caracteristiques : [],
    pieces: Array.isArray(j.pieces) ? j.pieces.filter((p) => Array.isArray(p.position) && p.position.length === 3) : [],
    teintes: Array.isArray(j.teintes) && j.teintes.length ? j.teintes : TEINTES_DEFAUT,
    materiaux_teintables: j.materiaux_teintables || ['Bardage', 'Cadre lisse', 'Menuiseries'],
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

async function construireMenu() {
  const [liste, dispo] = await Promise.all([Promise.all(MODELES.map(chargerFiche)), fichiersDisponibles()]);
  const vignette = (f) => (EMBED || !dispo || dispo.has(f.vignette) ? urlVignette(f) : null);
  const fleche = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  $('#cartes').innerHTML = liste.map((f, i) => `
    <article class="carte" data-id="${f.id}">
      <div class="vignette">
        <span class="vignette-num">${String(i + 1).padStart(2, '0')} / ${String(liste.length).padStart(2, '0')}</span>
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
    </article>`).join('');
  document.querySelectorAll('.vignette img').forEach((img) => {
    img.addEventListener('load', () => img.classList.add('ok'));
    img.addEventListener('error', () => img.remove());
  });
  document.querySelectorAll('.carte').forEach((c) => {
    const pre = () => { prechargerModele(c.dataset.id).catch(() => {}); };
    c.addEventListener('pointerenter', pre, { once: true });
    c.addEventListener('touchstart', pre, { once: true, passive: true });
    c.addEventListener('focusin', pre, { once: true });
  });
}

/* ---------------- Moteur three.js ---------------- */
let THREE, GLTFLoader, OrbitControls, RoomEnvironment;
let libs = null;
function chargerLibs() {
  libs ??= Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/environments/RoomEnvironment.js'),
  ]).then(([t, g, o, r]) => {
    THREE = t; GLTFLoader = g.GLTFLoader; OrbitControls = o.OrbitControls; RoomEnvironment = r.RoomEnvironment;
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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
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

  M = { renderer, scene, camera, controls, hemi, soleil, contre, sol, contact, cadre: null, sale: true, actif: false, decalage: { x: 0, y: 0, hv: 1, wv: 1 } };

  controls.addEventListener('start', () => {
    annulerTween('cam');
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
  const gauche = large ? $('#fiche').getBoundingClientRect().right + 12 : 0;
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
  if (!tweens.has('cam')) {
    M.controls.autoRotate = !etat.interagi && !reduit.matches && etat.vue === 'ext';
    if (M.controls.update()) M.sale = true;
  }
  if (!M.sale) return;
  M.sale = false;
  couperVegetation();
  M.renderer.render(M.scene, M.camera);
  placerEtiquettes();
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
  const noms = new Set(f.materiaux_teintables);
  racine.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) if (noms.has(m.name) && !teintables.includes(m)) teintables.push(m);
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
  return { racine, toit, toitY0: toit ? toit.position.y : 0, matsToit, teintables, bTout, bCorps, f, opaciteToit: 1, lampes, lumineux, points, surToiture, toiture: 'bois' };
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
  if (EMBED) return Promise.resolve(null);
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
  const tex = new THREE.TextureLoader().load('models/site_ortho.jpg', () => { M.sale = true; });
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
  const toit = new THREE.MeshStandardMaterial({ color: 0xb9bcbe, roughness: 0.7 }), mur = new THREE.MeshStandardMaterial({ color: 0xe6e1d8, roughness: 0.85 });
  for (const b of s.batiments) {
    const forme = new THREE.Shape(b.pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(forme, { depth: b.h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const o = new THREE.Mesh(geo, [toit, mur]); o.castShadow = o.receiveShadow = true;
    interieur.add(o);
  }
  // lodges du plan masse (volumes simplifiés)
  const lodges = s.lodges.map((l) => {
    const o = lodgeSimplifie(l.type, l.teinte);
    o.position.copy(VW(l.x, l.y)); o.rotation.y = l.rot; o.userData.lot = l.lot;
    interieur.add(o);
    return o;
  });
  return { exterieur, interieur, lodges, s, inst, camLocale: new THREE.Vector3(), derniere: new THREE.Vector3(1e9, 0, 0), derniereCible: new THREE.Vector3() };
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

/* -------- toitures (24 m² : sur-toiture bois ou toit plat) -------- */
const TOITURES = {
  sirius24: { objets: ['Charpente', 'Couverture bois', 'Gouttière avant', 'Gouttière arrière', 'Descente avant', 'Descente arrière', 'Coude avant', 'Coude arrière'] },
};
const NOMS_TOITURE = { bois: 'Sur-toiture bois', plat: 'Toit plat' };
function appliquerToiture(t) {
  const m = etat.m;
  if (!m) return;
  m.toiture = t;
  m.surToiture.forEach((o) => { o.visible = t === 'bois'; });
  $('#toiture-nom').textContent = NOMS_TOITURE[t];
  const li = [...document.querySelectorAll('#fiche-liste li')].find((x) => /toit/i.test(x.textContent));
  if (li) li.textContent = t === 'bois' ? 'Sur-toiture bois (charpente brute)' : 'Toit plat (bac acier)';
  document.querySelectorAll('#toitures button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.toiture === t)));
  M.sale = true;
}

/* -------- ambiances -------- */
const EMISSIFS = { Applique: 0xffc487, 'Ampoule guirlande': 0xffc27a, Lanterne: 0xffb866, 'Abat jour': 0xffd9a8 };
const AMBIANCES = {
  jour: { expo: 1.0, env: 0.9, hemi: [0xdfe7ff, 0.45], soleil: [0xfff4e6, 2.4], dir: [-0.55, 1.15, 0.8], contre: [0xbcd2ff, 0.6], ombre: 0.3, lampe: 0,
          emis: { Applique: 3, 'Ampoule guirlande': 0, Lanterne: 0, 'Abat jour': 0 } },
  soir: { expo: 1.05, env: 0.38, hemi: [0xffc9a0, 0.3], soleil: [0xff9248, 2.0], dir: [-0.95, 0.38, 0.55], contre: [0x7d98ff, 0.35], ombre: 0.38, lampe: 3.5,
          emis: { Applique: 9, 'Ampoule guirlande': 7, Lanterne: 6, 'Abat jour': 1.6 } },
  nuit: { expo: 1.15, env: 0.07, hemi: [0x5d70aa, 0.16], soleil: [0x9fb6ff, 0.35], dir: [0.4, 1.2, 0.6], contre: [0x4c66c4, 0.2], ombre: 0.18, lampe: 6,
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
  if (SITE && SITE.exterieur.visible) { M.scene.background = new THREE.Color(CIELS[nom]); M.scene.fog = new THREE.Fog(CIELS[nom], 70, 330); }
  const m = etat.m;
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
  }, easeInOut);
}

/* -------- teintes -------- */
function appliquerTeinte(t, duree = 300) {
  const m = etat.m;
  etat.teinte = t.ral;
  $('#teinte-nom').textContent = `RAL ${t.ral} · ${t.nom}`;
  document.querySelectorAll('.pastille').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ral === t.ral)));
  if (!m) return;
  const cible = new THREE.Color(t.hex);
  const depart = m.teintables.map((mat) => mat.color.clone());
  tween('teinte', duree, (p) => m.teintables.forEach((mat, i) => mat.color.lerpColors(depart[i], cible, p)), easeOut);
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
      bouton.hidden = !mv.canActivateAR;
    });
    bouton.addEventListener('click', () => mv.activateAR());
  }
  mv.setAttribute('alt', `${fiches[id].nom} en réalité augmentée`);
  mv.src = urlGlb(id);
}
function teinterAR() {
  if (!mv?.model || !etat.m) return;
  const t = etat.m.f.teintes.find((x) => x.ral === etat.teinte);
  if (!t) return;
  for (const mat of mv.model.materials) if (etat.m.f.materiaux_teintables.includes(mat.name)) mat.pbrMetallicRoughness.setBaseColorFactor(t.hex);
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
  $('#toit-sous').textContent = !dispo ? 'Indisponible sur ce modèle' : etat.toit ? 'Toit soulevé' : 'Le toit se soulève';
}
function remplirInterface(f) {
  document.title = `${f.nom} — Visionneuse 3D`;
  $('#titre-nom').textContent = f.nom;
  $('#titre-dims').textContent = f.dims || f.surface;
  $('#fiche-surface').textContent = f.surface;
  $('#fiche-dims').textContent = f.dims || '—';
  $('#fiche-liste').innerHTML = f.caracteristiques.map((c) => `<li>${esc(c)}</li>`).join('');
  $('#bascule').innerHTML = MODELES.map((id) => {
    const n = id.replace(/\D/g, '');
    return `<a href="#${id}" ${id === f.id ? 'aria-current="page"' : ''} aria-label="${esc(fiches[id]?.nom || `SIRIUS ${n} m²`)}">${n}<small>m²</small></a>`;
  }).join('');
  const choisie = f.teintes.find((t) => t.ral === etat.teinte) || f.teintes[0];
  $('#pastilles').innerHTML = f.teintes.map((t) =>
    `<button type="button" class="pastille" role="radio" data-ral="${esc(t.ral)}" aria-checked="${t.ral === choisie.ral}" aria-label="RAL ${esc(t.ral)} ${esc(t.nom)}" title="RAL ${esc(t.ral)} · ${esc(t.nom)}"><i style="background:${esc(t.hex)}"></i></button>`).join('');
  $('#pastilles').querySelectorAll('.pastille').forEach((b) => {
    b.addEventListener('click', () => appliquerTeinte(f.teintes.find((t) => t.ral === b.dataset.ral)));
  });
  $('#teinte-nom').textContent = `RAL ${choisie.ral} · ${choisie.nom}`;
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
  document.title = 'Lodges SIRIUS — Visionneuse 3D';
  $('#vue').hidden = true;
  if (M) M.actif = false;
  window.scrollTo(0, 0);
}

function router() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (MODELES.includes(id)) ouvrirVisionneuse(id);
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
  if (matchMedia('(min-width: 900px)').matches) return;
  const ouverte = $('#fiche').classList.toggle('ouverte');
  $('#titre').setAttribute('aria-expanded', String(ouverte));
});
$('#scene').addEventListener('pointerdown', fermerFiche);
$('#reessayer').addEventListener('click', router);
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
  // force une image (onglet masqué : requestAnimationFrame suspendu)
  rendre() { if (M) { M.sale = true; boucle(performance.now()); } },
};

construireMenu().then(() => {
  router();
  const inactif = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
  inactif(() => chargerLibs().catch(() => {}));
});
