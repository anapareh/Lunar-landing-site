/**
 * Globo lunar holográfico (three.js), estética de web/estetica.html con datos propios.
 *
 * Datos (de nuestra efeméride y métricas):
 * - Iluminación desde la dirección del Sol en el instante mostrado → terminador día/noche.
 * - Sol (esfera amarilla) y Tierra (esfera cian con jaula) en su dirección real. NO a escala.
 * - Rayo solar discontinuo desde el punto (solo si el Sol es visible allí).
 * - Enlace DTE punto → Tierra: cian si la Tierra es visible desde el punto, rojo si no.
 * - Pin esmeralda en el punto seleccionado.
 * Decoración (no representa datos): retícula, borde Fresnel, estrellas aleatorias, anillos y barrido.
 *
 * Arrastrar para girar, rueda para acercar, clic para elegir un punto, flechas con el foco.
 * Textura: CGI Moon Kit (NASA SVS, mosaico LROC WAC). Solo visual.
 * Con prefers-reduced-motion la decoración queda quieta. Se carga de forma diferida (React.lazy).
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
  /** ¿El Sol es visible desde el punto? (métricas) */
  sunVisible?: boolean | null;
  /** ¿La Tierra es visible desde el punto? (métricas) */
  earthVisible?: boolean | null;
  onPick?: (c: { lat: number; lon: number }) => void;
  /** Petición de vista; `n` cambia en cada petición para poder repetir la misma vista. */
  viewRequest?: { view: GlobeView; n: number };
}

export type GlobeView = "site" | "southPole" | "nearside";

const SPACE = 0x03050a;
const CYAN = 0x00f0ff;
const AMBER = 0xffaa00;
const RED = 0xff3355;
const EMERALD = 0x00ff9d;
const SUN_COLOR = 0xffcc33;

const TEXTURE_URL = `${import.meta.env.BASE_URL}textures/moon/lroc_color_2k.jpg`;
/** Cámara (radios lunares) y distancia a la que se dibujan el Sol y la Tierra (no a escala). */
const CAMERA_Z = 7;
const SUN_DIST = 2.3;
const EARTH_DIST = 2.15;

const toQuat = (q: number[]) => new THREE.Quaternion(q[0], q[1], q[2], q[3]);

/**
 * Vista del punto ligeramente oblicua (como la cámara de la referencia): el punto queda a un lado
 * del centro y el Sol y la Tierra no se superponen con él cuando apuntan hacia la cámara.
 */
const OBLIQUE = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(12))
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-28)));
const siteQuat = (lat: number, lon: number) => OBLIQUE.clone().multiply(toQuat(quatFacing(lat, lon)));
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Scene {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  globe: THREE.Group;
  moon: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
  sun: THREE.Mesh;
  earth: THREE.Mesh;
  sunRay: THREE.Line;
  dteLine: THREE.Line;
  pin: THREE.Group;
  target: THREE.Quaternion | null;
  dirty: boolean;
}

function fresnelSphere(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(CYAN) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        // 0 en el centro del disco, 1 en el contorno: solo brilla el borde
        float facing = abs(dot(vNormal, -vPositionNormal));
        float intensity = pow(1.0 - facing, 3.0);
        gl_FragColor = vec4(glowColor, clamp(intensity * 0.9, 0.0, 0.75));
      }`,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1.035, 64, 64), mat);
}

/** Campo de estrellas decorativo (posiciones aleatorias, no es un catálogo). */
function starfield(): THREE.Points {
  const n = 1600;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i += 3) {
    const r = 28 + Math.random() * 36;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i] = r * Math.sin(ph) * Math.cos(th);
    pos[i + 1] = r * Math.cos(ph);
    pos[i + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.13, transparent: true, opacity: 0.85 }));
}

function lineBetween(color: number, dashed: boolean): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.07, gapSize: 0.04, transparent: true, opacity: 0.75 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const l = new THREE.Line(geo, mat);
  l.visible = false;
  return l;
}

function sitePin(): THREE.Group {
  const g = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(0.024, 0.048, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: EMERALD, side: THREE.DoubleSide }));
  ring.position.y = 1.006;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.012, 0.22, 12),
    new THREE.MeshBasicMaterial({ color: EMERALD, transparent: true, opacity: 0.85 }),
  );
  beam.position.y = 1.11;
  g.add(ring, beam);
  g.visible = false;
  return g;
}

export default function LunarGlobe({ sunDir, earthDir, site, sunVisible, earthVisible, onPick, viewRequest }: LunarGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
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
      setWebglError("Este navegador no permite WebGL: no se puede mostrar el globo 3D.");
      return;
    }
    const still = prefersReducedMotion();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(SPACE);
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
    globe.add(new THREE.AmbientLight(0x16243d, 0.6)); // la cara nocturna se intuye, en tono "holograma"

    const material = new THREE.MeshStandardMaterial({ color: 0x8a93a3, roughness: 0.9, metalness: 0.05 });
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

    // Retícula holográfica (decorativa)
    globe.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.006, 36, 18),
        new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.07 }),
      ),
    );
    globe.add(fresnelSphere());

    // Anillos y barrido (decorativos; no son órbitas reales)
    const ring1Geo = new THREE.RingGeometry(1.32, 1.335, 128);
    ring1Geo.rotateX(Math.PI / 2);
    const ring1 = new THREE.Mesh(ring1Geo, new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
    ring1.rotation.z = 0.12;
    const ring2Geo = new THREE.RingGeometry(1.46, 1.47, 128);
    ring2Geo.rotateX(Math.PI / 2.3);
    const ring2 = new THREE.Mesh(ring2Geo, new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
    const scanGeo = new THREE.TorusGeometry(1.015, 0.0035, 8, 128);
    scanGeo.rotateX(Math.PI / 2);
    const scan = new THREE.Mesh(scanGeo, new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5 }));
    scene.add(ring1, ring2);
    globe.add(scan);

    // Luz solar (cuelga del globo: su dirección está fija en el marco lunar)
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.6);
    sunLight.target = moon;
    globe.add(sunLight);

    // Sol y Tierra (no a escala)
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 24), new THREE.MeshBasicMaterial({ color: SUN_COLOR }));
    sun.visible = false;
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 24, 24),
      new THREE.MeshStandardMaterial({ color: CYAN, emissive: 0x0284c7, emissiveIntensity: 0.8 }),
    );
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(0.108, 16, 12), new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.35 })));
    earth.visible = false;
    const sunRay = lineBetween(AMBER, true);
    const dteLine = lineBetween(CYAN, false);
    const pin = sitePin();
    globe.add(sun, earth, sunRay, dteLine, pin);

    const s: Scene = { renderer, camera, globe, moon, sunLight, sun, earth, sunRay, dteLine, pin, target: null, dirty: true };
    sceneRef.current = s;
    const initial = siteRef.current;
    globe.quaternion.copy(initial ? siteQuat(initial.lat, initial.lon) : toQuat(QUAT_NEARSIDE));

    // Tamaño
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
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
      camera.position.z = Math.min(14, Math.max(2.4, camera.position.z * (e.deltaY > 0 ? 1.1 : 1 / 1.1)));
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

    // Bucle: animación decorativa continua salvo movimiento reducido.
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = now * 0.001;
      if (!still) {
        ring1.rotation.y = t * 0.14;
        ring2.rotation.y = -t * 0.22;
        const sweep = Math.sin(t * 0.9);
        scan.position.y = sweep * 0.92;
        const rs = Math.sqrt(Math.max(0.05, 1 - sweep * sweep * 0.85));
        scan.scale.set(rs, 1, rs);
        const pulse = 1 + 0.22 * Math.sin(t * 5);
        pin.children[0].scale.set(pulse, 1, pulse);
        s.dirty = true;
      }
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
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
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

  // ---- Sol, Tierra, punto y enlaces ----
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const sitePos = site ? new THREE.Vector3(...latLonToThree(site.lat, site.lon)) : null;
    if (sitePos) {
      s.pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sitePos);
      s.pin.visible = true;
    } else s.pin.visible = false;

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
        const m = s.dteLine.material as THREE.LineBasicMaterial;
        m.color.setHex(earthVisible ? CYAN : RED);
        m.opacity = earthVisible ? 0.9 : 0.45;
        s.dteLine.visible = true;
      } else s.dteLine.visible = false;
    } else {
      s.earth.visible = false;
      s.dteLine.visible = false;
    }
    s.dirty = true;
  }, [sunDir, earthDir, site, sunVisible, earthVisible]);

  // ---- Vistas (las pide el HUD con un contador para poder repetir la misma vista) ----
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !viewRequest) return;
    const v = viewRequest.view;
    const q = v === "southPole" ? toQuat(QUAT_SOUTH_POLE) : v === "nearside" ? toQuat(QUAT_NEARSIDE) : site ? siteQuat(site.lat, site.lon) : toQuat(QUAT_NEARSIDE);
    s.target = q;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona a nuevas peticiones
  }, [viewRequest?.n]);

  const label = site ? `lat ${site.lat.toFixed(2)}°, lon ${site.lon.toFixed(2)}°` : "ninguno";
  const labelClass = "globe-label px-1.5 py-0.5 rounded bg-void/85 border text-[10px] font-mono whitespace-nowrap";

  if (webglError) {
    return <p className="p-6 font-mono text-sm text-rose-300">{webglError}</p>;
  }
  return (
    <div
      className="relative w-full h-full cursor-grab active:cursor-grabbing touch-none"
      ref={mountRef}
      role="img"
      aria-label={`Globo lunar iluminado desde la dirección del Sol, con el Sol y la Tierra en su dirección (no a escala). Punto seleccionado: ${label}. Enlace con la Tierra: ${earthVisible ? "visible" : "sin línea de visión"}. Arrastra para girar, rueda para acercar, clic para elegir un punto; con el foco en el globo, las flechas también lo giran.`}
    >
      <span className={`${labelClass} border-amber-400/50 text-amber-200`} ref={(n) => { labelsRef.current.sun = n; }} hidden>
        ☀ SOL
      </span>
      <span className={`${labelClass} border-cyan-400/50 text-cyan-200`} ref={(n) => { labelsRef.current.earth = n; }} hidden>
        ◉ TIERRA
      </span>
    </div>
  );
}
