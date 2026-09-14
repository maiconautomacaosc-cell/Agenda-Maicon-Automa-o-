import { Appointment, Client, Quote, WarrantyPeriod } from '../types';

export type FollowUpKind = 'atrasado' | 'amanha' | 'garantia' | 'orcamento' | 'pos_venda' | 'bateria';
export type FollowUpPriority = 'alta' | 'media' | 'baixa';
export type FollowUpMode = 'operacao' | 'sandbox';
export type FollowUpActionStatus = 'adiado' | 'resolvido' | 'dispensado';

export interface FollowUpItem {
  id: string;
  kind: FollowUpKind;
  priority: FollowUpPriority;
  title: string;
  subtitle: string;
  date?: string;
  clientId?: string;
  appointmentId?: string;
  quoteId?: string;
  serialNumber?: string;
}

export interface FollowUpAction {
  id: string;
  status: FollowUpActionStatus;
  until?: string;
  updatedAt: string;
}

const ACTION_KEYS = {
  operacao: 'maicon_followup_actions_v440',
  sandbox: 'maicon_followup_actions_sandbox_v440',
};

const warrantyMonths: Record<WarrantyPeriod, number> = {
  'Sem garantia': 0,
  '1 Mês': 1,
  '3 Meses': 3,
  '6 Meses': 6,
  '12 Meses': 12,
  '24 Meses': 24,
  '36 Meses': 36,
};

const atNoon = (date: string) => new Date(`${date}T12:00:00`);
const dayDiff = (future: Date, base: Date) => Math.ceil((future.getTime() - base.getTime()) / 86400000);
const formatDate = (date: string) => atNoon(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: string, months: number) => {
  const d = atNoon(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const monthDiff = (later: Date, earlier: Date) =>
  (later.getFullYear() - earlier.getFullYear()) * 12 + (later.getMonth() - earlier.getMonth()) - (later.getDate() < earlier.getDate() ? 1 : 0);

const dateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const loadFollowUpActions = (sandbox = false): Record<string, FollowUpAction> => {
  try {
    const raw = localStorage.getItem(sandbox ? ACTION_KEYS.sandbox : ACTION_KEYS.operacao);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveFollowUpAction = (action: FollowUpAction, sandbox = false) => {
  const actions = loadFollowUpActions(sandbox);
  actions[action.id] = action;
  localStorage.setItem(sandbox ? ACTION_KEYS.sandbox : ACTION_KEYS.operacao, JSON.stringify(actions));
};

export const restoreFollowUpAction = (id: string, sandbox = false) => {
  const actions = loadFollowUpActions(sandbox);
  delete actions[id];
  localStorage.setItem(sandbox ? ACTION_KEYS.sandbox : ACTION_KEYS.operacao, JSON.stringify(actions));
};

export const resetFollowUpActions = (sandbox = false) => {
  localStorage.removeItem(sandbox ? ACTION_KEYS.sandbox : ACTION_KEYS.operacao);
};

export const filterVisibleFollowUps = (items: FollowUpItem[], todayString: string, sandbox = false) => {
  const actions = loadFollowUpActions(sandbox);
  return items.filter(item => {
    const action = actions[item.id];
    if (!action) return true;
    if (action.status === 'resolvido' || action.status === 'dispensado') return false;
    if (action.status === 'adiado' && action.until) return action.until <= todayString;
    return true;
  });
};

export const getHiddenFollowUps = (items: FollowUpItem[], todayString: string, sandbox = false) => {
  const visible = new Set(filterVisibleFollowUps(items, todayString, sandbox).map(i => i.id));
  const actions = loadFollowUpActions(sandbox);
  return items
    .filter(i => !visible.has(i.id) && actions[i.id])
    .map(item => ({ item, action: actions[item.id] }));
};

export const getFollowUps = (
  appointments: Appointment[],
  clients: Client[],
  quotes: Quote[],
  todayString: string,
  mode: FollowUpMode = 'operacao',
): FollowUpItem[] => {
  const today = atNoon(todayString);
  const tomorrowString = addDays(today, 1).toISOString().slice(0, 10);
  const testClientIds = new Set(clients.filter(c => c.isTestClient).map(c => c.id));

  const isEligibleAppointment = (a: Appointment) => {
    if (a.serviceType === 'compromisso_particular' || a.status === 'cancelado') return false;
    if (mode === 'sandbox') return true;
    const belongsToTest = !!a.isTestData || testClientIds.has(a.clientId);
    return !belongsToTest;
  };

  const items: FollowUpItem[] = [];

  appointments.filter(isEligibleAppointment).forEach(a => {
    const open = a.status === 'pendente' || a.status === 'em_andamento';
    if (open && a.date < todayString) {
      const daysLate = Math.max(1, -dayDiff(atNoon(a.date), today));
      items.push({
        id: `late-${a.id}`,
        kind: 'atrasado',
        priority: 'alta',
        title: `${a.clientName} • atendimento atrasado`,
        subtitle: `${a.serviceTypeName} • ${daysLate} ${daysLate === 1 ? 'dia' : 'dias'} em aberto`,
        date: a.date,
        clientId: a.clientId,
        appointmentId: a.id,
      });
    } else if (open && a.date === tomorrowString) {
      items.push({
        id: `tomorrow-${a.id}`,
        kind: 'amanha',
        priority: 'media',
        title: `${a.clientName} • amanhã às ${a.startTime}`,
        subtitle: a.serviceTypeName,
        date: a.date,
        clientId: a.clientId,
        appointmentId: a.id,
      });
    }

    if (a.status === 'concluido' && a.installationWarranty) {
      const months = warrantyMonths[a.installationWarranty];
      if (months > 0) {
        const expires = addMonths(a.date, months);
        const days = dayDiff(expires, today);
        if (days >= 0 && days <= 30) {
          items.push({
            id: `warranty-${a.id}`,
            kind: 'garantia',
            priority: days <= 7 ? 'alta' : 'media',
            title: `${a.clientName} • garantia perto do vencimento`,
            subtitle: days === 0 ? 'Vence hoje' : `Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`,
            date: a.date,
            clientId: a.clientId,
            appointmentId: a.id,
          });
        }
      }
    }
  });

  quotes
    .filter(q => {
      if (q.status !== 'pendente') return false;
      if (mode === 'sandbox') return true;
      const belongsToTest = !!q.isTestData || (!!q.clientId && testClientIds.has(q.clientId));
      return !belongsToTest;
    })
    .forEach(q => {
      const sourceDate = (q.createdAt || q.date || '').slice(0, 10);
      if (!sourceDate) return;
      const waitingDays = Math.max(0, -dayDiff(atNoon(sourceDate), today));
      if (waitingDays >= 3) {
        items.push({
          id: `quote-${q.id}`,
          kind: 'orcamento',
          priority: waitingDays >= 7 ? 'alta' : 'media',
          title: `${q.clientName} • orçamento aguardando retorno`,
          subtitle: `${q.code} • há ${waitingDays} ${waitingDays === 1 ? 'dia' : 'dias'}`,
          clientId: q.clientId,
          quoteId: q.id,
        });
      }
    });

  clients
    .filter(client => mode === 'sandbox' ? true : !client.isTestClient)
    .forEach(client => {
      // Lembrete preventivo trimestral por equipamento/MA com bateria.
      // O ciclo é ancorado na data de cadastro/instalação e cada trimestre recebe um ID próprio,
      // assim resolver o aviso atual nunca bloqueia os próximos.
      (client.equipment || []).filter(eq => eq.usesBattery).forEach(eq => {
        // A bateria deve contar a partir da instalação/atendimento do MA, e não do momento
        // em que o registro foi criado no app. Isso também permite cadastrar hoje um
        // atendimento antigo sem reiniciar o ciclo trimestral.
        const relatedCompletedDates = appointments
          .filter(a =>
            a.clientId === client.id &&
            isEligibleAppointment(a) &&
            a.status === 'concluido' &&
            (
              a.serialNumber === eq.serialNumber ||
              a.maintenanceSerialNumber === eq.serialNumber ||
              (a.equipment || []).some(item => item.serialNumber === eq.serialNumber)
            )
          )
          .map(a => String(a.date || '').slice(0, 10))
          .filter(Boolean)
          .sort();

        // Usa a data mais antiga associada ao MA como referência da instalação.
        // createdAt fica apenas como fallback para equipamentos legados sem atendimento associado.
        const installedDate = relatedCompletedDates[0] || String(eq.createdAt || '').slice(0, 10);
        if (!installedDate) return;
        const installed = atNoon(installedDate);
        if (installed > today) return;
        const elapsedMonths = monthDiff(today, installed);
        const cycle = Math.floor(elapsedMonths / 3);
        if (cycle < 1) return;
        const due = addMonths(installedDate, cycle * 3);
        if (due > today) return;
        const nextDue = addMonths(installedDate, (cycle + 1) * 3);
        const daysSinceDue = Math.max(0, -dayDiff(due, today));
        items.push({
          id: `battery-${eq.serialNumber}-${cycle}`,
          kind: 'bateria',
          priority: daysSinceDue >= 15 ? 'media' : 'baixa',
          title: `${client.name} • lembrete de bateria`,
          subtitle: `${eq.serialNumber} • ciclo de ${cycle * 3} meses${daysSinceDue ? ` • vencido há ${daysSinceDue} dia${daysSinceDue === 1 ? '' : 's'}` : ' • vence hoje'}`,
          date: dateOnly(due),
          clientId: client.id,
          serialNumber: eq.serialNumber,
        });
        // nextDue é calculado para manter o ciclo ancorado e documentar a recorrência trimestral.
        void nextDue;
      });

      const completed = appointments
        .filter(a => a.clientId === client.id && isEligibleAppointment(a) && a.status === 'concluido')
        .sort((a, b) => b.date.localeCompare(a.date));
      if (!completed.length) return;
      const latest = completed[0];
      const daysSince = Math.max(0, -dayDiff(atNoon(latest.date), today));
      if (daysSince >= 180) {
        items.push({
          id: `aftercare-${client.id}`,
          kind: 'pos_venda',
          priority: 'baixa',
          title: `${client.name} • acompanhamento pós-venda`,
          subtitle: `Último serviço há ${daysSince} dias (${formatDate(latest.date)})`,
          clientId: client.id,
          date: latest.date,
        });
      }
    });

  const weight: Record<FollowUpPriority, number> = { alta: 0, media: 1, baixa: 2 };
  return items.sort((a, b) => weight[a.priority] - weight[b.priority] || (a.date || '').localeCompare(b.date || ''));
};
