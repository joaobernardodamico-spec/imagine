# Design Elemental: Elementarios Arena (v0.2)

Auto battler no estilo Battlegrounds, construído sobre o baralho oficial do Elementarios.
Fontes: GDD v1.0, resumo de 23/01/26, as 52 artes oficiais ([CARTAS.md](CARTAS.md)) e as críticas do João.

> **Tese:** não é sobre jogar o que você quer, é sobre ler o que você tem, saber o que descartar e acertar a hora de jogar. Toda carta comprada, vendida, queimada ou conjurada é uma decisão, fica registrada e pode ser analisada.

**Princípio de design (o que guia cada decisão abaixo):** informação total e decisão difícil. O jogo mostra tudo (estoque, probabilidades, histórico), e a dificuldade fica em decidir, não em adivinhar. É o oposto do Hearthstone, que esconde o estado do jogo e cobra memória.

---

## 1. Os dois eixos de toda carta

| Eixo | Papel | Equivalente no BG |
|---|---|---|
| **Arquétipo** (Bobo → Dragão, 10 valores) | **Tribo**: sinergia vertical | Murloc, Mecanoide… |
| **Reino** (🔥 Fogo, 💧 Água, 🌪️ Ar, 🌿 Terra) | **Classe**: sinergia horizontal | não existe no BG, é o nosso diferencial |
| **Realeza** (Paladino, Rainha, Rei) | Amplificadores quebra-jogo | Titus, Drakkari, Brann |
| **Mago** (coringa) | Feitiços / Éter | Feitiços da Taverna |

As cores seguem as artes: Fogo vermelho, Água azul, **Ar amarelo** e **Terra verde**.

## 2. Taverna de 1 a 7

| Nível | Cartas | Vagas na loja | Custo pra subir* | Cópias de cada carta no estoque |
|---|---|---|---|---|
| 1 | Bobo, Goblin | 3 | — | 15 |
| 2 | Ladino, Golem | 4 | 5 | 13 |
| 3 | Guerreira, Bruxa | 4 | 7 | 11 |
| 4 | Necromante, Orc | 5 | 8 | 9 |
| 5 | Druida, Dragão | 5 | 9 | 7 |
| 6 | Paladino, Rainha | 6 | 10 | 5 |
| 7 | Rei | 6 | 11 | 3 |

\*O custo pra subir cai 1 por rodada em que você não sobe.

O **estoque é compartilhado** entre os 8 jogadores. Cada uma das 52 cartas tem o seu próprio contador de cópias. Por exemplo: o Rei Pyro tem só 3 cópias pra mesa inteira, então a tripla dele é quase lendária.

## 3. As 10 tribos

| Valor | Tribo | Palavra-chave dominante | Identidade |
|---|---|---|---|
| Ás | **Bobo** | Caos | Efeitos aleatórios, troca atributos, mexe na loja |
| 2 | **Goblin** | Ouro | Gera moeda, barateia renovação, lucra com venda |
| 3 | **Ladino** | **Queimar** | Nossa "Aberração": fica mais forte quando cartas são queimadas |
| 4 | **Golem** | Provocar / Magnetizar | Funde-se com outros Golens |
| 5 | **Guerreira** | **Conclamar** (quando ataca) | Fúria dos Ventos, ataque |
| 6 | **Bruxa** | Feitiço | Gera e barateia feitiços, bônus ao conjurar |
| 7 | **Necromante** | **Último Suspiro** | Renascer, invoca a partir do cemitério |
| 8 | **Orc** | Crescimento | Buffs permanentes que escalam |
| 9 | **Druida** | **Fim de Turno** | Buffs no fim do recrutamento |
| 10 | **Dragão** | **Grito de Guerra** | Buffs em área, Escudo |

**Glossário de palavras-chave:** Grito de Guerra (quando é jogada) · Último Suspiro (quando morre) · Fim de Turno (no fim do recrutamento) · Conclamar (quando ataca) · Provocar · Escudo (bloqueia o 1º dano) · Veneno (mata o que atingir) · Renascer (volta com 1 de vida) · Fúria dos Ventos (ataca 2×) · Magnetizar (se funde com uma carta da mesma tribo) · **Queimar** (destrói uma carta da loja ou da mão e gera Éter).

## 4. Realeza: os quebra-jogo

| Carta | Efeito | Dourada |
|---|---|---|
| **Paladino** (nível 6) | Seus **Últimos Suspiros** disparam 2× | 3× |
| **Rainha** (nível 6) | Seus efeitos de **Fim de Turno** disparam 2× | 3× |
| **Rei** (nível 7) | Seus **Gritos de Guerra** disparam 2×, mais um efeito do reino dele | 3× |

O reino da Realeza também conta: ela dá o bônus pra todos e um bônus extra pras cartas do mesmo reino. Os quatro Reis:

- **Pyro (Fogo)**: no início do recrutamento, queima a carta mais fraca da loja e ganha os atributos dela.
- **Neptulon (Água)**: no Fim de Turno, copia o lacaio à direita dele como uma versão temporária.
- **Ventuus (Ar)**: seus Gritos de Guerra de Ar custam 1 a menos de ouro.
- **Marcus Aurelius (Terra)**: os lacaios de Terra ganham +2 de vida para cada Último Suspiro disparado.

## 5. Reinos (classes)

Bônus com 2, 4 e 6 cartas do mesmo reino no tabuleiro:

| Reino | Identidade | (2) | (4) | (6) |
|---|---|---|---|---|
| 🔥 Fogo | Queimar | Queimar dá +1 de ataque às cartas de Fogo | +2 | +3, e a queima também gera 1 de ouro |
| 💧 Água | Cópia / fluxo | Fim de Turno: +1/+1 numa carta de Água aleatória | em 2 cartas | em todas |
| 🌪️ Ar | Velocidade | Ar ataca primeiro | e com +1 de ataque | e a primeira carta de Ar ganha Fúria dos Ventos |
| 🌿 Terra | Resistência | Terra ganha +2 de vida | +4, e a 1ª ganha Provocar | +6, e Renascer na 1ª que morrer |

**Ciclo Elemental:** Fogo → Água → Ar → Terra → Fogo. A carta que vem antes no ciclo causa **+1 de dano** contra a seguinte.

**Manilha da rodada (o "Vira"):** antes de cada recrutamento, é revelado um arquétipo como Manilha. Todas as cartas desse arquétipo ganham +2/+2 em combate naquela rodada. Ela é sempre anunciada com antecedência, pra todo mundo poder ler e se adaptar.

## 6. Éter e Feitiços

- **Vender** uma carta dá +1 de ouro. **Queimar** dá +1 Éter do reino da carta (dourada dá 3).
- **Feitiços** custam combinações de Éter. Exemplos:
  - *Forja Elemental* (2🔥+1🌿): +3/+3 numa carta.
  - *Maré Espelhada* (3💧): uma cópia de uma carta de nível ≤ 3.
  - *Vendaval* (2🌪️): renova a loja e congela uma carta de graça.
  - *Ascensão* (4🌿+3🌪️): transforma uma carta na versão dourada dela.
  - *Transmutar* (1 de cada): troca o reino de uma carta.
- **Mago** (coringa, aparece na fileira de feitiços): custa 2 de ouro, dá um feitiço aleatório e −1 Éter em todos os feitiços até o fim da rodada.
- A loja tem uma fileira separada com 1 a 2 feitiços (custam ouro).

**Ícones:** o Éter usa o símbolo do Mago (estrela de 8 pontas com o olho). As fichas oficiais são os contadores: a roxa é a vida e a branca é o Éter.

## 7. Deck Tracker (rastreador nativo)

Fica num painel lateral que pode ser recolhido e está **sempre visível durante o recrutamento**.

### 7.1 Estoque ao vivo
- Para cada carta: **cópias restantes / total**, com uma barra que esvazia.
- Filtros por tribo, reino, nível e "só o que me interessa".
- Mostra quais cartas os bots estão segurando, deduzido do que eles compraram e mostraram em combate. É informação pública, e nada fica escondido.

### 7.2 Probabilidade
- **% de aparecer na próxima renovação** para cada carta, calculada a partir do estoque visível pro seu nível:
  `P = 1 − C(N − k, S) / C(N, S)`, onde N = cartas no estoque do seu nível pra baixo, k = cópias da carta alvo e S = vagas na loja.
- **% de completar a tripla** nas próximas X renovações, com o ouro que você tem agora.
- **Valor esperado da renovação:** "você tem 18% de ver alguma carta da sua build nesta renovação".
- Cores: verde acima de 30%, amarelo de 10 a 30% e cinza abaixo de 10%.

### 7.3 Fixador de cartas
- **Fixar 📌 uma carta específica** da loja (o BG só congela a loja inteira): ela fica pra próxima rodada.
- A 1ª fixação de cada rodada é grátis. As seguintes custam 1 de ouro.
- **Lista de desejos:** marque cartas no tracker. Quando uma aparecer na loja, ela pisca, e a probabilidade dela ganha destaque.

### 7.4 Contador de ações (alimenta o replay)
Mostra na rodada atual o ouro gasto e o desperdiçado, as compras, vendas, queimas e feitiços, e o Éter gerado.

## 8. Reprise / Livro da Partida

- **Linha do tempo** rodada a rodada, ação por ação, com o ouro e o Éter antes e depois de cada uma.
- **Replay dos combates** golpe por golpe, com velocidade de 0,5× a 4×.
- **Raio-X no final:** ouro desperdiçado, cartas compradas e vendidas sem uso, rodada ideal pra subir de Taverna e as triplas perdidas ("a cópia que faltava estava na loja na rodada 6").
- O motor é **determinístico com semente**, então qualquer partida pode ser reproduzida exatamente igual.

## 9. Economia e ritmo (alvo: 10 a 15 min)

| Parâmetro | Valor (configurável) |
|---|---|
| Jogadores | 8 (você + 7 bots) |
| Vida do herói | 30 |
| Ouro | começa com 3, +1 por rodada, máximo 10 |
| Lacaio | **2 de ouro** (teste A/B: níveis 6 e 7 custam 3) |
| Renovar a loja | 1 |
| Vender | +1 de ouro / Queimar: +1 Éter |
| Tabuleiro | 7 vagas · mão: 10 |
| Tempo de recrutamento | 30s + 5s por rodada (máximo 60s) |
| Combate | ~10s, acelerado |
| Dano ao perder | nível da Taverna + níveis das cartas que sobraram (teto de 5 até a rodada 4) |

**Tripla:** 3 cópias da **mesma carta** (mesmo arquétipo e mesmo reino) viram a versão dourada (atributos ×2, efeito ×2) e dão uma **Descoberta** de um nível acima.

## 10. Heróis: os Feiticeiros

Os heróis jogáveis são **Feiticeiros** (ainda vamos criar). Por enquanto o protótipo usa **4 Feiticeiros provisórios**, um por reino, pra testar as três faixas de poder:

| Provisório | Faixa | Poder |
|---|---|---|
| Feiticeiro do Fogo | Ativo (1 de ouro) | Queima uma carta da loja e ganha 2 Éter dela |
| Feiticeiro da Água | Passivo | A 1ª carta comprada em cada rodada vem com uma cópia temporária (dura 1 combate) |
| Feiticeiro do Ar | Ativo (0) | Renova 1 vaga da loja (1× por rodada) |
| Feiticeiro da Terra | Carregável | A cada 3 cartas de Terra jogadas, ganha um feitiço *Ascensão* |

**Regra contra poder inútil:** todo poder precisa mudar pelo menos uma decisão por rodada. Se o tracker mostrar que um poder foi usado menos de 30% das vezes, ele precisa ser refeito.

## 11. Cartas: atributos base

Valores iniciais por nível, e cada carta varia ±1 conforme a função:

| Nível | Ataque/Vida base |
|---|---|
| 1 | 2/2 |
| 2 | 3/3 |
| 3 | 4/4 |
| 4 | 5/5 |
| 5 | 6/6 |
| 6 | 7/7 |
| 7 | 8/8 |

O efeito de cada carta é **tribo × reino**. Por exemplo: o Ladino de Fogo (Ignarion) ganha +2 de ataque a cada carta queimada, e o Ladino de Terra (Fang) faz um Último Suspiro que queima a carta mais cara da loja de um oponente aleatório. Os 52 efeitos ficam no código (`data/cards.js`), pra dar pra balancear sem mexer no motor.

## 12. Loja: decisões fechadas com o João

1. **Manilha na loja:** toda renovação tem 1 vaga garantida pro arquétipo da Manilha.
2. **Vender e queimar:** duas zonas de arrastar, 💰 e ✦.
3. **Diluição:** a partir do nível 5, os níveis 1 e 2 **não somem**, mas têm o peso reduzido (aparecem com 25% da chance normal). Ficam disponíveis pra completar triplas e pras builds de Bobo e Goblin.
4. **Preço disputado:** uma carta custa +1 quando outro jogador já tem cópias dela.
5. **Tripla manual:** você pode segurar as 3 cópias e só juntar quando quiser, com o botão "Fundir".

## 13. Economia como mercado: escalar com dividendos

A metáfora central da economia: **cartas são ativos, ouro é caixa e Éter é commodity.** O jogo é sobre fazer o patrimônio render.

- **Juros (o Tesouro):** o ouro que sobra no fim do recrutamento vai pro Tesouro. Ele rende **+1 de ouro a cada 3 guardados** (máximo de +3 por rodada) e volta no começo da rodada seguinte. Gastar tudo é crescer agora, e guardar é crescer depois.
- **Dividendos:** cartas com o selo 📈 pagam algo todo Fim de Turno enquanto estão no tabuleiro: ouro, Éter ou atributos. Os Goblins são os "papéis de renda" do jogo.
- **Valorização:** algumas cartas ganham +1/+1 permanente a cada rodada que passam no tabuleiro (Orcs). Vendê-las cedo é realizar o lucro antes da hora.
- **Liquidez:** quanto mais alto o nível da carta, mais ela rende na venda (nível 1–3 dá 1, nível 4–5 dá 2, nível 6–7 dá 3). Uma carta forte vira caixa quando você precisa pivotar.
- **Commodity:** o Éter de cada reino tem um "preço do dia". A Manilha deixa os feitiços do reino do Vira 1 Éter mais baratos naquela rodada.
- **Painel de patrimônio** (no tracker): caixa + Tesouro + valor de venda do tabuleiro + Éter, com um gráfico de evolução por rodada. No final, o Livro da Partida mostra **a curva de patrimônio de todos os jogadores**.

## 14. Reações Elementais (interação entre reinos)

Cartas de **reinos diferentes lado a lado** no tabuleiro formam uma **Reação** no início do combate. Isso faz a **posição** no tabuleiro importar, além da composição.

| Par | Reação | Efeito |
|---|---|---|
| 🔥 + 💧 | **Vapor** | As duas ganham Escudo |
| 🔥 + 🌪️ | **Incêndio** | Causa 2 de dano em todos os inimigos |
| 🔥 + 🌿 | **Magma** | As duas ganham +3 de ataque |
| 💧 + 🌪️ | **Tempestade** | A da esquerda ganha Fúria dos Ventos |
| 💧 + 🌿 | **Florescer** | As duas ganham +4 de vida e Renascer |
| 🌪️ + 🌿 | **Areia** | O inimigo da frente perde 3 de ataque |

- Cada carta participa de no máximo 1 Reação, sempre lida da esquerda pra direita.
- **Tensão de design:** os bônus de reino (seção 5) pedem tabuleiro com um reino só, e as Reações pedem reinos misturados. Você escolhe entre pureza e alquimia.
- **Éter puro:** juntar 4 reinos diferentes em sequência dispara a **Reação do Éter**, em que todas as cartas ganham +2/+2. É o quinto elemento que dá vida, como no lore.

## 15. O Vira: motor de modos de jogo

O Vira vem do jogo físico e no Arena vira o **modificador da rodada**. Toda rodada revela uma carta do Vira, e ela define:
- **Manilha**: o arquétipo seguinte ao do Vira (Vira = Golem → Manilha = Guerreira), que ganha +2/+2 e uma vaga garantida na loja.
- **Reino dominante**: o reino do Vira. Cartas desse reino vencem empates de dano, e os feitiços dele ficam mais baratos.

O Vira é um sistema parametrizável, então trocar as regras dele cria modos novos sem reescrever o motor:

| Modo | Regra do Vira |
|---|---|
| **Clássico** | 1 Vira por rodada, revelado no início |
| **Vira Oculto** | Revelado só quando o combate começa (leitura e aposta) |
| **Duplo Vira** | 2 Viras: duas Manilhas e dois reinos dominantes |
| **Vira Fixo** | O mesmo Vira a partida inteira, pra montar a build em cima dele |
| **Mago Reverso** | Comprar um Mago inverte a Manilha (vira o arquétipo **anterior** ao Vira) pra mesa toda |
| **Aposta** (homenagem ao jogo físico) | Antes do combate, cada um aposta quantas cartas vai deixar vivas. Acertar dá ouro, e errar dá dano extra |
| **Vira do Campeão** | Quem está em 1º lugar escolhe o Vira da próxima rodada entre 3 opções |

## 16. Correções do Hearthstone

| Problema no HS | No Arena |
|---|---|
| Sem tracker/análise | Deck Tracker + Livro da Partida nativos |
| Muito lento | 10 a 15 min, combate acelerado |
| Visual datado | Arte oficial em tela cheia, interface limpa |
| Cartas sem animação | v1: microanimações · depois: loops de 3 quadros por personagem |
| Poderes inúteis | Regra dos 30% de uso |

## 17. Escopo do protótipo v0.1

**Entra:** motor completo (loja, economia, Taverna de 1 a 7, triplas, Éter, feitiços, combate com todas as palavras-chave, Realeza), as 52 cartas com arte oficial, 7 bots com estilos diferentes, Deck Tracker (estoque, % e fixar), Livro da Partida e replay, e 4 Feiticeiros provisórios. Roda no navegador sem servidor.

**Fica pra depois:** online, Feiticeiros definitivos, skins, código físico→digital, animações em vídeo.

## 18. Formações de Poker (v0.3, substitui os bônus de reino 2/4/6)

O baralho do Elementarios já é um baralho de poker: o **arquétipo é o valor** (Ás a Rei) e o **reino é o naipe**. As formações da arena viram mãos de poker reais. A melhor mão de 5 cartas da arena vale no início de cada combate.

| Mão | Bônus |
|---|---|
| Par | as 2 cartas: +1/+2 |
| Dois Pares | as 4 cartas: +2/+2 |
| Trinca | as 3 cartas: +3/+3, a 1ª ganha Provocar |
| Sequência | as 5 cartas: +3/+2 e a arena ataca primeiro |
| Flush | as 5 cartas: +3/+3 e o poder do reino (Fogo +3 de ataque · Água Escudo · Ar Fúria dos Ventos · Terra +4 de vida e Renascer) |
| Full House | a arena inteira: +4/+4 |
| Quadra | as 4 cartas: +6/+6 e Escudo |
| Straight Flush | a arena inteira: +6/+6 e Escudo |
| Royal Flush | Dragão, Paladino, Rainha, Rei e Bobo do mesmo reino: a arena inteira ganha +10/+10, Escudo e Renascer |

- A sequência aceita o Ás baixo (Ás-2-3-4-5) e o Ás alto (10-J-Q-K-Ás).
- As fichas invocadas (Espectro, Esqueleto) não contam.
- O Grimório mostra a mão atual e o que falta pras próximas ("Flush de Fogo: faltam 2").
- **Tensão de design:** pares e trincas pedem o mesmo arquétipo; flush pede o mesmo reino; sequência pede arquétipos diferentes; e as Reações Elementais pedem reinos diferentes lado a lado. Toda compra mexe em três eixos ao mesmo tempo.

## 19. Jogo 2: poker + pife (a fazer)

Um segundo modo, simples e intuitivo, usando o mesmo baralho: poker com a compra e o descarte do pife. Vai ter design próprio depois do Arena.

## 20. A mesa, as relíquias e os ataques (v0.4)

- **A mesa da taverna muda com o Vira.** O tabuleiro do fundo vira o reino do Vira da rodada (lava, cachoeiras, floresta, ilhas no céu), com troca suave entre as rodadas. A mesa neutra (os 4 reinos com o Éter no centro) aparece antes da primeira rodada.
- **Relíquias:** o poder de cada Feiticeiro é um acessório que ele carrega na mão. Fica no canto inferior esquerdo, animado, e é clicável quando o poder é ativo.
  - Adaga de Brasa (Fogo): é arremessada e corta uma carta da loja.
  - Anel da Maré (Água): brilha na primeira compra da rodada.
  - Relógio dos Ventos (Ar): os ponteiros giram pra trás e a loja renova.
  - Amuleto de Raiz (Terra): acende uma carga a cada carta de Terra jogada.
- **Ataques com assinatura por tribo** (inspirado no Legends of Runeterra):
  - Guerreira e Paladino: corte em arco.
  - Golem e Orc: impacto com onda de choque.
  - Dragão: sopro de chamas na cor do reino.
  - Bruxa: orbe mágico.
  - Necromante: caveira espectral.
  - Druida: espinhos.
  - Ladino: adaga arremessada.
  - Goblin: moeda.
  - Bobo: confete de cores.
  - Rainha e Rei: raio de luz.
- **A fazer:** mãos animadas do Feiticeiro em primeira pessoa e pets.
- **Mesa de poker (mesa-poker.webp):** reservada pro jogo 2.
