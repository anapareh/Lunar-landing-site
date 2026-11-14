/**
 * Simulación del paso del tiempo: avanza `cursor` a `speed` segundos simulados por segundo real.
 * - La serie de la ventana no se recalcula: solo cambia el instante mostrado.
 * - Las actualizaciones de estado se limitan a ~12 por segundo.
 * - Al llegar al final de la ventana, la siguiente empieza ahí (otro día lunar). Si se acaban los
 *   datos cargados, se detiene.
 */
import { useEffect } from "react";
import { parseUtc, toIsoUtc } from "../lib/time";
import { useAppStore } from "../store/useAppStore";

const COMMIT_EVERY_MS = 80;

export function useSimulation(at: string | null, windowEnd: string | null, coverageEnd: string | null) {
  const playing = useAppStore((s) => s.playing);
  const speed = useAppStore((s) => s.speed);

  useEffect(() => {
    if (!playing || !at || !windowEnd || !coverageEnd) return;
    const { cursor, setCursor, setDate, setPlaying } = useAppStore.getState();
    const end = parseUtc(windowEnd);
    let simMs = Math.max(parseUtc(cursor ?? at), parseUtc(at));
    if (simMs >= end) simMs = parseUtc(at); // si estaba al final, vuelve a empezar la ventana
    let last = performance.now();
    let lastCommit = last;
    let raf = 0;

    const tick = (now: number) => {
      simMs += ((now - last) / 1000) * speed * 1000;
      last = now;
      if (simMs >= end) {
        if (end >= parseUtc(coverageEnd)) {
          setCursor(windowEnd);
          setPlaying(false);
        } else {
          setDate(windowEnd); // nueva ventana: el efecto se reinicia con el nuevo `at`
        }
        return;
      }
      if (now - lastCommit >= COMMIT_EVERY_MS) {
        lastCommit = now;
        setCursor(toIsoUtc(simMs));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, at, windowEnd, coverageEnd]);
}
