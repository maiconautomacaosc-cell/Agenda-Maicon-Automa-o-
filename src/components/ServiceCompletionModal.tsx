import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, KeyRound, Plus, Trash2, X } from 'lucide-react';
import { Appointment, EquipmentRecord } from '../types';

export interface CompletionOptions {
  equipment: Array<Pick<EquipmentRecord, 'model' | 'description'>>;
  generateServiceOrder: boolean;
  serialStart: number;
  serviceOrderNumber: number;
}

interface Props {
  isOpen: boolean;
  appointment: Appointment | null;
  nextSerialStart: number;
  nextServiceOrder: number;
  onClose: () => void;
  onConfirm: (options: CompletionOptions) => void;
}

const fmtMA = (n: number) => `MA-${String(n).padStart(6, '0')}`;
const fmtOS = (n: number) => `OS-${String(n).padStart(6, '0')}`;

export const ServiceCompletionModal: React.FC<Props> = ({
  isOpen,
  appointment,
  nextSerialStart,
  nextServiceOrder,
  onClose,
  onConfirm,
}) => {
  const [registerEquipment, setRegisterEquipment] = useState(false);
  const [generateOS, setGenerateOS] = useState(false);
  const [equipment, setEquipment] = useState<Array<{ model: string; description: string }>>([]);
  const [serialStart, setSerialStart] = useState(nextSerialStart);
  const [serviceOrderNumber, setServiceOrderNumber] = useState(nextServiceOrder);

  useEffect(() => {
    if (!isOpen) return;
    setRegisterEquipment(false);
    setGenerateOS(false);
    setEquipment([]);
    setSerialStart(nextSerialStart);
    setServiceOrderNumber(nextServiceOrder);
  }, [isOpen, appointment?.id, nextSerialStart, nextServiceOrder]);

  const previews = useMemo(
    () => equipment.map((_, i) => fmtMA(serialStart + i)),
    [equipment, serialStart]
  );

  if (!isOpen || !appointment) return null;

  const toggleEquipment = (value: boolean) => {
    setRegisterEquipment(value);
    if (value && equipment.length === 0) {
      setEquipment([{ model: appointment.lockModel || '', description: '' }]);
    }
    if (!value) setEquipment([]);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-white">Concluir atendimento</h2>
              <p className="text-xs text-zinc-400">{appointment.clientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-5">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><KeyRound className="w-4 h-4 text-cyan-400" />Cadastrar equipamento?</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => toggleEquipment(false)} className={`py-3 rounded-xl border text-sm font-bold ${!registerEquipment ? 'bg-zinc-700 border-zinc-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>Não</button>
              <button type="button" onClick={() => toggleEquipment(true)} className={`py-3 rounded-xl border text-sm font-bold ${registerEquipment ? 'bg-cyan-500 border-cyan-400 text-black' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>Sim</button>
            </div>

            {registerEquipment && (
              <div className="space-y-2">
                {equipment.map((item, i) => (
                  <div key={i} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-cyan-300">{previews[i]}</span>
                      {equipment.length > 1 && <button type="button" onClick={() => setEquipment(prev => prev.filter((_, j) => j !== i))} className="text-rose-400 p-1"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <input value={item.model} onChange={e => setEquipment(prev => prev.map((x,j) => j === i ? {...x, model:e.target.value} : x))} placeholder="Modelo do equipamento (opcional)" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
                    <input value={item.description} onChange={e => setEquipment(prev => prev.map((x,j) => j === i ? {...x, description:e.target.value} : x))} placeholder="Ex: Apto 302 / porta social (opcional)" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2"><span className="text-xs text-zinc-400">Próximo MA</span><input type="number" min="1" value={serialStart} onChange={e => setSerialStart(Math.max(1, Number(e.target.value) || 1))} className="ml-auto w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-right font-mono text-sm text-white" /></div>
                <button type="button" onClick={() => setEquipment(prev => [...prev, { model: '', description: '' }])} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-cyan-700 text-cyan-300 text-sm font-bold"><Plus className="w-4 h-4" />Adicionar equipamento</button>
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><ClipboardList className="w-4 h-4 text-cyan-400" />Gerar Ordem de Serviço?</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setGenerateOS(false)} className={`py-3 rounded-xl border text-sm font-bold ${!generateOS ? 'bg-zinc-700 border-zinc-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>Não</button>
              <button type="button" onClick={() => setGenerateOS(true)} className={`py-3 rounded-xl border text-sm font-bold ${generateOS ? 'bg-cyan-500 border-cyan-400 text-black' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>Sim</button>
            </div>
            {generateOS && <div className="flex items-center gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2"><span className="text-xs text-zinc-400">Próxima OS</span><input type="number" min="1" value={serviceOrderNumber} onChange={e => setServiceOrderNumber(Math.max(1, Number(e.target.value) || 1))} className="ml-auto w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-right font-mono text-sm text-white" /><span className="font-mono text-xs text-cyan-300">{fmtOS(serviceOrderNumber)}</span></div>}
          </section>

          <button type="button" onClick={() => onConfirm({ equipment: registerEquipment ? equipment : [], generateServiceOrder: generateOS, serialStart, serviceOrderNumber })} className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold">Concluir serviço</button>
          <p className="text-[11px] text-zinc-500 text-center">Serviço simples pode ser concluído sem MA e sem OS.</p>
        </div>
      </div>
    </div>
  );
};
