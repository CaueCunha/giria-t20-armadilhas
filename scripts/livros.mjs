// Livros com as mesmas siglas e rótulos do módulo Giria T20 (scripts/packs.mjs, LIVROS): a sigla vai em
// `livro` de cada modelo (como flags.giria-t20.fonte.livro) e o rótulo dá nome ao grupo da lista ("AdA - Armadilhas").
export const LIVROS = [
  { fonte: "T20", nome: "Livro Básico", titulo: "Tormenta20", rotulo: "LB" },
  { fonte: "HdA", nome: "Heróis de Arton", rotulo: "HdA" },
  { fonte: "DdA", nome: "Deuses de Arton", rotulo: "DdA" },
  { fonte: "AdA", nome: "Ameaças de Arton", rotulo: "AdA" },
  { fonte: "BdA", nome: "Bestiário de Arton", rotulo: "BdA" },
  { fonte: "AtA", nome: "Atlas de Arton", rotulo: "AtA" },
  { fonte: "GdM", nome: "Guia de Deuses Menores", rotulo: "GdM" },
  { fonte: "GdN", nome: "Guia de NPCs", rotulo: "GdN" },
  { fonte: "FdT", nome: "Fim dos Tempos", rotulo: "FdT" },
  { fonte: "CASA", nome: "Regras da Casa", rotulo: "Casa" },
];
export const livroPorFonte = (sigla) => LIVROS.find((l) => l.fonte === sigla) ?? null;
export const GRUPO_OUTROS = "Outros módulos";
/** Nome do grupo da lista de modelos, no formato das pastas do Giria: "<rótulo> - Armadilhas". */
export const grupoDoLivro = (sigla) => { const l = livroPorFonte(sigla); return l ? `${l.rotulo} - Armadilhas` : GRUPO_OUTROS; };
/** Texto da fonte mostrado no aviso: "Ameaças de Arton, p. 178". */
export const textoFonte = (sigla, pagina) => { const l = livroPorFonte(sigla); return l && pagina ? `${l.titulo ?? l.nome}, p. ${pagina}` : ""; };
/** ND para ordenar: "1/4" = 0.25. */
export const valorNd = (nd) => { const [a, b] = String(nd ?? "").split("/"); return b ? +a / +b : nd === "" || nd == null ? 99 : +a; };
