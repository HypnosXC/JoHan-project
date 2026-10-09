'use strict';
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus = false) {
  for (const other of tabs) {
    const active = other === tab;
    other.setAttribute('aria-selected', String(active));
    other.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(other.getAttribute('aria-controls'));
    panel.hidden = !active;
    if (!active) panel.querySelectorAll('video').forEach(video => video.pause());
  }
  if (focus) tab.focus();
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[next], true);
  });
}
document.querySelectorAll('video').forEach(video => {
  video.addEventListener('play', () => {
    document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); });
  });
});
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
