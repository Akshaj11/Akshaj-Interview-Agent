// src/main.js — bundled by Vite, so the SDK import resolves at build time (no CDN).
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType } from '@heygen/streaming-avatar';

// ===== elements =====
const messages = [];
const chatInner = document.getElementById('chatInner');
const chatArea = document.getElementById('chatArea');
const inputBox = document.getElementById('inputBox');
const sendBtn = document.getElementById('sendBtn');
const suggestions = document.getElementById('suggestions');
const infoBtn = document.getElementById('infoBtn');
const infoPanel = document.getElementById('infoPanel');
let isThinking = false;

// ===== per-visitor cap (client-side) =====
const MAX_MESSAGES = 2;
const msgCount = () => parseInt(localStorage.getItem('akshaj_msgs') || '0', 10);
const bumpMsg = () => localStorage.setItem('akshaj_msgs', msgCount() + 1);
const atLimit = () => msgCount() >= MAX_MESSAGES;
function enforceLimitUI() {
  if (atLimit()) {
    inputBox.disabled = true;
    sendBtn.disabled = true;
    inputBox.placeholder = 'Demo limit reached — contact akshaj.shah@tamu.edu';
    suggestions.style.display = 'none';
  }
}

infoBtn.addEventListener('click', () => {
  infoPanel.classList.toggle('show');
  infoBtn.textContent = infoPanel.classList.contains('show') ? '[ HIDE ]' : '[ INFO ]';
});

document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    inputBox.value = btn.getAttribute('data-q');
    inputBox.focus();
  });
});

function addMessage(role, content) {
  const wrap = document.createElement('div');
  wrap.className = `msg-wrap ${role}`;
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;
  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? '// YOU' : '// AKSHAJ';
  msg.appendChild(label);
  const text = document.createElement('div');
  text.textContent = content;
  msg.appendChild(text);
  wrap.appendChild(msg);
  chatInner.appendChild(wrap);
  chatArea.scrollTop = chatArea.scrollHeight;
  return text;
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'typing';
  wrap.id = 'typingIndicator';
  wrap.innerHTML = `
    <div class="typing-label">// AKSHAJ</div>
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatInner.appendChild(wrap);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

async function sendMessage() {
  const text = inputBox.value.trim();
  if (!text || isThinking) return;

  // Per-visitor cap: stop after MAX_MESSAGES.
  if (atLimit()) {
    addMessage('assistant', "You've reached the demo limit. Reach Akshaj directly at akshaj.shah@tamu.edu.");
    enforceLimitUI();
    return;
  }

  inputBox.value = '';
  isThinking = true;
  sendBtn.disabled = true;
  suggestions.style.display = 'none';

  messages.push({ role: 'user', content: text });
  addMessage('user', text);
  showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    const data = await response.json().catch(() => ({}));
    const reply = data.reply || 'Connection issue. Reach out directly at akshaj.shah@tamu.edu.';

    hideTyping();
    messages.push({ role: 'assistant', content: reply });
    addMessage('assistant', reply);

    if (response.ok) {
      bumpMsg();          // count only successful answers
      speakReply(reply);  // make the face say it (no-op if video not started)
    }
  } catch (err) {
    hideTyping();
    const errMsg = 'Connection issue. Please reach out directly at akshaj.shah@tamu.edu or +1 (979) 574-8398.';
    messages.push({ role: 'assistant', content: errMsg });
    addMessage('assistant', errMsg);
  } finally {
    isThinking = false;
    sendBtn.disabled = false;
    inputBox.focus();
    enforceLimitUI();
  }
}

sendBtn.addEventListener('click', sendMessage);
inputBox.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

enforceLimitUI();   // disable input on load if the visitor already used their messages

// ===== video avatar (HeyGen, bundled by Vite) =====
const videoEl  = document.getElementById('avatarVideo');
const startBtn = document.getElementById('startAvatar');
const statusEl = document.getElementById('avatarStatus');

// Paste a PUBLIC streaming avatar ID from app.heygen.com/streaming-avatar (or your own).
const AVATAR_ID = "Iker_public_1";
const VOICE_ID  = "";   // optional — leave "" for the default voice

let avatar = null;

async function speakReply(text) {
  if (!avatar || !text) return;
  try { await avatar.speak({ text, taskType: TaskType.REPEAT }); }
  catch (err) { console.error('speak failed:', err); }
}

startBtn.addEventListener('click', async () => {
  if (avatar) return;
  startBtn.disabled = true;
  statusEl.textContent = '// CONNECTING…';
  try {
    const resp = await fetch('/api/avatar-token');
    const { token } = await resp.json();
    if (!token) { statusEl.textContent = '// NO TOKEN — check HEYGEN_API_KEY'; startBtn.disabled = false; return; }

    avatar = new StreamingAvatar({ token });

    avatar.on(StreamingEvents.STREAM_READY, (e) => {
      videoEl.srcObject = e.detail;
      videoEl.classList.add('show');
      videoEl.play().catch(() => {});
      statusEl.textContent = '// LIVE';
      startBtn.style.display = 'none';
    });
    avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      videoEl.srcObject = null;
      videoEl.classList.remove('show');
      statusEl.textContent = '// DISCONNECTED';
      avatar = null;
      startBtn.style.display = '';
      startBtn.disabled = false;
    });

    const startReq = { quality: AvatarQuality.Low, avatarName: AVATAR_ID };
    if (VOICE_ID) startReq.voice = { voiceId: VOICE_ID };
    await avatar.createStartAvatar(startReq);
  } catch (err) {
    console.error('Avatar start failed:', err);
    statusEl.textContent = '// COULD NOT START — open console (F12)';
    avatar = null;
    startBtn.disabled = false;
  }
});
