# TODO — SGTI-TJMG

Backlog rastreável no git. Ver `CLAUDE.md` para contexto/arquitetura completos.

## Feature: Portais Detectores de Metal (ATA 133/2026 + Contrato 225/2026)

- [x] Tabelas Supabase (`portais_garantia`, `atas_portais`, `contratos_demanda_portal`, `chamados_portal`)
- [x] Importação dos portais + cálculo de datas de garantia
- [x] `PagePortais` — cadastro, KPIs, alertas de vencimento, saldo ATA, lista clicável com modal de detalhe/edição
- [x] Aviso de garantia na tela Nova OS (comarca + sistema "Portal") — exige match exato de edificação, testado e validado em 2026-09-03
- [x] Tela "Chamado de Assistência Técnica em Garantia" (`/chamados-garantia/index.html`) — publicada, com edição/exclusão de chamados
- [x] Cadastro manual de novos contratos de demanda da ATA 133/2026 — painel "+ Cadastrar contrato de demanda" em `PagePortais` (número do contrato, quantidade, comarcas, vigência), com exclusão. Saldo da ATA recalcula automaticamente somando `contratosDemanda`
- [x] Botão de e-mail pré-preenchido nos chamados de garantia (`/chamados-garantia`), igual ao padrão de e-mail de OS do contrato 181
- [x] "Chamados de Garantia" abre como página normal do sistema (`case "chamados-garantia"`, `PageChamadosGarantia`), não mais como modal/overlay com iframe

## 🚨 Segurança

- [ ] **Remover `SB_SVC` (service_role key) do `index.html`**, girar a chave no Supabase e voltar `uploadArquivos()` a usar o token do usuário + policy de storage `INSERT` para `authenticated` no bucket `os-anexos` (ver CLAUDE.md → Segurança)
- [x] Login via Supabase Auth + RLS nas tabelas (15/09/2026)
- [x] `chamados-garantia` exigindo o login do sistema principal (15/09/2026)

## Medição / contrato 181

- [x] Recurso sob Demanda (RSD) com valor livre + saldo aberto no Controle de Ativos (23/09)
- [x] Contagem de portal + presencial na mesma OS; base 2,0 de fração (23/09)
- [x] Exceção de SLA por OS (`[SLA_EXCECAO]`) (22/09)
- [x] Avaliação por sistema + avaliação parcial (22–24/09)
- [x] Correção cobrando igual a presencial no sistema principal (24/09)
- [x] Medição de Agosto/2026 travada em R$ 49.453,60 (`MEDICOES_TRAVADAS_181`) (24/09)
- [x] Exportação Excel e tabela Anexo IV (sistema e Alvo) fechando exatamente com o total, sem linha de "ajuste de arredondamento" (24/09)
- [x] Regra oficial km/diária somados por OS (Set/2026 = 127.302,27) em todo o sistema e no Alvo (25/09)
- [x] SEI, Atestados, Dashboard (total medido) e Simulação do Alvo na mesma conta da tela, fechando no centavo (25/09)
- [x] Sincronizar Alvo: Correção cobrando como presencial; atendimento somado portal+presencial; RSD nas abas de peças/total por OS; linha 181-REMOTO no Total por OS (24/09)
- [ ] Trocar `join("<br>")` por `"\n"` na criação de OS de Correção (`PageAvaliacao`, `PageMedicao`, `PageLancamentoManual`)

## Débitos técnicos / organização

- [x] `FRAC_D`/`FRACAO_KM_ANEXO_VI` unificados em `calc-medicao.js` (15/09)
- [ ] Restante da lógica de cálculo ainda duplicada em vários blocos do `index.html` + `/alvo` — atualizar `calcularFracaoOS()` (hoje com regra antiga e sem uso) e passar a usá-la em todos os blocos, ou removê-la
- [ ] Fluxo de publish exige colar PAT manualmente toda sessão — avaliar salvar credencial no Git Credential Manager do Windows


## Auditoria F0 de segurança — 06/11/2026 (branch isolada)

> Registro de planejamento; **não comprova correção ou mitigação**. Nenhuma alteração em produção deve ser feita sem homologação. O repositório estava público na consulta inicial.

### P0 — Incidente potencial: chave privilegiada exposta
- [ ] Confirmar por inspeção local do `index.html` e do histórico Git se `SB_SVC`, `service_role`, `sb_secret_` ou outras credenciais privilegiadas foram expostas. A documentação registra exposição anterior; a leitura remota integral do HTML não foi possível nesta auditoria inicial.
- [ ] Tratar como comprometida qualquer chave privilegiada que tenha sido publicada; inventariar dependências e executar rotação/revogação no painel Supabase com janela de contingência. **Remover do código não revoga o segredo nem apaga o histórico.**
- [ ] Verificar logs de autenticação, banco e storage conforme retenção disponível; investigar uso anômalo sem presumir que houve acesso indevido.
- [ ] Substituir operações privilegiadas no navegador por autenticação de usuário + RLS/storage policies mínimas ou backend controlado; testar uploads, leitura e remoção de anexos.
- [ ] Verificar GitHub Pages, Netlify e URLs alternativas: tornar o repositório privado, isoladamente, **não remove páginas já publicadas**.
- [ ] Examinar arquivos versionados e histórico para outros segredos/dados sensíveis; planejar eventual limpeza de histórico somente depois de rotação e com avaliação de impacto.

### P1 — Mapeamento técnico e autorização
- [ ] Inventariar tabelas, views, funções/RPCs, triggers, policies RLS, buckets e grants do Supabase por exportação de esquema **sem dados reais nem segredos**.
- [ ] Mapear fluxos de login, sessão, portal Alvo, app técnico, chamados de garantia, ordens de serviço, `retorno_campo`, patrimônios, fotos, PDFs e medições.
- [ ] Identificar dependências de leitura pública em `ordens_servico` e `portais_garantia`; planejar substituição por endpoints ou políticas específicas, sem quebrar o portal Alvo.
- [ ] Validar a regra vigente de reabertura da mesma OS com sufixos `-R` e o vínculo por ID estável para a fiscalização.
- [ ] Definir plano de rollback e testes de regressão: login, OS, upload, relatório, Alvo, medições e garantia.

### P2 — Aplicativo SGTI Fiscalização (futuro, separado)
- [ ] Acesso somente para fiscais TJMG via Supabase Auth + RLS.
- [ ] Fiscalização presencial e documental; evidências independentes do relatório da contratada.
- [ ] Legendas **abaixo** das fotos: pavimento, localização, equipamento e patrimônio.
- [ ] Dois PDFs independentes: relatório principal com fotos menores e anexo fotográfico ampliado, com numeração consistente.

**Limite da auditoria atual:** metadados do repositório, `CLAUDE.md`, `TODO.md` e árvore de arquivos foram consultados. O conector não retornou conteúdo do `index.html` de ~3,3 MB, portanto não há confirmação de ausência/presença atual da chave, nem validação do Supabase em produção.


### Evidência confirmada — Storage (capturas do painel em 06/11/2026)
- Bucket `os-anexos` marcado como PUBLIC.
- Policy `Permitir leitura anexos OS`: role `anon`, SELECT, `USING (bucket_id = 'os-anexos'::text)`.
- Policy `Permitir upload anexos OS`: role `anon`, INSERT, `WITH CHECK (bucket_id = 'os-anexos'::text)`.
- Policy `Anon upload 1thy3kd_0`: role `anon`, INSERT, `WITH CHECK (true)`, sem restrição de bucket. Políticas permissivas podem se combinar por OR; revisar antes de qualquer deploy.
- [ ] Confirmar `pg_policies` (permissive/restrictive, roles e condições) e configuração dos demais buckets; avaliar impacto de remover policy global.
- [ ] Inventariar consumidores de URLs públicas e uploads anônimos (SGTI, Alvo, técnico, garantia); migrar para upload autenticado e download autorizado/URLs assinadas.
- [ ] Remover policy anônima irrestrita somente após preparar e testar substituição, salvo contenção emergencial aprovada pelo responsável.
- [ ] Revisar tipos, tamanhos, paths, quotas e retenção; auditar objetos potencialmente inseridos indevidamente.


### Confirmação via pg_policies (06/11/2026)
Consulta somente leitura em `pg_policies` mostrou exatamente três policies em `storage.objects`, todas PERMISSIVE e com role `anon`:
1. `Anon upload 1thy3kd_0` — INSERT; `with_check = true`.
2. `Permitir leitura anexos OS` — SELECT; `qual = (bucket_id = 'os-anexos'::text)`.
3. `Permitir upload anexos OS` — INSERT; `with_check = (bucket_id = 'os-anexos'::text)`.
Não houve policies `authenticated` retornadas nesta consulta. Isso confirma risco de INSERT anônimo amplo, mas não comprova exploração. Recomendação: conter policy global em janela coordenada, preservar evidências e rotacionar service_role exposta; não publicar alterações sem validação de dependências.


### Fluxo operacional confirmado pelo responsável (06/11/2026)
- O SGTI principal em produção é utilizado por servidores TJMG que **transcrevem o texto** do relatório encaminhado pela contratada e registram avaliação `Satisfatório`/`Insatisfatório`.
- No fluxo atual relatado, servidores **não fazem upload de fotos ou documentos**; o SGTI Técnico **ainda não está em uso**.
- Isto reduz a dependência operacional atual de upload no Storage, mas **não comprova ausência de outros consumidores, objetos existentes ou fluxos opcionais**. Verificar código publicado, integrações, logs e conteúdo antes de bloquear.
- Priorizar contenção da policy `Anon upload 1thy3kd_0` e rotação da credencial privilegiada; mudanças no Supabase em produção exigem autorização operacional específica e plano de rollback.
- No SGTI Fiscalização, manter relatório textual da contratada distinto do parecer e das evidências da fiscalização.


### Inventário storage.objects (consulta agregada, 06/11/2026)
- Bucket `os-anexos`: **103 objetos**; primeiro `created_at` 2026-07-31 19:06:59.945664+00; último 2026-11-05 13:52:33.47235+00.
- Há atividade recente, apesar de o fluxo operacional usual relatado ser transcrição de texto e avaliação por servidores. **Origem e dependência dos arquivos não determinadas.**
- [ ] Inventariar metadados agregados por prefixo/extensão e datas sem expor nomes sensíveis, URLs ou conteúdo; verificar consumidores antes de mudar acesso público.
- [ ] Preservar os 103 objetos e metadados; não apagar ou mover antes de confirmar vínculo com OS e estratégia de migração.

### Requisito operacional confirmado — PDFs de OS (06/11/2026)
- Os PDFs gerados das OS permanecem salvos no SGTI e são reabertos posteriormente.
- A correção de segurança **deve preservar emissão, armazenamento, vínculo com a OS e reabertura/download histórico**.
- Não tornar o bucket privado nem alterar URLs existentes antes de mapear referências persistidas no banco e leitores do PDF; preparar acesso autenticado/URLs assinadas com testes de regressão e rollback.
- O fato de haver 74 PDFs no Storage não comprova sozinho que todos sejam OS; validar vínculo pelo código e metadados sem divulgar nomes sensíveis.


### Auditoria confirmada das policies public (06/11/2026)
- 14 tabelas com policy `authenticated_all` (role authenticated, ALL, USING true, WITH CHECK true): atas_portais, chamados_portal, configuracoes, contratos_demanda_portal, demandas_cotesi, estoque_cobens, estoque_comarcas, estoque_cotesi, notas_fiscais, numeracao, ordens_servico, portais_garantia, unidades_estoque, usuarios_sistema.
- `ordens_servico` e `portais_garantia` possuem adicionalmente `leitura_publica`, SELECT, role `public`, USING true. `public` inclui anon e authenticated.
- `sla_manual`: SELECT anon/authenticated USING true; INSERT, UPDATE, DELETE para authenticated com true.
- `tecnicos_app`: RLS habilitado, sem policies de acesso direto; auditar RPCs SECURITY DEFINER separadamente.
- Risco: políticas amplas permitem operações dentro dos grants SQL disponíveis; verificar grants e fluxo real de login antes de restringir. Não alterar produção sem migração testada.
- [ ] Auditar privilégios SQL de anon/authenticated, roles de usuários, policies e funções definer, exposição REST e dependências de leitura pública; elaborar migração com testes de regressão.
