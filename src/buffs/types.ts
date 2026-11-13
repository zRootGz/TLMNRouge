import type { Card, HandCombo } from '../core/types.ts';

export const BuffRarity = {
  COMMON: 'COMMON',
  RARE: 'RARE',
  EPIC: 'EPIC',
  LEGENDARY: 'LEGENDARY',
} as const;
export type BuffRarity = (typeof BuffRarity)[keyof typeof BuffRarity];

export const BuffTriggerType = {
  PASSIVE: 'PASSIVE',                     // Tự động kích hoạt khi thỏa điều kiện
  ACTIVE_ON_TURN: 'ACTIVE_ON_TURN',       // Người chơi chủ động ấn dùng trong lượt
  REACTIVE_ON_ATTACK: 'REACTIVE_ON_ATTACK', // Phản đòn khi bị chặt hoặc tấn công
} as const;
export type BuffTriggerType = (typeof BuffTriggerType)[keyof typeof BuffTriggerType];

export const BuffId = {
  BUFF_PIG_ARMOR: 'BUFF_PIG_ARMOR',         // Giáp Heo: miễn 1 lần bị chặt bởi 3 đôi thông hoặc giảm 50% phạt
  BUFF_FIRST_STRIKE: 'BUFF_FIRST_STRIKE',   // Tiên Thủ: ưu tiên đi đầu không phụ thuộc vào 3 bích
  BUFF_REVIVE_PASS: 'BUFF_REVIVE_PASS',     // Tái Sinh Lượt: bỏ lượt 1 lần vẫn được quyền đánh vòng sau
  BUFF_SWAP_CARD: 'BUFF_SWAP_CARD',         // Hoán Bài: bỏ 1 lá rác đổi 1 lá từ cọc dự phòng
  BUFF_SPY_HAND: 'BUFF_SPY_HAND',           // Mắt Thần: nhìn trộm 2 lá bài đối thủ kế tiếp
  BUFF_FREEZE_TURN: 'BUFF_FREEZE_TURN',     // Băng Phong: bắt người kế tiếp phải bỏ lượt
  BUFF_REFLECT_CUT: 'BUFF_REFLECT_CUT',     // Gương Phản Xạ: phản 50% tiền phạt chặt về kẻ tấn công
  BUFF_DOUBLE_CHIPS: 'BUFF_DOUBLE_CHIPS',   // Joker X2: Thắng ván bài được nhận gấp đôi tiền thưởng từ người thua
  BUFF_BOMB_TRAP: 'BUFF_BOMB_TRAP',         // Mìn Cảm Tử: Khi bị chặt heo, mìn nổ phạt ngược kẻ chặt 100% tiền phạt
  BUFF_SHUFFLE_HAND: 'BUFF_SHUFFLE_HAND',   // Cuồng Phong Hoán Đổi: Đổi 2 lá rác nhỏ nhất lấy 2 lá mới từ cọc dự phòng
  BUFF_TIME_WARP: 'BUFF_TIME_WARP',         // Ngưng Đọng Thời Gian: Hồi 15s cho bản thân, giảm 7s lượt kế tiếp của đối thủ
  BUFF_HEIST: 'BUFF_HEIST',                 // Đạo Tặc: Rút trộm 1 lá bài bất kỳ của đối thủ có số bài ít nhất
} as const;
export type BuffId = (typeof BuffId)[keyof typeof BuffId];

export interface BuffDefinition {
  id: BuffId;
  name: string;
  description: string;
  rarity: BuffRarity;
  triggerType: BuffTriggerType;
  maxCharges: number;
  icon: string;
}

export interface PlayerBuffSlot {
  buffId: BuffId;
  remainingCharges: number;
  isActive: boolean;
}

// Hook Contexts
export interface BeforePlayHandContext {
  playerId: string;
  handCards: Card[];
  drawPile: Card[];
  cardToDiscard?: Card;
}

export interface OnChopReactionContext {
  victimPlayerId: string;
  attackerPlayerId: string;
  victimCombo: HandCombo;
  attackerCombo: HandCombo;
  basePenalty: number;
  isCanceled?: boolean;
  reducedPenaltyMultiplier?: number;
  reflectedPenalty?: number;
  bombPenalty?: number;
}

export interface OnPassTurnContext {
  playerId: string;
  hasRevivePassBuff: boolean;
  canRejoinRound: boolean;
}

