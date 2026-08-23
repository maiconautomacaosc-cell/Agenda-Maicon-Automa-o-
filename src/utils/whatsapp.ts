import { Appointment, Quote } from '../types';
import { formatDateBR, formatCurrencyBRL } from './date';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  title: string;
  category: 'confirmacao' | 'lembrete' | 'a_caminho' | 'conclusao' | 'personalizado';
  template: string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'confirmacao',
    name: 'Confirmação de Agendamento',
    title: '✅ Confirmação do Serviço',
    category: 'confirmacao',
    template: `Olá, *{cliente}*! Tudo bem?

Aqui é da *Maicon Automação* (Instalação e Manutenção de Fechaduras Eletrônicas). 🔐

Gostaria de confirmar nosso agendamento:
📅 *Data:* {data}
⏰ *Horário:* {horario}
🔧 *Serviço:* {servico}
📍 *Endereço:* {endereco}
💰 *Valor estimado:* {valor}

Poderia por favor confirmar se este horário está tudo certo para você? Agradeço desde já!`,
  },
  {
    id: 'lembrete_vespera',
    name: 'Lembrete de Véspera (Amanhã)',
    title: '⏰ Lembrete de Agendamento',
    category: 'lembrete',
    template: `Olá, *{cliente}*! Passando para lembrar do nosso serviço agendado para amanhã:

📅 *Data:* {data}
⏰ *Horário:* {horario}
🔧 *Serviço:* {servico}
📍 *Local:* {endereco}

Se precisar de qualquer ajuste ou instrução para acesso à portaria/residência, estou à disposição! 
*Maicon Automação* 🛠️`,
  },
  {
    id: 'a_caminho',
    name: 'Estou a Caminho',
    title: '🚗 Notificação de Deslocamento',
    category: 'a_caminho',
    template: `Olá, *{cliente}*! 🚗
Já estou me deslocando para o seu endereço para realizar o atendimento de *{servico}*.

📍 *Endereço:* {endereco}
⏰ *Previsão de chegada:* nos próximos minutos.

Por favor, se houver autorização prévia de portaria, já deixe avisado. Até logo! 🔐`,
  },
  {
    id: 'conclusao',
    name: 'Serviço Concluído & Pós-Venda',
    title: '⭐ Conclusão e Garantia',
    category: 'conclusao',
    template: `Olá, *{cliente}*! Muito obrigado pela confiança!

O serviço de *{servico}* na sua fechadura eletrônica foi finalizado com sucesso! ✅

🔐 *Garantia do Serviço:* 90 dias para regulagens e suporte técnico.
💡 *Dica:* Guarde as chaves físicas de emergência fora de casa (carro ou familiares) e use pilhas alcalinas de boa qualidade.

Qualquer dúvida no aplicativo ou configuração, estou sempre à disposição!
*Maicon Automação* 🌟`,
  },
  {
    id: 'pix_cobranca',
    name: 'Chave Pix para Pagamento',
    title: '💳 Dados para Pagamento',
    category: 'conclusao',
    template: `Olá, *{cliente}*! Segue os dados para pagamento do serviço de *{servico}*:

💰 *Valor Total:* {valor}
🔑 *Chave Pix:* [INSERIR CHAVE PIX AQUI]
🏦 *Favorecido:* Maicon Automação

Assim que realizar a transferência, por favor envie o comprovante por aqui. Muito obrigado! 🙏`,
  },
];

export function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // If it starts with 55 (Brazil country code) and has length >= 12, keep it
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  // If standard BR phone without country code (10 or 11 digits), prepend 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function buildMessageFromTemplate(templateText: string, appt: Appointment): string {
  return templateText
    .replace(/{cliente}/g, appt.clientName || 'Cliente')
    .replace(/{servico}/g, appt.serviceTypeName || appt.description || 'Instalação/Manutenção')
    .replace(/{data}/g, formatDateBR(appt.date))
    .replace(/{horario}/g, appt.startTime || 'A combinar')
    .replace(/{endereco}/g, appt.address || 'Conforme combinado')
    .replace(/{valor}/g, appt.price ? formatCurrencyBRL(appt.price) : 'A combinar')
    .replace(/{serie}/g, appt.serialNumber || 'N/A')
    .replace(/{os}/g, appt.serviceOrder || 'N/A');
}

export type WhatsAppTarget = 'standard' | 'business';

export function openWhatsApp(phone: string, message: string, target: WhatsAppTarget = 'standard'): void {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);

  if (target === 'business') {
    // Try opening deep link for WhatsApp Business or fallback to standard web url
    const businessUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    
    // In mobile browsers, whatsapp:// triggers the native app (or prompts)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = businessUrl;
      return;
    }
  }

  // Universal link (works in both standard WhatsApp mobile & web)
  const webUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

export function formatQuoteForWhatsApp(quote: Quote): string {
  const itemsText = quote.items
    .map((item, idx) => {
      const itemTotal = formatCurrencyBRL(item.total);
      const unit = item.quantity > 1 ? ` (${item.quantity}x ${formatCurrencyBRL(item.unitPrice)})` : '';
      return `${idx + 1}️⃣ *${item.description}*${unit}\n   ↳ Subtotal: ${itemTotal}`;
    })
    .join('\n\n');

  const discountText =
    quote.discountAmount && quote.discountAmount > 0
      ? `\n🏷️ *Desconto aplicado:* -${formatCurrencyBRL(quote.discountAmount)}`
      : '';

  const lockInfo = quote.lockModel ? `\n🔐 *Equipamento:* ${quote.lockModel}` : '';
  const doorInfo = quote.doorType ? `\n🚪 *Tipo de Porta:* ${quote.doorType}` : '';
  const addressInfo = quote.address ? `\n📍 *Local/Endereço:* ${quote.address}` : '';
  const notesInfo = quote.notes ? `\n📝 *Observações:* ${quote.notes}` : '';

  return `📄 *PROPOSTA / ORÇAMENTO TÉCNICO*
*MAICON AUTOMAÇÃO - FECHADURAS ELETRÔNICAS* 🔐
Nº: *#${quote.code}* | Data: ${formatDateBR(quote.date)}

Olá, *${quote.clientName}*! Segue a proposta detalhada para o seu atendimento:
${addressInfo}${lockInfo}${doorInfo}

📋 *SERVIÇOS & ITENS:*
${itemsText}
${discountText}
━━━━━━━━━━━━━━━━━━━━
💰 *VALOR TOTAL: ${formatCurrencyBRL(quote.totalAmount)}*
━━━━━━━━━━━━━━━━━━━━

💳 *Condições de Pagamento:*
${quote.paymentTerms}

🛡️ *Garantia:*
${quote.warrantyInfo}

⏳ *Validade da Proposta:* ${quote.validityDays} dias.${notesInfo}

Para aprovar este orçamento ou agendar a melhor data para a instalação/execução, basta responder a esta mensagem!
*Maicon Automação* 🛠️`;
}
