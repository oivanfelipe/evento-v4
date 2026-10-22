# Schema do banco de casos

Arquivo por porte: `casos-pequena.json`, `casos-media.json`, `casos-grande.json` (array JSON).

Campos de cada caso:
- id: string, ex. "G-001" (P=pequena, M=media, G=grande)
- porte: "pequena" | "media" | "grande"
- gargalo: um de ["capacidade","manual_repetitivo","informacao","decisao","processo","integracao","comunicacao","conhecimento","controle","demanda_comercial"]
- gargalos_secundarios: array (pode ser vazio) com ids acima
- area: "financeiro" | "administrativo" | "rh" | "operacoes" | "comercial" | "marketing" | "atendimento" | "juridico" | "ti" | "logistica" | "outro"
- setor: string (ex. "varejo", "industria", "servicos B2B", "saude", "logistica")
- tipo: "nominal" (empresa real citada na fonte) | "padrao" (padrao de uso agregado, apoiado em estudo/pesquisa com fonte)
- empresa: string ou null (null se tipo=padrao)
- pais: string
- titulo: frase curta e direta
- problema: 1 frase (dor antes)
- solucao: 1-2 frases (o que foi feito com IA/automacao)
- ferramentas: array de strings (tecnologias citadas na fonte; [] se nao citadas)
- resultado: string com resultado REPORTADO na fonte, com numero quando existir. Nunca estimar ou inventar.
- complexidade_implantacao: "baixa" | "media" | "alta"  (julgamento seu, baseado na solucao)
- tempo_para_valor: "dias" | "semanas" | "meses" (julgamento seu)
- fonte_nome: string
- fonte_url: string (URL realmente acessada/lida)
- ano: numero
- confianca: "alta" (fonte primaria da empresa/fornecedor oficial ou imprensa de peso, com numero) | "media" (fonte secundaria/sem numero)

REGRAS: nada inventado. Se nao confirmar na fonte, nao inclua. Prefira casos brasileiros e recentes (2023-2026); inclua internacionais quando bons. Todo caso precisa de fonte_url lida de fato.
