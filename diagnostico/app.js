import { montarMapa, pontuar } from "./motor.mjs";
import { GARGALOS, CURTO } from "./gargalos.mjs";

// Chaves públicas por desenho: a tabela só aceita INSERT (RLS), nunca leitura.
const SUPABASE_URL = "https://lbqmanwfgnhugjefluzy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Y6QoY26FFpatQoHpWw-rAw_CwzVmRFE";
const MAX_AUDIO_S = 90;

// Celulares antigos (iOS < 15.4 / < 14): sem crypto.randomUUID e sem replaceChildren.
if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function (...nos) { while (this.firstChild) this.removeChild(this.firstChild); this.append(...nos); };
}
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

const $chat = document.getElementById("chat");
const $dock = document.getElementById("dock");
const $barra = document.getElementById("barra");
const $passo = document.getElementById("passo");
const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

const qs = new URLSearchParams(location.search);
const anfitriao = (qs.get("anfitriao") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60) || null;

const resp = {};
let perguntas, casos, passos;
let idx = 0;
let minVoltar = 0;     // primeira pergunta depois do consentimento: não dá para voltar para a identificação
const marcas = [];     // tamanho da conversa logo antes de cada pergunta (para o botão Voltar)
const leadId = uuid();
let gravacao = null;      // gravação de áudio em andamento

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
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const rolar = () => requestAnimationFrame(() => { $chat.scrollTop = $chat.scrollHeight; });
// append() do DOM escreve "null" na tela se receber null: filtramos os itens vazios.
const montarDock = (...itens) => $dock.append(...itens.filter(Boolean));
const limparDock = () => { if (gravacao) { gravacao.cancelar(); gravacao = null; } $dock.replaceChildren(); };
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const primeiroNome = () => (resp.nome || "").trim().split(/\s+/)[0] || "";
const tpl = (t) => t.replace("{nome}", primeiroNome());
const sorteia = (a) => a[Math.floor(Math.random() * a.length)];
const ICONES = {
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  enviar: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  parar: '<svg viewBox="0 0 24 24" style="fill:currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
};
const icone = (nome) => { const s = h("span", { style: "display:grid;place-items:center" }); s.innerHTML = ICONES[nome]; return s; };

// ---------- conversa com "tempo de pensamento" ----------
function tempoDigitando(texto, rapido) {
  if (reduz) return 150;
  const base = (rapido ? 380 : 650) + texto.length * (rapido ? 8 : 14);
  return Math.min(rapido ? 800 : 1900, base) + Math.random() * 220;
}
async function falar(texto, rapido = false) {
  const t = tpl(texto);
  const d = h("div", { class: "bolha bot digitando", "aria-label": "Digitando" }, h("span"), h("span"), h("span"));
  $chat.append(d); rolar();
  await pausa(tempoDigitando(t, rapido));
  d.remove();
  $chat.append(h("div", { class: "bolha bot" }, t)); rolar();
}
const eu = (t, pulou = false) => { $chat.append(h("div", { class: "bolha eu" + (pulou ? " pulou" : "") }, t)); rolar(); };

function atualizarProgresso() {
  $barra.style.width = `${Math.round((idx / passos.length) * 100)}%`;
  $passo.textContent = idx < passos.length ? `${idx + 1}/${passos.length}` : "";
}

// ---------- persistência (insert-only) ----------
// Regras: 23505 (já existe) = salvo; erro 4xx de validação = definitivo (não adianta repetir);
// rede/5xx/429/FK (lead ainda não chegou) = tenta de novo. keepalive deixa o envio terminar mesmo se a aba fechar.
async function inserir(tabela, linha) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
      method: "POST", signal: ctl.signal, keepalive: true,
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(linha),
    });
    if (r.ok) return;
    let codigo = "";
    try { codigo = (await r.json()).code || ""; } catch {}
    if (r.status === 409 && codigo === "23505") return; // reenvio de algo que já estava salvo
    const e = new Error(`${tabela} ${r.status} ${codigo}`);
    e.definitivo = r.status >= 400 && r.status < 500 && ![408, 409, 429].includes(r.status);
    throw e;
  } finally { clearTimeout(t); }
}
const lerFila = () => { try { return JSON.parse(localStorage.getItem("v4_fila") || "[]"); } catch { return []; } };
const gravarFila = (q) => { try { localStorage.setItem("v4_fila", JSON.stringify(q)); } catch {} };
function fila(tabela, linha) { const q = lerFila(); q.push({ tabela, linha }); gravarFila(q); }
async function salvar(tabela, linha) {
  for (let t = 0; t < 3; t++) {
    try { await inserir(tabela, linha); return true; }
    catch (e) { if (e.definitivo) { console.warn("não foi possível salvar:", e.message); return false; } await pausa(800 * (t + 1)); }
  }
  fila(tabela, linha); // sem conexão: reenvia quando a rede voltar (evento "online", a cada 20 s ou na próxima visita)
  return false;
}
let reenviando = false;
async function reenviarFila() {
  if (reenviando) return;
  reenviando = true;
  try {
    const feitos = new Set();
    for (const it of lerFila()) {
      try { await inserir(it.tabela, it.linha); feitos.add(JSON.stringify(it)); }
      catch (e) { if (e.definitivo) feitos.add(JSON.stringify(it)); else break; } // mantém a ordem: lead antes das respostas
    }
    if (feitos.size) gravarFila(lerFila().filter((it) => !feitos.has(JSON.stringify(it))));
  } finally { reenviando = false; }
}
window.addEventListener("online", reenviarFila);
setInterval(() => { if (lerFila().length) reenviarFila(); }, 20000);

// O lead é gravado assim que o telefone é informado (antes do diagnóstico): entra no CRM mesmo se a pessoa abandonar.
function salvarLead() {
  salvar("evento_leads", { id: leadId, nome: resp.nome, empresa: resp.empresa, cargo: "Não informado", telefone: resp.telefone, email: null, consentimento: true, anfitriao });
}

// ---------- fluxo ----------
function normalizarTel(v) {
  const d = v.replace(/\D/g, "");
  if (v.trim().startsWith("+")) return d.length >= 8 && d.length <= 15 ? `+${d}` : null; // número internacional
  if (d.length < 10 || d.length > 13) return null;
  return d.length <= 11 ? `+55${d}` : `+${d}`;
}

// Guarda o que já foi respondido ao fim de cada etapa. Se a pessoa abandonar, o comercial ainda recebe
// o contexto até ali (o painel usa a linha mais recente). A linha final, com o Mapa, substitui estas.
function checkpoint(etapaId) {
  const { scores, ranking } = pontuar(resp, perguntas);
  const temEscala = Array.isArray(resp.situacoes);
  salvar("evento_respostas", { id: uuid(), lead_id: leadId, respostas: { ...resp }, scores, gargalo_principal: temEscala ? ranking[0] : "pendente", mapa: { parcial: true, etapa: etapaId }, texto_ia: false });
}

async function proximo() {
  if (idx >= passos.length) return finalizar();
  const { etapa, p, primeira } = passos[idx];
  limparDock();
  atualizarProgresso();
  if (primeira && idx > 0 && passos[idx - 1].etapa.id !== "identificacao") checkpoint(passos[idx - 1].etapa.id);
  if (primeira) {
    $chat.append(h("div", { class: "etapa" }, etapa.titulo));
    for (const m of etapa.abertura || []) await falar(m);
  }
  marcas[idx] = $chat.children.length;
  await falar(p.texto, p.tipo === "escala");
  renderEntrada(p);
}

async function responder(p, valor, rotulo, pulou = false) {
  limparDock();
  resp[p.id] = valor;
  eu(rotulo, pulou);
  idx++;
  if (p.id === "telefone") { minVoltar = idx; salvarLead(); }
  if (p.tipo === "aberta" && !pulou) await falar(sorteia(["Anotado, obrigado por contar.", "Entendi. Isso ajuda muito.", "Boa, isso é exatamente o que eu queria saber."]), true);
  else await pausa(reduz ? 0 : 250);
  proximo();
}

async function voltar() {
  if (idx <= minVoltar) return;
  idx--;
  delete resp[passos[idx].p.id];
  while ($chat.children.length > marcas[idx]) $chat.lastChild.remove();
  limparDock();
  atualizarProgresso();
  await falar(passos[idx].p.texto, true);
  renderEntrada(passos[idx].p);
}

const botaoVoltar = () => (idx > minVoltar ? h("button", { class: "btn sec", type: "button", onclick: voltar }, "↩ Voltar") : null);

// ---------- entradas ----------
function opcoesDe(p) {
  if (p.tipo === "escala") return perguntas.escala_frequencia;
  if (p.opcoes_de === "top_gargalos") {
    const { ranking } = pontuar(resp, perguntas);
    return ranking.slice(0, 4).map((g) => ({ valor: g, label: CURTO[g] }));
  }
  return p.opcoes;
}

function grade(opcs) { return opcs.length <= 6 && opcs.every((o) => String(o.label).length <= 22); }

function renderEntrada(p) {
  limparDock();
  if (p.tipo === "escolha_unica" || p.tipo === "escala") {
    const opcs = opcoesDe(p);
    montarDock(
      p.tipo === "escala" ? h("p", { class: "titulo-dock" }, "Com que frequência isso acontece?") : null,
      h("div", { class: "opcoes " + (p.tipo === "escala" || grade(opcs) ? "grade" : "lista") },
        opcs.map((o) => h("button", { class: "op", type: "button", onclick: () => responder(p, o.valor, o.label) }, o.label))),
      p.opcional || botaoVoltar() ? h("div", { class: "rodape" }, botaoVoltar(), p.opcional ? h("button", { class: "btn sec", type: "button", onclick: () => responder(p, null, "Prefiro não responder", true) }, "Pular") : null) : null);
  } else if (p.tipo === "multipla") {
    const sel = []; // na ordem do toque: a primeira escolha é a que mais pesa
    const min = p.min || 1, max = p.max || p.opcoes.length;
    const rotulo = (o) => o.label;
    const ok = h("button", { class: "btn", type: "button", disabled: true, style: "margin-top:8px", onclick: () => {
      const opcs = sel.map((v) => p.opcoes.find((o) => o.valor === v));
      responder(p, sel.slice(), opcs.map(rotulo).join("; "));
    } }, "Continuar");
    const atualizar = () => {
      ok.disabled = sel.length < min;
      ok.textContent = max > 1 && p.min ? `Continuar (${sel.length}/${max})` : "Continuar";
      botoes.forEach((b, i) => {
        const pos = sel.indexOf(p.opcoes[i].valor);
        b.classList.toggle("on", pos >= 0);
        b.setAttribute("aria-pressed", pos >= 0);
        b.dataset.pos = pos >= 0 && max > 1 ? String(pos + 1) : "";
      });
    };
    const botoes = p.opcoes.map((o) => h("button", { class: "op", type: "button", "aria-pressed": "false", onclick: () => {
      const pos = sel.indexOf(o.valor);
      if (pos >= 0) sel.splice(pos, 1);
      else if (sel.length < max) sel.push(o.valor);
      atualizar();
    } }, o.label));
    montarDock(h("div", { class: "opcoes " + (grade(p.opcoes) ? "grade" : "lista") }, botoes), ok, botaoVoltar() ? h("div", { class: "rodape" }, botaoVoltar()) : null);
    atualizar();
  } else if (p.tipo === "aceite") {
    montarDock(h("button", { class: "btn", type: "button", onclick: () => {
      minVoltar = idx + 1;
      responder(p, true, p.botao || "Concordo");
      salvarLead();
    } }, p.botao || "Concordo"));
  } else if (p.tipo === "aberta") {
    renderAberta(p);
  } else {
    renderCampo(p);
  }
  // Campos curtos abrem o teclado sozinhos; na pergunta aberta o teclado só abre no computador,
  // para o celular mostrar o botão do microfone primeiro.
  const curto = $dock.querySelector("input");
  if (curto) curto.focus({ preventScroll: true });
  else if (p.tipo === "aberta" && matchMedia("(hover: hover)").matches) $dock.querySelector("textarea").focus({ preventScroll: true });
}

function renderCampo(p) {
  const erro = h("p", { class: "erro", hidden: true });
  const input = h("input", {
    type: p.tipo === "telefone" ? "tel" : "text", inputmode: p.tipo === "telefone" ? "tel" : "text",
    autocomplete: p.id === "nome" ? "name" : p.tipo === "telefone" ? "tel" : "off", autocapitalize: p.id === "nome" || p.id === "empresa" || p.id === "cargo" ? "words" : "off",
    placeholder: p.placeholder || "", maxlength: p.id === "empresa" ? 160 : 120, enterkeyhint: "send", "aria-label": p.texto,
  });
  const mostrar = (t) => { erro.textContent = t; erro.hidden = false; };
  const enviar = () => {
    let v = input.value.trim();
    if (!v) return mostrar("Preencha para continuar.");
    if (p.tipo === "telefone") { v = normalizarTel(v); if (!v) return mostrar("Informe o WhatsApp com DDD."); }
    if (v.length < 2) return mostrar("Muito curto.");
    responder(p, v, p.tipo === "telefone" ? input.value.trim() : v);
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") enviar(); });
  const env = h("button", { class: "redondo env", type: "button", "aria-label": "Enviar", onclick: enviar }, icone("enviar"));
  montarDock(erro, h("div", { class: "linha" }, input, env), botaoVoltar() ? h("div", { class: "rodape" }, botaoVoltar()) : null);
}

// ---------- pergunta aberta: texto ou áudio ----------
const podeGravar = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

function renderAberta(p) {
  const area = h("div", {});
  const ta = h("textarea", { rows: "1", placeholder: "Escreva ou grave", "aria-label": p.texto, maxlength: 4000, enterkeyhint: "enter" });
  const env = h("button", { class: "redondo env", type: "button", "aria-label": "Enviar resposta", disabled: true }, icone("enviar"));
  const erro = h("p", { class: "erro", hidden: true });
  const crescer = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, window.innerHeight * 0.32) + "px"; env.disabled = !ta.value.trim(); };
  ta.addEventListener("input", crescer);
  env.addEventListener("click", () => { const v = ta.value.trim(); if (v) responder(p, v, v); });
  const mic = podeGravar ? h("button", { class: "redondo", type: "button", "aria-label": "Gravar áudio", onclick: () => iniciarGravacao(p, area, ta, erro, crescer) }, icone("mic")) : null;
  area.append(h("div", { class: "linha" }, mic, ta, env));
  montarDock(
    p.dica ? h("p", { class: "dica" }, p.dica + (podeGravar ? " O áudio vira texto e não fica salvo." : "")) : null,
    erro, area,
    h("div", { class: "rodape" }, botaoVoltar(), p.opcional ? h("button", { class: "btn sec", type: "button", onclick: () => responder(p, null, "Prefiro pular", true) }, "Pular") : null));
}

async function iniciarGravacao(p, area, ta, erro, crescer) {
  erro.hidden = true;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { erro.textContent = "Não consegui acessar o microfone. Escreva a resposta, ou libere o microfone no navegador."; erro.hidden = false; return; }
  const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
  const partes = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) partes.push(e.data); };
  const t0 = Date.now();
  const tempo = h("span", { class: "tempo" }, "0:00");
  const tick = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    tempo.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    if (s >= MAX_AUDIO_S) parar();
  }, 250);
  const parar = () => { if (rec.state !== "inactive") rec.stop(); };
  const cancelar = () => { clearInterval(tick); rec.onstop = null; try { rec.stop(); } catch {} stream.getTracks().forEach((t) => t.stop()); area.replaceChildren(...voltarAoTexto); };
  const voltarAoTexto = [...area.childNodes];
  gravacao = { cancelar };
  area.replaceChildren(h("div", { class: "gravando" },
    h("span", { class: "ponto" }), tempo, h("span", { class: "txt" }, "Gravando… toque para parar"),
    h("button", { class: "redondo para", type: "button", "aria-label": "Parar gravação", onclick: parar }, icone("parar"))));
  rec.onstop = async () => {
    clearInterval(tick);
    stream.getTracks().forEach((t) => t.stop());
    gravacao = null;
    area.replaceChildren(h("div", { class: "transc" }, h("span", { class: "giro" }), "Transformando em texto…"));
    const blob = new Blob(partes, { type: rec.mimeType || mime || "audio/webm" });
    let texto = "", falha = null;
    if (Date.now() - t0 < 1200) falha = "O áudio ficou muito curto. Tente de novo ou escreva.";
    else {
      try { texto = await transcrever(blob); if (!texto) falha = "Não consegui entender o áudio. Tente de novo mais perto do microfone, ou escreva."; }
      catch { falha = "Não consegui transformar o áudio em texto agora. Escreva a resposta, ou tente de novo."; }
    }
    area.replaceChildren(...voltarAoTexto);
    if (falha) { erro.textContent = falha; erro.hidden = false; }
    if (texto) { ta.value = (ta.value ? ta.value.trim() + " " : "") + texto; }
    crescer(); ta.focus({ preventScroll: true });
  };
  rec.start(1000);
}

async function transcrever(blob) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30000);
  try {
    const r = await fetch("/api/transcrever", { method: "POST", signal: ctl.signal, headers: { "Content-Type": blob.type.split(";")[0] }, body: blob });
    if (!r.ok) throw new Error(String(r.status));
    const texto = ((await r.json()).texto || "").trim();
    return /[\p{L}\p{N}]{2}/u.test(texto) ? texto : ""; // "." ou "..." = sem fala
  } finally { clearTimeout(t); }
}

// ---------- resultado ----------
function relatoParaIA() {
  return [resp.dor_aberta, resp.historia].filter(Boolean).join(" | ").slice(0, 650);
}

async function personalizar(mapa) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 11000);
  try {
    const r = await fetch("/api/mapa", {
      method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        perfil: { empresa: resp.empresa, cargo: resp.cargo, porte: resp.porte, setor: resp.setor, area_dor: resp.area_dor, impacto: resp.impacto, prazo: resp.prazo, texto_livre: relatoParaIA() },
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
  limparDock();
  $barra.style.width = "100%"; $passo.textContent = "";
  await falar("Pronto, {nome}. Já tenho tudo que preciso.");
  const dig = h("div", { class: "bolha bot digitando" }, h("span"), h("span"), h("span"));
  const aviso = falar("Estou cruzando as suas respostas com o banco de casos reais e montando o seu Mapa de Gargalos e Oportunidades…", true);
  await aviso;
  $chat.append(dig); rolar();
  let mapa = montarMapa(resp, perguntas, casos);
  if (!mapa.itens.length) { dig.remove(); return falar("Não consegui montar o Mapa de Gargalos e Oportunidades. Chame alguém da equipe V4."); }
  mapa = await personalizar(mapa);
  dig.remove();
  const gravou = salvar("evento_respostas", { id: uuid(), lead_id: leadId, respostas: resp, scores: mapa.scores, gargalo_principal: mapa.gargalo_principal, mapa: { itens: mapa.itens.map((i) => ({ gargalo: i.gargalo, rank: i.rank, casos: i.casos.map((c) => c.id) })), estimativa: mapa.estimativa }, texto_ia: mapa.ia });
  renderMapa(mapa);
  const statusSalvo = document.getElementById("status-salvo");
  if (statusSalvo) gravou.then((ok) => {
    statusSalvo.textContent = ok ? "✓ Suas respostas foram registradas." : "Sem conexão agora: vamos reenviar as suas respostas assim que a internet voltar. Mantenha esta página aberta.";
    statusSalvo.className = "status-salvo " + (ok ? "ok" : "pend");
  });
}

const FORCA = { forte: "Verificado na fonte", media: "Relato com ressalva" };
const PORTE = { pequena: "pequena", media: "média", grande: "grande" };
// Só a faixa do porte confirmado: o número exato de funcionários nem sempre é confiável nas fontes.
const FAIXA = { pequena: "até 50 funcionários", media: "51 a 500 funcionários", grande: "mais de 500 funcionários" };

function cartaoCaso(c) {
  const nome = c.empresa || c.titulo;
  const mets = (c.metricas || []).filter((m) => m.indicador && (m.depois || m.variacao)).slice(0, 3);
  return h("div", { class: "caso" },
    h("strong", {}, nome),
    h("p", {}, h("b", {}, "Problema: "), c.problema),
    h("p", {}, h("b", {}, "O que fizeram: "), c.solucao),
    h("p", {}, h("b", {}, "Resultado: "), c.resultado),
    mets.length ? h("div", {}, mets.map((m) => h("span", { class: "tag p" }, `${m.indicador}: ${m.antes ? m.antes + " → " : ""}${m.depois || m.variacao}`))) : null,
    c.como_replicar && c.como_replicar.length ? h("div", { class: "passo" }, h("h4", {}, "Como replicar"), h("ul", {}, c.como_replicar.map((q) => h("li", {}, q)))) : null,
    c.esforco_implantacao ? h("p", {}, h("b", {}, "Esforço: "), c.esforco_implantacao) : null,
    h("span", { class: "tag" }, FORCA[c.forca] || c.forca),
    h("span", { class: "tag" }, `${c.pais}${c.data_fonte ? ", " + String(c.data_fonte).slice(0, 4) : ""}`),
    h("span", { class: "tag" }, c.porte_confirmado ? `Empresa ${PORTE[c.porte]} (${FAIXA[c.porte]})` : `Porte ${PORTE[c.porte]} (estimado)`),
    c.outro_porte ? h("span", { class: "tag" }, "Porte diferente do seu: o princípio se adapta") : null,
    h("div", {}, h("a", { href: c.fonte_url, target: "_blank", rel: "noopener noreferrer" }, c.fonte_nome || "Fonte")));
}

// Só o Mapa vai para o PDF: o CSS de impressão esconde a conversa, o cabeçalho e os botões.
// O título da página vira o nome do arquivo sugerido ao salvar.
function salvarPDF() {
  const original = document.title;
  const limpo = (resp.empresa || "empresa").replace(/[^\p{L}\p{N} ]/gu, "").trim().slice(0, 40);
  document.title = `Mapa de Gargalos e Oportunidades - ${limpo}`;
  const restaurar = () => { document.title = original; window.removeEventListener("afterprint", restaurar); };
  window.addEventListener("afterprint", restaurar);
  window.print();
}

function renderMapa(m) {
  const nome = primeiroNome();
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const el = h("section", { class: "mapa" },
    h("p", { class: "status-salvo", id: "status-salvo" }, "Registrando as suas respostas…"),
    h("div", { class: "so-impressao cabecalho-pdf" }, h("b", {}, "V4 Carvalho"), h("span", {}, `Mapa de Gargalos e Oportunidades · ${resp.empresa} · ${hoje}`)),
    h("div", { class: "etapa" }, "Seu resultado"),
    h("h2", {}, `${nome ? nome + ", este" : "Este"} é o Mapa de Gargalos e Oportunidades de ${resp.empresa}`),
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
      h("div", { class: "passo" }, h("h4", {}, "Quem já fez, com fonte"), i.casos.map(cartaoCaso)))),
    h("p", { class: "nota" }, "Os resultados dos casos foram reportados pelas próprias empresas ou fornecedores nas fontes indicadas e não são promessa de resultado. O texto deste Mapa foi " + (m.ia ? "personalizado com IA a partir" : "montado a partir") + " das suas respostas e do banco de casos da V4 Carvalho."),
    h("div", { class: "acoes" }, h("button", { class: "btn", type: "button", onclick: salvarPDF }, "Salvar em PDF")));
  $chat.append(el);
  $chat.scrollTop = el.offsetTop - 12;
}

// ---------- teclado do celular: a área útil acompanha o visualViewport ----------
const vv = window.visualViewport;
function ajustarAltura() {
  document.documentElement.style.setProperty("--vvh", (vv ? vv.height : window.innerHeight) + "px");
  window.scrollTo(0, 0);
  rolar();
}
if (vv) { vv.addEventListener("resize", ajustarAltura); vv.addEventListener("scroll", () => window.scrollTo(0, 0)); }
ajustarAltura();

// ---------- início ----------
async function iniciar() {
  try {
    [perguntas, casos] = await Promise.all([
      fetch("../data/perguntas.json").then((r) => r.json()),
      fetch("../data/pesquisa/casos-final.json").then((r) => r.json()),
    ]);
  } catch {
    $chat.append(h("p", { class: "erro" }, "Não consegui carregar o diagnóstico. Verifique a conexão e recarregue."));
    return;
  }
  passos = perguntas.etapas.flatMap((etapa) => etapa.perguntas.map((p, i) => ({ etapa, p, primeira: i === 0 })));
  reenviarFila();
  $chat.append(h("div", { class: "capa" },
    h("h1", {}, "Onde a sua empresa trava?"),
    h("p", {}, "Em 10 perguntas rápidas você recebe o seu Mapa de Gargalos e Oportunidades, com aplicações reais de IA e automação e casos de quem já fez.")));
  montarDock(h("button", { class: "btn", type: "button", onclick: () => { $chat.replaceChildren(); proximo(); } }, "Começar"));
}
iniciar();
