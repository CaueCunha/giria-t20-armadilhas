// Modelos de armadilha. Os do Livro Básico (Tormenta20 Jogo do Ano, p. 317–318) e os dos suplementos
// (MODELOS_SUPLEMENTOS, com resumo mecânico próprio e a página) vêm com o módulo;
// outros módulos acrescentam os seus com api.registrarModelos({ id: modelo }) no hook "setup" (o Duelo de Dragões faz isso).
//
// Campos de um modelo (todos opcionais, menos nome):
//   nome, livro (sigla do Giria T20: "T20", "AdA"...) e pagina, como flags.giria-t20.fonte; fonte (texto do aviso, gerado
//   de livro e pagina quando falta); texto (HTML curto que vai no card dos jogadores), nd, magica (true = Dissipar Magia anula)
//   pericia: "refl" | "fort" | "vont" | "" (sem teste: só o botão de dano para o mestre)
//   cd, dano (fórmula com tipo: "2d6[impacto]"), sucesso: "evita" | "metade" | "" (passar não muda o dano)
//   condicao: id da condição oferecida ao mestre em quem falhar ("abalado")
//   efeito: dados de um Active Effect oferecido ao mestre em quem falhar (dano contínuo, penalidades)
//   danoSePassar: fórmula que só quem passa sofre (Símbolo da Morte); quem falha recebe o texto de falha
//   falhaTexto, sucessoTexto: o que acontece, em poucas palavras, ao lado do resultado de cada um
//   area: true = afeta todos os tokens dentro da região quando dispara; false = só quem entrou
//   ativadorSemTeste: true = quem entrou não tem direito ao teste (Runa de Proteção)
//   encontrar, desarmar: CDs de Investigação e Ladinagem (só o mestre vê)

import { LIVROS, grupoDoLivro, textoFonte, valorNd } from "./livros.mjs";

const efeitoPenalidade = (nome, valor, img) => ({
  name: nome, img, type: "base", transfer: false, disabled: false,
  duration: { value: null, units: "seconds", expiry: "sceneEnd" }, statuses: [], description: "",
  system: {
    changes: [{ key: "system.modificadores.pericias.geral", value: valor, type: "add", priority: null, phase: "initial" }],
    targets: [], status: null, onuse: false,
    abilityUse: { description: "", automatic: false, aumenta: false, custo: 0, names: [], types: [] },
    aura: { isAura: false, range: 0 },
  },
});

export const MODELOS_LIVRO = {
  "agulha-envenenada": { nome: "Agulha Envenenada", nd: "1/4", pericia: "refl", cd: 20, sucesso: "evita", dano: "1[perfuracao] + 1d12[perda]", texto: "Uma agulha envenenada salta do mecanismo: 1 de perfuração e perde 1d12 PV por veneno.", encontrar: 25, desarmar: 20 },
  "arame-farpado": { nome: "Arame Farpado", nd: "1/4", pericia: "", dano: "1d6+2[corte]", texto: "Conta como terreno difícil e corta quem atravessa.", encontrar: 10, desarmar: 20 },
  "fosso-camuflado": { nome: "Fosso Camuflado", nd: "1/4", pericia: "refl", cd: 20, sucesso: "evita", dano: "2d6[impacto]", texto: "O chão cede: queda de 3 m.", falhaTexto: "cai no fosso (Atletismo CD 20 para escalar)", encontrar: 20, desarmar: 20 },
  "rede": { nome: "Rede", nd: "1/4", pericia: "refl", cd: 20, sucesso: "evita", condicao: "agarrado", texto: "Uma rede cai do teto.", falhaTexto: "fica agarrado (ação completa e Acrobacia CD 20 para escapar)", encontrar: 20, desarmar: 20 },
  "virote": { nome: "Virote", nd: "1/4", pericia: "refl", cd: 20, sucesso: "evita", dano: "1d10+2[perfuracao]", texto: "Um virote dispara da parede.", encontrar: 25, desarmar: 20 },
  "fosso-profundo": { nome: "Fosso Profundo", nd: "1/2", pericia: "refl", cd: 20, sucesso: "evita", dano: "4d6[impacto]", texto: "O chão cede: queda de 6 m.", falhaTexto: "cai no fosso (Atletismo CD 20 para escalar)", encontrar: 20, desarmar: 20 },
  "lamina-na-parede": { nome: "Lâmina na Parede", nd: "1/2", pericia: "refl", cd: 20, sucesso: "evita", dano: "2d6+5[corte]", texto: "Uma lâmina sai da parede.", encontrar: 25, desarmar: 20 },
  "bloco-de-pedra": { nome: "Bloco de Pedra", nd: "1", pericia: "refl", cd: 20, sucesso: "evita", dano: "6d6[impacto]", texto: "Um bloco de pedra despenca do teto.", encontrar: 20, desarmar: 20 },
  "pendulo-de-teto": { nome: "Pêndulo de Teto", nd: "1", pericia: "refl", cd: 25, sucesso: "evita", dano: "1d12+10[corte]", texto: "Uma lâmina em pêndulo corta o corredor.", encontrar: 25, desarmar: 20 },
  "fosso-com-estacas": { nome: "Fosso com Estacas", nd: "2", pericia: "refl", cd: 20, sucesso: "evita", dano: "6d6[impacto] + 2d4+5[perfuracao]", texto: "O chão cede: queda de 9 m sobre estacas.", falhaTexto: "cai no fosso (Atletismo CD 20 para escalar)", encontrar: 20, desarmar: 20 },
  "runa-de-protecao": { nome: "Runa de Proteção", nd: "2", magica: true, area: true, ativadorSemTeste: true, pericia: "refl", cd: 20, sucesso: "metade", dano: "6d6[fogo]", texto: "A runa explode em todas as criaturas a até 3 m (troque o tipo para ácido, eletricidade, frio, luz ou trevas se quiser). Quem ativou não tem direito ao teste.", encontrar: 25, desarmar: 25 },
  "simbolo-do-medo": { nome: "Símbolo do Medo", nd: "2", magica: true, area: true, pericia: "vont", cd: 20, sucesso: "evita", condicao: "abalado", texto: "Criaturas em alcance curto ficam abaladas até o fim da cena.", falhaTexto: "abalado até o fim da cena", encontrar: 25, desarmar: 25 },
  "estatua-executora": { nome: "Estátua Executora", nd: "3", pericia: "refl", cd: 25, sucesso: "evita", dano: "1d12+10[corte]", texto: "A estátua golpeia duas vezes: cada teste evita um golpe. Clique em Disparar de novo para o segundo golpe.", encontrar: 20, desarmar: 20 },
  "gas-venenoso": { nome: "Gás Venenoso", nd: "3", pericia: "fort", cd: 20, sucesso: "metade", dano: "1d12[perda]", texto: "Perde 1d12 PV por veneno por rodada durante 2d4 rodadas. Clique em Disparar de novo a cada rodada.", encontrar: 25, desarmar: 25 },
  "simbolo-do-sono": { nome: "Símbolo do Sono", nd: "3", magica: true, area: true, pericia: "vont", cd: 20, sucesso: "evita", condicao: "inconsciente", texto: "Criaturas em alcance curto com 8 níveis ou menos caem inconscientes (como na magia Sono).", falhaTexto: "cai inconsciente (só com 8 níveis ou menos)", encontrar: 25, desarmar: 25 },
  "parede-instavel": { nome: "Parede Instável", nd: "4", area: true, pericia: "refl", cd: 25, sucesso: "metade", dano: "8d6[impacto]", texto: "A parede desaba num quadrado de 3 m de lado.", encontrar: 20, desarmar: 20 },
  "simbolo-da-dor": { nome: "Símbolo da Dor", nd: "4", magica: true, area: true, pericia: "fort", cd: 25, sucesso: "evita", efeito: efeitoPenalidade("Símbolo da Dor", -5, "icons/svg/terror.svg"), texto: "Criaturas em alcance curto sofrem dores terríveis: –5 em todos os testes até o fim da cena.", falhaTexto: "–5 em todos os testes até o fim da cena", encontrar: 30, desarmar: 30 },
  "bruma-da-insanidade": { nome: "Bruma da Insanidade", nd: "5", area: true, pericia: "fort", cd: 20, sucesso: "evita", condicao: "confuso", texto: "Criaturas num cubo de 6 m de lado ficam confusas até o fim da cena.", falhaTexto: "confuso até o fim da cena", encontrar: 25, desarmar: 25 },
  "simbolo-do-atordoamento": { nome: "Símbolo do Atordoamento", nd: "5", magica: true, area: true, pericia: "fort", cd: 25, sucesso: "evita", condicao: "atordoado", texto: "Criaturas em alcance curto ficam atordoadas por 1d6 rodadas.", falhaTexto: "atordoado por 1d6 rodadas", encontrar: 30, desarmar: 30 },
  "desabamento-do-teto": { nome: "Desabamento do Teto", nd: "6", area: true, pericia: "refl", cd: 30, sucesso: "metade", dano: "15d6[impacto]", texto: "O teto desaba num quadrado de 6 m de lado.", encontrar: 25, desarmar: 25 },
  "simbolo-da-insanidade": { nome: "Símbolo da Insanidade", nd: "6", magica: true, area: true, pericia: "vont", cd: 25, sucesso: "evita", condicao: "confuso", texto: "Criaturas em alcance curto ficam confusas permanentemente.", falhaTexto: "confuso permanentemente", encontrar: 30, desarmar: 30 },
  "abismo-da-morte": { nome: "Abismo da Morte", nd: "8", area: true, pericia: "refl", cd: 30, sucesso: "evita", dano: "20d6[impacto] + 2d8+10[perfuracao]", texto: "Um quadrado de 6 m de lado se abre numa queda de 30 m sobre estacas.", falhaTexto: "cai no abismo (Atletismo CD 25 para escalar)", encontrar: 30, desarmar: 30 },
  "simbolo-da-morte": { nome: "Símbolo da Morte", nd: "8", magica: true, area: true, pericia: "fort", cd: 30, danoSePassar: "10d6[trevas]", texto: "Criaturas em alcance curto são reduzidas a –1 PV. Quem passa sofre só 10d6 de trevas.", falhaTexto: "reduzido a –1 PV (o mestre ajusta os PV na ficha)", encontrar: 30, desarmar: 30 },
};
for (const m of Object.values(MODELOS_LIVRO)) Object.assign(m, { livro: "T20", pagina: "317–318" });

// Suplementos. Resumo mecânico próprio; o texto completo está no livro, na página indicada.
const ADA = (pagina, m) => ({ ...m, livro: "AdA", pagina: String(pagina) });
export const MODELOS_SUPLEMENTOS = {
  // Armadilhas vivas (p. 19): criaturas fixas da Tormenta; reativam sozinhas depois de 1d6 minutos.
  "estatua-executora-viva": ADA(19, { nome: "Estátua Executora Viva", nd: "4", pericia: "refl", cd: 27, sucesso: "evita", dano: "1d12+12[corte]", texto: "Armadilha viva que golpeia duas vezes: cada teste evita um golpe. Clique em Disparar de novo para o segundo golpe. Reativa sozinha depois de 1d6 minutos.", encontrar: 25, desarmar: 25 }),
  "gas-venenoso-vivo": ADA(19, { nome: "Gás Venenoso Vivo", nd: "4", pericia: "fort", cd: 22, sucesso: "metade", dano: "1d12+2[perda]", texto: "Armadilha viva: perde 1d12+2 PV por veneno por rodada durante 2d4 rodadas. Clique em Disparar de novo a cada rodada. Reativa sozinha depois de 1d6 minutos.", encontrar: 30, desarmar: 30 }),
  "parede-instavel-viva": ADA(19, { nome: "Parede Instável Viva", nd: "5", area: true, pericia: "refl", cd: 27, sucesso: "metade", dano: "8d6+16[impacto]", texto: "Armadilha viva: a parede desaba num quadrado de 3 m. Reativa sozinha depois de 1d6 minutos.", encontrar: 25, desarmar: 25 }),

  // Armadilhas kobolds (p. 178–179).
  "andrajos-flamejantes": ADA(178, { nome: "Andrajos Flamejantes", nd: "1/4", area: true, pericia: "refl", cd: 17, sucesso: "metade", dano: "2d6[fogo]", condicao: "emchamas", texto: "Trapos com combustível pegam fogo num raio de 3 m. Passar reduz o dano à metade e evita ficar em chamas.", falhaTexto: "fica em chamas", encontrar: 15, desarmar: 20 }),
  "sinos-alarmantes": ADA(178, { nome: "Sinos Alarmantes", nd: "1/4", pericia: "refl", cd: 15, sucesso: "evita", texto: "Um barbante escondido faz soar um alarme.", falhaTexto: "o alarme soa: kobolds em alcance longo não podem ser surpreendidos até o fim da cena", encontrar: 15, desarmar: 15 }),
  "geringonca-retardante": ADA(178, { nome: "Geringonça Retardante", nd: "1/4", area: true, pericia: "refl", cd: 17, sucesso: "evita", condicao: "enredado", texto: "Lama pegajosa cai sobre quem está num raio de 3 m.", falhaTexto: "enredado até tirar a lama (1 minuto)", encontrar: 17, desarmar: 20 }),
  "barril-de-bugulentos": ADA(178, { nome: "Barril de Bugulentos", nd: "1/2", pericia: "refl", cd: 20, sucesso: "evita", dano: "1d12[perda]", texto: "Insetos venenosos caem sobre a vítima: perde 1d12 PV por veneno agora e no início de cada turno dela, até se livrar (ação completa e Destreza CD 10; ficar em chamas também resolve).", falhaTexto: "coberto de bugulentos: perde 1d12 PV no início de cada turno", encontrar: 20, desarmar: 20 }),
  "besunte-galinificador": ADA(178, { nome: "Besunte Galinificador", nd: "1/2", pericia: "refl", cd: 20, sucesso: "evita", texto: "Um barril de gosma com penas de galinha vira sobre a vítima.", falhaTexto: "coberto de penas: kobolds recebem +2 em perícias e dano contra ele (1 minuto para limpar, ou fogo)", encontrar: 20, desarmar: 20 }),
  "tronco-de-arvore": ADA(178, { nome: "Tronco de Árvore", nd: "1", area: true, pericia: "refl", cd: 20, sucesso: "metade", dano: "4d6[impacto]", condicao: "caido", texto: "Um tronco desce como aríete numa linha de 6 m. Passar reduz o dano à metade e evita a queda.", falhaTexto: "fica caído", encontrar: 20, desarmar: 20 }),
  "virote-ardido": ADA(179, { nome: "Virote Ardido", nd: "1", pericia: "refl", cd: 25, sucesso: "evita", dano: "2d6[perfuracao] + 2d6[acido]", texto: "Um virote com pasta corrosiva atinge um personagem.", encontrar: 25, desarmar: 20 }),

  // Novos perigos: armadilhas (p. 358–359).
  "armadilha-de-gaiola": ADA(358, { nome: "Armadilha de Gaiola", nd: "1/2", pericia: "", condicao: "imovel", texto: "Grades de ferro fecham um quadrado de 1,5 m com a vítima dentro. Abrir: Força ou Ladinagem CD 25; quebrar: grades com RD 10 e 60 PV.", encontrar: 20, desarmar: 25 }),
  "runa-de-aceleracao": ADA(358, { nome: "Runa de Aceleração", nd: "1", magica: true, pericia: "fort", cd: 20, texto: "A vítima é arremessada na direção em que andava. Se bater numa parede ou objeto, sofre 1d6 de impacto a cada 1,5 m percorrido (o mestre rola).", falhaTexto: "arremessada 9 m", sucessoTexto: "arremessada só 4,5 m", encontrar: 20, desarmar: 20 }),
  "gas-putrido": ADA(358, { nome: "Gás Pútrido", nd: "2", area: true, pericia: "fort", cd: 20, condicao: "enjoado", texto: "Criaturas em alcance curto ficam enjoadas. Quem passa fica enjoado só por 1d4 rodadas (o mestre aplica).", falhaTexto: "enjoado por uma cena", sucessoTexto: "enjoado por 1d4 rodadas", encontrar: 25, desarmar: 25 }),
  "piso-eletrificado": ADA(358, { nome: "Piso Eletrificado", nd: "2", area: true, pericia: "fort", cd: 20, sucesso: "metade", dano: "6d6[eletricidade]", texto: "O piso dá choque num quadrado de 3 m. Quem está molhado ou de armadura de metal sofre –5 no teste.", encontrar: 25, desarmar: 20 }),
  "jato-de-chamas": ADA(358, { nome: "Jato de Chamas", nd: "3", area: true, pericia: "refl", cd: 25, sucesso: "metade", dano: "6d6[fogo]", condicao: "emchamas", texto: "Uma labareda cobre uma linha de 6 m. Passar reduz o dano à metade e evita ficar em chamas.", falhaTexto: "fica em chamas", encontrar: 25, desarmar: 25 }),
  "extrato-de-oxxdon": ADA(358, { nome: "Extrato de Oxxdon", nd: "5", area: true, pericia: "refl", cd: 25, sucesso: "evita", texto: "Uma nuvem de 3 m de raio oxida metal. Construtos de metal perdem 4d12 PV e ficam exaustos até serem reparados (Fortitude CD 25: metade e fatigado; o mestre rola).", falhaTexto: "itens de metal são destruídos", encontrar: 20, desarmar: 20 }),
  "mina-terrestre": ADA(358, { nome: "Mina Terrestre", nd: "5", area: true, pericia: "refl", cd: 25, sucesso: "evita", dano: "12d6[impacto]", texto: "Uma explosão numa esfera de 3 m.", encontrar: 25, desarmar: 25 }),
  "runa-de-teletransporte": ADA(358, { nome: "Runa de Teletransporte", nd: "5", magica: true, pericia: "vont", cd: 20, sucesso: "evita", texto: "Uma criatura a até 3 m é levada para um ponto em alcance médio, quase sempre uma cela ou outra armadilha.", falhaTexto: "teleportada (o mestre move o token)", encontrar: 25, desarmar: 20 }),
  "simbolo-da-anulacao": ADA(358, { nome: "Símbolo da Anulação", nd: "5", magica: true, area: true, pericia: "vont", cd: 25, sucesso: "evita", texto: "Magias em alcance curto são dissipadas e itens mágicos ficam mundanos por 1d6 rodadas.", falhaTexto: "magias dissipadas e itens mágicos mundanos por 1d6 rodadas", encontrar: 25, desarmar: 20 }),
  "estatua-de-gorgona": ADA(359, { nome: "Estátua de Górgona", nd: "9", area: true, pericia: "refl", cd: 25, sucesso: "evita", condicao: "petrificado", texto: "Criaturas num cone de 9 m à frente da estátua viram pedra.", falhaTexto: "petrificado", encontrar: 25, desarmar: 25 }),
  "runa-de-desintegracao": ADA(359, { nome: "Runa de Desintegração", nd: "10", magica: true, pericia: "fort", cd: 30, sucesso: "evita", dano: "10d12[essencia]", danoSePassar: "2d12[essencia]", texto: "Uma criatura em alcance curto sofre 10d12 de essência; quem passa sofre só 2d12. Quem chega a 0 PV ou menos vira pó.", sucessoTexto: "sofre só 2d12 (botão no cartão seguinte)", encontrar: 30, desarmar: 30 }),
  "sussurro-de-sszzaas": ADA(359, { nome: "Sussurro de Sszzaas", nd: "13", magica: true, pericia: "vont", cd: 30, sucesso: "evita", texto: "Encantamento: uma criatura em alcance curto vê todos como inimigos e só faz ações hostis contra os aliados. Repete o teste no fim de cada rodada; se passar, o efeito acaba.", falhaTexto: "ataca os aliados (refaz Vontade no fim de cada rodada)", encontrar: 30, desarmar: 30 }),
};

// Campanha Duelo de Dragões (Revista Tormenta20). Os ids começam com "ddd-", os mesmos que o módulo Duelo de Dragões
// 0.21.3 registrava; agora vêm daqui, no grupo "DdD - Armadilhas". O Símbolo da Morte das revistas 9 e 13 é o do Livro Básico.
const DDD = (revista, m) => ({ ...m, livro: "DdD", fonte: `Duelo de Dragões #${revista}` });
const danoContinuo = (nome, formula) => ({
  name: nome, img: "icons/svg/hazard.svg", type: "base", transfer: false, disabled: false,
  duration: { value: null, units: "seconds", expiry: null }, statuses: [], description: "",
  system: {
    changes: [{ key: "danoContinuo", value: formula, type: "custom", priority: null, phase: "initial" }],
    targets: [], status: null, onuse: false,
    abilityUse: { description: "", automatic: false, aumenta: false, custo: 0, names: [], types: [] },
    aura: { isAura: false, range: 0 },
  },
});
export const MODELOS_CAMPANHA = {
  "ddd-fosso-uivantes": DDD(2, { nome: "Fosso nas Uivantes", nd: "1/4", pericia: "refl", cd: 15, sucesso: "evita", dano: "1d6[impacto]", texto: "A neve esconde um fosso.", falhaTexto: "cai no fosso" }),
  "ddd-bugulentos": DDD(3, { nome: "Bugulentos!", nd: "1/2", pericia: "refl", cd: 20, sucesso: "evita", dano: "1d12[perda]", efeito: danoContinuo("Bugulentos", "1d12[perda]"), texto: "Um fio derruba um barril de insetos venenosos do teto.", falhaTexto: "coberto de bugulentos: perde 1d12 PV no início de cada turno até se livrar (ação completa e Destreza CD 10) ou ficar em chamas", encontrar: 20, desarmar: 20 }),
  "ddd-fogo-fatuo": DDD(12, { nome: "Fogo-fátuo", nd: "6", magica: true, area: true, pericia: "vont", cd: 25, sucesso: "metade", dano: "7d6[psiquico]", condicao: "atordoado", texto: "Luzes dançam sobre a lama e as runas tomam a mente (dano psíquico não letal). Repete a cada rodada: clique em Disparar de novo. Cada sucesso dá uma rodada de lucidez para agir.", falhaTexto: "atordoado", encontrar: 30, desarmar: 30 }),
  "ddd-queda-da-escada": DDD(13, { nome: "Escada Quebrada", nd: "", pericia: "atle", cd: 25, sucesso: "evita", dano: "10d6[impacto]", texto: "A escada do túnel de 30 m está quebrada. Cada um testa também Percepção CD 25: só cai quem falhar nos dois testes.", falhaTexto: "cai, se também falhou em Percepção CD 25" }),
  "ddd-sussurro-de-sszzaas": DDD(13, { nome: "Sussurro de Sszzaas (túnel)", nd: "13", magica: true, area: true, pericia: "vont", cd: 30, sucesso: "evita", texto: "Criaturas em alcance curto ouvem o sussurro do Grande Corruptor. Repete no fim de cada turno e não se desativa ao disparar (Ladinagem ou Dissipar Magia).", falhaTexto: "vê todos como inimigos e gasta suas ações contra os aliados", encontrar: 30, desarmar: 30 }),
  "ddd-maldicao-do-dragao-rei": DDD(19, { nome: "Maldição do Dragão-Rei", nd: "16", magica: true, area: true, pericia: "fort", cd: 45, sucesso: "metade", dano: "10d12[trevas]", condicao: "alquebrado", texto: "As runas sob o musgo despertam em todas as criaturas em alcance curto.", falhaTexto: "alquebrado", encontrar: 40, desarmar: 40 }),
};

// Fonte do aviso a partir de livro e página (os modelos de outros módulos podem trazer a sua).
for (const m of [...Object.values(MODELOS_LIVRO), ...Object.values(MODELOS_SUPLEMENTOS)]) m.fonte ??= textoFonte(m.livro, m.pagina);

const extras = {};
// Um id que o módulo já traz não é trocado (o Duelo de Dragões 0.21.3 registrava os "ddd-" que agora vêm daqui).
export function registrarModelos(novos = {}) {
  for (const [id, m] of Object.entries(novos)) if (m?.nome && !PROPRIOS[id]) extras[id] = m;
}
const PROPRIOS = { ...MODELOS_LIVRO, ...MODELOS_SUPLEMENTOS, ...MODELOS_CAMPANHA };
export const modelos = () => ({ ...PROPRIOS, ...extras });
export const modelo = (id) => modelos()[id] ?? null;

// Lista do formulário agrupada por livro, como as pastas do Giria T20 ("LB - Armadilhas", "AdA - Armadilhas"),
// na ordem dos livros e, dentro de cada um, por ND. Modelos sem livro conhecido vão para "Outros módulos".
export function escolhasModelos() {
  const ordemLivro = (m) => { const i = LIVROS.findIndex((l) => l.fonte === m.livro); return i < 0 ? LIVROS.length : i; };
  const lista = Object.entries(modelos()).map(([id, m], i) => ({ id, m, i }));
  lista.sort((a, b) => ordemLivro(a.m) - ordemLivro(b.m) || valorNd(a.m.nd) - valorNd(b.m.nd) || a.i - b.i);
  // A sigla fica também no rótulo dos suplementos, para a lista continuar clara se o Foundry não mostrar os grupos.
  const rotulo = (m) => `${m.nome}${m.nd ? ` (ND ${m.nd})` : ""}${m.livro && m.livro !== "T20" ? ` · ${m.livro}` : ""}`;
  return Object.fromEntries(lista.map(({ id, m }) => [id, { label: rotulo(m), group: grupoDoLivro(m.livro) }]));
}
