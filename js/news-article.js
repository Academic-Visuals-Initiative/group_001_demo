/* ------------------------------------------------------------------
   news-article.js — renders ONE news story on pages/news-article.html
   from data/updates/items/<slug>.json.

   The page is the SAME deep-page shell the research areas open with
   (js/elements.js → contentPage): the shared hero band, then every
   content element in file order. One vocabulary, one drawing, one
   layout — a paragraph or a gallery that looks a certain way on a
   research area looks exactly the same way here. Only the content
   differs.

   The story's own words (HERO_WORDS below) fill the hero band:
     title    — the headline
     category — the kicker under it
      summary  — the note in the right-hand column (item_introduction)
     date + add_author_names — the small meta line under the headline
   Everything else in the file is a content element (§15): add_paragraph,
   add_list, add_image, add_gallery, add_slideshow, add_embed_media, add_embed_media_row, add_3d_model, add_heading, button, divider,
   add_quote, add_special_note, add_table, add_equation, add_contact_information, add_focus_list, add_tags, add_full_width_links, cards, add_content_to_page.

   The URL picks the story: news-article.html?news=field_season_…
   (the older ?slug= address still works too).
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_DIR = "../data/updates/items/";

  /* The hero words — the element flow skips these keys; they fill the
     hero band's fixed slots instead. */
  var HERO_WORDS = ["title", "item_title", "category", "add_relevant_category_name",
    "summary", "item_introduction", "date", "current_date", "authors", "add_author_names", "eyebrow"];

  /* The page's fixed words — they never need editing, so they live
     here rather than in the JSON. */
  var WORDS = {
    label: "News",
    focusLabel: "Key Focus Areas",
    notFound: "We couldn't find that story.",
    missing: "No story specified."
  };

  var messageHtml = window.CWL.messageHtml;
  var E = window.CWL_ELEMENTS;

  /* 2026-10-14 → "14 Oct 2026" */
  function formatDate(iso) {
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return String(iso);
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var d = parseInt(parts[2], 10);
    var m = parseInt(parts[1], 10) - 1;
    if (isNaN(d) || isNaN(m) || !months[m]) return String(iso);
    return d + " " + months[m] + " " + parts[0];
  }

  /* ["Dr. A", "Prof. B", "S. C"] → "Dr. A, Prof. B and S. C" */
  function formatAuthors(arr) {
    if (!arr || !arr.length) return "";
    if (arr.length === 1) return String(arr[0]);
    return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
  }

  /* The small line under the headline: the date, then the byline. */
  function metaLine(data) {
    var bits = [];
    var when = window.CWL.newsDate ? window.CWL.newsDate(data) : data.date;
    if (when) bits.push(formatDate(when));
    var authors = data.add_author_names != null ? data.add_author_names : data.authors;
    if (authors && authors.length) bits.push(formatAuthors(authors));
    return bits.filter(Boolean).join(" \u00b7 ");
  }

  /* The article comes from the address:
     news-article.html?news=my-article — the older ?slug= still works. */
  function getSlug() {
    var m = /[?&](?:news|slug)=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]).trim() : "";
  }

  function boot() {
    var mount = document.getElementById("news-content");
    if (!mount || !E || !E.contentPage) return;

    var slug = getSlug();
    if (!slug) {
      mount.innerHTML = messageHtml(WORDS.missing);
      return;
    }

    /* The named links ({…|@team}) resolve through the shared registry,
       so it is loaded alongside the article. */
    var links = window.CWL.loadLinks ? window.CWL.loadLinks() : null;
    var story = fetch(DATA_DIR + slug + ".json", { cache: "no-store" }).then(function (res) {
      if (!res.ok) return null;
      return res.text().then(window.CWL.parseJson).catch(function (err) {
        console.error("[news-article] could not parse " + DATA_DIR + slug + ".json", err);
        return null;
      });
    });
    var team = window.CWL.loadJson ? window.CWL.loadJson("../data/edit_team_section.json") : Promise.resolve(null);
    var publications = window.CWL.loadJson ? window.CWL.loadJson("../data/outputs/publications.json") : Promise.resolve(null);

    Promise.all([links, story, team, publications]).then(function (loaded) {
      var data = loaded[1];
      if (!data) {
        mount.innerHTML = messageHtml(WORDS.notFound);
        return;
      }
      if (window.CWL.fillDeepPeople) data = window.CWL.fillDeepPeople(data, loaded[2]);

      function draw() {
        /* The shared shell: the hero band (the story's own words) then
           every content element — drawn by the same function, with the
           same options, as pages/research-area.html. */
        mount.innerHTML = E.contentPage(data, {
          hero: {
            label: WORDS.label,
            heading: (window.CWL.newsTitle ? window.CWL.newsTitle(data) : data.title) || "",
            kicker: (window.CWL.categoryChip ? window.CWL.categoryChip(data, {}).text : window.CWL.newsCategory(data)) || "",
            text: data.item_introduction != null ? data.item_introduction : (data.summary || ""),
            meta: metaLine(data),
            centerSmall: true
          },
          reserved: HERO_WORDS,
          root: "../",
          imageBase: window.CWL.newsImageBase
            ? window.CWL.newsImageBase(data, "../")
            : "",
          focusLabel: WORDS.focusLabel,
          viewer: "article.html?url="
        });

        E.mountSlideshows(mount);
        if (E.mountPublicationLists) E.mountPublicationLists(mount);
        if (E.mountEquations) E.mountEquations(mount);
        if (window.CWL.wireArticleLinks) {
          window.CWL.wireArticleLinks(mount, {
            attr: "data-profile-slug",
            dataDir: "../data/team/profiles/",
            hrefPrefix: "profile.html?profile="
          });
        }

        var storyTitle = window.CWL.newsTitle ? window.CWL.newsTitle(data) : data.title;
        window.CWL.setPageTitle(storyTitle);
      }

      if (window.CWL.preparePublications) {
        window.CWL.preparePublications(data, loaded[3]).then(function (filled) {
          data = filled;
          draw();
        });
      } else {
        draw();
      }
    });
  }

  boot();
})();
