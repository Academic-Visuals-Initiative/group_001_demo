/* ------------------------------------------------------------------
   profile.js — renders ONE person's profile on pages/profile.html
   from data/team/profiles/<slug>.json.

   The page is built by the content system's own profile shell
   (js/elements.js → profilePage). A head is a LIST OF PIECES and a
   structure is one such list, so this file's job is to work out WHICH
   structure the person gets:

      1. "structure" in their own file wins ("senior" | "researcher" |
         "student" | "alumni"), and "head" replaces the recipe outright;
      2. otherwise the person's line in the team files decides it — the
         list they sit in (current, alumni, visitors, collaborators)
         and their roleType (pi, professor, postdoc, phd, msc, …),
         which is the same thing their team card is drawn from.
         The card and the page therefore always agree, and a person
         is still written once.

   What the head fills in for you:

      - the eyebrow: with no "eyebrow"/"position" of its own, the head
        takes the person's line from the team file ("Principal
        Investigator"), so the position stands above the name;
      - the main focus: with no "Main focus" row of its own, the head
        takes it from the person's line in the team file (the same focus
        their card shows), so the two always agree;
      - the distinction under the name ("honours") and the portrait
        ("image") come from the same line — the photo the team file
        already holds, credited with that file's "photoCredit";
      - "publications": true (or an author's name) pulls that author's
        papers out of the outputs archive (data/outputs/…), so a profile
        never retypes a publication list the Outputs page already holds.
        "alternative_names_used_in_publications_or_other_outputs" adds
        the other names they publish under; with true, every name is
        matched. "add_name_as_it_appears_in_publications" covers a spelling
        none of those hold. "publication_section_title" renames the list's
        heading, which otherwise reads "Selected publications". The list
        opens three at a time, with year pills built from the papers;
        "per_page" (0 = all) and "show_year_filter"
        change that. On an "add_publication_or_more" block,
        "only_show_items_belongs_to_this_person": true keeps only the rows
        from a shared collection whose authors line names the person.

   Everything else in the file is a content element (§15): add_paragraph,
   add_list, add_image, add_gallery, add_slideshow, add_embed_media,
   add_embed_media_row, add_3d_model, add_heading, button, divider,
   add_quote, add_special_note, add_table, add_equation,
   add_contact_information, add_focus_list, add_tags, add_full_width_links,
   cards, add_people, add_a_timeline, add_publication_or_more,
   add_content_to_page.

   The URL picks the person: profile.html?profile=michael_carter
   (data/team/profiles/michael_carter.json). The team page (§13) gives a card
   that address only once it has confirmed the file exists, so a member
   without a profile file simply has no link.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var DATA_DIR = "../data/team/profiles/";
  var CONFIG_URL = "../data/team/edit_team_page.json";
  var OUTPUTS_URL = "../data/outputs/edit_publications_and_outputs_page.json";

  /* Where a button's relative link lands, and where a .pdf opens. */
  var PAGE = { root: "../", base: "../", viewer: "article.html?url=" };

  /* The page's fixed words — they never need editing, so they live
     here rather than in the JSON. */
  var WORDS = {
    notFound: "We couldn't find that profile.",
    missing: "No profile specified."
  };

  var messageHtml = window.CWL.messageHtml;
  var E = window.CWL_ELEMENTS;

  /* The person comes from the address: profile.html?profile=their-name
     (the older ?slug= still works too). */
  function getSlug() {
    var m = /[?&](?:profile|slug)=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]).trim() : "";
  }

  /* Load all group files listed in edit_team_page.json and combine into
     a team-like object with current, alumni, and extra groups. */
  function loadTeamData() {
    return fetch(CONFIG_URL, { cache: "no-store" }).then(function (res) {
      if (!res.ok) return null;
      return res.text().then(window.CWL.parseJson).catch(function () { return null; });
    }).then(function (config) {
      if (!config || !Array.isArray(config.main_category_file_names)) return { current: [], alumni: [], groups: [] };
      var groupFiles = config.main_category_file_names.filter(function (f) { return typeof f === "string"; });
      var loadPromises = groupFiles.map(function (file) {
        var name = /\.json$/i.test(file) ? file : file + ".json";
        return fetch("../data/team/" + name, { cache: "no-store" }).then(function (res) {
          if (!res.ok) return null;
          return res.text().then(window.CWL.parseJson).catch(function () { return null; });
        }).catch(function () { return null; });
      });
      return Promise.all(loadPromises).then(function (groupData) {
        var groups = groupData.filter(Boolean);
        var team = { current: [], alumni: [], groups: [] };
        groups.forEach(function (g) {
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

  /* The person's own line in the team data — which list they sit in and
     which role they carry. This is what picks the structure. */
  function findPerson(team, slug) {
    if (!team || !window.CWL.profileSlug) return null;
    var lists = [
      { list: team.current, alumni: false },
      { list: team.alumni, alumni: true }
    ];
    (team.groups || []).forEach(function (g) {
      lists.push({ list: g.add_people_to_category_defined_above, alumni: true });
    });
    var found = null;
    lists.forEach(function (entry) {
      if (found || !Array.isArray(entry.list)) return;
      entry.list.forEach(function (person) {
        if (found) return;
        if (window.CWL.profileSlug(person) === slug) {
          found = { person: person, isAlumni: entry.alumni };
        }
      });
    });
    return found;
  }

  /* An author's name as it is compared: no titles, no full stops. */
  function authorKey(name) {
    return String(name || "")
      .replace(/^(dr|prof|professor|mr|mrs|ms|miss)\.?\s+/i, "")
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* The people line on an output, common shape first. */
  function peopleLine(item) {
    if (!item) return "";
    var raw = item.people;
    if (raw == null) raw = (item.authors != null ? item.authors : item.author);
    if (Array.isArray(raw)) {
      return raw.map(function (p) {
        return typeof p === "string" ? p : String(p && p.name || "");
      }).join(", ");
    }
    return String(raw == null ? "" : raw);
  }

  /* "publications": true | "Michael Carter"
     → that author's papers, out of the outputs archive, kept whole: the
     row draws its plate, chips and buttons from the same fields the
     Outputs page reads, so a paper looks the same in both places. The
     archive's own colours and words travel with the list, and a list
     written by hand is left exactly as the file wrote it. With true, every
     name in the profile's
     "alternative_names_used_in_publications_or_other_outputs" is matched
     too. */
  function resolvePublications(value, outputs, names) {
    if (!value) return value;

    var nameList = (Array.isArray(names) ? names : [names]).filter(Boolean);
    var whoList;
    if (value === true) {
      whoList = nameList;
    } else if (typeof value === "string") {
      whoList = [value];
    } else if (value && (value.author || value.authors)) {
      whoList = [value.author || value.authors];
    } else if (value && typeof value === "object" &&
      value.items == null && value.publication_titles == null &&
      value.papers == null && value.list == null && value.publication == null) {
      /* A block that only names its section — { "publication_section_title":
         "Selected papers" } — pulls every name, like true. */
      whoList = nameList;
    } else {
      return value; /* already a list — leave it alone */
    }

    var keys = whoList.map(authorKey).filter(Boolean);
    if (!keys.length) return value;
    var items = ((outputs && (outputs.items || outputs.outputs)) || [])
      .filter(function (o) {
        var line = peopleLine(o);
        if (!line) return false;
        var lineKey = authorKey(line);
        return keys.some(function (key) { return lineKey.indexOf(key) > -1; });
      });

    var out = {};
    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (k) {
        if (k !== "author" && k !== "authors") out[k] = value[k];
      });
    }
    out.items = items;
    out.categories = outputs && outputs.categories;
    out.tones = outputs && outputs.tones;
    out.pinnedLabel = outputs && outputs.pinnedLabel;
    out.publisherLabel = outputs && (
      outputs.external_link_label_for_outputs != null
        ? outputs.external_link_label_for_outputs
        : outputs.publisherLabel);
    return out;
  }

  /* --- only this person's items ---------------------------------------
     "only_show_items_belongs_to_this_person": true on a publication block
     keeps the rows whose authors line names the profile's person. Used
     with a shared collection, so a group set can appear on a page as that
     person's own part of it. A row with no authors line is left out:
     there is no name to match. */
  function publicationListKey(block) {
    var keys = ["publication_titles", "items", "papers", "list"];
    for (var i = 0; i < keys.length; i++) {
      if (block[keys[i]] != null) return keys[i];
    }
    return null;
  }

  function keepPersonsItems(block, keys) {
    if (!block || typeof block !== "object" || Array.isArray(block)) return;
    var flag = block.only_show_items_belongs_to_this_person;
    if (flag == null) flag = block.only_show_items_belonging_to_this_person;
    if (!(flag === true || flag === 1 || /^true$/i.test(String(flag)))) return;

    var listKey = publicationListKey(block);
    var single = listKey ? null : block.publication;
    var list = listKey ? block[listKey] : single;
    if (list == null) return;
    var items = Array.isArray(list) ? list : [list];

    function belongs(item) {
      var line = item && typeof item === "object" ? peopleLine(item) : "";
      if (!line) return false;
      var lineKey = authorKey(line);
      return keys.some(function (key) { return lineKey.indexOf(key) > -1; });
    }

    var kept = items.filter(belongs);
    if (listKey) {
      block[listKey] = kept;
    } else if (kept.length === 1) {
      block.publication = kept[0];
    } else {
      block.publication = kept;
    }
  }

  function applyOwnItemsFilter(data, names) {
    var keys = (names || []).map(authorKey).filter(Boolean);
    if (!keys.length) return data;
    function visit(container) {
      if (!container || typeof container !== "object") return;
      ["add_publication_or_more", "publications", "publication"].forEach(function (name) {
        keepPersonsItems(container[name], keys);
      });
    }
    visit(data);
    if (Array.isArray(data.add_content_to_page)) data.add_content_to_page.forEach(visit);
    return data;
  }

  function boot() {
    var mount = document.getElementById("profile-content");
    if (!mount || !E || !E.profilePage) return;

    var slug = getSlug();
    if (!slug) {
      mount.innerHTML = messageHtml(WORDS.missing);
      return;
    }

    function loadJson(url) {
      return fetch(url, { cache: "no-store" }).then(function (res) {
        if (!res.ok) return null;
        return res.text().then(window.CWL.parseJson).catch(function (err) {
          console.error("[profile] could not parse " + url, err);
          return null;
        });
      }).catch(function () {
        return null;
      });
    }

    var links = window.CWL.loadLinks ? window.CWL.loadLinks() : null;
    var person = loadJson(DATA_DIR + encodeURIComponent(slug) + ".json");
    var team = loadTeamData();
    var outputs = loadJson(OUTPUTS_URL).then(function (config) {
      return window.CWL.loadOutputItems
        ? window.CWL.loadOutputItems(config, "../data/outputs/")
        : config;
    });
    var publications = loadJson("../data/outputs/publications.json");

    Promise.all([links, person, team, outputs, publications]).then(function (loaded) {
      var data = loaded[1];
      if (!data) {
        mount.innerHTML = messageHtml(WORDS.notFound);
        return;
      }
      var entry = findPerson(loaded[2], slug);
      var teamPerson = entry && entry.person;
      window.CWL.setPageTitle(data.name_as_exactly_as_in_category_file || data.name || "");

      /* Every name the person publishes under: the profile's own name,
         the team file's, and the alternatives. Used both to pull a list
         and to keep only their rows out of a shared collection. */
      var publicationNames = [
        data.add_name_as_it_appears_in_publications,
        data.name_as_exactly_as_in_category_file,
        data.name,
        teamPerson && (teamPerson.add_name || teamPerson.name)
      ].concat(
        data.alternative_names_used_in_publications_or_other_outputs ||
        data.alternative_names ||
        data.alternate_names ||
        data.aliases ||
        data.alternativeNames ||
        []
      );

      /* "publications": true (or an author's name) pulls that author's
         papers out of the outputs archive. Every
         "alternative_names_used_in_publications_or_other_outputs" entry is
         matched too, so a maiden name or a middle initial still finds the
         paper. A list written by hand is left exactly as written — and
         resolved before the record filler, which would read an author name
         as a one-line title. */
      if (data.publications != null) {
        data.publications = resolvePublications(data.publications, loaded[3], publicationNames);

        /* A profile may set the list's habits once, at the top of the file:
           "publication_section_title": "Selected papers",
           "per_page": 3,
           "show_year_filter": true.
           The block's own settings, when it writes them, still win. */
        var publicationOptions = {};
        ["publication_section_title", "per_page", "show_year_filter", "reverse_numbering"]
          .forEach(function (key) {
            if (data[key] != null) publicationOptions[key] = data[key];
          });
        if (Object.keys(publicationOptions).length) {
          if (Array.isArray(data.publications)) {
            publicationOptions.publication_titles = data.publications;
            data.publications = publicationOptions;
          } else if (data.publications && typeof data.publications === "object") {
            Object.keys(publicationOptions).forEach(function (key) {
              if (data.publications[key] == null) data.publications[key] = publicationOptions[key];
            });
          }
        }
      }

      /* A collection reference loads its set file before the rows are
         drawn, so "publications_collection_file_name" works on a profile
         exactly as it does on a content page. Titles are then filled from
         the archive. */
      var ready = window.CWL.preparePublications
        ? window.CWL.preparePublications(data, loaded[4])
        : Promise.resolve(
            window.CWL.fillPublicationRecords
              ? window.CWL.fillPublicationRecords(data, loaded[4])
              : data
          );

      return ready.then(function (prepared) {
        /* A shared collection holds the whole group's papers; this keeps
           only the rows the person's own name appears on. */
        applyOwnItemsFilter(prepared, publicationNames);
        return { data: prepared, loaded: loaded, entry: entry };
      });
    }).then(function (state) {
      var data = state.data;
      var loaded = state.loaded;
      var entry = state.entry;

      var structure = data.structure ||
        (entry ? E.structureFor(entry.person.roleType, entry.isAlumni) : "");

      /* The position above the name, and the main focus under it, both
         come from the person's line in the team file when the profile
         doesn't write its own — so a card and its profile always agree
         and neither has to retype the other's words. */
      var teamLine = entry && entry.person;
      if (teamLine) {
        if (!data.eyebrow && !data.position && (teamLine.position || teamLine.role)) {
          data.position = teamLine.position || teamLine.role;
        }
        if (!data.focus && teamLine.text) {
          data.focus = teamLine.text;
        }
        var teamHonour = teamLine.honorary_title_or_titles || teamLine.honours || teamLine.honors || teamLine.fellowship;
        if (!data.honours && teamHonour) {
          data.honours = teamHonour;
        }
        var teamImage = teamLine.image_path || teamLine.photo;
        if (!data.image && teamImage) {
          data.image = window.CWL.teamImageSrc ? window.CWL.teamImageSrc(teamImage, teamLine._category) : teamImage;
        }
        if (!data.imageAlt && teamLine.photoAlt) {
          data.imageAlt = teamLine.photoAlt;
        }
        if (!data.imageCredit) {
          data.imageCredit = teamLine.photo_credit || (loaded[0] && loaded[0].photo_credit) || "";
        }
        var teamEmail = teamLine.add_email || teamLine.email;
        if (!data.email && teamEmail) {
          data.email = teamEmail;
        }
        var teamCv = teamLine.cv_name_or_path_to_cv || teamLine.cv;
        if (!data.cv && teamCv) {
          data.cv = window.CWL.cvSrc(teamCv);
        }
        if (!data.googlescholar && teamLine.googlescholar_new) {
          data.googlescholar = teamLine.googlescholar_new;
        }
        if (!data.googlescholar && teamLine.googlescholar) {
          data.googlescholar = teamLine.googlescholar;
        }
        if (!data.buttons && teamLine.buttons) {
          data.buttons = teamLine.buttons;
        }
        // Copy social fields from team data if not already in profile
        var socialFields = ['orcid', 'googlescholar', 'googlescholar_new', 'linkedin', 'github', 'gitlab', 'x', 'twitter', 'bluesky', 'mastodon', 'website', 'globe', 'homepage', 'researchgate', 'academia', 'zenodo', 'figshare', 'mendeley', 'zotero', 'semantic_scholar', 'orcid', 'googlescholar', 'googlescholar_new', 'google_scholar', 'linkedin', 'github', 'gitlab', 'x', 'twitter', 'bluesky', 'mastodon', 'website', 'globe', 'homepage', 'researchgate', 'academia', 'zenodo', 'figshare', 'mendeley', 'zotero', 'semantic_scholar'];
        socialFields.forEach(function (field) {
          if (!data[field] && teamLine[field]) {
            data[field] = teamLine[field];
          }
        });
      }

      // Ensure CV path is correctly prefixed for the current page depth
      if (data.cv) {
        data.cv = window.CWL.cvSrc(data.cv);
      }

      var head = E.profilePage(data, {
        structure: structure,
        slug: slug,
        alumni: entry ? entry.isAlumni : false,
        links: loaded[0],
        root: PAGE.root,
        team: loaded[2]
      });

      mount.innerHTML = head;

      if (E.mountPublicationLists) E.mountPublicationLists(mount);

      /* Wire profile links for "Works closely with" cards and any other links. */
      if (window.CWL.wireArticleLinks) {
        window.CWL.wireArticleLinks(mount, {
          attr: "data-profile-slug",
          dataDir: "../data/team/profiles/",
          hrefPrefix: "profile.html?profile="
        });
      }
    });
  }

  boot();
})();