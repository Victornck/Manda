// Helpers PUROS (sem dependência de rede/banco), usados por unitários e integração.

// Gera um CPF VÁLIDO e único a partir de um seed (calcula os 2 dígitos).
export function makeCpf(seed) {
  const base = String(seed).padStart(9, "0").slice(-9).split("").map(Number);
  const calc = (nums) => {
    let s = 0;
    for (let i = 0; i < nums.length; i++) s += nums[i] * (nums.length + 1 - i);
    const d = (s * 10) % 11;
    return d === 10 ? 0 : d;
  };
  const d1 = calc(base);
  const d2 = calc([...base, d1]);
  return base.join("") + d1 + d2;
}

// Corpo mínimo válido de uma proposta (formato do proposalSchema).
export function proposalBody(overrides = {}) {
  return {
    client: "Cliente Teste", company: "", clientEmail: "", title: "Proposta Teste",
    scope: "", items: [{ desc: "Serviço", value: "1000", hidden: false }],
    start: "", end: "", payment: "", revisions: "", validity: "", bio: "",
    accent: "#0A0A0A", accent2: "#6C48B0", gradient: false, theme: "claro", watermark: "",
    logo: "", cover: "", template: "minimal", ...overrides,
  };
}
