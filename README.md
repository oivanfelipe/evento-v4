# evento-v4

Conceito e proposta de execução do evento presencial da V4 Company na Flagship: Teoria das Restrições aplicada à produtividade, à IA e à margem do negócio.

Público: clientes B2B convidados em cascata pelos clientes atuais da V4. Cada participante passa por um diagnóstico ao vivo dos gargalos da própria empresa e recebe um Mapa de Gargalos e Oportunidades individual.

Documento completo: [`docs/evento-teoria-das-restricoes-ia.md`](docs/evento-teoria-das-restricoes-ia.md).

## Ferramenta de diagnóstico (Mapa de Gargalos e Oportunidades)

- App: `diagnostico/` (chat pensado para celular, com tempo de digitação, botão Voltar e perguntas abertas por texto ou áudio), `api/mapa.js` (personalização via Groq, opcional) e `api/transcrever.js` (áudio vira texto com Whisper; o áudio não é guardado). Variável `GROQ_API_KEY`.
- Perguntas: `data/perguntas.json` (12 no total: nome, empresa, telefone, porte, setor, 2 perguntas para a pessoa pensar (o número da empresa e o que quebra se a demanda dobrar), 3 situações em ordem de importância, horas perdidas, quem decide, investimento e 1 aberta que cita a situação escolhida; o Mapa traz 3 perguntas por gargalo para a pessoa levar ao time; o aviso de contato fica na abertura, sem pergunta de consentimento). Banco de casos: `data/pesquisa/casos-final.json` (gerado por `data/pesquisa/consolidar.py` a partir de `data/pesquisa/v2/`; cobertura em `data/pesquisa/COBERTURA.md`).
- Regras de qualidade do banco: `data/pesquisa/SCHEMA2.md` e `data/pesquisa/LICOES.md`. `verificar_trechos.py` confere o trecho comprovante no HTML bruto da fonte.
- Testes locais: `bash diagnostico/testar.sh`.
- Dados dos participantes: tabelas `evento_leads` e `evento_respostas` no Supabase (RLS: o anon só insere).

## Painel do comercial (`/comercial/`)

- Página separada, só para a equipe V4: login com Google ou link por e-mail, e só **e-mail confirmado `@v4company.com`** vê os leads. A regra é aplicada no banco (função `evento_is_v4()` + RLS em `evento_leads` e `evento_respostas`), não só na tela.
- Mostra leads, status (concluiu/abandonou), gargalos, anfitrião, botão de WhatsApp com mensagem pronta e exportação CSV para o CRM.
- Biblioteca `supabase-js` embutida em `comercial/vendor/` (MIT), sem CDN.
- Configuração única no Supabase (Authentication): em **URL Configuration** adicionar `https://<dominio-do-site>/comercial/` em Redirect URLs; para o botão Google, ativar o provedor **Google** (Client ID e Secret do Google Cloud). O link por e-mail funciona sem o Google.
