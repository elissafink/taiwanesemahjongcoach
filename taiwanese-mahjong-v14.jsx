import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// TILE DEFINITIONS
// ============================================================
const SUITS = { MAN: "man", BAM: "bam", CIRCLE: "circle" };
const WINDS = ["East", "South", "West", "North"];
const DRAGONS = ["Red", "Green", "White"];

function createTile(suit, value, id) {
  return { suit, value, id, isFlower: false };
}
function createWind(value, id) {
  return { suit: "wind", value, id, isFlower: false };
}
function createDragon(value, id) {
  return { suit: "dragon", value, id, isFlower: false };
}
function createFlower(value, id) {
  return { suit: "flower", value, id, isFlower: true };
}

function buildDeck() {
  const tiles = [];
  let id = 0;
  for (const suit of [SUITS.MAN, SUITS.BAM, SUITS.CIRCLE]) {
    for (let v = 1; v <= 9; v++) {
      for (let c = 0; c < 4; c++) tiles.push(createTile(suit, v, id++));
    }
  }
  for (const w of WINDS) {
    for (let c = 0; c < 4; c++) tiles.push(createWind(w, id++));
  }
  for (const d of DRAGONS) {
    for (let c = 0; c < 4; c++) tiles.push(createDragon(d, id++));
  }
  for (let f = 1; f <= 8; f++) tiles.push(createFlower(f, id++));
  return tiles;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// TILE DISPLAY
// ============================================================
function tileLabel(tile) {
  if (!tile) return "?";
  if (tile.isFlower) return tile.value <= 4 ? ["🌸","🌺","🌼","🌻"][tile.value-1] : ["🍃","🎋","🍂","⛄"][tile.value-5];
  if (tile.suit === "wind") return { East: "E", South: "S", West: "W", North: "N" }[tile.value];
  if (tile.suit === "dragon") return { Red: "中", Green: "發", White: "白" }[tile.value];
  const suitSymbol = { man: "万", bam: "🎍", circle: "●" }[tile.suit];
  return `${tile.value}${suitSymbol}`;
}

// Returns a two-line display: number on top, suit label on bottom
function tileParts(tile) {
  if (!tile) return { top: "?", bottom: "" };
  if (tile.isFlower) return { top: tile.value <= 4 ? ["🌸","🌺","🌼","🌻"][tile.value-1] : ["🍃","🎋","🍂","⛄"][tile.value-5], bottom: "FL" };
  if (tile.suit === "wind") return { top: { East: "E", South: "S", West: "W", North: "N" }[tile.value], bottom: "Wind" };
  if (tile.suit === "dragon") return { top: { Red: "中", Green: "發", White: "白" }[tile.value], bottom: { Red: "Red", Green: "Grn", White: "Wht" }[tile.value] };
  const suitLabel = { man: "Man", bam: "Bam", circle: "Cir" }[tile.suit];
  return { top: String(tile.value), bottom: suitLabel };
}

function tileColor(tile) {
  if (!tile) return "#888";
  if (tile.isFlower) return "#22c55e";
  if (tile.suit === "wind") return "#60a5fa";
  if (tile.suit === "dragon") {
    if (tile.value === "Red") return "#ef4444";
    if (tile.value === "Green") return "#22c55e";
    return "#e2e8f0";
  }
  if (tile.suit === "man") return "#f97316";
  if (tile.suit === "bam") return "#4ade80";
  if (tile.suit === "circle") return "#60a5fa";
  return "#e2e8f0";
}

// ============================================================
// GAME LOGIC
// ============================================================
function sortHand(hand) {
  const suitOrder = { man: 0, bam: 1, circle: 2, wind: 3, dragon: 4, flower: 5 };
  const windOrder = { East: 0, South: 1, West: 2, North: 3 };
  const dragonOrder = { Red: 0, Green: 1, White: 2 };
  return [...hand].sort((a, b) => {
    const sa = suitOrder[a.suit], sb = suitOrder[b.suit];
    if (sa !== sb) return sa - sb;
    if (a.suit === "wind") return windOrder[a.value] - windOrder[b.value];
    if (a.suit === "dragon") return dragonOrder[a.value] - dragonOrder[b.value];
    return a.value - b.value;
  });
}

function isSequence(a, b, c) {
  if (a.suit !== b.suit || b.suit !== c.suit) return false;
  if (!["man","bam","circle"].includes(a.suit)) return false;
  const vals = [a.value, b.value, c.value].sort((x,y)=>x-y);
  return vals[1] === vals[0]+1 && vals[2] === vals[1]+1;
}

function isTriplet(a, b, c) {
  return a.suit === b.suit && b.suit === c.suit && a.value === b.value && b.value === c.value;
}

function isPair(a, b) {
  return a.suit === b.suit && a.value === b.value;
}

// Check if a set of tiles can form a valid winning hand
// Returns groups if winning, null otherwise
function findWinningGroups(tiles) {
  if (tiles.length === 0) return [];
  
  // Try all possible pairs as the eye
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (isPair(tiles[i], tiles[j])) {
        const rest = tiles.filter((_, idx) => idx !== i && idx !== j);
        const groups = findSets(rest);
        if (groups !== null) {
          return [{ type: "pair", tiles: [tiles[i], tiles[j]] }, ...groups];
        }
      }
    }
  }
  return null;
}

function findSets(tiles) {
  if (tiles.length === 0) return [];
  
  // Try triplet starting with first tile
  const first = tiles[0];
  const rest = tiles.slice(1);
  
  // Find triplet
  const t1 = rest.findIndex(t => isPair(first, t));
  if (t1 !== -1) {
    const rest2 = rest.filter((_, i) => i !== t1);
    const t2 = rest2.findIndex(t => isPair(first, t));
    if (t2 !== -1) {
      const rest3 = rest2.filter((_, i) => i !== t2);
      const result = findSets(rest3);
      if (result !== null) return [{ type: "triplet", tiles: [first, rest[t1], rest2[t2]] }, ...result];
    }
  }
  
  // Try sequence
  if (["man","bam","circle"].includes(first.suit)) {
    const v2 = rest.findIndex(t => t.suit === first.suit && t.value === first.value + 1);
    if (v2 !== -1) {
      const rest2 = rest.filter((_, i) => i !== v2);
      const v3 = rest2.findIndex(t => t.suit === first.suit && t.value === first.value + 2);
      if (v3 !== -1) {
        const rest3 = rest2.filter((_, i) => i !== v3);
        const result = findSets(rest3);
        if (result !== null) return [{ type: "sequence", tiles: [first, rest[v2], rest2[v3]] }, ...result];
      }
    }
  }
  
  return null;
}

// Check all-pairs special hand
function isAllPairs(tiles) {
  if (tiles.length !== 14) return false;
  const sorted = sortHand(tiles);
  for (let i = 0; i < sorted.length; i += 2) {
    if (!isPair(sorted[i], sorted[i+1])) return false;
  }
  return true;
}

function canWin(hand, revealedSets) {
  // hand = concealed tiles (should be 14 for self-draw or 14 after claiming)
  const allTiles = hand.filter(t => !t.isFlower);
  if (allTiles.length % 3 === 2) {
    if (isAllPairs(allTiles) && allTiles.length === 14) return { win: true, type: "allPairs" };
    const groups = findWinningGroups(allTiles);
    if (groups) return { win: true, type: "normal", groups };
  }
  return { win: false };
}

// Analyze hand for coaching
function analyzeHand(hand, discardPile, revealedSets, allPlayerDiscards) {
  const playable = hand.filter(t => !t.isFlower);

  // Count suits
  const suitCount = { man: 0, bam: 0, circle: 0, wind: 0, dragon: 0 };
  playable.forEach(t => suitCount[t.suit]++);

  // ── FIND TRIPLETS (3 of same tile) ──────────────────────────────────────
  const triplets = [];
  const tripletIds = new Set();
  for (let i = 0; i < playable.length; i++) {
    for (let j = i + 1; j < playable.length; j++) {
      for (let k = j + 1; k < playable.length; k++) {
        if (isPair(playable[i], playable[j]) && isPair(playable[j], playable[k])) {
          if (!tripletIds.has(playable[i].id)) {
            triplets.push([playable[i], playable[j], playable[k]]);
            tripletIds.add(playable[i].id);
            tripletIds.add(playable[j].id);
            tripletIds.add(playable[k].id);
          }
        }
      }
    }
  }

  // ── FIND PAIRS (2 of same tile, not already in a triplet) ───────────────
  const pairs = [];
  const pairIds = new Set();
  for (let i = 0; i < playable.length; i++) {
    if (tripletIds.has(playable[i].id) || pairIds.has(playable[i].id)) continue;
    for (let j = i + 1; j < playable.length; j++) {
      if (tripletIds.has(playable[j].id) || pairIds.has(playable[j].id)) continue;
      if (isPair(playable[i], playable[j])) {
        pairs.push([playable[i], playable[j]]);
        pairIds.add(playable[i].id);
        pairIds.add(playable[j].id);
        break;
      }
    }
  }

  // ── FIND COMPLETE SEQUENCES ──────────────────────────────────────────────
  // Only consume tiles not already locked in triplets. Pairs can still contribute
  // to sequences — we'll handle the overlap carefully.
  const sequences = [];
  const sequenceIds = new Set();
  const suitTiles = {};
  playable.forEach(t => {
    if (!["man","bam","circle"].includes(t.suit)) return;
    if (!suitTiles[t.suit]) suitTiles[t.suit] = [];
    suitTiles[t.suit].push(t);
  });
  for (const suit of ["man","bam","circle"]) {
    // Exclude tiles in triplets — they're already fully committed
    const tiles = (suitTiles[suit] || []).filter(t => !tripletIds.has(t.id));
    for (let i = 0; i < tiles.length; i++) {
      if (sequenceIds.has(tiles[i].id)) continue;
      const v = tiles[i].value;
      const t2 = tiles.find(t => t.value === v + 1 && !sequenceIds.has(t.id) && t.id !== tiles[i].id);
      if (!t2) continue;
      const t3 = tiles.find(t => t.value === v + 2 && !sequenceIds.has(t.id) && t.id !== tiles[i].id && t.id !== t2.id);
      if (t3) {
        sequences.push([tiles[i], t2, t3]);
        sequenceIds.add(tiles[i].id); sequenceIds.add(t2.id); sequenceIds.add(t3.id);
      }
    }
  }

  // ── FIND PARTIAL SEQUENCES (2-tile runs needing 1 more) ─────────────────
  // Check ALL suit tiles not in triplets or complete sequences.
  // Pairs can contribute — if a tile is in a pair AND adjacent to another tile,
  // we want to know about the partial (e.g. 7-7-8: the pair 7s are noted, but
  // 8 is also connected via the second 7).
  const usedInComplete = new Set([...tripletIds, ...sequenceIds]);
  const partials = [];
  const partialIds = new Set();

  // For partial detection, work from all non-triplet, non-sequence suit tiles.
  // We deliberately include pair tiles so adjacency is detected correctly.
  const candidateTiles = playable.filter(t =>
    ["man","bam","circle"].includes(t.suit) && !usedInComplete.has(t.id)
  );

  // Sort by suit then value for stable ordering
  const sorted = [...candidateTiles].sort((a, b) =>
    a.suit < b.suit ? -1 : a.suit > b.suit ? 1 : a.value - b.value
  );

  for (let i = 0; i < sorted.length; i++) {
    if (partialIds.has(sorted[i].id)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      if (partialIds.has(sorted[j].id)) continue;
      const a = sorted[i], b = sorted[j];
      if (a.suit !== b.suit) break; // sorted by suit, no more same-suit ahead
      const diff = Math.abs(a.value - b.value);
      if (diff > 2) break; // sorted by value, no closer match coming
      if (diff === 0) continue; // same value = pair, not a sequence partial
      if (diff === 1 || diff === 2) {
        const needVals = diff === 1
          ? [Math.min(a.value,b.value)-1, Math.max(a.value,b.value)+1].filter(v=>v>=1&&v<=9)
          : [Math.min(a.value,b.value)+1];
        partials.push({ tiles: [a,b], need: needVals.map(v=>({suit:a.suit,value:v})) });
        partialIds.add(a.id); partialIds.add(b.id);
        break;
      }
    }
  }

  // ── ISOLATED: tiles with NO connections whatsoever ───────────────────────
  // A tile is truly isolated only if it is not in: triplet, pair, sequence, or partial.
  // Note: a tile in a pair that also touches a partial is NOT isolated —
  // it appears in pairIds AND potentially indirectly via the partial through its twin.
  const allUsefulIds = new Set([...tripletIds, ...pairIds, ...sequenceIds, ...partialIds]);

  // Additionally: if a tile's VALUE is within 2 of any other same-suit tile in the hand
  // (regardless of whether that other tile is "claimed"), it has sequence potential.
  // This catches the case where e.g. 8Man is adjacent to a pair of 7Mans —
  // the 8Man should not be called isolated even if the pair "consumed" both 7Mans.
  const hasSuitNeighbor = (tile) => {
    return playable.some(other =>
      other.id !== tile.id &&
      other.suit === tile.suit &&
      ["man","bam","circle"].includes(tile.suit) &&
      Math.abs(other.value - tile.value) <= 2
    );
  };

  const isolated = playable.filter(t => {
    if (allUsefulIds.has(t.id)) return false; // already accounted for
    // Even if not in any detected structure, check raw adjacency
    if (hasSuitNeighbor(t)) return false;
    return true;
  });

  // ── SAFE DISCARDS: already seen in discard pile ──────────────────────────
  const discardedTileKeys = new Set(discardPile.map(t => `${t.suit}-${t.value}`));
  const safeDiscards = isolated.filter(t => discardedTileKeys.has(`${t.suit}-${t.value}`));

  // ── BEST DISCARD RECOMMENDATION ──────────────────────────────────────────
  let bestDiscard = null;
  let reasoning = "";

  const needToDiscard = playable.length === 17 || playable.length === 16;

  if (needToDiscard) {
    if (safeDiscards.length > 0) {
      // Among safe discards, prefer honors > edges > mid
      const honorSafe = safeDiscards.find(t => t.suit === "wind" || t.suit === "dragon");
      bestDiscard = honorSafe || safeDiscards[0];
      reasoning = `${tileLabel(bestDiscard)} is isolated in your hand AND has already been discarded by others — very safe to throw.`;

    } else if (isolated.length > 0) {
      // Score each isolated tile: higher = worse (more isolated)
      const scoreIsolated = (t) => {
        let score = 0;
        if (t.suit === "wind" || t.suit === "dragon") score += 10; // honors: no sequence potential
        else if (t.value === 1 || t.value === 9) score += 5;       // edge tiles: one-sided
        else if (t.value === 2 || t.value === 8) score += 4;       // near-edge: fewer connections than mid
        else score += 3;                                            // middle: most flexible
        // Extra penalty: how far is nearest same-suit tile?
        const sameSuit = playable.filter(o => o.id !== t.id && o.suit === t.suit);
        if (sameSuit.length === 0) score += 5; // no neighbors at all
        else {
          const minDist = Math.min(...sameSuit.map(o => Math.abs(o.value - (t.value || 0))));
          if (minDist >= 3) score += 4; // nearest tile is 3+ away — truly isolated
          else if (minDist === 2) score += 1;
        }
        return score;
      };

      isolated.sort((a, b) => scoreIsolated(b) - scoreIsolated(a));
      bestDiscard = isolated[0];

      if (bestDiscard.suit === "wind" || bestDiscard.suit === "dragon") {
        reasoning = `${tileLabel(bestDiscard)} is isolated — no pair, triplet, or sequence connections. Honor tiles can only form triplets, not sequences, making them risky to hold without a pair.`;
      } else if (bestDiscard.value === 1 || bestDiscard.value === 9) {
        reasoning = `${tileLabel(bestDiscard)} is an isolated edge tile with no useful neighbors. Ones and nines connect on only one side, so they're harder to complete than middle tiles.`;
      } else {
        reasoning = `${tileLabel(bestDiscard)} has no useful connections — its nearest same-suit tile is too far away to form a sequence or pair. Shed it to improve your hand shape.`;
      }

    } else if (partials.length > 0) {
      // Score partials by weakness: prefer to break dead ones, then edge-heavy ones
      const scorePartial = (p) => {
        let score = 0;
        // Dead partial: needed tile fully gone from the game
        const isDead = p.need.every(n => {
          const key = `${n.suit}-${n.value}`;
          return discardPile.filter(d => `${d.suit}-${d.value}` === key).length >= 4;
        });
        if (isDead) score += 20;
        // Gap partial (diff 2) is weaker than connected (diff 1)
        const diff = Math.abs(p.tiles[0].value - p.tiles[1].value);
        if (diff === 2) score += 3;
        // Edge tiles in the partial are weaker
        const hasEdge = p.tiles.some(t => t.value === 1 || t.value === 9);
        if (hasEdge) score += 2;
        return score;
      };

      const ranked = [...partials].sort((a, b) => scorePartial(b) - scorePartial(a));
      const weakest = ranked[0];
      const isDead = weakest.need.every(n =>
        discardPile.filter(d => `${d.suit}-${d.value}` === `${n.suit}-${n.value}`).length >= 4
      );

      // From the weakest partial, pick the tile that is less useful elsewhere
      // Prefer the tile with fewer same-suit neighbors across the whole hand
      const [ta, tb] = weakest.tiles;
      const neighborsA = playable.filter(o => o.id !== ta.id && o.suit === ta.suit && Math.abs(o.value - ta.value) <= 2).length;
      const neighborsB = playable.filter(o => o.id !== tb.id && o.suit === tb.suit && Math.abs(o.value - tb.value) <= 2).length;
      bestDiscard = neighborsA <= neighborsB ? ta : tb;

      if (isDead) {
        reasoning = `${tileLabel(bestDiscard)}'s sequence completion tile has been fully discarded — that run is dead. Break this partial and keep stronger connections.`;
      } else if (Math.abs(weakest.tiles[0].value - weakest.tiles[1].value) === 2) {
        reasoning = `${tileLabel(bestDiscard)} is part of a gap sequence (needs the middle tile). Gap waits are harder to fill than connected pairs. Consider breaking this partial if you have a stronger path.`;
      } else {
        reasoning = `${tileLabel(bestDiscard)} is in your weakest partial sequence. Your hand has decent shape overall — this is a judgment call about which suit to commit to.`;
      }

    } else if (pairs.length > 0 && triplets.length === 0) {
      const honorPair = pairs.find(p => p[0].suit === "wind" || p[0].suit === "dragon");
      if (honorPair) {
        bestDiscard = honorPair[0];
        reasoning = `Your hand is well-connected. If you need to release a tile, consider breaking the ${tileLabel(honorPair[0])} pair — honor pairs are worth less than suit sequences toward a faster win, unless you're building toward All Triplets.`;
      } else {
        reasoning = "Your hand has excellent shape! Every tile is connected. Focus on which suit you're closest to completing and discard from your weakest run.";
        bestDiscard = null;
      }
    } else {
      reasoning = "Strong hand! Your tiles form solid sets. Draw and keep building — you're in good shape.";
      bestDiscard = null;
    }
  }

  return {
    pairs,
    triplets,
    partials,
    sequences,
    isolated,
    safeDiscards,
    bestDiscard,
    reasoning,
    handType: "mixed",
    suitCount,
    revealedCount: revealedSets.length,
    needToDiscard,
  };
}

// AI discard logic
function aiDiscard(hand) {
  const playable = hand.filter(t => !t.isFlower);
  const analysis = analyzeHand(playable, [], [], []);
  if (analysis.bestDiscard) return analysis.bestDiscard;
  
  // Fallback: discard first isolated or honor tile
  const honor = playable.find(t => t.suit === "wind" || t.suit === "dragon");
  if (honor) return honor;
  return playable[Math.floor(Math.random() * playable.length)];
}

// Check if AI can claim a discard
function aiCanClaim(hand, discardedTile) {
  const playable = hand.filter(t => !t.isFlower);
  
  // Check pong
  const matches = playable.filter(t => isPair(t, discardedTile));
  if (matches.length >= 2) return { type: "pong", tiles: [matches[0], matches[1], discardedTile] };
  
  // Check chow (sequence)
  if (["man","bam","circle"].includes(discardedTile.suit)) {
    const v = discardedTile.value;
    const suitTiles = playable.filter(t => t.suit === discardedTile.suit);
    // v-2, v-1
    const m2 = suitTiles.find(t => t.value === v-2);
    const m1 = suitTiles.find(t => t.value === v-1);
    const p1 = suitTiles.find(t => t.value === v+1);
    const p2 = suitTiles.find(t => t.value === v+2);
    if (m2 && m1) return { type: "chow", tiles: [m2, m1, discardedTile] };
    if (m1 && p1) return { type: "chow", tiles: [m1, discardedTile, p1] };
    if (p1 && p2) return { type: "chow", tiles: [discardedTile, p1, p2] };
  }
  
  return null;
}

// Check if player can win with a specific tile
function canWinWithTile(hand, tile) {
  const testHand = [...hand.filter(t => !t.isFlower), tile];
  return canWin(testHand, []);
}

// ============================================================
// INITIAL GAME STATE
// ============================================================
function initGame() {
  let deck = shuffle(buildDeck());
  const flowers = [];
  const deadWall = [];
  
  // Separate flowers for dead wall
  const mainDeck = deck.filter(t => !t.isFlower);
  const flowerTiles = deck.filter(t => t.isFlower);
  deck = shuffle([...mainDeck, ...flowerTiles]);
  
  // Deal 16 tiles to each player
  const hands = [[], [], [], []];
  const allDealt = deck.splice(0, 64);
  for (let i = 0; i < 64; i++) hands[i % 4].push(allDealt[i]);
  
  // Replace flowers
  const remainingDeck = deck;
  for (let p = 0; p < 4; p++) {
    const flrs = hands[p].filter(t => t.isFlower);
    hands[p] = hands[p].filter(t => !t.isFlower);
    for (const f of flrs) {
      if (remainingDeck.length > 0) {
        let replacement = remainingDeck.shift();
        while (replacement.isFlower && remainingDeck.length > 0) {
          flowers.push(replacement);
          replacement = remainingDeck.shift();
        }
        if (!replacement.isFlower) hands[p].push(replacement);
        else flowers.push(replacement);
      }
      flowers.push(f);
    }
  }
  
  // Sort player hand
  hands[0] = sortHand(hands[0]);
  
  return {
    phase: "playing",
    deck: remainingDeck,
    hands,
    revealed: [[], [], [], []], // revealed sets per player
    flowers: [[], [], [], []],  // flowers per player
    discardPiles: [[], [], [], []], // each player's discards
    discardPile: [], // combined visible discards
    currentPlayer: 0,
    drawnTile: null,
    waitingForDiscard: true, // player 0 starts with 16 tiles, needs to discard 1 first? 
    // Actually in TW mahjong dealer gets 17, others 16. Let's give player 0 (dealer) one extra draw
    lastDiscard: null,
    lastDiscardPlayer: null,
    gameLog: ["Game started! You are the Dealer (East). You have 16 tiles. Draw a tile to begin."],
    winner: null,
    winInfo: null,
    roundWind: "East",
    playerWinds: ["East", "South", "West", "North"],
    claimOptions: null, // { discardedTile, options: [{type, tiles}] }
    aiThinking: false,
    turn: 0,
  };
}

// ============================================================
// TILE COMPONENT
// ============================================================
function TileComponent({ tile, selected, onClick, small, faceDown, dimmed }) {
  if (!tile) return null;
  const { top, bottom } = faceDown ? { top: "", bottom: "" } : tileParts(tile);
  const color = faceDown ? "#4a5568" : tileColor(tile);
  
  const size = small
    ? { w: 34, h: 46, topFont: 13, bottomFont: 8 }
    : { w: 50, h: 66, topFont: 20, bottomFont: 10 };

  return (
    <div
      onClick={onClick}
      style={{
        width: size.w,
        height: size.h,
        background: faceDown
          ? "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)"
          : selected
            ? "linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)"
            : "linear-gradient(135deg, #fdfcf7 0%, #f0ead8 100%)",
        border: selected ? "2px solid #f59e0b" : faceDown ? "1px solid #4a5568" : "1px solid #c8b890",
        borderRadius: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        color: faceDown ? "#4a5568" : color,
        fontWeight: "bold",
        boxShadow: selected
          ? "0 0 10px rgba(245,158,11,0.6), 0 3px 6px rgba(0,0,0,0.3)"
          : "0 2px 4px rgba(0,0,0,0.3)",
        transform: selected ? "translateY(-8px)" : "none",
        opacity: dimmed ? 0.45 : 1,
        transition: "all 0.15s ease",
        flexShrink: 0,
        userSelect: "none",
        textAlign: "center",
        lineHeight: 1,
        padding: "3px 2px 2px",
        backgroundImage: faceDown
          ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)"
          : "none",
        gap: 1,
      }}
    >
      {/* Big number / symbol on top */}
      <div style={{ fontSize: size.topFont, fontFamily: "Georgia, serif", lineHeight: 1 }}>
        {top}
      </div>
      {/* Suit label on bottom */}
      {!faceDown && bottom && (
        <div style={{
          fontSize: size.bottomFont,
          fontFamily: "Arial, sans-serif",
          fontWeight: "600",
          letterSpacing: 0.3,
          color: color,
          opacity: 0.85,
          lineHeight: 1,
        }}>
          {bottom}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CHOW PICKER HELPERS
// ============================================================
// Find all valid chow combinations the player can make with a given discarded tile
function findChowOptions(hand, discardedTile) {
  if (!["man","bam","circle"].includes(discardedTile.suit)) return [];
  const playable = hand.filter(t => !t.isFlower && t.suit === discardedTile.suit);
  const v = discardedTile.value;
  const options = [];

  // Pattern 1: discard is the HIGH tile  → need v-2, v-1
  const lo2 = playable.find(t => t.value === v - 2);
  const lo1 = playable.find(t => t.value === v - 1);
  if (lo2 && lo1) options.push([lo2, lo1, discardedTile]);

  // Pattern 2: discard is the MIDDLE tile → need v-1, v+1
  const mid_lo = playable.find(t => t.value === v - 1);
  const mid_hi = playable.find(t => t.value === v + 1);
  if (mid_lo && mid_hi) options.push([mid_lo, discardedTile, mid_hi]);

  // Pattern 3: discard is the LOW tile   → need v+1, v+2
  const hi1 = playable.find(t => t.value === v + 1);
  const hi2 = playable.find(t => t.value === v + 2);
  if (hi1 && hi2) options.push([discardedTile, hi1, hi2]);

  // Deduplicate by tile-id sets
  const seen = new Set();
  return options.filter(opt => {
    const key = opt.map(t=>t.id).sort().join(',');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

// ============================================================
// MAIN APP
// ============================================================
export default function MahjongApp() {
  const [game, setGame] = useState(() => initGame());
  const [selectedTile, setSelectedTile] = useState(null);
  const [coaching, setCoaching] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [mobileTab, setMobileTab] = useState("game");
  const [undoStack, setUndoStack] = useState([]);
  const [chowPicker, setChowPicker] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const chatEndRef = useRef(null);

  const aiTimerRef = useRef(null);

  // ── CHAT: send a question to AI with full game context ──────────────────
  const sendChatMessage = async (question) => {
    if (!question.trim()) return;
    const userMsg = { role: "user", text: question.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    // Build a rich game context string for the AI
    const { hands, revealed, discardPile, discardPiles, playerWinds, flowers } = game;
    const myHand = hands[0].filter(t => !t.isFlower).map(t => tileLabel(t)).join(", ");
    const myRevealed = revealed[0].map(s => `${s.type.toUpperCase()}(${s.tiles.map(t=>tileLabel(t)).join("-")})`).join(", ") || "none";
    const myFlowers = flowers[0].map(t => tileLabel(t)).join(", ") || "none";
    const centerDiscards = discardPile.slice(-30).map(t => tileLabel(t)).join(", ") || "none";
    const opponentInfo = [1,2,3].map(p => {
      const exposed = revealed[p].map(s => `${s.type.toUpperCase()}(${s.tiles.map(t=>tileLabel(t)).join("-")})`).join(", ") || "none";
      const discards = discardPiles[p].map(t => tileLabel(t)).join(", ") || "none";
      return `  ${playerWinds[p]}: exposed sets: ${exposed} | discards: ${discards}`;
    }).join("\n");

    const systemPrompt = `You are an expert Taiwanese Mahjong coach. Answer the player's question concisely and clearly. Always base your advice on the actual tile information provided.

CURRENT GAME STATE:
- My concealed hand: ${myHand}
- My exposed sets: ${myRevealed}
- My flowers: ${myFlowers}
- Recent discards (center pile): ${centerDiscards}
- Opponents:
${opponentInfo}

Tile notation: number + suit abbreviation (e.g. "7MAN" = 7 of Characters, "3BAM" = 3 of Bamboo, "5CIR" = 5 of Circles, "E" = East wind, "中" = Red Dragon, etc.)
Rules: Need 4 sets (sequences of 3 consecutive same-suit OR triplets of 3 identical) + 1 pair to win. Special hand: 7 pairs. Chow = claim a sequence from any player. Pong = claim a triplet from any player.

Give specific, actionable advice. Keep responses under 150 words.`;

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: "user", content: question.trim() }],
        }),
      });
      const data = await resp.json();
      console.log("API response status:", resp.status);
      console.log("API response data:", JSON.stringify(data, null, 2));
      if (!resp.ok) {
        const errMsg = data?.error?.message || `HTTP ${resp.status}`;
        setChatMessages(prev => [...prev, { role: "coach", text: `API error: ${errMsg}` }]);
      } else {
        const reply = data.content?.[0]?.text || "Sorry, I couldn't get a response. Try again.";
        setChatMessages(prev => [...prev, { role: "coach", text: reply }]);
      }
    } catch (e) {
      console.error("Chat fetch error:", e);
      setChatMessages(prev => [...prev, { role: "coach", text: `Network error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper: push current state onto undo stack (max 8)
  const pushUndo = useCallback((gameSnapshot, selSnapshot) => {
    setUndoStack(prev => [...prev.slice(-7), { game: gameSnapshot, selectedTile: selSnapshot }]);
  }, []);

  // Undo handler
  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      setGame(snapshot.game);
      setSelectedTile(snapshot.selectedTile);
      setChowPicker(null);
      return prev.slice(0, -1);
    });
  }, []);

  // Coaching update — fires after draw (drawnTileId non-null) to give discard advice.
  // Does NOT clear when drawnTileId becomes null — keeps last advice visible until next draw.
  const handSize = game.hands[0].length;
  const drawnTileId = game.drawnTile ? game.drawnTile.id : null;
  useEffect(() => {
    if (game.phase === "playing" && game.currentPlayer === 0 && drawnTileId !== null) {
      const analysis = analyzeHand(
        game.hands[0],
        game.discardPile,
        game.revealed[0],
        game.discardPiles
      );
      setCoaching(analysis);
    }
    // Deliberately NOT clearing coaching when drawnTileId is null —
    // we want the last advice to remain visible between turns.
  }, [game.currentPlayer, handSize, drawnTileId, game.phase]);

  // Claim advice — computed inline when claimOptions exist
  const claimAdvice = (() => {
    if (!game.claimOptions) return null;
    const { discardedTile, options } = game.claimOptions;
    const hand = game.hands[0];
    const hasWin = options.some(o => o.type === "win");
    const hasPong = options.some(o => o.type === "pong");
    const hasChow = options.some(o => o.type === "chow");

    if (hasWin) return { recommendation: "win", reason: `You can win right now by claiming ${tileLabel(discardedTile)}! Declare Mahjong! 🏆` };

    // How many pongs do we already have revealed?
    const existingPongs = game.revealed[0].filter(s => s.type === "pong").length;
    // Is the tile an honor (wind/dragon)? Honors can't form sequences, so pong is the only option
    const isHonor = discardedTile.suit === "wind" || discardedTile.suit === "dragon";
    // How many of this tile in hand already?
    const matchesInHand = hand.filter(t => isPair(t, discardedTile)).length;

    if (hasPong && !hasChow) {
      // Only pong available
      const pairCount = hand.filter((t,i,arr) => arr.findIndex(t2=>isPair(t,t2)&&t2.id!==t.id)>i).length;
      if (existingPongs >= 2) {
        return { recommendation: "pong", reason: `PONG ${tileLabel(discardedTile)}. You're building an all-triplets hand — keep the triplets coming!` };
      }
      return { recommendation: "pong", reason: `PONG ${tileLabel(discardedTile)} to claim a triplet. This exposes your hand but locks in a completed set.` };
    }

    if (hasChow && !hasPong) {
      // Only chow available — check how good it is
      const chowOpts = findChowOptions(hand, discardedTile);
      const bestChow = chowOpts[0];
      return { recommendation: "chow", reason: `CHOW ${tileLabel(discardedTile)} to complete a sequence (${bestChow ? bestChow.map(t=>tileLabel(t)).join("-") : "sequence"}). This skips a draw but locks your turn order. Skip if you're close to winning without it.` };
    }

    if (hasPong && hasChow) {
      // Both available — give a nuanced recommendation
      const chowOpts = findChowOptions(hand, discardedTile);
      // Count sequences vs triplets in hand to determine strategy
      const handAnalysis = analyzeHand(hand, game.discardPile, game.revealed[0], game.discardPiles);
      const sequenceLeaning = handAnalysis.partials.length > handAnalysis.pairs.length;

      if (isHonor) {
        return { recommendation: "pong", reason: `PONG ${tileLabel(discardedTile)}. Honor tiles can't form sequences, so Pong is the stronger claim here. It completes a full set immediately.` };
      }
      if (existingPongs >= 2) {
        return { recommendation: "pong", reason: `PONG ${tileLabel(discardedTile)}. You're already triplet-heavy — stay consistent and build toward All Triplets (對對胡).` };
      }
      if (sequenceLeaning) {
        const bestChow = chowOpts[0];
        return { recommendation: "chow", reason: `CHOW ${tileLabel(discardedTile)} (${bestChow ? bestChow.map(t=>tileLabel(t)).join("-") : "sequence"}). Your hand leans toward sequences. Chow completes a run and keeps your strategy consistent. Only Pong if you want to pivot to triplets.` };
      }
      return { recommendation: "pong", reason: `PONG ${tileLabel(discardedTile)}. Your hand has good pair potential. Pong locks in a complete set immediately versus Chow which only builds a partial run.` };
    }

    return null;
  })();

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // AI turn handler
  useEffect(() => {
    if (game.phase !== "playing") return;
    if (game.currentPlayer === 0) return;
    if (game.claimOptions) return;
    if (game.winner) return;

    aiTimerRef.current = setTimeout(() => {
      handleAITurn();
    }, 1200);

    return () => clearTimeout(aiTimerRef.current);
  }, [game.currentPlayer, game.phase, game.claimOptions]);

  const handleAITurn = useCallback(() => {
    setGame(prev => {
      if (prev.currentPlayer === 0) return prev;
      const p = prev.currentPlayer;
      const newGame = { ...prev, hands: prev.hands.map(h=>[...h]), discardPiles: prev.discardPiles.map(d=>[...d]), revealed: prev.revealed.map(r=>[...r]) };

      if (newGame.deck.length === 0) {
        return { ...newGame, phase: "draw", gameLog: [...newGame.gameLog, "The wall is exhausted! Draw game."] };
      }

      let drawn = newGame.deck.shift();
      while (drawn.isFlower && newGame.deck.length > 0) {
        newGame.flowers[p].push(drawn);
        drawn = newGame.deck.shift();
      }

      if (!drawn.isFlower) {
        newGame.hands[p].push(drawn);

        const winCheck = canWin(newGame.hands[p].filter(t=>!t.isFlower), newGame.revealed[p]);
        if (winCheck.win) {
          return { ...newGame, winner: p, winInfo: winCheck, phase: "won", gameLog: [...newGame.gameLog, `Player ${p+1} (${newGame.playerWinds[p]}) wins by self-draw! 🎉`] };
        }

        const discard = aiDiscard(newGame.hands[p]);
        newGame.hands[p] = newGame.hands[p].filter(t => t.id !== discard.id);
        newGame.discardPiles[p].push(discard);
        newGame.discardPile = [...newGame.discardPile, discard];
        newGame.lastDiscard = discard;
        newGame.lastDiscardPlayer = p;

        const log = `${newGame.playerWinds[p]} discards ${tileLabel(discard)}`;
        newGame.gameLog = [...newGame.gameLog.slice(-20), log];

        // Check if player 0 can claim
        const playerCanChow = findChowOptions(newGame.hands[0], discard).length > 0;
        const playerCanPong = newGame.hands[0].filter(t => isPair(t, discard)).length >= 2;
        const playerWin = canWinWithTile(newGame.hands[0], discard);

        const claimOpts = [];
        if (playerCanPong) claimOpts.push({ type: "pong" });
        if (playerCanChow) claimOpts.push({ type: "chow" });
        if (playerWin.win) claimOpts.push({ type: "win", tiles: [discard] });

        if (claimOpts.length > 0) {
          newGame.claimOptions = { discardedTile: discard, fromPlayer: p, options: claimOpts };
          newGame.currentPlayer = 0;
        } else {
          newGame.currentPlayer = (p + 1) % 4;
        }
      }

      return newGame;
    });
  }, []);

  function checkPlayerClaim(hand, tile) {
    return aiCanClaim(hand, tile);
  }

  // Player draws a tile
  const handleDraw = useCallback(() => {
    setGame(prev => {
      if (prev.currentPlayer !== 0) return prev;
      if (prev.drawnTile) return prev;
      if (prev.deck.length === 0) return { ...prev, phase: "draw" };

      // Snapshot for undo BEFORE the draw
      pushUndo(prev, selectedTile);

      let drawn = prev.deck[0];
      const newDeck = prev.deck.slice(1);
      let flowers = [...prev.flowers[0]];

      while (drawn && drawn.isFlower) {
        flowers.push(drawn);
        drawn = newDeck.shift();
      }

      const newHand = drawn ? [...prev.hands[0], drawn] : [...prev.hands[0]];
      const winCheck = drawn ? canWinWithTile(prev.hands[0], drawn) : { win: false };
      const log = drawn
        ? `You drew ${tileLabel(drawn)}${winCheck.win ? " — You can win! 🎉" : ""}`
        : "No tiles left!";

      return {
        ...prev,
        deck: newDeck,
        drawnTile: drawn || null,
        hands: prev.hands.map((h, i) => i === 0 ? newHand : h),
        flowers: prev.flowers.map((f, i) => i === 0 ? flowers : f),
        gameLog: [...prev.gameLog.slice(-20), log],
      };
    });
    setSelectedTile(null);
  }, [pushUndo, selectedTile]);

  // Player discards a tile
  const handleDiscard = useCallback((tile) => {
    setGame(prev => {
      if (prev.currentPlayer !== 0) return prev;

      // Snapshot for undo BEFORE the discard
      pushUndo(prev, selectedTile);

      const newHand = prev.hands[0].filter(t => t.id !== tile.id);
      const newDiscards = [...prev.discardPiles[0], tile];
      const newDiscardPile = [...prev.discardPile, tile];

      for (let p = 1; p < 4; p++) {
        const winCheck = canWinWithTile(prev.hands[p], tile);
        const claim = aiCanClaim(prev.hands[p], tile);

        if (winCheck.win) {
          return {
            ...prev,
            hands: prev.hands.map((h,i) => i===0 ? newHand : h),
            discardPiles: prev.discardPiles.map((d,i) => i===0 ? newDiscards : d),
            discardPile: newDiscardPile,
            winner: p,
            phase: "won",
            gameLog: [...prev.gameLog.slice(-20), `You discarded ${tileLabel(tile)}. Player ${p+1} (${prev.playerWinds[p]}) wins on your discard! 😱`]
          };
        }

        if (claim && Math.random() > 0.4) {
          const aiHand = prev.hands[p].filter(t => !claim.tiles.slice(0,2).some(ct => ct.id === t.id));
          const discard = aiDiscard(aiHand);
          const finalHand = aiHand.filter(t => t.id !== discard.id);
          const newRevealed = [...prev.revealed[p], { type: claim.type, tiles: claim.tiles }];
          const aiDiscards = [...prev.discardPiles[p], discard];

          return {
            ...prev,
            hands: prev.hands.map((h,i) => i===0 ? newHand : i===p ? finalHand : h),
            revealed: prev.revealed.map((r,i) => i===p ? newRevealed : r),
            discardPiles: prev.discardPiles.map((d,i) => i===0 ? newDiscards : i===p ? aiDiscards : d),
            discardPile: [...newDiscardPile, discard],
            lastDiscard: discard,
            lastDiscardPlayer: p,
            drawnTile: null,
            currentPlayer: (p+1) % 4,
            gameLog: [...prev.gameLog.slice(-20), `You discarded ${tileLabel(tile)}. ${prev.playerWinds[p]} claims ${claim.type.toUpperCase()} and discards ${tileLabel(discard)}.`]
          };
        }
      }

      return {
        ...prev,
        hands: prev.hands.map((h, i) => i === 0 ? newHand : h),
        discardPiles: prev.discardPiles.map((d, i) => i === 0 ? newDiscards : d),
        discardPile: newDiscardPile,
        lastDiscard: tile,
        lastDiscardPlayer: 0,
        drawnTile: null,
        currentPlayer: 1,
        gameLog: [...prev.gameLog.slice(-20), `You discarded ${tileLabel(tile)}`],
        claimOptions: null,
      };
    });
    setSelectedTile(null);
  }, [pushUndo, selectedTile]);

  // Player clicks a claim button (Pong / Chow / Win / Skip)
  const handleClaim = useCallback((option) => {
    if (!game.claimOptions) return;
    const { discardedTile, fromPlayer } = game.claimOptions;

    if (option.type === "skip") {
      pushUndo(game, selectedTile);
      setGame(prev => ({
        ...prev,
        claimOptions: null,
        currentPlayer: (fromPlayer + 1) % 4 === 0 ? 1 : (fromPlayer + 1) % 4,
      }));
      setSelectedTile(null);
      return;
    }

    if (option.type === "win") {
      pushUndo(game, selectedTile);
      setGame(prev => ({
        ...prev,
        claimOptions: null,
        winner: 0,
        phase: "won",
        hands: prev.hands.map((h,i) => i===0 ? [...h, discardedTile] : h),
        gameLog: [...prev.gameLog.slice(-20), `You win by claiming ${tileLabel(discardedTile)}! 🎉`]
      }));
      setSelectedTile(null);
      return;
    }

    if (option.type === "pong") {
      pushUndo(game, selectedTile);
      // Auto-select the two matching tiles for pong
      const matches = game.hands[0].filter(t => isPair(t, discardedTile));
      const pongTiles = [matches[0], matches[1], discardedTile];
      const tilesToRemove = [matches[0], matches[1]];
      setGame(prev => {
        const newHand = prev.hands[0].filter(t => !tilesToRemove.some(r => r.id === t.id));
        return {
          ...prev,
          hands: prev.hands.map((h,i) => i===0 ? newHand : h),
          revealed: prev.revealed.map((r,i) => i===0 ? [...r, { type: "pong", tiles: pongTiles }] : r),
          claimOptions: null,
          drawnTile: discardedTile,
          currentPlayer: 0,
          gameLog: [...prev.gameLog.slice(-20), `You PONG ${tileLabel(discardedTile)}! Now discard a tile.`]
        };
      });
      setSelectedTile(null);
      return;
    }

    if (option.type === "chow") {
      // Show the chow picker instead of immediately claiming
      const chowOptions = findChowOptions(game.hands[0], discardedTile);
      if (chowOptions.length === 1) {
        // Only one valid chow — confirm and complete automatically
        pushUndo(game, selectedTile);
        const chosenTiles = chowOptions[0];
        const tilesToRemove = chosenTiles.filter(t => t.id !== discardedTile.id);
        setGame(prev => {
          const newHand = prev.hands[0].filter(t => !tilesToRemove.some(r => r.id === t.id));
          return {
            ...prev,
            hands: prev.hands.map((h,i) => i===0 ? newHand : h),
            revealed: prev.revealed.map((r,i) => i===0 ? [...r, { type: "chow", tiles: chosenTiles }] : r),
            claimOptions: null,
            drawnTile: discardedTile,
            currentPlayer: 0,
            gameLog: [...prev.gameLog.slice(-20), `You CHOW ${tileLabel(discardedTile)}! Now discard a tile.`]
          };
        });
        setSelectedTile(null);
      } else {
        // Multiple chow options — show picker
        setChowPicker({ discardedTile, fromPlayer, chowOptions, canWin: game.claimOptions.options.some(o=>o.type==="win") });
        setGame(prev => ({ ...prev, claimOptions: null }));
      }
      return;
    }
  }, [game, selectedTile, pushUndo]);

  // Player selects a specific chow combination from the picker
  const handleChowPick = useCallback((chosenTiles) => {
    if (!chowPicker) return;
    const { discardedTile } = chowPicker;
    pushUndo(game, selectedTile);
    const tilesToRemove = chosenTiles.filter(t => t.id !== discardedTile.id);
    setGame(prev => {
      const newHand = prev.hands[0].filter(t => !tilesToRemove.some(r => r.id === t.id));
      return {
        ...prev,
        hands: prev.hands.map((h,i) => i===0 ? newHand : h),
        revealed: prev.revealed.map((r,i) => i===0 ? [...r, { type: "chow", tiles: chosenTiles }] : r),
        claimOptions: null,
        drawnTile: discardedTile,
        currentPlayer: 0,
        gameLog: [...prev.gameLog.slice(-20), `You CHOW ${tileLabel(discardedTile)}! Now discard a tile.`]
      };
    });
    setChowPicker(null);
    setSelectedTile(null);
  }, [chowPicker, game, selectedTile, pushUndo]);

  const handleWin = useCallback(() => {
    pushUndo(game, selectedTile);
    setGame(prev => ({
      ...prev,
      winner: 0,
      phase: "won",
      gameLog: [...prev.gameLog.slice(-20), "You declare a winning hand! 🎉"]
    }));
  }, [game, selectedTile, pushUndo]);

  const newGame = useCallback(() => {
    setGame(initGame());
    setSelectedTile(null);
    setCoaching(null);
    setUndoStack([]);
    setChowPicker(null);
  }, []);
  
  const { hands, deck, discardPile, discardPiles, revealed, flowers, currentPlayer, drawnTile, lastDiscard, gameLog, winner, phase, playerWinds, claimOptions } = game;
  const playerHand = sortHand(hands[0]);
  const isMyTurn = currentPlayer === 0;

  // Check if player can win with drawn tile
  const canWinNow = drawnTile && canWin(playerHand.filter(t => !t.isFlower), revealed[0]).win;

  // ── CHOW PICKER MODAL ───────────────────────────────────────────────────
  const ChowPickerUI = () => {
    if (!chowPicker) return null;
    const { discardedTile, chowOptions } = chowPicker;
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 90,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}>
        <div style={{
          background: "#0d2030",
          border: "1px solid #d4a843",
          borderRadius: 10,
          padding: "20px 24px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 0 40px rgba(212,168,67,0.2)",
        }}>
          <div style={{ fontFamily: "'Cinzel', serif", color: "#d4a843", fontSize: 14, marginBottom: 6, letterSpacing: 1 }}>
            CHOW — CHOOSE YOUR SEQUENCE
          </div>
          <div style={{ fontSize: 12, color: "#8a7a5a", marginBottom: 16, lineHeight: 1.6 }}>
            The discarded tile is <span style={{ color: tileColor(discardedTile), fontWeight: "bold" }}>{tileLabel(discardedTile)}</span>.
            Pick which sequence to form:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {chowOptions.map((combo, i) => (
              <button
                key={i}
                onClick={() => handleChowPick(combo)}
                style={{
                  background: "rgba(212,168,67,0.08)",
                  border: "1px solid rgba(212,168,67,0.3)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(212,168,67,0.18)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(212,168,67,0.08)"}
              >
                <div style={{ display: "flex", gap: 4 }}>
                  {combo.map((t, ti) => (
                    <div key={ti} style={{ position: "relative" }}>
                      <TileComponent tile={t} small />
                      {t.id === discardedTile.id && (
                        <div style={{
                          position: "absolute", top: -4, right: -4,
                          background: "#d4a843", color: "#000",
                          borderRadius: "50%", width: 12, height: 12,
                          fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: "bold",
                        }}>★</div>
                      )}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: "#8a7a5a" }}>
                  {combo.map(t => tileLabel(t)).join(" · ")}
                </span>
              </button>
            ))}
          </div>
          <button
            className="btn-outline"
            onClick={() => {
              setChowPicker(null);
              setGame(prev => ({ ...prev, claimOptions: { discardedTile: chowPicker.discardedTile, fromPlayer: chowPicker.fromPlayer, options: [{ type: "chow" }, ...(chowPicker.canWin ? [{ type: "win", tiles: [chowPicker.discardedTile] }] : [])] } }));
            }}
            style={{ marginTop: 14, fontSize: 11, width: "100%" }}
          >
            ← Cancel (go back to claim options)
          </button>
        </div>
      </div>
    );
  };

  const COLORS = {
    bg: "#0a1628",
    table: "#0d2418",
    felt: "#0f3020",
    border: "#1a4530",
    gold: "#d4a843",
    goldLight: "#f0c060",
    text: "#e8dcc8",
    textMuted: "#8a7a5a",
    panel: "#071020",
    accent: "#c8a030",
  };

  const opponentLabels = ["You (East)", "South (AI)", "West (AI)", "North (AI)"];

  // ── COACHING PANEL (shared between mobile/desktop) ──────────────────────
  const CoachPanel = () => (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── CLAIM ADVICE (Pong / Chow decision) ── shown when opponent discards */}
      {claimAdvice && (
        <div style={{
          background: claimAdvice.recommendation === "win" ? "rgba(220,38,38,0.15)" : "rgba(30,58,138,0.2)",
          border: `1px solid ${claimAdvice.recommendation === "win" ? "#ef4444" : "#3b6ea0"}`,
          borderRadius: 6, padding: "10px 12px"
        }}>
          <div style={{ fontSize: 11, color: claimAdvice.recommendation === "win" ? "#ef4444" : "#93c5fd", fontFamily: "'Cinzel', serif", marginBottom: 6, letterSpacing: 0.5 }}>
            {claimAdvice.recommendation === "win" ? "🏆 COACH SAYS: WIN!" : claimAdvice.recommendation === "pong" ? "🎯 COACH SAYS: PONG" : "🎯 COACH SAYS: CHOW"}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>{claimAdvice.reason}</div>
        </div>
      )}

      {/* ── WAITING FOR DRAW — only shown before first analysis ever runs ── */}
      {!claimAdvice && !coaching && isMyTurn && !drawnTile && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>🀄</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>Draw a tile to get discard advice.</div>
        </div>
      )}

      {/* ── DISCARD ADVICE + HAND STRUCTURE — shown whenever coaching data exists ── */}
      {coaching && (
        <>
          {/* Status label — changes based on current game state */}
          <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'Cinzel', serif", letterSpacing: 0.5, textAlign: "center" }}>
            {isMyTurn && drawnTile ? "YOUR TURN — DISCARD ADVICE" : isMyTurn ? "YOUR TURN — LAST ANALYSIS" : "LAST ANALYSIS"}
          </div>

          {coaching.bestDiscard ? (
            <div style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: COLORS.gold, fontFamily: "'Cinzel', serif", marginBottom: 6, letterSpacing: 0.5 }}>RECOMMENDED DISCARD</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <TileComponent tile={coaching.bestDiscard} small />
                <div style={{ fontSize: 14, fontWeight: "bold", color: tileColor(coaching.bestDiscard) }}>{tileLabel(coaching.bestDiscard)}</div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>{coaching.reasoning}</div>
            </div>
          ) : coaching.reasoning ? (
            <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "#22c55e", fontFamily: "'Cinzel', serif", marginBottom: 6, letterSpacing: 0.5 }}>HAND STATUS</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>{coaching.reasoning}</div>
            </div>
          ) : null}

          {/* Hand structure */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: COLORS.gold, fontFamily: "'Cinzel', serif", marginBottom: 8, letterSpacing: 0.5 }}>HAND STRUCTURE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {coaching.triplets.length > 0 && (
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ color: "#f59e0b" }}>✓ Triplets ({coaching.triplets.length}):</span>{" "}
                  <span style={{ color: COLORS.textMuted }}>{coaching.triplets.map(t => tileLabel(t[0])).join(", ")}</span>
                </div>
              )}
              {coaching.sequences.length > 0 && (
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ color: "#22c55e" }}>✓ Sequences ({coaching.sequences.length}):</span>{" "}
                  <span style={{ color: COLORS.textMuted }}>{coaching.sequences.map(s => s.map(t=>tileLabel(t)).join("-")).join(", ")}</span>
                </div>
              )}
              {coaching.pairs.length > 0 && (
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ color: "#60a5fa" }}>Pairs ({coaching.pairs.length}):</span>{" "}
                  <span style={{ color: COLORS.textMuted }}>{coaching.pairs.map(p => tileLabel(p[0])).join(", ")}</span>
                </div>
              )}
              {coaching.partials.length > 0 && (
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ color: "#a78bfa" }}>Partials ({coaching.partials.length}):</span>{" "}
                  <span style={{ color: COLORS.textMuted }}>{coaching.partials.slice(0,4).map(p => `${tileLabel(p.tiles[0])}-${tileLabel(p.tiles[1])}`).join(", ")}</span>
                </div>
              )}
              {coaching.isolated.length > 0 && (
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ color: "#f87171" }}>Isolated ({coaching.isolated.length}):</span>{" "}
                  <span style={{ color: COLORS.textMuted }}>{coaching.isolated.map(t => tileLabel(t)).join(", ")}</span>
                </div>
              )}
              {coaching.safeDiscards.length > 0 && (
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ color: "#22c55e" }}>Safe to discard:</span>{" "}
                  <span style={{ color: COLORS.textMuted }}>{coaching.safeDiscards.map(t => tileLabel(t)).join(", ")} (already discarded by others)</span>
                </div>
              )}
            </div>
          </div>

          {/* Suit distribution */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: COLORS.gold, fontFamily: "'Cinzel', serif", marginBottom: 8, letterSpacing: 0.5 }}>SUIT DISTRIBUTION</div>
            {Object.entries(coaching.suitCount).filter(([,v])=>v>0).map(([suit, count]) => (
              <div key={suit} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: COLORS.textMuted, width: 44 }}>{suit}</div>
                <div style={{ flex: 1, height: 6, background: "#1a3040", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, count * 14)}%`, background: suit==="man"?"#f97316":suit==="bam"?"#4ade80":suit==="circle"?"#60a5fa":suit==="wind"?"#a78bfa":"#fbbf24", borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: COLORS.text, width: 16 }}>{count}</div>
              </div>
            ))}
          </div>

          {/* Strategic tips */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: COLORS.gold, fontFamily: "'Cinzel', serif", marginBottom: 8, letterSpacing: 0.5 }}>STRATEGIC TIPS</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.8 }}>
              {coaching.triplets.length + coaching.sequences.length >= 3
                ? "🏆 You're very close to winning! Focus on completing your last set and finding your pair."
                : coaching.pairs.length >= 6
                  ? "🎯 Many pairs — consider going for All Pairs (七對) hand!"
                  : coaching.suitCount.man >= 7 || coaching.suitCount.bam >= 7 || coaching.suitCount.circle >= 7
                    ? "🎯 Heavily one suit — consider a pure suit hand for bonus points!"
                    : coaching.triplets.length >= 2
                      ? "🎯 Multiple triplets — consider building toward All Triplets (對對胡)!"
                      : coaching.partials.length >= 3
                        ? "🎯 Good sequence potential. Stay patient and draw into your runs."
                        : coaching.isolated.length > 3
                          ? "⚠️ Many isolated tiles. Dump honors and edge tiles first."
                          : "✅ Balanced hand. Build sequences and look for fast wins."}
            </div>
            {revealed[0].length > 0 && (
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.6 }}>
                ⚡ You have open sets — others can read your suits. They may hold back tiles that help you.
              </div>
            )}
          </div>
        </>
      )}

      {/* ── WAITING FOR OPPONENTS ── only shown when no coaching data yet ── */}
      {!isMyTurn && !claimAdvice && !coaching && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          Waiting for opponents...
          <br /><br />
          <span style={{ fontSize: 11 }}>If an opponent discards, you may be offered Pong, Chow, or Win.</span>
        </div>
      )}

      {/* Tile legend — always visible */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "10px 12px", marginTop: "auto" }}>
        <div style={{ fontSize: 11, color: COLORS.gold, fontFamily: "'Cinzel', serif", marginBottom: 6, letterSpacing: 0.5 }}>TILE LEGEND</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
          {[{ label: "Man — Characters", color: "#f97316" }, { label: "Bam — Bamboo", color: "#4ade80" }, { label: "Cir — Circles", color: "#60a5fa" }, { label: "E/S/W/N — Winds", color: "#a78bfa" }, { label: "中發白 — Dragons", color: "#fbbf24" }, { label: "🌸 — Flowers", color: "#22c55e" }].map(({ label, color }) => (
            <div key={label} style={{ fontSize: 10, color, display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── TILE COUNT: concealed + revealed sets (Kong counts as 3, not 4) ─────
  // Each revealed set counts as 3 tiles toward the hand total regardless of type
  const revealedSetTileCount = revealed[0].reduce((sum) => sum + 3, 0);
  const concealedTileCount = playerHand.filter(t => !t.isFlower).length;
  const totalHandCount = concealedTileCount + revealedSetTileCount;

  // ── GAME TABLE (shared) ──────────────────────────────────────────────────
  const GameTable = ({ compact }) => (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: `radial-gradient(ellipse at center, ${COLORS.felt} 0%, ${COLORS.table} 70%, ${COLORS.bg} 100%)`,
      padding: compact ? 6 : 14,
      gap: compact ? 6 : 10,
      minWidth: 0,
    }}>
      {/* Opponent at top (West) — scrollable row, never wraps */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <div style={{ fontSize: 10, color: currentPlayer === 2 ? COLORS.goldLight : COLORS.textMuted, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
          {currentPlayer === 2 && <span className="pulsing">▼ </span>}WEST · {hands[2].length + revealed[2].reduce((s,r)=>s+r.tiles.length,0)}
        </div>
        <div style={{ display: "flex", gap: 2, overflowX: "auto", overflowY: "hidden", width: "100%", paddingBottom: 2, flexWrap: "nowrap" }}>
          {revealed[2].map((set, si) => (
            <div key={si} style={{ display: "flex", gap: 1, flexShrink: 0, background: "rgba(212,168,67,0.1)", padding: "2px 3px", borderRadius: 3, border: "1px solid rgba(212,168,67,0.2)" }}>
              {set.tiles.map((t, ti) => <TileComponent key={ti} tile={t} small />)}
            </div>
          ))}
          {hands[2].slice(0, compact ? 5 : 7).map((_, i) => <TileComponent key={i} tile={_} faceDown small />)}
          {hands[2].length > (compact ? 5 : 7) && (
            <div style={{ fontSize: 9, color: COLORS.textMuted, alignSelf: "center", paddingLeft: 2, whiteSpace: "nowrap", flexShrink: 0 }}>
              +{hands[2].length - (compact ? 5 : 7)}
            </div>
          )}
        </div>
        {discardPiles[2].length > 0 && (
          <div style={{ display: "flex", gap: 2, overflowX: "auto", overflowY: "hidden", width: "100%", paddingBottom: 2, flexWrap: "nowrap" }}>
            {discardPiles[2].slice(-(compact ? 6 : 8)).map((t, i) => <TileComponent key={i} tile={t} small />)}
          </div>
        )}
      </div>

      {/* Middle row — natural height, side players wrap, center discard is compact */}
      <div style={{ display: "flex", gap: compact ? 4 : 8, alignItems: "flex-start" }}>

        {/* South — wraps vertically, fixed narrow width */}
        <div style={{ width: compact ? 34 : 48, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ fontSize: 9, color: currentPlayer === 1 ? COLORS.goldLight : COLORS.textMuted, fontFamily: "'Cinzel', serif", writingMode: "vertical-rl", marginBottom: 2 }}>
            {currentPlayer === 1 && "▶ "}SOUTH
          </div>
          {revealed[1].map((set, si) => (
            <div key={si} style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", background: "rgba(212,168,67,0.08)", padding: "2px", borderRadius: 3, marginBottom: 2, width: "100%" }}>
              {set.tiles.map((t, ti) => <TileComponent key={ti} tile={t} small />)}
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
            {hands[1].slice(0, compact ? 4 : 5).map((_, i) => <TileComponent key={i} tile={_} faceDown small />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", marginTop: 2 }}>
            {discardPiles[1].slice(-3).map((t, i) => <TileComponent key={i} tile={t} small />)}
          </div>
        </div>

        {/* Center discard — natural height, wrapping tiles, no wasted space */}
        <div style={{
          flex: 1,
          background: `radial-gradient(ellipse, rgba(15,48,32,0.8), rgba(10,22,40,0.6))`,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: compact ? 5 : 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 0,
        }}>
          <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'Cinzel', serif", letterSpacing: 1, textAlign: "center" }}>DISCARD PILE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, alignContent: "flex-start" }}>
            {discardPile.slice(-(compact ? 30 : 48)).map((t, i) => (
              <TileComponent key={i} tile={t} small dimmed={lastDiscard && t.id !== lastDiscard.id && i < discardPile.length - 1} />
            ))}
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 4, padding: "2px 5px", border: `1px solid ${COLORS.border}`, marginTop: 2 }}>
            <div style={{ fontSize: 9, color: COLORS.text, lineHeight: 1.4 }}>
              {gameLog[gameLog.length - 1] || ""}
            </div>
          </div>
        </div>

        {/* North — wraps vertically, fixed narrow width */}
        <div style={{ width: compact ? 34 : 48, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ fontSize: 9, color: currentPlayer === 3 ? COLORS.goldLight : COLORS.textMuted, fontFamily: "'Cinzel', serif", writingMode: "vertical-rl", marginBottom: 2 }}>
            {currentPlayer === 3 && "◀ "}NORTH
          </div>
          {revealed[3].map((set, si) => (
            <div key={si} style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", background: "rgba(212,168,67,0.08)", padding: "2px", borderRadius: 3, marginBottom: 2, width: "100%" }}>
              {set.tiles.map((t, ti) => <TileComponent key={ti} tile={t} small />)}
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
            {hands[3].slice(0, compact ? 4 : 5).map((_, i) => <TileComponent key={i} tile={_} faceDown small />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", marginTop: 2 }}>
            {discardPiles[3].slice(-3).map((t, i) => <TileComponent key={i} tile={t} small />)}
          </div>
        </div>
      </div>

      {/* Player hand area — always fully visible, no clipping */}
      <div style={{ background: "rgba(0,0,0,0.38)", borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: compact ? "7px 8px" : "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: currentPlayer === 0 ? COLORS.goldLight : COLORS.textMuted, fontFamily: "'Cinzel', serif", letterSpacing: 0.5 }}>
            {currentPlayer === 0 && <span className="pulsing">▲ YOUR TURN · </span>}
            YOUR HAND · {totalHandCount} tiles
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {flowers[0].length > 0 && <div style={{ fontSize: 10, color: "#22c55e" }}>🌸×{flowers[0].length}</div>}
            {revealed[0].length > 0 && <div style={{ fontSize: 10, color: COLORS.textMuted }}>{revealed[0].length} set(s) exposed</div>}
          </div>
        </div>

        {/* Claim banner */}
        {claimOptions && !chowPicker && (
          <div style={{ background: "rgba(30,58,138,0.3)", border: "1px solid #3b6ea0", borderRadius: 6, padding: "7px 8px", marginBottom: 7, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#93c5fd", fontFamily: "'Cinzel', serif" }}>
              CLAIM {tileLabel(claimOptions.discardedTile)}?
            </span>
            {claimOptions.options.map((opt, i) => (
              <button key={i}
                className={opt.type === "win" ? "win-btn" : "claim-btn"}
                onClick={() => handleClaim(opt)}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                {opt.type === "win" ? "🏆 WIN!" : opt.type === "pong" ? "PONG" : "CHOW"}
              </button>
            ))}
            <button className="btn-outline" onClick={() => handleClaim({ type: "skip" })} style={{ fontSize: 11, padding: "5px 10px" }}>Skip</button>
          </div>
        )}

        {/* Revealed sets */}
        {revealed[0].length > 0 && (
          <div style={{ display: "flex", gap: 5, marginBottom: 6, overflowX: "auto", paddingBottom: 2 }}>
            {revealed[0].map((set, si) => (
              <div key={si} style={{ display: "flex", gap: 2, flexShrink: 0, background: "rgba(212,168,67,0.15)", padding: "3px 5px", borderRadius: 4, border: "1px solid rgba(212,168,67,0.3)" }}>
                <span style={{ fontSize: 8, color: COLORS.textMuted, alignSelf: "center", marginRight: 2 }}>{set.type.toUpperCase()}</span>
                {set.tiles.map((t, ti) => <TileComponent key={ti} tile={t} small />)}
              </div>
            ))}
          </div>
        )}

        {/* Hand tiles — horizontally scrollable */}
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "flex", gap: compact ? 3 : 4, alignItems: "flex-end", minWidth: "min-content" }}>
            {playerHand.map((tile) => (
              <div key={tile.id} className="tile-hover">
                <TileComponent
                  tile={tile}
                  selected={selectedTile && selectedTile.id === tile.id}
                  onClick={() => {
                    if (!isMyTurn && !claimOptions) return;
                    if (claimOptions) return;
                    if (drawnTile || playerHand.length > 16) {
                      if (selectedTile && selectedTile.id === tile.id) {
                        handleDiscard(tile);
                      } else {
                        setSelectedTile(tile);
                      }
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          {isMyTurn && !drawnTile && !claimOptions && !chowPicker && (
            <button className="btn-gold" onClick={handleDraw} style={{ fontSize: 13, padding: "9px 20px" }}>Draw Tile</button>
          )}
          {selectedTile && drawnTile && isMyTurn && !claimOptions && !chowPicker && (
            <button className="btn-gold" onClick={() => handleDiscard(selectedTile)} style={{ fontSize: 13, padding: "9px 16px" }}>
              Discard {tileLabel(selectedTile)}
            </button>
          )}
          {canWinNow && !chowPicker && (
            <button className="win-btn" onClick={handleWin} style={{ fontSize: 14, padding: "9px 18px" }}>🏆 WIN!</button>
          )}
          {isMyTurn && drawnTile && !claimOptions && !canWinNow && !chowPicker && (
            <div style={{ fontSize: 10, color: COLORS.textMuted }}>Tap a tile to select · tap again or hit Discard</div>
          )}
          {!isMyTurn && !claimOptions && !chowPicker && (
            <div style={{ fontSize: 11, color: COLORS.textMuted }} className="pulsing">
              Waiting for {opponentLabels[currentPlayer]}…
            </div>
          )}
          {undoStack.length > 0 && !chowPicker && (
            <button
              className="btn-outline"
              onClick={handleUndo}
              style={{ fontSize: 11, padding: "7px 12px", marginLeft: "auto", opacity: 0.85 }}
              title={`Undo last move (${undoStack.length} left)`}
            >
              ↩ Undo {undoStack.length > 1 ? `(${undoStack.length})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Noto Sans SC', 'Georgia', serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Cinzel:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #071020; }
        ::-webkit-scrollbar-thumb { background: #d4a843; border-radius: 2px; }
        .tile-hover:hover { transform: translateY(-3px); }
        .btn-gold { background: linear-gradient(135deg, #d4a843, #f0c060); color: #0a0a0a; border: none; padding: 8px 18px; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: 'Cinzel', serif; font-size: 13px; transition: all 0.2s; letter-spacing: 0.5px; -webkit-tap-highlight-color: transparent; }
        .btn-gold:active { transform: scale(0.97); }
        .btn-outline { background: transparent; color: #d4a843; border: 1px solid #d4a843; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-family: 'Cinzel', serif; font-size: 12px; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
        .btn-outline:active { background: rgba(212,168,67,0.15); }
        .pulsing { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .claim-btn { background: linear-gradient(135deg, #1a3a5c, #0d2040); color: #60a5fa; border: 1px solid #3b6ea0; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; font-family: 'Cinzel', serif; -webkit-tap-highlight-color: transparent; }
        .claim-btn:active { opacity: 0.8; }
        .win-btn { background: linear-gradient(135deg, #7c2d12, #dc2626); color: white; border: 1px solid #ef4444; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; font-family: 'Cinzel', serif; animation: pulse 1s ease-in-out infinite; -webkit-tap-highlight-color: transparent; }
        .tab-btn { background: transparent; border: none; color: #8a7a5a; cursor: pointer; padding: 10px 0; font-size: 11px; font-family: 'Cinzel', serif; letter-spacing: 0.5px; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; -webkit-tap-highlight-color: transparent; transition: color 0.2s; }
        .tab-btn.active { color: #d4a843; }
        .tab-btn.active .tab-indicator { opacity: 1; }
        .tab-indicator { width: 20px; height: 2px; background: #d4a843; border-radius: 1px; opacity: 0; transition: opacity 0.2s; }
        .sticky-header { position: sticky; top: 0; z-index: 50; }

        /* ── RESPONSIVE BREAKPOINTS ─────────────────────────── */
        .desktop-layout { display: flex; }
        .mobile-layout { display: none; }
        .mobile-tabbar { display: none; }

        @media (max-width: 700px) {
          .desktop-layout { display: none !important; }
          .mobile-layout { display: block !important; }
          .mobile-tabbar { display: flex !important; position: sticky; bottom: 0; z-index: 40; }
          .header-subtitle { display: none; }
          .header-tiles-count { display: none; }
          .header-title { font-size: 14px !important; letter-spacing: 1px !important; }
        }
      `}</style>

      {/* ── HEADER — sticky so it stays visible while scrolling ─────────── */}
      <div className="sticky-header" style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.panel, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>🀄</span>
          <div>
            <div className="header-title" style={{ fontFamily: "'Cinzel', serif", fontSize: 17, fontWeight: 600, color: COLORS.gold, letterSpacing: 2 }}>TAIWANESE MAHJONG</div>
            <div className="header-subtitle" style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 }}>COACHING EDITION · Wind: {game.roundWind}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="header-tiles-count" style={{ fontSize: 11, color: COLORS.gold }}>🃏 {deck.length}</span>
          <button className="btn-outline" onClick={() => setShowRules(!showRules)} style={{ fontSize: 11, padding: "5px 10px" }}>Rules</button>
          <button className="btn-gold" onClick={newGame} style={{ fontSize: 12, padding: "6px 14px" }}>New</button>
        </div>
      </div>

      {/* Rules */}
      {showRules && (
        <div style={{ background: "#071828", borderBottom: `1px solid ${COLORS.border}`, padding: "10px 14px", fontSize: 11, color: COLORS.textMuted, lineHeight: 1.8 }}>
          <strong style={{ color: COLORS.gold }}>Rules:</strong> 4 sets + 1 pair to win (5 total). 16 tiles each. Chow (sequence of 3) or Pong (triplet) from any player. Flowers replaced automatically. Win by self-draw or claiming a discard. Special: All Pairs (7 pairs).&nbsp;
          <button className="btn-outline" onClick={() => setShowRules(false)} style={{ fontSize: 10, padding: "2px 7px" }}>✕</button>
        </div>
      )}

      {/* Win overlay */}
      {winner !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 24 }}>
          <div style={{ fontSize: 60 }}>{winner === 0 ? "🎉" : "😔"}</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 28, color: COLORS.gold, textAlign: "center" }}>{winner === 0 ? "YOU WIN!" : `${opponentLabels[winner]} Wins!`}</div>
          <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center" }}>{gameLog[gameLog.length - 1]}</div>
          <button className="btn-gold" onClick={newGame} style={{ marginTop: 8, fontSize: 15, padding: "12px 32px" }}>Play Again</button>
        </div>
      )}

      {/* Chow picker modal */}
      <ChowPickerUI />

      {/* ── DESKTOP LAYOUT (side-by-side, >700px) ───────────────────────── */}
      <div className="desktop-layout" style={{ flex: 1 }}>
        <GameTable compact={false} />
        <div style={{ width: 280, background: COLORS.panel, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: "'Cinzel', serif", fontSize: 13, color: COLORS.gold, letterSpacing: 1 }}>🎓 COACH ANALYSIS</div>
          <CoachPanel />
          {/* ── ASK THE COACH — rendered directly (not inside inner component) to preserve input focus ── */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderTop: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: "'Cinzel', serif", fontSize: 11, color: COLORS.gold, letterSpacing: 0.5 }}>
              💬 ASK THE COACH
            </div>
            {!apiKey ? (
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8, lineHeight: 1.6 }}>
                  Enter your Anthropic API key to enable the chat coach. Your key is only stored in memory for this session.
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && apiKeyInput.trim()) setApiKey(apiKeyInput.trim()); }}
                    placeholder="sk-ant-..."
                    type="password"
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.text, fontSize: 11, padding: "6px 8px", outline: "none", fontFamily: "Georgia, serif" }}
                  />
                  <button className="btn-outline" onClick={() => { if (apiKeyInput.trim()) setApiKey(apiKeyInput.trim()); }} style={{ fontSize: 11, padding: "5px 10px" }}>Save</button>
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>Get a key at console.anthropic.com</div>
              </div>
            ) : (
              <>
                {chatMessages.length > 0 && (
                  <div style={{ maxHeight: 200, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} style={{ fontSize: 11, lineHeight: 1.6, padding: "6px 9px", borderRadius: 6, background: msg.role === "user" ? "rgba(212,168,67,0.1)" : "rgba(30,58,138,0.25)", border: `1px solid ${msg.role === "user" ? "rgba(212,168,67,0.2)" : "rgba(59,110,160,0.3)"}`, color: msg.role === "user" ? COLORS.gold : COLORS.text, alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }}>
                        {msg.role === "coach" && <span style={{ fontSize: 10, color: COLORS.textMuted, display: "block", marginBottom: 2 }}>🎓 Coach</span>}
                        {msg.text}
                      </div>
                    ))}
                    {chatLoading && <div style={{ fontSize: 11, color: COLORS.textMuted, padding: "6px 9px", fontStyle: "italic" }} className="pulsing">Coach is thinking…</div>}
                    <div ref={chatEndRef} />
                  </div>
                )}
                <div style={{ padding: "8px 10px", display: "flex", gap: 6, borderTop: chatMessages.length > 0 ? `1px solid ${COLORS.border}` : "none" }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !chatLoading) sendChatMessage(chatInput); }}
                    placeholder="Ask about your hand…"
                    disabled={chatLoading}
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.text, fontSize: 11, padding: "6px 8px", outline: "none", fontFamily: "Georgia, serif" }}
                  />
                  <button className="btn-outline" onClick={() => sendChatMessage(chatInput)} disabled={chatLoading || !chatInput.trim()} style={{ fontSize: 11, padding: "5px 10px", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>Ask</button>
                </div>
                {chatMessages.length === 0 && <div style={{ padding: "4px 10px 8px", fontSize: 10, color: COLORS.textMuted, lineHeight: 1.5 }}>Try: "Should I discard 8 Man or 5 Cir?" or "Am I close to winning?"</div>}
                <div style={{ padding: "2px 10px 6px" }}>
                  <button onClick={() => { setApiKey(""); setApiKeyInput(""); }} style={{ fontSize: 9, color: COLORS.textMuted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>clear API key</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE LAYOUT (stacked, ≤700px) ────────────────────────────── */}
      <div className="mobile-layout">
        {mobileTab === "game"
          ? <GameTable compact={true} />
          : (
            <div style={{ background: COLORS.panel }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: COLORS.gold, letterSpacing: 1 }}>🎓 COACH ANALYSIS</div>
                <button className="btn-outline" onClick={() => setMobileTab("game")} style={{ fontSize: 11, padding: "4px 10px" }}>← Back to Game</button>
              </div>
              <CoachPanel />
              {/* ── ASK THE COACH — rendered directly for stable focus ── */}
              <div style={{ background: "rgba(255,255,255,0.03)", borderTop: `1px solid ${COLORS.border}`, overflow: "hidden", margin: "0 14px 14px" }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: "'Cinzel', serif", fontSize: 11, color: COLORS.gold, letterSpacing: 0.5 }}>💬 ASK THE COACH</div>
                {!apiKey ? (
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8, lineHeight: 1.6 }}>Enter your Anthropic API key to enable the chat coach.</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={apiKeyInput}
                        onChange={e => setApiKeyInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && apiKeyInput.trim()) setApiKey(apiKeyInput.trim()); }}
                        placeholder="sk-ant-..."
                        type="password"
                        style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.text, fontSize: 11, padding: "6px 8px", outline: "none", fontFamily: "Georgia, serif" }}
                      />
                      <button className="btn-outline" onClick={() => { if (apiKeyInput.trim()) setApiKey(apiKeyInput.trim()); }} style={{ fontSize: 11, padding: "5px 10px" }}>Save</button>
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>Get a key at console.anthropic.com</div>
                  </div>
                ) : (
                  <>
                    {chatMessages.length > 0 && (
                      <div style={{ maxHeight: 180, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {chatMessages.map((msg, i) => (
                          <div key={i} style={{ fontSize: 11, lineHeight: 1.6, padding: "6px 9px", borderRadius: 6, background: msg.role === "user" ? "rgba(212,168,67,0.1)" : "rgba(30,58,138,0.25)", border: `1px solid ${msg.role === "user" ? "rgba(212,168,67,0.2)" : "rgba(59,110,160,0.3)"}`, color: msg.role === "user" ? COLORS.gold : COLORS.text, alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }}>
                            {msg.role === "coach" && <span style={{ fontSize: 10, color: COLORS.textMuted, display: "block", marginBottom: 2 }}>🎓 Coach</span>}
                            {msg.text}
                          </div>
                        ))}
                        {chatLoading && <div style={{ fontSize: 11, color: COLORS.textMuted, padding: "6px 9px", fontStyle: "italic" }} className="pulsing">Coach is thinking…</div>}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                    <div style={{ padding: "8px 10px", display: "flex", gap: 6, borderTop: chatMessages.length > 0 ? `1px solid ${COLORS.border}` : "none" }}>
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !chatLoading) sendChatMessage(chatInput); }}
                        placeholder="Ask about your hand…"
                        disabled={chatLoading}
                        style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.text, fontSize: 11, padding: "6px 8px", outline: "none", fontFamily: "Georgia, serif" }}
                      />
                      <button className="btn-outline" onClick={() => sendChatMessage(chatInput)} disabled={chatLoading || !chatInput.trim()} style={{ fontSize: 11, padding: "5px 10px", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>Ask</button>
                    </div>
                    {chatMessages.length === 0 && <div style={{ padding: "4px 10px 8px", fontSize: 10, color: COLORS.textMuted, lineHeight: 1.5 }}>Try: "Should I discard 8 Man or 5 Cir?" or "Am I close to winning?"</div>}
                    <div style={{ padding: "2px 10px 6px" }}>
                      <button onClick={() => { setApiKey(""); setApiKeyInput(""); }} style={{ fontSize: 9, color: COLORS.textMuted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>clear API key</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        }

        {/* Bottom tab bar — sticky */}
        <div className="mobile-tabbar" style={{ background: COLORS.panel, borderTop: `1px solid ${COLORS.border}`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {[
            { id: "game", icon: "🀄", label: "GAME" },
            { id: "coach", icon: "🎓", label: "COACH" + ((isMyTurn && coaching?.bestDiscard) || claimAdvice ? " ●" : "") },
          ].map(tab => (
            <button key={tab.id} className={`tab-btn ${mobileTab === tab.id ? "active" : ""}`} onClick={() => setMobileTab(tab.id)}>
              <div className="tab-indicator" />
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
