(function(){
  var spreads = Array.prototype.slice.call(document.querySelectorAll('.spread'));
  var dotsWrap = document.getElementById('dots');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var counter = document.getElementById('counter');
  var DURATION = 800;          // desktop spread flip
  var MOBILE_DURATION = 320;   // phone page slide
  var animating = false;

  // Flat list of non-empty pages — the navigation unit on phones
  // (one <section class="page ..."> at a time instead of a whole spread).
  var pages = [];
  spreads.forEach(function(sp, si){
    Array.prototype.slice.call(sp.getElementsByClassName('page')).forEach(function(pg){
      if (pg.textContent.trim() === '') return; // skip blank filler pages
      pages.push({ el: pg, spread: si });
    });
  });

  var mq = window.matchMedia('(max-width: 720px)');
  function isMobile(){ return mq.matches; }
  var wasMobile = isMobile();
  var current = 0;    // active spread  — desktop navigation unit
  var pageIndex = 0;  // active page    — mobile navigation unit

  // build dots dynamically (one per spread), carrying the spread's colour theme
  spreads.forEach(function(sp, i){
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.setAttribute('role', 'tab');
    d.setAttribute('data-index', i);
    d.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    d.setAttribute('aria-label', sp.getAttribute('data-label') || ('Page ' + (i + 1)));
    var theme = (sp.className.match(/theme-[\w-]+/) || [])[0];
    if (theme) d.classList.add(theme);
    dotsWrap.appendChild(d);
  });
  var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll('.dot'));

  // ----- top navigation bar: one entry per class (+ résumé) -----
  var topbar = document.getElementById('topbar');
  var topbarToggle = document.getElementById('topbarToggle');
  var topbarMenu = document.getElementById('topbarMenu');
  var topbarCurrent = document.getElementById('topbarCurrent');
  var classNav = [];      // { spread, label, short }
  var topbarLinks = [];

  if (topbar && topbarMenu){
    var seenLabel = {};
    spreads.forEach(function(sp, i){
      var label = sp.getAttribute('data-label') || ('Page ' + (i + 1));
      if (seenLabel[label]) return;
      seenLabel[label] = true;
      var m = label.match(/^\s*Classe\s+(\d+)/i);
      var short = m ? 'Classe ' + m[1] : label.split(/\s+/)[0].trim();
      classNav.push({ spread: i, label: label, short: short });

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'topbar-link';
      var theme = (sp.className.match(/theme-[\w-]+/) || [])[0];
      if (theme) b.classList.add(theme);
      b.setAttribute('role', 'menuitem');
      b.setAttribute('data-spread', i);
      b.title = label;
      b.textContent = short;
      topbarMenu.appendChild(b);
    });
    topbarLinks = Array.prototype.slice.call(topbarMenu.querySelectorAll('.topbar-link'));

    var closeMenu = function(){
      topbar.classList.remove('open');
      topbarToggle.setAttribute('aria-expanded', 'false');
    };

    topbarToggle.addEventListener('click', function(){
      var open = topbar.classList.toggle('open');
      topbarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    topbarMenu.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('.topbar-link') : null;
      if (!b) return;
      closeMenu();
      var si = +b.getAttribute('data-spread');
      goTo(isMobile() ? firstPageOf(si) : si);
      if (window.scrollTo) window.scrollTo(0, 0);
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', function(e){
      if (topbar.classList.contains('open') && !topbar.contains(e.target)) closeMenu();
    });
  }

  // horizontal-only "scroll into view" — never nudges the page vertically
  function scrollXIntoView(el){
    var p = el && el.parentElement;
    if (!p) return;
    var er = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
    if (er.left < pr.left) p.scrollLeft -= (pr.left - er.left) + 12;
    else if (er.right > pr.right) p.scrollLeft += (er.right - pr.right) + 12;
  }

  function firstPageOf(spreadIdx){
    for (var i = 0; i < pages.length; i++){ if (pages[i].spread === spreadIdx) return i; }
    return Math.max(0, Math.min(pageIndex, pages.length - 1));
  }
  function unitCount(){ return isMobile() ? pages.length : spreads.length; }
  function unitPos(){ return isMobile() ? pageIndex : current; }

  function syncActive(){
    spreads.forEach(function(sp, i){ sp.classList.toggle('active', i === current); });
    pages.forEach(function(p, i){ p.el.classList.toggle('m-active', i === pageIndex); });
  }

  function updateChrome(){
    var activeSpread = isMobile() ? pages[pageIndex].spread : current;
    dots.forEach(function(d, i){
      var on = i === activeSpread;
      d.classList.toggle('active', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    prevBtn.disabled = unitPos() === 0;
    nextBtn.disabled = unitPos() === unitCount() - 1;
    var label = spreads[activeSpread].getAttribute('data-label');
    counter.textContent = label + ' · ' + (unitPos() + 1) + ' / ' + unitCount();
    scrollXIntoView(dots[activeSpread]);

    // top bar: highlight the current class, update the mobile label
    if (topbarLinks.length){
      var curLabel = spreads[activeSpread].getAttribute('data-label');
      var curShort = '';
      topbarLinks.forEach(function(b){
        var on = spreads[+b.getAttribute('data-spread')].getAttribute('data-label') === curLabel;
        b.classList.toggle('is-current', on);
        if (on){
          b.setAttribute('aria-current', 'true');
          curShort = b.textContent;
          scrollXIntoView(b);
        } else {
          b.removeAttribute('aria-current');
        }
      });
      if (topbarCurrent) topbarCurrent.textContent = curShort;
    }
  }

  // ----- phone: slide one page at a time -----
  function goToMobile(target){
    if (animating || target === pageIndex || target < 0 || target >= pages.length) return;
    animating = true;
    var oldEl = pages[pageIndex].el;
    pageIndex = target;
    current = pages[target].spread;
    spreads.forEach(function(sp, i){ sp.classList.toggle('active', i === current); });
    oldEl.classList.remove('m-active');
    var el = pages[target].el;
    el.classList.add('m-active');
    el.style.animation = 'none';       // force the entrance animation to replay
    void el.offsetWidth;
    el.style.animation = '';
    if (window.scrollTo) window.scrollTo(0, 0);
    setTimeout(function(){
      animating = false;
      updateChrome();
    }, MOBILE_DURATION);
  }

  // ----- desktop: flip a whole spread (unchanged) -----
  function goToDesktop(target){
    if (animating || target === current || target < 0 || target >= spreads.length) return;
    animating = true;
    var dir = target > current ? 'next' : 'prev';
    var oldSpread = spreads[current];
    var newSpread = spreads[target];
    newSpread.classList.add(dir === 'next' ? 'enter-next' : 'enter-prev');
    void newSpread.offsetWidth;
    requestAnimationFrame(function(){
      oldSpread.classList.add(dir === 'next' ? 'leave-next' : 'leave-prev');
      oldSpread.classList.remove('active');
      newSpread.classList.remove('enter-next', 'enter-prev');
      newSpread.classList.add('active');
    });
    setTimeout(function(){
      oldSpread.classList.remove('leave-next', 'leave-prev');
      current = target;
      pageIndex = firstPageOf(current);
      animating = false;
      updateChrome();
    }, DURATION);
  }

  function goTo(target){ if (isMobile()) { goToMobile(target); } else { goToDesktop(target); } }

  prevBtn.addEventListener('click', function(){ goTo(unitPos() - 1); });
  nextBtn.addEventListener('click', function(){ goTo(unitPos() + 1); });
  dotsWrap.addEventListener('click', function(e){
    var d = e.target.closest ? e.target.closest('.dot') : null;
    if (!d) return;
    var si = parseInt(d.getAttribute('data-index'), 10);
    goTo(isMobile() ? firstPageOf(si) : si);
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight') goTo(unitPos() + 1);
    if (e.key === 'ArrowLeft') goTo(unitPos() - 1);
  });

  var touchStartX = null;
  var bookStage = document.querySelector('.book-stage');
  bookStage.addEventListener('touchstart', function(e){
    touchStartX = e.changedTouches[0].clientX;
  }, {passive:true});
  bookStage.addEventListener('touchend', function(e){
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) goTo(unitPos() + (dx < 0 ? 1 : -1));
    touchStartX = null;
  }, {passive:true});

  // keep both navigation models in sync when crossing the phone/desktop breakpoint
  function applyMode(){
    var nowMobile = isMobile();
    if (nowMobile === wasMobile) return;
    wasMobile = nowMobile;
    if (nowMobile) { pageIndex = firstPageOf(current); }
    else { current = pages[pageIndex] ? pages[pageIndex].spread : 0; }
    animating = false;
    spreads.forEach(function(sp){ sp.classList.remove('enter-next','enter-prev','leave-next','leave-prev'); });
    syncActive();
    updateChrome();
  }
  if (mq.addEventListener) { mq.addEventListener('change', applyMode); }
  else if (mq.addListener) { mq.addListener(applyMode); }
  window.addEventListener('resize', applyMode);

  syncActive();
  updateChrome();
})();
