import { Rank, Suit } from './types.ts';
import type { Card } from './types.ts';

const SUIT_CHARS: Record<Suit, string> = {
  [Suit.SPADE]: 'S',
  [Suit.CLUB]: 'C',
  [Suit.DIAMOND]: 'D',
  [Suit.HEART]: 'H',
};

const RANK_LABELS: Record<Rank, string> = {
  [Rank.THREE]: '3',
  [Rank.FOUR]: '4',
  [Rank.FIVE]: '5',
  [Rank.SIX]: '6',
  [Rank.SEVEN]: '7',
  [Rank.EIGHT]: '8',
  [Rank.NINE]: '9',
  [Rank.TEN]: '10',
  [Rank.JACK]: 'J',
  [Rank.QUEEN]: 'Q',
  [Rank.KING]: 'K',
  [Rank.ACE]: 'A',
  [Rank.TWO]: '2',
};

export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;

  for (let rank = Rank.THREE; rank <= Rank.TWO; rank++) {
    for (let suit = Suit.SPADE; suit <= Suit.HEART; suit++) {
      const code = `${RANK_LABELS[rank as Rank]}${SUIT_CHARS[suit as Suit]}`;
      deck.push({
        id,
        rank: rank as Rank,
        suit: suit as Suit,
        code,
      });
      id++;
    }
  }

  return deck;
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    return a.suit - b.suit;
  });
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(
  deck: Card[],
  playerCount: number = 4,
  cardsPerPlayer: number = 13
): { hands: Card[][]; remaining: Card[] } {
  if (deck.length < playerCount * cardsPerPlayer) {
    throw new Error('Not enough cards in deck to deal');
  }

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const shuffled = shuffleDeck(deck);

  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let p = 0; p < playerCount; p++) {
      const card = shuffled.shift()!;
      hands[p].push(card);
    }
  }

  for (let p = 0; p < playerCount; p++) {
    hands[p] = sortCards(hands[p]);
  }

  return { hands, remaining: shuffled };
}
