// ===== Khởi tạo Scene =====
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("heartCanvas").replaceWith(renderer.domElement);

// ===== Ánh sáng =====
const light = new THREE.PointLight(0xffffff, 1.2);
light.position.set(20, 20, 20);
scene.add(light);
scene.add(new THREE.AmbientLight(0xff9aa2, 0.6));

// ===== Hình trái tim 3D =====
const x = 0, y = 0;
const heartShape = new THREE.Shape();
heartShape.moveTo(x + 5, y + 5);
heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
heartShape.bezierCurveTo(x + 13, y + 15.4, x + 16, y + 11, x + 16, y + 7);
heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

const geometry = new THREE.ExtrudeGeometry(heartShape, {
  depth: 2,
  bevelEnabled: true,
  bevelThickness: 0.6,
  bevelSize: 0.8,
  bevelSegments: 2
});

const material = new THREE.MeshPhongMaterial({
  color: 0xff002b,
  shininess: 150,
  reflectivity: 1,
  specular: 0xffffff
});

const heart = new THREE.Mesh(geometry, material);
heart.rotation.x = Math.PI;
scene.add(heart);

// ===== Hiệu ứng =====
function animate() {
  requestAnimationFrame(animate);
  heart.rotation.y += 0.01;
  heart.rotation.z += 0.005;
  renderer.render(scene, camera);
}
animate();

// ===== Responsive =====
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== Lời chúc xoay quanh trái tim =====
const msg = document.createElement("div");
msg.className = "message";
msg.innerText = "Con chúc mẹ luôn vui vẻ, khỏe mạnh và hạnh phúc ❤️";
document.body.appendChild(msg);