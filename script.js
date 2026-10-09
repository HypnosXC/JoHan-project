'use strict';
document.getElementById('copy-citation').addEventListener('click', async event => {
  const button = event.currentTarget;
  const text = document.getElementById('bibtex').textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied!';
    document.getElementById('copy-status').textContent = 'BibTeX copied to clipboard.';
    setTimeout(() => { document.getElementById('copy-citation').textContent = 'Copy BibTeX'; }, 2200);
  } catch {
    const range = document.createRange(); range.selectNodeContents(document.getElementById('bibtex'));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.getElementById('copy-status').textContent = 'Citation selected. Press Control+C or Command+C to copy.';
    document.getElementById('copy-citation').textContent = 'Selected — copy manually';
  }
});

const video = document.getElementById('motion-video');
const play = document.getElementById('play-motion');
const progress = document.getElementById('motion-progress');
const speed = document.getElementById('motion-speed');
const status = document.getElementById('video-status');
const restart = document.getElementById('restart-motion');
const viewer = document.querySelector('.viewer');
function setLoading(loading) {
  viewer.setAttribute('aria-busy', String(loading));
  progress.disabled = loading;
  restart.disabled = loading;
}
const options = [...document.querySelectorAll('.sequence-option')];
let selected = 'hot3d-1';
let playRequest = 0;
video.controls = false;
document.querySelector('.playback').hidden = false;
const stamp = seconds => `${Math.floor((seconds || 0) / 60)}:${String(Math.floor((seconds || 0) % 60)).padStart(2, '0')}`;
function updateTime() {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  progress.value = duration ? Math.round(video.currentTime / duration * 1000) : 0;
  progress.setAttribute('aria-valuetext', `${stamp(video.currentTime)} of ${stamp(duration)}`);
  document.getElementById('motion-time').textContent = `${stamp(video.currentTime)} / ${stamp(duration)}`;
}
function updatePlay() {
  play.innerHTML = video.paused ? '▶ <span>Play</span>' : 'Ⅱ <span>Pause</span>';
  play.setAttribute('aria-label', video.paused ? 'Play motion video' : 'Pause motion video');
}
async function startPlayback() {
  const request = ++playRequest;
  try { await video.play(); } catch (error) {
    if (request === playRequest && error.name !== 'AbortError') status.textContent = 'Playback could not start. Try Play again or open the video directly.';
  }
}
play.addEventListener('click', () => { if (video.paused) startPlayback(); else video.pause(); });
document.getElementById('restart-motion').addEventListener('click', () => { video.currentTime = 0; updateTime(); });
speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });
progress.addEventListener('input', () => { if (Number.isFinite(video.duration)) video.currentTime = video.duration * Number(progress.value) / 1000; });
video.addEventListener('timeupdate', updateTime);
function onMetadata() {
  setLoading(false);
  video.controls = false;
  video.playbackRate = Number(speed.value);
  updateTime();
  status.textContent = '2D and 3D views share the same video timeline.';
}
video.addEventListener('loadedmetadata', onMetadata);
if (video.readyState >= 1) onMetadata(); else setLoading(true);
video.addEventListener('play', updatePlay);
video.addEventListener('pause', updatePlay);
video.addEventListener('error', () => { setLoading(false); progress.disabled = true; restart.disabled = true; status.textContent = 'Video could not load. Try another sequence or use Open video.'; video.controls = true; });
video.addEventListener('waiting', () => { status.textContent = 'Loading video…'; });
video.addEventListener('playing', () => { status.textContent = '2D and 3D views share the same video timeline.'; });
options.forEach((button, index) => button.addEventListener('click', () => {
  const next = button.dataset.sequence;
  if (next === selected) return;
  ++playRequest;
  const resume = !video.paused;
  video.pause(); selected = next;
  options.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  const [dataset, number] = selected.split('-');
  const label = `${dataset.toUpperCase()} · Sequence ${number.padStart(2, '0')}`;
  document.getElementById('sequence-name').textContent = label;
  document.getElementById('camera-label').textContent = dataset === 'hot3d' ? 'Moving camera' : 'Static camera';
  document.getElementById('sequence-counter').textContent = `${String(index + 1).padStart(2, '0')} / 04`;
  video.setAttribute('aria-label', `${label}: aligned 2D hand motion and recovered 3D mesh`);
  video.poster = `assets/${selected}.webp`;
  video.querySelectorAll('source').forEach(source => { source.src = `assets/${selected}.${source.type === 'video/webm' ? 'webm' : 'mp4'}`; });
  video.querySelector('a').href = `assets/${selected}.mp4`;
  document.getElementById('open-video').href = `assets/${selected}.mp4`;
  setLoading(true);
  video.load(); updateTime(); updatePlay(); status.textContent = 'Loading sequence…';
  if (resume) startPlayback();
}));

options.forEach((button, index) => button.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
  options[next].focus();
  options[next].click();
}));
