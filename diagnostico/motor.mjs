// Motor do diagnóstico: pontua os 10 gargalos, escolhe os casos do banco e monta
// o Mapa por regras. A Groq (api/mapa.js) só reescreve o texto; nunca decide
// gargalo, prioridade nem inventa caso.
import { GARGALOS } from "./gargalos.mjs";

export const CUSTO_HORA = 50; // R$/h de referência, exibido sempre como premissa
export const SEMANAS_MES = 4.3;

const ADJACENTE = { pequena: ["media"], media: ["pequena", "grande"], grande: ["media"] };
const AREA_CASO = { administrativo: ["administrativo", "rh"], operacoes: ["operacoes", "logistica"] };

export function pontuar(resp, perguntas) {
  const escala = perguntas.etapas.flatMap((e) => e.perguntas).filter((p) => p.tipo === "escala");
  const area = perguntas.regras_pontuacao.area_para_gargalos[resp.area_dor] || [];
  const ordem = Object.keys(perguntas.gargalos);
  const scores = {};
  for (const g of ordem) scores[g] = 0;
  for (const p of escala) scores[p.gargalo] += (Number(resp[p.id]) || 0) * 10;
  if (resp.maior_dor in scores) scores[resp.maior_dor] += 20;
  for (const g of area) scores[g] += 10;
  const ranking = ordem
    .map((g, i) => ({ g, score: scores[g], i, dor: g === resp.maior_dor ? 1 : 0, area: area.includes(g) ? 1 : 0 }))
    .sort((a, b) => b.score - a.score || b.dor - a.dor || b.area - a.area || a.i - b.i);
  return { scores, ranking: ranking.map((r) => r.g) };
}

function pesoCaso(c, g, resp) {
  let s = 0;
  if (c.gargalo !== g) s -= 3; // veio por gargalo secundário
  if (c.porte === resp.porte) s += 4;
  else if ((ADJACENTE[resp.porte] || []).includes(c.porte)) s += 2;
  const areas = AREA_CASO[resp.area_dor] || [resp.area_dor];
  if (areas.includes(c.area)) s += 2;
  if (c.confianca === "alta") s += 2;
  if (c.tipo === "nominal") s += 1;
  if (c.pais === "Brasil") s += 1;
  if (resp.prazo === "rapido") {
    if (c.complexidade_implantacao === "baixa") s += 2;
    else if (c.complexidade_implantacao === "media") s += 1;
    if (c.tempo_para_valor !== "meses") s += 1;
  }
  return s;
}

export function escolherCasos(g, resp, casos, n = 2, excluir = new Set()) {
  const cand = casos
    .filter((c) => !excluir.has(c.id))
    .filter((c) => c.gargalo === g || (c.gargalos_secundarios || []).includes(g))
    .map((c) => ({ c, s: pesoCaso(c, g, resp) }))
    .sort((a, b) => b.s - a.s);
  const out = [];
  const usadas = new Set();
  for (const { c } of cand) {
    const chave = c.empresa || c.id;
    if (usadas.has(chave)) continue;
    usadas.add(chave);
    out.push({ ...c, outro_porte: c.porte !== resp.porte });
    if (out.length === n) break;
  }
  return out;
}

export function estimativaMensal(resp) {
  const h = Number(resp.horas_perdidas);
  if (!h) return null;
  const valor = Math.round((h * SEMANAS_MES * CUSTO_HORA) / 100) * 100;
  return { horas_semana: h, valor_mes: valor, custo_hora: CUSTO_HORA };
}

function prioridade(rank, casos) {
  const rapido = casos.some((c) => c.complexidade_implantacao === "baixa" && c.tempo_para_valor !== "meses");
  if (rank === 0) return rapido ? "Prioridade 1 · começar agora (vitória rápida)" : "Prioridade 1 · começar agora";
  if (rank === 1) return rapido ? "Prioridade 2 · próxima vitória rápida" : "Prioridade 2 · próximo passo";
  return "Prioridade 3 · estruturar em seguida";
}

export function montarMapa(resp, perguntas, casos) {
  const { scores, ranking } = pontuar(resp, perguntas);
  const impactoKey = resp.impacto in GARGALOS.capacidade.impacto ? resp.impacto : "custo";
  const usados = new Set();
  const itens = ranking.slice(0, 3).map((g, i) => {
    const base = GARGALOS[g];
    const cs = escolherCasos(g, resp, casos, 2, usados);
    cs.forEach((c) => usados.add(c.id));
    return {
      rank: i + 1,
      gargalo: g,
      nome: base.nome,
      score: scores[g],
      sintoma: base.sintoma,
      impacto: base.impacto[impactoKey],
      oportunidade: base.oportunidade,
      aplicacoes: base.aplicacoes,
      primeiro_passo: base.primeiro_passo,
      prioridade: prioridade(i, cs),
      casos: cs,
    };
  });
  return {
    gargalo_principal: ranking[0],
    scores,
    estimativa: estimativaMensal(resp),
    itens,
    ia: false,
    resumo: null,
  };
}
