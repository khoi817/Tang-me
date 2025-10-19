/* script.js
  - Rules popup -> start
  - DVD-style heart (PNG sprite) bouncing & rotating
  - Click/tap heart to collect -> increment progress, animate HUD green
  - After TARGET collected -> confetti + letter popup
  - Mom image tilt (mouse + device orientation)
  - No external libs
*/

/* ---------- CONFIG ---------- */
const TARGET = 10;

// Heart SVG sprite as data URL (prettified red heart)
const HEART_SVG = encodeURIComponent(
`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 110'>
  <defs><filter id='f' x='-50%' y='-50%' width='200%' height='200%'>
    <feGaussianBlur stdDeviation='3' result='b' />
    <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
  </filter></defs>
  <g filter='url(#f)'>
    <path d='M60 100 C20 70 0 46 20 28 C36 14 60 26 60 26 C60 26 84 14 100 28 C120 46 100 70 60 100 Z' fill='#d92b3e'/>
    <path d='M60 26 C60 26 78 10 96 28' fill='rgba(255,255,255,0.25)'/>
  </g>
</svg>`
);
const HEART_SRC = `data:image/svg+xml;utf8,${HEART_SVG}`;

/* ---------- DOM ---------- */
const rulesOverlay = document.getElementById('rulesOverlay');
const startBtn = document.getElementById('startBtn');
const dvdCanvas = document.getElementById('dvdCanvas');
const ctx = dvdCanvas.getContext('2d');
const confCanvas = document.getElementById('confettiCanvas');
const confCtx = confCanvas.getContext('2d');
const heartImgEl = document.getElementById('heartSprite');
const momImg = document.getElementById('momImg');
const progressEl = document.getElementById('progress');
const letterOverlay = document.getElementById('letterOverlay');
const closeLetter = document.getElementById('closeLetter');
const hud = {count:0};

/* preload heart sprite */
heartImgEl.src = HEART_SRC;

/* ---------- canvas resize ---------- */
let W = window.innerWidth, H = window.innerHeight;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  dvdCanvas.width = W; dvdCanvas.height = H;
  confCanvas.width = W; confCanvas.height = H;
}
window.addEventListener('resize', resize);
resize();

/* ---------- mom tilt (mouse + device orientation) ---------- */
const maxTilt = 12;
function applyTilt(mx, my){
  const rx = my * maxTilt;
  const ry = -mx * (maxTilt * 0.9);
  const tz = 8 + Math.abs(my) * 8;
  momImg.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`;
}
window.addEventListener('mousemove', e=>{
  const mx = (e.clientX / W)*2 - 1;
  const my = (e.clientY / H)*2 - 1;
  applyTilt(mx,my);
});
window.addEventListener('deviceorientation', ev=>{
  if(ev.gamma==null && ev.beta==null) return;
  const nx = Math.max(-30, Math.min(30, ev.gamma || 0))/30;
  const ny = Math.max(-30, Math.min(30, (ev.beta||0)-20))/30;
  applyTilt(nx, ny);
}, true);
let restTimer = null;
window.addEventListener('mousemove', ()=> {
  clearTimeout(restTimer);
  restTimer = setTimeout(()=> momImg.style.transform = '', 1400);
});

/* ---------- Heart (DVD) actor ---------- */
const heart = {
  x: 120, y: 120,
  w: 110, h: 100,
  vx: 3.2, vy: 2.6,
  angle: 0, spin: 0.03,
  alive: true
};

function spawnHeart() {
  // scale by viewport
  heart.w = Math.max(56, Math.round(W * 0.11));
  heart.h = Math.round(heart.w * 0.92);

  // spawn near edges but avoid mom center
  const rect = momImg.getBoundingClientRect();
  const centerX = rect.left + rect.width/2;
  const centerY = rect.top + rect.height/2;
  let sx = (Math.random()<0.6) ? (Math.random()<0.5 ? 40 : W-40) : Math.random()*(W-160)+80;
  let sy = (Math.random()<0.6) ? Math.random()*(H-160)+80 : (Math.random()<0.5 ? 40 : H-40);
  if (Math.hypot(sx-centerX, sy-centerY) < 160) sx = (sx + 240) % Math.max(W-100,200);
  heart.x = sx; heart.y = sy;
  const base = 2.4 + hud.count*0.15;
  const signX = Math.random()<0.5?-1:1;
  const signY = Math.random()<0.5?-1:1;
  heart.vx = signX * (base + Math.random()*1.8);
  heart.vy = signY * (base*0.8 + Math.random()*1.2);
  heart.spin = 0.02 + Math.random()*0.04;
  heart.angle = Math.atan2(heart.vy, heart.vx);
  heart.alive = true;
}

/* ---------- Draw heart ---------- */
function drawHeart() {
  const cx = heart.x, cy = heart.y;
  // glow
  const glowR = Math.max(heart.w, heart.h) * 0.9;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g.addColorStop(0, 'rgba(255,120,140,0.20)');
  g.addColorStop(0.5, 'rgba(255,120,140,0.08)');
  g.addColorStop(1, 'rgba(255,120,140,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI*2); ctx.fill();

  // draw rotated image
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(heart.angle);
  const iw = heart.w, ih = heart.h;
  ctx.drawImage(heartImgEl, -iw/2, -ih/2, iw, ih);
  ctx.restore();
}

/* ---------- Heart physics & bounce ---------- */
function updateHeart() {
  if(!heart.alive) return;
  heart.x += heart.vx; heart.y += heart.vy;

  if (heart.x - heart.w/2 < 0) { heart.x = heart.w/2; heart.vx *= -1; heart.spin *= -1; }
  if (heart.x + heart.w/2 > W) { heart.x = W - heart.w/2; heart.vx *= -1; heart.spin *= -1; }
  if (heart.y - heart.h/2 < 0) { heart.y = heart.h/2; heart.vy *= -1; heart.spin *= -1; }
  if (heart.y + heart.h/2 > H) { heart.y = H - heart.h/2; heart.vy *= -1; heart.spin *= -1; }

  // gentle damping
  heart.vx *= 0.999; heart.vy *= 0.999;

  // rotate towards velocity
  const target = Math.atan2(heart.vy, heart.vx);
  heart.angle += (target - heart.angle) * 0.12 + heart.spin*0.02;
}

/* ---------- pointer hit test ---------- */
function pointHitsHeart(px, py){
  // transform into heart's rotated local space
  const dx = px - heart.x, dy = py - heart.y;
  const s = Math.sin(-heart.angle), c = Math.cos(-heart.angle);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) <= heart.w/2 && Math.abs(ly) <= heart.h/2;
}

/* ---------- input (click/tap) ---------- */
dvdCanvas.addEventListener('pointerdown', (ev)=>{
  const x = ev.clientX, y = ev.clientY;
  if (heart.alive && pointHitsHeart(x,y)) {
    collectHeart();
  }
});

/* ---------- collect logic & HUD animation ---------- */
function collectHeart(){
  heart.alive = false;
  spawnCollectBurst(heart.x, heart.y);
  hud.count = Math.min(TARGET, hud.count + 1);
  animateProgress();
  progressEl.textContent = `${hud.count} / ${TARGET} ❤️`;

  // respawn or win
  if (hud.count >= TARGET) {
    setTimeout(()=> winSequence(), 700);
  } else {
    setTimeout(()=> spawnHeart(), 300);
  }
}

/* progress animation: add class then remove */
function animateProgress(){
  progressEl.classList.add('animate');
  setTimeout(()=> progressEl.classList.remove('animate'), 520);
}

/* ---------- confetti (simple) ---------- */
let confetti = [];
function spawnConfetti(x= W/2, y= H/2, n=60){
  for(let i=0;i<n;i++){
    confetti.push({
      x: x + (Math.random()-0.5)*160,
      y: y + (Math.random()-0.5)*80,
      vx: (Math.random()-0.5)*6,
      vy: (Math.random()-0.8)*-6,
      life: 80 + Math.random()*100,
      size: 6 + Math.random()*8,
      color: `hsl(${Math.random()*40+320}deg 80% 60%)`
    });
  }
}
function spawnCollectBurst(x,y){ spawnConfetti(x,y,16); }

function updateConfetti(){
  confCtx.clearRect(0,0,W,H);
  for(let i=confetti.length-1;i>=0;i--){
    const p = confetti[i];
    p.vy += 0.18; p.x += p.vx; p.y += p.vy; p.life--;
    confCtx.fillStyle = p.color; confCtx.fillRect(p.x, p.y, p.size, p.size);
    if (p.life <=0 || p.y > H+50) confetti.splice(i,1);
  }
  requestAnimationFrame(updateConfetti);
}

/* ---------- win sequence ---------- */
function winSequence(){
  // show confetti big, then modal
  confCanvas.classList.remove('hidden');
  spawnConfetti(W/2, H/2 - 60, 180);
  // show letter modal
  letterOverlay.classList.remove('hidden');
}

/* close letter and reset */
closeLetter.addEventListener('click', ()=>{
  letterOverlay.classList.add('hidden');
  confCanvas.classList.add('hidden');
  // reset
  hud.count = 0;
  progressEl.textContent = `${hud.count} / ${TARGET} ❤️`;
  spawnHeart();
});

/* ---------- main loop ---------- */
let last = performance.now();
function frame(now){
  const dt = now - last; last = now;
  // update
  updateHeart();
  // draw
  ctx.clearRect(0,0,W,H);
  if (heart.alive) drawHeart();
  requestAnimationFrame(frame);
}

/* ---------- init & start ---------- */
function startGame(){
  rulesOverlay.classList.remove('active');
  rulesOverlay.classList.add('hidden');
  // initial spawn
  spawnHeart();
  requestAnimationFrame(frame);
  requestAnimationFrame(updateConfetti);
}

/* hook start button */
startBtn.addEventListener('click', startGame);

/* expose for debug */
window._spawnHeart = spawnHeart;
window._conf = spawnConfetti;