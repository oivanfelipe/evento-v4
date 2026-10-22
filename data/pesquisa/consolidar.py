#!/usr/bin/env python3
"""Consolida os arquivos de data/pesquisa/v2 em data/pesquisa/casos-final.json.

Regras:
- Junta reverificados (enriquecido-*) e novos (novos-*), sem duplicar fonte_url nem empresa+solução.
- Casos marcados "fraca" ou sem verificação NÃO entram no banco do app.
- Promoção media->forte somente para os ids listados em PROMOVER (candidatos explicitamente
  apontados pela reverificação) e só se cumprirem os critérios literais do SCHEMA2.
- Gera casos-final.json (app) e COBERTURA.md (relatório de cobertura e lacunas).
"""
import json, glob, collections, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
V2 = os.path.join(AQUI, "v2")
GARGALOS = ["capacidade", "manual_repetitivo", "informacao", "decisao", "processo",
            "integracao", "comunicacao", "conhecimento", "controle", "demanda_comercial"]
PORTES = ["pequena", "media", "grande"]
PROMOVER = {"M-002", "M-003", "M-005", "M-008", "M-014", "M-017", "M-018", "M-020", "M-023", "M-024", "M-026"}
OBRIG = ["id", "porte", "gargalo", "area", "setor_chave", "tipo", "pais", "titulo", "problema", "solucao",
         "resultado", "fonte_url", "fonte_nome", "forca", "verificado", "porte_confirmado", "como_replicar"]


def ano_fonte(c):
    m = re.match(r"(\d{4})", str(c.get("data_fonte") or ""))
    return int(m.group(1)) if m else None


def promovivel(c):
    a = ano_fonte(c)
    tem_numero = bool(c.get("metricas")) or bool(re.search(r"\d", c.get("resultado", "")))
    return (c["tipo"] == "nominal" and c.get("verificado") is True and a and a >= 2023
            and (c.get("trecho_comprovante") or "").strip() and tem_numero)


def norm_url(u):
    return re.sub(r"[#?].*$", "", (u or "").strip().lower()).rstrip("/")


def carregar():
    arquivos = sorted(glob.glob(os.path.join(V2, "*.json")))
    todos = []
    for f in arquivos:
        for c in json.load(open(f, encoding="utf-8")):
            c["_origem"] = os.path.basename(f)
            todos.append(c)
    return todos


def main():
    todos = carregar()
    logs = collections.Counter()
    # promoção
    for c in todos:
        if c["id"] in PROMOVER and c["forca"] == "media":
            if promovivel(c):
                c["forca"], c["confianca"] = "forte", "alta"
                logs["promovidos"] += 1
            else:
                logs["promocao_negada"] += 1
    # dedupe: mesma fonte_url, ou mesma empresa+título normalizado; mantém a mais forte
    peso = {"forte": 3, "media": 2, "fraca": 1}
    vistos, unicos = {}, []
    for c in sorted(todos, key=lambda x: (-peso.get(x["forca"], 0), x["id"])):
        chaves = [("u", norm_url(c["fonte_url"]), c["gargalo"], (c.get("empresa") or c["id"]).lower())]
        emp = (c.get("empresa") or "").strip().lower()
        if emp:
            chaves.append(("e", emp, c["gargalo"]))
        if any(k in vistos for k in chaves):
            logs["duplicados"] += 1
            continue
        for k in chaves:
            vistos[k] = c["id"]
        unicos.append(c)
    # elegibilidade para o app
    final, fora = [], []
    for c in unicos:
        faltando = [k for k in OBRIG if k not in c or c[k] in (None, "")]
        ok = (c["forca"] in ("forte", "media") and c.get("verificado") is True
              and c["gargalo"] in GARGALOS and c["porte"] in PORTES
              and str(c["fonte_url"]).startswith("http") and not faltando)
        (final if ok else fora).append((c, faltando))
    banco = []
    for c, _ in final:
        c = dict(c)
        c.pop("_origem", None)
        banco.append(c)
    banco.sort(key=lambda c: (GARGALOS.index(c["gargalo"]), PORTES.index(c["porte"]), -peso[c["forca"]], c["id"]))
    json.dump(banco, open(os.path.join(AQUI, "casos-final.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # relatório
    L = []
    L.append("# Cobertura do banco de casos\n")
    L.append(f"Gerado por `consolidar.py`. Total no app: **{len(banco)}** casos "
             f"({sum(1 for c in banco if c['forca']=='forte')} fortes, {sum(1 for c in banco if c['forca']=='media')} médios). "
             f"Fora do app: {len(fora)} (fracos, não verificados ou incompletos). Duplicados removidos: {logs['duplicados']}. "
             f"Promovidos a forte: {logs['promovidos']}.\n")
    L.append("## Gargalo × porte (forte / total)\n")
    L.append("| Gargalo | Pequena | Média | Grande | Total |\n|---|---|---|---|---|")
    for g in GARGALOS:
        cel, tot, totf = [], 0, 0
        for p in PORTES:
            cs = [c for c in banco if c["gargalo"] == g and c["porte"] == p]
            f = sum(1 for c in cs if c["forca"] == "forte")
            cel.append(f"{f}/{len(cs)}")
            tot += len(cs); totf += f
        L.append(f"| {g} | " + " | ".join(cel) + f" | {totf}/{tot} |")
    L.append("\n## Setor × porte (total)\n")
    L.append("| Setor | Pequena | Média | Grande | Total |\n|---|---|---|---|---|")
    setores = sorted({c["setor_chave"] for c in banco})
    for s in setores:
        n = [sum(1 for c in banco if c["setor_chave"] == s and c["porte"] == p) for p in PORTES]
        L.append(f"| {s} | " + " | ".join(map(str, n)) + f" | {sum(n)} |")
    L.append("\n## Brasil × exterior\n")
    br = sum(1 for c in banco if c["pais"] == "Brasil")
    L.append(f"Brasil: {br} · Exterior: {len(banco)-br}\n")
    L.append("## Células gargalo × porte com menos de 2 casos fortes (lacunas)\n")
    lac = []
    for g in GARGALOS:
        for p in PORTES:
            f = sum(1 for c in banco if c["gargalo"] == g and c["porte"] == p and c["forca"] == "forte")
            if f < 2:
                lac.append(f"- {g} × {p}: {f} forte(s)")
    L.extend(lac or ["Nenhuma."])
    L.append("\n## Casos fortes com porte confirmado\n")
    L.append(f"{sum(1 for c in banco if c['forca']=='forte' and c['porte_confirmado'])} de {sum(1 for c in banco if c['forca']=='forte')} fortes.\n")
    L.append("## Fora do app\n")
    for c, falt in sorted(fora, key=lambda x: x[0]["id"]):
        L.append(f"- {c['id']} {c.get('empresa') or c['titulo'][:50]} ({c['forca']}"
                 f"{', faltando ' + ','.join(falt) if falt else ''})")
    open(os.path.join(AQUI, "COBERTURA.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("final:", len(banco), "| fora:", len(fora), "|", dict(logs))


if __name__ == "__main__":
    sys.exit(main())
