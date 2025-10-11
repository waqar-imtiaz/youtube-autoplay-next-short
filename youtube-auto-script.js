// Paste this into the Console on a YouTube Shorts page
(function initAutoplayNextShorts({delay = 400} = {}) {
  let currentVideo = null;
  let mo = null;

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
    // last resort: look for any button whose aria-label or text contains "next"
    return Array.from(document.querySelectorAll('button')).find(b => {
      const a = (b.getAttribute('aria-label') || '').toLowerCase();
      const t = (b.innerText || '').toLowerCase();
      return a.includes('next') || t.includes('next');
    }) || null;
  }

  function clickNext() {
    const btn = findNextButton();
    if (!btn) {
      console.warn('Autoplay: Next button not found.');
      return false;
    }
    try {
      btn.click();
      console.log('Autoplay: clicked Next ▶️', btn);
      return true;
    } catch (err) {
      console.warn('Autoplay: click failed — trying dispatchEvent', err);
      btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
      return true;
    }
  }

  function onEndedHandler() {
    // small delay so UI can settle
    setTimeout(() => clickNext(), delay);
  }

  function onTimeUpdateHandler(e) {
    const v = e.target;
    if (!v || !v.duration || isNaN(v.duration)) return;
    const remaining = v.duration - v.currentTime;
    // when ~300ms left, trigger next to avoid missed 'ended' events
    if (remaining > 0 && remaining < 0.35) {
      clickNext();
    }
  }

  function attachToVideo(v) {
    if (!v || v === currentVideo) return;
    // detach from previous
    if (currentVideo) {
      currentVideo.removeEventListener('ended', onEndedHandler);
      currentVideo.removeEventListener('timeupdate', onTimeUpdateHandler);
    }
    currentVideo = v;
    currentVideo.addEventListener('ended', onEndedHandler);
    currentVideo.addEventListener('timeupdate', onTimeUpdateHandler);
    console.log('Autoplay: attached to video element', currentVideo);
  }

  // MutationObserver to catch dynamic replacements
  mo = new MutationObserver(() => {
    const v = document.querySelector('video');
    if (v) attachToVideo(v);
  });
  mo.observe(document.documentElement || document.body, { childList: true, subtree: true });

  // initial attach if video already present
  attachToVideo(document.querySelector('video'));

  // expose controls
  window.stopAutoplayShorts = function stopAutoplayShorts() {
    if (mo) mo.disconnect();
    if (currentVideo) {
      currentVideo.removeEventListener('ended', onEndedHandler);
      currentVideo.removeEventListener('timeupdate', onTimeUpdateHandler);
      currentVideo = null;
    }
    window.stopAutoplayShorts = undefined;
    window.forceNextShort = undefined;
    console.log('Autoplay: stopped.');
  };
  window.forceNextShort = clickNext;

  console.log('Autoplay next Shorts initialized — delay:', delay, 'ms. Use stopAutoplayShorts() to stop.');

})({ delay: 500 });
