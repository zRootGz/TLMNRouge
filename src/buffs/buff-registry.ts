import { BuffId, BuffRarity, BuffTriggerType } from './types.ts';
import type { BuffDefinition } from './types.ts';

export const BUFF_DEFINITIONS: Record<BuffId, BuffDefinition> = {
  [BuffId.BUFF_PIG_ARMOR]: {
    id: BuffId.BUFF_PIG_ARMOR,
    name: 'Giáp Heo',
    description: 'Miễn 1 lần bị 3 đôi thông chặt hoặc giảm 50% tiền phạt khi heo bị chặt.',
    rarity: BuffRarity.RARE,
    triggerType: BuffTriggerType.PASSIVE,
    maxCharges: 1,
    icon: 'shield-pig',
  },
  [BuffId.BUFF_FIRST_STRIKE]: {
    id: BuffId.BUFF_FIRST_STRIKE,
    name: 'Tiên Thủ',
    description: 'Được ưu tiên quyền đi đầu ván bài mà không phụ thuộc vào lá 3 Bích.',
    rarity: BuffRarity.COMMON,
    triggerType: BuffTriggerType.PASSIVE,
    maxCharges: 1,
    icon: 'sword-fast',
  },
  [BuffId.BUFF_REVIVE_PASS]: {
    id: BuffId.BUFF_REVIVE_PASS,
    name: 'Tái Sinh Lượt',
    description: 'Bỏ lượt 1 lần nhưng không bị mất quyền đánh ở các lượt tiếp theo của cùng vòng.',
    rarity: BuffRarity.EPIC,
    triggerType: BuffTriggerType.PASSIVE,
    maxCharges: 1,
    icon: 'phoenix-feather',
  },
  [BuffId.BUFF_SWAP_CARD]: {
    id: BuffId.BUFF_SWAP_CARD,
    name: 'Hoán Bài',
    description: 'Bỏ 1 lá bài bất kỳ trên tay để rút ngẫu nhiên 1 lá mới từ cọc bài dự phòng.',
    rarity: BuffRarity.COMMON,
    triggerType: BuffTriggerType.ACTIVE_ON_TURN,
    maxCharges: 2,
    icon: 'card-swap',
  },
  [BuffId.BUFF_SPY_HAND]: {
    id: BuffId.BUFF_SPY_HAND,
    name: 'Mắt Thần',
    description: 'Soi ngẫu nhiên 2 lá bài đang nằm trên tay của đối thủ kế tiếp.',
    rarity: BuffRarity.RARE,
    triggerType: BuffTriggerType.ACTIVE_ON_TURN,
    maxCharges: 1,
    icon: 'all-seeing-eye',
  },
  [BuffId.BUFF_FREEZE_TURN]: {
    id: BuffId.BUFF_FREEZE_TURN,
    name: 'Băng Phong',
    description: 'Đóng băng lượt của người kế tiếp, buộc người đó phải bỏ lượt ngay lập tức.',
    rarity: BuffRarity.EPIC,
    triggerType: BuffTriggerType.ACTIVE_ON_TURN,
    maxCharges: 1,
    icon: 'frost-ice',
  },
  [BuffId.BUFF_REFLECT_CUT]: {
    id: BuffId.BUFF_REFLECT_CUT,
    name: 'Gương Phản Xạ',
    description: 'Khi bị chặt heo/hàng, chuyển 50% tiền phạt sang cho người vừa thực hiện chặt.',
    rarity: BuffRarity.RARE,
    triggerType: BuffTriggerType.REACTIVE_ON_ATTACK,
    maxCharges: 1,
    icon: 'mirror-reflect',
  },
  [BuffId.BUFF_DOUBLE_CHIPS]: {
    id: BuffId.BUFF_DOUBLE_CHIPS,
    name: 'Joker Nhân Đôi',
    description: 'Nếu về nhất ván này, bạn nhận gấp đôi tiền phạt từ tất cả đối thủ thua cuộc.',
    rarity: BuffRarity.LEGENDARY,
    triggerType: BuffTriggerType.PASSIVE,
    maxCharges: 1,
    icon: 'money-double',
  },
  [BuffId.BUFF_BOMB_TRAP]: {
    id: BuffId.BUFF_BOMB_TRAP,
    name: 'Mìn Cảm Tử',
    description: 'Khi heo của bạn bị chặt, mìn nổ phạt ngược kẻ chặt 100% số tiền phạt tương đương.',
    rarity: BuffRarity.EPIC,
    triggerType: BuffTriggerType.REACTIVE_ON_ATTACK,
    maxCharges: 1,
    icon: 'bomb-trap',
  },
  [BuffId.BUFF_SHUFFLE_HAND]: {
    id: BuffId.BUFF_SHUFFLE_HAND,
    name: 'Cuồng Phong Hoán Đổi',
    description: 'Tự động đổi 2 lá bài rác nhỏ nhất trên tay lấy 2 lá mới từ cọc bài dự phòng.',
    rarity: BuffRarity.RARE,
    triggerType: BuffTriggerType.ACTIVE_ON_TURN,
    maxCharges: 1,
    icon: 'tornado-swap',
  },
  [BuffId.BUFF_TIME_WARP]: {
    id: BuffId.BUFF_TIME_WARP,
    name: 'Ngưng Đọng Thời Gian',
    description: 'Hồi 15 giây suy nghĩ cho bản thân và giảm thời gian lượt kế tiếp của đối thủ còn 7 giây.',
    rarity: BuffRarity.COMMON,
    triggerType: BuffTriggerType.ACTIVE_ON_TURN,
    maxCharges: 1,
    icon: 'hourglass-warp',
  },
  [BuffId.BUFF_HEIST]: {
    id: BuffId.BUFF_HEIST,
    name: 'Đạo Tặc',
    description: 'Rút trộm ngẫu nhiên 1 lá bài trên tay của đối thủ đang còn ít bài nhất.',
    rarity: BuffRarity.EPIC,
    triggerType: BuffTriggerType.ACTIVE_ON_TURN,
    maxCharges: 1,
    icon: 'thief-mask',
  },
};

export function getAllBuffs(): BuffDefinition[] {
  return Object.values(BUFF_DEFINITIONS);
}

export function getRandomBuffOptions(count: number = 3): BuffDefinition[] {
  const all = [...getAllBuffs()];
  // Xáo trộn ngẫu nhiên Fisher-Yates
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, Math.min(count, all.length));
}

