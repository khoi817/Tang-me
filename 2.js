/* Full behaviour:
 - rules popup -> start
 - DVD-heart (svg dataurl) moves & bounces; click to collect; progress top-left animates green when collect
 - when collected == TARGET -> letter popup appears (closed)
 - click inside letter modal -> "open" step-by-step: 3 parts, each shown after pressing Next
 - final step: many hearts (small + some big) fly up (canvas) and glow
 - mom image tilt (mouse/device orientation) but no jitter on click
 - no audio
*/

/* ---------- CONFIG ---------- */
const TARGET = 10;
const PARTS = [
  `💌 Gửi Mẹ yêu của con,\n\nCon biết rằng con không phải lúc nào cũng giỏi nói lời yêu thương,\nnhưng trong lòng con, mẹ luôn là người đặc biệt nhất.`,
  `Cảm ơn mẹ vì đã hy sinh, lo lắng và dạy dỗ con từng chút một.\nCảm ơn mẹ vì đã luôn ở đó, dù con có thất bại hay vụng về thế nào đi nữa.`,
  `Nhân ngày 20/10 này, con chỉ muốn nói một điều giản dị — rằng con yêu mẹ rất nhiều.\n\nChúc mẹ luôn mạnh khỏe, luôn cười thật tươi, và hạnh phúc bên con mãi mãi. ❤️`
];

/* ---------- DOM ---------- */
const rulesOverlay = document.getElementById('rulesOverlay');
const startBtn = document.getElementById('startBtn');
const dvdCanvas = document.getElementById('dvdCanvas');
const ctx = dvdCanvas.getContext('2d');
const floatCanvas = document.getElementById('floatCanvas');
const floatCtx = floatCanvas.getContext('2d');
const heartImgEl = document.getElementById('heartSprite');
const momImg = document.getElementById('momImg');
const progressEl = document.getElementById('progress');
const letterOverlay = document.getElementById('letterOverlay');
const letterBody = document.getElementById('letterBody');
const nextBtn = document.getElementById('nextBtn');

let W = innerWidth, H = innerHeight;
function resize(){
  W = innerWidth; H = innerHeight;
  dvdCanvas.width = W; dvdCanvas.height = H;
  floatCanvas.width = W; floatCanvas.height = H;
}
window.addEventListener('resize', resize);
resize();

/* ---------- Heart sprite (SVG data url) ---------- */
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
heartImgEl.src = `data:image/svg+xml;utf8,${HEART_SVG}`;

/* ---------- MOTHER IMAGE TILT (smooth) ---------- */
const maxTilt = 12;
let tiltTimeout = null;
function applyTilt(mx,my){
  const rx = my * maxTilt;
  const ry = -mx * (maxTilt * 0.9);
  const tz = 6 + Math.abs(my) * 6;
  momImg.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`;
}
window.addEventListener('mousemove', e=>{
  const mx = (e.clientX / W)*2 - 1;
  const my = (e.clientY / H)*2 - 1;
  applyTilt(mx,my);
  clearTimeout(tiltTimeout);
  tiltTimeout = setTimeout(()=> momImg.style.transform = '', 1400);
});
window.addEventListener('deviceorientation', ev=>{
  if(ev.gamma==null && ev.beta==null) return;
  const nx = Math.max(-30, Math.min(30, ev.gamma || 0))/30;
  const ny = Math.max(-30, Math.min(30, (ev.beta||0)-20))/30;
  applyTilt(nx, ny);
}, true);

/* ---------- GAME STATE ---------- */
let collected = 0;
let running = false;

/* DVD heart actor */
const heart = { x:120, y:120, w:110, h:100, vx:3.2, vy:2.6, angle:0, spin:0.03, alive:false };

/* spawn heart avoiding mother's face area */
function spawnHeart(){
  heart.w = Math.max(56, Math.round(W * 0.11));
  heart.h = Math.round(heart.w * 0.92);
  const rect = momImg.getBoundingClientRect();
  const centerX = rect.left + rect.width/2;
  const centerY = rect.top + rect.height/2;

  let sx = (Math.random()<0.6) ? (Math.random()<0.5 ? 40 : W-40) : Math.random()*(W-160)+80;
  let sy = (Math.random()<0.6) ? Math.random()*(H-160)+80 : (Math.random()<0.5 ? 40 : H-40);
  // push further if overlapping mom center
  if(Math.hypot(sx-centerX, sy-centerY) < 180) sx = (sx + 260) % Math.max(W-120,200);

  heart.x = sx; heart.y = sy;
  const base = 2.4 + collected*0.15;
  heart.vx = (Math.random()<0.5?-1:1) * (base + Math.random()*1.8);
  heart.vy = (Math.random()<0.5?-1:1) * (base*0.8 + Math.random()*1.2);
  heart.spin = 0.02 + Math.random()*0.04;
  heart.angle = Math.atan2(heart.vy, heart.vx);
  heart.alive = true;
}

/* draw heart with glow */
function drawHeart(){
  const cx = heart.x, cy = heart.y;
  const glowR = Math.max(heart.w, heart.h) * 0.9;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g.addColorStop(0, 'rgba(255,120,140,0.22)');
  g.addColorStop(0.5, 'rgba(255,120,140,0.08)');
  g.addColorStop(1, 'rgba(255,120,140,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI*2); ctx.fill();

  ctx.save(); ctx.translate(cx, cy); ctx.rotate(heart.angle);
  const iw = heart.w, ih = heart.h;
  ctx.drawImage(heartImgEl, -iw/2, -ih/2, iw, ih);
  ctx.restore();
}

/* update physics */
function updateHeart(){
  if(!heart.alive) return;
  heart.x += heart.vx; heart.y += heart.vy;
  if (heart.x - heart.w/2 < 0) { heart.x = heart.w/2; heart.vx *= -1; heart.spin *= -1; }
  if (heart.x + heart.w/2 > W) { heart.x = W - heart.w/2; heart.vx *= -1; heart.spin *= -1; }
  if (heart.y - heart.h/2 < 0) { heart.y = heart.h/2; heart.vy *= -1; heart.spin *= -1; }
  if (heart.y + heart.h/2 > H) { heart.y = H - heart.h/2; heart.vy *= -1; heart.spin *= -1; }
  heart.vx *= 0.999; heart.vy *= 0.999;
  const target = Math.atan2(heart.vy, heart.vx);
  heart.angle += (target - heart.angle) * 0.12 + heart.spin*0.02;
}

/* hit test */
function pointInHeart(px,py){
  const dx = px - heart.x, dy = py - heart.y;
  const s = Math.sin(-heart.angle), c = Math.cos(-heart.angle);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) <= heart.w/2 && Math.abs(ly) <= heart.h/2;
}

/* pointer handling */
dvdCanvas.addEventListener('pointerdown', (ev)=>{
  if(!running) return;
  const x = ev.clientX, y = ev.clientY;
  if(heart.alive && pointInHeart(x,y)) collectHeart();
}, {passive:true});

/* collect & HUD animation */
function collectHeart(){
  heart.alive = false;
  spawnCollectBurst(heart.x, heart.y);
  collected = Math.min(TARGET, collected + 1);
  animateProgress();
  progressEl.textContent = `${collected} / ${TARGET} ❤️`;
  if(collected >= TARGET){
    setTimeout(()=> onWin(), 700);
  } else {
    setTimeout(()=> spawnHeart(), 300);
  }
}

function animateProgress(){
  progressEl.classList.add('animate');
  setTimeout(()=> progressEl.classList.remove('animate'), 520);
}

/* small collect burst (confetti squares) */
let tinyConf = [];
function spawnCollectBurst(x,y,n=16){
  for(let i=0;i<n;i++){
    tinyConf.push({
      x, y,
      vx: (Math.random()-0.5)*6,
      vy: (Math.random()-1.5)*6,
      life: 40 + Math.random()*40,
      size: 6 + Math.random()*6,
      color: `hsl(${Math.random()*40+320}deg 80% 60%)`
    });
  }
}

/* update tiny confetti rendered on dvd canvas */
function updateTinyConf(){
  for(let i=tinyConf.length-1;i>=0;i--){
    const p = tinyConf[i];
    p.vy += 0.25;
    p.x += p.vx; p.y += p.vy;
    p.life--;
    if(p.life<=0 || p.y > H+50) tinyConf.splice(i,1);
  }
}

/* draw tiny confetti */
function drawTinyConf(){
  for(const p of tinyConf){
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
}

/* ---------- finish: floating hearts animation ---------- */
let floatHearts = [];
function spawnFloatHearts(){
  floatCanvas.classList.remove('hidden');
  floatHearts = [];
  // many small
  for(let i=0;i<120;i++){
    floatHearts.push({
      x: W/2 + (Math.random()-0.5)*260,
      y: H*0.7 + Math.random()*60,
      vx: (Math.random()-0.5)*1.8,
      vy: - (1 + Math.random()*3),
      size: 6 + Math.random()*8,
      alpha: 0,
      life: 160 + Math.random()*80,
      hue: 340 + Math.random()*40
    });
  }
  // a few big glowing
  for(let i=0;i<12;i++){
    floatHearts.push({
      x: W/2 + (Math.random()-0.5)*300,
      y: H*0.75 + Math.random()*80,
      vx: (Math.random()-0.5)*2.5,
      vy: - (2 + Math.random()*4),
      size: 18 + Math.random()*26,
      alpha: 0,
      life: 200 + Math.random()*120,
      hue: 330 + Math.random()*60
    });
  }
}

function updateFloatHearts(){
  floatCtx.clearRect(0,0,W,H);
  for(let i=floatHearts.length-1;i>=0;i--){
    const p = floatHearts[i];
    p.vy += 0.02; p.x += p.vx; p.y += p.vy;
    p.alpha = Math.min(1, p.alpha + 0.02);
    // draw heart as simple filled rotated path
    floatCtx.save();
    floatCtx.translate(p.x, p.y);
    const s = p.size;
    // glow
    floatCtx.fillStyle = `rgba(255,180,200,${0.12 * p.alpha})`;
    floatCtx.beginPath();
    floatCtx.arc(0, 0, s*1.6, 0, Math.PI*2); floatCtx.fill();
    // main heart (simple triangle-ish curve using path)
    floatCtx.fillStyle = `hsl(${p.hue} 80% 60% / ${p.alpha})`;
    floatCtx.beginPath();
    floatCtx.moveTo(0, s*0.45);
    floatCtx.bezierCurveTo(-s, s*1.1, -s*1.2, -s*0.2, 0, -s*0.9);
    floatCtx.bezierCurveTo(s*1.2, -s*0.2, s, s*1.1, 0, s*0.45);
    floatCtx.closePath();
    floatCtx.fill();
    floatCtx.restore();

    p.life--;
    if(p.life<=0 || p.y < -80) floatHearts.splice(i,1);
  }
  if(floatHearts.length>0) requestAnimationFrame(updateFloatHearts);
  else floatCanvas.classList.add('hidden');
}

/* ---------- win sequence & letter open ---------- */
function onWin(){
  // stop heart
  heart.alive = false;
  // show letter closed modal
  letterOverlay.classList.remove('hidden');
  letterBody.innerHTML = ''; // empty until user steps through
  currentPart = 0;
  nextBtn.textContent = 'Tiếp theo →';
}

/* clicking Next shows parts step-by-step */
let currentPart = 0;
nextBtn.addEventListener('click', ()=>{
  if(currentPart < PARTS.length){
    // show current part with typewriter animation for that chunk
    showPart(PARTS[currentPart], ()=>{
      currentPart++;
      if(currentPart >= PARTS.length){
        nextBtn.textContent = 'Kết thúc ❤️';
      } else {
        nextBtn.textContent = 'Tiếp theo →';
      }
    });
  } else {
    // finished -> launch final hearts
    letterOverlay.classList.add('hidden');
    spawnFloatHearts();
    requestAnimationFrame(updateFloatHearts);
  }
});

/* typewriter per part */
function showPart(text, cb){
  // fade previous part up and append new container
  const partDiv = document.createElement('div');
  partDiv.style.opacity = '0';
  partDiv.style.marginBottom = '8px';
  letterBody.appendChild(partDiv);

  // simple fade in
  requestAnimationFrame(()=> { partDiv.style.transition = 'opacity .28s'; partDiv.style.opacity = '1'; });
  // typewriter
  let idx = 0;
  function step(){
    const visible = text.slice(0, idx);
    // preserve line breaks
    partDiv.textContent = visible;
    idx++;
    if(idx <= text.length) setTimeout(step, 18 + Math.random()*18);
    else { setTimeout(cb, 220); }
  }
  step();
}

/* ---------- tiny conf update for dvd canvas ---------- */
function drawFrame(){
  // update physics
  updateHeart();
  updateTinyConf();

  // clear
  ctx.clearRect(0,0,W,H);

  // draw tiny conf first (under heart)
  drawTinyConf();

  // draw heart
  if(heart.alive) drawHeart();

  requestAnimationFrame(drawFrame);
}

/* ---------- tiny conf drawing already in drawTinyConf() above ---------- */

/* ---------- pointer test to collect on dvd canvas already set earlier ---------- */
dvdCanvas.addEventListener('pointerdown', (ev)=>{
  // handled above; keep passive to not block
}, {passive:true});

/* ---------- start game ---------- */
startBtn.addEventListener('click', ()=>{
  rulesOverlay.classList.remove('active');
  rulesOverlay.classList.add('hidden');
  running = true;
  collected = 0;
  progressEl.textContent = `${collected} / ${TARGET} ❤️`;
  spawnHeart();
  requestAnimationFrame(drawFrame);
});

/* ---------- collect handler wiring (already done in pointerdown) ---------- */
// implement pointerdown detection explicitly to ensure responsiveness
dvdCanvas.addEventListener('pointerdown', (ev)=>{
  if(!running) return;
  const x = ev.clientX, y = ev.clientY;
  if(heart.alive && pointInHeart(x,y)){
    collectHeart();
  }
}, {passive:true});

/* initial spawn to prepare visuals */
spawnHeart();