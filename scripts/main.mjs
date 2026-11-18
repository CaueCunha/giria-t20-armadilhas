// Giria T20 - Armadilhas: armadilhas que disparam quando um token entra numa região do mapa (Foundry v13/v14, Tormenta20).
// - init: registra o comportamento de região "Armadilha (Tormenta20)" e a API.
// - ready: liga os botões dos cartões (aviso ao mestre e testes no chat) e o socket.
// Outros módulos acrescentam modelos no hook "setup":
//   game.modules.get("giria-t20-armadilhas")?.api?.registrarModelos({ "meu-id": { nome: "...", pericia: "refl", cd: 20, dano: "2d6[corte]", sucesso: "evita" } })
import { MODULO } from "./constantes.mjs";
import { registrarTipo, ligarArmadilhas, receberGatilho, disparar, configDe } from "./armadilha.mjs";
import { ligarTestes, api as apiTestes } from "./testes.mjs";
import { registrarModelos, modelos, MODELOS_LIVRO, MODELOS_SUPLEMENTOS, MODELOS_CAMPANHA } from "./modelos.mjs";

Hooks.once("init", () => {
  registrarTipo();
  game.modules.get(MODULO).api = { testes: apiTestes, registrarModelos, modelos, modelosLivro: MODELOS_LIVRO, modelosSuplementos: MODELOS_SUPLEMENTOS, modelosCampanha: MODELOS_CAMPANHA, receberGatilho, disparar, configDe };
});

Hooks.once("ready", () => {
  ligarTestes();
  ligarArmadilhas();
});
