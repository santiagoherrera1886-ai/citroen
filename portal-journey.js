/* Inchcape journey: progressive enhancement, never blocks ordinary navigation. */
(() => {
  'use strict';
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const makeOverlay = (name) => {
    const brand = name === 'suzuki' ? 'SUZUKI' : 'CITROËN';
    const layer = document.createElement('div');
    layer.className = 'experience-transition experience-transition--' + name;
    layer.innerHTML = '<div class="experience-center"><small>INCHCAPE / PERFORMANCE HUB</small><strong>' + brand + '</strong><p>Entrando a tu experiencia de marca</p><div class="experience-progress"><span></span></div></div>';
    return layer;
  };
  function portalLinks() {
    document.querySelectorAll('.brand-grid .brand-card').forEach((link) => {
      const brand = link.classList.contains('brand-card-suzuki') ? 'suzuki' : 'citroen';
      link.addEventListener('pointermove', (event) => {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        const rect = link.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        link.style.setProperty('--mouse-x', (x * 100).toFixed(1) + '%');
        link.style.setProperty('--mouse-y', (y * 100).toFixed(1) + '%');
        link.style.setProperty('--tilt-x', ((.5 - y) * 3).toFixed(2) + 'deg');
        link.style.setProperty('--tilt-y', ((x - .5) * 4).toFixed(2) + 'deg');
      });
      link.addEventListener('pointerleave', () => {
        link.style.setProperty('--tilt-x', '0deg');
        link.style.setProperty('--tilt-y', '0deg');
      });
      link.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank' || reduced()) return;
        event.preventDefault();
        if (document.querySelector('.experience-transition')) return;
        link.classList.add('journey-selected');
        const overlay = makeOverlay(brand);
        overlay.classList.add('is-leaving');
        document.body.appendChild(overlay);
        const destination = new URL(link.href);
        destination.searchParams.set('enter', brand);
        window.setTimeout(() => { window.location.assign(destination.href); }, 770);
      });
    });
  }
  function destinationIntro() {
    const url = new URL(location.href);
    const brand = url.searchParams.get('enter');
    if (brand !== 'citroen' || document.body.classList.contains('portal-home') || reduced()) return;
    const overlay = makeOverlay('citroen');
    overlay.classList.add('is-arriving');
    document.body.appendChild(overlay);
    url.searchParams.delete('enter');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    window.setTimeout(() => overlay.remove(), 1550);
  }
  function main() {
    if (document.body.classList.contains('portal-home')) portalLinks();
    else destinationIntro();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main, {once:true});
  else main();
})();