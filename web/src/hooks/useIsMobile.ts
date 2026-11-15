/** true por debajo del breakpoint lg (1024 px): disposición móvil con hojas inferiores. */
import { useEffect, useState } from "react";

const QUERY = "(max-width: 1023px)";

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}
