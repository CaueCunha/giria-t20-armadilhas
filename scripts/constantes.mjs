export const MODULO = "giria-t20-armadilhas";
export const TIPO = `${MODULO}.armadilha`;
// Só um cliente age em nome da mesa: o mestre ativo.
export const souMestreAtivo = () => (game.users.activeGM ?? game.users.find((u) => u.isGM && u.active))?.isSelf ?? false;
