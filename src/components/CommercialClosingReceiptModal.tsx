import React from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer, X } from 'lucide-react';
import { Appointment, Client, CommercialClosing, PaymentRecord } from '../types';
import { closingTotal } from '../utils/commercialClosings';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';
import logoMaicon from '../assets/logo-maicon.png';

interface Props {
  closing: CommercialClosing;
  client: Client;
  appointments: Appointment[];
  payment: PaymentRecord;
  onClose: () => void;
}

const paymentKindLabel = (kind: PaymentRecord['kind']) => kind === 'sinal' ? 'Sinal / entrada' : kind === 'pagamento_final' ? 'Pagamento final' : 'Pagamento';
const paymentMethodLabel = (method: PaymentRecord['method']) => ({
  pix:'Pix', cartao_credito:'Cartão de crédito', cartao_debito:'Cartão de débito', dinheiro:'Dinheiro', faturado:'Faturado', a_combinar:'A combinar'
}[method]);
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] || c));
const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9À-ÿ _.-]+/g,'').replace(/\s+/g,'-').slice(0,80);

export const CommercialClosingReceiptModal: React.FC<Props> = ({ closing, client, appointments, payment, onClose }) => {
  const closingAppointments = closing.appointmentIds.map(id => appointments.find(a => a.id === id)).filter(Boolean) as Appointment[];
  const position = Math.max(0, closing.payments.findIndex(p => p.id === payment.id));
  const receiptCode = `${closing.id}-${String(position + 1).padStart(2,'0')}`;
  const total = closingTotal(closing, appointments);
  const receivedThroughThisPayment = closing.payments.slice(0, position + 1).reduce((sum,p)=>sum+(p.amount||0),0);
  const balanceAfter = Math.max(0, total - receivedThroughThisPayment);
  const isPaid = balanceAfter <= 0.009;
  const osList = closingAppointments.map(a=>a.serviceOrder).filter(Boolean).join(' • ') || 'Sem OS';
  const maList = Array.from(new Set(closingAppointments.flatMap(a => [a.serialNumber, ...(a.equipment||[]).map(e=>e.serialNumber)].filter(Boolean) as string[]))).join(' • ') || 'Sem MA';
  const reference = closingAppointments.map(a=>a.serviceTypeName).filter(Boolean).join(' • ') || 'Serviços Maicon Automação';

  const saveImage = async () => {
    const node = document.getElementById('closing-receipt-card');
    if (!node) return;
    const clone = node.cloneNode(true) as HTMLElement;
    clone.style.width = '760px'; clone.style.maxWidth='760px'; clone.style.margin='0';
    const wrap = document.createElement('div'); wrap.setAttribute('xmlns','http://www.w3.org/1999/xhtml'); wrap.style.width='760px'; wrap.style.background='#fff'; wrap.appendChild(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="1050"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(wrap)}</foreignObject></svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml;charset=utf-8'}); const url=URL.createObjectURL(blob); const img=new Image();
    img.onload=()=>{ const canvas=document.createElement('canvas'); canvas.width=1520; canvas.height=2100; const ctx=canvas.getContext('2d'); if(!ctx){URL.revokeObjectURL(url);return;} ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);const link=document.createElement('a');link.download=`recibo-${receiptCode}-${sanitize(client.name)}.png`;link.href=canvas.toDataURL('image/png',1);link.click(); };
    img.src=url;
  };

  const printReceipt = () => {
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recibo ${escapeHtml(receiptCode)}</title><style>
    *{box-sizing:border-box}html,body{margin:0;width:210mm;height:297mm;font-family:Arial,sans-serif;background:white;color:#111827}.sheet{width:210mm;height:297mm;overflow:hidden;padding:0 14mm 11mm}.top{height:42mm;margin:0 -14mm 9mm;padding:8mm 14mm;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(120deg,#05090d,#071722,#0b3040);border-bottom:3px solid #06b6d4}.logo{width:54mm;height:27mm;object-fit:contain;object-position:left center}.brand{text-align:right;color:white}.brand h1{margin:0;font-size:18pt}.brand p{margin:2mm 0 0;font-size:8pt;color:#a5f3fc}.title{display:flex;justify-content:space-between;align-items:center;margin-bottom:7mm}.title h2{font-size:20pt;margin:0}.title small{color:#64748b}.tag{padding:2.5mm 4mm;border-radius:20px;background:#ecfeff;color:#0e7490;font-weight:700;font-size:8pt}.grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.card{padding:3.5mm;border:1px solid #e2e8f0;border-radius:4mm}.wide{grid-column:1/-1}.label{font-size:7pt;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:.4px}.value{font-size:10pt;font-weight:700;margin-top:1.3mm}.money{margin-top:6mm;padding:6mm;border-radius:5mm;background:#0f172a;color:white}.big{font-size:26pt;font-weight:900;color:#5eead4;margin:2mm 0 5mm}.money-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.money-box{border:1px solid #334155;border-radius:3mm;padding:3mm}.k{font-size:7pt;color:#94a3b8}.v{font-size:12pt;font-weight:800;margin-top:1mm}.statement{margin-top:6mm;padding:4mm;border-left:3px solid #06b6d4;background:#f8fafc;font-size:9pt;line-height:1.45}.footer{position:absolute;left:14mm;right:14mm;bottom:8mm;border-top:1px solid #e2e8f0;padding-top:3mm;display:flex;justify-content:space-between;color:#64748b;font-size:7pt}@page{size:A4 portrait;margin:0}@media print{.actions{display:none!important}}
    </style></head><body><div class="sheet" style="position:relative"><div class="top"><img class="logo" src="${logoMaicon}"/><div class="brand"><h1>MAICON AUTOMAÇÃO</h1><p>Instalação de Fechaduras Eletrônicas</p></div></div><div class="title"><div><h2>RECIBO DE PAGAMENTO</h2><small>Comprovante nº ${escapeHtml(receiptCode)}</small></div><div class="tag">${isPaid?'SERVIÇO QUITADO':'PAGAMENTO PARCIAL'}</div></div><div class="grid"><div class="card"><div class="label">Cliente</div><div class="value">${escapeHtml(client.name)}</div></div><div class="card"><div class="label">Data do recebimento</div><div class="value">${escapeHtml(formatDateBR(payment.date))}</div></div><div class="card"><div class="label">Fechamento comercial</div><div class="value">${escapeHtml(closing.id)}</div></div><div class="card"><div class="label">Ordens de serviço</div><div class="value">${escapeHtml(osList)}</div></div><div class="card wide"><div class="label">Equipamentos / MA</div><div class="value">${escapeHtml(maList)}</div></div><div class="card wide"><div class="label">Referente a</div><div class="value">${escapeHtml(reference)}</div></div><div class="card"><div class="label">Tipo do recebimento</div><div class="value">${escapeHtml(paymentKindLabel(payment.kind))}</div></div><div class="card"><div class="label">Forma de pagamento</div><div class="value">${escapeHtml(paymentMethodLabel(payment.method))}</div></div><div class="card wide"><div class="label">Observação</div><div class="value">${escapeHtml(payment.note?.trim() || '—')}</div></div></div><div class="money"><div class="label">Valor recebido neste comprovante</div><div class="big">${escapeHtml(formatCurrencyBRL(payment.amount))}</div><div class="money-grid"><div class="money-box"><div class="k">Valor total do fechamento</div><div class="v">${escapeHtml(formatCurrencyBRL(total))}</div></div><div class="money-box"><div class="k">Saldo após este pagamento</div><div class="v">${escapeHtml(formatCurrencyBRL(balanceAfter))}</div></div></div></div><div class="statement">Recebemos de <b>${escapeHtml(client.name)}</b> o valor de <b>${escapeHtml(formatCurrencyBRL(payment.amount))}</b>, referente ao fechamento <b>${escapeHtml(closing.id)}</b>, pago por <b>${escapeHtml(paymentMethodLabel(payment.method))}</b>.</div><div class="footer"><span>Documento gerado eletronicamente pelo sistema Maicon Automação.</span><span>${escapeHtml(closing.id)} • ${escapeHtml(receiptCode)}</span></div></div><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`;
    const win=window.open('','_blank'); if(!win)return; win.document.open();win.document.write(html);win.document.close();
  };

  const modal = <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
    <div className="min-h-full w-full flex items-start sm:items-center justify-center p-3 sm:p-4">
    <div className="w-full max-w-2xl my-2 sm:my-4">
      <div className="flex justify-between items-center mb-3"><div><div className="text-[10px] text-cyan-400 font-black tracking-widest">RECIBO DO FECHAMENTO</div><div className="text-white font-black text-lg">{receiptCode}</div></div><button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-300"><X/></button></div>
      <div id="closing-receipt-card" className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200 relative">
        <div className="px-5 py-5 bg-gradient-to-r from-[#05090d] via-[#071722] to-[#0b3040] border-b-[3px] border-cyan-500 flex items-center justify-between gap-4"><img src={logoMaicon} className="w-44 h-20 object-contain object-left"/><div className="hidden sm:block text-right text-white"><div className="font-black text-lg">MAICON AUTOMAÇÃO</div><div className="text-[10px] text-cyan-200">Instalação de Fechaduras Eletrônicas</div></div></div>
        <div className="p-5 space-y-4"><div className="flex items-start justify-between gap-3"><div><div className="text-xl sm:text-2xl font-black tracking-tight">RECIBO DE PAGAMENTO</div><div className="text-[10px] text-slate-500 mt-1">Comprovante nº {receiptCode}</div></div><span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-black">{isPaid?'SERVIÇO QUITADO':'PAGAMENTO PARCIAL'}</span></div>
        <div className="grid grid-cols-2 gap-2 text-sm"><div className="p-3 rounded-xl border"><div className="text-[10px] text-slate-500 uppercase font-bold">Cliente</div><div className="font-bold">{client.name}</div></div><div className="p-3 rounded-xl border"><div className="text-[10px] text-slate-500 uppercase font-bold">Data</div><div className="font-bold">{formatDateBR(payment.date)}</div></div><div className="p-3 rounded-xl border"><div className="text-[10px] text-slate-500 uppercase font-bold">Fechamento</div><div className="font-bold">{closing.id}</div></div><div className="p-3 rounded-xl border"><div className="text-[10px] text-slate-500 uppercase font-bold">OS</div><div className="font-bold text-xs">{osList}</div></div><div className="col-span-2 p-3 rounded-xl border"><div className="text-[10px] text-slate-500 uppercase font-bold">Equipamentos / MA</div><div className="font-bold text-xs">{maList}</div></div><div className="p-3 rounded-xl border"><div className="text-[10px] text-slate-500 uppercase font-bold">Tipo</div><div className="font-bold">{paymentKindLabel(payment.kind)}</div></div><div className="p-3 rounded-xl border"><div className="text-[10px] text-slate-500 uppercase font-bold">Forma</div><div className="font-bold">{paymentMethodLabel(payment.method)}</div></div><div className="col-span-2 p-3 rounded-xl border bg-slate-50"><div className="text-[10px] text-slate-500 uppercase font-bold">Observação</div><div className="font-bold text-xs whitespace-pre-wrap break-words min-h-[1rem]">{payment.note?.trim() || '—'}</div></div></div>
        <div className="p-4 rounded-2xl bg-slate-900 text-white"><div className="text-[10px] uppercase text-slate-400 font-bold">Valor recebido neste comprovante</div><div className="text-3xl font-black text-emerald-300 mt-1">{formatCurrencyBRL(payment.amount)}</div><div className="grid grid-cols-2 gap-2 mt-3"><div className="p-2 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-400">Total do fechamento</div><b>{formatCurrencyBRL(total)}</b></div><div className="p-2 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-400">Saldo após pagamento</div><b>{formatCurrencyBRL(balanceAfter)}</b></div></div></div>
        <div className="text-xs text-slate-600 border-l-4 border-cyan-500 bg-slate-50 p-3">Recebemos de <b>{client.name}</b> o valor de <b>{formatCurrencyBRL(payment.amount)}</b>, referente ao fechamento <b>{closing.id}</b>.</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 pb-[max(0px,env(safe-area-inset-bottom))]"><button onClick={saveImage} className="py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4"/>Salvar imagem</button><button onClick={printReceipt} className="py-3 rounded-xl bg-cyan-500 text-black font-black flex items-center justify-center gap-2"><Printer className="w-4 h-4"/>PDF / Imprimir</button></div>
    </div>
    </div>
  </div>;
  return createPortal(modal, document.body);
};
