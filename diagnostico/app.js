import { montarMapa } from "./motor.mjs";
import { GARGALOS } from "./gargalos.mjs";

// Chaves públicas por desenho: a tabela só aceita INSERT (RLS), nunca leitura.
const SUPABASE_URL = "https://lbqmanwfgnhugjefluzy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Y6QoY26FFpatQoHpWw-rAw_CwzVmRFE";

const $chat = document.getElementById("chat");
const $dock = document.getElementById("dock");
const $barra = document.getElementById("barra");

const qs = new URLSearchParams(location.search);
const anfitriao = (qs.get("anfitriao") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60) || null;

const resp = {};
let perguntas, casos, passos, idx = 0;
const leadId = crypto.randomUUID();

// ---------- util ----------
function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const f of filhos.flat()) if (f != null) el.append(f.nodeType ? f : document.createTextNode(f));
  return el;
}
const rolar = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
const bot = (t) => { $chat.append(h("div", { class: "bolha bot" }, t)); rolar(); };
const eu = (t) => { $chat.append(h("div", { class: "bolha eu" }, t)); rolar(); };
const limparDock = () => $dock.replaceChildren();
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// ---------- persistência (insert-only) ----------
async function inserir(tabela, linha) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(linha),
  });
  if (!r.ok) throw new Error(`${tabela} ${r.status}`);
}
function fila(tabela, linha) {
  try {
    const q = JSON.parse(localStorage.getItem("v4_fila") || "[]");
    q.push({ tabela, linha });
    localStorage.setItem("v4_fila", JSON.stringify(q));
  } catch {}
}
async function salvar(tabela, linha) {
  for (let t = 0; t < 3; t++) {
    try { return await inserir(tabela, linha); } catch { await pausa(800 * (t + 1)); }
  }
  fila(tabela, linha); // reenvia na próxima visita; o lead não se perde por queda de rede
}
async function reenviarFila() {
  try {
    const q = JSON.parse(localStorage.getItem("v4_fila") || "[]");
    if (!q.length) return;
    const resto = [];
    for (const it of q) { try { await inserir(it.tabela, it.linha); } catch { resto.push(it); } }
    localStorage.setItem("v4_fila", JSON.stringify(resto));
  } catch {}
}

// ---------- perguntas ----------
function opcoesDe(p) {
  if (p.tipo === "escala") return perguntas.escala_frequencia.map((o) => ({ valor: o.valor, label: o.label }));
  if (p.opcoes_de === "gargalos") return Object.keys(GARGALOS).map((g) => ({ valor: g, label: `${GARGALOS[g].nome}: ${GARGALOS[g].sintoma}` }));
  return p.opcoes;
}

function normalizarTel(v) {
  const d = v.replace(/\D/g, "");
  if (d.length < 10 || d.length > 13) return null;
  return d.length <= 11 ? `+55${d}` : `+${d}`;
}

function proximo() {
  if (idx >= passos.length) return finalizar();
  const { etapa, p, primeiraDaEtapa } = passos[idx];
  $barra.style.width = `${Math.round((idx / passos.length) * 100)}%`;
  if (primeiraDaEtapa) {
    $chat.append(h("div", { class: "etapa" }, etapa.titulo));
    if (etapa.instrucao) bot(etapa.instrucao);
  }
  bot(p.texto);
  renderEntrada(p);
}

function responder(p, valor, rotulo) {
  resp[p.id] = valor;
  eu(rotulo);
  limparDock();
  idx++;
  setTimeout(proximo, 260);
}

function renderEntrada(p) {
  limparDock();
  if (p.tipo === "escolha_unica" || p.tipo === "escala") {
    $dock.append(h("div", { class: "chips" }, opcoesDe(p).map((o) => h("button", { class: "chip", type: "button", onclick: () => responder(p, o.valor, o.label) }, o.label))));
  } else if (p.tipo === "multipla") {
    const sel = new Set();
    const ok = h("button", { class: "btn", type: "button", disabled: true, onclick: () => {
      const v = [...sel];
      responder(p, v, opcoesDe(p).filter((o) => sel.has(o.valor)).map((o) => o.label).join(", "));
    } }, "Continuar");
    const chips = opcoesDe(p).map((o) => h("button", { class: "chip", type: "button", onclick: (e) => {
      sel.has(o.valor) ? sel.delete(o.valor) : sel.add(o.valor);
      e.currentTarget.classList.toggle("on");
      ok.disabled = !sel.size;
    } }, o.label));
    $dock.append(h("div", { class: "chips", style: "margin-bottom:10px" }, chips), ok);
  } else if (p.tipo === "aceite") {
    $dock.append(h("button", { class: "btn", style: "width:100%", type: "button", onclick: () => {
      responder(p, true, "Concordo");
      salvarLead();
    } }, "Concordo e quero ver meu Mapa"));
  } else {
    renderCampo(p);
  }
  const campo = $dock.querySelector("input");
  if (campo) campo.focus({ preventScroll: true });
}

function renderCampo(p) {
  const tipoInput = p.tipo === "telefone" ? "tel" : p.tipo === "email" ? "email" : "text";
  const erro = h("p", { class: "erro", hidden: true });
  const input = h("input", { type: tipoInput, autocomplete: p.id === "nome" ? "name" : p.tipo === "telefone" ? "tel" : p.tipo === "email" ? "email" : "off", placeholder: p.tipo === "telefone" ? "(11) 91234-5678" : "", maxlength: 160, enterkeyhint: "send" });
  const opcional = p.obrigatoria === false || p.opcional;
  const enviar = () => {
    let v = input.value.trim();
    if (!v) return opcional ? responder(p, null, "(pulou)") : mostrar("Preencha este campo para continuar.");
    if (p.tipo === "telefone") { v = normalizarTel(v); if (!v) return mostrar("Informe o WhatsApp com DDD."); }
    if (p.tipo === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return mostrar("E-mail inválido.");
    if (v.length < 2) return mostrar("Muito curto.");
    responder(p, v, v);
  };
  const mostrar = (t) => { erro.textContent = t; erro.hidden = false; };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") enviar(); });
  $dock.append(erro, h("div", { class: "linha" }, input, h("button", { class: "btn", type: "button", onclick: enviar }, "Enviar")));
  if (opcional) $dock.append(h("button", { class: "btn sec", style: "width:100%;margin-top:8px", type: "button", onclick: () => responder(p, null, "(pulou)") }, "Pular"));
}

function salvarLead() {
  salvar("evento_leads", {
    id: leadId,
    nome: resp.nome,
    empresa: resp.empresa,
    cargo: resp.cargo,
    telefone: resp.telefone,
    email: resp.email || null,
    consentimento: true,
    anfitriao,
  });
}

// ---------- resultado ----------
async function personalizar(mapa) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 11000);
  try {
    const r = await fetch("/api/mapa", {
      method: "POST",
      signal: ctl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        perfil: { empresa: resp.empresa, cargo: resp.cargo, porte: resp.porte, setor: resp.setor, area_dor: resp.area_dor, impacto: resp.impacto, prazo: resp.prazo, texto_livre: resp.texto_livre },
        estimativa: mapa.estimativa,
        itens: mapa.itens.map((i) => ({ gargalo: i.gargalo, nome: i.nome, impacto: i.impacto, oportunidade: i.oportunidade, primeiro_passo: i.primeiro_passo, casos: i.casos.map((c) => ({ empresa: c.empresa, solucao: c.solucao, resultado: c.resultado })) })),
      }),
    });
    if (!r.ok) return mapa;
    const ia = await r.json();
    mapa.resumo = ia.resumo;
    for (const it of mapa.itens) {
      const s = ia.itens.find((x) => x.gargalo === it.gargalo);
      if (s) Object.assign(it, { impacto: s.impacto, oportunidade: s.oportunidade, primeiro_passo: s.primeiro_passo });
    }
    mapa.ia = true;
  } catch {} finally { clearTimeout(t); }
  return mapa;
}

async function finalizar() {
  $barra.style.width = "100%";
  limparDock();
  bot("Perfeito. Estou cruzando suas respostas com o banco de casos reais…");
  const dig = h("div", { class: "bolha bot digitando" }, h("span"), h("span"), h("span"));
  $chat.append(dig);
  rolar();
  let mapa = montarMapa(resp, perguntas, casos);
  if (!mapa.itens.length) { dig.remove(); return bot("Não consegui montar o Mapa. Chame alguém da equipe V4."); }
  mapa = await personalizar(mapa);
  dig.remove();
  salvar("evento_respostas", { lead_id: leadId, respostas: resp, scores: mapa.scores, gargalo_principal: mapa.gargalo_principal, mapa: { itens: mapa.itens.map((i) => ({ gargalo: i.gargalo, rank: i.rank, casos: i.casos.map((c) => c.id) })), estimativa: mapa.estimativa }, texto_ia: mapa.ia });
  renderMapa(mapa);
}

const CONF = { alta: "Fonte primária", media: "Resultado autodeclarado" };

function renderMapa(m) {
  const primeiro = (resp.nome || "").split(" ")[0];
  const el = h("section", { class: "mapa" },
    h("div", { class: "etapa" }, "Seu resultado"),
    h("h2", {}, `${primeiro ? primeiro + ", este" : "Este"} é o Mapa de Gargalos de ${resp.empresa}`),
    h("p", { class: "resumo" }, m.resumo || `Suas respostas apontam ${m.itens.map((i) => i.nome.toLowerCase()).join(", ")} como os três pontos que mais seguram a empresa. A ordem abaixo é a ordem em que vale atacar.`),
    m.estimativa ? h("div", { class: "est" }, h("b", {}, `≈ ${brl(m.estimativa.valor_mes)} por mês`), h("small", {}, `Estimativa de custo do seu maior problema: ${m.estimativa.horas_semana} h/semana × 4,3 semanas × R$ ${m.estimativa.custo_hora}/h de referência. Ordem de grandeza, não promessa.`)) : null,
    m.itens.map((i) => h("article", { class: "cartao" },
      h("span", { class: "tag p" }, i.prioridade),
      h("h3", {}, `${i.rank}. ${i.nome}`),
      h("div", { class: "passo" }, h("h4", {}, "O que está acontecendo"), h("p", {}, i.sintoma)),
      h("div", { class: "passo" }, h("h4", {}, "Impacto no negócio"), h("p", {}, i.impacto)),
      h("div", { class: "passo" }, h("h4", {}, "Oportunidade"), h("p", {}, i.oportunidade)),
      h("div", { class: "passo" }, h("h4", {}, "Onde aplicar IA e automação"), h("ul", {}, i.aplicacoes.map((a) => h("li", {}, a)))),
      h("div", { class: "passo" }, h("h4", {}, "Primeiro passo (próxima semana)"), h("p", {}, i.primeiro_passo)),
      h("div", { class: "passo" }, h("h4", {}, "Quem já fez, com fonte"), i.casos.map((c) => h("div", { class: "caso" },
        h("strong", {}, c.empresa || c.titulo),
        h("p", {}, c.solucao),
        h("p", {}, h("b", {}, "Resultado: "), c.resultado),
        h("span", { class: "tag" }, CONF[c.confianca] || c.confianca),
        h("span", { class: "tag" }, `${c.pais}, ${c.ano}`),
        c.outro_porte ? h("span", { class: "tag" }, `Empresa de porte ${c.porte}: o princípio se adapta ao seu`) : null,
        h("div", {}, h("a", { href: c.fonte_url, target: "_blank", rel: "noopener noreferrer" }, c.fonte_nome || "Fonte"))))))),
    h("p", { class: "nota" }, "Os resultados dos casos foram reportados pelas próprias empresas ou fornecedores nas fontes indicadas e não são promessa de resultado. O texto deste Mapa foi " + (m.ia ? "personalizado com IA a partir" : "montado a partir") + " das suas respostas e do banco de casos da V4 Company."),
    h("div", { class: "acoes" }, h("button", { class: "btn", type: "button", onclick: () => window.print() }, "Salvar como PDF")));
  $chat.append(el);
  window.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
}

// ---------- início ----------
async function iniciar() {
  try {
    [perguntas, casos] = await Promise.all([
      fetch("../data/perguntas.json").then((r) => r.json()),
      fetch("../data/pesquisa/casos-todos.json").then((r) => r.json()),
    ]);
  } catch {
    $chat.append(h("p", { class: "erro" }, "Não consegui carregar o diagnóstico. Verifique a conexão e recarregue."));
    return;
  }
  passos = perguntas.etapas.flatMap((etapa) => etapa.perguntas.map((p, i) => ({ etapa, p, primeiraDaEtapa: i === 0 })));
  reenviarFila();
  $chat.append(h("div", { class: "capa" },
    h("h1", {}, "Onde a sua empresa trava?"),
    h("p", {}, "Responda cerca de 25 perguntas rápidas (4 a 5 minutos). Você recebe, na hora, o seu Mapa de Gargalos e Oportunidades com aplicações reais de IA e automação e casos de quem já fez.")));
  $dock.append(h("button", { class: "btn", style: "width:100%", type: "button", onclick: () => { $chat.replaceChildren(); proximo(); } }, "Começar o diagnóstico"));
}
iniciar();
