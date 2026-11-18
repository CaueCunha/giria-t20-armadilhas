// Comportamento de região "Armadilha" (Foundry v13/v14, camada de Regiões).
//
// Como funciona na mesa:
// 1. O mestre desenha uma região no mapa e acrescenta o comportamento "Armadilha (Tormenta20)".
//    Escolhe um modelo (Livro Básico ou de outro módulo) ou preenche os campos à mão.
// 2. Um token de jogador entra na região: o movimento para na borda (opcional), o jogo pausa (opcional)
//    e só o mestre recebe um aviso no chat, com as CDs de encontrar/desarmar e os botões Disparar e Ignorar.
//    Outros tokens que entrarem antes de o mestre decidir entram no mesmo aviso.
// 3. Disparar manda aos jogadores o cartão de teste (scripts/testes.mjs): dano rolado uma vez e o botão
//    de rolar a resistência de cada herói. O mestre aplica dano, metade, condição ou efeito pelos botões.
//    Nada é aplicado sozinho.
// 4. "Dispara uma vez" desliga o comportamento depois do disparo (o aviso oferece Rearmar).
//
// O evento da região chega no cliente de quem moveu o token. Esse cliente avisa o mestre ativo pelo socket
// do módulo; o mestre cria o aviso. Nenhuma informação da armadilha aparece para os jogadores antes do disparo.
import { MODULO, TIPO, souMestreAtivo } from "./constantes.mjs";
import { pedir, acoes, rolarDano, nomePericia } from "./testes.mjs";
import { modelo, escolhasModelos } from "./modelos.mjs";

const SOCKET = `module.${MODULO}`;
const PERICIAS = { refl: "Reflexos", fort: "Fortitude", vont: "Vontade", "": "Sem teste (só dano)" };
const SUCESSOS = { evita: "Passar evita", metade: "Passar reduz à metade", "": "Passar não muda o dano" };
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const nomeCondicao = (id) => game.i18n.localize(CONFIG.statusEffects?.find((s) => s.id === id)?.name ?? id);
const pendentes = new Map(); // uuid do comportamento -> id do aviso ainda não disparado
let fila = Promise.resolve();

// ---------------- Configuração efetiva ----------------
// Modelo escolhido = valores do modelo; "Personalizada" = campos do formulário. O nome do formulário sempre vence.
export function configDe(sys) {
  const m = sys.modelo ? modelo(sys.modelo) : null;
  const base = m ? { ...m } : {
    nome: "Armadilha", texto: sys.texto, pericia: sys.pericia, cd: sys.cd, dano: sys.dano, sucesso: sys.sucesso,
    condicao: sys.condicao, area: sys.area, encontrar: sys.encontrar, desarmar: sys.desarmar,
  };
  if (sys.nome) base.nome = sys.nome;
  return { pericia: "", sucesso: "", ...base, umaVez: sys.umaVez !== false, soJogadores: sys.soJogadores !== false, parar: sys.parar !== false, pausar: !!sys.pausar };
}

export function resumoRegra(c) {
  const partes = [];
  if (c.pericia) partes.push(`${PERICIAS[c.pericia] ?? nomePericia(c.pericia)} CD ${c.cd}${c.sucesso === "evita" ? " evita" : c.sucesso === "metade" ? " reduz à metade" : ""}`);
  if (c.dano) partes.push(`dano ${c.dano}`);
  if (c.danoSePassar) partes.push(`quem passa sofre ${c.danoSePassar}`);
  if (c.condicao) partes.push(`falha: ${nomeCondicao(c.condicao)}`);
  else if (c.efeito) partes.push(`falha: ${c.efeito.name}`);
  if (c.area) partes.push("afeta todos na área");
  return partes.join(" · ");
}

// ---------------- Tipo de comportamento ----------------
export function criarTipo() {
  const F = foundry.data.fields;
  const E = CONST.REGION_EVENTS ?? {};
  const eventos = [E.TOKEN_MOVE_IN, E.TOKEN_ENTER].filter(Boolean);
  return class ArmadilhaRegiao extends foundry.data.regionBehaviors.RegionBehaviorType {
    static defineSchema() {
      return {
        events: this._createEventsField({ events: eventos, initial: eventos.slice(0, 1) }),
        modelo: new F.StringField({ required: true, blank: true, initial: "", label: "Modelo",
          hint: "Escolha uma armadilha pronta. Em \"Personalizada\", valem os campos abaixo.",
          choices: () => ({ "": "Personalizada (campos abaixo)", ...escolhasModelos() }) }),
        nome: new F.StringField({ required: true, blank: true, initial: "", label: "Nome no card", hint: "Opcional: troca o nome mostrado (vale também com modelo)." }),
        texto: new F.StringField({ required: true, blank: true, initial: "", label: "Descrição para os jogadores" }),
        pericia: new F.StringField({ required: true, blank: true, initial: "refl", choices: PERICIAS, label: "Teste de resistência" }),
        cd: new F.NumberField({ required: true, integer: true, min: 0, initial: 20, label: "CD" }),
        dano: new F.StringField({ required: true, blank: true, initial: "", label: "Dano", hint: "Fórmula com o tipo, como 2d6[impacto]. Vazio = sem dano." }),
        sucesso: new F.StringField({ required: true, blank: true, initial: "evita", choices: SUCESSOS, label: "Quem passa" }),
        condicao: new F.StringField({ required: true, blank: true, initial: "", label: "Condição em quem falha",
          choices: () => ({ "": "Nenhuma", ...Object.fromEntries((CONFIG.statusEffects ?? []).map((s) => [s.id, game.i18n.localize(s.name)])) }) }),
        area: new F.BooleanField({ initial: false, label: "Afeta todos na área", hint: "Desligado: só quem entrou faz o teste." }),
        encontrar: new F.NumberField({ required: false, nullable: true, integer: true, min: 0, initial: null, label: "CD de Investigação para encontrar" }),
        desarmar: new F.NumberField({ required: false, nullable: true, integer: true, min: 0, initial: null, label: "CD de Ladinagem para desarmar" }),
        umaVez: new F.BooleanField({ initial: true, label: "Dispara uma vez", hint: "Depois do disparo, o comportamento se desliga (o aviso tem o botão Rearmar)." }),
        soJogadores: new F.BooleanField({ initial: true, label: "Só tokens de jogadores ativam" }),
        parar: new F.BooleanField({ initial: true, label: "Parar o token na borda" }),
        pausar: new F.BooleanField({ initial: false, label: "Pausar o jogo ao ativar" }),
      };
    }

    async _handleRegionEvent(event) {
      if (this.events && !this.events.has(event.name)) return;
      if (!event.user?.isSelf) return; // só o cliente de quem moveu o token age
      const token = event.data?.token;
      if (!token?.actor || token.actor.type === "hazard") return;
      if (this.soJogadores && !token.actor.hasPlayerOwner) return;
      if (this.parar) { try { await token.stopMovement?.(); } catch (e) { console.warn(`${MODULO} | parar token`, e); } }
      const dados = { tipo: "armadilha", behavior: this.parent.uuid, token: token.uuid };
      if (game.user.isGM) return receberGatilho(dados);
      if (!game.users.activeGM) return;
      game.socket.emit(SOCKET, dados);
    }
  };
}

// ---------------- Aviso ao mestre ----------------
export function receberGatilho(dados) {
  fila = fila.then(() => avisar(dados)).catch((e) => console.error(`${MODULO} | armadilha`, e));
  return fila;
}

async function avisar({ behavior, token }) {
  const b = fromUuidSync(behavior);
  const t = fromUuidSync(token);
  if (!b || !t || b.disabled) return;
  const cfg = configDe(b.system);
  if (cfg.pausar && !game.paused) game.togglePause(true, { broadcast: true });
  const aberto = game.messages.get(pendentes.get(behavior));
  const av = aberto?.flags?.[MODULO]?.aviso;
  if (av && !av.disparos && !av.ignorado) {
    if (av.tokens.some((x) => x.uuid === token)) return;
    const novo = { ...av, tokens: [...av.tokens, { uuid: token, nome: t.name }] };
    return aberto.update({ content: renderAviso(novo), [`flags.${MODULO}.aviso`]: novo });
  }
  const aviso = { behavior, nome: cfg.nome, cfg, tokens: [{ uuid: token, nome: t.name }], disparos: 0, ignorado: false, desligada: false };
  const msg = await ChatMessage.create({
    speaker: { alias: "Armadilha" },
    content: renderAviso(aviso),
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    flags: { [MODULO]: { aviso } },
  });
  pendentes.set(behavior, msg.id);
  return msg;
}

const botao = (acao, rotulo, icone) => `<button type="button" class="gta-armadilha" data-acao="${acao}" style="width:auto;line-height:1.4;padding:0 6px;margin:2px 0"><i class="fas ${icone}"></i> ${esc(rotulo)}</button>`;

export function renderAviso(a) {
  const c = a.cfg;
  const nomes = a.tokens.map((x) => `<b>${esc(x.nome)}</b>`).join(", ");
  const detectar = [c.encontrar ? `Encontrar: Investigação CD ${c.encontrar}` : "", c.desarmar ? `Desarmar: Ladinagem CD ${c.desarmar}` : "", c.nd ? `ND ${c.nd}` : "", c.magica ? "mágica (Dissipar Magia anula)" : ""].filter(Boolean).join(" · ");
  let botoes;
  if (a.ignorado) botoes = `<p><i>Ignorada: a armadilha continua armada.</i></p>`;
  else if (!a.disparos) botoes = `<p>${botao("disparar", "Disparar", "fa-bolt")} ${botao("ignorar", "Ignorar", "fa-xmark")}</p>`;
  else botoes = `<p><i>Disparada${a.disparos > 1 ? ` ${a.disparos} vezes` : ""}.${a.desligada ? " A região foi desligada." : ""}</i></p><p>${botao("disparar", "Disparar de novo", "fa-bolt")}${a.desligada ? ` ${botao("rearmar", "Rearmar", "fa-rotate-left")}` : ""}</p>`;
  return `<div class="gta-aviso tormenta20 item-card"><h3>⚠ Armadilha: ${esc(c.nome)}</h3>`
    + `<p>${nomes} ${a.tokens.length > 1 ? "entraram" : "entrou"} na área.</p>`
    + `<p>${esc(resumoRegra(c))}</p>`
    + (detectar ? `<p style="font-size:0.9em">${esc(detectar)}</p>` : "")
    + (c.texto ? `<p style="font-size:0.9em;opacity:0.85">${c.texto}</p>` : "")
    + (c.fonte ? `<p style="font-size:0.8em;opacity:0.7">${esc(c.fonte)}</p>` : "")
    + botoes + `</div>`;
}

// ---------------- Disparo ----------------
function alvosDe(a, b) {
  const ativadores = a.tokens.map((x) => fromUuidSync(x.uuid)).filter((t) => t?.actor);
  const lista = [...ativadores];
  if (a.cfg.area) for (const t of b?.parent?.tokens ?? []) if (t?.actor && !lista.some((x) => x.uuid === t.uuid)) lista.push(t);
  return { ativadores, alvos: lista.filter((t) => t.actor.type !== "hazard") };
}

export async function disparar(msg) {
  if (!game.user.isGM) return ui.notifications.warn("Só o mestre dispara a armadilha.");
  const a = foundry.utils.deepClone(msg.flags?.[MODULO]?.aviso);
  if (!a) return;
  const b = fromUuidSync(a.behavior);
  const c = b ? configDe(b.system) : a.cfg; // a configuração atual da região, se ela ainda existir
  a.cfg = c;
  const { ativadores, alvos } = alvosDe(a, b);
  if (!alvos.length) return ui.notifications.warn("Nenhum token afetado está mais na cena.");
  const roll = c.dano ? await rolarDano(c.dano, c.nome) : null;
  const semTeste = c.ativadorSemTeste ? alvos.filter((t) => ativadores.includes(t)) : [];
  const comTeste = c.pericia ? alvos.filter((t) => !semTeste.includes(t)) : [];
  const diretos = c.pericia ? semTeste : alvos;
  const falha = c.condicao || c.efeito || c.falhaTexto ? { status: c.condicao || undefined, efeito: c.efeito || undefined, texto: c.falhaTexto || "" } : null;

  if (comTeste.length) {
    const resultado = pedir({
      titulo: c.nome, texto: c.texto ?? "",
      testes: comTeste.map((t) => ({ ator: t, nome: t.name, pericia: c.pericia, cd: c.cd })),
      dano: roll, sucesso: c.sucesso || null, sucessoTexto: c.sucessoTexto ?? "", falha, esperar: !!c.danoSePassar,
    });
    if (c.danoSePassar) resultado.then((res) => danoDosQuePassaram(c, res)).catch((e) => console.error(`${MODULO} | armadilha`, e));
    else await resultado;
  }
  if (diretos.length) await cardDireto(c, diretos, roll, !c.pericia);

  a.disparos += 1;
  if (c.umaVez && b && !b.disabled) { await b.update({ disabled: true }); a.desligada = true; }
  pendentes.delete(a.behavior);
  await msg.update({ content: renderAviso(a), [`flags.${MODULO}.aviso`]: a });
}

// Sem teste (Arame Farpado) ou quem ativou a Runa de Proteção: o dano vale inteiro, o mestre aplica pelos botões.
async function cardDireto(c, tokens, roll, comCondicao) {
  const A = acoes();
  const linhas = tokens.map((t) => {
    const bts = [roll ? A.dano(t, roll, 1) : "", comCondicao && c.condicao ? A.status(t, c.condicao) : "", comCondicao && c.efeito ? A.efeito(t, c.efeito, `Aplicar ${c.efeito.name}`) : ""].filter(Boolean).join(" ");
    return `<li style="margin:4px 0"><b>${esc(t.name)}</b>${comCondicao ? "" : " (sem direito a teste)"} ${bts}</li>`;
  });
  const rolagem = roll ? `<div class="roll roll--dano" data-roll-title="${esc(c.nome)}">${await roll.render()}</div>` : "";
  return A.enviar({ speaker: { alias: c.nome }, content: `<div class="gta-pedido tormenta20 item-card"><h3>${esc(c.nome)}</h3>${c.texto ? `<p>${c.texto}</p>` : ""}${rolagem}<ul style="list-style:none;padding-left:0">${linhas.join("")}</ul></div>` });
}

// Símbolo da Morte: quem passa sofre o dano menor; quem falha fica com o texto de falha no cartão do teste.
async function danoDosQuePassaram(c, res) {
  const passaram = res.filter((r) => r.passou && r.ator);
  if (!passaram.length) return;
  const roll = await rolarDano(c.danoSePassar, c.nome);
  const A = acoes();
  const linhas = passaram.map((r) => `<li style="margin:4px 0"><b>${esc(r.nome)}</b> ${A.dano(r.ator, roll, 1)}</li>`).join("");
  return A.enviar({ speaker: { alias: c.nome }, content: `<div class="gta-pedido tormenta20 item-card"><h3>${esc(c.nome)}: quem passou</h3><div class="roll roll--dano" data-roll-title="${esc(c.nome)}">${await roll.render()}</div><ul style="list-style:none;padding-left:0">${linhas}</ul></div>` });
}

async function ignorar(msg) {
  const a = foundry.utils.deepClone(msg.flags[MODULO].aviso);
  a.ignorado = true;
  pendentes.delete(a.behavior);
  await msg.update({ content: renderAviso(a), [`flags.${MODULO}.aviso`]: a });
}

async function rearmar(msg) {
  const a = foundry.utils.deepClone(msg.flags[MODULO].aviso);
  const b = fromUuidSync(a.behavior);
  if (!b) return ui.notifications.warn("A região dessa armadilha não existe mais.");
  await b.update({ disabled: false });
  a.desligada = false;
  await msg.update({ content: renderAviso(a), [`flags.${MODULO}.aviso`]: a });
  ui.notifications.info(`${a.cfg.nome}: armada de novo.`);
}

const ACOES = { disparar, ignorar, rearmar };
export async function clicarAviso(msg, acao) {
  if (!game.user.isGM) return;
  return ACOES[acao]?.(msg);
}

function ligarBotoes(msg, html) {
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  if (!raiz || !msg.flags?.[MODULO]?.aviso) return;
  raiz.querySelectorAll(".gta-armadilha").forEach((b) => {
    if (!game.user.isGM) return b.remove();
    b.addEventListener("click", (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      b.disabled = true;
      clicarAviso(msg, b.dataset.acao);
    });
  });
}

export function registrarTipo() {
  CONFIG.RegionBehavior.dataModels[TIPO] = criarTipo();
  CONFIG.RegionBehavior.typeLabels[TIPO] = "Armadilha (Tormenta20)";
  CONFIG.RegionBehavior.typeIcons[TIPO] = "fa-solid fa-skull-crossbones";
}

export function ligarArmadilhas() {
  Hooks.on("renderChatMessageHTML", (msg, html) => ligarBotoes(msg, html));
  game.socket?.on(SOCKET, (d) => { if (d?.tipo === "armadilha" && souMestreAtivo()) receberGatilho(d); });
}

export const _teste = { avisar, disparar, ignorar, rearmar, pendentes };
