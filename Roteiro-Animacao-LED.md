# Roteiro — Animação Manda para painel de LED

**Formato:** horizontal (paisagem) · **Duração:** 18s (loopável) · **Áudio:** mudo (o texto carrega tudo) · **Objetivo:** marca nos primeiros segundos + conversão (QR/site) no fim · **Visual:** identidade clara da Manda, adaptada pra LED.

---

## 1. Especificações técnicas (antes de abrir o AE)

**Meça a resolução real do painel do seu pai em pixels.** Isso é o passo mais importante — painel de LED quase nunca é Full HD "redondinho". Pergunte pra ele ou pro técnico o número exato (ex.: 1280×384, 1920×640, 1920×1080…). A composição no After tem que nascer nessa resolução exata, senão distorce ou corta.

- **Composição:** resolução nativa do painel · **30 fps** (confirme com o player do painel; alguns pedem 25/50/60) · duração **18s** · **Motion Blur ligado** no projeto.
- **Margem de segurança:** deixe **5% de respiro** em todas as bordas. Nada de texto ou QR colado na borda — módulos de LED às vezes "comem" a beirada.
- **Fundo:** **creme quente `#EEE7DD`**, NÃO branco puro. Branco `#FFFFFF` em LED ofusca e estoura o brilho; o creme mantém o visual claro sem cansar a vista nem lavar o terracota.
- **Traços/linhas:** mínimo **3–4px**. Linha de 1px some ou pisca no LED.
- **Fonte:** grande e pesada. Regra prática: se você não lê o texto com o preview do AE reduzido a uns 8cm de largura na sua tela, está pequeno demais pro LED visto de longe.
- **Saturação:** moderada. O LED já satura sozinho — terracota muito puro pode "brilhar" demais. Teste no painel real.
- **Evite flash/estrobo** rápido (desconforto + alguns painéis deixam rastro/ghosting).

---

## 2. Paleta e tipografia

**Cores (do sistema da Manda):**

- Fundo creme: `#EEE7DD`
- Tinta (texto forte): `#1F1B17`
- Terracota (destaque): `#D97757` · terracota escuro (contraste): `#B75C3C`
- Verde "aceita": `#2E7D51` · azul "enviada": `#3A5BB5`
- Cinza apoio: `#6B635A`
- Cartões/telas do app: branco `#FFFFFF` (aqui pode, porque é área pequena dentro do mockup, não o fundo inteiro)

**Tipografia:**

- Títulos: **Satoshi** (a da marca). Alternativas se não tiver: Clash Display, General Sans Bold.
- Apoio: **General Sans** / Inter.
- Peso: títulos em Bold/Black. Nada de fino em LED.

---

## 3. Estrutura geral (timeline)

| Tempo | Cena | Função |
|---|---|---|
| 0:00–0:03 | Abertura da marca | Fixa "Manda" + "Cria. Envia. Fecha." |
| 0:03–0:07 | Monta a proposta | Mostra o editor criando um orçamento |
| 0:07–0:11 | Envia e fecha | Link → Visualizada → Aceita (check verde) |
| 0:11–0:15 | O painel (dashboard) | Números sobem, gráfico desenha — a parte que você pediu |
| 0:15–0:18 | CTA final | QR grande + mandaproposta.com + "Comece grátis" |
| loop | Emenda | Último frame casa com o primeiro |

CTA fica **3s parado** de propósito — é o tempo mínimo pra alguém sacar o celular e ler o QR.

---

## 4. Cena a cena (detalhado)

### Cena 1 — Abertura da marca (0:00–0:03)
- **Tela:** fundo creme. No centro, a logomarca "Manda" se forma; embaixo, a tagline **"Cria. Envia. Fecha."**
- **Texto:** `Manda` (grande) → `Cria. Envia. Fecha.` (menor, terracota escuro)
- **Movimento:** a marca entra com leve *scale* (de 92%→100%) + fade, ease suave. A tagline aparece palavra por palavra com um pequeno atraso entre elas (0,12s), cada uma subindo 20px.
- **AE:** camada de texto → **Animate ▸ Position + Opacity**, Range Selector com *Advanced ▸ Based On: Words* e **Offset** animado. Easing pelo Graph Editor (Easy Ease + puxar as alças pra exponencial).

### Cena 2 — Monta a proposta (0:03–0:07)
- **Tela:** um mockup do **editor de proposta** entra da direita. Os itens do orçamento aparecem um a um; o **valor total sobe contando** de R$ 0 até o número final.
- **Texto (topo):** `Propostas profissionais em minutos.`
- **Movimento:** cada linha de item entra com fade + slide de 16px (staggered). O total conta rápido e "trava" com um micro-bounce. Um cursor/traço terracota pisca sutil.
- **AE:** ver seção 5 pra o mockup e o contador. Stagger = duplicar a camada de linha e deslocar keyframes, ou usar um único pré-comp com as linhas em Range Selector.

### Cena 3 — Envia e fecha (0:07–0:11)
- **Tela:** a proposta vira um **card compacto** que "voa" pra um ícone de cliente. Em cima do card, um selo de status troca: **Enviada** (azul) → **Visualizada** (terracota) → **Aceita** (verde) com um **check que dá pop**.
- **Texto:** `Envie por link. Acompanhe cada passo.`
- **Movimento:** card viaja numa curva (não reta) com motion blur. O selo troca de cor/label em 3 batidas. No "Aceita", o check faz *scale overshoot* (110%→100%) + um brilho rápido.
- **AE:** anime a **Position** do card num path curvo (cole um caminho da Pen na propriedade Position). O check: shape com **Trim Paths** (End 0→100%) desenhando o "✓", + Scale com overshoot.

### Cena 4 — O painel / dashboard (0:11–0:15) — *a parte central*
- **Tela:** a **Home/dashboard** entra. Em sequência rápida: os **KPIs sobem contando** (Em negociação R$, Taxa de aceitação %, Propostas no mês), o **gráfico se desenha** da esquerda pra direita, e as **barras do funil preenchem**.
- **Texto:** `Todos os seus números num lugar só.`
- **Movimento:** cards entram em cascata (stagger 0,1s). Números contam. Linha do gráfico desenha com um ponto brilhante na ponta. Barras do funil crescem da esquerda, escalonadas.
- **AE:** detalhado na seção 5.

### Cena 5 — CTA final (0:15–0:18)
- **Tela:** fundo creme limpo. À esquerda, **logo Manda + "Comece grátis"**. À direita, **QR code grande** apontando pro cadastro, com **`mandaproposta.com`** embaixo em terracota.
- **Movimento:** entra rápido e **fica parado** (só o QR pode ter um leve pulse de 2% pra chamar o olho, sem atrapalhar a leitura). Segura 3s.
- **AE:** QR como PNG de alto contraste (preto sobre creme claro dentro de um quadro branco pequeno — QR precisa de "quiet zone" branca ao redor pra escanear). **Não** anime o QR com blur nem o deixe atravessado no fim; ele tem que estar 100% nítido e parado no último frame.

---

## 5. Como animar o dashboard (passo a passo AE)

### 5.1 De onde vêm as telas do app
Duas opções, da mais rápida pra mais trabalhosa:

- **A) Gravar o app real (recomendado):** abra `mandaproposta.com/app`, deixe a janela num tamanho fixo e grave a tela (ou tire prints em alta). Importe os PNG/vídeo no AE e anime "por cima" (mascarando partes pra revelar). Mais fiel, menos trabalho.
- **B) Reconstruir em shape layers:** redesenhe cards/gráfico com retângulos arredondados e texto. Dá controle total da animação (cada número, cada barra), mas dá mais trabalho. Use as cores da seção 2.

Dica híbrida: use print real como **fundo** do card e anime só os elementos-chave (números, linha do gráfico) por cima com shapes/texto. Melhor custo-benefício.

### 5.2 Contador de número que sobe (KPI)
1. Camada de texto → aplique o efeito **Slider Control** (renomeie pra "Valor").
2. Keyframe o Slider de `0` → valor final (ex.: `12480`) em ~1,2s, com Easy Ease.
3. No **Source Text**, cole a expressão (Alt+clique no cronômetro):

```javascript
// Para dinheiro (R$):
"R$ " + Math.round(effect("Valor")("Slider")).toLocaleString("pt-BR")

// Para porcentagem:
Math.round(effect("Valor")("Slider")) + "%"
```

O micro-bounce no fim: adicione 1 keyframe de Scale 100→104→100% nos últimos 6 frames.

### 5.3 Gráfico que se desenha
1. Com a **Pen**, desenhe a linha do gráfico (uma shape layer, só *Stroke*, 4–5px, terracota).
2. Na shape → **Add ▸ Trim Paths**. Anime **End** de `0%` → `100%` em ~1s, Easy Ease.
3. Ponta brilhante: um pequeno círculo terracota com glow que segue o fim da linha (parenteie ou use o mesmo path na Position). Opcional: área preenchida embaixo com **fade** entrando junto.

### 5.4 Barras / funil que preenchem
1. Cada barra = retângulo. Mova o **Anchor Point** pra ponta esquerda.
2. Anime **Scale X** de `0` → `100%` (Scale separado no X). Ease.
3. Escalone: barra 1 começa em 0s, barra 2 em +0,1s, etc.

### 5.5 Moldura de dispositivo (opcional, dá ar "produto")
Coloque os prints dentro de uma **moldura arredondada** (navegador ou celular): retângulo arredondado branco com uma barrinha de "abas". Um leve *parallax* (o conteúdo se move 6px a menos que a moldura) dá profundidade moderna sem exagero.

---

## 6. Transições entre cenas
- Padrão: **wipe mascarado em terracota** (uma faixa diagonal que cruza e revela a próxima cena) OU **scale + leve blur** (a cena sai crescendo 3% e desfocando, a próxima entra).
- Mantenha o **ritmo constante**: cada transição ~0,4s. Consistência = sensação "premium".
- **Não** use 5 transições diferentes. Escolha uma (no máximo duas) e repita.

---

## 7. Copy — todas as frases prontas (pt-BR)

1. `Cria. Envia. Fecha.`
2. `Propostas profissionais em minutos.`
3. `Envie por link. Acompanhe cada passo.`
4. `Todos os seus números num lugar só.`
5. `Comece grátis` · `mandaproposta.com`

Regras: **máximo ~5 palavras por tela**, frase por frase, nunca duas frases longas juntas. Em LED e sem som, texto curto e grande é lei.

---

## 8. Checklist antes de exportar (LED)
- [ ] Composição na **resolução nativa exata** do painel.
- [ ] Nenhuma área grande de **branco puro** (usei creme `#EEE7DD`).
- [ ] Texto legível com o preview bem reduzido (teste do "8cm").
- [ ] Traços ≥ 3–4px. Nada de linha fina.
- [ ] **5% de margem** de segurança nas bordas.
- [ ] Sem flash/estrobo rápido.
- [ ] **QR 100% nítido e parado** no final, com moldura branca ao redor (quiet zone) — teste escanear com 2 celulares.
- [ ] Motion Blur ligado, mas sem exagero.
- [ ] Último frame **casa com o primeiro** (loop sem "soluço").

---

## 9. Exportação
- **Confirme com o técnico do painel** qual formato o player aceita — isso mais importante que qualquer preset. Opções comuns:
  - **MP4 H.264**, bitrate alto (~15–25 Mbps), resolução nativa. Cobre a maioria dos players.
  - **Sequência de PNG** (alguns controladores Novastar/Colorlight/LED preferem). Se for o caso, exporte PNG numerado.
- fps: o mesmo da composição (confirme o do player).
- Via AE: **Add to Render Queue** (ou Media Encoder pra H.264). Evite comprimir demais — LED perdoa menos artefato de compressão.

---

## 10. Loop
A peça foi pensada pra rodar em loop no painel o dia todo. Garanta que o **frame 0:18 = frame 0:00** (mesmo fundo creme, mesmo enquadramento) — ou coloque um cross-dissolve de 0,3s da última cena de volta pra abertura. Assim ninguém percebe o "recomeço".

---

### Resumo do fluxo de produção
1. Meça o painel (pixels). 2. Crie a comp nessa resolução. 3. Grave/prepare as telas do app. 4. Monte as 5 cenas com os timecodes acima. 5. Anime números (Slider), gráfico (Trim Paths) e barras (Scale X). 6. Rode o checklist de LED. 7. Confirme o formato com o técnico e exporte. 8. **Teste no painel real** antes de deixar rodando — cor e brilho sempre mudam do monitor pro LED.
