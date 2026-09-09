export interface DailyBibleInspiration {
  reference: string;
  text: string;
  exactUserProvided?: boolean;
}

// Mensagens curtas para leitura direta no Dashboard.
// Filipenses 4:13 usa exatamente o texto fornecido pelo usuário.
// As demais são paráfrases curtas associadas às referências, para não embutir
// uma coleção extensa de uma tradução bíblica protegida dentro do aplicativo.
export const DAILY_BIBLE_INSPIRATIONS: DailyBibleInspiration[] = [
  { reference: 'Filipenses 4:13', text: 'Tudo posso naquele que me fortalece.', exactUserProvided: true },
  { reference: 'Salmos 37:5', text: 'Entregue seus caminhos a Deus e siga confiando nele.' },
  { reference: 'Provérbios 16:3', text: 'Coloque seus planos nas mãos de Deus antes de começar.' },
  { reference: 'Salmos 23:1', text: 'Com Deus guiando seus passos, você não caminha desamparado.' },
  { reference: 'Salmos 46:1', text: 'Deus é refúgio e força nos momentos difíceis.' },
  { reference: 'Provérbios 3:5', text: 'Confie em Deus de coração, mesmo quando nem tudo fizer sentido.' },
  { reference: 'Romanos 8:28', text: 'Deus pode transformar até situações difíceis em parte de um propósito maior.' },
  { reference: 'Isaías 41:10', text: 'Não tenha medo: Deus permanece ao seu lado e lhe dá forças.' },
  { reference: 'Josué 1:9', text: 'Siga com coragem, pois Deus acompanha você no caminho.' },
  { reference: 'Salmos 121:2', text: 'Seu socorro vem de Deus, Criador do céu e da terra.' },
  { reference: 'Mateus 6:34', text: 'Faça bem o que cabe a hoje sem carregar antecipadamente o peso de amanhã.' },
  { reference: 'Salmos 90:17', text: 'Peça a Deus que abençoe e dê firmeza ao trabalho das suas mãos.' },
  { reference: 'Colossenses 3:23', text: 'Faça seu trabalho de coração e com dedicação.' },
  { reference: 'Gálatas 6:9', text: 'Não desista de fazer o bem; a perseverança também produz frutos.' },
  { reference: 'Salmos 28:7', text: 'Confie em Deus como sua força e proteção.' },
  { reference: 'Tiago 1:5', text: 'Quando faltar sabedoria, peça a Deus orientação para decidir.' },
  { reference: 'Provérbios 4:23', text: 'Cuide do seu coração, pois suas escolhas começam nele.' },
  { reference: 'Salmos 119:105', text: 'A Palavra de Deus ilumina o próximo passo do caminho.' },
  { reference: '2 Coríntios 12:9', text: 'Mesmo nas limitações, a graça de Deus continua suficiente.' },
  { reference: 'Salmos 55:22', text: 'Entregue suas preocupações a Deus e continue caminhando.' },
  { reference: 'Jeremias 29:11', text: 'Deus conhece o futuro e seus planos apontam para esperança.' },
  { reference: '1 Pedro 5:7', text: 'Coloque suas preocupações diante de Deus, porque ele cuida de você.' },
  { reference: 'Salmos 34:8', text: 'Experimente confiar em Deus e reconhecer sua bondade.' },
  { reference: 'Provérbios 16:9', text: 'Planeje seu caminho, mas permaneça aberto à direção de Deus.' },
  { reference: 'Salmos 27:1', text: 'Com Deus como luz e proteção, o medo não precisa comandar suas decisões.' },
  { reference: 'Hebreus 11:1', text: 'A fé sustenta a esperança mesmo antes de enxergarmos o resultado.' },
  { reference: 'Salmos 118:24', text: 'Receba este dia com gratidão e alegria.' },
  { reference: 'Efésios 6:10', text: 'Busque em Deus a força necessária para seguir firme.' },
  { reference: 'Isaías 40:31', text: 'Quem coloca a esperança em Deus encontra novas forças para continuar.' },
  { reference: 'Salmos 19:14', text: 'Que suas palavras e pensamentos sejam agradáveis diante de Deus.' },
];
