/* ------------------------------------------------------------------
   home-team.js — Section 3 ("MEET <PI>" editorial split) of
   index.html.

   Words:  data/edit_team_section.json -> home_page_team_section (all content)
           data/team/current.json -> home-featured members (cards only)
           data/team/alumni.json -> home-featured alumni (fallback cards)
------------------------------------------------------------------ */
(function () {
  "use strict";

  var TEAM_URL = "data/edit_team_section.json";
  var CURRENT_URL = "data/team/current.json";
  var ALUMNI_URL = "data/team/alumni.json";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;

  /* The "Meet the PI" slideshow's own photos live in one folder. A bare
     name ("team3") is read from there, with .jpg added when no extension
     is written; a full path or URL is used as written. */
  var HERO_IMG_BASE = "assets/images/team_and_alumni/home_team_section/";
  function heroPhotoSrc(value) {
    var s = String(value || "").trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/" || s.indexOf("data:") === 0) return s;
    if (s.indexOf("/") > -1) return window.CWL.imageSrc(s, "");
    if (!/\.[a-z0-9]+$/i.test(s)) s += ".jpg";
    return window.CWL.imageSrc(s, HERO_IMG_BASE);
  }

  function pickHomeFeatured(people) {
    var featured = (people || []).filter(function (m) {
      return m && (m.show_in_home_team === true ||
        m.feature_this_profile_in_home_section === true ||
        m.homeFeatured === true || m.is_featured === true);
    });
    return featured.length ? featured : (people || []);
  }

  function cardHtml(m, isSingle) {
    var slug = window.CWL.profileSlug ? window.CWL.profileSlug(m) : "";
    var displayName = m.add_name != null ? m.add_name : (m.name || "");
    var teamPhoto = m.image_path || m.photo;
    var subCategory = m.relevant_sub_category_name != null ? m.relevant_sub_category_name : m.roleType;
    var isHomeFeatured = m.show_in_home_team === true || m.feature_this_profile_in_home_section === true || m.homeFeatured === true;
    var honour = m.honorary_title_or_titles || m.honours || m.honors || m.fellowship;
    var rawText = m.text != null ? m.text : m.summary;
    var cardText = Array.isArray(rawText) ? rawText.join(" ") : (rawText == null ? "" : String(rawText));
    var link = slug
      ? '          <a class="member-card__link link" data-profile-slug="' + esc(slug) +
        '" aria-label="' + esc("Open the profile of " + displayName) + '"></a>'
      : "";
    var cardClass = isSingle
      ? 'home-member-card bg-[#F3EFE6] p-6 relative grid gap-6 items-center text-left max-w-full'
      : 'home-member-card bg-[#F3EFE6] p-6 flex flex-col sm:flex-row gap-6 items-center text-left';
    var cardStyle = isSingle
      ? 'style="grid-template-columns: 192px 1fr;"'
      : '';
    var imgClass = isSingle
      ? 'w-48 h-56 shrink-0 bg-[#E5DFD0] overflow-hidden shadow-sm'
      : 'w-32 h-36 shrink-0 bg-[#E5DFD0] overflow-hidden shadow-sm';
    var isPi = subCategory === "pi" && isHomeFeatured;
    return [
      '        <div class="' + cardClass + '" ' + cardStyle + '>',
      link,
      '          <div class="' + imgClass + '">',
      '            <img class="w-full h-full object-cover grayscale transition-all duration-300" alt="' + esc(window.CWL.altText) + '" src="' + esc(window.CWL.teamImageSrc(teamPhoto, m._category)) + '" />',
      "          </div>",
      '          <div class="flex flex-col min-w-0">',
      '            <h4 class="font-headline-sm text-headline-sm text-primary font-normal">' + esc(displayName) + "</h4>",
      '            <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-2">' + esc(m.position || m.role || "") + "</p>",
      isPi && honour
        ? '            <p class="font-body-sm text-body-sm text-on-surface-variant italic">' + esc(honour) + "</p>"
        : "",
      !isPi
        ? '            <p class="font-body-sm text-body-sm text-on-surface-variant">' + esc(cardText) + "</p>"
        : "",
      "          </div>",
      "        </div>"
    ].filter(function (line) { return line !== ""; }).join("\n");
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

  function render(entry) {
    var img = entry.team_section_image_or_images || {};
    var cards = pickHomeFeatured(entry.featured_people || []);
    var buttonLink = entry.team_section_button_link != null
      ? entry.team_section_button_link
      : (entry.team_section_button && entry.team_section_button.team_section_button_link);
    var teamHref = window.CWL.link(buttonLink || "@team");
    var teamAspect = normalizeAspect(img.team_section_image_aspect_ratio || "aspect-[3/4]");

    /* With photos the words sit left beside them; without any the whole
       band centres itself in the section. */
    var hasPhotos = !!(img.team_section_photos && img.team_section_photos.length > 0);
    var colClass = hasPhotos
      ? "lg:col-span-6 flex flex-col text-center lg:text-left"
      : "lg:col-span-12 flex flex-col text-center";
    var headingClass = hasPhotos
      ? "flex flex-wrap items-baseline justify-center lg:justify-start gap-x-4"
      : "flex flex-wrap items-baseline justify-center gap-x-4";
    var ruleClass = hasPhotos
      ? "w-16 h-px bg-[#1B1C19]/25 mb-8 mx-auto lg:mx-0"
      : "w-16 h-px bg-[#1B1C19]/25 mb-8 mx-auto";
    var textClass = hasPhotos
      ? "font-body-md text-body-md text-on-surface-variant mb-10 leading-relaxed lg:text-justify"
      : "font-body-md text-body-md text-on-surface-variant mb-10 leading-relaxed max-w-xl mx-auto text-center";
    var buttonClass = hasPhotos
      ? "flex justify-center lg:block"
      : "flex justify-center";

    return [
      '<div class="max-w-[1260px] mx-auto">',
      '  <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-center mb-20">',
      '    <div class="' + colClass + '">',
      '      <div class="mb-8">',
      '        <span class="font-label-md text-label-md uppercase tracking-[0.25em] text-secondary block mb-3">' + esc(entry.team_section_subheading || "") + "</span>",
      '        <div class="' + headingClass + '">',
      (function () {
        var out = [];
        if (entry.team_section_heading_main) {
          out.push(
            '            <span class="font-headline-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] tracking-tight uppercase font-normal text-primary">' + esc(entry.team_section_heading_main) + "</span>" +
            (entry.team_section_golden_heading
              ? ' <span class="font-body-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] italic font-serif text-[#7A6F5D] tracking-normal">' + esc(entry.team_section_golden_heading) + "</span>"
              : "")
          );
        }
        return out.join("\n");
      })(),
      "        </div>",
      entry.team_section_heading_sub
        ? '          <span class="font-headline-md text-headline-md text-secondary block mt-1 tracking-wide font-normal">' + esc(entry.team_section_heading_sub) + "</span>"
        : "",
      "      </div>",
      '      <div class="' + ruleClass + '"></div>',
      entry.team_section_quote
        ? '      <p class="font-body-lg text-body-lg text-primary font-serif italic mb-6 leading-relaxed">\u201c' + esc(entry.team_section_quote) + "\u201d</p>"
        : "",
      entry.team_section_text
        ? '      <p class="' + textClass + '">' + esc(entry.team_section_text) + "</p>"
        : "",
      entry.team_section_button_label
        ? [
            '      <div class="' + buttonClass + '">',
            '        <a class="inline-flex items-center justify-center gap-2 w-[280px] max-w-full bg-[#1B1C19] text-[#FAF9F5] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:bg-[#33312B] transition-colors duration-200" href="' + esc(teamHref) + '">' + esc(entry.team_section_button_label || "") + '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span></a>',
            "      </div>"
          ].join("\n")
        : "",
      "    </div>",
      img.team_section_photos && img.team_section_photos.length > 0
        ? (function () {
            var photos = img.team_section_photos || [];
            var interval = img.team_section_image_time_interval || 5000;
            var firstCredit = photos.length ? (photos[0].team_section_photo_credit || "") : "";
            var firstCaption = photos.length ? (photos[0].team_section_photo_caption || "") : "";
            var firstRole = photos.length ? (photos[0]["team_section_photo_extra_text"] || "") : "";
            var slidesHtml = photos.map(function (p, i) {
              return '            <img class="absolute inset-0 w-full h-full object-cover contrast-[1.05] transition-opacity duration-700" ' +
                'style="opacity:' + (i === 0 ? "1" : "0") + '" ' +
                'data-team-slide ' +
                'data-credit="' + esc(p.team_section_photo_credit || "") + '" ' +
                'data-name="' + esc(p.team_section_photo_caption || "") + '" ' +
                'data-role="' + esc(p["team_section_photo_extra_text"] || "") + '" ' +
                'alt="' + esc(p.team_section_photo_alt || "") + '" ' +
                'loading="' + (i === 0 ? "eager" : "lazy") + '" ' +
                'src="' + esc(heroPhotoSrc(p.team_section_photo)) + '" />';
            });
            var dotsHtml = photos.length > 1
              ? [
                  '            <div class="flex items-center gap-space-sm shrink-0" data-team-dots>',
                  '              <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant" data-slide-count></span>',
                  '              <div class="flex gap-space-xs">',
                  photos.map(function (_, i) {
                    return '                <button type="button" class="slide-dot w-2 h-2' + (i === 0 ? " is-active" : "") +
                      '" data-slide-dot data-i="' + i + '" aria-label="Photo ' + (i + 1) + ' of ' + photos.length + '"' +
                      (i === 0 ? ' aria-current="true"' : "") + "></button>";
                  }).join("\n"),
                  "              </div>",
                  "            </div>"
                ].join("\n")
              : "";
            return [
              '    <div class="lg:col-span-6 flex justify-center lg:justify-end mt-12 lg:mt-0">',
              '      <div class="relative w-full max-w-[480px]">',
              '        <div class="absolute -bottom-6 -left-6 md:-bottom-8 md:-left-8 w-2/3 h-1/2 border-l border-b border-[#7A6F5D]/30 pointer-events-none cw-wireframe"></div>',
              '        <div class="relative z-10 bg-[#FFFFFF] p-4 shadow-xl">',
              '          <div class="flex flex-col">',
              '            <div class="relative overflow-hidden ' + teamAspect.cls + ' w-full bg-[#EFECE4]"' + (teamAspect.style ? ' style="' + teamAspect.style + '"' : "") + ' data-team-slideshow data-team-interval="' + interval + '">',
              slidesHtml.join("\n"),
              '              <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary pointer-events-none" data-team-credit' + (firstCredit ? "" : " hidden") + '>' + esc(firstCredit) + '</span>',
              "            </div>",
              "          </div>",
              '          <div class="pt-4 flex items-baseline justify-between gap-space-sm">',
              "            <div>",
              '              <h4 class="font-headline-sm text-headline-sm text-primary font-normal" data-team-name>' + esc(firstCaption) + "</h4>",
              '              <p class="font-label-sm text-label-sm uppercase tracking-widest text-secondary mt-0.5" data-team-role>' + esc(firstRole) + "</p>",
              "            </div>",
              '            <div class="flex items-center gap-space-sm shrink-0">',
              dotsHtml,
              "            </div>",
              "          </div>",
              "        </div>",
              "      </div>",
              "    </div>"
            ].join("\n");
          })()
        : (img.team_section_photo
          ? [
              '    <div class="lg:col-span-6 flex justify-center lg:justify-end mt-12 lg:mt-0">',
              '      <div class="relative w-full max-w-[480px]">',
              '        <div class="absolute -bottom-6 -left-6 md:-bottom-8 md:-left-8 w-2/3 h-1/2 border-l border-b border-[#7A6F5D]/30 pointer-events-none cw-wireframe"></div>',
              '        <div class="relative z-10 bg-[#FFFFFF] p-4 shadow-xl">',
              '          <div class="relative overflow-hidden ' + teamAspect.cls + ' w-full bg-[#EFECE4]"' + (teamAspect.style ? ' style="' + teamAspect.style + '"' : "") + '>',
              '            <img class="w-full h-full object-cover contrast-[1.04]" alt="' + esc(img.team_section_photo_alt || "") + '" src="' + esc(heroPhotoSrc(img.team_section_photo)) + '" />',
              '            <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary pointer-events-none" data-team-credit>' + esc(img.team_section_photo_credit || "") + '</span>',
              "          </div>",
              '          <div class="pt-4 flex items-baseline justify-between gap-space-sm">',
              (img.team_section_photo_caption || img["team_section_photo_extra_text"]
                ? [
                    "            <div>",
                    img.team_section_photo_caption
                      ? '              <h4 class="font-headline-sm text-headline-sm text-primary font-normal" data-team-name>' + esc(img.team_section_photo_caption) + "</h4>"
                      : "",
                    img["team_section_photo_extra_text"]
                      ? '              <p class="font-label-sm text-label-sm uppercase tracking-widest text-secondary mt-0.5" data-team-role>' + esc(img["team_section_photo_extra_text"]) + "</p>"
                      : "",
                    "            </div>"
                  ].join("\n")
                : ""),
              '            <div class="flex items-center gap-space-sm shrink-0">',
              '              <div class="flex items-center gap-space-sm shrink-0" data-team-dots>',
              '                <span class="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant" data-slide-count></span>',
              '                <div class="flex gap-space-xs">',
              '                  <button type="button" class="slide-dot w-2 h-2 is-active" data-slide-dot data-i="0" aria-label="Photo 1 of 1" aria-current="true"></button>',
              '                </div>',
              "              </div>",
              "            </div>",
              "          </div>",
              "        </div>",
              "      </div>",
              "    </div>"
            ].join("\n")
          : ""
        ),
      "  </div>",
      cards.length
        ? [
            '  <div class="w-full border-t border-[#1B1C19]/15"></div>',
            '  <div class="' + (cards.length === 1
                ? 'grid grid-cols-1 max-w-[650px] mx-auto'
                : 'grid grid-cols-1 md:grid-cols-2') + ' gap-8 pt-10" style="' + (cards.length === 1 ? 'max-width: 650px;' : '') + '">',
            cards.map(function (c) { return cardHtml(c, cards.length === 1); }).join("\n"),
            "  </div>"
          ].join("\n")
        : "",
      "</div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* Transitional: the section's short keys fill their older prefixed
     names, so one renderer serves both shapes while files migrate. */
  function liftSection(entry) {
    if (!entry || typeof entry !== "object") return entry;
    var map = {
      subheading: "team_section_subheading",
      heading_main: "team_section_heading_main",
      heading_sub: "team_section_heading_sub",
      heading_golden: "team_section_golden_heading",
      quote: "team_section_quote",
      text: "team_section_text",
      images: "team_section_image_or_images"
    };
    Object.keys(map).forEach(function (short) {
      if (entry[short] != null && entry[map[short]] == null) entry[map[short]] = entry[short];
    });
    if (entry.button && typeof entry.button === "object") {
      if (entry.button.label != null && entry.team_section_button_label == null) {
        entry.team_section_button_label = entry.button.label;
      }
      if (entry.button.link != null && entry.team_section_button_link == null) {
        entry.team_section_button_link = entry.button.link;
      }
      if (entry.team_section_button == null) entry.team_section_button = entry.button;
    }
    var imgs = entry.team_section_image_or_images;
    if (typeof imgs === "string") {
      imgs = { image_path: imgs };
      entry.team_section_image_or_images = imgs;
    }
    if (imgs && typeof imgs === "object") {
      if (imgs.photos && !imgs.team_section_photos) imgs.team_section_photos = imgs.photos;
      /* One picture may be written without the array. */
      if (!imgs.team_section_photos && (imgs.image_path || imgs.image)) {
        imgs.team_section_photos = [{
          image_path: imgs.image_path || imgs.image,
          image_alt: imgs.image_alt || imgs.alt || "",
          image_caption: imgs.image_caption || imgs.caption || "",
          image_credit: imgs.image_credit || imgs.credit || "",
          extra_text: imgs.extra_text || imgs.note || ""
        }];
      }
      /* Each photo is a media object like every other picture: short keys.
         Fill the older prefixed names the renderer still reads. */
      (imgs.team_section_photos || []).forEach(function (p) {
        if (!p || typeof p !== "object") return;
        if (p.team_section_photo == null) p.team_section_photo = p.image_path || p.image || "";
        if (p.team_section_photo_alt == null) p.team_section_photo_alt = p.image_alt || p.alt || "";
        if (p.team_section_photo_caption == null) p.team_section_photo_caption = p.image_caption || p.caption || "";
        if (p.team_section_photo_credit == null) p.team_section_photo_credit = p.image_credit || p.credit || "";
        if (p.team_section_photo_extra_text == null) p.team_section_photo_extra_text = p.extra_text || p.note || "";
      });
      if (imgs.rotation_time_milliseconds != null && imgs.team_section_image_time_interval == null) {
        imgs.team_section_image_time_interval = imgs.rotation_time_milliseconds;
      }
      if (imgs.aspect_ratio != null && imgs.team_section_image_aspect_ratio == null) {
        imgs.team_section_image_aspect_ratio = imgs.aspect_ratio;
      }
    }
    return entry;
  }

  function boot() {
    var section = document.getElementById("team");
    if (!section) return;

    Promise.all([
      loadJson("data/site.json"),
      loadJson(TEAM_URL),
      loadJson(CURRENT_URL),
      loadJson(ALUMNI_URL)
    ]).then(function (loaded) {
      var site = loaded[0];
      var team = loaded[1];
      var current = loaded[2];
      var alumni = loaded[3];

      // Home page section config: site.json decides on/off; the team file
      // keeps its own optional switch for backwards compatibility.
      var entry = liftSection(team.team_section || team.home_page_team_section || {});
      var siteEntry = window.CWL.sectionConfig(site, "team");

      if ((siteEntry && siteEntry.is_enabled === false) || (entry && entry.is_enabled === false)) {
        section.style.display = "none";
        var disabledLink = entry.team_section_button_link != null
          ? entry.team_section_button_link
          : (entry.team_section_button && entry.team_section_button.team_section_button_link);
        window.CWL.retargetNav("#team", disabledLink ? window.CWL.link(disabledLink) : "");
        return;
      }

      // Show every person flagged homeFeatured: true as a card
      (current.add_people_to_category_defined_above || []).forEach(function (p) { if (p) p._category = current.main_category_name; });
      (alumni.add_people_to_category_defined_above || []).forEach(function (p) { if (p) p._category = alumni.main_category_name; });
      var featuredCurrent = pickHomeFeatured(current.add_people_to_category_defined_above || []);
      var featuredAlumni = pickHomeFeatured(alumni.add_people_to_category_defined_above || []);
      entry.featured_people = featuredCurrent.concat(featuredAlumni);

      section.innerHTML = render(entry);

      // Start team slideshow if present
      startTeamSlideshow(section);

      /* The member cards open that person's profile — but only once the
         file is known to exist, the same no-dead-links rule the team page
         follows (this page sits at the site root, hence the two paths). */
      if (window.CWL.wireArticleLinks) {
        window.CWL.wireArticleLinks(section, {
          attr: "data-profile-slug",
          dataDir: "data/team/profiles/",
          hrefPrefix: "pages/profile.html?profile="
        });
      }
    });
  }

  /* Team slideshow: crossfade + dots, same feel as research areas. */
  function startTeamSlideshow(root) {
    var box = root.querySelector("[data-team-slideshow]");
    if (!box) return;
    var slides = box.querySelectorAll("[data-team-slide]");
    if (slides.length < 2) return;
    var dotsContainer = box.parentElement?.nextElementSibling?.querySelector("[data-team-dots]");
    if (!dotsContainer) return;
    var dots = dotsContainer.querySelectorAll("[data-slide-dot]");
    var creditEl = box.querySelector("[data-team-credit]");
    var nameEl = root.querySelector("[data-team-name]");
    var roleEl = root.querySelector("[data-team-role]");
    var defaultName = nameEl ? nameEl.textContent : "";
    var defaultRole = roleEl ? roleEl.textContent : "";
    var interval = parseInt(box.getAttribute("data-team-interval") || "5000", 10);
    if (isNaN(interval)) interval = 5000;
    if (interval > 0 && interval < 1000) interval = 1000;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var active = 0;
    var timer = null;

    function show(next) {
      try {
        active = (next + slides.length) % slides.length;
        for (var i = 0; i < slides.length; i++) {
          var on = i === active;
          slides[i].style.opacity = on ? "1" : "0";
          slides[i].style.pointerEvents = on ? "" : "none";
          slides[i].setAttribute("aria-hidden", on ? "false" : "true");
        }
        for (var j = 0; j < dots.length; j++) {
          if (j === active) {
            dots[j].setAttribute("aria-current", "true");
            dots[j].classList.add("is-active");
          } else {
            dots[j].removeAttribute("aria-current");
            dots[j].classList.remove("is-active");
          }
        }
        // Update fraction counter
        var countEl = dotsContainer.querySelector("[data-slide-count]");
        if (countEl) {
          var current = String(active + 1).padStart(2, "0");
          var total = String(slides.length).padStart(2, "0");
          countEl.textContent = current + " / " + total;
        }
        // Credit, name and role follow the active image
        var slide = slides[active];
        if (creditEl) {
          var cr = slide.getAttribute("data-credit") || "";
          creditEl.textContent = cr;
          creditEl.hidden = !cr;
        }
        if (nameEl) nameEl.textContent = slide.getAttribute("data-name") || defaultName;
        if (roleEl) roleEl.textContent = slide.getAttribute("data-role") || defaultRole;
      } catch (e) {
        console.error('Team slideshow show error:', e);
        stop();
      }
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function start() {
      stop();
      if (interval > 0 && !reduce) {
        timer = setInterval(function () { 
          try { show(active + 1); } catch (e) { console.error('Team slideshow error:', e); stop(); }
        }, interval);
      }
    }

    // Dot click
    for (var d = 0; d < dots.length; d++) {
      dots[d].addEventListener("click", (function (idx) {
        return function () { show(idx); start(); };
      })(d));
    }

    // Pause on hover
    box.addEventListener("mouseenter", stop);
    box.addEventListener("mouseleave", start);

    // Keyboard
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { show(active + 1); start(); }
      else if (e.key === "ArrowLeft") { show(active - 1); start(); }
    });

    // Init
    show(0);
    start();
  }

  boot();
})();