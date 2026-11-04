/* ------------------------------------------------------------------
   helpers.js — shared drawing rules for update cards.

   Used by:
   - js/news.js    (home page "News" section — shows featured/newest)
   - js/updates.js (pages/updates.html — shows everything)

   One card style, one source (data/edit_news_and_updates_section.json), no hardcoded items.
------------------------------------------------------------------ */
(function () {
  "use strict";

  /* Fallback badge color, used when a category isn't listed. */
  var DEFAULT_BACKGROUND = "#d4e4d0";

  /* Pick a readable badge text color: dark for light backgrounds,
     white for dark ones. Editors only choose the background. */
  function badgeText(background) {
    var hex = String(background || "").trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#121f12";
    var r = parseInt(hex.substr(1, 2), 16);
    var g = parseInt(hex.substr(3, 2), 16);
    var b = parseInt(hex.substr(5, 2), 16);
    var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.55 ? "#121f12" : "#ffffff";
  }

  /* The "categories" array from edit_news_and_updates_section.json, kept in file order
     (that order = the order of the filter buttons on the page). */
  function categoryList(data) {
    var raw = data && (data.add_categories || data.categories);
    if (!Array.isArray(raw)) return [];
    return raw.map(function (c) {
      if (!c || typeof c !== "object") return c;
      var out = {};
      Object.keys(c).forEach(function (k) { out[k] = c[k]; });
      if (out.name == null && out.category_name != null) out.name = out.category_name;
      if (out.background == null && out.background_colour != null) {
        out.background = out.background_colour;
      }
      return out;
    });
  }

  /* Quick lookup by name, ignoring case: "fieldwork" -> its colors. */
  function categoryMap(list) {
    var map = {};
    (list || []).forEach(function (c) {
      if (c && c.name) map[String(c.name).toLowerCase()] = c;
    });
    return map;
  }

  /* The words and colour on one item's category chip.
     `category` still drives filtering and the colour lookup; these
     optional per-item keys change only what the chip shows:
       "label": "Dataset release"
       "background_colour":  "#d4e4d0"
     They belong in the individual news file (or inline card). */
  function categoryChip(item, colors) {
    var category = String(newsCategory(item) || "");
    var own = item && item.background_colour;
    var background = own != null && String(own).trim() !== ""
      ? String(own)
      : String((colors && colors.background) || "");
    var label = item && item.label != null
      ? item.label
      : (item && item.category_label_text);
    var text = label != null && String(label).trim() !== ""
      ? String(label)
      : category;
    return { category: category, text: text, background: background };
  }

  /* The "statuses" array from edit_join_the_lab_section.json (file order = filter order). */
  /* Optional status overrides (add_statuses). The engine already knows the
     Open and Not hiring looks, so most pages leave this empty. */
  function statusList(data) {
    var raw = data && (data.add_statuses != null ? data.add_statuses : data.statuses);
    return Array.isArray(raw) ? raw : [];
  }

  /* The positions page's categories (add_categories): the kinds of role
     on offer, each with its chip colour. */
  function joinCategoryList(config) {
    var raw = config && (config.add_categories || config.categories);
    if (!Array.isArray(raw)) return [];
    return raw.map(function (c) {
      if (!c || typeof c !== "object") return null;
      var name = c.category_name != null ? c.category_name : c.name;
      if (name == null || !String(name).trim()) return null;
      return {
        name: String(name).trim(),
        background: String(c.background_colour || c.background || "#e5dfd0")
      };
    }).filter(Boolean);
  }

  /* Load every position file named in `add_position_file_names` and shape
     each one into a row for the page. One file = one row (and one button).
     Status is automatic: a file reads Open, unless it says
     `"status": "Not hiring"` or `"not_hiring": true`. */
  function loadJoinPositions(config, base) {
    var cfg = config || {};
    /* The positions page's words live in one object: "positions_page". */
    var page = cfg.positions_page;
    if (page && typeof page === "object") {
      cfg = {};
      Object.keys(config).forEach(function (k) { cfg[k] = config[k]; });
      if (Array.isArray(page.file_names)) cfg.add_position_file_names = page.file_names;
      if (page.button_label != null) cfg.button_label = page.button_label;
      if (Array.isArray(page.categories)) {
        cfg.add_categories = page.categories.map(function (c) {
          return { category_name: c.label, background_colour: c.background_colour };
        });
      }
    }
    var names = cfg.add_position_file_names || cfg.position_file_names || [];
    if (!Array.isArray(names)) names = [];
    names = names.map(function (n) {
      var s = String(n == null ? "" : n).trim();
      return /\.json$/i.test(s) ? s.slice(0, -5) : s;
    }).filter(Boolean);
    var cats = joinCategoryList(cfg);
    var dir = base == null ? "data/join/positions/" : base;
    return Promise.all(names.map(function (name) {
      return loadJson(dir + encodeURIComponent(name) + ".json")
        .then(function (file) { return { name: name, file: file }; });
    })).then(function (rows) {
      var items = [];
      rows.forEach(function (row) {
        var f = row.file;
        if (!f) return;
        var category = String(f.add_relevant_category_name || f.category || "").trim();
        var status = String(f.status || "").trim();
        if (!status) {
          status = (f.is_hiring === false || f.not_hiring === true) ? "Not hiring" : "Open";
        }
        var item = {};
        Object.keys(f).forEach(function (k) { item[k] = f[k]; });
        item.slug = row.name;
        item._positionFile = row.name;
        item.add_relevant_category_name = category || "Position";
        item.status = status;
        item.text = f.summary != null ? f.summary : f.item_introduction;
        item.tags = f.tags || f.add_tags || [];
        item.button = {
          text: cfg.button_label != null ? cfg.button_label : "View position",
          link: "#"
        };
        items.push(item);
      });
      if (cats.length) {
        var rank = {};
        cats.forEach(function (c, i) { rank[c.name.toLowerCase()] = i; });
        items.sort(function (a, b) {
          var ai = rank[String(a.add_relevant_category_name).toLowerCase()];
          var bi = rank[String(b.add_relevant_category_name).toLowerCase()];
          return (ai == null ? cats.length : ai) - (bi == null ? cats.length : bi);
        });
      }
      return items;
    });
  }

  /* A status's colours and button look. Two states are built into the
     engine — Open (soft green, breathing dot) and Not hiring (soft red,
     outline button) — so the join files need no status config at all.
     A page may still override either by adding add_statuses; any field it
     leaves out keeps the built-in value. */
  var BUILT_IN_STATUSES = {
    open: { background: "#d7ead0", dot: "#22c55e", pulse: true, solid: true },
    "not hiring": { background: "#ffdad6", dot: "#ba1a1a", pulse: false, solid: false }
  };

  function statusColors(statuses, name) {
    var key = String(name || "").toLowerCase();
    var found = null;
    (statuses || []).forEach(function (s) {
      if (s && s.name && String(s.name).toLowerCase() === key) found = s;
    });
    var base = BUILT_IN_STATUSES[key] || {};
    function pick(field, fallback) {
      if (found && found[field] != null) return found[field];
      if (base[field] != null) return base[field];
      return fallback;
    }
    var pulse = found && found.pulse != null ? found.pulse === true
      : (base.pulse === true);
    var solid = found && found.solid != null ? found.solid !== false
      : (base.solid !== false);
    return {
      background: pick("background", DEFAULT_BACKGROUND),
      dot: pick("dot", "#546252"),
      label: pick("label", "") || pick("text", "") || pick("foreground", ""),
      pulse: pulse,
      solid: solid
    };
  }

  /* Escape text for safe interpolation into HTML. */
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* "2026-10-14" -> { day: "14", month: "Oct 2026" } */
  function parseDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return { day: "", month: esc(iso) };
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var monthIndex = parseInt(m[2], 10) - 1;
    return {
      day: m[3],
      month: (months[monthIndex] || "") + " " + m[1]
    };
  }

  /* Newest first (for sorting a list by date). */
  function byNewest(a, b) {
    return String(newsDate(b) || "").localeCompare(String(newsDate(a) || ""));
  }

  /* A news item's words live in named keys; the older names still read:
       current_date                <- date
       add_relevant_category_name  <- category
       item_title                  <- title
       item_introduction           <- text                                   */
  function newsDate(item) {
    var it = item || {};
    return it.current_date != null ? it.current_date : it.date;
  }

  function newsCategory(item) {
    var it = item || {};
    if (it.add_relevant_category_name != null) return it.add_relevant_category_name;
    return it.category;
  }

  function newsTitle(item) {
    var it = item || {};
    return it.item_title != null ? it.item_title : it.title;
  }

  function newsIntro(item) {
    var it = item || {};
    return it.item_introduction != null ? it.item_introduction : it.text;
  }

  /* The newest real date in a list -> "Oct 2026" (empty when none).
     Entries without a valid YYYY-MM-DD date are skipped, so an
     undated draft can never blank out or hijack the "Updated" label. */
  function latestMonth(items) {
    var best = "";
    (Array.isArray(items) ? items : []).forEach(function (it) {
      var d = String(newsDate(it) || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d > best) best = d;
    });
    return best ? parseDate(best).month : "";
  }

  /* Pinned items first; the rest keep the order they came in.
      However many items are pinned, every one of them sits at the
      top of the list. An item is pinned with "pinned": true. */
  function pinnedFirst(items) {
    var list = Array.isArray(items) ? items.slice() : [];
    var pinned = list.filter(function (it) { return it && it.is_pinned === true; });
    var rest = list.filter(function (it) { return !(it && it.is_pinned === true); });
    /* Lists are appended to, so the last pinned item is the newest:
       pinned items lead newest-first, then the rest keep their order. */
    return pinned.slice().reverse().concat(rest);
  }

  /* The small "Pinned" marker chip. The word can be changed per
      page (pinnedLabel in the page's JSON); default: "Pinned".
      The marker is the colour pin emoji (\uD83D\uDCCC), not a
      drawn icon, so it reads at any size on any ground. */
  function pinChipHtml(label) {
    return (
      '<span class="pin-chip">' +
      '<span class="pin-emoji" aria-hidden="true">\uD83D\uDCCC</span>' +
      esc(label == null || label === "" ? "Pinned" : label) +
      "</span>"
    );
  }

  /* Featured outranks pinned: featured items lead, then pinned, then
      everything else. An item is featured with "featured": true.
      Inside the featured and pinned tiers the newest comes first — by
      `current_date` when the items carry one, otherwise the item written
      last (lists are appended to). The ordinary tier keeps the order it
      was given unless `options.restNewestFirst` says otherwise. */
  function featuredFirst(items, options) {
    var opts = options || {};
    var list = Array.isArray(items) ? items.slice() : [];
    var tiers = [[], [], []];
    function rank(it) {
      if (!it) return 2;
      if (it.is_featured === true) return 0;
      return it.is_pinned === true ? 1 : 2;
    }
    list.forEach(function (it, i) { tiers[rank(it)].push({ it: it, i: i }); });

    function newestFirst(tier) {
      var dated = tier.some(function (row) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(newsDate(row.it) || "").trim());
      });
      return tier.slice().sort(function (a, b) {
        if (dated) {
          var byDate = String(newsDate(b.it) || "")
            .localeCompare(String(newsDate(a.it) || ""));
          if (byDate) return byDate;
        }
        return b.i - a.i;
      }).map(function (row) { return row.it; });
    }

    var rest = opts.restNewestFirst === false
      ? tiers[2].map(function (row) { return row.it; })
      : newestFirst(tiers[2]);
    return newestFirst(tiers[0]).concat(newestFirst(tiers[1]), rest);
  }

  /* The "Featured" tag. The page sets the defaults
     (featured_tag_label / featured_tag_background_colour); one item may
     change either with the same key on itself. The star is a text
     glyph, so no icon font is needed. */
  function featuredChipHtml(item, label, background) {
    var text = item && item.featured_tag_label != null &&
      String(item.featured_tag_label).trim() !== ""
      ? String(item.featured_tag_label)
      : (label == null || String(label).trim() === "" ? "Featured" : String(label));
    var own = item && (item.featured_tag_background_colour != null
      ? item.featured_tag_background_colour
      : item.featured_tag_background);
    var bg = own != null && String(own).trim() !== ""
      ? String(own)
      : (background == null || String(background).trim() === ""
        ? "#1B1C19"
        : String(background));
    return (
      '<span class="featured-chip" style="background:' + esc(bg) +
      ";color:" + esc(badgeText(bg)) + '">' +
      '<span class="featured-star" aria-hidden="true">\u2605</span>' +
      esc(text) +
      "</span>"
    );
  }

  /* Friendly slug from a title: "Mangrove restoration pilot expands"
     → "mangrove_restoration_pilot_expands". This is the default
     article file name — create data/updates/items/<that-name>.json and the
     card links to it automatically. An explicit "slug" field on the
     item overrides it. */
  function titleToSlug(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  /* The news file a card points at:
     "individual_news_item_file_name" is the preferred key;
     older `news_file_id` / `news_id` / `file_id` / `slug` names still read. */
  function newsFileId(item) {
    if (!item) return "";
    var id = item.individual_news_item_file_name != null ? item.individual_news_item_file_name
      : (item.news_file_id != null ? item.news_file_id
        : (item.news_id != null ? item.news_id
          : (item.file_id != null ? item.file_id : item.slug)));
    return String(id == null ? "" : id).trim();
  }

  /* Which article file belongs to this news/position item (if any). */
  function articleSlug(item) {
    var explicit = newsFileId(item);
    return explicit || titleToSlug(newsTitle(item));
  }

  /* One update card, drawn with semantic classes (css/style.css).
     data-category lets filter buttons show/hide by kind.
     Badge colors come from the categories list in edit_news_and_updates_section.json.
     A "pinned": true item wears the small Pinned chip.
     Cards carry data-article-slug; wireArticleLinks() later adds the
     href once it confirms the article file exists. */
  function cardHtml(item, categories, pinnedLabel) {
    var date = parseDate(newsDate(item));
    var category = String(newsCategory(item) || "");
    var colors = (categories && categories[category.toLowerCase()]) || {};
    var chip = categoryChip(item, colors);
    var background = chip.background || DEFAULT_BACKGROUND;
    var style =
      ' style="background:' + esc(background) +
      ";color:" + badgeText(background) + '"';

    var slug = articleSlug(item);
    var cardOpen = '<a class="news-card update-item" data-category="' + esc(category.toLowerCase()) +
      '" data-year="' + esc(String(newsDate(item) || "").slice(0, 4)) + '"' +
      (slug ? ' data-article-slug="' + esc(slug) + '"' : "") + '>';
    var cardClose = "</a>";

    return [
      cardOpen,
      '  <div class="news-card__date">',
      '    <span class="news-card__day">' + esc(date.day) + "</span>",
      '    <span class="news-card__month">' + esc(date.month) + "</span>",
      "  </div>",
      '  <div class="news-card__body">',
      '    <span class="news-card__tag"' + style + ">" + esc(chip.text) + "</span>",
      item.is_featured === true ? "    " + featuredChipHtml(item) : "",
      item.is_pinned === true ? "    " + pinChipHtml(pinnedLabel) : "",
      '    <h3 class="news-card__title">' + esc(newsTitle(item)) + "</h3>",
      '    <p class="news-card__text">' + esc(newsIntro(item)) + "</p>",
      "  </div>",
      '  <span class="news-card__arrow" aria-hidden="true">',
      '    <span class="cw-icon cw-icon--arrow-outward text-[20px] sm:text-[16px]" aria-hidden="true"></span>',
      "  </span>",
      cardClose
    ].join("\n");
  }

  /* Turn rendered cards into real links — but only when the article
     file actually exists (no manual slug bookkeeping, no dead links).
     Probes data/<dir>/<slug>.json once per unique slug.
     opts (all optional): attr — element attribute holding the slug,
     dataDir — where the detail files live, hrefPrefix — link prefix. */
  function wireArticleLinks(root, opts) {
    opts = opts || {};
    var scope = root || document;
    var attr = opts.attr || "data-article-slug";
    var cards = scope.querySelectorAll("a[" + attr + "]");
    if (!cards.length) return Promise.resolve();
    var inPagesDir = window.location.pathname.indexOf("/pages/") !== -1;
    var hrefPrefix = opts.hrefPrefix != null
      ? opts.hrefPrefix
      : (inPagesDir ? "news-article.html?news=" : "pages/news-article.html?news=");
    var dataDir = opts.dataDir || (inPagesDir ? "../data/updates/items/" : "data/updates/items/");
    var seen = {};
    var jobs = [];
    Array.prototype.forEach.call(cards, function (card) {
      var slug = card.getAttribute(attr);
      if (!slug || seen[slug] === undefined) {
        seen[slug] = null;
        jobs.push(
          fetch(dataDir + encodeURIComponent(slug) + ".json", { cache: "no-store" })
            .then(function (res) { return res.ok; })
            .catch(function () { return false; })
            .then(function (exists) {
              seen[slug] = exists;
              return exists;
            })
        );
      }
    });
    return Promise.all(jobs).then(function () {
      Array.prototype.forEach.call(cards, function (card) {
        var slug = card.getAttribute(attr);
        if (seen[slug]) {
          card.setAttribute("href", hrefPrefix + encodeURIComponent(slug));
          card.classList.add("link");
        }
      });
    });
  }

  /* A news card may be only { "individual_news_item_file_name": "…" } — then its words and
     first picture are borrowed from data/updates/items/<id>.json. A card without
     an id keeps its own words and, in the page renderers, loses the
     "Read update" button. */
  function newsImage(d) {
    var v = d && (d.add_image != null ? d.add_image : (d.image != null ? d.image : d.images));
    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === "object") {
      return String(v.image_path != null ? v.image_path : (v.src || ""));
    }
    if (typeof v === "string") return v;
    var g = d && d.add_gallery;
    var gi = g && g.images;
    if (Array.isArray(gi) && gi.length) {
      var first = gi[0];
      return first && typeof first === "object"
        ? String(first.image_path != null ? first.image_path : (first.src || ""))
        : String(first || "");
    }
    return "";
  }

  function borrowNews(items, base) {
    var list = Array.isArray(items) ? items : [];
    var owners = [];
    var jobs = [];
    list.forEach(function (it) {
      var id = newsFileId(it);
      if (!id) return;
      owners.push(it);
      jobs.push(
        fetch((base || "") + encodeURIComponent(id) + ".json", { cache: "no-store" })
          .then(function (res) { return res.ok ? res.text().then(window.CWL.parseJson) : null; })
          .catch(function () { return null; })
      );
    });
    if (!jobs.length) return Promise.resolve(list);
    return Promise.all(jobs).then(function (deeps) {
      owners.forEach(function (it, i) {
        var d = deeps[i];
        it._newsFileExists = !!d;
        if (!d) return;
        var title = newsTitle(d);
        if (!String(newsTitle(it) || "").trim() && title) it.item_title = title;
        var date = newsDate(d);
        if (!String(newsDate(it) || "").trim() && date) it.current_date = date;
        var category = newsCategory(d);
        if (!String(newsCategory(it) || "").trim() && category) {
          it.add_relevant_category_name = category;
        }
        var chipLabel = d.label != null
          ? d.label
          : d.category_label_text;
        if (it.label == null &&
          it.category_label_text == null && chipLabel != null) {
          it.label = chipLabel;
        }
        if (it.background_colour == null && d.background_colour != null) {
          it.background_colour = d.background_colour;
        }
        if (it.is_pinned == null && d.is_pinned != null) it.is_pinned = d.is_pinned;
        if (it.is_featured == null && d.is_featured != null) it.is_featured = d.is_featured;
        if (it.featured_tag_label == null && d.featured_tag_label != null) {
          it.featured_tag_label = d.featured_tag_label;
        }
        var tagBg = d.featured_tag_background_colour != null
          ? d.featured_tag_background_colour
          : d.featured_tag_background;
        if (it.featured_tag_background_colour == null &&
          it.featured_tag_background == null && tagBg != null) {
          it.featured_tag_background_colour = tagBg;
        }
        if (it.image_folder_name == null && d.image_folder_name != null) {
          it.image_folder_name = d.image_folder_name;
        }
        var intro = d.item_introduction != null ? d.item_introduction
          : (d.text != null ? d.text : d.summary);
        if (!String(newsIntro(it) || "").trim() && intro) it.item_introduction = intro;
        if (!String(it.location || "").trim() && d.location) it.location = d.location;
        if (!it.image && !it.images) {
          var img = newsImage(d);
          if (img) it.image = img;
        }
      });
      return list;
    });
  }

  /* Plain message paragraph (empty states, errors). */
  function messageHtml(text) {
    return '<p class="section-message">' + esc(text) + "</p>";
  }

  /* --- a person's slug ----------------------------------------------
     Which file belongs to a person: their name without the title —
     "Michael Carter" → "michael_carter", which is
     data/team/profiles/michael_carter.json. One rule, used by the team cards,
     the supervisor cards and anything else that points at a person. */
  function personSlug(name) {
    return String(name == null ? "" : name)
      .replace(/^(dr|prof|professor|mr|mrs|ms|miss)\.?\s+/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  /* A person's record (as they sit in data/edit_team_section.json) → their slug: they
     may name their own file with "profile" (or "slug"), otherwise their
     name decides it. */
  function profileSlug(person) {
    var explicit = (person && (person.profile || person.slug)) || "";
    if (String(explicit).trim()) return String(explicit).trim();
    var name = person && (person.add_name != null ? person.add_name : person.name);
    return personSlug(name);
  }

  /* --- people cards, filled from the team file ----------------------
     A card that only names someone borrows the rest: their role line and
     their photo come from that person's line in data/edit_team_section.json, so a page
     writes a name once. A card that writes its own role or photo keeps it
     — which is what somebody outside the lab needs (a host, a co-author,
     a visiting researcher).

     pages pass their already-loaded team file to teamIndexOf, then the
     block to fillPeople; a page without the file simply leaves the cards
     as they were written. */
  function teamIndexOf(team) {
    var index = {};
    ((team && team.current) || []).forEach(function (p) { if (p) p._category = "current"; });
    ((team && team.alumni) || []).forEach(function (p) { if (p) p._category = "alumni"; });
    var all = [].concat((team && team.current) || [], (team && team.alumni) || []);
    (team && team.groups || []).forEach(function (g) {
      (g.add_people_to_category_defined_above || []).forEach(function (p) {
        if (p) p._category = g.main_category_name;
      });
      all = all.concat(g.add_people_to_category_defined_above || []);
    });
    all.forEach(function (person) {
      if (!person) return;
      [person.add_name, person.name, person.profile, person.slug].forEach(function (key) {
        var slug = personSlug(key);
        if (slug && !index[slug]) index[slug] = person;
      });
    });
    return index;
  }

  function fillPeople(value, index) {
    if (!index || !value) return value;
    /* the block's cards, whether it was written as a list or as
       { "heading": …, "people": [ … ] } */
    var list = Array.isArray(value) ? value : (value.people || value.items || null);
    if (!list) return value;
    var items = Array.isArray(list) ? list : [list];
    var filled = items.map(function (entry) {
      var card = typeof entry === "string" ? { name: entry } : entry;
      if (!card || typeof card !== "object" || !card.name) return entry;
      var person = index[personSlug(card.name)];
      if (!person) return entry;
      var out = {};
      Object.keys(card).forEach(function (key) { out[key] = card[key]; });
      if (!out.position && !out.role && !out.subtitle &&
          (person.position || person.role)) {
        out.position = person.position || person.role;
      }
      var teamPhoto = person.image_path || person.photo;
      if (!out.image_path && !out.photo && teamPhoto) {
        out.image_path = teamImageSrc(teamPhoto, person._category);
      }
      var teamEmail = person.add_email || person.email;
      if (!out.email && teamEmail) {
        out.email = teamEmail;
      }
      if (!out.buttons && person.buttons) {
        out.buttons = person.buttons;
      }
      return out;
    });
    if (Array.isArray(value)) return filled;
    var copy = {};
    Object.keys(value).forEach(function (key) { copy[key] = value[key]; });
    delete copy.items;
    copy.people = filled;
    return copy;
  }

  /* A deep page's people blocks — the `add_people` element itself, its
     older `people` name, or one inside `add_content_to_page` — borrow a
     name's role and photo from the team file, so a card written with only
     a name still shows the person. The block carries
     `{ heading, people }`, so `people` is the marker
     here; a supervisor list uses the same card filler. */
  function fillDeepPeople(deep, team) {
    if (!deep || typeof deep !== "object" || !team) return deep;
    var index = teamIndexOf(team);
    function fill(value) { return fillPeople(value, index); }
    if (deep.add_people) deep.add_people = fill(deep.add_people);
    if (deep.people) deep.people = fill(deep.people);
    if (deep.supervisor) deep.supervisor = fill(deep.supervisor);
    if (Array.isArray(deep.add_content_to_page)) {
      deep.add_content_to_page.forEach(function (entry) {
        if (!entry || typeof entry !== "object") return;
        if (entry.add_people) entry.add_people = fill(entry.add_people);
        if (entry.people) entry.people = fill(entry.people);
      });
    }
    return deep;
  }

  /* A publications block may point at a reusable set file:
       { "add_publication_or_more": {
           "publications_collection_file_name": "conference_2026" } }
     The set lives in data/outputs/collections/<name>.json and carries a
     label plus the titles to take from the main
     data/outputs/publications.json archive:
       { "label": "Conference 2026", "titles": [ "…", "…" ] }
     Loading is asynchronous because each set is its own file. */
  function publicationRefId(value) {
    if (!value || Array.isArray(value) || typeof value !== "object") return "";
    var id = value.publications_collection_file_name != null
      ? value.publications_collection_file_name
      : (value.publications_collection_file_id != null
          ? value.publications_collection_file_id
          : (value.publications_file_id != null
              ? value.publications_file_id
              : value.publications_file));
    return String(id == null ? "" : id).trim();
  }

  function fillPublicationFiles(deep) {
    if (!deep || typeof deep !== "object") return Promise.resolve(deep);
    var ids = [];
    function see(value) {
      var id = publicationRefId(value);
      if (id && ids.indexOf(id) === -1) ids.push(id);
    }
    function scan(container) {
      if (!container || typeof container !== "object") return;
      see(container.add_publication_or_more);
      see(container.publications);
      see(container.publication);
    }
    scan(deep);
    if (Array.isArray(deep.add_content_to_page)) deep.add_content_to_page.forEach(scan);
    if (!ids.length) return Promise.resolve(deep);

    return Promise.all(ids.map(function (id) {
      return fetch("../data/outputs/collections/" + encodeURIComponent(id) + ".json", { cache: "no-store" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; });
    })).then(function (files) {
      var byId = {};
      ids.forEach(function (id, i) { byId[id] = files[i]; });

      function resolve(value) {
        var id = publicationRefId(value);
        if (!id || !byId[id]) return value;
        var file = byId[id];
        var merged = {};
        Object.keys(file).forEach(function (k) { merged[k] = file[k]; });
        Object.keys(value).forEach(function (k) { merged[k] = value[k]; });
        if (merged.label === undefined && file.title !== undefined) merged.label = file.title;
        var titles = file.titles || file.names || file.publications;
        var hasList = merged.publication_titles != null || merged.items != null ||
          merged.papers != null || merged.list != null || merged.publication != null;
        if (titles && !hasList) {
          var list = Array.isArray(titles) ? titles : [titles];
          merged.publication_titles = list.map(function (t) {
            return (t && typeof t === "object") ? t : { title: String(t) };
          });
        }
        return merged;
      }

      function apply(container) {
        if (!container || typeof container !== "object") return;
        if (container.add_publication_or_more) {
          container.add_publication_or_more = resolve(container.add_publication_or_more);
        }
        if (container.publication) container.publication = resolve(container.publication);
        if (container.publications) container.publications = resolve(container.publications);
      }
      apply(deep);
      if (Array.isArray(deep.add_content_to_page)) deep.add_content_to_page.forEach(apply);
      return deep;
    });
  }

  /* Load the named set(s), then fill every title from the main
     data/outputs/publications.json archive. */
  function preparePublications(deep, archive) {
    return fillPublicationFiles(deep).then(function (filled) {
      return fillPublicationRecords(filled, archive);
    });
  }

  /* A one-line publication can be just a title. If that title is in
     data/outputs/edit_publications_and_outputs_page.json, fill the rest of the record — authors, venue,
     year, DOI, image, publisher — so the row looks exactly like the
     Outputs page. A field written on the card still wins. */
  function fillPublicationRecords(deep, outputs) {
    if (!deep || typeof deep !== "object" || !outputs) return deep;
    var records = outputs.add_items_to_list || outputs.items || outputs.outputs || [];
    var index = {};
    function key(s) {
      return String(s == null ? "" : s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }
    records.forEach(function (r) {
      if (!r || !r.title) return;
      if (r.type == null) r.type = "publication";
      var k = key(r.title);
      if (k && !index[k]) index[k] = r;
    });
    function fillItem(item) {
      if (typeof item === "string") item = { title: item };
      if (!item || typeof item !== "object") return item;
      var title = item.publication_title_to_include != null
        ? item.publication_title_to_include
        : (item.publication_title != null
            ? item.publication_title
            : (item.title != null ? item.title : item.publication));
      if (!title) return item;
      var base = {};
      Object.keys(item).forEach(function (k) { base[k] = item[k]; });
      base.title = title;
      var record = index[key(title)];
      if (!record) return base;
      var merged = {};
      Object.keys(record).forEach(function (k) { merged[k] = record[k]; });
      Object.keys(base).forEach(function (k) { merged[k] = base[k]; });
      return merged;
    }
    function fillBlock(value) {
      if (!value || typeof value !== "object") return value;
      if (Array.isArray(value)) return value.map(fillItem);
      var listKey = value.publication_titles != null ? "publication_titles"
        : (value.items != null ? "items"
          : (value.papers != null ? "papers"
            : (value.list != null ? "list"
              : (value.publication != null ? "publication" : ""))));
      var list = listKey ? value[listKey] : null;
      if (list == null && value.title) return fillItem(value);
      if (list == null) return value;
      var arr = Array.isArray(list) ? list : [list];
      var filled = arr.map(fillItem);
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = value[k]; });
      if (listKey === "publication") {
        out.publication = filled.length === 1 ? filled[0] : filled;
      } else if (listKey) {
        out[listKey] = filled;
      } else {
        out.items = filled;
      }
      return out;
    }
    function handle(container) {
      if (!container || typeof container !== "object") return;
      if (container.add_publication_or_more) {
        if (typeof container.add_publication_or_more === "string") {
          container.add_publication_or_more = fillItem(container.add_publication_or_more);
        } else if (typeof container.add_publication_or_more === "object") {
          container.add_publication_or_more = fillBlock(container.add_publication_or_more);
        }
      }
      if (container.publication) {
        container.publication = fillItem(container.publication);
      }
      if (container.publications) {
        if (typeof container.publications === "string") {
          container.publications = fillItem(container.publications);
        } else if (typeof container.publications === "object") {
          container.publications = fillBlock(container.publications);
        }
      }
    }
    handle(deep);
    if (Array.isArray(deep.add_content_to_page)) {
      deep.add_content_to_page.forEach(function (entry) {
        if (entry && typeof entry === "object") handle(entry);
      });
    }
    return deep;
  }

  /* --- the little label pills ---------------------------------------
     A row of chips — the small uppercase pills under a team card and
     under a profile's name. One drawer, so a person's chips are punch-cut
     the same anywhere they are printed. `accentFirst` paints the first
     chip with the accent fill (the card's habit); empty chips are
     dropped, and no chips = nothing at all. */
  function chipRowHtml(chips, accentFirst) {
    if (!chips || !chips.length) return "";
    var spans = [];
    (chips || []).forEach(function (chip) {
      if (chip == null || String(chip).trim() === "") return;
      var cls = "chip" + (accentFirst && !spans.length ? " chip--accent" : "");
      spans.push('<span class="' + cls + '">' + esc(String(chip)) + "</span>");
    });
    if (!spans.length) return "";
    return '<div class="member-chips">' + spans.join("") + "</div>";
  }

  /* --- editorial page pieces (template 02) --------------------------
     The standard page opener: eyebrow + big serif headline on the
     left, intro under a short rule on the right, hairline closing
     the band. Any piece may be omitted. `meta` is a small line under
     the headline (a date, a byline) in the label voice. */
  function pageHero(words) {
    words = words || {};
    /* No words, no band: an opener with nothing in it would still leave
       an empty grid behind a stray closing hairline on the page — which
       is exactly what a page with `hide_the_page_heading` must not show. */
    if (!(words.label || words.heading || words.kicker || words.meta || words.text)) return "";
    /* `centered` stacks the hero down the middle — eyebrow, title, then
       the note right under it — the way the team page opens, and leaves
       off the closing hairline. Default is the two-column spread: title
       left, the note under its short rule in the right column, closed by
       a full-width hairline. */
    var centered = !!words.centered;
    /* `centerSmall` centres the same opener below the desktop break and
       leaves it left-aligned at desktop width — the page asks for it. */
    var mobileCenter = !!words.centerSmall;
    /* The centred form IS the team page's opening, spacing included: the
       wrapper's top padding plus the section's own pt-space-lg gives the
       same 76px of air under the header that team.html has. */
    var out = ['<div class="max-w-[1260px] mx-auto' + (centered ? " pt-space-lg md:pt-space-xl text-center" : (mobileCenter ? " text-center lg:text-left" : "")) + '">'];
    out.push('  <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop">');

    function title() {
      if (words.label) {
        out.push('      <span class="block font-label-md text-label-md uppercase tracking-[0.25em] text-secondary mb-space-md">' + esc(words.label) + "</span>");
      }
      if (words.heading) {
        out.push('      <h1 class="font-headline-lg text-[2.225rem] sm:text-[2.875rem] md:text-[3.625rem] leading-[1.1] tracking-tight text-on-surface">' + esc(words.heading) + "</h1>");
      }
      if (words.kicker) {
        out.push('      <span class="block font-label-md text-label-md uppercase tracking-[0.2em] text-secondary mt-space-md">' + esc(words.kicker) + "</span>");
      }
      if (words.meta) {
        out.push('      <span class="block font-label-md text-label-md uppercase tracking-[0.2em] text-on-surface-variant mt-space-sm">' + esc(words.meta) + "</span>");
      }
    }

    if (centered) {
      /* One full-width column, so the grid's row gap never opens between
         the title and the note. The note is body-md here: this variant
         reproduces the team page's opening exactly. */
      out.push('    <div class="lg:col-span-12">');
      title();
      if (words.text) {
        out.push('      <p class="mt-space-sm mx-auto max-w-[900px] font-body-md text-body-md text-on-surface-variant">' + esc(words.text) + "</p>");
      }
      out.push("    </div>");
    } else {
      out.push('    <div class="lg:col-span-7">');
      title();
      out.push("    </div>");
      if (words.text) {
        out.push('    <div class="lg:col-span-5 lg:pt-4 flex flex-col justify-end">');
        out.push('      <div class="w-16 h-px bg-outline-variant mb-space-md' + (mobileCenter ? " mx-auto lg:mx-0" : "") + '"></div>');
        out.push('      <p class="font-body-lg text-body-lg text-on-surface-variant leading-relaxed lg:text-justify">' + esc(words.text) + "</p>");
        out.push("    </div>");
      }
    }

    out.push("  </div>");
    if (!centered) out.push('  <div class="h-px bg-outline-variant mt-space-lg"></div>');
    out.push("</div>");
    return out.join("\n");
  }

  /* The closing band: the About page's dark card — the words in the left
     seven columns, the buttons stacked at the right edge, on the site's
     #1B1C19 ground. The section that holds it carries the ground and the
     padding (see pages/outputs.html), so this returns the words only.
     The first button is the pale solid one; later buttons take the pale
     outline, so a block can offer two ways on without shouting.
     Returns "" when the block has no words. */
  /* ---- buttons, in one shape --------------------------------------
     A page's buttons are a LIST, however many there are, and a button the
     page's own chrome looks up carries a name:

       "buttons": [
         { "name": "back", "text": "Back to Home", "link": "../index.html" },
         { "name": "more", "text": "View more outputs" }
       ]

     Older files wrote them as an object keyed by those names
     ({ "back": { … }, "more": { … } }); that reads the same way, so
     nothing breaks, but the list is the shape to write. */
  function buttonList(value) {
    if (Array.isArray(value)) {
      return value.filter(function (b) {
        return b && (b.text || b.label || b.link || b.url);
      });
    }
    if (!value || typeof value !== "object") return [];
    return Object.keys(value).map(function (name) {
      var b = value[name];
      if (b == null) return null;
      if (typeof b === "string") b = { text: b };
      var out = { name: name };
      Object.keys(b).forEach(function (k) { out[k] = b[k]; });
      if (!out.name) out.name = name;
      return out;
    }).filter(Boolean);
  }

  /* One named button out of that list — the page's "back" pill, the
     "more" word — or null when the file leaves it out. */
  function namedButton(buttons, name) {
    var items = Array.isArray(buttons) ? buttons : buttonList(buttons);
    for (var i = 0; i < items.length; i += 1) {
      if (items[i] && items[i].name === name) return items[i];
    }
    return null;
  }

  /* One home-page band's settings out of data/site.json.

     `sections` is an object keyed by the band's name, so the name is
     never typed twice:

       "sections": {
         "about": { "enabled": true },
         "news":  { "enabled": true, "heading": "News & Updates", … }
       }

     The older array form — [ { "name": "about", "enabled": true } ] —
     still reads, so a file written before this shape keeps working. A
     bare `true` / `false` stands for `{ "enabled": … }`. */
  var SECTION_ALIASES = {
    publications_and_outputs: "papers",
    news_and_updates: "news"
  };

  var SECTION_KEYS = {
    about: "home_page_about_section",
    research: "home_page_research_section",
    team: "home_page_team_section",
    join: "home_page_join_section",
    featured: "home_page_featured_section",
    contact: "home_page_contact_section",
    news_and_updates: "home_page_news_and_updates_section"
  };

  function sectionConfig(site, name) {
    var sections = site && (site.show_home_page_sections ||
      site.hide_or_show_home_page_sections ||
      site.hide_or_view_home_page_sections || site.sections);
    if (!sections) return null;
    var mapped = SECTION_KEYS[name] || name;
    var lookup = mapped;
    if (Array.isArray(sections)) {
      for (var i = 0; i < sections.length; i += 1) {
        if (sections[i] && (sections[i].name === lookup ||
          (SECTION_ALIASES[lookup] && sections[i].name === SECTION_ALIASES[lookup]) ||
          sections[i].name === name)) {
          return sections[i];
        }
      }
      return null;
    }
    if (typeof sections !== "object") return null;
    /* New key first, then the older name, then the alias. */
    if (!Object.prototype.hasOwnProperty.call(sections, lookup)) lookup = name;
    if (!Object.prototype.hasOwnProperty.call(sections, lookup) && SECTION_ALIASES[name]) {
      lookup = SECTION_ALIASES[name];
    }
    if (!Object.prototype.hasOwnProperty.call(sections, lookup)) return null;
    var entry = sections[lookup];
    if (entry === true || entry === false) return { enabled: entry };
    return entry && typeof entry === "object" ? entry : null;
  }

  function ctaHtml(cta) {
    cta = cta || {};
    var buttons = Array.isArray(cta.buttons) ? cta.buttons : [];
    if (!cta.heading && !buttons.length) return "";
    var solid = "inline-flex items-center justify-center gap-2 w-[280px] max-w-full border border-transparent bg-[#F5F2EB] text-[#1B1C19] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:bg-white transition-all";
    var outline = "inline-flex items-center justify-center gap-2 w-[280px] max-w-full border border-[#FAF9F5]/30 text-[#FAF9F5] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:border-[#FAF9F5]/70 hover:bg-[#FAF9F5]/10 transition-all";
    var icon = '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span>';
    var out = ['<div class="max-w-[1260px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-end">'];
    if (cta.heading || cta.text) {
      out.push('  <div class="lg:col-span-7 text-center lg:text-left">');
      if (cta.heading) {
        out.push('    <h2 class="font-headline-lg text-[1.875rem] md:text-[2.625rem] leading-[1.15] text-[#F5F2EB]">' + esc(cta.heading) + "</h2>");
      }
      if (cta.text) {
        out.push('    <p class="mt-space-sm font-body-lg text-body-lg text-[#CDC8BC] lg:text-justify">' + esc(cta.text) + "</p>");
      }
      out.push("  </div>");
    }
    if (buttons.length) {
      out.push('  <div class="lg:col-span-5 flex flex-col items-center lg:items-end gap-2">');
      buttons.forEach(function (b, i) {
        if (!b) return;
        /* `text` is the canonical label; `label` is the key most data
           files use. Named links (@contact, @updates, …) resolve here so
           a page cannot ship a literal "@contact" href. */
        var label = b.text != null ? b.text : b.label;
        if (!label) return;
        var rawHref = b.link != null ? b.link : (b.href != null ? b.href : "#");
        var href = rawHref === "#" ? "#" : link(rawHref);
        out.push(
          '    <a class="' + (i === 0 && b.style !== "outline" ? solid : outline) + '" href="' + esc(href) + '">' +
          "<span>" + esc(label) + "</span>" + icon + "</a>"
        );
      });
      out.push("  </div>");
    }
    out.push("</div>");
    return out.join("\n");
  }

  /* A small sharp chip: coloured when a background is given (text
     derives from it), hairline outline otherwise. */
  function chipHtml(text, background) {
    var cls = "px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest " +
      (background ? "" : "border border-outline-variant text-on-surface-variant");
    var style = background
      ? ' style="background:' + esc(background) + ";color:" + badgeText(background) + '"'
      : "";
    return '<span class="' + cls + '"' + style + ">" + esc(text) + "</span>";
  }

  /* Friendly markup syntax (reference template): write plain text in
     JSON, it renders as HTML.
     **bold**   *italic*   `code`   ==highlight==   {text|url} link
     \n → new line   \\* escapes a literal asterisk */
  function formatText(str) {
    if (!str) return "";
    var ph = {}, c = 0, key;
    str = String(str).replace(/\\(.)/g, function (m, ch) {
      key = "" + (c++) + "";
      ph[key] = ch;
      return key;
    });
    str = str.replace(/`([^`]+)`/g, "<code>$1</code>");
    str = str.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    str = str.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    str = str.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    str = str.replace(/==([^=]+)==/g, '<mark class="hl">$1</mark>');
    str = str.replace(/\{([^}]+)\|([^}]+)\}/g, function (m, label, url) {
      return '<a href="' + link(url) + '"><strong>' + label + "</strong></a>";
    });
    str = str.replace(/\n/g, "<br>");
    for (var k in ph) { str = str.replace(k, ph[k]); }
    return str;
  }

  /* When a home section is switched off (enabled: false), its navbar
     links would be dead anchors. Point them at the section's page
     instead (the button.link in site.json) — zero extra config.
     If the nav hasn't been built yet, the job is queued and applied
     by applyPendingRetargets() once nav.js finishes rendering. */
  var pendingRetargets = [];
  function retargetNav(anchor, page) {
    if (!page) return;
    var links = document.querySelectorAll('.nav-link[href="' + anchor + '"]');
    if (!links.length) {
      pendingRetargets.push([anchor, page]);
      return;
    }
    Array.prototype.forEach.call(links, function (a) {
      a.setAttribute("href", page);
    });
  }
  function applyPendingRetargets() {
    while (pendingRetargets.length) {
      var job = pendingRetargets.shift();
      retargetNav(job[0], job[1]);
    }
  }

  /* A list may carry "section banners" — strings that begin with `//`,
     house style 38 hyphens each side:
       "// -------------------------------------- TITLE -------------------------------------- "
     They are valid JSON, but they are not content: the loader drops them
     from every array, so no card, row or tag ever renders one. An object
     may carry the same banner as a key (`"// … ": ""`), which is dropped
     too. A `//` at the start of a string value outside an array is left
     alone. */
  function stripBanners(value) {
    if (Array.isArray(value)) {
      return value
        .filter(function (item) {
          return !(typeof item === "string" && /^\s*\/\//.test(item));
        })
        .map(stripBanners);
    }
    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        if (/^\s*\/\//.test(key)) {
          delete value[key];
          return;
        }
        value[key] = stripBanners(value[key]);
      });
    }
    return value;
  }

  /* --- the alias layer (SCHEMA.md §5) --------------------------------
     A decided rename is folded into its canonical name the moment a data
     file is parsed, so a half-migrated file still renders and an old page
     keeps working. One phase only: when the phase ends, the alias is
     deleted and the linter fails on the old name.

     Phase 1 — media. */
  var KEY_ALIASES = {
    path_or_name_of_the_image: "image_path",
    image_name_or_path_to_image: "image_path",
    image_name_or_path: "image_path",
    image_name: "image_path",
    image_to_show_in_card: "image_path",
    add_name_or_path_to_image: "image_path",
    add_name_or_path_to_image_to_favicon: "favicon_path",
    image_alt_text: "image_alt",
    imagealt: "image_alt",
    lab_item_alt_text: "image_alt",
    caption_of_the_image: "image_caption",
    credit_of_the_image: "image_credit",
    "3d_model_name_or_path": "model_path",
    caption_of_3d_model: "model_caption",
    "3d_model_credit": "model_credit",
    caption_of_the_table: "table_caption",
    add_images_to_gallery: "images",
    add_images_to_slideshow: "images",
    images_to_include_in_lab_in_action_section_slideshow: "images",
    add_images: "images",
    logo_alt_text: "logo_alt",
    footer_logo_alt: "logo_alt",
    gallery_image_size: "size",
    number_of_columns_in_gallery: "columns",
    layout_of_the_gallery: "layout",

    /* Phase 2 — buttons and links. */
    label_of_the_button: "label",
    fill_or_outline_button: "style",
    add_external_or_internal_link: "link",
    add_custom_icon_to_button: "icon",
    add_link: "link",
    text_to_link: "note",
    link_to_profile: "profile_link",
    embed_link: "link",
    single_embed_media_item_link: "link",
    add_your_map_link: "link",
    button_label_text: "button_label",

    /* Phase 3 — headings and copy. */
    title_of_the_page_and_card: "title",
    title_of_the_gallery: "heading",
    title_of_the_list: "heading",
    title_of_the_table: "heading",
    title_of_the_slideshow: "heading",
    title_of_the_focus_list: "heading",
    title_of_the_links_section: "heading",
    title_of_the_contact_information_section: "heading",
    title_of_the_card_set: "heading",
    title_of_people_card_section: "heading",
    title_of_tags: "heading",
    title_of_equation: "heading",
    title_of_3d_model: "heading",
    title_of_embed_media_row: "heading",
    title_of_the_quote: "heading",
    title_of_the_paragraph: "heading",
    title_of_the_link: "label",
    label_of_the_timeline: "heading",
    special_note_title: "heading",
    embed_media_title: "heading",
    individual_card_title: "heading",
    single_embed_media_item_title: "heading",
    single_embed_media_item_caption: "caption",
    single_embed_media_item_credit: "credit",
    embed_media_caption: "caption",
    embed_media_credit: "credit",
    content_of_the_paragraph: "text",
    profile_card_text: "text",
    text_to_show_in_card: "text",
    quote_text: "text",
    special_note: "text",
    introduction_of_the_page_and_card: "intro",
    introduction_of_card_set: "intro",
    introduction_to_people_card_section: "intro",
    add_summary: "summary",
    special_note_colour: "colour",
    special_note_icon: "icon",
    custom_special_note_colour: "background_colour",
    custom_special_note_text_color: "text_colour",

    /* Phase 4 — booleans (pure renames; the inverted ones are not aliased:
       their old value means the opposite). */
    pinned: "is_pinned",
    featured: "is_featured",
    enabled: "is_enabled",
    turn_on_or_off_autorotate: "show_autorotate",
    turn_on_or_off_download_option: "show_download",
    turn_on_or_off_magnification: "zoom_on",
    show_zoom: "zoom_on",
    zoom: "zoom_on",
    lightbox: "zoom_on",
    turn_on_or_off_reverse_numbering: "show_reverse_numbering",
    publication_year_filter: "show_year_filter",
    feature_this_profile_in_team_page_section: "show_in_team_page",
    feature_this_profile_in_team_section_in_home_page: "show_in_home_team",
    hide_or_show_home_page_sections: "show_home_page_sections",
    hide_show_or_change_the_name_of_navigation_bar_items: "navigation_bar_items",

    /* Phase 5a — counts, units, alignment, camelCase. */
    number_of_columns_in_card_grid: "columns",
    number_of_columns_in_embed_row: "columns",
    number_of_items_to_show_in_news_and_updates_section: "max_items",
    number_of_items_to_show_in_publications_and_outputs_section: "max_items",
    research_areas_section_visible_card_count: "max_items",
    publications_per_page: "per_page",
    height_of_3d_viewer: "height",
    embed_media_height: "height",
    "added_date_for_filter_dd.mm.yyyy": "added_date",
    heading_level: "level",
    list_level: "level",
    align_button_to_left_center_or_right: "align",
    align_embed_to_right_or_left: "align",
    align_image_to_right_or_left: "align",
    align_slideshow_to_right_or_left: "align",
    alignment_of_content_in_rows: "align",
    list_style: "style",
    layout_of_the_paragraph: "layout",
    pinnedLabel: "pinned_label",
    photoCredit: "photo_credit",
    supervisorLabel: "supervisor_label",
    supervisorText: "supervisor_text",
    centerSmall: "center_small",

    /* Phase 5b — colour / label / role words. */
    category_label_background: "background_colour",
    category_label_colour: "background_colour",
    lab_item_availability_label_colour: "background_colour",
    custom_color_for_category_label_background: "background_colour",
    category_label_for_this_list: "label",
    modify_category_label_text: "label",
    primary_button_label_for_items_in_this_list: "primary_button_label",
    secondary_button_label_for_items_in_this_list: "secondary_button_label",
    read_more_button_label: "card_button_label",
    position_button_label: "button_label",
    role_of_position: "position"
  };

  function canonicalise(value) {
    if (Array.isArray(value)) {
      value.forEach(canonicalise);
      return value;
    }
    if (!value || typeof value !== "object") return value;
    Object.keys(value).forEach(function (key) {
      var target = KEY_ALIASES[key];
      var child = value[key];
      if (target) {
        if (value[target] == null) value[target] = child;
        delete value[key];
        child = value[target];
      }
      canonicalise(child);
    });
    return value;
  }

  function parseJson(text) {
    return canonicalise(stripBanners(JSON.parse(String(text == null ? "" : text))));
  }

  /* Fetch JSON, resolve to null on any failure (never throws). */
  function loadJson(url) {
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(parseJson)
      .catch(function (err) {
        console.error("[helpers] could not load " + url, err);
        return null;
      });
  }

  /* The tab title: a page's own words + the site title from data/site.json.
     Nothing is hard-coded here, so a template never shows another lab's name. */
  function setPageTitle(pageTitle) {
    var own = String(pageTitle == null ? "" : pageTitle).trim();
    loadJson(rootPrefix() + "data/site.json").then(function (site) {
      var rawTitle = site
        ? (site.add_title_to_show_in_search_engines != null
          ? site.add_title_to_show_in_search_engines
          : site.title)
        : null;
      var siteTitle = rawTitle != null ? String(rawTitle).trim() : "";
      var title = own || siteTitle;
      if (own && siteTitle && own.toLowerCase().indexOf(siteTitle.toLowerCase()) === -1) {
        title = own + " \u2014 " + siteTitle;
      }
      document.title = title;
    });
  }

  /* The outputs archive is one config file plus one file per type:
       data/outputs/edit_publications_and_outputs_page.json          -> { list_file_names: [ "publications", … ] }
       data/outputs/…             -> { items: [ … ] }
     The outputs page, the home papers band and a profile's author filter
     all call this to get the one combined `items` list. */
  function loadOutputItems(config, base) {
    if (!config || typeof config !== "object") return Promise.resolve(config);
    var files = Array.isArray(config.list_file_names)
      ? config.list_file_names
      : (Array.isArray(config.output_files) ? config.output_files : []);
    if (!files.length) return Promise.resolve(config);
    var fileNames = files.map(function (name) {
      name = String(name == null ? "" : name).trim();
      return /\.json$/i.test(name) ? name : name + ".json";
    });
    var dir = base || (window.location.pathname.indexOf("/pages/") !== -1
      ? "../data/outputs/"
      : "data/outputs/");
    return Promise.all(fileNames.map(function (name) {
      return loadJson(dir + encodeURIComponent(name));
    })).then(function (lists) {
      var items = [];
      var categories = [];
      lists.forEach(function (list, i) {
        var listName = String(fileNames[i] || "").replace(/\.json$/i, "");
        var rows = (list && Array.isArray(list.add_items_to_list))
          ? list.add_items_to_list
          : ((list && Array.isArray(list.items))
            ? list.items
            : (Array.isArray(list) ? list : []));
        rows.forEach(function (item) {
          if (item && typeof item === "object") {
            item._list = listName;
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
        if (list && list.list_name) {
          categories.push({
            name: String(list.list_name),
            label: String(list.label || list.list_name),
            tag: String(list.small_tag_label_shown_in_single_items_in_main_list || list.list_name),
            background: list.custom_color_for_background_colour || "#e5dfd0"
          });
        }
      });
      var out = {};
      Object.keys(config).forEach(function (k) { out[k] = config[k]; });
      out.items = items;
      if (!Array.isArray(out.categories) || !out.categories.length) {
        out.categories = categories;
      }
      return out;
    });
  }

  /* --- named links --------------------------------------------------
     A small registry (data/reference_link_list.json) so content can point at a place
     by name instead of a path that depends on how deep the page sits:

       "link": "@team"                 → pages/team.html
       "link": "@contact"              → index.html#contact
       "link": "@area:soil-microbiome" → pages/research-area.html?area=…
       "link": "@books.my_books"       → pages/page.html?folder=books&page=my_books
       "link": "https://example.com"   → left exactly as written
       "link": "pages/team.html"       → left exactly as written

     Pages live under "pages", home-page anchors under "sections", URL
     shapes under "routes". When a name is both a page and a section
     (about, team) the page wins — write "@#about" for the home
     section. An unknown name resolves to "#" — quiet, never a dead
     link. */
  /* Link names are built into the engine — content never needs a
     file-by-file registry. data/reference_link_list.json is just a reference sheet.

       @home                        a page
       @home.contact                a home-page section
       @research.soil_microbiome    a page built from data/research/…
       @pages.facilities            a page built from data/pages/… */
  var PAGES = {
    home: "index.html",
    about: "pages/about.html",
    team: "pages/team.html",
    outputs: "pages/outputs.html",
    updates: "pages/updates.html",
    positions: "pages/positions.html",
    labs: "pages/labs.html"
  };

  var HOME_SECTIONS = {
    about: "about",
    areas: "research-areas",
    "research-areas": "research-areas",
    research_areas: "research-areas",
    team: "team",
    publications: "publications",
    news: "news",
    join: "join",
    contact: "contact"
  };

  var FOLDER_ROUTES = {
    research: "pages/research-area.html?area=",
    news: "pages/news-article.html?news=",
    updates: "pages/news-article.html?news=",
    positions: "pages/position.html?positions=",
    join: "pages/position.html?positions=",
    profiles: "pages/profile.html?profile=",
    pages: "pages/page.html?page="
  };

  /* Kept for callers that used to feed data/reference_link_list.json in; the names are
     built in now, so there is nothing to load. */
  function setLinks() { }

  /* How deep the current page sits — index at the root, pages one
     level in (the same rule the footer and article links use). */
  function rootPrefix() {
    return window.location.pathname.indexOf("/pages/") !== -1 ? "../" : "";
  }

  /* A root-relative target, made right for the page we are on. A bare
     "index.html#…" becomes just "#…" when we are already at the root. */
  function toHref(target) {
    var root = rootPrefix();
    if (root === "" && String(target).indexOf("index.html#") === 0) {
      return String(target).slice("index.html".length);
    }
    return root + target;
  }

  /* Resolve one link value. Anything not starting with "@" is returned
     untouched, so every existing link keeps working. */
  function has(group, name) {
    return Object.prototype.hasOwnProperty.call(group, name);
  }

  function link(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return s;

    /* Older "section@areas" still reads as "@home.areas". */
    if (s.indexOf("section@") === 0) s = "@home." + s.slice("section@".length);
    if (s.charAt(0) !== "@") return s;

    var body = s.slice(1);
    var lower = body.toLowerCase();

    /* Friendly old names. */
    if (lower === "index") lower = "home";
    if (lower === "papers") lower = "outputs";

    /* @folder.file — a page built from a JSON file. */
    var m = /^([a-z0-9_-]+)\.([a-z0-9_.-]+)$/i.exec(body);
    if (m) {
      var folder = m[1].toLowerCase();
      var file = m[2];
      if (folder === "home" || folder === "section") {
        var sec = HOME_SECTIONS[file.toLowerCase()];
        return sec ? toHref("index.html#" + sec) : "#";
      }
      var route = FOLDER_ROUTES[folder];
      if (route) return toHref(route + encodeURIComponent(file));
      /* Any folder of your own under data/: @books.my_books opens
         data/books/my_books.json on the free-standing page template. */
      return toHref("pages/page.html?folder=" +
        encodeURIComponent(folder) + "&page=" + encodeURIComponent(file));
    }

    /* A static page. */
    if (PAGES[lower]) return toHref(PAGES[lower]);

    /* A home-page section shorthand: @areas, @contact, … */
    if (HOME_SECTIONS[lower]) return toHref("index.html#" + HOME_SECTIONS[lower]);

    /* Older route forms: @area:id, @news:id, @positions:id, @page:id. */
    var r = /^(area|news|positions|page):(.+)$/i.exec(body);
    if (r) {
      var key = r[1].toLowerCase();
      var routeKey = key === "area" ? "research" : key;
      var rt = FOLDER_ROUTES[routeKey];
      return rt ? toHref(rt + encodeURIComponent(r[2])) : "#";
    }

    return "#";
  }

  /* The names are built in now, so this resolves at once. Pages still
     call it to keep the same boot order. */
  var linksPromise = null;
  function loadLinks() {
    if (!linksPromise) linksPromise = Promise.resolve(true);
    return linksPromise;
  }

  /* ---- The little drawings ----------------------------------------
     Every icon the site's squares and small lines wear comes from
     assets/icons/:

       social_icons/   the outward doors — mail, cv, googlescholar_new,
                       linkedin, github, orcid, instagram, mastodon …
       custom_icons/   your own
       system_icons/   the quiet ones — arrow_outward, phone_talk,
                       location, clock, science …

     A name is a FILE NAME, so a drawing added to either folder tomorrow
     works without touching the stylesheet: the span carries the file's
     own url, and css/style.css masks it in, so the drawing takes the
     colour of whatever it sits in — white on the black squares, grey in
     an address line, and the hover tint with them.

     A KIND is understood as well, for the words a person naturally
     writes: "email" → the envelope, "cv" → the CV mark, "scholar" → the
     scholar mark, "website" → the globe. A word nobody knows still gets
     its square, wearing the outward arrow. */
  var ICON_KINDS = {
    email: "mail", mail: "mail",
    cv: "cv", resume: "cv", document: "cv", pdf: "cv",
    scholar: "googlescholar_new", "google scholar": "googlescholar_new",
    googlescholar: "googlescholar_new", googlescholar_new: "googlescholar_new",
    googlescholar_old: "googlescholar_old", "google scholar": "googlescholar_new",
    publication: "googlescholar_new", papers: "googlescholar_new",
    orcid: "orcid", linkedin: "linkedin", github: "github", gitlab: "gitlab",
    bluesky: "bluesky", mastodon: "mastodon", x: "x", twitter: "x",
    website: "globe", web: "globe", site: "globe", globe: "globe", home: "home",
    phone: "phone_talk", call: "phone_talk", fax: "fax",
    location: "location", address: "location", map: "map_search",
    clock: "clock", calendar: "clock", hours: "clock",
    science: "science", work: "work", award: "graduation_cap",
    video: "youtube", dataset: "zenodo", code: "github"
  };

  /* Where a drawing is looked up. The mask takes them as layers, so a
     file may sit in any of them; your own folder is asked for first. */
  var ICON_FOLDERS = [
    "assets/icons/custom_icons/",
    "assets/icons/social_icons/",
    "assets/icons/system_icons/"
  ];
  var ICON_DEFAULT = "arrow_outward";

  /* The file a name asks for: the kind's own drawing first ("email" →
     mail), then a word inside a label ("Google Scholar" →
     googlescholar_new), then the name itself as a file ("instagram",
     "phone_talk"), else the outward arrow. */
  function iconName(kind) {
    var word = String(kind == null ? "" : kind).trim().toLowerCase();
    if (!word) return ICON_DEFAULT;
    if (ICON_KINDS[word]) return ICON_KINDS[word];
    var words = word.replace(/[^a-z0-9]+/g, " ").trim();
    if (ICON_KINDS[words]) return ICON_KINDS[words];
    var parts = words.split(" ");
    for (var i = 0; i < parts.length; i += 1) {
      if (ICON_KINDS[parts[i]]) return ICON_KINDS[parts[i]];
    }
    /* one word and no punctuation: a file in the folder, exactly as
       written ("instagram", "googlescholar_new", "phone_talk") */
    if (/^[a-z0-9_]+$/.test(word)) return word;
    return ICON_DEFAULT;
  }

  /* The words a square says when the pointer rests on it (and for the
     screen reader): "googlescholar_new" reads as "Google Scholar". */
  var ICON_LABELS = {
    mail: "Email", cv: "CV", googlescholar_new: "Google Scholar",
    googlescholar_old: "Google Scholar", linkedin: "LinkedIn", github: "GitHub",
    github_new: "GitHub", github_pages: "GitHub Pages", gitlab: "GitLab",
    orcid: "ORCID", bluesky: "Bluesky", mastodon: "Mastodon", x: "X",
    researchgate: "ResearchGate", scopus: "Scopus", zenodo: "Zenodo",
    arxiv: "arXiv", ieee: "IEEE", acm: "ACM", pubmed: "PubMed", osf: "OSF",
    hal: "HAL", figshare: "Figshare", publons: "Publons", academia: "Academia",
    semanticscholar: "Semantic Scholar", web_of_science: "Web of Science",
    internetarchive: "Internet Archive", youtube: "YouTube",
    instagram: "Instagram", facebook: "Facebook", medium: "Medium",
    substack: "Substack", whatsapp: "WhatsApp", reddit: "Reddit",
    pinterest: "Pinterest", behance: "Behance", dribbble: "Dribbble",
    artstation: "ArtStation", university: "University", graduation_cap: "Graduation",
    globe: "Website", home: "Home", phone_talk: "Phone", phone_left: "Phone",
    phone_right: "Phone", fax: "Fax", location: "Location", map_search: "Map",
    clock: "Hours", arrow_outward: "Open", arrow_forward: "Open",
    post_box: "Post", person_pin: "Contact", science: "Science", work: "Work",
    profile_female1: "Profile", profile_female2: "Profile", profile_male1: "Profile",
    profile_male2: "Profile", globe_clock: "Time zone", globe_location: "Place"
  };

  function iconLabel(name) {
    var key = String(name == null ? "" : name)
      .trim()
      .toLowerCase()
      .replace(/^.*\//, "")
      .replace(/\.svg$/i, "");
    if (ICON_LABELS[key]) return ICON_LABELS[key];
    var words = key.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!words) return "Link";
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  /* The drawings that live in assets/icons/social_icons/ — a name in this
     list reads that folder directly, so no missing-file probes are made. */
  var SOCIAL_ICON_FILES = {
    academia: true, acm: true, artstation: true, arxiv: true, behance: true,
    bluesky: true, cv: true, dribbble: true, facebook: true, figshare: true,
    github: true, github_new: true, github_pages: true, gitlab: true,
    globe: true, googlescholar_new: true, googlescholar_old: true,
    graduation_cap: true, hal: true, ieee: true, instagram: true,
    internetarchive: true, linkedin: true, mail: true, mastodon: true,
    medium: true, orcid: true, osf: true, pinterest: true,
    profile_female1: true, profile_female2: true, profile_male1: true,
    profile_male2: true, publons: true, pubmed: true, reddit: true,
    researchgate: true, scopus: true, semanticscholar: true, substack: true,
    university: true, web_of_science: true, whatsapp: true, x: true,
    youtube: true, zenodo: true
  };

  /* The span a square — or a quiet line — wears, carrying the drawing's
     own url (the stylesheet's .social-icon masks it in). */
  function socialIconHtml(kind) {
    var name = String(kind == null ? "" : kind).trim();
    if (!name) return '<span class="social-icon" aria-hidden="true"></span>';

    // Custom path icon: if it contains "/" or starts with http(s):// treat as custom path
    if (name.indexOf("/") !== -1 || /^https?:\/\//i.test(name)) {
      var href = name;
      if (!/^https?:\/\//i.test(href)) {
        href = new URL(rootPrefix() + name, window.location.href).href;
      }
      return '<span class="social-icon" style="--social-icon:url(\'' + esc(href) + '\')" aria-hidden="true"></span>';
    }

    var key = iconName(kind).replace(/\.svg$/i, "").toLowerCase();
    var file = key + ".svg";
    var folder = SOCIAL_ICON_FILES[key]
      ? "assets/icons/social_icons/"
      : (SYSTEM_ICON_FILES[key] ? "assets/icons/system_icons/" : "");
    var urls = folder
      ? ["url('" + new URL(rootPrefix() + folder + file, window.location.href).href + "')"]
      : ICON_FOLDERS.map(function (dir) {
        return "url('" + new URL(rootPrefix() + dir + file, window.location.href).href + "')";
      });
    return '<span class="social-icon" style="--social-icon:' + esc(urls.join(",")) + '" aria-hidden="true"></span>';
  }

  /* The fixed drawings the interface itself uses. Any other bare name is
     a custom drawing, read straight from assets/icons/custom_icons/ — so
     a new SVG works as soon as the file is dropped in, with no registry. */
  var SYSTEM_ICON_FILES = {
    arrow_back: true, arrow_forward: true, arrow_outward: true,
    clock: true, fax: true, globe_clock: true, globe_location: true,
    home: true, location: true, mail: true, map_search: true,
    person_pin: true, phone_left: true, phone_right: true, phone_talk: true,
    post_box: true, science: true, work: true,
    menu: true, close: true, expand_more: true, groups: true,
    download: true, database: true, chevron_left: true, chevron_right: true,
    lightbulb: true, info: true, check_circle: true, warning: true,
    error: true, priority_high: true, event: true, label: true
  };

  /* Icons come from two places:
       "materials:event"   a drawing in assets/icons/system_icons/ (event.svg)
       "omega_clan"        a drawing in assets/icons/custom_icons/
     The interface's own drawings (arrow_outward, clock, …) also work by
     bare name. Nothing is fetched from an icon font. */
  function iconHtml(name, cls) {
    var raw = String(name == null ? "" : name).trim();
    var extra = cls ? " " + cls : "";
    var m = /^materials?:(.+)$/i.exec(raw);
    var glyph = m
      ? String(m[1]).trim().toLowerCase().replace(/\s+/g, "_")
      : raw.replace(/\.svg$/i, "");
    if (!glyph) return "";
    var href;
    if (m) {
      href = new URL(rootPrefix() + "assets/icons/system_icons/" + glyph + ".svg",
        window.location.href).href;
    } else if (/^(https?:)?\/\//i.test(raw) || raw.charAt(0) === "/" || raw.indexOf("/") > -1) {
      /* A path (or URL) is used as written; add .svg when no extension. */
      var pathValue = /\.[a-z0-9]+$/i.test(glyph) ? glyph : glyph + ".svg";
      href = /^(https?:)?\/\//i.test(pathValue) || pathValue.charAt(0) === "/"
        ? pathValue
        : new URL(rootPrefix() + pathValue, window.location.href).href;
    } else {
      var folder = SYSTEM_ICON_FILES[glyph.toLowerCase()]
        ? "assets/icons/system_icons/"
        : "assets/icons/custom_icons/";
      href = new URL(rootPrefix() + folder + glyph + ".svg", window.location.href).href;
    }
    return '<span class="cw-icon' + extra + '" style="--cw-icon:url(\'' + esc(href) +
      "')\" aria-hidden=\"true\"></span>";
  }

  /* Does a value in a person's line look like somewhere to go? */
  function isLinkValue(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return false;
    if (/^(https?:|mailto:|tel:|#)/i.test(s)) return true;
    if (s.charAt(0) === "/" || s.indexOf("/") > -1) return true;
    return /\.(pdf|html?|aspx|php|png|jpe?g|svg|zip|doi)($|\?)/i.test(s);
  }

  /* The words in a person's line that are not links (they belong to the
     card, the head or the page, and must never become a button). */
  var PERSON_WORDS = [
    "name", "position", "role", "roletype", "photo", "bio", "text", "email",
    "honours", "honors", "fellowship", "honorary_title_or_titles", "icons", "profile", "slug", "featured",
    "homefeatured", "teamfeatured", "quote", "ribbon", "summary", "subtitle",
    "supervisor", "details", "more", "chips", "structure", "head", "eyebrow",
    /* newer names for the same fields */
    "add_name", "relevant_sub_category_name", "image_path",
    "add_email", "feature_this_profile_in_home_section",
    "show_in_team_page",
    "show_in_home_team", "_category"
  ];

  /* Every door a person's line in team.json opens, in the order written:
     any key that is not one of the words above and carries a link becomes
     one square — "cv", "googlescholar_new", "linkedin", "instagram",
     whatever is in assets/icons/. The address itself is not a square: it
     is the copy-line below (emailCopyHtml). Each answer:
     { name, label, url }. */
  function personLinks(person) {
    var p = person || {};
    var out = [];
    Object.keys(p).forEach(function (key) {
      var lower = key.toLowerCase();
      if (PERSON_WORDS.indexOf(lower) > -1) return;
      if (key.indexOf(".") > -1) return;
      var value = p[key];
      if (typeof value !== "string") return;
      /* The CV is always a file: a bare name is enough (cvSrc adds .pdf). */
      var isCv = lower === "cv_name_or_path_to_cv" || lower === "cv";
      if (isCv ? !value.trim() : !isLinkValue(value)) return;
      var iconKey = isCv ? "cv" : key;
      out.push({ name: iconKey, label: iconLabel(iconKey), url: value });
    });
    return out;
  }

  /* The address, printed so it can be taken away with one click: a button
     that copies it (the clipboard, with a quiet fallback) and says
     "Copied" for a moment. Not a mailto — nothing opens by surprise, and
     the address can still be pasted into a mail app. */
  function emailCopyHtml(email, opts) {
    var address = String(email == null ? "" : email).trim();
    if (!address) return "";
    var o = opts || {};
    var cls = o.className || "email-copy";
    return '<button type="button" class="' + esc(cls) + '" data-copy="' + esc(address) +
      '" title="' + esc("Copy " + address) + '" aria-label="' + esc("Copy the email address " + address) + '">' +
      '<span data-copy-text>' + esc(address) + "</span>" +
      "</button>";
  }

  /* Put the words on the clipboard: the modern way when the page has it,
     a hidden textarea when it doesn't. */
  function copyText(text) {
    function legacy() {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      document.body.removeChild(area);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return legacy(); });
    }
    return Promise.resolve(legacy());
  }

  /* One listener for every copy-line on the site (nothing to wire page by
     page): click it, get the words, say so for a moment. */
  function wireCopy() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      var button = target && target.closest ? target.closest("[data-copy]") : null;
      if (!button) return;
      event.preventDefault();
      var label = button.querySelector("[data-copy-text]");
      var was = label ? label.textContent : "";
      copyText(button.getAttribute("data-copy") || "").then(function () {
        /* "Copied" is shorter than a two-line address. Reserve the
           button's current box so the card does not jump while the
           feedback shows. */
        var height = button.offsetHeight;
        var width = button.offsetWidth;
        button.classList.add("is-copied");
        button.style.minHeight = height + "px";
        button.style.minWidth = width + "px";
        if (label) label.textContent = "Copied";
        setTimeout(function () {
          button.classList.remove("is-copied");
          if (label) label.textContent = was;
          button.style.minHeight = "";
          button.style.minWidth = "";
        }, 1400);
      });
    });
  }
  if (document.body) wireCopy();
  else document.addEventListener("DOMContentLoaded", wireCopy);

  /* ---- Output rows ------------------------------------------------
     Both lists that read the outputs archive — the home page's
     publications list and the Publications & Outputs page — draw their
     rows with the same rules, so those rules live here.

     Where a picture comes from — one rule for every picture on the site:

       "ph-01.jpg"                 a bare filename → assets/img/
       "assets/img/visits/x.jpg"   a path of your own → from the page root
       "../img/x.jpg"              already relative → as written
       "/assets/img/x.jpg"         from the site root → as written
       "https://…"                 a full address → as written

     so a folder structure of your own needs no code, only the path. */
  function imageSrc(value, base) {
    var s = String(value || "").trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/" || s.indexOf("data:") === 0) return s;
    if (s.indexOf("../") === 0) return s;
    if (s.indexOf("/") > -1) return rootPrefix() + s;
    return (base || rootPrefix() + "assets/img/") + s;
  }

  /* A team member's picture. A bare filename is looked up in the folder
     named after that member's category — current, alumni, visitors,
     collaborators — inside assets/images/team_and_alumni/. A path of your
     own is used exactly as written. */
  function teamImageSrc(value, category) {
    var s = String(value || "").trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/" || s.indexOf("data:") === 0) return s;
    if (s.indexOf("../") === 0) return s;
    if (s.indexOf("/") > -1) return rootPrefix() + s;
    var folder = String(category || "").trim();
    var base = "assets/images/team_and_alumni/" + (folder ? folder + "/" : "");
    return rootPrefix() + base + s;
  }

  /* An output's picture. A bare file name is looked up in
     assets/images/publications_and_outputs/<list file name>/, so a
     patent's "sensor.jpg" reads patents/sensor.jpg. A path or URL is
     used as written. */
  function outputImageSrc(value, list, base) {
    var s = String(value || "").trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/" || s.indexOf("data:") === 0) return s;
    if (s.indexOf("../") === 0) return s;
    if (s.indexOf("/") > -1) return (base || "") + s;
    var folder = String(list || "").trim() || "publications";
    return (base || "") + "assets/images/publications_and_outputs/" +
      folder + "/" + s;
  }

  /* A news item's pictures live in one folder per item:
       assets/images/news_and_updates/<folder>/
     <folder> is the story file's name (individual_news_item_file_name);
     an inline card uses its title turned into a slug. "image_folder_name"
     names the folder explicitly when the title slug is too long.
     A path (with a slash, or a full URL) is used as written. */
  function newsImageFolder(item) {
    var it = item || {};
    var own = it.image_folder_name != null
      ? it.image_folder_name
      : it.folder_name_for_images;
    if (own != null && String(own).trim()) {
      return String(own).trim().replace(/^\/+|\/+$/g, "");
    }
    var id = newsFileId(it);
    if (id) return id;
    return titleToSlug(newsTitle(it)) || "news";
  }

  /* Where a news item's pictures are read from, rooted at the page. */
  function newsImageBase(item, root) {
    return (root || "") + "assets/images/news_and_updates/" +
      newsImageFolder(item) + "/";
  }

  /* ---- CV source ---------------------------------------------------
     Where a CV comes from — one rule for every CV on the site:
     "cv-michael-carter.pdf"          bare filename → assets/documents/cv/
     "assets/pdfs/cv-x.pdf"           a path of your own → from the page root
     "../pdfs/cv-x.pdf"               already relative → as written
     "/assets/pdfs/cv-x.pdf"          from the site root → as written
     "https://example.com/cv.pdf"     a full address → as written
  */
  function cvSrc(value) {
    var s = String(value || "").trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/" || s.indexOf("data:") === 0) return s;
    if (s.indexOf("../") === 0) return s;
    if (s.indexOf("/") > -1) return rootPrefix() + s;
    /* A CV is always a PDF: a bare name typed without ".pdf" gets it added. */
    if (!/\.[a-z0-9]+$/i.test(s)) s += ".pdf";
    return rootPrefix() + "assets/documents/cv/" + s;
  }

  /* ---- Research cards ---------------------------------------------
     One list, `individual_research_area_cards`, with explicit field names:
     `individual_research_area_file_id`, `individual_research_area_card_title`,
     `individual_research_area_card_keyword`,
     `individual_research_area_card_introduction`. A record with no
     `individual_research_area_file_id` is a plain card — it stands on its own and
     carries no link, arrow or button. A stub record (only an id)
     borrows the deep file's hero words. Older names
     (`individual_research_card_*`, `research-file-id`, `file_id`,
     `title`, `keywords_for_the_page_and_card`,
     `intro`, and the pre-rename
     `title`, `research_area_keyword`, `research_area_introduction`)
     still read as fallbacks. */
  var RESEARCH_CARD_FIELDS = {
    title: ["individual_research_area_card_title", "individual_research_card_title", "title", "title"],
    keyword: ["individual_research_area_card_keyword", "individual_research_card_keyword", "keywords_for_the_page_and_card", "research_area_keyword"],
    introduction: ["individual_research_area_card_introduction", "individual_research_card_introduction", "intro", "research_area_introduction"]
  };

  function researchCardValue(card, kind) {
    var keys = RESEARCH_CARD_FIELDS[kind] || [];
    for (var i = 0; i < keys.length; i++) {
      if (card && card[keys[i]] != null) return card[keys[i]];
    }
    return "";
  }

  function researchCardId(card) {
    if (!card) return "";
    var id = card["individual_research_area_file_name"] != null
      ? card["individual_research_area_file_name"]
      : (card["individual_research_area_file_id"] != null
        ? card["individual_research_area_file_id"]
        : (card["research-file-id"] != null ? card["research-file-id"] : card.file_id));
    return String(id == null ? "" : id).trim();
  }

  var researchCard = {
    id: researchCardId,
    title: function (card) { return researchCardValue(card, "title"); },
    keyword: function (card) { return researchCardValue(card, "keyword"); },
    introduction: function (card) { return researchCardValue(card, "introduction"); }
  };

  /* A local PDF written as a bare file name looks in
     assets/documents/publications_and_outputs/<list file name>/ — a
     patent's "sensor.pdf" reads patents/sensor.pdf. A path or URL is used
     as written. */
  function itemPdf(item) {
    var it = item || {};
    var raw = it.pdf_file_name_or_path_to_pdf;
    if (raw == null) raw = it.pdf_file_name_or_path;
    if (raw == null) raw = it.pdf_name_or_path;
    if (raw == null) raw = it.pdf;
    var s = String(raw == null ? "" : raw).trim();
    if (!s) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.charAt(0) === "/") return s;
    s = s.replace(/\\/g, "/");
    if (s.indexOf("/") > -1) return s;
    if (!/\.pdf$/i.test(s)) s += ".pdf";
    var list = String(it._list || "").trim();
    return "assets/documents/publications_and_outputs/" +
      (list ? list + "/" : "") + s;
  }

  /* The people on an output, whichever name the file uses: `people`
     (strings or { name, role }) is the common shape; older `authors` /
     `author` strings still read. */
  function peopleNames(item) {
    var it = item || {};
    var raw = it.people;
    if (raw == null) raw = (it.authors != null ? it.authors : it.author);
    var list = Array.isArray(raw) ? raw : String(raw == null ? "" : raw).split(",");
    return list.map(function (person) {
      if (person == null) return "";
      return typeof person === "string"
        ? person.trim()
        : String(person.name == null ? "" : person.name).trim();
    }).filter(Boolean);
  }

  /* Whether a PDF item may be downloaded. Default: yes. */
  function showDownload(item) {
    var value = item && item.show_download;
    if (value == null && item) {
      /* Older files said the opposite: remove_download_option… */
      var legacy = item.remove_download_option_in_pdf_viewer;
      if (legacy == null) legacy = item.remove_download_option;
      if (legacy != null) {
        var off = legacy === true || legacy === 1 ||
          /^(true|yes|on|1)$/i.test(String(legacy).trim());
        return !off;
      }
    }
    if (value == null) return true;
    return value === true || value === 1 ||
      /^(true|yes|on|1)$/i.test(String(value).trim());
  }

  /* The word on a row's own button, read from the output itself: a .pdf
     opens, so it says "Open PDF"; otherwise it names the kind of output
     the row is. */
  function outputAction(item) {
    var it = item || {};
    var primary = it.item_primary_button_label != null
      ? it.item_primary_button_label
      : it._primary_button_label;
    if (primary != null) return { label: String(primary) };
    if (it.action) return { label: String(it.action) };
    if (itemPdf(it)) return { label: "Open PDF" };
    var link = String(it.link || "");
    var type = String(it.type || "").toLowerCase();
    if (/\.pdf($|\?)/i.test(link)) return { label: "Open PDF" };
    if (type === "dataset") return { label: "Dataset" };
    if (type === "software") return { label: "Code" };
    if (type === "patent") return { label: "Patent" };
    if (type === "prototype") return { label: "Prototype" };
    return { label: "Read Paper" };
  }

  /* Where a row's second button ("Publisher") points: an explicit
     "publisher" URL wins; otherwise a DOI written into the row's meta
     line points at doi.org — so "DOI: 10.1038/xyz" becomes
     https://doi.org/10.1038/xyz. When that is the same address as the
     row's own link (many items link straight at the publisher), there
     is nothing to add and the row keeps its single button. */
  function outputPublisher(item) {
    var it = item || {};
    var own = String(it.link || "").trim().replace(/\/+$/, "").toLowerCase();
    var found = String(it.publisher || "").trim();
    if (!found) {
      var m = /10\.\d{4,}\/[^\s,;)]+/i.exec(String(it.details || it.meta || ""));
      if (m) found = "https://doi.org/" + m[0].replace(/[.,;·]+$/, "");
    }
    if (!found) return "";
    if (found.replace(/\/+$/, "").toLowerCase() === own) return "";
    return found;
  }

  /* Turn an item's link into something a page can actually open.
     opts.base joins a relative address (the Outputs page sits one level
     down, so it passes "../"), and opts.viewer wraps a .pdf in the
     page's own PDF reader instead of sending the visitor off-site. */
  function outputHref(raw, opts) {
    var o = opts || {};
    var s = String(raw || "").trim();
    if (!s) return "#";
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.charAt(0) === "/" || s.charAt(0) === "#") return s;
    if (o.base && s.indexOf("../") !== 0) s = o.base + s;
    if (o.viewer && /\.pdf($|\?)/i.test(s)) {
      var href = o.viewer + encodeURIComponent(s);
      if (o.download === false) {
        href += (href.indexOf("?") > -1 ? "&" : "?") + "download=0";
      }
      return href;
    }
    return s;
  }

  /* The buttons at the right edge of an output row: the row's own link,
     and the publisher link when there is a different one to offer.
     theme "dark" = the sand fill on a dark ground (home page);
     theme "light" = the black fill on paper (Outputs page). */
  function outputButtonsHtml(item, theme, publisherLabel, opts) {
    var it = item || {};
    var pdf = itemPdf(it);
    /* No PDF and no link → nothing to open, so no button at all. */
    if (!pdf && !String(it.link || "").trim()) return "";
    var ownLink = pdf || it.link;
    var primaryOpts = {};
    Object.keys(opts || {}).forEach(function (key) { primaryOpts[key] = opts[key]; });
    if (!showDownload(it)) primaryOpts.download = false;
    var link = outputHref(ownLink, primaryOpts);
    var external = /^https?:\/\//i.test(String(ownLink || ""));
    var attrs = external ? ' target="_blank" rel="noopener"' : "";
    var secondary = it.item_secondary_button_label != null
      ? it.item_secondary_button_label
      : it._secondary_button_label;
    var word = String(secondary != null
      ? secondary
      : (it.external_link_label_for_outputs != null
        ? it.external_link_label_for_outputs
        : (publisherLabel || ""))).trim() || "Publisher";

    /* A row with both a local PDF and an external link keeps both: the
       PDF opens in the site's reader, the link becomes the second button.
       Otherwise the second button is the publisher/DOI, as before. */
    var second = "";
    var secondLabel = word;
    var secondExternal = false;
    if (pdf && it.link) {
      second = outputHref(it.link, opts);
      secondExternal = /^https?:\/\//i.test(String(it.link || ""));
      if (it.link_label != null) secondLabel = String(it.link_label);
    } else {
      second = outputPublisher(it);
      secondExternal = true;
    }
    var icon = '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span>';
    var base = "inline-flex items-center justify-center gap-2 border px-4 min-h-[34px] font-label-sm text-label-sm uppercase tracking-widest whitespace-nowrap transition-colors";
    var solid = theme === "light"
      ? "border-transparent bg-primary text-on-primary hover:bg-secondary"
      : "border-transparent bg-[#C7BAA0] text-[#191917] hover:bg-[#D8CCB5]";
    var outline = theme === "light"
      ? "border-outline-variant text-on-surface hover:border-outline hover:bg-surface-container-low"
      : "border-[#FAF9F5]/30 text-[#FAF9F5] hover:border-[#FAF9F5]/70 hover:bg-[#FAF9F5]/10";
    return [
      '<a class="' + base + " " + solid + '" href="' + esc(link) + '"' + attrs + ">" +
        "<span>" + esc(outputAction(it).label) + "</span>" + icon + "</a>",
      second
        ? '<a class="' + base + " " + outline + '" href="' + esc(second) + '"' +
          (secondExternal ? ' target="_blank" rel="noopener"' : "") + ">" +
          "<span>" + esc(secondLabel) + "</span>" + icon + "</a>"
        : ""
    ].filter(Boolean).join("\n");
  }

  /* One output row, in the light dress: the index, the picture plate,
     the chips (the source, the kind of output, the Pinned mark), the
     title with its byline and meta, and the row's own buttons stacked at
     the right edge. The Outputs page draws its ledger with this drawer,
     and so does a profile's own short publication list — so a paper
     looks the same wherever the site shows it.

     opts:
       base        the page's root ("../" one level down): pictures and
                   links are read through it, and a .pdf opens in the
                   page's own reader when opts.viewer names it;
       categories, tones, pinnedLabel, publisherLabel,
       featuredLabel, featuredBackground
                   the colours and words the outputs config carries.
                   Without them a chip keeps the paper beige;
       is_pinned: false, is_featured: false
                   leave the Pinned / Featured chip off — a short list
                   (a profile's papers, §25) has nothing to pin or feature.
     The home page's papers list wears the same row in dark dress; it is
     drawn by js/home-papers.js. */
  function outputRowHtml(item, index, opts) {
    var o = opts || {};
    var it = item || {};

    /* The chip naming where the thing came out. */
    var source = String(it.venue || it.source || it.journal || it.where || it.year || "").trim();
    var status = String(it.status || "").trim();
    var year = it.year == null ? "" : String(it.year).trim();

    /* The kind of output, wearing its category's colour when the file
       gives that category one. */
    var cat = null;
    (o.categories || []).forEach(function (c) {
      if (!cat && c && c.name === it.type) cat = c;
    });
    var tag = cat && cat.tag ? String(cat.tag) : (it.type ? String(it.type) : "");
    var tagBg = String((cat && cat.background) || "#e5dfd0");

    /* The source chip's colour: the row's own "tone" word, else the two
       the list alternates between when a tones block is written. Without
       one, it wears its category's colour — the same palette as the tag. */
    var toneName = it.tone || (index % 2 === 0 ? "green" : "yellow");
    var tone = o.tones && o.tones[toneName];
    if (!tone) {
      tone = { background: tagBg, text: badgeText(tagBg) };
    }

    var chips = [
      source
        ? '<span class="px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest" style="background:' +
          esc(String(tone.background || "#e5dfd0")) + ";color:" + esc(String(tone.text || "#1d1c12")) + '">' +
          esc(source) + "</span>"
        : "",
      year
        ? '<span class="px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest" style="background:#EFECE4;color:#1b1c19">' +
          esc(year) + "</span>"
        : "",
      tag
        ? '<span class="px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest" style="background:' +
          esc(tagBg) + ";color:" + esc(badgeText(tagBg)) + '">' + esc(tag) + "</span>"
        : "",
      status
        ? '<span class="px-space-sm py-0.5 font-label-sm text-label-sm uppercase tracking-widest" style="background:#EFECE4;color:#1b1c19">' +
          esc(status) + "</span>"
        : "",
      it.is_featured === true && o.is_featured !== false
        ? featuredChipHtml(it, o.featuredLabel, o.featuredBackground)
        : "",
      it.is_pinned === true && o.is_pinned !== false ? pinChipHtml(o.pinnedLabel) : ""
    ].filter(Boolean).join("\n            ");

    /* The pictures on the row: the first fills the plate, the rest wait
       in the lightbox, each with the words that belong to it. A row with
       none looks exactly as it did. */
    var pics = imageList(it, o.base || "", it._list || "publications");
    var number = o.number !== undefined ? o.number : index + 1;
    var numberText = (number === "" || number == null)
      ? ""
      : (number < 10 ? "0" + number : String(number));

    return [
      '<div class="output-item group grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-t border-outline-variant py-space-md md:py-space-lg hover:bg-surface-container-low transition-colors px-space-sm" data-type="' + esc(String(it.type || "")) + '" data-year="' + esc(String(it.year == null ? "" : it.year)) + '">',
      '  <div class="lg:col-span-1">',
      '    <span class="font-headline-sm text-headline-sm text-outline group-hover:text-secondary transition-colors" data-index>' + numberText + "</span>",
      "  </div>",
      '  <div class="lg:col-span-9 flex items-center gap-6">',
      pics.length
        ? '    <div class="relative hidden sm:block w-[160px] shrink-0">' +
          '      <div class="absolute -top-2 -right-2 w-full h-full border border-outline-variant pointer-events-none cw-wireframe"></div>' +
          '      <button type="button" class="relative block w-full p-2 bg-surface-lowest shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-zoom-in" aria-label="View the picture" data-lightbox="' + esc(pics.map(function (p) { return p.src; }).join("|")) + '" data-lightbox-caption="' + esc(pics.map(function (p) { return p.caption; }).join("|")) + '">' +
          '        <span class="block aspect-[4/3] bg-surface-container-low">' +
          '          <img class="w-full h-full object-cover" loading="lazy" alt="' + esc(pics[0].alt || window.CWL.altText) + '" src="' + esc(pics[0].src) + '" />' +
          "        </span>" +
          galleryBadgeHtml(pics.length) +
          "      </button>" +
          "    </div>"
        : "",
      '    <div class="min-w-0">',
      '      <div class="flex flex-wrap items-center gap-space-xs mb-2">',
      "            " + chips,
      "      </div>",
      '      <h3 class="font-headline-md text-headline-md text-on-surface leading-snug group-hover:text-secondary transition-colors">' + esc(String(it.title || it.name || "")) + "</h3>",
      peopleNames(it).length
        ? '      <p class="font-body-sm text-body-sm text-on-surface-variant mt-2">' + esc(peopleNames(it).join(", ")) + "</p>"
        : "",
      (it.details || it.meta)
        ? '      <p class="font-label-sm text-label-sm uppercase tracking-wider text-outline mt-2">' + esc(String(it.details || it.meta)) + "</p>"
        : "",
      "    </div>",
      "  </div>",
      '  <div class="lg:col-span-2 flex flex-col items-stretch gap-2">',
      outputButtonsHtml(it, "light", o.publisherLabel, o),
      "  </div>",
      "</div>"
    ].join("\n");
  }

  /* Every picture an item carries, in order. "images" holds several (or
     one string with | between the names) and a plain "image" still means
     the single picture it always did. An entry may be just a filename,
     or an object that also carries its own "caption" — when it has none
     the item's title is used, so the plate and the lightbox always have
     something to say. Returns [{ src, caption }], [] when there is none. */
  function imageList(item, base, listName) {
    var it = item || {};
    var raw = it.add_image != null ? it.add_image
      : (it.images != null ? it.images
        : (it.image_path != null ? it.image_path
          : (it.images != null ? it.images : it.image)));
    var list;
    if (Array.isArray(raw)) list = raw;
    else if (raw && typeof raw === "object") list = [raw];
    else list = String(raw == null ? "" : raw).split("|");
    return list
      .map(function (entry) {
        var obj = entry && typeof entry === "object";
        var value = obj
          ? (entry.image_path || entry.image_path ||
            entry.src || entry.image)
          : entry;
        var src = listName
          ? outputImageSrc(value, listName, base)
          : imageSrc(value, base);
        if (!src) return null;
        var caption;
        var alt;
        if (obj) {
          caption = entry.image_caption != null ? entry.image_caption
            : (entry.image_caption != null ? entry.image_caption
              : (entry.caption != null ? entry.caption : null));
          alt = entry.image_alt != null ? entry.image_alt
            : (entry.alt != null ? entry.alt
              : (entry.altText != null ? entry.altText : null));
        } else {
          caption = it.image_caption != null ? it.image_caption : it.caption;
          alt = it.image_alt != null ? it.image_alt
            : (it.imageAlt != null ? it.imageAlt : it.alt);
        }
        return {
          src: src,
          caption: String(caption == null ? (newsTitle(it) || "") : caption),
          alt: String(alt == null ? "" : alt)
        };
      })
      .filter(Boolean);
  }

  /* The little row of squares that marks a plate holding several
     pictures: one square per picture, the first filled — the plate is
     showing the first. Sharp, and printed on the same black tag the
     site puts on any photo, so it reads on light and dark grounds alike.
     Nothing at all for one picture. */
  function galleryBadgeHtml(count) {
    var total = parseInt(count, 10) || 0;
    if (total < 2) return "";
    var boxes = "";
    for (var i = 0; i < total; i += 1) {
      boxes += '<span class="w-1.5 h-1.5 ' + (i === 0 ? "bg-on-primary" : "bg-on-primary/40") + '"></span>';
    }
    return '<span class="absolute bottom-0 right-0 flex flex-wrap justify-end gap-1 bg-primary px-2 py-1.5">' + boxes + "</span>";
  }

  /* ----------------------------------------------------------------
     The lightbox: click a picture to see it whole.

     A picture that carries data-lightbox="<src>" opens it, and an
     optional data-lightbox-caption="<words>" becomes the line beneath
     (the row pictures pass their titles). Several names may travel in
     either attribute with | between them — the captions line up with
     the pictures, so each can say its own thing, and one caption alone
     is used under all of them. With more than one picture the overlay
     shows a row of small squares in the top corner (the filled one is
     the picture you are on, click one to jump) and ‹ › at the sides,
     with the arrow keys doing the same. This file listens for those
     clicks, so nothing has to be wired page by page; the overlay itself
     is built the first time somebody actually asks for a picture, then
     reused. Click the dark ground or the ×, or press Escape, to leave —
     clicking the picture itself keeps it up.
     ---------------------------------------------------------------- */
  var lightbox = null;
  var lightboxOpener = null;
  var lightboxPics = [];
  var lightboxCaptions = [];
  var lightboxAt = 0;

  function lightboxBox() {
    if (lightbox && document.body.contains(lightbox)) return lightbox;
    var box = document.createElement("div");
    lightbox = box;
    box.id = "cwl-lightbox";
    box.className = "hidden fixed inset-0 z-[9999] cursor-zoom-out bg-[#0B0B0A]/95 px-6 py-16 md:px-10 md:py-20 flex-col items-center justify-center";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    var arrow = "hidden absolute top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center text-[#FAF9F5]/70 hover:text-[#FAF9F5] hover:bg-[#FAF9F5]/10 transition-colors cursor-pointer";
    box.innerHTML = [
      '<span data-lb-boxes class="hidden absolute top-4 left-5 md:top-6 md:left-7 flex items-center gap-1.5"></span>',
      '<button type="button" data-lb-close class="absolute top-4 right-5 md:top-6 md:right-7 w-11 h-11 flex items-center justify-center text-[#FAF9F5] hover:text-[#C7BAA0] transition-colors cursor-pointer" aria-label="Close the picture">',
      '  ' + iconHtml("close", "text-[28px]"),
      "</button>",
      '<button type="button" data-lb-prev class="' + arrow + ' left-2 md:left-4" aria-label="Previous picture">',
      '  ' + iconHtml("chevron_left", "text-[32px]"),
      "</button>",
      '<button type="button" data-lb-next class="' + arrow + ' right-2 md:right-4" aria-label="Next picture">',
      '  ' + iconHtml("chevron_right", "text-[32px]"),
      "</button>",
      '<figure class="max-h-full flex flex-col items-center gap-4">',
      '  <img data-lb-img class="block max-w-[92vw] max-h-[78vh] object-contain" alt="' + esc(window.CWL.altText) + '" src="" />',
      '  <figcaption data-lb-caption class="font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E] text-center max-w-[92vw]"></figcaption>',
      "</figure>"
    ].join("\n");
    box.addEventListener("click", function (event) {
      var target = event.target;
      var near = function (sel) { return target && target.closest ? target.closest(sel) : null; };
      if (near("[data-lb-img]")) return;              /* keep looking */
      if (near("[data-lb-boxes]")) {                  /* the square row */
        var at = near("[data-lb-at]");
        if (at) jumpLightbox(parseInt(at.getAttribute("data-lb-at"), 10));
        return;
      }
      if (near("[data-lb-prev]")) { stepLightbox(-1); return; }
      if (near("[data-lb-next]")) { stepLightbox(1); return; }
      closeLightbox();
    });
    document.body.appendChild(box);
    return box;
  }

  /* Hold the page still while a picture is up. `overflow: hidden`
     stops the wheel and the trackpad; both elements carry it, so the
     lock holds whichever of them the browser treats as the scroller. */
  function lockPage(on) {
    var value = on ? "hidden" : "";
    document.documentElement.style.overflow = value;
    document.body.style.overflow = value;
  }

  /* Put the picture we are on into the overlay, with its own caption;
     the square row and the arrows only appear when there is somewhere
     to go. */
  function showLightboxPic() {
    var box = lightboxBox();
    box.querySelector("[data-lb-img]").src = lightboxPics[lightboxAt] || "";
    var caption = String(lightboxCaptions[lightboxAt] || "");
    var cap = box.querySelector("[data-lb-caption]");
    cap.textContent = caption;
    cap.hidden = !caption;
    var many = lightboxPics.length > 1;
    var boxes = box.querySelector("[data-lb-boxes]");
    boxes.innerHTML = many
      ? lightboxPics.map(function (_, i) {
          return '<button type="button" data-lb-at="' + i + '" aria-label="Picture ' + (i + 1) + " of " + lightboxPics.length +
            '" class="w-2.5 h-2.5 transition-colors cursor-pointer ' +
            (i === lightboxAt ? "bg-[#FAF9F5]" : "bg-[#FAF9F5]/30 hover:bg-[#FAF9F5]/60") + '"></button>';
        }).join("")
      : "";
    boxes.classList.toggle("hidden", !many);
    ["[data-lb-prev]", "[data-lb-next]"].forEach(function (sel) {
      var arrow = box.querySelector(sel);
      arrow.classList.toggle("hidden", !many);
      arrow.classList.toggle("flex", many);
    });
  }

  function stepLightbox(delta) {
    if (lightboxPics.length < 2) return;
    lightboxAt = (lightboxAt + delta + lightboxPics.length) % lightboxPics.length;
    showLightboxPic();
  }

  function jumpLightbox(index) {
    var at = parseInt(index, 10);
    if (isNaN(at) || at < 0 || at >= lightboxPics.length) return;
    lightboxAt = at;
    showLightboxPic();
  }

  /* src / caption may each be a list or one string with | between the
     names; `startAt` picks which picture to open on (a gallery passes
     its data-lightbox-start, so you land on the one you clicked). */
  function openLightbox(src, caption, startAt) {
    var list = Array.isArray(src) ? src : String(src || "").split("|");
    var words = Array.isArray(caption) ? caption : String(caption == null ? "" : caption).split("|");
    lightboxPics = list
      .map(function (value) { return String(value == null ? "" : value).trim(); })
      .filter(function (value) { return !!value; });
    if (!lightboxPics.length) return;
    lightboxCaptions = lightboxPics.map(function (_, i) {
      /* one caption alone belongs under every picture; a shorter list
         simply leaves the later ones bare */
      var text = words.length === 1 ? words[0] : words[i];
      return String(text == null ? "" : text).trim();
    });
    var first = parseInt(startAt, 10);
    lightboxAt = (isNaN(first) || first < 0 || first >= lightboxPics.length) ? 0 : first;
    var box = lightboxBox();
    showLightboxPic();
    box.classList.remove("hidden");
    box.classList.add("flex");
    lockPage(true);
    var close = box.querySelector("[data-lb-close]");
    if (close) close.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.add("hidden");
    lightbox.classList.remove("flex");
    lockPage(false);
    if (lightboxOpener && document.body.contains(lightboxOpener)) {
      lightboxOpener.focus({ preventScroll: true });
    }
    lightboxOpener = null;
  }

  function wireLightbox() {
    function from(trigger) {
      lightboxOpener = trigger;
      openLightbox(
        trigger.getAttribute("data-lightbox"),
        trigger.getAttribute("data-lightbox-caption"),
        trigger.getAttribute("data-lightbox-start")
      );
    }
    document.addEventListener("click", function (event) {
      var target = event.target;
      var trigger = target && target.closest ? target.closest("[data-lightbox]") : null;
      if (!trigger) return;
      event.preventDefault();
      from(trigger);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" || event.key === "Esc") { closeLightbox(); return; }
      if (event.key === "ArrowLeft") { stepLightbox(-1); return; }
      if (event.key === "ArrowRight") { stepLightbox(1); return; }
      /* A picture that is only a picture (a content photo, not a button)
         still opens from the keyboard, the way a button would. */
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        var active = document.activeElement;
        var trigger = active && active.closest ? active.closest("[data-lightbox]") : null;
        if (!trigger) return;
        event.preventDefault();
        from(trigger);
      }
    });
  }
  if (document.body) wireLightbox();
  else document.addEventListener("DOMContentLoaded", wireLightbox);

  /* Expose under one name so pages share the same drawing rules. */
  window.CWL = {
    altText: "",
    esc: esc,
    peopleNames: peopleNames,
    parseDate: parseDate,
    byNewest: byNewest,
    latestMonth: latestMonth,
    pinnedFirst: pinnedFirst,
    pinChipHtml: pinChipHtml,
    featuredFirst: featuredFirst,
    featuredChipHtml: featuredChipHtml,
    cardHtml: cardHtml,
    categoryChip: categoryChip,
    articleSlug: articleSlug,
    newsFileId: newsFileId,
    newsDate: newsDate,
    newsCategory: newsCategory,
    newsTitle: newsTitle,
    newsIntro: newsIntro,
    titleToSlug: titleToSlug,
    borrowNews: borrowNews,
    formatText: formatText,
    retargetNav: retargetNav,
    applyPendingRetargets: applyPendingRetargets,
    wireArticleLinks: wireArticleLinks,
    categoryList: categoryList,
    categoryMap: categoryMap,
    statusList: statusList,
    joinCategoryList: joinCategoryList,
    loadJoinPositions: loadJoinPositions,
    statusColors: statusColors,
    badgeText: badgeText,
    messageHtml: messageHtml,
    loadJson: loadJson,
    setPageTitle: setPageTitle,
    loadOutputItems: loadOutputItems,
    parseJson: parseJson,
    link: link,
    setLinks: setLinks,
    loadLinks: loadLinks,
    pageHero: pageHero,
    ctaHtml: ctaHtml,
    buttonList: buttonList,
    namedButton: namedButton,
    sectionConfig: sectionConfig,
    chipHtml: chipHtml,
    chipRowHtml: chipRowHtml,
    personSlug: personSlug,
    profileSlug: profileSlug,
    teamIndexOf: teamIndexOf,
    fillPeople: fillPeople,
    fillDeepPeople: fillDeepPeople,
    fillPublicationFiles: fillPublicationFiles,
    preparePublications: preparePublications,
    fillPublicationRecords: fillPublicationRecords,
    imageSrc: imageSrc,
    teamImageSrc: teamImageSrc,
    cvSrc: cvSrc,
    imageList: imageList,
    newsImageFolder: newsImageFolder,
    newsImageBase: newsImageBase,
    researchCard: researchCard,
    galleryBadgeHtml: galleryBadgeHtml,
    iconName: iconName,
    iconLabel: iconLabel,
    iconHtml: iconHtml,
    socialIconHtml: socialIconHtml,
    personLinks: personLinks,
    emailCopyHtml: emailCopyHtml,
    copyText: copyText,
    outputAction: outputAction,
    outputPublisher: outputPublisher,
    outputHref: outputHref,
    outputButtonsHtml: outputButtonsHtml,
    outputRowHtml: outputRowHtml,
    openLightbox: openLightbox,
    closeLightbox: closeLightbox
  };

  /* Favicons are set by js/site.js on every page (it reads
     favicon_path and the main_website folder). */
})();
