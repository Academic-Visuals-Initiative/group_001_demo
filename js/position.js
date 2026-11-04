/* ------------------------------------------------------------------
   position.js — renders ONE hiring position on pages/position.html
   from data/join/positions/<slug>.json.

   The page is the SAME deep-page shell the research areas and the news
   stories open with (js/elements.js → contentPage): the shared hero
   band, then every content element in file order. One vocabulary, one
   drawing, one layout — a paragraph or a gallery looks here exactly as
   it does on a research area; only the content differs.

   The position's own words (HERO_WORDS below) fill the hero band:
     title    — the role ("Postdoctoral Fellow")
     status   — the kicker under it ("Open", "Not hiring")
     summary  — the note in the right-hand column
     duration + date — the small meta line under the headline
   Everything else in the file is a content element (§15): add_paragraph,
   add_list, add_image, add_gallery, add_slideshow, add_embed_media, add_embed_media_row, add_3d_model, add_heading, button, divider,
   add_quote, add_special_note, add_table, add_equation, add_contact_information, add_focus_list, add_tags, add_full_width_links, cards, add_content_to_page.

   The URL picks the position: position.html?positions=postdoctoral_fellow
   (the older ?slug= address still works too).
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_DIR = "../data/join/positions/";

  /* The hero words — the element flow skips these keys; they fill the
     hero band's fixed slots instead. */
  var HERO_WORDS = ["title", "status", "duration", "date", "summary"];

  /* The page's fixed words — they never need editing, so they live
     here rather than in the JSON. */
  var WORDS = {
    label: "Position",
    focusLabel: "Key Focus Areas",
    notFound: "We couldn't find that position.",
    missing: "No position specified."
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

  /* The small line under the headline: the duration, then the date. */
  function metaLine(data) {
    var bits = [];
    if (data.duration) bits.push(String(data.duration));
    if (data.date) bits.push(formatDate(data.date));
    return bits.filter(Boolean).join(" \u00b7 ");
  }

  /* The position comes from the address:
     position.html?positions=my-position — the older ?slug= still works. */
  function getSlug() {
    var m = /[?&](?:positions|position|slug)=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]).trim() : "";
  }

  function boot() {
    var mount = document.getElementById("position-content");
    if (!mount || !E || !E.contentPage) return;

    var slug = getSlug();
    if (!slug) {
      mount.innerHTML = messageHtml(WORDS.missing);
      return;
    }

    /* The named links ({…|@team}) resolve through the shared registry,
       so it is loaded alongside the position. */
    var links = window.CWL.loadLinks ? window.CWL.loadLinks() : null;
    var position = fetch(DATA_DIR + encodeURIComponent(slug) + ".json", { cache: "no-store" }).then(function (res) {
      if (!res.ok) return null;
      return res.text().then(window.CWL.parseJson).catch(function (err) {
        console.error("[position] could not parse " + DATA_DIR + slug + ".json", err);
        return null;
      });
    });
    var team = window.CWL.loadJson ? window.CWL.loadJson("../data/edit_team_section.json") : Promise.resolve(null);
    var publications = window.CWL.loadJson ? window.CWL.loadJson("../data/outputs/publications.json") : Promise.resolve(null);

    Promise.all([links, position, team, publications]).then(function (loaded) {
      var data = loaded[1];
      if (!data) {
        mount.innerHTML = messageHtml(WORDS.notFound);
        return;
      }
      if (window.CWL.fillDeepPeople) data = window.CWL.fillDeepPeople(data, loaded[2]);

      function draw() {
        /* The shared shell: the hero band (the position's own words) then
           every content element — drawn by the same function, with the
           same options, as pages/research-area.html and
           pages/news-article.html. */
        mount.innerHTML = E.contentPage(data, {
          hero: {
            label: WORDS.label,
            heading: data.title || "",
            kicker: data.status || "",
            text: data.summary || "",
            meta: metaLine(data),
            centerSmall: true
          },
          reserved: HERO_WORDS,
          root: "../",
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

        window.CWL.setPageTitle(data.title);
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
