import * as T from "three";

/** A bounded viewport of the real agenda. Labels remain accessible DOM buttons. */
export function createRoadmapScene(stage: HTMLDivElement, buttons: HTMLButtonElement[], offset: number) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.setAttribute("aria-hidden", "true");
  stage.prepend(renderer.domElement);
  stage.dataset.ready = "true";
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-8, 8, 4, -4, .1, 100);
  const world = new T.Group();
  scene.add(world, new T.HemisphereLight(0xcaf8f0, 0x092230, 2.5));
  const key = new T.DirectionalLight(0xd6ffed, 3.5);
  key.position.set(-4, 9, 5);
  const rimLight = new T.DirectionalLight(0x22aaff, 3);
  rimLight.position.set(4, 3, -6);
  scene.add(key, rimLight);
  const materials: T.Material[] = [];
  const material = (color: number, emissive = 0) => {
    const m = new T.MeshStandardMaterial({ color, metalness: .55, roughness: .28, emissive, emissiveIntensity: .8 });
    materials.push(m);
    return m;
  };
  const dark = material(0x0c2835), top = material(0x1d5261);
  const green = material(0x4eebba, 0x239a78), blue = material(0x37a7ca);
  const glow = material(0x75ffcd, 0x43ffbc), dim = material(0x298687, 0x1e675f);
  const mesh = (geometry: T.BufferGeometry, mat: T.Material, parent: T.Object3D, y = 0) => {
    const object = new T.Mesh(geometry, mat);
    object.position.y = y;
    parent.add(object);
    return object;
  };
  const nodes = buttons.map((_, i) => {
    const group = new T.Group();
    world.add(group);
    mesh(new T.CylinderGeometry(.5, .59, .19, 6), dark, group).rotation.y = Math.PI / 6;
    mesh(new T.CylinderGeometry(.46, .5, .07, 6), top, group, .13).rotation.y = Math.PI / 6;
    const ring = mesh(new T.TorusGeometry(.44, .018, 8, 64), dim, group, .18);
    ring.rotation.x = Math.PI / 2;
    const tiles = Array.from({ length: 3 }, (_, k) => {
      const tile = mesh(new T.BoxGeometry(.35 - k * .038, .055, .35 - k * .038), i % 2 ? blue : green, group, .25 + k * .085);
      tile.rotation.y = Math.PI / 4;
      return tile;
    });
    return { group, ring, tiles };
  });
  const grid = new T.GridHelper(24, 24, 0x24505b, 0x17343f);
  grid.position.y = -.16;
  (grid.material as T.Material).transparent = true;
  (grid.material as T.Material).opacity = .22;
  world.add(grid);
  const orb = mesh(new T.SphereGeometry(.09, 20, 12), glow, world);
  const hyper = new T.Group();
  world.add(hyper);
  const vertices: number[][] = Array.from({ length: 16 }, (_, n) => [0, 1, 2, 3].map(k => n & (1 << k) ? 1 : -1));
  const edges: number[][] = [];
  for (let a = 0; a < 16; a++) for (let b = a + 1; b < 16; b++) {
    const d = a ^ b;
    if ((d & (d - 1)) === 0) edges.push([a, b]);
  }
  const hyperGeo = new T.BufferGeometry();
  hyperGeo.setAttribute("position", new T.BufferAttribute(new Float32Array(edges.length * 6), 3));
  const hyperMat = new T.LineBasicMaterial({ color: 0x8affdd, transparent: true, opacity: .8 });
  materials.push(hyperMat);
  hyper.add(new T.LineSegments(hyperGeo, hyperMat));
  let selected = 0, travel = 0, time = 0, width = 1, height = 1;
  let mobile = false, paused = true, visible = true, destroyed = false;
  let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0;
  let road: T.Mesh | undefined, curve: T.CatmullRomCurve3;
  const positions: T.Vector3[] = [];
  const project = () => {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    nodes.forEach(({ group }, i) => {
      const v = group.localToWorld(new T.Vector3(0, .9, 0)).project(camera);
      buttons[i].style.left = `${(v.x * .5 + .5) * width}px`;
      buttons[i].style.top = `${(-v.y * .5 + .5) * height}px`;
    });
  };
  const render = (dt: number) => {
    if (destroyed) return;
    smoothX = paused ? 0 : T.MathUtils.damp(smoothX, pointerX, 4, dt);
    smoothY = paused ? 0 : T.MathUtils.damp(smoothY, pointerY, 4, dt);
    travel = paused ? selected : T.MathUtils.damp(travel, selected, 5, dt);
    world.rotation.set(mobile ? 0 : smoothY * .012, mobile ? 0 : smoothX * .025, 0);
    nodes.forEach(({ group, ring, tiles }, i) => {
      group.position.y = paused ? (i === selected ? .32 : 0) : T.MathUtils.damp(group.position.y, i === selected ? .32 : 0, 6, dt);
      ring.material = i === selected ? glow : dim;
      tiles.forEach((tile, k) => { tile.rotation.y = Math.PI / 4 + (i === selected ? Math.sin(time * .7 + k * .15) * .15 : 0); });
    });
    if (curve) orb.position.copy(curve.getPoint(Math.min(1, Math.max(0, travel / Math.max(1, nodes.length - 1)))));
    orb.position.y = .17;
    if (positions[selected]) hyper.position.set(positions[selected].x, nodes[selected].group.position.y + 1.08, positions[selected].z);
    const projected = vertices.map(v => {
      const p = v.slice();
      for (const [a, b, angle] of [[0, 3, time * .32 + .4], [1, 2, time * .21 + .3]]) {
        const x = p[a], y = p[b];
        p[a] = x * Math.cos(angle) - y * Math.sin(angle);
        p[b] = x * Math.sin(angle) + y * Math.cos(angle);
      }
      const factor = .20 / (1.65 - p[3] * .48);
      return p.slice(0, 3).map(c => c * factor);
    });
    const attr = hyperGeo.getAttribute("position") as T.BufferAttribute;
    let index = 0;
    edges.forEach(pair => pair.forEach(n => { attr.setXYZ(index++, ...projected[n] as [number, number, number]); }));
    attr.needsUpdate = true;
    project();
    renderer.render(scene, camera);
  };
  const resize = () => {
    width = stage.clientWidth; height = stage.clientHeight;
    if (!width || !height) return;
    mobile = width < 600;
    renderer.setSize(width, height, false);
    positions.length = 0;
    nodes.forEach(({ group }, i) => {
      const span = Math.min(nodes.length - 1, 5);
      const p = mobile
        ? new T.Vector3(nodes.length === 1 ? 0 : i % 2 ? -1.8 : 1.8, 0, (i - span / 2) * 2.15)
        : new T.Vector3((i - span / 2) * 2.44, 0, nodes.length === 1 ? 0 : i % 2 ? -.85 : 1.2);
      positions.push(p); group.position.copy(p);
    });
    if (mobile) {
      const halfH = 7.85;
      camera.left = -halfH * width / height; camera.right = -camera.left;
      camera.top = halfH; camera.bottom = -halfH;
      camera.position.set(0, 15, 13); camera.lookAt(0, .5, 0);
    } else {
      camera.left = -8.4; camera.right = 8.4;
      camera.top = 8.4 * height / width; camera.bottom = -camera.top;
      camera.position.set(0, 10, 15); camera.lookAt(0, .45, 0);
    }
    camera.updateProjectionMatrix();
    if (road) { world.remove(road); road.geometry.dispose(); }
    const points = positions.map(p => new T.Vector3(p.x, -.055, p.z));
    if (points.length === 1) points.push(points[0].clone().add(new T.Vector3(.01, 0, 0)));
    curve = new T.CatmullRomCurve3(points, false, "catmullrom", .35);
    road = mesh(new T.TubeGeometry(curve, 120, .055, 8, false), dim, world);
    render(0);
  };
  const move = (e: PointerEvent) => {
    const rect = stage.getBoundingClientRect();
    pointerX = (e.clientX - rect.left) / rect.width * 2 - 1;
    pointerY = (e.clientY - rect.top) / rect.height * 2 - 1;
  };
  const leave = () => { pointerX = pointerY = 0; };
  const lost = (e: Event) => { e.preventDefault(); stage.dataset.ready = "false"; paused = true; };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerleave", leave);
  const ro = new ResizeObserver(resize); ro.observe(stage);
  const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }); io.observe(stage);
  let frame = 0, last = performance.now();
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (paused || !visible || document.hidden) return;
    time += dt; render(dt);
  };
  resize(); frame = requestAnimationFrame(tick);
  return {
    select(index: number) { selected = Math.max(0, Math.min(nodes.length - 1, index - offset)); render(0); },
    pause(value: boolean) { paused = value; render(0); },
    dispose() {
      destroyed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
      stage.removeEventListener("pointermove", move); stage.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      scene.traverse(object => { if ("geometry" in object) (object as T.Mesh).geometry.dispose(); });
      materials.forEach(m => m.dispose()); (grid.material as T.Material).dispose();
      renderer.dispose(); renderer.domElement.remove(); delete stage.dataset.ready;
      buttons.forEach(b => { b.style.left = ""; b.style.top = ""; });
    },
  };
}
