import { Appointment } from '../types';

/**
 * Fonte única para dinheiro efetivamente recebido fora de um Fechamento Comercial.
 *
 * Compatibilidade:
 * - registros históricos antigos (antes do controle por recebimentos) continuam sendo
 *   tratados como quitados quando concluídos e sem `payments`;
 * - atendimentos novos marcados `financialPending`, e todo atendimento Sandbox MAT/OST,
 *   nunca são presumidos como pagos sem um lançamento real.
 */
export const appointmentReceivedAmount = (appointment: Appointment): number => {
  if (appointment.payments !== undefined) {
    return appointment.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  const sandboxIdentity =
    String(appointment.serviceOrder || '').toUpperCase().startsWith('OST-') ||
    String(appointment.serialNumber || '').toUpperCase().startsWith('MAT-') ||
    (appointment.equipment || []).some(eq => String(eq.serialNumber || '').toUpperCase().startsWith('MAT-'));

  if (appointment.financialPending || sandboxIdentity) return 0;

  return appointment.status === 'concluido' ? Number(appointment.price || 0) : 0;
};

export const appointmentFinancialStatus = (appointment: Appointment): 'pago' | 'parcial' | 'receber' => {
  const total = Number(appointment.price || 0);
  const received = appointmentReceivedAmount(appointment);
  if (total > 0 && received >= total - 0.005) return 'pago';
  if (received > 0) return 'parcial';
  return 'receber';
};
