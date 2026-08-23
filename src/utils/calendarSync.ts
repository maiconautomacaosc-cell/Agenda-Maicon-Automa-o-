import { Appointment } from '../types';

/**
 * Helper to format date strings for Google Calendar & iCalendar (.ics)
 * Format: YYYYMMDDTHHmm00
 */
function formatDateTimeToIcs(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Generate a 1-click Direct Google Calendar Event URL
 * Opens directly in the Google Calendar App on Android / iOS or Web
 */
export function getGoogleCalendarUrl(appt: Appointment): string {
  const isParticular = appt.serviceType === 'compromisso_particular';
  const title = encodeURIComponent(
    isParticular
      ? `🚫 [OCUPADO] ${appt.clientName || 'Compromisso Particular'}`
      : `🔐 [Maicon Automação] ${appt.clientName} - ${appt.serviceTypeName}`
  );
  
  const startFormatted = formatDateTimeToIcs(appt.date, appt.startTime);
  const endFormatted = formatDateTimeToIcs(appt.date, appt.endTime || appt.startTime);
  
  const detailsText = isParticular
    ? [
        `🚫 COMPROMISSO PARTICULAR / DIA OCUPADO`,
        `📌 MOTIVO: ${appt.clientName}`,
        appt.description ? `📝 DETALHES: ${appt.description}` : '',
        appt.notes ? `🗒️ NOTAS: ${appt.notes}` : '',
        `\n--\nHorário reservado - Não agendar atendimentos.`
      ].filter(Boolean).join('\n')
    : [
        `🔧 SERVIÇO: ${appt.serviceTypeName}`,
        appt.lockModel ? `🔑 MODELO DA FECHADURA: ${appt.lockModel}` : '',
        `👤 CLIENTE: ${appt.clientName}`,
        `📱 TELEFONE: ${appt.clientPhone}`,
        `📍 ENDEREÇO: ${appt.address} ${appt.neighborhood ? `(${appt.neighborhood})` : ''}`,
        appt.price ? `💰 VALOR: R$ ${appt.price.toFixed(2)} (${appt.paymentMethod?.toUpperCase() || 'PIX'})` : '',
        appt.notes ? `📝 OBSERVAÇÕES: ${appt.notes}` : '',
        `\n--\nAgendado via Maicon Automação - Especialista em Fechaduras Digitais`
      ].filter(Boolean).join('\n');

  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(
    isParticular && (!appt.address || appt.address === 'A combinar')
      ? ''
      : `${appt.address}, ${appt.neighborhood || ''}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${details}&location=${location}`;
}

/**
 * Generate and Download standard .ICS file for Native Mobile Calendar
 * (Samsung Calendar, Android Native Calendar, Apple Calendar, Outlook)
 * Includes native audio alarm trigger configured with the appointment's reminder time!
 */
export function downloadNativeCalendarIcs(appt: Appointment): void {
  const startFormatted = formatDateTimeToIcs(appt.date, appt.startTime);
  const endFormatted = formatDateTimeToIcs(appt.date, appt.endTime || appt.startTime);
  const reminderMinutes = appt.reminderMinutesBefore ?? 60;

  const description = [
    `SERVICO: ${appt.serviceTypeName}`,
    appt.lockModel ? `MODELO: ${appt.lockModel}` : '',
    `CLIENTE: ${appt.clientName} - Tel: ${appt.clientPhone}`,
    `ENDERECO: ${appt.address}`,
    appt.notes ? `OBS: ${appt.notes}` : '',
  ].filter(Boolean).join(' \\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Maicon Automacao//Agenda Fechaduras//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appt-${appt.id}-${Date.now()}@maiconautomacao.com`,
    `DTSTAMP:${formatDateTimeToIcs(new Date().toISOString().slice(0, 10), '12:00')}`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
    `SUMMARY:🔐 Fechadura: ${appt.clientName} (${appt.serviceTypeName})`,
    `DESCRIPTION:${description}`,
    `LOCATION:${appt.address}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    `TRIGGER:-PT${reminderMinutes}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:⏰ ALERTA: Atendimento ${appt.clientName} em ${reminderMinutes} minutos!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `agendamento-${appt.clientName.toLowerCase().replace(/\s+/g, '-')}-${appt.date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all upcoming appointments to a single .ics calendar feed
 */
export function exportAllAppointmentsToIcs(appointments: Appointment[]): void {
  const activeAppts = appointments.filter(a => a.status !== 'cancelado');
  
  if (activeAppts.length === 0) {
    alert('Nenhum agendamento ativo para exportar.');
    return;
  }

  const events = activeAppts.map(appt => {
    const startFormatted = formatDateTimeToIcs(appt.date, appt.startTime);
    const endFormatted = formatDateTimeToIcs(appt.date, appt.endTime || appt.startTime);
    const reminderMinutes = appt.reminderMinutesBefore ?? 60;
    
    return [
      'BEGIN:VEVENT',
      `UID:appt-${appt.id}@maiconautomacao.com`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:🔐 ${appt.clientName} - ${appt.serviceTypeName}`,
      `DESCRIPTION:Cliente: ${appt.clientName}\\nTel: ${appt.clientPhone}\\nFechadura: ${appt.lockModel || 'Digital'}\\nEndereço: ${appt.address}`,
      `LOCATION:${appt.address}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      `TRIGGER:-PT${reminderMinutes}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:⏰ ALARME: Atendimento ${appt.clientName}`,
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  const icsFull = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Maicon Automacao//Agenda Geral//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsFull], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `agenda-maicon-automacao-${new Date().toISOString().slice(0, 10)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
