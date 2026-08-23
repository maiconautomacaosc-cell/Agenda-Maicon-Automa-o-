import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  User, 
  Phone, 
  MapPin, 
  KeyRound, 
  DollarSign, 
  Check, 
  Sparkles, 
  Layers, 
  Tag, 
  ShieldCheck, 
  Clock, 
  MessageSquare,
  Users
} from 'lucide-react';
import { Client, Quote, QuoteItem, QuoteStatus } from '../types';
import { getTodayString, formatCurrencyBRL } from '../utils/date';
import { 
  PREDEFINED_SERVICES, 
  POPULAR_LOCK_MODELS, 
  COMMON_PAYMENT_TERMS, 
  COMMON_WARRANTY_TERMS,
  PredefinedService 
} from '../data/predefinedServices';

interface QuoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuote: (quote: Quote, saveClientToDb: boolean, sendImmediately?: boolean) => void;
  clients: Client[];
  initialQuote: Quote | null;
  defaultClient?: Client | null;
}

export const QuoteEditorModal: React.FC<QuoteEditorModalProps> = ({
  isOpen,
  onClose,
  onSaveQuote,
  clients,
  initialQuote,
  defaultClient,
}) => {
  // Client info state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [saveClientToDb, setSaveClientToDb] = useState(true);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Quote info state
  const [lockModel, setLockModel] = useState('');
  const [doorType, setDoorType] = useState('Porta de Madeira Padrão (35 a 45mm)');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState(COMMON_PAYMENT_TERMS[0]);
  const [validityDays, setValidityDays] = useState(15);
  const [warrantyInfo, setWarrantyInfo] = useState(COMMON_WARRANTY_TERMS[0]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<QuoteStatus>('pendente');
  const [date, setDate] = useState(getTodayString());

  // Manual item input state
  const [manualDescription, setManualDescription] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'todos' | 'instalacao' | 'manutencao' | 'automacao' | 'adicional'>('todos');

  // Load initial data
  useEffect(() => {
    if (initialQuote) {
      setSelectedClientId(initialQuote.clientId || '');
      setClientName(initialQuote.clientName);
      setClientPhone(initialQuote.clientPhone);
      setAddress(initialQuote.address || '');
      setNeighborhood(initialQuote.neighborhood || '');
      setCity(initialQuote.city || 'São Paulo');
      setLockModel(initialQuote.lockModel || '');
      setDoorType(initialQuote.doorType || 'Porta de Madeira Padrão');
      setItems(initialQuote.items);
      setDiscountAmount(initialQuote.discountAmount || 0);
      setPaymentTerms(initialQuote.paymentTerms);
      setValidityDays(initialQuote.validityDays || 15);
      setWarrantyInfo(initialQuote.warrantyInfo || COMMON_WARRANTY_TERMS[0]);
      setNotes(initialQuote.notes || '');
      setStatus(initialQuote.status);
      setDate(initialQuote.date);
      setSaveClientToDb(false);
    } else {
      // New quote defaults
      const today = getTodayString();
      setDate(today);
      setStatus('pendente');
      setDiscountAmount(0);
      setPaymentTerms(COMMON_PAYMENT_TERMS[0]);
      setValidityDays(15);
      setWarrantyInfo(COMMON_WARRANTY_TERMS[0]);
      setNotes('');
      setSaveClientToDb(true);

      if (defaultClient) {
        setSelectedClientId(defaultClient.id);
        setClientName(defaultClient.name);
        setClientPhone(defaultClient.phone);
        setAddress(defaultClient.address);
        setNeighborhood(defaultClient.neighborhood || '');
        setCity(defaultClient.city || 'São Paulo');
      } else {
        setSelectedClientId('');
        setClientName('');
        setClientPhone('');
        setAddress('');
        setNeighborhood('');
        setCity('São Paulo');
      }

      // Default with first predefined service
      setItems([
        {
          id: `item-${Date.now()}`,
          description: PREDEFINED_SERVICES[0].name,
          quantity: 1,
          unitPrice: PREDEFINED_SERVICES[0].defaultPrice,
          total: PREDEFINED_SERVICES[0].defaultPrice,
          isPredefined: true,
        },
      ]);
      setLockModel('');
      setDoorType('Porta de Madeira Padrão (35 a 45mm)');
    }
  }, [initialQuote, defaultClient, isOpen]);

  if (!isOpen) return null;

  // Phone formatting
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length <= 10) {
      formatted = digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      formatted = digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    setClientPhone(formatted);
  };

  const handleSelectClient = (c: Client) => {
    setSelectedClientId(c.id);
    setClientName(c.name);
    setClientPhone(c.phone);
    setAddress(c.address);
    setNeighborhood(c.neighborhood || '');
    setCity(c.city || 'São Paulo');
    setShowClientSuggestions(false);
  };

  // Add predefined service
  const handleAddPredefinedService = (service: PredefinedService) => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: service.name,
      quantity: 1,
      unitPrice: service.defaultPrice,
      total: service.defaultPrice,
      isPredefined: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Add manual service item
  const handleAddManualItem = () => {
    if (!manualDescription.trim()) return;
    const cleanPrice = parseFloat(manualPrice.replace(',', '.')) || 0;
    const qty = Math.max(1, manualQuantity || 1);

    const newItem: QuoteItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: manualDescription.trim(),
      quantity: qty,
      unitPrice: cleanPrice,
      total: cleanPrice * qty,
      isPredefined: false,
    };

    setItems((prev) => [...prev, newItem]);
    setManualDescription('');
    setManualPrice('');
    setManualQuantity(1);
  };

  // Update item quantity or price inline
  const handleUpdateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const qty = updates.quantity !== undefined ? Math.max(1, updates.quantity) : item.quantity;
          const unitPrice = updates.unitPrice !== undefined ? updates.unitPrice : item.unitPrice;
          const total = qty * unitPrice;
          return { ...item, ...updates, quantity: qty, unitPrice, total };
        }
        return item;
      })
    );
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const subtotal = items.reduce((acc, curr) => acc + curr.total, 0);
  const totalAmount = Math.max(0, subtotal - (discountAmount || 0));

  // Submit quote
  const handleSubmit = (e: React.FormEvent, sendImmediately: boolean = false) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (items.length === 0) {
      alert('Adicione pelo menos 1 serviço ou produto ao orçamento.');
      return;
    }

    const code = initialQuote?.code || `ORC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const quoteToSave: Quote = {
      id: initialQuote?.id || `quote-${Date.now()}`,
      code,
      clientId: selectedClientId || undefined,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim() || 'São Paulo',
      lockModel: lockModel.trim(),
      doorType: doorType.trim(),
      items,
      discountAmount: Number(discountAmount) || 0,
      totalAmount,
      paymentTerms,
      validityDays: Number(validityDays) || 15,
      warrantyInfo,
      notes: notes.trim(),
      status,
      date,
      createdAt: initialQuote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveQuote(quoteToSave, saveClientToDb, sendImmediately);
  };

  const filteredPredefined =
    activeCatalogTab === 'todos'
      ? PREDEFINED_SERVICES
      : PREDEFINED_SERVICES.filter((s) => s.category === activeCatalogTab);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientName.toLowerCase()) ||
      c.phone.includes(clientPhone)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="quote-editor-dialog"
        className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {initialQuote ? `Editar Orçamento #${initialQuote.code}` : 'Novo Orçamento Rápido'}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Serviços pré-definidos, cálculo automático e envio WhatsApp
              </p>
            </div>
          </div>
          <button
            id="close-quote-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Section 1: Client Information */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Dados do Cliente
              </span>
              {clients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClientSuggestions(!showClientSuggestions)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                >
                  <Users className="w-3 h-3" />
                  Selecionar Cadastrado ({clients.length})
                </button>
              )}
            </div>

            {/* Client quick list popover */}
            {showClientSuggestions && clients.length > 0 && (
              <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-700 max-h-36 overflow-y-auto space-y-1">
                <div className="text-[10px] text-zinc-400 font-semibold px-1 font-mono">Clientes já cadastrados:</div>
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c)}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 text-xs flex justify-between items-center transition-colors"
                  >
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-zinc-300 font-semibold mb-1">Nome do Cliente *</label>
                <input
                  id="input-quote-client-name"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    setSelectedClientId('');
                  }}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />

                {/* Auto-suggest dropdown while typing if matching clients */}
                {!selectedClientId && clientName.length > 1 && filteredClients.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden max-h-32 overflow-y-auto">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectClient(c)}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-cyan-500 hover:text-black font-semibold flex justify-between items-center"
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] font-mono opacity-80">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-zinc-400" />
                  Telefone / WhatsApp *
                </label>
                <input
                  id="input-quote-client-phone"
                  type="text"
                  required
                  value={clientPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  Endereço / Local da Instalação
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1578, Apto 142 - Bela Vista"
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveClientToDb}
                  onChange={(e) => setSaveClientToDb(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4"
                />
                <span className="text-zinc-400 text-[11px]">
                  Salvar automaticamente no banco de clientes
                </span>
              </label>
            </div>
          </div>

          {/* Section 2: Lock Model & Door Specs */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Especificações do Equipamento & Porta
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Modelo da Fechadura / Equipamento
                </label>
                <input
                  type="text"
                  value={lockModel}
                  onChange={(e) => setLockModel(e.target.value)}
                  placeholder="Ex: Intelbras IFR 7000, Yale YMC 420D..."
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  list="lock-models-list"
                />
                <datalist id="lock-models-list">
                  {POPULAR_LOCK_MODELS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Tipo de Porta / Estrutura
                </label>
                <select
                  value={doorType}
                  onChange={(e) => setDoorType(e.target.value)}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Porta de Madeira Padrão (35 a 45mm)">Porta de Madeira Padrão (35 a 45mm)</option>
                  <option value="Porta Pivotante de Madeira Maciça">Porta Pivotante de Madeira Maciça</option>
                  <option value="Porta de Alumínio / Perfil Metálico">Porta de Alumínio / Perfil Metálico</option>
                  <option value="Porta de Vidro Temperado (10 a 12mm)">Porta de Vidro Temperado (10 a 12mm)</option>
                  <option value="Portão Social de Ferro / Gradil Externo">Portão Social de Ferro / Gradil Externo</option>
                  <option value="Porta Corta-Fogo / Saída de Emergência">Porta Corta-Fogo / Saída de Emergência</option>
                  <option value="Outro tipo de porta">Outro tipo de porta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Predefined Services Catalog (Quick Add) */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Catálogo de Serviços Rápidos (1-Clique)
              </span>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['todos', 'instalacao', 'manutencao', 'automacao', 'adicional'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCatalogTab(cat)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors ${
                      activeCatalogTab === cat
                        ? 'bg-cyan-500 text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {cat === 'todos' ? 'Todos' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredPredefined.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleAddPredefinedService(service)}
                  className="text-left p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/70 hover:bg-zinc-800/80 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="font-semibold text-white text-[11px] group-hover:text-cyan-300 line-clamp-1">
                      {service.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                      {service.description}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-800 text-[11px]">
                    <span className="text-zinc-500 font-mono text-[10px]">{service.estimatedTime}</span>
                    <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <Plus className="w-3 h-3 text-cyan-400 stroke-[3]" />
                      {formatCurrencyBRL(service.defaultPrice)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Manual Item Insert */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2">
            <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              Ou Inserir Item / Serviço Manual Personalizado
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Descrição do serviço ou material extra..."
                  className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="number"
                  min="1"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(Number(e.target.value))}
                  placeholder="Qtd"
                  className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 text-xs text-center"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="Valor R$"
                  className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddManualItem}
                  className="w-full h-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-bold border border-zinc-700 flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Current Selected Items in Quote */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Itens e Serviços no Orçamento ({items.length})
              </span>
              <span className="text-zinc-400 text-[11px] font-mono">
                Subtotal: {formatCurrencyBRL(subtotal)}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-zinc-900 border border-dashed border-zinc-800 text-zinc-500">
                Nenhum serviço adicionado ainda. Escolha no catálogo acima ou insira manualmente.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex-1 flex items-start gap-2">
                      <span className="font-mono font-bold text-cyan-400 text-xs mt-0.5">
                        #{idx + 1}
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                          className="w-full bg-transparent font-medium text-white text-xs border-b border-transparent hover:border-zinc-700 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      {/* Qtd */}
                      <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 font-mono">Qtd:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) })}
                          className="w-10 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 font-mono">R$:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, { unitPrice: Number(e.target.value) })}
                          className="w-16 bg-transparent text-right font-mono font-bold text-white text-xs focus:outline-none"
                        />
                      </div>

                      {/* Item Total */}
                      <div className="w-20 text-right font-mono font-bold text-emerald-400 text-xs">
                        {formatCurrencyBRL(item.total)}
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Commercial Conditions, Validity, Discounts & Total */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Valores, Condições Comerciais & Garantia
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-400" />
                  Desconto Especial (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Validade do Orçamento
                </label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={7}>7 dias corridos</option>
                  <option value={10}>10 dias corridos</option>
                  <option value={15}>15 dias corridos (Recomendado)</option>
                  <option value={30}>30 dias corridos</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Status da Proposta</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="pendente">⏳ Pendente / Enviado</option>
                  <option value="aprovado">✅ Aprovado pelo Cliente</option>
                  <option value="recusado">❌ Recusado / Cancelado</option>
                  <option value="convertido">🚀 Convertido em Agendamento</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Forma & Condições de Pagamento</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ex: À vista via Pix com 5% de desconto..."
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  list="payment-terms-list"
                />
                <datalist id="payment-terms-list">
                  {COMMON_PAYMENT_TERMS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Garantia do Serviço
                </label>
                <input
                  type="text"
                  value={warrantyInfo}
                  onChange={(e) => setWarrantyInfo(e.target.value)}
                  placeholder="Ex: Garantia de 90 dias nos serviços..."
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  list="warranty-terms-list"
                />
                <datalist id="warranty-terms-list">
                  {COMMON_WARRANTY_TERMS.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Observações Técnicas Adicionais (Opcional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Incluso furação nova e descarte da fechadura antiga. Pilhas alcalinas fornecidas pelo cliente."
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Total Highlight Bar */}
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-zinc-400 block font-mono text-[10px]">SUBTOTAL</span>
                  <span className="font-mono font-semibold text-zinc-200">{formatCurrencyBRL(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div>
                    <span className="text-rose-400 block font-mono text-[10px]">DESCONTO</span>
                    <span className="font-mono font-semibold text-rose-400">-{formatCurrencyBRL(discountAmount)}</span>
                  </div>
                )}
              </div>

              <div className="text-right flex items-center gap-3">
                <span className="text-zinc-400 text-xs font-mono font-bold uppercase">VALOR TOTAL:</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                  {formatCurrencyBRL(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-semibold transition-colors order-3 sm:order-1"
            >
              Cancelar
            </button>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2 order-1 sm:order-2">
              <button
                type="submit"
                id="btn-save-quote-only"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
                <span>Salvar no Histórico</span>
              </button>

              <button
                type="button"
                id="btn-save-and-send-whatsapp"
                onClick={(e) => handleSubmit(e, true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 active:scale-95 transition-all"
              >
                <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                <span>Salvar & Enviar WhatsApp</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
