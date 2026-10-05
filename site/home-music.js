const audio = new Audio(new URL('./assets/home-music.mp3', import.meta.url).href);
audio.preload = 'none';
audio.loop = true;
audio.volume = 0.45;
const button = document.createElement('button');
button.type = 'button';
button.className = 'home-music';
button.hidden = true;
button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/><path class="music-slash" d="M3 3l18 18"/></svg>';
document.body.append(button);
let onHome = false;
function update() {
  const playing = !audio.paused;
  const label = playing ? 'Pause music / 关闭音乐' : 'Play music / 播放音乐';
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', String(playing));
  button.title = label;
  button.classList.toggle('is-playing', playing);
}
button.onclick = async () => {
  if (!audio.paused) { audio.pause(); return; }
  button.setAttribute('aria-busy', 'true');
  try { await audio.play(); if (!onHome) audio.pause(); }
  catch { button.title = 'Unable to play. Click to retry / 播放失败，点击重试'; }
  finally { button.removeAttribute('aria-busy'); }
};
audio.addEventListener('play', update);
audio.addEventListener('pause', update);
window.addEventListener('pagehide', () => audio.pause());
export function setHomeMusic(isHome) {
  onHome = isHome;
  button.hidden = !isHome;
  if (!isHome) audio.pause();
  update();
}
