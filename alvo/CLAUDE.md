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
| **Portais (Garantia)** | **Nova (última sessão) — controle de garantia dos portais detectores de metal, ver seção abaixo** |

## Feature em andamento: Portais Detectores de Metal (contrato separado da Alvo)

Começamos a construir isso na última sessão, ainda não está completo. Contexto:

- **ATA 133/2026** (vigência 08/07/2026–07/07/2027): 100 portais no total, saldo vai sendo consumido por contratos de demanda de instalação por comarca.
- **Contrato 225/2026** (vigência 03/08/2026–02/09/2029): primeiro contrato ativo, 4 portais para Itaúna, Medina, Iturama, Patos de Minas (todos Fórum).
- **Garantia:** 36 meses a partir do Termo de Recebimento Provisório (quando a Magnetec instala) até o Termo de Recebimento Definitivo.
- **Regra crítica de negócio:** se uma comarca ainda tem portal em garantia, **não pode abrir OS de manutenção de portal pela Alvo** (contrato 181) — perderia a garantia. O atendimento nesse caso é via "Chamado de Assistência Técnica em Garantia" direto com a Magnetec (numeração própria, diferente da numeração 181-N da Alvo).
- **SLA do chamado de garantia:** reparo em até 18h do 2º dia útil após o chamado; se passar de 10 dias úteis, substituição definitiva do equipamento; se 3 chamados pela mesma falha no mesmo equipamento, troca obrigatória em até 30 dias corridos.

### O que já foi feito
- 4 tabelas novas no Supabase: `portais_garantia`, `atas_portais`, `contratos_demanda_portal`, `chamados_portal`
- Importados 288 portais já instalados (planilha da usuária) pra `portais_garantia`, com datas de recebimento provisório/definitivo calculadas
- ATA 133/2026 e contrato 225/2026 cadastrados
- Nova tela `PagePortais` (nav "Portais (Garantia)"): cadastro, KPIs de garantia (em garantia / vencendo em 90 dias / vencida), alertas de vencimento, saldo da ATA
- Aviso na tela Nova OS: ao selecionar comarca + sistema "Portal" no contrato 181, verifica `portais_garantia` e mostra um alerta se a comarca ainda estiver em garantia (não deixa esquecer)

### O que falta
- Tela/fluxo de abertura de "Chamado de Assistência Técnica em Garantia" (tabela `chamados_portal` já existe, numeração própria, ainda sem UI) — serviços: Instalação, Substituição, Manutenção
- Cadastro completo do saldo da ATA 133/2026 abatendo múltiplos contratos de demanda (hoje só tem 225/2026)
- Testar e validar o aviso de garantia na prática

## Como testar antes de publicar (padrão que sempre seguimos)

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
