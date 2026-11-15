/**
 * Globo lunar 3D (three.js), estética de la maqueta "Selene" (mockup/) con datos propios.
 * La ficha del punto (`card`) flota junto al marcador con una línea guía; los sitios verificados
 * aparecen como balizas con etiqueta (clic para seleccionarlos).
 *
 * Datos (de nuestra efeméride y métricas):
 * - Iluminación desde la dirección del Sol en el instante mostrado → terminador día/noche.
 * - Sol (esfera ámbar) y Tierra (esfera azul) en su dirección real. NO a escala.
 * - Línea solar discontinua desde el sitio (solo si el Sol es visible allí).
 * - Enlace DTE discontinuo sitio → Tierra: azul si la Tierra es visible desde el sitio, rojo si no.
 * - Marcador esmeralda en el sitio.
 * Referencia: retícula selenográfica cada 30° (ecuador y meridiano 0 resaltados), conmutable.
 * Decoración: estrellas aleatorias y un anillo de referencia fijo (no son datos).
 *
 * Arrastrar para girar, rueda para acercar, clic para elegir un punto, flechas con el foco.
 * Textura: CGI Moon Kit (NASA SVS, mosaico LROC WAC). Solo visual. Carga diferida (React.lazy).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { Vector3 } from "../../types";
import { useT } from "../../i18n";
import { QUAT_NEARSIDE, QUAT_SOUTH_POLE, bodyToThree, latLonToThree, quatFacing, threeToLatLon } from "./globeMath";

export interface LunarGlobeProps {
  /** Vector centro Luna → Sol en el marco lunar fijo (cualquier longitud). */
  sunDir: Vector3 | null;
  /** Vector centro Luna → Tierra en el marco lunar fijo. */
  earthDir: Vector3 | null;
  site: { lat: number; lon: number } | null;
  /** ¿El Sol es visible desde el sitio? (métricas) */
  sunVisible?: boolean | null;
  /** ¿La Tierra es visible desde el sitio? (métricas) */
  earthVisible?: boolean | null;
  /** Mostrar la retícula selenográfica. */
  showGrid?: boolean;
  onPick?: (c: { lat: number; lon: number }) => void;
  /** Petición de vista; `n` cambia en cada petición para poder repetir la misma vista. */
  viewRequest?: { view: GlobeView; n: number };
  /** Ficha flotante del punto (se coloca junto al marcador). */
  card?: ReactNode;
  /** Sitios con coordenadas verificadas. */
  beacons?: Beacon[];
  onBeacon?: (id: string) => void;
  /** Oculta la ficha (p. ej. con una hoja inferior abierta en móvil). */
  cardHidden?: boolean;
  /** Se llama al tocar el globo (móvil: cierra las hojas inferiores). */
  onInteract?: () => void;
}

export interface Beacon {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export type GlobeView = "site" | "southPole" | "nearside";

const BG = 0x0a0d12;
const SOLAR = 0xf59e0b;
const EARTH = 0x38bdf8;
const CRITICAL = 0xef4444;
const NOMINAL = 0x10b981;

const TEXTURE_URL = `${import.meta.env.BASE_URL}textures/moon/lroc_color_2k.jpg`;
/** Cámara (radios lunares) y distancia a la que se dibujan el Sol y la Tierra (no a escala). */
const CAMERA_Z = 7;
/** Ancho (px) por debajo del cual se usa la disposición móvil (= breakpoint lg). */
const MOBILE_MAX = 1024;
const SUN_DIST = 2.3;
const EARTH_DIST = 2.15;

const toQuat = (q: number[]) => new THREE.Quaternion(q[0], q[1], q[2], q[3]);

/**
 * Vista del sitio ligeramente oblicua: el sitio queda a un lado del centro y el Sol y la Tierra no
 * se superponen con él cuando apuntan hacia la cámara.
 */
const OBLIQUE = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(12))
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-28)));
const siteQuat = (lat: number, lon: number) => OBLIQUE.clone().multiply(toQuat(quatFacing(lat, lon)));

interface Scene {
  globe: THREE.Group;
  grid: THREE.Group;
  sunLight: THREE.DirectionalLight;
  sun: THREE.Mesh;
  earth: THREE.Mesh;
  sunRay: THREE.Line;
  dteLine: THREE.Line;
  pin: THREE.Group;
  /** Punta del marcador en coordenadas locales del globo (null si no hay sitio). */
  pinTip: THREE.Vector3 | null;
  beacons: THREE.Group;
  beaconList: { id: string; tip: THREE.Vector3; label: HTMLElement }[];
  target: THREE.Quaternion | null;
  dirty: boolean;
}

/** Baliza de un sitio verificado (mástil y punta, sobre +Y). */
function beaconMesh(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: EARTH });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.06, 6), mat);
  stem.position.y = 1.03;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 10), mat);
  head.position.y = 1.062;
  g.add(stem, head);
  return g;
}

/** Retícula selenográfica cada 30°, con ecuador y meridiano 0 resaltados. */
function selenographicGrid(r: number): THREE.Group {
  const g = new THREE.Group();
  const regular = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.22 });
  const prime = new THREE.LineBasicMaterial({ color: EARTH, transparent: true, opacity: 0.45 });
  const line = (pts: number[][], mat: THREE.Material) =>
    new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), mat);
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: number[][] = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push(latLonToThree(lat, lon, r));
    g.add(line(pts, lat === 0 ? prime : regular));
  }
  for (let lon = -150; lon <= 180; lon += 30) {
    const pts: number[][] = [];
    for (let lat = -90; lat <= 90; lat += 3) pts.push(latLonToThree(lat, lon, r));
    g.add(line(pts, lon === 0 ? prime : regular));
  }
  return g;
}

/** Campo de estrellas decorativo (posiciones aleatorias, no es un catálogo). */
function starfield(): THREE.Points {
  const n = 1200;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i += 3) {
    const r = 32 + Math.random() * 36;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i] = r * Math.sin(ph) * Math.cos(th);
    pos[i + 1] = r * Math.cos(ph);
    pos[i + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.1, transparent: true, opacity: 0.65 }));
}

function dashedLine(color: number, dash: number, gap: number, opacity: number): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const l = new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap, transparent: true, opacity }));
  l.visible = false;
  return l;
}

/** Marcador del sitio: anillo, mástil y punta (construido sobre +Y). */
function sitePin(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: NOMINAL, side: THREE.DoubleSide });
  const ringGeo = new THREE.RingGeometry(0.022, 0.036, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.position.y = 1.005;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.144, 8), mat);
  stem.position.y = 1.0 + 0.072;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 12), mat);
  tip.position.y = 1.144;
  g.add(ring, stem, tip);
  g.visible = false;
  return g;
}

export default function LunarGlobe(props: LunarGlobeProps) {
  const { sunDir, earthDir, site, sunVisible, earthVisible, showGrid = true, onPick, viewRequest, card, beacons, onBeacon, cardHidden = false, onInteract } = props;
  const cardHiddenRef = useRef(cardHidden);
  cardHiddenRef.current = cardHidden;
  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;
  const t = useT();
  const webglMsg = useRef(t.globe.webgl);
  webglMsg.current = t.globe.webgl;
  const mountRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<SVGPolylineElement>(null);
  const anchorRef = useRef<SVGCircleElement>(null);
  const beaconLayerRef = useRef<HTMLDivElement>(null);
  const onBeaconRef = useRef(onBeacon);
  onBeaconRef.current = onBeacon;
  const sceneRef = useRef<Scene | null>(null);
  const labelsRef = useRef<{ sun: HTMLSpanElement | null; earth: HTMLSpanElement | null }>({ sun: null, earth: null });
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const siteRef = useRef(site);
  siteRef.current = site;
  const [webglError, setWebglError] = useState<string | null>(null);

  // ---- Crear la escena una vez ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglError(webglMsg.current);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(BG);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    camera.position.set(0, 0, CAMERA_Z);
    scene.add(starfield());

    const globe = new THREE.Group();
    scene.add(globe);
    globe.add(new THREE.AmbientLight(0x1b2432, 0.35)); // luz cenicienta tenue: la cara nocturna se intuye

    const material = new THREE.MeshStandardMaterial({ color: 0x8b929e, roughness: 0.92, metalness: 0.04 });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), material);
    globe.add(moon);
    new THREE.TextureLoader().load(TEXTURE_URL, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      material.map = tex;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      s.dirty = true;
    });

    const grid = selenographicGrid(1.003);
    globe.add(grid);

    // Anillo de referencia fijo (decorativo; no es una órbita real)
    const refGeo = new THREE.RingGeometry(1.38, 1.388, 128);
    refGeo.rotateX(Math.PI / 2);
    globe.add(new THREE.Mesh(refGeo, new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.55, side: THREE.DoubleSide })));

    // Luz solar (cuelga del globo: su dirección está fija en el marco lunar)
    const sunLight = new THREE.DirectionalLight(0xfffdf5, 2.35);
    sunLight.target = moon;
    globe.add(sunLight);

    // Sol y Tierra (no a escala) y sus líneas
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 20), new THREE.MeshBasicMaterial({ color: SOLAR }));
    sun.visible = false;
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(0.084, 24, 24),
      new THREE.MeshStandardMaterial({ color: EARTH, roughness: 0.5, emissive: 0x0369a1, emissiveIntensity: 0.45 }),
    );
    earth.visible = false;
    const sunRay = dashedLine(SOLAR, 0.06, 0.04, 0.7);
    const dteLine = dashedLine(EARTH, 0.05, 0.03, 0.85);
    const pin = sitePin();
    const beaconGroup = new THREE.Group();
    globe.add(sun, earth, sunRay, dteLine, pin, beaconGroup);

    const s: Scene = {
      globe, grid, sunLight, sun, earth, sunRay, dteLine, pin,
      pinTip: null, beacons: beaconGroup, beaconList: [], target: null, dirty: true,
    };
    sceneRef.current = s;
    const initial = siteRef.current;
    globe.quaternion.copy(initial ? siteQuat(initial.lat, initial.lon) : toQuat(QUAT_NEARSIDE));

    // Tamaño (zoom = factor del usuario sobre la distancia base)
    let baseZ = CAMERA_Z;
    let zoom = 1;
    const zoomBy = (f: number) => {
      zoom = Math.min(2, Math.max(2.4 / baseZ, zoom * f));
      camera.position.z = baseZ * zoom;
      s.dirty = true;
    };
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(h, 1);
      // En vertical se aleja la cámara para que quepan el globo, el Sol y la Tierra (maqueta móvil)
      baseZ = Math.min(18, CAMERA_Z / Math.min(1, camera.aspect));
      camera.position.z = baseZ * zoom;
      // Móvil: el globo sube un poco para dejar sitio a la ficha sobre el pie
      if (w < MOBILE_MAX) camera.setViewOffset(w, h, 0, Math.round(h * 0.07), w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Interacción: arrastrar = girar; clic sin arrastre = elegir punto; rueda = zoom; flechas = girar.
    const el = renderer.domElement;
    // Punteros activos: uno = girar / tocar; dos = pellizcar para zoom
    const ptrs = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinch = 0;
    let multi = false;
    const pinchDist = () => {
      const [a, b] = [...ptrs.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const spin = (dx: number, dy: number) => {
      const k = 0.005 * (camera.position.z / CAMERA_Z);
      globe.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * k));
      globe.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * k));
      s.target = null;
      s.dirty = true;
    };
    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        moved = 0;
        multi = false;
      } else {
        multi = true;
        pinch = pinchDist();
      }
      onInteractRef.current?.();
    };
    const onMove = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (ptrs.size === 2) {
        const d = pinchDist();
        if (pinch > 0 && d > 0) zoomBy(pinch / d);
        pinch = d;
        return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      spin(dx, dy);
    };
    const onCancel = (e: PointerEvent) => {
      ptrs.delete(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      const wasClick = ptrs.size === 1 && moved < 8 && !multi;
      ptrs.delete(e.pointerId);
      if (!wasClick || !onPickRef.current) return;
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(moon, false)[0];
      if (!hit) return;
      const local = globe.worldToLocal(hit.point.clone());
      const { lat, lon } = threeToLatLon([local.x, local.y, local.z]);
      onPickRef.current({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1);
    };
    const onKey = (e: KeyboardEvent) => {
      const step = 12;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        spin(...moves[e.key]);
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);

    // Etiquetas HTML proyectadas sobre el Sol y la Tierra
    const tmp = new THREE.Vector3();
    const placeLabel = (label: HTMLSpanElement | null, obj: THREE.Object3D) => {
      if (!label) return;
      if (!obj.visible) {
        label.hidden = true;
        return;
      }
      obj.getWorldPosition(tmp);
      const behind = tmp.z < 0 && Math.hypot(tmp.x, tmp.y) < 1;
      tmp.project(camera);
      label.hidden = false;
      label.style.opacity = behind ? "0.35" : "1";
      label.style.transform = `translate(${((tmp.x + 1) / 2) * mount.clientWidth}px, ${((1 - tmp.y) / 2) * mount.clientHeight}px) translate(-50%, calc(-100% - 10px))`;
    };

    // Ficha del punto: junto a la punta del marcador, con línea guía en codo (como la maqueta)
    const camDir = new THREE.Vector3();
    const placeCard = () => {
      const box = cardRef.current;
      const line = leaderRef.current;
      const dot = anchorRef.current;
      if (!box || !line || !dot) return;
      const hide = () => {
        box.style.opacity = "0";
        box.style.pointerEvents = "none";
        line.style.opacity = "0";
        dot.style.opacity = "0";
      };
      if (!s.pinTip || !s.pin.visible || box.childElementCount === 0 || cardHiddenRef.current) return hide();
      const tip = globe.localToWorld(s.pinTip.clone());
      const facing = tip.clone().normalize().dot(camDir.copy(camera.position).normalize());
      if (facing < 0.05) return hide();
      const alpha = Math.min(1, (facing - 0.05) * 4.5);
      tip.project(camera);
      const vw = mount.clientWidth;
      const vh = mount.clientHeight;
      const px = ((tip.x + 1) / 2) * vw;
      const py = ((1 - tip.y) / 2) * vh;
      const mobile = vw < MOBILE_MAX;
      box.style.width = mobile ? `${Math.min(vw - 16, 420)}px` : "";
      const popW = box.offsetWidth || 300;
      const popH = box.offsetHeight || 160;
      let bx: number;
      let by: number;
      let pts: string;
      if (mobile) {
        // Móvil: centrada justo encima del pie, con línea guía recta hasta su borde superior
        const footH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--foot-h")) || 110;
        bx = (vw - popW) / 2;
        by = vh - footH - 16 - popH;
        const cx = Math.min(Math.max(px, bx + 16), bx + popW - 16);
        pts = `${px.toFixed(1)},${py.toFixed(1)} ${cx.toFixed(1)},${by.toFixed(1)}`;
      } else {
        const right = px < vw * 0.5;
        const elbowX = right ? px + 26 : px - 26;
        const elbowY = py - 24;
        bx = right ? elbowX + 12 : elbowX - popW - 12;
        by = elbowY - 18;
        bx = Math.max(12, Math.min(vw - popW - 12, bx));
        by = Math.max(70, Math.min(vh - popH - 110, by));
        const cx = right ? bx : bx + popW;
        const cy = by + 16;
        pts = `${px.toFixed(1)},${py.toFixed(1)} ${elbowX.toFixed(1)},${elbowY.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)}`;
      }
      box.style.transform = `translate(${bx}px, ${by}px)`;
      box.style.opacity = alpha.toFixed(2);
      box.style.pointerEvents = alpha > 0.25 ? "auto" : "none";
      dot.setAttribute("cx", px.toFixed(1));
      dot.setAttribute("cy", py.toFixed(1));
      dot.style.opacity = alpha.toFixed(2);
      line.setAttribute("points", pts);
      line.style.opacity = (alpha * 0.85).toFixed(2);
    };
    // Balizas: se etiquetan primero las más centradas; se omite la etiqueta que chocaría con otra
    const placeBeacons = () => {
      camDir.copy(camera.position).normalize();
      const items: { label: HTMLElement; x: number; y: number; facing: number }[] = [];
      for (const b of s.beaconList) {
        const w = globe.localToWorld(b.tip.clone());
        const facing = w.clone().normalize().dot(camDir);
        if (facing < 0.14) {
          b.label.style.opacity = "0";
          b.label.style.pointerEvents = "none";
          continue;
        }
        w.project(camera);
        items.push({ label: b.label, x: ((w.x + 1) / 2) * mount.clientWidth, y: ((1 - w.y) / 2) * mount.clientHeight, facing });
      }
      items.sort((p, q) => q.facing - p.facing);
      const placed: { l: number; r: number; t: number; b: number }[] = [];
      for (const it of items) {
        const lw = it.label.offsetWidth || 60;
        const lh = it.label.offsetHeight || 16;
        const box = { l: it.x - lw / 2 - 2, r: it.x + lw / 2 + 2, t: it.y - lh - 2, b: it.y + 2 };
        const clash = placed.some((p) => box.l < p.r && box.r > p.l && box.t < p.b && box.b > p.t);
        it.label.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -100%)`;
        if (clash) {
          it.label.style.opacity = "0";
          it.label.style.pointerEvents = "none";
          continue;
        }
        placed.push(box);
        it.label.style.opacity = Math.min(1, (it.facing - 0.14) * 3.2).toFixed(2);
        it.label.style.pointerEvents = "auto";
      }
    };
    const cardObserver = new ResizeObserver(() => {
      s.dirty = true;
    });
    if (cardRef.current) cardObserver.observe(cardRef.current);

    // Bucle: solo dibuja si algo ha cambiado o hay una transición de vista en curso.
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (s.target) {
        globe.quaternion.slerp(s.target, 0.15);
        if (globe.quaternion.angleTo(s.target) < 1e-3) {
          globe.quaternion.copy(s.target);
          s.target = null;
        }
        s.dirty = true;
      }
      if (!s.dirty) return;
      s.dirty = false;
      renderer.render(scene, camera);
      placeLabel(labelsRef.current.sun, sun);
      placeLabel(labelsRef.current.earth, earth);
      placeCard();
      placeBeacons();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cardObserver.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Points) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: THREE.Material & { map?: THREE.Texture | null }) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      el.remove();
      sceneRef.current = null;
    };
  }, []);

  // ---- Balizas de sitios verificados ----
  useEffect(() => {
    const s = sceneRef.current;
    const layer = beaconLayerRef.current;
    if (!s || !layer) return;
    s.beacons.clear();
    layer.replaceChildren();
    s.beaconList = (beacons ?? []).map((b) => {
      const pos = new THREE.Vector3(...latLonToThree(b.lat, b.lon));
      const m = beaconMesh();
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos);
      s.beacons.add(m);
      const label = document.createElement("button");
      label.type = "button";
      label.className = "beacon-label";
      label.textContent = b.name;
      label.style.opacity = "0";
      label.addEventListener("click", () => onBeaconRef.current?.(b.id));
      layer.appendChild(label);
      return { id: b.id, tip: pos.clone().multiplyScalar(1.07), label };
    });
    s.dirty = true;
  }, [beacons]);

  // ---- Ficha oculta / visible ----
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.dirty = true;
  }, [cardHidden]);

  // ---- Retícula ----
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.grid.visible = showGrid;
    s.dirty = true;
  }, [showGrid]);

  // ---- Sol, Tierra, sitio y enlaces ----
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const sitePos = site ? new THREE.Vector3(...latLonToThree(site.lat, site.lon)) : null;
    if (sitePos) {
      s.pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sitePos);
      s.pin.visible = true;
      s.pinTip = sitePos.clone().multiplyScalar(1.144);
    } else {
      s.pin.visible = false;
      s.pinTip = null;
    }

    if (sunDir) {
      const d = new THREE.Vector3(...bodyToThree(sunDir)).normalize();
      s.sunLight.position.copy(d.clone().multiplyScalar(10));
      s.sunLight.visible = true;
      s.sun.position.copy(d.clone().multiplyScalar(SUN_DIST));
      s.sun.visible = true;
      if (sitePos && sunVisible) {
        s.sunRay.geometry.setFromPoints([sitePos.clone().multiplyScalar(1.02), s.sun.position.clone()]);
        s.sunRay.computeLineDistances();
        s.sunRay.visible = true;
      } else s.sunRay.visible = false;
    } else {
      s.sunLight.visible = false;
      s.sun.visible = false;
      s.sunRay.visible = false;
    }

    if (earthDir) {
      const d = new THREE.Vector3(...bodyToThree(earthDir)).normalize();
      s.earth.position.copy(d.multiplyScalar(EARTH_DIST));
      s.earth.visible = true;
      if (sitePos && earthVisible !== null && earthVisible !== undefined) {
        s.dteLine.geometry.setFromPoints([sitePos.clone().multiplyScalar(1.03), s.earth.position.clone()]);
        s.dteLine.computeLineDistances();
        (s.dteLine.material as THREE.LineDashedMaterial).color.setHex(earthVisible ? EARTH : CRITICAL);
        s.dteLine.visible = true;
      } else s.dteLine.visible = false;
    } else {
      s.earth.visible = false;
      s.dteLine.visible = false;
    }
    s.dirty = true;
  }, [sunDir, earthDir, site, sunVisible, earthVisible]);

  // ---- Vistas (las pide la interfaz con un contador para poder repetir la misma vista) ----
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !viewRequest) return;
    const v = viewRequest.view;
    s.target =
      v === "southPole" ? toQuat(QUAT_SOUTH_POLE) : v === "nearside" ? toQuat(QUAT_NEARSIDE) : site ? siteQuat(site.lat, site.lon) : toQuat(QUAT_NEARSIDE);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona a nuevas peticiones
  }, [viewRequest?.n]);

  const label = site ? `lat ${site.lat.toFixed(2)}°, lon ${site.lon.toFixed(2)}°` : t.globe.none;
  const labelClass = "globe-label px-1.5 py-0.5 rounded bg-surface/90 border border-borderline text-[10px] font-mono text-slate-200 shadow flex items-center gap-1";

  if (webglError) {
    return <p className="p-6 font-mono text-sm text-red-300">{webglError}</p>;
  }
  return (
    <div
      className="relative w-full h-full cursor-grab active:cursor-grabbing touch-none"
      ref={mountRef}
      role="group"
      aria-label={t.globe.aria(label, !!earthVisible)}
    >
      <span className={labelClass} ref={(n) => { labelsRef.current.sun = n; }} hidden>
        <i className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" aria-hidden="true" /> {t.globe.sun}
      </span>
      <span className={labelClass} ref={(n) => { labelsRef.current.earth = n; }} hidden>
        <i className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" aria-hidden="true" /> {t.globe.earth}
      </span>
      <div ref={beaconLayerRef} className="absolute inset-0 pointer-events-none overflow-hidden" />
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <polyline ref={leaderRef} fill="none" stroke="#38bdf8" strokeWidth={1.25} strokeDasharray="3 2" opacity={0} />
        <circle ref={anchorRef} r={3.5} fill="#10b981" stroke="#0a0d12" strokeWidth={1.5} opacity={0} />
      </svg>
      <div ref={cardRef} className="absolute top-0 left-0 transition-opacity duration-150 cursor-auto" style={{ opacity: 0 }}>
        {card}
      </div>
    </div>
  );
}
