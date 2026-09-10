import React, { useMemo, useState } from 'react';
import { X, Printer, FileText, CheckCircle2, ReceiptText, ImageDown } from 'lucide-react';
import { Appointment, PaymentRecord } from '../types';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';
import logoMaicon from '../assets/logo-maicon.png';

interface PaymentReceiptModalProps {
  appointment: Appointment;
  payment: PaymentRecord;
  payments: PaymentRecord[];
  totalServiceValue: number;
  onClose: () => void;
}

const paymentKindLabel = (kind: PaymentRecord['kind']) =>
  kind === 'sinal' ? 'Sinal / entrada' : kind === 'pagamento_final' ? 'Pagamento final' : 'Pagamento';

const paymentMethodLabel = (method: PaymentRecord['method']) => ({
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  faturado: 'Faturado',
  a_combinar: 'A combinar',
}[method] || method.replaceAll('_', ' '));

const escapeHtml = (value: string) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sanitizeFileName = (value: string) => String(value || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  appointment,
  payment,
  payments,
  totalServiceValue,
  onClose,
}) => {
  const [exportingImage, setExportingImage] = useState(false);
  const position = Math.max(0, payments.findIndex((p) => p.id === payment.id));
  const receivedThroughThis = useMemo(
    () => payments.slice(0, position + 1).reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [payments, position]
  );
  const balanceAfter = Math.max(0, Number(totalServiceValue || 0) - receivedThroughThis);
  const ma = appointment.equipment?.map((e) => e.serialNumber).filter(Boolean).join(' • ') || appointment.serialNumber || 'Não informado';
  const reference = appointment.serviceTypeName || appointment.description || 'Serviço realizado';
  const receiptCode = `${appointment.serviceOrder || 'SEM-OS'}-${String(position + 1).padStart(2, '0')}`;
  const isPaid = balanceAfter <= 0.009;

  const saveReceiptImage = async () => {
    try {
      setExportingImage(true);
      const node = document.getElementById('payment-receipt-card');
      if (!node) throw new Error('Recibo não encontrado.');
      const clone = node.cloneNode(true) as HTMLElement;
      clone.style.width = '760px'; clone.style.maxWidth = '760px'; clone.style.margin = '0'; clone.style.borderRadius = '24px';
      const wrapper = document.createElement('div'); wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml'); wrapper.style.background = '#ffffff'; wrapper.style.width = '760px'; wrapper.appendChild(clone);
      const serialized = new XMLSerializer().serializeToString(wrapper);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="1050"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = 1520; canvas.height = 2100;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas indisponível.');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.scale(2,2); ctx.drawImage(img,0,0,760,1050);
      URL.revokeObjectURL(url);
      const link = document.createElement('a'); link.download = `recibo-${receiptCode}-${sanitizeFileName(appointment.clientName)}.png`; link.href = canvas.toDataURL('image/png',1); link.click();
    } catch (error) { console.error(error); alert('Não foi possível salvar a imagem do recibo neste navegador.'); } finally { setExportingImage(false); }
  };

  const printReceipt = () => {
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) {
      alert('Permita pop-ups para imprimir ou salvar o recibo em PDF.');
      return;
    }
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recibo ${escapeHtml(receiptCode)}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#eef3f6;font-family:Arial,Helvetica,sans-serif;color:#101820}.sheet{width:794px;min-height:1123px;margin:24px auto;background:#fff;padding:44px 50px;box-shadow:0 12px 40px #0002;position:relative;overflow:hidden}.accent{position:absolute;left:0;top:0;bottom:0;width:8px;background:linear-gradient(#12b9dc,#166dc3)}.top{display:flex;justify-content:space-between;gap:30px;align-items:center;margin:-44px -50px 0;padding:28px 50px 30px;background:linear-gradient(135deg,#05090d 0%,#071722 55%,#0b3040 100%);border-bottom:4px solid #12b9dc;position:relative;overflow:hidden}.top:after{content:'';position:absolute;width:250px;height:250px;border:38px solid rgba(18,185,220,.10);border-radius:50%;right:-85px;top:-100px}.logo{width:185px;max-height:118px;object-fit:contain;object-position:left center;position:relative;z-index:1}.brand{text-align:right;position:relative;z-index:1}.brand h1{margin:0;color:#fff;font-size:23px;letter-spacing:.7px}.brand p{margin:5px 0 0;color:#9bdff0;font-size:12px}.title{margin-top:32px;display:flex;justify-content:space-between;align-items:flex-end}.title h2{font-size:28px;margin:0;color:#111827}.title small{display:block;color:#657680;margin-top:5px;font-size:11px}.tag{padding:8px 13px;border-radius:999px;background:${isPaid ? '#dcfce7' : '#fff7d6'};color:${isPaid ? '#166534' : '#8a5a00'};font-weight:800;font-size:11px;border:1px solid ${isPaid ? '#bbf7d0' : '#fde68a'}}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}.card{border:1px solid #dbe5eb;border-radius:14px;padding:14px 15px;background:#fbfdfe}.card.wide{grid-column:1/-1}.label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#73838d;font-weight:800;margin-bottom:5px}.value{font-size:14px;font-weight:800;color:#17212a;line-height:1.35}.money{margin-top:25px;border-radius:18px;background:linear-gradient(135deg,#0e2535,#113d55);padding:22px;color:#fff}.money .label{color:#9bdff0}.money .big{font-size:35px;font-weight:900;margin-top:4px}.money-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:17px}.money-box{background:#ffffff12;border:1px solid #ffffff20;border-radius:12px;padding:11px}.money-box .k{font-size:9px;color:#b4cad6;text-transform:uppercase;font-weight:800}.money-box .v{font-size:17px;font-weight:900;margin-top:4px}.statement{margin-top:25px;padding:17px 19px;border-left:4px solid #18b8d8;background:#f4fafc;border-radius:0 12px 12px 0;font-size:13px;line-height:1.6}.footer{position:absolute;left:50px;right:50px;bottom:44px;border-top:1px solid #dfe7ec;padding-top:17px;display:flex;justify-content:space-between;gap:20px;color:#71808a;font-size:9px}.actions{text-align:center;margin:0 auto 30px}.actions button{background:#0e83b8;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:800;cursor:pointer}@media print{html,body{width:210mm;height:297mm;margin:0!important;padding:0!important;background:#fff;overflow:hidden}.sheet{width:210mm!important;height:297mm!important;min-height:0!important;margin:0!important;padding:10mm 13mm!important;box-shadow:none!important;overflow:hidden;page-break-after:avoid;break-after:avoid}.accent{width:2mm}.footer{left:13mm;right:13mm;bottom:10mm}.actions{display:none!important}@page{size:A4 portrait;margin:0}}
      </style></head><body><div class="sheet"><div class="accent"></div><div class="top"><img class="logo" src="${logoMaicon}" alt="Maicon Automação"><div class="brand"><h1>MAICON AUTOMAÇÃO</h1><p>Instalação de Fechaduras Eletrônicas</p></div></div><div class="title"><div><h2>RECIBO DE PAGAMENTO</h2><small>Comprovante nº ${escapeHtml(receiptCode)}</small></div><div class="tag">${isPaid ? 'SERVIÇO QUITADO' : 'PAGAMENTO PARCIAL'}</div></div><div class="grid"><div class="card"><div class="label">Cliente</div><div class="value">${escapeHtml(appointment.clientName)}</div></div><div class="card"><div class="label">Data do recebimento</div><div class="value">${escapeHtml(formatDateBR(payment.date))}</div></div><div class="card wide"><div class="label">Referente a</div><div class="value">${escapeHtml(reference)}</div></div><div class="card"><div class="label">Ordem de serviço</div><div class="value">${escapeHtml(appointment.serviceOrder || 'Não informada')}</div></div><div class="card"><div class="label">Equipamento / MA</div><div class="value">${escapeHtml(ma)}</div></div><div class="card"><div class="label">Tipo do recebimento</div><div class="value">${escapeHtml(paymentKindLabel(payment.kind))}</div></div><div class="card"><div class="label">Forma de pagamento</div><div class="value">${escapeHtml(paymentMethodLabel(payment.method))}</div></div></div><div class="money"><div class="label">Valor recebido neste comprovante</div><div class="big">${escapeHtml(formatCurrencyBRL(payment.amount))}</div><div class="money-grid"><div class="money-box"><div class="k">Valor total do serviço</div><div class="v">${escapeHtml(formatCurrencyBRL(totalServiceValue))}</div></div><div class="money-box"><div class="k">Saldo após este pagamento</div><div class="v">${escapeHtml(formatCurrencyBRL(balanceAfter))}</div></div></div></div><div class="statement">Recebemos de <b>${escapeHtml(appointment.clientName)}</b> o valor de <b>${escapeHtml(formatCurrencyBRL(payment.amount))}</b>, referente ao serviço descrito neste comprovante, pago por <b>${escapeHtml(paymentMethodLabel(payment.method))}</b>.</div><div class="footer"><span>Documento gerado eletronicamente pelo sistema Maicon Automação.</span><span>OS ${escapeHtml(appointment.serviceOrder || '—')} • ${escapeHtml(receiptCode)}</span></div></div><div class="actions"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-3xl max-h-[96vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-zinc-700 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
          <div>
            <div className="text-white font-black flex items-center gap-2"><ReceiptText className="w-5 h-5 text-cyan-400"/> Recibo de pagamento</div>
            <div className="text-[11px] text-zinc-500">Pré-visualização • padrão Maicon Automação</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-3 sm:p-6">
          <div id="payment-receipt-card" className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200 relative">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 to-blue-600" />
            <div className="p-5 sm:p-8 pl-7 sm:pl-10">
              <div className="relative -mx-5 -mt-5 sm:-mx-8 sm:-mt-8 mb-6 overflow-hidden border-b-4 border-cyan-400 bg-gradient-to-br from-[#05090d] via-[#071722] to-[#0b3040] px-5 py-6 sm:px-8 sm:py-7">
                <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border-[30px] border-cyan-400/10" />
                <div className="relative z-[1] flex items-center justify-between gap-5">
                  <img src={logoMaicon} alt="Maicon Automação" className="w-40 sm:w-48 max-h-28 object-contain object-left-center" />
                  <div className="text-right hidden sm:block"><div className="font-black text-white tracking-wide">MAICON AUTOMAÇÃO</div><div className="text-[10px] text-cyan-200 mt-1">Instalação de Fechaduras Eletrônicas</div></div>
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between gap-3">
                <div><div className="text-xl sm:text-2xl font-black tracking-tight">RECIBO DE PAGAMENTO</div><div className="text-[10px] text-slate-500 mt-1">Comprovante nº {receiptCode}</div></div>
                <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-full border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{isPaid ? 'SERVIÇO QUITADO' : 'PAGAMENTO PARCIAL'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
                <Field label="Cliente" value={appointment.clientName} />
                <Field label="Data do recebimento" value={formatDateBR(payment.date)} />
                <Field label="Referente a" value={reference} wide />
                <Field label="Ordem de serviço" value={appointment.serviceOrder || 'Não informada'} />
                <Field label="Equipamento / MA" value={ma} />
                <Field label="Tipo do recebimento" value={paymentKindLabel(payment.kind)} />
                <Field label="Forma de pagamento" value={paymentMethodLabel(payment.method)} />
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950 text-white p-5">
                <div className="text-[9px] uppercase tracking-[.14em] font-black text-cyan-200">Valor recebido neste comprovante</div>
                <div className="text-3xl font-black mt-1">{formatCurrencyBRL(payment.amount)}</div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3"><div className="text-[8px] uppercase font-bold text-slate-400">Valor total</div><div className="font-black mt-1">{formatCurrencyBRL(totalServiceValue)}</div></div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3"><div className="text-[8px] uppercase font-bold text-slate-400">Saldo restante</div><div className="font-black mt-1">{formatCurrencyBRL(balanceAfter)}</div></div>
                </div>
              </div>

              <div className="mt-5 rounded-r-xl border-l-4 border-cyan-500 bg-cyan-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
                Recebemos de <b>{appointment.clientName}</b> o valor de <b>{formatCurrencyBRL(payment.amount)}</b>, referente ao serviço descrito neste comprovante, pago por <b>{paymentMethodLabel(payment.method)}</b>.
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between gap-4 text-[8px] sm:text-[9px] text-slate-400">
                <span>Documento gerado eletronicamente pelo sistema Maicon Automação.</span><span className="font-mono shrink-0">OS {appointment.serviceOrder || '—'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            <button onClick={saveReceiptImage} disabled={exportingImage} className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black flex items-center justify-center gap-2"><ImageDown className="w-4 h-4"/> {exportingImage ? 'Gerando...' : 'Salvar imagem'}</button>
            <button onClick={printReceipt} className="py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black flex items-center justify-center gap-2"><Printer className="w-4 h-4"/> Imprimir / Salvar PDF</button>
            <button onClick={onClose} className="py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center gap-2"><FileText className="w-4 h-4"/> Voltar ao financeiro</button>
          </div>
          <div className="mt-2 text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3"/> Imagem para compartilhar • PDF A4 para imprimir ou arquivar.</div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; wide?: boolean }> = ({ label, value, wide }) => (
  <div className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3 ${wide ? 'sm:col-span-2' : ''}`}>
    <div className="text-[8px] uppercase tracking-wider font-black text-slate-500">{label}</div>
    <div className="text-xs sm:text-sm font-bold mt-1 text-slate-800 break-words">{value}</div>
  </div>
);
