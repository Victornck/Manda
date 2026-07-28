import { useEffect, useRef, useState } from "react";

// Anima um número do valor atual até o novo (count-up), aplicando `format` a
// cada quadro. Se o valor mudar no meio, recomeça de onde está visualmente.
// Respeita prefers-reduced-motion (mostra o valor final, sem animar).
export default function CountUp({ value, format = (n) => String(Math.round(n)), duration = 550, className, style, fromZero = false }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(fromZero ? 0 : target);
  const displayRef = useRef(fromZero ? 0 : target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = Number(displayRef.current) || 0;
    const to = target;
    if (from === to) { setDisplay(to); return; }

    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { displayRef.current = to; setDisplay(to); return; }

    cancelAnimationFrame(rafRef.current);
    let start = 0;
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const cur = from + (to - from) * ease(p);
      displayRef.current = cur;
      setDisplay(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { displayRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return <span className={className} style={style}>{format(display)}</span>;
}
