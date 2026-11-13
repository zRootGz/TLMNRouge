export const Suit = {
  SPADE: 0,   // Bích (♠)
  CLUB: 1,    // Chuồn / Tép (♣)
  DIAMOND: 2, // Rô (♦)
  HEART: 3,   // Cơ (♥)
} as const;
export type Suit = (typeof Suit)[keyof typeof Suit];

export const Rank = {
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
  NINE: 9,
  TEN: 10,
  JACK: 11,
  QUEEN: 12,
  KING: 13,
  ACE: 14,
  TWO: 15, // Heo (lá cao nhất)
} as const;
export type Rank = (typeof Rank)[keyof typeof Rank];

export interface Card {
  id: number;     // 0 - 51
  rank: Rank;     // 3 - 15
  suit: Suit;     // 0 - 3
  code: string;   // e.g. "3S", "10H", "2D"
}

export const ComboType = {
  INVALID: 'INVALID',
  SINGLE: 'SINGLE',                           // Rác (1 lá)
  PAIR: 'PAIR',                               // Đôi (2 lá cùng rank)
  TRIPLE: 'TRIPLE',                           // Sám cô (3 lá cùng rank)
  STRAIGHT: 'STRAIGHT',                       // Sảnh (3 lá liên tiếp trở lên, không chứa 2)
  THREE_PAIR_STRAIGHT: 'THREE_PAIR_STRAIGHT', // 3 đôi thông
  FOUR_OF_A_KIND: 'FOUR_OF_A_KIND',           // Tứ quý
  FOUR_PAIR_STRAIGHT: 'FOUR_PAIR_STRAIGHT',   // 4 đôi thông
} as const;
export type ComboType = (typeof ComboType)[keyof typeof ComboType];

export interface HandCombo {
  type: ComboType;
  cards: Card[];
  highestCard: Card;
  length: number; // số lá bài trong bộ (quan trọng đối với sảnh)
  playedByPlayerId?: string;
}

export const InstantWinType = {
  DRAGON_STRAIGHT: 'DRAGON_STRAIGHT',                 // Sảnh rồng (3 tới A)
  FOUR_TWOS: 'FOUR_TWOS',                             // Tứ quý 2
  SIX_PAIRS: 'SIX_PAIRS',                             // 6 đôi bất kỳ
  FIVE_PAIR_STRAIGHT: 'FIVE_PAIR_STRAIGHT',           // 5 đôi thông
  SAME_COLOR: 'SAME_COLOR',                           // Đồng màu (toàn đỏ hoặc toàn đen)
} as const;
export type InstantWinType = (typeof InstantWinType)[keyof typeof InstantWinType];

export interface InstantWinResult {
  hasInstantWin: boolean;
  type?: InstantWinType;
  description?: string;
}

export interface PenaltyBreakdown {
  isCong: boolean;             // Cóng (chưa ra lá nào khi ván kết thúc)
  blackPigs: number;           // Số heo đen còn lại (2♠, 2♣)
  redPigs: number;             // Số heo đỏ còn lại (2♦, 2♥)
  threePairStraights: number;  // Số bộ 3 đôi thông thối
  fourOfAKinds: number;        // Số bộ tứ quý thối
  fourPairStraights: number;   // Số bộ 4 đôi thông thối
  totalPenaltyUnits: number;   // Tổng đơn vị phạt quy đổi (ví dụ: cược cơ bản)
}
