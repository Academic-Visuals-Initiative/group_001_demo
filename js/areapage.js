/* ------------------------------------------------------------------
   areapage.js — draws ONE research area on pages/research-area.html
   in the template-02 editorial language: the shared hero, then the
   area's content elements as full-width bands.

   How it works:
   1. The URL picks the area by its FILE NAME:
      research-area.html?area=soil-microbiome loads
      data/research/soil-microbiome.json. The file name IS the id.
   2. data/edit_research_section.json holds the optional card record for every area
      (individual_research_area_cards[]:
      individual_research_area_file_id,
      individual_research_area_card_title,
      individual_research_area_card_keyword,
      individual_research_area_card_introduction) — the same list the
      home page "Explore Our Research" cards use. It is only a fallback
      here: the deep file's own words win, and a file with no card still
      opens.
   3. The body content lives in one deep file per area, beside the
      list: data/research/<file name>.json (the news pattern). The deep
      file = the hero words (which win over the record, so a stub
      record works) + the content elements — add_paragraph, add_list, add_image,
      add_gallery, embed, focus — written in the order they should
      appear (see js/elements.js and VOCABULARY §15). A bare picture
      name is looked up in a folder of its own, named after the file —
      data/research/<file name>.json uses
      assets/images/research_areas_and_labs/individual_research_areas/<file name>/;
      a path is used as written. No deep file yet? The page shows the
      hero plus a friendly note.
   4. The page's own words (the eyebrow, the "key focus" heading, the
      not-found message and the "deep file missing" note) are fixed
      in the code — see WORDS below; they never need editing.

   Every element is optional: an area without an image starts at the
   text, one with no focus skips the list, and so on. An unknown or
   missing ?area= shows a friendly message with a way back.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_URL = "../data/edit_research_section.json";
  var DATA_DIR = "../data/research/";
  var HOME_AREAS = "../index.html#research-areas";
  /* Bare picture names in a research-area deep file are looked up in a
     folder of their own, named after the file itself:
       soil-microbiome.json  ->  .../individual_research_areas/soil-microbiome/
     A path (with a slash, or a full URL) is used as written. */
  var IMAGE_ROOT = "../assets/images/research_areas_and_labs/individual_research_areas/";

  /* The hero words — the element flow skips these keys (they fill
     the fixed hero slots above the body instead). The last two shape the
     opener itself: `choose_page_heading_alignment` ("centered" stacks the
     eyebrow, headline and note down the middle — the labs/team look) and
     `show_the_page_heading` (false = no opener at all). */
  var HERO_WORDS = [
    "title",
    "keywords_for_the_page_and_card",
    "intro",
    "choose_page_heading_alignment",
    "show_the_page_heading",
    "hide_the_page_heading"
  ];

  var messageHtml = window.CWL.messageHtml;
  var loadJson = window.CWL.loadJson;
  var E = window.CWL_ELEMENTS;

  /* The page's fixed words — they never need editing, so they live
     here rather than in the JSON. */
  var WORDS = {
    label: "Research Area",
    focusLabel: "Key Focus Areas",
    notFound: "We couldn't find that research area.",
    deepMissing: "The full write-up for this area hasn't been added yet — check back soon."
  };

  /* ?area=soil-microbiome -> "soil-microbiome" (lowercased).
     Works inside iframe by reading the iframe's src attribute. */
  function wantedFileId() {
    var m = /[?&]area=([^&]+)/.exec(window.location.search);
    if (m) return decodeURIComponent(m[1]).trim().toLowerCase();
    /* Fallback: read from the iframe src if we're inside one. */
    try {
      var frame = window.frameElement;
      if (frame && frame.src) {
        var src = frame.src;
        var i = src.indexOf("area=");
        if (i !== -1) {
          var rest = src.substring(i + 5);
          var amp = rest.indexOf("&");
          var val = amp !== -1 ? rest.substring(0, amp) : rest;
          return decodeURIComponent(val).trim().toLowerCase();
        }
      }
    } catch (e) { }
    return "";
  }

  /* The optional card record whose individual_research_area_file_id matches
     (case-insensitive) — it supplies the hero words only when the deep
     file is missing. */
  function findArea(areas, fileId) {
    var card = window.CWL.researchCard;
    for (var i = 0; i < areas.length; i++) {
      var s = card.id(areas[i]);
      if (s && s.toLowerCase() === fileId) return areas[i];
    }
    return null;
  }

  /* The card's own words, translated into the hero slots the shared
     shell reads. The deep file keeps its `title`,
     `keywords_for_the_page_and_card` and
     `intro` keys and still wins when it has
     them. */
  function heroFromCard(area) {
    var card = window.CWL.researchCard;
    return {
      title: card.title(area),
      keywords_for_the_page_and_card: card.keyword(area),
      intro: card.introduction(area)
    };
  }

  function bandOpen() {
    return '<section class="w-full px-margin md:px-margin-tablet lg:px-margin-desktop pt-space-xl">';
  }

  /* The whole page for one area — the shared deep-page shell (§15):
     the hero band, then the elements that have words, drawn by the
     shared element engine. The news pages call the same function, so
     the two can't drift apart. */
  function renderArea(hero, deep, fileId) {
    var title = hero.title || "";
    var parts = [];

    /* The opener's two switches, read from the area's own file:
       "choose_page_heading_alignment": "centered" | "left",
       "show_the_page_heading": false (hide_the_page_heading still reads
       for older files). */
    var align = String((deep && deep.choose_page_heading_alignment) || "").toLowerCase();
    var centered = align === "center" || align === "centered" || align === "centre";
    var hidden = !!(deep && (deep.hide_the_page_heading === true ||
      deep.show_the_page_heading === false));

    parts.push(E.contentPage(deep, {
      hero: hidden ? {} : {
        label: WORDS.label,
        heading: title,
        kicker: hero.keywords_for_the_page_and_card,
        text: hero.intro,
        centered: centered,
        centerSmall: !centered
      },
      reserved: HERO_WORDS,
      root: "../",
      /* This area's own image folder, named after its deep file. */
      imageBase: IMAGE_ROOT + fileId + "/",
      focusLabel: WORDS.focusLabel,
      viewer: "article.html?url="
    }));

    window.CWL.setPageTitle(title);
    return parts.filter(Boolean).join("\n");
  }

  /* The "All research areas" way back — shared by the not-found
     and missing-deep-file states. */
  function backHtml() {
    var resolved = window.CWL.link ? window.CWL.link("@areas") : "";
    var href = (resolved && resolved !== "#") ? resolved : HOME_AREAS;
    return [
      '    <a class="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-primary text-on-primary hover:bg-secondary transition-all font-label-md text-label-md uppercase tracking-[0.15em]" href="' + href + '">',
      "      All research areas",
      '      <span class="cw-icon cw-icon--arrow-outward text-[16px]" aria-hidden="true"></span>',
      "    </a>"
    ].join("\n");
  }

  /* The basic record exists but its deep file
     (data/research/<file name>.json) hasn't been written yet — the hero
     already rendered; add a friendly note and a way back. */
  function deepMissingHtml(words) {
    return [
      bandOpen(),
      '  <div class="max-w-[1260px] mx-auto flex flex-col items-start gap-space-md">',
      "    " + messageHtml(words.deepMissing || "The full write-up for this area hasn't been added yet — check back soon."),
      backHtml(),
      "  </div>",
      "</section>"
    ].join("\n");
  }

  /* Unknown or missing ?area= — a message and a way back. */
  function notFoundHtml(words) {
    return [
      bandOpen(),
      '  <div class="max-w-[1260px] mx-auto flex flex-col items-start gap-space-md">',
      "    " + messageHtml(words.notFound || "We couldn't find that research area."),
      backHtml(),
      "  </div>",
      "</section>"
    ].join("\n");
  }

  var TEAM_CONFIG_URL = "../data/team/edit_team_page.json";

  function loadModularTeam() {
    return loadJson(TEAM_CONFIG_URL).then(function (config) {
      if (!config || !Array.isArray(config.main_category_file_names)) return { current: [], alumni: [], groups: [] };
      var groupFiles = config.main_category_file_names.filter(function (f) { return typeof f === "string"; });
      var promises = groupFiles.map(function (file) {
        var name = /\.json$/i.test(file) ? file : file + ".json";
        return loadJson("../data/team/" + name);
      });
      return Promise.all(promises).then(function (groupData) {
        var team = { current: [], alumni: [], groups: [] };
        groupData.forEach(function (g) {
          if (!g) return;
          if (g.main_category_name === "current") team.current = g.add_people_to_category_defined_above || [];
          else if (g.main_category_name === "alumni") team.alumni = g.add_people_to_category_defined_above || [];
          else team.groups.push(g);
          (g.add_people_to_category_defined_above || []).forEach(function (p) {
            if (p) p._category = g.main_category_name;
          });
        });
        return team;
      });
    }).catch(function () {
      return { current: [], alumni: [], groups: [] };
    });
  }

  function boot() {
    var mount = document.getElementById("area-content");
    if (!mount) return;

    /* The area is named by the file in the address:
       ?area=soil-microbiome -> data/research/soil-microbiome.json.
       No name at all is a friendly not-found. */
    var fileId = wantedFileId();
    if (!fileId) {
      mount.innerHTML = notFoundHtml(WORDS);
      return;
    }

    Promise.all([window.CWL.loadLinks(), loadJson(DATA_URL), loadModularTeam(), loadJson("../data/outputs/publications.json")]).then(function (loaded) {
      var data = loaded[1];
      var team = loaded[2];
      var publications = loaded[3];
      var words = WORDS;
      var areas = (data && data.individual_research_area_cards) || [];
      /* The home page's card list is optional here — it just supplies
         the hero words for an area whose file hasn't been written yet
         (a stub card). The deep file always wins. */
      var area = findArea(areas, fileId);

      /* The deep file holds the hero words plus the content
         elements; its words win over the basic record (a stub record
         then takes its title from the file too). A 404 is a normal,
         quiet state (the file simply hasn't been written yet) —
         only a broken file logs an error. */
      fetch(DATA_DIR + encodeURIComponent(fileId) + ".json", { cache: "no-store" })
        .then(function (res) {
          if (!res.ok) return null;
          return res.text().then(window.CWL.parseJson).catch(function (err) {
            console.error("[areapage] could not parse " + DATA_DIR + fileId + ".json", err);
            return null;
          });
        })
        .catch(function () { return null; })
        .then(function (deep) {
          /* Unknown area: no deep file and no card to describe it. */
          if (!deep && !area) {
            mount.innerHTML = notFoundHtml(words);
            return;
          }
          var hero = heroFromCard(area);
          if (deep) {
            HERO_WORDS.forEach(function (k) { if (deep[k] != null) hero[k] = deep[k]; });
          }
          /* An add_people card that only names someone borrows that
             person's role and photo from the team file. */
          if (deep && window.CWL.fillDeepPeople) {
            deep = window.CWL.fillDeepPeople(deep, team);
          }

          function draw() {
            /* No deep file? Hero + the friendly note. */
            mount.innerHTML = renderArea(hero, deep, fileId) + (deep ? "" : deepMissingHtml(words));
            E.mountSlideshows(mount);
            if (E.mountPublicationLists) E.mountPublicationLists(mount);
            if (E.mountEquations) E.mountEquations(mount);
            /* An add_people card that only names someone carries
               data-profile-slug; hand it the profile address once the file
               is known to exist, so a name alone is a working internal
               link. */
            if (window.CWL.wireArticleLinks) {
              window.CWL.wireArticleLinks(mount, {
                attr: "data-profile-slug",
                dataDir: "../data/team/profiles/",
                hrefPrefix: "profile.html?profile="
              });
            }
          }

          if (deep && window.CWL.preparePublications) {
            window.CWL.preparePublications(deep, publications).then(function (filled) {
              deep = filled;
              draw();
            });
          } else {
            draw();
          }
        });
    });
  }

  boot();
})();
