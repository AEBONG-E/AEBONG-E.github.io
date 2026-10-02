/*
 * Progressive enhancement only: every section is readable without this file.
 * Adds the slash-command input, theme toggle, print button and the typing
 * effects (skipped when prefers-reduced-motion is set).
 *
 * Sections start hidden and are typed in once, either when they scroll into
 * view or when their command is run. Already-typed sections are not replayed.
 */
(function () {
  'use strict';

  var COMMANDS = [
    { name: '/about', desc: '소개, 핵심 역량, 학력/교육', target: 'about' },
    { name: '/experience', desc: '경력', target: 'experience' },
    { name: '/projects', desc: '프로젝트, AI 활용 개발 경험', target: 'projects' },
    { name: '/skills', desc: '기술 스택', target: 'skills' },
    { name: '/contact', desc: '연락처', target: 'contact' },
    { name: '/theme', desc: '라이트/다크 테마 전환', action: 'theme' },
    { name: '/print', desc: '인쇄 / PDF로 저장', action: 'print' },
    { name: '/help', desc: '명령어 목록 보기', action: 'help' }
  ];

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animate = !reduceMotion && 'IntersectionObserver' in window && 'requestAnimationFrame' in window;

  var root = document.documentElement;
  var input = document.getElementById('cmd-input');
  var list = document.getElementById('cmd-list');
  var output = document.getElementById('cmd-output');
  var form = input ? input.form : null;
  var activeIndex = -1;
  var visible = [];

  /* ---------- theme ---------- */

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function syncThemeUi() {
    var theme = currentTheme();
    var labels = document.querySelectorAll('.theme-label');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#faf9f5' : '#141413');
  }

  function toggleTheme() {
    var next = currentTheme() === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
    syncThemeUi();
    return next;
  }

  /* ---------- output line ---------- */

  function say(text) {
    if (output) output.textContent = text;
  }

  /* ---------- section typing (each section is typed once) ---------- */

  var PROMPT_CHAR_MS = 45;   // "> /projects" is typed slowly, like a person
  var TOOL_CHAR_MS = 14;     // tool-call line
  var RESULT_CHAR_MS = 6;    // result body streams fast ...
  var RESULT_MIN_MS = 500;
  var RESULT_MAX_MS = 2600;  // ... and never takes longer than this
  var PHASE_PAUSE_MS = 220;
  var SCROLL_FALLBACK_MS = 700;

  var typers = [];           // one controller per section, in document order
  var typing = null;         // controller currently animating
  var queue = [];            // controllers waiting for their turn (scroll-triggered)
  var navigating = false;    // true while a command is smooth-scrolling
  var observer = null;

  function collectTextNodes(rootEl) {
    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var items = [];
    var n;
    while ((n = walker.nextNode())) items.push({ node: n, text: n.nodeValue, shown: false });
    return items;
  }

  /**
   * Hides a section and returns a controller that types it back in three
   * phases (prompt -> tool line -> result). Hidden parts use
   * visibility:hidden, so the layout never jumps.
   * @param {HTMLElement} section
   */
  function createTyper(section) {
    var phases = [
      { root: section.querySelector('.prompt'), msPerChar: PROMPT_CHAR_MS },
      { root: section.querySelector('h2'), msPerChar: TOOL_CHAR_MS },
      { root: section.querySelector('.result'), msPerChar: RESULT_CHAR_MS, min: RESULT_MIN_MS, max: RESULT_MAX_MS }
    ].filter(function (p) { return p.root; });

    var all = [];
    phases.forEach(function (p) {
      p.items = collectTextNodes(p.root);
      p.len = p.items.reduce(function (sum, it) { return sum + it.text.length; }, 0);
      var d = p.len * p.msPerChar;
      if (p.max) d = Math.max(p.min, Math.min(p.max, d));
      p.duration = d;
      all = all.concat(p.items);
    });

    var pendingEls = section.querySelectorAll('*');
    for (var i = 0; i < pendingEls.length; i++) pendingEls[i].classList.add('tw-pending');
    all.forEach(function (it) { it.node.nodeValue = ''; });
    section.setAttribute('aria-busy', 'true');

    var caret = document.createElement('span');
    caret.className = 'tw-cursor';
    caret.setAttribute('aria-hidden', 'true');

    var state = 'pending';   // pending -> typing -> done
    var callbacks = [];
    var phaseIdx = 0;
    var phaseStart = null;
    var rafId = null;
    var timerId = null;

    function reveal(node) {
      var el = node.parentNode;
      while (el && el !== section) {
        el.classList.remove('tw-pending');
        el = el.parentNode;
      }
    }

    function draw(p, count) {
      var remaining = count;
      var last = null;
      for (var k = 0; k < p.items.length && remaining > 0; k++) {
        var it = p.items[k];
        var take = Math.min(remaining, it.text.length);
        if (it.node.nodeValue.length !== take) it.node.nodeValue = it.text.slice(0, take);
        if (!it.shown) { reveal(it.node); it.shown = true; }
        remaining -= take;
        last = it.node;
      }
      if (last) last.parentNode.insertBefore(caret, last.nextSibling);
    }

    function frame(now) {
      var p = phases[phaseIdx];
      if (phaseStart === null) phaseStart = now;
      var count = p.duration > 0
        ? Math.min(p.len, Math.ceil(((now - phaseStart) / p.duration) * p.len))
        : p.len;
      draw(p, count);

      if (count < p.len) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      phaseIdx += 1;
      phaseStart = null;
      if (phaseIdx >= phases.length) { finish(); return; }
      timerId = window.setTimeout(function () { rafId = window.requestAnimationFrame(frame); }, PHASE_PAUSE_MS);
    }

    function finish() {
      if (state === 'done') return;
      state = 'done';
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      all.forEach(function (it) { it.node.nodeValue = it.text; });
      for (var j = 0; j < pendingEls.length; j++) pendingEls[j].classList.remove('tw-pending');
      if (caret.parentNode) caret.parentNode.removeChild(caret);
      section.removeAttribute('aria-busy');
      section.removeEventListener('click', finish);
      if (observer) observer.unobserve(section);
      var cbs = callbacks;
      callbacks = [];
      cbs.forEach(function (cb) { cb(); });
    }

    function start() {
      if (state !== 'pending') return;
      state = 'typing';
      rafId = window.requestAnimationFrame(frame);
    }

    // Click inside a hidden/typing section completes it.
    section.addEventListener('click', finish);

    return {
      section: section,
      start: start,
      finish: finish,
      state: function () { return state; },
      onDone: function (cb) {
        if (state === 'done') cb(); else callbacks.push(cb);
      }
    };
  }

  function typerFor(section) {
    for (var i = 0; i < typers.length; i++) {
      if (typers[i].section === section) return typers[i];
    }
    return null;
  }

  function runNext() {
    if (typing && typing.state() !== 'done') return;
    typing = null;
    while (queue.length) {
      var t = queue.shift();
      if (t.state() === 'pending') {
        typing = t;
        t.onDone(runNext);
        t.start();
        return;
      }
    }
  }

  function enqueue(t) {
    if (t.state() !== 'pending' || queue.indexOf(t) !== -1) return;
    queue.push(t);
    queue.sort(function (a, b) { return typers.indexOf(a) - typers.indexOf(b); });
    runNext();
  }

  // Finish whatever is animating plus anything waiting in line.
  function flushTyping() {
    var waiting = queue;
    queue = [];
    if (typing) typing.finish();
    waiting.forEach(function (t) { t.finish(); });
    typing = null;
  }

  function finishAll() {
    queue = [];
    typers.forEach(function (t) { t.finish(); });
    typing = null;
  }

  function isInViewport(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || root.clientHeight;
    return r.top < vh * 0.8 && r.bottom > 0;
  }

  function afterScroll(cb) {
    var fired = false;
    function go() {
      if (fired) return;
      fired = true;
      window.removeEventListener('scrollend', go);
      cb();
    }
    if ('onscrollend' in window) window.addEventListener('scrollend', go);
    window.setTimeout(go, SCROLL_FALLBACK_MS);
  }

  function initSectionTyping(heroDone) {
    if (!animate) {
      root.classList.remove('tw-wait');
      return;
    }

    var sections = document.querySelectorAll('main .turn');
    for (var i = 0; i < sections.length; i++) typers.push(createTyper(sections[i]));
    root.classList.remove('tw-wait');

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') flushTyping();
    });
    window.addEventListener('beforeprint', finishAll);

    observer = new IntersectionObserver(function (entries) {
      if (navigating) return;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var t = typerFor(entry.target);
        if (t) enqueue(t);
      });
    }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });

    // Wait for the welcome line before typing the first visible section.
    heroDone(function () {
      typers.forEach(function (t) { observer.observe(t.section); });
    });
  }

  /* ---------- navigation ---------- */

  function goTo(id) {
    var section = document.getElementById(id);
    if (!section) return false;
    var heading = section.querySelector('h2');
    var focusHeading = function () {
      // Do not steal focus if the visitor is already typing the next command.
      if (input && document.activeElement === input && input.value) return;
      if (heading) heading.focus({ preventScroll: true });
    };

    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);

    var t = typerFor(section);
    if (!t || t.state() === 'done') {
      focusHeading();
      return true;
    }

    // Sections passed over while scrolling stay hidden; they type in later
    // when the visitor scrolls back to them.
    flushTypingExcept(t);
    navigating = true;
    afterScroll(function () {
      navigating = false;
      t.onDone(focusHeading);
      queue = [];
      if (t.state() === 'typing') {
        typing = t;
        t.onDone(runNext);
      } else {
        enqueue(t);
      }
      typers.forEach(function (o) {
        if (o !== t && isInViewport(o.section)) enqueue(o);
      });
    });
    return true;
  }

  function flushTypingExcept(keep) {
    queue = [];
    if (typing && typing !== keep) typing.finish();
    typing = null;
  }

  function run(raw) {
    var value = (raw || '').trim().toLowerCase();
    if (!value) return;
    if (value.charAt(0) !== '/') value = '/' + value;

    var cmd = null;
    for (var i = 0; i < COMMANDS.length; i++) {
      if (COMMANDS[i].name === value) { cmd = COMMANDS[i]; break; }
    }

    if (!cmd) {
      say('알 수 없는 명령입니다: ' + value + '  (/help 로 목록을 확인하세요)');
      return;
    }

    if (cmd.target) {
      var section = document.getElementById(cmd.target);
      var t = section ? typerFor(section) : null;
      var willType = t && t.state() !== 'done';
      // Clear first so goTo() does not treat the submitted command as "still typing".
      input.value = '';
      closeList();
      goTo(cmd.target);
      say(cmd.name + ' -> ' + cmd.desc + (willType ? '  (클릭 또는 Esc 로 건너뛰기)' : ''));
    } else if (cmd.action === 'theme') {
      say('theme: ' + toggleTheme());
    } else if (cmd.action === 'print') {
      say('인쇄 대화상자를 엽니다.');
      window.print();
    } else if (cmd.action === 'help') {
      say('사용 가능한 명령: ' + COMMANDS.map(function (c) { return c.name; }).join(' '));
      input.value = '/';
      render('/');
      return;
    }
    input.value = '';
    closeList();
  }

  /* ---------- autocomplete list (combobox) ---------- */

  function closeList() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    visible = [];
  }

  function setActive(index) {
    var items = list.children;
    for (var i = 0; i < items.length; i++) {
      items[i].setAttribute('aria-selected', i === index ? 'true' : 'false');
    }
    activeIndex = index;
    if (index >= 0 && items[index]) {
      input.setAttribute('aria-activedescendant', items[index].id);
      items[index].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function render(value) {
    var q = (value || '').trim().toLowerCase();
    if (!q || q.charAt(0) !== '/') { closeList(); return; }

    visible = COMMANDS.filter(function (c) { return c.name.indexOf(q) === 0; });
    list.innerHTML = '';
    if (!visible.length) { closeList(); return; }

    visible.forEach(function (c, i) {
      var li = document.createElement('li');
      li.id = 'cmd-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');

      var name = document.createElement('span');
      name.className = 'cmd';
      name.textContent = c.name;
      var desc = document.createElement('span');
      desc.className = 'cmd-desc';
      desc.textContent = c.desc;
      li.appendChild(name);
      li.appendChild(desc);

      li.addEventListener('mousedown', function (e) {
        e.preventDefault(); // keep focus in the input
        run(c.name);
      });
      list.appendChild(li);
    });

    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(0);
  }

  function initPrompt() {
    if (!input || !list || !form) return;

    input.addEventListener('input', function () { render(input.value); });

    input.addEventListener('keydown', function (e) {
      var open = !list.hidden && visible.length > 0;
      if (e.key === 'ArrowDown' && open) {
        e.preventDefault();
        setActive((activeIndex + 1) % visible.length);
      } else if (e.key === 'ArrowUp' && open) {
        e.preventDefault();
        setActive((activeIndex - 1 + visible.length) % visible.length);
      } else if (e.key === 'Tab' && open && activeIndex >= 0) {
        e.preventDefault();
        input.value = visible[activeIndex].name;
        render(input.value);
      } else if (e.key === 'Escape') {
        if (open) { closeList(); } else { input.blur(); }
      }
    });

    input.addEventListener('blur', function () { closeList(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var open = !list.hidden && visible.length > 0;
      var typed = input.value.trim().toLowerCase();
      var exact = COMMANDS.some(function (c) { return c.name === typed || c.name === '/' + typed; });
      if (open && activeIndex >= 0 && !exact) {
        run(visible[activeIndex].name);
      } else {
        run(input.value);
      }
    });

    // "/" anywhere focuses the prompt, like a command palette.
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      var tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      e.preventDefault();
      input.focus();
      input.value = '/';
      render('/');
    });
  }

  /* ---------- buttons ---------- */

  function initButtons() {
    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;

      // Top command list: run it as a command so the section is typed in.
      // Without JS these stay plain #anchor links.
      var link = e.target.closest('.commands a[href^="#"]');
      if (link) {
        e.preventDefault();
        run('/' + link.getAttribute('href').slice(1));
        return;
      }

      var el = e.target.closest('[data-action]');
      if (!el) return;
      var action = el.getAttribute('data-action');
      if (action === 'theme') say('theme: ' + toggleTheme());
      if (action === 'print') window.print();
    });
  }

  /* ---------- welcome line typing ---------- */

  /**
   * Types the welcome role line and returns a function that registers a
   * callback for when it is finished.
   */
  function initHeroTyping() {
    var callbacks = [];
    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      callbacks.forEach(function (cb) { cb(); });
      callbacks = [];
    }
    function whenDone(cb) {
      if (finished) cb(); else callbacks.push(cb);
    }

    var el = document.querySelector('.typewrite');
    if (!el || !animate) { done(); return whenDone; }
    var text = el.textContent;

    // Screen readers get the full sentence immediately; the animation is visual only.
    var full = document.createElement('span');
    full.className = 'sr-only';
    full.textContent = text;
    el.parentNode.insertBefore(full, el);
    el.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    el.classList.add('is-typing');

    var i = 0;
    var timer = window.setInterval(function () {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        window.clearInterval(timer);
        window.setTimeout(function () { el.classList.remove('is-typing'); }, 2400);
        done();
      }
    }, 38);

    // Always show full text before printing.
    window.addEventListener('beforeprint', function () {
      window.clearInterval(timer);
      el.textContent = text;
      el.classList.remove('is-typing');
      done();
    });

    return whenDone;
  }

  syncThemeUi();
  initPrompt();
  initButtons();
  initSectionTyping(initHeroTyping());
})();
