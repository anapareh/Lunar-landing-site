/**
 * Landing de Artemis Atlas (maqueta de la usuaria: mockup/index.html).
 * - Fuentes empaquetadas (Outfit, Manrope): sin llamadas a Google Fonts.
 * - ES / EN con el mismo idioma recordado que la app (localStorage "artemis-atlas-lang", `?lang=`).
 * - Los botones Launch abren la app (/app/) en el idioma activo.
 * - El cielo, la Tierra y el terreno del hero son una ilustración decorativa en canvas (no son datos).
 */
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/outfit/800.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";

type Lang = "es" | "en";
const LANG_KEY = "artemis-atlas-lang";

const EN: Record<string, string> = {
  tagline: "Lunar Landing Site Navigator",
  launch: "Open the app",
  eyebrow: "Lunar south pole",
  h1a: "Lunar",
  h1b: "Landing Navigator",
  lead: "Explore and compare lunar landing sites. See when there is sunlight, when there is a direct line to Earth, and which window is best for landing.",
  more: "Learn more",
  f1: "Solar analysis",
  f1s: "Hours of light, sunset and sunrise",
  f2: "Communication with Earth",
  f2s: "Direct line of sight (DTE) and when it is lost",
  f3: "Site comparison",
  f3s: "Up to 4 site-and-date scenarios",
  incl: "What's inside",
  h2: "A Moon you can spin, and a date you can move",
  sub: "Pick a site, slide through time and watch how sunlight, Earth visibility and the best landing window change.",
  c1t: "Real landings",
  c1: "Apollo, Surveyor, Luna, Chang'e, Chandrayaan-3, SLIM, IM-1, IM-2, Blue Ghost… with a button to see the sky on the day they landed. Plus the 9 Artemis III candidate regions, any point on the globe, or your own coordinates.",
  n2: "29.5 d",
  c2t: "A full lunar day",
  c2: "A strip with sunlight and Earth visibility across the whole cycle. One button jumps to the best window: the longest one with both Sun and Earth.",
  c3t: "Simple and Advanced modes",
  c3: "Simple sums it up in sentences: is there light, is Earth visible, how much light is left. Advanced adds elevation, azimuth, the real horizon and the view from the surface.",
  s1: "Sun and Earth positions, checked against JPL Horizons",
  s2: "Real south-pole terrain (85°–90° S)",
  s3: "Landing site coordinates",
  s4: "On desktop and mobile",
  ready: "Ready for launch",
  h2b: "Pick a site and see if there is light",
  subb: "Works on desktop and mobile, nothing to install.",
  foot1: "A project by team HerTech for the NASA Space Apps Challenge 2026.",
  foot2: "Exploration tool: it does not assess terrain slope or hazards and does not replace mission analysis. Outside 85°–90° S the horizon is that of a smooth Moon.",
  foot3: "The Earth and terrain on this page are illustrations. Data: NASA/JPL, LRO LOLA, NASA NSSDCA and LROC.",
};

// Textos originales (español) tal como están en el HTML
const ES: Record<string, string> = {};
document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
  ES[el.dataset.i18n!] = el.textContent ?? "";
});

function initialLang(): Lang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "es" || q === "en") return q;
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "es" || v === "en") return v;
  } catch {
    /* almacenamiento no disponible */
  }
  return "es";
}

function applyLang(lang: Lang) {
  const dict = lang === "en" ? EN : ES;
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const v = dict[el.dataset.i18n!];
    if (v !== undefined) el.textContent = v;
  });
  document.querySelectorAll<HTMLAnchorElement>("[data-app]").forEach((a) => {
    a.href = `app/?lang=${lang}`;
  });
  const btn = document.getElementById("lang-toggle");
  if (btn) {
    btn.textContent = lang === "en" ? "ES" : "EN";
    btn.setAttribute("aria-label", lang === "en" ? "Cambiar a español" : "Switch to English");
  }
  document.title = lang === "en" ? "Artemis Atlas · Lunar landing site navigator" : "Artemis Atlas · Navegador de sitios de alunizaje";
}

let lang = initialLang();
applyLang(lang);
document.getElementById("lang-toggle")?.addEventListener("click", () => {
  lang = lang === "es" ? "en" : "es";
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* almacenamiento no disponible */
  }
  applyLang(lang);
});

// ---- Ilustración del hero (decorativa) ----
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSky() {
  const cv = document.getElementById("sky") as HTMLCanvasElement | null;
  const hero = cv?.parentElement;
  const g = cv?.getContext("2d");
  if (!cv || !hero || !g) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = hero.clientWidth;
  const H = hero.clientHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = rng(21);
  const narrow = W < 700;

  // Estrellas
  for (let i = 0; i < Math.round((W * H) / 2600); i++) {
    const x = R() * W, y = R() * H, a = 0.15 + R() * 0.7, s = R() < 0.06 ? 1.8 : 0.9;
    g.fillStyle = `rgba(210,230,255,${a.toFixed(2)})`;
    g.fillRect(x, y, s, s);
  }

  // Tierra
  const er = Math.min(W, H) * (narrow ? 0.14 : 0.125), ex = W * (narrow ? 0.84 : 0.87), ey = H * (narrow ? 0.14 : 0.24);
  const halo = g.createRadialGradient(ex, ey, er * 0.9, ex, ey, er * 1.9);
  halo.addColorStop(0, "rgba(70,160,255,.38)");
  halo.addColorStop(1, "rgba(70,160,255,0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(ex, ey, er * 1.9, 0, 7);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(ex, ey, er, 0, 7);
  g.clip();
  const sea = g.createRadialGradient(ex - er * 0.35, ey - er * 0.35, er * 0.1, ex, ey, er);
  sea.addColorStop(0, "#4aa8ff");
  sea.addColorStop(0.6, "#1a62c9");
  sea.addColorStop(1, "#0a2a66");
  g.fillStyle = sea;
  g.fillRect(ex - er, ey - er, er * 2, er * 2);
  const land = rng(5);
  for (let k = 0; k < 9; k++) {
    const cx = ex + (land() - 0.5) * er * 1.5, cy = ey + (land() - 0.5) * er * 1.4;
    g.fillStyle = land() < 0.6 ? "rgba(70,150,80,.9)" : "rgba(176,150,96,.85)";
    g.beginPath();
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2, rr = er * (0.1 + land() * 0.2);
      g.lineTo(cx + Math.cos(ang) * rr * 1.3, cy + Math.sin(ang) * rr);
    }
    g.closePath();
    g.fill();
  }
  g.strokeStyle = "rgba(255,255,255,.55)";
  g.lineWidth = er * 0.05;
  g.lineCap = "round";
  for (let k = 0; k < 16; k++) {
    const cx = ex + (land() - 0.5) * er * 1.8, cy = ey + (land() - 0.5) * er * 1.8, l = er * (0.15 + land() * 0.35);
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(cx + l * 0.5, cy - er * 0.07, cx + l, cy);
    g.stroke();
  }
  const shade = g.createRadialGradient(ex - er * 0.45, ey - er * 0.45, er * 0.3, ex, ey, er * 1.05);
  shade.addColorStop(0, "rgba(0,0,20,0)");
  shade.addColorStop(1, "rgba(0,0,20,.7)");
  g.fillStyle = shade;
  g.fillRect(ex - er, ey - er, er * 2, er * 2);
  g.restore();
  g.strokeStyle = "rgba(150,210,255,.55)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(ex, ey, er, 0, 7);
  g.stroke();

  // Terreno: cresta curva que sube hacia la derecha
  const rx0 = W * (narrow ? -0.1 : 0.12), ry0 = H * 0.98, cx1 = W * 0.55, cy1 = H * (narrow ? 0.78 : 0.7), rx1 = W * 1.02, ry1 = H * (narrow ? 0.6 : 0.4);
  const ridge = (t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * rx0 + 2 * u * t * cx1 + t * t * rx1, u * u * ry0 + 2 * u * t * cy1 + t * t * ry1];
  };
  g.save();
  g.beginPath();
  g.moveTo(rx0, H + 4);
  for (let i = 0; i <= 60; i++) {
    const [x, y] = ridge(i / 60);
    g.lineTo(x, y);
  }
  g.lineTo(W + 4, ry1);
  g.lineTo(W + 4, H + 4);
  g.closePath();
  g.clip();
  const base = g.createLinearGradient(0, ry1, W * 0.3, H);
  base.addColorStop(0, "#d3dce8");
  base.addColorStop(0.4, "#9aa6b8");
  base.addColorStop(1, "#46526a");
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  // Cráteres con perspectiva
  const C = rng(77);
  const craters: { x: number; y: number; size: number }[] = [];
  for (let i = 0; i < 230; i++) {
    const x = C() * W * 1.05, y = ry1 + (H - ry1) * Math.pow(C(), 0.85);
    const depth = (y - ry1) / (H - ry1 + 1), size = (4 + C() * C() * 120) * (0.25 + depth * 1.3) * (W / 1300 + 0.4);
    craters.push({ x, y, size });
  }
  craters
    .sort((a, b) => a.y - b.y)
    .forEach(({ x, y, size }) => {
      const ry = size * 0.34;
      g.fillStyle = "rgba(28,36,54,.6)";
      g.beginPath();
      g.ellipse(x, y, size, ry, -0.12, 0, 7);
      g.fill();
      g.fillStyle = "rgba(200,210,226,.30)";
      g.beginPath();
      g.ellipse(x + size * 0.1, y + ry * 0.18, size * 0.78, ry * 0.7, -0.12, 0, 7);
      g.fill();
      const lit = g.createLinearGradient(x - size, y - ry, x + size, y + ry);
      lit.addColorStop(0, "rgba(245,250,255,.9)");
      lit.addColorStop(0.5, "rgba(235,242,252,.25)");
      lit.addColorStop(1, "rgba(10,14,24,.55)");
      g.strokeStyle = lit;
      g.lineWidth = Math.max(1.2, size * 0.09);
      g.beginPath();
      g.ellipse(x, y, size, ry, -0.12, 0, 7);
      g.stroke();
    });
  // Grano
  for (let i = 0; i < Math.round((W * H) / 90); i++) {
    const x = C() * W, y = C() * H, d = C() < 0.5;
    g.fillStyle = d ? "rgba(15,20,32,.25)" : "rgba(235,240,250,.18)";
    g.fillRect(x, y, 1 + C() * 1.6, 1 + C() * 1.2);
  }
  const dark = g.createLinearGradient(0, 0, W * 0.6, 0);
  dark.addColorStop(0, "rgba(4,10,26,.6)");
  dark.addColorStop(1, "rgba(4,10,26,0)");
  g.fillStyle = dark;
  g.fillRect(0, 0, W, H);
  g.restore();

  // Luz sobre la cresta
  g.strokeStyle = "rgba(205,232,255,.55)";
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const [x, y] = ridge(i / 60);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
}

drawSky();
let rt = 0;
window.addEventListener("resize", () => {
  clearTimeout(rt);
  rt = window.setTimeout(drawSky, 150);
});
