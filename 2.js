/* Full behavior:
 - show mail icon after delay
 - on click: fade mail, show 3D heart (Three.js), orbiting text (HTML spans), start audio, burst confetti
 - heart stands still (rotating slightly for life), text orbits circularly
 - background image already in CSS
*/

// Config
const BG_AUDIO_SRC = document.getElementById('bgAudio').src; // audio in HTML
let MESSAGE = "Con chúc mẹ luôn mạnh khỏe, bình an và hạnh phúc mãi bên con 💖";

// DOM refs
const mailBtn = document.getElementById('mailBtn');
const orbitText = document.getElementById('orbitText');
const threeCanvas = document.getElementById('threeCanvas'); // canvas element (we'll replace with renderer)
const confettiCanvas = document.getElementById('confetti');
const bgAudio = document.getElementById('bgAudio');

// show mail popup after 1.4s
setTimeout(()=> mailBtn.classList.add('show'), 1400);

// allow touchstart to enable audio if needed
function startAudioOnce(){
  if(bgAudio && bgAudio.paused){
    bgAudio.play().catch(()=>{ /* blocked until explicit user gesture */ });
  }
  window.removeEventListener('touchstart', startAudioOnce);
}
window.addEventListener('touchstart', startAudioOnce, {passive:true});

// Handle mail click
mailBtn.addEventListener('click', async () => {
  // small click feedback
  mailBtn.style.transform = 'translate(-50%,-50%) scale(.92)';
  setTimeout(()=> mailBtn.style.transform = 'translate(-50%,-50%) scale(1)', 160);

  // start audio (best effort)
  try{ await bgAudio.play(); } catch(e){ /* ignore autoplay block */ }

  // pop effect -> fade
  mailBtn.style.transition = 'opacity .45s, transform .45s';
  mailBtn.style.opacity = '0';
  mailBtn.style.pointerEvents = 'none';
  setTimeout(()=> mailBtn.remove(), 600);

  // initialize 3D scene and orbit text + confetti
  initThreeScene();
  populateOrbit(MESSAGE);
  burstConfetti(80);
});

// ========== Orbiting HTML text (simple) ==========
function populateOrbit(msg){
  orbitText.innerHTML = '';
  const parts = msg.split(' ').filter(Boolean);
  const centerRadius = Math.min(window.innerWidth, 420) * 0.32; // px
  const total = parts.length;
  for(let i=0;i<total;i++){
    const span = document.createElement('span');
    span.textContent = parts[i];
    orbitText.appendChild(span);
    // compute angle around circle (start at top)
    const ang = (i/total) * Math.PI * 2 - Math.PI/2;
    const x = Math.cos(ang) * centerRadius;
    const y = Math.sin(ang) * centerRadius;
    span.style.transform = `translate(${x}px, ${y}px) rotate(${(ang*180/Math.PI)+90}deg)`;
  }
  // add rotation (CSS animation)
  orbitText.style.transition = 'transform 0s';
  let angle = 0;
  function rotateRing(){
    angle = (angle + 0.35) % 360;
    orbitText.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
    requestAnimationFrame(rotateRing);
  }
  rotateRing();
}

// ========== Confetti (canvas 2D) ==========
const ccan = confettiCanvas;
const cctx = ccan.getContext && ccan.getContext('2d');
function resizeConfetti(){
  ccan.width = window.innerWidth;
  ccan.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

let confetti = [];
function spawnConfetti(n=40){
  for(let i=0;i<n;i++){
    confetti.push({
      x: Math.random()*ccan.width,
      y: -Math.random()*ccan.height*0.5,
      w: Math.random()*10+6,
      h: Math.random()*6+4,
      vy: Math.random()*2+1,
      tilt: Math.random()*0.6-0.3,
      color: `hsl(${Math.random()*40+330} 80% 70%)`
    });
  }
}
function updateConfetti(){
  if(!cctx) return;
  cctx.clearRect(0,0,ccan.width, ccan.height);
  for(let i=confetti.length-1;i>=0;i--){
    const p = confetti[i];
    p.x += p.tilt*3;
    p.y += p.vy;
    cctx.fillStyle = p.color;
    cctx.fillRect(p.x, p.y, p.w, p.h);
    if(p.y > ccan.height + 20) confetti.splice(i,1);
  }
  requestAnimationFrame(updateConfetti);
}
updateConfetti();
function burstConfetti(n=60){ spawnConfetti(n); }

// ========== Three.js scene: stationary heart ==========
let renderer, scene, camera, heartMesh, controls;
function initThreeScene(){
  if(renderer) return; // only once
  // create renderer -> attach to sceneWrap
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, canvas: threeCanvas });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0); // transparent

  // scene & camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 3000);
  camera.position.set(0, 0, 380);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(120, 200, 160);
  scene.add(dir);
  const rim = new THREE.PointLight(0xffc0c8, 0.6, 800);
  rim.position.set(-200, 140, 200);
  scene.add(rim);

  // small environment reflection using same background as texture -> PMREM
  const loader = new THREE.TextureLoader();
  loader.load("https://i.postimg.cc/wM0RX97K/IMG-20240907-115201.jpg", (tx)=>{
    try{
      tx.encoding = THREE.sRGBEncoding;
      tx.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const env = pmrem.fromEquirectangular(tx).texture;
      scene.environment = env;
      // don't dispose tx immediately (pmrem uses it)
    }catch(e){ /* ignore if pmrem not available */ }
  });

  // create heart geometry (extruded shape)
  function createHeartGeometry(scale=1.2, depth=40){
    const x = 0, y = 0;
    const shape = new THREE.Shape();
    shape.moveTo(x + 5, y + 5);
    shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    shape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    shape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    shape.bezierCurveTo(x + 13, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    shape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    shape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
    const extrude = { depth: depth, bevelEnabled:true, bevelThickness: depth*0.06, bevelSize: depth*0.04, bevelSegments: 4 };
    const geom = new THREE.ExtrudeGeometry(shape, extrude);
    geom.scale(scale, scale, scale);
    geom.center();
    geom.computeVertexNormals();
    return geom;
  }

  const heartGeom = createHeartGeometry(1.4, 46);
  const heartMat = new THREE.MeshPhysicalMaterial({
    color: 0xd92b3e,
    metalness: 0.5,
    roughness: 0.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.0
  });
  heartMesh = new THREE.Mesh(heartGeom, heartMat);
  heartMesh.position.set(0, -18, 0);
  heartMesh.rotation.x = THREE.MathUtils.degToRad(12);
  scene.add(heartMesh);

  // subtle shadow plane
  const baseGeo = new THREE.CircleGeometry(220, 32);
  const baseMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.12 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.x = -Math.PI/2;
  base.position.y = -140;
  scene.add(base);

  // OPTIONAL: allow small rotation by device orientation or drag (OrbitControls limited)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI/6;
  controls.maxPolarAngle = Math.PI/1.6;
  controls.rotateSpeed = 0.6;

  // animate loop
  let t = 0;
  function loop(){
    t += 1;
    // keep heart mostly still but with tiny breathing rotation
    heartMesh.rotation.y = Math.sin(t * 0.003) * 0.06; // subtle
    heartMesh.rotation.x = 0.18 + Math.sin(t * 0.0012) * 0.02;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  // resize handler
  window.addEventListener('resize', ()=> {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeConfetti();
  });
}

// allow message editing later via console or future UI (not required now)

// small helper: create initial subtle confetti burst
function burstConfetti(n=50){
  spawnConfetti(n);
}

// Expose small API for bursts
window.burstConfetti = burstConfetti;

// END