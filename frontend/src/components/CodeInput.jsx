import { useRef } from "react";
import { font, color } from "../theme.js";

// Campo de código estilo Telegram: uma caixinha por dígito, o foco avança
// sozinho, backspace volta e colar o código preenche tudo de uma vez.
// `status`: "" | "error" (treme + vermelho) | "success" (pulo + verde).
// O valor é uma string contígua ("4821…"): a caixa i mostra value[i].
export default function CodeInput({ value = "", onChange, length = 6, disabled = false, onComplete, autoFocus = false, status = "" }) {
  const refs = useRef([]);
  const chars = Array.from({ length }, (_, i) => value[i] || "");
  const activeIdx = Math.min(value.length, length - 1);

  const commit = (next) => {
    const v = next.replace(/\D/g, "").slice(0, length);
    onChange(v);
    const idx = Math.min(v.length, length - 1);
    requestAnimationFrame(() => refs.current[idx]?.focus());
    if (v.length === length && onComplete) onComplete(v);
  };

  const handleChange = (i) => (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) return commit(value.slice(0, i));
    commit(value.slice(0, i) + digits); // digitar ou colar: preenche a partir daqui
  };

  const handleKey = (i) => (e) => {
    if (e.key === "Backspace") { e.preventDefault(); commit(value.slice(0, -1)); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
  };

  // Só a próxima caixa vazia (ou a última) recebe foco — entrada sempre sequencial.
  const handleFocus = (i) => () => { if (i !== activeIdx) refs.current[activeIdx]?.focus(); };

  const borderFor = (i) => {
    if (status === "error") return "#D64545";
    if (status === "success") return "#22C55E";
    return i === activeIdx && !disabled ? (color.accent || "#D97757") : (color.gray200 || "#E4E4E7");
  };
  const bgFor = (ch) => {
    if (status === "error") return "#FDECEA";
    if (status === "success") return "#E9F9EF";
    return ch ? "#fff" : (color.surface3 || "#FAFAFA");
  };

  return (
    <div className={status === "error" ? "ci-row ci-shake" : "ci-row"} style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
      <style>{`
        @keyframes ciShake{ 0%,100%{transform:translateX(0)} 15%{transform:translateX(-7px)} 30%{transform:translateX(6px)} 45%{transform:translateX(-5px)} 60%{transform:translateX(4px)} 75%{transform:translateX(-2px)} 90%{transform:translateX(1px)} }
        .ci-shake{ animation: ciShake .45s ease; }
        @keyframes ciPop{ 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
        .ci-ok{ animation: ciPop .4s ease both; }
        @media (prefers-reduced-motion: reduce){ .ci-shake,.ci-ok{ animation:none; } }
      `}</style>
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={status === "success" ? "ci-ok" : undefined}
          value={ch}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          onFocus={handleFocus(i)}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          aria-label={`Dígito ${i + 1} de ${length}`}
          style={{
            flex: 1, minWidth: 0, height: 56, textAlign: "center",
            fontFamily: font.heading, fontWeight: 700, fontSize: 24,
            color: status === "error" ? "#B4443C" : status === "success" ? "#1E9E52" : (color.ink900 || "#0A0A0A"),
            background: bgFor(ch),
            border: `1.5px solid ${borderFor(i)}`,
            borderRadius: 12, outline: "none", caretColor: "transparent",
            transition: "border-color .15s ease, background .15s ease, color .15s ease",
            opacity: disabled && !status ? 0.6 : 1,
            animationDelay: status === "success" ? `${i * 45}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}
