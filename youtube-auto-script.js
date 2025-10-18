// YouTube Shorts Autoplay with transparent control overlay (fixed version)
(function initAutoplayNextShortsUI({ delay = 2000 } = {}) {
  if (window.__ytShortsAutoplayInitialized) {
    console.log('Autoplay already running. Use overlay controls or stopAutoplayShorts()');
    return;
  }
  window.__ytShortsAutoplayInitialized = true;

  let currentVideo = null;
  let mo = null;
  let paused = false;
  let stopped = false;
  const overlayId = 'yt-autoplay-overlay-controls';

  // ---------- Utility functions ----------
  function updateOverlayStatus(text) {
    const s = document.getElementById(overlayId + '-status');
    if (s) s.textContent = 'Autoplay: ' + text;
    console.log('Autoplay status:', text);
  }

  function updateOverlayButtons() {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    const [pauseBtn, resumeBtn, nextBtn, stopBtn] = overlay.querySelectorAll('button');
    if (paused) {
      pauseBtn.disabled = true;
      resumeBtn.disabled = false;
    } else {
      pauseBtn.disabled = false;
      resumeBtn.disabled = true;
    }
    stopBtn.disabled = false;
    nextBtn.disabled = stopped;
  }

  // ---------- Core logic ----------
  const selectors = [
    'button[aria-label="Next video"]',
    'button[aria-label*="Next"]',
    'button.yt-spec-button-shape-next',
    'button[title="Next video"]'
  ];

  function findNextButton() {
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) return btn;
    }
    return Array.from(document.querySelectorAll('button')).find(b => {
      const a = (b.getAttribute('aria-label') || '').toLowerCase();
      const t = (b.innerText || '').toLowerCase();
      return a.includes('next') || t.includes('next');
    }) || null;
  }

  function clickNext() {
    if (paused || stopped) return false;
    const btn = findNextButton();
    if (!btn) {
      console.warn('Autoplay: Next button not found.');
      return false;
    }
    btn.click();
    console.log('Autoplay: clicked Next ▶️');
    updateOverlayStatus('Next short ▶️');
    return true;
  }

  function onEndedHandler() {
    if (paused || stopped) return;
    updateOverlayStatus('Video ended — waiting ' + delay + 'ms');
    setTimeout(() => {
      if (!paused && !stopped) clickNext();
    }, delay);
  }

  function onTimeUpdateHandler(e) {
    if (paused || stopped) return;
    const v = e.target;
    if (!v || !v.duration || isNaN(v.duration)) return;
    const remaining = v.duration - v.currentTime;
    if (remaining > 0 && remaining < 0.35) {
      updateOverlayStatus('Near end — waiting ' + delay + 'ms');
      setTimeout(() => {
        if (!paused && !stopped) clickNext();
      }, delay);
    }
  }

  function attachToVideo(v) {
    if (!v || v === currentVideo) return;
    if (currentVideo) {
      currentVideo.removeEventListener('ended', onEndedHandler);
      currentVideo.removeEventListener('timeupdate', onTimeUpdateHandler);
    }
    currentVideo = v;
    currentVideo.addEventListener('ended', onEndedHandler);
    currentVideo.addEventListener('timeupdate', onTimeUpdateHandler);
    updateOverlayStatus('Attached to video');
    console.log('Autoplay: attached to video element');
  }

  // ---------- Overlay UI ----------
  function createOverlay() {
    if (document.getElementById(overlayId)) return;

    const overlay = document.createElement('div');
    overlay.id = overlayId;
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: 2147483647,
      backdropFilter: 'blur(4px)',
      background: 'rgba(0,0,0,0.25)',
      color: '#fff',
      padding: '8px 10px',
      borderRadius: '10px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
      pointerEvents: 'auto'
    });

    const status = document.createElement('div');
    status.id = overlayId + '-status';
    Object.assign(status.style, {
      fontSize: '12px',
      minWidth: '140px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
    status.textContent = 'Autoplay: running';

    function makeBtn(text, onClick) {
      const b = document.createElement('button');
      b.textContent = text;
      Object.assign(b.style, {
        border: 'none',
        padding: '6px 8px',
        fontSize: '13px',
        borderRadius: '6px',
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.06)',
        color: '#fff'
      });
      b.addEventListener('mouseenter', () => b.style.background = 'rgba(255,255,255,0.12)');
      b.addEventListener('mouseleave', () => b.style.background = 'rgba(255,255,255,0.06)');
      b.addEventListener('click', onClick);
      return b;
    }

    const pauseBtn = makeBtn('Pause', () => window.pauseAutoplayShorts());
    const resumeBtn = makeBtn('Resume', () => window.resumeAutoplayShorts());
    const nextBtn = makeBtn('Next ▶', () => window.forceNextShort());
    const stopBtn = makeBtn('Stop ✖', () => window.stopAutoplayShorts());

    overlay.append(status, pauseBtn, resumeBtn, nextBtn, stopBtn);
    document.body.appendChild(overlay);
    updateOverlayButtons();
  }

  // ---------- Control functions ----------
  function pauseAutoplayShorts() {
    if (stopped) return;
    paused = true;
    updateOverlayStatus('Paused');
    updateOverlayButtons();
  }

  function resumeAutoplayShorts() {
    if (stopped) return;
    paused = false;
    updateOverlayStatus('Running');
    updateOverlayButtons();
  }

  function stopAutoplayShorts() {
    stopped = true;
    paused = false;
    if (mo) mo.disconnect();
    if (currentVideo) {
      currentVideo.removeEventListener('ended', onEndedHandler);
      currentVideo.removeEventListener('timeupdate', onTimeUpdateHandler);
      currentVideo = null;
    }
    const overlay = document.getElementById(overlayId);
    if (overlay) overlay.remove();
    delete window.forceNextShort;
    delete window.pauseAutoplayShorts;
    delete window.resumeAutoplayShorts;
    delete window.stopAutoplayShorts;
    window.__ytShortsAutoplayInitialized = false;
    console.log('Autoplay stopped and cleaned up.');
  }

  // ---------- Observer + initialization ----------
  mo = new MutationObserver(() => {
    if (stopped) return;
    const v = document.querySelector('video');
    if (v) attachToVideo(v);
  });
  mo.observe(document.body, { childList: true, subtree: true });

  attachToVideo(document.querySelector('video'));
  createOverlay();

  // expose globals
  window.forceNextShort = clickNext;
  window.pauseAutoplayShorts = pauseAutoplayShorts;
  window.resumeAutoplayShorts = resumeAutoplayShorts;
  window.stopAutoplayShorts = stopAutoplayShorts;

  updateOverlayStatus(`Running (delay ${delay}ms)`);
  console.log('✅ YouTube Shorts Autoplay initialized with overlay and 2s delay.');
})();
