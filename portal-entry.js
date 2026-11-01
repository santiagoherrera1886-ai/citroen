/* Keep every existing Citroën deep link; use the group portal for a fresh visit. */
(() => {
  'use strict';
  if (!window.location.hash || window.location.hash === '#inicio') {
    window.location.replace(new URL('./inicio.html', window.location.href).href);
  }
})();
