/* ------------------------------------------------------------------
   aboutpage.js — pages/about.html, the editorial "About" page.

   Seven numbered movements, then the closing call to action:
     01 Who We Are            05 Our Approach
     02 Meet Our PI           06 Our Impact in Numbers
     03 What We Do            07 Our Lab in Action
     04 A Quote from Our PI

   Every movement opens with the same header — a large ghost numeral
   against a hairline, the movement's name in spaced capitals, then its
   heading (Newsreader) and, where there is no heading, a serif lede.
   That repeating header is what gives the page its rhythm and its
   hierarchy: numeral → name → statement → content.

   Layouts alternate so the eye keeps moving:
     01  opening spread — display headline, then the story in one
         measured column under it
     02  portrait left, message + biography right
     03  a statement centred in the band, then one wide plate
     04  the quote at display size on the dark ground, ruled off from its source
     05  two columns of text, chips beneath
     06  figures left, framed plate right
     07  a centred paragraph, then the carousel with the button beneath it
     —   a dark closing band

   One movement borrows its words so nothing is written twice:
     03 reads the research-area titles from data/edit_research_section.json — the
        same file the home page's "Explore Our Research" section uses —
        so a stub card borrows its title from its deep file
        (data/research/<individual_research_area_file_id>.json) and the
        list is never blank.
   Movement 02 reads only the `principal_investigator_section` block in
   data/about/edit_about_us_page.json; nothing on this page falls back to the team
   file. An absent key simply leaves that element out.

   Every movement is optional: delete its block and the band goes quiet.
   The words stay in data/about/edit_about_us_page.json; the shells stay wordless.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_URL = "../data/about/edit_about_us_page.json";
  var AREAS_URL = "../data/edit_research_section.json";
  var AREAS_DIR = "../data/research/";
  var IMG = "../assets/images/about_us/";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;

  function firstValue(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] != null) return obj[keys[i]];
    }
    return undefined;
  }

  function normalizeButton(button, prefix) {
    if (!button || typeof button !== "object") return button;
    var out = {};
    Object.keys(button).forEach(function (k) { out[k] = button[k]; });
    var p = prefix ? prefix + "_" : "";
    out.text = firstValue(button, [p + "label", "button_label", "text", "label"]);
    out.link = firstValue(button, [p + "link", "button_link", "link"]);
    out.style = firstValue(button, [p + "style", "button_style", "style"]);
    out.size = firstValue(button, [p + "size", "button_size", "size"]);
    out.icon = firstValue(button, [p + "icon", "button_icon", "icon"]);
    out.width = firstValue(button, [p + "width", "button_width", "width"]);
    out.tracking = firstValue(button, [p + "tracking", "button_tracking", "tracking"]);
    if (button[p + "wide"] != null) out.wide = button[p + "wide"];
    else if (button.button_wide != null) out.wide = button.button_wide;
    return out;
  }

  /* These two About actions are fixed: the lab-in-action and closing CTA
     buttons are always the wide solid pill, so their JSON no longer needs
     style or size keys. */
  function forceWideSolid(button) {
    if (button && typeof button === "object") {
      button.style = "solid";
      button.size = "wide";
    }
    return button;
  }

  function piButtonPrefix(button) {
    var link = firstValue(button, [
      "principal_investigator_section_cv_button_link",
      "principal_investigator_section_email_button_link",
      "principal_investigator_section_meet_the_team_button_link",
      "principal_investigator_section_button_link",
      "button_link",
      "link"
    ]);
    if (isPdfLink(link)) return "principal_investigator_section_cv_button";
    if (isEmailLink(link)) return "principal_investigator_section_email_button";
    return "principal_investigator_section_meet_the_team_button";
  }

  function normalizeImage(image, prefix) {
    if (typeof image === "string") return { src: image };
    if (!image || typeof image !== "object") return image;
    var out = {};
    Object.keys(image).forEach(function (k) { out[k] = image[k]; });
    var p = prefix ? prefix + "_" : "";
    out.src = firstValue(image, [p + "name_or_path", "image_path", "src", "image"]);
    out.alt = firstValue(image, [p + "alt_text", "image_alt", "alt"]);
    out.caption = firstValue(image, [p + "caption", "image_caption", "caption"]);
    out.credit = firstValue(image, [p + "credit", "image_credit", "credit"]);
    out.zoom = firstValue(image, ["turn_on_or_off_image_magnification", "zoom"]);
    return out;
  }

  function normalizeMetric(metric) {
    if (!metric || typeof metric !== "object") return metric;
    var out = {};
    Object.keys(metric).forEach(function (k) { out[k] = metric[k]; });
    out.value = firstValue(metric, ["metric_value", "value"]);
    out.label = firstValue(metric, ["metric_label", "label"]);
    return out;
  }

  /* New About Us files use the same long, self-describing key style as
     data/edit_research_section.json. Older short keys remain fallbacks, so an existing
     file keeps rendering. */
  function normalizeAboutUs(raw) {
    raw = raw || {};
    var out = {};
    out.label = firstValue(raw, ["about_us_page_label", "label"]);
    out.pageTitle = firstValue(raw, ["about_us_page_title", "page_title"]);

    var whoRaw = raw.who_we_are_section || raw.who || {};
    var who = {};
    who.number = firstValue(whoRaw, ["who_we_are_section_number", "section_number", "number"]);
    who.eyebrow = firstValue(whoRaw, ["who_we_are_section_divider_label", "section_eyebrow", "eyebrow", "title"]);
    who.title = firstValue(whoRaw, ["section_title", "title"]);
    who.statement = firstValue(whoRaw, ["who_we_are_section_statement", "section_statement", "statement"]);
    who.heading = firstValue(whoRaw, ["section_heading", "heading"]);
    who.introduction = firstValue(whoRaw, ["section_introduction", "introduction"]);
    who.image = normalizeImage(
      whoRaw.who_we_are_section_image || whoRaw.section_image || whoRaw.image,
      "who_we_are_section_image"
    );
    who.paragraphs = firstValue(whoRaw, ["who_we_are_section_paragraphs", "section_paragraphs", "paragraphs"]);
    who.button = normalizeButton(
      whoRaw.who_we_are_section_button || whoRaw.section_button || whoRaw.button,
      "who_we_are_section_button"
    );
    /* The story button is always the wide 280px pill. */
    if (who.button) who.button.size = "wide";
    who.buttons = (whoRaw.section_buttons || whoRaw.buttons || []).map(normalizeButton);
    out.who = who;

    var piRaw = raw.principal_investigator_section || raw.pi || {};
    var pi = {};
    pi.number = firstValue(piRaw, ["principal_investigator_section_number", "section_number", "number"]);
    pi.title = firstValue(piRaw, ["principal_investigator_section_divider_label", "section_title", "title"]);
    pi.message = firstValue(piRaw, ["principal_investigator_section_message", "section_message", "message"]);
    pi.note = firstValue(piRaw, ["principal_investigator_section_note", "section_note", "note"]);
    pi.buttons = (piRaw.principal_investigator_section_buttons || piRaw.section_buttons || piRaw.buttons || [])
      .map(function (button) {
        var b = normalizeButton(button, piButtonPrefix(button));
        /* The PI's own call to action is always the wide accent pill. */
        if (b) {
          b.style = "accent";
          b.size = "wide";
        }
        return b;
      });
    pi.name = firstValue(piRaw, ["principal_investigator_name", "principal_investigator_section_name", "name"]);
    pi.subtitle = firstValue(piRaw, ["principal_investigator_section_subtitle", "principal_investigator_subtitle", "subtitle"]);
    pi.photo = firstValue(piRaw, ["principal_investigator_section_photo", "principal_investigator_photo", "photo"]);
    pi.photoCaption = firstValue(piRaw, ["principal_investigator_section_photo_caption", "principal_investigator_section_image_caption", "principal_investigator_photo_caption", "photo_caption", "image_caption"]);
    pi.photoCredit = firstValue(piRaw, ["principal_investigator_section_photo_credit", "principal_investigator_section_image_credit", "principal_investigator_photo_credit", "photo_credit", "image_credit"]);
    pi.bio = firstValue(piRaw, ["principal_investigator_section_biography", "principal_investigator_biography", "bio"]);
    pi.chips = firstValue(piRaw, ["principal_investigator_section_chips", "principal_investigator_chips", "chips"]);
    pi.zoom = firstValue(piRaw, ["principal_investigator_section_photo_magnification", "turn_on_or_off_photo_magnification", "zoom"]);
    out.pi = pi;

    var areasRaw = raw.what_we_do_section || raw.areas || {};
    var areas = {};
    areas.number = firstValue(areasRaw, ["what_we_do_section_number", "section_number", "number"]);
    areas.title = firstValue(areasRaw, ["what_we_do_section_divider_label", "what_we_do_section_title", "section_title", "title"]);
    areas.introduction = firstValue(areasRaw, ["what_we_do_section_introduction", "section_introduction", "introduction"]);
    areas.paragraphs = firstValue(areasRaw, ["what_we_do_section_paragraphs", "section_paragraphs", "paragraphs"]);
    areas.images = (areasRaw.what_we_do_section_images || areasRaw.section_images || areasRaw.images || [])
      .map(function (image) { return normalizeImage(image, "what_we_do_section_image"); });
    areas.image = normalizeImage(
      areasRaw.what_we_do_section_image || areasRaw.section_image || areasRaw.image,
      "what_we_do_section_image"
    );
    areas.columns = firstValue(areasRaw, ["what_we_do_section_number_of_columns_for_image_grid", "what_we_do_section_number_of_columns", "number_of_columns", "columns"]);
    areas.layout = firstValue(areasRaw, ["what_we_do_section_image_layout", "image_layout", "layout"]);
    areas.ratio = firstValue(areasRaw, ["what_we_do_section_image_ratio", "image_ratio", "ratio"]);
    areas.titles = firstValue(areasRaw, ["what_we_do_section_show_research_area_titles", "show_research_area_titles", "titles"]);
    areas.cards = firstValue(areasRaw, ["what_we_do_section_show_research_area_cards", "show_research_area_cards", "cards"]);
    areas.button = normalizeButton(
      areasRaw.what_we_do_section_button || areasRaw.section_button || areasRaw.button,
      "what_we_do_section_button"
    );
    out.areas = areas;

    var approachRaw = raw.our_approach_section || raw.approach || {};
    var approach = {};
    approach.number = firstValue(approachRaw, ["our_approach_section_number", "section_number", "number"]);
    approach.title = firstValue(approachRaw, ["our_approach_section_divider_label", "our_approach_section_title", "section_title", "title"]);
    approach.heading = firstValue(approachRaw, ["our_approach_section_heading", "section_heading", "heading"]);
    approach.intro = firstValue(approachRaw, ["our_approach_section_introduction", "section_introduction", "intro"]);
    approach.text = firstValue(approachRaw, ["our_approach_section_paragraphs", "section_paragraphs", "text"]);
    approach.chips = firstValue(approachRaw, ["our_approach_section_tags", "our_approach_section_chips", "section_chips", "chips"]);
    out.approach = approach;

    if (Array.isArray(raw.metrics)) {
      out.metrics = { items: raw.metrics.map(normalizeMetric) };
    } else {
      var metricsRaw = raw.impact_in_numbers_section || raw.metrics || {};
      out.metrics = {
        number: firstValue(metricsRaw, ["impact_in_numbers_section_number", "section_number", "number"]),
        title: firstValue(metricsRaw, ["impact_in_numbers_section_divider_label", "section_title", "title"]),
        items: (metricsRaw.impact_in_numbers_section_metrics || metricsRaw.impact_metrics || metricsRaw.items || []).map(normalizeMetric)
      };
    }

    var photoRaw = raw.impact_in_numbers_section_photo || raw.about_page_photo || raw.photo || {};
    out.photo = {
      image: firstValue(photoRaw, ["image_path", "image", "src"]),
      alt: firstValue(photoRaw, ["image_alt", "alt"]),
      plateLeft: firstValue(photoRaw, ["impact_in_numbers_section_photo_caption", "image_caption_left", "plateLeft"]),
      plateRight: firstValue(photoRaw, ["impact_in_numbers_section_photo_credit", "image_caption_right", "plateRight"]),
      caption: firstValue(photoRaw, ["image_caption", "caption"]),
      credit: firstValue(photoRaw, ["image_credit", "credit"]),
      zoom: firstValue(photoRaw, ["turn_on_or_off_image_magnification", "zoom"])
    };

    var actionRaw = raw.lab_in_action_section || raw.action || {};
    var action = {};
    action.number = firstValue(actionRaw, ["lab_in_action_section_number", "section_number", "number"]);
    action.title = firstValue(actionRaw, ["lab_in_action_section_divider_label", "section_title", "title"]);
    action.paragraph = firstValue(actionRaw, ["lab_in_action_section_introduction", "section_introduction", "paragraph"]);
    action.paragraphs = firstValue(actionRaw, ["lab_in_action_section_paragraphs", "section_paragraphs", "paragraphs"]);
    action.interval = firstValue(actionRaw, ["rotation_time_milliseconds", "lab_in_action_section_slideshow_time_interval", "slideshow_time_interval", "interval"]);
    action.slideLabel = firstValue(actionRaw, ["lab_in_action_section_slide_label", "slide_label"]);
    action.images = (actionRaw.images || actionRaw.section_images || actionRaw.images || []).map(normalizeImage);
    action.button = forceWideSolid(normalizeButton(actionRaw.lab_in_action_section_button || actionRaw.section_button || actionRaw.button, "lab_in_action_section_button"));
    out.action = action;

    var quoteRaw = raw.quote_section || raw.quote || {};
    out.quote = {
      number: firstValue(quoteRaw, ["quote_section_number", "section_number", "number"]),
      title: firstValue(quoteRaw, ["quote_section_divider_label", "section_title", "title"]),
      text: firstValue(quoteRaw, ["text", "text"]),
      author: firstValue(quoteRaw, ["quote_author", "author"]),
      role: firstValue(quoteRaw, ["quote_author_role", "role"])
    };

    var ctaRaw = raw.about_us_page_closing_call_to_action || raw.closing_call_to_action || raw.cta || {};
    var ctaButton = ctaRaw.about_us_page_closing_call_to_action_button || ctaRaw.call_to_action_buttons || ctaRaw.buttons || [];
    var ctaButtons = (Array.isArray(ctaButton) ? ctaButton : [ctaButton]).filter(function (b) {
      return b && typeof b === "object";
    });
    out.cta = {
      heading: firstValue(ctaRaw, ["about_us_page_closing_call_to_action_heading", "call_to_action_heading", "heading"]),
      text: firstValue(ctaRaw, ["about_us_page_closing_call_to_action_text", "call_to_action_text", "text"]),
      buttons: ctaButtons.map(function (b) {
        return forceWideSolid(normalizeButton(b, "about_us_page_closing_call_to_action_button"));
      })
    };

    return out;
  }

  /* A link written as "@name" is looked up in data/reference_link_list.json; anything
     else passes through untouched. */
  function resolve(value) {
    var s = String(value == null ? "" : value);
    return (window.CWL.link ? window.CWL.link(s) : s) || "#";
  }

  function num(i) {
    var n = String(i);
    return n.length < 2 ? "0" + n : n;
  }

  /* Bare filename → assets/images/about_us/; "path/name" → site root;
     http(s) as-is. */
  function imgSrc(src) {
    var s = String(src || "").trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/") return s;
    return window.CWL.imageSrc(s, IMG);
  }

  /* A picture's click-to-enlarge attributes — the same lightbox rule
     every other photograph on the site follows (js/helpers.js listens for
     [data-lightbox]). The whole set travels with each picture, so a grid
     or a carousel steps through its own pictures; `"zoom": false` on any
     one of them keeps it out of the overlay and out of the set. */
  function zoomAttrs(pic, set, at) {
    if (!pic || pic.zoom === false) return "";
    var E = window.CWL_ELEMENTS;
    if (!E || !E.lightboxAttrs) return "";
    var source = (Array.isArray(set) && set.length) ? set : [pic];
    var list = source.map(function (x) {
      return (x && typeof x === "object")
        ? { src: x.src || x.image || "", caption: x.caption || "", zoom: x.zoom }
        : { src: String(x || "") };
    });
    var index = source.indexOf(pic);
    if (index < 0) index = at || 0;
    var one = list[index] || { src: pic.src || pic.image || "", caption: pic.caption || "", zoom: pic.zoom };
    return E.lightboxAttrs(one, list, index, { root: "../", imageBase: IMG });
  }

  /* --- the movement header ------------------------------------------
     The repeating device the whole page hangs on: a hairline with the
     movement's name at the left and its large ghost numeral at the
     right, then the heading, then an optional meta line or lede. */
  function movementHead(block, opts) {
    opts = opts || {};
    var dark = !!opts.dark;
    var rule = dark ? "border-[#A69F8E]/25" : "border-outline-variant";
    var labelColor = dark ? "text-[#A69F8E]" : "text-secondary";
    var numColor = dark ? "text-[#A69F8E]/30" : "text-outline-variant";
    var headColor = dark ? "text-[#F5F2EB]" : "text-on-surface";
    var bodyColor = dark ? "text-[#CDC8BC]" : "text-on-surface-variant";
    var out = [];

    if (block.number || block.title) {
      out.push('  <div class="flex items-end justify-between gap-space-lg border-b ' + rule + ' pb-space-md">');
      if (block.title) {
        /* Normally a span, because a movement's heading is the line
           underneath. A block that passes `titleTag` makes the name
           itself the heading (movement 01, which has no other one). */
        var nameTag = opts.titleTag || "span";
        out.push('    <' + nameTag + ' class="font-label-md text-label-md uppercase tracking-[0.3em] ' + labelColor + '">' + esc(block.title) + "</" + nameTag + ">");
      }
      if (block.number) {
        out.push('    <span class="font-headline-lg text-[2.875rem] md:text-[3.625rem] leading-[0.7] ' + numColor + '">' + esc(block.number) + "</span>");
      }
      out.push("  </div>");
    }
    if (block.heading) {
      var tag = opts.level === "h1" ? "h1" : "h2";
      var headCenter = opts.center ? " text-center mx-auto"
        : (opts.centerSmall ? " text-center lg:text-left lg:mx-0" : "");
      var headStyle = opts.headingStyle ? ' style="' + esc(opts.headingStyle) + '"' : "";
      out.push('  <' + tag + ' class="mt-space-lg font-headline-lg ' + (opts.headingClass || "text-[1.875rem] md:text-[2.375rem] leading-[1.2]") + ' tracking-tight ' + headColor + headCenter + '"' + headStyle + '>' + esc(block.heading) + "</" + tag + ">");
    }
    if (block.meta) {
      var metaCenter = opts.center ? " text-center"
        : (opts.centerSmall ? " text-center lg:text-left" : "");
      out.push('  <p class="mt-space-sm font-label-md text-label-md uppercase tracking-[0.2em] ' + labelColor + metaCenter + '">' + esc(block.meta) + "</p>");
    }
    if (block.intro) {
      /* A movement with no heading gets its lede set in serif at the
         movement-heading size — the same size movement 04 sets "From
         molecule to catchment" in — so a movement opens at one size
         whether its headline is a `heading` or an `intro`. `center` sets
         that lede in the middle of the band (movement 03's statement). */
      var cls = block.heading
        ? "mt-space-md font-body-lg text-body-lg " + bodyColor + " leading-[1.75] max-w-[62ch]"
        : "mt-space-lg font-headline-lg text-[1.875rem] md:text-[2.375rem] leading-[1.2] tracking-tight " + bodyColor + " max-w-[58ch]";
      if (opts.center) cls += " mx-auto text-center";
      else if (opts.centerSmall) cls += " mx-auto text-center lg:mx-0 lg:text-left";
      out.push('  <p class="' + cls + '">' + esc(block.intro) + "</p>");
    }
    return out.join("\n");
  }

  function chipsHtml(chips, dark) {
    if (!chips.length) return "";
    var cls = dark
      ? "px-space-sm py-1 border border-[#A69F8E]/40 text-[#D5CEBF] font-label-sm text-label-sm uppercase tracking-widest"
      : "px-space-sm py-1 border border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest";
    var out = ['    <div class="flex flex-wrap gap-space-xs mt-space-lg justify-center lg:justify-start">'];
    chips.forEach(function (c) { out.push('      <span class="' + cls + '">' + esc(c) + "</span>"); });
    out.push("    </div>");
    return out.join("\n");
  }

  /* Button looks. `accent` is the warm sand button the home page's About
     section uses (§16), and `size: "wide"` is that same button's
     dimensions — a fixed 280px, taller, with wider tracking (see
     js/home-about.js, which is the source of these exact classes). On a
     dark band the roles invert so the solid button stays visible. */
  var BTN_FILL = {
    solid: {
      light: "bg-primary text-on-primary hover:bg-secondary",
      dark: "bg-[#F5F2EB] text-[#1B1C19] hover:bg-white"
    },
    accent: {
      light: "bg-[#C7BAA0] text-[#191917] hover:bg-[#D8CCB5]",
      dark: "bg-[#C7BAA0] text-[#191917] hover:bg-[#D8CCB5]"
    },
    outline: {
      light: "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low",
      dark: "border border-[#A69F8E]/40 text-[#F5F2EB] hover:bg-white/10"
    }
  };

  /* default = the page's small pill; wide = the home About button. */
  var BTN_SIZE = {
    default: { cls: "gap-space-xs px-space-lg py-space-sm tracking-[0.15em]", icon: "text-[16px]" },
    wide: { cls: "gap-2 w-[280px] max-w-full px-8 py-3.5 tracking-[0.18em] font-medium", icon: "text-sm" }
  };

  /* `"width": "wide"` sets the LENGTH OF THE ROW to the wide button's
     280px and lets the buttons that ask for it share that length between
     them — so two small pills side by side add up to the length of one
     wide button, and a lone one is exactly its length. It leaves each
     pill its own height and tracking. `"size": "wide"` already fixes a
     button's own length, so it is left alone here. */
  var BTN_ROW_WIDE = "w-[280px] max-w-full";

  /* `"tracking"` replaces the size's own letter-spacing, so a long label
     can still fit the fixed 280px pill on one line. The values are
     written out here so the stylesheet can see them; add one if you need
     another. Anything unlisted keeps the size's tracking. */
  var TRACKING = { "0.12em": "tracking-[0.12em]", "0.15em": "tracking-[0.15em]", "0.18em": "tracking-[0.18em]" };

  function wantsShare(b, isWide) {
    return !isWide && String(b.width || "").toLowerCase() === "wide";
  }

  function isWideSize(b) {
    return String(b.size || "").toLowerCase() === "wide" || b.wide === true;
  }

  /* A row of pills — solid by default, `"outline"` for the bordered one,
     `"accent"` for the warm sand call to action — with an optional
     Material Symbol on the right. An empty list draws nothing. */
  function btnRow(buttons, dark) {
    var list = (Array.isArray(buttons) ? buttons : [buttons]).filter(function (b) { return b && (b.text || b.label); });
    if (!list.length) return "";
    var side = dark ? "dark" : "light";
    var shares = list.some(function (b) { return wantsShare(b, isWideSize(b)); });
    var out = ['  <div class="flex flex-wrap gap-space-xs' + (shares ? " " + BTN_ROW_WIDE : "") + '">'];
    list.forEach(function (b) {
      var kind = String(b.style || "solid").toLowerCase();
      if (kind === "fill" || kind === "filled" || kind === "primary") kind = "solid";
      if (!BTN_FILL[kind]) kind = "solid";
      var wide = isWideSize(b);
      var size = BTN_SIZE[wide ? "wide" : "default"];
      var share = wantsShare(b, wide);
      var sizeCls = b.tracking ? size.cls.replace(/tracking-\[[^\]]+\]/, TRACKING[String(b.tracking).toLowerCase()] || "tracking-[0.18em]") : size.cls;
      out.push(
        '    <a class="inline-flex items-center justify-center ' + sizeCls + (share ? " flex-1 min-w-0" : "") + " " + BTN_FILL[kind][side] +
        ' transition-all font-label-md text-label-md uppercase" href="' + esc(resolve(b.link)) + '">' +
        esc(b.text || b.label || "") +
        (b.icon ? window.CWL.iconHtml(b.icon, size.icon) : "") +
        "</a>"
      );
    });
    out.push("  </div>");
    return out.join("\n");
  }

  /* --- 01 · Who We Are — the page's own header ---------------------
     Two ways of opening the page, chosen by which keys the `who` block
     carries:

     - with a `heading` (and/or an `introduction`) it draws the shared
       page opener, window.CWL.pageHero — the same component behind the
       labs, news, positions, outputs and research-area headers: eyebrow,
       big serif headline, then a short rule with the note at its foot on
       the right, closed by a full-width hairline;
     - without them it draws the movement header instead: the eyebrow in
       spaced capitals sitting on a hairline with everything below it,
       exactly how movements 02–07 open. The eyebrow is that header's h1,
       so the page always carries a heading.

     The story paragraphs run beneath either one, in a single measured
     column (the same 7-of-12 measure as movement 04's text), with an
     optional `who.image` in the 5-of-12 column beside them. The header
     is movement **01**, so `who.number` carries the digit and the
     movements below it run 02–07. */
  function renderWho(data) {
    var who = data.who || {};
    var paragraphs = Array.isArray(who.paragraphs) ? who.paragraphs : [];
    var pic = who.image || {};
    if (typeof pic === "string") pic = { src: pic };
    var picSrc = pic.src || pic.image || "";
    var eyebrow = who.eyebrow || who.title || data.label;
    var headline = who.heading || "";
    var intro = who.introduction || "";
    /* Buttons for the story: written as `button` (one) or `buttons` (a
       row). They draw under the last paragraph, in the story column. */
    var btns = Array.isArray(who.buttons) && who.buttons.length
      ? who.buttons.slice()
      : (who.button ? [who.button] : []);
    var out = [];
    if (headline || intro) {
      out.push(window.CWL.pageHero ? window.CWL.pageHero({ label: eyebrow, heading: headline, text: intro }) : movementHead({
        title: eyebrow,
        heading: headline,
        intro: intro
      }, {
        level: "h1",
        headingClass: "text-[2.225rem] sm:text-[2.875rem] md:text-[3.625rem] leading-[1.08]"
      }));
    } else {
      out.push('<div class="max-w-[1260px] mx-auto">');
      out.push(movementHead({ number: who.number, title: eyebrow }, { titleTag: "h1" }));
      out.push("</div>");
    }
    if (who.statement || paragraphs.length || picSrc || btns.length) {
      /* The story stands in the same measure as the headline above it —
         one column of 7-of-12 (movement 04's opening column) rather than
         a spread across the container. It is set the way running text is
         set in print: justified, the opening paragraph flush and each new
         one taking a 1.5em first-line indent. A `who.image` fills the
         5-of-12 column on the right — the same column the intro note sits
         in above the hairline — framed as a plate like the page's other
         photographs.

          `who.statement` opens that column, so the header's headline sits
          inside the story: above the paragraphs, beside the photograph,
          and set at the page-headline scale the news and position pages
          use for their `h1` (2.225rem / 2.875rem / 3.625rem). It is a
          sentence, not a title, so it stays a <p>. */
      out.push('<div class="max-w-[1260px] mx-auto mt-space-xl grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop">');
      if (who.statement || paragraphs.length || btns.length) {
        out.push('  <div class="lg:col-span-7 text-center lg:text-left">');
        if (who.statement) {
          out.push('    <p class="font-headline-lg text-[2.225rem] sm:text-[2.875rem] md:text-[3.625rem] leading-[1.2] tracking-tight text-on-surface mb-space-lg">' + esc(who.statement) + "</p>");
        }
        paragraphs.forEach(function (p, i) {
          out.push('    <p class="font-body-lg text-body-lg text-on-surface-variant leading-[1.8] text-center lg:text-justify mb-space-lg max-w-[62ch] mx-auto lg:mx-0' + (i ? " lg:indent-[1.5em]" : "") + '">' + esc(p) + "</p>");
        });
        if (btns.length) {
          /* The buttons close the story column. The last paragraph's own
             mb-space-lg collapses into this mt-space-xl, so the gap under
             the text is the page's usual 48px, not the two added up. */
          out.push('    <div class="mt-space-xl flex justify-center lg:block">' + btnRow(btns) + "</div>");
        }
        out.push("  </div>");
      }
      if (picSrc) {
        var caption = pic.caption || "";
        var credit = pic.credit || "";
        out.push('  <div class="lg:col-span-5 max-w-[480px] mx-auto">');
        out.push('    <div class="relative">');
        out.push('      <div class="absolute -bottom-5 -left-5 w-full h-full border border-outline-variant pointer-events-none cw-wireframe"></div>');
        out.push('      <div class="relative bg-surface-lowest p-3 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">');
        out.push('        <div class="relative overflow-hidden aspect-[4/5] bg-surface-container">');
        out.push('          <img class="w-full h-full object-cover' + (pic.zoom === false ? "" : " cursor-zoom-in") + '" loading="lazy" alt="' + esc(pic.alt || "") + '" src="' + esc(imgSrc(picSrc)) + '"' + zoomAttrs(pic, [pic], 0) + " />");
        if (credit) out.push('          <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary">' + esc(credit) + "</span>");
        out.push("        </div>");
        if (caption) {
          out.push('        <div class="pt-3 px-1 flex items-center justify-between gap-space-sm">');
          out.push('          <span class="font-body-sm text-body-sm text-on-surface-variant min-w-0">' + esc(caption) + "</span>");
          out.push("        </div>");
        }
        out.push("      </div>");
        out.push("    </div>");
        out.push("  </div>");
      }
      out.push("</div>");
    }
    return out.join("\n");
  }

  function cvHref(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return "";
    if (/^(https?:)?\/\//i.test(s)) return s;
    var path = s.indexOf("/") !== -1 ? s : "assets/documents/cv/" + s;
    if (path.charAt(0) === "/") return "article.html?url=" + encodeURIComponent(path);
    return "article.html?url=" + encodeURIComponent("../" + path);
  }

  function isPdfLink(value) {
    return /\.pdf(?:[?#].*)?$/i.test(String(value == null ? "" : value).trim());
  }

  function isEmailLink(value) {
    var s = String(value == null ? "" : value).trim();
    return /^mailto:/i.test(s) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function piButton(button, kind) {
    var out = {};
    Object.keys(button).forEach(function (k) { out[k] = button[k]; });
    var link = String(out.link || "").trim();
    if (kind === "cv") {
      out.link = cvHref(link);
      out.style = "fill";
      out.width = "wide";
      delete out.size;
    } else if (kind === "email") {
      out.link = /^mailto:/i.test(link) ? link : "mailto:" + link;
      out.style = "outline";
      out.width = "wide";
      delete out.size;
    } else {
      out.style = "accent";
      out.size = "wide";
    }
    return out;
  }

  /* --- 02 · Meet Our Principal Investigator ------------------------ */
  function renderPi(data) {
    var cfg = data.pi || {};
    var name = cfg.name || "";
    var subtitle = cfg.subtitle || "";
    var photo = cfg.photo || "";
    var photoCaption = cfg.photoCaption || "";
    var photoCredit = cfg.photoCredit || "";
    var bio = Array.isArray(cfg.bio) ? cfg.bio : [];
    var note = cfg.note || "";
    if (note) {
      /* A note written in the About file replaces the first biography
         paragraph here. With no note and no biography, the section has no
         body paragraph — nothing is borrowed from another file. */
      bio = [note].concat(bio.slice(1));
    }
    var chips = Array.isArray(cfg.chips) ? cfg.chips : [];
    var message = cfg.message || "";
    if (!name && !photo && !message && !bio.length && !(cfg.buttons && cfg.buttons.length)) return "";

    var out = ['<div class="max-w-[1260px] mx-auto">'];
    var nameSize = "clamp(2.75rem, 5vw, 3.5rem)";
    out.push(movementHead({
      number: cfg.number,
      title: cfg.title,
      heading: name,
      meta: subtitle
    }, {
      dark: true,
      centerSmall: true,
      headingStyle: nameSize ? "font-size:" + nameSize : ""
    }));
    out.push('  <div class="mt-space-xl grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">');

    if (photo) {
      out.push('    <div class="lg:col-span-5 max-w-[480px] mx-auto">');
      out.push('      <div class="relative">');
      out.push('        <div class="absolute -top-4 -right-4 w-full h-full border border-[#A69F8E]/30 pointer-events-none cw-wireframe"></div>');
      out.push('        <div class="relative bg-surface-lowest p-3 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">');
      out.push('          <div class="relative overflow-hidden aspect-[4/5] bg-surface-container">');
      out.push('            <img class="w-full h-full object-cover' + (cfg.zoom === false ? "" : " cursor-zoom-in") + '" alt="' + esc(window.CWL.altText) + '" src="' + esc(window.CWL.imageSrc(photo, IMG)) + '"' + zoomAttrs({ src: photo, caption: name, zoom: cfg.zoom }, null, 0) + " />");
      if (photoCredit) {
        out.push('            <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary pointer-events-none">' + esc(photoCredit) + "</span>");
      }
      out.push("          </div>");
      if (photoCaption) {
        out.push('          <div class="pt-3 px-1 flex items-center justify-start">');
        out.push('            <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary">' + esc(photoCaption) + "</span>");
        out.push("          </div>");
      }
      out.push("        </div>");
      out.push("      </div>");
      out.push("    </div>");
    }

    out.push('    <div class="lg:col-span-6 text-center lg:text-left ' + (photo ? "lg:col-start-7" : "") + '">');
    if (message) {
      out.push('      <p class="font-headline-md text-[1.325rem] md:text-[1.525rem] leading-[1.5] text-[#F5F2EB] max-w-[46ch] mx-auto lg:mx-0 lg:text-justify">' + esc(message) + "</p>");
    }
    bio.forEach(function (t) {
      out.push('      <p class="mt-space-lg font-body-lg text-body-lg text-[#CDC8BC] leading-[1.75] max-w-[62ch] mx-auto lg:mx-0 lg:text-justify">' + esc(t) + "</p>");
    });
    out.push(chipsHtml(chips, true));
    var allButtons = Array.isArray(cfg.buttons) ? cfg.buttons : [];
    var extra = allButtons.filter(function (b) { return b && (b.text || b.label); });
    var cvButtons = extra.filter(function (b) { return isPdfLink(b.link); });
    var emailButtons = extra.filter(function (b) { return isEmailLink(b.link); });
    var otherButtons = extra.filter(function (b) { return !isPdfLink(b.link) && !isEmailLink(b.link); });
    /* An empty label hides its button. No CV or email entry is recreated
       from another file, so the About file alone decides what appears. */
    var firstRow = [];
    /* A CV that ends in .pdf opens in the custom reader (pages/article.html).
       Both CV and e-mail ask for the wide row (`"width": "wide"`), so the
       pair spans the same length as the Meet the team button beneath it.
       A lone survivor stretches across that whole pair width. */
    cvButtons.forEach(function (b) { firstRow.push(piButton(b, "cv")); });
    emailButtons.forEach(function (b) { firstRow.push(piButton(b, "email")); });
    if (firstRow.length) out.push('      <div class="mt-space-xl flex justify-center lg:block">\n' + btnRow(firstRow, true) + "\n      </div>");
    if (otherButtons.length) {
      out.push('      <div class="mt-space-sm flex justify-center lg:block">\n' + btnRow(otherButtons.map(function (b) { return piButton(b, "other"); }), true) + "\n      </div>");
    }
    out.push("    </div>");
    out.push("  </div>");
    out.push("</div>");
    return out.join("\n");
  }

  /* The shapes a picture grid can take. "4:3" is the default: one shape
     every plate shares, which is what makes the rows line up. */
  var PIC_RATIO = {
    "4:3": "aspect-[4/3]", "3:2": "aspect-[3/2]", "16:9": "aspect-[16/9]",
    "1:1": "aspect-square", "square": "aspect-square",
    "4:5": "aspect-[4/5]", "3:4": "aspect-[3/4]",
    "natural": ""
  };

  /* One plate in movement 03's picture grid: the element engine's masonry
     frame — bordered white body, credit tag in the corner, caption
     beneath. `ratio` is a class like "aspect-[4/3]", or "" to keep the
     photo's own shape (which is what makes a masonry ragged). */
  function areaTile(im, ratio, set, at) {
    var out = [];
    out.push('      <div class="relative bg-surface-lowest p-3 md:p-4 border border-outline-variant shadow-[0_2px_16px_rgba(0,0,0,0.06)]">');
    out.push('        <div class="relative overflow-hidden' + (ratio ? " " + ratio + " bg-surface-container" : "") + '">');
    out.push('          <img class="' + (ratio ? "w-full h-full object-cover" : "w-full h-auto") + (im.zoom === false ? "" : " cursor-zoom-in") + '" loading="lazy" alt="' + esc(im.alt || "") + '" src="' + esc(imgSrc(im.src || im.image)) + '"' + zoomAttrs(im, set, at) + " />");
    if (im.credit) out.push('          <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary">' + esc(im.credit) + "</span>");
    out.push("        </div>");
    if (im.caption) {
      out.push('        <div class="pt-3 px-1 flex items-baseline justify-between gap-space-md">');
      out.push('          <span class="font-body-sm text-body-sm text-on-surface-variant min-w-0">' + esc(im.caption) + "</span>");
      out.push("        </div>");
    }
    out.push("      </div>");
    return out.join("\n");
  }

  /* --- 03 · What We Do ---------------------------------------------
     A statement set in the middle of the band, then one wide plate that
     carries the areas as a picture. The card row is kept in the file but
     is off unless `areas.cards` is true — see `renderAreas`. */
  var CARD_ROW = {
    1: "basis-full",
    2: "basis-full md:basis-[calc((100%_-_32px)/2)]",
    3: "basis-full md:basis-[calc((100%_-_64px)/3)]",
    4: "basis-full md:basis-[calc((100%_-_32px)/2)] xl:basis-[calc((100%_-_96px)/4)]"
  };

  function cardHtml(area, index, rowCls) {
    var card = window.CWL.researchCard;
    var id = card.id(area);
    var linked = !!id;
    var open = linked
      ? '      <a class="grow ' + rowCls + ' bg-surface-lowest border border-outline-variant p-7 flex flex-col justify-between group hover:border-on-surface transition-colors duration-200" href="' + esc(resolve("@area:" + id)) + '">'
      : '      <div class="grow ' + rowCls + ' bg-surface-lowest border border-outline-variant p-7 flex flex-col">';
    return [
      open,
      "        <div>",
      '          <div class="flex items-baseline justify-between gap-space-sm pb-space-md mb-space-lg border-b border-outline-variant">',
      '            <span class="font-headline-md text-[1.625rem] leading-none text-outline-variant group-hover:text-secondary transition-colors">' + num(index + 1) + "</span>",
      '            <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary text-right">' + esc(card.keyword(area) || "") + "</span>",
      "          </div>",
      '          <h3 class="font-headline-sm text-[1.625rem] leading-[1.25] text-on-surface">' + esc(card.title(area) || "") + "</h3>",
      '          <p class="mt-space-sm font-body-md text-body-md text-on-surface-variant leading-[1.65]">' + esc(card.introduction(area) || "") + "</p>",
      "        </div>",
      linked ? "      </a>" : "      </div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  function renderAreas(data, ctx) {
    var cfg = data.areas || {};
    var pic = cfg.image || {};
    if (typeof pic === "string") pic = { src: pic };
    var picSrc = pic.src || pic.image || "";
    /* A masonry needs a list: `"images": [ { "src", "alt", "caption",
       "credit" }, ... ]`. One `"image"` still draws the single plate. */
    var pics = (Array.isArray(cfg.images) ? cfg.images : []).filter(function (i) { return i && (i.src || i.image); });
    /* The areas themselves are read from the same file the home page's
       "Explore Our Research" section uses — titles only, one per line,
       each linking to its area page. Set `"titles": false` to drop them. */
    var cards = ctx.areas || [];
    var wantTitles = cfg.titles === true && cards.length > 0;
    /* The card row still exists, but the section draws pictures in its
       place. Ask for the cards back with `"cards": true`. */
    var shown = cfg.cards === true ? cards.slice(0, 4) : [];
    if (!shown.length && !cfg.title && !cfg.introduction && !picSrc && !pics.length && !wantTitles) return "";
    var rowCls = CARD_ROW[String(shown.length)] || CARD_ROW[3];
    var out = ['<div class="max-w-[1260px] mx-auto">'];
    out.push(movementHead({ number: cfg.number, title: cfg.title, intro: cfg.introduction }, { center: true }));
    /* `paragraphs` run under the centred lede — body text, justified in
       the reading measure, the block itself centred with the lede. */
    var paras = (Array.isArray(cfg.paragraphs) ? cfg.paragraphs : []).filter(function (t) { return String(t || "").trim(); });
    if (paras.length) {
      out.push('  <div class="mt-space-lg max-w-[900px] mx-auto">');
      paras.forEach(function (t, i) {
        out.push('    <p class="' + (i < paras.length - 1 ? "mb-space-lg " : "") + 'font-body-lg text-body-lg text-on-surface-variant leading-[1.8] text-center lg:text-justify">' + esc(t) + "</p>");
      });
      out.push("  </div>");
    }
    if (wantTitles) {
      out.push('  <div class="mt-space-xl max-w-[720px] mx-auto border-t border-outline-variant">');
      var card = window.CWL.researchCard;
      cards.forEach(function (a) {
        var title = card.title(a) || (a && a.name) || "";
        var id = card.id(a);
        if (id) {
          out.push('    <a class="group flex items-center justify-between gap-space-md py-4 border-b border-outline-variant" href="' + esc(resolve("@area:" + id)) + '">');
          out.push('      <span class="font-body-lg text-[1.4375rem] text-on-surface-variant group-hover:text-on-surface group-hover:underline underline-offset-4 transition-all">' + esc(title) + "</span>");
          out.push('      <span class="cw-icon cw-icon--arrow-outward text-label-md text-outline-variant shrink-0 group-hover:translate-x-1 group-hover:text-on-surface transition-all" aria-hidden="true"></span>');
          out.push("    </a>");
        } else {
          out.push('    <div class="flex items-center justify-between gap-space-md py-4 border-b border-outline-variant">');
          out.push('      <span class="font-body-lg text-[1.4375rem] text-on-surface-variant">' + esc(title) + "</span>");
          out.push("    </div>");
        }
      });
      out.push("  </div>");
    }
    if (pics.length) {
      /* Two ways of laying the photos out, chosen by `areas.layout`:
         **masonry** (the default) keeps every photo its own shape and
         flows them down the columns, so nothing is cropped — the browser
         balances the column heights, and pairing photos of like shapes
         in the data is what keeps the rows tidy. `"layout": "grid"`
         instead crops every plate to the one shape `ratio` names, which
         lines the rows up perfectly at the cost of the crop. */
      if (String(cfg.layout || "masonry").toLowerCase() === "grid") {
        var ratioKey = String(cfg.ratio || "4:3").trim().toLowerCase();
        var ratio = PIC_RATIO[ratioKey] != null ? PIC_RATIO[ratioKey] : PIC_RATIO["4:3"];
        out.push('  <div class="mt-space-xl max-w-[900px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-gutter items-start">');
        pics.forEach(function (im, i) {
          out.push('    <div class="relative">');
          out.push(areaTile(im, ratio, pics, i));
          out.push("    </div>");
        });
        out.push("  </div>");
      } else {
        var cols = String(cfg.columns || "").trim() === "3" ? "columns-1 sm:columns-2 lg:columns-3" : "columns-1 sm:columns-2";
        out.push('  <div class="mt-space-xl max-w-[900px] mx-auto ' + cols + ' gap-gutter">');
        pics.forEach(function (im, i) {
          out.push('    <div class="relative mb-gutter break-inside-avoid">');
          out.push(areaTile(im, "", pics, i));
          out.push("    </div>");
        });
        out.push("  </div>");
      }
    } else if (picSrc) {
      /* A centred plate, the same frame the page's other photographs
         wear: white body, soft shadow, offset wireframe, caption strip. */
      var caption = pic.caption || "";
      var credit = pic.credit || "";
      out.push('  <div class="mt-space-xl max-w-[900px] mx-auto">');
      out.push('    <div class="relative">');
      out.push('      <div class="absolute -bottom-5 -left-5 w-full h-full border border-outline-variant pointer-events-none cw-wireframe"></div>');
      out.push('      <div class="relative bg-surface-lowest p-3 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">');
      out.push('        <div class="overflow-hidden aspect-[16/9] bg-surface-container">');
      out.push('          <img class="w-full h-full object-cover' + (pic.zoom === false ? "" : " cursor-zoom-in") + '" loading="lazy" alt="' + esc(pic.alt || "") + '" src="' + esc(imgSrc(picSrc)) + '"' + zoomAttrs(pic, [pic], 0) + " />");
      out.push("        </div>");
      if (caption || credit) {
        out.push('        <div class="pt-3 px-1 flex items-center justify-between gap-space-sm">');
        out.push(caption ? '          <span class="font-body-sm text-body-sm text-on-surface-variant min-w-0">' + esc(caption) + "</span>" : "          <span></span>");
        out.push(credit ? '          <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant shrink-0">' + esc(credit) + "</span>" : "");
        out.push("        </div>");
      }
      out.push("      </div>");
      out.push("    </div>");
      out.push("  </div>");
    }
    if (shown.length) {
      out.push('  <div class="mt-space-xl flex flex-wrap gap-8">');
      shown.forEach(function (a, i) { out.push(cardHtml(a, i, rowCls)); });
      out.push("  </div>");
    }
    if (cfg.button && cfg.button.text) {
      out.push('  <div class="mt-space-xl flex justify-center">\n' + btnRow([cfg.button]) + "\n  </div>");
    }
    out.push("</div>");
    return out.join("\n");
  }

  /* --- 05 · Our Approach (light) ----------------------------------- */
  function renderApproach(data) {
    var a = data.approach || {};
    var text = Array.isArray(a.text) ? a.text : [];
    var chips = Array.isArray(a.chips) ? a.chips : [];
    if (!a.heading && !text.length && !chips.length) return "";
    var out = ['<div class="max-w-[1260px] mx-auto">'];
    out.push(movementHead(
      { number: a.number, title: a.title, heading: a.heading ? a.heading.toUpperCase() : "", intro: a.intro },
      { centerSmall: true }
    ));
    if (text.length || chips.length) {
      out.push('  <div class="mt-space-xl">');
      if (text.length) {
        /* The header's treatment, moved down here: two balanced columns of
           justified text. The opening paragraph stays flush; each new one
           takes a small first-line indent, the way running text is set in
           print. The chip list follows underneath, since the text no
           longer leaves a column standing beside it. */
        out.push('    <div class="columns-1 md:columns-2 gap-space-xl">');
        text.forEach(function (p, i) {
          out.push('      <p class="font-body-lg text-body-lg text-on-surface-variant leading-[1.8] text-justify mb-space-lg' + (i ? " lg:indent-[1.5em]" : "") + '">' + esc(p) + "</p>");
        });
        out.push("    </div>");
      }
      if (chips.length) out.push(chipsHtml(chips));
      out.push("  </div>");
    }
    out.push("</div>");
    return out.join("\n");
  }

  /* --- 05 · Our Impact in Numbers (dark) --------------------------- */
  function metricRow(m) {
    return [
      '        <div class="flex items-baseline justify-center lg:justify-start gap-space-md border-t border-[#A69F8E]/25 py-space-md">',
      '          <span class="font-headline-lg text-[2.625rem] md:text-[3.125rem] leading-none text-[#F5F2EB] w-28 shrink-0">' + esc(m.value) + "</span>",
      '          <span class="font-label-md text-label-md uppercase tracking-[0.2em] text-[#CDC8BC]">' + esc(m.label) + "</span>",
      "        </div>"
    ].join("\n");
  }

  function renderPlate(data) {
    var photo = data.photo || {};
    var metrics = data.metrics || {};
    var items = Array.isArray(metrics.items) ? metrics.items : (Array.isArray(data.metrics) ? data.metrics : []);
    if (!photo.image && !items.length) return "";
    var out = ['<div class="max-w-[1260px] mx-auto">'];
    out.push(movementHead({ number: metrics.number, title: metrics.title }, { dark: true }));
    out.push('  <div class="mt-space-xl grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-center">');
    if (items.length) {
      out.push('    <div class="lg:col-span-6">');
      items.forEach(function (m) { out.push(metricRow(m)); });
      out.push('      <div class="border-t border-[#A69F8E]/25"></div>');
      out.push("    </div>");
    }
    if (photo.image) {
      out.push('    <div class="lg:col-span-5 lg:col-start-8 max-w-[480px] mx-auto">');
      out.push('      <div class="relative">');
      out.push('        <div class="absolute -bottom-5 -right-5 w-full h-full border border-[#A69F8E]/30 pointer-events-none cw-wireframe"></div>');
      out.push('        <div class="relative bg-surface-lowest p-3 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">');
      out.push('          <div class="relative overflow-hidden aspect-[4/3] bg-surface-container">');
      out.push('            <img class="w-full h-full object-cover' + (photo.zoom === false ? "" : " cursor-zoom-in") + '" alt="' + esc(photo.alt || "") + '" src="' + esc(window.CWL.imageSrc(photo.image, IMG)) + '"' + zoomAttrs({ src: photo.image, caption: photo.caption, zoom: photo.zoom }, null, 0) + " />");
      if (photo.plateRight) out.push('            <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary">' + esc(photo.plateRight) + "</span>");
      out.push("          </div>");
      if (photo.plateLeft) {
        out.push('          <div class="pt-3 px-1">');
        out.push('            <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">' + esc(photo.plateLeft) + "</span>");
        out.push("          </div>");
      }
      out.push("        </div>");
      out.push("      </div>");
      out.push("    </div>");
    }
    out.push("  </div>");
    out.push("</div>");
    return out.join("\n");
  }

  /* --- 06 · Our Lab in Action -------------------------------------- */
  /* The carousel follows the same markup contract as the slideshow
     element (js/elements.js) so its behaviour is shared; only the frame
     and the width are the About page's own. mountSlideshows drives it. */
  function carouselHtml(images, interval, slideLabel) {
    var pics = images.map(function (i) {
      return { src: i.src || i.image || "", alt: i.alt || "", caption: i.caption || "", credit: i.credit || "", zoom: i.zoom };
    });
    var hasCredit = pics.some(function (p) { return p.credit; });
    var every = parseInt(interval, 10);
    if (!every || every < 500) every = 5000;
    var out = ['  <div class="relative" data-slide-plate data-slide-interval="' + every + '">'];
    out.push('    <div class="absolute -bottom-5 -left-5 w-full h-full border border-outline-variant pointer-events-none cw-wireframe"></div>');
    out.push('    <div class="relative bg-surface-lowest p-3 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">');
    out.push('      <div class="relative overflow-hidden aspect-[16/9] bg-surface-container" data-slideshow>');
    pics.forEach(function (p, i) {
      out.push('        <img class="cw-slide absolute inset-0 w-full h-full object-cover transition-opacity duration-700' + (p.zoom === false ? "" : " cursor-zoom-in") + '"' +
        ' style="opacity:' + (i === 0 ? "1" : "0") + '"' +
        (i === 0 ? ' alt="' + esc(p.alt) + '"' : ' alt="" aria-hidden="true" loading="lazy"') +
        ' data-cap="' + esc(p.caption) + '" data-credit="' + esc(p.credit) + '"' +
        ' src="' + esc(imgSrc(p.src)) + '"' + zoomAttrs(p, pics, i) + " />");
    });
    out.push("      </div>");
    if (hasCredit) {
      out.push('      <span class="absolute top-3 right-3 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary" data-slide-credit' + (pics[0].credit ? "" : " hidden") + "></span>");
    }
    out.push('      <div class="pt-3 px-1 flex items-end justify-between gap-space-sm">');
    out.push('        <span class="font-body-sm text-body-sm text-on-surface-variant min-w-0" data-slide-caption></span>');
    out.push('        <div class="flex items-center gap-space-md shrink-0">');
    out.push('          <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant" data-slide-count></span>');
    out.push('          <div class="flex gap-space-xs">');
    pics.forEach(function (p, i) {
      /* The dots' screen-reader name; the JSON may rename it, but the
         useful default no longer needs a line in the data file. */
      var dotLabel = String(slideLabel == null || slideLabel === ""
        ? "Photo {current} of {total}"
        : slideLabel)
        .replace(/\{current\}/g, i + 1)
        .replace(/\{total\}/g, pics.length);
      out.push('            <button type="button" class="slide-dot w-2 h-2' + (i === 0 ? " is-active" : "") +
        '" data-slide-dot data-i="' + i + '"' + (dotLabel ? ' aria-label="' + esc(dotLabel) + '"' : "") +
        (i === 0 ? ' aria-current="true"' : "") + "></button>");
    });
    out.push("          </div>");
    out.push("        </div>");
    out.push("      </div>");
    out.push("    </div>");
    out.push("  </div>");
    return out.join("\n");
  }

  function renderAction(data, ctx) {
    var cfg = data.action || {};
    var images = (Array.isArray(cfg.images) ? cfg.images : []).filter(function (i) { return i && (i.src || i.image); });
    if (!cfg.title && !cfg.paragraph && !images.length && !cfg.button) return "";
    var out = ['<div class="max-w-[1260px] mx-auto">'];
    /* The lede is centred like movement 03's, then the carousel sits
       centred at the plate width with the button beneath it. */
    out.push(movementHead({ number: cfg.number, title: cfg.title, intro: cfg.paragraph }, { center: true }));
    /* `paragraphs` run under the centred lede — body text, justified in
       the reading measure, the block itself centred with the lede. */
    var paras = (Array.isArray(cfg.paragraphs) ? cfg.paragraphs : []).filter(function (t) { return String(t || "").trim(); });
    if (paras.length) {
      out.push('  <div class="mt-space-lg max-w-[900px] mx-auto">');
      paras.forEach(function (t, i) {
        out.push('    <p class="' + (i < paras.length - 1 ? "mb-space-lg " : "") + 'font-body-lg text-body-lg text-on-surface-variant leading-[1.8] text-center lg:text-justify">' + esc(t) + "</p>");
      });
      out.push("  </div>");
    }
    if (images.length) {
      out.push('  <div class="mt-space-xl max-w-[900px] mx-auto">\n' + carouselHtml(images, cfg.interval, cfg.slideLabel) + "\n  </div>");
    }
    if (cfg.button && cfg.button.text) {
      out.push('  <div class="mt-space-xl flex justify-center">\n' + btnRow([cfg.button]) + "\n  </div>");
    }
    out.push("</div>");
    return out.join("\n");
  }

  /* --- 04 · A Quote from Our PI (dark) ---------------------------- */
  function renderQuote(data) {
    var q = data.quote || {};
    var text = q.text || "";
    if (!text) return "";
    var author = q.author || "";
    var role = q.role || "";
    var out = ['<div class="max-w-[1260px] mx-auto">'];
    out.push(movementHead({ number: q.number, title: q.title }, { dark: true }));
    out.push('  <figure class="mt-space-xl max-w-[1000px] mx-auto text-center">');
    out.push('    <blockquote class="font-headline-md text-[1.625rem] md:text-[2.125rem] leading-[1.4] text-[#F5F2EB]">\u201C' + esc(text) + '\u201D</blockquote>');
    out.push('    <figcaption class="mt-space-lg pt-space-md border-t border-[#A69F8E]/25 font-label-md text-label-md uppercase tracking-[0.2em] text-[#A69F8E]">' + esc(author) +
      (role ? '<span class="text-[#CDC8BC] tracking-normal normal-case"> \u2014 ' + esc(role) + "</span>" : "") + "</figcaption>");
    out.push("  </figure>");
    out.push("</div>");
    return out.join("\n");
  }

  /* --- closing CTA (dark) ----------------------------------------- */
  function renderCta(data) {
    var cta = data.cta || {};
    var buttons = Array.isArray(cta.buttons) ? cta.buttons : [];
    if (!cta.heading && !buttons.length) return "";
    var out = ['<div class="max-w-[1260px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-end">'];
    out.push('  <div class="lg:col-span-7 text-center lg:text-left">');
    if (cta.heading) out.push('    <h2 class="font-headline-lg text-[1.875rem] md:text-[2.625rem] leading-[1.15] text-[#F5F2EB]">' + esc(cta.heading) + "</h2>");
    if (cta.text) out.push('    <p class="mt-space-sm font-body-lg text-body-lg text-[#CDC8BC] lg:text-justify">' + esc(cta.text) + "</p>");
    out.push("  </div>");
    if (buttons.length) out.push('  <div class="lg:col-span-5 flex justify-center lg:justify-end">\n' + btnRow(buttons, true) + "\n  </div>");
    out.push("</div>");
    return out.join("\n");
  }

  var BANDS = {
    "about-hero": renderWho,
    "about-pi": renderPi,
    "about-areas": renderAreas,
    "about-approach": renderApproach,
    "about-plate": renderPlate,
    "about-action": renderAction,
    "about-quote": renderQuote,
    "about-cta": renderCta
  };

  /* --- borrowing: the research cards ------------------------------- */

  /* A stub card (just an individual_research_area_file_id) borrows its
     words from the area's deep file — the same rule the home page
     follows. */
  function borrowAreas(cards) {
    var card = window.CWL.researchCard;
    var stubs = cards.filter(function (a) {
      return a && card.id(a) && !String(card.title(a) || "").trim();
    });
    if (!stubs.length) return Promise.resolve(cards);
    return Promise.all(stubs.map(function (a) {
      return fetch(AREAS_DIR + encodeURIComponent(card.id(a)) + ".json", { cache: "no-store" })
        .then(function (res) { return res.ok ? res.text().then(window.CWL.parseJson) : null; })
        .catch(function () { return null; });
    })).then(function (deeps) {
      stubs.forEach(function (a, i) {
        var d = deeps[i];
        if (!d) return;
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
      return cards;
    });
  }

  /* Transitional: the page's nested sections fill the aliases the
     renderer reads (`who`, `pi`, `areas`, `approach`, `metrics`, `photo`,
     `action`, `quote`, `cta`). The inner keys are already short. */
  function liftPage(data) {
    var page = data && data.about_page;
    if (!page || typeof page !== "object") return data;
    if (page.label != null) data.about_us_page_label = page.label;
    if (page.title != null) data.about_us_page_title = page.title;
    var s = page.sections || {};
    if (s.who_we_are) data.who = s.who_we_are;
    if (s.principal_investigator) data.pi = s.principal_investigator;
    if (s.what_we_do) data.areas = s.what_we_do;
    if (s.our_approach) data.approach = s.our_approach;
    if (s.quote) data.quote = s.quote;
    if (s.lab_in_action) data.action = s.lab_in_action;
    if (s.closing) {
      data.cta = {
        heading: s.closing.heading,
        text: s.closing.text,
        buttons: s.closing.button ? [s.closing.button] : []
      };
    }
    if (s.impact) {
      if (s.impact.section) data.metrics = s.impact.section;
      if (s.impact.photo) {
        data.photo = {
          image_path: s.impact.photo.image_path,
          image_alt: s.impact.photo.image_alt,
          impact_in_numbers_section_photo_caption: s.impact.photo.caption,
          impact_in_numbers_section_photo_credit: s.impact.photo.credit
        };
      }
    }
    return data;
  }

  function boot() {
    if (!document.getElementById("about-hero")) return;

    Promise.all([
      loadJson(DATA_URL),
      loadJson(AREAS_URL),
      window.CWL.loadLinks ? window.CWL.loadLinks() : null
    ]).then(function (loaded) {
      var data = normalizeAboutUs(liftPage(loaded[0] || {}));
      var research = loaded[1] || null;
      var cards = research && Array.isArray(research.individual_research_area_cards)
        ? research.individual_research_area_cards
        : [];
      /* Movement 03 draws its area titles from this file, so the deep
         files are always consulted — a stub card's title lives in its
         deep file
         (data/research/<individual_research_area_file_id>.json),
         exactly as the home page's research section does. */
      return borrowAreas(cards).then(function (areas) {
        var ctx = { areas: areas };
        Object.keys(BANDS).forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          var html = BANDS[id](data, ctx);
          /* No content means no band: remove the whole section so its
             background and padding do not leave an empty stripe. */
          if (!html) {
            el.remove();
            return;
          }
          el.innerHTML = html;
        });
        var action = document.getElementById("about-action");
        if (action && window.CWL_ELEMENTS) {
          window.CWL_ELEMENTS.mountSlideshows(action);
          if (window.CWL_ELEMENTS.mountPublicationLists) window.CWL_ELEMENTS.mountPublicationLists(action);
        }
        window.CWL.setPageTitle(data.pageTitle || data.label || "");
      });
    });
  }

  boot();
})();
