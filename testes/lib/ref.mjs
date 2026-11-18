// Validações que comparam fichas, itens, efeitos e rolagens com o sistema Tormenta20 (referencia-sistema.json, extraída do código do sistema).
// Cada função devolve uma lista de problemas em português ([] = tudo certo).
import fs from "node:fs";

export const REF = JSON.parse(fs.readFileSync(new URL("../referencia-sistema.json", import.meta.url)));
export const MOD = new URL("../../", import.meta.url).pathname;

const S = (a) => new Set(a);
// ofi1…ofi9 e _pc1…_pc9 são perícias personalizadas da ficha; ofi0/_pc0 vêm do modelo de ficha antigo e a migração do sistema remove sozinha.
const PERICIAS = S([...REF.pericias, ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [`ofi${n}`, `_pc${n}`])]), DANO = S(REF.tiposDano), CURA = S(REF.tiposCura), RESIST = S(REF.resistencias), CONDICOES = S(REF.condicoes);
const ARQ_SISTEMA = S(REF.arquivosSistema);
// Ícones do Foundry core confirmados (testes/icones-core.json, ver extrair-icones-core.sh). Caminho fora da lista aparece sem imagem na mesa.
export const ICONES_CORE = S([...JSON.parse(fs.readFileSync(new URL("../icones-core.json", import.meta.url))).icones, ...REF.iconesCoreVistos]);
export const CONDICAO_POR_NOME = Object.fromEntries(REF.condicoes.map((c) => [c, c]));

// Troca ids por * para comparar com o que o sistema aceita: system.pericias.luta.bonus -> system.pericias.*.bonus.
const normalizar = (k) => k
  .replace(/^system\.pericias\.[a-z]+\./, "system.pericias.*.")
  .replace(/^system\.tracos\.resistencias\.[a-z]+\./, "system.tracos.resistencias.*.")
  .replace(/^system\.atributos\.[a-z]{3}\./, "system.atributos.*.")
  .replace(/^system\.attributes\.movement\.[a-z]+\./, "system.attributes.movement.*.")
  .replace(/^system\.modificadores\.pericias\.atr\.[a-z]{3}$/, "system.modificadores.pericias.atr.*")
  .replace(/^system\.modificadores\.atributos\.[a-z]+$/, "system.modificadores.atributos.*");
const PASSIVAS = S([...REF.chavesCuringa, ...REF.chavesPassivasSistema, ...REF.caminhosNpc, "danoContinuo"].map(normalizar));
const SO_PERSONAGEM = REF.soPersonagem;
const DE_USO_FIXAS = S(["ataque", "dano", "danoCritico", "danoMultiplicavel", "passos", "ignoraRD", "roll", "tipoDano", "atributoDano", "atributoAtq", "pericia",
  "criticoM", "criticoX", "alcance", "alvo", "area", "execucao", "duracao", "resistencia", "atributoCD", "cd", "CD", "custo", "condicao", "efeito", "danoContinuo", "cura"]);
const TIPOS_CHANGE = S(["add", "multiply", "override", "upgrade", "downgrade", "custom"]);
const EXPIRACOES = S([null, undefined, "turnStart", "turnEnd", "roundStart", "roundEnd", "sceneEnd", "combatEnd", "combatStart", "sustainEnd"]);

function idsValidos(k) {
  const p = [];
  let m;
  if ((m = k.match(/^system\.pericias\.([a-z]+)\./)) && m[1] !== "*" && !PERICIAS.has(m[1])) p.push(`perícia "${m[1]}" não existe no sistema`);
  if ((m = k.match(/^system\.tracos\.resistencias\.([a-z]+)\./)) && !RESIST.has(m[1])) p.push(`tipo de resistência "${m[1]}" não existe no sistema`);
  return p;
}

export function chavePassivaValida(k, tipoAtor) {
  const p = idsValidos(k);
  if (!PASSIVAS.has(normalizar(k)) && !SO_PERSONAGEM.some((c) => k.startsWith(c))) p.push(`chave de efeito "${k}" não existe no sistema`);
  if (tipoAtor === "npc" && SO_PERSONAGEM.some((c) => k.startsWith(c))) p.push(`"${k}" só existe em ficha de personagem; numa ameaça não faz nada`);
  return p;
}

function chaveDeUsoValida(k) {
  if (DE_USO_FIXAS.has(k) || REF.chavesDeUsoSistema.includes(k)) return [];
  if (/^dano:[a-z]+$/.test(k)) return DANO.has(k.slice(5)) ? [] : [`tipo de dano "${k.slice(5)}" não existe`];
  if (/^@.+#dano$/.test(k) || /^efeito\.[a-zA-Z]+$/.test(k)) return [];
  if (k.startsWith("+")) return chavePassivaValida(k.slice(1));
  if (k.startsWith("system.")) return chavePassivaValida(k);
  return [`chave de efeito de uso "${k}" não existe no sistema`];
}

// Uma descrição exibida pelo sistema precisa ser HTML com um único elemento raiz (a janela de ataque faz parseHTML(desc).prepend).
export function htmlUmaRaiz(h) {
  const t = (h ?? "").trim();
  if (!t) return true;
  if (!t.startsWith("<")) return false;
  let prof = 0, raizes = 0;
  for (const m of t.matchAll(/<\/?([a-zA-Z0-9]+)[^>]*?(\/?)>/g)) {
    const vazio = m[2] === "/" || /^(br|hr|img|input)$/i.test(m[1]);
    if (m[0].startsWith("</")) prof--;
    else { if (prof === 0) raizes++; if (!vazio) prof++; }
  }
  return raizes === 1 && prof === 0;
}

export function validarEfeito(e, { tipoAtor = null, onde = "" } = {}) {
  const p = [];
  const ch = e.system?.changes;
  if (e.changes) p.push("as mudanças estão em \"changes\"; no Foundry 14 vão em \"system.changes\"");
  if (!e.name) p.push("efeito sem nome");
  if (ch && !Array.isArray(ch)) p.push("system.changes não é lista");
  const deUso = !!e.system?.onuse;
  for (const c of ch ?? []) {
    if (!TIPOS_CHANGE.has(c.type)) p.push(`tipo de mudança "${c.type}" inválido em "${c.key}"`);
    if (!["string", "number"].includes(typeof c.value)) p.push(`valor de "${c.key}" precisa ser texto ou número (é ${typeof c.value})`);
    p.push(...(deUso ? chaveDeUsoValida(c.key) : chavePassivaValida(c.key, e.transfer === false && tipoAtor !== "efeito-direto" ? "alvo" : tipoAtor)));
  }
  for (const s of e.statuses ?? []) if (!CONDICOES.has(s)) p.push(`condição "${s}" não existe no sistema`);
  if (!EXPIRACOES.has(e.duration?.expiry)) p.push(`expiração "${e.duration?.expiry}" inválida`);
  if (deUso && !htmlUmaRaiz(e.description)) p.push("descrição de efeito de uso precisa ser HTML com um único elemento (ex.: <p>…</p>), senão a janela de ataque quebra");
  if (e.img) p.push(...imagemExiste(e.img));
  return p.map((x) => `${onde}efeito "${e.name}": ${x}`);
}

// Fórmula de dados que o Foundry consegue rolar: números, dados (com modificadores como x, r, kh, kl, cs), @atributos, operadores e [tipo].
const DADO = /(\d+|\([^()]*\))?d(\d+)((?:xo?|r|kh|kl|dh|dl|cs|cf|min|max)[<>=]*\d*)*/g;
export function formulaValida(f) {
  if (f === "" || f === undefined || f === null) return true;
  const s = String(f).replace(/\[[a-zà-ú]+\]/gi, "").replace(/@[a-zA-Z.]+/g, "1").replace(DADO, "1").replace(/floor|ceil|max|min|round/g, "");
  if (!/^[\d\s+\-*/().,]*$/.test(s)) return false;
  try { return Number.isFinite(Function(`return (${s.replace(/,/g, "+") || 0})`)()); } catch { return false; }
}

// Menor e maior resultado de uma fórmula simples (dados viram 1 ou o número de faces).
export function faixaFormula(f) {
  const val = (lado) => Function(`return (${String(f).replace(/(\d*)d(\d+)/g, (_, n, d) => `(${n || 1}*${lado === "min" ? 1 : d})`)})`)();
  return [val("min"), val("max")];
}

export function validarRolagens(it, onde) {
  const p = [];
  for (const r of it.system?.rolls ?? []) {
    if (!["ataque", "dano", "formula"].includes(r.type)) p.push(`rolagem "${r.name}" de tipo "${r.type}" desconhecido`);
    for (const [i, parte] of (r.parts ?? []).entries()) {
      if (!Array.isArray(parte) || parte.length !== 3) { p.push(`rolagem "${r.name}": parte ${i} precisa ter 3 campos`); continue; }
      const [f, tipo] = parte;
      if (r.type === "ataque" && i === 1) { if (f && !PERICIAS.has(f) && !formulaValida(f)) p.push(`ataque "${r.name}": perícia "${f}" não existe`); continue; }
      if (!formulaValida(f)) p.push(`rolagem "${r.name}": fórmula "${f}" não rola`);
      if (r.type === "dano" && tipo && !DANO.has(tipo) && !CURA.has(tipo)) p.push(`rolagem "${r.name}": tipo de dano "${tipo}" não existe`);
    }
  }
  return p.map((x) => `${onde}${x}`);
}

export function imagemExiste(img) {
  if (!img) return [];
  if (img.startsWith("icons/")) return ICONES_CORE.has(img) ? [] : [`ícone do Foundry "${img}" não existe (ou não foi confirmado em testes/icones-core.json)`];
  if (img.startsWith("systems/tormenta20/")) return ARQ_SISTEMA.has(img) ? [] : [`imagem do sistema "${img}" não existe`];
  if (img.startsWith("modules/giria-t20-armadilhas/")) return fs.existsSync(MOD + img.slice("modules/giria-t20-armadilhas/".length)) ? [] : [`imagem "${img}" não está no módulo`];
  return [`caminho de imagem "${img}" fora do módulo, do sistema e dos ícones do Foundry`];
}

export function validarItem(it, { tipoAtor = null, onde = "" } = {}) {
  const o = `${onde}item "${it.name}": `;
  const p = [];
  const s = it.system ?? {};
  if (!REF.tiposItem.includes(it.type)) p.push(`${o}tipo "${it.type}" não existe`);
  if (it.type === "arma") {
    if (!(s.criticoM >= 1 && s.criticoM <= 20)) p.push(`${o}margem de ameaça ${s.criticoM} inválida`);
    if (!(s.criticoX >= 2)) p.push(`${o}multiplicador de crítico ${s.criticoX} inválido`);
    if (s.proposito && !REF.propositos.includes(s.proposito)) p.push(`${o}propósito "${s.proposito}" inválido`);
  }
  const ex = s.ativacao?.execucao;
  if (ex && !REF.execucoes.includes(ex)) p.push(`${o}execução "${ex}" inválida`);
  if (s.alcance && typeof s.alcance === "string" && !REF.alcances.includes(s.alcance)) p.push(`${o}alcance "${s.alcance}" inválido`);
  if (s.duracao?.units && !REF.duracoes.includes(s.duracao.units)) p.push(`${o}duração "${s.duracao.units}" inválida`);
  if (s.description?.value && typeof s.description.value !== "string") p.push(`${o}descrição não é texto`);
  p.push(...validarRolagens(it, o), ...imagemExiste(it.img).map((x) => o + x));
  for (const e of it.effects ?? []) p.push(...validarEfeito(e, { tipoAtor: e.transfer ? tipoAtor : "alvo", onde: o }));
  return p;
}

// Ficha de Perigo Complexo do sistema (tipo "hazard", dataModel/actor/hazard.mjs): ND e os três campos de texto.
export function validarPerigo(a, onde = "") {
  const o = `${onde}perigo "${a.name}": `;
  const p = [];
  const s = a.system ?? {}, d = s.detalhes ?? {};
  if (!s.attributes?.nd) p.push(`${o}sem ND`);
  for (const [k, nome] of [["goal", "Objetivo"], ["effects", "Efeito"], ["actions", "Ações"]]) {
    if (typeof d[k] !== "string" || !d[k].replace(/<[^>]+>/g, "").trim()) p.push(`${o}${nome} vazio (system.detalhes.${k})`);
    else if (!d[k].trim().startsWith("<")) p.push(`${o}${nome} precisa ser HTML`);
  }
  for (const k of Object.keys(s)) if (!["attributes", "detalhes"].includes(k)) p.push(`${o}campo "system.${k}" não existe na ficha de perigo`);
  if (a.items?.length) p.push(`${o}ficha de perigo não usa itens`);
  p.push(...imagemExiste(a.img).map((x) => o + x));
  return p;
}

export function validarAtor(a, onde = "") {
  if (a.type === "hazard") return validarPerigo(a, onde);
  const o = `${onde}ficha "${a.name}": `;
  const p = [];
  const s = a.system, at = s.attributes, d = s.detalhes ?? {};
  if (a.type !== "npc") p.push(`${o}tipo "${a.type}" (o módulo só traz ameaças "npc" e perigos "hazard")`);
  if (!(at.pv?.max > 0)) p.push(`${o}PV máximo ${at.pv?.max}`);
  if (at.pv?.value > at.pv?.max) p.push(`${o}PV atual maior que o máximo`);
  if (!REF.tiposCriatura.includes(d.tipo)) p.push(`${o}tipo de criatura "${d.tipo}" não existe`);
  if (!REF.papeis.includes(d.role)) p.push(`${o}papel "${d.role}" não existe`);
  if (!REF.tamanhos.includes(s.tracos?.tamanho)) p.push(`${o}tamanho "${s.tracos?.tamanho}" não existe`);
  for (const x of at.sentidos?.value ?? []) if (!REF.sentidos.includes(x)) p.push(`${o}sentido "${x}" não existe`);
  for (const k of Object.keys(at.movement ?? {})) if (!["unit", "hover", "tags", ...REF.deslocamentos].includes(k)) p.push(`${o}deslocamento "${k}" não existe`);
  for (const k of Object.keys(s.pericias ?? {})) if (!PERICIAS.has(k)) p.push(`${o}perícia "${k}" não existe`);
  for (const k of Object.keys(s.tracos?.resistencias ?? {})) if (!RESIST.has(k)) p.push(`${o}resistência "${k}" não existe`);
  if (!at.nd) p.push(`${o}sem ND`);
  p.push(...imagemExiste(a.img).map((x) => o + x), ...imagemExiste(a.prototypeToken?.texture?.src).map((x) => `${o}token: ${x}`));
  for (const it of a.items ?? []) {
    p.push(...validarItem(it, { tipoAtor: "npc", onde: o }));
    const c = it.system?.consume;
    if (c?.type === "attribute" && c.target && foundryGet(s, c.target) === undefined) p.push(`${o}item "${it.name}" consome "${c.target}", que não existe na ficha`);
  }
  for (const e of a.effects ?? []) p.push(...validarEfeito(e, { tipoAtor: "npc", onde: o }));
  return p;
}

export const foundryGet = (o, k) => k.split(".").reduce((c, x) => c?.[x], o);
