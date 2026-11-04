/* ------------------------------------------------------------------
   home-join.js — Section 6 (centered opportunities banner) of
   index.html.

   Words: data/edit_join_the_lab_section.json (its own section file:
           subheading, heading, subline, introduction, main button)
   Pills: data/join/edit_join_the_lab_page.json -> add_position_file_names
   Note:  the "Don't see your role?" note lives in the same page file
 ------------------------------------------------------------------ */
(function () {
  "use strict";

  var SITE_URL = "data/site.json";
  var SECTION_URL = "data/edit_join_the_lab_section.json";
  var PAGE_URL = "data/join/edit_join_the_lab_page.json";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;
  var statusColors = window.CWL.statusColors;
  var badgeText = window.CWL.badgeText;

  /* One status pill for the whole lab: if at least one position is open
     the band says positions are available; with no files at all, or only
     not-hiring ones, it says the lab is not hiring. Words come from the
     section file; `{count}` may be used in the available label. */
  function renderPill(items, entry) {
    var list = items || [];
    var openCount = list.filter(function (it) {
      return String(it.status || "").toLowerCase() !== "not hiring";
    }).length;
    var hiring = openCount > 0;
    var colors = statusColors([], hiring ? "Open" : "Not hiring");
    var label = hiring
      ? (entry.availableLabel != null ? entry.availableLabel : "Positions available")
      : (entry.notHiringLabel != null ? entry.notHiringLabel : "Currently not hiring");
    label = String(label).replace("{count}", String(openCount));
    return [
      '<span class="home-status">',
      '<span class="home-status__dot" style="background:' + esc(colors.dot) + '"></span>',
      "<span>" + esc(label) + "</span>",
      "</span>"
    ].join("");
  }

  function render(entry, positions) {
    var button = entry.button || {};
    var items = (positions && (positions.add_positions || positions.items)) || [];
    var pills = renderPill(items, entry);

    return [
      '<div class="max-w-[1040px] mx-auto text-center flex flex-col items-center">',
      '        <span class="font-label-md text-label-md uppercase tracking-[0.3em] text-[#C7BAA0] mb-3">' + esc(entry.eyebrow || "") + "</span>",
      '        <h2 class="font-headline-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] uppercase tracking-wide text-[#FAF9F5] mb-4">' + esc(entry.heading || "") + "</h2>",
      entry.subline
        ? '        <p class="font-headline-sm text-headline-sm italic font-serif text-[#C7BAA0] mb-8 font-normal">' + esc(entry.subline) + "</p>"
        : "",
      entry.text
        ? '        <p class="font-body-md text-body-md text-[#CDC8BC] max-w-2xl mb-10 leading-relaxed">' + esc(entry.text) + "</p>"
        : "",
      pills
        ? '        <div class="flex flex-wrap justify-center gap-3 mb-12">' + pills + "</div>"
        : "",
      button.link
        ? [
            '        <div class="mt-8">',
            '          <a class="inline-flex items-center justify-center gap-2 w-[280px] max-w-full bg-[#C7BAA0] text-[#191917] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:bg-[#D8CCB5] transition-colors duration-200" href="' + esc(button.link) + '">' + esc(button.text || "") + '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span></a>',
            "        </div>"
          ].join("\n")
        : "",
      "</div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* The band's words: its own section file first, the site entry as a
     fallback for an older setup. The words live in one object,
     "join_section"; an older flat file still reads. */
  function sectionWords(entry, siteEntry) {
    entry = entry || {};
    siteEntry = siteEntry || {};
    if (entry.join_section && typeof entry.join_section === "object") {
      entry = entry.join_section;
    }
    var raw = entry.button || entry.join_the_lab_section_main_button ||
      siteEntry.button || {};
    function pick(a, b) { return a != null ? a : b; }
    return {
      eyebrow: pick(entry.subheading, pick(entry.join_the_lab_section_subheading, siteEntry.eyebrow)),
      heading: pick(entry.heading, pick(entry.join_the_lab_section_heading, siteEntry.heading)),
      subline: pick(entry.subline, pick(entry.join_the_lab_section_subline, siteEntry.subline)),
      text: pick(entry.intro, pick(entry.join_the_lab_section_introduction, siteEntry.text)),
      availableLabel: pick(entry.available_label, entry.join_the_lab_section_available_label),
      notHiringLabel: pick(entry.not_hiring_label, entry.join_the_lab_section_not_hiring_label),
      button: {
        text: pick(raw.label, pick(raw.join_the_lab_section_main_button_label, raw.text)),
        link: pick(raw.link, raw.join_the_lab_section_main_button_label_link)
      }
    };
  }

  function boot() {
    var section = document.getElementById("join");
    if (!section) return;

    Promise.all([loadJson(SITE_URL), loadJson(SECTION_URL), loadJson(PAGE_URL)]).then(function (loaded) {
      var site = loaded[0];
      var words = sectionWords(loaded[1], window.CWL.sectionConfig(site, "join"));
      var positions = loaded[2] || {};
      var siteEntry = window.CWL.sectionConfig(site, "join");

      /* The button may name its destination (@positions, @books.my_books…). */
      if (words.button.link) {
        words.button.link = window.CWL.link(words.button.link);
      }

      if (!siteEntry || siteEntry.is_enabled === false) {
        section.style.display = "none";
        window.CWL.retargetNav("#join", words.button.link);
        return;
      }

      var load = window.CWL.loadJoinPositions
        ? window.CWL.loadJoinPositions(positions, "data/join/positions/")
        : Promise.resolve([]);
      load.then(function (items) {
        var pageData = {};
        Object.keys(positions).forEach(function (k) { pageData[k] = positions[k]; });
        pageData.add_positions = items;
        section.innerHTML = render(words, pageData);
      });
    });
  }

  boot();
})();
