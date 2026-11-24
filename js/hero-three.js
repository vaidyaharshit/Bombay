// The 12 Chronicles — Minimalist 3D Mumbai Hero Visualization (Three.js)
// Renders an elegant, lightweight low-poly Mumbai skyline, coastal arc, and orbiting travel plane.

(function () {
  const container = document.getElementById('hero-canvas-container');
  if (!container || typeof THREE === 'undefined') return;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF7F4EC); // Warm Ivory matching theme
  scene.fog = new THREE.FogExp2(0xF7F4EC, 0.015);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 22, 45);
  camera.lookAt(0, 4, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Colors based on brand guidelines
  const PALETTE = {
    ivory: 0xF7F4EC,
    forest: 0x354B3A,
    terracotta: 0xC76B4A,
    olive: 0xA4A88A,
    charcoal: 0x282824,
    gold: 0xD4AF37,
    water: 0x8FA499
  };

  // Lighting: Warm, architectural sunlight and gentle ambient fill
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xFFF7E6, 1.2);
  sunLight.position.set(30, 40, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 100;
  sunLight.shadow.camera.left = -25;
  sunLight.shadow.camera.right = 25;
  sunLight.shadow.camera.top = 25;
  sunLight.shadow.camera.bottom = -25;
  scene.add(sunLight);

  const hemisphereLight = new THREE.HemisphereLight(0xF7F4EC, 0xA4A88A, 0.4);
  scene.add(hemisphereLight);

  // Group container for all scene elements
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  // 1. Coastal Baseplate (Mumbai Promontory & Arabian Sea)
  const baseGeometry = new THREE.CylinderGeometry(24, 25, 1.2, 48);
  const baseMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.olive });
  const basePlate = new THREE.Mesh(baseGeometry, baseMaterial);
  basePlate.position.y = -0.6;
  basePlate.receiveShadow = true;
  cityGroup.add(basePlate);

  // Sea water semi-ring
  const seaGeometry = new THREE.RingGeometry(14, 26, 32, 1, 0, Math.PI);
  const seaMaterial = new THREE.MeshLambertMaterial({ 
    color: PALETTE.water, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65 
  });
  const seaMesh = new THREE.Mesh(seaGeometry, seaMaterial);
  seaMesh.rotation.x = -Math.PI / 2;
  seaMesh.position.set(0, 0.05, 2);
  cityGroup.add(seaMesh);

  // Promenade Curved Wall (Marine Drive Tetrapod arc)
  const curvePoints = [];
  for (let i = 0; i <= 24; i++) {
    const angle = (i / 24) * Math.PI * 0.85 - Math.PI * 0.42;
    const r = 13.5;
    curvePoints.push(new THREE.Vector3(Math.sin(angle) * r, 0.2, Math.cos(angle) * r));
  }
  const promenadeCurve = new THREE.CatmullRomCurve3(curvePoints);
  const promenadeGeo = new THREE.TubeGeometry(promenadeCurve, 32, 0.35, 6, false);
  const promenadeMat = new THREE.MeshLambertMaterial({ color: PALETTE.charcoal });
  const promenadeMesh = new THREE.Mesh(promenadeGeo, promenadeMat);
  cityGroup.add(promenadeMesh);

  // 2. Gateway of India Monument (Minimalist geometric sculpture)
  const gatewayGroup = new THREE.Group();
  
  // Pillars
  const pillarGeo = new THREE.BoxGeometry(1.4, 4.5, 1.4);
  const stoneMat = new THREE.MeshLambertMaterial({ color: PALETTE.terracotta });
  const pillarL = new THREE.Mesh(pillarGeo, stoneMat);
  pillarL.position.set(-1.8, 2.25, 0);
  pillarL.castShadow = true;
  pillarL.receiveShadow = true;

  const pillarR = new THREE.Mesh(pillarGeo, stoneMat);
  pillarR.position.set(1.8, 2.25, 0);
  pillarR.castShadow = true;
  pillarR.receiveShadow = true;

  // Lintel arch
  const lintelGeo = new THREE.BoxGeometry(5.4, 1.2, 1.6);
  const lintel = new THREE.Mesh(lintelGeo, stoneMat);
  lintel.position.set(0, 4.6, 0);
  lintel.castShadow = true;

  // Top Dome
  const domeGeo = new THREE.ConeGeometry(1.2, 1.5, 8);
  const domeMat = new THREE.MeshLambertMaterial({ color: PALETTE.forest });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.set(0, 5.8, 0);
  dome.castShadow = true;

  // Turrets
  const turretGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 6);
  const turretL = new THREE.Mesh(turretGeo, stoneMat);
  turretL.position.set(-2.2, 5.4, 0);
  const turretR = turretL.clone();
  turretR.position.set(2.2, 5.4, 0);

  gatewayGroup.add(pillarL, pillarR, lintel, dome, turretL, turretR);
  gatewayGroup.position.set(-6, 0, 5);
  gatewayGroup.rotation.y = Math.PI * 0.15;
  cityGroup.add(gatewayGroup);

  // 3. Bandra-Worli Sea Link Pylon
  const pylonGroup = new THREE.Group();
  const pylonLegGeo = new THREE.BoxGeometry(0.5, 9, 0.5);
  const steelMat = new THREE.MeshLambertMaterial({ color: 0xFDFBF7 });
  const cableMat = new THREE.LineBasicMaterial({ color: PALETTE.olive, transparent: true, opacity: 0.6 });

  const pylonL = new THREE.Mesh(pylonLegGeo, steelMat);
  pylonL.position.set(-0.8, 4.5, 0);
  pylonL.rotation.z = -0.12;

  const pylonR = new THREE.Mesh(pylonLegGeo, steelMat);
  pylonR.position.set(0.8, 4.5, 0);
  pylonR.rotation.z = 0.12;
  pylonGroup.add(pylonL, pylonR);

  // Cables
  for (let k = 1; k <= 4; k++) {
    const yTop = 5 + k * 0.8;
    const xSpread = k * 1.5;
    const cableGeoL = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, yTop, 0),
      new THREE.Vector3(-xSpread, 0.4, 0)
    ]);
    const cableGeoR = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, yTop, 0),
      new THREE.Vector3(xSpread, 0.4, 0)
    ]);
    pylonGroup.add(new THREE.Line(cableGeoL, cableMat));
    pylonGroup.add(new THREE.Line(cableGeoR, cableMat));
  }
  pylonGroup.position.set(7, 0, -2);
  pylonGroup.rotation.y = -Math.PI * 0.2;
  cityGroup.add(pylonGroup);

  // 4. Minimalist Modern Mumbai Skyline Towers
  const buildingMats = [
    new THREE.MeshLambertMaterial({ color: PALETTE.forest }),
    new THREE.MeshLambertMaterial({ color: PALETTE.terracotta }),
    new THREE.MeshLambertMaterial({ color: 0xECE8DE }),
    new THREE.MeshLambertMaterial({ color: PALETTE.olive })
  ];

  const towerPositions = [
    { x: -3, z: -5, w: 2.4, h: 10, d: 2.4, m: 0 },
    { x: 0, z: -7, w: 3.2, h: 13, d: 3, m: 2 },
    { x: 3, z: -6, w: 2.2, h: 11, d: 2.2, m: 1 },
    { x: -7, z: -2, w: 2, h: 7, d: 2, m: 3 },
    { x: -10, z: -6, w: 2.5, h: 8.5, d: 2.5, m: 2 },
    { x: 7, z: -8, w: 2.8, h: 9.5, d: 2.8, m: 0 },
    { x: 10, z: -4, w: 2, h: 6.5, d: 2, m: 3 },
    { x: -2, z: 1, w: 1.8, h: 5.5, d: 1.8, m: 1 },
    { x: 3.5, z: 2, w: 1.6, h: 4.8, d: 1.6, m: 2 }
  ];

  towerPositions.forEach((tp) => {
    const geo = new THREE.BoxGeometry(tp.w, tp.h, tp.d);
    const mesh = new THREE.Mesh(geo, buildingMats[tp.m]);
    mesh.position.set(tp.x, tp.h / 2, tp.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cityGroup.add(mesh);

    // Decorative rooftop accents
    if (tp.h > 8) {
      const spireGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 4);
      const spire = new THREE.Mesh(spireGeo, steelMat);
      spire.position.set(tp.x, tp.h + 1.25, tp.z);
      cityGroup.add(spire);
    }
  });

  // 5. Minimalist Low-Poly Travel Airplane
  const planeGroup = new THREE.Group();

  // Fuselage
  const fuselageGeo = new THREE.ConeGeometry(0.45, 2.8, 5);
  const planeMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const fuselage = new THREE.Mesh(fuselageGeo, planeMat);
  fuselage.rotation.x = Math.PI / 2;
  planeGroup.add(fuselage);

  // Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(2.2, -0.7);
  wingShape.lineTo(2.0, -1.2);
  wingShape.lineTo(0, -0.4);
  wingShape.lineTo(-2.0, -1.2);
  wingShape.lineTo(-2.2, -0.7);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: false });
  const wingMat = new THREE.MeshLambertMaterial({ color: PALETTE.forest });
  const wings = new THREE.Mesh(wingExtrude, wingMat);
  wings.rotation.x = -Math.PI / 2;
  wings.position.set(0, 0.04, 0.2);
  planeGroup.add(wings);

  // Tail fin
  const tailGeo = new THREE.BoxGeometry(0.08, 0.7, 0.6);
  const tailMat = new THREE.MeshLambertMaterial({ color: PALETTE.terracotta });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0.45, -1.1);
  planeGroup.add(tail);

  planeGroup.scale.set(0.85, 0.85, 0.85);
  scene.add(planeGroup);

  // 6. Subtle Floating Dust / Star Particles
  const particleCount = 70;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 50;
    particlePositions[i + 1] = Math.random() * 25 + 1;
    particlePositions[i + 2] = (Math.random() - 0.5) * 50;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: PALETTE.terracotta,
    size: 0.25,
    transparent: true,
    opacity: 0.5
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Interactive mouse parallax
  let mouseX = 0;
  let mouseY = 0;
  let targetRotationX = 0;
  let targetRotationY = 0;

  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    mouseX = x * 0.2;
    mouseY = y * 0.1;
  });

  // Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Gentle city rotation
    cityGroup.rotation.y = Math.sin(elapsedTime * 0.15) * 0.12;

    // Smooth camera mouse follow
    camera.position.x += (mouseX * 15 - camera.position.x) * 0.04;
    camera.position.y += (22 + mouseY * 6 - camera.position.y) * 0.04;
    camera.lookAt(0, 4, 0);

    // Orbiting Airplane path
    const planeRadius = 18;
    const planeSpeed = 0.45;
    const angle = elapsedTime * planeSpeed;
    const planeX = Math.cos(angle) * planeRadius;
    const planeZ = Math.sin(angle) * planeRadius;
    const planeY = 12 + Math.sin(elapsedTime * 1.5) * 1.8;

    planeGroup.position.set(planeX, planeY, planeZ);

    // Calculate flight direction & banking angle
    const nextAngle = angle + 0.05;
    const nextX = Math.cos(nextAngle) * planeRadius;
    const nextZ = Math.sin(nextAngle) * planeRadius;
    planeGroup.lookAt(nextX, planeY + Math.sin(nextAngle * 1.5) * 1.8, nextZ);
    planeGroup.rotation.z = -0.3; // subtle banking into turn

    // Particles subtle shimmer
    particles.rotation.y = elapsedTime * 0.02;

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
})();

