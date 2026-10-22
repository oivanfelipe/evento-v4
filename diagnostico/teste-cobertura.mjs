// Para cada gargalo x porte (x prazo), o motor entrega casos? Quantos fortes? Quantos de porte diferente?
import { readFileSync } from "node:fs";
import { escolherCasos } from "./motor.mjs";
const casos = JSON.parse(readFileSync(new URL("../data/pesquisa/casos-final.json", import.meta.url)));
const G = ["capacidade","manual_repetitivo","informacao","decisao","processo","integracao","comunicacao","conhecimento","controle","demanda_comercial"];
let falhas = 0;
console.log("gargalo            porte     n  fortes  outro_porte");
for (const g of G) for (const porte of ["pequena","media","grande"]) {
  const r = escolherCasos(g, { porte, setor: "servicos_b2b", area_dor: "operacoes", prazo: "medio" }, casos, 2);
  const f = r.filter((c) => c.forca === "forte").length, o = r.filter((c) => c.outro_porte).length;
  const marca = r.length < 2 ? "  <-- POUCOS" : f === 0 ? "  <-- sem forte" : "";
  if (r.length < 2) falhas++;
  console.log(`${g.padEnd(18)} ${porte.padEnd(8)} ${r.length}  ${f}       ${o}${marca}`);
}
console.log("\ncelulas com menos de 2 casos:", falhas);
process.exit(falhas ? 1 : 0);
