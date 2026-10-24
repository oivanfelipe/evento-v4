// Conteúdo base de cada gargalo: usado no Mapa mesmo sem IA (fallback por regras)
// e como contexto factual para a personalização da Groq.

export const GARGALOS = {
  capacidade: {
    perguntas_time: [
      "Quais prazos escorregaram no último mês e o que causou cada atraso?",
      "Quanto do tempo do seu time vai para tarefas que se repetem toda semana?",
      "Se entrasse um cliente grande amanhã, quem absorveria o trabalho e o que deixaria de ser feito?",
    ],
    nome: "Capacidade",
    sintoma: "A equipe vive no limite e os prazos escorregam.",
    impacto: {
      receita: "Pedidos, propostas e entregas ficam na fila: receita que existe, mas não é capturada a tempo.",
      custo: "Hora extra, contratação emergencial e gente cara apagando incêndio.",
      risco: "Equipe saturada erra mais e pede demissão mais; o cliente sente primeiro.",
      crescimento: "A empresa só cresce até onde o time aguenta. Vender mais vira problema.",
    },
    oportunidade: "Tirar do time o volume que não precisa de julgamento humano e liberar capacidade sem contratar na mesma proporção.",
    aplicacoes: [
      "Assistentes de IA que respondem e resolvem o volume repetitivo (atendimento, separação de pedidos)",
      "Entrada de demanda automática: classificar, priorizar e distribuir sozinho",
      "Assistentes de IA que reduzem o tempo de produção de documentos, propostas e relatórios",
    ],
    primeiro_passo: "Medir por uma semana quanto do volume é repetitivo e escolher o tipo de demanda mais frequente para automatizar primeiro.",
  },
  manual_repetitivo: {
    perguntas_time: [
      "Quais são as 5 tarefas que mais se repetem na semana, quem faz cada uma e quanto tempo leva?",
      "Em quais delas alguém copia um dado de um lugar e cola em outro?",
      "Quantos erros por mês nascem de digitação ou conferência manual, e quanto custa corrigir cada um?",
    ],
    nome: "Manual e repetitivo",
    sintoma: "Gente qualificada gasta horas copiando, colando e digitando.",
    impacto: {
      receita: "Quem deveria vender, atender ou criar está preso em digitação.",
      custo: "Horas pagas a preço de profissional para fazer trabalho de robô.",
      risco: "Digitação manual gera erro, retrabalho e inconsistência de dado.",
      crescimento: "Cada cliente novo vira mais trabalho manual, em vez de ganho de escala.",
    },
    oportunidade: "É o gargalo com retorno mais rápido e menor risco: automação de tarefas que já têm regra clara.",
    aplicacoes: [
      "Leitura automática de notas, contratos e e-mails, com os dados indo direto para o sistema",
      "Automações prontas (sem programar) ligando planilhas, CRM e sistema de gestão",
      "Conciliação, cobrança e lançamentos automatizados",
    ],
    primeiro_passo: "Listar as 5 tarefas mais repetidas da semana e escolher a que tem entrada e saída mais padronizadas.",
  },
  informacao: {
    perguntas_time: [
      "Das perguntas que sua equipe faz todo dia (“cadê o contrato?”, “qual o status?”), quais se repetem mais?",
      "Quanto tempo leva, na prática, para achar um documento ou dado importante?",
      "Existe alguma informação que só uma pessoa sabe onde está?",
    ],
    nome: "Informação",
    sintoma: "O dado existe, mas ninguém sabe onde.",
    impacto: {
      receita: "Vendedor e atendente sem o histórico do cliente na hora certa perdem a oportunidade.",
      custo: "Tempo de busca vira custo invisível em todas as áreas.",
      risco: "Decisão e resposta baseadas em versão desatualizada ou incompleta.",
      crescimento: "Quanto maior a empresa, mais espalhada a informação e mais lenta a operação.",
    },
    oportunidade: "Centralizar o acesso: um assistente que responde em segundos a partir dos documentos e sistemas da própria empresa.",
    aplicacoes: [
      "Assistente interno que responde em segundos usando seus contratos, manuais e históricos",
      "Resumos automáticos de reuniões, ligações e chamados",
      "Base de conhecimento viva, atualizada a partir do que a equipe já produz",
    ],
    primeiro_passo: "Escolher um tipo de pergunta que a equipe repete todo dia ('onde está o contrato X?') e montar um assistente só para ela.",
  },
  decisao: {
    perguntas_time: [
      "Qual foi a última decisão que demorou mais do que deveria e o que faltava para decidir?",
      "Quantas reuniões foram necessárias e quem estava na mesa?",
      "Quais 3 informações bastariam para decidir sem uma nova reunião?",
    ],
    nome: "Decisão",
    sintoma: "Existe informação, mas decidir demora e exige várias reuniões.",
    impacto: {
      receita: "Oportunidade vencida enquanto a decisão tramita.",
      custo: "Reuniões longas e repetidas, com gente cara em volta da mesa.",
      risco: "Decidir tarde costuma ser pior do que decidir imperfeito.",
      crescimento: "Velocidade de decisão é vantagem competitiva que se perde.",
    },
    oportunidade: "Entregar a análise pronta (resumo, comparação, recomendação) para que a reunião seja só de decisão.",
    aplicacoes: [
      "Resumos executivos automáticos a partir de dados e documentos",
      "Alertas e recomendações baseados em regras e previsão",
      "Pré-análise por IA de propostas, crédito, orçamentos e contratos",
    ],
    primeiro_passo: "Escolher a decisão recorrente mais lenta e definir quais 3 informações bastam para tomá-la.",
  },
  processo: {
    perguntas_time: [
      "Pegue um pedido do começo ao fim: por quantas etapas e pessoas ele passa?",
      "Quais etapas ninguém sabe justificar ou só existem por hábito?",
      "Onde o trabalho volta para trás (retrabalho) e quantas vezes por mês isso acontece?",
    ],
    nome: "Processo",
    sintoma: "Etapas demais, retrabalho e aprovações em cascata.",
    impacto: {
      receita: "O cliente espera mais para comprar, ser atendido ou receber.",
      custo: "Cada etapa extra consome horas de gente em cada ciclo.",
      risco: "Quanto mais etapas manuais, mais pontos de falha e menos rastreabilidade.",
      crescimento: "Processo mal desenhado não escala: o volume dobra e o caos quadruplica.",
    },
    oportunidade: "Redesenhar antes de automatizar: remover etapas e automatizar o que sobra, com aprovações automáticas nos casos de baixo risco.",
    aplicacoes: [
      "Fluxos de aprovação automatizados com regras e exceções",
      "IA que faz a pré-análise e o preenchimento das etapas burocráticas",
      "Painel de gargalos do processo (tempo por etapa)",
    ],
    primeiro_passo: "Mapear um processo ponta a ponta com o tempo de cada etapa e cortar as duas etapas que ninguém sabe justificar.",
  },
  integracao: {
    perguntas_time: [
      "Quais sistemas sua equipe usa todo dia e quais deles não conversam entre si?",
      "Quem faz a ponte na mão (exportar, importar, planilha) e quanto tempo isso leva por semana?",
      "O que acontece quando o dado de um sistema chega errado no outro?",
    ],
    nome: "Integração",
    sintoma: "Os sistemas não conversam e alguém faz a ponte manualmente.",
    impacto: {
      receita: "Lead que não chega ao CRM, pedido que não vira faturamento, cliente sem retorno.",
      custo: "Exportar e importar é trabalho de alto custo e zero valor.",
      risco: "Dados duplicados e divergentes entre sistemas.",
      crescimento: "Cada ferramenta nova piora o problema se não estiver conectada.",
    },
    oportunidade: "Conectar os sistemas entre si de forma automática, com a IA cobrindo o que não dá para conectar (leitura de documentos e e-mails).",
    aplicacoes: [
      "Integração automática entre CRM, sistema de gestão, financeiro e atendimento",
      "IA como camada de tradução entre formatos e sistemas legados",
      "Sincronização automática de cadastro, status e faturamento",
    ],
    primeiro_passo: "Achar o ponto onde alguém exporta/importa planilha toda semana e automatizar esse elo primeiro.",
  },
  comunicacao: {
    perguntas_time: [
      "Quantas horas por semana vão para reunião de alinhamento e cobrança de status?",
      "Quais reuniões poderiam ser trocadas por um relatório automático?",
      "Quantas vezes por dia alguém interrompe outra pessoa só para perguntar “como está isso?”",
    ],
    nome: "Comunicação",
    sintoma: "A agenda é tomada por alinhamentos e cobranças de status.",
    impacto: {
      receita: "Tempo de gestor e de especialista gasto em conversa em vez de entrega.",
      custo: "Reuniões de status são o custo mais caro e menos medido.",
      risco: "Combinados perdidos em chats e e-mails; ninguém sabe o que ficou decidido.",
      crescimento: "Quanto mais gente, mais alinhamento: a comunicação vira o trabalho.",
    },
    oportunidade: "Tirar o status do humano: atualizações, atas e lembretes gerados e distribuídos automaticamente.",
    aplicacoes: [
      "Atas e próximos passos gerados por IA a partir das reuniões",
      "Relatórios de status automáticos a partir das ferramentas de trabalho",
      "Respostas a dúvidas internas recorrentes por um assistente",
    ],
    primeiro_passo: "Eliminar uma reunião de status recorrente e substituí-la por um relatório automático semanal.",
  },
  conhecimento: {
    perguntas_time: [
      "Quais tarefas só uma ou duas pessoas sabem fazer?",
      "Se uma delas saísse amanhã, quanto tempo levaria para outra assumir?",
      "O jeito de fazer está escrito em algum lugar ou só na cabeça de quem faz?",
    ],
    nome: "Conhecimento",
    sintoma: "Só uma ou duas pessoas sabem fazer determinadas coisas.",
    impacto: {
      receita: "Quando o especialista falta, a venda ou a entrega para.",
      custo: "Treinamento longo e dependência cara de poucas pessoas.",
      risco: "Se essa pessoa sair, o conhecimento sai junto.",
      crescimento: "Não dá para escalar o que mora na cabeça de alguém.",
    },
    oportunidade: "Capturar o jeito de fazer do especialista em procedimentos e assistentes que qualquer pessoa da equipe consegue usar.",
    aplicacoes: [
      "Assistente treinado com os documentos, e-mails e decisões do especialista",
      "Gravar e transcrever o 'como fazer' e transformar em procedimento pesquisável",
      "Assistentes de IA de análise (contratos, propostas, laudos) que elevam o nível de toda a equipe",
    ],
    primeiro_passo: "Gravar 3 execuções reais da tarefa do especialista e transformá-las em procedimento com apoio de IA.",
  },
  controle: {
    perguntas_time: [
      "Quais 3 números você precisaria ver toda manhã e hoje não vê (ou vê atrasado)?",
      "Quando você pede um relatório, quanto tempo leva e você confia nele?",
      "Qual foi a última surpresa ruim que um painel teria avisado antes?",
    ],
    nome: "Controle",
    sintoma: "Decisões no feeling, sem um painel confiável.",
    impacto: {
      receita: "Você não sabe onde a receita escapa até ser tarde.",
      custo: "Desperdício que não aparece em lugar nenhum.",
      risco: "Fraude, erro e desvio só são vistos depois do estrago.",
      crescimento: "Não se gerencia o que não se mede; a empresa cresce no escuro.",
    },
    oportunidade: "Painel único com dados puxados automaticamente dos sistemas, com alertas para o que sair do padrão.",
    aplicacoes: [
      "Dashboards automáticos (BI) alimentados por integração, sem planilha manual",
      "Detecção de anomalias e alertas por IA",
      "Perguntas em linguagem natural sobre os números da empresa",
    ],
    primeiro_passo: "Escolher 5 indicadores que o dono olharia toda segunda de manhã e automatizar a coleta deles.",
  },
  demanda_comercial: {
    perguntas_time: [
      "Dos últimos 10 contatos que chegaram querendo comprar, quantos foram respondidos em menos de 1 hora?",
      "Quantos contatos ficaram sem retorno nos últimos 30 dias e quanto valia cada um?",
      "Em que etapa do caminho até a venda mais gente desaparece?",
    ],
    nome: "Demanda e comercial",
    sintoma: "Faltam oportunidades ou elas não viram venda por falta de follow-up.",
    impacto: {
      receita: "É o gargalo mais direto: oportunidade perdida é receita perdida.",
      custo: "Time comercial caro gastando tempo com contato frio e tarefas administrativas.",
      risco: "Dependência de poucos vendedores e de indicação.",
      crescimento: "Sem funil previsível não existe crescimento previsível.",
    },
    oportunidade: "Automatizar a qualificação e o follow-up para que o humano entre só nas conversas com chance real de fechar.",
    aplicacoes: [
      "Atendimento e qualificação imediata de contatos de venda por IA (WhatsApp, e-mail, site)",
      "Cadências de follow-up automáticas e personalizadas",
      "Priorização da carteira de clientes pela chance de compra",
    ],
    primeiro_passo: "Medir o tempo entre o contato chegar e a primeira resposta: reduzir isso a minutos costuma ser o maior ganho imediato.",
  },
};

export const AREA_LABEL = {
  comercial: "Comercial / vendas",
  marketing: "Marketing",
  financeiro: "Financeiro",
  administrativo: "Administrativo / RH",
  operacoes: "Operações / produção",
  atendimento: "Atendimento / pós-venda",
  ti: "TI / dados",
};

// Rótulos curtos para botões no celular.
export const CURTO = {
  capacidade: "Equipe no limite",
  manual_repetitivo: "Trabalho manual e repetitivo",
  informacao: "Informação espalhada",
  decisao: "Decisão lenta",
  processo: "Processo travado",
  integracao: "Sistemas que não conversam",
  comunicacao: "Reuniões e alinhamentos demais",
  conhecimento: "Saber concentrado em poucos",
  controle: "Falta de painel e controle",
  demanda_comercial: "Vendas e funil",
};
