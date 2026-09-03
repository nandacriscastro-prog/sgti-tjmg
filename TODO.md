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

## Débitos técnicos / organização

- [ ] Lógica de cálculo duplicada em 3 lugares (`index.html`, `/alvo`, `/chamados-garantia`) — avaliar extrair funções compartilhadas (fração de diária, km, Anexo V) para um JS único incluído via `<script src>`, mantendo "sem build step"
- [ ] Fluxo de publish exige colar PAT manualmente toda sessão — avaliar salvar credencial no Git Credential Manager do Windows
