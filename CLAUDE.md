# SGTI — Sistema de Gestão TJMG

Contexto do projeto para o Claude Code. Leia isso antes de mexer em qualquer coisa — tem várias armadilhas conhecidas e decisões já tomadas que não devem ser revertidas sem querer.

Backlog rastreável (o que já foi feito / o que falta) está em [`TODO.md`](TODO.md) — mantenha esse arquivo atualizado conforme o trabalho avança.

> **Última atualização deste arquivo:** 24/09/2026 — cobre tudo até o commit `c1f3f98` (Supabase Auth/RLS, `calc-medicao.js`, Recurso sob Demanda, avaliação por sistema, exceção de SLA, medição travada, Correção cobrando como presencial, portal+presencial na mesma OS).

## O que é

Sistema de gestão de contratos de segurança eletrônica (CFTV, alarme, portal detector de metais, controle de acesso) e telefonia do TJMG (GEASI/COTESI). Single-file React 18 (pré-compilado, sem build step) + Supabase + GitHub Pages/Netlify.

- **Repo:** `nandacriscastro-prog/sgti-tjmg` (branch `main`)
- **Deploy:** `nandacriscastro-prog.github.io/sgti-tjmg`, também espelhado em `sgti-geasi-tjmg.netlify.app` e `sgti-tecnico-tjmg.netlify.app`
- **Usuária principal / dona do sistema:** Fernanda Cristine Leão Castro (`fernanda.leao@tjmg.jus.br`) — várias telas administrativas (Usuários, Técnicos, Gerar Planilha SEI, Atestados) são restritas só a esse login

### Arquivos do repositório

| Arquivo | O que é |
|---|---|
| `index.html` | Sistema principal (~14,5 mil linhas, React pré-compilado + blob de telefonia embutido) |
| `calc-medicao.js` | **Compartilhado** entre `index.html` (`./calc-medicao.js`) e `alvo/index.html` (`../calc-medicao.js`): `FRAC_D` (pesos oficiais do Anexo VI) e `FRACAO_KM_ANEXO_VI` (0,0032468). Qualquer ajuste nesses pesos é feito **só aqui**. Tem também `calcularFracaoOS()`, mas hoje **nenhuma tela chama essa função** — cada tela recalcula a fração inline (ver "Débitos técnicos") |
| `alvo/index.html` | Portal **Alvo** (empresa contratada, somente leitura, senha única compartilhada) — app separado com **cópia própria** do resto da lógica de medição |
| `chamados-garantia/index.html` | App de Chamados de Assistência Técnica em Garantia (portais Magnetec), aberto dentro do sistema principal |
| `data/geasi_ch.json`, `data/tel.json` | Dados de telefonia |
| `alvo/CLAUDE.md` | Cópia deste arquivo — manter sincronizada |

## Regras de trabalho nesse repositório

1. **`index.html` tem um blob JSON gigante de telefonia embutido** (dado legado sem relação com o resto). Nunca faça `grep`/busca ampla sem âncora — sempre use `awk`/`grep` com range de linha ou nome de função único, senão a saída fica poluída ou trava.
2. **GitHub Pages atrasa o deploy em 2-4 minutos.** Depois de dar push, confirme com `curl` direto na URL publicada antes de concluir que uma correção "não funcionou" — não é cache do usuário na maioria das vezes.
3. **Push precisa de PAT do GitHub** colado na URL do remote a cada sessão, depois `git remote set-url origin` de volta pra URL https limpa. Nunca deixe o token salvo em lugar nenhum.
4. **Sempre valide sintaxe antes de publicar:** extrair os `<script>` do HTML e rodar `node --check`. Pra mudanças em funções de geração de planilha/PDF, teste de ponta a ponta em Node com dados reais antes de dar push (várias correções passadas quebraram em produção por não terem sido testadas assim).
5. **Alvo (`/alvo/index.html`) ainda é uma cópia de código separada** para quase toda a lógica de medição (só `FRAC_D`/`FRACAO_KM_ANEXO_VI` foram unificados em `calc-medicao.js`). Toda vez que uma regra de cálculo mudar no `index.html`, replicar manualmente no Alvo também — já causou "Alvo não bate com o sistema" várias vezes (e há divergências abertas agora, ver "Débitos técnicos").
6. **A Fernanda também publica direto pelo GitHub web ("Add files via upload" / "Delete index.html").** Esses commits não têm mensagem descritiva. **Sempre dar `git pull` antes de começar** e, ao investigar "quando isso mudou", usar `git log -S'trecho'` em vez de confiar nas mensagens de commit.
7. **Nunca coloque chave `service_role` / "secret key" do Supabase em código que vai pro navegador.** O HTML é público. Ver seção "Segurança" — isso já aconteceu e está pendente de correção.

## Segurança, login e RLS (Supabase Auth — desde 15/09/2026)

### Login
- Login é feito via **Supabase Auth** (`/auth/v1/token?grant_type=password`), não mais comparando senha em texto puro no navegador. Tokens ficam em `sessionStorage` (`sgti_auth`); `sgti_session` guarda o usuário/fiscal mapeado.
- `sbFetch` usa o **token do usuário logado**, com renovação automática antes de expirar. Só existe **uma renovação em andamento por vez** (o Supabase invalida o refresh token depois do primeiro uso — várias telas renovando ao mesmo tempo derrubavam a sessão inteira).
- Se o token expirar de vez, o sistema dispara o evento `sgti:sessao-expirada`, que o `App()` escuta pra voltar à tela de login. **Não usar `window.location.reload()`** pra isso — quebrava com o iframe do `chamados-garantia` aberto (tela preta via `file://`).
- `USUARIOS` e `FISCAIS` continuam **hardcoded** no `index.html`, mas hoje servem só para **mapear e-mail → nome/fiscal/matrícula**. O campo `senha: "12345678"` que ainda aparece lá **não é mais usado pra autenticar** — não confiar nele nem "consertar" senha editando o array.
- Tela "Usuários" grava em `usuarios_sistema`, mas **não cria o login**: é preciso criar o e-mail também em Supabase → Authentication → Users. A tela já avisa isso.
- Usuários existentes no Supabase Auth: Gilselena, Aguilar, Fernanda, Gustavo, André, Felipe, Robert (`robert.abreu@tjmg.jus.br`).
- **Se o link de redefinição de senha por e-mail não abrir** (já aconteceu com Fernanda e Robert), definir direto via SQL no Supabase:
  ```sql
  update auth.users set encrypted_password = extensions.crypt('nova_senha', extensions.gen_salt('bf')) where email = '...';
  ```
- Técnicos (tela "Técnicos", `PageTecnicos`) **não têm login** — são só registros de pessoal (nome/CI/CPF) usados em OS.

### RLS
- **Só autenticado (leitura e escrita):** `atas_portais`, `contratos_demanda_portal`, `demandas_cotesi`, `notas_fiscais`, `unidades_estoque`, `usuarios_sistema`, `estoque_cotesi`, `estoque_comarcas`, `estoque_cobens`, `numeracao`, `configuracoes`, `chamados_portal`.
- **Leitura pública, escrita só autenticado:** `ordens_servico`, `portais_garantia` — porque o portal Alvo lê `ordens_servico` sem login do Supabase Auth (usa senha única compartilhada). Não fechar essas duas sem repensar o acesso da Alvo.
- `chamados-garantia` **exige o mesmo login do sistema principal** (reaproveita `sgti_auth`/`sgti_session` do `sessionStorage`, compartilhado por estar na mesma origem). Sem sessão, mostra "Acesso restrito". `criado_por` registra o nome/e-mail real de quem abriu o chamado.

### 🚨 Pendência crítica — `service_role` key exposta no `index.html`
- Desde 21/09/2026 (commit `41526aa`) existe `const SB_SVC = "<service_role JWT>"` no topo do `index.html`, usada em `uploadArquivos()` pra enviar anexos ao bucket `os-anexos` "bypassando o RLS".
- Como o `index.html` é público (GitHub Pages + repositório), **qualquer pessoa pode ler essa chave e ter acesso total** (ler/alterar/apagar todas as tabelas e o storage), anulando o RLS acima.
- **Correção necessária (não adiar):**
  1. Girar/regenerar a chave no Supabase (Settings → API) — a chave atual está comprometida mesmo depois de removida do código, porque fica no histórico do git.
  2. Remover `SB_SVC` do código; voltar `uploadArquivos()` a usar `apikey: SB_KEY` + `Authorization: Bearer <token do usuário logado>` (via `getAccessToken()`).
  3. Criar no Supabase a policy de storage que faltava: `INSERT` (e `SELECT`/`DELETE` se necessário) em `storage.objects` para `bucket_id = 'os-anexos'` com role `authenticated`. O motivo original do "hack" foi o upload dar 403 com o token do usuário — a causa é a ausência dessa policy, não o token.
- Não repetir esse padrão em nenhuma outra tela.

## Contrato 181/2026 — regras de cálculo (a parte mais delicada do sistema)

- **Período de medição:** dia 20 do mês anterior até dia 19 do mês selecionado (não é mês calendário).
- **Colar Metropolitano + Região Metropolitana de BH** (`COLAR_181`, união de 50 cidades) pagam **zero diária**. Fora disso é "Interior".
- **Fração de diária** = base + soma das frações de peça trocada (`FRAC_D`) + km × 0,0032468 (`FRACAO_KM_ANEXO_VI`), onde a base é:
  - **1,0** atendimento presencial normal
  - **1,25** raio-X/scanner
  - **2,0** OS que tem **Portal detector de metais E sistema presencial (CFTV/Alarme/Acesso) juntos** — desde 23/09/2026
  - **0** se Colar/RM
- **Contagem de atendimentos (Anexo IV):** as checagens são **independentes**, não `if/else`. Uma OS com "Portal" + "CFTV" no serviço conta **1 atendimento portal + 1 atendimento presencial** (valores somados). Presencial = serviço sem "remot" e com alarme/cftv/acesso (ou que não seja nem portal nem raio-X). Esse mesmo padrão está repetido em vários blocos (Dashboard, Medição, `calcular()`, Controle de Ativos, SEI, Atestado, exportação) — ao mudar, mudar em **todos**.
- **Correção/reabertura (`tipo === "Correção"`, número `{original}-R`) — REGRA MUDOU em 24/09/2026:** OS de Correção agora **cobra igual a uma OS presencial** (atendimento + km + diária + peças). No código isso está implementado como `const isCorrecaoOS = false; // OS de Correção cobra igual a presencial` em todos os blocos de cálculo do `index.html` — **não "consertar" de volta para `o.tipo === "Correção"`** sem confirmar com a Fernanda. (Histórico: antes a regra era "só a fração de diária é zerada"; antes disso ainda, "não cobra visita/km". As duas foram superadas.)
  - O portal Alvo segue a mesma regra desde 24/09/2026 (`carregarMedicao`, Simulação e exportação). Lá `isCorrecaoOS` continua existindo só para a coluna informativa "Correção?" da exportação.
- **Recurso sob Demanda (item `RSD` do Anexo V):** item de **valor livre** (`PRECO_ANEXO_V.RSD = 0`), sem quantidade contratada — "saldo aberto". O valor unitário vem de `p.vu`; se não houver, `getRsdVu(p)` extrai de dentro da descrição (`"Recurso sob demanda — R$ 7690.00"`, formato salvo pelo CEOP). ⚠️ `getRsdVu` trata `7690.00` (ponto decimal) e `7.690,00` (formato BR) — não "simplificar" removendo pontos, já deu bug. Sempre usar `p.cod === "RSD" ? getRsdVu(p) : PRECO_ANEXO_V[p.cod]` ao valorar peças. No Controle de Ativos, o RSD é acumulado como **valor** em `_RSD_VALOR` e mostrado numa linha âmbar separada.
- **Valores oficiais do Anexo V:** o documento original do contrato tem pequenas inconsistências de arredondamento linha a linha (~R$4,93 no total). Por isso existe `ANEXO_V_VALOR_TOTAL_CONTRATADO` com o valor **oficial** de cada item, usada em vez de recalcular qtd×preço unitário — garante que o total bate exatamente R$1.327.474,62.
- **CONTRATO_VALOR_181 = R$2.222.831,00** | **CONTRATO_VALOR_ANEXO_V_181 = R$1.327.474,62**

### Medições travadas (`MEDICOES_TRAVADAS_181`) — desde 24/09/2026
- Constante no `index.html` **e** no `alvo/index.html` (manter as duas iguais) com o **valor bruto aprovado** de períodos já fechados, chave `"AAAA-MM-DD_AAAA-MM-DD"` (dtIni_dtFim):
  - `"2026-07-20_2026-08-19": 49453.60` — Agosto/2026, aprovado em planilha, travado em 24/09/2026.
  - Setembro/2026 (`127308.74`) está **comentado — desativado a pedido da fiscalização**. Não reativar sem pedido explícito.
- Quando o período está travado, `bruto = MEDICOES_TRAVADAS_181[chave] ?? brutoCalculado` — o valor aprovado prevalece sobre o recálculo em: Resumo da Medição, Lançamento Manual, Planilha SEI (`totalGeral`/`brutoSEI`), aba "Total por OS" do Excel e portal Alvo. A tela mostra "🔒 Total bruto (aprovado)".
- Motivo: mudanças de regra/fórmula posteriores não podem alterar retroativamente o valor de uma medição já aprovada. **Ao fechar um novo período, a Fernanda decide se trava** — só então adicionar a chave.

### Exceção de SLA (`[SLA_EXCECAO]`) — desde 22/09/2026
- Em Histórico, OS **Concluída** tem botão "🛡️ Marcar como exceção" / "✕ Remover exceção" (autorização do coordenador).
- Grava o marcador `[SLA_EXCECAO]` dentro de `observacoes` (sem mudança de schema). `calcPtsAutoOS` retorna `pts: 0, excecao: true` para essas OS; a Medição lista as exceções no bloco de SLA ("Exceções SLA autorizadas pelo coordenador").

## Arredondamento — REGRA OFICIAL (confirmada pela Fernanda em 25/09/2026)

**Km e diária são somados POR OS:** para cada OS, `km × R$2,95` e `fração × R$231,73`, cada um arredondado em 2 casas; depois soma. **Não** multiplicar o km total ou a soma das frações pelo VU (isso dá 1 centavo a mais em Set/2026). Referência: **Set/2026 = R$ 127.302,27** (serviços 78.152,22 + materiais 49.150,05).
- Demais itens do Anexo IV: qtd × VU em 2 casas.
- Implementado em: `calcular()` (`valorKmPorOS`/`valorDiariaPorOS`, guardados em `resultado.valorKm`/`resultado.valorDiaria`), `medicaoResumo` (Medição e Lançamento Manual), Dashboard/Saldo contratual (`p.valorKmOS`/`p.valorDiariaOS`), Planilha SEI, Atestados, Exportar Excel e, no Alvo, `carregarMedicao` (`valorKmSomaPorOS`/`valorDiariaSomaPorOS`), exportação e Simulação (`simTotais`).
- Consequência conhecida: a linha de diária do Anexo IV mostra a soma por OS (ex.: 24.464,22), então "105,572119 × 231,73" feito à mão dá 1 centavo a mais (24.464,23). Isso é esperado pela regra. A aba "Fração diária" do Excel explica: "soma das OS, cada uma arredondada".
- Histórico (não voltar): 1 casa decimal na fração agregada (até 02/09) → agregado sem arredondar (24/09) → **por OS (25/09, atual)**.

**Sem diferença de centavo em lugar nenhum (pedido da Fernanda, 24–25/09):** toda tabela tem que somar exatamente o total mostrado, sem linha de "ajuste". Isso é garantido por dois helpers globais (existem iguais no `index.html` e no `alvo/index.html`):
- `subtotaisAnexoIV(qtds, totalServicos, valorKm)` — linhas do Anexo IV (qtd × VU em 2 casas; km = `valorKm`, a soma por OS). A diária é o que completa `totalServicos`, então a soma das linhas é sempre o Subtotal serviços. Quantidades exibidas com `fmtQtdAnexoIV()` (km 2 casas, diária 6 casas → qtd × VU à mão confere).
- `fecharLinhasPorOS(linhas, {campoKm, campoDiaria, camposOutros, kmOficial, totalOficial, valorFixo})` — tabelas por OS: arredonda cada valor em 2 casas, mantém a coluna km como soma das OS (`kmOficial: null`) e joga o resíduo restante na diária da última OS que tem diária. `valorFixo` = Atendimento Remoto (linha `181-REMOTO`).
- **Onde já é usado:** tela Medição e Lançamento Manual (tabela Total por OS), Exportar Excel (Anexo IV, Fração diária, Total por OS, Detalhamento Completo, Peças), Planilha SEI (Tabela 1 e Tabela 2), Atestados 39.21 e 51.13, e no Alvo: tela, "Exportar detalhamento" e Simulação (`simTotais()`, usado na tela e na exportação da simulação).
- **Medição travada** (`MEDICOES_TRAVADAS_181`): serviços = valor aprovado − materiais; a diferença para o valor recalculado entra na linha de diária (Ago/2026: +R$ 1,13 no Anexo IV). Assim Serviços + Materiais = Total aprovado em todas as telas e planilhas.
- "Total medido" (Dashboard) e "Saldo contratual" (Medição) somam os períodos com a mesma conta e usam o valor travado quando existir (hoje: 49.453,60 + 127.302,27 = 176.755,87).
- Planilha SEI: "Valor líquido da medição" agora é texto formatado (`brl()`), como os demais valores.
- Controle de Ativos / Item 4 da SEI (consumo acumulado do contrato): km soma por OS (`kmValor`), demais 4 casas — não é uma medição, não entra nessa regra.
- **Teste obrigatório ao mexer em cálculo/exportação:** rodar tela + todas as planilhas com dados reais e conferir que cada coluna soma o total no centavo (foi assim que se validou em 25/09: Ago, Set e Out/2026 ✓).

**Regra de trabalho:** se a Fernanda definir outro método (ex.: diária em 1 casa), mudar em `calcular()`, `medicaoResumo`, Lançamento Manual, SEI, tela/exportação e **Alvo** ao mesmo tempo — e continuar sem linha de ajuste.
- `ANEXO_V_VALOR_TOTAL_CONTRATADO`: usar sempre esse valor oficial por item, nunca recalcular qtd×preço.

## Telas principais

| Tela | O que faz |
|---|---|
| Dashboard | Redesenhado no padrão "FIELDIA": saudação, 8 KPIs (abertas/em execução/concluídas/pendentes avaliação/SLA em risco/SLA vencido/reaberturas/técnicos), alertas, OS por comarca, atalhos, gráfico de produção + donut de status, "Resumo da operação", "Últimas OS". Cálculo pesado em `useMemo` |
| Nova OS / Rota / Atendimento Remoto | Abertura de OS (individual, em lote, ou remota). Nova OS tem campo Número do Pedido |
| Histórico | Lista de OS, edição retroativa ("Editar dados da OS", "Editar/completar execução" com **dropdown de itens do Anexo V** igual à Medição, incluindo RSD), exceção de SLA, excluir |
| Avaliação | Satisfatório/insatisfatório — **por sistema** quando a OS tem mais de um (ver abaixo) |
| Medição | Tela central: fecha OS pendentes, calcula Anexo IV/V, tabela **"Total por OS"** (serviço + km + diárias + materiais, com linha fixa "📞 Atendimento Remoto (fixo contratual)" e TOTAL GERAL = `bruto`), Controle de SLA, exporta Excel, gera Planilha SEI e Atestados (só Fernanda) |
| Lançamento Manual (`lancamento`) | Mesma lógica de medição para lançamento manual — tem **cópia própria** dos blocos de cálculo (mudou a regra? mudar aqui também) |
| Controle de Ativos | Saldo usado/reservado/restante por item (Anexo IV e V). Colunas "Contratada"/"Vlr contratado" foram **removidas da tabela** em 23/09 — o total contratado fica nos KPIs. RSD em linha própria (saldo aberto) |
| Notas Fiscais | Status de nota fiscal por período (Pendente/Enviada/Recebida) |
| Estoque | Cobens/Comarcas/Cotesi — patrimônio de equipamentos |
| Demandas | Sincronizado com planilha Google via Apps Script (bidirecional) |
| Usuários / Técnicos | Administrativo — só Fernanda |
| Portais (Garantia) | Controle de garantia dos portais detectores de metal — ver seção abaixo |
| Chamados de Garantia | Página do sistema (`case "chamados-garantia"`, `PageChamadosGarantia`) que carrega `/chamados-garantia/index.html` num iframe |
| Telefonia (`tel-home`, `tel-chamados`, `tel-sla`, `tel-glosa`) | Módulo de telefonia (dados em `data/` e no blob embutido) |
| Limpeza de Anexos, Configurações | Utilitários |

### Avaliação por sistema (desde 22/09, parcial desde 24/09)
- Se a OS tem mais de um sistema (CFTV, Alarme, Portal detector de metais, Scanner de raio-X, Controle de acesso), a Avaliação mostra um toggle Satisfatório/Insatisfatório **por sistema** (`avalPorSistema`).
  - Todos satisfatórios → OS encerrada como satisfatória.
  - Algum insatisfatório → OS reaberta e nova OS de Correção (`-R`) criada **só com os sistemas que falharam** no serviço.
  - **Avaliação parcial** (`aval === "parcial"`): se ao menos um sistema foi avaliado e outros ainda não têm retorno (⏳), dá pra confirmar agora ("✓ Confirmar (avaliação parcial)") e avaliar o resto depois; a Correção é gerada só para os marcados como insatisfatórios.
- Ao detectar sistemas no texto do serviço, **"Portal" não conta separado se "Portal detector de metais" já está no texto, e "Scanner" não conta separado se "Scanner de raio-X" já está** — senão o mesmo sistema aparece duas vezes.
- OS de sistema único mantém os dois botões simples.
- Avaliação insatisfatória em lote por rota copia `forum`/`endereco` (de `CM[comarca]` se a OS original não tiver) para a OS de Correção criada.

## Componentes visuais / UI

- **`Kpi2`** (card de KPI com ícone) + **`CardTitleRow`** — padrão usado em Dashboard, Avaliação, Chamados GEASI, Controle de Ativos, Portais, Telefonia, Demandas. Clicável → `role="button"`, `tabIndex`, `aria-pressed`, `aria-label`, Enter/Espaço (acessibilidade e-MAG); há regra global `:focus-visible`.
- **`ErrorBoundary`** envolve `renderPage()` com `key: page` — erro numa tela não derruba o sistema; botão "Voltar ao Dashboard".
- **`PAGE_LABELS`**: toda página nova precisa de entrada aqui, senão o breadcrumb do topo mostra o id cru.
- Cor vermelha: usar `var(--red)` (respeita dark mode), não `#dc2626` hardcoded.
- Grid de KPIs: a classe CSS que existe é **`kpi-grid`**. ⚠️ **`"kpis"` não existe no CSS** — já quebrou o layout de Portais. (`PageEstoque` usa `className: "kpis"` mas com `display: grid` inline, por isso funciona — não copiar esse padrão.)

## Portais Detectores de Metal (contrato separado da Alvo) — feature completa

- **ATA 133/2026** (vigência 08/07/2026–07/07/2027): 100 portais no total, saldo vai sendo consumido por contratos de demanda de instalação por comarca.
- **Contrato 225/2026** (vigência 03/08/2026–02/09/2029): primeiro contrato ativo, 4 portais para Itaúna, Medina, Iturama, Patos de Minas (todos Fórum).
- **Garantia:** 36 meses a partir do Termo de Recebimento Provisório (quando a Magnetec instala) até o Termo de Recebimento Definitivo.
- **Regra crítica de negócio:** se uma comarca ainda tem portal em garantia, **não pode abrir OS de manutenção de portal pela Alvo** (contrato 181) — perderia a garantia. O atendimento nesse caso é via "Chamado de Assistência Técnica em Garantia" direto com a Magnetec (numeração própria MAG-NNN/AAAA, diferente da numeração 181-N da Alvo).
- **SLA do chamado de garantia:** reparo em até 18h do 2º dia útil após o chamado; se passar de 10 dias úteis, substituição definitiva do equipamento; se 3 chamados pela mesma falha no mesmo equipamento, troca obrigatória em até 30 dias corridos.

### O que existe
- 4 tabelas no Supabase: `portais_garantia` (284 registros importados), `atas_portais`, `contratos_demanda_portal`, `chamados_portal`
- `PagePortais` (nav "Portais (Garantia)"): lista em formato de linha (não grid), clicável abrindo modal de detalhe com edição inline; cadastro com **autocomplete de comarca (cidade + edificação)**; datas vazias tratadas; painel "+ Cadastrar contrato de demanda" (ATA 133/2026 — saldo recalcula somando `contratosDemanda`).
- **PDF da Magnetec no cadastro do portal** (desde 21/09): upload no formulário; a URL é guardada dentro de `observacoes` com o marcador `[PDF_MAGNETEC:url]` (sem mudança de schema). O modal mostra "Ver PDF Magnetec" e **esconde o marcador** do texto de observações exibido.
- A tentativa de "OS Portal Detector de Metais" separada (`PageNovaOSPortal`, rota `nova-portal`) foi **criada e removida** no mesmo dia (21/09) — não recriar sem pedido.
- `PageChamadosGarantia` carrega `/chamados-garantia/index.html` num `<iframe>` com cache-busting `?v=Date.now()`. ⚠️ **`Date.now()` é calculado só uma vez, guardado em state (`iframeSrc`)** — nunca direto no JSX: o App re-renderiza a cada 30s (poll `loadOS`) e um `src` inline mudaria a cada render, recarregando o iframe e apagando o que o usuário está digitando (bug real). O link aponta para `./chamados-garantia/index.html` (não para a pasta), senão dá listagem de diretório via `file://`.
- `chamados-garantia`: abertura/edição/exclusão de chamados, botão de e-mail pré-preenchido; dropdown de comarca mostra **todas** se serviço = "Instalação", e só as **em garantia vigente** se Manutenção/Substituição.
- Documento de impressão do chamado (`imprimirHTML`) com layout institucional (cabeçalho navy sólido — não gradiente, que sai desbotado em PDF — badges com cor sólida, `print-color-adjust:exact` aplicado globalmente via `*`).
- Aviso de garantia na Nova OS (`garantiaPortalAtiva`): ⚠️ **precisa bater comarca E edificação exatas**, não só a cidade — BH tem 20+ edificações com garantias diferentes.

### Cuidados conhecidos
- Nomes de edificação no cadastro de Portais podem não bater exatamente com os nomes da Nova OS/ComarcaInput — o aviso de garantia deixa de aparecer em alguns casos legítimos (preferimos silêncio a alarme falso).

## Medição — Planilha SEI e Atestados (gerarPlanilhaSEI / gerarAtestado)

- Botões "Gerar Planilha SEI", "Atestado Dotação 39.21" e "Atestado Dotação 51.13" na tela Medição — **restritos a `fernanda.leao@tjmg.jus.br`**
- Usam `xlsx-js-style` (carregado como `window.XLSXStyle`, sem conflitar com o `window.XLSX` padrão) — valores monetários são escritos como **texto já formatado** (`brl()` — "R$ 1.296.058,13"), não como número + `numFmt`, porque `numFmt` deu problema em Excel 2019 de verdade.
- Tabela "Medição Global" (Tabela 2) tem colunas **Dotação 39.21** (atendimento+deslocamento+diária por OS) e **Dotação 51.13** (recursos sob demanda por OS), mais uma linha `181-REMOTO` (remoto entra na Dotação 51.13/Recurso sob Demanda, agrupado em Belo Horizonte — decisão explícita da usuária).
- Agrupamento das linhas é por **comarca completa** (cidade + edificação), não só cidade.
- Se o período está em `MEDICOES_TRAVADAS_181`, o total geral / bruto da SEI usa o valor travado.
- Item 4/5 da planilha SEI = mesmo dado do Controle de Ativos (consumo acumulado do contrato inteiro), mesma precisão (km: 2 casas, resto: 4 casas). Item 5 inclui linha RSD se houver uso.
- O botão "Exportar Excel" (plain `xlsx`) está dentro de `try/catch` com `alert` de erro — manter assim.

## Marcadores gravados dentro de `observacoes` (sem schema próprio)

| Marcador | Quem grava / lê |
|---|---|
| `Anexo N: https://...` | Anexos de OS — extraído com `/Anexo\s*\d*:\s*(https?:\/\/\S+)/` |
| `Rota: N` | Abertura em lote (Rota) |
| `[SLA_EXCECAO]` | Exceção de SLA (Histórico) → `calcPtsAutoOS` |
| `[PDF_MAGNETEC:url]` | PDF do portal (tabela `portais_garantia`) |

Ao editar observações por código, **preservar esses marcadores**; ao exibir, esconder os que são internos.

## Bug sutil de texto: nunca usar `<br>` literal em campo de observações

Um bug real quebrou links de anexo compartilhados: o fluxo de "Rota" juntava texto usando `"<br>"` como separador **dentro de `observacoes`**. Como a regex de extração de link usa `\S+`, ela não para no `<br>` e engole o texto seguinte — gerando `https://.../123.pdf<br>Rota: 5`, que dá "InvalidKey". **Regra:** sempre usar `\n` de verdade dentro de `observacoes`; converter com `.replace(/\n/g, "<br>")` **só na hora de exibir**.

⚠️ **Ainda existem violações dessa regra** na criação automática de OS de Correção: `partesObs.join("<br>")` em `PageAvaliacao` (avaliação individual e em lote por rota) e `[...].join("<br>")` com `<b>Falhas identificadas no atendimento:</b>` em `PageMedicao`/`PageLancamentoManual`. Se a OS original tiver anexo, o link na Correção pode quebrar. Corrigir trocando por `"\n"` (e sem `<b>` no armazenamento).

## Editar OS aberta / excluir do Histórico

- Histórico tem "✎ Editar dados da OS" (comarca/tipo/prioridade/serviço/observações) pra qualquer OS ainda não Concluída, seja ela criada individual ou em Rota (mesma tabela `ordens_servico`)
- Ao editar `sel`, **sempre usar `setSel(prev => ({...prev, ...mudancas}))`** — nunca mutar o objeto direto; isso já causou "Imprimir OS" mostrando dado antigo.
- Excluir OS: o `DELETE` no Supabase funciona — se parecer que "não apagou", quase sempre é falta de `reload()` depois. `reload` é prop válida em Histórico/Avaliação/Medição.

## Débitos técnicos / divergências conhecidas (24/09/2026)

1. 🚨 **`service_role` key no `index.html`** — ver seção Segurança. Prioridade máxima.
2. ~~Alvo desatualizado~~ — **resolvido em 24/09/2026**: Correção cobrando como presencial (Medição, Simulação e exportação), atendimento portal+presencial somado, RSD valorado nas abas de peças/total por OS, e linha `181-REMOTO` na aba "Total por OS" do Alvo. Conferido com dados reais: Set/2026 igual nos dois — hoje R$ 127.302,27 (antes o Alvo mostrava 126.902,49 por causa da OS 181-62-R).
3. ~~Arredondamento inconsistente~~ — resolvido em 25/09: tela, Excel, SEI, Atestados, Dashboard e Alvo usam a mesma conta e fecham no centavo (ver seção Arredondamento).
4. **Lógica de cálculo repetida** em muitos blocos do `index.html` (Dashboard, `calcular()`, `medicaoResumo` da Medição, `PageLancamentoManual`, Controle de Ativos, SEI item 4, Atestado, exportação) + Alvo. `calcularFracaoOS()` em `calc-medicao.js` existe mas não é usada — ela ainda tem a regra antiga (zera Correção, sem base 2,0 de portal+presencial). Ou atualizar e passar a usar em todos os blocos, ou apagar pra não confundir.
5. `<br>` em `observacoes` na criação de OS de Correção (ver seção acima).
6. Variáveis `osMedidasRaw1/2`, `osMesRaw` são só aliases (`osMedidas = osMedidasRaw1`) — sobra de um filtro removido; podem ser simplificadas.

## Como testar antes de publicar (padrão que sempre seguimos)

```bash
# 0. Sempre começar sincronizado (a Fernanda também sobe arquivos pelo GitHub web)
git pull

# 1. Validar sintaxe (index.html; repetir para alvo/index.html e chamados-garantia/index.html se mexer neles)
python3 -c "
import re
html = open('index.html', encoding='utf-8').read()
scripts = re.findall(r'<script(?![^>]*type=\"application/json\")(?![^>]*src)[^>]*>([\s\S]*?)</script>', html)
open('/tmp/check_full.js', 'w', encoding='utf-8').write('\n;\n'.join(scripts))
"
node --check /tmp/check_full.js && node --check calc-medicao.js && echo OK

# 2. Para funções de geração de planilha/Excel, testar de ponta a ponta em Node
# com xlsx-js-style e dados reais/simulados antes de publicar (evita "brl is not defined"
# e erros de estilo que só aparecem em produção)

# 3. Se mexeu em regra de cálculo: conferir o total de Agosto/2026 (travado em 49.453,60)
# E o valor recalculado (sem trava) — e replicar a mudança no alvo/index.html

# 4. Publicar
TS=$(date +%s)
sed -i "s/build:[0-9]*/build:$TS/" index.html
git add -A && git commit -m "mensagem descritiva"
git remote set-url origin https://<PAT>@github.com/nandacriscastro-prog/sgti-tjmg.git
git push origin HEAD
git remote set-url origin https://github.com/nandacriscastro-prog/sgti-tjmg.git
```
