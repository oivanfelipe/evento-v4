// Transforma o áudio de uma resposta aberta em texto (Whisper na Groq).
// O áudio não é guardado nem registrado em log: entra, vira texto e sai.

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";
const MAX_BYTES = 3_500_000; // abaixo do limite de 4,5 MB do corpo na Vercel (~90 s de áudio comprimido)
const MIN_BYTES = 1_500;

const EXT = { "audio/webm": "webm", "audio/mp4": "mp4", "audio/x-m4a": "m4a", "audio/m4a": "m4a", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3", "audio/aac": "aac" };

async function lerCorpo(req) {
  const partes = [];
  let total = 0;
  for await (const p of req) {
    total += p.length;
    if (total > MAX_BYTES) return null;
    partes.push(p);
  }
  return Buffer.concat(partes);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "metodo" });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ erro: "ia_indisponivel" });

  const tipo = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (!EXT[tipo]) return res.status(415).json({ erro: "tipo" });

  const audio = await lerCorpo(req);
  if (audio === null) return res.status(413).json({ erro: "grande" });
  if (audio.length < MIN_BYTES) return res.status(400).json({ erro: "curto" });

  const form = new FormData();
  form.append("file", new Blob([audio], { type: tipo }), `resposta.${EXT[tipo]}`);
  form.append("model", MODEL);
  form.append("language", "pt");
  form.append("temperature", "0");
  form.append("response_format", "json");

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(GROQ_URL, { method: "POST", signal: ctl.signal, headers: { Authorization: `Bearer ${key}` }, body: form });
    if (!r.ok) {
      console.error("transcrever: groq respondeu", r.status);
      return res.status(502).json({ erro: "groq", status: r.status });
    }
    const data = await r.json();
    let texto = String((data && data.text) || "").replace(/\s+/g, " ").trim().slice(0, 4000);
    if (!/[\p{L}\p{N}]{2}/u.test(texto)) texto = ""; // áudio sem fala volta como "." ou "..."
    return res.status(200).json({ texto });
  } catch (e) {
    return res.status(504).json({ erro: "timeout" });
  } finally {
    clearTimeout(t);
  }
};
