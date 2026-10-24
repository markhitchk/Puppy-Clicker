// Direct single-deck rules port of PuppyBlackjackEngine.kt. Wagers are Casino Chips.
const clone = (x) => JSON.parse(JSON.stringify(x));
export const validWager = (n) =>
  Number.isSafeInteger(n) && n >= 20 && n <= 100000 && n % 10 === 0;
export const label = (id) =>
  `${["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][id % 13]}${["♣", "♦", "♥", "♠"][Math.floor(id / 13)]}`;
export function value(cards) {
  let total = cards.reduce((n, id) => n + Math.min((id % 13) + 1, 10), 0);
  const soft = cards.some((id) => id % 13 === 0) && total + 10 <= 21;
  if (soft) total += 10;
  return { total, soft };
}
const natural = (h) =>
  !h.fromSplit && h.cards.length === 2 && value(h.cards).total === 21;
const dealerNatural = (s) =>
  s.dealerCards.length === 2 && value(s.dealerCards).total === 21;
export function newRound(wager, deck = null, rng = Math.random) {
  if (!validWager(wager)) throw new RangeError("Invalid Blackjack wager");
  if (!deck) {
    deck = Array.from({ length: 52 }, (_, i) => i);
    for (let i = 51; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  if (
    deck.length !== 52 ||
    new Set(deck).size !== 52 ||
    deck.some((x) => !Number.isInteger(x) || x < 0 || x > 51)
  )
    throw new RangeError("Invalid deck");
  const rest = [...deck],
    player = [rest.shift()],
    dealer = [rest.shift()];
  player.push(rest.shift());
  dealer.push(rest.shift());
  const h = {
    cards: player,
    wager,
    stood: false,
    doubled: false,
    fromSplit: false,
    splitAces: false,
  };
  const s = {
    remainingDeck: rest,
    dealerCards: dealer,
    hands: [h],
    activeHandIndex: 0,
    complete: false,
  };
  if (natural(h) || dealerNatural(s)) {
    s.complete = true;
    s.activeHandIndex = -1;
  }
  return s;
}
export function can(s, action) {
  const h = s && !s.complete ? s.hands[s.activeHandIndex] : null;
  if (!h || h.stood) return false;
  if (action === "stand") return true;
  if (action === "hit") return !h.splitAces && value(h.cards).total < 21;
  if (action === "double") return !h.splitAces && h.cards.length === 2;
  if (action === "split")
    return (
      h.cards.length === 2 &&
      s.hands.length < 3 &&
      h.cards[0] % 13 === h.cards[1] % 13 &&
      !(h.cards[0] % 13 === 0 && h.fromSplit)
    );
  return false;
}
function advance(s) {
  // Preserve Kotlin traversal: next playable hand, then any remaining hand.
  const start = s.activeHandIndex;
  const playable = (h) => !h.stood && !h.splitAces && value(h.cards).total < 21;
  const next = s.hands.findIndex((h, i) => i > start && playable(h));
  if (next >= 0) {
    s.activeHandIndex = next;
    return s;
  }
  s.hands.forEach((h) => {
    if (h.splitAces || value(h.cards).total >= 21) h.stood = true;
  });
  const any = s.hands.findIndex(playable);
  if (any >= 0) {
    s.activeHandIndex = any;
    return s;
  }
  if (!s.hands.every((h) => value(h.cards).total > 21) && !dealerNatural(s))
    while (value(s.dealerCards).total < 17) {
      if (!s.remainingDeck.length) throw new RangeError("Deck exhausted");
      s.dealerCards.push(s.remainingDeck.shift());
    }
  s.complete = true;
  s.activeHandIndex = -1;
  return s;
}
export function act(before, action) {
  if (!can(before, action))
    return { success: false, state: before, additional: 0 };
  const s = clone(before),
    h = s.hands[s.activeHandIndex];
  let additional = 0;
  if (
    ((action === "hit" || action === "double") && !s.remainingDeck.length) ||
    (action === "split" && s.remainingDeck.length < 2)
  )
    return { success: false, state: before, additional: 0 };
  if (action === "hit") {
    h.cards.push(s.remainingDeck.shift());
    h.stood = value(h.cards).total >= 21;
  }
  if (action === "stand") h.stood = true;
  if (action === "double") {
    additional = h.wager;
    h.wager *= 2;
    h.cards.push(s.remainingDeck.shift());
    h.stood = true;
    h.doubled = true;
  }
  if (action === "split") {
    additional = h.wager;
    const aces = h.cards[0] % 13 === 0;
    const split = h.cards.map((id) => {
      const cards = [id, s.remainingDeck.shift()];
      return {
        cards,
        wager: h.wager,
        stood: aces || value(cards).total >= 21,
        doubled: false,
        fromSplit: true,
        splitAces: aces,
      };
    });
    s.hands.splice(s.activeHandIndex, 1, ...split);
    return {
      success: true,
      state: split[0].stood ? advance(s) : s,
      additional,
    };
  }
  return { success: true, state: advance(s), additional };
}
export function outcome(s) {
  if (!s.complete) throw new RangeError("Hand in progress");
  const d = value(s.dealerCards).total,
    dn = dealerNatural(s);
  const hands = s.hands.map((h) => {
    const p = value(h.cards).total,
      n = natural(h);
    const result =
      p > 21
        ? "BUST"
        : dn
          ? n
            ? "PUSH"
            : "LOSS"
          : n
            ? "BLACKJACK"
            : d > 21 || p > d
              ? "WIN"
              : p === d
                ? "PUSH"
                : "LOSS";
    const payout =
      result === "BLACKJACK"
        ? Math.floor((h.wager * 5) / 2)
        : result === "WIN"
          ? h.wager * 2
          : result === "PUSH"
            ? h.wager
            : 0;
    return { result, total: p, wager: h.wager, payout };
  });
  return {
    dealerTotal: d,
    hands,
    payout: hands.reduce((n, h) => n + h.payout, 0),
  };
}
export function validateRound(round) {
  try {
    const s = round?.state;
    if (
      !s ||
      !Array.isArray(s.hands) ||
      s.hands.length < 1 ||
      s.hands.length > 3 ||
      !Array.isArray(s.dealerCards) ||
      s.dealerCards.length < 2 ||
      !Array.isArray(s.remainingDeck) ||
      typeof s.complete !== "boolean" ||
      typeof round.settled !== "boolean"
    )
      return null;
    if (
      s.hands.some(
        (h) =>
          ["stood", "doubled", "fromSplit", "splitAces"].some(
            (key) => typeof h[key] !== "boolean",
          ) ||
          !Array.isArray(h.cards) ||
          h.cards.length < 2 ||
          !Number.isSafeInteger(h.wager) ||
          h.wager < 20 ||
          h.wager > 200000 ||
          h.wager % 10 !== 0,
      )
    )
      return null;
    const cards = [
      ...s.remainingDeck,
      ...s.dealerCards,
      ...s.hands.flatMap((h) => h.cards),
    ];
    if (
      cards.length !== 52 ||
      new Set(cards).size !== 52 ||
      cards.some((x) => !Number.isInteger(x) || x < 0 || x > 51)
    )
      return null;
    if (
      s.complete
        ? s.activeHandIndex !== -1
        : !Number.isInteger(s.activeHandIndex) ||
          s.activeHandIndex < 0 ||
          s.activeHandIndex >= s.hands.length ||
          s.hands[s.activeHandIndex].stood ||
          value(s.hands[s.activeHandIndex].cards).total >= 21
    )
      return null;
    if (round.settled && !s.complete) return null;
    if (s.complete && !dealerNatural(s) && !s.hands.some(natural)) {
      if (s.hands.some((h) => !h.stood && value(h.cards).total < 21))
        return null;
      if (
        !s.hands.every((h) => value(h.cards).total > 21) &&
        value(s.dealerCards).total < 17
      )
        return null;
    }
    return clone(round);
  } catch {
    return null;
  }
}
function settle(g) {
  const r = g.blackjackRound;
  if (r.state.complete && !r.settled) {
    g.casinoChips = Math.min(
      Number.MAX_SAFE_INTEGER,
      g.casinoChips + outcome(r.state).payout,
    );
    r.settled = true;
  }
}
export function start(g, wager, deck = null) {
  if (
    !validWager(wager) ||
    g.casinoChips < wager ||
    (g.blackjackRound && !g.blackjackRound.state.complete)
  )
    return false;
  const state = newRound(wager, deck);
  g.casinoChips -= wager;
  g.blackjackRound = { state, settled: false };
  settle(g);
  return true;
}
export function command(g, action) {
  const r = g.blackjackRound;
  if (!r || r.settled) return false;
  const result = act(r.state, action);
  if (!result.success || g.casinoChips < result.additional) return false;
  g.casinoChips -= result.additional;
  r.state = result.state;
  settle(g);
  return true;
}

export function recover(g) {
  const r = g.blackjackRound;
  if (!r?.state.complete || r.settled) return false;
  settle(g);
  return true;
}
