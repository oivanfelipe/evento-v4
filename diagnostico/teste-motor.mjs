import { readFileSync } from "node:fs";
import { montarMapa } from "./motor.mjs";
const perguntas = JSON.parse(readFileSync(new URL("../data/perguntas.json", import.meta.url)));
const casos = JSON.parse(readFileSync(new URL("../data/pesquisa/casos-todos.json", import.meta.url)));
const resp = { porte: "pequena", setor: "servicos_b2b", area_dor: "financeiro", maturidade_ia: "individual",
  q_cap: 1, q_man: 3, q_inf: 2, q_dec: 0, q_pro: 1, q_int: 3, q_com: 0, q_con: 1, q_ctl: 2, q_dem: 1,
  maior_dor: "manual_repetitivo", impacto: "custo", horas_perdidas: 20, prazo: "rapido" };
const m = montarMapa(resp, perguntas, casos);
console.log("principal:", m.gargalo_principal, "| estimativa:", JSON.stringify(m.estimativa));
for (const it of m.itens) {
  console.log(`\n#${it.rank} ${it.nome} (score ${it.score}) - ${it.prioridade}`);
  for (const c of it.casos) console.log(`   - [${c.id}] ${c.porte}${c.outro_porte ? "*" : ""} ${c.empresa} (${c.confianca}) ${c.resultado.slice(0, 70)}`);
}
// invariantes
let ok = m.itens.length === 3 && m.itens.every((i) => i.casos.length >= 1 && i.casos.every((c) => c.fonte_url));
const gs = new Set(m.itens.map((i) => i.gargalo)); ok = ok && gs.size === 3;
console.log("\nOK:", ok);
process.exit(ok ? 0 : 1);
