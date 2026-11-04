/* ------------------------------------------------------------------
   home-news.js — Section 5 (photo cards, light band) of index.html.

   Words:  data/edit_news_and_updates_section.json (the home band's own
           section file).
   Items:  .../edit_news_and_updates_page.json -> the first `count`
           (featured first when any are marked featured, else newest).
   The "Updated ..." date in the header is derived from the newest
   item - no manual bookkeeping. Cards link to their article page
   automatically when data/updates/items/<slug>.json exists.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var SITE_URL = "data/site.json";
  var SECTION_URL = "data/edit_news_and_updates_section.json";
  var PAGE_URL = "data/updates/edit_news_and_updates_page.json";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;
  var parseDate = window.CWL.parseDate;
  var byNewest = window.CWL.byNewest;
  var categoryMap = window.CWL.categoryMap;
  var categoryList = window.CWL.categoryList;
  var badgeText = window.CWL.badgeText;

  function newsItems(data) {
    return (data && (data.add_news_items || data.items)) || [];
  }
  var articleSlug = window.CWL.articleSlug;
  var newsFileId = window.CWL.newsFileId;
  var borrowNews = window.CWL.borrowNews;
  var wireArticleLinks = window.CWL.wireArticleLinks;

  function cardHtml(item, colors, entry, pageData) {
    var date = parseDate(window.CWL.newsDate(item));
    var category = String(window.CWL.newsCategory(item) || "");
    var cat = (colors && colors[category.toLowerCase()]) || {};
    var chip = window.CWL.categoryChip(item, cat);
    var background = chip.background || "#d4e4d0";
    var id = newsFileId(item);
    var hasFile = id && item._newsFileExists !== false;
    var slug = hasFile ? id : "";
    var kicker = (date.month || "") + (item.location ? " \u00b7 " + item.location : "");
    var cardLabel = entry.card_button_label != null
      ? entry.card_button_label
      : (entry.news_and_updates_section_news_card_button_label != null
        ? entry.news_and_updates_section_news_card_button_label
        : entry.cardLink);
    /* the card's photo: one `image`, or the first of `images` */
    var pics = window.CWL.imageList(item, window.CWL.newsImageBase(item, ""));
    var featured = item.is_featured === true
      ? window.CWL.featuredChipHtml(item,
        pageData && pageData.featured_tag_label,
        pageData && (pageData.featured_tag_background_colour != null
          ? pageData.featured_tag_background_colour
          : pageData.featured_tag_background))
      : "";
    var cardClass = "break-inside-avoid mb-8 w-full flex flex-col text-center lg:text-left bg-[#FAF9F6] p-4 group hover:-translate-y-1 transition-transform duration-300";

    return [
      hasFile
        ? '      <a class="' + cardClass + '" data-article-slug="' + esc(slug) + '">'
        : '      <div class="' + cardClass + '">',
      pics.length
        ? [
            '        <div class="overflow-hidden aspect-[16/10] w-full bg-[#E5DFD0] mb-6 relative">',
            '          <img class="w-full h-full object-cover contrast-[1.05] transition-transform duration-500" alt="' + esc(pics[0].alt || window.CWL.altText) + '" src="' + esc(pics[0].src) + '" />',
            '          <div class="absolute top-3 left-3 bg-[#161614]/80 backdrop-blur-sm px-3 py-1">',
            '            <span class="font-label-sm text-label-sm uppercase tracking-widest" style="background:' + esc(background) + ";color:" + badgeText(background) + ';padding:2px 8px;">' + esc(chip.text) + "</span>",
            "          </div>",
            "        </div>"
          ].join("\n")
        : "",
      '        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">',
      featured,
      '          <span class="ml-auto font-label-sm text-label-sm uppercase tracking-wider text-[#7A6F5D]">' + esc(kicker) + "</span>",
      "        </div>",
      '        <h3 class="font-headline-sm text-headline-sm text-primary font-normal mb-3">' + esc(window.CWL.newsTitle(item) || "") + "</h3>",
      '        <p class="font-body-sm text-body-sm text-on-surface-variant mb-6 leading-relaxed lg:text-justify">' + esc(window.CWL.newsIntro(item) || "") + "</p>",
      hasFile ? [
        '        <div class="pt-4 border-t border-[#1B1C19]/15">',
        '          <span class="inline-flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-widest text-[#1B1C19] group-hover:text-[#7A6F5D] transition-colors">',
        "            <span>" + esc(cardLabel || "Read more") + "</span>",
        '            <span class="cw-icon cw-icon--arrow-forward text-sm" aria-hidden="true"></span>',
        "          </span>",
        "        </div>"
      ].join("\n") : "",
      hasFile ? "      </a>" : "      </div>"
    ].join("\n");
  }

  function render(entry, data, items) {
    var rawButton = entry.button || entry.news_and_updates_section_main_button || {};
    var button = {
      label: rawButton.label != null
        ? rawButton.label
        : (rawButton.news_and_updates_section_main_button_label != null
          ? rawButton.news_and_updates_section_main_button_label
          : rawButton.text),
      link: rawButton.link != null
        ? rawButton.link
        : rawButton.news_and_updates_section_main_button_label_link
    };
    var subheading = entry.subheading != null
      ? entry.subheading
      : (entry.news_and_updates_section_subheading != null
        ? entry.news_and_updates_section_subheading
        : entry.eyebrow);
    var heading = entry.heading != null
      ? entry.heading
      : entry.news_and_updates_section_heading;
    var intro = entry.intro != null
      ? entry.intro
      : (entry.news_and_updates_section_introduction != null
        ? entry.news_and_updates_section_introduction
        : entry.text);
    var all = newsItems(data);
    var updatedMonth = window.CWL.latestMonth(all);
    var updatedTemplate = entry.updated_label != null
      ? String(entry.updated_label)
      : (entry.news_and_updates_section_updated_label != null
        ? String(entry.news_and_updates_section_updated_label)
        : "Updated {date}");
    var updated = updatedMonth ? updatedTemplate.replace("{date}", updatedMonth) : "";

    return [
      '<div class="max-w-[1260px] mx-auto">',
      '  <div class="flex flex-col lg:flex-row lg:items-end justify-between text-center lg:text-left mb-16 pb-6 border-b border-[#1B1C19]/20">',
      "    <div>",
      subheading
        ? '      <span class="font-label-md text-label-md uppercase tracking-[0.25em] text-secondary block mb-2">' + esc(subheading) + "</span>"
        : "",
      heading
        ? '      <h2 class="font-headline-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] uppercase tracking-wide text-primary">' + esc(heading) + "</h2>"
        : "",
      intro
        ? '      <p class="font-body-md text-body-md text-on-surface-variant max-w-[900px] mx-auto lg:mx-0 mt-4 leading-relaxed lg:text-justify">' + esc(intro) + "</p>"
        : "",
      "    </div>",
      '    <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary mt-4 lg:mt-0">' + esc(updated) + "</span>",
      "  </div>",
      '  <div class="columns-1 md:columns-2 lg:columns-3 gap-8">',
      items.map(function (item) { return cardHtml(item, colors, entry, data); }).join("\n"),
      "  </div>",
      button.link
        ? [
            '  <div class="mt-12 flex justify-center">',
            '    <a class="inline-flex items-center justify-center gap-2 w-[280px] max-w-full bg-[#1B1C19] text-[#FAF9F5] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:bg-[#3E3C35] transition-colors duration-200" href="' + esc(button.link) + '">' + esc(button.label || "") + '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span></a>',
            "  </div>"
          ].join("\n")
        : "",
      "</div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  var colors = {};

  function pickItems(data, count) {
    /* Featured items always earn a place on the home band, however old
       they are; the remaining slots go to the newest of the rest.
       Pinned alone does NOT pull an item onto the home page — that is
       what featured is for. */
    var all = newsItems(data);
    var featured = all.filter(function (it) { return it && it.is_featured === true; }).sort(byNewest);
    var rest = all.filter(function (it) { return !(it && it.is_featured === true); }).sort(byNewest);
    return featured.concat(rest).slice(0, count);
  }

  function boot() {
    var section = document.getElementById("news");
    if (!section) return;

    Promise.all([loadJson(SITE_URL), loadJson(SECTION_URL), loadJson(PAGE_URL)]).then(function (loaded) {
      var site = loaded[0];
      var entry = loaded[1] || {};
      /* The band's words live in one object: "news_section". An older flat
         file is still read as it is. */
      if (entry.news_section && typeof entry.news_section === "object") {
        entry = entry.news_section;
      }
      var data = loaded[2];
      /* Items may live in the band's own file (one file feeds both views);
         the page file is the fallback while older copies still carry them. */
      var sectionItems = newsItems(entry);
      if (sectionItems.length) {
        data = Object.assign({}, data, { add_news_items: sectionItems });
      }
      var siteEntry = window.CWL.sectionConfig(site, "news_and_updates");

      /* The main button may name its destination (@updates, @team…). */
      var mainButton = entry.button || entry.news_and_updates_section_main_button;
      if (mainButton) {
        var rawLink = mainButton.link != null
          ? mainButton.link
          : mainButton.news_and_updates_section_main_button_label_link;
        if (rawLink) {
          var resolved = window.CWL.link(rawLink);
          if (mainButton.news_and_updates_section_main_button_label_link != null) {
            mainButton.news_and_updates_section_main_button_label_link = resolved;
          } else {
            mainButton.link = resolved;
          }
        }
      }

      if (siteEntry && siteEntry.is_enabled === false) {
        section.style.display = "none";
        window.CWL.retargetNav("#news", mainButton && (mainButton.news_and_updates_section_main_button_label_link || mainButton.link));
        return;
      }
      colors = categoryMap(categoryList(data));
      var count = parseInt(entry.max_items, 10) ||
        parseInt(entry.count, 10) || 3;
      var items = newsItems(data);
      borrowNews(items, "data/updates/items/").then(function () {
        section.innerHTML = render(entry, data, pickItems(data, count));
        wireArticleLinks(section, {
          attr: "data-article-slug",
          dataDir: "data/updates/items/",
          hrefPrefix: "pages/news-article.html?news="
        });
      });
    });
  }

  boot();
})();
