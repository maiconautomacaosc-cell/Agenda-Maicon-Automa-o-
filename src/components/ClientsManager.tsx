import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  MessageSquare, 
  CalendarPlus, 
  Edit3, 
  Trash2, 
  History, 
  CheckCircle2, 
  X, 
  Save, 
  KeyRound,
  FileText,
  Tag,
  ClipboardList
} from 'lucide-react';
import { Client, Appointment } from '../types';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';
import { openWhatsApp } from '../utils/whatsapp';

interface ClientsManagerProps {
  clients: Client[];
  appointments: Appointment[];
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onScheduleForClient: (client: Client) => void;
  onOpenWhatsAppForAppt: (appt: Appointment) => void;
  onQuoteForClient?: (client: Client) => void;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  clients,
  appointments,
  onSaveClient,
  onDeleteClient,
  onScheduleForClient,
  onQuoteForClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');


  const openNewClientModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setAddress('');
    setNeighborhood('');
    setCity('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditClientModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setAddress(client.address);
    setNeighborhood(client.neighborhood || '');
    setCity(client.city || '');
    setNotes(client.notes || '');
    setIsModalOpen(true);
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length <= 10) {
      formatted = digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      formatted = digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    setPhone(formatted.trim());
  };


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    const newClient: Client = {
      id: editingClient ? editingClient.id : `cli-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || '(11) 99999-9999',
      address: address.trim() || 'A combinar',
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      serialNumber: editingClient?.serialNumber,
      serviceOrder: editingClient?.serviceOrder,
      equipment: editingClient?.equipment,
      notes: notes.trim(),
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString(),
    };

    onSaveClient(newClient);
    setIsModalOpen(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.neighborhood && c.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.serialNumber && c.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.serviceOrder && c.serviceOrder.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Header with Search and New Client Button */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Banco de Clientes
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            id="btn-new-client-top"
            onClick={openNewClientModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-lg shadow-cyan-950/40 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative pt-1 border-t border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, telefone, N° de Série (ex: MA-000029), OS (ex: OS-000029) ou endereço..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredClients.length === 0 ? (
          <div className="col-span-full p-10 text-center rounded-3xl bg-zinc-900 border border-dashed border-zinc-800 space-y-3">
            <Users className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhum cliente encontrado</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Cadastre novos clientes com N° de Série (MA-XXXXXX) e Ordem de Serviço (OS-XXXXXX) para controle e garantia de fechaduras.
            </p>
            <button
              onClick={openNewClientModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold shadow-md shadow-cyan-950/40 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              Cadastrar Primeiro Cliente
            </button>
          </div>
        ) : (
          filteredClients.map((client) => {
            const clientAppts = appointments.filter(
              a => a.clientId === client.id || a.clientName.toLowerCase() === client.name.toLowerCase()
            );
            const completedCount = clientAppts.filter(a => a.status === 'concluido').length;
            const totalSpent = clientAppts
              .filter(a => a.status === 'concluido' && a.price)
              .reduce((acc, c) => acc + (c.price || 0), 0);

            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-3 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-sm">{client.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{client.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditClientModal(client)}
                        className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                        title="Editar cliente"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Deseja excluir o cliente "${client.name}"?`)) {
                            onDeleteClient(client.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Serial Number & Service Order Badges */}
                  {(client.serialNumber || client.serviceOrder) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {client.serialNumber && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 text-[11px] font-mono font-bold shadow-xs">
                          <Tag className="w-3 h-3 text-cyan-400" />
                          <span>Série: {client.serialNumber}</span>
                        </span>
                      )}
                      {client.serviceOrder && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[11px] font-mono font-bold shadow-xs">
                          <ClipboardList className="w-3 h-3 text-amber-400" />
                          <span>OS: {client.serviceOrder}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Address */}
                  <div className="flex items-start gap-1.5 text-xs text-zinc-300 bg-zinc-950 p-2 rounded-xl border border-zinc-800 mt-2.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>

                  {/* Notes if any */}
                  {client.notes && (
                    <div className="text-[11px] text-zinc-400 bg-zinc-950/70 p-2 rounded-lg border border-zinc-800 mt-1.5">
                      💬 <span className="text-zinc-300">{client.notes}</span>
                    </div>
                  )}

                  {/* Badges metrics */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-2">
                    <span>
                      {clientAppts.length} serv. ({completedCount} conc.)
                    </span>
                    {totalSpent > 0 && (
                      <span className="font-semibold text-emerald-400">
                        {formatCurrencyBRL(totalSpent)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions for client */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => onScheduleForClient(client)}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Agendar</span>
                  </button>

                  {onQuoteForClient && (
                    <button
                      onClick={() => onQuoteForClient(client)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Orçar</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const msg = `Olá, ${client.name}! Aqui é o Maicon da Maicon Automação (Fechaduras Eletrônicas).${client.serialNumber ? ` Ref. Fechadura Nº de Série ${client.serialNumber}.` : ''} Tudo bem? Como posso te ajudar hoje?`;
                      openWhatsApp(client.phone, msg, 'standard');
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setSelectedClientForHistory(client)}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Histórico</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Client History Popover */}
      {selectedClientForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Histórico de Atendimentos</h3>
                  <p className="text-xs text-zinc-400">{selectedClientForHistory.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client header badge with serial number and OS */}
            {(selectedClientForHistory.serialNumber || selectedClientForHistory.serviceOrder) && (
              <div className="px-4 py-2.5 bg-zinc-950/60 border-b border-zinc-800 flex flex-wrap items-center gap-2">
                {selectedClientForHistory.serialNumber && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-700/60 text-cyan-300 text-xs font-mono font-bold">
                    <Tag className="w-3 h-3 text-cyan-400" />
                    <span>N° Série: {selectedClientForHistory.serialNumber}</span>
                  </span>
                )}
                {selectedClientForHistory.serviceOrder && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-950 border border-amber-700/60 text-amber-300 text-xs font-mono font-bold">
                    <ClipboardList className="w-3 h-3 text-amber-400" />
                    <span>OS: {selectedClientForHistory.serviceOrder}</span>
                  </span>
                )}
              </div>
            )}

            <div className="p-4 space-y-2.5 overflow-y-auto flex-1 text-xs">
              {appointments.filter(
                a => a.clientId === selectedClientForHistory.id || a.clientName.toLowerCase() === selectedClientForHistory.name.toLowerCase()
              ).length === 0 ? (
                <div className="p-6 text-center text-zinc-400">
                  Nenhum serviço registrado para este cliente até o momento.
                </div>
              ) : (
                appointments
                  .filter(a => a.clientId === selectedClientForHistory.id || a.clientName.toLowerCase() === selectedClientForHistory.name.toLowerCase())
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(a => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1"
                    >
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-white flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                          {a.serviceTypeName}
                        </span>
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          a.status === 'concluido' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                        }`}>
                          {a.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-zinc-400 font-mono text-[11px] flex justify-between">
                        <span>📅 {formatDateBR(a.date)} às {a.startTime}</span>
                        {a.price && <span className="text-emerald-400 font-semibold">{formatCurrencyBRL(a.price)}</span>}
                      </div>
                      {a.lockModel && (
                        <div className="text-zinc-300 text-[11px]">
                          Fechadura: {a.lockModel}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
            <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>


              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1578, Apto 142"
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bela Vista"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade (opcional)"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Observações / Tipo de Fechadura</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Portaria com identificação facial, fechadura Intelbras FR101..."
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-md shadow-cyan-950/40 cursor-pointer"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

