// ── CÁLCULO DE FRAÇÃO DE DIÁRIA — Contrato 181/2026 (Anexo VI) ──────────────
// Compartilhado entre o sistema principal (SGTI, na raiz) e o portal Alvo
// (/alvo), pra nunca mais dessincronizar os dois cálculos. Qualquer ajuste
// nos pesos ou na regra oficial deve ser feito SÓ aqui.
//
// AVISO: não mexer nos valores de FRAC_D nem em FRACAO_KM_ANEXO_VI sem
// confirmar antes com a fiscal — são os pesos oficiais do Anexo VI do
// contrato 181/2026.

const FRAC_D = {'3.1.1':0.125,'3.1.2':0.25,'3.1.3':0.375,'3.1.4':0.25,'3.1.5':0.125,'3.1.6':0.125,'3.1.7':0.125,'3.1.8':0.25,'3.1.9':0.25,'3.1.10':0.125,'3.1.11':0.125,'3.1.12':0.125,'3.1.13':0.375,'3.1.14':0.25,'3.2.1':0.125,'3.2.2':0.125,'3.2.3':0.125,'3.2.4':0.125,'3.2.5':0.125,'3.2.6':0.125,'3.3.1':0.125,'3.3.2':0.125,'3.4':0.188,'3.5.1':0.125,'3.5.2':0.125,'3.5.3':0.125,'3.5.4':0.125,'3.5.5':0.125,'3.5.6':0.125,'3.5.7':0.125,'3.5.8':0.125,'3.6.1':1.0,'3.6.2':1.0,'3.6.3':1.0,'3.6.4':0.0041667,'3.7.1':0.125,'3.7.2':0.125,'3.7.3':0.125,'3.7.4':0.125,'3.8.1':0.125,'3.8.2':0.125,'3.8.3':0.125,'3.8.4':0.125,'3.8.5':0.125,'3.8.6':0.125,'3.8.7':0.125,'3.8.9':0.125,'3.8.10':0.125,'3.8.11':0.125,'3.8.12':0.125,'3.8.13':0.125,'3.8.14':0.125,'3.8.15':0.125,'3.8.16':0.125,'3.8.17':0.125,'3.8.18':0.125,'3.9.1':0.125,'3.9.2':0.125,'3.9.3':0.125,'3.9.4':0.125,'3.9.5':0.25,'3.9.6':0.25,'3.9.7':0.5,'3.9.8':0.25,'3.10':0.75};
const FRACAO_KM_ANEXO_VI = 0.0032468;

// Fração de diária de UMA OS, regra oficial do contrato 181/2026 (Anexo VI):
// - Colar Metropolitano OU tipo "Correção": fração zerada (a garantia já cobre
//   o dia pago na visita original — não cobra de novo).
// - Caso contrário: base (1.25 se for Raio-X/scanner, senão 1.0)
//   + soma das peças usadas na OS (peso de cada peça em FRAC_D)
//   + km rodado * FRACAO_KM_ANEXO_VI
function calcularFracaoOS({ isColarOS, isCorrecaoOS, isRaioServ, kmOS, pecas }) {
  if (isColarOS || isCorrecaoOS) return 0;
  const base = isRaioServ ? 1.25 : 1.0;
  const fracaoPecas = (pecas || []).filter(p => p.desc).reduce((a, p) => a + (FRAC_D[p.cod] || 0) * (parseFloat(p.qtd) || 1), 0);
  const fracaoDeslocamento = (kmOS || 0) * FRACAO_KM_ANEXO_VI;
  return base + fracaoPecas + fracaoDeslocamento;
}

// ── Garantia de serviço (90 dias) — regra confirmada pela fiscal em 28/09/2026 ──
// OS de Correção (retorno de uma OS original, número "{original}-R", campo
// os_origem = numero da OS original) aberta DENTRO da janela de garantia de
// serviço não pode cobrar atendimento, km/deslocamento nem diária — só as
// peças eventualmente substituídas (materiais são cobrados sempre, mesmo
// dentro da garantia). Fora da janela de 90 dias, a Correção cobra igual a
// uma OS presencial normal.
// AVISO: não mexer nesse prazo/regra sem confirmar antes com a fiscal.
const GARANTIA_SERVICO_DIAS = 90;
// Regra de 19/10/2026: a visita (atendimento+km+diária) é paga UMA vez, na Correção (que replica km/peças da 1ª OS);
// a 1ª OS insatisfatória fica fora da medição. Por isso Correção NÃO é mais "só peças". Para voltar à regra de 28/09, trocar para true.
const CORRECAO_GARANTIA_SO_PECAS = false;
// Marcador [MESMA_VISITA] (Histórico): OS atendida na mesma visita de outra OS — cobra atendimento e peças, mas NÃO km nem diária.
function semVisitaOS(o) {
  return !!o && ((o.observacoes || "").indexOf("[MESMA_VISITA]") >= 0 || retornoPagoOS(o));
}
// Marcador [RETORNO_PAGO]: retorno (dentro da garantia de 90 dias) de OS que JÁ FOI PAGA em medição anterior.
// Cobra só as peças e a fração de diária delas: sem atendimento, sem km, sem diária base. (semVisitaOS cobre km/base.)
function retornoPagoOS(o) {
  return !!o && (o.observacoes || "").indexOf("[RETORNO_PAGO]") >= 0;
}
function isCorrecaoDentroGarantia(o, todasOS, dias) {
  // Marcador por OS [SO_PECAS] (Histórico): fiscalização decidiu que esta OS só cobra peças (sem atendimento/km/diária)
  if (o && (o.observacoes || "").indexOf("[SO_PECAS]") >= 0) return true;
  if (!CORRECAO_GARANTIA_SO_PECAS) return false;
  dias = dias || GARANTIA_SERVICO_DIAS;
  if (!o || o.tipo !== "Correção" || !o.os_origem) return false;
  if ((o.observacoes || "").indexOf("[COBRAR_VISITA]") >= 0) return false; // fiscalização autorizou cobrar a visita (marcador no Histórico)
  const original = (todasOS || []).find(x => x.numero === o.os_origem);
  if (!original) return false; // original não encontrada: cobra normal (comportamento anterior, conservador)
  const dtOriginal = new Date((original.data_os || "") + "T12:00");
  const dtAtual = new Date((o.data_os || o.data_conclusao || "") + "T12:00");
  if (isNaN(dtOriginal) || isNaN(dtAtual)) return false;
  const diffDias = (dtAtual - dtOriginal) / 86400000;
  return diffDias >= 0 && diffDias <= dias;
}

// ── Instalação de câmeras/DVR (itens 3.8.15–3.8.18 do Anexo V, R$ 33,94/un) — desde 13/10/2026 ──
// Regra: até 5 câmeras instaladas POR OS (dome + bullet + speed dome somadas) já estão previstas no
// valor do atendimento — não cobram. Da 6ª em diante cobra o valor unitário. DVR (3.8.18) cobra sempre.
// pecasCobraveis(pecas) devolve a lista da OS já com as quantidades COBRÁVEIS (franquia descontada);
// todo cálculo de materiais/uso deve usar esta lista em vez de r.pecas cru.
const INSTALACAO_CAMERAS_COD = ["3.8.15", "3.8.16", "3.8.17"];
const INSTALACAO_FRANQUIA_CAMERAS = 5;
function pecasCobraveis(pecas) {
  let franquia = INSTALACAO_FRANQUIA_CAMERAS;
  const out = [];
  (pecas || []).forEach(p => {
    if (!p || !INSTALACAO_CAMERAS_COD.includes(p.cod)) { out.push(p); return; }
    const q = parseFloat(p.qtd) || 1;
    const gratis = Math.min(q, franquia);
    franquia -= gratis;
    const cobrar = q - gratis;
    if (cobrar > 0) out.push({ ...p, qtd: cobrar });
  });
  return out;
}

if (typeof window !== "undefined") {
  window.SGTI_CALC = { FRAC_D, FRACAO_KM_ANEXO_VI, calcularFracaoOS, GARANTIA_SERVICO_DIAS, isCorrecaoDentroGarantia, pecasCobraveis, INSTALACAO_FRANQUIA_CAMERAS };
}
