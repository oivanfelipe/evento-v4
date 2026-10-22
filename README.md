# evento-v4

Conceito e proposta de execução do evento presencial da V4 Company na Flagship: Teoria das Restrições aplicada à produtividade, à IA e à margem do negócio.

Público: clientes B2B convidados em cascata pelos clientes atuais da V4. Cada participante passa por um diagnóstico ao vivo dos gargalos da própria empresa e recebe um Mapa de Gargalos e Oportunidades individual.

Documento completo: [`docs/evento-teoria-das-restricoes-ia.md`](docs/evento-teoria-das-restricoes-ia.md).

## Ferramenta de diagnóstico (Mapa de Gargalos e Oportunidades)

- App: `diagnostico/` (chat) e `api/mapa.js` (personalização via Groq, opcional; variável `GROQ_API_KEY`).
- Perguntas: `data/perguntas.json`. Banco de casos: `data/pesquisa/casos-final.json` (gerado por `data/pesquisa/consolidar.py` a partir de `data/pesquisa/v2/`; cobertura em `data/pesquisa/COBERTURA.md`).
- Regras de qualidade do banco: `data/pesquisa/SCHEMA2.md` e `data/pesquisa/LICOES.md`. `verificar_trechos.py` confere o trecho comprovante no HTML bruto da fonte.
- Testes locais: `bash diagnostico/testar.sh`.
- Dados dos participantes: tabelas `evento_leads` e `evento_respostas` no Supabase (RLS: o anon só insere).
