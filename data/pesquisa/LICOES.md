# Lições das auditorias (obrigatório para a rodada 3)

Leia também SCHEMA.md e SCHEMA2.md. As auditorias removeram ou reclassificaram ~45% dos casos da rodada anterior pelos erros abaixo. NÃO repita.

## Definições dos gargalos (use para decidir `gargalo`)
- capacidade: equipe sempre no limite, prazos escorregam por falta de braço. Solução libera horas/volume.
- manual_repetitivo: horas copiando, colando e digitando entre planilhas e sistemas. Solução automatiza tarefa com regra clara.
- informacao: o dado existe, mas ninguém sabe onde; busca demorada em vários lugares. Solução = achar/resumir/consultar rápido.
- decisao: há informação, mas decidir demora ou exige muitas reuniões. Solução = análise/recomendação pronta que acelera a decisão.
- processo: etapas demais, retrabalho, aprovações em cascata. Solução redesenha/automatiza o fluxo.
- integracao: sistemas não conversam; alguém faz a ponte manual (exporta/importa). Solução conecta sistemas.
- comunicacao: agenda tomada por alinhamentos, reuniões de status, perguntas repetidas. Solução = atas, relatórios de status automáticos, assistente que responde dúvidas internas.
- conhecimento: só uma ou duas pessoas sabem fazer; o saber está concentrado na cabeça de especialistas. Solução = capturar o know-how em procedimento/assistente que qualquer um usa (onboarding, SOP, copiloto treinado com o conhecimento do especialista, análise de contratos/laudos que eleva o nível da equipe).
- controle: decisões no feeling, sem painel confiável. Solução = dashboard/alertas/visibilidade (NÃO é performance de infraestrutura/CPU/código).
- demanda_comercial: faltam oportunidades no funil ou elas não viram venda por falta de follow-up/qualificação.

## Erros que levaram à remoção (evite)
- Ferramenta de desenvolvedor, migração de código, infraestrutura de TI, segurança/SOC: irrelevante para o empresário.
- Solução só viável para big tech (modelo treinado em bilhões de transações, plataforma própria de LLM).
- Lançamento de produto, pesquisa/estatística de adoção, conteúdo patrocinado, autopromoção de fornecedor sem cliente nomeado e sem resultado medido.
- Resultado = tamanho da carteira/volume (“atende 10 mil”) sem antes/depois.
- Títulos que atribuem o ganho (“+300% de crescimento”) à IA quando a fonte não diz isso. Descreva o que a fonte diz.
- `como_replicar` telegráfico (1–2 palavras). Escreva 3–4 passos completos e acionáveis.
- Campo `solucao` com instruções internas (“Núcleo replicável:”). Nunca.
- Página sem data. Procure a data (URL, cabeçalho, “publicado em”, schema.org datePublished, sitemap). Sem data comprovável: forca = "fraca".
- Número que não bate (1.000 chamados × 45 min ≠ 1,8 mil h). Confira a conta e registre só o que a fonte afirma.
- Porte não confirmado. Priorize casos em que a fonte, o LinkedIn ou o site da empresa mostram o número de funcionários.

## Verificação automática que será aplicada depois
Um script baixa o HTML bruto da `fonte_url` e confere se o `trecho_comprovante` (literal, ≤25 palavras) existe na página. Se não existir, o caso é descartado. Portanto: copie o trecho EXATAMENTE como está na página (respeite acentos e pontuação), de preferência a frase que contém o número principal. Prefira fontes cujo HTML é estático (sites de fornecedor, imprensa). Evite páginas que só carregam por JavaScript ou que bloqueiam download (403).

## Foco da rodada 3
Casos que preencham buracos específicos (descritos no seu prompt), todos nominais, com número no resultado, datados (2023–2026), com trecho literal, porte confirmado quando possível, relevantes para o dono/gestor de uma empresa brasileira. Prefira Brasil; internacionais bons só se a lição for replicável por empresa menor.
