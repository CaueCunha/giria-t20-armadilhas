# Giria T20 - Armadilhas

Módulo de Foundry VTT (v13/v14, sistema Tormenta20 1.6.x) para armadilhas que disparam quando um token entra numa área do mapa.

## Instalar

Na tela de Setup, em **Add-on Modules › Install Module**, cole no campo **Manifest URL**:

`https://raw.githubusercontent.com/CaueCunha/giria-t20-armadilhas/main/module.json`

Depois ative o módulo no mundo, em **Game Settings › Manage Modules**.

## Como usar

1. Na cena, abra **Regions** nos Scene Controls e desenhe a área da armadilha com **Rectangle** ou **Polygon** (o corredor, a porta, o baú).
2. Dê dois cliques na região e, na aba **Behaviors**, clique em **+** e escolha **Armadilha (Tormenta20)**.
3. Escolha um **Modelo** (as 23 armadilhas do Livro Básico, p. 317–318, e as que outros módulos acrescentarem) ou deixe em **Personalizada** e preencha teste, CD, dano, quem passa, condição e as CDs de encontrar e desarmar.
4. Opções: **Dispara uma vez** (ligado), **Só tokens de jogadores ativam** (ligado), **Parar o token na borda** (ligado) e **Pausar o jogo ao ativar** (desligado). Em **Events**, o padrão é **Token Move In**.

Na mesa:

- Quando um token de jogador entra na área, ele para na borda e **só o mestre** recebe um aviso no chat (whisper): quem entrou, a regra da armadilha, as CDs de Investigação (encontrar) e Ladinagem (desarmar) e os botões **Disparar** e **Ignorar**. Quem entrar antes de você decidir entra no mesmo aviso.
- **Disparar** manda aos jogadores o cartão de teste: o dano rolado uma vez e um botão por herói (por exemplo, "Reflexos"). Cada jogador rola pela própria ficha. O cartão mostra quem passou e quem falhou, e você aplica dano, metade, condição ou efeito pelos botões. Nada é aplicado sozinho.
- Armadilhas de área (símbolos, desabamentos) testam todos os tokens que estão dentro da região na hora do disparo.
- **Ignorar** fecha o aviso e mantém a armadilha armada (o grupo achou e contornou, por exemplo).
- Com **Dispara uma vez**, a região se desliga depois do disparo, e o aviso ganha o botão **Rearmar**. **Disparar de novo** serve para armadilhas que repetem a cada rodada (Gás Venenoso) ou golpeiam duas vezes (Estátua Executora).

## O que fica com o mestre

- Encontrar e desarmar: os jogadores pedem o teste e você usa as CDs do aviso. Se desarmarem, marque **Disabled** no behavior da região (ou clique em Ignorar quando ela disparar).
- Durações ("até o fim da cena", "1d6 rodadas") e regras especiais (Símbolo do Sono só em quem tem 8 níveis ou menos, Símbolo da Morte reduz a –1 PV) aparecem no texto do card e são aplicadas por você.

## Para outros módulos

Acrescente modelos no hook `setup`:

```js
Hooks.once("setup", () => {
  game.modules.get("giria-t20-armadilhas")?.api?.registrarModelos({
    "meu-modulo-bugulentos": { nome: "Bugulentos!", nd: "1/2", pericia: "refl", cd: 20, sucesso: "evita", dano: "1d12[perda]", encontrar: 20, desarmar: 20, texto: "..." },
  });
});
```

Campos aceitos: veja o cabeçalho de `scripts/modelos.mjs`.

## Testes

`node --test "testes/**/*.test.mjs"` roda a bateria num Foundry simulado (modelos conferidos contra as regras do sistema, aviso, disparo, rolagem dos jogadores e botões do mestre). `python3 empacotar.py` roda os testes e gera o zip. Os testes não substituem abrir o Foundry de verdade.
