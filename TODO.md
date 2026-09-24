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
- [ ] Definir com a Fernanda o método oficial de arredondamento (km/diária) e aplicar igual em `calcular()`, SEI, exportação e Alvo
- [x] Sincronizar Alvo: Correção cobrando como presencial; atendimento somado portal+presencial; RSD nas abas de peças/total por OS; linha 181-REMOTO no Total por OS (24/09 — Set/2026 = 127.302,28 nos dois)
- [ ] Trocar `join("<br>")` por `"\n"` na criação de OS de Correção (`PageAvaliacao`, `PageMedicao`, `PageLancamentoManual`)

## Débitos técnicos / organização

- [x] `FRAC_D`/`FRACAO_KM_ANEXO_VI` unificados em `calc-medicao.js` (15/09)
- [ ] Restante da lógica de cálculo ainda duplicada em vários blocos do `index.html` + `/alvo` — atualizar `calcularFracaoOS()` (hoje com regra antiga e sem uso) e passar a usá-la em todos os blocos, ou removê-la
- [ ] Fluxo de publish exige colar PAT manualmente toda sessão — avaliar salvar credencial no Git Credential Manager do Windows
