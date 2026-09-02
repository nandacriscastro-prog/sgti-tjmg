# SGTI — Sistema de Gestão TJMG

Contexto do projeto para o Claude Code. Leia isso antes de mexer em qualquer coisa — tem várias armadilhas conhecidas e decisões já tomadas que não devem ser revertidas sem querer.

## O que é

Sistema de gestão de contratos de segurança eletrônica (CFTV, alarme, portal detector de metais, controle de acesso) e telefonia do TJMG (GEASI/COTESI). Single-file React 18 (pré-compilado, sem build step) + Supabase + GitHub Pages/Netlify.

- **Repo:** `nandacriscastro-prog/sgti-tjmg` (branch `main`, arquivo principal `index.html`)
- **Deploy:** `nandacriscastro-prog.github.io/sgti-tjmg`, também espelhado em `sgti-geasi-tjmg.netlify.app` e `sgti-tecnico-tjmg.netlify.app`
- **Portal Alvo** (somente leitura, credenciais da empresa contratada): subpasta `/alvo`, app **separado** com cópia própria da lógica de cálculo — precisa ser sincronizado manualmente sempre que a fórmula principal mudar
- **Usuária principal / dona do sistema:** Fernanda Cristine Leão Castro (`fernanda.leao@tjmg.jus.br`) — várias telas administrativas (Usuários, Técnicos, Gerar Planilha SEI, Atestados) são restritas só a esse login

## Regras de trabalho nesse repositório

1. **`index.html` tem um blob JSON gigante de telefonia embutido** (dado legado sem relação com o resto). Nunca faça `grep`/busca ampla sem âncora — sempre use `awk`/`grep` com range de linha ou nome de função único, senão a saída fica poluída ou trava.
2. **GitHub Pages atrasa o deploy em 2-4 minutos.** Depois de dar push, confirme com `curl` direto na URL publicada antes de concluir que uma correção "não funcionou" — não é cache do usuário na maioria das vezes.
3. **Push precisa de PAT do GitHub** colado na URL do remote a cada sessão, depois `git remote set-url origin` de volta pra URL https limpa. Nunca deixe o token salvo em lugar nenhum.
4. **Sempre valide sintaxe antes de publicar:** extrair os `<script>` do HTML e rodar `node --check`. Pra mudanças em funções de geração de planilha/PDF, teste de ponta a ponta em Node com dados reais antes de dar push (várias correções passadas quebraram em produção por não terem sido testadas assim).
5. **Alvo (`/alvo/index.html`) é uma cópia de código separada** — toda vez que a fórmula de cálculo principal mudar, replicar manualmente lá também. Isso já causou "Alvo não bate com o sistema" várias vezes.

## Arquitetura de login (importante, já causou bug real)

- `USUARIOS` e `FISCAIS` são arrays **hardcoded no código-fonte** com os 6 fiscais fixos (Gilselena, Aguilar, Fernanda, André, Felipe, + Robert que foi cadastrado depois via tela).
- A tela "Usuários" (nav) grava numa tabela `usuarios_sistema` no Supabase — mas por muito tempo isso **não tinha efeito nenhum no login de verdade** dos 5 fiscais hardcoded, porque `loadUsuariosDinamicos()` pulava (skip) qualquer email que já existisse no array fixo. Já corrigido: agora ele **atualiza** senha/nome do array fixo quando encontra uma linha correspondente em `usuarios_sistema`.
- Técnicos (tela "Técnicos", `PageTecnicos`) **não têm login** — são só registros de pessoal (nome/CI/CPF) usados em OS, sem campo de senha.

## Contrato 181/2026 — regras de cálculo (a parte mais delicada do sistema)

- **Período de medição:** dia 20 do mês anterior até dia 19 do mês selecionado (não é mês calendário).
- **Colar Metropolitano + Região Metropolitana de BH** (`COLAR_181`, união de 50 cidades) pagam **zero diária**. Fora disso é "Interior".
- **Fração de diária** = base (1.0 normal / 1.25 raio-X / 0 se Colar-RM ou Correção) + soma das frações de peça trocada (`FRAC_D`) + km × 0,0032468.
- **Diária (regra final, muito debatida):** usa a fração **agregada** de todo o período, arredondada em **1 casa decimal**, × R$231,73. Não é soma das frações individuais por OS.
- **Km/Deslocamento:** soma por OS individual (cada linha arredondada em 2 casas antes de somar), × R$2,95/km.
- **Correção/reabertura:** só a fração de diária é zerada. Km e atendimento continuam sendo cobrados normalmente (o técnico foi lá de verdade).
- **Valores oficiais do Anexo V:** o documento original do contrato tem pequenas inconsistências de arredondamento linha a linha (~R$4,93 no total). Por isso existe uma constante `ANEXO_V_VALOR_TOTAL_CONTRATADO` com o valor **oficial** de cada item, usada em vez de recalcular qtd×preço unitário — garante que o total bate exatamente R$1.327.474,62.
- **CONTRATO_VALOR_181 = R$2.222.831,00** | **CONTRATO_VALOR_ANEXO_V_181 = R$1.327.474,62**

## Telas principais

| Tela | O que faz |
|---|---|
| Dashboard | KPIs Presencial x Remoto, gráfico de 6 períodos, banner "precisa da sua atenção" |
| Nova OS / Rota / Atendimento Remoto | Abertura de OS (individual, em lote, ou remota) |
| Histórico / Avaliação | Lista de OS, edição retroativa, avaliação satisfatório/insatisfatório |
| Medição | Tela central: fecha OS pendentes, calcula Anexo IV/V, exporta Excel, gera Planilha SEI e Atestados (só Fernanda) |
| Controle de Ativos | Saldo contratado/usado/reservado/restante por item (Anexo IV e V) |
| Notas Fiscais | Status de nota fiscal por período (Pendente/Enviada/Recebida) |
| Estoque | Cobens/Comarcas/Cotesi — patrimônio de equipamentos |
| Demandas | Sincronizado com planilha Google via Apps Script (bidirecional) |
| Usuários / Técnicos | Administrativo — só Fernanda |
| Portais (Garantia) | Controle de garantia dos portais detectores de metal — ver seção abaixo |
| Chamados de Garantia | App separado (`/chamados-garantia`), embutido via iframe dentro de Portais |

## Portais Detectores de Metal (contrato separado da Alvo) — feature completa

- **ATA 133/2026** (vigência 08/07/2026–07/07/2027): 100 portais no total, saldo vai sendo consumido por contratos de demanda de instalação por comarca.
- **Contrato 225/2026** (vigência 03/08/2026–02/09/2029): primeiro contrato ativo, 4 portais para Itaúna, Medina, Iturama, Patos de Minas (todos Fórum).
- **Garantia:** 36 meses a partir do Termo de Recebimento Provisório (quando a Magnetec instala) até o Termo de Recebimento Definitivo.
- **Regra crítica de negócio:** se uma comarca ainda tem portal em garantia, **não pode abrir OS de manutenção de portal pela Alvo** (contrato 181) — perderia a garantia. O atendimento nesse caso é via "Chamado de Assistência Técnica em Garantia" direto com a Magnetec (numeração própria MAG-NNN/AAAA, diferente da numeração 181-N da Alvo).
- **SLA do chamado de garantia:** reparo em até 18h do 2º dia útil após o chamado; se passar de 10 dias úteis, substituição definitiva do equipamento; se 3 chamados pela mesma falha no mesmo equipamento, troca obrigatória em até 30 dias corridos.

### O que existe
- 4 tabelas no Supabase: `portais_garantia` (284 registros importados), `atas_portais`, `contratos_demanda_portal`, `chamados_portal`
- `PagePortais` (nav "Portais (Garantia)"): lista em formato de linha (não grid — layout revisado a pedido da usuária), clicável abrindo modal de detalhe com edição inline; KPIs com `className: "kpi-grid"` (⚠️ **NUNCA usar `"kpis"`, essa classe não existe no CSS — já causou layout quebrado (tudo empilhado) uma vez**)
- App separado `/chamados-garantia/index.html`: abertura/edição/exclusão de chamados, embutido via `<iframe>` dentro de `PagePortais` com cache-busting `?v=Date.now()` no `src` (senão o iframe fica preso numa versão antiga em cache do navegador)
- Dropdown de comarca no chamado: se serviço = "Instalação", mostra **todas** as comarcas cadastradas; se Manutenção/Substituição, só as que estão **em garantia vigente**
- Documento de impressão do chamado (`imprimirHTML` dentro de `/chamados-garantia`) com layout institucional (cabeçalho navy sólido — não gradiente, que sai desbotado em PDF — badges com cor sólida, `print-color-adjust:exact` aplicado globalmente via `*`, não só dentro de `@media print`)
- Aviso de garantia na Nova OS (`garantiaPortalAtiva`): ⚠️ **precisa bater comarca E edificação exatas**, não só a cidade — cidades grandes como BH têm 20+ edificações com garantias bem diferentes entre si; comparar só por cidade pega a garantia errada de outro prédio

### Cuidados conhecidos
- Nomes de edificação no cadastro de Portais (vindos da planilha da usuária) podem não bater exatamente com os nomes usados na Nova OS/ComarcaInput — isso faz o aviso de garantia deixar de aparecer em alguns casos legítimos (preferimos silêncio a alarme falso)

## Medição — Planilha SEI e Atestados (gerarPlanilhaSEI / gerarAtestado)

- Botões "Gerar Planilha SEI", "Atestado Dotação 39.21" e "Atestado Dotação 51.13" na tela Medição — **restritos a `fernanda.leao@tjmg.jus.br`**
- Usam `xlsx-js-style` (carregado como `window.XLSXStyle`, sem conflitar com o `window.XLSX` padrão usado no resto do sistema) — valores monetários são escritos como **texto já formatado** (`brl()` — "R$ 1.296.058,13"), não como número + `numFmt`, porque `numFmt` deu problema em Excel 2019 de verdade mesmo passando em todo teste automatizado
- Tabela "Medição Global" (Tabela 2) tem colunas **Dotação 39.21** (atendimento+deslocamento+diária por OS) e **Dotação 51.13** (recursos sob demanda por OS), mais uma linha `181-REMOTO` (remoto entra na Dotação 51.13/Recurso sob Demanda, agrupado em Belo Horizonte — decisão explícita da usuária, não é engano)
- Agrupamento das linhas é por **comarca completa** (cidade + edificação), não só cidade — Ipatinga-Fórum e Ipatinga-JESP não podem ser somados numa linha só
- A última linha da tabela absorve o resíduo de arredondamento de km/diária pra que a SOMA das linhas bata exatamente com o TOTAL exibido (ver próxima seção)
- Item 4/5 da planilha SEI = mesmo dado do Controle de Ativos (consumo acumulado do contrato inteiro), tem que usar a mesma precisão (km: 2 casas, resto: 4 casas) — já ficaram divergentes uma vez por isso

## Arredondamento — regra final consolidada (não mexer sem reler isso)

- **Diária:** fração **agregada** de todo o período, arredondada em **1 casa decimal**, × R$231,73. Vale pra Resumo, Anexo IV (tela/exportação), Total Líquido e Planilha SEI — todos usam a mesma fórmula agora.
- **Km:** soma por OS individual, cada linha arredondada em 2 casas antes de somar, × R$2,95.
- **Controle de Ativos / Item 4 da SEI (consumo acumulado, não é uma medição específica):** km também soma por OS (não agrega e arredonda o total) — um bug real já causou 1 centavo de diferença aqui.
- Tabelas que mostram linha por OS (Medição Global, Total por OS) reconciliam a última linha pra bater com o total agregado — ver `gerarPlanilhaSEI`/`gerarAtestado` pra o padrão exato.
- `ANEXO_V_VALOR_TOTAL_CONTRATADO`: usar sempre esse valor oficial por item, nunca recalcular qtd×preço (ver seção do Anexo V acima).

## Bug sutil de texto: nunca usar `<br>` literal em campo de observações

Um bug real quebrou links de anexo compartilhados: o fluxo de "Rota" (abertura em lote) juntava texto usando `"<br>"` como separador **dentro de um campo de texto puro** (`observacoes`). Como a regex de extração de link (`/Anexo\s*\d*:\s*(https?:\/\/\S+)/`) usa `\S+` (não-espaço), ela não para no `<br>` (não é espaço em branco) e engole o texto seguinte junto — gerando um link tipo `https://.../123.pdf<br>Rota: 5`, que dá erro "InvalidKey"/"link inválido" quando alguém tenta abrir. **Regra:** sempre usar `\n` de verdade pra separar linhas dentro de `observacoes`; se precisar renderizar como HTML (no PDF da OS), converter com `.replace(/\n/g, "<br>")` **só na hora de exibir**, nunca no armazenamento.

## Editar OS aberta / excluir do Histórico

- Histórico tem "✎ Editar dados da OS" (comarca/tipo/prioridade/serviço/observações) pra qualquer OS ainda não Concluída, seja ela criada individual ou em Rota (mesma tabela `ordens_servico`)
- Ao editar `sel` (a OS selecionada no estado local), **sempre usar `setSel(prev => ({...prev, ...mudancas}))`** — nunca mutar o objeto direto (`Object.assign`/`sel.campo = x`), isso já causou "Imprimir OS" mostrando dado antigo depois de editar
- Excluir OS: o `DELETE` no Supabase **funciona perfeitamente** (testado direto via curl) — se parecer que "não apagou", o problema quase sempre é a lista não ter dado `reload()` depois, não o banco. `reload` é sempre uma prop válida disponível nas páginas de Histórico/Avaliação/Medição.

```bash
# 1. Validar sintaxe
python3 -c "
import re
html = open('index.html', encoding='utf-8').read()
scripts = re.findall(r'<script(?![^>]*type=\"application/json\")(?![^>]*src)[^>]*>([\s\S]*?)</script>', html)
open('/tmp/check_full.js', 'w', encoding='utf-8').write('\n;\n'.join(scripts))
"
node --check /tmp/check_full.js && echo OK

# 2. Para funções de geração de planilha/Excel, testar de ponta a ponta em Node
# com xlsx-js-style e dados reais/simulados antes de publicar (evita "brl is not defined"
# e erros de estilo que só aparecem em produção)

# 3. Publicar
TS=$(date +%s)
sed -i "s/build:[0-9]*/build:$TS/" index.html
git add -A && git commit -m "mensagem descritiva"
git remote set-url origin https://<PAT>@github.com/nandacriscastro-prog/sgti-tjmg.git
git push origin HEAD
git remote set-url origin https://github.com/nandacriscastro-prog/sgti-tjmg.git
```
