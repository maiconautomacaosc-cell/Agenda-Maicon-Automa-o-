import React from 'react';
import { 
  Calendar, 
  Clock, 
  FileText,
  Users, 
  DollarSign, 
  HelpCircle,
  Plus
} from 'lucide-react';
import { ViewTab } from '../types';

interface BottomNavigationProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onNewAppointment: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  onNewAppointment,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 px-1.5 py-1.5 flex items-center justify-around">
      <button
        id="tab-btn-agenda"
        onClick={() => onSelectTab('agenda')}
        className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all ${
          currentTab === 'agenda'
            ? 'text-cyan-400 font-bold scale-105'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Calendar className="w-4 h-4 mb-0.5" />
        <span className="text-[9px]">Agenda</span>
      </button>

      <button
        id="tab-btn-diario"
        onClick={() => onSelectTab('diario')}
        className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all ${
          currentTab === 'diario'
            ? 'text-cyan-400 font-bold scale-105'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Clock className="w-4 h-4 mb-0.5" />
        <span className="text-[9px]">Dia a Dia</span>
      </button>

      <button
        id="tab-btn-orcamentos"
        onClick={() => onSelectTab('orcamentos')}
        className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all ${
          currentTab === 'orcamentos'
            ? 'text-cyan-400 font-bold scale-105'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <FileText className="w-4 h-4 mb-0.5" />
        <span className="text-[9px]">Orçamentos</span>
      </button>

      {/* Floating Center Action Button */}
      <button
        id="tab-btn-center-add"
        onClick={onNewAppointment}
        className="flex flex-col items-center justify-center -mt-4 p-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black shadow-xl shadow-cyan-950/80 border-2 border-zinc-900 active:scale-90 transition-transform"
        title="Novo Agendamento Rápido"
      >
        <Plus className="w-5 h-5 stroke-[3]" />
      </button>

      <button
        id="tab-btn-clientes"
        onClick={() => onSelectTab('clientes')}
        className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all ${
          currentTab === 'clientes'
            ? 'text-cyan-400 font-bold scale-105'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Users className="w-4 h-4 mb-0.5" />
        <span className="text-[9px]">Clientes</span>
      </button>

      <button
        id="tab-btn-financeiro"
        onClick={() => onSelectTab('financeiro')}
        className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all ${
          currentTab === 'financeiro'
            ? 'text-cyan-400 font-bold scale-105'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <DollarSign className="w-4 h-4 mb-0.5" />
        <span className="text-[9px]">Relatórios</span>
      </button>
    </div>
  );
};

