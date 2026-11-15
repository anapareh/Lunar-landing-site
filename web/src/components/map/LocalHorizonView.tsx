/**
 * Vista local: el cielo visto desde el punto, en primera persona (three.js, carga diferida).
 *
 * Datos reales:
 * - La línea del horizonte es el perfil del punto: relieve LOLA (polo sur) o 0° geométrico.
 * - Sol y Tierra en su acimut/elevación del instante mostrado y a su tamaño angular real
 *   (el relieve los tapa total o parcialmente igual que en las métricas).
 * - La Tierra se ilumina desde la dirección del Sol: su fase es la vista desde la Luna.
 * Esquemático: el terreno entre el observador y el horizonte es una superficie suave que solo sirve
 * para unir el suelo con la línea del horizonte (no es relieve medido). Estrellas decorativas.
 * Sin atmósfera: cielo negro y sin resplandor.
 *
 * Arrastrar = mirar alrededor; rueda = zoom (campo de visión).
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { HorizonProfile } from "../../types";
import { horizonElevationAt } from "../../lib/horizon";
import { useT } from "../../i18n";

export interface SkyBody {
  az: number;
  el: number;
  radiusDeg: number;
}

export interface LocalHorizonViewProps {
  profile: HorizonProfile | null;
  sun: SkyBody | null;
  earth: SkyBody | null;
  /** ¿El Sol está sobre el horizonte local? (ilumina el suelo) */
  sunVisible: boolean;
}

const DEG = Math.PI / 180;
const R = 1000; // radio del horizonte (unidades de escena)
const EYE = 3; // altura del ojo sobre el suelo cercano (esquemático)
const SKY_DIST = 50_000;

/** Dirección (x = este, y = arriba, z = −norte) de un acimut/elevación en grados. */
function dirOf(azDeg: number, elDeg: number): THREE.Vector3 {
  const a = azDeg * DEG;
  const e = elDeg * DEG;
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

function buildGround(profile: HorizonProfile | null): THREE.BufferGeometry {
  const nAz = 360;
  const nR = 40;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k <= nR; k++) {
    const f = Math.pow(k / nR, 1.6);
    const r = Math.max(1, R * f);
    for (let i = 0; i < nAz; i++) {
      const az = i;
      const h = horizonElevationAt(profile, az);
      const y = -EYE * (1 - f) + R * Math.tan(h * DEG) * f * f;
      pos.push(Math.sin(az * DEG) * r, y, -Math.cos(az * DEG) * r);
    }
  }
  for (let k = 0; k < nR; k++) {
    for (let i = 0; i < nAz; i++) {
      const a = k * nAz + i;
      const b = k * nAz + ((i + 1) % nAz);
      const c = (k + 1) * nAz + i;
      const d = (k + 1) * nAz + ((i + 1) % nAz);
      idx.push(a, b, c, b, d, c); // antihorario visto desde arriba: cara frontal y normales hacia arriba
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Línea de cresta (el horizonte exacto) para resaltarlo. */
function ridgeLine(profile: HorizonProfile | null): THREE.LineLoop {
  const pts: THREE.Vector3[] = [];
  for (let az = 0; az < 360; az++) pts.push(dirOf(az, horizonElevationAt(profile, az)).multiplyScalar(R / Math.cos(horizonElevationAt(profile, az) * DEG)));
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8b9bb4, transparent: true, opacity: 0.6 }));
}

const earthMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: "varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader:
      "uniform vec3 sunDir; varying vec3 vN; void main(){ float l = dot(normalize(vN), normalize(sunDir)); vec3 day = vec3(0.22,0.55,0.85); vec3 night = vec3(0.03,0.06,0.1); gl_FragColor = vec4(mix(night, day, smoothstep(-0.05, 0.12, l)), 1.0); }",
  });

export default function LocalHorizonView({ profile, sun, earth, sunVisible }: LocalHorizonViewProps) {
  const t = useT();
  const mountRef = useRef<HTMLDivElement>(null);
  const api = useRef<{
    setProfile: (p: HorizonProfile | null) => void;
    setBodies: (s: SkyBody | null, e: SkyBody | null, lit: boolean) => void;
    face: (az: number) => void;
  } | null>(null);
  const labels = useRef<Record<string, HTMLSpanElement | null>>({});
  const faced = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 200_000);
    const look = { yaw: 0, pitch: 4 * DEG, fov: 45 };

    // Estrellas decorativas (no son un catálogo)
    const n = 1500;
    const sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      sp.set([80_000 * s * Math.cos(a), 80_000 * u, 80_000 * s * Math.sin(a)], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcbd5e1, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.7 })));

    const groundMat = new THREE.MeshStandardMaterial({ color: 0x8c8c88, roughness: 1, metalness: 0 });
    let ground = new THREE.Mesh(buildGround(null), groundMat);
    let ridge = ridgeLine(null);
    scene.add(ground, ridge);

    const ambient = new THREE.AmbientLight(0x8899bb, 0.05);
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
    scene.add(ambient, sunLight, sunLight.target);

    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d5 }));
    const eMat = earthMaterial();
    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), eMat);
    scene.add(sunMesh, earthMesh);

    let dirty = true;
    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let prof: HorizonProfile | null = null;
    const bodies: { sun: SkyBody | null; earth: SkyBody | null } = { sun: null, earth: null };
    api.current = {
      setProfile: (p) => {
        prof = p;
        scene.remove(ground, ridge);
        ground.geometry.dispose();
        ridge.geometry.dispose();
        ground = new THREE.Mesh(buildGround(p), groundMat);
        ridge = ridgeLine(p);
        scene.add(ground, ridge);
        dirty = true;
      },
      setBodies: (s, e, lit) => {
        bodies.sun = s;
        bodies.earth = e;
        if (s) {
          const d = dirOf(s.az, s.el);
          sunMesh.position.copy(d.clone().multiplyScalar(SKY_DIST));
          sunMesh.scale.setScalar(SKY_DIST * Math.sin(s.radiusDeg * DEG));
          sunMesh.visible = true;
          sunLight.position.copy(d.clone().multiplyScalar(100));
          eMat.uniforms.sunDir.value.copy(d);
        } else sunMesh.visible = false;
        sunLight.intensity = lit ? 2.4 : 0;
        // Luz ambiente algo exagerada para distinguir el terreno del cielo negro (la escena es esquemática)
        ambient.intensity = lit ? 0.45 : e && e.el > 0 ? 0.22 : 0.12;
        if (e) {
          earthMesh.position.copy(dirOf(e.az, e.el).multiplyScalar(SKY_DIST * 0.98));
          earthMesh.scale.setScalar(SKY_DIST * 0.98 * Math.sin(e.radiusDeg * DEG));
          earthMesh.visible = true;
        } else earthMesh.visible = false;
        dirty = true;
      },
      face: (az) => {
        look.yaw = az * DEG;
        dirty = true;
      },
    };

    // Interacción
    const el = renderer.domElement;
    let drag: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const k = (look.fov / 45) * 0.004;
      look.yaw -= (e.clientX - drag.x) * k;
      look.pitch = Math.min(80 * DEG, Math.max(-30 * DEG, look.pitch + (e.clientY - drag.y) * k));
      drag = { x: e.clientX, y: e.clientY };
      dirty = true;
    };
    const onUp = () => {
      drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      look.fov = Math.min(80, Math.max(5, look.fov * (e.deltaY > 0 ? 1.1 : 1 / 1.1)));
      dirty = true;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    const tmp = new THREE.Vector3();
    const place = (key: string, world: THREE.Vector3 | null) => {
      const lab = labels.current[key];
      if (!lab) return;
      if (!world) {
        lab.hidden = true;
        return;
      }
      tmp.copy(world).project(camera);
      const inFront = tmp.z < 1 && tmp.z > -1;
      lab.hidden = !inFront || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05;
      lab.style.transform = `translate(${((tmp.x + 1) / 2) * mount.clientWidth}px, ${((1 - tmp.y) / 2) * mount.clientHeight}px) translate(-50%, calc(-100% - 8px))`;
    };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!dirty) return;
      dirty = false;
      camera.fov = look.fov;
      camera.updateProjectionMatrix();
      camera.position.set(0, 0, 0);
      camera.lookAt(dirOf(look.yaw / DEG, look.pitch / DEG));
      renderer.render(scene, camera);
      for (const [key, az] of [["N", 0], ["E", 90], ["S", 180], ["W", 270]] as const) {
        place(key, dirOf(az, horizonElevationAt(prof, az) + 0.4).multiplyScalar(R));
      }
      place("sun", bodies.sun ? sunMesh.position : null);
      place("earth", bodies.earth ? earthMesh.position : null);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Points) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      el.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.setProfile(profile);
  }, [profile]);

  useEffect(() => {
    api.current?.setBodies(sun, earth, sunVisible);
    // Al abrir la vista, mira hacia el Sol si está sobre el horizonte; si no, hacia la Tierra.
    if (!faced.current && (sun || earth)) {
      faced.current = true;
      api.current?.face(sun && sun.el > -2 ? sun.az : earth ? earth.az : 0);
    }
  }, [sun, earth, sunVisible]);

  const lab = "globe-label px-1.5 py-0.5 rounded bg-surface/90 border border-borderline text-[10px] font-mono text-slate-200";
  return (
    <div
      ref={mountRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing touch-none"
      role="img"
      aria-label={t.local.aria(!!profile)}
    >
      {(["N", "E", "S", "W"] as const).map((k) => (
        <span key={k} ref={(n) => { labels.current[k] = n; }} className={`${lab} text-sky-300`} hidden>
          {t.local.cardinals[k]}
        </span>
      ))}
      <span ref={(n) => { labels.current.sun = n; }} className={`${lab} text-amber-300`} hidden>
        {t.local.sun}
      </span>
      <span ref={(n) => { labels.current.earth = n; }} className={`${lab} text-sky-300`} hidden>
        {t.local.earth}
      </span>
    </div>
  );
}
