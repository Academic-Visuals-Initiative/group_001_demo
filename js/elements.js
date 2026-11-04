/* ------------------------------------------------------------------
   elements.js — the shared content-element engine: the blocks deep
   content files are built from. A research area and a news story are
   both written from it, and BOTH are drawn by the one shell below
   (contentPage), so the same words and pictures come out the same on
   either page — only the content differs.

   A deep file = reserved hero words + elements, in file order:

     1. one item        "gallery": { … }
     2. a group         "gallery": [ {…}, {…} ]   (same key, an array)
     3. full control    "add_content_to_page": [ { "add_paragraph": … }, { "image": … } ]

   File order = page order, always. Every field is optional; an
   unknown key or an unrenderable piece skips quietly.

   Every picture opens whole: each content photo carries the shared
   lightbox (js/helpers.js), so clicking it — or pressing Enter on it —
   shows it in the overlay, with its own caption under it. A gallery or a
   slideshow walks as one set, opening on the picture that was clicked.

   Element types (TYPES, at the bottom):
     add_paragraph — rich text (**bold**, ***bold italic***, *italic*,
                 `code`, ==highlight==, ++underline++, ~~del~~, ^sup^,
                 ~sub~, {text|url} links; \* escapes a mark; a blank line
                 starts a new paragraph)
     add_list  — a bullet or numbered list, with nested (indented) lists
     add_image — one photo in a framed plate (a list plays as an
                 auto-crossfading slideshow with dots)
     add_gallery — several photos: "grid" (even rows) or "masonry"
                 (packed, no gaps); every option optional
     add_embed_media — an outside video/page by URL (YouTube and Vimeo
                 links become privacy-friendly embeds; Google Docs /
                 Slides / Sheets / Drive / Forms share links are
                 turned into their embeddable form); optional
                 `align` + side text places it
                 beside a paragraph. The older `embed` name still reads.
     add_embed_media_row — an explicit titled row of embed media
                 (1–4 columns). The older `add_embed_row` still reads.
     add_heading — a section title: level 1 (largest), 2, or 3
     add_button — a call to action: "fill" (solid) or "outline"
     add_divider — a horizontal rule (solid, dashed, dotted, or bold)
     add_quote — a pull-quote with an optional author/position
     table     — a small data table (optional head row)
     equation  — a LaTeX formula, drawn with KaTeX (loaded on demand)
     add_contact_information — a "Contact" block (name + email under a hairline)
     add_focus_list — the numbered "Key Focus Areas" list
     add_a_timeline — a dated path (year → title → note)
     add_tags  — a row of small chips (topics, skills, requirements)
     add_full_width_links — hairline rows of links (related papers, a dataset, a DOI)
     add_content_to_page — the ordered list of any mix of the above

   contentPage(data, opts) draws a whole deep page: the shared hero
   band (label / heading / kicker / text / meta — js/helpers.js) and
   then the flow. renderFlow(source, opts) draws only the elements.
   Options:
     hero       — the hero words (contentPage only)
     reserved   — hero word keys the flow must skip
     root       — path prefix for images ("../" on subpages)
     focusLabel — the focus list's default heading
     bandClass  — override for the band wrapper (other templates)
 ------------------------------------------------------------------ */
(function () {
  "use strict";

  var esc = window.CWL.esc;

  /* Named links: "@team" / "@area:soil-microbiome" resolve through the
     registry (js/helpers.js → CWL.link); anything else is left as-is. */
  function href(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return "";
    var named = s.charAt(0) === "@" || s.indexOf("section@") === 0 || s.indexOf("json@") === 0;
    return (named && window.CWL && window.CWL.link) ? window.CWL.link(s) : s;
  }

  /* formatText — the friendly markup every content page shares.
     The text is escaped first, then the markup is honoured. */
  function formatText(str) {
    if (!str) return "";
    var ph = {}, c = 0, key;
    str = str.replace(/\\(.)/g, function (m, ch) {
      key = "\u0001" + (c++) + "\u0001";
      ph[key] = ch;
      return key;
    });
    str = str.replace(/`([^`]+)`/g, "<code>$1</code>");
    str = str.replace(/\+\+([^+]+)\+\+/g, "<u>$1</u>");
    str = str.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    str = str.replace(/==([^=]+)==/g, '<mark class="hl">$1</mark>');
    str = str.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    str = str.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    str = str.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    str = str.replace(/\^([^^]+)\^/g, "<sup>$1</sup>");
    str = str.replace(/~([^~]+)~/g, "<sub>$1</sub>");
    str = str.replace(/\{([^}]+)\|([^}]+)\}/g, function (m, label, url) {
      var to = href(url);
      var external = /^https?:\/\//i.test(to);
      /* Inline links carry the face's own underline (see
         .cw-inline-link in css/style.css); a link that leaves the site
         also gets the site's own arrow_outward icon, sized to the
         text — the same mark the buttons use. */
      return '<a class="cw-inline-link" href="' + to + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
        "><strong>" + label + "</strong>" +
        (external ? '<span class="cw-icon cw-icon--arrow-outward cw-inline-link__icon" aria-hidden="true"></span>' : "") +
        "</a>";
    });
    str = str.replace(/\n/g, "<br>");
    for (var k in ph) { str = str.split(k).join(ph[k]); }
    return str;
  }

  /* --- small shared pieces ----------------------------------------- */

  function toArray(v) { return Array.isArray(v) ? v : [v]; }

  /* "First line.\n\nSecond line." -> two paragraphs */
  function splitParagraphs(text) {
    return String(text || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  /* Image paths: a full web address or a site-root path ("/…") is
     used as written; a path like "assets/images/other/1.webp" gets
     the page's root prefix; a bare filename ("ph-01.jpg") is found
     in `opts.imageBase` when a page supplies one, otherwise in the
     root's assets/img/. */
  function srcUrl(src, opts) {
    var s = String(src || "").trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.indexOf("data:") === 0 || s.charAt(0) === "/") return s;
    var root = (opts && opts.root) || "";
    if (s.indexOf("../") === 0) return s;
    if (/\//.test(s)) return root + s;
    var base = (opts && opts.imageBase) || root + "assets/img/";
    return base + s;
  }

  /* The attributes that let a picture be clicked open. Pictures carry
     them (not the plate around them), so the picture itself is what the
     pointer aims at; js/helpers.js listens for [data-lightbox] anywhere
     on the page and builds the overlay, so nothing here wires anything.

     `set` is every picture the click can reach — a gallery travels as
     one set, a lone photo as itself — with their captions in the same
     order and `at` marking the one that was clicked, so the overlay
     opens on it (data-lightbox-start). One photo in the set = no arrows.
     Enter and Space open a focused picture too (helpers.js). */
  /* A picture with zoom turned off is not clickable, so it must not
     wear the magnifier cursor either. */
  function zoomCls(p) {
    return p && p.zoom === false ? "" : " cursor-zoom-in";
  }

  function lightboxAttrs(p, set, at, opts) {
    /* A picture written "zoom": false is simply a picture: it is left out
       of the lightbox, and out of the set the others travel in. */
    var source = (set && set.length ? set : [p]);
    var list = source.filter(function (x) { return x && x.zoom !== false; });
    if (!list.length) return "";
    var urls = list.map(function (x) { return srcUrl(x.src, opts); });
    var captions = list.map(function (x) { return String(x.caption == null ? "" : x.caption); });
    var attrs = ' data-lightbox="' + esc(urls.join("|")) + '"';
    if (captions.some(Boolean)) attrs += ' data-lightbox-caption="' + esc(captions.join("|")) + '"';
    if (urls.length > 1) {
      var start = list.indexOf(p);
      attrs += ' data-lightbox-start="' + (start > -1 ? start : (at || 0)) + '"';
    }
    return attrs + ' role="button" tabindex="0" aria-label="View the picture"';
  }

  /* Container widths a band can use. Kept as literal class strings so
     the Tailwind scanner can see every one of them. */
  var BAND_WIDTHS = {
    "720": "max-w-[720px]",
    "900": "max-w-[900px]",
    "1260": "max-w-[1260px]"
  };

  /* One band of the page: narrow content sits in a centred reading
     measure; wide (galleries) span the full container edge-to-edge.
     Pass a 4th argument ("720" | "900" | "1260") to force a width. */
  function band(inner, opts, wide, width) {
    var sectionClass = (opts && opts.bandClass) || "w-full px-margin md:px-margin-tablet lg:px-margin-desktop pt-space-xl";
    if (wide) {
      var space = /(?:^|\s)(pt-(?:space-\w+|0))(?:\s|$)/.exec(sectionClass);
      sectionClass = "w-full " + (space ? space[1] : "pt-space-xl");
    }
    var widthClass = BAND_WIDTHS[String(width || "")] || (wide ? BAND_WIDTHS["1260"] : BAND_WIDTHS["900"]);
    return [
      '<section class="' + sectionClass + '">',
      '  <div class="' + widthClass + ' mx-auto">',
      inner,
      "  </div>",
      "</section>"
    ].join("\n");
  }

  /* The small uppercase heading above an element (its optional
     "label", or a default like "Key Focus Areas"). */
  function labelHtml(label, defaultLabel) {
    var t = String(label || defaultLabel || "").trim();
    if (!t) return "";
    return '<span class="block font-label-md text-label-md uppercase tracking-[0.25em] text-secondary mb-space-md">' + esc(t) + "</span>";
  }

  /* The caption strip under a photo: caption left, credit right. */
  function captionRow(caption, credit) {
    if (!caption && !credit) return "";
    return [
      '      <div class="pt-3 px-1 flex items-baseline justify-between gap-space-md">',
      caption ? '        <span class="font-body-sm text-body-sm text-on-surface-variant min-w-0">' + esc(caption) + "</span>" : "        <span></span>",
      credit ? '        <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant shrink-0">' + esc(credit) + "</span>" : "",
      "      </div>"
    ].filter(Boolean).join("\n");
  }

  /* The credit printed as a small tag in the photo's top-right
     corner, so it stays readable on any picture. */
  function creditTag(credit) {
    if (!credit) return "";
    return '          <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary">' + esc(credit) + "</span>";
  }

  /* The T02 photo plate: white plate with full border (column-safe). */
  var PLATE_EDGE_BL = "";
  var PLATE_EDGE_TR = "";
  var PLATE_BODY = '<div class="relative bg-surface-lowest p-3 md:p-4 border border-outline-variant shadow-[0_2px_16px_rgba(0,0,0,0.06)]">';

  /* One photo record from a string ("photo.jpg") or an object. The newer
     image words are primary; the older `src` / `alt` / `caption` / `credit` /
     `align` / `text` / `zoom` names still read as fallbacks. Entries with no
     picture path skip. */
  function normalizeImages(list) {
    return toArray(list).map(function (e) {
      if (typeof e === "string") return e ? { src: e } : null;
      if (!e) return null;
      var src = e.image_path != null ? e.image_path : e.src;
      return src ? {
        src: src,
        alt: e.image_alt != null ? e.image_alt : e.alt,
        caption: e.image_caption != null ? e.image_caption : e.caption,
        credit: e.image_credit != null ? e.image_credit : e.credit,
        align: e.align,
        text: e.content_to_show_on_side_of_the_image_when_aligned != null ? e.content_to_show_on_side_of_the_image_when_aligned : e.text,
        zoom: e.zoom_on != null ? e.zoom_on
      : (e.show_zoom != null ? e.show_zoom : (e.zoom != null ? e.zoom : e.lightbox))
      } : null;
    }).filter(Boolean);
  }

  /* --- paragraph ---------------------------------------------------- */
  /* string | { heading?, text,
                layout? } | array of either
     (the older `label` / `text` / `layout` names still read as fallbacks)
     layout: "single" (default) | "two-col" (CSS columns,
     text flows) */
  function paragraphHtml(value, opts) {
    var out = [];
    toArray(value).map(function (p) {
      return typeof p === "string"
        ? { text: p }
        : (p && p.text != null ? p : null);
    }).filter(Boolean).forEach(function (item) {
      var text = item.text;
      var layout = item.layout;
      var lbl = labelHtml(item.heading != null ? item.heading : item.label, "");
      if (lbl) out.push(lbl);
      var paras = splitParagraphs(text).map(function (t) {
        return '<p class="font-body-lg text-body-lg text-on-surface-variant leading-[1.75] text-justify mb-space-md">' + formatText(esc(t)) + "</p>";
      }).join("\n");
      if (layout === "two-col") {
        out.push('<div class="columns-1 md:columns-2 gap-space-xl">' + paras + "</div>");
      } else {
        out.push(paras);
      }
    });
    return out.length ? band(out.join("\n"), opts) : "";
  }

  /* --- image -------------------------------------------------------- */
  /* one photo = a still plate; several = an auto slideshow.
     Options (on the first photo object or the image object itself):
       align: "center" (default) | "left" | "right"
         - "center": plate centered, max-w-[720px], paragraph below
         - "left": plate left, text flows right; from tablet up the plate is
           max-w-[45%] — below that it is full width and stands above the text
         - "right": plate right, text flows left; below tablet the plate is
           full width and stands above the text (the same mobile stack)
       content_to_show_on_side_of_the_image_when_aligned: optional paragraph
         text to render beside the plate (when the alignment is "left" or
         "right"). The plate and text share a flex row; below tablet they
         stack with the plate first. */
  function imageHtml(value, opts) {
    var pics = normalizeImages(value);
    if (!pics.length) return "";
    var first = pics[0];
    var isArrayInput = Array.isArray(value);
    var parentAlign = (isArrayInput && value.align) || "";
    var parentText = isArrayInput && (value.content_to_show_on_side_of_the_image_when_aligned != null ? value.content_to_show_on_side_of_the_image_when_aligned : value.text) || "";
    var align = (first.align || parentAlign || "center").toLowerCase();
    var sideText = first.text || parentText || "";
    var isSideBySide = (align === "left" || align === "right") && sideText;

    if (pics.length === 1) {
      var p = pics[0];
      var plateHtml = [
        '    <div class="relative">',
        '      <img class="w-full h-auto' + zoomCls(p) + '" loading="lazy" alt="' + esc(p.alt || "") + '" src="' + esc(srcUrl(p.src, opts)) + '"' + lightboxAttrs(p, null, 0, opts) + " />",
        creditTag(p.credit),
        "    </div>",
        captionRow(p.caption)
      ].join("\n");

      if (isSideBySide) {
        var textHtml = '<div class="flex-1 min-w-0"><p class="font-body-lg text-body-lg text-on-surface-variant leading-[1.75] text-justify break-words">' + formatText(esc(sideText)) + "</p></div>";
        var plateSide = align === "left" ? "mr-auto" : "ml-auto";
        var plateDiv = [
          '    <div class="relative w-full max-w-full md:max-w-[45%] order-first md:order-none ' + plateSide + '">',
          "      " + PLATE_EDGE_BL,
          "      " + PLATE_BODY,
          plateHtml,
          "      </div>",
          "    </div>"
        ].join("\n");
        return align === "left"
          ? band(['  <div class="flex flex-col md:flex-row gap-space-xl items-start">', plateDiv, textHtml, "  </div>"].join("\n"), opts)
          : band(['  <div class="flex flex-col md:flex-row gap-space-xl items-start">', textHtml, plateDiv, "  </div>"].join("\n"), opts);
      }
      return band([
        '  <div class="relative max-w-[720px] mx-auto">',
        "    " + PLATE_EDGE_BL,
        "    " + PLATE_BODY,
        plateHtml,
        "    </div>",
        "  </div>"
      ].join("\n"), opts);
    }
    return band(renderSlideshow(pics, opts, align, sideText), opts);
  }

  /* --- slideshow ----------------------------------------------------- */
  /* A dedicated slideshow element. Value may be:
       [ "a.jpg", { image_path: … } ]   a bare list of photos
       { "images": [ … ] }            one slideshow + options
     Options (on the object, or on the first photo of a bare list):
       heading: optional small heading above it
       align: "center" (default) | "left" | "right"
       content_to_show_on_side_of_the_slideshow_when_aligned: optional
         paragraph text to render beside the slideshow
     The older `label` / `images` / `align` / `text` / `interval` names
     still read as fallbacks. */
  function slideshowHtml(value, opts) {
    var raw = value;
    var obj = null;
    if (value && !Array.isArray(value)) {
      var imgs = value.images;
      if (imgs) {
        obj = value;
        raw = imgs;
      }
    }
    var pics = normalizeImages(raw);
    if (!pics.length) return "";
    var first = pics[0];
    var objAlign = (obj && obj.align) || "";
    var objText = obj && (obj.content_to_show_on_side_of_the_slideshow_when_aligned != null ? obj.content_to_show_on_side_of_the_slideshow_when_aligned : obj.text) || "";
    var objInterval = obj && (obj.rotation_time_milliseconds != null ? obj.rotation_time_milliseconds
    : (obj.interval_seconds != null ? obj.interval_seconds : obj.interval)) || 0;
    var align = (first.align || objAlign || "center").toLowerCase();
    var sideText = first.text || objText || "";
    var interval = first.interval || objInterval || 0;
    var title = obj && (obj.heading != null ? obj.heading : obj.label);
    return renderSlideshow(pics, opts, align, sideText, interval, title);
  }

  /* Several photos crossfade every 5 seconds; dots jump between
     them; it pauses on hover/focus and never autoplays for
     reduced-motion readers (mountSlideshows runs them).
     Options:
       heading: optional heading above it
       align: "center" | "left" | "right"
       content_to_show_on_side_of_the_slideshow_when_aligned: optional
         paragraph text to render beside the slideshow */
  function renderSlideshow(pics, opts, align, sideText, interval, title) {
    var hasCredit = pics.some(function (p) { return p.credit; });
    align = (align || "center").toLowerCase();
    sideText = sideText || "";
    var isSideBySide = (align === "left" || align === "right") && sideText;
    var titleHtml = labelHtml(title, "");

    var plateSide = align === "left" ? "mr-auto" : "ml-auto";
    var order = align === "right" ? " flex-row-reverse" : "";
    var textHtml = sideText ? '<div class="flex-1 min-w-0"><p class="font-body-lg text-body-lg text-on-surface-variant leading-[1.75] text-justify break-words">' + formatText(esc(sideText)) + "</p></div>" : "";

    if (isSideBySide) {
      var plateInner = [
        "    " + PLATE_EDGE_BL,
        "    " + PLATE_BODY,
        '      <div class="relative overflow-hidden aspect-[4/3] bg-surface-container" data-slideshow>'
      ];
      pics.forEach(function (p, i) {
        plateInner.push('        <img class="cw-slide absolute inset-0 w-full h-full object-cover transition-opacity duration-700' + zoomCls(p) + '"' +
          " style=\"opacity:" + (i === 0 ? "1" : "0") + '"' +
          (i === 0 ? ' alt="' + esc(p.alt || "") + '"' : ' alt="" aria-hidden="true" loading="lazy"') +
          ' data-cap="' + esc(p.caption || "") + '" data-credit="' + esc(p.credit || "") + '"' +
          ' src="' + esc(srcUrl(p.src, opts)) + '"' + lightboxAttrs(p, pics, i, opts) + " />");
      });
      plateInner.push("      </div>");
      if (hasCredit) {
        plateInner.push('      <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary" data-slide-credit' + (pics[0].credit ? "" : " hidden") + '></span>');
      }
      plateInner.push('      <div class="pt-3 px-1 flex items-end justify-between gap-space-sm">');
      plateInner.push('        <span class="font-body-sm text-body-sm text-on-surface-variant min-w-0" data-slide-caption></span>');
      plateInner.push('        <div class="flex items-center gap-space-sm shrink-0">');
      plateInner.push('          <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant" data-slide-count></span>');
      plateInner.push('          <div class="flex gap-space-xs">');
      pics.forEach(function (p, i) {
        plateInner.push('            <button type="button" class="slide-dot w-2 h-2' + (i === 0 ? " is-active" : "") +
          '" data-slide-dot data-i="' + i + '" aria-label="Photo ' + (i + 1) + " of " + pics.length + '"' +
          (i === 0 ? ' aria-current="true"' : "") + "></button>");
      });
      plateInner.push("          </div>");
      plateInner.push("        </div>");
      plateInner.push("      </div>");
      plateInner.push("    </div>");

      var outerOpen = '  <div class="flex flex-col md:flex-row gap-space-xl items-start" data-slide-plate data-slide-interval="' + interval + '">';
      var plateWrap = '<div class="relative w-full max-w-full md:max-w-[45%] order-first md:order-none ' + plateSide + '">';
      var out = align === "left"
        ? [outerOpen, plateWrap].concat(plateInner, [textHtml, "  </div>"])
        : [outerOpen, textHtml, plateWrap].concat(plateInner, ["  </div>"]);
      return band((titleHtml ? titleHtml + "\n" : "") + out.join("\n"), opts);
    }

    var out = [
      '  <div class="relative max-w-[720px] mx-auto" data-slide-plate data-slide-interval="' + interval + '">',
      "    " + PLATE_EDGE_BL,
      "    " + PLATE_BODY,
      '      <div class="relative overflow-hidden aspect-[4/3] bg-surface-container" data-slideshow>'
    ];
    pics.forEach(function (p, i) {
      out.push('        <img class="cw-slide absolute inset-0 w-full h-full object-cover transition-opacity duration-700' + zoomCls(p) + '"' +
        " style=\"opacity:" + (i === 0 ? "1" : "0") + '"' +
        (i === 0 ? ' alt="' + esc(p.alt || "") + '"' : ' alt="" aria-hidden="true" loading="lazy"') +
        ' data-cap="' + esc(p.caption || "") + '" data-credit="' + esc(p.credit || "") + '"' +
        ' src="' + esc(srcUrl(p.src, opts)) + '"' + lightboxAttrs(p, pics, i, opts) + " />");
    });
    out.push("      </div>");
    if (hasCredit) {
      out.push('      <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary" data-slide-credit' + (pics[0].credit ? "" : " hidden") + '></span>');
    }
    out.push('      <div class="pt-3 px-1 flex items-end justify-between gap-space-sm">');
    out.push('        <span class="font-body-sm text-body-sm text-on-surface-variant min-w-0" data-slide-caption></span>');
    out.push('        <div class="flex items-center gap-space-sm shrink-0">');
    out.push('          <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant" data-slide-count></span>');
      out.push('          <div class="flex gap-space-xs">');
      pics.forEach(function (p, i) {
        out.push('            <button type="button" class="slide-dot w-2 h-2' + (i === 0 ? " is-active" : "") +
          '" data-slide-dot data-i="' + i + '" aria-label="Photo ' + (i + 1) + " of " + pics.length + '"' +
          (i === 0 ? ' aria-current="true"' : "") + "></button>");
      });
      out.push("          </div>");
      out.push("        </div>");
      out.push("      </div>");
      out.push("    </div>");
      out.push("  </div>");
    return band((titleHtml ? titleHtml + "\n" : "") + out.join("\n"), opts);
  }

  /* --- gallery ------------------------------------------------------ */
  /* Ratios and column counts as full class names only — the Tailwind
     scanner reads them from this file. */
  var RATIO = {
    "16x9": "aspect-[16/9]", "16/9": "aspect-[16/9]", "16:9": "aspect-[16/9]",
    "9x16": "aspect-[9/16]", "9/16": "aspect-[9/16]", "9:16": "aspect-[9/16]",
    "3x2": "aspect-[3/2]", "3/2": "aspect-[3/2]", "3:2": "aspect-[3/2]",
    "4x3": "aspect-[4/3]", "4/3": "aspect-[4/3]", "4:3": "aspect-[4/3]",
    "1x1": "aspect-square", "1/1": "aspect-square", "1:1": "aspect-square",
    "4x5": "aspect-[4/5]", "4/5": "aspect-[4/5]", "4:5": "aspect-[4/5]",
    "3x4": "aspect-[3/4]", "3/4": "aspect-[3/4]", "3:4": "aspect-[3/4]"
  };
  var GRID_COLS = { 1: "grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" };
  var MASONRY_COLS = { 1: "columns-1", 2: "columns-1 sm:columns-2", 3: "columns-1 sm:columns-2 lg:columns-3", 4: "columns-1 sm:columns-2 lg:columns-4" };

  /* A gallery may be written as:
       { "images": [...] }   one gallery (+ its options)
       [ {…}, {…} ]                         several galleries in a row (a group)
       [ "a.jpg", { image_path: … } ]  a bare list = one gallery
     The older `images` / `label` / `layout` / `ratio` / `columns` / `cols`
     names still read as fallbacks. */
  function galleryImages(g) {
    return g.images;
  }

  function galleryColumns(g) {
    return g.columns != null ? g.columns : g.cols;
  }

  function normalizeGalleries(value) {
    var arr = toArray(value);
    if (!arr.length) return [];
    if (arr.every(function (e) {
      return typeof e === "string" || (e && (e.image_path != null || e.src));
    })) {
      return [{ images: arr }];
    }
    return arr.filter(function (g) {
      return g && galleryImages(g) != null;
    }).map(function (g) {
      return {
        images: galleryImages(g),
        label: g.heading != null ? g.heading : g.label,
        layout: g.layout,
        ratio: g.size != null ? g.size : g.ratio,
        columns: galleryColumns(g)
      };
    });
  }

  function galleryHtml(value, opts) {
    /* A gallery may be a group — several galleries in one array. Each
       member is its own block (its label + its grid); the blocks are
       joined with the page's own vertical rhythm (3rem) so a group
       never runs its galleries together. */
    var blocks = [];
    normalizeGalleries(value).forEach(function (g) {
      var pics = normalizeImages(g.images);
      if (!pics.length) return;
      var lbl = labelHtml(g.label, "");
      var grid = g.layout === "masonry" ? masonryHtml(pics, g, opts) : gridHtml(pics, g, opts);
      blocks.push([lbl, grid].filter(Boolean).join("\n"));
    });
    if (!blocks.length) return "";
    var inner = blocks
      .map(function (block, i) {
        return i === 0 ? block : '      <div class="h-12"></div>\n' + block;
      })
      .join("\n");
    return band(inner, opts);
  }

  function gridHtml(pics, g, opts) {
    var n = pics.length;
    var cols = GRID_COLS[g.columns != null ? g.columns : g.cols] || GRID_COLS[n >= 3 ? 3 : n] || GRID_COLS[3];
    var ratioKey = String(g.ratio || "").trim().toLowerCase();
    var ratio = ratioKey === "natural" ? "" : (RATIO[ratioKey] || RATIO["4x5"]);
    var gridAlign = ratio ? "" : " items-start";
    var out = ['    <div class="grid grid-cols-1 ' + cols + ' gap-gutter' + gridAlign + '">'];
    pics.forEach(function (p, i) {
      out.push('      <div class="relative">');
      if (ratio) {
        out.push('        <div class="relative overflow-hidden ' + ratio + ' bg-surface-lowest p-3 md:p-4 border border-outline-variant shadow-[0_2px_16px_rgba(0,0,0,0.06)]">');
        out.push('          <img class="w-full h-full object-cover' + zoomCls(p) + '" loading="lazy" alt="' + esc(p.alt || "") + '" src="' + esc(srcUrl(p.src, opts)) + '"' + lightboxAttrs(p, pics, i, opts) + " />");
        out.push(creditTag(p.credit));
        out.push("        </div>");
      } else {
        out.push('        <div class="relative bg-surface-lowest p-3 md:p-4 border border-outline-variant shadow-[0_2px_16px_rgba(0,0,0,0.06)]">');
        out.push('          <img class="w-full h-auto' + zoomCls(p) + '" loading="lazy" alt="' + esc(p.alt || "") + '" src="' + esc(srcUrl(p.src, opts)) + '"' + lightboxAttrs(p, pics, i, opts) + " />");
        out.push(creditTag(p.credit));
        out.push("        </div>");
      }
      out.push(captionRow(p.caption));
      out.push("      </div>");
    });
    out.push("    </div>");
    return out.join("\n");
  }

  function masonryHtml(pics, g, opts) {
    var cols = MASONRY_COLS[g.columns != null ? g.columns : g.cols] || MASONRY_COLS[pics.length >= 3 ? 3 : pics.length] || MASONRY_COLS[3];
    var out = ['    <div class="' + cols + ' gap-gutter">'];
    pics.forEach(function (p, i) {
      out.push('      <div class="relative mb-gutter break-inside-avoid">');
      out.push("        " + PLATE_EDGE_TR);
      out.push("        " + PLATE_BODY);
      out.push('          <div class="relative">');
      out.push('            <img class="w-full h-auto' + zoomCls(p) + '" loading="lazy" alt="' + esc(p.alt || "") + '" src="' + esc(srcUrl(p.src, opts)) + '"' + lightboxAttrs(p, pics, i, opts) + " />");
      out.push(creditTag(p.credit));
      out.push("          </div>");
      out.push(captionRow(p.caption));
      out.push("        </div>");
      out.push("      </div>");
    });
    out.push("    </div>");
    return out.join("\n");
  }

  /* --- embed -------------------------------------------------------- */
  /* A link to a video file (…mp4, …webm, …mov, …) plays in a native
     player — our own clips work with no third party involved. A
     YouTube or Vimeo link becomes a privacy-friendly iframe; a Google
     Docs / Slides / Sheets / Drive / Forms share link is turned into
     its embeddable form; any other https address is embedded
     directly; anything else skips. */
  function isVideoFile(url) {
    return /\.(mp4|webm|ogv|ogg|mov|m4v)([?#].*)?$/i.test(String(url || "").trim());
  }

  /* Google only allows its files to be framed through a special
     address, so an ordinary "…/edit" or "…/view" link shows nothing.
     Turn any Docs / Slides / Sheets / Drive / Forms link into that
     address; a link that is already embeddable, or one that isn't
     Google's, is left exactly as written (and "" means "not mine"). */
  function googleEmbed(s) {
    /* Already embeddable (published to the web, preview, embed, or
       the Forms "embedded" flag) — leave it alone. */
    if (/\/(?:pubembed|pubhtml|preview|embed)(?:[?#]|$)/.test(s) ||
        /[?&]embedded=true(?:&|$)/.test(s)) return s;

    var m;
    /* An ordinary share address: docs.google.com/<kind>/d/<ID>/… */
    m = /^https:\/\/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]+)/.exec(s);
    if (m) {
      return m[1] === "presentation"
        ? "https://docs.google.com/presentation/d/" + m[2] + "/embed?start=false&loop=false&delayms=3000"
        : "https://docs.google.com/" + m[1] + "/d/" + m[2] + "/preview";
    }
    /* A form: …/forms/d/e/<ID>/viewform → add embedded=true */
    m = /^https:\/\/docs\.google\.com\/forms\/d\/(?:e\/)?([A-Za-z0-9_-]+)/.exec(s);
    if (m) return "https://docs.google.com/forms/d/e/" + m[1] + "/viewform?embedded=true";
    /* A Drive file: drive.google.com/file/d/<ID>/view → …/preview */
    m = /^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(s);
    if (m) return "https://drive.google.com/file/d/" + m[1] + "/preview";
    return "";
  }

  function embedUrl(url) {
    var s = String(url || "").trim();
    if (!/^https:\/\//.test(s)) return "";
    var m = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|youtube-nocookie\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/.exec(s);
    if (m) return "https://www.youtube-nocookie.com/embed/" + m[1];
    m = /vimeo\.com\/(\d+)/.exec(s);
    if (m) return "https://player.vimeo.com/video/" + m[1];
    var g = googleEmbed(s);
    return g || s;
  }

  /* The first key present wins; every older embed name is a fallback. */
  function firstValue(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] != null) return obj[keys[i]];
    }
    return undefined;
  }

  /* A positive number means pixels; a CSS length ("60vh", "24rem")
     is kept as written. Anything else falls back to the 16:9 plate. */
  function mediaHeight(value) {
    if (value == null || value === "") return "";
    var text = String(value).trim();
    if (/^\d+(\.\d+)?$/.test(text)) {
      return parseFloat(text) > 0 ? text + "px" : "";
    }
    if (/^\d+(\.\d+)?(px|vh|vw|rem|em|%)$/i.test(text)) {
      return parseFloat(text) > 0 ? text : "";
    }
    return "";
  }

  /* string |
     { heading?, link, caption?,
       credit?, height?,
       align?,
       content_to_show_on_side_of_the_embed_when_aligned? }
     | row item |
     array of either. The older `label` / `url` / `caption` / `credit`
     and `align` / `text` names still read. */
  function embedItems(value) {
    return toArray(value).map(function (e) {
      if (typeof e === "string") return e ? { url: e } : null;
      if (!e || typeof e !== "object") return null;
      var link = firstValue(e, [
        "link",
        "url"
      ]);
      if (!link) return null;
      var item = {};
      Object.keys(e).forEach(function (key) { item[key] = e[key]; });
      item.url = link;
      item.label = firstValue(e, [
        "heading",
        "label"
      ]);
      item.caption = e.caption;
      item.credit = e.credit;
      item.height = firstValue(e, [
        "single_embed_media_item_height",
        "height"
      ]);
      item.align = e.align;
      item.sideText = e.content_to_show_on_side_of_the_embed_when_aligned != null
        ? e.content_to_show_on_side_of_the_embed_when_aligned
        : e.text;
      return item;
    }).filter(Boolean);
  }

  function embedPlateHtml(item, opts, inRow) {
    var video = isVideoFile(item.url);
    var src = video ? srcUrl(item.url, opts) : embedUrl(item.url);
    if (!src) return "";
    var height = mediaHeight(item.height);
    var media = video
      ? '<video class="w-full h-full object-contain bg-black" controls playsinline preload="metadata" src="' + esc(src) + '"></video>'
      : '<iframe class="w-full h-full" src="' + esc(src) + '" title="' + esc(item.caption || "Embedded content") + '" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    return [
      '    <div class="' + (inRow ? "w-full " : "max-w-[900px] ") + 'bg-surface-lowest p-3 md:p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">',
      '      <div class="' + (height ? "" : "aspect-video ") + 'bg-surface-container"' +
        (height ? ' style="height:' + esc(height) + '"' : "") + ">",
      "        " + media,
      "      </div>",
      captionRow(item.caption, item.credit),
      "    </div>"
    ].join("\n");
  }

  /* One embed with words on the other side. `align`
     is "left" (plate left, text right) or "right" (plate right, text
     left); the plate takes about 45% of the reading column and the text
     keeps the rest. Below tablet the plate goes full width and stacks
     first, exactly like an aligned image or 3D model. */
  function embedBesideTextHtml(item, align, sideText, opts, title) {
    var plate = embedPlateHtml(item, opts, true);
    if (!plate) return "";
    var lbl = labelHtml(title, "");
    var textHtml = '<div class="flex-1 min-w-0"><p class="font-body-lg text-body-lg text-on-surface-variant leading-[1.75] text-justify break-words">' + formatText(esc(sideText)) + "</p></div>";
    var plateWrap = [
      '    <div class="relative w-full max-w-full md:max-w-[45%] order-first md:order-none ' + (align === "left" ? "mr-auto" : "ml-auto") + '">',
      plate,
      "    </div>"
    ].join("\n");
    var out = [
      '  <div class="flex flex-col md:flex-row gap-space-xl items-start">',
      align === "left" ? plateWrap : textHtml,
      align === "left" ? textHtml : plateWrap,
      "  </div>"
    ].join("\n");
    return band((lbl ? lbl + "\n" : "") + out, opts);
  }

  function embedHtml(value, opts) {
    if (value && typeof value === "object" && !Array.isArray(value) &&
        (value.add_embedded_media_to_row ||
         value.add_embeds_to_row || value.embeds || value.items)) {
      return embedRowHtml(value, opts);
    }
    var items = embedItems(value);
    if (!items.length) return "";

    if (items.length === 1) {
      var item = items[0];
      var align = String(item.align || "center").toLowerCase();
      if ((align === "left" || align === "right") && item.sideText) {
        return embedBesideTextHtml(item, align, item.sideText, opts, item.label);
      }
      var lbl = labelHtml(item.label, "");
      var plate = embedPlateHtml(item, opts, false);
      if (!plate) return "";
      return band((lbl ? lbl + "\n" : "") + plate, opts);
    }

    var out = [];
    items.forEach(function (item) {
      var lbl = labelHtml(item.label, "");
      if (lbl) out.push(lbl);
      var plate = embedPlateHtml(item, opts, false);
      if (plate) out.push(plate);
    });
    return out.length ? band(out.join("\n"), opts) : "";
  }

  /* --- several embeds in one row --------------------------------------
     Written as the explicit `add_embed_media_row` element:

       { "add_embed_media_row": {
           "columns": 2,
           "add_embedded_media_to_row": [
             { "link": "https://youtu.be/…",
               "caption": "Left" },
             { "link": "https://vimeo.com/…",
               "caption": "Right" }
           ] } }

     The row sits in the same reading column as the other elements;
     phones stack the cards. Columns default to the number of embeds
     (two is two, three is three, four is 2×2, more than four is three
     across), and the key accepts 1–4. `height` on the row
     sets every card's media height; a card can override it.

     With a single embed, the same alignment words as a picture can place
     the plate left or right and put
     `content_to_show_on_side_of_the_embed_when_aligned` beside it. */
  var EMBED_ROW_COLS = {
    1: "",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4"
  };

  function embedRowHtml(value, opts) {
    var obj = (value && typeof value === "object" && !Array.isArray(value)) ? value : null;
    var raw = obj
      ? (obj.add_embedded_media_to_row ||
         obj.add_embeds_to_row || obj.embeds || obj.items ||
         ((obj.link != null || obj.url != null ||
           obj.link != null) ? [obj] : []))
      : value;
    var items = embedItems(raw);
    if (!items.length) return "";

    var rowHeight = obj
      ? firstValue(obj, ["height", "height"])
      : undefined;
    if (rowHeight != null) {
      items.forEach(function (item) {
        if (item.height == null) item.height = rowHeight;
      });
    }

    var title = obj
      ? firstValue(obj, [
          "heading",
          "label"
        ])
      : "";
    var rowAlign = obj
      ? obj.align
      : "";
    var rowText = obj
      ? (obj.content_to_show_on_side_of_the_embed_when_aligned != null
          ? obj.content_to_show_on_side_of_the_embed_when_aligned
          : obj.text)
      : "";

    if (items.length === 1) {
      var align = String(items[0].align || rowAlign || "").toLowerCase();
      var sideText = items[0].sideText || rowText || "";
      if ((align === "left" || align === "right") && sideText) {
        return embedBesideTextHtml(items[0], align, sideText, opts, title || items[0].label);
      }
    }

    var cards = [];
    var cardCount = 0;
    items.forEach(function (item) {
      var plate = embedPlateHtml(item, opts, true);
      if (!plate) return;
      cardCount++;
      cards.push('      <div class="min-w-0">');
      if (item.label) cards.push(labelHtml(item.label));
      cards.push(plate);
      cards.push("      </div>");
    });
    if (!cardCount) return "";

    var requested = parseInt(obj && obj.columns, 10);
    if (!requested) {
      requested = cardCount <= 3
        ? cardCount
        : (cardCount === 4 ? 2 : 3);
    }
    var cols = Math.max(1, Math.min(4, requested || 1));
    var out = [];
    if (title) out.push(labelHtml(title));
    out.push('    <div class="grid grid-cols-1 ' + (EMBED_ROW_COLS[cols] || "") + ' gap-gutter items-stretch">');
    out = out.concat(cards);
    out.push("    </div>");
    return band(out.join("\n"), opts);
  }

  /* --- focus -------------------------------------------------------- */
  /* A focus list may be written as:
       [ "one", "two" ]        one list under the default title
       { heading, items_of_the_focus_list: [ … ] }
       [ { items_of_the_focus_list: […] }, … ]   several lists in a row
     The older `label` / `items` names still read, and the capital-I
     `Items_of_the_focus_list` is accepted too. */
  function focusHtml(value, opts) {
    function listItems(e) {
      if (e.Items_of_the_focus_list != null) return e.Items_of_the_focus_list;
      if (e.items_of_the_focus_list != null) return e.items_of_the_focus_list;
      return e.items;
    }
    function isList(e) {
      return e && typeof e === "object" && Array.isArray(listItems(e));
    }
    var lists;
    if (Array.isArray(value) && value.some(isList)) {
      lists = value.filter(isList);
    } else if (Array.isArray(value)) {
      lists = [{ items: value }];
    } else if (isList(value)) {
      lists = [value];
    } else {
      lists = [];
    }
    var out = [];
    lists.forEach(function (list) {
      var items = listItems(list).filter(function (it) { return String(it || "").trim(); });
      if (!items.length) return;
      var title = list.heading != null
        ? list.heading
        : list.label;
      var lbl = labelHtml(title, (opts && opts.focusLabel) || "Key Focus Areas");
      if (!lbl) return;
      out.push(lbl);
      items.forEach(function (item, i) {
        out.push([
          '      <div class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-space-md py-space-sm border-t border-outline-variant mt-space-sm">',
          '        <span class="font-label-md text-label-md text-secondary pt-1">' + ("0" + (i + 1)).slice(-2) + "</span>",
          '        <span class="font-body-md text-body-md text-on-surface leading-relaxed">' + esc(item) + "</span>",
          "      </div>"
        ].join("\n"));
      });
      out.push('      <div class="border-t border-outline-variant"></div>');
    });
    return out.length ? band('      <div class="text-center lg:text-left">\n' + out.join("\n") + "\n      </div>", opts, false, "720") : "";
  }

  /* --- 3D model ------------------------------------------------------
     A .glb (glTF) file, shown in a viewer you can drag to turn and scroll
     to zoom. Written as a plain filename, or as an object:

       { "add_3d_model": "sensor-node.glb" }
       { "add_3d_model": { "model_path": "ph-01.glb",
                           "heading": "Housing, v3",
                           "model_caption": "The housing, in 3D",
                           "model_credit": "CLEAR WATER LAB",
                           "height": 480,
                           "show_autorotate": true } }

     The older `image_path`, `model`, `src`, `label`, `caption`,
     `credit`, `height`, `autoRotate` and `download` names still read as
     fallbacks.

     It takes the same two placement options as a picture:
       align: "center" (default) | "left" | "right"
       text:  a paragraph to flow beside it — when align is "left" or
              "right", the plate narrows to about half the column and the
              text sits in the other half; on mobile they stack. Without
              `text`, `align` is ignored and the plate keeps the full
              reading column.

     A bare filename is read from `assets/3d/`; a path of your own or a
     full address is used as written (the same rule pictures follow). The
     viewer is Google's <model-viewer> — a Web Component fetched **once,
     and only when a page actually carries a model** — so a page with no 3D
     fetches nothing. No poster picture or alt text is used; the viewer
     shows its own loading state until the model arrives. Under the plate
     sits the caption strip the photos use, with a quiet link to the file
     itself, so a model can always be taken away even where 3D cannot be
     drawn — unless `show_download: false` turns that
     link off.

     Colour: the viewer uses model-viewer's **neutral** tone mapping, which
     keeps the file's own colours. The default ACES grade lifts and softens
     them, so a dark blue reads pale. `exposure` (default 1) and
     `toneMapping` ("neutral"; "auto" and "agx" are also accepted) are there
     for unusually dark or bright files. */
  var MODEL_VIEWER_SRC = "https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js";
  var modelViewerAsked = false;

  function needModelViewer() {
    if (modelViewerAsked) return;
    if (window.customElements && customElements.get && customElements.get("model-viewer")) return;
    modelViewerAsked = true;
    var script = document.createElement("script");
    script.type = "module";
    script.src = MODEL_VIEWER_SRC;
    document.head.appendChild(script);
  }

  function modelHtml(value, opts) {
    var obj = (value && typeof value === "object" && !Array.isArray(value))
      ? value
      : { "model_path": value };
    var file = String(obj["model_path"] || obj.image_path ||
      obj.src || obj.model || obj.file || "").trim();
    if (!file) return "";
    needModelViewer();

    var root = (opts && opts.root) || "";
    var src = (window.CWL && window.CWL.imageSrc)
      ? window.CWL.imageSrc(file, root + "assets/3d/")
      : root + "assets/3d/" + file;
    var rawHeight = obj.height;
    var height = parseInt(rawHeight, 10) || 0;
    var title = obj.heading != null ? obj.heading : obj.label;
    var caption = obj.model_caption != null ? obj.model_caption : obj.caption;
    var credit = obj["model_credit"] != null ? obj["model_credit"] : obj.credit;

    var autoRotate;
    if (obj.show_autorotate !== undefined) {
      autoRotate = obj.show_autorotate === true ||
        obj.show_autorotate === "true";
    } else {
      autoRotate = obj.autoRotate === true || obj.rotate === true;
    }

    function off(v) { return v === false || v === "false" || v === 0 || v === "0"; }
    var showDownload;
    if (obj.show_download !== undefined) {
      showDownload = !off(obj.show_download);
    } else {
      showDownload = !off(obj.turn_on_or_off_download) &&
        !off(obj.download) &&
        !off(obj.allow_download) &&
        !off(obj.allowDownload);
    }

    /* The file's own colours: "neutral" keeps them, where the default
       ACES grade lifts the midtones and turns a dark blue pale. Exposure
       stays at model-viewer's studio default; a dark or bright model can
       ask for another value, and "auto" or "agx" restores the old grades. */
    var toneMapping = String(obj.toneMapping || obj.tone_mapping || "neutral").toLowerCase();
    if (toneMapping !== "auto" && toneMapping !== "agx" && toneMapping !== "commerce") {
      toneMapping = "neutral";
    }
    var exposure = parseFloat(obj.exposure);
    if (!isFinite(exposure) || exposure <= 0) exposure = 1;

    var viewer =
      '      <model-viewer class="cw-model__viewer"' +
      (height ? ' style="--cw-model-height:' + height + 'px"' : "") +
      ' src="' + esc(src) + '"' +
      ' camera-controls touch-action="pan-y" shadow-intensity="0.8"' +
      ' tone-mapping="' + toneMapping + '" exposure="' + exposure + '"' +
      ' loading="lazy" reveal="auto"' +
      (autoRotate ? " auto-rotate" : "") + ">\n" +
      "      </model-viewer>";

    var align = String(obj.align || "center").toLowerCase();
    var sideText = String(obj.text || "").trim();
    var alignedView = (align === "left" || align === "right") && !!sideText;

    var download = showDownload
      ? '<a class="cw-model__download" href="' + esc(src) + '" download>' +
        window.CWL.iconHtml("download") +
        esc(obj.downloadLabel || (alignedView ? "Download" : "Download the model")) + "</a>"
      : "";

    var creditOverlay = credit
      ? '        <span class="cw-model__credit">' + esc(credit) + "</span>\n"
      : "";

    var sourceBits = [];
    if (download) sourceBits.push(download);
    var source = sourceBits.length
      ? '          <span class="cw-model__source">' + sourceBits.join(" \u00b7 ") + "</span>\n"
      : "";

    var foot = (caption || sourceBits.length)
      ? '        <figcaption class="cw-model__foot">\n' +
        (caption
          ? '          <span class="cw-model__caption">' + formatText(esc(caption)) + "</span>\n"
          : "          <span></span>\n") +
        source +
        "        </figcaption>\n"
      : "";

    var figure =
      '      <figure class="cw-model' + (alignedView ? " cw-model--aligned" : "") + '">\n' +
      '        <div class="cw-model__plate">\n' + viewer + "\n" + creditOverlay + "        </div>\n" +
      foot +
      "      </figure>";

    if (alignedView) {
      var textHtml = '<div class="flex-1 min-w-0"><p class="font-body-lg text-body-lg text-on-surface-variant leading-[1.75] text-justify break-words">' + formatText(esc(sideText)) + "</p></div>";
      var plateWrap =
        '    <div class="relative w-full max-w-full md:max-w-[45%] order-first md:order-none ' + (align === "left" ? "mr-auto" : "ml-auto") + '">\n' +
        figure + "\n" +
        "    </div>";
      var row = align === "left" ? [plateWrap, textHtml] : [textHtml, plateWrap];
      return band(
        labelHtml(title) +
        '  <div class="flex flex-col md:flex-row gap-space-xl items-start">\n' +
        row.join("\n") + "\n  </div>",
        opts
      );
    }

    return band(labelHtml(title) + figure, opts);
  }

  /* --- heading ------------------------------------------------------ */
  /* A section title: string, { heading_text, level }, or an array
     of either. level = 1 (largest) | 2 | 3, or "large" / "medium"
     / "small". Rendered as a real h2/h3/h4 so the page keeps a clean
     outline. The older `text` / `level` names still read as fallbacks. */
  var HEADING = {
    1: { tag: "h2", cls: "font-headline-lg text-headline-lg" },
    2: { tag: "h3", cls: "font-headline-md text-headline-md" },
    3: { tag: "h4", cls: "font-headline-sm text-headline-sm" }
  };
  var HEADING_LEVEL = {
    1: 1, 2: 2, 3: 3,
    large: 1, medium: 2, small: 3,
    h1: 1, h2: 2, h3: 3
  };

  function headingHtml(value, opts) {
    var out = [];
    toArray(value).map(function (h) {
      return typeof h === "string"
        ? { heading_text: h }
        : (h && (h.heading_text != null || h.text != null) ? h : null);
    }).filter(Boolean).forEach(function (item) {
      var text = item.heading_text != null ? item.heading_text : item.text;
      var levelValue = item.level;
      var level = HEADING_LEVEL[String(levelValue != null ? levelValue : 2).toLowerCase()] || 2;
      var spec = HEADING[level];
      out.push('    <' + spec.tag + ' class="' + spec.cls + ' text-on-surface">' + formatText(esc(text)) + "</" + spec.tag + ">");
    });
    return out.length ? band(out.join("\n"), opts) : "";
  }

  /* --- button ------------------------------------------------------- */
  /* A call to action: string (a label with no link), an object
       { label, link, style, icon },
     or an array of either (a row of buttons).
     style is "fill" (the default, solid) or "outline".
     A row sits left unless it is named:
       { "align": "left" | "center" | "right",
         "items": [ … ] }
     `text` is still read for a label. */
  var BTN_BASE = "inline-flex items-center justify-center gap-space-xs font-label-lg text-label-lg leading-[18px] px-space-lg min-h-[34px] transition-all cursor-pointer";
  var BTN_STYLE = {
    fill: BTN_BASE + " bg-primary text-on-primary hover:bg-secondary shadow-sm",
    outline: BTN_BASE + " bg-transparent text-on-surface border border-outline-variant hover:bg-surface-container"
  };
  var BTN_ALIAS = {
    fill: "fill", filled: "fill", solid: "fill", primary: "fill",
    outline: "outline", outlined: "outline", ghost: "outline", secondary: "outline"
  };
  var BTN_ALIGN = { left: "justify-start", center: "justify-center", right: "justify-end" };
  /* The same three alignments at desktop width, written out so the
     Tailwind scanner can see every class. */
  var BTN_ALIGN_LG = { left: "lg:justify-start", center: "lg:justify-center", right: "lg:justify-end" };

  function buttonHtml(value, opts) {
    var obj = (value && !Array.isArray(value)) ? value : null;
    var source = (obj && (obj.items || obj.buttons)) || value;
    var items = toArray(source).map(function (b) {
      return typeof b === "string"
        ? { text: b }
        : (b && (b.label != null || b.text != null || b.link != null) ? b : null);
    }).filter(Boolean);
    if (!items.length) return "";
    var alignValue = obj && obj.align;
    var alignKey = String(alignValue || "left").toLowerCase();
    var align = BTN_ALIGN[alignKey] || BTN_ALIGN.left;
    /* `"centerSmall": true` centres the row on phones and tablets and
       restores the chosen alignment at desktop width. */
    var centerSmall = !!(obj && (obj.center_small === true || obj.centerSmall === true || String(obj.alignSmall || "").toLowerCase() === "center"));
    var rowCls = "flex flex-wrap items-center gap-space-md " +
      (centerSmall ? "justify-center " + (BTN_ALIGN_LG[alignKey] || BTN_ALIGN_LG.left) : align);
    var row = items.map(function (b) {
      var styleValue = b.style != null ? b.style : b.variant;
      var styleKey = BTN_ALIAS[String(styleValue || "fill").toLowerCase()] || "fill";
      var text = b.label != null ? b.label : b.text;
      var linkValue = b.link != null ? b.link : b.url;
      var link = href(linkValue);
      var iconName = b.icon;
      var icon = iconName ? window.CWL.iconHtml(iconName, "text-[18px]") : "";
      var inner = "<span>" + formatText(esc(text)) + "</span>" + icon;
      var attrs = ' class="' + BTN_STYLE[styleKey] + '"';
      if (link) attrs += ' href="' + esc(link) + '"';
      if (b.new_tab != null ? b.new_tab : /^https?:\/\//i.test(link)) attrs += ' target="_blank" rel="noopener noreferrer"';
      return link ? "<a" + attrs + ">" + inner + "</a>" : '<button type="button"' + attrs + ">" + inner + "</button>";
    }).join("\n");
    return band('    <div class="cw-button-row ' + rowCls + '">\n' + row + "\n    </div>", opts);
  }

  /* --- divider ------------------------------------------------------ */
  /* A horizontal rule between sections:
     true | "dashed" | "dotted" | { style: "solid" (default) | … }. */
  var DIVIDER = {
    solid: "border-outline-variant",
    line: "border-outline-variant",
    thin: "border-outline-variant",
    dashed: "border-outline-variant border-dashed",
    dotted: "border-outline-variant border-dotted",
    bold: "border-outline-variant border-t-2",
    thick: "border-outline-variant border-t-2"
  };

  function dividerHtml(value, opts) {
    if (value === false) return "";
    var key = typeof value === "string"
      ? value.toLowerCase()
      : String((value && (value.style || value.variant)) || "solid").toLowerCase();
    return band('    <hr class="' + (DIVIDER[key] || DIVIDER.solid) + '" />', opts);
  }

  /* --- quote -------------------------------------------------------- */
  /* A pull-quote: string | { quote, author_of_the_quote?,
     position_of_the_author?, heading? } | array of either.
     The older `text` / `author` / `role` / `label` names still read. */
  function quoteHtml(value, opts) {
    var out = [];
    toArray(value).map(function (q) {
      return typeof q === "string"
        ? { text: q }
        : (q && (q.text != null || q.quote != null) ? q : null);
    }).filter(Boolean).forEach(function (item) {
      var text = item.text != null ? item.text : item.quote;
      var title = item.heading != null ? item.heading : item.label;
      var author = item.author_of_the_quote != null ? item.author_of_the_quote : item.author;
      var role = item.position_of_the_author != null ? item.position_of_the_author : item.role;
      var lbl = labelHtml(title, "");
      if (lbl) out.push(lbl);
      var who = [author, role].filter(Boolean).map(function (s) { return esc(String(s)); }).join(", ");
      out.push([
        '    <figure class="border-l-2 border-on-surface pl-space-lg">',
        '      <blockquote class="font-headline-md text-headline-md text-on-surface italic">' + formatText(esc(text)) + "</blockquote>",
        who ? '      <figcaption class="mt-space-sm font-label-md text-label-md uppercase tracking-widest text-secondary">— ' + who + "</figcaption>" : "",
        "    </figure>"
      ].filter(Boolean).join("\n"));
    });
    return out.length ? band(out.join("\n"), opts) : "";
  }

  /* --- table -------------------------------------------------------- */
  /* A small data table:
       { heading?, table_caption?, column_headers?: [...],
         content_of_rows_separated_by_comma: [ "a, b, c", ... ],
         align?: ["left","right", …] }
     Every field optional. A row may also be an array of cells; the older
     `label` / `caption` / `head` / `rows` / `align` names still read. */
  var ALIGN = { left: "text-left", center: "text-center", right: "text-right" };
  function tableCell(v) { return formatText(esc(v == null ? "" : String(v))); }

  function splitCells(value) {
    if (Array.isArray(value)) {
      return value.map(function (c) { return String(c == null ? "" : c).trim(); });
    }
    return String(value == null ? "" : value).split(",").map(function (c) { return c.trim(); });
  }

  function tableHtml(value, opts) {
    var t = (value && typeof value === "object") ? value : null;
    if (!t) return "";
    var rowsRaw = t.content_of_rows_separated_by_comma != null
      ? t.content_of_rows_separated_by_comma
      : (t.rows != null ? t.rows : []);
    var rows = (Array.isArray(rowsRaw) ? rowsRaw : []).map(splitCells).filter(function (r) {
      return r.length && r.join("").trim();
    });
    var headRaw = t.column_headers != null ? t.column_headers : (t.head != null ? t.head : t.columns);
    var head = headRaw == null ? [] : splitCells(headRaw);
    if (!head.length && !rows.length) return "";
    var alignRaw = t.align;
    var aligns = Array.isArray(alignRaw) ? alignRaw : (alignRaw == null ? [] : [alignRaw]);
    function alignAt(i) { return ALIGN[String(aligns[i] || aligns[0] || "left").toLowerCase()] || ALIGN.left; }

    var out = [];
    var lbl = labelHtml(t.heading != null ? t.heading : t.label, "");
    if (lbl) out.push(lbl);
    var tbl = ['    <div class="overflow-x-auto">', '      <table class="w-full border-collapse">'];
    var caption = t.table_caption != null ? t.table_caption : t.caption;
    if (caption) tbl.push('        <caption class="text-left font-body-sm text-body-sm text-on-surface-variant pb-space-sm">' + tableCell(caption) + "</caption>");
    if (head.length) {
      tbl.push("        <thead>");
      tbl.push('          <tr class="border-b border-on-surface">');
      head.forEach(function (c, i) {
        tbl.push('            <th scope="col" class="' + alignAt(i) + ' font-label-md text-label-md uppercase tracking-widest text-secondary py-space-sm pr-space-md align-bottom">' + tableCell(c) + "</th>");
      });
      tbl.push("          </tr>");
      tbl.push("        </thead>");
    }
    tbl.push("        <tbody>");
    rows.forEach(function (r, ri) {
      if (head.length && r.length !== head.length) {
        console.warn(
          "[table] row " + (ri + 1) + " has " + r.length + " cells but the table has " +
          head.length + " columns — a comma inside a cell splits it. Write that row as an array of cells."
        );
      }
      tbl.push('          <tr class="border-b border-outline-variant">');
      r.forEach(function (c, i) {
        tbl.push('            <td class="' + alignAt(i) + ' font-body-md text-body-md text-on-surface py-space-sm pr-space-md align-top">' + tableCell(c) + "</td>");
      });
      tbl.push("          </tr>");
    });
    tbl.push("        </tbody>");
    tbl.push("      </table>");
    tbl.push("    </div>");
    out.push(tbl.join("\n"));
    return band(out.join("\n"), opts);
  }

  /* --- equation ----------------------------------------------------- */
  /* A LaTeX formula, drawn with KaTeX (loaded on demand, only on pages
     that actually contain maths). A string is a displayed (centred)
     equation; the long form adds a title, a caption, or inline mode:

       { "add_equation": "E = mc^2" }
       { "add_equation": { "formatted_equation": "\\frac{a}{b}",
                           "heading"?, "equation_caption"?,
                           "add_as_inline_equation"? } }

     Remember JSON needs doubled backslashes — write "\\frac", "\\sqrt",
     "\\alpha". If KaTeX can't load, the raw TeX stays visible. The older
     `tex` / `label` / `caption` / `inline` names still read. */
  function equationTex(item) {
    return String(
      item.formatted_equation != null ? item.formatted_equation
        : (item.tex != null ? item.tex : (item.text != null ? item.text : item.equation))
    ).trim();
  }

  function equationHtml(value, opts) {
    var out = [];
    toArray(value).map(function (e) {
      return typeof e === "string"
        ? { formatted_equation: e }
        : (e && (e.formatted_equation != null || e.tex != null || e.text != null || e.equation != null) ? e : null);
    }).filter(Boolean).forEach(function (item) {
      var tex = equationTex(item);
      if (!tex) return;
      var lbl = labelHtml(item.heading != null ? item.heading : item.label, "");
      if (lbl) out.push(lbl);
      var inline = item.add_as_inline_equation === true || item.inline === true || item.display === false || item.block === false;
      if (inline) {
        out.push('<span class="cwl-equation inline-block align-middle" data-tex="' + esc(tex) + '" data-display="0">' + esc(tex) + "</span>");
      } else {
        out.push('<div class="cwl-equation overflow-x-auto my-space-md text-center" data-tex="' + esc(tex) + '" data-display="1">' + esc(tex) + "</div>");
      }
      var caption = item.equation_caption != null ? item.equation_caption : item.caption;
      if (caption) {
        out.push('<p class="font-body-sm text-body-sm text-on-surface-variant text-center mt-space-xs">' + formatText(esc(caption)) + "</p>");
      }
    });
    return out.length ? band(out.join("\n"), opts) : "";
  }

  /* --- equations: KaTeX, fetched only when a page needs it ----------- */
  var KATEX_BASE = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/";
  var katexLoading = null;

  function loadAutoRender() {
    if (window.renderMathInElement) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var js = document.createElement("script");
      js.src = KATEX_BASE + "contrib/auto-render.min.js";
      js.onload = function () { resolve(true); };
      js.onerror = function () { resolve(!!window.katex); };
      document.head.appendChild(js);
    });
  }

  function loadKatex() {
    if (window.katex) return loadAutoRender();
    if (katexLoading) return katexLoading;
    katexLoading = new Promise(function (resolve) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = KATEX_BASE + "katex.min.css";
      document.head.appendChild(link);
      var js = document.createElement("script");
      js.src = KATEX_BASE + "katex.min.js";
      js.onload = function () { resolve(loadAutoRender()); };
      js.onerror = function () { resolve(false); };
      document.head.appendChild(js);
    });
    return katexLoading;
  }

  /* Draw every equation in `root`. A no-op when there are none (so a
     page without maths never fetches KaTeX), and safe to call again. */
  function startEquations(root) {
    if (!root) return;
    var nodes = root.querySelectorAll(".cwl-equation[data-tex]");
    if (!nodes.length) return;
    loadKatex().then(function (ok) {
      if (!ok || !window.katex) return;   // the raw TeX stays visible
      Array.prototype.forEach.call(nodes, function (el) {
        try {
          window.katex.render(el.getAttribute("data-tex"), el, {
            displayMode: el.getAttribute("data-display") === "1",
            throwOnError: false
          });
        } catch (e) { /* leave the raw TeX in place */ }
      });
    });
  }

  /* --- contact ------------------------------------------------------ */
  /* A small "Contact" block — a hairline rule, a title, then a name and
     a mail link. One person is { name?, email?, role?,
     heading? }; several are
     { heading?, people: [ … ] }, or a
     bare array (its first item may carry the title). The older `label`
     name still reads. One common hairline sits above the group; two or
     more people sit in a shrink-wrapped grid, side by side (two columns,
     or three from three people). */
  function contactHtml(value, opts) {
    var obj = (value && !Array.isArray(value) && typeof value === "object") ? value : null;
    var raw = obj
      ? (obj.people || obj.items || obj.contacts || obj.members ||
         ((obj.name || obj.email) ? [obj] : null))
      : value;
    var people = toArray(raw).filter(function (c) { return c && typeof c === "object"; });
    if (!people.length) return "";
    var first = people[0] || {};
    var label = obj
      ? (obj.heading !== undefined
          ? obj.heading
          : obj.label)
      : (first.heading !== undefined
          ? first.heading
          : first.label);
    var lbl = labelHtml(label, "Contact");
    var lines = people.map(function (c) {
      var name = c.name ? "<strong>" + esc(String(c.name)) + "</strong>" : "";
      var role = c.role ? '<span class="block text-on-surface-variant">' + esc(String(c.role)) + "</span>" : "";
      var email = c.email ? '<a href="mailto:' + esc(String(c.email)) + '" class="text-secondary hover:text-on-surface underline-offset-4 hover:underline">' + esc(String(c.email)) + "</a>" : "";
      var body = [name + role, email].filter(Boolean).join(role ? "" : "<br>");
      return body ? '      <p class="font-body-md text-body-md text-on-surface-variant">' + body + "</p>" : "";
    }).filter(Boolean);
    if (!lines.length) return "";
    /* One common hairline sits above the group — never above each
       person. Two or more people sit in a shrink-wrapped grid, side by
       side, so the next person stays close instead of drifting to the
       far edge of the reading column. */
    var many = lines.length > 1;
    var cols = lines.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2";
    var content = many
      ? '      <div class="inline-grid grid-cols-1 ' + cols + ' gap-space-lg">\n' +
        lines.map(function (line) { return "  " + line; }).join("\n") + "\n      </div>"
      : lines[0];
    return band([
      '    <div class="border-t border-outline-variant pt-space-md">',
      lbl ? "      " + lbl : "",
      content,
      "    </div>"
    ].filter(Boolean).join("\n"), opts);
  }

  /* --- tags --------------------------------------------------------- */
  /* A row of small chips — topics, skills, requirements.
       { "add_tags": [ "fieldwork", "alpine" ] }
       { "add_tags": { "heading": "Skills", "tags": [ "PCR", "R" ] } }
     The title sits above in the label voice and defaults to "Tags:"
     (write "heading": "" for none). An item is a word, or an object
     with its own "label" / "text". The older `label` / `items` names
     still read. */
  function tagsHtml(value, opts) {
    var named = value && !Array.isArray(value) && typeof value === "object";
    var raw = named
      ? (value.tags != null ? value.tags : (value.items != null ? value.items : value.chips))
      : value;
    var items = toArray(raw).map(function (t) {
      if (t && typeof t === "object") return String(t.label || t.text || t.tag || t.name || "");
      return String(t == null ? "" : t);
    }).filter(function (t) { return t.trim() !== ""; });
    if (!items.length) return "";
    var label = named
      ? (value.heading !== undefined ? value.heading
        : (value.label !== undefined ? value.label : "Tags:"))
      : "Tags:";
    var lbl = String(label || "").trim() ? labelHtml(label, "") : "";
    var chips = items.map(function (t) {
      return '      <span class="px-space-sm py-0.5 border border-outline-variant font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">' + esc(t) + "</span>";
    }).join("\n");
    return band([
      lbl,
      '    <div class="flex flex-wrap items-center gap-space-sm">',
      chips,
      "    </div>"
    ].filter(Boolean).join("\n"), opts);
  }

  /* --- links -------------------------------------------------------- */
  /* Hairline rows of links — related papers, datasets, a DOI.
       { "add_full_width_links": [ { "label": "The paper",
                                     "link": "https://doi.org/…" } ] }
       { "add_full_width_links": { "heading": "Related",
                                   "links": [ … ] } }
     A row takes { "label", "link", "note" }; a row with no
     link prints as plain words.
     A link that leaves the site opens in a new tab and wears the small
     arrow (the button rule). The title sits above in the label voice and
     defaults to "Links" (write "heading": "" for
     none). The older `title` / `link` / `note` / `label` / `items` names
     still read. */
  function linksHtml(value, opts) {
    var named = value && !Array.isArray(value) && typeof value === "object" &&
      (value.links != null || value.items != null);
    var raw = named ? (value.links != null ? value.links : value.items) : value;
    var rows = toArray(raw).filter(Boolean).map(function (it) {
      if (it && typeof it === "object") {
        var title = it.label != null
          ? it.label
          : (it.title != null ? it.title
            : (it.text != null ? it.text : (it.link != null ? it.link : it.url)));
        var link = it.link != null ? it.link : it.url;
        var note = it.note;
        return {
          title: String(title == null ? "" : title),
          link: String(link == null ? "" : link),
          note: String(note == null ? "" : note)
        };
      }
      return { title: String(it), link: "", note: "" };
    }).filter(function (r) { return r.title || r.link; });
    if (!rows.length) return "";
    var label = named
      ? (value.heading !== undefined ? value.heading
        : (value.label !== undefined ? value.label : "Links"))
      : "Links";
    var lbl = String(label || "").trim() ? labelHtml(label, "") : "";
    var html = rows.map(function (r) {
      var outside = /^https?:\/\//i.test(r.link);
      var href = r.link && r.link.charAt(0) === "@" && window.CWL.link
        ? window.CWL.link(r.link)
        : r.link;
      var inner = '<span class="min-w-0">' + esc(r.title || r.link) +
        (r.note ? ' <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">' + esc(r.note) + "</span>" : "") +
        "</span>";
      if (!r.link) {
        return '      <li class="border-t border-outline-variant">\n' +
          '        <span class="flex items-center justify-between gap-space-sm py-space-sm font-body-md text-body-md text-on-surface">' + inner + "</span>\n" +
          "      </li>";
      }
      return '      <li class="border-t border-outline-variant">\n' +
        '        <a href="' + esc(href) + '"' + (outside ? ' target="_blank" rel="noopener"' : "") +
        ' class="group flex items-center justify-between gap-space-sm py-space-sm font-body-md text-body-md text-on-surface hover:text-secondary transition-colors">' + inner +
        (outside ? '<span class="cw-icon cw-icon--arrow-outward text-[18px] text-secondary shrink-0" aria-hidden="true"></span>' : "") +
        "</a>\n      </li>";
    }).join("\n");
    return band([
      lbl,
      '    <ul class="border-t border-outline-variant">',
      html,
      "    </ul>"
    ].filter(Boolean).join("\n"), opts);
  }

  /* --- cards --------------------------------------------------------
     One link as a wide card, or several as a grid:

       { "add_cards": { "heading": "The Hidden River",
                        "link": "https://…",
                        "individual_card_keyword": "Book",
                        "meta": "MIT Press · 2024",
                        "image_path": "ph-03.jpg",
                        "text": "A field guide to the waterways beneath our cities." } }

       { "add_cards": { "heading": "Books",
                        "columns": 3,
                        "individual_card_details": [
                          { "heading": "…", "link": "https://…",
                            "individual_card_keyword": "Book" } ] } }

     Each card is one door: the whole plate is the link. An
     `image_path` may be a cover, a still or a poster;
     `fit: "contain"` keeps a cover or a logo whole instead of cropping
     it. A link that leaves the site opens in a new tab and prints the
     address it leads to, with the arrow the buttons use; a named link
     ("@team") stays on the site. `columns` is 1,
     2 or 3 on desktop — the grid settles at 2, then 1, on smaller
     screens. A card written on its own (no "individual_card_details")
     spans the reading column: its picture on the left, its words on the
     right, stacking on mobile. The set's title defaults to "Links"
     (write "" for none). The older `label` / `note` / `columns` / `items`
     / `title` / `text` / `image` / `imageAlt` / `url` names still read. */
  function cardDomain(link) {
    var m = /^https?:\/\/([^\/?#]+)/i.exec(link);
    return m ? m[1].replace(/^www\./i, "") : "";
  }

  function cardHtml(item, opts, wide) {
    if (!item || typeof item !== "object") return "";
    var raw = String(item.link || item.url || item.href || "").trim();
    var link = href(raw);
    var title = String(item.heading || item.title || item.name || "").trim() || raw;
    if (!title) return "";
    var label = String(item.individual_card_keyword || item.label || item.eyebrow || "").trim();
    var text = String(item.text || item.note || item.description || "").trim();
    var meta = String(item.meta || item.byline || "").trim();
    var image = item.image_path || item.image || item.photo || item.poster || item.cover || "";
    var alt = item.image_alt != null
      ? item.image_alt
      : (item.imageAlt != null ? item.imageAlt : item.alt);
    var external = /^https?:\/\//i.test(link);
    var action = String(item.action || "").trim();
    if (!action && link) {
      action = /^mailto:/i.test(link) ? "Email"
        : (/^tel:/i.test(link) ? "Call"
          : (external ? cardDomain(link) : "On this site"));
    }

    var tag = link ? "a" : "div";
    var attrs = ' class="cw-card' + (wide ? " cw-card--wide" : "") + '"';
    if (link) attrs += ' href="' + esc(link) + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : "");

    var inner = [];
    if (image) {
      var contain = String(item.fit || "").toLowerCase() === "contain";
      inner.push('        <span class="cw-card__media' + (contain ? " cw-card__media--contain" : "") + '">' +
        '<img loading="lazy" alt="' + esc(alt || "") + '" src="' + esc(srcUrl(image, opts)) + '" /></span>');
    }
    inner.push('        <span class="cw-card__body">');
    if (label) inner.push('          <span class="cw-card__label">' + esc(label) + "</span>");
    inner.push('          <span class="cw-card__title">' + esc(title) + "</span>");
    if (text) inner.push('          <span class="cw-card__text">' + esc(text) + "</span>");
    if (meta || action) {
      inner.push('          <span class="cw-card__foot">');
      inner.push('            <span class="cw-card__meta">' + esc(meta) + "</span>");
      if (action) {
        inner.push('            <span class="cw-card__action">' + esc(action) +
          (link ? window.CWL.iconHtml(external ? "arrow_outward" : "arrow_forward", "text-[15px]") : "") +
          "</span>");
      }
      inner.push("          </span>");
    }
    inner.push("        </span>");
    return "      <" + tag + attrs + ">\n" + inner.join("\n") + "\n      </" + tag + ">";
  }

  function cardsHtml(value, opts) {
    if (!value) return "";
    var obj = (!Array.isArray(value) && typeof value === "object") ? value : null;
    var listed = !!(obj && (obj.individual_card_details || obj.items || obj.cards));
    var items = listed ? toArray(obj.individual_card_details || obj.items || obj.cards)
      : (Array.isArray(value) ? value : (obj ? [obj] : []));
    items = items.filter(function (it) { return it && typeof it === "object"; });
    if (!items.length) return "";

    if (!listed) {
      var one = cardHtml(items[0], opts, true);
      return one ? band('      <div class="cw-cards cw-cards--single">\n' + one + "\n      </div>", opts) : "";
    }

    var columnsValue = obj.columns != null
      ? obj.columns
      : obj.columns;
    var columns = parseInt(columnsValue, 10) || (items.length >= 3 ? 3 : 2);
    columns = Math.max(1, Math.min(3, columns));
    var titleValue = obj.heading !== undefined
      ? obj.heading
      : (obj.card_titles !== undefined ? obj.card_titles : obj.label);
    var label = String(titleValue === undefined ? "Links" : titleValue).trim();
    var lbl = label ? labelHtml(label, "") : "";
    var note = String(obj.intro || obj.note || obj.line || obj.intro || "").trim();
    var noteHtml = note ? '      <p class="cw-cards__note">' + esc(note) + "</p>" : "";
    var cards = items.map(function (it) { return cardHtml(it, opts, false); }).filter(Boolean);
    if (!cards.length) return "";
    return band([
      lbl,
      noteHtml,
      '      <div class="cw-cards" style="--cw-cards-cols:' + columns + '">',
      cards.join("\n"),
      "      </div>"
    ].filter(Boolean).join("\n"), opts);
  }

  /* --- callout -------------------------------------------------------
     A special note, in a colour of its choice:

       { "add_special_note": "The archive closes for two weeks in August." }
       { "add_special_note": { "colour": "amber",
                               "heading": "Please note",
                               "text": "The archive closes…",
                               "icon": "omega_clan" } }
       { "add_special_note": { "background_colour": "#25402e",
                               "text_colour": "#eef0e6",
                               "heading": "Field note",
                               "text": "…" } }

     Colours: "sand" (default), "info", "green", "amber", "red", "dark",
     with friendly aliases ("warning", "success", "danger", "neutral"…).
     `colour` takes a tone name or a hex value; `background_colour` sets
     the ground and `text_colour` the words (title and icon follow);
     "accent" is the left edge and "border" the hairline. When only the
     ground is given, the words turn black or cream by themselves,
     whichever the colour can carry. The heading is the uppercase line
     above the note; the icon is a folder drawing or a "materials:" name,
     and "icon": false leaves it out. The note keeps the friendly markup:
     **bold**, *italic*, ==highlight==, {links}. */
  var CALLOUT_ALIAS = {
    neutral: "sand", note: "sand", default: "sand", plain: "sand",
    blue: "info", information: "info",
    success: "green", good: "green", positive: "green",
    warn: "amber", warning: "amber", caution: "amber",
    danger: "red", error: "red", stop: "red",
    black: "dark", night: "dark"
  };
  var CALLOUT_ICONS = {
    sand: "materials:lightbulb", info: "materials:info", green: "materials:check_circle",
    amber: "materials:warning", red: "materials:error", dark: "materials:priority_high"
  };

  /* A colour written by hand — "#25402e", "rgb(37, 64, 46)",
     "hsl(148 27% 20%)" or a CSS name. Anything else is ignored (a tone
     name is handled by the class). */
  function coreColor(v) {
    v = String(v == null ? "" : v).trim();
    if (!v) return "";
    if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v;
    if (/^(rgb|hsl)a?\([0-9.,%\s\/+-]+\)$/i.test(v)) return v;
    if (/^[a-z]{3,20}$/i.test(v)) return v;
    return "";
  }

  /* Black or cream, whichever a ground can carry. */
  function inkFor(bg) {
    var h = String(bg || "").replace(/^#/, "");
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (!/^[0-9a-f]{6}$/i.test(h)) return "";
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#1b1c19" : "#fbf9f4";
  }

  function calloutHtml(value, opts) {
    var obj = (value && typeof value === "object" && !Array.isArray(value)) ? value : { text: value };

    /* One word for colour: a tone name ("info", "amber") or a hex value.
       `background_colour` overrides the ground, `text_colour` the ink. */
    var colourAsk = String(obj.colour || "").trim();
    var toneAsk = "sand";
    var bg = coreColor(obj.background_colour != null
      ? obj.background_colour
      : (obj.background || obj.bg || ""));
    if (colourAsk) {
      if (/^#|^(rgb|hsl)a?\(/i.test(colourAsk)) {
        if (!bg) bg = coreColor(colourAsk);
      } else {
        toneAsk = colourAsk.toLowerCase();
      }
    }
    var tone = CALLOUT_ALIAS[toneAsk] || toneAsk;
    if (!CALLOUT_ICONS[tone]) tone = "sand";

    var ink = coreColor(obj.text_colour != null
      ? obj.text_colour
      : (obj.textColor || obj.ink || obj.foreground));
    if (!ink && bg) ink = inkFor(bg);
    var accent = coreColor(obj.accent || obj.edge || obj.rule);
    var line = coreColor(obj.border || obj.line);

    var text = obj.text != null ? obj.text : (obj.note || obj.body || "");
    var body = Array.isArray(text) ? text.join("\n\n") : String(text || "");
    if (!body.trim()) return "";

    var label = String(obj.heading != null ? obj.heading : (obj.label || obj.eyebrow || "")).trim();
    var iconAsk = obj.icon;
    var icon = (iconAsk === false || iconAsk === "") ? "" : String(iconAsk || CALLOUT_ICONS[tone]);

    var vars = [];
    if (bg) vars.push("--cw-callout-bg:" + bg);
    if (ink) {
      vars.push("--cw-callout-ink:" + ink);
      vars.push("--cw-callout-edge:" + ink);
    }
    if (accent) vars.push("--cw-callout-edge:" + accent);
    if (line) vars.push("--cw-callout-line:" + line);
    var style = vars.length ? ' style="' + esc(vars.join(";")) + '"' : "";

    var paras = splitParagraphs(body).map(function (p) {
      return '          <p class="cw-callout__text">' + formatText(esc(p)) + "</p>";
    }).join("\n");

    return band([
      '      <aside class="cw-callout cw-callout--' + esc(tone) + '"' + style + ">",
      icon ? '        ' + window.CWL.iconHtml(icon, "cw-callout__icon") : "",
      '        <div class="cw-callout__body">',
      label ? '          <span class="cw-callout__label">' + esc(label) + "</span>" : "",
      paras,
      "        </div>",
      "      </aside>"
    ].filter(Boolean).join("\n"), opts);
  }

  /* --- list --------------------------------------------------------- */
  /* A bullet or numbered list, with optional nested (indented) lists.
       { "add_list": [ "one", "two" ] }
       { "add_list": { "heading"?, "style": "bullet" | "number",
                        "add_items_to_list": [ "one",
                                   { "text": "two",
                                     "add_items_to_list": [ "two-a", "two-b" ] } ] } }
     An item is a line of text, or an object with its own "list_item" plus
     an "add_items_to_list" list of sub-lines (which indent under it, and
     can nest again and again). An item may set its own "style" for
     the list nested under it, so styles can mix. "style" is "bullet"
     (the default),
     "number", "none", "roman", "roman-upper", "alpha", "alpha-upper",
     "square", "circle", "dash", "check", "arrow" or "inline". The older
     `style` / `label` / `items` names still read as fallbacks. */
  var LIST_STYLES = {
    bullet: { tag: "ul", cls: "list-disc" },
    disc: { tag: "ul", cls: "list-disc" },
    number: { tag: "ol", cls: "list-decimal" },
    numbered: { tag: "ol", cls: "list-decimal" },
    decimal: { tag: "ol", cls: "list-decimal" },
    ordered: { tag: "ol", cls: "list-decimal" },
    "1": { tag: "ol", cls: "list-decimal" },
    ol: { tag: "ol", cls: "list-decimal" },
    none: { tag: "ul", cls: "cw-list--none" },
    roman: { tag: "ol", cls: "cw-list--roman" },
    "roman-upper": { tag: "ol", cls: "cw-list--roman-upper" },
    alpha: { tag: "ol", cls: "cw-list--alpha" },
    "alpha-upper": { tag: "ol", cls: "cw-list--alpha-upper" },
    square: { tag: "ul", cls: "cw-list--square" },
    circle: { tag: "ul", cls: "cw-list--circle" },
    dash: { tag: "ul", cls: "cw-list--dash" },
    check: { tag: "ul", cls: "cw-list--check" },
    arrow: { tag: "ul", cls: "cw-list--arrow" },
    inline: { tag: "ul", cls: "cw-list--inline", noSpace: true }
  };

  function listSpecFromStyle(style) {
    var s = String(style == null ? "bullet" : style).trim().toLowerCase() || "bullet";
    return LIST_STYLES[s] || LIST_STYLES.bullet;
  }

  function listStyle(value) {
    var s = value && !Array.isArray(value)
      ? (value.style != null ? value.style : value.variant)
      : "";
    return listSpecFromStyle(s);
  }

  /* Optional marker per nesting level, for mixed lists:
       "level_styles": [ "number", "bullet", "dash" ]
       "level_styles": { "1": "number", "2": "bullet", "3": "dash" }
     Level 1 is the main list, level 2 the first sub-list, and so on. An
     item's own "style" still wins for the list under that item. */
  function listLevelStyles(value) {
    if (!value || Array.isArray(value) || typeof value !== "object") return null;
    var out = [];

    /* Explicit, one key per level — the clearest way to write a mixed list:
         "level_1_style": "number",
         "level_2_style": "bullet",
         "level_3_style": "dash" */
    Object.keys(value).forEach(function (k) {
      var m = /^level_(\d+)_style$/.exec(k);
      if (!m) return;
      var n = parseInt(m[1], 10);
      if (n >= 1) out[n - 1] = listSpecFromStyle(value[k]);
    });

    /* A single map is still accepted for the levels not named above:
         "level_styles": [ "number", "bullet", "dash" ]
         "level_styles": { "1": "number", "2": "bullet" } */
    if (!out.length) {
      var raw = value.level_styles != null
        ? value.level_styles
        : (value.level_styles != null ? value.level_styles : value.styles);
      if (raw) {
        if (Array.isArray(raw)) {
          raw.forEach(function (s, i) { out[i] = listSpecFromStyle(s); });
        } else if (typeof raw === "object") {
          Object.keys(raw).forEach(function (k) {
            var n = parseInt(k, 10);
            if (!isNaN(n) && n >= 1) out[n - 1] = listSpecFromStyle(raw[k]);
          });
        }
      }
    }

    return out.length ? out : null;
  }

  function listNode(items, spec, depth, levelStyles) {
    var tag = spec.tag;
    var cls = spec.cls +
      " pl-space-lg" + (spec.noSpace ? "" : " space-y-space-sm") +
      " font-body-lg text-body-lg text-on-surface-variant leading-[1.75] marker:text-secondary" +
      (depth ? " mt-space-sm" : "") +
      (depth >= 2 ? " cw-list--deep" : "");
    var lis = items.map(function (it) {
      var text = "", kids = [];
      if (Array.isArray(it)) {
        kids = it;
      } else if (it && typeof it === "object") {
        text = it.list_item != null ? it.list_item
          : (it.text != null ? it.text : (it.label != null ? it.label : ""));
        var kidsRaw = it.add_items_to_list != null ? it.add_items_to_list : it.items;
        kids = Array.isArray(kidsRaw) ? kidsRaw : (Array.isArray(it.list) ? it.list : []);
      } else if (it != null) {
        text = it;
      }
      var body = String(text).trim() ? "<span>" + formatText(esc(String(text).trim())) + "</span>" : "";
      /* An item may set its own style for the list nested under it —
         a numbered list can carry a bullet sub-list, for example. The
         level map is the fallback when the item does not name one. */
      var subSpec = spec;
      if (it && typeof it === "object" && it.style != null) {
        subSpec = listSpecFromStyle(it.style);
      } else if (levelStyles && levelStyles[depth + 1]) {
        subSpec = levelStyles[depth + 1];
      }
      var sub = kids.length ? listNode(kids, subSpec, depth + 1, levelStyles) : "";
      return '      <li>' + body + sub + "</li>";
    }).join("\n");
    return [
      '    <' + tag + ' class="' + cls + '">',
      lis,
      "    </" + tag + ">"
    ].join("\n");
  }

  /* A flat way to write a nested list: every line is an ordinary item, and
     an object may say its own `level` — 1 (main), 2 (sub list 1),
     3 (sub list 2), and so on. Items follow their parent in order; a line
     at a shallower level closes the deeper lists above it.
       [ "Field work",
         "Laboratory analysis",
         { "text": "DNA extraction", "level": 2 },
         { "text": "Modelling", "level": 2 },
         { "text": "Calibration", "level": 3 },
         "Writing" ]
     The older nested form (`text` + `add_items_to_list`) still works. */
  function listLevel(value) {
    if (typeof value === "number") return value;
    var s = String(value == null ? "" : value).trim().toLowerCase();
    var n = parseInt(s, 10);
    if (!isNaN(n)) return n;
    if (s === "main" || s === "main-list" || s === "main_list") return 1;
    if (s === "sub" || s === "sub1" || s === "sub-1" || s === "sub_1" ||
        s === "sub-list-1" || s === "sub_list_1" || s === "sub list 1") return 2;
    if (s === "sub2" || s === "sub-2" || s === "sub_2" ||
        s === "sub-list-2" || s === "sub_list_2" || s === "sub list 2" ||
        s === "sub_list_1_1" || s === "sub-list-1-1" || s === "sub list 1_1") return 3;
    return 0;
  }

  function normalizeFlatList(items) {
    var hasLevels = items.some(function (it) {
      return it && typeof it === "object" && it.level != null;
    });
    if (!hasLevels) return items;

    var root = [];
    var stack = [{ level: 0, items: root }];
    items.forEach(function (it) {
      var src = (it && typeof it === "object") ? it : { text: it };
      var level = listLevel(src.level);
      if (!level || level < 1) level = 1;
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      var parent = stack[stack.length - 1];
      if (level > parent.level + 1) level = parent.level + 1;
      var node = {};
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k) && k !== "level" && k !== "level") node[k] = src[k];
      }
      parent.items.push(node);
      stack.push({ level: level, items: (node.add_items_to_list = []) });
    });

    (function clean(nodes) {
      nodes.forEach(function (n) {
        if (Array.isArray(n.add_items_to_list)) {
          if (!n.add_items_to_list.length) delete n.add_items_to_list;
          else clean(n.add_items_to_list);
        }
      });
    })(root);

    return root;
  }

  function listHtml(value, opts) {
    var items, label = "";
    if (Array.isArray(value)) {
      items = value;
    } else if (value && typeof value === "object") {
      var listItems = value.add_items_to_list != null ? value.add_items_to_list : value.items;
      items = Array.isArray(listItems) ? listItems : (Array.isArray(value.list) ? value.list : []);
      label = value.heading != null ? value.heading : (value.label || "");
    } else {
      return "";
    }
    items = items.filter(function (it) { return it != null; });
    items = normalizeFlatList(items);
    if (!items.length) return "";
    var out = [];
    var lbl = labelHtml(label, "");
    if (lbl) out.push(lbl);
    var levelStyles = listLevelStyles(value);
    var topSpec = (levelStyles && levelStyles[0]) ? levelStyles[0] : listStyle(value);
    out.push(listNode(items, topSpec, 0, levelStyles));
    return band(out.join("\n"), opts);
  }

  /* A heading immediately followed by a paragraph with no title reads
     better with a tighter gap than two separate bands normally leave. */
  function isHeadingKey(key) {
    return key === "add_heading" || key === "heading";
  }

  function isParagraphKey(key) {
    return key === "add_paragraph" || key === "paragraph";
  }

  function paragraphHasTitle(value) {
    var first = Array.isArray(value) ? value[0] : value;
    if (!first || typeof first !== "object") return false;
    var t = first.heading != null ? first.heading : first.label;
    return String(t == null ? "" : t).trim() !== "";
  }

  function tightTopOpts(opts) {
    var base = (opts && opts.bandClass) || "w-full px-margin md:px-margin-tablet lg:px-margin-desktop pt-space-xl";
    var tight = base.replace(/(^|\s)pt-space-xl(?=\s|$)/, "$1pt-space-md");
    if (tight === base) tight = base + " pt-space-md";
    var next = {};
    if (opts) {
      for (var k in opts) {
        if (Object.prototype.hasOwnProperty.call(opts, k)) next[k] = opts[k];
      }
    }
    next.bandClass = tight;
    return next;
  }

  /* Optional per-element top space:
       "space_before": "none" | "xs" | "sm" | "md" | "lg" | "xl" | "less"
       "space_subtract": 1   (one step less than the default xl)
     The classes are literal so the Tailwind scanner can see them. */
  var SPACE_STEPS = ["0", "space-xs", "space-sm", "space-md", "space-lg", "space-xl"];
  var SPACE_NAMED = {
    none: "0", zero: "0", "0": "0",
    xs: "space-xs", sm: "space-sm", md: "space-md",
    lg: "space-lg", xl: "space-xl",
    less: "space-lg", subtract: "space-lg", closer: "space-md"
  };

  function elementSpaceOpts(opts, value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return opts;
    var token = null;
    if (value.space_before != null) {
      token = SPACE_NAMED[String(value.space_before).trim().toLowerCase()] || null;
    } else if (value.space_subtract != null) {
      var n = parseInt(value.space_subtract, 10);
      if (!isNaN(n)) {
        var idx = 5 - n;
        if (idx < 0) idx = 0;
        if (idx > 5) idx = 5;
        token = SPACE_STEPS[idx];
      }
    }
    if (token == null) return opts;

    var base = (opts && opts.bandClass) || "w-full px-margin md:px-margin-tablet lg:px-margin-desktop pt-space-xl";
    var tight = base.replace(/\bpt-(space-\w+|0)\b/, "pt-" + token);
    if (tight === base) tight = base + " pt-" + token;
    var next = {};
    if (opts) {
      for (var k in opts) {
        if (Object.prototype.hasOwnProperty.call(opts, k)) next[k] = opts[k];
      }
    }
    next.bandClass = tight;
    return next;
  }

  /* --- content: the ordered list ------------------------------------ */
  /* Each entry = one element ({ "<type key>": value }), rendered in
     list order; lists can't nest. Adjacent embeds stay separate centered
     plates; use `add_embed_media_row` when a row is wanted. */
  function contentHtml(value, opts) {
    if (!Array.isArray(value)) return "";
    var out = [];
    var prevKey = "";
    value.forEach(function (entry) {
      if (!entry || typeof entry !== "object") return;
      Object.keys(entry).forEach(function (key) {
        if (key === "add_content_to_page" || key === "content") return;
        var render = TYPES[key];
        if (!render) return;
        var localOpts = opts;
        if (isParagraphKey(key) && isHeadingKey(prevKey) && !paragraphHasTitle(entry[key])) {
          localOpts = tightTopOpts(opts);
        }
        /* Space can sit on the entry itself — which also lets a string
           value (a quote, a divider) carry it — or inside the element's
           own object. */
        localOpts = elementSpaceOpts(localOpts, entry);
        localOpts = elementSpaceOpts(localOpts, entry[key]);
        var html = render(entry[key], localOpts);
        if (html) {
          out.push(html);
          prevKey = key;
        }
      });
    });
    return out.join("\n");
  }

  var TYPES = {
    add_paragraph: paragraphHtml,
    paragraph: paragraphHtml,
    add_list: listHtml,
    list: listHtml,
    add_image: imageHtml,
    image: imageHtml,
    add_slideshow: slideshowHtml,
    slideshow: slideshowHtml,
    add_gallery: galleryHtml,
    gallery: galleryHtml,
    add_embed_media: embedHtml,
    embed: embedHtml,
    add_embed_media_row: embedRowHtml,
    add_embed_row: embedRowHtml,
    add_3d_model: modelHtml,
    model: modelHtml,
    "3d": modelHtml,
    viewer: modelHtml,
    add_heading: headingHtml,
    heading: headingHtml,
    add_button: buttonHtml,
    button: buttonHtml,
    add_divider: dividerHtml,
    divider: dividerHtml,
    add_quote: quoteHtml,
    quote: quoteHtml,
    add_special_note: calloutHtml,
    callout: calloutHtml,
    notice: calloutHtml,
    add_table: tableHtml,
    table: tableHtml,
    add_equation: equationHtml,
    equation: equationHtml,
    add_contact_information: contactHtml,
    contact: contactHtml,
    add_focus_list: focusHtml,
    focus: focusHtml,
    add_tags: tagsHtml,
    tags: tagsHtml,
    add_full_width_links: linksHtml,
    links: linksHtml,
    add_cards: cardsHtml,
    cards: cardsHtml,
    add_people: peopleHtml,
    people: peopleHtml,
    add_a_timeline: timelineHtml,
    timeline: timelineHtml,
    add_publication_or_more: publicationsHtml,
    publication: publicationsHtml,
    publications: publicationsHtml,
    add_content_to_page: contentHtml,
    content: contentHtml
  };

  /* --- the flow: every element in file order ------------------------ */
  function renderFlow(source, opts) {
    opts = opts || {};
    if (!source || typeof source !== "object") return "";
    var out = [];
    var prevKey = "";
    Object.keys(source).forEach(function (key) {
      if ((opts.reserved || []).indexOf(key) !== -1) return;   // hero words
      var render = TYPES[key];
      if (!render) return;                                     // unknown — quiet
      var localOpts = opts;
      if (isParagraphKey(key) && isHeadingKey(prevKey) && !paragraphHasTitle(source[key])) {
        localOpts = tightTopOpts(opts);
      }
      localOpts = elementSpaceOpts(localOpts, source[key]);
      var html = render(source[key], localOpts);
      if (html) {
        out.push(html);
        prevKey = key;
      }
    });
    return out.join("\n");
  }

  /* --- one whole deep content page ---------------------------------
     The shell EVERY deep content page opens with: a research area and
     a news story are drawn by this one function, so the same words and
     pictures come out the same on either — only the content differs.

       1. the hero band — eyebrow, headline, kicker, the note in the
          right column under its short rule, an optional meta line
          (js/helpers.js pageHero)
       2. every content element, in file order (renderFlow above)

     opts = { hero, reserved, root, focusLabel, bandClass }.
     The page that calls it mounts the result, then runs
     mountSlideshows / mountEquations over it. */
  function contentPage(data, opts) {
    opts = opts || {};
    var heroHtml = (window.CWL && window.CWL.pageHero) ? window.CWL.pageHero(opts.hero || {}) : "";
    return [
      heroHtml ? band(heroHtml, opts) : "",
      renderFlow(data || {}, {
        reserved: opts.reserved,
        root: opts.root,
        imageBase: opts.imageBase,
        focusLabel: opts.focusLabel,
        bandClass: opts.bandClass,
        viewer: opts.viewer,
        team: opts.team
      })
    ].filter(Boolean).join("\n");
  }

  /* --- one person's profile page ------------------------------------
     The profile page's OWN shell — the only page type that opens with a
     profile head — built on the same content elements every other deep
     page uses (renderFlow above), so a paragraph, a gallery or a table on
     a profile is drawn exactly as it is on a research area. One
     vocabulary, one drawing; the head is what makes a person's page
     theirs.

     A head is a LIST OF PIECES, in the order they should print, and a
     structure is nothing more than one such list (STRUCTURES below).
     Every structure therefore shares every drawing — the same portrait
     plate, the same pills, the same buttons, the same rows — and differs
     only in what it shows and where. The four structures:

       senior      the position above the name, then the pills and the
                   ways to reach them; the words begin below the head
       researcher  as senior, with the one-line pitch beside the name
       student     as senior, with the supervisor's card in that place
       alumni      as senior, with the "now at" ribbon under the name

     Which structure a page opens with is the PAGE's business: a profile
     page reads the person's roleType and list out of data/edit_team_section.json
     (structureFor below), so the card and the page always agree. The
     file can override it with "structure", or replace the recipe outright
     with "head": ["portrait", "eyebrow", "name", …].

     The head reads one person's words from the same keys their team card
     reads, so a person is written once and prints the same in both
     places:

       eyebrow    the small label above the name — the position
                  (data.position, else the card's role), or the file's
                  own word
       name       the headline
       role       the kicker under it (structures may leave it out)
       summary    the one-line pitch (subtitle is the fallback)
       ribbon     the strong line under the name ("Now at Deltares…")
       supervisor the small person card (a student's supervisor)
       chips      the row of little pills
       image      the portrait plate (src / alt / credit / caption)
       buttons    the person's own buttons — Email, CV, Scholar (a
                  single "button" is accepted as well)
       details    label/value rows — [ { label, value } ] or the short
                  form { "Position": "…" }; they always close the head
       email      the address printed under the buttons

     Nothing is required: whatever is missing is simply not drawn, and a
     person with no words at all gets no head — just their content
     elements. The portrait sits at the left on wide screens and above
     the words on narrow ones (css/style.css). Relative button links are
     joined to the page ("../") and a .pdf opens in the site's own
     reader, the same rule the outputs use. */
  var PROFILE_WORDS = [
    "eyebrow", "position", "name", "role", "subtitle", "summary",
    "ribbon", "now", "supervisor", "supervisedBy", "supervisors",
    "supervisorLabel", "honours", "honors", "fellowship", "honorary_title_or_titles", "chips",
    "name_as_exactly_as_in_category_file", "summary", "add_affiliations",
    "affiliation_heading", "affiliation_subtitle", "add_single_line_information",
    "add_expandable_information", "expandable_information_row_label",
    "affiliations", "affiliation",
    "image", "details", "more", "buttons", "button", "email", "head", "structure"
  ];

  /* The pieces that take the whole width under the words: the rows that
     are always on show, and the groups that stay folded until asked. */
  var FULL_WIDTH_PIECES = ["portrait", "details", "more"];

  /* One drawer per head piece. */
  var HEAD_PIECES = {
    portrait: headPortrait,
    eyebrow: headEyebrow,
    name: headName,
    honours: headHonours,
    role: headRole,
    note: headNote,
    ribbon: headRibbon,
    people: headPeople,
    pills: headPills,
    affiliations: headAffiliations,
    socials: headSocials,
    email: headEmail
  };

  /* The four structures. The pills the cards carry are not repeated here:
     the head holds what a card cannot — an honour, other affiliations,
     the address, the buttons — and the address comes before them. */
  var STRUCTURES = {
    senior: ["portrait", "eyebrow", "name", "honours", "note", "affiliations", "email", "socials", "details", "more"],
    researcher: ["portrait", "eyebrow", "name", "honours", "note", "affiliations", "email", "socials", "details", "more"],
    student: ["portrait", "eyebrow", "name", "honours", "note", "affiliations", "email", "socials", "details", "more"],
    alumni: ["portrait", "eyebrow", "name", "honours", "ribbon", "note", "affiliations", "email", "socials", "details", "more"]
  };

  /* Which structure suits a roleType — used when the page does not name
     one. Anyone the team file lists as alumni gets the alumni structure,
     whatever degree they left with. */
  var ROLE_STRUCTURE = {
    pi: "senior",
    professor: "senior",
    lead: "senior",
    engineer: "senior",
    postdoc: "researcher",
    phd: "student",
    msc: "student",
    undergrad: "student",
    highschool: "student"
  };

  function structureFor(roleType, isAlumni) {
    if (isAlumni) return "alumni";
    return ROLE_STRUCTURE[String(roleType || "").toLowerCase().trim()] || "senior";
  }

  function profilePage(data, opts) {
    data = data || {};
    opts = opts || {};
    var head = profileHead(data, opts);
    var shape = headRecipe(data, opts);
    /* A supervisor is not a head piece: a student's cards stand as their
       own band under the head — the same block a profile's "Works closely
       with" uses — unless a custom `head` asks for the piece itself. */
    var supervisors = data.supervisor || data.supervisedBy || data.supervisors;
    var supervisorBand = (supervisors && shape.recipe.indexOf("people") === -1)
      ? peopleHtml({
          heading: data.supervisor_label || "Supervised by",
          intro: data.supervisor_text || data.supervisorLine || "",
          people: supervisors
        }, opts)
      : "";
    return [
      head ? band(head, opts, false, "900") : "",
      supervisorBand,
      renderFlow(data, {
        reserved: PROFILE_WORDS,
        root: opts.root,
        base: opts.base,
        viewer: opts.viewer || "article.html?url=../",
        focusLabel: opts.focusLabel,
        bandClass: opts.bandClass,
        team: opts.team,
        profile: true
      })
    ].filter(Boolean).join("\n");
  }

  /* The pieces a head is made of, however the person named their structure
     (or a `head` list of their own). */
  function headRecipe(data, opts) {
    var structure = String((opts && opts.structure) || (data && data.structure) || "senior").toLowerCase();
    if (!STRUCTURES[structure]) structure = "senior";
    var recipe = (window.CWL && data && Array.isArray(data.head) && data.head.length
      ? data.head
      : STRUCTURES[structure])
      .map(function (name) { return String(name || "").toLowerCase().trim(); })
      .filter(function (name) {
        return FULL_WIDTH_PIECES.indexOf(name) > -1 || Object.prototype.hasOwnProperty.call(HEAD_PIECES, name);
      });
    if (!recipe.length) recipe = STRUCTURES[structure];
    return { structure: structure, recipe: recipe };
  }

  /* The head: the portrait plate, the pieces the structure asks for, and
     the detail rows closing it across both columns. */
  function profileHead(data, opts) {
    opts = opts || {};
    var shape = headRecipe(data, opts);
    var structure = shape.structure;
    var recipe = shape.recipe;

    var pic = recipe.indexOf("portrait") > -1 ? (normalizeImages(data.image)[0] || null) : null;
    var words = recipe.map(function (name) {
      if (FULL_WIDTH_PIECES.indexOf(name) > -1) return "";
      return HEAD_PIECES[name](data, opts) || "";
    }).filter(Boolean);
    var details = recipe.indexOf("details") > -1
      ? profileDetails(data.add_single_line_information || data.details)
      : "";
    var more = recipe.indexOf("more") > -1
      ? profileGroups(data.add_expandable_information || data.more)
      : "";
    if (!pic && !words.length && !details && !more) return "";

    var out = ['  <div class="cw-profile cw-profile--' + esc(structure) + (pic ? "" : " cw-profile--no-portrait") + '">'];
    if (pic) out.push(headPortrait(data, opts, pic));
    out.push('    <div class="cw-profile__words">');
    Array.prototype.push.apply(out, words);
    out.push("    </div>");
    /* The rows and the folded groups close the head as one block, so no
       gap comes between a row and the group that opens under it. */
    var foot = [details, more].filter(Boolean);
    if (foot.length) {
      out.push('    <div class="cw-profile__foot">');
      Array.prototype.push.apply(out, foot);
      out.push("    </div>");
    }
    out.push("  </div>");
    return out.join("\n");
  }

  /* --- the head pieces --------------------------------------------- */
  function headPortrait(data, opts, pic) {
    pic = pic || normalizeImages(data.image)[0];
    if (!pic) return "";
    /* `"zoom": false` (or `"lightbox": false`) keeps the portrait out of
       the lightbox: it is simply a picture, with no pointer to open it. */
    var zoom = pic.zoom !== false;
    return [
      '    <div class="cw-profile__portrait">',
      '      <div class="relative">',
      '        <img class="w-full h-auto' + (zoom ? " cursor-zoom-in" : "") + '" loading="eager" alt="' + esc(pic.alt || "") + '" src="' + esc(srcUrl(pic.src, opts)) + '"' + (zoom ? lightboxAttrs(pic, null, 0, opts) : "") + " />",
      "      </div>",
      /* the credit is a line inside the plate, under the picture — the
         same strip the home page's plates carry — not a tag on the photo */
      captionRow(pic.caption, pic.credit),
      "    </div>"
    ].filter(Boolean).join("\n");
  }

  /* The label above the name: the person's own word, else their position,
     else the card's role line — never a bare "Profile" when we know who
     they are. */
  function headEyebrow(data) {
    return labelHtml(data.eyebrow || data.position || data.role, "");
  }

  function headName(data) {
    var name = data.name_as_exactly_as_in_category_file != null
      ? data.name_as_exactly_as_in_category_file
      : data.name;
    if (!name) return "";
    return '      <h1 class="font-headline-lg text-[2.225rem] sm:text-[2.875rem] leading-[1.1] tracking-tight text-on-surface">' + esc(name) + "</h1>";
  }

  /* The distinctions that hang under the name — a named chair, a
     fellowship, a prize ("MacDowell Fellow"). A line of its own, in the
     serif italic, so an honour never has to be crammed into the name or
     the position above it. "honors" and "fellowship" read as well, and a
     list makes one line of them ("MacDowell Fellow · Marie Curie
     Fellow"). */
  function headHonours(data) {
    var list = toArray(data.honorary_title_or_titles || data.honours || data.honors || data.fellowship)
      .map(function (h) { return h == null ? "" : String(h).trim(); })
      .filter(Boolean);
    if (!list.length) return "";
    return '      <p class="cw-profile__honours">' + formatText(esc(list.join(" \u00b7 "))) + "</p>";
  }

  function headRole(data) {
    if (!data.role) return "";
    return '      <span class="block font-label-md text-label-md uppercase tracking-[0.2em] text-secondary mt-space-md">' + esc(data.role) + "</span>";
  }

  function headNote(data) {
    var note = data.summary || data.summary || data.subtitle;
    if (!note) return "";
    return '      <p class="mt-space-md font-body-lg text-body-lg text-on-surface-variant leading-relaxed cw-profile-summary">' + formatText(esc(note)) + "</p>";
  }

  /* The ribbon: the one strong line under the name — "Now at Deltares,
     Utrecht" for someone who has left, "Recruiting PhD students" for
     someone who has not. */
  function headRibbon(data) {
    var text = data.ribbon || data.now || "";
    if (!text) return "";
    return '      <p class="cw-profile__ribbon">' + formatText(esc(text)) + "</p>";
  }

  /* The supervisor's cards, standing where a postdoc's pitch stands — the
     same label and the same little person cards the flow's "Works closely
     with" band uses, so a student's head and the page below it read
     alike. */
  function headPeople(data, opts) {
    var list = data.supervisor || data.supervisedBy || data.supervisors;
    if (!list) return "";
    var cards = personCardsHtml(list, opts);
    if (!cards) return "";
    return [
      '      <div class="cw-profile__people">',
      "        " + labelHtml(data.supervisor_label, "Supervised by"),
      cards,
      "      </div>"
    ].join("\n");
  }

  function headPills(data) {
    if (!data.chips || !data.chips.length || !window.CWL || !window.CWL.chipRowHtml) return "";
    return "      " + window.CWL.chipRowHtml(data.chips, true);
  }

  /* The person's other doors: one bold line naming an appointment
     ("Affiliate Faculty Member"), then the places it is held in, a line
     each.

     One appointment, written long:
       { "heading": "Affiliate Faculty Member", "places": [ … ] }
     or as a list whose first line is the bold one:
       [ "Affiliate Faculty Member", "Center for …", "Department of …" ]

     Two or more, one block each — a list:
       [ { "heading": "Affiliate Faculty Member", "places": [ … ] },
         { "heading": "Visiting Professor", "places": [ … ] } ]
     or a map of appointment to places, which reads the shortest:
       { "Affiliate Faculty Member": [ "Center for …", "Department of …" ],
         "Visiting Professor": [ "Department of Environmental Systems
         Science, ETH Zürich" ] } */
  function headAffiliations(data) {
    var blocks = affiliationBlocks(data.add_affiliations || data.affiliations || data.affiliation);
    if (!blocks.length) return "";

    var out = ['      <div class="cw-profile__affiliations">'];
    blocks.forEach(function (block) {
      out.push('        <div class="cw-profile__affiliationBlock">');
      if (block.heading) {
        out.push('          <p class="cw-profile__affiliation">' + formatText(esc(block.heading)) + "</p>");
      }
      block.places.forEach(function (place) {
        out.push('          <p class="cw-profile__affiliationPlace">' + formatText(esc(place)) + "</p>");
      });
      out.push("        </div>");
    });
    out.push("      </div>");
    return out.join("\n");
  }

  /* The keys that mark an object as ONE appointment rather than a map of
     several (the same idea as the folded groups' own reserved words). */
  var AFFILIATION_WORDS = ["affiliation", "affiliation_info", "affiliation_heading", "affiliation_subtitle", "heading", "role", "title", "label", "places", "at", "lines", "where", "items"];

  /* Every appointment written in the value, as { heading, places } — the
     shapes above, mixed freely. */
  function affiliationBlocks(value) {
    var out = [];
    function text(v) { return v == null ? "" : String(v).trim(); }
    function placeList(v) { return toArray(v).map(text).filter(Boolean); }
    function addBlock(entry) {
      var heading = text(entry.affiliation || entry.affiliation_heading || entry.heading || entry.role || entry.title || entry.label);
      var places = placeList(entry.affiliation_info || entry.affiliation_subtitle || entry.places || entry.at || entry.lines || entry.where || entry.items);
      if (heading || places.length) out.push({ heading: heading, places: places });
    }
    function add(entry, first) {
      if (entry == null || entry === "") return;
      if (typeof entry === "string" || typeof entry === "number") {
        /* the short form: the first line names the appointment, the rest
           are the places it is held in */
        if (!out.length) out.push({ heading: "", places: [] });
        if (first && !out[0].heading && !out[0].places.length) out[0].heading = text(entry);
        else out[0].places.push(text(entry));
        return;
      }
      if (Array.isArray(entry)) {
        placeList(entry).forEach(function (place) { add(place, false); });
        return;
      }
      if (typeof entry !== "object") return;
      var isOne = false;
      AFFILIATION_WORDS.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(entry, key)) isOne = true;
      });
      if (isOne) { addBlock(entry); return; }
      /* a map: each key names an appointment, its value the places */
      Object.keys(entry).forEach(function (key) {
        var v = entry[key];
        var places = (v && typeof v === "object" && !Array.isArray(v))
          ? placeList(v.affiliation_info || v.affiliation_subtitle || v.places || v.at || v.lines || v.where || v.items)
          : placeList(v);
        var heading = text(key);
        if (heading || places.length) out.push({ heading: heading, places: places });
      });
    }
    if (Array.isArray(value)) value.forEach(function (entry, i) { add(entry, i === 0); });
    else add(value, true);
    return out;
  }

  function headSocials(data, opts) {
    var actions = personActions(data, opts);
    if (!actions) return "";
    return '      <div class="cw-profile__actions">' + actions + "</div>";
  }

  function headEmail(data) {
    if (!data.email) return "";
    return '      <div class="mt-space-md">' + window.CWL.emailCopyHtml(data.email) + "</div>";
  }

  /* The person's own ways out, drawn as the square icon buttons the team
     cards carry (js/helpers' .member-link): one square per action, each
     with the word it would have printed kept for the screen reader and
     for the tooltip. The square's drawing comes from the same drawer the
     cards use (js/helpers.js → socialIconHtml), which reads the word —
     "Email" → the envelope, "CV" → the document, "Google Scholar" → the
     scholar mark — or a drawing a button names itself (`icon`: any file
     in assets/icons/). Drawn this way, a head's buttons and a card's are
     the same squares. */
  function personActions(data, opts) {
    var source = data.buttons || data.button;
    var items = toArray(source).map(function (b) {
      return typeof b === "string" ? { text: b } : (b && (b.text || b.label) ? b : null);
    }).filter(Boolean);

    // Auto-generate buttons from cv if no buttons provided
    if (!items.length) {
      var autoItems = [];
      if (data.cv) {
        autoItems.push({ text: "CV", link: data.cv, icon: "cv" });
      }
      items = autoItems;
    }

    // Auto-generate additional social buttons from known fields
    var socialFields = {
      googlescholar: { text: "Google Scholar", icon: "scholar", new_tab: true },
      orcid: { text: "ORCID", icon: "orcid", new_tab: true },
      linkedin: { text: "LinkedIn", icon: "linkedin", new_tab: true },
      github: { text: "GitHub", icon: "github", new_tab: true },
      gitlab: { text: "GitLab", icon: "gitlab", new_tab: true },
      twitter: { text: "Twitter", icon: "x", new_tab: true },
      x: { text: "X", icon: "x", new_tab: true },
      bluesky: { text: "Bluesky", icon: "bluesky", new_tab: true },
      mastodon: { text: "Mastodon", icon: "mastodon", new_tab: true },
      website: { text: "Website", icon: "globe", new_tab: true },
      globe: { text: "Website", icon: "globe", new_tab: true },
      homepage: { text: "Website", icon: "globe", new_tab: true },
      researchgate: { text: "ResearchGate", icon: "researchgate", new_tab: true },
      academia: { text: "Academia.edu", icon: "academia", new_tab: true },
      zenodo: { text: "Zenodo", icon: "zenodo", new_tab: true },
      figshare: { text: "Figshare", icon: "figshare", new_tab: true },
      mendeley: { text: "Mendeley", icon: "mendeley", new_tab: true },
      zotero: { text: "Zotero", icon: "zotero", new_tab: true },
      semantic_scholar: { text: "Semantic Scholar", icon: "semantic_scholar", new_tab: true },
      scholar: { text: "Google Scholar", icon: "scholar", new_tab: true },
      googlescholar: { text: "Google Scholar", icon: "scholar", new_tab: true },
      googlescholar_new: { text: "Google Scholar", icon: "scholar", new_tab: true },
      google_scholar: { text: "Google Scholar", icon: "scholar", new_tab: true }
    };

    Object.keys(socialFields).forEach(function (key) {
      var value = data[key];
      if (value && !items.some(function (item) { return item.icon === socialFields[key].icon; })) {
        items.push({
          text: socialFields[key].text,
          link: data[key],
          icon: socialFields[key].icon,
          new_tab: socialFields[key].new_tab
        });
      }
    });

    return items.map(function (b) {
      var label = String(b.text || b.label || "");
      var link = href(b.link || b.url);
      // If the link is a PDF, wrap it in the article.html viewer
      if (link && /\.pdf($|\?)/i.test(link)) {
        link = "article.html?url=" + encodeURIComponent(link);
      }
      if (link && window.CWL && window.CWL.outputHref) {
        link = window.CWL.outputHref(link, {
          base: opts.base,
          viewer: opts.viewer
        });
      }
      var inner = window.CWL.socialIconHtml(b.icon || label);
      var attrs = ' class="member-link" aria-label="' + esc(label) + '"' +
        (label ? ' title="' + esc(label) + '"' : "");
      if (link) attrs += ' href="' + esc(link) + '"';
      if (b.new_tab != null ? b.new_tab : /^https?:\/\//i.test(link)) attrs += ' target="_blank" rel="noopener noreferrer"';
      return link ? "<a" + attrs + ">" + inner + "</a>" : '<button type="button"' + attrs + ">" + inner + "</button>";
    }).join("\n      ");
  }

  /* The detail rows under the head: a hairline-separated label/value
     list (Position, Since, Now at, …). Written as a map, or as a list of
     {label, value}.

     A row may carry lines of its own — a degree's thesis, the supervisor
     it was done under — in "under": they are drawn inside the same cell,
     under the value, so they read as part of that row and never as rows
     of their own. The map form may hold them too, as the value of the
     row: "PhD, 2009": { "value": "…", "under": { "Thesis": "…" } }. */
  function detailRowsHtml(details, indent, rowClass) {
    indent = indent == null ? "      " : indent;
    rowClass = rowClass || "";
    var rows = [];
    function addRow(label, value, under) {
      if (label == null || value == null || String(value).trim() === "") return;
      rows.push({ label: label, value: value, under: under || null });
    }
    function underOf(row) {
      return row.expandable_item_right_column_secondary_information || row.under || row.below || row.rows || null;
    }
    if (Array.isArray(details)) {
      details.forEach(function (row) {
        if (!row || typeof row !== "object") return;
        /* A simple row:
           { "expandable_item_left_column_info": "PhD, 2009",
             "expandable_item_right_column_primary_information": "…" }.
           The older left/right and label/value names still read. */
        var left = row.expandable_item_left_column_info != null
          ? row.expandable_item_left_column_info
          : (row.left != null ? row.left
            : (row.label != null ? row.label : (row.name != null ? row.name : row.key)));
        var right = row.expandable_item_right_column_primary_information != null
          ? row.expandable_item_right_column_primary_information
          : (row.right != null ? row.right
            : (row.value != null ? row.value : row.text));
        addRow(left, right, underOf(row));
      });
    } else if (details && typeof details === "object") {
      Object.keys(details).forEach(function (key) {
        var value = details[key];
        if (value == null) return;
        /* "PhD, 2009": { "value": "…", "under": { "Thesis": "…" } } */
        if (typeof value === "object" && !Array.isArray(value) && value.value != null) {
          addRow(key, value.value, underOf(value));
          return;
        }
        addRow(key, value);
      });
    }
    if (!rows.length) return "";
    var out = [];
    rows.forEach(function (r) {
      var sub = r.under ? detailRowsHtml(r.under, indent + "    ", " cw-profile__row--under") : "";
      /* A value may be written as a list of lines: the first carries the
         voice, the ones under it step back a shade — a degree's title,
         then the university it was taken at. */
      var lines = (Array.isArray(r.value) ? r.value : [r.value])
        .map(function (line) { return line == null ? "" : String(line).trim(); })
        .filter(function (line) { return line !== ""; });
      var value = formatText(esc(lines.shift() || ""));
      lines.forEach(function (line) {
        value += '<span class="cw-profile__valueLine">' + formatText(esc(line)) + "</span>";
      });
      out.push(indent + '<div class="cw-profile__row' + rowClass + '">');
      out.push(indent + '  <dt class="font-label-sm text-label-sm uppercase tracking-widest text-secondary">' + esc(r.label) + "</dt>");
      out.push(indent + '  <dd class="font-body-md text-body-md text-on-surface">' + value +
        (sub ? '\n' + indent + '    <dl class="cw-profile__under">\n' + sub + '\n' + indent + "    </dl>" : "") + "</dd>");
      out.push(indent + "</div>");
    });
    return out.join("\n");
  }

  /* The details block: the rows that are always on show. */
  function profileDetails(details) {
    var rows = detailRowsHtml(details);
    if (!rows) return "";
    return '    <dl class="cw-profile__details">\n' + rows + "\n    </dl>";
  }

  /* The words that name a group rather than a row inside it. */
  var GROUP_WORDS = ["expandable_information_row_label", "add_information_to_expandable_item", "label", "name", "title", "open", "rows", "items", "details", "fields"];

  /* --- the folded groups --------------------------------------------
     The facts a visitor asks for only now and then — honours and
     recognition, previous appointments, education. Each group is a
     native <details>, so it opens on a click or from the keyboard with no
     JavaScript, and the head stays the length it is until somebody asks
     for more.

     A group is { "label": "Education", "rows": { "PhD, 2009": "…" } } —
     "items", "details" or "fields" read as well as "rows", and the rows
     may be written inline beside the label; "open": true starts a group
     expanded. The short form names the group as the key:
     { "Education": { "PhD, 2009": "…" } } */
  function profileGroups(more) {
    var groups = [];
    function add(label, rows, open) {
      label = label == null ? "" : String(label).trim();
      if (!label || !rows || !detailRowsHtml(rows)) return;
      groups.push({ label: label, rows: rows, open: !!open });
    }

    if (Array.isArray(more)) {
      more.forEach(function (g) {
        if (!g || typeof g !== "object") return;
        var label = g.expandable_information_row_label || g.label || g.name || g.title;
        var rows = g.add_information_to_expandable_item || g.rows || g.items || g.details || g.fields;
        if (!rows) {
          /* rows written inline beside the label */
          rows = {};
          Object.keys(g).forEach(function (key) {
            if (GROUP_WORDS.indexOf(key) === -1) rows[key] = g[key];
          });
        }
        add(label, rows, g.open);
      });
    } else if (more && typeof more === "object") {
      Object.keys(more).forEach(function (key) { add(key, more[key], false); });
    }
    if (!groups.length) return "";

    var out = ['    <div class="cw-profile__more">'];
    groups.forEach(function (g) {
      out.push('      <details class="cw-profile__group"' + (g.open ? " open" : "") + ">");
      out.push('        <summary class="cw-profile__groupHead">');
      out.push('          <span class="cw-profile__groupLabel">' + esc(g.label) + "</span>");
      out.push('          ' + window.CWL.iconHtml("expand_more", "cw-profile__groupIcon"));
      out.push("        </summary>");
      out.push('        <dl class="cw-profile__rows">');
      out.push(detailRowsHtml(g.rows, "          "));
      out.push("        </dl>");
      out.push("      </details>");
    });
    out.push("    </div>");
    return out.join("\n");
  }

  /* --- a row of small person cards ----------------------------------
     One drawer for every face that stands beside a name: the head's
     "people" piece (a student's supervisor) and the "add_people" element
     (a group, the people behind a project). A card is a face, a name and
     a line under it. Given no address of its own, the card carries
     data-profile-slug instead, and the page hands it the person's profile
     once it has confirmed the file exists (§19) — the same rule the team
     cards follow, so a name never becomes a dead link.

     The card's own words are "position", "image_path" and
     "profile_link"; the older "role", "photo" and "link" (and
     "external_link"/"url") still read. */
  function personCardsHtml(list, opts) {
    var team = opts && opts.team ? opts.team : { current: [], alumni: [], groups: [] };
    var allPeople = [].concat(team.current || [], team.alumni || []);
    (team.current || []).forEach(function (p) { if (p) p._category = "current"; });
    (team.alumni || []).forEach(function (p) { if (p) p._category = "alumni"; });
    (team.groups || []).forEach(function (g) {
      (g.add_people_to_category_defined_above || []).forEach(function (p) {
        if (p) p._category = g.main_category_name;
      });
      allPeople = allPeople.concat(g.add_people_to_category_defined_above || []);
    });

    var people = toArray(list).map(function (p) {
      return typeof p === "string"
        ? { name: p }
        : (p && typeof p === "object" && (p.name || p.text) ? p : null);
    }).filter(Boolean);
    if (!people.length) return "";

    var cards = people.map(function (p) {
      var name = String(p.name || p.text || "");
      var role = p.position || p.role || p.subtitle || p.about || "";
      var photo = p.image_path || p.photo || p.image || "";
      var linkValue = p.profile_link || p.external_link || p.link || p.url || "";
      var link = href(linkValue);
      var external = /^https?:\/\//i.test(link);
      var slug = p.profile || p.slug ||
        (window.CWL && window.CWL.personSlug ? window.CWL.personSlug(name) : "");

      /* Auto-lookup from team data when photo/role not provided */
      if (!photo || !role) {
        var match = allPeople.find(function (tp) { return window.CWL.profileSlug(tp) === slug; });
        if (match) {
          if (!photo) {
            var rawPhoto = match.image_path || match.photo || match.image || "";
            photo = rawPhoto && window.CWL.teamImageSrc
              ? window.CWL.teamImageSrc(rawPhoto, match._category)
              : rawPhoto;
          }
          if (!role) role = match.position || match.role || match.subtitle || match.about || "";
        }
      }

      var tag = (link || slug) ? "a" : "div";
      var attrs = ' class="cw-person"';
      if (link) {
        attrs += ' href="' + esc(link) + '"';
        if (external) attrs += ' target="_blank" rel="noopener noreferrer"';
      }
      else if (slug) attrs += ' data-profile-slug="' + esc(slug) + '"';

      var nameHtml = esc(name) +
        (external ? window.CWL.iconHtml("arrow_outward", "cw-person__ext") : "");
      var inner = [
        photo ? '        <span class="cw-person__photo"><img loading="lazy" alt="' + esc(window.CWL.altText) + '" src="' + esc(srcUrl(photo, opts)) + '" /></span>' : "",
        '        <span class="cw-person__text">',
        '          <span class="cw-person__name">' + nameHtml + "</span>",
        role ? '          <span class="cw-person__role">' + esc(role) + "</span>" : "",
        "        </span>"
      ].filter(Boolean).join("\n");
      return "      <" + tag + attrs + ">\n" + inner + "\n      </" + tag + ">";
    });

    return "      <div class=\"cw-people\">\n" + cards.join("\n") + "\n      </div>";
  }

  /* --- add_people -----------------------------------------------------
     The faces behind a piece of work: a supervisor, a group, a team.
     String | { name, position, image_path,
     profile_link } | array of either. `profile_link` (or
     `external_link` / `link` / `url`) makes an outside person's card a
     door, opening in a new tab. A card with no link points at the
     person's profile page if there is one — [{ "name": "Prof. Katherine Bennett" }].

     The block may carry a line of its own as well — "Co-supervised with
     the bio-materials group", "Mentored by A, and working with B" —
     written as `"intro"` (or the older
     `"text"`/`"note"`/`"line"`), standing between the title and the cards.
     The title is `"heading"` (older `"label"`), and
     the cards are `"people"` (older `"items"`). */
  function peopleHtml(value, opts) {
    var obj = (value && !Array.isArray(value)) ? value : null;
    var cards = personCardsHtml((obj && (obj.people || obj.items)) || value, opts);
    /* a line of the block's own — "Co-supervised with the bio-materials
       group", "Mentored by A and working with B" — written as
       "intro" (or "text"/"note"/"line"),
       standing between the title and the cards */
    var line = obj
      ? String(obj.intro || obj.text || obj.note || obj.line || "").trim()
      : "";
    if (!cards && !line) return "";
    return band(
      '      <div class="cw-people-block">\n' +
      labelHtml(obj && (obj.heading || obj.label)) +
      (line ? '      <p class="cw-people__line">' + formatText(esc(line)) + "</p>" : "") +
      cards +
      "\n      </div>",
      opts
    );
  }

  /* --- timeline ------------------------------------------------------
     A dated path — "BSc Botany" → "MSc Ecology" → "joined the lab" — drawn
     as a hairline rail with one step per entry, in the same centred 720px
     measure the focus rows above it use, so the path sits under them
     rather than hugging the reading column's left edge. An entry is a
     string or { timeline_item_date, timeline_item_title,
     timeline_item_text } (year reads as well as date). The older
     `date` / `title` / `text` / `label` / `items` names still read. */
  function timelineHtml(value, opts) {
    var obj = (value && !Array.isArray(value)) ? value : null;
    var raw = (obj && (obj.items_of_the_timeline || obj.items || obj.steps)) || value;
    var steps = toArray(raw).map(function (s) {
      return typeof s === "string"
        ? { title: s }
        : (s && typeof s === "object" &&
           (s.timeline_item_title != null || s.timeline_item_text != null ||
            s.title != null || s.text != null || s.what != null) ? s : null);
    }).filter(Boolean);
    if (!steps.length) return "";

    var rows = steps.map(function (s) {
      var when = s.timeline_item_date != null
        ? s.timeline_item_date
        : (s.date || s.year || s.when || "");
      var title = s.timeline_item_title != null
        ? s.timeline_item_title
        : (s.title != null ? s.title : s.what);
      var note = s.timeline_item_text != null ? s.timeline_item_text : s.text;
      return [
        '      <li class="cw-timeline__step">',
        when ? '        <span class="cw-timeline__when font-label-sm text-label-sm uppercase tracking-widest text-secondary">' + esc(String(when)) + "</span>" : "",
        '        <span class="cw-timeline__what font-body-lg text-body-lg text-on-surface">' + formatText(esc(title || "")) + "</span>",
        note && title ? '        <span class="cw-timeline__note font-body-sm text-body-sm text-on-surface-variant">' + formatText(esc(note)) + "</span>" : "",
        "      </li>"
      ].filter(Boolean).join("\n");
    });

    var label = obj && (obj.heading != null ? obj.heading : obj.label);
    return band(
      labelHtml(label, "Path") +
      '    <ol class="cw-timeline">\n' + rows.join("\n") + "\n    </ol>",
      opts,
      false,
      "720"
    );
  }

  /* --- publications --------------------------------------------------
     A short list of papers, drawn as the site's own output rows — the
     same drawer the Publications & Outputs page uses (js/helpers.js →
     outputRowHtml), so a paper looks the same wherever it is shown: the
     index, the picture plate, the chips, the title with its byline and
     meta, and the row's buttons.

     An item is { year, title, where, link } — "venue", "journal" and
     "source" read as the line on the chip, and a plain string is a
     title. Anything else the outputs file gives an item (type, authors,
     meta, image, pinned) is drawn too when it is written here.

     The element is `add_publication_or_more` (older `publications` and
     `publication` still read). The block's section label is
     `publication_section_title` (older `publication_title` / `label`);
     an item's own title is `publication_title_to_include` (older
     `publication_title`, `title`, `publication` and `name`). Items live
     under `publication_titles` (older `items`, `papers`, `list`, or the
     one-item `publication` shorthand):
       { "add_publication_or_more": {
           "publication_section_title": "Selected publications",
           "publication_titles": [
             { "publication_title_to_include": "A paper title" }
           ] } }

     A profile page also accepts an author's name ("publications":
     "Michael Carter") and pulls that author's papers out of
     data/outputs/publications.json before drawing (js/profile.js); that list travels
     with the outputs file's own colours and words (categories, tones,
     pinnedLabel, publisherLabel), so the chips keep matching that
     page. */
  function publicationItem(p) {
    if (typeof p === "string") return p ? { title: p } : null;
    if (!p || typeof p !== "object") return null;
    var title = firstValue(p, [
      "publication_title_to_include",
      "publication_title",
      "title",
      "publication",
      "name"
    ]);
    if (!title) return null;
    if (p.title === title) return p;
    var copy = {};
    Object.keys(p).forEach(function (key) { copy[key] = p[key]; });
    copy.title = title;
    return copy;
  }

  function publicationsHtml(value, opts) {
    var obj = (value && !Array.isArray(value) && typeof value === "object") ? value : null;
    var list = obj
      ? firstValue(obj, [
          "publication_titles",
          "items",
          "papers",
          "list",
          "publication"
        ])
      : null;
    var items = toArray(list != null ? list : value).map(publicationItem).filter(Boolean);
    if (!items.length) return "";

    var rowOpts = {
      base: (opts && opts.root) || "",
      viewer: (opts && opts.viewer) || "",
      /* A profile's papers are the person's own — nothing is pinned here
         (the Outputs page, which orders its list, keeps the chip). */
      is_pinned: false,
      /* a profile's papers are not the page's featured/pinned showcase */
      is_featured: false,
      categories: obj && obj.categories,
      tones: obj && obj.tones,
      pinnedLabel: obj && obj.pinnedLabel,
      featuredLabel: obj && obj.featured_tag_label,
      featuredBackground: obj && (obj.featured_tag_background_colour != null
        ? obj.featured_tag_background_colour
        : obj.featured_tag_background),
      publisherLabel: obj && (obj.external_link_label_for_outputs != null
        ? obj.external_link_label_for_outputs
        : obj.publisherLabel)
    };
    var reverse = !!(obj && (
      obj.reverse_numbering === true ||
      obj.reverseNumbering === true ||
      String(obj.numbering || "").toLowerCase() === "reverse"
    ));

    /* How many papers stand on the page at once, and whether the year
       pills are drawn. A profile opens at three and grows its own year
       filter; a block written elsewhere shows everything unless it says
       otherwise. Either may be written on the block:
         "per_page": 3      (0 = show every paper)
         "show_year_filter": true */
    var perPage = (opts && opts.profile) ? 3 : 0;
    var yearFilter = !!(opts && opts.profile);
    if (obj) {
      var perPageValue = firstValue(obj, ["per_page", "papers_per_page"]);
      if (perPageValue != null) perPage = Math.max(0, parseInt(perPageValue, 10) || 0);
      var filterValue = firstValue(obj, ["show_year_filter", "year_filter"]);
      if (filterValue != null) {
        yearFilter = !(filterValue === false || filterValue === 0 ||
          /^(false|no|off|0)$/i.test(String(filterValue).trim()));
      }
    }

    var rows = items.map(function (paper, i) {
      var rowOptsForItem = {};
      Object.keys(rowOpts).forEach(function (k) { rowOptsForItem[k] = rowOpts[k]; });
      rowOptsForItem.number = i + 1;
      var row = window.CWL.outputRowHtml(paper, i, rowOptsForItem);
      var year = paper && paper.year != null ? String(paper.year) : "";
      return '      <li class="cw-pubs__item"' +
        (year ? ' data-year="' + esc(year) + '"' : "") + ">\n" +
        row.split("\n").map(function (line) {
          return "  " + line;
        }).join("\n") + "\n      </li>";
    });

    var sectionTitle = obj
      ? firstValue(obj, [
          "publication_section_title",
          "publication_title",
          "label"
        ])
      : "";

    /* The year pills come from the list itself, newest first, so there is
       nothing to maintain when a paper is added. A single year stands
       alone — the pill is that year, already active, with no "All years"
       to fall back to; two or more put "All years" first. */
    var years = [];
    items.forEach(function (paper) {
      var y = paper && paper.year != null ? String(paper.year).trim() : "";
      if (/^\d{4}$/.test(y) && years.indexOf(y) === -1) years.push(y);
    });
    years.sort().reverse();
    var yearBar = (yearFilter && years.length)
      ? '    <div class="cw-pubs__years" data-pubs-years>\n' +
        (years.length > 1
          ? '      <button type="button" class="filter-btn active" data-year="all">All years</button>\n'
          : "") +
        years.map(function (y) {
          return '      <button type="button" class="filter-btn' +
            (years.length === 1 ? " active" : "") + '" data-year="' + esc(y) + '">' + esc(y) + "</button>";
        }).join("\n") +
        "\n    </div>"
      : "";

    var pager = (perPage > 0 && items.length > perPage)
      ? '    <div class="cw-pubs__pager" data-pubs-pager hidden>\n' +
        '      <button type="button" class="cw-pubs__step" data-pubs-prev disabled>Previous</button>\n' +
        '      <span class="cw-pubs__count" data-pubs-count aria-live="polite"></span>\n' +
        '      <button type="button" class="cw-pubs__step" data-pubs-next>Next</button>\n' +
        "    </div>"
      : "";

    var listAttrs = ' class="cw-pubs"' + " data-pubs-list" +
      (perPage > 0 ? ' data-per-page="' + perPage + '"' : "") +
      (reverse ? ' data-reverse="true"' : "");

    return band(
      labelHtml(sectionTitle, "Selected publications") +
      '    <div class="cw-pubs__block" data-pubs-block>\n' +
      (yearBar ? yearBar + "\n" : "") +
      "    <ul" + listAttrs + ">\n" + rows.join("\n") + "\n    </ul>" +
      (pager ? "\n" + pager : "") +
      "\n    </div>",
      opts
    );
  }

  /* --- publication lists: year pills and pages of three ------------
     A profile's list opens three papers at a time and carries a year
     filter built from the list itself. Both are drawn by
     publicationsHtml; this only turns them. Rows the reader cannot see
     keep their place in the document, so nothing is fetched again. */
  function startPublicationLists(root) {
    var lists = (root || document).querySelectorAll("[data-pubs-list]");
    if (!lists.length) return;

    Array.prototype.forEach.call(lists, function (list) {
      var block = list.closest("[data-pubs-block]") || list.parentElement;
      var items = Array.prototype.slice.call(list.querySelectorAll(".cw-pubs__item"));
      if (!items.length) return;
      var perPage = parseInt(list.getAttribute("data-per-page"), 10) || 0;
      var reverse = list.getAttribute("data-reverse") === "true";
      var yearBar = block.querySelector("[data-pubs-years]");
      var pager = block.querySelector("[data-pubs-pager]");
      var countEl = block.querySelector("[data-pubs-count]");
      var prev = block.querySelector("[data-pubs-prev]");
      var next = block.querySelector("[data-pubs-next]");
      /* A lone year pill is the whole list, so it starts picked. With
         "All years" present, the list starts there. */
      var yearButtons = yearBar
        ? Array.prototype.slice.call(yearBar.querySelectorAll(".filter-btn"))
        : [];
      var state = {
        year: yearButtons.length === 1
          ? (yearButtons[0].getAttribute("data-year") || "all")
          : "all",
        page: 1
      };

      function matches(item) {
        return state.year === "all" || item.getAttribute("data-year") === state.year;
      }

      function apply() {
        var matched = items.filter(matches);
        var total = matched.length;
        var pages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1;
        if (state.page > pages) state.page = pages;
        if (state.page < 1) state.page = 1;
        var start;
        var end;
        if (perPage && reverse) {
          end = Math.max(0, total - (state.page - 1) * perPage);
          start = Math.max(0, end - perPage);
        } else {
          start = perPage ? (state.page - 1) * perPage : 0;
          end = perPage ? Math.min(start + perPage, total) : total;
        }

        items.forEach(function (item) { item.style.display = "none"; });
        matched.slice(start, end).forEach(function (item, i) {
          item.style.display = "";
          var num = item.querySelector("[data-index]");
          if (num) {
            var n = start + i + 1;
            num.textContent = n < 10 ? "0" + n : String(n);
          }
        });

        if (countEl) {
          countEl.textContent = total
            ? (start + 1) + "\u2013" + end + " of " + total
            : "0 of 0";
        }
        if (pager) pager.hidden = pages <= 1;
        if (prev) prev.disabled = state.page <= 1;
        if (next) next.disabled = state.page >= pages;
      }

      if (yearBar) {
        yearBar.addEventListener("click", function (e) {
          var btn = e.target.closest(".filter-btn");
          if (!btn || !yearBar.contains(btn)) return;
          Array.prototype.forEach.call(yearBar.querySelectorAll(".filter-btn"), function (b) {
            b.classList.toggle("active", b === btn);
          });
          state.year = btn.getAttribute("data-year") || "all";
          state.page = 1;
          apply();
        });
      }
      if (prev) {
        prev.addEventListener("click", function () {
          if (state.page > 1) {
            state.page -= 1;
            apply();
          }
        });
      }
      if (next) {
        next.addEventListener("click", function () {
          state.page += 1;
          apply();
        });
      }

      apply();
    });
  }

  /* --- slideshow behaviour (crossfade, dots, pause, reduced motion) - */
  function startSlideshows(root) {
    var boxes = root.querySelectorAll("[data-slideshow]");
    if (!boxes.length) return;
    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    Array.prototype.forEach.call(boxes, function (box) {
      var slides = box.querySelectorAll(".cw-slide");
      if (slides.length < 2) return;
      var plate = box.closest("[data-slide-plate]") || box.parentElement;
      var intervalMs = parseInt(plate.getAttribute("data-slide-interval"), 10);
      if (!intervalMs || intervalMs < 500) intervalMs = 5000; // safety floor
      var dots = plate.querySelectorAll("[data-slide-dot]");
      var countEl = plate.querySelector("[data-slide-count]");
      var capEl = plate.querySelector("[data-slide-caption]");
      var creditEl = plate.querySelector("[data-slide-credit]");
      var total = slides.length;
      var i = 0, timer = null;

      function pad(n) { return n < 10 ? "0" + n : String(n); }

      function show(n) {
        i = ((n % total) + total) % total;
        Array.prototype.forEach.call(slides, function (s, k) {
          s.style.opacity = k === i ? "1" : "0";
          s.style.pointerEvents = k === i ? "" : "none";   /* only the shown slide is clickable */
          s.tabIndex = k === i ? 0 : -1;
          if (k === i) s.removeAttribute("aria-hidden");
          else s.setAttribute("aria-hidden", "true");
        });
        Array.prototype.forEach.call(dots, function (d, k) {
          d.classList.toggle("is-active", k === i);
          if (k === i) d.setAttribute("aria-current", "true");
          else d.removeAttribute("aria-current");
        });
        if (countEl) countEl.textContent = pad(i + 1) + " / " + pad(total);
        if (capEl) capEl.textContent = slides[i].getAttribute("data-cap") || "";
        if (creditEl) {
          var credit = slides[i].getAttribute("data-credit") || "";
          creditEl.textContent = credit;
          creditEl.hidden = !credit; // no credit on this slide = no black tag
        }
      }

      function play() {
        if (reduce || timer) return;
        timer = window.setInterval(function () { show(i + 1); }, intervalMs);
      }

      function stop() {
        if (timer) { window.clearInterval(timer); timer = null; }
      }

      Array.prototype.forEach.call(dots, function (d) {
        d.addEventListener("click", function () {
          show(parseInt(d.getAttribute("data-i"), 10) || 0);
          stop();
          play();
        });
      });
      plate.addEventListener("mouseenter", stop);
      plate.addEventListener("mouseleave", play);
      plate.addEventListener("focusin", stop);
      plate.addEventListener("focusout", play);

      show(0);
      play();
    });
  }

  window.CWL_ELEMENTS = {
    formatText: formatText,
    renderFlow: renderFlow,
    contentPage: contentPage,
    profilePage: profilePage,
    structureFor: structureFor,
    structures: STRUCTURES,
    lightboxAttrs: lightboxAttrs,
    mountSlideshows: startSlideshows,
    mountPublicationLists: startPublicationLists,
    mountEquations: startEquations
  };
})();
