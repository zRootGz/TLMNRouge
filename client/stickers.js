// High-Quality Flaticon-Style Vector Stickers for TLMN Buff
export const STICKER_LIST = [
  {
    id: 'pig_chop',
    name: 'Chặt Heo',
    icon: '🐷',
    desc: 'Heo Vàng Chiến Binh',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sticker-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#sticker-shadow)">
        <!-- White Sticker Border -->
        <circle cx="32" cy="33" r="24" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>
        <!-- Pig Head -->
        <circle cx="32" cy="33" r="22" fill="#ff80ab"/>
        <!-- Ears -->
        <polygon points="12,18 20,12 22,24" fill="#f50057"/>
        <polygon points="52,18 44,12 42,24" fill="#f50057"/>
        <!-- Eyes -->
        <circle cx="23" cy="28" r="3" fill="#111"/>
        <circle cx="22" cy="27" r="1" fill="#fff"/>
        <circle cx="41" cy="28" r="3" fill="#111"/>
        <circle cx="40" cy="27" r="1" fill="#fff"/>
        <!-- Snout -->
        <ellipse cx="32" cy="38" rx="10" ry="7" fill="#f50057"/>
        <ellipse cx="29" cy="38" rx="2" ry="3" fill="#880e4f"/>
        <ellipse cx="35" cy="38" rx="2" ry="3" fill="#880e4f"/>
        <!-- Warrior Red Headband -->
        <rect x="12" y="19" width="40" height="5" fill="#d50000" rx="2"/>
        <circle cx="32" cy="21.5" r="2.5" fill="#ffd600"/>
        <!-- Sparkle -->
        <polygon points="48,8 50,13 55,15 50,17 48,22 46,17 41,15 46,13" fill="#ffd600"/>
      </g>
    </svg>`
  },
  {
    id: 'cool_joker',
    name: 'Gáy Ngầu',
    icon: '😎',
    desc: 'Thug Life Joker',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cool-shadow">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#cool-shadow)">
        <!-- White Sticker Border -->
        <circle cx="32" cy="32" r="24" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>
        <circle cx="32" cy="32" r="22" fill="#ffd600"/>
        <!-- Cool Black Sunglasses -->
        <polygon points="12,24 29,24 27,35 15,35" fill="#111" stroke="#222" stroke-width="1.5"/>
        <polygon points="35,24 52,24 49,35 37,35" fill="#111" stroke="#222" stroke-width="1.5"/>
        <rect x="28" y="25" width="8" height="3" fill="#111"/>
        <!-- Glasses Shine Reflection -->
        <line x1="16" y1="26" x2="21" y2="33" stroke="#00f0ff" stroke-width="2"/>
        <line x1="39" y1="26" x2="44" y2="33" stroke="#00f0ff" stroke-width="2"/>
        <!-- Smirk Mouth -->
        <path d="M 24,42 Q 33,50 42,42" fill="none" stroke="#212121" stroke-width="3" stroke-linecap="round"/>
        <!-- Gold Dollar Tooth Sparkle -->
        <polygon points="46,40 48,43 51,44 48,45 46,48 44,45 41,44 44,43" fill="#00e676"/>
      </g>
    </svg>`
  },
  {
    id: 'cry_sad',
    name: 'Khóc Ròng',
    icon: '😭',
    desc: 'Thúi Heo / Bị Chặt',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cry-shadow">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#cry-shadow)">
        <circle cx="32" cy="32" r="24" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>
        <circle cx="32" cy="32" r="22" fill="#ffca28"/>
        <!-- Tightly Closed Crying Eyes -->
        <path d="M 16,28 Q 23,22 28,28" fill="none" stroke="#3e2723" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 36,28 Q 41,22 48,28" fill="none" stroke="#3e2723" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Open Wailing Mouth -->
        <ellipse cx="32" cy="43" rx="8" ry="6" fill="#b71c1c"/>
        <path d="M 28,47 Q 32,45 36,47" fill="#ff80ab"/>
        <!-- Waterfall Tears -->
        <path d="M 17,29 Q 15,38 17,52 Q 22,53 23,52 Q 25,38 23,29 Z" fill="#00b0ff" opacity="0.9"/>
        <path d="M 41,29 Q 39,38 41,52 Q 46,53 47,52 Q 49,38 47,29 Z" fill="#00b0ff" opacity="0.9"/>
      </g>
    </svg>`
  },
  {
    id: 'rage_fire',
    name: 'Bốc Hỏa',
    icon: '😡',
    desc: 'Tức Giận',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="rage-shadow">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#rage-shadow)">
        <circle cx="32" cy="34" r="24" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>
        <circle cx="32" cy="34" r="22" fill="#ff3d00"/>
        <!-- Flaming Fire on Head -->
        <path d="M 24,18 Q 30,6 32,14 Q 38,4 42,18 Z" fill="#ffd600" stroke="#ff9100" stroke-width="2"/>
        <!-- Angry Slanted Eyebrows -->
        <line x1="16" y1="25" x2="28" y2="30" stroke="#212121" stroke-width="4" stroke-linecap="round"/>
        <line x1="48" y1="25" x2="36" y2="30" stroke="#212121" stroke-width="4" stroke-linecap="round"/>
        <!-- Eyes -->
        <circle cx="22" cy="33" r="3" fill="#111"/>
        <circle cx="42" cy="33" r="3" fill="#111"/>
        <!-- Clenched Teeth Mouth -->
        <rect x="22" y="42" width="20" height="7" rx="3" fill="#ffffff" stroke="#212121" stroke-width="2"/>
        <line x1="28" y1="42" x2="28" y2="49" stroke="#212121" stroke-width="1.5"/>
        <line x1="34" y1="42" x2="34" y2="49" stroke="#212121" stroke-width="1.5"/>
        <line x1="40" y1="42" x2="40" y2="49" stroke="#212121" stroke-width="1.5"/>
      </g>
    </svg>`
  },
  {
    id: 'bomb_hot',
    name: 'Bom Nổ',
    icon: '💣',
    desc: 'Hàng Khủng Tứ Quý',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="bomb-shadow">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#bomb-shadow)">
        <!-- Outer white sticker border -->
        <circle cx="29" cy="36" r="22" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>
        <circle cx="29" cy="36" r="20" fill="#212121"/>
        <!-- Shading Highlight -->
        <ellipse cx="23" cy="28" rx="6" ry="3" fill="#616161" transform="rotate(-30 23 28)"/>
        <!-- Bomb Neck -->
        <rect x="36" y="19" width="8" height="6" fill="#757575" transform="rotate(45 40 22)" stroke="#ffffff" stroke-width="2"/>
        <!-- Burning Fuse -->
        <path d="M 43,18 Q 48,13 53,15" fill="none" stroke="#ffab00" stroke-width="3" stroke-linecap="round"/>
        <!-- Sparkle Explosion -->
        <polygon points="54,8 57,13 62,12 58,16 61,21 56,18 52,22 53,16" fill="#ff1744"/>
        <polygon points="55,10 57,13 60,13 58,15 60,18 57,16 54,19 55,15" fill="#ffd600"/>
        <!-- Skull/Cross or 21 Text -->
        <text x="29" y="42" font-family="'Press Start 2P', monospace" font-size="11" fill="#ff1744" text-anchor="middle" font-weight="900">BOOM</text>
      </g>
    </svg>`
  },
  {
    id: 'money_rich',
    name: 'Hốt Bạc',
    icon: '💰',
    desc: 'Thắng Đậm / Đại Gia',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="money-shadow">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#money-shadow)">
        <!-- White border shape -->
        <path d="M 32,12 C 26,12 24,18 18,24 C 11,32 11,52 32,54 C 53,52 53,32 46,24 C 40,18 38,12 32,12 Z" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>
        <!-- Money Bag Body -->
        <path d="M 32,14 C 27,14 25,19 19,25 C 13,33 13,50 32,52 C 51,50 51,33 45,25 C 39,19 37,14 32,14 Z" fill="#fbc02d"/>
        <!-- Tied Rope -->
        <ellipse cx="32" cy="22" rx="11" ry="3.5" fill="#d32f2f"/>
        <!-- Dollar Sign -->
        <text x="32" y="42" font-family="'Press Start 2P', monospace" font-size="18" fill="#2e7d32" text-anchor="middle" font-weight="900">$</text>
        <!-- Gold Coin Sparkle -->
        <circle cx="48" cy="18" r="5" fill="#ffd600" stroke="#ffffff" stroke-width="1.5"/>
        <text x="48" y="21" font-size="7" fill="#f57f17" font-weight="900" text-anchor="middle">★</text>
      </g>
    </svg>`
  },
  {
    id: 'clap_hands',
    name: 'Vỗ Tay',
    icon: '👏',
    desc: 'Nước Đi Hay',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="clap-shadow">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#clap-shadow)">
        <circle cx="32" cy="32" r="24" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>
        <!-- Clapping hands vector -->
        <path d="M 18,36 C 18,28 26,20 34,22 C 37,23 39,26 40,29 C 41,32 39,36 36,37 L 26,45 C 22,48 18,44 18,36 Z" fill="#ffb74d" stroke="#e65100" stroke-width="2"/>
        <path d="M 28,18 C 30,14 36,14 38,18 C 40,22 41,27 41,32 L 31,38 Z" fill="#ffa726" stroke="#e65100" stroke-width="2"/>
        <!-- Motion Sparkles -->
        <line x1="44" y1="18" x2="52" y2="14" stroke="#ffd600" stroke-width="3" stroke-linecap="round"/>
        <line x1="48" y1="26" x2="56" y2="26" stroke="#ffd600" stroke-width="3" stroke-linecap="round"/>
        <line x1="45" y1="34" x2="52" y2="38" stroke="#ffd600" stroke-width="3" stroke-linecap="round"/>
      </g>
    </svg>`
  },
  {
    id: 'heart_love',
    name: 'Thả Tim',
    icon: '❤️',
    desc: 'Cảm Ơn / Yêu Thích',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="heart-shadow">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#heart-shadow)">
        <path d="M 32,53 C 32,53 12,41 12,25 C 12,17 18,12 25,12 C 29,12 31,14 32,16 C 33,14 35,12 39,12 C 46,12 52,17 52,25 C 52,41 32,53 32,53 Z" fill="#ffffff" stroke="#ffffff" stroke-width="5"/>
        <path d="M 32,51 C 32,51 14,40 14,25 C 14,18 19,14 25,14 C 29,14 31,16 32,18 C 33,16 35,14 39,14 C 45,14 50,18 50,25 C 50,40 32,51 32,51 Z" fill="#e91e63"/>
        <!-- Highlight -->
        <ellipse cx="22" cy="22" rx="4" ry="7" fill="#ff80ab" transform="rotate(-30 22 22)"/>
        <!-- Sparkle Star -->
        <polygon points="46,12 48,16 52,17 48,18 46,22 44,18 40,17 44,16" fill="#ffd600"/>
      </g>
    </svg>`
  },
  {
    id: 'ice_freeze',
    name: 'Đóng Băng',
    icon: '🧊',
    desc: 'Băng Phong',
    svg: `<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="ice-shadow">
          <feDropShadow dx="2" dy="3" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <g filter="url(#ice-shadow)">
        <rect x="14" y="14" width="36" height="36" rx="8" fill="#ffffff" stroke="#ffffff" stroke-width="5"/>
        <rect x="15" y="15" width="34" height="34" rx="7" fill="#00e5ff" opacity="0.85"/>
        <!-- Cube facets & Highlights -->
        <polygon points="17,17 47,17 43,24 23,24" fill="#ffffff" opacity="0.6"/>
        <polygon points="17,17 23,24 23,43 17,47" fill="#00b0ff" opacity="0.4"/>
        <!-- Snowflake inside -->
        <line x1="32" y1="23" x2="32" y2="41" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="23" y1="32" x2="41" y2="32" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="26" y1="26" x2="38" y2="38" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <line x1="38" y1="26" x2="26" y2="38" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>`
  }
];

