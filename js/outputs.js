/* ------------------------------------------------------------------
   outputs.js — renders the Publications & Outputs page
   (pages/outputs.html), drawn in the template-02 editorial language:
   an eyebrow hero, hairline filter chips, and the records as a ledger
   of hairline rows — the same row the home page's publications list
   uses, in light dress: index | picture + chips, title, byline, meta |
   the row's buttons stacked at the right edge.

   How it works:
   Reads data/outputs/edit_publications_and_outputs_page.json — the page's words: eyebrow, heading,
   intro, the small list label, the category list (with their tag
   colours), and the closing call-to-action — plus the item files named
   in `list_file_names` (data/outputs/publications.json, datasets.json, …).
   Leave a word out and that piece doesn't show.

   Also runs the two filter rows (category pills under the hero, year
   pills above the ledger), the live result count, the empty state,
   and the "View more" button — the list shows 10 items at a time
   and the button reveals 10 more each click. Items marked
   "pinned": true sit at the very top of the list, however many.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_URL = "../data/outputs/edit_publications_and_outputs_page.json";
  var SECTION_URL = "../data/edit_publications_and_outputs_section.json";
  var PAGE_SIZE = 10;

  var esc = window.CWL.esc;
  var messageHtml = window.CWL.messageHtml;
  var loadJson = window.CWL.loadJson;
  var badgeText = window.CWL.badgeText;
  var featuredFirst = window.CWL.featuredFirst;
  var pageHero = window.CWL.pageHero;
  var ctaHtml = window.CWL.ctaHtml;
  var outputRowHtml = window.CWL.outputRowHtml;

  /* Which pill of each row is selected ("all" = everything) and how
     many items are currently expanded. */
  var state = { filter: "all", year: "all", shown: PAGE_SIZE, reverse: false, numberFilter: false };

  /* Which lists take a number. "all" / empty = every row. */
  function listsToNumber(value) {
    if (Array.isArray(value)) {
      return value.map(function (v) { return String(v || "").trim().replace(/\.json$/i, ""); })
        .filter(Boolean);
    }
    var text = String(value == null ? "" : value).trim();
    if (!text || /^(all|everything|every list)$/i.test(text)) return [];
    return text.split(",").map(function (v) {
      return v.trim().replace(/\.json$/i, "");
    }).filter(Boolean);
  }

  /* The two chip colours items alternate between; the "tones" block in
     data/outputs/edit_publications_and_outputs_page.json can recolour them (hex lives in the JSON). */
  var TONES = {
    green: { background: "#d4e4d0", text: "#121f12" },
    yellow: { background: "#ffdeaa", text: "#271900" }
  };
  var TONE_ORDER = ["green", "yellow"];

  /* Merge the JSON's tone colours over the defaults. No tones block means
     no override: each source chip wears its category's colour. */
  function readTones(data) {
    if (!data || !data.tones) return null;
    var tones = {};
    TONE_ORDER.forEach(function (name) {
      tones[name] = { background: TONES[name].background, text: TONES[name].text };
    });
    if (data.tones) {
      Object.keys(data.tones).forEach(function (name) {
        var t = data.tones[name];
        if (t && t.background) {
          tones[name] = {
            background: String(t.background),
            text: t.text != null ? String(t.text) : tones.green.text
          };
        }
      });
    }
    return tones;
  }

  /* One filter pill (the "All" pill is always first). Pills for a
     category wear that category's colour from its list file; when
     selected they use the usual active style (page CSS). */
  function filterButton(label, value, active, category) {
    var classes = "filter-btn font-label-sm text-label-sm uppercase tracking-[0.15em] px-space-md py-space-xs";
    var style = "";
    if (category && category.background) {
      classes += " filter-btn--category";
      style = ' style="--cat-bg:' + esc(String(category.background)) +
              ";--cat-fg:" + badgeText(String(category.background)) + '"';
    }
    if (active) classes += " active";
    return (
      '<button class="' + classes +
      '" data-filter="' + esc(value) + '"' + style + ">" + esc(label) + "</button>"
    );
  }

  /* Category pills under the hero (from data/outputs/edit_publications_and_outputs_page.json → categories). */
  function renderFilters(categories) {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;
    var html = [filterButton("All outputs", "all", true)];
    categories.forEach(function (c) {
      if (c && c.label && c.name) {
        html.push(filterButton(String(c.label), String(c.name), false, c));
      }
    });
    bar.innerHTML = html.join("\n");
  }

  /* Year pills above the ledger: "All years" first, then every year
     found on the items (newest first) — nothing to maintain. Hides
     itself when no item carries a year. */
  function renderYears(data) {
    var bar = document.getElementById("year-bar");
    if (!bar) return;
    var seen = {};
    (data.items || []).forEach(function (i) {
      var y = String((i && i.year) || "");
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

  /* One ledger row. The row itself is drawn by js/helpers.js
     (outputRowHtml), the same drawer a profile's own publication list
     uses, so a paper looks the same on both pages: the index, the
     picture and the words (chips, title, byline, meta), then the row's
     buttons stacked at the right edge.
      This page hands the drawer the colours and words out of
     data/outputs/edit_publications_and_outputs_page.json — the type tag wears its category's colour, the
     coloured source chip alternates green/yellow down the list unless an
     item picks its own tone, and a "pinned": true item wears the small
     Pinned chip. js/outputs.js toggles the row's top hairline, so only
     the rows after the first are ruled off from one another. */
  function itemHtml(item, index, number, categories, tones, pinnedLabel, publisherLabel, featuredLabel, featuredBackground) {
    return outputRowHtml(item, index, {
      number: number,
      categories: categories,
      tones: tones,
      pinnedLabel: pinnedLabel,
      publisherLabel: publisherLabel,
      featuredLabel: featuredLabel,
      featuredBackground: featuredBackground,
      base: "../",
      viewer: "article.html?url="
    });
  }

  /* The ledger + the live result count. */
  function renderList(data) {
    var list = document.getElementById("outputs-list");
    if (!list) return 0;
    var items = (data.items || []).filter(function (it) { return it && it.title; });
    if (!items.length) {
      list.innerHTML = messageHtml("No outputs yet.");
      return 0;
    }
    var categories = (data.categories || []).filter(Boolean);
    var tones = readTones(data);
    var reverse = data.reverse_numbering === true ||
      data.reverseNumbering === true ||
      String(data.numbering || "").toLowerCase() === "reverse";
    var allowed = listsToNumber(data.lists_to_number);
    state.reverse = reverse;
    state.numberFilter = allowed.length > 0;

    function assignNumbers(rows) {
      var seq = 0;
      rows.forEach(function (item) {
        var take = !allowed.length ||
          (item && item._list && allowed.indexOf(item._list) > -1);
        if (take) {
          seq += 1;
          item._number = seq;
        } else {
          item._number = "";
        }
      });
    }

    /* Reverse mode reads the list from its newest end: newest first,
       each row keeping its absolute number (…25, 24, 23). */
    /* Featured items lead the archive, then pinned items, even when it is
       read newest first; the rest then follow in reverse order. */
    var featuredItems = items.filter(function (it) { return it && it.is_featured === true; });
    var pinnedItems = items.filter(function (it) {
      return it && it.is_featured !== true && it.is_pinned === true;
    });
    var restItems = items.filter(function (it) {
      return !(it && (it.is_featured === true || it.is_pinned === true));
    });
    if (reverse) {
      if (state.numberFilter) assignNumbers(items);
      items = featuredItems.slice().reverse()
        .concat(pinnedItems.slice().reverse(), restItems.slice().reverse());
    } else {
      /* keepRestOrder: the ledger's own order (as written) after the
         two priority tiers; only featured and pinned move up. */
      items = featuredFirst(items, { restNewestFirst: false });
      if (state.numberFilter) assignNumbers(items);
    }

    var html = [];
    var total = items.length;
    var numbers = [];
    items.forEach(function (item, i) {
      var n = state.numberFilter ? item._number : (reverse ? total - i : i + 1);
      numbers.push(n);
      html.push(itemHtml(item, i, n, categories, tones, data.pinned_label, data.publisherLabel,
        data.featured_tag_label,
        data.featured_tag_background_colour != null
          ? data.featured_tag_background_colour
          : data.featured_tag_background));
    });
    list.innerHTML = html.join("\n");
    var rows = list.querySelectorAll(".output-item");
    Array.prototype.forEach.call(rows, function (row, i) {
      row.setAttribute("data-number", String(numbers[i]));
      row.setAttribute("data-list-number", String(reverse ? total - i : i + 1));
    });
    return items.length;
  }

  /* Show/hide rows for the two selected pills, PAGE_SIZE at a time.
      The count shows how many MATCH, not how many are expanded. */
  function applyFilter() {
    var list = document.getElementById("outputs-list");
    if (!list) return;
    var items = Array.prototype.slice.call(list.querySelectorAll(".output-item"));
    var matched = [];
    items.forEach(function (item, i) {
      var okType = state.filter === "all" || item.getAttribute("data-type") === state.filter;
      var okYear = state.year === "all" || item.getAttribute("data-year") === state.year;
      item._index = i + 1;
      item._match = okType && okYear;
      if (item._match) matched.push(item);
      item.style.display = "none";
    });

    /* Reverse mode shows the list from its newest end — the first page is
       the newest rows, each keeping its absolute number (…23, 24, 25). */
    var visible = matched.slice(0, state.shown);
    visible.forEach(function (item) { item.style.display = ""; });

    var countEl = document.getElementById("result-count");
    if (countEl) countEl.textContent = matched.length + " output" + (matched.length === 1 ? "" : "s");

    /* Renumber what is on screen: 01, 02, 03 … normally; in reverse mode
       each row keeps the number of its place in the whole list. Drop the
       top border of the first row shown — the header above it is already
       the line that divides. */
    var shown = 0;
    visible.forEach(function (item) {
      var num = item.querySelector("[data-index]");
      if (num) {
        var n = state.numberFilter
          ? item.getAttribute("data-number")
          : String(state.reverse
            ? (parseInt(item.getAttribute("data-list-number"), 10) || 0)
            : shown + 1);
        if (n === "" || n == null) {
          num.textContent = "";
        } else {
          var v = parseInt(n, 10) || 0;
          num.textContent = v < 10 ? "0" + v : String(v);
        }
      }
      item.classList.toggle("border-t", shown > 0);
      shown++;
    });

    var empty = document.getElementById("empty-state");
    if (empty) empty.classList.toggle("hidden", matched.length > 0);
    var more = document.getElementById("output-more");
    if (more) more.classList.toggle("hidden", matched.length <= state.shown);
  }

  /* One handler per pill row (category row + year row); picking a
     pill updates its state, starts the list over, and re-filters. */
  function wireFilters() {
    [
      { el: document.getElementById("filter-bar"), key: "filter" },
      { el: document.getElementById("year-bar"), key: "year" }
    ].forEach(function (row) {
      if (!row.el) return;
      row.el.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter-btn");
        if (!btn) return;
        row.el.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state[row.key] = btn.getAttribute("data-filter") || "all";
        state.shown = PAGE_SIZE;
        applyFilter();
      });
    });
  }

  /* "View more" reveals the next page of items. */
  function wireMore() {
    var more = document.getElementById("load-more");
    if (!more) return;
    more.addEventListener("click", function () {
      state.shown += PAGE_SIZE;
      applyFilter();
    });
  }

  /* Transitional: the page's short keys fill their older prefixed names. */
  function liftPage(data) {
    var page = data && data.outputs_page;
    if (!page || typeof page !== "object") return data;
    if (page.subheading != null) data.publications_and_outputs_page_subheading = page.subheading;
    if (page.heading != null) data.publications_and_outputs_page_heading = page.heading;
    if (page.intro != null) data.publications_and_outputs_page_introduction = page.intro;
    var divider = page.divider_label != null ? page.divider_label : page.label;
    if (divider != null) data.publications_and_outputs_page_divider_label = divider;
    if (!data.publications_and_outputs_page_buttons) {
      data.publications_and_outputs_page_buttons = [
        { publications_and_outputs_page_navbar_button_label: page.back_button_label },
        { publications_and_outputs_page_list_expanding_button_label: page.more_button_label }
      ];
    }
    var closing = page.closing;
    if (closing && typeof closing === "object" && !data.publications_and_outputs_page_closing_section) {
      var buttons = (closing.buttons || []).map(function (b) {
        var style = String(b.style || "light").toLowerCase();
        var key = style === "outline" ? "outline" : "light";
        var out = {};
        out["publications_and_outputs_page_closing_section_" + key + "_button_label"] = b.label;
        out["publications_and_outputs_page_closing_section_" + key + "_button_link"] = b.link;
        return out;
      });
      data.publications_and_outputs_page_closing_section = {
        publications_and_outputs_page_closing_section_heading: closing.heading,
        publications_and_outputs_page_closing_section_text: closing.text,
        publications_and_outputs_page_closing_section_buttons: buttons
      };
    }
    return data;
  }

  function boot() {
    Promise.all([loadJson(DATA_URL), loadJson(SECTION_URL)]).then(function (loaded) {
      var config = loaded[0];
      var section = loaded[1];
      if (!config) {
        var list = document.getElementById("outputs-list");
        if (list) list.innerHTML = messageHtml("Outputs are temporarily unavailable.");
        return null;
      }
      /* One switch for the list: when the page config does not write
         reverse_numbering, the home section's setting is used. A page
         config that writes its own value still wins. */
      var sectionReverse = section && (section.show_reverse_numbering != null
        ? section.show_reverse_numbering
        : section.reverse_numbering);
      if (config.reverse_numbering == null && sectionReverse != null) {
        config.reverse_numbering = sectionReverse;
      }
      /* Which rows take a number is also a list-level setting. */
      var sectionNumbers = section && (
        section.only_this_list_or_lists_will_be_counted_to_show_numbering != null
          ? section.only_this_list_or_lists_will_be_counted_to_show_numbering
          : section.publications_and_outputs_section_lists_to_number);
      if (config.lists_to_number == null && sectionNumbers != null) {
        config.lists_to_number = sectionNumbers;
      }
      return window.CWL.loadOutputItems ? window.CWL.loadOutputItems(config) : config;
    }).then(function (data) {
      if (!data) return;
      data = liftPage(data);
      window.CWL.setPageTitle(data.publications_and_outputs_page_heading);
      if (data.eyebrow == null) data.eyebrow = data.publications_and_outputs_page_subheading;
      if (data.heading == null) data.heading = data.publications_and_outputs_page_heading;
      if (data.text == null) data.text = data.publications_and_outputs_page_introduction;
      if (data.label == null) {
        data.label = data.publications_and_outputs_page_divider_label != null
          ? data.publications_and_outputs_page_divider_label
          : data.publications_and_outputs_divider_label;
      }
      if (data.publisherLabel == null) {
        data.publisherLabel = data.external_link_label_for_outputs;
      }

      var hero = document.getElementById("outputs-hero");
      if (hero) {
        hero.innerHTML = pageHero({
          label: data.eyebrow,
          heading: data.heading,
          text: data.text,
          centered: true
        });
      }

      var label = document.getElementById("record-label");
      if (label && data.label != null) label.textContent = String(data.label);

      var pageButtons = data.publications_and_outputs_page_buttons || data.buttons;
      renderBack(pageButtons);
      renderMore(pageButtons);
      renderList(data);
      renderFilters((data.categories || []).filter(Boolean));
      renderYears(data);
      renderCta(data.publications_and_outputs_page_closing_section || data.cta);
      wireFilters();
      wireMore();
      applyFilter();
    });
  }

  /* The small "Back to Home" word in the page header. The entry may be
     named or simply the first button; without a link the page's own
     ../index.html stays as written. */
  function renderBack(buttons) {
    var list = Array.isArray(buttons) ? buttons : [];
    var back = window.CWL.namedButton(buttons, "back") || list[0];
    var btn = document.getElementById("outputs-back");
    var txt = document.getElementById("outputs-back-text");
    var word = back && (back.publications_and_outputs_page_navbar_button_label != null
      ? back.publications_and_outputs_page_navbar_button_label
      : back.text);
    if (word != null && txt) txt.textContent = String(word);
    if (back && back.link && btn) btn.setAttribute("href", String(back.link));
  }

  /* The "View more" word from the JSON (fallback: View more). */
  function renderMore(buttons) {
    var txt = document.getElementById("outputs-more-text");
    var list = Array.isArray(buttons) ? buttons : [];
    var more = window.CWL.namedButton(buttons, "more") || list[1];
    var word = more && (more.publications_and_outputs_page_list_expanding_button_label != null
      ? more.publications_and_outputs_page_list_expanding_button_label
      : more.text);
    if (txt && word != null) txt.textContent = String(word);
  }

  /* The closing call-to-action; no cta block → nothing renders. */
  function renderCta(cta) {
    var section = document.getElementById("outputs-cta");
    if (!section) return;
    var raw = cta || {};
    var rawButtons = Array.isArray(raw.publications_and_outputs_page_closing_section_buttons)
      ? raw.publications_and_outputs_page_closing_section_buttons
      : (Array.isArray(raw.buttons) ? raw.buttons : []);
    var buttons = rawButtons.map(function (b, i) {
      b = b || {};
      var isLight = i === 0;
      return {
        text: isLight
          ? (b.publications_and_outputs_page_closing_section_light_button_label != null
            ? b.publications_and_outputs_page_closing_section_light_button_label
            : b.text)
          : (b.publications_and_outputs_page_closing_section_outline_button_label != null
            ? b.publications_and_outputs_page_closing_section_outline_button_label
            : b.text),
        link: isLight
          ? (b.publications_and_outputs_page_closing_section_light_button_link != null
            ? b.publications_and_outputs_page_closing_section_light_button_link
            : b.link)
          : (b.publications_and_outputs_page_closing_section_outline_button_link != null
            ? b.publications_and_outputs_page_closing_section_outline_button_link
            : b.link),
        style: b.style
      };
    });
    var heading = raw.publications_and_outputs_page_closing_section_heading != null
      ? raw.publications_and_outputs_page_closing_section_heading
      : raw.heading;
    var text = raw.publications_and_outputs_page_closing_section_text != null
      ? raw.publications_and_outputs_page_closing_section_text
      : raw.text;
    var html = ctaHtml({ heading: heading, text: text, buttons: buttons });
    if (!html) { section.style.display = "none"; return; }
    section.innerHTML = html;
  }

  boot();
})();
