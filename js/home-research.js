/* ------------------------------------------------------------------
   home-research.js — Section 2 (light, framed photo + area cards)
   of index.html.

   Words & config: data/edit_research_section.json ->
           home_page_research_areas_section, in UI order:
           research_areas_section_subheading / _heading / _introduction
           / _image_or_images (one picture or a list; each entry may
           carry image_credit) / _image_time_interval / _image_magnification /
           _image_caption_valid_with_single_image_option (caption fallback) /
           _image_credit_right (older credit fallback) /
           _button (with _button_label and optional
           individual_research_area_file_id) /
           _visible_card_count / _card_button (with _card_button_label).
           data/site.json -> the "research" entry is only the on/off
           switch.
   Cards:  data/edit_research_section.json -> individual_research_area_cards.
           A card is written with
           individual_research_area_card_title, _keyword, _introduction
           and, when it should open a page,
           individual_research_area_file_id. A card with no id is a
           plain card — no link, arrow or button. A stub (just the id)
           borrows those words from the area's deep file
           (data/research/<individual_research_area_file_id>.json), so
           the cards render in both styles (see VOCABULARY §15).
   Shows the first `max_items` cards
   (file order; 0 shows none); linked cards open their area's page.
   The section button opens the area named by its
   `individual_research_area_file_id`, or the labs page when there
   isn't one.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var SITE_URL = "data/site.json";
  var DATA_URL = "data/edit_research_section.json";
  var DATA_DIR = "data/research/";
  /* Bare picture names in this section are looked up here. A path
     (with a slash, or a full URL) is used exactly as written. */
  var IMAGE_BASE = "assets/images/research_areas_and_labs/home_research_areas_section/";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;

  function cardHtml(area, index, cardLabel, rowCls) {
    var num = ("0" + (index + 1)).slice(-2);
    var card = window.CWL.researchCard;
    var id = card.id(area);
    var linked = !!id;
    /* The area's page is a system route
       (@area:<individual_research_area_file_id>) — no link to
       configure per card. A card without an id is a plain card: no
       link, no arrow, no button. */
    var open = linked
      ? '        <a class="grow ' + rowCls + ' bg-[#FAF9F5] p-8 shadow-sm flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300" href="' + esc(window.CWL.link("@area:" + id)) + '">'
      : '        <div class="grow ' + rowCls + ' bg-[#FAF9F5] p-8 shadow-sm flex flex-col justify-between">';
    var footer = linked
      ? [
          '          <div class="pt-8 flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-widest text-primary font-medium">',
          "            <span>" + esc(cardLabel) + "</span>",
          '            <span class="cw-icon cw-icon--arrow-forward text-sm" aria-hidden="true"></span>',
          "          </div>"
        ].join("\n")
      : "";
    return [
      open,
      "          <div>",
      '            <div class="flex items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E5DFD0]">',
      '              <span class="font-headline-sm text-headline-sm text-primary shrink-0">' + num + "</span>",
      '              <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary text-right leading-snug">' + esc(card.keyword(area) || "") + "</span>",
      "            </div>",
      '            <h3 class="font-headline-sm text-headline-sm uppercase text-primary mb-3 break-words">' + esc(card.title(area) || "") + "</h3>",
      '            <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">' + esc(card.introduction(area) || "") + "</p>",
      "          </div>",
      footer,
      linked ? "        </a>" : "        </div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* Row recipes keyed by the number of cards actually shown: every
     line of cards grows to touch both edges, so there's never an
     empty pocket — 4 cards become two even halves (one row of four
     on wide screens), 5 cards fill each line the same way. Full
     class names only (the Tailwind scanner reads them from this
     file); phones always stack one per line. */
  var DEFAULT_ROW = "basis-full md:basis-[calc((100%_-_64px)/3)]";
  var ROWS = {
    1: "basis-full",
    2: "basis-full md:basis-[calc((100%_-_32px)/2)]",
    3: "basis-full md:basis-[calc((100%_-_64px)/3)]",
    4: "basis-full md:basis-[calc((100%_-_32px)/2)] xl:basis-[calc((100%_-_96px)/4)]",
    5: "basis-full md:basis-[calc((100%_-_64px)/3)] 2xl:basis-[calc((100%_-_128px)/5)]",
    6: "basis-full md:basis-[calc((100%_-_64px)/3)]",
    7: "basis-full md:basis-[calc((100%_-_64px)/3)] xl:basis-[calc((100%_-_96px)/4)]",
    8: "basis-full md:basis-[calc((100%_-_64px)/3)]",
    9: "basis-full md:basis-[calc((100%_-_64px)/3)]",
    10: "basis-full md:basis-[calc((100%_-_64px)/3)] 2xl:basis-[calc((100%_-_128px)/5)]"
  };

  /* The section's words, in UI order and under explicit names. The older
     short keys (`subheading`, `heading`, `visible_card_count`, …) still
     read as fallbacks, so an older file keeps working. */
  function sectionWords(cfg) {
    return {
      subheading: cfg.research_areas_section_subheading != null
        ? cfg.research_areas_section_subheading
        : cfg.subheading,
      heading: cfg.research_areas_section_heading != null
        ? cfg.research_areas_section_heading
        : cfg.heading
    };
  }

  /* The one button beside the heading.
     `individual_research_area_file_id` opens that area's page; without
     one it falls back to the labs page. The older `research-file-id`
     and `file_id` spellings, and a legacy `link`, are still accepted. */
  function sectionButton(cfg) {
    var b = cfg.research_areas_section_button;
    if (!b || typeof b !== "object") b = {};
    var label = b.research_areas_section_button_label != null
      ? b.research_areas_section_button_label
      : (b.button_label != null ? b.button_label : cfg.research_areas_section_button_label);
    label = String(label == null ? "" : label);
    var fileId = b["individual_research_area_file_name"] != null
      ? b["individual_research_area_file_name"]
      : (b["individual_research_area_file_id"] != null
        ? b["individual_research_area_file_id"]
        : (b["research-file-id"] != null ? b["research-file-id"] : b.file_id));
    fileId = String(fileId == null ? "" : fileId).trim();
    var href = "";
    if (label.trim()) {
      var explicit = b.research_areas_section_button_link != null
        ? b.research_areas_section_button_link
        : (b.button_link != null ? b.button_link : b.link);
      if (fileId) href = window.CWL.link("@area:" + fileId);
      else if (explicit) href = window.CWL.link(explicit);
      else href = window.CWL.link("@labs");
    }
    return { label: label, href: href };
  }

  /* The words on every card's own button. */
  function cardButtonLabel(cfg) {
    var b = cfg.research_areas_section_card_button;
    if (!b || typeof b !== "object") b = {};
    var label = b.research_areas_section_card_button_label != null
      ? b.research_areas_section_card_button_label
      : (b.text != null
        ? b.text
        : (cfg.cardButton && cfg.cardButton.text != null ? cfg.cardButton.text : cfg.research_areas_section_card_button_label));
    label = String(label == null ? "" : label);
    return label.trim() ? label : "Explore area";
  }

  /* 0 is a real choice: show no cards. 1, 2, 3 … show that many. A
     missing or non-numeric value keeps the old default of three. */
  function visibleCardCount(cfg) {
    var raw = cfg.max_items;
    if (raw == null) raw = cfg.visible_card_count;
    var n = parseInt(raw, 10);
    if (isNaN(n)) n = 3;
    return Math.max(0, n);
  }

  /* The picture block's list: one filename, or several. An entry may be
     a filename/path or
     `{ "image_path": "…", "image_caption": "…", "image_credit": "…" }`
     (an optional `image_alt` describes it). Bare names are read from
     the section's own picture folder. A picture's own caption and credit
     win; the section's
     `research_areas_section_image_caption_valid_with_single_image_option`
     is the caption fallback, and the older
     `research_areas_section_image_credit_right` is the credit fallback.
     The caption prints under the plate at the left; the credit prints as
     a black tag in the picture's top-right corner. Both follow the visible
     slide. */
  function sectionPictures(cfg) {
    var value = cfg.research_areas_section_image_or_images;
    if (value == null) value = cfg.research_areas_section_image;
    if (value == null || value === "") return [];
    var raw = Array.isArray(value) ? value : [value];
    var fallbackCaption = cfg.research_areas_section_image_caption_valid_with_single_image_option != null
      ? cfg.research_areas_section_image_caption_valid_with_single_image_option
      : "";
    var fallbackCredit = cfg.research_areas_section_image_credit_right != null
      ? cfg.research_areas_section_image_credit_right
      : "";
    return raw.map(function (entry) {
      if (entry && typeof entry === "object") {
        var src = entry.image_path != null
          ? entry.image_path
          : (entry.src != null ? entry.src : entry.image);
        var caption = entry.image_caption != null
          ? entry.image_caption
          : (entry.caption != null ? entry.caption : fallbackCaption);
        var alt = entry.image_alt != null ? entry.image_alt : entry.alt;
        var credit = entry.image_credit != null
          ? entry.image_credit
          : (entry.credit != null ? entry.credit : fallbackCredit);
        return {
          src: window.CWL.imageSrc(src, IMAGE_BASE),
          alt: alt == null ? "" : String(alt),
          caption: String(caption == null ? "" : caption),
          credit: String(credit == null ? "" : credit)
        };
      }
      return {
        src: window.CWL.imageSrc(entry, IMAGE_BASE),
        alt: "",
        caption: String(fallbackCaption == null ? "" : fallbackCaption),
        credit: String(fallbackCredit == null ? "" : fallbackCredit)
      };
    }).filter(function (p) { return p.src; });
  }

  /* Every picture in the block travels as one lightbox set, so a click
     opens the one under the pointer and the arrows walk the rest. */
  function pictureLightboxAttrs(pictures, index, zoom) {
    if (!zoom) return "";
    var urls = pictures.map(function (p) { return p.src; });
    var captions = pictures.map(function (p) { return p.caption || ""; });
    var attrs = ' data-lightbox="' + esc(urls.join("|")) + '"';
    if (captions.some(Boolean)) {
      attrs += ' data-lightbox-caption="' + esc(captions.join("|")) + '"';
    }
    if (urls.length > 1) attrs += ' data-lightbox-start="' + index + '"';
    return attrs + ' role="button" tabindex="0" aria-label="View the picture"';
  }

  /* The stacked slides. One image is just a still; several crossfade.
     `research_areas_section_image_magnification: false` turns the
     lightbox off for the whole block — not picture by picture. */
  function pictureSlides(cfg, pictures) {
    var zoom = cfg.research_areas_section_image_magnification;
    if (zoom == null) zoom = cfg.research_areas_section_image_zoom;
    zoom = zoom !== false;
    var slides = pictures.map(function (p, i) {
      return '            <img class="absolute inset-0 w-full h-full object-cover contrast-[1.05] transition-opacity duration-700' +
        (zoom ? " cursor-zoom-in" : "") + '"' +
        ' style="opacity:' + (i === 0 ? "1" : "0") + '"' +
        ' data-research-slide' +
        ' data-caption="' + esc(p.caption || "") + '"' +
        ' data-credit="' + esc(p.credit || "") + '"' +
        ' alt="' + esc(p.alt) + '"' +
        ' loading="' + (i === 0 ? "eager" : "lazy") + '"' +
        ' src="' + esc(p.src) + '"' +
        pictureLightboxAttrs(pictures, i, zoom) + " />";
    });
    var dots = "";
    return slides.join("\n");
  }

  /* Advance the stacked slides; dots jump to one. The interval is the
     block's own `research_areas_section_image_time_interval` (ms); 0 stops
     the automatic walk, and reduced-motion readers start still. */
  function startSlideshow(root, cfg) {
    var box = root.querySelector("[data-research-slideshow]");
    if (!box) return;
    var slides = box.querySelectorAll("[data-research-slide]");
    if (slides.length < 2) return;
    var dotsContainer = box.nextElementSibling?.querySelector("[data-research-dots]");
    if (!dotsContainer) return;
    var dots = dotsContainer.querySelectorAll("[data-slide-dot]");
    var captionEl = root.querySelector("[data-research-caption]");
    var creditEl = root.querySelector("[data-research-credit]");
    var raw = parseInt(cfg.research_areas_section_image_time_interval, 10);
    if (isNaN(raw)) raw = parseInt(cfg.research_areas_section_image_interval, 10);
    var interval = isNaN(raw) ? 5000 : Math.max(0, raw);
    if (interval > 0 && interval < 1000) interval = 1000;
    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var active = 0;
    var timer = null;

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
        if (j === active) dots[j].setAttribute("aria-current", "true");
        else dots[j].removeAttribute("aria-current");
        dots[j].classList.toggle("is-active", j === active);
      }
      // Update fraction counter - look in dots container
      var countEl = dotsContainer.querySelector("[data-slide-count]");
      if (countEl) {
        var current = String(active + 1).padStart(2, "0");
        var total = String(slides.length).padStart(2, "0");
        countEl.textContent = current + " / " + total;
      }
      if (captionEl) {
        var line = slides[active].getAttribute("data-caption") || "";
        captionEl.textContent = line;
        captionEl.hidden = !line;
      }
      if (creditEl) {
        var credit = slides[active].getAttribute("data-credit") || "";
        creditEl.textContent = credit;
        creditEl.hidden = !credit;
      }
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function play() {
      stop();
      if (!interval || reduce) return;
      timer = setInterval(function () { show(active + 1); }, interval);
    }

    Array.prototype.forEach.call(dots, function (dot) {
      dot.addEventListener("click", function () {
        show(parseInt(dot.getAttribute("data-i"), 10) || 0);
        play();
      });
    });

    show(0);
    play();
  }

  /* The stylesheet only carries a few aspect classes, so a ratio the JSON
     asks for is expressed inline instead. Accepts a class ("aspect-square"),
     a bracket value ("aspect-[1/1]") or a bare ratio ("1:1", "1/1"). */
  function normalizeAspect(value) {
    var v = String(value == null ? "" : value).trim();
    if (!v) return { cls: "aspect-[3/4]", style: "" };
    if (v === "square" || v === "1:1" || v === "1/1") {
      return { cls: "aspect-square", style: "" };
    }
    var m = v.match(/^aspect-\[(\d+(?:\.\d+)?)\s*[\/:]\s*(\d+(?:\.\d+)?)\]$/);
    if (!m) m = v.match(/^(\d+(?:\.\d+)?)\s*[\/:]\s*(\d+(?:\.\d+)?)$/);
    if (m) return { cls: "", style: "aspect-ratio:" + m[1] + " / " + m[2] };
    return { cls: v, style: "" };
  }

  function render(cfg, areas) {
    var words = sectionWords(cfg);
    var button = sectionButton(cfg);
    var cardLabel = cardButtonLabel(cfg);
    var count = visibleCardCount(cfg);
    /* A card with no page and no words would draw an empty plate with
       just its number. Keep it only when it has something to say — such a
       card is drawn as a plain card, never a link. */
    var card = window.CWL.researchCard;
    var usable = (areas || []).filter(function (area) {
      if (!area) return false;
      if (card.id(area)) return true;
      return !!(card.title(area) || card.keyword(area) || card.introduction(area));
    });
    var shown = usable.slice(0, count);
    var rowCls = ROWS[String(shown.length)] || DEFAULT_ROW;
    var pictures = sectionPictures(cfg);
    var firstCaption = pictures.length ? (pictures[0].caption || "") : "";
    var firstCredit = pictures.length ? (pictures[0].credit || "") : "";
    var imageAspect = normalizeAspect(cfg.research_areas_section_image_aspect_ratio || "aspect-[3/4]");
    var dotsHtml = pictures.length > 1
      ? [
          '            <div class="flex items-center gap-space-sm shrink-0 ml-auto" data-research-dots>',
          '              <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant" data-slide-count></span>',
          '              <div class="flex gap-space-xs">',
          pictures.map(function (_, i) {
            return '                <button type="button" class="slide-dot w-2 h-2' + (i === 0 ? " is-active" : "") +
              '" data-slide-dot data-i="' + i + '" aria-label="Photo ' + (i + 1) + ' of ' + pictures.length + '"' +
              (i === 0 ? ' aria-current="true"' : "") + "></button>";
          }).join("\n"),
          "              </div>",
          "            </div>"
        ].join("\n")
      : "";

    /* With pictures the words sit left beside them; without any the whole
       band centres itself in the section. */
    var hasPictures = pictures.length > 0;
    var textColClass = hasPictures
      ? "lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center text-center lg:text-left lg:pl-8 mb-10 lg:mb-0"
      : "lg:col-span-12 order-1 flex flex-col justify-center text-center mb-10 lg:mb-0";
    var headClass = hasPictures
      ? "flex items-start justify-center lg:justify-start gap-6 md:gap-10 mb-6"
      : "flex items-start justify-center gap-6 md:gap-10 mb-6";
    var introClass = hasPictures
      ? "font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto lg:mx-0 mb-8 pl-0 lg:pl-2 leading-relaxed lg:text-justify"
      : "font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto mb-8 leading-relaxed text-center";
    var buttonClass = hasPictures
      ? "pl-0 lg:pl-2 flex justify-center lg:block"
      : "flex justify-center";

    return [
      '<div class="max-w-[1260px] mx-auto">',
      '  <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-center mb-16">',
      pictures.length
        ? [
            '    <div class="lg:col-span-5 order-2 lg:order-1 flex justify-center lg:justify-start">',
            '      <div class="relative w-full max-w-[440px]">',
            '        <div class="absolute -bottom-5 -left-5 md:-bottom-7 md:-left-7 w-full h-full border border-[#1B1C19]/25 pointer-events-none cw-wireframe z-0"></div>',
            '        <div class="relative z-10 bg-[#FAF9F6] p-3 md:p-4 shadow-lg">',
            '          <div class="relative overflow-hidden ' + imageAspect.cls + ' w-full bg-[#E5DFD0]"' + (imageAspect.style ? ' style="' + imageAspect.style + '"' : "") + ' data-research-slideshow>',
            pictureSlides(cfg, pictures),
            '            <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary pointer-events-none" data-research-credit' + (firstCredit ? "" : " hidden") + ">" + esc(firstCredit) + "</span>",
            "          </div>",
            '          <div class="pt-3 px-1 flex items-center justify-between gap-space-sm">',
            '            <span class="font-label-sm text-label-sm text-secondary" data-research-caption' + (firstCaption ? "" : " hidden") + ">" + esc(firstCaption) + "</span>",
            dotsHtml,
            "          </div>",
            "        </div>",
            "      </div>",
            "    </div>"
          ].join("\n")
        : "",
      '    <div class="' + textColClass + '">',
      '      <div class="' + headClass + '">',
      '        <div class="pt-4 flex flex-col">',
      '          <span class="font-label-md text-label-md uppercase tracking-[0.25em] text-secondary mb-2">' + esc(words.subheading || "") + "</span>",
      '          <h2 class="font-headline-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] uppercase tracking-wide text-primary">' + esc(words.heading || "") + "</h2>",
      "        </div>",
      "      </div>",
      cfg.research_areas_section_introduction
        ? '      <p class="' + introClass + '">' + esc(cfg.research_areas_section_introduction) + "</p>"
        : "",
      button.href
        ? [
            '      <div class="' + buttonClass + '">',
            '        <a class="inline-flex items-center justify-center gap-2 w-[280px] max-w-full bg-[#1B1C19] text-[#FAF9F5] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:bg-[#33312B] transition-colors duration-200" href="' + esc(button.href) + '">' + esc(button.label) + '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span></a>',
            "      </div>"
          ].join("\n")
        : "",
      "    </div>",
      "  </div>",
      shown.length
        ? [
            '  <div class="flex flex-wrap gap-8 pt-8 border-t border-[#1B1C19]/15">',
            shown.map(function (area, i) { return cardHtml(area, i, cardLabel, rowCls); }).join("\n"),
            "  </div>"
          ].join("\n")
        : "",
      "</div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* A list record may be a stub (just an individual_research_area_file_id) —
     the card's words are then borrowed from the area's deep file
     (data/research/<individual_research_area_file_id>.json), so stub
     cards render too. The list record itself always wins where both
     define a word — the homepage is its surface. A quiet 404 just means
     "nothing to borrow". A plain card with no id is never fetched. */
  function borrowDeep(areas) {
    var card = window.CWL.researchCard;
    var stubs = areas.filter(function (a) {
      return a && card.id(a) && !String(card.title(a) || "").trim();
    });
    if (!stubs.length) return Promise.resolve(areas);
    return Promise.all(stubs.map(function (a) {
      return fetch(DATA_DIR + encodeURIComponent(card.id(a)) + ".json", { cache: "no-store" })
        .then(function (res) { return res.ok ? res.text().then(window.CWL.parseJson) : null; })
        .catch(function () { return null; });
    })).then(function (deeps) {
      stubs.forEach(function (a, i) {
        var d = deeps[i];
        if (!d) return;
        /* The cards borrow only the hero words — the deep file's
           body (the paragraph / image / gallery / embed media / focus
           elements) belongs to the area page itself. A word the card
           already owns (under any of its older names) is left alone. */
        if (!String(card.keyword(a) || "").trim() && d.keywords_for_the_page_and_card != null) {
          a["individual_research_area_card_keyword"] = d.keywords_for_the_page_and_card;
        }
        if (!String(card.introduction(a) || "").trim() && d.intro != null) {
          a["individual_research_area_card_introduction"] = d.intro;
        }
        if (!String(card.title(a) || "").trim() && d.title != null) {
          a["individual_research_area_card_title"] = d.title;
        }
      });
      return areas;
    });
  }

  /* Transitional: the section's short keys fill their older prefixed
     names, so one renderer serves both shapes while files migrate. */
  function liftSection(cfg) {
    if (!cfg || typeof cfg !== "object") return cfg;
    var map = {
      subheading: "research_areas_section_subheading",
      heading: "research_areas_section_heading",
      intro: "research_areas_section_introduction",
      images: "research_areas_section_image_or_images",
      rotation_time_milliseconds: "research_areas_section_image_time_interval",
      aspect_ratio: "research_areas_section_image_aspect_ratio",
      zoom_on: "research_areas_section_image_magnification",
      caption_when_single: "research_areas_section_image_caption_valid_with_single_image_option",
      max_items: "visible_card_count"
    };
    Object.keys(map).forEach(function (short) {
      if (cfg[short] != null && cfg[map[short]] == null) cfg[map[short]] = cfg[short];
    });
    if (cfg.button && typeof cfg.button === "object") {
      if (cfg.button.label != null && cfg.research_areas_section_button_label == null) {
        cfg.research_areas_section_button_label = cfg.button.label;
      }
      if (cfg.research_areas_section_button == null) cfg.research_areas_section_button = cfg.button;
    }
    if (cfg.card_button && typeof cfg.card_button === "object") {
      if (cfg.card_button.label != null && cfg.research_areas_section_card_button_label == null) {
        cfg.research_areas_section_card_button_label = cfg.card_button.label;
      }
      if (cfg.research_areas_section_card_button == null) cfg.research_areas_section_card_button = cfg.card_button;
    }
    return cfg;
  }

  function boot() {
    var section = document.getElementById("research-areas");
    if (!section) return;

    Promise.all([loadJson(SITE_URL), loadJson(DATA_URL), window.CWL.loadLinks()]).then(function (loaded) {
      var site = loaded[0];
      var data = loaded[1];
      var entry = window.CWL.sectionConfig(site, "research");
      var cfg = liftSection((data && (data.research_section || data.home_page_research_areas_section)) || null);

      /* site.json only switches the band on/off; all of the
         content lives in research.json's section config. */
      if (!entry || entry.is_enabled === false || !cfg) {
        section.style.display = "none";
        window.CWL.retargetNav("#research-areas", cfg ? sectionButton(cfg).href : "");
        return;
      }
      var areas = data && Array.isArray(data.individual_research_area_cards)
        ? data.individual_research_area_cards
        : [];
      borrowDeep(areas).then(function (rich) {
        section.innerHTML = render(cfg, rich);
        startSlideshow(section, cfg);
      });
    });
  }

  boot();
})();
