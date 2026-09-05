import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, ClipboardList, KeyRound, Plus, Trash2, X } from 'lucide-react';
import { Appointment, EquipmentRecord, ProductSupplyType, ServiceType, WarrantyPeriod } from '../types';

export interface CompletionOptions {
  equipment: Array<Pick<EquipmentRecord, 'serviceType' | 'serviceTypeName' | 'model' | 'manufacturerSerialNumber' | 'description' | 'productSupplyType' | 'supplier' | 'invoiceProof' | 'productWarranty'>>;
  photos: File[];
  generateServiceOrder: boolean;
  installationWarranty: WarrantyPeriod;
}

interface Props {
  isOpen: boolean;
  appointment: Appointment | null;
  nextSerialStart?: number;
  nextServiceOrder?: number;
  numberingLoading?: boolean;
  onClose: () => void;
  onConfirm: (options: CompletionOptions) => void | Promise<void>;
}

const fmtMA = (n: number) => `MA-${String(n).padStart(6, '0')}`;
const fmtOS = (n: number) => `OS-${String(n).padStart(6, '0')}`;
const SERVICE_LABELS: Partial<Record<ServiceType, string>> = {
  instalacao_sobrepor: 'Instalação Fechadura Sobrepor',
  instalacao_embutir: 'Instalação Fechadura Embutir (com mortise)',
  manutencao_preventiva: 'Manutenção Preventiva / Revisão',
  manutencao_corretiva: 'Manutenção Corretiva / Reparo',
  troca_bateria_config: 'Troca de Bateria & Reconfiguração',
  automacao_alexa_google: 'Automação Hub Zigbee / Alexa / Google',
  orcamento_tecnico: 'Visita Técnica / Orçamento',
  outro: 'Outros / Equipamento diverso',
};


const WARRANTY_OPTIONS: WarrantyPeriod[] = ['Sem garantia', '1 Mês', '3 Meses', '6 Meses', '12 Meses', '24 Meses', '36 Meses'];
const SUPPLY_OPTIONS: ProductSupplyType[] = ['Produto do cliente', 'Produto vendido'];

const EQUIPMENT_SERVICE_OPTIONS: ServiceType[] = [
  'instalacao_sobrepor',
  'instalacao_embutir',
  'manutencao_preventiva',
  'manutencao_corretiva',
  'troca_bateria_config',
  'automacao_alexa_google',
  'orcamento_tecnico',
  'outro',
];

export const ServiceCompletionModal: React.FC<Props> = ({
  isOpen,
  appointment,
  nextSerialStart,
  nextServiceOrder,
  numberingLoading = false,
  onClose,
  onConfirm,
}) => {
  const [registerEquipment, setRegisterEquipment] = useState(false);
  const [generateOS, setGenerateOS] = useState(true);
  const [equipment, setEquipment] = useState<Array<{ serviceType?: ServiceType; serviceTypeName?: string; model: string; manufacturerSerialNumber: string; description: string; productSupplyType: ProductSupplyType; supplier: string; invoiceProof: string; productWarranty: WarrantyPeriod }>>([]);
  const [installationWarranty, setInstallationWarranty] = useState<WarrantyPeriod>('3 Meses');
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRegisterEquipment(false);
    // Regra padrão: todo atendimento concluído gera OS, salvo se o usuário escolher Não.
    setGenerateOS(true);
    setEquipment([]);
    setInstallationWarranty('3 Meses');
    setPhotos([]);
    setSaving(false);
  }, [isOpen, appointment?.id]);

  const previews = useMemo(
    () => equipment.map((_, i) => nextSerialStart != null ? fmtMA(nextSerialStart + i) : ''),
    [equipment, nextSerialStart]
  );

  if (!isOpen || !appointment) return null;

  const toggleEquipment = (value: boolean) => {
    setRegisterEquipment(value);
    if (value && equipment.length === 0) {
      const firstType = (appointment.serviceTypes || [appointment.serviceType]).find(t => t !== 'compromisso_particular');
      setEquipment([{ serviceType: firstType, serviceTypeName: firstType ? SERVICE_LABELS[firstType] : undefined, model: '', manufacturerSerialNumber: '', description: '', productSupplyType: 'Produto do cliente', supplier: '', invoiceProof: '', productWarranty: 'Sem garantia' }]);
    }
    if (!value) setEquipment([]);
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm overflow-y-auto overscroll-contain"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
      }}
    >
      <div className="w-full max-w-lg mx-auto rounded-3xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
        <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-white">Concluir atendimento</h2>
              <p className="text-xs text-zinc-400">{appointment.clientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar conclusão do atendimento"
            className="shrink-0 min-w-11 min-h-11 flex items-center justify-center rounded-xl text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 active:bg-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
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
                      <div>
                        <span className="font-mono text-sm font-bold text-cyan-300">{previews[i] || (numberingLoading ? 'consultando...' : 'indisponível')}</span>
                        <span className="ml-2 text-[10px] text-zinc-500">automático</span>
                      </div>
                      {equipment.length > 1 && <button type="button" onClick={() => setEquipment(prev => prev.filter((_, j) => j !== i))} className="text-rose-400 p-1"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <select
                      value={item.serviceType || ''}
                      onChange={e => {
                        const st = e.target.value as ServiceType;
                        setEquipment(prev => prev.map((x,j) => j === i ? {...x, serviceType: st, serviceTypeName: SERVICE_LABELS[st]} : x));
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    >
                      {EQUIPMENT_SERVICE_OPTIONS.map(st => (
                        <option key={st} value={st}>{SERVICE_LABELS[st]}</option>
                      ))}
                    </select>
                    <input value={item.model} onChange={e => setEquipment(prev => prev.map((x,j) => j === i ? {...x, model:e.target.value} : x))} placeholder="Marca / modelo do equipamento (opcional)" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
                    <input value={item.manufacturerSerialNumber} onChange={e => setEquipment(prev => prev.map((x,j) => j === i ? {...x, manufacturerSerialNumber:e.target.value} : x))} placeholder="Nº de série original do produto (opcional)" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
                    <input value={item.description} onChange={e => setEquipment(prev => prev.map((x,j) => j === i ? {...x, description:e.target.value} : x))} placeholder="Ex: Apto 302 / porta social (opcional)" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <label className="text-[11px] text-zinc-400">
                        Tipo de fornecimento
                        <select value={item.productSupplyType} onChange={e => {
                          const value = e.target.value as ProductSupplyType;
                          setEquipment(prev => prev.map((x,j) => j === i ? {
                            ...x,
                            productSupplyType: value,
                            supplier: value === 'Produto vendido' ? x.supplier : '',
                            invoiceProof: value === 'Produto vendido' ? x.invoiceProof : '',
                            productWarranty: value === 'Produto vendido' ? (x.productWarranty === 'Sem garantia' ? '12 Meses' : x.productWarranty) : 'Sem garantia',
                          } : x));
                        }} className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500">
                          {SUPPLY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </label>
                      <label className="text-[11px] text-zinc-400">
                        Garantia do produto
                        <select value={item.productWarranty} disabled={item.productSupplyType !== 'Produto vendido'} onChange={e => setEquipment(prev => prev.map((x,j) => j === i ? {...x, productWarranty:e.target.value as WarrantyPeriod} : x))} className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-40">
                          {WARRANTY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </label>
                    </div>
                    {item.productSupplyType === 'Produto vendido' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input value={item.supplier} onChange={e => setEquipment(prev => prev.map((x,j) => j === i ? {...x, supplier:e.target.value} : x))} placeholder="Fornecedor (opcional)" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
                        <input value={item.invoiceProof} onChange={e => setEquipment(prev => prev.map((x,j) => j === i ? {...x, invoiceProof:e.target.value} : x))} placeholder="NF / comprovante (opcional)" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
                      </div>
                    )}

                  </div>
                ))}
                <p className="text-[11px] text-zinc-500">A numeração MA é automática e não pode ser digitada manualmente.</p>
                <button type="button" onClick={() => { const st = (appointment.serviceTypes || [appointment.serviceType]).find(t => t !== 'compromisso_particular'); setEquipment(prev => [...prev, { serviceType: st, serviceTypeName: st ? SERVICE_LABELS[st] : undefined, model: '', manufacturerSerialNumber: '', description: '', productSupplyType: 'Produto do cliente', supplier: '', invoiceProof: '', productWarranty: 'Sem garantia' }]); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-cyan-700 text-cyan-300 text-sm font-bold"><Plus className="w-4 h-4" />Adicionar equipamento</button>
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="text-sm font-bold text-white">Garantia da instalação / mão de obra</div>
            <select value={installationWarranty} onChange={e => setInstallationWarranty(e.target.value as WarrantyPeriod)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-cyan-500">
              {WARRANTY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <p className="text-[11px] text-zinc-500">Essa garantia será gravada na planilha e ficará vinculada ao atendimento/OS.</p>
          </section>

          <section className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><Camera className="w-4 h-4 text-cyan-400" />Fotos do atendimento <span className="text-[10px] font-normal text-zinc-500">(opcional)</span></div>
            <label className="block rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 p-3 cursor-pointer hover:border-cyan-700">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => setPhotos(Array.from(e.target.files || []))}
              />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-zinc-200">Adicionar fotos</p>
                  <p className="text-[11px] text-zinc-500">No celular você pode escolher câmera ou galeria. As imagens serão enviadas ao Google Drive.</p>
                </div>
                <span className="shrink-0 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-cyan-300">{photos.length ? `${photos.length} foto(s)` : 'Selecionar'}</span>
              </div>
            </label>
            {photos.length > 0 && (
              <button type="button" onClick={() => setPhotos([])} className="text-xs text-rose-400 hover:text-rose-300">Remover fotos selecionadas</button>
            )}
          </section>

          <section className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><ClipboardList className="w-4 h-4 text-cyan-400" />Gerar Ordem de Serviço?</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setGenerateOS(false)} className={`py-3 rounded-xl border text-sm font-bold ${!generateOS ? 'bg-zinc-700 border-zinc-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>Não</button>
              <button type="button" onClick={() => setGenerateOS(true)} className={`py-3 rounded-xl border text-sm font-bold ${generateOS ? 'bg-cyan-500 border-cyan-400 text-black' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>Sim</button>
            </div>
            {generateOS && (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-3 flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400">OS automática</span>
                <span className="font-mono text-sm font-bold text-cyan-300">{nextServiceOrder != null ? fmtOS(nextServiceOrder) : (numberingLoading ? 'consultando...' : 'indisponível')}</span>
              </div>
            )}
          </section>

          <button
            type="button"
            disabled={saving || numberingLoading}
            onClick={async () => {
              if (saving) return;
              setSaving(true);
              try {
                await onConfirm({ equipment: registerEquipment ? equipment : [], photos, generateServiceOrder: generateOS, installationWarranty });
              } finally {
                setSaving(false);
              }
            }}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-wait text-black font-extrabold"
          >{saving ? 'Salvando na planilha…' : numberingLoading ? 'Consultando numeração…' : 'Concluir serviço'}</button>
          <p className="text-[11px] text-zinc-500 text-center">OS é sugerida por padrão. MA só é criado quando houver equipamento para identificar.</p>
        </div>
      </div>
    </div>
  );
};
