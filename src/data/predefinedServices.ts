export interface PredefinedService {
  id: string;
  category: 'instalacao' | 'manutencao' | 'automacao' | 'adicional';
  name: string;
  description: string;
  defaultPrice: number;
  iconName?: string;
  estimatedTime?: string;
}

export const PREDEFINED_SERVICES: PredefinedService[] = [
  {
    id: 'inst-sobrepor',
    category: 'instalacao',
    name: 'Instalação de Fechadura Digital de Sobrepor',
    description: 'Furação de gabarito, fixação na porta, ajuste de contra-testa no batente e testes de abertura.',
    defaultPrice: 200,
    estimatedTime: '60 min',
  },
  {
    id: 'inst-embutir',
    category: 'instalacao',
    name: 'Instalação de Fechadura Biométrica de Embutir',
    description: 'Entalhe/usinagem precisa no miolo da porta, furação de máquina, fixação de espelhos e calibragem.',
    defaultPrice: 280,
    estimatedTime: '90-120 min',
  },
  {
    id: 'inst-pivotante',
    category: 'instalacao',
    name: 'Instalação Especial em Porta Pivotante',
    description: 'Ajuste e fixação com compensação do raio pivotante, alinhamento de trincos magnéticos ou rolete.',
    defaultPrice: 340,
    estimatedTime: '120 min',
  },
  {
    id: 'inst-vidro',
    category: 'instalacao',
    name: 'Instalação de Fechadura em Porta de Vidro Temperado',
    description: 'Fixação por pressão/garras em vidro temperado de correr ou pivotante (Vidro/Vidro ou Vidro/Alvenaria).',
    defaultPrice: 300,
    estimatedTime: '90 min',
  },
  {
    id: 'inst-portao',
    category: 'instalacao',
    name: 'Instalação para Portão Social / Externo',
    description: 'Fixação em gradil metálico/ferro/alumínio com proteção contra chuva e passagem de fiação se elétrico.',
    defaultPrice: 250,
    estimatedTime: '90 min',
  },
  {
    id: 'conf-hub-alexa',
    category: 'automacao',
    name: 'Configuração de Hub Zigbee & Automação Alexa/Google',
    description: 'Pareamento do gateway à rede 2.4GHz, criação de rotinas por voz, autorizações e senhas temporárias.',
    defaultPrice: 150,
    estimatedTime: '45 min',
  },
  {
    id: 'conf-senhas-tags',
    category: 'automacao',
    name: 'Cadastro de Usuários, Senhas, Biometrias e Tags',
    description: 'Treinamento completo aos moradores, cadastro biométrico de todos os membros e dicas de segurança.',
    defaultPrice: 90,
    estimatedTime: '30 min',
  },
  {
    id: 'manut-regulagem',
    category: 'manutencao',
    name: 'Manutenção / Regulagem de Trinco e Batente',
    description: 'Desempeno de portas arrastando, reposicionamento da chapa testa e eliminação de alarme falso.',
    defaultPrice: 160,
    estimatedTime: '60 min',
  },
  {
    id: 'manut-baterias-revisao',
    category: 'manutencao',
    name: 'Revisão Geral Preventiva + Troca de Baterias Alcalinas',
    description: 'Limpeza de contatos, lubrificação seca de engrenagens e inserção de pilhas alcalinas de alta durabilidade.',
    defaultPrice: 120,
    estimatedTime: '45 min',
  },
  {
    id: 'inst-olho-magico',
    category: 'adicional',
    name: 'Instalação de Olho Mágico Digital / Vídeo Porteiro',
    description: 'Furação padrão, fixação de display interno e câmera externa com gravação de visitantes.',
    defaultPrice: 220,
    estimatedTime: '60 min',
  },
  {
    id: 'remocao-antiga',
    category: 'adicional',
    name: 'Remoção de Fechadura Mecânica Antiga com Acabamento',
    description: 'Desinstalação de máquina antiga, vedação/fechamento estético de furações anteriores.',
    defaultPrice: 80,
    estimatedTime: '30 min',
  },
  {
    id: 'visita-tecnica',
    category: 'adicional',
    name: 'Visita Técnica de Avaliação e Medição no Local',
    description: 'Avaliação de espessura de porta, recuo de guarnições e indicação do modelo ideal (abatido no serviço).',
    defaultPrice: 80,
    estimatedTime: '45 min',
  },
];

export const POPULAR_LOCK_MODELS = [
  'Intelbras FR 101 (Sobrepor)',
  'Intelbras IFR 1001 (Sobrepor Wi-Fi)',
  'Intelbras IFR 7000 (Embutir Biométrica)',
  'Intelbras FD 1000 (Sobrepor)',
  'Yale YMC 420D (Biométrica Embutir)',
  'Yale YDF 40 / YDF 40A',
  'Tuya Smart Lock Wi-Fi / Zigbee',
  'Papaiz SL120 / SL130 / SL200',
  'Elsys Digital Biometria ESF-DS1000',
  'Agl Card / Pass / Bio',
  'Garen Smart Lock',
];

export const COMMON_PAYMENT_TERMS = [
  'À vista via Pix com 5% de desconto',
  'Pix ou Cartão de Débito/Crédito na finalização do serviço',
  'Cartão de Crédito em até 3x sem juros ou até 12x',
  '50% de entrada no aceite + 50% na entrega e teste do serviço',
  'Faturado no Boleto (para condomínios e empresas - 15 dias)',
];

export const COMMON_WARRANTY_TERMS = [
  'Garantia de 90 dias na mão de obra e suporte para configurações',
  'Garantia de 6 meses no serviço de instalação e regulagem',
  'Garantia de 1 ano no serviço executado + suporte pós-venda',
];
