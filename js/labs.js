/* ------------------------------------------------------------------
   labs.js — renders the Labs & Stations page (pages/labs.html) in
   the template-02 editorial language: an eyebrow hero, hairline
   category pills, and every place as a hairline row (chips + serif
   name + location | introduction + tag chips | photo plate).

   Reads data/labs/edit_labs.json — the page's header words
   (labs_header_subheading, labs_header_heading,
   labs_header_introduction), the divider label (labs_divider_label),
   the back-button words (back_button_label), the categories
   (categories_in_labs, with their chip colours), the list of
   availability statuses (lab_item_availabilities) and every item
   (lab_items). Each item needs a lab_item_category + lab_item_name;
   lab_item_location, lab_item_introduction, item_availability_since,
   lab_item_tags and lab_item_availability simply don't draw when
   missing. An optional picture (or several) sits in the row's right
   column; a bare filename is looked up in
   assets/images/research_areas_and_labs/labs/, while a path is used
   as written.

   The category pills (All + one per category) build from
   `categories_in_labs`; picking one filters the ledger and updates
   the count ("6 places" / "2 places"). No pagination — every place
   is on the page at once.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_URL = "../data/labs/edit_labs.json";
  /* Bare picture names in the labs file are looked up here. A path
     (with a slash, or a full URL) is used exactly as written. */
  var IMAGE_BASE = "../assets/images/research_areas_and_labs/labs/";

  var esc = window.CWL.esc;
  var messageHtml = window.CWL.messageHtml;
  var loadJson = window.CWL.loadJson;
  var badgeText = window.CWL.badgeText;
  var pageHero = window.CWL.pageHero;
  var imageList = window.CWL.imageList;
  var galleryBadgeHtml = window.CWL.galleryBadgeHtml;

  /* Which category pill is selected ("all" = everything). */
  var state = { kind: "all" };

  /* Colour lookup by lowercased label → entry. The category and
     availability lists use their own label keys, so one reader serves
     both. */
  function colorMap(list, labelKey) {
    var map = {};
    (list || []).forEach(function (k) {
      var label = k && k[labelKey];
      if (label != null && String(label).trim()) {
        map[String(label).toLowerCase()] = k;
      }
    });
    return map;
  }

  /* One filter pill ("All" first). A category pill wears its colour
     from data/labs/edit_labs.json; the selected pill turns dark. */
  function pillHtml(label, value, active, category) {
    var classes = "filter-btn font-label-sm text-label-sm uppercase tracking-[0.15em] px-space-md py-[9px]";
    var style = "";
    var colour = category && category.background_colour;
    if (colour) {
      classes += " filter-btn--kind";
      style = ' style="--kind-bg:' + esc(colour) +
              ";--kind-fg:" + badgeText(colour) + '"';
    }
    if (active) classes += " active";
    return (
      '<button class="' + classes +
      '" data-kind="' + esc(value) + '"' + style + ">" + esc(label) + "</button>"
    );
  }

  /* The category pills above the ledger: "All" + one per category
     (file order). */
  function renderPills(categories) {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;
    var html = [pillHtml("All", "all", true)];
    categories.forEach(function (k) {
      var name = k && k.category_name;
      if (name != null && String(name).trim()) {
        html.push(pillHtml(String(name), String(name).toLowerCase(), false, k));
      }
    });
    bar.innerHTML = html.join("\n");
  }

  /* The item's one-or-several pictures, translated into the shared
     `imageList` shape: image_path → src, image_caption → caption. One
     picture may be a filename plus an item-level `image_caption`, or a
     single object carrying both keys. A list keeps its own captions. */
  function itemPictures(item) {
    var raw = item && item.lab_item_image_or_images;
    var itemCaption = item && (item.image_caption != null
      ? item.image_caption
      : item.lab_item_image_caption);

    function one(entry) {
      if (entry && typeof entry === "object") {
        var picture = { src: entry.image_path };
        var caption = entry.image_caption != null
          ? entry.image_caption
          : entry.lab_item_image_caption;
        if (caption != null) picture.caption = caption;
        return picture;
      }
      return entry;
    }

    if (Array.isArray(raw)) return raw.map(one);
    if (raw && typeof raw === "object") return [one(raw)];
    if (raw != null && itemCaption != null) {
      /* One picture with its caption written beside it (the shorthand
         for a single-image row). A "|" string still splits, with the
         one caption under the first picture. */
      return String(raw).split("|").map(function (name, i) {
        return { src: name, caption: i === 0 ? itemCaption : "" };
      });
    }
    return raw;
  }

  /* One place row: category + availability chips, the serif name and
     the location (with the optional "since" tail) on the left; the
     introduction and tag chips in the middle; the optional picture as
     a framed plate on the right. */
  function cardHtml(item, map, availMap) {
    var name = item && item.lab_item_name != null ? String(item.lab_item_name) : "";
    if (!name) return "";
    var kind = String(item.lab_item_category || "");
    var colors = map[kind.toLowerCase()] || {};

    /* The optional availability status ("Available", "Unavailable") — a
       small coloured chip that follows the availability colour list. */
    var availability = item.lab_item_availability == null ? "" : String(item.lab_item_availability);
    var avColors = availability ? availMap[availability.toLowerCase()] || {} : {};
    var categoryColour = colors.background_colour;
    var availabilityColour = avColors.background_colour;

    /* One picture, or several: the first fills the plate, the rest wait
       in the lightbox, each with its own words. */
    var rawImages = item.lab_item_image_or_images;
    var pics = imageList({
      image: itemPictures(item),
      title: name
    }, IMAGE_BASE);

    var chips = [
      kind
        ? '<span class="px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest' +
          (categoryColour ? "" : " border border-outline-variant text-on-surface-variant") + '"' +
          (categoryColour
            ? ' style="background:' + esc(categoryColour) +
              ";color:" + badgeText(categoryColour) + '"'
            : "") + ">" + esc(kind) + "</span>"
        : "",
      availability
        ? '<span class="px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest' +
          (availabilityColour ? "" : " border border-outline-variant text-on-surface-variant") + '"' +
          (availabilityColour
            ? ' style="background:' + esc(availabilityColour) +
              ";color:" + badgeText(availabilityColour) + '"'
            : "") + ">" + esc(availability) + "</span>"
        : ""
    ].filter(Boolean).join("\n          ");

    var location = item.lab_item_location == null ? "" : String(item.lab_item_location);
    if (item.item_availability_since != null && String(item.item_availability_since).trim()) {
      location += (location ? " · " : "") + "since " + String(item.item_availability_since);
    }

    var tags = (Array.isArray(item.lab_item_tags) ? item.lab_item_tags : []).filter(
      function (e) { return String(e || "").trim(); }
    );

    return [
      '<article class="lab-card border-t border-outline-variant py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop text-center lg:text-left" data-kind="' + esc(kind.toLowerCase()) + '">',
      '  <div class="lg:col-span-4 flex flex-col items-center lg:items-start gap-space-xs">',
      "          " + chips,
      '    <h3 class="font-headline-md text-headline-md text-on-surface leading-snug mt-space-xs">' + esc(name) + "</h3>",
      location
        ? '    <p class="flex items-center gap-1 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">' +
          '<span class="cw-icon cw-icon--location text-[14px]" aria-hidden="true"></span>' +
          esc(location) + "</p>"
        : "",
      "  </div>",
      '  <div class="lg:col-span-5 flex flex-col items-center lg:items-start gap-space-sm">',
      item.lab_item_introduction
        ? '    <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed lg:text-justify">' + esc(item.lab_item_introduction) + "</p>"
        : "",
      tags.length
        ? '    <div class="flex flex-wrap justify-center lg:justify-start gap-space-xs pt-space-xs">' +
          tags
            .map(function (e) {
              return '<span class="px-space-sm py-0.5 border border-outline-variant font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">' + esc(e) + "</span>";
            })
            .join("") +
          "</div>"
        : "",
      "  </div>",
      rawImages
        ? '  <div class="lg:col-span-3">' +
          '    <div class="relative">' +
          '      <div class="absolute -top-2 -right-2 w-full h-full border border-outline-variant pointer-events-none cw-wireframe"></div>' +
          '      <button type="button" class="relative block w-full p-2 bg-surface-lowest shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-zoom-in" aria-label="View the picture" data-lightbox="' +
          esc(pics.map(function (p) { return p.src; }).join("|")) + '" data-lightbox-caption="' +
          esc(pics.map(function (p) { return p.caption; }).join("|")) + '">' +
          '        <span class="block overflow-hidden aspect-[4/3] bg-surface-container">' +
          '          <img class="w-full h-full object-cover" loading="lazy" src="' + esc(pics[0].src) +
          '" alt="' + esc(item.image_alt || "") + '" />' +
          "        </span>" +
          galleryBadgeHtml(pics.length) +
          "      </button>" +
          "    </div>" +
          "</div>"
        : "",
      "</article>"
    ].filter(Boolean).join("\n");
  }

  /* Show only the rows matching the selected kind; the count shows
     how many MATCH ("6 places"); the empty state appears at zero. The
     first row shown drops its top border — the header's hairline is
     already the line above it. */
  function applyFilter() {
    var grid = document.getElementById("labs-grid");
    if (!grid) return;
    var matches = 0;
    var firstShown = true;
    grid.querySelectorAll(".lab-card").forEach(function (card) {
      var ok = state.kind === "all" || card.getAttribute("data-kind") === state.kind;
      card.style.display = ok ? "" : "none";
      if (ok) {
        card.classList.toggle("border-t", !firstShown);
        firstShown = false;
        matches++;
      }
    });
    var countEl = document.getElementById("labs-count");
    if (countEl) countEl.textContent = matches + " place" + (matches === 1 ? "" : "s");
    var empty = document.getElementById("empty-state");
    if (empty) empty.classList.toggle("hidden", matches > 0);
  }

  /* One click handler for the pill row: select, re-filter. */
  function wirePills() {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;
      bar.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      state.kind = btn.getAttribute("data-kind") || "all";
      applyFilter();
    });
  }

  /* Transitional: the page's short keys fill their older prefixed names. */
  function liftPage(data) {
    var page = data && data.labs_page;
    if (!page || typeof page !== "object") return data;
    if (page.subheading != null) data.labs_header_subheading = page.subheading;
    if (page.heading != null) data.labs_header_heading = page.heading;
    if (page.intro != null) data.labs_header_introduction = page.intro;
    var divider = page.divider_label != null ? page.divider_label : page.label;
    if (divider != null) data.labs_divider_label = divider;
    if (page.back_button_label != null) data.back_button_label = page.back_button_label;
    return data;
  }

  var ITEM_SHORT = {
    category: "lab_item_category",
    name: "lab_item_name",
    location: "lab_item_location",
    intro: "lab_item_introduction",
    since: "item_availability_since",
    tags: "lab_item_tags",
    images: "lab_item_image_or_images",
    image_alt: "lab_item_alt_text",
    availability: "lab_item_availability"
  };

  function liftItem(item) {
    if (!item || typeof item !== "object") return item;
    Object.keys(ITEM_SHORT).forEach(function (short) {
      var old = ITEM_SHORT[short];
      if (item[short] != null && item[old] == null) item[old] = item[short];
    });
    return item;
  }

  function boot() {
    var grid = document.getElementById("labs-grid");
    if (!grid) return;

    loadJson(DATA_URL).then(function (data) {
      if (!data) {
        grid.innerHTML = messageHtml("Places are temporarily unavailable.");
        return;
      }
      data = liftPage(data);
      (data.lab_items || []).forEach(liftItem);

      window.CWL.setPageTitle(data.labs_header_heading);

      var hero = document.getElementById("labs-hero");
      if (hero) {
        hero.innerHTML = pageHero({
          label: data.labs_header_subheading,
          heading: data.labs_header_heading,
          text: data.labs_header_introduction,
          centered: true
        });
      }

      var label = document.getElementById("labs-label");
      if (label && data.labs_divider_label != null) label.textContent = String(data.labs_divider_label);

      /* The header's way home. Its route is fixed (the page root), so the
         file only supplies the words; no link for an editor to break. */
      var backLabel = data.back_button_label;
      if (backLabel == null) {
        var oldBack = (data.buttons || []).filter(function (b) {
          return b && b.back_button_label != null;
        })[0];
        backLabel = oldBack && oldBack.back_button_label;
      }
      var txt = document.getElementById("labs-back-text");
      if (txt) {
        txt.textContent = String(backLabel == null ? "" : backLabel).trim() || "Back to Home";
      }

      var categories = (data.categories_in_labs || []).filter(Boolean);
      renderPills(categories);

      var items = (data.lab_items || []).filter(function (it) {
        return it && it.lab_item_name;
      });
      if (!items.length) {
        grid.innerHTML = messageHtml("No places yet.");
      } else {
        var map = colorMap(categories, "category_name");
        var availMap = colorMap(data.lab_item_availabilities, "lab_item_availability_label");
        grid.innerHTML = items
          .map(function (it) { return cardHtml(it, map, availMap); })
          .join("\n");
      }

      wirePills();
      applyFilter();
    });
  }

  boot();
})();
