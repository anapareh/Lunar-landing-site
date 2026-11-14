/**
 * Globo lunar 3D (three.js).
 * - Iluminado desde la dirección del Sol en la fecha elegida: se ve el terminador día/noche.
 * - Marcadores de dirección del Sol y de la Tierra (no a escala) y del punto seleccionado.
 * - Arrastrar para girar, rueda para acercar, clic para elegir un punto. Vistas predefinidas.
 * Textura: CGI Moon Kit (NASA SVS, mosaico LROC WAC). Solo visual: "optimizada para la estética,
 * no para ciencia"; los cálculos no la usan.
 * Se carga de forma diferida (React.lazy) porque three.js es pesado.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Vector3 } from "../../types";
import { QUAT_NEARSIDE, QUAT_SOUTH_POLE, bodyToThree, latLonToThree, quatFacing, threeToLatLon } from "./globeMath";

export interface LunarGlobeProps {
  /** Vector centro Luna → Sol en el marco lunar fijo (cualquier longitud). */
  sunDir: Vector3 | null;
  /** Vector centro Luna → Tierra en el marco lunar fijo. */
  earthDir: Vector3 | null;
  site: { lat: number; lon: number } | null;
  onPick?: (c: { lat: number; lon: number }) => void;
}

type View = "site" | "southPole" | "nearside";

// Colores pensados para el fondo oscuro del espacio (pasos "dark" de la paleta validada).
const COLOR_SUN = 0xd95926;
const COLOR_EARTH = 0x3987e5;
const COLOR_SITE = 0xf0efec;
const SPACE = 0x0d0d0d;

const TEXTURE_URL = `${import.meta.env.BASE_URL}textures/moon/lroc_color_2k.jpg`;
/** Distancia de la cámara (radios lunares) y altura de la punta de los marcadores. */
const CAMERA_Z = 4.8;
const MARKER_TIP = 1.26;

interface Scene {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  globe: THREE.Group;
  moon: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
  sunMarker: THREE.Group;
  earthMarker: THREE.Group;
  siteMarker: THREE.Group;
  target: THREE.Quaternion | null;
  dirty: boolean;
}

/** Flecha radial desde la superficie con una esfera en la punta. */
function directionMarker(color: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8), mat);
  shaft.position.y = 1.02 + 0.11;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 16), mat);
  tip.position.y = MARKER_TIP;
  g.add(shaft, tip);
  g.visible = false;
  return g;
}

/** Orienta un marcador radial (construido sobre +Y) hacia una dirección local del globo. */
function pointMarker(marker: THREE.Object3D, dir: THREE.Vector3) {
  marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  marker.visible = true;
}

function graticule(): THREE.LineSegments {
  const pts: number[] = [];
  const r = 1.002;
  const push = (a: number[], b: number[]) => pts.push(...a, ...b);
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 3) push(latLonToThree(lat, lon, r), latLonToThree(lat, lon + 3, r));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -90; lat < 90; lat += 3) push(latLonToThree(lat, lon, r), latLonToThree(lat + 3, lon, r));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 }));
}

function siteMarkerObject(): THREE.Group {
  const g = new THREE.Group();
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), new THREE.MeshBasicMaterial({ color: COLOR_SITE }));
  dot.position.y = 1.0;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.04, 40),
    new THREE.MeshBasicMaterial({ color: COLOR_SITE, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.004;
  g.add(dot, ring);
  g.visible = false;
  return g;
}

const toQuat = (q: number[]) => new THREE.Quaternion(q[0], q[1], q[2], q[3]);

export default function LunarGlobe({ sunDir, earthDir, site, onPick }: LunarGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const labelsRef = useRef<{ sun: HTMLSpanElement | null; earth: HTMLSpanElement | null }>({ sun: null, earth: null });
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const siteRef = useRef(site);
  siteRef.current = site;
  const [webglError, setWebglError] = useState<string | null>(null);
  const [view, setView] = useState<View>("site");

  // ---- Crear la escena una vez ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setWebglError("Este navegador no permite WebGL: no se puede mostrar el globo 3D.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(SPACE);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, CAMERA_Z);

    const globe = new THREE.Group();
    scene.add(globe);
    scene.add(new THREE.AmbientLight(0xffffff, 0.07)); // la cara nocturna se intuye

    const material = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 1, metalness: 0 });
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

    // La luz cuelga del globo: su dirección está fija en el marco lunar.
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
    sunLight.target = moon;
    globe.add(sunLight);

    globe.add(graticule());
    const sunMarker = directionMarker(COLOR_SUN);
    const earthMarker = directionMarker(COLOR_EARTH);
    const siteMarker = siteMarkerObject();
    globe.add(sunMarker, earthMarker, siteMarker);

    const s: Scene = { renderer, camera, globe, moon, sunLight, sunMarker, earthMarker, siteMarker, target: null, dirty: true };
    sceneRef.current = s;
    const initial = siteRef.current;
    globe.quaternion.copy(toQuat(initial ? quatFacing(initial.lat, initial.lon) : QUAT_NEARSIDE));

    // Tamaño
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Interacción: arrastrar = girar; clic sin arrastre = elegir punto; rueda = zoom; flechas = girar.
    const el = renderer.domElement;
    let drag: { x: number; y: number; moved: number } | null = null;
    const spin = (dx: number, dy: number) => {
      const k = 0.005 * (camera.position.z / CAMERA_Z);
      globe.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * k));
      globe.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * k));
      s.target = null;
      s.dirty = true;
    };
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY, moved: drag.moved + Math.abs(dx) + Math.abs(dy) };
      spin(dx, dy);
    };
    const onUp = (e: PointerEvent) => {
      const wasClick = drag !== null && drag.moved < 5;
      drag = null;
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
      camera.position.z = Math.min(9, Math.max(2.2, camera.position.z * (e.deltaY > 0 ? 1.1 : 1 / 1.1)));
      s.dirty = true;
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
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);

    // Bucle: solo renderiza si algo ha cambiado o hay una transición en curso.
    let raf = 0;
    const tmp = new THREE.Vector3();
    const placeLabel = (label: HTMLSpanElement | null, marker: THREE.Group, dyPx: number) => {
      if (!label) return;
      if (!marker.visible) {
        label.hidden = true;
        return;
      }
      tmp.set(0, MARKER_TIP, 0).applyQuaternion(marker.quaternion).applyQuaternion(globe.quaternion);
      const behind = tmp.z < 0 && Math.hypot(tmp.x, tmp.y) < 1;
      tmp.project(camera);
      label.hidden = false;
      label.style.opacity = behind ? "0.35" : "1";
      label.style.transform = `translate(${((tmp.x + 1) / 2) * mount.clientWidth}px, ${((1 - tmp.y) / 2) * mount.clientHeight}px) translate(-50%, calc(-50% + ${dyPx}px))`;
    };
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
      placeLabel(labelsRef.current.sun, sunMarker, -16);
      placeLabel(labelsRef.current.earth, earthMarker, 16);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
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

  // ---- Sol, Tierra y punto ----
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    if (sunDir) {
      const d = new THREE.Vector3(...bodyToThree(sunDir)).normalize();
      s.sunLight.position.copy(d.clone().multiplyScalar(10));
      s.sunLight.visible = true;
      pointMarker(s.sunMarker, d);
    } else {
      s.sunLight.visible = false;
      s.sunMarker.visible = false;
    }
    if (earthDir) pointMarker(s.earthMarker, new THREE.Vector3(...bodyToThree(earthDir)));
    else s.earthMarker.visible = false;
    if (site) pointMarker(s.siteMarker, new THREE.Vector3(...latLonToThree(site.lat, site.lon)));
    else s.siteMarker.visible = false;
    s.dirty = true;
  }, [sunDir, earthDir, site]);

  // ---- Vistas ----
  function goTo(v: View) {
    setView(v);
    const s = sceneRef.current;
    if (!s) return;
    const q = v === "southPole" ? QUAT_SOUTH_POLE : v === "nearside" ? QUAT_NEARSIDE : site ? quatFacing(site.lat, site.lon) : QUAT_NEARSIDE;
    s.target = toQuat(q);
  }

  const label = site ? `lat ${site.lat.toFixed(2)}°, lon ${site.lon.toFixed(2)}°` : "ninguno";

  return (
    <figure className="card globe-card">
      <figcaption className="card-head">
        <h2 className="card-title">Globo lunar</h2>
        <div className="shortcuts" role="group" aria-label="Vista del globo">
          {(
            [
              ["site", "Centrar en el punto"],
              ["southPole", "Polo sur"],
              ["nearside", "Cara visible"],
            ] as [View, string][]
          ).map(([v, text]) => (
            <button key={v} type="button" className="ghost" aria-pressed={view === v} onClick={() => goTo(v)}>
              {text}
            </button>
          ))}
        </div>
      </figcaption>

      {webglError ? (
        <p className="note">{webglError}</p>
      ) : (
        <div
          className="globe-box"
          ref={mountRef}
          role="img"
          aria-label={`Globo lunar iluminado desde la dirección del Sol. Punto seleccionado: ${label}. Arrastra para girar, rueda para acercar, clic para elegir un punto; con el foco en el globo, las flechas también lo giran.`}
        >
          <span className="globe-label" ref={(n) => { labelsRef.current.sun = n; }} hidden>Sol</span>
          <span className="globe-label" ref={(n) => { labelsRef.current.earth = n; }} hidden>Tierra</span>
        </div>
      )}

      <ul className="legend globe-legend" aria-label="Leyenda del globo">
        <li><span className="key key-sun" aria-hidden="true" /> Dirección del Sol</li>
        <li><span className="key key-earth" aria-hidden="true" /> Dirección de la Tierra</li>
        <li><span className="dot-site" aria-hidden="true" /> Punto seleccionado (clic para cambiarlo)</li>
      </ul>
      <p className="note">
        Marcadores no a escala. Textura: NASA's Scientific Visualization Studio (mosaico LROC WAC de ASU),
        solo como referencia visual.
      </p>
    </figure>
  );
}
