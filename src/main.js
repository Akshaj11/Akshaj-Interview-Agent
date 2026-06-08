// src/main.js — grounded chat agent + per-visitor cap + LiveAvatar video face.
import { LiveAvatarSession, SessionEvent } from '@heygen/liveavatar-web-sdk';

// ===== chat elements =====
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
      speakReply(reply);  // make the video face say it (no-op if video not started)
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

enforceLimitUI();

// ===== video avatar (LiveAvatar) =====
const videoEl  = document.getElementById('avatarVideo');
const startBtn = document.getElementById('startAvatar');
const statusEl = document.getElementById('avatarStatus');

let session = null;

// Speak our grounded reply verbatim through the avatar (no-op until started).
async function speakReply(text) {
  if (!session || !text) return;
  try { session.repeat(text); }
  catch (err) { console.error('speak failed:', err); }
}

startBtn.addEventListener('click', async () => {
  if (session) return;
  startBtn.disabled = true;
  statusEl.textContent = '// CONNECTING…';
  try {
    const resp = await fetch('/api/avatar-token');
    const data = await resp.json().catch(() => ({}));
    if (!data.token) {
      statusEl.textContent = '// NO TOKEN — ' + (data.error || 'check LIVEAVATAR_API_KEY');
      console.error('avatar-token response:', data);
      startBtn.disabled = false;
      return;
    }

    session = new LiveAvatarSession(data.token, { voiceChat: false });

    session.on(SessionEvent.SESSION_STREAM_READY, () => {
      statusEl.textContent = '// LIVE';
      videoEl.classList.add('show');
      videoEl.play().catch(() => {});
      startBtn.style.display = 'none';
    });
    session.on(SessionEvent.SESSION_DISCONNECTED, () => {
      statusEl.textContent = '// DISCONNECTED';
      videoEl.classList.remove('show');
      session = null;
      startBtn.style.display = '';
      startBtn.disabled = false;
    });

    session.attach(videoEl);   // bind the avatar's audio + video to the <video> element
    await session.start();
  } catch (err) {
    console.error('Avatar start failed:', err);
    statusEl.textContent = '// COULD NOT START — open console (F12)';
    session = null;
    startBtn.disabled = false;
  }
});
