/* script.js — toàn bộ file mới
   - Hiển thị mail pop, khi click -> ẩn mail, show scene
   - Tạo trái tim 3D (Three.js) đặt phía dưới ngang ngực ảnh mẹ
   - Lời chúc chạy vòng quanh trái tim (HTML spans)
   - Confetti nhẹ (2D canvas)
   - Responsive, nhẹ, tuned cho mobile
*/

/* ---------- DOM refs ---------- */
const mailBtn = document.getElementById('mailBtn');
const orbitContainer = document.getElementById('orbitContainer');
const confCanvas = document.getElementById('confettiCanvas');
const threeCanvas = document.getElementById('threeCanvas');
const momImg = document.getElementById('momImg');

/* safety: if any element missing, stop */
if (!mailBtn || !orbitContainer || !confCanvas || !threeCanvas || !momImg) {
  console.error('Missing expected DOM elements. Check IDs: mailBtn, orbitContainer, confettiCanvas, threeCanvas, momImg');
}

/* ---------- initial mail pop ---------- */
setTimeout(() => {
  // reveal mail (CSS handles animation on .mailBtn visible by default)
  mailBtn.style.opacity = 1;
  mailBtn.style.transform = 'translate(-50%,-50%) scale(1)';
}, 700);

/* ---------- click handler ---------- */
mailBtn.addEventListener('click', async () => {
  // small click feedback
  mailBtn.style.transform = 'translate(-50%,-50%) scale(.92)';
  setTimeout(() => mailBtn.style.transform = 'translate(-50%,-50%) scale(1)', 140);

  // fade & remove mail button
  mailBtn.style.transition = 'opacity .45s, transform .45s';
  mailBtn.style.opacity = 0;
  mailBtn.style.pointerEvents = 'none';
  setTimeout(() => mailBtn.remove(), 520);

  // init 3D, orbit text, confetti
  initThreeHeart();
  populateOrbitText("Con chúc mẹ luôn mạnh khỏe, luôn mỉm cười và hạnh phúc mãi bên con ❤️");
  burstConfetti(36);
});

/* ---------- Orbiting text (HTML spans) ---------- */
function populateOrbitText(message){
  orbitContainer.innerHTML = '';
  const parts = message.split(' ').filter(Boolean);
  const viewportMin = Math.min(window.innerWidth, 520);
  const radius = Math.max(viewportMin * 0.16, 70); // smaller radius near chest
  const total = parts.length;

  // position the center a bit lower so the ring sits around chest
  orbitContainer.style.left = '50%';
  orbitContainer.style.top = '54%';
  orbitContainer.style.transform = 'translate(-50%,-50%)';

  for (let i = 0; i < total; i++){
    const span = document.createElement('span');
    span.textContent = parts[i];
    orbitContainer.appendChild(span);

    const ang = (i/total)*Math.PI*2 - Math.PI/2; // start top
    const x = Math.cos(ang) * radius;
    const y = Math.sin(ang) * radius * 0.22; // flattened ring
    // rotate each label tangentially
    span.style.transform = `translate(${x}px, ${y}px) rotate(${(ang*180/Math.PI)+90}deg)`;
  }

  // continuous rotation
  let angle = 0;
  function rotateLoop(){
    angle = (angle + 0.32) % 360;
    orbitContainer.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
    requestAnimationFrame(rotateLoop);
  }
  rotateLoop();
}

/* ---------- Confetti (lightweight 2D) ---------- */
const cctx = confCanvas.getContext && confCanvas.getContext('2d');
function resizeConfetti(){
  confCanvas.width = window.innerWidth;
  confCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

let confetti = [];
function spawnConfetti(n=24){
  for (let i=0;i<n;i++){
    confetti.push({
      x: Math.random()*confCanvas.width,
      y: -Math.random()*confCanvas.height*0.6,
      w: Math.random()*8+4,
      h: Math.random()*4+3,
      vy: Math.random()*1.0+0.6,
      tilt: Math.random()*0.4-0.2,
      color: `hsl(${Math.random()*40+320} 78% 68%)`
    });
  }
}
function updateConfetti(){
  if(!cctx) return;
  cctx.clearRect(0,0,confCanvas.width, confCanvas.height);
  for (let i=confetti.length-1;i>=0;i--){
    const p = confetti[i];
    p.x += p.tilt * 3;
    p.y += p.vy;
    cctx.fillStyle = p.color;
    cctx.fillRect(p.x, p.y, p.w, p.h);
    if (p.y > confCanvas.height + 20) confetti.splice(i,1);
  }
  requestAnimationFrame(updateConfetti);
}
updateConfetti();
function burstConfetti(n=36){ spawnConfetti(n); }

/* ---------- Three.js heart (stationary under chest) ---------- */
let renderer, scene, camera, heartMesh, pmremGenerator;
function initThreeHeart(){
  if (renderer) return; // init once

  // renderer
  renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0); // transparent

  // scene & camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 0.1, 3000);

  // Camera placement: tuned so image + heart fit nicely
  // When mom image is visible, we want camera z to depend on viewport width
  const baseZ = Math.max(Math.min(window.innerWidth, 900) * 0.9, 480);
  camera.position.set(0, 0, baseZ / 12);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(120, 200, 160);
  scene.add(key);
  const rim = new THREE.PointLight(0xffc0c8, 0.6, 800);
  rim.position.set(-200, 140, 200);
  scene.add(rim);

  // small environment reflection using mom image
  const texLoader = new THREE.TextureLoader();
  texLoader.load(momImg.src, (tx) => {
    try {
      tx.encoding = THREE.sRGBEncoding;
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const env = pmrem.fromEquirectangular(tx).texture;
      scene.environment = env;
      pmremGenerator = pmrem;
    } catch (e) {
      // ignore if PMREM fails
    }
  });

  // create heart geometry
  function createHeartGeom(scale=1.4, depth=40){
    const shape = new THREE.Shape();
    const x=0,y=0;
    shape.moveTo(x+5,y+5);
    shape.bezierCurveTo(x+5,y+5,x+4,y,x,y);
    shape.bezierCurveTo(x-6,y,x-6,y+7,x-6,y+7);
    shape.bezierCurveTo(x-6,y+11,x-3,y+15.4,x+5,y+19);
    shape.bezierCurveTo(x+13,y+15.4,x+16,y+11,x+16,y+7);
    shape.bezierCurveTo(x+16,y+7,x+16,y,x+10,y);
    shape.bezierCurveTo(x+7,y,x+5,y+5,x+5,y+5);
    const extrude = { depth: depth, bevelEnabled:true, bevelThickness: depth*0.06, bevelSize: depth*0.04, bevelSegments: 5 };
    const geom = new THREE.ExtrudeGeometry(shape, extrude);
    geom.scale(scale, scale, scale);
    geom.center();
    geom.computeVertexNormals();
    return geom;
  }

  const heartGeom = createHeartGeom(1.4, 46);
  const heartMat = new THREE.MeshPhysicalMaterial({
    color: 0xd92b3e,
    metalness: 0.45,
    roughness: 0.22,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.0
  });

  heartMesh = new THREE.Mesh(heartGeom, heartMat);
  // make it smaller so it doesn't cover face
  heartMesh.scale.set(0.75, 0.75, 0.75);

  // compute a Y position to place heart roughly under chest
  // use momImg bounding rect to map screen coords into a scene-relative Y offset
  function computeHeartY(){
    const imgRect = momImg.getBoundingClientRect();
    // desired screen y for heart: slightly below image vertical center (70% down)
    const imgCenterY = imgRect.top + imgRect.height * 0.72;
    // convert screen Y (px) to a scene-relative offset: use factor tuned by camera.position.z
    // we approximate screen->scene mapping by mapping half-screen to approx camera frustum height/2
    const frustumHeightAtZ = 2 * Math.tan( (camera.fov * Math.PI / 180) / 2 ) * camera.position.z;
    // map pixel Y offset relative to screen center to scene units
    const screenCenterY = window.innerHeight / 2;
    const pixelOffset = imgCenterY - screenCenterY; // positive means below center
    const sceneY = - (pixelOffset / window.innerHeight) * frustumHeightAtZ;
    return sceneY - 0.6; // small extra downshift
  }

  heartMesh.position.set(0, computeHeartY(), 0);
  heartMesh.rotation.x = THREE.MathUtils.degToRad(12);
  scene.add(heartMesh);

  // subtle ground shadow circle
  const baseGeo = new THREE.CircleGeometry(220, 32);
  const baseMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.10 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.x = -Math.PI/2;
  base.position.y = heartMesh.position.y - 1.2; // below heart
  scene.add(base);

  // renderer loop: keep heart mostly still with tiny breathing rotation
  let t = 0;
  function loop(){
    t += 1;
    heartMesh.rotation.y = Math.sin(t * 0.003) * 0.04; // tiny sway
    heartMesh.rotation.x = 0.18 + Math.sin(t * 0.0012) * 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  // handle resize: update camera and recompute heart pos
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // recompute position
    if (heartMesh) {
      heartMesh.position.y = computeHeartY();
      base.position.y = heartMesh.position.y - 1.2;
    }
    resizeConfetti();
  });
}

/* ---------- expose small helpers for tweaking from console ---------- */
window._confettiBurst = burstConfetti;
window._repositionHeart = function(offset=0){
  if (!heartMesh) return;
  heartMesh.position.y += offset;
};
window._setOrbitMessage = function(msg){
  populateOrbitText(msg);
};