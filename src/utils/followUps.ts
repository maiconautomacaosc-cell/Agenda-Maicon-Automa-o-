import { Appointment, Client, Quote, WarrantyPeriod } from '../types';

export type FollowUpKind = 'atrasado' | 'amanha' | 'garantia' | 'orcamento' | 'pos_venda';
export type FollowUpPriority = 'alta' | 'media' | 'baixa';
export type FollowUpMode = 'operacao' | 'teste';

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
  simulated?: boolean;
}

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

const getTestFallbackItems = (clients: Client[], existing: FollowUpItem[]): FollowUpItem[] => {
  const testClient = clients.find(c => c.isTestClient);
  if (!testClient) return [];

  const ma = testClient.equipment?.[0]?.serialNumber || testClient.serialNumber || 'MA TESTE';
  const has = (kind: FollowUpKind) => existing.some(item => item.kind === kind);
  const safeName = testClient.name || 'CLIENTE TESTE — MAICON AUTOMAÇÃO';

  const demo: FollowUpItem[] = [
    {
      id: 'test-sim-atrasado',
      kind: 'atrasado',
      priority: 'alta',
      title: `${safeName} • atendimento atrasado`,
      subtitle: 'SIMULAÇÃO • serviço pendente desde ontem',
      clientId: testClient.id,
      simulated: true,
    },
    {
      id: 'test-sim-amanha',
      kind: 'amanha',
      priority: 'media',
      title: `${safeName} • serviço de amanhã`,
      subtitle: 'SIMULAÇÃO • agendamento para amanhã às 09:00',
      clientId: testClient.id,
      simulated: true,
    },
    {
      id: 'test-sim-garantia',
      kind: 'garantia',
      priority: 'media',
      title: `${safeName} • garantia perto do vencimento`,
      subtitle: `SIMULAÇÃO • ${ma} • vence em 15 dias`,
      clientId: testClient.id,
      simulated: true,
    },
    {
      id: 'test-sim-orcamento',
      kind: 'orcamento',
      priority: 'media',
      title: `${safeName} • orçamento aguardando retorno`,
      subtitle: 'SIMULAÇÃO • orçamento pendente há 4 dias',
      clientId: testClient.id,
      simulated: true,
    },
    {
      id: 'test-sim-posvenda',
      kind: 'pos_venda',
      priority: 'baixa',
      title: `${safeName} • acompanhamento pós-venda`,
      subtitle: `SIMULAÇÃO • ${ma} • último serviço há 180 dias`,
      clientId: testClient.id,
      simulated: true,
    },
  ];

  return demo.filter(item => !has(item.kind));
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
    const belongsToTest = !!a.isTestData || testClientIds.has(a.clientId);
    return mode === 'teste' ? belongsToTest : !belongsToTest;
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
      const belongsToTest = !!q.isTestData || (!!q.clientId && testClientIds.has(q.clientId));
      return mode === 'teste' ? belongsToTest : !belongsToTest;
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
    .filter(client => mode === 'teste' ? !!client.isTestClient : !client.isTestClient)
    .forEach(client => {
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

  if (mode === 'teste') items.push(...getTestFallbackItems(clients, items));

  const weight: Record<FollowUpPriority, number> = { alta: 0, media: 1, baixa: 2 };
  return items.sort((a, b) => weight[a.priority] - weight[b.priority] || (a.date || '').localeCompare(b.date || ''));
};
