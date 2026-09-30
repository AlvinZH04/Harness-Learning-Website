const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab, moveFocus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  }
  if (moveFocus) tab.focus();
}
for (const tab of tabs) {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (tabs.indexOf(tab) + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (tabs.indexOf(tab) - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); activateTab(tabs[next], true); }
  });
}
for (const link of document.querySelectorAll('[data-result-target]')) {
  link.addEventListener('click', () => {
    const tab = document.getElementById(link.dataset.resultTarget);
    if (tab) activateTab(tab);
  });
}

const sections = [...document.querySelectorAll('.paper-body > section')];
const citationButton = document.querySelector('.citation-copy');
if (citationButton) {
  citationButton.hidden = false;
  citationButton.addEventListener('click', async () => {
    const status = document.querySelector('.citation-status');
    try {
      await navigator.clipboard.writeText(document.getElementById('bibtex').textContent + '\n');
      status.textContent = 'BibTeX copied.';
    } catch {
      status.textContent = 'Select the citation to copy it, or download the .bib file.';
    }
  });
}
const contents = [...document.querySelectorAll('.contents a[href^="#"]')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting);
    if (!visible.length) return;
    const id = visible[0].target.id;
    for (const link of contents) {
      if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
  sections.forEach(section => observer.observe(section));
}
