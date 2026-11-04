/* ------------------------------------------------------------------
   home-about.js — Section 1 (dark editorial hero) of index.html.

   Words:  data/edit_about_section.json -> the about section words
   Body:   data/about/edit_about_us_page.json -> the framed photo
           data/site.json -> the "about" on/off switch
   Drawn with base-template markup; the mount holds no words.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var SITE_URL = "data/site.json";
  var ABOUT_URL = "data/edit_about_section.json";
  var DATA_URL = "data/about/edit_about_us_page.json";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;

  function firstValue(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] != null) return obj[keys[i]];
    }
    return undefined;
  }

  function normalizeAboutSection(raw) {
    raw = raw || {};
    /* The band's words live in one object: "about_section". An older flat
       file is still read as it is. */
    if (raw.about_section && typeof raw.about_section === "object") {
      raw = raw.about_section;
    }
    var button = raw.button || raw.about_section_button;
    var out = {};
    out.eyebrow = firstValue(raw, ["subheading", "about_section_subheading", "about_section_eyebrow", "eyebrow"]);
    out.heading = firstValue(raw, ["heading", "about_section_heading"]);
    out.numeral = firstValue(raw, ["numeral", "about_section_numeral"]);
    out.text = firstValue(raw, ["intro", "about_section_introduction", "text"]);
    var image = raw.image || raw.about_section_image;
    if (image && typeof image === "object") {
      out.image = firstValue(image, ["image_path", "image", "src"]);
      out.imageAlt = firstValue(image, ["image_alt", "alt"]);
      var imageCredit = firstValue(image, ["image_credit", "credit"]);
      var imageCaption = firstValue(image, ["image_caption", "caption"]);
      /* Older image objects used image_caption for the credit line.
         Keep that reading only when no explicit credit key exists. */
      if (imageCredit == null && imageCaption != null) {
        imageCredit = imageCaption;
        imageCaption = undefined;
      }
      out.imageCredit = imageCredit;
      out.imageCaption = imageCaption;
      out.imageAspect = firstValue(image, ["about_section_image_aspect_ratio", "image_aspect_ratio", "aspect_ratio"]);
    } else {
      out.image = image;
      out.imageAlt = raw.about_section_image_alt;
      var newCredit = raw.about_section_image_credit;
      var oldCaption = raw.about_section_image_caption;
      out.imageCredit = newCredit != null ? newCredit : oldCaption;
      out.imageCaption = newCredit != null ? oldCaption : undefined;
      out.imageAspect = raw.about_section_image_aspect_ratio;
    }
    /* Optional multi-image list: about_section_images. Each item accepts
       image_path / image_alt / image_caption / image_credit. */
    out.images = [];
    var list = raw.images != null ? raw.images : raw.about_section_images;
    /* One picture may be written without the array. */
    if (list != null && !Array.isArray(list)) list = [list];
    if (Array.isArray(list)) {
      list.forEach(function (item) {
        if (!item) return;
        if (typeof item === "string") {
          if (String(item).trim()) out.images.push({ src: item, alt: "", caption: "", credit: "" });
          return;
        }
        var src = firstValue(item, ["image_path", "image_path", "image", "src"]);
        if (!src) return;
        var itemCredit = firstValue(item, ["image_credit", "credit"]);
        var itemCaption = firstValue(item, ["image_caption", "caption"]);
        if (itemCredit == null && itemCaption != null) {
          itemCredit = itemCaption;
          itemCaption = undefined;
        }
        out.images.push({
          src: src,
          alt: firstValue(item, ["image_alt", "alt"]) || "",
          caption: itemCaption || "",
          credit: itemCredit || ""
        });
      });
    }
    out.imageInterval = firstValue(raw, ["rotation_time_milliseconds", "interval_ms", "about_section_image_time_interval", "about_section_image_interval"]);
    /* Off unless asked: "zoom_on": true opens a click-to-enlarge lightbox
       for the block's pictures. */
    out.zoom = firstValue(raw, ["zoom_on", "about_section_image_zoom", "about_section_image_magnification", "about_section_image_lightbox", "zoom"]);
    if (!out.imageAspect && (raw.aspect_ratio || raw.about_section_image_aspect_ratio)) {
      out.imageAspect = raw.aspect_ratio || raw.about_section_image_aspect_ratio;
    }
    if (button) {
      var label = firstValue(button, ["label", "about_section_button_label", "button_label", "text"]);
      var link = firstValue(button, ["link", "about_section_button_link", "button_link"]);
      /* The About page is the section's built-in destination; JSON only
         needs a link when it should point somewhere else. A named link
         (@about, @team, @books.my_books) is resolved here. */
      if (!link && label) link = "@about";
      out.button = { text: label, link: link ? window.CWL.link(link) : "" };
    }
    return out;
  }

  function normalizeAboutPhoto(raw) {
    var p = (raw && (raw.impact_in_numbers_section_photo || raw.about_page_photo || raw.photo)) || {};
    return {
      image: firstValue(p, ["image_path", "image", "src"]),
      alt: firstValue(p, ["image_alt", "alt"]),
      credit: firstValue(p, ["impact_in_numbers_section_photo_credit", "image_caption_right", "plateRight"]),
      caption: ""
    };
  }

  function headingHtml(heading) {
    var lines = Array.isArray(heading) ? heading : [heading];
    return lines.filter(function (l) { return l != null && String(l).trim(); })
      .map(esc).join("<br/>");
  }

  /* The stylesheet only carries a few aspect classes, so a ratio the JSON
     asks for is expressed inline instead. Accepts a class ("aspect-square"),
     a bracket value ("aspect-[1/1]") or a bare ratio ("1:1", "1/1"). */
  function normalizeAspect(value) {
    var v = String(value == null ? "" : value).trim();
    if (!v) return { cls: "aspect-[4/5]", style: "" };
    if (v === "square" || v === "1:1" || v === "1/1") {
      return { cls: "aspect-square", style: "" };
    }
    var m = v.match(/^aspect-\[(\d+(?:\.\d+)?)\s*[\/:]\s*(\d+(?:\.\d+)?)\]$/);
    if (!m) m = v.match(/^(\d+(?:\.\d+)?)\s*[\/:]\s*(\d+(?:\.\d+)?)$/);
    if (m) return { cls: "", style: "aspect-ratio:" + m[1] + " / " + m[2] };
    return { cls: v, style: "" };
  }

  /* Every picture in the block travels as one lightbox set, so a click
     opens the one under the pointer and the arrows walk the rest. */
  function lightboxAttrs(images, index, zoom) {
    if (!zoom) return "";
    var urls = images.map(function (im) { return im.src; });
    var captions = images.map(function (im) { return im.caption || ""; });
    var attrs = ' data-lightbox="' + esc(urls.join("|")) + '"';
    if (captions.some(Boolean)) {
      attrs += ' data-lightbox-caption="' + esc(captions.join("|")) + '"';
    }
    if (urls.length > 1) attrs += ' data-lightbox-start="' + index + '"';
    return attrs + ' role="button" tabindex="0" aria-label="View the picture"';
  }

  function render(entry, data) {
    var images = (data && data.images) || [];
    var button = entry.button || {};
    var imageAspect = normalizeAspect(entry.imageAspect || "aspect-[4/5]");
    var interval = (data && data.interval != null) ? data.interval : 5000;
    var zoom = entry.zoom === true || entry.zoom === "true";

    var slidesHtml = images.map(function (im, i) {
      return '            <img class="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.08] transition duration-700' +
        (zoom ? " cursor-zoom-in" : "") + '"' +
        ' style="opacity:' + (i === 0 ? "1" : "0") + '"' +
        ' data-about-slide' +
        ' data-caption="' + esc(im.caption || "") + '"' +
        ' data-credit="' + esc(im.credit || "") + '"' +
        ' alt="' + esc(im.alt || "") + '"' +
        ' loading="' + (i === 0 ? "eager" : "lazy") + '"' +
        ' src="' + esc(im.src) + '"' +
        lightboxAttrs(images, i, zoom) + " />";
    }).join("\n");

    var firstCredit = images.length ? (images[0].credit || "") : "";
    var firstCaption = images.length ? (images[0].caption || "") : "";

    var dotsHtml = images.length > 1
      ? [
          '            <div class="flex items-center gap-space-sm shrink-0 ml-auto" data-about-dots>',
          '              <span class="font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E]" data-slide-count></span>',
          '              <div class="flex gap-space-xs">',
          images.map(function (_, i) {
            return '                <button type="button" class="slide-dot w-2 h-2' + (i === 0 ? " is-active" : "") +
              '" data-slide-dot data-i="' + i + '" aria-label="Photo ' + (i + 1) + " of " + images.length + '"' +
              (i === 0 ? ' aria-current="true"' : "") + "></button>";
          }).join("\n"),
          "              </div>",
          "            </div>"
        ].join("\n")
      : "";

    /* With a photo the words sit left beside it; without one the whole
       band centres itself in the section. */
    var hasImages = images.length > 0;
    var colClass = hasImages
      ? "lg:col-span-6 flex flex-col justify-center text-center lg:text-left"
      : "lg:col-span-12 flex flex-col justify-center text-center";
    var headClass = hasImages
      ? "flex items-start justify-center lg:justify-start gap-6 md:gap-10 mb-8"
      : "flex items-start justify-center gap-6 md:gap-10 mb-8";
    var textClass = hasImages
      ? "font-body-lg text-body-lg text-[#CDC8BC] max-w-xl mb-10 mx-auto pl-0 lg:mx-0 lg:pl-2 leading-relaxed text-center lg:text-justify"
      : "font-body-lg text-body-lg text-[#CDC8BC] max-w-xl mb-10 mx-auto leading-relaxed text-center";
    var buttonClass = hasImages
      ? "pl-0 lg:pl-2 flex justify-center lg:block"
      : "flex justify-center";

    return [
      '<div class="max-w-[1260px] mx-auto">',
      '  <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-center">',
      '    <div class="' + colClass + '">',
      '      <div class="' + headClass + '">',
      '        <div class="pt-4 flex flex-col">',
      '          <span class="font-label-md text-label-md uppercase tracking-[0.25em] text-[#A69F8E] mb-2">' + esc(entry.eyebrow || "") + "</span>",
      '          <h1 class="font-headline-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] uppercase tracking-wide text-[#F5F2EB]">',
      headingHtml(entry.heading),
      "          </h1>",
      "        </div>",
      "      </div>",
      entry.text
        ? '      <p class="' + textClass + '">' + esc(entry.text) + "</p>"
        : "",
      button.link
        ? [
            '      <div class="' + buttonClass + '">',
            '        <a class="inline-flex items-center justify-center gap-2 w-[280px] max-w-full bg-[#C7BAA0] text-[#191917] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:bg-[#D8CCB5] transition-colors duration-200" href="' +
              (/^[a-z][a-z0-9+.-]*:/i.test(button.link) ? esc(button.link) : esc(button.link)) + '">' + esc(button.text || "") + '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span></a>',
            "      </div>"
          ].join("\n")
        : "",
      "    </div>",
      images.length
        ? [
            '    <div class="lg:col-span-6 flex justify-center lg:justify-end mt-12 lg:mt-0">',
            '      <div class="relative w-full max-w-[480px]">',
            '        <div class="absolute -top-4 -right-4 md:-top-7 md:-right-7 w-full h-full border border-[#C7BAA0]/40 pointer-events-none cw-wireframe z-0"></div>',
            '        <div class="relative z-10 bg-[#21211E] p-3 md:p-4 shadow-2xl">',
            '          <div class="relative overflow-hidden ' + imageAspect.cls + ' w-full bg-[#2C2B27]"' + (imageAspect.style ? ' style="' + imageAspect.style + '"' : "") + ' data-about-slideshow data-about-interval="' + interval + '">',
            slidesHtml,
            '            <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary pointer-events-none" data-about-credit' + (firstCredit ? "" : " hidden") + ">" + esc(firstCredit) + "</span>",
            "          </div>",
            '          <div class="pt-3 px-1 flex items-center justify-between gap-space-sm">',
            '            <span class="font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E] min-w-0" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" data-about-caption' + (firstCaption ? "" : " hidden") + ">" + esc(firstCaption) + "</span>",
            dotsHtml,
            "          </div>",
            "        </div>",
            "      </div>",
            "    </div>"
          ].join("\n")
        : "",
      "  </div>",
      "</div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* Crossfade the About images; dots jump to one; captions and credit
     follow the active slide. Same feel as the research slideshow. */
  function startAboutSlideshow(root) {
    var box = root.querySelector("[data-about-slideshow]");
    if (!box) return;
    var slides = box.querySelectorAll("[data-about-slide]");
    if (slides.length < 2) return;
    var dotsContainer = box.nextElementSibling && box.nextElementSibling.querySelector("[data-about-dots]");
    if (!dotsContainer) return;
    var dots = dotsContainer.querySelectorAll("[data-slide-dot]");
    var countEl = dotsContainer.querySelector("[data-slide-count]");
    var captionEl = root.querySelector("[data-about-caption]");
    var creditEl = root.querySelector("[data-about-credit]");
    var interval = parseInt(box.getAttribute("data-about-interval") || "5000", 10);
    if (isNaN(interval)) interval = 5000;
    if (interval > 0 && interval < 1000) interval = 1000;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var active = 0;
    var timer = null;

    function pad(n) { return n < 10 ? "0" + n : String(n); }

    function show(next) {
      active = (next + slides.length) % slides.length;
      for (var i = 0; i < slides.length; i++) {
        var on = i === active;
        slides[i].style.opacity = on ? "1" : "0";
        slides[i].style.pointerEvents = on ? "" : "none";
        slides[i].setAttribute("aria-hidden", on ? "false" : "true");
        if (slides[i].hasAttribute("data-lightbox")) {
          slides[i].tabIndex = on ? 0 : -1;
        }
      }
      for (var j = 0; j < dots.length; j++) {
        dots[j].classList.toggle("is-active", j === active);
        if (j === active) dots[j].setAttribute("aria-current", "true");
        else dots[j].removeAttribute("aria-current");
      }
      if (countEl) countEl.textContent = pad(active + 1) + " / " + pad(slides.length);
      if (captionEl) {
        var cap = slides[active].getAttribute("data-caption") || "";
        captionEl.textContent = cap;
        captionEl.hidden = !cap;
      }
      if (creditEl) {
        var cr = slides[active].getAttribute("data-credit") || "";
        creditEl.textContent = cr;
        creditEl.hidden = !cr;
      }
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function play() {
      stop();
      if (interval > 0 && !reduce) {
        timer = setInterval(function () { show(active + 1); }, interval);
      }
    }

    for (var d = 0; d < dots.length; d++) {
      (function (idx) {
        dots[idx].addEventListener("click", function () { show(idx); play(); });
      })(d);
    }

    box.addEventListener("mouseenter", stop);
    box.addEventListener("mouseleave", play);
    show(0);
    play();
  }

  function boot() {
    var section = document.getElementById("about");
    if (!section) return;

    Promise.all([
      loadJson(SITE_URL),
      loadJson(ABOUT_URL),
      loadJson(DATA_URL)
    ]).then(function (loaded) {
      var site = loaded[0];
      var about = normalizeAboutSection(loaded[1] || {});
      var data = loaded[2] || {};
      var entry = window.CWL.sectionConfig(site, "about");

      /* Older files kept the words in site.json; keep that as a quiet
         fallback while the new data/edit_about_section.json is missing. */
      if (!about.eyebrow && !about.heading && entry) {
        about = normalizeAboutSection(entry);
      }

      if (!entry || entry.is_enabled === false) {
        section.style.display = "none";
        window.CWL.retargetNav("#about", about.button && about.button.link);
        return;
      }
      var photo = normalizeAboutPhoto(data);
      var images = [];

      /* 1) explicit about_section_images list */
      if (about.images && about.images.length) {
        about.images.forEach(function (im) {
          images.push({
            src: window.CWL.imageSrc(im.src, "assets/images/about_us/"),
            alt: im.alt || "",
            caption: im.caption || "",
            credit: im.credit || ""
          });
        });
      }

      /* 2) single about_section_image */
      if (!images.length && about.image) {
        images.push({
          src: window.CWL.imageSrc(about.image, "assets/images/about_us/"),
          alt: about.imageAlt || photo.alt || "",
          caption: about.imageCaption != null ? about.imageCaption : (photo.caption || ""),
          credit: about.imageCredit != null ? about.imageCredit : (photo.credit || "")
        });
      }

      /* 3) legacy edit_about_us_page.json photo */
      if (!images.length && photo.image) {
        images.push({
          src: window.CWL.imageSrc(photo.image, "assets/images/about_us/"),
          alt: photo.alt || "",
          caption: photo.caption || "",
          credit: photo.credit || ""
        });
      }

      section.innerHTML = render(about, { images: images, interval: about.imageInterval });
      startAboutSlideshow(section);
    });
  }

  boot();
})();
