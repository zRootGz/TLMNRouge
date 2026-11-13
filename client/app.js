import { soundFx } from './audio.js';
import {
  evaluateLocalCombo,
  canBeatComboClient,
  isChopMove,
  findAutoBeatCombo,
  autoSuggestComboClient
} from './suggester.js';
import { STICKER_LIST } from './stickers.js';

// Discord Embedded App SDK Loader with Fallback Mock
let discordSdk = null;

const savedId = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tlmn_user_id')) || `user_${Math.random().toString(36).substring(2, 7)}`;
if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('tlmn_user_id', savedId);

const savedName = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tlmn_user_name')) || `Player_${Math.floor(Math.random() * 900 + 100)}`;
if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('tlmn_user_name', savedName);

let currentUser = {
  id: savedId,
  username: savedName,
  avatarUrl: (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tlmn_avatar_url')) || null,
};

// UI Elements
const roomIdDisplay = document.getElementById('room-id-display');
const gameStatusDisplay = document.getElementById('game-status-display');
const playerNameDisplay = document.getElementById('player-name-display');
const myHandContainer = document.getElementById('my-hand');
const playedCardsArea = document.getElementById('played-cards-area');
const buffTray = document.getElementById('buff-tray');
const buffModal = document.getElementById('buff-draft-modal');
const buffOptionsContainer = document.getElementById('buff-options-container');
const toastEl = document.getElementById('toast-message');
const impactBanner = document.getElementById('impact-banner');
const appEl = document.getElementById('app');
const matchEndModal = document.getElementById('match-end-modal');
const matchWinnerText = document.getElementById('match-winner-text');
const scoreboardContainer = document.getElementById('scoreboard-container');
const btnPlayAgain = document.getElementById('btn-play-again');

const btnReady = document.getElementById('btn-ready');
const btnAddBot = document.getElementById('btn-add-bot');
const btnPlay = document.getElementById('btn-play');
const btnClear = document.getElementById('btn-clear');
const btnPass = document.getElementById('btn-pass');
const btnSort = document.getElementById('btn-sort');
const btnAudioToggle = document.getElementById('btn-audio-toggle');
const btnStickerToggle = document.getElementById('btn-sticker-toggle');
const stickerDrawer = document.getElementById('sticker-drawer');
const stickerGrid = document.getElementById('sticker-grid');
const btnCloseStickers = document.getElementById('btn-close-stickers');
const btnRerollBuff = document.getElementById('btn-reroll-buff');

const comboPreviewBadge = document.getElementById('combo-preview-badge');
const comboBadgeIcon = document.getElementById('combo-badge-icon');
const comboBadgeText = document.getElementById('combo-badge-text');

const BUFF_METADATA = {
  BUFF_PIG_ARMOR: { name: '🛡️ Giáp Heo', type: 'Tự động', desc: 'Tự động miễn 1 lần chặt hoặc giảm 50% tiền phạt khi heo bị chặt' },
  BUFF_FIRST_STRIKE: { name: '⚔️ Tiên Thủ', type: 'Tự động', desc: 'Tự động đi trước đầu ván không cần 3 bích' },
  BUFF_REVIVE_PASS: { name: '🪶 Tái Sinh Lượt', type: 'Tự động', desc: 'Bỏ lượt không bị mất quyền tham gia vòng' },
  BUFF_SWAP_CARD: { name: '🔄 Hoán Bài', type: 'Ấn dùng', desc: 'Chọn 1 lá bài rác trên tay rồi ấn đổi lấy lá mới' },
  BUFF_SPY_HAND: { name: '👁️ Mắt Thần', type: 'Ấn dùng', desc: 'Soi 2 lá bài đối thủ kế tiếp' },
  BUFF_FREEZE_TURN: { name: '❄️ Băng Phong', type: 'Ấn dùng', desc: 'Đóng băng lượt của người kế tiếp' },
  BUFF_REFLECT_CUT: { name: '🪞 Gương Phản Xạ', type: 'Tự động', desc: 'Tự động phản 50% tiền phạt chặt về kẻ tấn công' },
  BUFF_DOUBLE_CHIPS: { name: '💰 Joker Nhân Đôi', type: 'Tự động', desc: 'Tự động nhân đôi tiền thưởng khi bạn về nhất ván này' },
  BUFF_BOMB_TRAP: { name: '💣 Mìn Cảm Tử', type: 'Tự động', desc: 'Tự động nổ phạt kẻ chặt 100% tiền phạt khi heo của bạn bị chặt' },
  BUFF_SHUFFLE_HAND: { name: '🌪️ Cuồng Phong', type: 'Ấn dùng', desc: 'Tự động đổi 2 lá rác nhỏ nhất trên tay lấy 2 lá mới từ cọc rút' },
  BUFF_TIME_WARP: { name: '⏳ Ngưng Đọng', type: 'Ấn dùng', desc: 'Hồi 15 giây suy nghĩ cho bản thân và giảm giờ đối thủ' },
  BUFF_HEIST: { name: '🦹 Đạo Tặc', type: 'Ấn dùng', desc: 'Rút trộm 1 lá bài của đối thủ có ít bài nhất' },
};

// Game State
let socket = null;
let currentRoomState = null;
let selectedCardIds = new Set();
let suggestedHintCardIds = new Set();
let myHandCards = [];
let sortMode = 'rank'; // 'rank' or 'suit'
let turnTimerInterval = null;

const SUIT_SYMBOLS = ['♠', '♣', '♦', '♥'];
const RANK_LABELS = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
};

// --- BALATRO PSYCHEDELIC FLUID PLASMA CANVAS SHADER ---
function initPsychedelicBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Dùng low-res buffer (180x110) để đạt 60 FPS mượt mà và tạo chất pixel retro Balatro
  const w = 180;
  const h = 110;
  canvas.width = w;
  canvas.height = h;

  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;
  let time = 0;

  function renderPlasma() {
    time += 0.006;
    let ptr = 0;

    for (let y = 0; y < h; y++) {
      const yNorm = y / h;
      for (let x = 0; x < w; x++) {
        const xNorm = x / w;

        // Balatro trigonometric wave superposition
        const v1 = Math.sin(xNorm * 10 + time);
        const v2 = Math.sin(yNorm * 8 - time * 0.9);
        const v3 = Math.sin((xNorm + yNorm) * 7 + time * 1.3);
        const cx = xNorm - 0.5 + Math.sin(time * 0.4) * 0.2;
        const cy = yNorm - 0.5 + Math.cos(time * 0.5) * 0.2;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const v4 = Math.sin(dist * 18 - time * 1.8);

        // Chuẩn hóa -1 .. 1 sang 0 .. 1
        const val = (v1 + v2 + v3 + v4) * 0.25;
        const t = (val + 1) * 0.5;

        // Dải màu Balatro: Neon Dark Purple -> Deep Magenta -> Midnight Blue -> Cyan highlight
        let r = 0, g = 0, b = 0;
        if (t < 0.35) {
          const n = t / 0.35;
          r = Math.floor(13 + (40 - 13) * n);
          g = Math.floor(4 + (0 - 4) * n);
          b = Math.floor(35 + (90 - 35) * n);
        } else if (t < 0.72) {
          const n = (t - 0.35) / 0.37;
          r = Math.floor(40 + (194 - 40) * n);
          g = Math.floor(0 + (24 - 0) * n);
          b = Math.floor(90 + (100 - 90) * n);
        } else {
          const n = (t - 0.72) / 0.28;
          r = Math.floor(194 + (0 - 194) * n);
          g = Math.floor(24 + (240 - 24) * n * 0.7);
          b = Math.floor(100 + (255 - 100) * n);
        }

        data[ptr] = r;
        data[ptr + 1] = g;
        data[ptr + 2] = b;
        data[ptr + 3] = 255;
        ptr += 4;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    requestAnimationFrame(renderPlasma);
  }

  renderPlasma();
}

function triggerScorePop(el) {
  if (!el) return;
  el.classList.remove('score-pop');
  void el.offsetWidth; // Force reflow
  el.classList.add('score-pop');
}

// --- KẾT NỐI VÀ KHỞI TẠO ---
async function setupDiscordIdentity() {
  const urlParams = new URLSearchParams(window.location.search);

  // 1. Hỗ trợ query params & sessionStorage
  const customName = urlParams.get('username') || urlParams.get('name');
  if (customName) {
    currentUser.username = customName;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('tlmn_user_name', customName);
  }
  const customAvatar = urlParams.get('avatar');
  if (customAvatar) {
    currentUser.avatarUrl = customAvatar;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('tlmn_avatar_url', customAvatar);
  }

  // 2. Nhận diện Discord Embedded App Activity
  const isDiscord = urlParams.has('frame_id') || urlParams.has('instance_id') || (window.parent && window.parent !== window);
  if (isDiscord) {
    try {
      const DiscordSDKClass = window.DiscordSDK || (window.discord && window.discord.DiscordSDK);
      if (DiscordSDKClass) {
        const clientId = urlParams.get('client_id') || '1300000000000000000';
        discordSdk = new DiscordSDKClass(clientId);
        await discordSdk.ready();

        if (discordSdk.commands && typeof discordSdk.commands.authorize === 'function') {
          try {
            const { code } = await discordSdk.commands.authorize({
              client_id: clientId,
              response_type: 'code',
              state: '',
              prompt: 'none',
              scope: ['identify', 'guilds'],
            });

            const res = await fetch('/api/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            if (res.ok) {
              const { access_token } = await res.json();
              const auth = await discordSdk.commands.authenticate({ access_token });
              if (auth && auth.user) {
                currentUser.id = auth.user.id;
                currentUser.username = auth.user.global_name || auth.user.username;
                if (auth.user.avatar) {
                  currentUser.avatarUrl = `https://cdn.discordapp.com/avatars/${auth.user.id}/${auth.user.avatar}.png?size=128`;
                } else {
                  currentUser.avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(BigInt(auth.user.id) >> 22n) % 6n}.png`;
                }
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorage.setItem('tlmn_user_id', currentUser.id);
                  sessionStorage.setItem('tlmn_user_name', currentUser.username);
                  if (currentUser.avatarUrl) sessionStorage.setItem('tlmn_avatar_url', currentUser.avatarUrl);
                }
              }
            }
          } catch (authErr) {
            console.log('Discord authorize/authenticate optional flow:', authErr);
          }
        }
      }
    } catch (sdkErr) {
      console.log('Discord SDK ready notice:', sdkErr);
    }
  }
}

async function initApp() {
  initPsychedelicBackground();
  await setupDiscordIdentity();

  playerNameDisplay.textContent = currentUser.username;
  const userAvatarMini = document.querySelector('.user-avatar-mini');
  if (userAvatarMini) {
    if (currentUser.avatarUrl) {
      userAvatarMini.innerHTML = `<img src="${currentUser.avatarUrl}" alt="${currentUser.username}" onerror="this.onerror=null; this.parentElement.textContent='👾';" />`;
    } else {
      userAvatarMini.textContent = '👾';
    }
  }

  connectWebSocket();
  setupEventListeners();
  initStickerDrawer();
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:8080';
  const wsUrl = `${protocol}//${host}`;
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    gameStatusDisplay.textContent = 'Đã kết nối máy chủ';
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'default_room';
    roomIdDisplay.textContent = roomId;

    sendEvent('JOIN_ROOM', {
      roomId,
      username: currentUser.username,
      playerId: currentUser.id,
      avatarUrl: currentUser.avatarUrl,
    });
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (e) {
      console.error('Lỗi parse WebSocket message:', e);
    }
  };

  socket.onclose = () => {
    gameStatusDisplay.textContent = 'Mất kết nối máy chủ';
    showToast('Mất kết nối đến máy chủ game. Vui lòng thử lại!');
  };
}

function sendEvent(type, payload = {}) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, ...payload }));
  }
}

// --- XỬ LÝ SỰ KIỆN TỪ SERVER ---
function handleServerMessage(msg) {
  if (msg.type === 'ROOM_STATE_UPDATE') {
    const prevCombo = currentRoomState?.lastComboOnTable;
    currentRoomState = msg;

    // Kiểm tra hiệu ứng Chặt hàng / Chặt heo
    if (msg.extraEvent?.type === 'HAND_PLAYED') {
      if (msg.extraEvent.combo) {
        const newCombo = msg.extraEvent.combo;
        if (prevCombo && (prevCombo.cards.some((c) => c.rank === 15) || prevCombo.type === 'THREE_PAIR_STRAIGHT') && newCombo.type !== prevCombo.type) {
          triggerChopEffect('💥 CHẶT HÀNG! 💥');
        } else {
          soundFx.playCardPlay();
        }
      } else if (msg.extraEvent.isPass) {
        showToast('Một người chơi đã bỏ lượt');
      }

      // Khi ván đấu kết thúc -> Hiện bảng tổng kết
      if (msg.extraEvent.isMatchOver && msg.extraEvent.matchResult) {
        renderMatchEndModal(msg.extraEvent.matchResult);
      }
    }

    if (msg.extraEvent?.type === 'BUFF_ACTIVATED') {
      soundFx.playBuffActivate();
      showToast(`✨ ${msg.extraEvent.message || `Kích hoạt Buff: ${msg.extraEvent.buffId}`}`);
    }

    if (msg.extraEvent?.type === 'BOT_SKILL_USED') {
      soundFx.playBuffActivate();
      showToast(`🤖 ${msg.extraEvent.description}`);
    }

    renderRoomState();
  } else if (msg.type === 'STICKER_REACTION') {
    displayStickerReaction(msg.playerId, msg.stickerId);
  } else if (msg.type === 'SPY_RESULT') {
    soundFx.playBuffActivate();
    showToast(msg.message);
  } else if (msg.type === 'ERROR_EVENT') {
    showToast(`⚠️ ${msg.message}`);
  }
}

function displayStickerReaction(playerId, stickerId) {
  const sticker = STICKER_LIST.find((s) => s.id === stickerId);
  if (!sticker) return;

  const myPlayer = currentRoomState?.players?.find(
    (p) => (currentRoomState.yourPlayerId && p.id === currentRoomState.yourPlayerId) || p.username === currentUser.username
  );
  const mySeatIndex = myPlayer ? myPlayer.seatIndex : -1;

  let targetContainer = null;

  if (playerId === myPlayer?.id) {
    targetContainer = document.getElementById('sticker-reaction-bottom');
  } else if (currentRoomState?.players) {
    const opponents = currentRoomState.players.filter((p) => p.seatIndex !== mySeatIndex);
    const oppIdx = opponents.findIndex((p) => p.id === playerId);
    const oppSlotIds = ['sticker-reaction-left', 'sticker-reaction-top', 'sticker-reaction-right'];
    if (oppIdx >= 0 && oppIdx < oppSlotIds.length) {
      targetContainer = document.getElementById(oppSlotIds[oppIdx]);
    }
  }

  if (!targetContainer) {
    targetContainer = document.getElementById('sticker-reaction-bottom');
  }

  if (targetContainer) {
    soundFx.playCardSelect();
    const el = document.createElement('div');
    el.className = 'floating-sticker';
    el.innerHTML = sticker.svg;
    targetContainer.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 2500);
  }
}

function initStickerDrawer() {
  if (!stickerGrid) return;
  stickerGrid.innerHTML = '';

  STICKER_LIST.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'sticker-item';
    item.title = `${s.name} - ${s.desc}`;
    item.innerHTML = `
      ${s.svg}
      <span class="sticker-name">${s.name}</span>
    `;

    item.onclick = () => {
      soundFx.playCardSelect();
      sendEvent('SEND_STICKER', { stickerId: s.id });
      if (stickerDrawer) {
        stickerDrawer.classList.add('hidden');
      }
    };

    stickerGrid.appendChild(item);
  });

  if (btnStickerToggle && stickerDrawer) {
    btnStickerToggle.onclick = (e) => {
      e.stopPropagation();
      soundFx.playCardSelect();
      stickerDrawer.classList.toggle('hidden');
    };
  }

  if (btnCloseStickers && stickerDrawer) {
    btnCloseStickers.onclick = (e) => {
      e.stopPropagation();
      stickerDrawer.classList.add('hidden');
    };
  }

  // Bấm ra ngoài thì đóng khay sticker
  document.addEventListener('click', (e) => {
    if (stickerDrawer && !stickerDrawer.classList.contains('hidden')) {
      if (!stickerDrawer.contains(e.target) && e.target !== btnStickerToggle) {
        stickerDrawer.classList.add('hidden');
      }
    }
  });
}

function triggerChopEffect(bannerText) {
  soundFx.playChop();
  appEl.classList.add('shake');
  setTimeout(() => appEl.classList.remove('shake'), 400);

  if (impactBanner) {
    impactBanner.textContent = bannerText;
    impactBanner.classList.add('show');
    setTimeout(() => impactBanner.classList.remove('show'), 1500);
  }
}

function renderRoomState() {
  if (!currentRoomState) return;

  gameStatusDisplay.textContent = getStatusText(currentRoomState.status);

  // Tìm thông tin của chính mình (ưu tiên yourPlayerId do server phát sóng)
  const myPlayer = currentRoomState.players.find(
    (p) => (currentRoomState.yourPlayerId && p.id === currentRoomState.yourPlayerId) || p.username === currentUser.username
  );
  const mySeatIndex = myPlayer ? myPlayer.seatIndex : -1;
  const isMyTurn = currentRoomState.currentTurnSeatIndex === mySeatIndex && currentRoomState.status === 'PLAYING';

  // 1. Đồng bộ bài trên tay & tính gợi ý sáng bài
  if (myPlayer && myPlayer.handCards) {
    syncMyHandCards(myPlayer.handCards);
    const tableCombo = currentRoomState.lastComboOnTable;
    const hasTableCombo = tableCombo && tableCombo.type && tableCombo.type !== 'INVALID';
    const reqCardId = currentRoomState.firstTurnRequiredCard?.id;

    if (isMyTurn && hasTableCombo) {
      const hintComboCards = findAutoBeatCombo(myHandCards, tableCombo);
      suggestedHintCardIds = new Set((hintComboCards || []).map((c) => c.id));
    } else if (isMyTurn && reqCardId !== undefined && reqCardId !== null) {
      // Lượt đầu ván 1: Tự động sáng tổ hợp chứa lá bài bắt buộc
      const hintComboCards = findAutoBeatCombo(myHandCards, null, reqCardId);
      suggestedHintCardIds = new Set((hintComboCards || []).map((c) => c.id));
    } else {
      suggestedHintCardIds.clear();
    }
    renderHandCards();
  }

  // 2. Render các đối thủ (Top, Left, Right)
  renderOpponents(mySeatIndex);

  // 3. Render bài trên bàn
  renderTableCenter();

  // 4. Render khay Buff
  renderBuffTray(myPlayer?.buffs || []);

  // 5. Render Modal Draft Buff nếu đang ở phase BUFF_DRAFT
  if (currentRoomState.status === 'BUFF_DRAFT' && currentRoomState.myDraftOptions) {
    renderBuffDraftModal(currentRoomState.myDraftOptions);
  } else {
    buffModal.classList.add('hidden');
  }

  // 6. Highlight người đang đến lượt
  updateActiveTurnHighlight(currentRoomState.currentTurnSeatIndex, mySeatIndex);

  // 7. Render Avatar của chính mình tại slot-bottom
  const myAvatarEl = document.querySelector('.my-avatar');
  if (myAvatarEl && myPlayer) {
    renderAvatarElement(myAvatarEl, myPlayer);
  }

  // 8. Cập nhật trạng thái nút và kiểm tra tính hợp lệ của bài chọn
  if (currentRoomState.status === 'LOBBY') {
    matchEndModal?.classList.add('hidden');
  }
  btnReady.style.display = currentRoomState.status === 'LOBBY' ? 'inline-block' : 'none';
  if (btnAddBot) {
    const isLobby = currentRoomState.status === 'LOBBY';
    const isFull = (currentRoomState.players?.length || 0) >= 4;
    btnAddBot.style.display = isLobby ? 'inline-block' : 'none';
    btnAddBot.disabled = isFull;
    btnAddBot.style.opacity = isFull ? '0.5' : '1';
    btnAddBot.style.cursor = isFull ? 'not-allowed' : 'pointer';
    btnAddBot.title = isFull ? 'Phòng đã đủ 4 người' : 'Thêm 1 Bot vào phòng';
  }
  btnReady.textContent = myPlayer?.isReady ? 'HỦY SẴN SÀNG' : 'SẴN SÀNG';

  const validation = updateComboValidationState(isMyTurn);

  // Cập nhật trạng thái nút Đánh Bài & Bỏ Lượt với phản hồi trực quan
  const isPlayable = isMyTurn && validation.isValid && validation.canBeat;
  btnPlay.disabled = false; // Luôn để mở để người chơi bấm sẽ nhận được thông báo hướng dẫn rõ ràng
  if (isPlayable) {
    btnPlay.classList.add('btn-play-ready');
    btnPlay.classList.remove('btn-play-inactive');
    btnPlay.title = 'Bấm để đánh bộ bài này!';
  } else {
    btnPlay.classList.remove('btn-play-ready');
    btnPlay.classList.add('btn-play-inactive');
    btnPlay.title = !isMyTurn ? 'Chưa tới lượt của bạn' : (validation.label || 'Chọn bài hợp lệ để đánh');
  }

  const canPass = isMyTurn && !!currentRoomState.lastComboOnTable;
  btnPass.disabled = false;
  if (canPass) {
    btnPass.classList.remove('btn-pass-inactive');
  } else {
    btnPass.classList.add('btn-pass-inactive');
  }

  if (btnClear) {
    btnClear.disabled = selectedCardIds.size === 0;
  }
}

function renderAvatarElement(avatarEl, player) {
  if (!avatarEl) return;
  if (player?.avatarUrl) {
    const currentImg = avatarEl.querySelector('img');
    if (!currentImg || currentImg.src !== player.avatarUrl) {
      avatarEl.innerHTML = `<img class="avatar-img" src="${player.avatarUrl}" alt="${player.username || ''}" onerror="this.onerror=null; this.parentElement.textContent='${player.isBot ? '🤖' : '👾'}';" />`;
    }
  } else {
    avatarEl.textContent = player?.isBot ? '🤖' : '👾';
  }
}

function getSelectedCardsList() {
  return myHandCards.filter((c) => selectedCardIds.has(c.id));
}

function updateComboValidationState(isMyTurn = false) {
  const selectedCards = getSelectedCardsList();
  const reqCard = currentRoomState?.firstTurnRequiredCard;
  let reqLabel = '';
  if (reqCard) {
    const suitSym = SUIT_SYMBOLS[reqCard.suit] || '';
    reqLabel = `${RANK_LABELS[reqCard.rank]}${suitSym}`;
  }

  if (selectedCards.length === 0) {
    if (btnClear) btnClear.disabled = true;

    // Khi đến lượt mà người chơi chưa chọn bài -> Hiển thị huy hiệu gợi ý tự động
    if (isMyTurn && comboPreviewBadge && comboBadgeIcon && comboBadgeText) {
      comboPreviewBadge.classList.remove('hidden', 'valid', 'beat', 'chop', 'cannot-beat', 'invalid', 'hint');
      if (reqCard && myHandCards.some((c) => c.id === reqCard.id)) {
        comboPreviewBadge.classList.add('hint');
        comboBadgeIcon.textContent = '💡';
        comboBadgeText.textContent = `VÁN ĐẦU: Bắt buộc đánh bộ bài chứa [${reqLabel}]`;
        if (btnPass) btnPass.classList.remove('btn-pass-highlight');
      } else if (suggestedHintCardIds.size > 0) {
        const hintCards = myHandCards.filter((c) => suggestedHintCardIds.has(c.id));
        const hintCombo = evaluateLocalCombo(hintCards);
        comboPreviewBadge.classList.add('hint');
        comboBadgeIcon.textContent = '💡';
        comboBadgeText.textContent = `GỢI Ý: ${hintCombo.label} (Chạm bài đang sáng để chọn)`;
        if (btnPass) btnPass.classList.remove('btn-pass-highlight');
      } else if (currentRoomState?.lastComboOnTable) {
        comboPreviewBadge.classList.add('cannot-beat');
        comboBadgeIcon.textContent = '⚠️';
        comboBadgeText.textContent = 'KHÔNG CÓ BÀI ĐÈ ĐƯỢC • HÃY BẤM BỎ LƯỢT';
        if (btnPass) btnPass.classList.add('btn-pass-highlight');
      } else {
        comboPreviewBadge.classList.add('hidden');
        if (btnPass) btnPass.classList.remove('btn-pass-highlight');
      }
    } else {
      if (comboPreviewBadge) comboPreviewBadge.classList.add('hidden');
      if (btnPass) btnPass.classList.remove('btn-pass-highlight');
    }
    return { isValid: false, canBeat: false, label: 'Bạn chưa chọn lá bài nào' };
  }

  if (btnClear) btnClear.disabled = false;
  if (btnPass) btnPass.classList.remove('btn-pass-highlight');

  // Kiểm tra ràng buộc lá bài nhỏ nhất nếu là lượt đầu ván 1
  if (reqCard) {
    const hasReq = selectedCards.some((c) => c.id === reqCard.id);
    if (!hasReq) {
      if (comboPreviewBadge && comboBadgeIcon && comboBadgeText) {
        comboPreviewBadge.classList.remove('hidden', 'valid', 'beat', 'chop', 'cannot-beat', 'invalid', 'hint');
        comboPreviewBadge.classList.add('invalid');
        comboBadgeIcon.textContent = '⚠️';
        comboBadgeText.textContent = `BẮT BUỘC CHỨA LÁ [${reqLabel}]`;
      }
      return {
        isValid: false,
        canBeat: false,
        label: `Nước đi đầu tiên của ván đầu bắt buộc phải chứa lá [${reqLabel}]!`,
      };
    }
  }

  const myCombo = evaluateLocalCombo(selectedCards);
  const targetCombo = currentRoomState?.lastComboOnTable;
  const isFreeTurn = !targetCombo || !targetCombo.type || targetCombo.type === 'INVALID';

  if (!comboPreviewBadge || !comboBadgeIcon || !comboBadgeText) {
    return {
      isValid: myCombo.isValid,
      canBeat: isFreeTurn ? myCombo.isValid : canBeatComboClient(targetCombo, myCombo),
      label: myCombo.label,
    };
  }

  comboPreviewBadge.classList.remove('hidden', 'valid', 'beat', 'chop', 'cannot-beat', 'invalid', 'hint');

  if (!myCombo.isValid) {
    comboPreviewBadge.classList.add('invalid');
    comboBadgeIcon.textContent = '⚠️';
    comboBadgeText.textContent = `${myCombo.label || 'BÀI KHÔNG HỢP LỆ'}`;
    return { isValid: false, canBeat: false, label: myCombo.label || 'Bài không hợp lệ theo luật TLMN' };
  }

  if (isFreeTurn) {
    comboPreviewBadge.classList.add('valid');
    comboBadgeIcon.textContent = '✅';
    comboBadgeText.textContent = `${myCombo.label} • HỢP LỆ`;
    return { isValid: true, canBeat: true, label: myCombo.label };
  }

  const canBeat = canBeatComboClient(targetCombo, myCombo);
  const chop = isChopMove(targetCombo, myCombo);

  if (canBeat) {
    if (chop) {
      comboPreviewBadge.classList.add('chop');
      comboBadgeIcon.textContent = '💥';
      comboBadgeText.textContent = `CHẶT HÀNG! • ${myCombo.label}`;
    } else {
      comboPreviewBadge.classList.add('beat');
      comboBadgeIcon.textContent = '✅';
      comboBadgeText.textContent = `ĐÈ ĐƯỢC! • ${myCombo.label}`;
    }
    return { isValid: true, canBeat: true, label: myCombo.label };
  } else {
    comboPreviewBadge.classList.add('cannot-beat');
    comboBadgeIcon.textContent = '❌';
    comboBadgeText.textContent = `BÉ HƠN BÀN • ${myCombo.label}`;
    return { isValid: true, canBeat: false, label: `Bài của bạn bé hơn (${myCombo.label})` };
  }
}

function sortMyHandCards() {
  myHandCards.sort((a, b) => {
    if (sortMode === 'rank') {
      return a.rank !== b.rank ? a.rank - b.rank : a.suit - b.suit;
    }
    return a.suit !== b.suit ? a.suit - b.suit : a.rank - b.rank;
  });
}

function syncMyHandCards(incomingCards) {
  if (!incomingCards || incomingCards.length === 0) {
    myHandCards = [];
    return;
  }
  // Khi bắt đầu ván mới (chia đủ 13 lá lần đầu) -> tự động xếp theo thứ tự mặc định
  if (myHandCards.length === 0 || (incomingCards.length === 13 && myHandCards.length < 10)) {
    myHandCards = [...incomingCards];
    sortMyHandCards();
    return;
  }

  // Giữ nguyên vị trí các lá bài mà người chơi đã tự kéo thả sắp xếp trên tay
  const incomingMap = new Map(incomingCards.map((c) => [c.id, c]));
  const preserved = [];
  for (const existing of myHandCards) {
    if (incomingMap.has(existing.id)) {
      preserved.push(incomingMap.get(existing.id));
      incomingMap.delete(existing.id);
    }
  }
  for (const newCard of incomingMap.values()) {
    preserved.push(newCard);
  }
  myHandCards = preserved;
}

// Hỗ trợ:
// 1. ẤN (Click) vào lá bài để chọn / bỏ chọn bài nhanh chóng, chính xác
// 2. KÉO THẢ (Drag & Drop) để sắp xếp bài theo vị trí mong muốn trên tay
let dragReorderState = null;
let isDraggingReorder = false;
let blockCardClickUntil = 0;

function setupHandContainerDragEvents() {
  myHandContainer.addEventListener('pointerdown', (e) => {
    const cardEl = e.target.closest('.card');
    if (!cardEl || !cardEl.dataset.cardId) return;
    const cardId = Number(cardEl.dataset.cardId);
    dragReorderState = {
      cardId,
      activeEl: cardEl,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
    };
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragReorderState) return;
    const dx = e.clientX - dragReorderState.startX;
    const dy = e.clientY - dragReorderState.startY;

    // Ngưỡng 14px phân biệt rạch ròi giữa ẤN CHỌN BÀI và KÉO XẾP BÀI
    if (!dragReorderState.hasMoved && Math.hypot(dx, dy) > 14) {
      dragReorderState.hasMoved = true;
      isDraggingReorder = true;
      dragReorderState.activeEl.classList.add('dragging-reorder');
    }

    if (dragReorderState.hasMoved) {
      dragReorderState.activeEl.style.transform = `translate(${dx}px, ${dy - 10}px)`;

      // Kiểm tra khi kéo lá bài băng qua tâm lá bài khác -> đổi chỗ tức thì
      const cardElements = Array.from(myHandContainer.querySelectorAll('.card'));
      for (const otherEl of cardElements) {
        if (otherEl === dragReorderState.activeEl) continue;
        const rect = otherEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const otherCardId = Number(otherEl.dataset.cardId);
        const fromIdx = myHandCards.findIndex((c) => c.id === dragReorderState.cardId);
        const toIdx = myHandCards.findIndex((c) => c.id === otherCardId);

        if (fromIdx === -1 || toIdx === -1) continue;

        if (
          (fromIdx < toIdx && e.clientX > centerX) ||
          (fromIdx > toIdx && e.clientX < centerX)
        ) {
          const [movedCard] = myHandCards.splice(fromIdx, 1);
          myHandCards.splice(toIdx, 0, movedCard);

          if (toIdx < fromIdx) {
            myHandContainer.insertBefore(dragReorderState.activeEl, otherEl);
          } else {
            myHandContainer.insertBefore(dragReorderState.activeEl, otherEl.nextSibling);
          }

          dragReorderState.startX = e.clientX;
          dragReorderState.startY = e.clientY;
          dragReorderState.activeEl.style.transform = `translate(0px, -10px)`;
          soundFx.playCardHover();
          break;
        }
      }
    }
  });

  window.addEventListener('pointerup', () => {
    if (!dragReorderState) return;
    const hadMoved = dragReorderState.hasMoved;
    const activeEl = dragReorderState.activeEl;
    dragReorderState = null;

    if (activeEl) {
      activeEl.classList.remove('dragging-reorder');
      activeEl.style.transform = '';
    }

    if (hadMoved) {
      // Đã kéo thả xếp bài -> khóa click trong 150ms để không kích hoạt chọn bài ngoài ý muốn
      blockCardClickUntil = Date.now() + 150;
      isDraggingReorder = false;
      renderHandCards();
    } else {
      isDraggingReorder = false;
    }
  });

  window.addEventListener('pointercancel', () => {
    if (dragReorderState?.activeEl) {
      dragReorderState.activeEl.classList.remove('dragging-reorder');
      dragReorderState.activeEl.style.transform = '';
    }
    dragReorderState = null;
    isDraggingReorder = false;
  });
}

function renderHandCards() {
  myHandContainer.innerHTML = '';

  myHandCards.forEach((card, idx) => {
    const isRed = card.suit === 2 || card.suit === 3;
    const isSelected = selectedCardIds.has(card.id);
    const isHinted = suggestedHintCardIds.has(card.id) && selectedCardIds.size === 0;
    const isRequiredFirst = currentRoomState?.firstTurnRequiredCard?.id === card.id;
    const cardEl = document.createElement('div');
    cardEl.className = `card ${isRed ? 'red' : 'black'} ${isSelected ? 'selected' : ''} ${isHinted ? 'suggested-hint' : ''} ${isRequiredFirst ? 'required-first-card' : ''}`;
    cardEl.style.setProperty('--card-index', idx);
    cardEl.dataset.cardId = card.id;
    
    const rankLabel = RANK_LABELS[card.rank];
    const suitSymbol = SUIT_SYMBOLS[card.suit];

    cardEl.innerHTML = `
      <div class="card-top"><span>${rankLabel}</span><span>${suitSymbol}</span></div>
      <div class="card-center">${suitSymbol}</div>
      <div class="card-bottom">${rankLabel}</div>
    `;

    // Click trực tiếp vào lá bài: Nhận diện tức thì không bị nuốt click
    cardEl.onclick = (e) => {
      e.stopPropagation();
      if (isDraggingReorder || Date.now() < blockCardClickUntil) return;

      soundFx.playCardSelect();
      if (selectedCardIds.has(card.id)) {
        selectedCardIds.delete(card.id);
      } else if (selectedCardIds.size === 0 && suggestedHintCardIds.has(card.id)) {
        // Nếu chạm vào lá đang sáng gợi ý -> Tự động chọn trọn bộ gợi ý
        suggestedHintCardIds.forEach((id) => selectedCardIds.add(id));
      } else {
        selectedCardIds.add(card.id);
      }
      renderRoomState();
    };

    cardEl.onmouseenter = () => {
      if (!dragReorderState) soundFx.playCardHover();
    };

    myHandContainer.appendChild(cardEl);
  });
}

function renderOpponents(mySeatIndex) {
  const opponentSlots = [
    document.getElementById('slot-left'),
    document.getElementById('slot-top'),
    document.getElementById('slot-right'),
  ];

  opponentSlots.forEach((slot) => {
    slot.querySelector('.name').textContent = 'Đang chờ...';
    slot.querySelector('.card-count').textContent = '[0 LÁ]';
    const chipsEl = slot.querySelector('.chips-badge');
    if (chipsEl) chipsEl.textContent = '$1000';
    const bubble = slot.querySelector('.status-bubble');
    if (bubble) bubble.classList.add('hidden');
  });

  if (!currentRoomState.players) return;

  const opponents = currentRoomState.players.filter((p) => p.seatIndex !== mySeatIndex);
  opponents.forEach((opp, idx) => {
    if (idx < opponentSlots.length) {
      const slot = opponentSlots[idx];
      slot.querySelector('.name').textContent = opp.username;

      // Trong Lobby: Hiển thị trạng thái Sẵn sàng / Chờ; Trong ván: Hiển thị số lá bài
      const countEl = slot.querySelector('.card-count');
      if (currentRoomState.status === 'LOBBY') {
        countEl.textContent = opp.isReady ? '[SẴN SÀNG ✅]' : '[ĐANG CHỜ ⏳]';
        countEl.style.color = opp.isReady ? '#06d6a0' : '#ffd166';
      } else {
        countEl.textContent = `[${opp.cardCount} LÁ]`;
        countEl.style.color = '';
      }

      const avatarEl = slot.querySelector('.avatar');
      if (avatarEl) {
        renderAvatarElement(avatarEl, opp);
      }

      const chipsEl = slot.querySelector('.chips-badge');
      if (chipsEl) {
        const oldText = chipsEl.textContent;
        const newText = `$${opp.score || 1000}`;
        if (oldText !== newText) {
          chipsEl.textContent = newText;
          triggerScorePop(chipsEl);
        }
      }

      // Hiển thị Bong bóng trạng thái Balatro
      const bubble = slot.querySelector('.status-bubble');
      if (bubble) {
        if (opp.hasPassedRound) {
          bubble.textContent = 'BỎ LƯỢT';
          bubble.classList.remove('hidden');
        } else if (opp.isBot && currentRoomState.currentTurnSeatIndex === opp.seatIndex && currentRoomState.status === 'PLAYING') {
          bubble.textContent = 'ĐANG NGHĨ...';
          bubble.classList.remove('hidden');
        } else {
          bubble.classList.add('hidden');
        }
      }
    }
  });

  // Cập nhật số chip của chính mình trên Header kèm Score Pop
  const myPlayer = currentRoomState.players.find((p) => p.seatIndex === mySeatIndex);
  const myChipsDisplay = document.getElementById('my-chips-display');
  if (myChipsDisplay && myPlayer) {
    const oldText = myChipsDisplay.textContent;
    const newText = `$${myPlayer.score || 1000}`;
    if (oldText !== newText) {
      myChipsDisplay.textContent = newText;
      triggerScorePop(myChipsDisplay);
    }
  }
}

function updateActiveTurnHighlight(currentTurnSeatIndex, mySeatIndex) {
  const allSlots = [
    document.getElementById('slot-bottom'),
    document.getElementById('slot-left'),
    document.getElementById('slot-top'),
    document.getElementById('slot-right'),
  ];
  allSlots.forEach((s) => s.classList.remove('active-turn'));

  // Xóa timer cũ
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
  }

  // Reset tất cả các thanh timer bar
  document.querySelectorAll('.timer-bar').forEach((tb) => {
    tb.style.strokeDashoffset = '276';
    tb.style.stroke = '#00e676';
  });

  let activeSlot = null;
  if (currentTurnSeatIndex === mySeatIndex) {
    activeSlot = document.getElementById('slot-bottom');
  } else {
    const opponents = currentRoomState.players.filter((p) => p.seatIndex !== mySeatIndex);
    const oppIndex = opponents.findIndex((p) => p.seatIndex === currentTurnSeatIndex);
    if (oppIndex >= 0 && oppIndex < 3) {
      const oppSlots = [
        document.getElementById('slot-left'),
        document.getElementById('slot-top'),
        document.getElementById('slot-right'),
      ];
      activeSlot = oppSlots[oppIndex];
    }
  }

  if (activeSlot) {
    activeSlot.classList.add('active-turn');

    // Kích hoạt vòng tròn đếm ngược thời gian SVG (Radial Countdown Sweep)
    if (currentRoomState.status === 'PLAYING') {
      const activeTimerBar = activeSlot.querySelector('.timer-bar');
      const startTimestamp = Date.now();
      const totalDuration = 15000; // 15 giây

      turnTimerInterval = setInterval(() => {
        const elapsed = Date.now() - startTimestamp;
        const remaining = Math.max(0, totalDuration - elapsed);
        const progress = remaining / totalDuration; // 1 -> 0
        const offset = 276 * (1 - progress);

        if (activeTimerBar) {
          activeTimerBar.style.strokeDashoffset = `${offset}`;
          if (remaining > 7000) {
            activeTimerBar.style.stroke = '#00e676'; // Xanh lá
          } else if (remaining > 3500) {
            activeTimerBar.style.stroke = '#ffab00'; // Vàng cam
          } else {
            activeTimerBar.style.stroke = '#ff1744'; // Đỏ nhấp nháy báo động
          }
        }

        if (remaining <= 0) {
          clearInterval(turnTimerInterval);
          turnTimerInterval = null;
        }
      }, 100);
    }
  }
}

function renderTableCenter() {
  playedCardsArea.innerHTML = '';
  const lastCombo = currentRoomState.lastComboOnTable;

  if (!lastCombo || !lastCombo.cards || lastCombo.cards.length === 0) {
    playedCardsArea.innerHTML = '<span class="empty-table-text">Bàn chơi trống - Đến lượt đánh tự do</span>';
    return;
  }

  lastCombo.cards.forEach((card, idx) => {
    const isRed = card.suit === 2 || card.suit === 3;
    const cardEl = document.createElement('div');
    cardEl.className = `card card-tossed ${isRed ? 'red' : 'black'}`;
    const rankLabel = RANK_LABELS[card.rank];
    const suitSymbol = SUIT_SYMBOLS[card.suit];

    // Tạo góc ném bài ngẫu nhiên nhẹ phong cách GOP3 (-4 đến +4 độ)
    const baseAngle = ((idx % 3) - 1) * 3;
    const jitter = (card.id % 5) - 2;
    const finalAngle = baseAngle + jitter;
    cardEl.style.transform = `rotate(${finalAngle}deg) translateY(${Math.abs(jitter) * 2}px)`;

    cardEl.innerHTML = `
      <div class="card-top"><span>${rankLabel}</span><span>${suitSymbol}</span></div>
      <div class="card-center">${suitSymbol}</div>
      <div class="card-bottom">${rankLabel}</div>
    `;
    playedCardsArea.appendChild(cardEl);
  });
}

function renderBuffTray(buffs) {
  buffTray.innerHTML = '';
  buffs.forEach((b) => {
    const meta = BUFF_METADATA[b.buffId] || { name: b.buffId, type: 'Kỹ năng', desc: '' };
    const isActive = meta.type === 'Ấn dùng';
    const chip = document.createElement('div');
    chip.className = `buff-chip ${b.rarity || 'RARE'} ${isActive ? 'active-buff' : 'passive-buff'}`;
    chip.title = `${meta.name}: ${meta.desc}`;
    chip.innerHTML = `${meta.name} [${meta.type}] (${b.remainingCharges} lượt)`;

    chip.onclick = () => {
      soundFx.playBuffActivate();

      // Nếu là kỹ năng Bị Động
      if (meta.type === 'Tự động') {
        showToast(`🛡️ ${meta.name} là kỹ năng TỰ ĐỘNG - sẽ tự động kích hoạt khi có tình huống!`);
        return;
      }

      // Kỹ năng Chủ động: Hoán bài
      if (b.buffId === 'BUFF_SWAP_CARD') {
        const firstSelected = Array.from(selectedCardIds)[0];
        if (!firstSelected) {
          showToast('⚠️ Vui lòng chọn 1 lá bài rác trên tay trước khi bấm Hoán Bài!');
          return;
        }
        sendEvent('USE_BUFF', { buffId: b.buffId, cardIds: [firstSelected] });
        selectedCardIds.delete(firstSelected);
        return;
      }

      // Kỹ năng Chủ động khác (Cuồng Phong, Ngưng Đọng, Đạo Tặc, Mắt Thần, Băng Phong)
      sendEvent('USE_BUFF', { buffId: b.buffId });
    };
    buffTray.appendChild(chip);
  });
}

function renderBuffDraftModal(options) {
  buffOptionsContainer.innerHTML = '';
  buffModal.classList.remove('hidden');

  // Cập nhật nút Đổi Lại (Reroll)
  const remaining = currentRoomState?.myRerollRemaining ?? 3;
  if (btnRerollBuff) {
    btnRerollBuff.textContent = `🎲 ĐỔI LẠI (Còn ${remaining}/3)`;
    btnRerollBuff.disabled = remaining <= 0;
    btnRerollBuff.style.opacity = remaining <= 0 ? '0.4' : '1';
    btnRerollBuff.style.cursor = remaining <= 0 ? 'not-allowed' : 'pointer';

    btnRerollBuff.onclick = () => {
      soundFx.playCardSelect();
      sendEvent('REROLL_BUFFS', {});
    };
  }

  options.forEach((opt) => {
    const card = document.createElement('div');
    card.className = `buff-card`;
    card.innerHTML = `
      <div class="buff-icon">⚡</div>
      <div class="buff-name">${opt.name}</div>
      <div class="buff-desc">${opt.description}</div>
    `;
    card.onclick = () => {
      soundFx.playBuffActivate();
      sendEvent('SELECT_BUFF', { buffId: opt.id });
      // Lập tức ẩn cửa sổ chọn buff theo yêu cầu
      buffModal.classList.add('hidden');
      showToast(`🃏 Đã chọn [${opt.name}]!`);
    };
    buffOptionsContainer.appendChild(card);
  });
}

function triggerConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#ffd700', '#ffb300', '#00e676', '#ff1744', '#00e5ff', '#fff'];
  for (let i = 0; i < 45; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    container.appendChild(piece);
  }
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

function renderMatchEndModal(result) {
  if (!matchEndModal || !result) return;
  matchWinnerText.textContent = `👑 Quán quân Saloon: ${result.winnerUsername}!`;
  scoreboardContainer.innerHTML = '';

  // Phát nhạc chiến thắng và pháo hoa giấy vàng
  soundFx.playVictorySaloon();
  setTimeout(() => soundFx.playChipsClink(), 500);
  triggerConfetti();

  result.rankings.forEach((r, idx) => {
    const row = document.createElement('div');
    row.className = `score-row ${r.isWinner ? 'winner' : ''}`;
    const medal = r.isWinner ? '🏆' : `#${idx + 1}`;
    const deltaText = r.scoreDelta >= 0 ? `+${r.scoreDelta}` : `${r.scoreDelta}`;
    const deltaClass = r.scoreDelta >= 0 ? 'pos' : 'neg';

    let note = '';
    if (r.isCong) note = ' (Bị Cóng!)';
    else if (r.penaltyDetail?.redPigs > 0) note = ` (Thối ${r.penaltyDetail.redPigs} Heo đỏ)`;
    else if (r.penaltyDetail?.blackPigs > 0) note = ` (Thối ${r.penaltyDetail.blackPigs} Heo đen)`;

    row.innerHTML = `
      <div class="score-name">${medal} ${r.username}${note}</div>
      <div class="score-delta ${deltaClass}">${deltaText} vàng</div>
    `;
    scoreboardContainer.appendChild(row);
  });

  matchEndModal.classList.remove('hidden');
}

function setupEventListeners() {
  btnReady.onclick = () => {
    const myPlayer = currentRoomState?.players.find((p) => p.username === currentUser.username);
    sendEvent('PLAYER_READY', { isReady: !myPlayer?.isReady });
  };

  if (btnAddBot) {
    btnAddBot.onclick = () => {
      sendEvent('ADD_BOT', {});
    };
  }

  if (btnClear) {
    btnClear.onclick = () => {
      soundFx.playCardSelect();
      selectedCardIds.clear();
      renderRoomState();
    };
  }

  if (btnPlayAgain) {
    btnPlayAgain.onclick = () => {
      sendEvent('PLAY_AGAIN', {});
      matchEndModal.classList.add('hidden');
    };
  }

  btnPlay.onclick = () => {
    const myPlayer = currentRoomState?.players.find(
      (p) => (currentRoomState.yourPlayerId && p.id === currentRoomState.yourPlayerId) || p.username === currentUser.username
    );
    const mySeatIndex = myPlayer ? myPlayer.seatIndex : -1;
    const isMyTurn = currentRoomState?.currentTurnSeatIndex === mySeatIndex && currentRoomState?.status === 'PLAYING';

    if (!isMyTurn) {
      soundFx.playCardHover();
      showToast('⏳ Chưa tới lượt của bạn! Vui lòng chờ đến lượt.');
      return;
    }

    if (selectedCardIds.size === 0) {
      soundFx.playCardHover();
      showToast('⚠️ Vui lòng chọn ít nhất 1 lá bài trên tay!');
      return;
    }

    if (currentRoomState?.firstTurnRequiredCard) {
      const req = currentRoomState.firstTurnRequiredCard;
      if (!selectedCardIds.has(req.id)) {
        soundFx.playCardHover();
        const suitSym = SUIT_SYMBOLS[req.suit] || '';
        const reqLabel = `${RANK_LABELS[req.rank]}${suitSym}`;
        showToast(`⚠️ Nước đi đầu tiên của ván đầu bắt buộc phải chứa lá [${reqLabel}]!`);
        return;
      }
    }

    const validation = updateComboValidationState(true);
    if (!validation.isValid) {
      soundFx.playCardHover();
      showToast(`⚠️ ${validation.label || 'Bài chọn không tạo thành bộ hợp lệ theo luật TLMN!'}`);
      return;
    }

    if (!validation.canBeat) {
      soundFx.playCardHover();
      showToast(`❌ ${validation.label || 'Bài của bạn bé hơn bài trên bàn, không đè được!'}`);
      return;
    }

    // Đánh bài hợp lệ!
    const idsToPlay = Array.from(selectedCardIds).map(Number);
    soundFx.playCardPlay();
    sendEvent('PLAY_HAND', { cardIds: idsToPlay });
    selectedCardIds.clear();
    renderRoomState();
  };

  btnPass.onclick = () => {
    const myPlayer = currentRoomState?.players.find(
      (p) => (currentRoomState.yourPlayerId && p.id === currentRoomState.yourPlayerId) || p.username === currentUser.username
    );
    const mySeatIndex = myPlayer ? myPlayer.seatIndex : -1;
    const isMyTurn = currentRoomState?.currentTurnSeatIndex === mySeatIndex && currentRoomState?.status === 'PLAYING';

    if (!isMyTurn) {
      soundFx.playCardHover();
      showToast('⏳ Chưa tới lượt của bạn!');
      return;
    }

    if (!currentRoomState?.lastComboOnTable) {
      soundFx.playCardHover();
      showToast('⚠️ Bạn đang có quyền đánh tự do, không thể bỏ lượt!');
      return;
    }

    soundFx.playPass();
    sendEvent('PASS_TURN', {});
    selectedCardIds.clear();
    renderRoomState();
  };

  if (comboPreviewBadge) {
    comboPreviewBadge.style.cursor = 'pointer';
    comboPreviewBadge.onclick = () => {
      if (suggestedHintCardIds.size > 0) {
        soundFx.playCardSelect();
        selectedCardIds.clear();
        suggestedHintCardIds.forEach((id) => selectedCardIds.add(id));
        renderRoomState();
      }
    };
  }

  btnSort.onclick = () => {
    soundFx.playCardSelect();
    sortMode = sortMode === 'rank' ? 'suit' : 'rank';
    sortMyHandCards();
    renderHandCards();
    showToast(sortMode === 'rank' ? '🃏 Đã xếp bài theo Số (3 ➔ Heo)' : '♠️ Đã xếp bài theo Chất');
  };

  if (btnAudioToggle) {
    btnAudioToggle.onclick = () => {
      const isMuted = soundFx.toggleMute();
      btnAudioToggle.textContent = isMuted ? '🔇' : '🔊';
      showToast(isMuted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
    };
  }

  // Kích hoạt lắng nghe drag/swipe trên khay bài
  setupHandContainerDragEvents();
}

function getStatusText(status) {
  switch (status) {
    case 'LOBBY': return 'Đang ở phòng chờ';
    case 'DEALING': return 'Đang chia bài...';
    case 'BUFF_DRAFT': return 'Đang chọn Buff...';
    case 'PLAYING': return 'Đang thi đấu';
    case 'MATCH_END': return 'Ván bài kết thúc';
    default: return status || 'Chờ...';
  }
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2500);
}

// Khởi động
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
