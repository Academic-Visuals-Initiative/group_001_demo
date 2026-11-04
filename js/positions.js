/* ------------------------------------------------------------------
   positions.js — renders pages/positions.html from
   data/join/edit_join_the_lab_page.json in the template-02 editorial
   language: an eyebrow hero, hairline status pills, and every role as
   a hairline row (status chip + serif title + duration | description +
   tags | apply button).

   Shows EVERY position in the file. The home band's own words live in
   data/edit_join_the_lab_section.json; it reads this page file only to
   count the roles for its status pills.

   Also runs the status filter buttons (All / Open / Not hiring),
   the empty state, and fills the page's own words: hero, ledger
   label, back button and the note at the bottom.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_URL = "../data/join/edit_join_the_lab_page.json";

  var esc = window.CWL.esc;
  var messageHtml = window.CWL.messageHtml;
  var loadJson = window.CWL.loadJson;
  var statusList = window.CWL.statusList;
  var joinCategoryList = window.CWL.joinCategoryList;
  var loadJoinPositions = window.CWL.loadJoinPositions;
  var statusColors = window.CWL.statusColors;
  var badgeText = window.CWL.badgeText;
  var articleSlug = window.CWL.articleSlug;
  var wireArticleLinks = window.CWL.wireArticleLinks;
  var pageHero = window.CWL.pageHero;

  /* Which category pill is selected ("all" = everything). */
  var state = { category: "all" };

  /* One filter pill (the "All" pill is always first).
     Category pills wear their category's colour from
     edit_join_the_lab_page.json; when selected they use the usual active style. */
  function filterButton(label, value, active, category) {
    var classes = "filter-btn font-label-sm text-label-sm uppercase tracking-[0.15em] px-space-md py-space-xs";
    var style = "";
    if (category && category.background) {
      classes += " filter-btn--status";
      var words = category.label || category.text || category.foreground || badgeText(category.background);
      style = ' style="--status-bg:' + esc(category.background) +
              ";--status-fg:" + esc(words) + '"';
    }
    if (active) classes += " active";
    return (
      '<button class="' + classes +
      '" data-filter="' + esc(value) + '"' + style + ">" + esc(label) + "</button>"
    );
  }

  /* Build the filter pills from the categories that actually have a
     position file, in the order they are written in the page file. */
  function renderFilters(categories) {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;
    var html = [filterButton("All", "all", true)];
    (categories || []).forEach(function (c) {
      if (c && c.name) {
        html.push(filterButton(String(c.name), String(c.name).toLowerCase(), false, c));
      }
    });
    bar.innerHTML = html.join("\n");
  }

  /* The status chip at the head of a row ("Open" / "Not hiring"):
     coloured square with the status dot inside. */
  function badgeHtml(name, colors) {
    return (
      '<span class="inline-flex items-center gap-space-xs px-space-sm py-0.5 self-center lg:self-start font-label-sm text-label-sm uppercase tracking-widest"' +
      ' style="background:' + esc(colors.background) +
      ";color:" + (colors.label ? esc(colors.label) : badgeText(colors.background)) + '">' +
      '<span class="w-1.5 h-1.5 rounded-full' + (colors.pulse ? " animate-pulse" : "") +
      '" style="background:' + esc(colors.dot) + '"></span>' +
      esc(name) + "</span>"
    );
  }

  /* One position row: status chip, serif title and duration on the
     left; description and tag chips in the middle; the apply button
     right-aligned. data-status lets the filter pills show/hide rows.
     Everything except the title is optional. */
  function positionHtml(item, statuses, categories, sameCategory) {
    var name = String(item.status || "");
    var colors = statusColors(statuses, name);
    var button = item.button || null;
    var category = String(item.add_relevant_category_name || "");
    var cat = null;
    (categories || []).forEach(function (c) {
      if (!cat && c && c.name.toLowerCase() === category.toLowerCase()) cat = c;
    });
    var catBg = String((cat && cat.background) || "#e5dfd0");
    var catChip = category
      ? '<span class="inline-flex items-center px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest" style="background:' +
        esc(catBg) + ";color:" + esc(badgeText(catBg)) + '">' + esc(category) + "</span>"
      : "";

    var tags = (Array.isArray(item.tags) ? item.tags : []).filter(function (t) {
      return String(t || "").trim();
    });

    /* A detail page in data/join/positions/ (named after the title) turns
       the CTA into a link to it; otherwise the button keeps its own
       link (e.g. #contact or an external apply URL). */
    var slug = articleSlug(item);
    var ctaAttrs = slug ? ' data-position-slug="' + esc(slug) + '"' : "";

    var btn = "";
    var notHiring = name.toLowerCase() === "not hiring";
    if (button && !notHiring) {
      var outline = !colors.solid;
      btn =
        '  <div class="lg:col-span-3 flex justify-center lg:justify-end pt-space-sm lg:pt-0">' +
        '    <a class="inline-flex items-center justify-center gap-space-xs px-space-lg min-h-[34px] ' +
        (outline
          ? "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low"
          : "bg-primary text-on-primary hover:bg-secondary") +
        ' transition-all font-label-md text-label-md uppercase tracking-[0.15em]" href="' +
        esc(button.link || "#contact") + '"' + ctaAttrs + ">" +
        esc(button.text || "Apply now") +
        '<span class="cw-icon cw-icon--arrow-outward text-[16px]" aria-hidden="true"></span></a>' +
        "  </div>";
    }

    return [
      '<article class="position-card' + (sameCategory ? " position-card--same-category" : "") + ' border-t border-outline-variant py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop lg:items-start text-center lg:text-left" data-status="' + esc(name.toLowerCase()) + '" data-category="' + esc(category.toLowerCase()) + '">',
      '  <div class="lg:col-span-4 flex flex-col items-center lg:items-start gap-space-xs">',
      '    <div class="flex flex-wrap items-center justify-center lg:justify-start gap-space-xs">' +
        badgeHtml(name, colors) + catChip + "</div>",
      '    <h3 class="font-headline-md text-headline-md text-on-surface leading-snug mt-space-xs">' + esc(String(item.title || "")) + "</h3>",
      item.duration
        ? '    <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">' + esc(String(item.duration)) + "</span>"
        : "",
      "  </div>",
      '  <div class="lg:col-span-5 flex flex-col items-center lg:items-start gap-space-sm">',
      item.text != null && String(item.text) !== ""
        ? '    <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed lg:text-justify">' + esc(String(item.text)) + "</p>"
        : "",
      tags.length
        ? '    <div class="flex flex-wrap justify-center lg:justify-start gap-space-xs pt-space-xs">' +
          tags.map(function (t) {
            return '<span class="px-space-sm py-0.5 border border-outline-variant font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">' + esc(String(t)) + "</span>";
          }).join("") +
          "</div>"
        : "",
      "  </div>",
      btn,
      "</article>"
    ].join("\n");
  }

  /* Fill the page's own words from data/join/edit_join_the_lab_page.json:
     hero (subheading, heading, introduction), the roles label, back button.
     Fallbacks keep it presentable if a field is missing. */
  function renderPage(data) {
    var hero = document.getElementById("positions-hero");
    if (hero) {
      hero.innerHTML = pageHero({
        label: data.join_the_lab_page_subheading != null
          ? data.join_the_lab_page_subheading
          : data.eyebrow,
        heading: data.join_the_lab_page_heading != null
          ? data.join_the_lab_page_heading
          : (data.heading == null ? "Open Positions" : data.heading),
        text: data.join_the_lab_page_introduction != null
          ? data.join_the_lab_page_introduction
          : data.text,
        centered: true
      });
    }

    var label = document.getElementById("positions-label");
    var rolesLabel = data.join_the_lab_page_label != null
      ? data.join_the_lab_page_label
      : data.label;
    if (label && rolesLabel != null) label.textContent = String(rolesLabel);

    var back = window.CWL.namedButton(data.join_the_lab_page_navbar_button, "back") ||
      (Array.isArray(data.join_the_lab_page_navbar_button)
        ? data.join_the_lab_page_navbar_button[0]
        : null) ||
      window.CWL.namedButton(data.buttons, "back");
    var backText = document.getElementById("positions-back-text");
    var backWord = back && (back.join_the_lab_page_navbar_button_label != null
      ? back.join_the_lab_page_navbar_button_label
      : back.text);
    if (backText && backWord != null) {
      backText.textContent = String(backWord);
    }
    var backLink = document.getElementById("positions-back");
    if (backLink) {
      backLink.href = "../index.html";
    }
  }

  /* The closing note: the site's dark closing card — the same one the
     About and Outputs pages close on (CWL.ctaHtml) — so the page ends the
     way they do. The section carries the ground and the padding. */
  function renderNote(data) {
    var mount = document.getElementById("positions-note");
    if (!mount) return;
    var note = data.join_the_lab_page_note || data.note;
    if (!note) {
      mount.innerHTML = "";
      mount.classList.add("hidden");
      return;
    }
    var button = note.button;
    var html = (window.CWL && window.CWL.ctaHtml) ? window.CWL.ctaHtml({
      heading: note.heading,
      text: note.text,
      buttons: button ? [button] : []
    }) : "";
    if (!html) {
      /* Nothing to say — don't leave an empty dark stripe on the page. */
      mount.innerHTML = "";
      mount.classList.add("hidden");
      return;
    }
    mount.classList.remove("hidden");
    mount.innerHTML = html;
  }

  /* A row shows only when its status matches the selected pill;
     the count follows the visible rows. */
  function applyFilters(list) {
    var empty = document.getElementById("empty-state");
    var countEl = document.getElementById("positions-count");
    var visible = 0;
    /* The first row shown drops its top border — the hairline in the
       label row above it is already the line. */
    var firstShown = true;
    list.querySelectorAll(".position-card").forEach(function (card) {
      var show = state.category === "all" ||
        card.getAttribute("data-category") === state.category;
      card.style.display = show ? "" : "none";
      if (show) {
        visible++;
        card.classList.toggle("border-t", !firstShown);
        firstShown = false;
      }
    });
    if (empty) empty.classList.toggle("hidden", visible > 0);
    if (countEl) countEl.textContent = visible + " role" + (visible === 1 ? "" : "s");
  }

  function wireFilters(list) {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;

      bar.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      state.category = btn.getAttribute("data-filter");
      applyFilters(list);
    });
  }

  /* Transitional: the page's short keys fill their older prefixed names. */
  function liftPage(data) {
    var page = data && data.positions_page;
    if (!page || typeof page !== "object") return data;
    if (page.subheading != null) data.join_the_lab_page_subheading = page.subheading;
    var divider = page.divider_label != null ? page.divider_label : page.label;
    if (divider != null) data.join_the_lab_page_label = divider;
    if (page.heading != null) data.join_the_lab_page_heading = page.heading;
    if (page.intro != null) data.join_the_lab_page_introduction = page.intro;
    if (page.back_button_label != null && !data.join_the_lab_page_navbar_button) {
      data.join_the_lab_page_navbar_button = [
        { join_the_lab_page_navbar_button_label: page.back_button_label }
      ];
    }
    if (page.button_label != null) data.button_label = page.button_label;
    if (Array.isArray(page.file_names)) data.add_position_file_names = page.file_names;
    if (Array.isArray(page.categories)) {
      data.add_categories = page.categories.map(function (c) {
        return { category_name: c.label, background_colour: c.background_colour };
      });
    }
    if (page.note && typeof page.note === "object") {
      var btn = page.note.button || {};
      data.join_the_lab_page_note = {
        heading: page.note.heading,
        text: page.note.text,
        button: { text: btn.label != null ? btn.label : btn.text, link: btn.link }
      };
    }
    return data;
  }

  function boot() {
    var list = document.getElementById("positions-list");
    if (!list) return;

    loadJson(DATA_URL).then(function (data) {
      data = liftPage(data || {});
      renderPage(data);
      window.CWL.setPageTitle(data.join_the_lab_page_heading);

      var statuses = statusList(data);
      var categories = joinCategoryList(data);

      return loadJoinPositions(data, "../data/join/positions/").then(function (items) {
        /* Only categories that actually have a file get a pill. */
        var used = categories.filter(function (c) {
          return items.some(function (it) {
            return String(it.add_relevant_category_name).toLowerCase() === c.name.toLowerCase();
          });
        });
        if (!used.length) {
          var seen = {};
          items.forEach(function (it) {
            var n = String(it.add_relevant_category_name || "");
            if (n && !seen[n.toLowerCase()]) {
              seen[n.toLowerCase()] = true;
              used.push({ name: n, background: "#e5dfd0" });
            }
          });
        }
        renderFilters(used);

        if (!items.length) {
          list.innerHTML = messageHtml("No positions yet.");
          var countEl = document.getElementById("positions-count");
          if (countEl) countEl.textContent = "0 roles";
          wireFilters(list);
          return;
        }

        var lastCat = null;
        list.innerHTML = items.map(function (item) {
          var cat = String(item.add_relevant_category_name || "").toLowerCase();
          var html = positionHtml(item, statuses, used, cat !== "" && cat === lastCat);
          lastCat = cat;
          return html;
        }).join("\n");
        renderNote(data);
        wireFilters(list);
        applyFilters(list);
        /* Every row's button opens that position's own page. */
        wireArticleLinks(list, {
          attr: "data-position-slug",
          dataDir: "../data/join/positions/",
          hrefPrefix: "position.html?positions="
        });
      });
    });
  }

  boot();
})();
