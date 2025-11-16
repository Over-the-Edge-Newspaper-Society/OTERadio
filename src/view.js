import { createRoot, render } from '@wordpress/element';
import { RadioPlayer, defaults } from './player';

const mountedNodes = new Set();
let darkModeObserver = null;

const detectDarkMode = () => {
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return false;
  const root = doc.documentElement;
  const body = doc.body;
  return (
    root?.classList.contains('dark') ||
    root?.classList.contains('dark-mode') ||
    body?.classList.contains('dark') ||
    body?.classList.contains('dark-mode')
  );
};

const applyDarkModeClass = () => {
  const isDark = detectDarkMode();
  mountedNodes.forEach((node) => {
    if (node && node.classList) {
      node.classList.toggle('dark-mode', isDark);
    }
  });
};

const ensureDarkModeObserver = () => {
  if (darkModeObserver || typeof MutationObserver === 'undefined') return;
  const target = document.documentElement;
  darkModeObserver = new MutationObserver(applyDarkModeClass);
  darkModeObserver.observe(target, { attributes: true, attributeFilter: ['class'] });
};

const mountFrontEnd = () => {
  const nodes = document.querySelectorAll('[data-ote-radio]');
  nodes.forEach((node) => {
    if (node.dataset.oteRadioMounted === '1') return;
    const raw = node.getAttribute('data-ote-radio') || '{}';
    try {
      const attributes = JSON.parse(raw);
      const element = <RadioPlayer {...defaults} {...attributes} />;
      if (createRoot) {
        const root = createRoot(node);
        root.render(element);
      } else {
        render(element, node);
      }
      mountedNodes.add(node);
      applyDarkModeClass();
      ensureDarkModeObserver();
      node.dataset.oteRadioMounted = '1';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('OTE radio: could not mount player', error);
    }
  });
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFrontEnd);
  } else {
    mountFrontEnd();
  }
}
