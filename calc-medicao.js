// ── CÁLCULO DE FRAÇÃO DE DIÁRIA — Contrato 181/2026 (Anexo VI) ──────────────
// Compartilhado entre o sistema principal (SGTI, na raiz) e o portal Alvo
// (/alvo), pra nunca mais dessincronizar os dois cálculos. Qualquer ajuste
// nos pesos ou na regra oficial deve ser feito SÓ aqui.
//
// AVISO: não mexer nos valores de FRAC_D nem em FRACAO_KM_ANEXO_VI sem
// confirmar antes com a fiscal — são os pesos oficiais do Anexo VI do
// contrato 181/2026.

const FRAC_D = {'3.1.1':0.125,'3.1.2':0.25,'3.1.3':0.375,'3.1.4':0.25,'3.1.5':0.125,'3.1.6':0.125,'3.1.7':0.125,'3.1.8':0.25,'3.1.9':0.25,'3.1.10':0.125,'3.1.11':0.125,'3.1.12':0.125,'3.1.13':0.375,'3.1.14':0.25,'3.2.1':0.125,'3.2.2':0.125,'3.2.3':0.125,'3.2.4':0.125,'3.2.5':0.125,'3.2.6':0.125,'3.3.1':0.125,'3.3.2':0.125,'3.4':0.188,'3.5.1':0.125,'3.5.2':0.125,'3.5.3':0.125,'3.5.4':0.125,'3.5.5':0.125,'3.5.6':0.125,'3.5.7':0.125,'3.5.8':0.125,'3.6.1':1.0,'3.6.2':1.0,'3.6.3':1.0,'3.6.4':0.0041667,'3.7.1':0.125,'3.7.2':0.125,'3.7.3':0.125,'3.7.4':0.125,'3.8.1':0.125,'3.8.2':0.125,'3.8.3':0.125,'3.8.4':0.125,'3.8.5':0.125,'3.8.6':0.125,'3.8.7':0.125,'3.8.9':0.125,'3.8.10':0.125,'3.8.11':0.125,'3.8.12':0.125,'3.8.13':0.125,'3.8.14':0.125,'3.9.1':0.125,'3.9.2':0.125,'3.9.3':0.125,'3.9.4':0.125,'3.9.5':0.25,'3.9.6':0.25,'3.9.7':0.5,'3.9.8':0.25,'3.10':0.75};
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

if (typeof window !== "undefined") {
  window.SGTI_CALC = { FRAC_D, FRACAO_KM_ANEXO_VI, calcularFracaoOS };
}
