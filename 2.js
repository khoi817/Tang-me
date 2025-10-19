// Three.js WebGL scene: 3D reflective heart + orbiting text sprites + confetti + audio
// Uses: three.min.js (r154), OrbitControls, FontLoader + TextGeometry (loaded via CDN in HTML)

// CONFIG
const BG_IMAGE = 'https://i.postimg.cc/wM0RX97K/IMG-20240907-115201.jpg';
let MESSAGE = 'Con chúc mẹ luôn mạnh khỏe, bình an và hạnh phúc mãi bên con 💖';

// --- Scene setup ---
const container = document.getElementById('canvas-wrap');
const scene = new THREE.Scene();

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
container.appendChild(renderer.domElement);

// camera
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 420);

// controls (light, allow user drag)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.minPolarAngle = Math.PI/6;
controls.maxPolarAngle = Math.PI/1.6;
controls.rotateSpeed = 0.6;
controls.enablePan = false;

// ambient bg from image (use as scene background blurred via plane)
const loader = new THREE.TextureLoader();
loader.load(BG_IMAGE, (tx) => {
  tx.encoding = THREE.sRGBEncoding;
  scene.background = tx;
  // also create a large slightly blurred plane behind objects for parallax feel
  const geo = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
  const mat = new THREE.MeshBasicMaterial({ map: tx, opacity: 0.48, transparent: true });
  const bgPlane = new THREE.Mesh(geo, mat);
  bgPlane.position.set(0, 0, -800);
  scene.add(bgPlane);
});

// lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(120, 240, 200);
key.castShadow = false;
scene.add(key);

// soft fill lights
const rim = new THREE.PointLight(0xffb3c1, 0.5, 800);
rim.position.set(-200, 140, 200);
scene.add(rim);

// --- environment for reflection (use same BG as equirectangular) ---
let pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
loader.load(BG_IMAGE, (equi) => {
  equi.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmremGenerator.fromEquirectangular(equi).texture;
  scene.environment = envMap;
  equi.dispose && equi.dispose();
});

// --- create 3D heart geometry (extruded shape) ---
function createHeartGeometry(scale = 1, depth = 30) {
  // 2D heart shape path
  const x = 0, y = 0;
  const heartShape = new THREE.Shape();
  heartShape.moveTo(x, y + 40);
  heartShape.bezierCurveTo(x, y + 40, x - 50, y + 15, x - 50, y - 10);
  heartShape.bezierCurveTo(x - 50, y - 55, x - 10, y - 90, x, y - 70);
  heartShape.bezierCurveTo(x + 10, y - 90, x + 50, y - 55, x + 50, y - 10);
  heartShape.bezierCurveTo(x + 50, y + 15, x, y + 40, x, y + 40);
  const extrudeSettings = { depth: depth, bevelEnabled: true, bevelThickness: depth * 0.08, bevelSize: depth * 0.06, bevelSegments: 4 };
  const geom = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  geom.scale(scale * 1.6, scale * 1.6, scale * 1.6);
  geom.center();
  geom.computeVertexNormals();
  return geom;
}

// material (reflective red)
const heartMat = new THREE.MeshPhysicalMaterial({
  color: 0xd92b3e,
  metalness: 0.6,
  roughness: 0.18,
  clearcoat: 0.6,
  clearcoatRoughness: 0.05,
  reflectivity: 0.9,
  envMapIntensity: 1.0,
});

// create mesh
const heartGeo = createHeartGeometry(1.2, 36);
const heartMesh = new THREE.Mesh(heartGeo, heartMat);
heartMesh.castShadow = false;
heartMesh.receiveShadow = false;
scene.add(heartMesh);

// small subtle base (shadow)
const baseGeo = new THREE.CircleGeometry(220, 32);
const baseMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.12, transparent: true });
const base = new THREE.Mesh(baseGeo, baseMat);
base.rotation.x = -Math.PI / 2;
base.position.y = -120;
base.scale.set(1, 1, 1);
scene.add(base);

// scale & position
heartMesh.position.set(0, -10, 0);
heartMesh.rotation.x = THREE.MathUtils.degToRad(12);

// --- orbiting text sprites (using canvas-based textures) ---
const spriteGroup = new THREE.Group();
scene.add(spriteGroup);

function makeTextSprite(text, opts = {}) {
  const font = opts.font || "bold 28px sans-serif";
  const padding = 8;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  // measure text
  const w = Math.ceil(ctx.measureText(text).width) + padding * 2;
  const h = Math.ceil(parseInt(font, 10) * 1.4) + padding * 2;
  canvas.width = w;
  canvas.height = h;
  // draw background rounded rect
  const radius = 12;
  ctx.fillStyle = 'rgba(255,120,150,0.95)';
  roundRect(ctx, 0, 0, w, h, radius);
  ctx.fill();
  // text
  ctx.font = font;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2);
  // create texture
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  const scale = Math.min(120, w * 0.7);
  sprite.scale.set(scale, scale * (h / w), 1);
  return sprite;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// populate sprites from words
function setOrbitText(msg) {
  // clear old
  while (spriteGroup.children.length) spriteGroup.remove(spriteGroup.children[0]);
  const words = msg.split(' ').filter(Boolean);
  const radius = 250; // around heart
  const total = words.length;
  for (let i = 0; i < total; i++) {
    const s = makeTextSprite(words[i], { font: "900 26px Poppins, sans-serif" });
    const ang = (i / total) * Math.PI * 2;
    const x = Math.cos(ang) * radius;
    const y = Math.sin(ang) * radius * 0.18; // slight vertical offset for ring shape
    const z = Math.sin(ang) * radius * 0.6; // depth variation
    s.position.set(x, y, z);
    // face camera by default
    s.lookAt(camera.position);
    spriteGroup.add(s);
  }
}
setOrbitText(MESSAGE);

// animate orbit rotation
let orbitAngle = 0;

// --- confetti particles (three Points) ---
const confettiCount = 140;
const confGeo = new THREE.BufferGeometry();
const confPos = new Float32Array(confettiCount * 3);
const confVel = new Float32Array(confettiCount * 3);
for (let i = 0; i < confettiCount; i++) {
  const ix = i * 3;
  confPos[ix] = (Math.random() - 0.5) * window.innerWidth * 1.2;
  confPos[ix + 1] = Math.random() * window.innerHeight * 0.6 + 200;
  confPos[ix + 2] = (Math.random() - 0.5) * 400;
  confVel[ix] = (Math.random() - 0.5) * 0.6;
  confVel[ix + 1] = Math.random() * 1.6 + 0.6;
  confVel[ix + 2] = (Math.random() - 0.5) * 0.6;
}
confGeo.setAttribute('position', new THREE.BufferAttribute(confPos, 3));
const confMat = new THREE.PointsMaterial({ size: 8, vertexColors: false, color: 0xff9fb5, sizeAttenuation: true });
const confetti = new THREE.Points(confGeo, confMat);
scene.add(confetti);

// --- resizing ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize, false);

// --- animation loop ---
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.5;

  // heart slow rotation
  heartMesh.rotation.y += 0.008; // slow spin
  heartMesh.rotation.x = 0.2 + Math.sin(t * 0.002) * 0.02;

  // orbit sprites rotate smoothly around heart
  orbitAngle += 0.0025;
  spriteGroup.rotation.y = orbitAngle;

  // update sprite facing
  spriteGroup.children.forEach(s => {
    s.lookAt(camera.position);
  });

  // confetti fall
  const pos = confGeo.attributes.position.array;
  for (let i = 0; i < confettiCount; i++) {
    const ix = i * 3;
    pos[ix + 1] -= confVel[ix + 1];
    pos[ix] += Math.sin((t + i) * 0.01) * confVel[ix] * 0.5;
    pos[ix + 2] += Math.cos((t + i) * 0.007) * confVel[ix + 2] * 0.5;
    // recycle if fallen
    if (pos[ix + 1] < -window.innerHeight * 0.6) {
      pos[ix + 1] = Math.random() * window.innerHeight * 0.6 + window.innerHeight * 0.6;
      pos[ix] = (Math.random() - 0.5) * window.innerWidth * 1.2;
    }
  }
  confGeo.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}
animate();

// --- UI interactions: modal, message update, click pulse ---
const btnWish = document.getElementById('btnWish');
const modal = document.getElementById('modal');
const cancel = document.getElementById('cancel');
const apply = document.getElementById('apply');
const msgInput = document.getElementById('msgInput');

btnWish.addEventListener('click', () => {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  msgInput.focus();
});
cancel.addEventListener('click', () => {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
});
apply.addEventListener('click', () => {
  const val = msgInput.value.trim();
  if (val.length) {
    MESSAGE = val;
    setOrbitText(MESSAGE);
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    // small celebration: kick confetti velocities
    for (let i = 0; i < confettiCount; i++) {
      const ix = i * 3;
      confVel[ix + 1] = 1.2 + Math.random() * 2.0;
    }
  }
});

// clicking center pulses heart and triggers confetti/heart burst
renderer.domElement.addEventListener('click', (e) => {
  // pulse scale
  gsapPulseHeart && gsapPulseHeart();
  // boost confetti
  for (let i = 0; i < confettiCount; i++) {
    const ix = i * 3;
    confVel[ix + 1] = 0.8 + Math.random() * 2.6;
  }
});

// tiny helper pulse using CSS transform on the WebGL mesh via scale factor
// simple manual tween without library
function gsapPulseHeart() {
  let scale = 1;
  let growing = true;
  const start = performance.now();
  const dur = 420;
  function tick(now) {
    const p = (now - start) / dur;
    if (p >= 1) {
      heartMesh.scale.set(1,1,1);
      return;
    }
    const ease = (p < 0.5) ? (1 + p*2*0.06) : (1 + (1 - p)*2*0.06);
    heartMesh.scale.set(ease, ease, ease);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// --- audio autoplay fallback ---
const bgAudio = document.getElementById('bgAudio');
let audioStarted = false;
function tryStartAudio() {
  if (!audioStarted) {
    bgAudio.play().then(()=>{ audioStarted=true; }).catch(()=>{ /* blocked */ });
  }
}
window.addEventListener('load', tryStartAudio);
window.addEventListener('touchstart', function startAudioOnce() {
  tryStartAudio();
  window.removeEventListener('touchstart', startAudioOnce);
}, { passive: true });

// accessibility: pause audio when tab hidden
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden) try{ bgAudio.pause(); }catch(e){}
  else if(audioStarted) try{ bgAudio.play().catch(()=>{});}catch(e){}
});

// --- cleanup pmrem when page unloads ---
window.addEventListener('unload', ()=>{
  try { pmremGenerator.dispose(); } catch(e){}
});