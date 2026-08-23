import React from 'react';
import { 
  HelpCircle, 
  Layers, 
  Smartphone, 
  Bell, 
  MessageSquare, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  ShieldCheck, 
  ExternalLink,
  Code2,
  Sparkles
} from 'lucide-react';

export const TechConsultingModal: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Introduction Card */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-950/90 border border-blue-700/60 text-blue-400">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Dúvidas Técnicas & Planejamento do Projeto
            </h2>
            <p className="text-xs text-slate-400">
              Respostas especializadas para escalabilidade, arquitetura mobile e estimativas de produção.
            </p>
          </div>
        </div>
      </div>

      {/* Question 1: Technology Recommendation */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Dúvida 1</span>
            <h3 className="text-base font-bold text-white">
              1. Qual tecnologia (Flutter, React Native, No-Code/PWA) recomendamos para Android e iOS?
            </h3>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-3 pl-2 sm:pl-10">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Recomendação Principal: React Native (com Expo) ou PWA Instalável</span>
            </div>
            <p className="leading-relaxed">
              Para um aplicativo focado em prestador de serviços em campo, a melhor escolha técnica é <strong>React Native (Expo)</strong> ou <strong>PWA (Progressive Web App)</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li><strong>React Native (Expo):</strong> Gera aplicativos nativos 100% reais para Google Play Store (.apk/.aab) e Apple App Store (.ipa) com uma única base de código TypeScript. Permite alarmes sonoros em segundo plano, notificações locais mesmo com celular bloqueado e acesso direto a mapas e contatos.</li>
              <li><strong>Flutter:</strong> Também é excelente para interfaces bonitas, mas o React Native compartilha o mesmo ecossistema web/TypeScript já construído aqui, reduzindo o tempo de desenvolvimento em 40%.</li>
              <li><strong>No-Code (FlutterFlow / Bubble):</strong> Bom para protótipos, porém costuma ter limitações com alarmes sonoros complexos em background e custos de assinatura mensal recorrente.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Question 2: Notifications & WhatsApp */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Dúvida 2</span>
            <h3 className="text-base font-bold text-white">
              2. Como estruturar o envio de notificações e a integração com WhatsApp de forma simples?
            </h3>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-3 pl-2 sm:pl-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* WhatsApp */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Integração WhatsApp (Custo Zero):
              </span>
              <p className="leading-relaxed text-[11px] text-slate-300">
                A forma mais rápida, segura e 100% gratuita é utilizar <strong>Deep Links dinâmicos (`wa.me` e `whatsapp://`)</strong> com templates pré-formatados (como implementamos neste app). O prestador clica em 1 botão e a mensagem já abre preenchida com o nome, data, endereço e valor no WhatsApp normal ou WhatsApp Business.
              </p>
              <div className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded-lg">
                💡 <em>Para automação 100% sem intervenção humana, pode-se integrar a API do WhatsApp (Evolution API / Z-API) em etapas futuras.</em>
              </div>
            </div>

            {/* Notifications */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2">
              <span className="font-bold text-blue-400 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                Notificações e Despertador:
              </span>
              <p className="leading-relaxed text-[11px] text-slate-300">
                1. <strong>Notificações Locais (Expo Notifications / Web Notifications):</strong> O próprio celular agenda os alarmes e avisos (ex: 1h antes ou no horário exato) sem precisar de servidor externo.<br />
                2. <strong>Push Remoto (Firebase Cloud Messaging - FCM):</strong> Para avisos disparados por clientes ou agendamentos web externos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Question 3: Budget and Timeline */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Dúvida 3</span>
            <h3 className="text-base font-bold text-white">
              3. Estimativa de Prazo e Orçamento de Mercado
            </h3>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-3 pl-2 sm:pl-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Clock className="w-4 h-4" />
                <span>Estimativa de Prazo</span>
              </div>
              <p className="text-white font-bold text-sm">2 a 4 semanas</p>
              <p className="text-[11px] text-slate-400">
                - Semana 1: Estrutura, Design com identidade visual preta/azul e Agenda.<br />
                - Semana 2: Banco de clientes, alarmes sonoros e WhatsApp 1-clique.<br />
                - Semana 3: Ajustes de campo, testes de push e publicação nas lojas.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <DollarSign className="w-4 h-4" />
                <span>Faixa de Orçamento de Mercado (BR)</span>
              </div>
              <p className="text-white font-bold text-sm">R$ 2.500 a R$ 6.000 (Versão Customizada)</p>
              <p className="text-[11px] text-slate-400">
                - Versão MVP Web/PWA Completo: ~R$ 2.500 a R$ 3.500<br />
                - Versão Nativa Android + iOS com publicação nas lojas: ~R$ 4.500 a R$ 6.000<br />
                - Custo de manutenção mensal: Quase R$ 0,00 utilizando Firestore/Local Storage e Deep Links WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
