/* ------------------------------------------------------------------
   updates.js — renders pages/updates.html from data/edit_news_and_updates_section.json in the
   template-02 editorial language: an eyebrow hero, hairline filter
   chips, and the feed as hairline rows drawn exactly like the
   publications ledger — date column | picture with the category chip,
   location, serif headline and excerpt | the "Read" button at the
   right edge.

   Shows every item in the file (home shows only featured/newest —
   one file feeds both views), 10 at a time: the "Load older updates"
   button reveals the next 10 each click. Items are newest first, so
   the button really does load OLDER updates. Items marked
   "pinned": true sit at the very top, however many there are.

   Also runs the category and year filter pills and the live count
   ("10 updates" / "2 updates" after filtering). Rows carry
   data-article-slug on the headline and on the Read button;
   wireArticleLinks() later adds their href once it confirms the
   article file exists (no dead links) — a row whose article file is
   missing loses its button.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_URL = "../data/updates/edit_news_and_updates_page.json";
  var SECTION_URL = "../data/edit_news_and_updates_section.json";
  var PAGE_SIZE = 10;

  var esc = window.CWL.esc;
  var wireArticleLinks = window.CWL.wireArticleLinks;
  var messageHtml = window.CWL.messageHtml;
  var loadJson = window.CWL.loadJson;
  var featuredFirst = window.CWL.featuredFirst;
  var featuredChipHtml = window.CWL.featuredChipHtml;
  var categoryList = window.CWL.categoryList;
  var categoryMap = window.CWL.categoryMap;
  var badgeText = window.CWL.badgeText;
  var pinChipHtml = window.CWL.pinChipHtml;
  var pageHero = window.CWL.pageHero;
  var imageList = window.CWL.imageList;
  var galleryBadgeHtml = window.CWL.galleryBadgeHtml;

  /* One filter pill (the "All" pill is always first).
     Category pills wear their category's color from edit_news_and_updates_section.json;
     when selected they use the usual active style. */
  function filterButton(label, value, active, category) {
    var classes = "filter-btn font-label-sm text-label-sm uppercase tracking-[0.15em] px-space-md py-space-xs";
    var style = "";
    if (category && category.background) {
      classes += " filter-btn--category";
      style = ' style="--cat-bg:' + esc(category.background) +
              ";--cat-fg:" + badgeText(category.background) + '"';
    }
    if (active) classes += " active";
    return (
      '<button class="' + classes +
      '" data-filter="' + esc(value) + '"' + style + ">" + esc(label) + "</button>"
    );
  }

  /* Build the filter pills from edit_news_and_updates_section.json → categories (file order). */
  function renderFilters(categories) {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;
    var html = [filterButton("All", "all", true)];
    categories.forEach(function (c) {
      if (c && c.name) {
        html.push(filterButton(String(c.name), String(c.name).toLowerCase(), false, c));
      }
    });
    bar.innerHTML = html.join("\n");
  }

  /* Year pills above the feed: "All years" first, then every year
     found in the items (newest first). Built from the dates —
     nothing to maintain; an empty year never appears. */
  function renderYears(items) {
    var bar = document.getElementById("year-bar");
    if (!bar) return;
    var seen = {};
    items.forEach(function (i) {
      var y = String(window.CWL.newsDate(i) || "").slice(0, 4);
      if (/^\d{4}$/.test(y)) seen[y] = true;
    });
    var years = Object.keys(seen).sort().reverse();
    if (!years.length) {
      bar.classList.add("hidden");
      return;
    }
    var html = [filterButton("All years", "all", true)];
    years.forEach(function (y) {
      html.push(filterButton(y, y, false));
    });
    bar.innerHTML = html.join("\n");
  }

  /* One feed row, drawn like a publications row: the date in the
     narrow first column (day over month + year), then the picture with
     the words — category chip, location, Pinned, the serif headline
     and the excerpt — then the "Read" button at the right edge.
      The headline and the button both carry data-article-slug, so
     wireArticleLinks() can hand them the article's address once it
     confirms the file exists; an item with no article file keeps a
     plain headline and no button. An item with no picture simply
     starts with its words, exactly as a publications row does. */
  function updateRow(item, categories, pinnedLabel, readLabel, featuredLabel, featuredBackground) {
    var date = window.CWL.parseDate(window.CWL.newsDate(item));
    var category = String(window.CWL.newsCategory(item) || "");
    var colors = (categories && categories[category.toLowerCase()]) || {};
    var chipInfo = window.CWL.categoryChip ? window.CWL.categoryChip(item, colors) : { text: category, background: "" };
    var id = window.CWL.newsFileId(item);
    var slug = id && item._newsFileExists !== false ? id : "";

    var chip = chipInfo.text
      ? '<span class="px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest' +
        (chipInfo.background ? "" : " border border-outline-variant text-on-surface-variant") + '"' +
        (chipInfo.background
          ? ' style="background:' + esc(chipInfo.background) +
            ";color:" + badgeText(chipInfo.background) + '"'
          : "") + ">" + esc(chipInfo.text) + "</span>"
      : "";

    var location = item.location
      ? '<span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">· ' + esc(String(item.location)) + "</span>"
      : "";

    var tags = [chip, location,
      /* featured outranks pinned, so its tag comes first */
      item.is_featured === true ? featuredChipHtml(item, featuredLabel, featuredBackground) : "",
      item.is_pinned === true ? pinChipHtml(pinnedLabel) : ""]
      .filter(Boolean).join("\n        ");

    /* The pictures on the row: the first fills the plate, the rest wait
       in the lightbox, each with the words that belong to it. */
    var pics = imageList(item, window.CWL.newsImageBase(item, "../"));
    var plate = pics.length
      ? '    <div class="relative hidden sm:block w-[160px] shrink-0">' +
        '      <div class="absolute -top-2 -right-2 w-full h-full border border-outline-variant pointer-events-none cw-wireframe"></div>' +
        '      <button type="button" class="relative block w-full p-2 bg-surface-lowest shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-zoom-in" aria-label="View the picture" data-lightbox="' + esc(pics.map(function (p) { return p.src; }).join("|")) + '" data-lightbox-caption="' + esc(pics.map(function (p) { return p.caption; }).join("|")) + '">' +
        '        <span class="block aspect-[4/3] bg-surface-container-low">' +
        '          <img class="w-full h-full object-cover" loading="lazy" alt="' + esc(pics[0].alt || window.CWL.altText) + '" src="' + esc(pics[0].src) + '" />' +
        "        </span>" +
        galleryBadgeHtml(pics.length) +
        "      </button>" +
        "    </div>"
      : "";

    /* The row's own button, in the black fill the site's light buttons
       wear (theme "light" in helpers.js). No href to begin with — the
       word comes from the JSON, the address from the article file. */
    var read = slug
      ? '<a class="inline-flex items-center justify-center gap-2 border px-4 min-h-[34px] font-label-sm text-label-sm uppercase tracking-widest transition-colors border-transparent bg-primary text-on-primary hover:bg-secondary" data-article-slug="' + esc(slug) + '" data-read-button>' +
        "<span>" + esc(readLabel) + "</span>" +
        '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span>' +
        "</a>"
      : "";

    var headline = slug
      ? '<a class="group-hover:text-secondary transition-colors" data-article-slug="' + esc(slug) + '">' + esc(String(window.CWL.newsTitle(item))) + "</a>"
      : esc(String(window.CWL.newsTitle(item)));

    return [
      '<div class="update-item group grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-t border-outline-variant py-space-md md:py-space-lg hover:bg-surface-container-low transition-colors px-space-sm"' +
        ' data-category="' + esc(category.toLowerCase()) +
        '" data-year="' + esc(String(window.CWL.newsDate(item) || "").slice(0, 4)) + '">',
      '  <div class="lg:col-span-1 flex md:flex-col gap-space-xs md:gap-0 items-baseline md:items-start">',
      '    <span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary whitespace-nowrap">' + esc(date.day) + "</span>",
      '    <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant whitespace-nowrap">' + esc(date.month) + "</span>",
      "  </div>",
      '  <div class="lg:col-span-9 flex items-center gap-6">',
      plate ? "  " + plate : "",
      '    <div class="min-w-0">',
      '      <div class="flex flex-wrap items-center gap-space-xs mb-2">',
      "        " + tags,
      "      </div>",
      '      <h3 class="font-headline-md text-headline-md text-on-surface leading-snug">' + headline + "</h3>",
      window.CWL.newsIntro(item)
        ? '      <p class="font-body-sm text-body-sm text-on-surface-variant mt-space-xs max-w-2xl text-justify">' + esc(String(window.CWL.newsIntro(item))) + "</p>"
        : "",
      "    </div>",
      "  </div>",
      '  <div class="lg:col-span-2 flex flex-col items-stretch gap-2">',
      read ? "    " + read : "",
      "  </div>",
      "</div>"
    ].filter(function (line) { return line !== ""; }).join("\n");
  }

  /* Fill the page's own words from edit_news_and_updates_section.json: hero (label, heading,
     intro), the feed label, back button, "load older" button. */
  function renderPage(data) {
    var hero = document.getElementById("updates-hero");
    if (hero) {
      hero.innerHTML = pageHero({
        label: data.news_and_updates_page_subheading != null
          ? data.news_and_updates_page_subheading
          : data.eyebrow,
        heading: data.news_and_updates_page_heading != null
          ? data.news_and_updates_page_heading
          : data.heading,
        text: data.news_and_updates_page_introduction != null
          ? data.news_and_updates_page_introduction
          : data.text,
        centered: true
      });
    }

    var navButtons = data.news_and_updates_page_navbar_button || data.buttons;
    var navList = Array.isArray(navButtons) ? navButtons : [];
    var back = window.CWL.namedButton(navButtons, "back") || navList[0];
    var more = window.CWL.namedButton(navButtons, "more") || navList[1];
    var backText = document.getElementById("updates-back-text");
    if (backText && back) {
      backText.textContent = String(back.news_and_updates_page_navbar_button_label != null
        ? back.news_and_updates_page_navbar_button_label
        : (back.text == null ? "" : back.text));
    }
    var backLink = document.getElementById("updates-back");
    if (backLink && back && back.link) {
      backLink.href = back.link;
    }
    var moreText = document.getElementById("updates-more-text");
    if (moreText && more) {
      moreText.textContent = String(more.news_and_updates_page_list_expanding_button_label != null
        ? more.news_and_updates_page_list_expanding_button_label
        : (more.text == null ? "" : more.text));
    }
    var feedLabel = document.getElementById("updates-label");
    if (feedLabel && data.news_and_updates_page_divider_label != null) {
      feedLabel.textContent = String(data.news_and_updates_page_divider_label);
    }
  }

  function setCount(n) {
    var countEl = document.getElementById("updates-count");
    if (countEl) countEl.textContent = n + " update" + (n === 1 ? "" : "s");
  }

  /* Which pill of each row is selected ("all" = everything) and how
     many items are currently expanded. */
  var state = { category: "all", year: "all", shown: PAGE_SIZE };

  /* A row shows only when it matches BOTH selected pills — and only
     the first PAGE_SIZE matches stay on screen. The count shows how
     many MATCH, not how many are expanded; the "load older" wrapper
     hides itself once everything matching is showing. */
  function applyFilters(list) {
    var empty = document.getElementById("empty-state");
    var matches = 0;
    var expanded = 0;
    /* The first row shown drops its top border — the hairline in the
       label row above it is already the line. */
    var firstShown = true;
    list.querySelectorAll(".update-item").forEach(function (item) {
      var okCat = state.category === "all" ||
        item.getAttribute("data-category") === state.category;
      var okYear = state.year === "all" ||
        item.getAttribute("data-year") === state.year;
      var match = okCat && okYear;
      if (match) matches++;
      var show = match && expanded < state.shown;
      if (show) {
        expanded++;
        item.classList.toggle("border-t", !firstShown);
        firstShown = false;
      }
      item.style.display = show ? "" : "none";
    });
    if (empty) empty.classList.toggle("hidden", matches > 0);
    setCount(matches);
    var more = document.getElementById("updates-more");
    if (more) more.classList.toggle("hidden", matches <= state.shown);
  }

  /* One click handler per pill row (category row + year row);
     picking a pill updates its state, starts the list over at
     PAGE_SIZE, and re-filters. */
  function wireFilters(list) {
    var rows = [
      { el: document.getElementById("filter-bar"), key: "category" },
      { el: document.getElementById("year-bar"), key: "year" }
    ];
    rows.forEach(function (row) {
      if (!row.el) return;
      row.el.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter-btn");
        if (!btn) return;

        row.el.querySelectorAll(".filter-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        state[row.key] = btn.getAttribute("data-filter");
        state.shown = PAGE_SIZE;
        applyFilters(list);
      });
    });
  }

  /* "Load older updates" reveals the next page of items. */
  function wireMore(list) {
    var more = document.getElementById("load-more");
    if (!more) return;
    more.addEventListener("click", function () {
      state.shown += PAGE_SIZE;
      applyFilters(list);
    });
  }

  /* Transitional: the page's short keys fill their older prefixed names. */
  function liftPage(data) {
    var page = data && data.news_page;
    if (!page || typeof page !== "object") return data;
    if (page.subheading != null) data.news_and_updates_page_subheading = page.subheading;
    if (page.heading != null) data.news_and_updates_page_heading = page.heading;
    if (page.intro != null) data.news_and_updates_page_introduction = page.intro;
    var divider = page.divider_label != null ? page.divider_label : page.label;
    if (divider != null) data.news_and_updates_page_divider_label = divider;
    if (!data.news_and_updates_page_navbar_button) {
      data.news_and_updates_page_navbar_button = [
        { news_and_updates_page_navbar_button_label: page.back_button_label },
        { news_and_updates_page_list_expanding_button_label: page.more_button_label }
      ];
    }
    return data;
  }

  function boot() {
    var list = document.getElementById("updates-list");
    if (!list) return;

    Promise.all([loadJson(DATA_URL), loadJson(SECTION_URL)]).then(function (loaded) {
      var data = liftPage(loaded[0] || {});
      /* Items may live in the news band's own file so one list feeds both
         the home band and this archive; the page file stays the fallback. */
      var section = loaded[1] || {};
      var band = section.news_section && typeof section.news_section === "object"
        ? section.news_section
        : section;
      var sectionItems = (band && (band.add_news_items || band.items)) || [];
      renderPage(data);
      window.CWL.setPageTitle(data.news_and_updates_page_heading);

      var cats = categoryList(data);
      renderFilters(cats);
      var categories = categoryMap(cats);
      var items = (sectionItems.length
        ? sectionItems
        : ((data && (data.add_news_items || data.items)) || [])).slice();
      var readLabel = data.card_button_label == null
        ? "Read"
        : String(data.card_button_label);

      window.CWL.borrowNews(items, "../data/updates/items/").then(function () {
        items = featuredFirst(items);
        renderYears(items);

        if (!items.length) {
          list.innerHTML = messageHtml("No updates yet.");
          setCount(0);
          wireFilters(list);
          return;
        }

        list.innerHTML = items.map(function (item) {
          return updateRow(item, categories, data.pinned_label, readLabel,
            data.featured_tag_label,
            data.featured_tag_background_colour != null
              ? data.featured_tag_background_colour
              : data.featured_tag_background);
        }).join("\n");
        wireArticleLinks(list).then(function () {
          /* A headline only becomes a link once its article file is
             there; a "Read" button with nowhere to go is dropped. */
          list.querySelectorAll("[data-read-button]").forEach(function (a) {
            if (!a.getAttribute("href")) a.classList.add("hidden");
          });
        });
        setCount(items.length);
        wireFilters(list);
        wireMore(list);
        applyFilters(list);
      });
    });
  }

  boot();
})();
