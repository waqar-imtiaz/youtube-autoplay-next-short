# YouTube Shorts Autoplay — README

A small browser console script that automatically advances to the next YouTube Short when the current Short ends. It handles dynamically-replaced `<video>` elements, searches for YouTube's "Next video" button (with multiple fallbacks), and exposes simple controls to stop or force the next Short.

---

## Features

* Automatically clicks the **Next video** button when a Short ends.
* Works with dynamically replaced `<video>` elements (MutationObserver).
* Uses both `ended` and `timeupdate` events to be robust against missed `ended` events.
* Exposes two global controls:

  * `stopAutoplayShorts()` — stop and clean up the script.
  * `forceNextShort()` — immediately click the Next button.

---

## Usage (paste into browser console)

1. Open any YouTube Short page (e.g. `https://www.youtube.com/shorts/...`) in desktop browser.
2. Open Developer Tools → Console (`F12` or `Ctrl+Shift+I`).
3. Paste the script below and press Enter.

```js
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
```

---

## Configuration

* `delay` (milliseconds) — small delay after `ended` event before clicking Next. Default in example: `500`. You can change this by editing the argument passed to the IIFE:

  ```js
  ({ delay: 300 }) // faster
  ({ delay: 800 }) // slower
  ```

---

## Controls / API

* `stopAutoplayShorts()` — call in console to remove observers and event listeners, and to clean up globals.
* `forceNextShort()` — call in console to immediately attempt to click the Next button.

---

## Troubleshooting

* If console logs show `Next button not found.`, YouTube has likely changed the DOM or button attributes. Paste the console output here (or inspect the button's `aria-label`/classes) and update the selectors array accordingly.
* If the script attaches but doesn't trigger, try increasing `delay` to give UI more time to update.
* Some browser extensions or content blockers may prevent the script from clicking the button; try disabling them temporarily.
* Mobile layouts and the YouTube app behave differently; this script targets desktop web Shorts.

---

## Tampermonkey / Greasemonkey (optional)

If you want the script to run automatically, wrap it into a userscript and install via Tampermonkey. Note: running such scripts automatically may violate YouTube's Terms of Service — use at your own risk.

---

## Compatibility

* Designed for desktop browsers (Chrome, Firefox, Edge) on the YouTube web UI.
* May break if YouTube changes classes/attributes for the Next button or the Shorts layout.

---

## Security & Disclaimer

This script only automates button clicks in your browser. Use responsibly. The author is not responsible for any account issues or policy violations resulting from automated behavior. Running scripts on websites may violate terms of service — proceed at your own risk.

---

## License

MIT License — use, modify, and distribute freely.
