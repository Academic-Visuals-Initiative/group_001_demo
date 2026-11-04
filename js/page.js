/* ------------------------------------------------------------------
   page.js — draws ONE free-standing page on pages/page.html.

   The page is named by the file in the address:
     page.html?page=facilities                    -> data/pages/facilities.json
     page.html?folder=books&page=my_books         -> data/books/my_books.json

   `folder` is any folder you make under data/; without it the page
   reads data/pages/, so every older ?page=… link keeps working. A
   named link can write the same address for you (js/helpers.js):
     { "link": "@books.my_books" }

   The file is an ordinary content file (§15): a few optional hero words
   — "title", "eyebrow", "intro", "kicker", "meta" — and then any
   content elements, written in the order they should print. A "hero"
   object may stand in for the five words when the opener needs a
   different shape (e.g. { "centered": true }).

   Two switches shape the opener itself:
     "choose_page_heading_alignment": "left" | "centered"
     "show_the_page_heading": false     (no opener at all — the page
                                         starts at its first element)

   The hero maps like this:
     title   -> heading   (also the browser tab title)
     eyebrow -> label     (the small line above the headline)
     intro   -> text      (the note in the right column)
     kicker  -> kicker    (a small line under the headline)
     meta    -> meta      (a smaller line under that)

   Nothing else is required: a page with no hero words opens at its
   first element. No file, no page — a friendly message and a way back.
   The same template serves any number of pages; only the file name in
   the address changes.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DEFAULT_FOLDER = "pages";
  var E = window.CWL_ELEMENTS;
  var messageHtml = window.CWL.messageHtml;

  /* Keys the element flow must not draw — they are the hero's words. */
  var HERO_WORDS = [
    "title", "eyebrow", "intro", "kicker", "meta", "hero",
    "choose_page_heading_alignment", "show_the_page_heading", "hide_the_page_heading"
  ];

  function param(name) {
    var m = new RegExp("[?&]" + name + "=([^&]+)").exec(window.location.search);
    return m ? decodeURIComponent(m[1]).trim() : "";
  }

  /* A folder and a file are simple names, so neither can step out of
     data/. Without a folder, the older data/pages/ address still works. */
  function wantedFolder() {
    var folder = param("folder").toLowerCase();
    return /^[a-z0-9_-]+$/.test(folder) ? folder : DEFAULT_FOLDER;
  }

  /* A page name may carry dots (`@notes.2026.diary` writes
     page=2026.diary), but never a slash — the folder is its own part. */
  function wantedPage() {
    var page = param("page").toLowerCase();
    if (page === "." || page === "..") return "";
    return /^[a-z0-9._-]+$/.test(page) ? page : "";
  }

  function notFoundHtml() {
    return [
      '<section class="w-full px-margin md:px-margin-tablet lg:px-margin-desktop pt-space-xl">',
      '  <div class="max-w-[900px] mx-auto flex flex-col items-start gap-space-md">',
      "    " + messageHtml("We couldn't find that page."),
      '    <a class="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-primary text-on-primary hover:bg-secondary transition-all font-label-md text-label-md uppercase tracking-[0.15em]" href="../index.html">',
      '      <span class="cw-icon cw-icon--arrow-back text-[16px]" aria-hidden="true"></span>Back to Home',
      "    </a>",
      "  </div>",
      "</section>"
    ].join("\n");
  }

  /* The hero words, with an explicit "hero" object winning where it
     speaks. A file that has none of them opens at its first element.

     Two switches shape the opener:

       choose_page_heading_alignment  "left" (default) | "centered"
                                      "centered" stacks eyebrow, headline
                                      and note down the middle — the way
                                      pages/labs.html and team.html open
       show_the_page_heading          false = draw no opener at all; the
                                      page starts at its first element
                                      (the title still names the tab) */
  function heroWords(data) {
    var own = (data && data.hero && typeof data.hero === "object") ? data.hero : {};
    var wanted = own.align != null ? own.align
      : (data && data.choose_page_heading_alignment != null
        ? data.choose_page_heading_alignment : "");
    var align = String(wanted || "").toLowerCase();
    var hero = {
      label: own.label != null ? own.label : data.eyebrow,
      heading: own.heading != null ? own.heading : data.title,
      kicker: own.kicker != null ? own.kicker : data.kicker,
      meta: own.meta != null ? own.meta : data.meta,
      text: own.text != null ? own.text : data.intro,
      centered: own.centered === true ||
        align === "center" || align === "centered" || align === "centre",
      centerSmall: own.centerSmall !== false
    };
    var hidden = own.hide === true || own.show === false ||
      (data && (data.hide_the_page_heading === true || data.show_the_page_heading === false));
    if (hidden) return null;
    var any = !!(hero.label || hero.heading || hero.kicker || hero.meta || hero.text);
    return any ? hero : null;
  }

  /* The team lists, so a people card on a free page can find a photo and
     role by name, exactly as it does on a profile page. */
  function loadTeam() {
    var load = window.CWL.loadJson;
    if (!load) return Promise.resolve({ current: [], alumni: [], groups: [] });
    return load("../data/team/edit_team_page.json").then(function (config) {
      if (!config || !Array.isArray(config.main_category_file_names)) {
        return { current: [], alumni: [], groups: [] };
      }
      return Promise.all(config.main_category_file_names.map(function (f) {
        var name = /\.json$/i.test(f) ? f : f + ".json";
        return load("../data/team/" + name);
      })).then(function (groups) {
        var team = { current: [], alumni: [], groups: [] };
        groups.filter(Boolean).forEach(function (g) {
          if (g.main_category_name === "current") team.current = g.add_people_to_category_defined_above || [];
          else if (g.main_category_name === "alumni") team.alumni = g.add_people_to_category_defined_above || [];
          else team.groups.push(g);
        });
        return team;
      });
    }).catch(function () {
      return { current: [], alumni: [], groups: [] };
    });
  }

  function render(data, team) {
    var hero = heroWords(data);
    var base = {
      reserved: HERO_WORDS,
      root: "../",
      viewer: "article.html?url=",
      team: team
    };
    var html = hero
      ? E.contentPage(data, { hero: hero, reserved: base.reserved, root: base.root, viewer: base.viewer, team: team })
      : E.renderFlow(data, base);
    window.CWL.setPageTitle(data.title);
    return html;
  }

  function boot() {
    var mount = document.getElementById("page-content");
    if (!mount) return;

    var page = wantedPage();
    if (!page) {
      mount.innerHTML = notFoundHtml();
      return;
    }
    var folder = wantedFolder();
    var dataDir = "../data/" + folder + "/";

    Promise.all([
      window.CWL.loadLinks(),
      window.CWL.loadJson ? window.CWL.loadJson("../data/edit_team_section.json") : Promise.resolve(null),
      window.CWL.loadJson ? window.CWL.loadJson("../data/outputs/publications.json") : Promise.resolve(null),
      loadTeam()
    ]).then(function (loaded) {
      var publications = loaded[2];
      var team = loaded[3];
      fetch(dataDir + encodeURIComponent(page) + ".json", { cache: "no-store" })
        .then(function (res) {
          if (!res.ok) return null;
          return res.text().then(window.CWL.parseJson).catch(function (err) {
            console.error("[page] could not parse " + dataDir + page + ".json", err);
            return null;
          });
        })
        .catch(function () { return null; })
        .then(function (data) {
          if (!data) {
            mount.innerHTML = notFoundHtml();
            return;
          }
          if (window.CWL.fillDeepPeople) data = window.CWL.fillDeepPeople(data, team);

          function draw() {
            mount.innerHTML = render(data, team);
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
          }

          if (window.CWL.preparePublications) {
            window.CWL.preparePublications(data, publications).then(function (filled) {
              data = filled;
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
