import * as THREE from "three";
import { live, ui } from "@/lib/store";
import { clamp, damp, onTick, smooth } from "@/lib/ticker";
import { media, type MediaEntry } from "@/lib/mediaRegistry";
import { MARK_PATHS } from "@/lib/mark";
import { NOISE_GLSL, ridgedFbm } from "./noise";

export interface SceneOptions {
  mobile: boolean;
  onStep?: (step: "terrain" | "first-frame") => void;
  onLost?: () => void;
}

export interface SceneHandle {
  dispose(): void;
}

const TERRAIN_COLOR = new THREE.Color("#0B0E0D");

/* ------------------------------------------------------------------ terrain */

function terrainHeight(x: number, z: number) {
  const far = smooth(4, -55, z);
  const amp = 0.5 + far * 7.5;
  let h = ridgedFbm(x * 0.045, z * 0.045, 5) * amp;
  h += ridgedFbm(x * 0.16 + 7.3, z * 0.16 - 2.1, 3) * 0.35;
  // clearing beneath the monogram
  const dx = x;
  const dz = z + 8;
  const d = Math.sqrt(dx * dx + dz * dz * 0.7);
  const clearing = smooth(6, 16, d);
  h = h * (0.12 + 0.88 * clearing) - (1 - clearing) * 0.25;
  // keep the near foreground low so text sits on calm ground
  h *= 0.55 + 0.45 * smooth(12, 0, z);
  return h - 1.2;
}

const terrainVert = /* glsl */ `
  varying vec3 vW;
  varying vec3 vN;
  varying float vH;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vH = position.z; // plane is rotated: local z is height
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const terrainFrag = /* glsl */ `
  uniform vec3 uLight;
  uniform vec2 uLamp;
  uniform float uLampAmt;
  uniform float uBright;
  uniform float uGlow;
  uniform vec3 uMarkPos;
  uniform vec3 uFog;
  varying vec3 vW;
  varying vec3 vN;
  varying float vH;
  ${NOISE_GLSL}
  void main() {
    vec3 n = normalize(vN);
    float r1 = snoise(vW.xz * 2.1) * 0.5 + 0.5;
    float r2 = snoise(vW.xz * 8.5 + 3.0) * 0.5 + 0.5;
    vec3 base = vec3(0.133, 0.161, 0.137) * (0.62 + 0.42 * r1 + 0.18 * r2);

    // grazing key light: irregular faces catch it, flats stay dark
    vec3 L = normalize(uLight);
    float ndl = max(dot(n, L), 0.0);
    float slope = 1.0 - n.y;
    vec3 col = base * (0.18 + 2.1 * ndl * (0.25 + slope * 1.4));
    col += base * 0.18 * n.y;

    float dist = length(vW - cameraPosition);
    float nearMask = 1.0 - smoothstep(18.0, 60.0, dist);

    // restrained map contours
    float hc = vH * 1.7;
    float fw = fwidth(hc);
    float dc = min(fract(hc), 1.0 - fract(hc));
    float contour = 1.0 - smoothstep(0.0, fw * 1.3, dc);
    col += vec3(0.718, 0.816, 0.647) * contour * 0.05 * nearMask;

    // branching paths, only on gentle ground near the clearing
    float pn = snoise(vW.xz * 0.075 + vec2(3.1, 1.7)) + 0.35 * snoise(vW.xz * 0.21 + 9.0);
    float pw = fwidth(pn);
    float path = 1.0 - smoothstep(pw * 0.5, pw * 1.8 + 0.004, abs(pn));
    float pathMask = smoothstep(0.86, 0.97, n.y) * (1.0 - smoothstep(10.0, 34.0, length(vW.xz - uMarkPos.xz)));
    col = mix(col, vec3(0.953, 0.937, 0.894) * 0.26, path * pathMask * 0.55);

    // warm light from the monogram above the clearing
    vec3 toMark = uMarkPos - vW;
    float dm = length(toMark);
    float markLight = max(dot(n, toMark / dm), 0.0) / (1.0 + dm * dm * 0.018);
    col += vec3(1.0, 0.686, 0.463) * markLight * uGlow * 0.55;

    // pointer lamp: a broad warm pool
    float dl = length(vW.xz - uLamp);
    float lamp = exp(-dl * dl / 32.0) * uLampAmt;
    col += vec3(1.0, 0.78, 0.55) * lamp * (0.06 + 0.5 * ndl + 0.1 * r2);

    // depth haze
    float fog = 1.0 - exp(-dist * 0.03);
    col = mix(col, uFog, clamp(fog, 0.0, 1.0));
    col *= uBright;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ------------------------------------------------------------------ sky */

const skyFrag = /* glsl */ `
  uniform float uBright;
  uniform float uGlow;
  uniform vec2 uMarkDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 top = vec3(0.043, 0.055, 0.051);
    vec3 horizon = vec3(0.085, 0.1, 0.09);
    vec3 col = mix(horizon, top, smoothstep(-0.02, 0.45, h));
    float g = exp(-pow(length(vec2(d.x, d.y - 0.12)) * 3.2, 2.0));
    col += vec3(1.0, 0.686, 0.463) * g * 0.05 * uGlow;
    gl_FragColor = vec4(col * uBright, 1.0);
  }
`;
const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

/* ------------------------------------------------------------------ motes */

const moteVert = /* glsl */ `
  uniform float uTime;
  uniform float uPx;
  uniform float uAccent;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.13 + aSeed * 40.0) * 0.7;
    p.y += sin(uTime * 0.21 + aSeed * 17.0) * 0.45 + mod(uTime * 0.05 * (0.4 + aSeed), 1.0) * 0.6;
    p.z += cos(uTime * 0.11 + aSeed * 23.0) * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.4 + aSeed * 2.6) * uPx * (18.0 / max(1.0, -mv.z));
    float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 50.0);
    vA = tw * (0.35 + 0.25 * uAccent) * smoothstep(60.0, 8.0, -mv.z);
  }
`;
const moteFrag = /* glsl */ `
  uniform float uBright;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(c));
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.72) * a * vA * uBright, 1.0);
  }
`;

/* ------------------------------------------------------------------ overlay: mark + gallery */

const quadVert = /* glsl */ `
  uniform float uBend;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float wgt = uBend < 0.0 ? pow(1.0 - uv.y, 2.0) : pow(uv.y, 2.0);
    float arch = sin(uv.x * 3.14159265);
    p.y += uBend * wgt * (0.3 + 0.7 * arch);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const mediaFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 q = abs((vUv - 0.5) * uSize) - (uSize * 0.5 - uRadius);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    float a = 1.0 - smoothstep(-1.0, 0.5, d);
    vec4 tex = texture2D(uTex, vUv);
    gl_FragColor = vec4(tex.rgb, a * uOpacity);
  }
`;
const markFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uAccent;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uTex, vUv);
    float shimmer = 0.5 + 0.5 * sin(vUv.x * 13.0 + vUv.y * 9.0 - uTime * 1.3);
    float core = t.r;          // sharp stroke
    float halo = t.g;          // blurred glow
    vec3 warm = vec3(1.0, 0.94, 0.86);
    vec3 ember = vec3(1.0, 0.686, 0.463);
    float h = halo * uGlow * 0.62;
    vec3 col = warm * core * (0.9 + 0.12 * shimmer * (0.4 + uAccent))
             + ember * h * (0.8 + 0.2 * shimmer) * (1.0 - core);
    float a = clamp(core + h, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col * uOpacity, a);
  }
`;

function makeMarkTexture() {
  const size = 1024;
  const pad = 8; // grid units around the 32-unit box
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const g = cv.getContext("2d")!;
  const unit = size / (32 + pad * 2);
  const paths = MARK_PATHS.map((d) => new Path2D(d));
  const strokeAll = (width: number) => {
    g.save();
    g.translate(pad * unit, pad * unit);
    g.scale(unit, unit);
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = width;
    paths.forEach((p) => g.stroke(p));
    g.restore();
  };
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  // green channel: halo
  g.globalCompositeOperation = "lighter";
  g.filter = `blur(${unit * 2.4}px)`;
  g.strokeStyle = "rgb(0,110,0)";
  strokeAll(2.6);
  g.filter = `blur(${unit * 0.6}px)`;
  g.strokeStyle = "rgb(0,70,0)";
  strokeAll(1.6);
  // red channel: core
  g.filter = "none";
  g.strokeStyle = "rgb(255,0,0)";
  strokeAll(1.5);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, ratio: (32 + pad * 2) / 32 };
}

interface MediaPlane {
  entry: MediaEntry;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  tex: THREE.CanvasTexture;
  version: number;
  sizeVersion: number;
  radius: number;
}

/* ------------------------------------------------------------------ create */

export function createScene(canvas: HTMLCanvasElement, opts: SceneOptions): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.mobile, alpha: false, powerPreference: "high-performance" });
  const maxDpr = opts.mobile ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setClearColor(TERRAIN_COLOR, 1);
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
  const overlay = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);

  // terrain
  const seg = opts.mobile ? 150 : 230;
  const geo = new THREE.PlaneGeometry(120, 110, seg, seg);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // becomes -z after rotation
    pos.setZ(i, terrainHeight(x, -y - 25));
  }
  geo.computeVertexNormals();
  const terrainMat = new THREE.ShaderMaterial({
    vertexShader: terrainVert,
    fragmentShader: terrainFrag,
    uniforms: {
      uLight: { value: new THREE.Vector3(-0.9, 0.22, -0.45) },
      uLamp: { value: new THREE.Vector2(0, 0) },
      uLampAmt: { value: 0 },
      uBright: { value: 1 },
      uGlow: { value: 1 },
      uMarkPos: { value: new THREE.Vector3(0, 3.2, -8) },
      uFog: { value: new THREE.Color("#121614") },
    },
  });
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.z = -25;
  scene.add(terrain);
  opts.onStep?.("terrain");

  // sky
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    uniforms: { uBright: { value: 1 }, uGlow: { value: 1 }, uMarkDir: { value: new THREE.Vector2() } },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat);
  sky.renderOrder = -1;
  scene.add(sky);

  // motes
  const count = opts.mobile ? 160 : 520;
  const mg = new THREE.BufferGeometry();
  const mp = new Float32Array(count * 3);
  const ms = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    mp[i * 3] = (Math.random() - 0.5) * 34;
    mp[i * 3 + 1] = Math.random() * 7 - 0.6;
    mp[i * 3 + 2] = -Math.random() * 40 + 8;
    ms[i] = Math.random();
  }
  mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  mg.setAttribute("aSeed", new THREE.BufferAttribute(ms, 1));
  const moteMat = new THREE.ShaderMaterial({
    vertexShader: moteVert,
    fragmentShader: moteFrag,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uAccent: { value: 0 }, uBright: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(mg, moteMat);
  scene.add(motes);

  // mark overlay quad
  const { tex: markTex, ratio: markRatio } = makeMarkTexture();
  const markMat = new THREE.ShaderMaterial({
    vertexShader: quadVert,
    fragmentShader: markFrag,
    uniforms: {
      uTex: { value: markTex },
      uGlow: { value: 1 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uAccent: { value: 0 },
      uBend: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const markMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), markMat);
  overlay.add(markMesh);
  const markBox = document.querySelector<HTMLElement>("[data-mark-box]");

  // gallery planes
  const planes = new Map<number, MediaPlane>();
  const planeGeo = new THREE.PlaneGeometry(1, 1, 24, 24);
  let bend = 0;

  function syncPlanes() {
    media.forEach((entry, id) => {
      let p = planes.get(id);
      if (p && p.sizeVersion !== entry.sizeVersion) {
        p.tex.dispose();
        p.tex = new THREE.CanvasTexture(entry.canvas);
        p.tex.colorSpace = THREE.NoColorSpace;
        p.mesh.material.uniforms.uTex.value = p.tex;
        p.sizeVersion = entry.sizeVersion;
        p.version = -1;
        p.radius = parseFloat(getComputedStyle(entry.poster).borderTopLeftRadius) || 0;
      }
      if (!p) {
        const tex = new THREE.CanvasTexture(entry.canvas);
        tex.colorSpace = THREE.NoColorSpace;
        const mat = new THREE.ShaderMaterial({
          vertexShader: quadVert,
          fragmentShader: mediaFrag,
          uniforms: {
            uTex: { value: tex },
            uBend: { value: 0 },
            uSize: { value: new THREE.Vector2(1, 1) },
            uRadius: { value: 14 },
            uOpacity: { value: 1 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(planeGeo, mat);
        overlay.add(mesh);
        p = { entry, mesh, tex, version: -1, sizeVersion: entry.sizeVersion, radius: parseFloat(getComputedStyle(entry.poster).borderTopLeftRadius) || 0 };
        planes.set(id, p);
      }
    });
    planes.forEach((p, id) => {
      if (!media.has(id)) {
        overlay.remove(p.mesh);
        p.tex.dispose();
        p.mesh.material.dispose();
        planes.delete(id);
      }
    });
  }

  // sizing
  let W = 0;
  let H = 0;
  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    ortho.right = W;
    ortho.bottom = -H;
    ortho.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // context loss → hand back to the DOM fallback
  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    opts.onLost?.();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // pointer lamp with its own inertia (separate from the cursor)
  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.2);
  const hit = new THREE.Vector3();
  const lamp = new THREE.Vector2(0, -6);
  let lampAmt = 0;
  const ndc = new THREE.Vector2();

  let time = 0;
  let firstFrame = false;
  const lookAt = new THREE.Vector3();

  const off = onTick((dt, t) => {
    if (lost) return;
    const s = ui.get();
    if (s.overviewOpen) return; // fully covered
    time = t;
    const p = live.heroP;
    const s1 = smooth(0, 0.25, p);
    const s2 = smooth(0.25, 0.65, p);
    const s3 = smooth(0.65, 1, p);
    const after = Math.max(0, live.scroll.y - (document.getElementById("top")?.offsetHeight ?? H) + H) / H;
    const drift = Math.min(after, 6);

    camera.fov = 48 - 5 * s1;
    camera.position.set(Math.sin(drift * 0.35) * 0.6, 3.6 - 1.9 * s2 + drift * 0.06, 15 - 1.6 * s1 - 6.5 * s2 - drift * 1.1);
    lookAt.set(0, 2.4 - 1.7 * s2 - 0.6 * s3, -10 + 4 * s2 - drift * 1.1);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();

    const breath = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 6.5);
    const accent = Math.min(1, live.accent);
    const glow = (0.85 + 0.15 * breath + 0.18 * accent) * (1 - 0.7 * s2);
    const bright = (1 - 0.32 * s3) * (1 - 0.88 * smooth(0, 1, live.contactP));

    const u = terrainMat.uniforms;
    u.uGlow.value = glow * (1 - 0.6 * smooth(0.6, 1, p));
    u.uBright.value = bright;
    skyMat.uniforms.uBright.value = bright;
    skyMat.uniforms.uGlow.value = glow;
    moteMat.uniforms.uTime.value = t;
    moteMat.uniforms.uAccent.value = accent;
    moteMat.uniforms.uBright.value = bright * (s.reduceMotion ? 0 : 1);

    // lamp
    const ptr = live.pointer;
    const lampOn = ptr.inside && ptr.fine && !s.reduceMotion;
    if (lampOn) {
      ndc.set(ptr.nx * 2 - 1, -(ptr.ny * 2 - 1));
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(ground, hit)) {
        const tx = clamp(hit.x, -30, 30);
        const tz = clamp(hit.z, -60, 14);
        lamp.x = damp(lamp.x, tx, 0.35, dt);
        lamp.y = damp(lamp.y, tz, 0.35, dt);
      }
    }
    lampAmt = damp(lampAmt, lampOn ? 1 : 0, 0.5, dt);
    u.uLamp.value.copy(lamp);
    u.uLampAmt.value = lampAmt;

    // mark aligned to its DOM box
    const markO = 1 - smooth(0.38, 0.66, p);
    if (markBox && markO > 0.01) {
      const r = markBox.getBoundingClientRect();
      const size = r.width * markRatio;
      markMesh.visible = r.width > 0;
      markMesh.position.set(r.left + r.width / 2, -(r.top + r.height / 2), 0);
      markMesh.scale.set(size, size, 1);
      markMat.uniforms.uOpacity.value = markO;
      markMat.uniforms.uGlow.value = glow;
      markMat.uniforms.uTime.value = t;
      markMat.uniforms.uAccent.value = accent;
    } else {
      markMesh.visible = false;
    }

    // gallery planes: velocity-dependent bend, damped back to rest
    syncPlanes();
    const v = live.scroll.v;
    const target = s.reduceMotion ? 0 : -clamp(v / 4200, -1, 1) * 0.05;
    const tau = Math.abs(target) > Math.abs(bend) ? 0.07 : 0.09; // ≈ 270 ms to settle
    bend = damp(bend, target, tau, dt);
    if (Math.abs(bend) < 0.0004 && target === 0) bend = 0;
    planes.forEach((pl) => {
      const el = pl.entry.poster;
      const b = el.getBoundingClientRect();
      const vis = b.width > 0 && b.bottom > -40 && b.top < H + 40;
      pl.mesh.visible = vis;
      if (!vis) return;
      if (pl.version !== pl.entry.version) {
        pl.tex.needsUpdate = true;
        pl.version = pl.entry.version;
      }
      pl.mesh.position.set(b.left + b.width / 2, -(b.top + b.height / 2), 0);
      pl.mesh.scale.set(b.width, b.height, 1);
      const un = pl.mesh.material.uniforms;
      un.uBend.value = bend;
      un.uSize.value.set(b.width, b.height);
      un.uRadius.value = pl.radius;
    });

    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(overlay, ortho);
    if (!firstFrame) {
      firstFrame = true;
      opts.onStep?.("first-frame");
    }
  }, 10);

  (window as unknown as { __abScene?: () => unknown }).__abScene = () => ({
    bend,
    planes: Array.from(planes.values()).map((p) => {
      const b = p.entry.poster.getBoundingClientRect();
      return {
        slug: p.entry.slug,
        visible: p.mesh.visible,
        dx: +(p.mesh.position.x - (b.left + b.width / 2)).toFixed(2),
        dy: +(-p.mesh.position.y - (b.top + b.height / 2)).toFixed(2),
        dw: +(p.mesh.scale.x - b.width).toFixed(2),
        dh: +(p.mesh.scale.y - b.height).toFixed(2),
      };
    }),
    time,
  });

  return {
    dispose() {
      off();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      planes.forEach((p) => {
        p.tex.dispose();
        p.mesh.material.dispose();
      });
      planes.clear();
      planeGeo.dispose();
      geo.dispose();
      terrainMat.dispose();
      sky.geometry.dispose();
      skyMat.dispose();
      mg.dispose();
      moteMat.dispose();
      markTex.dispose();
      markMat.dispose();
      markMesh.geometry.dispose();
      renderer.dispose();
      delete (window as unknown as { __abScene?: unknown }).__abScene;
    },
  };
}
