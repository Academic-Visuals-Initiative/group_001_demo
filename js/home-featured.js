/* ------------------------------------------------------------------
   home-featured.js — Section 07 (supporters, light band) of index.html.

   Words:  data/edit_featured_section.json — the whole showcase in one file: label,
           heading, text and the logo list, in page order. (site.json
           only carries the on/off switch — the one exception to §7,
           because a showcase should be editable in one place.)

   Leave a word out and that line doesn't show; leave a logo out and it
   isn't drawn. The logos sit on one row and wrap by themselves on
   small screens. The same file can show funders today and press
   mentions or collaboration partners later — edit the one file.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var SITE_URL = "data/site.json";
  var DATA_URL = "data/edit_featured_section.json";
  var VISIBLE = 5;
  var BASE = window.location.pathname.indexOf("/pages/") !== -1 ? "../" : "";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;
  var messageHtml = window.CWL.messageHtml;

  function logoValue(logo) {
    if (!logo) return "";
    return logo.image_path != null ? logo.image_path : (logo.image != null ? logo.image : "");
  }

  /* A bare file name is read from assets/logos/featured_section/; a path
     (assets/… , images/… , ../… or a full URL) is used as written. */
  function logoSrc(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/" || s.indexOf("data:") === 0) return s;
    if (s.indexOf("../") === 0) return s;
    if (!/\.[a-z0-9]+$/i.test(s)) s += ".svg";
    if (s.indexOf("/") > -1) return BASE + s;
    return BASE + "assets/logos/featured_section/" + s;
  }

  function logoHtml(logo) {
    if (!logo) return "";
    var src = logoSrc(logoValue(logo));
    if (!src) return "";
    var alt = logo.logo_alt != null ? logo.logo_alt
      : (logo.description != null ? logo.description : "");
    alt = String(alt).trim() ? String(alt) : window.CWL.altText;
    return (
      '    <img class="featured-logo" src="' +
      esc(String(src)) + '" alt="' + esc(alt) + '" />'
    );
  }

  /* The logo list: add_logo_files (older `logos` still reads). */
  function logoEntries(data) {
    var raw = data && (data.logos != null ? data.logos
      : (data.add_logo_files != null ? data.add_logo_files : null));
    return Array.isArray(raw) ? raw : [];
  }

  /* One entry per picture: the same file listed twice never shows twice. */
  function logoList(data) {
    var seen = {};
    return logoEntries(data).filter(function (logo) {
      var value = logoValue(logo);
      if (!value) return false;
      var key = logoSrc(value).toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  /* Up to five logos sit still. More than five become a window of five that
     slides one place at a time: the left logo leaves, a new one arrives from
     the right. A dot per starting place sits underneath. */
  function carouselHtml(logos) {
    return [
      '  <div class="featured-logos" data-featured-carousel>',
      '    <div class="featured-logos__viewport" data-featured-viewport>',
      '      <div class="featured-logos__track" data-featured-track>' +
        logos.slice(0, VISIBLE).join("\n") + "</div>",
      "    </div>",
      '    <div class="featured-logos__dots" data-featured-dots>' +
        logos.map(function (_, i) {
          return '<button type="button" class="featured-logos__dot' +
            (i === 0 ? " is-active" : "") + '" data-logo-index="' + i +
            '" aria-label="Show supporter logos starting at ' + (i + 1) + '"></button>';
        }).join("") + "</div>",
      "  </div>"
    ].join("\n");
  }

  function wireCarousel(section, logos, seconds) {
    var track = section.querySelector("[data-featured-track]");
    var viewport = section.querySelector("[data-featured-viewport]");
    var dots = Array.prototype.slice.call(section.querySelectorAll("[data-logo-index]"));
    if (!track || !viewport || !dots.length || logos.length < 2) return;

    var index = 0;
    var timer = null;
    var slideTimer = null;
    var sliding = false;
    var DURATION = 600;
    var take = Math.min(VISIBLE, logos.length);
    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function fitViewport() {
      var width = Math.ceil(track.scrollWidth);
      if (width > 0) viewport.style.width = width + "px";
    }

    /* Pictures arrive after the markup; measuring before they have a size
       would shrink the band to a small box. Wait for them, then fit. */
    function fitWhenReady() {
      var imgs = Array.prototype.slice.call(track.querySelectorAll("img"));
      var pending = imgs.filter(function (img) { return !img.complete; });
      if (!pending.length) {
        fitViewport();
        return;
      }
      var left = pending.length;
      pending.forEach(function (img) {
        function done() {
          left--;
          if (left <= 0) fitViewport();
        }
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }

    function fill(start) {
      if (slideTimer) { clearTimeout(slideTimer); slideTimer = null; }
      sliding = false;
      var html = [];
      for (var k = 0; k < take; k++) {
        html.push(logos[(start + k) % logos.length]);
      }
      track.style.transition = "none";
      track.style.transform = "none";
      track.innerHTML = html.join("\n");
      index = ((start % logos.length) + logos.length) % logos.length;
      paintDots();
      fitWhenReady();
    }

    function paintDots() {
      dots.forEach(function (dot, n) {
        dot.classList.toggle("is-active", n === index);
        if (n === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    function gapSize() {
      var cs = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap);
      return isNaN(gap) ? 0 : gap;
    }

    function slideStep() {
      if (sliding) return;
      var first = track.firstElementChild;
      if (!first) return;
      if (reduce) {
        fill(index + 1);
        return;
      }
      /* The incoming logo is appended first, so it is already waiting at the
         right edge when the row starts to move. */
      track.insertAdjacentHTML("beforeend", logos[(index + take) % logos.length]);
      var distance = first.getBoundingClientRect().width + gapSize();
      sliding = true;
      track.style.transition = "transform " + DURATION + "ms cubic-bezier(0.4, 0, 0.2, 1)";
      track.style.transform = "translateX(-" + distance + "px)";
      slideTimer = setTimeout(function () {
        slideTimer = null;
        if (first.parentNode === track) track.removeChild(first);
        track.style.transition = "none";
        track.style.transform = "none";
        void track.offsetWidth;
        index = (index + 1) % logos.length;
        paintDots();
        fitWhenReady();
        sliding = false;
      }, DURATION + 20);
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function start() {
      stop();
      if (reduce) return;
      timer = setInterval(slideStep, Math.max(2, seconds) * 1000);
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        stop();
        fill(parseInt(dot.getAttribute("data-logo-index"), 10) || 0);
        start();
      });
    });

    fill(0);
    window.addEventListener("resize", fitViewport);
    window.addEventListener("load", fitWhenReady);
    start();
  }

  function render(data, logos, useCarousel) {
    var label = data.subheading != null
      ? data.subheading
      : (data.home_page_featured_section_subheading != null
        ? data.home_page_featured_section_subheading
        : data.label);
    var heading = data.heading != null
      ? data.heading
      : data.home_page_featured_section_heading;
    var text = data.intro != null
      ? data.intro
      : (data.home_page_featured_section_introduction != null
        ? data.home_page_featured_section_introduction
        : data.text);
    label = label == null ? "" : String(label);
    heading = heading == null ? "" : String(heading);
    text = text == null ? "" : String(text);

    return [
      '<div class="max-w-[1260px] mx-auto">',
      '  <div class="flex flex-col items-center text-center mb-12">',
      "    <div>",
      label
        ? '      <span class="font-label-md text-label-md uppercase tracking-[0.25em] text-secondary block mb-2">' + esc(label) + "</span>"
        : "",
      heading
        ? '      <h2 class="font-headline-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] uppercase tracking-wide text-primary">' + esc(heading) + "</h2>"
        : "",
      text
        ? '      <p class="font-body-md text-body-md text-on-surface-variant max-w-[720px] mx-auto mt-4 leading-relaxed">' + esc(text) + "</p>"
        : "",
      "    </div>",
      "  </div>",
      useCarousel
        ? carouselHtml(logos)
        : (logos.length
          ? '  <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-6">' + logos.join("\n") + "</div>"
          : ""),
      "</div>"
    ].filter(function (line) { return line !== ""; }).join("\n");
  }

  function boot() {
    var section = document.getElementById("featured");
    if (!section) return;

    Promise.all([loadJson(SITE_URL), loadJson(DATA_URL)]).then(function (loaded) {
      var site = loaded[0];
      var data = loaded[1] || {};
      /* The band's words live in one object: "featured_section". An older
         flat file is still read as it is. */
      if (data.featured_section && typeof data.featured_section === "object") {
        data = data.featured_section;
      }
      var entry = window.CWL.sectionConfig(site, "featured");

      if (!entry || entry.is_enabled === false) {
        section.style.display = "none";
        return;
      }
      if (!data) {
        section.innerHTML = messageHtml("This showcase is temporarily unavailable.");
        return;
      }
      var logos = logoList(data).map(logoHtml).filter(Boolean);
      var listed = logoEntries(data).filter(function (logo) {
        return !!logoValue(logo);
      }).length;
      /* More than five *entries* start the rotation. Repeated images are
         still shown once, so a duplicate can never sit twice in a window. */
      var useCarousel = listed > VISIBLE && logos.length > 1;
      section.innerHTML = render(data, logos, useCarousel);
      if (useCarousel) {
        /* One unit for every rotation: milliseconds. Older files wrote
           `rotate_seconds`; read that too, in seconds. */
        var ms = parseInt(data.rotation_time_milliseconds, 10);
        if (isNaN(ms)) ms = parseInt(data.interval_ms, 10);
        if (isNaN(ms)) {
          var legacySeconds = parseFloat(data.rotate_seconds);
          if (!isNaN(legacySeconds)) ms = legacySeconds * 1000;
        }
        wireCarousel(section, logos, isNaN(ms) ? 4 : Math.max(2, ms / 1000));
      }
    });
  }

  boot();
})();
