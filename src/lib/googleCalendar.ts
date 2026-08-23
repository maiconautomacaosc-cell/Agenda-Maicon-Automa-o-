import { Appointment } from '../types';

/**
 * Google Calendar API Service (REST v3)
 * Automatically creates, updates, and removes events from primary Google Calendar
 * with native phone popup reminder alerts configured.
 */

interface GoogleCalendarDateTime {
  dateTime: string;
  timeZone?: string;
}

interface GoogleCalendarEventPayload {
  summary: string;
  description: string;
  location?: string;
  start: GoogleCalendarDateTime;
  end: GoogleCalendarDateTime;
  reminders: {
    useDefault: boolean;
    overrides: Array<{
      method: 'popup' | 'email';
      minutes: number;
    }>;
  };
  colorId?: string; // 11 = Red/Flamingo, 5 = Yellow/Banana, 9 = Blueberry/Cyan, 10 = Basil/Green
}

function buildEventPayload(appointment: Appointment): GoogleCalendarEventPayload {
  const [year, month, day] = appointment.date.split('-').map(Number);
  const [startH, startM] = appointment.startTime.split(':').map(Number);
  
  let endH = startH;
  let endM = startM + (appointment.durationMinutes || 90);
  while (endM >= 60) {
    endH += 1;
    endM -= 60;
  }
  if (appointment.endTime) {
    const [h, m] = appointment.endTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      endH = h;
      endM = m;
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  
  // Build ISO format with local time without UTC offset bug
  const formatOffset = (date: Date) => {
    const pad2 = (num: number) => String(num).padStart(2, '0');
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const hours = pad2(Math.floor(Math.abs(offset) / 60));
    const mins = pad2(Math.abs(offset) % 60);
    return `${sign}${hours}:${mins}`;
  };

  const sampleDate = new Date(year, month - 1, day, startH, startM);
  const tzOffset = formatOffset(sampleDate);
  const startIso = `${year}-${pad(month)}-${pad(day)}T${pad(startH)}:${pad(startM)}:00${tzOffset}`;
  const endIso = `${year}-${pad(month)}-${pad(day)}T${pad(endH)}:${pad(endM)}:00${tzOffset}`;

  // Get user timezone (default America/Sao_Paulo)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  const reminderMins = appointment.reminderMinutesBefore ?? 60;
  const overrides: Array<{ method: 'popup'; minutes: number }> = [];
  
  if (reminderMins > 0) {
    overrides.push({ method: 'popup', minutes: reminderMins });
  }
  // Secondary reminder 15 minutes before
  if (reminderMins !== 15) {
    overrides.push({ method: 'popup', minutes: 15 });
  }

  const isParticular = appointment.serviceType === 'compromisso_particular';

  const descLines = isParticular
    ? [
        `🚫 COMPROMISSO PARTICULAR / DIA OCUPADO`,
        `📌 MOTIVO: ${appointment.clientName}`,
        appointment.description ? `📝 DETALHES: ${appointment.description}` : null,
        appointment.notes ? `🗒️ NOTAS: ${appointment.notes}` : null,
        '',
        '🔒 Horário reservado no Agenda Maicon Automação - Não agendar atendimentos.'
      ].filter(Boolean).join('\n')
    : [
        `🔧 SERVIÇO: ${appointment.serviceTypeName}`,
        `👤 CLIENTE: ${appointment.clientName}`,
        `📞 TELEFONE/WHATSAPP: ${appointment.clientPhone}`,
        `📍 ENDEREÇO: ${appointment.address}`,
        appointment.neighborhood ? `🏘️ BAIRRO: ${appointment.neighborhood}` : null,
        appointment.lockModel ? `🔑 FECHADURA: ${appointment.lockModel}` : null,
        appointment.price ? `💰 VALOR: R$ ${appointment.price.toFixed(2)}` : null,
        appointment.notes ? `📝 OBSERVAÇÕES: ${appointment.notes}` : null,
        '',
        '🚀 Agendamento sincronizado automaticamente pelo Agenda Maicon Automação'
      ].filter(Boolean).join('\n');

  const summary = isParticular
    ? `🚫 [OCUPADO] ${appointment.clientName || 'Compromisso Particular'}`
    : `🔐 [Maicon Automação] ${appointment.clientName} - ${appointment.serviceTypeName}`;

  const location = isParticular
    ? (appointment.address && appointment.address !== 'A combinar' ? appointment.address : '')
    : `${appointment.address}${appointment.neighborhood ? `, ${appointment.neighborhood}` : ''}`;

  return {
    summary,
    description: descLines,
    location,
    start: {
      dateTime: startIso,
      timeZone,
    },
    end: {
      dateTime: endIso,
      timeZone,
    },
    reminders: {
      useDefault: false,
      overrides,
    },
    colorId: isParticular ? '11' : (appointment.status === 'concluido' ? '10' : '9'),
  };
}

/**
 * Creates a new event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  appointment: Appointment,
  accessToken: string
): Promise<{ eventId: string; htmlLink?: string }> {
  const payload = buildEventPayload(appointment);

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Erro ${res.status} ao criar evento no Google Calendar`);
  }

  const data = await res.json();
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
  };
}

/**
 * Updates an existing event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  appointment: Appointment,
  accessToken: string
): Promise<{ eventId: string; htmlLink?: string }> {
  if (!appointment.googleEventId) {
    // If not existing yet, create it
    return createGoogleCalendarEvent(appointment, accessToken);
  }

  const payload = buildEventPayload(appointment);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(appointment.googleEventId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (res.status === 404) {
    // Event was deleted in Google Calendar, re-create it
    return createGoogleCalendarEvent(appointment, accessToken);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Erro ${res.status} ao atualizar evento no Google Calendar`);
  }

  const data = await res.json();
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
  };
}

/**
 * Deletes an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  eventId: string,
  accessToken: string
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 404 || res.status === 410) {
    return true; // Already removed
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Erro ${res.status} ao excluir evento no Google Calendar`);
  }

  return true;
}

/**
 * Syncs multiple appointments in batch to Google Calendar
 */
export async function syncAllToGoogleCalendar(
  appointments: Appointment[],
  accessToken: string
): Promise<{ syncedCount: number; errors: number }> {
  let syncedCount = 0;
  let errors = 0;

  for (const appt of appointments) {
    try {
      await updateGoogleCalendarEvent(appt, accessToken);
      syncedCount++;
    } catch (e) {
      console.warn(`Erro ao sincronizar agendamento ${appt.id}:`, e);
      errors++;
    }
  }

  return { syncedCount, errors };
}
