// Um Foundry de mentira, só com o que o módulo usa (regiões, chat, rolagens, fichas), que confere cada chamada
// com as regras do sistema Tormenta20 (referencia-sistema.json). Não substitui abrir o Foundry de verdade.
import { REF, validarEfeito, formulaValida, foundryGet } from "./ref.mjs";

const CONDICOES = new Set(REF.condicoes);
const PERICIAS = new Set(REF.pericias);
const DANO = new Set([...REF.tiposDano, ...REF.tiposCura]);
const deepClone = (o) => (o === undefined ? o : structuredClone(o));
const ehObj = (o) => o && typeof o === "object" && !Array.isArray(o);
function setProp(o, k, v) { const ks = k.split("."); let c = o; for (const x of ks.slice(0, -1)) c = c[x] ??= {}; c[ks.at(-1)] = v; }
function mergeObject(a, b) { for (const [k, v] of Object.entries(b ?? {})) { if (k.includes(".")) setProp(a, k, v); else if (ehObj(v) && ehObj(a[k])) mergeObject(a[k], v); else a[k] = v; } return a; }
function flattenObject(o, p = "") { const r = {}; for (const [k, v] of Object.entries(o)) { if (ehObj(v) && Object.keys(v).length) Object.assign(r, flattenObject(v, `${p}${k}.`)); else r[`${p}${k}`] = v; } return r; }

export function criarMundo({ modoDados = "max", herois = 3 } = {}) {
  const M = { chat: [], avisos: [], problemas: [], emitidos: [], pausado: false, uuids: new Map() };
  const problema = (t) => M.problemas.push(t);
  let n = 0;
  const reg = (doc) => { M.uuids.set(doc.uuid, doc); return doc; };

  class Roll {
    constructor(formula, data = {}, options = {}) {
      this.formula = String(formula); this.options = { ...options }; this.dice = []; this._evaluated = false;
      if (!formulaValida(this.formula.replace(/\s+/g, ""))) problema(`fórmula "${this.formula}" não rola`);
      for (const [, t] of this.formula.matchAll(/\[([^\]]+)\]/g)) if (!DANO.has(t)) problema(`tipo de dano "${t}" não existe (${this.formula})`);
    }
    async evaluate() {
      let s = this.formula.replace(/\[[^\]]*\]/g, "");
      s = s.replace(/(\d*)d(\d+)/g, (_, q, f) => {
        const results = Array.from({ length: +q || 1 }, () => ({ result: modoDados === "min" ? 1 : +f, active: true }));
        this.dice.push({ faces: +f, results });
        return `(${results.reduce((t, r) => t + r.result, 0)})`;
      });
      this.total = Function(`return (${s})`)();
      if (Number.isNaN(this.total)) problema(`fórmula "${this.formula}" deu NaN`);
      this._evaluated = true;
      return this;
    }
    async render() { return `<div class="dice-roll">${this.total}</div>`; }
    toJSON() { return { formula: this.formula, total: this.total, options: this.options, dice: this.dice }; }
    static fromData(d) { const r = new Roll(d.formula, {}, d.options); Object.assign(r, { total: d.total, dice: d.dice, _evaluated: true }); return r; }
  }

  function documento(fonte, tipo, uuid) {
    const d = { flags: {}, ...deepClone(fonte) };
    d.id ??= `id${n++}`;
    d.documentName = tipo;
    d.uuid = uuid ?? `${tipo}.${d.id}`;
    d.update = async (u) => { for (const [k, v] of Object.entries(flattenObject(u))) setProp(d, k, v); return d; };
    return reg(d);
  }

  function ator(nome, { jogador = true, tipo = "character", bonus = 5 } = {}) {
    const a = documento({ name: nome, type: tipo, system: { pericias: Object.fromEntries(REF.pericias.map((p) => [p, { value: bonus }])) } }, "Actor");
    Object.assign(a, { hasPlayerOwner: jogador, isOwner: true, danos: [], statuses: new Set(), efeitos: [] });
    a.rollPericia = async (id) => { if (!PERICIAS.has(id)) problema(`rollPericia("${id}")`); const r = await new Roll(`1d20 + ${bonus}`).evaluate(); return r; };
    a.rollAtributo = async () => new Roll("1d20").evaluate();
    a.applyDamageV2 = async (roll, mult = 1) => { a.danos.push(Math.floor(roll.total * mult)); };
    a.toggleStatusEffect = async (id) => { if (!CONDICOES.has(id)) problema(`condição "${id}" não existe`); a.statuses.add(id); };
    a.createEmbeddedDocuments = async (tipoDoc, lista) => { for (const e of lista) { for (const p of validarEfeito(e, { tipoAtor: "efeito-direto" })) problema(p); a.efeitos.push(e); } return lista; };
    return a;
  }
  const atores = [];
  for (const nome of ["Styx", "Orlo", "Silme", "Nyxen", "Abathos"].slice(0, herois)) atores.push(ator(nome));
  atores.push(ator("Lobo Branco", { jogador: false, tipo: "npc" }));
  M.herois = atores.filter((a) => a.hasPlayerOwner);
  M.npc = atores.at(-1);

  const tokenDe = (a) => {
    const t = documento({ name: a.name }, "Token", `Scene.cena.Token.t${a.id}`);
    t.actor = a; t.parados = 0;
    t.stopMovement = async () => { t.parados++; };
    return t;
  };
  M.tokens = atores.map(tokenDe);
  M.token = (nome) => M.tokens.find((t) => t.name === nome);

  // ---------- Usuários, chat, socket ----------
  const gm = { id: "gm", isGM: true, active: true, get isSelf() { return game.user === gm; } };
  const jogador = { id: "jogador", isGM: false, active: true, get isSelf() { return game.user === jogador; } };
  M.gm = gm; M.jogador = jogador;
  const mensagens = [];
  const ChatMessage = {
    create: async (dados) => {
      const m = documento({ ...dados, flags: deepClone(dados.flags ?? {}) }, "ChatMessage");
      if (/undefined|NaN|\[object/.test(m.content ?? "")) problema(`mensagem com valor vazio: ${m.content}`);
      Object.defineProperty(m, "texto", { get: () => (m.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") });
      const upd = m.update;
      m.update = async (u) => { await upd(u); if (/undefined|NaN|\[object/.test(m.content ?? "")) problema(`mensagem com valor vazio: ${m.content}`); return m; };
      mensagens.push(m); M.chat.push(m);
      return m;
    },
    getWhisperRecipients: (q) => (q === "GM" ? [gm] : []),
  };
  mensagens.get = (id) => mensagens.find((m) => m.id === id);

  const handlers = [];
  globalThis.Hooks = { on: (h, f) => handlers.push([h, f]), once: (h, f) => handlers.push([h, f]), callAll() {} };
  globalThis.Roll = Roll;
  globalThis.ChatMessage = ChatMessage;
  globalThis.fromUuidSync = (u) => M.uuids.get(u) ?? null;
  globalThis.ui = { notifications: { warn: (t) => M.avisos.push(t), info: (t) => M.avisos.push(t), error: (t) => M.avisos.push(t) } };
  globalThis.CONST = { REGION_EVENTS: { TOKEN_ENTER: "tokenEnter", TOKEN_MOVE_IN: "tokenMoveIn", TOKEN_EXIT: "tokenExit" } };
  globalThis.CONFIG = {
    statusEffects: REF.condicoes.map((id) => ({ id, name: `T20.cond.${id}` })),
    T20: { pericias: Object.fromEntries(REF.pericias.map((p) => [p, { label: p }])) },
    RegionBehavior: { dataModels: {}, typeLabels: {}, typeIcons: {} },
    sounds: { dice: "" },
  };
  const campo = (tipo) => class { constructor(o = {}) { Object.assign(this, o); this.tipo = tipo; } };
  class RegionBehaviorType {
    constructor(dados = {}, parent) {
      const s = this.constructor.defineSchema();
      for (const [k, f] of Object.entries(s)) this[k] = k in dados ? dados[k] : deepClone(f.initial);
      this.events = new Set(this.events);
      this.parent = parent;
    }
    static _createEventsField({ events, initial }) { return { events, initial }; }
  }
  globalThis.foundry = {
    utils: { deepClone, mergeObject, flattenObject },
    data: {
      fields: { StringField: campo("string"), NumberField: campo("number"), BooleanField: campo("boolean") },
      regionBehaviors: { RegionBehaviorType },
    },
  };
  globalThis.game = {
    user: gm,
    users: Object.assign([gm, jogador], { get activeGM() { return gm; } }),
    messages: mensagens,
    actors: atores,
    i18n: { localize: (k) => k },
    get paused() { return M.pausado; },
    togglePause: (p) => { M.pausado = p; },
    socket: { emit: (canal, d) => M.emitidos.push([canal, d]), on: () => {} },
    modules: new Map([["giria-t20-armadilhas", {}]]),
  };

  // Região com um comportamento do tipo do módulo.
  M.regiao = (dados = {}, tokensDentro = []) => {
    const Tipo = CONFIG.RegionBehavior.dataModels["giria-t20-armadilhas.armadilha"];
    const regiao = documento({ name: "Região" }, "Region", `Scene.cena.Region.r${n++}`);
    regiao.tokens = new Set(tokensDentro);
    const b = documento({ disabled: false }, "RegionBehavior", `${regiao.uuid}.RegionBehavior.b${n++}`);
    b.system = new Tipo(dados, b);
    b.parent = regiao;
    return b;
  };
  // Um token entra: o evento chega no cliente de quem moveu.
  M.entrar = async (b, token, usuario = jogador, nome = "tokenMoveIn") => {
    game.user = usuario;
    await b.system._handleRegionEvent({ name: nome, data: { token }, region: b.parent, behavior: b, user: usuario });
    game.user = gm;
  };
  return M;
}
