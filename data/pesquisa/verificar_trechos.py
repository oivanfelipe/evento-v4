#!/usr/bin/env python3
"""Confere, no HTML bruto da fonte, o `trecho_comprovante` e os números do `resultado`
de cada caso de casos-final.json. Grava v2/verificacao-bruta.json.

Status por caso:
  trecho_ok        trecho literal (normalizado) encontrado na página
  trecho_parcial   >=60% dos blocos de 4 palavras do trecho encontrados
  numeros_ok       trecho não achado, mas os números-chave do resultado aparecem na página
  nao_encontrado   página lida, trecho e números ausentes (candidato a rebaixar)
  indisponivel     página não pôde ser baixada (403/404/timeout/PDF/JS): não prova nada
"""
import json, os, re, subprocess, sys, unicodedata, html
from concurrent.futures import ThreadPoolExecutor

AQUI = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def norm(t):
    t = unicodedata.normalize("NFKD", html.unescape(t or "")).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9% ]+", " ", t.lower())
    return re.sub(r"\s+", " ", t).strip()


def baixar(url):
    try:
        r = subprocess.run(["curl", "-sL", "--max-time", "25", "-A", UA, "-w", "\n%{http_code}", url],
                           capture_output=True, timeout=40)
    except Exception:
        return None, "erro"
    out = r.stdout.decode("utf-8", "ignore")
    corpo, _, code = out.rpartition("\n")
    if not code.startswith("2") or len(corpo) < 500:
        return None, code or "vazio"
    corpo = re.sub(r"(?is)<(script|style|noscript).*?</\1>", " ", corpo)
    corpo = re.sub(r"(?s)<[^>]+>", " ", corpo)
    return norm(corpo), code


def numeros(resultado):
    # números com 2+ dígitos (ou com %, vírgula/ponto), como tokens só de dígitos
    toks = re.findall(r"\d[\d.,]*", resultado or "")
    return {re.sub(r"\D", "", t) for t in toks if len(re.sub(r"\D", "", t)) >= 2}


def checar(c):
    texto, code = baixar(c["fonte_url"])
    if texto is None:
        return {"id": c["id"], "status": "indisponivel", "http": code}
    tr = norm(c.get("trecho_comprovante"))
    if tr and tr in texto:
        return {"id": c["id"], "status": "trecho_ok", "http": code}
    pal = tr.split()
    blocos = [" ".join(pal[i:i + 4]) for i in range(max(0, len(pal) - 3))]
    frac = sum(1 for b in blocos if b in texto) / len(blocos) if blocos else 0
    if frac >= 0.6:
        return {"id": c["id"], "status": "trecho_parcial", "http": code, "frac": round(frac, 2)}
    nums = numeros(c.get("resultado"))
    texto_digitos = re.sub(r"[^0-9 ]", " ", re.sub(r"(?<=\d)[.,](?=\d)", "", texto))
    achados = {n for n in nums if re.search(rf"(?<!\d){n}(?!\d)", texto_digitos)}
    if nums and len(achados) / len(nums) >= 0.5:
        return {"id": c["id"], "status": "numeros_ok", "http": code, "frac": round(frac, 2)}
    return {"id": c["id"], "status": "nao_encontrado", "http": code, "frac": round(frac, 2),
            "numeros_resultado": sorted(nums), "numeros_achados": sorted(achados)}


def main():
    casos = json.load(open(os.path.join(AQUI, "casos-final.json"), encoding="utf-8"))
    alvo = [c for c in casos if c["forca"] == "forte"] if "--todos" not in sys.argv else casos
    with ThreadPoolExecutor(max_workers=8) as ex:
        res = list(ex.map(checar, alvo))
    json.dump(res, open(os.path.join(AQUI, "v2", "verificacao-bruta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    cont = {}
    for r in res:
        cont[r["status"]] = cont.get(r["status"], 0) + 1
    print(len(res), cont)


if __name__ == "__main__":
    main()
