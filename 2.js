document.addEventListener("DOMContentLoaded", () => {
  const letter = document.getElementById("letter");
  const scene = document.getElementById("scene");

  letter.addEventListener("click", () => {
    letter.style.transition = "opacity 1s";
    letter.style.opacity = 0;

    setTimeout(() => {
      letter.style.display = "none";
      scene.classList.remove("hidden");
      createHeart3D();
    }, 1000);
  });
});

function createHeart3D() {
  const canvas = document.getElementById("heartCanvas");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Tạo hình trái tim
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0, 3, -3, 3, -3, 0);
  shape.bezierCurveTo(-3, -3, 0, -5, 0, -8);
  shape.bezierCurveTo(0, -5, 3, -3, 3, 0);
  shape.bezierCurveTo(3, 3, 0, 3, 0, 0);

  const extrude = {
    steps: 2,
    depth: 1.2,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.6,
    bevelSegments: 10
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrude);
  const material = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    shininess: 150,
    specular: 0xffffff
  });

  const heart = new THREE.Mesh(geometry, material);
  heart.scale.set(0.25, 0.25, 0.25);
  heart.position.y = -1.5; // ngang ngực
  scene.add(heart);

  // Ánh sáng
  const light1 = new THREE.PointLight(0xffffff, 1);
  light1.position.set(10, 10, 10);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xff7777, 1);
  light2.position.set(-10, -10, -10);
  scene.add(light2);

  camera.position.z = 10;

  function animate() {
    requestAnimationFrame(animate);
    heart.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  animate();
}

window.addEventListener("resize", () => {
  location.reload();
});