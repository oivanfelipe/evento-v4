import { GARGALOS } from "../diagnostico/gargalos.mjs";

// Chaves públicas por desenho: quem lê os dados é o usuário logado, e a regra de acesso
// (e-mail confirmado @v4company.com) é aplicada no banco por RLS, não aqui.
const SUPABASE_URL = "https://lbqmanwfgnhugjefluzy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Y6QoY26FFpatQoHpWw-rAw_CwzVmRFE";
const DOMINIO = "@v4company.com";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...filhos) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const f of filhos.flat()) if (f != null) n.append(f.nodeType ? f : document.createTextNode(f));
  return n;
};
const nomeGargalo = (g) => (GARGALOS[g] ? GARGALOS[g].nome : g || "—");
const mostrar = (id) => { for (const s of ["login", "negado", "app"]) $(s).hidden = s !== id; };
const brl = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dataBR = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const ABERTAS = [
  ["dor_aberta", "Onde o tempo/dinheiro vaza"], ["historia", "Última vez que custou caro e o que já tentaram"],
  // perguntas de versões anteriores do questionário (leads antigos)
  ["ultima_vez", "Última vez que custou caro"], ["ja_tentou", "O que já tentaram"], ["varinha", "Tarefa que automatizaria amanhã"], ["extra_final", "Recado final"],
];
const GUIA = { rapido_confio: "Chega rápido e confia", demora_ou_duvida: "Demora ou desconfia", nunca_medi: "Nunca parou para medir", pessoas: "As pessoas", sistemas: "Os sistemas", caixa: "O caixa", nunca_pensei: "Nunca parou para pensar nisso" };
let leads = [];

// ---------- login ----------
function msgLogin(t, erro = false) { const m = $("msg-login"); m.textContent = t; m.className = "msg" + (erro ? " erro" : ""); }

$("google").addEventListener("click", async () => {
  msgLogin("");
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.origin + location.pathname, queryParams: { hd: "v4company.com" } },
  });
  if (error) msgLogin("Não foi possível iniciar o login com Google. Use o link por e-mail ou fale com o time de tecnologia.", true);
});

$("form-email").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("campo-email").value.trim().toLowerCase();
  if (!email.endsWith(DOMINIO)) return msgLogin(`Use o seu e-mail ${DOMINIO}.`, true);
  msgLogin("Enviando…");
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) return msgLogin("Não consegui enviar o link agora. Tente de novo em alguns minutos ou entre com Google.", true);
  msgLogin("Pronto. Abra o link que enviamos para " + email + " neste mesmo navegador.");
});

$("sair").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });

// ---------- dados ----------
async function carregarLeads() {
  const tudo = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb
      .from("evento_leads")
      .select("id,created_at,nome,empresa,cargo,telefone,email,anfitriao,consentimento,evento_respostas(gargalo_principal,scores,respostas,mapa,texto_ia,created_at)")
      .order("created_at", { ascending: false })
      .range(de, de + 999);
    if (error) throw error;
    tudo.push(...data);
    if (data.length < 1000) break;
  }
  return tudo.map((l) => {
    const r = (l.evento_respostas || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] || null;
    return { ...l, resp: r };
  });
}

// concluiu = chegou ao Mapa; parcial = parou no meio (o app guarda checkpoints); so_cadastro = só se identificou.
const estado = (l) => (!l.resp ? "so_cadastro" : l.resp.mapa && Array.isArray(l.resp.mapa.itens) ? "concluiu" : "parcial");
const ETAPA = { perfil: "o perfil da empresa", reflexao: "as duas perguntas para pensar", diagnostico: "as situações e as horas perdidas", decisao: "quem decide e o investimento", aprofundar: "a pergunta final" };
const gargaloReal = (r) => (r && GARGALOS[r.gargalo_principal] ? r.gargalo_principal : null);

function top3(r) {
  if (!r || !r.scores) return [];
  return Object.entries(r.scores).sort((a, b) => b[1] - a[1]).slice(0, 3).filter((x) => x[1] > 0);
}

// ---------- filtros e tabela ----------
function filtrados() {
  const q = $("busca").value.trim().toLowerCase();
  const anf = $("f-anfitriao").value, garg = $("f-gargalo").value, st = $("f-status").value;
  return leads.filter((l) => {
    if (q && !`${l.nome} ${l.empresa} ${l.telefone} ${l.email || ""}`.toLowerCase().includes(q)) return false;
    if (anf && (l.anfitriao || "") !== anf) return false;
    if (garg && gargaloReal(l.resp) !== garg) return false;
    if (st && estado(l) !== (st === "abandonou" ? "so_cadastro" : st)) return false;
    return true;
  });
}

function soDigitos(t) { return String(t || "").replace(/\D/g, ""); }

function mensagemWhats(l) {
  const primeiro = (l.nome || "").split(" ")[0];
  const g = gargaloReal(l.resp) ? nomeGargalo(l.resp.gargalo_principal).toLowerCase() : null;
  return g
    ? `Olá, ${primeiro}! Aqui é da V4 Carvalho. Vi o seu Mapa de Gargalos de hoje no evento: o ponto que mais pesa na ${l.empresa} é ${g}. Posso te mostrar em 15 minutos como empresas parecidas resolveram isso?`
    : `Olá, ${primeiro}! Aqui é da V4 Carvalho. Foi um prazer ter você no evento. Posso te mandar o Mapa de Gargalos da ${l.empresa} e conversar 15 minutos sobre ele?`;
}

function detalhe(l) {
  const r = l.resp, a = r ? r.respostas || {} : {};
  const linhas = [
    ["E-mail", l.email || "—"], 
    ["Porte", a.porte], ["Setor", a.setor], ["Situações (em ordem)", Array.isArray(a.situacoes) ? a.situacoes.map(nomeGargalo).join(" › ") : null], ["Área com mais dor", a.area_dor], ["Maior dor", a.maior_dor ? nomeGargalo(a.maior_dor) : null],
    ["Faturamento", a.faturamento], ["Maturidade em IA", a.maturidade_ia],
    ["Número importante da empresa", GUIA[a.guia_numero]], ["Se a demanda dobrar, quebra primeiro", GUIA[a.guia_demanda]], ["Impacto", a.impacto], ["Horas perdidas/semana", a.horas_perdidas], ["Prazo", a.prazo],
    ["Quem decide", a.quem_decide], ["Investimento mensal", a.investimento],
    ["Ferramentas", Array.isArray(a.ferramentas) ? a.ferramentas.join(", ") : a.ferramentas],
  ].filter(([, v]) => v != null && v !== "");
  const abertas = ABERTAS.map(([k, rotulo]) => [rotulo, a[k] || (k === "dor_aberta" ? a.texto_livre : null)]).filter(([, v]) => v);
  const est = r && r.mapa && r.mapa.estimativa;
  const t3 = top3(r);
  const caixa = el("div", {},
    el("dl", {}, linhas.flatMap(([k, v]) => [el("dt", {}, k), el("dd", {}, String(v))])),
    abertas.length ? el("div", {}, el("h3", {}, "Nas palavras do participante"), abertas.map(([rotulo, v]) => el("p", { style: "margin:0 0 8px;line-height:1.45" }, el("b", { style: "color:var(--text2);font-weight:500" }, rotulo + ": "), v))) : null,
    t3.length ? el("div", {}, el("h3", {}, "Top 3 gargalos (pontuação)"), el("div", {}, t3.map(([g, s]) => el("span", { class: "tag p", style: "margin-right:6px" }, `${nomeGargalo(g)} · ${s}`)))) : el("p", { class: "vazio" }, estado(l) === "parcial" ? `Parou antes do fim (${ETAPA[l.resp.mapa.etapa] || "no meio"}). O que já respondeu está acima.` : "Só se cadastrou: não respondeu o diagnóstico. O contato já está autorizado."),
    est ? el("p", {}, `Custo estimado do maior problema: ${brl(est.valor_mes)}/mês (${est.horas_semana} h/semana).`) : null,
    el("div", { class: "acoes" },
      soDigitos(l.telefone) ? el("a", { class: "btn p", href: `https://wa.me/${soDigitos(l.telefone)}?text=${encodeURIComponent(mensagemWhats(l))}`, target: "_blank", rel: "noopener noreferrer" }, "Abrir WhatsApp com mensagem") : null,
      el("button", { class: "btn", type: "button", onclick: () => copiarResumo(l) }, "Copiar resumo para o CRM")));
  return caixa;
}

async function copiarResumo(l) {
  const t3 = top3(l.resp).map(([g, s]) => `${nomeGargalo(g)} (${s})`).join(", ");
  const txt = [`${l.nome} · ${l.empresa}`, `Tel: ${l.telefone}${l.email ? " · " + l.email : ""}`, l.anfitriao ? `Anfitrião: ${l.anfitriao}` : null, t3 ? `Gargalos: ${t3}` : estado(l) === "parcial" ? "Parou no meio do diagnóstico" : "Só se cadastrou"].filter(Boolean).join("\n");
  try { await navigator.clipboard.writeText(txt); $("msg-app").textContent = "Resumo copiado."; } catch { $("msg-app").textContent = "Não consegui copiar automaticamente."; }
}

function desenharTabela() {
  const lista = filtrados();
  const corpo = $("corpo");
  corpo.replaceChildren();
  $("vazio").hidden = lista.length > 0;
  for (const l of lista) {
    const r = l.resp;
    const linha = el("tr", { class: "lead", tabindex: "0" },
      el("td", {}, dataBR(l.created_at)), el("td", {}, l.nome), el("td", {}, l.empresa),
      el("td", {}, l.telefone), el("td", {}, l.anfitriao || "—"),
      el("td", {}, gargaloReal(r) ? el("span", { class: "tag p" }, nomeGargalo(r.gargalo_principal)) : "—"),
      el("td", {}, estado(l) === "concluiu" ? el("span", { class: "tag ok" }, "Concluiu") : estado(l) === "parcial" ? el("span", { class: "tag w" }, "Parou no meio") : el("span", { class: "tag" }, "Só cadastro")));
    const det = el("tr", { class: "det", hidden: true }, el("td", { colspan: "7" }, detalhe(l)));
    const alternar = () => { det.hidden = !det.hidden; };
    linha.addEventListener("click", alternar);
    linha.addEventListener("keydown", (e) => { if (e.key === "Enter") alternar(); });
    corpo.append(linha, det);
  }
}

function desenharResumo() {
  const total = leads.length, comp = leads.filter((l) => estado(l) === "concluiu").length, meio = leads.filter((l) => estado(l) === "parcial").length;
  const cont = {}, porAnf = {};
  for (const l of leads) {
    if (gargaloReal(l.resp)) cont[l.resp.gargalo_principal] = (cont[l.resp.gargalo_principal] || 0) + 1;
    const a = l.anfitriao || "sem anfitrião";
    porAnf[a] = porAnf[a] || { leads: 0, comp: 0 };
    porAnf[a].leads++; if (estado(l) === "concluiu") porAnf[a].comp++;
  }
  const maisComum = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
  const kpi = (v, rotulo) => el("div", { class: "kpi" }, el("b", {}, String(v)), el("span", {}, rotulo));
  $("kpis").replaceChildren(
    kpi(total, "leads captados"), kpi(comp, "diagnósticos concluídos"),
    kpi(meio, "pararam no meio (com respostas parciais)"), kpi(total ? Math.round((comp / total) * 100) + "%" : "—", "taxa de conclusão"),
    kpi(maisComum ? nomeGargalo(maisComum[0]) : "—", "gargalo mais comum"), kpi(Object.keys(porAnf).length, "anfitriões"));
  const max = Math.max(1, ...Object.values(cont));
  $("dist").replaceChildren(...(Object.keys(cont).length ? Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([g, n]) =>
    el("div", { class: "barra" }, el("span", {}, nomeGargalo(g)), el("div", {}, el("i", { style: `width:${Math.round((n / max) * 100)}%` })), el("span", {}, String(n)))) : [el("p", { class: "vazio" }, "Sem diagnósticos ainda.")]));
  $("por-anf").replaceChildren(...Object.entries(porAnf).sort((a, b) => b[1].leads - a[1].leads).map(([a, v]) =>
    el("div", { class: "barra" }, el("span", {}, a), el("span", { style: "grid-column: 2 / 4; color: var(--text2)" }, `${v.leads} ${v.leads === 1 ? "lead" : "leads"} · ${v.comp} ${v.comp === 1 ? "concluiu" : "concluíram"}`))));
  const selA = $("f-anfitriao"), selG = $("f-gargalo");
  const marcaA = selA.value, marcaG = selG.value;
  selA.replaceChildren(el("option", { value: "" }, "Todos os anfitriões"), ...Object.keys(porAnf).filter((a) => a !== "sem anfitrião").sort().map((a) => el("option", { value: a }, a)));
  selG.replaceChildren(el("option", { value: "" }, "Todos os gargalos"), ...Object.keys(GARGALOS).map((g) => el("option", { value: g }, GARGALOS[g].nome)));
  selA.value = marcaA; selG.value = marcaG;
}

// ---------- CSV ----------
const celula = (v) => {
  let s = v == null ? "" : String(v).replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(s)) s = "'" + s; // evita fórmula ao abrir no Excel/Sheets
  return `"${s.replace(/"/g, '""')}"`;
};
function exportarCSV() {
  const cab = ["data", "nome", "empresa", "cargo", "telefone", "email", "anfitriao", "status", "gargalo_1", "pontos_1", "gargalo_2", "gargalo_3", "porte", "setor", "area_dor", "maior_dor", "impacto", "horas_semana", "prazo", "faturamento", "quem_decide", "investimento", "dor_aberta", "historia", "ultima_vez", "ja_tentou", "varinha", "extra_final", "autorizou_contato"];
  const linhas = filtrados().map((l) => {
    const a = (l.resp && l.resp.respostas) || {}, t = top3(l.resp);
    return [l.created_at, l.nome, l.empresa, l.cargo, l.telefone, l.email, l.anfitriao, estado(l) === "concluiu" ? "concluiu" : estado(l) === "parcial" ? "parou_no_meio" : "so_cadastro",
      t[0] ? nomeGargalo(t[0][0]) : "", t[0] ? t[0][1] : "", t[1] ? nomeGargalo(t[1][0]) : "", t[2] ? nomeGargalo(t[2][0]) : "",
      a.porte, a.setor, a.area_dor, a.maior_dor ? nomeGargalo(a.maior_dor) : "", a.impacto, a.horas_perdidas, a.prazo, a.faturamento, a.quem_decide, a.investimento, a.dor_aberta || a.texto_livre, a.historia, a.ultima_vez, a.ja_tentou, a.varinha, a.extra_final, l.consentimento ? "sim" : "nao"].map(celula).join(",");
  });
  const blob = new Blob(["﻿" + [cab.join(","), ...linhas].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `leads-evento-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a); a.click(); a.remove();
}

// ---------- início ----------
let entrando = false;
async function entrar(session) {
  if (entrando) return;
  entrando = true;
  $("email").textContent = session.user.email;
  $("quem").hidden = false;
  const { data: ok, error } = await sb.rpc("evento_is_v4");
  if (error || ok !== true) { mostrar("negado"); return; }
  mostrar("app");
  $("msg-app").textContent = "Carregando…";
  try {
    leads = await carregarLeads();
    $("msg-app").textContent = "";
    desenharResumo(); desenharTabela();
  } catch {
    $("msg-app").textContent = "Não consegui carregar os leads. Recarregue a página.";
  }
}

for (const id of ["busca", "f-anfitriao", "f-gargalo", "f-status"]) $(id).addEventListener("input", desenharTabela);
$("csv").addEventListener("click", exportarCSV);

const { data } = await sb.auth.getSession();
if (data.session) await entrar(data.session); else mostrar("login");
sb.auth.onAuthStateChange((evento, session) => { if (evento === "SIGNED_IN" && session) entrar(session); });
