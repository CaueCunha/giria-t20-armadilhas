// Bateria do módulo de armadilhas. Rodar na raiz do repositório:  node --test "testes/**/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { REF, validarEfeito, formulaValida } from "./lib/ref.mjs";
import { criarMundo } from "./lib/mock.mjs";
import { MODELOS_LIVRO, registrarModelos, modelos } from "../scripts/modelos.mjs";
import { registrarTipo, configDe, _teste as A } from "../scripts/armadilha.mjs";
import { _teste as T } from "../scripts/testes.mjs";

const MOD = "giria-t20-armadilhas";
const espera = () => new Promise((r) => setTimeout(r, 0));
function mundo(opts) {
  const M = criarMundo(opts);
  registrarTipo();
  A.pendentes.clear();
  return M;
}
// Cada jogador clica no botão do seu herói em todos os cartões de teste abertos (como o jogador, pelo socket).
async function jogadoresRolam(M) {
  for (const msg of M.chat.filter((m) => m.flags?.[MOD]?.pedido)) {
    const linhas = msg.flags[MOD].pedido.linhas;
    for (let l = 0; l < linhas.length; l++) if (!linhas[l].feito) await T.clicarRolar(msg, l, linhas[l].pericias[0]);
  }
  await espera();
}
async function mestreAplica(M) {
  for (const msg of M.chat) {
    const lista = msg.flags?.[MOD]?.acoes ?? [];
    for (let i = 0; i < lista.length; i++) if (!msg.flags[MOD].acoes[i].feito) await T.executarAcao(msg, i);
  }
}
const avisos = (M) => M.chat.filter((m) => m.flags?.[MOD]?.aviso);

test("module.json: id, tipo de comportamento declarado, socket e scripts que existem", () => {
  const m = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url)));
  assert.equal(m.id, MOD);
  assert.deepEqual(m.documentTypes, { RegionBehavior: { armadilha: {} } }, "o Foundry só aceita o tipo do módulo se ele estiver em documentTypes");
  assert.equal(m.socket, true);
  assert.match(m.version, /^\d+\.\d+\.\d+$/);
  for (const s of m.esmodules) assert.ok(fs.existsSync(new URL(`../${s}`, import.meta.url)), s);
});

test("modelos do Livro Básico: perícia, CD, dano, condição e efeito existem no sistema", () => {
  const p = [];
  for (const [id, m] of Object.entries(MODELOS_LIVRO)) {
    if (!m.nome || !m.texto || !m.fonte) p.push(`${id}: falta nome, texto ou fonte`);
    if (!["", "refl", "fort", "vont"].includes(m.pericia ?? "")) p.push(`${id}: perícia ${m.pericia}`);
    if (m.pericia && !(m.cd > 0)) p.push(`${id}: sem CD`);
    if (m.pericia && !REF.pericias.includes(m.pericia)) p.push(`${id}: perícia não existe no sistema`);
    if (!m.pericia && !m.dano) p.push(`${id}: sem teste e sem dano não faz nada`);
    for (const f of [m.dano, m.danoSePassar].filter(Boolean)) {
      if (!formulaValida(f.replace(/\s+/g, ""))) p.push(`${id}: fórmula ${f}`);
      for (const [, t] of f.matchAll(/\[([^\]]+)\]/g)) if (!REF.tiposDano.includes(t)) p.push(`${id}: tipo de dano ${t}`);
      if (!/\[[a-z]+\]/.test(f)) p.push(`${id}: dano sem tipo`);
    }
    if (m.condicao && !REF.condicoes.includes(m.condicao)) p.push(`${id}: condição ${m.condicao}`);
    if (m.efeito) p.push(...validarEfeito(m.efeito, { tipoAtor: "efeito-direto", onde: `${id}: ` }));
    if (!(m.encontrar > 0 && m.desarmar > 0)) p.push(`${id}: faltam as CDs de encontrar/desarmar`);
    if (!["evita", "metade", "", undefined].includes(m.sucesso)) p.push(`${id}: sucesso ${m.sucesso}`);
  }
  assert.deepEqual(p, []);
  assert.equal(Object.keys(MODELOS_LIVRO).length, 23, "as 23 armadilhas das p. 317–318");
});

test("conferência com o livro (p. 317–318): alguns valores", () => {
  const v = (id) => MODELOS_LIVRO[id];
  assert.deepEqual([v("fosso-camuflado").cd, v("fosso-camuflado").dano, v("fosso-camuflado").sucesso], [20, "2d6[impacto]", "evita"]);
  assert.deepEqual([v("pendulo-de-teto").cd, v("pendulo-de-teto").encontrar, v("pendulo-de-teto").desarmar], [25, 25, 20]);
  assert.deepEqual([v("desabamento-do-teto").pericia, v("desabamento-do-teto").cd, v("desabamento-do-teto").sucesso, v("desabamento-do-teto").area], ["refl", 30, "metade", true]);
  assert.deepEqual([v("simbolo-da-morte").pericia, v("simbolo-da-morte").cd, v("simbolo-da-morte").danoSePassar], ["fort", 30, "10d6[trevas]"]);
  assert.equal(v("rede").condicao, "agarrado");
  assert.equal(v("simbolo-do-medo").condicao, "abalado");
});

test("token de jogador entra: para na borda, o mestre recebe um aviso só para ele, e nada vai aos jogadores", async () => {
  const M = mundo();
  const b = M.regiao({ modelo: "fosso-camuflado" });
  const styx = M.token("Styx");
  await M.entrar(b, styx);
  assert.equal(styx.parados, 1, "o token para na borda");
  assert.equal(M.emitidos.length, 1, "o cliente do jogador avisa o mestre pelo socket");
  assert.equal(M.chat.length, 0, "o jogador não cria mensagem");
  assert.equal(M.emitidos[0][0], `module.${MOD}`);
  await A.avisar(M.emitidos[0][1]);
  const av = M.chat.at(-1);
  assert.deepEqual(av.whisper, ["gm"], "sussurro só para o mestre");
  assert.match(av.texto, /Armadilha: Fosso Camuflado/);
  assert.match(av.texto, /Styx entrou na área/);
  assert.match(av.texto, /Reflexos CD 20 evita · dano 2d6\[impacto\]/);
  assert.match(av.texto, /Encontrar: Investigação CD 20 · Desarmar: Ladinagem CD 20 · ND 1\/4/);
  assert.match(av.content, /data-acao="disparar"/);
  assert.match(av.content, /data-acao="ignorar"/);
  assert.equal(M.herois[0].danos.length, 0);
  assert.deepEqual(M.problemas, []);
});

test("outro token entra antes do mestre decidir: entra no mesmo aviso; NPC não ativa", async () => {
  const M = mundo();
  const b = M.regiao({ modelo: "virote" });
  await M.entrar(b, M.token("Styx"), M.gm);
  await M.entrar(b, M.token("Orlo"), M.gm);
  await M.entrar(b, M.token("Styx"), M.gm);
  await M.entrar(b, M.token("Lobo Branco"), M.gm);
  assert.equal(avisos(M).length, 1);
  assert.match(avisos(M)[0].texto, /Styx , Orlo entraram/);
  assert.equal(avisos(M)[0].flags[MOD].aviso.tokens.length, 2);
  // Evento que a região não escuta (saída) não faz nada.
  await M.entrar(b, M.token("Silme"), M.gm, "tokenExit");
  assert.equal(avisos(M)[0].flags[MOD].aviso.tokens.length, 2);
});

test("Disparar: card com o dano rolado e o botão de cada herói; o mestre aplica; a região se desliga (uma vez) e Rearmar religa", async () => {
  const M = mundo({ modoDados: "max" });
  const b = M.regiao({ modelo: "fosso-camuflado" });
  await M.entrar(b, M.token("Styx"), M.gm);
  await M.entrar(b, M.token("Orlo"), M.gm);
  const av = avisos(M)[0];
  await A.disparar(av);
  const card = M.chat.find((m) => m.flags?.[MOD]?.pedido);
  assert.ok(card, "saiu o cartão de teste");
  assert.equal(card.whisper, undefined, "o cartão de teste é público");
  assert.equal(card.flags[MOD].pedido.dano.total, 12);
  assert.deepEqual(card.flags[MOD].pedido.linhas.map((l) => [l.nome, l.pericias[0], l.cd]), [["Styx", "refl", 20], ["Orlo", "refl", 20]]);
  assert.equal(b.disabled, true, "dispara uma vez: a região se desliga");
  assert.match(av.texto, /Disparada\. A região foi desligada/);
  assert.match(av.content, /data-acao="rearmar"/);
  // Dados no máximo: 20 + 5 = 25 passa (evita). Ninguém sofre nada antes do mestre.
  await jogadoresRolam(M);
  assert.match(card.texto, /passou/);
  await mestreAplica(M);
  assert.deepEqual(M.herois.map((h) => h.danos), [[], [], []], "passar evita o dano");
  await A.rearmar(av);
  assert.equal(b.disabled, false);
  assert.deepEqual(M.problemas, []);
});

test("falha: dano inteiro e condição só depois do clique do mestre", async () => {
  const M = mundo({ modoDados: "min" });
  const b = M.regiao({ modelo: "rede" });
  await M.entrar(b, M.token("Styx"), M.gm);
  await A.disparar(avisos(M)[0]);
  await jogadoresRolam(M);
  const card = M.chat.find((m) => m.flags?.[MOD]?.pedido);
  assert.match(card.texto, /falhou/);
  assert.match(card.texto, /fica agarrado/);
  assert.equal(M.herois[0].statuses.size, 0);
  await mestreAplica(M);
  assert.ok(M.herois[0].statuses.has("agarrado"));
  assert.deepEqual(M.problemas, []);
});

test("Ignorar mantém a armadilha armada e o próximo que entrar gera outro aviso", async () => {
  const M = mundo();
  const b = M.regiao({ modelo: "virote" });
  await M.entrar(b, M.token("Styx"), M.gm);
  await A.ignorar(avisos(M)[0]);
  assert.equal(b.disabled, false);
  assert.match(avisos(M)[0].texto, /continua armada/);
  await M.entrar(b, M.token("Orlo"), M.gm);
  assert.equal(avisos(M).length, 2);
});

test("área com Runa de Proteção: quem está na região testa; quem ativou sofre o dano inteiro, com a mesma rolagem", async () => {
  const M = mundo({ modoDados: "max" });
  const b = M.regiao({ modelo: "runa-de-protecao" }, [M.token("Styx"), M.token("Silme")]);
  await M.entrar(b, M.token("Styx"), M.gm);
  await A.disparar(avisos(M)[0]);
  const card = M.chat.find((m) => m.flags?.[MOD]?.pedido);
  assert.deepEqual(card.flags[MOD].pedido.linhas.map((l) => l.nome), ["Silme"]);
  const direto = M.chat.find((m) => m.flags?.[MOD]?.acoes?.length && !m.flags[MOD].pedido);
  assert.match(direto.texto, /Styx \(sem direito a teste\)/);
  assert.equal(direto.flags[MOD].acoes[0].total, card.flags[MOD].pedido.dano.total, "uma rolagem só para todos");
  await jogadoresRolam(M);
  await mestreAplica(M);
  assert.deepEqual([M.herois[0].danos, M.herois[2].danos], [[36], [18]], "Styx inteiro; Silme passou e sofre metade");
  assert.deepEqual(M.problemas, []);
});

test("sem teste (Arame Farpado): só o card de dano com o botão do mestre; repete sempre se não for de uma vez", async () => {
  const M = mundo({ modoDados: "min" });
  const b = M.regiao({ modelo: "arame-farpado", umaVez: false });
  await M.entrar(b, M.token("Orlo"), M.gm);
  await A.disparar(avisos(M)[0]);
  assert.equal(M.chat.filter((m) => m.flags?.[MOD]?.pedido).length, 0);
  await mestreAplica(M);
  assert.deepEqual(M.herois[1].danos, [3]);
  assert.equal(b.disabled, false);
  await M.entrar(b, M.token("Orlo"), M.gm);
  assert.equal(avisos(M).length, 2, "depois do disparo, entrar de novo gera outro aviso");
});

test("Símbolo da Morte: quem falha fica com o texto de –1 PV; quem passa ganha o botão de 10d6 de trevas", async () => {
  const M = mundo({ modoDados: "max" });
  const b = M.regiao({ modelo: "simbolo-da-morte" });
  await M.entrar(b, M.token("Styx"), M.gm);
  await A.disparar(avisos(M)[0]);
  await jogadoresRolam(M); // 20 + 5 = 25 < 30: falha
  let card = M.chat.find((m) => m.flags?.[MOD]?.pedido);
  assert.match(card.texto, /reduzido a –1 PV/);
  const M2 = mundo({ modoDados: "max" });
  const b2 = M2.regiao({ modelo: "simbolo-da-morte" });
  const forte = M2.herois[0];
  forte.rollPericia = async () => new Roll("1d20 + 15").evaluate();
  await M2.entrar(b2, M2.token("Styx"), M2.gm);
  await A.disparar(avisos(M2)[0]);
  await jogadoresRolam(M2);
  await espera(); await espera();
  const quemPassou = M2.chat.find((m) => /quem passou/.test(m.texto));
  assert.ok(quemPassou, "card de dano para quem passou");
  await mestreAplica(M2);
  assert.deepEqual(forte.danos, [60]);
  assert.deepEqual([...M.problemas, ...M2.problemas], []);
});

test("Símbolo da Dor: efeito de –5 em perícias até o fim da cena, válido no sistema", async () => {
  const M = mundo({ modoDados: "min" });
  const b = M.regiao({ modelo: "simbolo-da-dor" });
  await M.entrar(b, M.token("Styx"), M.gm);
  await A.disparar(avisos(M)[0]);
  await jogadoresRolam(M);
  await mestreAplica(M);
  assert.equal(M.herois[0].efeitos[0].name, "Símbolo da Dor");
  assert.deepEqual(M.problemas, []);
});

test("personalizada: usa os campos do formulário; o nome do formulário troca o do modelo; pausa o jogo", async () => {
  const M = mundo({ modoDados: "max" });
  const b = M.regiao({ modelo: "", nome: "Teto de estalactites", pericia: "refl", cd: 18, dano: "3d6[perfuracao]", sucesso: "metade", pausar: true });
  const c = configDe(b.system);
  assert.deepEqual([c.nome, c.cd, c.dano, c.sucesso, c.area, c.umaVez], ["Teto de estalactites", 18, "3d6[perfuracao]", "metade", false, true]);
  assert.equal(configDe({ ...M.regiao({ modelo: "virote", nome: "Besta escondida" }).system }).nome, "Besta escondida");
  await M.entrar(b, M.token("Styx"), M.gm);
  assert.equal(M.pausado, true);
  await A.disparar(avisos(M)[0]);
  assert.equal(M.chat.find((m) => m.flags?.[MOD]?.pedido).flags[MOD].pedido.dano.total, 18);
});

test("outros módulos acrescentam modelos (aparecem na lista do formulário)", () => {
  mundo();
  registrarModelos({ "teste-extra": { nome: "Armadilha Extra", pericia: "fort", cd: 15, dano: "1d6[frio]", sucesso: "metade" } });
  const Tipo = CONFIG.RegionBehavior.dataModels["giria-t20-armadilhas.armadilha"];
  const escolhas = Tipo.defineSchema().modelo.choices();
  assert.match(escolhas["teste-extra"], /Armadilha Extra/);
  assert.match(escolhas["fosso-camuflado"], /Fosso Camuflado \(ND 1\/4\)/);
  assert.ok(modelos()["teste-extra"]);
  const cond = Tipo.defineSchema().condicao.choices();
  assert.ok(cond.abalado && cond[""] === "Nenhuma");
});
