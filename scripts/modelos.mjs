// Modelos de armadilha. Os do Livro Básico (Tormenta20 Jogo do Ano, p. 317–318) vêm com o módulo;
// outros módulos acrescentam os seus com api.registrarModelos({ id: modelo }) no hook "setup" (o Duelo de Dragões faz isso).
//
// Campos de um modelo (todos opcionais, menos nome):
//   nome, fonte (livro e página), texto (HTML curto que vai no card dos jogadores), nd, magica (true = Dissipar Magia anula)
//   pericia: "refl" | "fort" | "vont" | "" (sem teste: só o botão de dano para o mestre)
//   cd, dano (fórmula com tipo: "2d6[impacto]"), sucesso: "evita" | "metade" | "" (passar não muda o dano)
//   condicao: id da condição oferecida ao mestre em quem falhar ("abalado")
//   efeito: dados de um Active Effect oferecido ao mestre em quem falhar (dano contínuo, penalidades)
//   danoSePassar: fórmula que só quem passa sofre (Símbolo da Morte); quem falha recebe o texto de falha
//   falhaTexto, sucessoTexto: o que acontece, em poucas palavras, ao lado do resultado de cada um
//   area: true = afeta todos os tokens dentro da região quando dispara; false = só quem entrou
//   ativadorSemTeste: true = quem entrou não tem direito ao teste (Runa de Proteção)
//   encontrar, desarmar: CDs de Investigação e Ladinagem (só o mestre vê)

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
for (const m of Object.values(MODELOS_LIVRO)) m.fonte ??= "Tormenta20, p. 317–318";

const extras = {};
export function registrarModelos(novos = {}) {
  for (const [id, m] of Object.entries(novos)) if (m?.nome) extras[id] = m;
}
export const modelos = () => ({ ...MODELOS_LIVRO, ...extras });
export const modelo = (id) => modelos()[id] ?? null;
