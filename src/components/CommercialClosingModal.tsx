import React, { useMemo, useState } from 'react';
import { X, Plus, Trash2, Link2, WalletCards, Save, AlertTriangle, ReceiptText } from 'lucide-react';
import { Appointment, Client, CommercialClosing, PaymentRecord } from '../types';
import { appointmentCommercialValue, closingSubtotal, closingTotal, closingUndefinedAppointmentIds } from '../utils/commercialClosings';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';
import { CommercialClosingReceiptModal } from './CommercialClosingReceiptModal';

interface Props { closing: CommercialClosing; client: Client; appointments: Appointment[]; onSave:(c:CommercialClosing)=>void; onClose:()=>void; }

const paymentKindLabel = (kind: PaymentRecord['kind']) => kind === 'sinal' ? 'Sinal / entrada' : kind === 'pagamento_final' ? 'Pagamento final' : 'Pagamento';
const paymentMethodLabel = (method: PaymentRecord['method']) => ({
  pix:'Pix', cartao_credito:'Cartão de crédito', cartao_debito:'Cartão de débito', dinheiro:'Dinheiro', faturado:'Faturado', a_combinar:'A combinar'
}[method]);

export const CommercialClosingModal:React.FC<Props>=({closing,client,appointments,onSave,onClose})=>{
 const [draft,setDraft]=useState<CommercialClosing>(closing);
 const [extraDesc,setExtraDesc]=useState('');
 const [extraValue,setExtraValue]=useState('');
 const [payValue,setPayValue]=useState('');
 const [payKind,setPayKind]=useState<PaymentRecord['kind']>('sinal');
 const [payMethod,setPayMethod]=useState<PaymentRecord['method']>('pix');
 const [payDate,setPayDate]=useState(new Date().toISOString().slice(0,10));
 const [payNote,setPayNote]=useState('');
 const [editingPaymentId,setEditingPaymentId]=useState<string|null>(null);
 const [receiptPayment,setReceiptPayment]=useState<PaymentRecord|null>(null);

 const clientOS=useMemo(()=>appointments.filter(a=>a.clientId===client.id && a.serviceOrder),[appointments,client.id]);
 const pendingExtraValue=Number(extraValue)||0;
 const effectiveDraft=useMemo<CommercialClosing>(()=>{
   if(!extraDesc.trim() || pendingExtraValue<=0) return draft;
   return {...draft,extraItems:[...draft.extraItems,{id:'__pending-extra__',description:extraDesc.trim(),amount:pendingExtraValue}]};
 },[draft,extraDesc,pendingExtraValue]);
 const subtotal=closingSubtotal(effectiveDraft,appointments);
 const total=closingTotal(effectiveDraft,appointments);
 const received=draft.payments.reduce((s,p)=>s+(p.amount||0),0);
 const balance=Math.max(0,total-received);
 const undefinedIds=closingUndefinedAppointmentIds(effectiveDraft,appointments);

 const toggleOS=(id:string)=>setDraft(d=>{
   const selected=d.appointmentIds.includes(id);
   const appointmentValues={...(d.appointmentValues||{})};
   if (selected) delete appointmentValues[id];
   else {
     const appointment=appointments.find(a=>a.id===id);
     appointmentValues[id]=appointment?.price == null ? null : Number(appointment.price);
   }
   return {...d,appointmentIds:selected?d.appointmentIds.filter(x=>x!==id):[...d.appointmentIds,id],appointmentValues,updatedAt:new Date().toISOString()};
 });

 const setAppointmentValue=(id:string, raw:string)=>setDraft(d=>({
   ...d,
   appointmentValues:{...(d.appointmentValues||{}),[id]:raw.trim()===''?null:Number(raw)},
   updatedAt:new Date().toISOString()
 }));

 const clearPaymentEditor=()=>{setEditingPaymentId(null);setPayValue('');setPayKind(received<=0?'sinal':'pagamento');setPayMethod('pix');setPayDate(new Date().toISOString().slice(0,10));setPayNote('');};
 const editPayment=(p:PaymentRecord)=>{setEditingPaymentId(p.id);setPayValue(String(p.amount));setPayKind(p.kind);setPayMethod(p.method);setPayDate(p.date);setPayNote(p.note||'');};
 const savePayment=()=>{
   const amount=Number(payValue);
   if(!amount || amount<=0) return;
   if(undefinedIds.length>0){ alert('Este fechamento ainda está em composição. Defina os valores das OS antes de lançar um recebimento.'); return; }
   const editingCurrent=editingPaymentId ? (draft.payments.find(p=>p.id===editingPaymentId)?.amount||0) : 0;
   const maxAllowed=Math.max(0,total-(received-editingCurrent));
   if(!editingPaymentId && balance<=0.009){ alert('Este fechamento já está quitado. Para lançar novo valor, primeiro aumente o total do fechamento ou ajuste/exclua um pagamento existente.'); return; }
   if(amount>maxAllowed+0.009){ alert(`O valor informado ultrapassa o saldo disponível (${formatCurrencyBRL(maxAllowed)}). Ajuste o total do fechamento ou corrija os pagamentos existentes.`); return; }
   if(editingPaymentId){
     setDraft(d=>({...d,payments:d.payments.map(p=>p.id===editingPaymentId?{...p,amount,kind:payKind,method:payMethod,date:payDate||p.date,note:payNote.trim()||undefined}:p),updatedAt:new Date().toISOString()}));
   }else{
     const p:PaymentRecord={id:`pay-${Date.now()}`,amount,method:payMethod,kind:payKind,date:payDate||new Date().toISOString().slice(0,10),note:payNote.trim()||undefined,origin:'fechamento',createdAt:new Date().toISOString()};
     setDraft(d=>({...d,payments:[...d.payments,p],updatedAt:new Date().toISOString()}));
   }
   clearPaymentEditor();
 };
 const saveClosing=()=>{
   if(undefinedIds.length===0 && received>total+0.009){ alert(`Os pagamentos registrados (${formatCurrencyBRL(received)}) são maiores que o total atual (${formatCurrencyBRL(total)}). Corrija os pagamentos ou aumente o valor do fechamento antes de salvar.`); return; }
   const finalDraft=extraDesc.trim()&&pendingExtraValue>0
     ? {...draft,extraItems:[...draft.extraItems,{id:`extra-${Date.now()}`,description:extraDesc.trim(),amount:pendingExtraValue}]}
     : draft;
   onSave({...finalDraft,status:undefinedIds.length?'em_composicao':balance<=0.009?'finalizado':'em_andamento',updatedAt:new Date().toISOString()});
 };

 return <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm overflow-y-auto p-3"><div className="max-w-2xl mx-auto my-4 bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
  <div className="p-4 bg-gradient-to-r from-zinc-950 via-cyan-950/50 to-zinc-950 border-b border-cyan-900/50 flex justify-between"><div><div className="text-[10px] text-cyan-400 font-bold tracking-widest">FECHAMENTO COMERCIAL</div><div className="text-xl font-black text-white">{draft.id}</div><div className="text-xs text-zinc-400">{client.name} • camada financeira interna</div></div><button onClick={onClose}><X className="text-zinc-400"/></button></div>
  <div className="p-4 space-y-4">
   <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
    <div className="flex items-center gap-2 font-bold text-white mb-2"><Link2 className="w-4 h-4 text-cyan-400"/>Ordens de serviço do fechamento</div>
    <div className="text-xs text-zinc-500 mb-3">A OS continua técnica e independente. O valor abaixo é o valor comercial usado neste fechamento e pode ser definido depois da visita.</div>
    {clientOS.length===0?<div className="text-sm text-zinc-500">Nenhuma OS encontrada.</div>:clientOS.map(a=>{
      const selected=draft.appointmentIds.includes(a.id);
      const value=selected?appointmentCommercialValue(draft,a):(a.price==null?null:Number(a.price));
      return <div key={a.id} className={`w-full mb-2 p-3 rounded-xl border ${selected?'border-cyan-500 bg-cyan-950/30':'border-zinc-800 bg-zinc-950'}`}>
        <button onClick={()=>toggleOS(a.id)} className="w-full text-left">
          <div className="flex justify-between gap-2"><div><div className="text-[10px] uppercase tracking-wide text-zinc-500">Ordem de serviço</div><b className="text-white">{a.serviceOrder}</b><div className="text-xs text-zinc-400">{formatDateBR(a.date)} • {a.serviceTypeName}</div><div className="text-[11px] text-zinc-500">{(a.equipment||[]).map(e=>e.serialNumber).filter(Boolean).join(' • ') || a.serialNumber || 'sem MA'}</div></div><div className="text-right"><div className={`text-xs font-bold ${selected?'text-cyan-300':'text-zinc-500'}`}>{selected?'Vinculada':'Toque para vincular'}</div></div></div>
        </button>
        {selected && <div className="mt-3 pt-3 border-t border-cyan-900/50">
          <label className="block text-[10px] uppercase tracking-wide text-zinc-500 font-bold mb-1">Valor desta OS no fechamento</label>
          <div className="flex items-center gap-2"><span className="text-zinc-500 font-bold">R$</span><input type="number" step="0.01" min="0" value={value==null?'':String(value)} onChange={e=>setAppointmentValue(a.id,e.target.value)} placeholder="Ainda não definido" className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"/></div>
          {value==null && <div className="mt-1 text-[11px] text-amber-300">Valor ainda não definido • fechamento permanece em composição.</div>}
        </div>}
      </div>})}
   </div>

   <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800"><div className="font-bold text-white mb-2">Serviços / valores extras</div>{draft.extraItems.map(x=><div key={x.id} className="flex justify-between items-center py-2 border-b border-zinc-800"><span className="text-sm text-zinc-300">{x.description}</span><div className="flex gap-2 items-center"><b className="text-white">{formatCurrencyBRL(x.amount)}</b><button onClick={()=>setDraft(d=>({...d,extraItems:d.extraItems.filter(i=>i.id!==x.id)}))}><Trash2 className="w-4 h-4 text-red-400"/></button></div></div>)}<div className="grid grid-cols-[1fr_120px] gap-2 mt-3"><input value={extraDesc} onChange={e=>setExtraDesc(e.target.value)} placeholder="Ex.: configuração extra" className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"/><input type="number" step="0.01" min="0" value={extraValue} onChange={e=>setExtraValue(e.target.value)} placeholder="R$" className="bg-zinc-950 border border-zinc-700 rounded-xl px-2 py-2 text-white"/></div>{extraDesc.trim()&&pendingExtraValue>0&&<div className="mt-2 text-[11px] text-emerald-300">Prévia automática: + {formatCurrencyBRL(pendingExtraValue)} • já incluído nos totais abaixo. Ao apagar, o valor é retirado da prévia.</div>}</div>

   <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800"><div className="font-bold text-white mb-2">Desconto do fechamento</div><div className="grid grid-cols-2 gap-2"><select value={draft.discountType} onChange={e=>setDraft(d=>({...d,discountType:e.target.value as any}))} className="bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-white"><option value="valor">Valor (R$)</option><option value="percentual">Percentual (%)</option></select><input type="number" min="0" value={draft.discountValue} onChange={e=>setDraft(d=>({...d,discountValue:Number(e.target.value)||0}))} className="bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-white"/></div></div>

   {undefinedIds.length>0 && <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-800/50 text-amber-200 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/><div><b>Fechamento em composição.</b> {undefinedIds.length} OS {undefinedIds.length===1?'ainda está sem valor definido':'ainda estão sem valor definido'}. Você pode salvar assim e completar depois; o total ainda não é definitivo.</div></div>}

   <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center"><div className="p-2 bg-zinc-900 rounded-xl"><small className="text-zinc-500">SUBTOTAL</small><b className="block text-white">{formatCurrencyBRL(subtotal)}</b></div><div className="p-2 bg-zinc-900 rounded-xl"><small className="text-zinc-500">TOTAL</small><b className="block text-white">{undefinedIds.length?'Em composição':formatCurrencyBRL(total)}</b></div><div className="p-2 bg-zinc-900 rounded-xl"><small className="text-zinc-500">RECEBIDO</small><b className="block text-emerald-400">{formatCurrencyBRL(received)}</b></div><div className="p-2 bg-zinc-900 rounded-xl"><small className="text-zinc-500">SALDO</small><b className="block text-amber-300">{undefinedIds.length?'—':formatCurrencyBRL(balance)}</b></div></div>

   <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
    <div className="flex items-center gap-2 font-bold text-white mb-2"><WalletCards className="w-4 h-4 text-emerald-400"/>Pagamentos do fechamento</div>
    {draft.payments.length===0?<div className="text-sm text-zinc-500 mb-3">Nenhum recebimento lançado.</div>:draft.payments.map(p=><div key={p.id} className={`w-full flex justify-between items-start gap-3 py-3 border-b border-zinc-800 ${editingPaymentId===p.id?'bg-amber-950/20':''}`}>
      <button onClick={()=>editPayment(p)} className="flex-1 text-left min-w-0"><div className="text-zinc-200 font-bold">{paymentKindLabel(p.kind)}</div><div className="text-xs text-zinc-500">{formatDateBR(p.date)} • {paymentMethodLabel(p.method)}</div>{p.origin==='migrado_os' && <div className="text-[11px] text-amber-300 mt-0.5">Origem: migrado da OS {p.sourceServiceOrder||''}</div>}{p.note&&<div className="text-[11px] text-zinc-500">{p.note}</div>}<div className="text-[10px] text-cyan-400 mt-1">Toque para editar ou excluir</div></button>
      <div className="text-right shrink-0"><div className="text-emerald-400 font-bold whitespace-nowrap">{formatCurrencyBRL(p.amount)}</div><button onClick={()=>setReceiptPayment(p)} className="mt-2 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-bold inline-flex items-center gap-1"><ReceiptText className="w-3.5 h-3.5"/>Recibo</button></div>
    </div>)}

    <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
      <div className="font-bold text-white text-sm">{editingPaymentId?'Editar lançamento':'Novo recebimento'}</div>
      {!editingPaymentId && undefinedIds.length===0 && balance<=0.009 && <div className="p-2.5 rounded-xl border border-emerald-900/60 bg-emerald-950/20 text-emerald-200 text-[11px]"><b>Fechamento quitado.</b> Não há saldo para novo recebimento. Para cobrar um valor adicional, acrescente/ajuste o serviço; para corrigir o que já foi pago, toque no lançamento existente.</div>}
      <div className="grid grid-cols-2 gap-2"><input type="number" step="0.01" min="0" value={payValue} onChange={e=>setPayValue(e.target.value)} placeholder="Valor recebido" className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"/><select value={payKind} onChange={e=>setPayKind(e.target.value as PaymentRecord['kind'])} className="bg-zinc-950 border border-zinc-700 rounded-xl px-2 py-2 text-white"><option value="sinal">Sinal / entrada</option><option value="pagamento">Pagamento</option><option value="pagamento_final">Pagamento final</option></select></div>
      <div className="grid grid-cols-2 gap-2"><select value={payMethod} onChange={e=>setPayMethod(e.target.value as PaymentRecord['method'])} className="bg-zinc-950 border border-zinc-700 rounded-xl px-2 py-2 text-white"><option value="pix">Pix</option><option value="cartao_credito">Cartão crédito</option><option value="cartao_debito">Cartão débito</option><option value="dinheiro">Dinheiro</option><option value="faturado">Faturado</option><option value="a_combinar">A combinar</option></select><input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-xl px-2 py-2 text-white"/></div>
      <input value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Observação (opcional)" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"/>
      <div className="flex gap-2"><button onClick={savePayment} disabled={!editingPaymentId && undefinedIds.length===0 && balance<=0.009} className="flex-1 py-2 rounded-xl bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-300 text-black font-black flex items-center justify-center gap-2">{editingPaymentId?<><Save className="w-4 h-4"/>Salvar alteração</>:<><Plus className="w-4 h-4"/>LANÇAR</>}</button>{editingPaymentId&&<button onClick={clearPaymentEditor} className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>}</div>
      {editingPaymentId&&<button onClick={()=>{if(confirm('Excluir este lançamento? O recebido e o saldo serão recalculados.')){setDraft(d=>({...d,payments:d.payments.filter(p=>p.id!==editingPaymentId),updatedAt:new Date().toISOString()}));clearPaymentEditor();}}} className="w-full py-2 rounded-xl border border-rose-900/70 bg-rose-950/20 text-rose-300 font-bold flex items-center justify-center gap-2"><Trash2 className="w-4 h-4"/>Excluir lançamento</button>}
    </div>
   </div>

   <div className="p-3 rounded-2xl border border-amber-900/40 bg-amber-950/20 text-xs text-amber-200"><b>Regra de segurança:</b> este fechamento é uma camada interna do app. Vincular, retirar ou ajustar o valor comercial de uma OS aqui não altera MA, QR, OS oficial, Drive, fotos, garantia ou planilhas.</div>
   <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-3 rounded-xl bg-zinc-900 text-zinc-300">Cancelar</button><button onClick={saveClosing} className="flex-[2] py-3 rounded-xl bg-cyan-500 text-black font-black">Salvar fechamento</button></div>
  </div></div>
  {receiptPayment && <CommercialClosingReceiptModal closing={draft} client={client} appointments={appointments} payment={receiptPayment} onClose={()=>setReceiptPayment(null)} />}
 </div>
}
