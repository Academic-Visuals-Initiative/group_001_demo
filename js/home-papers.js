/* ------------------------------------------------------------------
   home-papers.js — Section 4 (editorial monograph index) of
   index.html.

   Words:  data/edit_publications_and_outputs_section.json
   Items:  chosen there by "publications_and_outputs_section_show":
           all_lists (default, no collections), one list, or one collection.
           List files and items live in
           data/outputs/.
   Each row: kicker, title, authors, meta and an action button whose
   label/icon follow the output type and link.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_URL = "data/outputs/edit_publications_and_outputs_page.json";
  var SECTION_URL = "data/edit_publications_and_outputs_section.json";
  var OUTPUTS_DIR = "data/outputs/";
  var COLLECTIONS_DIR = OUTPUTS_DIR + "collections/";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;
  var pinnedFirst = window.CWL.pinnedFirst;
  var featuredChipHtml = window.CWL.featuredChipHtml;
  var imageList = window.CWL.imageList;
  var galleryBadgeHtml = window.CWL.galleryBadgeHtml;
  var outputButtonsHtml = window.CWL.outputButtonsHtml;

  function reverseNumbering(entry) {
    var value = entry.show_reverse_numbering;
    if (value == null) value = entry.reverse_numbering;
    if (value != null) {
      return !(value === false || value === 0 ||
        /^(false|no|off|0)$/i.test(String(value).trim()));
    }
    return entry.reverseNumbering === true ||
      String(entry.numbering || "").toLowerCase() === "reverse";
  }

  /* The band's one button, in the current shape or an older one. */
  function sectionButton(entry) {
    var b = entry.button;
    if (!b || typeof b !== "object") b = entry.publications_and_outputs_section_button;
    if (!b || typeof b !== "object") return { label: "", link: "" };
    var label = b.label != null
      ? b.label
      : (b.publications_and_outputs_section_button_label != null
        ? b.publications_and_outputs_section_button_label
        : b.text);
    var link = b.link != null
      ? b.link
      : (b.publications_and_outputs_section_button_link != null
        ? b.publications_and_outputs_section_button_link
        : b.research_areas_section_button_link);
    return {
      label: String(label == null ? "" : label),
      link: String(link == null ? "" : link)
    };
  }

  function rowHtml(item, index, publisherLabel, startNumber, step, featuredLabel, featuredBackground) {
    var kicker = [item.venue || item.source || "", item.year == null ? "" : String(item.year), item.status || ""]
      .filter(Boolean).join(" \u00b7 ");
    var people = window.CWL.peopleNames ? window.CWL.peopleNames(item) : [];
    var details = item.details || item.meta || "";
    var hasOwnNumber = item && Object.prototype.hasOwnProperty.call(item, "_number");
    var number = hasOwnNumber ? item._number : startNumber + index * (step == null ? 1 : step);
    var numberText = (number === "" || number == null)
      ? ""
      : ("0" + number).slice(-2);
    /* The pictures on the row: the first fills the plate, the rest wait
       in the lightbox, each with the words that belong to it. A row with
       none looks exactly as it did. */
    var pics = imageList(item, "", item._list || "publications");

    return [
      '      <div class="py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center group hover:bg-[#FAF9F5]/5 px-4 transition-colors">',
      '        <div class="lg:col-span-1">',
      '          <span class="font-headline-sm text-headline-sm text-[#A69F8E] group-hover:text-[#C7BAA0] transition-colors">' + numberText + "</span>",
      "        </div>",
      '        <div class="lg:col-span-9 flex items-center gap-6">',
      pics.length
        ? '          <div class="relative hidden sm:block w-[160px] shrink-0">' +
          '            <div class="absolute -top-2 -right-2 w-full h-full border border-[#C7BAA0]/40 pointer-events-none cw-wireframe"></div>' +
          '            <button type="button" class="relative block w-full p-2 bg-[#21211E] shadow-2xl cursor-zoom-in" aria-label="View the picture" data-lightbox="' + esc(pics.map(function (p) { return p.src; }).join("|")) + '" data-lightbox-caption="' + esc(pics.map(function (p) { return p.caption; }).join("|")) + '">' +
          '              <span class="block aspect-[4/3] bg-[#1B1C19]">' +
          '                <img class="w-full h-full object-cover" loading="lazy" alt="' + esc(pics[0].alt || window.CWL.altText) + '" src="' + esc(pics[0].src) + '" />' +
          "              </span>" +
          galleryBadgeHtml(pics.length) +
          "            </button>" +
          "          </div>"
        : "",
      '          <div class="min-w-0">',
      '            <div class="flex flex-wrap items-center gap-2 mb-1">',
      '              <span class="font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E]">' + esc(kicker) + "</span>",
      item.is_featured === true
        ? featuredChipHtml(item, featuredLabel, featuredBackground)
        : "",
      "            </div>",
      '            <h3 class="font-headline-md text-headline-md text-[#FAF9F5] font-normal mb-2">' + esc(item.title || "") + "</h3>",
      people.length
        ? '            <p class="font-body-sm text-body-sm text-[#CDC8BC]">' + esc(people.join(", ")) + "</p>"
        : "",
      details
        ? '            <p class="font-label-sm text-label-sm uppercase tracking-wider text-[#A69F8E]' + (people.length ? " mt-3" : "") + '">' + esc(details) + "</p>"
        : "",
      "          </div>",
      "        </div>",
      '        <div class="lg:col-span-2 flex flex-col items-stretch gap-2">',
      outputButtonsHtml(item, "dark", publisherLabel, {
        base: "",
        viewer: "pages/article.html?url=../"
      }),
      "        </div>",
      "      </div>"
    ].join("\n");
  }

  function render(entry, data, items, startNumber, step) {
    var button = sectionButton(entry);
    var buttonHref = button.link ? window.CWL.link(button.link) : "";
    /* The home band reads only its own section file; an empty or missing
       key prints nothing — no fallback to the outputs page's words. */
    var headingText = (entry.heading != null ? entry.heading : entry.publications_and_outputs_section_heading) || "";
    var subheading = (entry.subheading != null ? entry.subheading : entry.publications_and_outputs_section_subheading) || "";
    var intro = (entry.intro != null ? entry.intro : entry.publications_and_outputs_section_introduction) || "";

    return [
      '<div class="max-w-[1260px] mx-auto">',
      '  <div class="flex flex-col items-center text-center mb-10 pb-6 border-b border-[#FAF9F5]/20">',
      "    <div>",
      subheading
        ? '      <span class="font-label-md text-label-md uppercase tracking-[0.25em] text-[#A69F8E] block mb-2">' + esc(subheading) + "</span>"
        : "",
      headingText
        ? '      <div class="flex items-baseline gap-6 justify-center">' +
          '<h2 class="font-headline-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] uppercase tracking-wide text-[#FAF9F5]">' + esc(headingText) + "</h2>" +
          "</div>"
        : "",
      "    </div>",
      intro
        ? '      <p class="font-body-md text-body-md text-[#CDC8BC] max-w-[900px] mt-4 md:mt-0">' + esc(intro) + "</p>"
        : "",
      "  </div>",
      '  <div class="divide-y divide-[#FAF9F5]/15">',
      items.map(function (item, i) {
        return rowHtml(item, i, data && (
          data.external_link_label_for_outputs != null
            ? data.external_link_label_for_outputs
            : data.publisherLabel), startNumber, step,
          data && data.featured_tag_label,
          data && (data.featured_tag_background_colour != null
            ? data.featured_tag_background_colour
            : data.featured_tag_background));
      }).join("\n"),
      "  </div>",
      buttonHref
        ? [
            '  <div class="mt-12 flex justify-center">',
            '    <a class="inline-flex items-center justify-center gap-2 w-[280px] max-w-full bg-[#C7BAA0] text-[#191917] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:bg-[#D8CCB5] transition-colors duration-200" href="' + esc(buttonHref) + '">' + esc(button.label || "") + '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span></a>',
            "  </div>"
          ].join("\n")
        : "",
      "</div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  function addedTime(item) {
    var raw = item && item["added_date"];
    var m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(raw || "").trim());
    if (!m) return 0;
    return Date.UTC(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  }

  function pickItems(data, count, asWritten, reverse) {
    var all = (data && Array.isArray(data.items)) ? data.items : [];

    /* Across several lists, the added date is the only shared chronology:
       newest first, so the latest items reach the home band. A single
       chosen list/collection keeps its file order. */
    var dated = all.some(function (it) { return addedTime(it) > 0; });
    if (dated) {
      var datedItems = all.filter(function (it) { return addedTime(it) > 0; })
        .sort(function (a, b) { return addedTime(b) - addedTime(a); });
      /* People append to the end, so undated items fill from the bottom:
         the last one in the file is the newest of them. */
      var undatedItems = all.filter(function (it) { return addedTime(it) === 0; })
        .reverse();
      var ordered = datedItems.concat(undatedItems);
      var featuredSorted = ordered.filter(function (it) { return it && it.is_featured === true; });
      var restSorted = ordered.filter(function (it) { return !(it && it.is_featured === true); });
      return {
        items: featuredSorted.concat(restSorted).slice(0, count),
        startNumber: 1,
        step: 1
      };
    }

    /* Reverse numbering reads the list from its newest end: the last
       `count` entries, keeping their absolute positions (…23, 24, 25).
       A featured item forces its way in, wearing its own position, and
       leads the band. */
    if (reverse) {
      var featuredReverse = all.filter(function (it) { return it && it.is_featured === true; }).reverse();
      var restReverse = all.filter(function (it) { return !(it && it.is_featured === true); }).reverse();
      var pickedReverse = featuredReverse.concat(restReverse).slice(0, count);
      pickedReverse.forEach(function (it) {
        it._number = all.indexOf(it) + 1;
      });
      return {
        items: pickedReverse,
        startNumber: all.length,
        step: -1
      };
    }
    if (asWritten) return { items: all.slice(0, count), startNumber: 1, step: 1 };
    /* Featured leads; the rest of the band is filled the way it always
       was (pinned first, then the list order). Pinned alone does not
       earn a place here — featured does. */
    var featured = all.filter(function (it) { return it && it.is_featured === true; });
    var rest = all.filter(function (it) { return !(it && it.is_featured === true); });
    var source = featured.concat(pinnedFirst(rest));
    return { items: source.slice(0, count), startNumber: 1, step: 1 };
  }

  /* Which records the band shows:

       "publications_and_outputs_section_show": "all_lists"
       "publications_and_outputs_section_show": "list"
       "publications_and_outputs_section_list_file_name": "publications"

       "publications_and_outputs_section_show": "collection"
       "publications_and_outputs_section_collection_file_name": "conference_2026"

     "all_lists" reads every file named in the page config's
     `list_file_names` - collections are not lists, so they never slip in.
     A new list file becomes selectable by naming it, with no code change. */
  function cleanName(value) {
    var name = String(value == null ? "" : value).trim().replace(/\.json$/i, "");
    return /^[a-z0-9_-]+$/i.test(name) ? name : "";
  }

  function cleanNames(value) {
    var list = Array.isArray(value) ? value : (value == null ? [] : [value]);
    var out = [];
    list.forEach(function (name) {
      var clean = cleanName(name);
      if (clean && out.indexOf(clean) === -1) out.push(clean);
    });
    return out;
  }

  function withItems(config, items) {
    var out = {};
    Object.keys(config || {}).forEach(function (key) { out[key] = config[key]; });
    out.items = Array.isArray(items) ? items : [];
    return out;
  }

  /* Only the named list files, in the order written — the numbering and
     count are then based on that subset alone. */
  function loadLists(config, names) {
    return Promise.all(names.map(function (name) {
      return loadJson(OUTPUTS_DIR + name + ".json");
    })).then(function (lists) {
      var items = [];
      lists.forEach(function (list, i) {
        var rows = Array.isArray(list)
          ? list
          : (list && Array.isArray(list.add_items_to_list)
            ? list.add_items_to_list
            : (list && Array.isArray(list.items) ? list.items : []));
        rows.forEach(function (item) {
          if (item && typeof item === "object") {
            item._list = names[i];
            if (list && list.list_name) item.type = String(list.list_name);
            if (list && list.primary_button_label != null) {
              item._primary_button_label = list.primary_button_label;
            }
            if (list && list.secondary_button_label != null) {
              item._secondary_button_label = list.secondary_button_label;
            }
          }
        });
        items = items.concat(rows);
      });
      return withItems(config, items);
    });
  }

  function titleKey(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function collectionSelection(all, set) {
    var index = {};
    ((all && all.items) || []).forEach(function (item) {
      if (item && item.title) index[titleKey(item.title)] = item;
    });
    var titles = set && (set.titles || set.names || set.publications);
    var list = Array.isArray(titles) ? titles : (titles == null ? [] : [titles]);
    var items = [];
    list.forEach(function (entry) {
      if (entry && typeof entry === "object") {
        items.push(entry);
        return;
      }
      var found = index[titleKey(entry)];
      if (found) items.push(found);
    });
    return items;
  }

  /* One friendly setting:

       "publications_and_outputs_section_show_items_from": "all"
       "publications_and_outputs_section_show_items_from": "publications"
       "publications_and_outputs_section_show_items_from": [ "publications", "patents" ]
       "publications_and_outputs_section_show_items_from": "publications, patents"
       "publications_and_outputs_section_show_items_from": "collection: conference_2026"

     The older split keys ("…_show", "…_list_file_name",
     "…_collection_file_name", "…_lists_to_show") still read. */
  function showChoice(entry) {
    var raw = entry.lists != null
      ? entry.lists
      : entry.list_lists_or_collections_to_show_in_publications_and_outputs_section;
    if (raw == null) raw = entry.list_Lists_or_collections_to_show_in_publications_and_outputs_section;
    if (raw == null) raw = entry.publications_and_outputs_section_show_items_from;
    if (raw != null) {
      if (Array.isArray(raw)) {
        var arr = cleanNames(raw);
        return arr.length ? { mode: "lists", lists: arr } : { mode: "all" };
      }
      var text = String(raw).trim();
      var collection = /^collection\s*:\s*(.+)$/i.exec(text);
      if (collection) {
        return { mode: "collection", collection: cleanName(collection[1]) };
      }
      if (!text || /^(all|all_lists|everything|every list)$/i.test(text)) {
        return { mode: "all" };
      }
      var names = cleanNames(text.split(","));
      return names.length ? { mode: "lists", lists: names } : { mode: "all" };
    }

    var mode = String((entry.show != null ? entry.show : entry.publications_and_outputs_section_show) || "all_lists")
      .toLowerCase().trim();
    var listName = cleanName(entry.list != null ? entry.list : entry.publications_and_outputs_section_list_file_name);
    var collectionName = cleanName(entry.collection != null ? entry.collection : entry.publications_and_outputs_section_collection_file_name);
    var chosen = cleanNames(entry.lists_to_show != null ? entry.lists_to_show : entry.publications_and_outputs_section_lists_to_show);
    if (mode === "list" && listName) return { mode: "lists", lists: [listName] };
    if (mode === "collection" && collectionName) {
      return { mode: "collection", collection: collectionName };
    }
    if (chosen.length) return { mode: "lists", lists: chosen };
    return { mode: "all" };
  }

  function loadSelection(config, entry) {
    var choice = showChoice(entry);

    if (choice.mode === "lists" && choice.lists.length) {
      return loadLists(config, choice.lists);
    }
    if (choice.mode === "collection" && choice.collection) {
      return Promise.all([
        window.CWL.loadOutputItems
          ? window.CWL.loadOutputItems(config, OUTPUTS_DIR)
          : Promise.resolve(config),
        loadJson(COLLECTIONS_DIR + choice.collection + ".json")
      ]).then(function (loaded) {
        return withItems(config, collectionSelection(loaded[0], loaded[1]));
      });
    }
    return window.CWL.loadOutputItems
      ? window.CWL.loadOutputItems(config, OUTPUTS_DIR)
      : Promise.resolve(config);
  }

  /* Which lists take a number. Empty / "all" means every item is
     numbered; otherwise only the named lists are counted, and the other
     rows still show but with an empty number column. */
  function listsToNumber(entry) {
    var raw = entry.number_only != null
      ? entry.number_only
      : entry.only_this_list_or_lists_will_be_counted_to_show_numbering;
    if (raw == null) raw = entry.publications_and_outputs_section_lists_to_number;
    if (raw == null) return [];
    if (Array.isArray(raw) && !raw.length) return [];
    var text = String(raw).trim();
    if (!text || /^(all|everything|every list)$/i.test(text)) return [];
    return cleanNames(Array.isArray(raw) ? raw : text.split(","));
  }

  function numberItems(items, allowed) {
    var seq = 0;
    items.forEach(function (item) {
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

  function boot() {
    var section = document.getElementById("publications");
    if (!section) return;

    Promise.all([loadJson(DATA_URL), loadJson(SECTION_URL)]).then(function (loaded) {
      var config = loaded[0];
      var entry = loaded[1] || {};
      /* The band's words live in one object: "papers_section". An older
         flat file is still read as it is. */
      if (entry.papers_section && typeof entry.papers_section === "object") {
        entry = entry.papers_section;
      }
      var ready = loadSelection(config, entry);

      return ready.then(function (data) {
        var button = sectionButton(entry);
        var buttonHref = button.link ? window.CWL.link(button.link) : "";

        if (entry.is_enabled === false) {
          section.style.display = "none";
          window.CWL.retargetNav("#publications", buttonHref);
          return;
        }
        var count = parseInt(entry.max_items, 10) ||
          parseInt(entry.publications_and_outputs_section_number_of_items_to_show, 10) ||
          parseInt(entry.count, 10) || 3;
        var choice = showChoice(entry);
        var asWritten = choice.mode !== "all";
        var reverse = reverseNumbering(entry);
        var numberLists = listsToNumber(entry);
        if (reverse) numberItems(data.items, numberLists);
        var picked = pickItems(data, count, asWritten, reverse);
        if (!reverse) numberItems(picked.items, numberLists);
        section.innerHTML = render(entry, data, picked.items, picked.startNumber, picked.step);
      });
    });
  }

  boot();
})();
