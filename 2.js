/* Behavior:
 - show mail icon (pop) on load
 - click mail: hide mail -> show scene: 3D heart positioned under mom's chest + orbiting text spans + confetti burst
 - no music
 - image used from index.html (already set)
*/

/* ---------- DOM ---------- */
const mailBtn = document.getElementById('mailBtn');
const orbitContainer = document.getElementById('orbitContainer');
const confCanvas = document.getElementById('confettiCanvas');
const threeCanvas = document.getElementById('threeCanvas');
const momImg = document.getElementById('momImg');

/* ---------- initial mail pop ---------- */
setTimeout(()=> {
  // animate pop slightly
  mailBtn.style.transform = 'translate(-50%,-50%) scale(1)';
  mailBtn.classList.remove('hidden');
}, 700);

/* ---------- handle click ---------- */
mailBtn.addEventListener('click', () => {
  // quick feedback
  mailBtn.style.transform = 'translate(-50%,-50%) scale(.92)';
  setTimeout(()=> mailBtn.style.transform = 'translate(-50%,-50%) scale(1)', 140);

  // fade out then remove
  mailBtn.style.transition = 'opacity .45s, transform .45s';
  mailBtn.style.opacity = 0;
  mailBtn.style.pointerEvents = 'none';
  setTimeout(()=> mailBtn.remove(), 520);

  // kick off scene & orbit text & confetti
  initThreeHeart();
  populateOrbitText("Con chúc mẹ luôn mạnh khỏe, luôn mỉm cười và hạnh phúc mãi bên con ❤️");
  burstConfetti(80);
});

/* ---------- orbit text (HTML spans) ---------- */
function populateOrbitText(message){
  orbitContainer.innerHTML = '';
  // split into words but keep emoji with previous word
  const parts = message.split(' ').filter(Boolean);
  const radius = Math.min(window.innerWidth, 480) * 0.32;
  const total = parts.length;
  for(let i=0;i<total;i++){
    const span = document.createElement('span');
    span.textContent = parts[i];
    orbitContainer.appendChild(span);
    const ang = (i/total)*Math.PI*2 - Math.PI/2; // start top
    const x = Math.cos(ang) * radius;
    const y = Math.sin(ang) * radius * 0.18; // slight vertical flatten
    span.style.transform = `translate(${x}px, ${y}px) rotate(${(ang*180/Math.PI)+90}deg)`;
  }
  // continuous rotation (JS for smoothness)
  let angle = 0;
  function rotateLoop(){
    angle = (angle + 0.35) % 360;
    orbitContainer.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
    requestAnimationFrame(rotateLoop);
  }
  rotateLoop();
}

/* ---------- confetti (2D) ---------- */
const cctx = confCanvas.getContext && confCanvas.getContext('2d');
function resizeConfetti(){
  confCanvas.width = window.innerWidth;
  confCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

let confetti = [];
function spawnConfetti(n=40){
  for(let i=0;i<n;i++){
    confetti.push({
      x: Math.random()*confCanvas.width,
      y: -Math.random()*confCanvas.height*0.6,
      w: Math.random()*10+6,
      h: Math.random()*6+4,
      vy: Math.random()*2+1,
      tilt: Math.random()*0.6-0.3,
      color: `hsl(${Math.random()*40+320}deg 80% 69%)`
    });
  }
}
function updateConfetti(){
  if(!cctx) return;
  cctx.clearRect(0,0,confCanvas.width, confCanvas.height);
  for(let i=confetti.length-1;i>=0;i--){
    const p = confetti[i];
    p.x += p.tilt*3;
    p.y += p.vy;
    cctx.fillStyle = p.color;
    cctx.fillRect(p.x, p.y, p.w, p.h);
    if(p.y > confCanvas.height + 20) confetti.splice(i,1);
  }
  requestAnimationFrame(updateConfetti);
}
updateConfetti();
function burstConfetti(n=60){ spawnConfetti(n); }

/* ---------- Three.js heart (stationary, below chest) ---------- */
let renderer, scene, camera, heartMesh, pmremGenerator;
function initThreeHeart(){
  if(renderer) return; // already initialized

  // renderer
  renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  // scene & camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 0.1, 3000);

  // position camera to fit mom image + heart below chest
  // approximate: move camera back more if viewport is large
  const baseZ = Math.max( Math.min(window.innerWidth, 900) * 0.9, 480 );
  camera.position.set(0, 0, baseZ / 12); // tuned by experiments

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(120, 200, 160);
  scene.add(key);
  const rim = new THREE.PointLight(0xffc0c8, 0.6, 800);
  rim.position.set(-200, 140, 200);
  scene.add(rim);

  // subtle environment (use mom image as equirectangular-like env for reflections)
  const texLoader = new THREE.TextureLoader();
  texLoader.load(momImg.src, (tx)=>{
    try {
      tx.encoding = THREE.sRGBEncoding;
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const env = pmrem.fromEquirectangular(tx).texture;
      scene.environment = env;
      pmremGenerator = pmrem;
    } catch(e){ /* ignore in older builds */ }
  });

  // create heart geometry (extruded shape)
  function createHeartGeom(scale=1.4, depth=46){
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
    metalness: 0.5,
    roughness: 0.22,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.0
  });

  heartMesh = new THREE.Mesh(heartGeom, heartMat);
  // position heart slightly lower relative to center so it appears 'below chest'
  heartMesh.position.set(0, - (window.innerHeight * 0.0028) - 28, 0); // tuned value
  heartMesh.rotation.x = THREE.MathUtils.degToRad(12);
  heartMesh.scale.set(1,1,1);

  scene.add(heartMesh);

  // base shadow
  const baseGeo = new THREE.CircleGeometry(220, 32);
  const baseMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.12 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.x = -Math.PI/2;
  base.position.y = heartMesh.position.y - 140;
  scene.add(base);

  // animate (heart mostly still; very subtle breathing)
  let t=0;
  function loop(){
    t += 1;
    // tiny breathing rotation to keep it alive (still mostly "standing")
    heartMesh.rotation.y = Math.sin(t * 0.003) * 0.04;
    heartMesh.rotation.x = 0.18 + Math.sin(t * 0.0012) * 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  // responsive: keep camera appropriate on resize
  window.addEventListener('resize', ()=> {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeConfetti();
  });
}

/* ---------- small helpers ---------- */
function resizeConfetti(){
  confCanvas.width = window.innerWidth;
  confCanvas.height = window.innerHeight;
}

/* expose confetti trigger */
window.burstConfetti = burstConfetti;

/* done */