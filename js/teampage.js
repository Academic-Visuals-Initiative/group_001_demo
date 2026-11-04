/* ------------------------------------------------------------------
   teampage.js — renders the full "Our Team & Alumni" page.

   New modular structure:
   - data/team/edit_team_page.json: page meta, CTA, list of group files
   - data/team/current.json, alumni.json, visitors.json, collaborators.json:
     each defines its own key, label, filter, roles[], people[]
   - data/team/profiles/<slug>.json: individual profile pages

   How it works:
   1. Loads edit_team_page.json (page meta, CTA)
   2. Loads each group file listed in config.main_category_file_names[]
   3. Each group file provides its own label, filter, roles[] and people[]
   4. The top filter bar and the role pills are built from those group files
   5. Profile slugs resolved from data/team/profiles/
------------------------------------------------------------------ */
(function () {
  "use strict";

  var CONFIG_URL = "../data/team/edit_team_page.json";
  var IMG = "../assets/img/";

  var esc = window.CWL.esc;
  var messageHtml = window.CWL.messageHtml;
  var loadJson = window.CWL.loadJson;
  var socialIconHtml = window.CWL.socialIconHtml;

  var state = {
    config: null,
    groups: [],        // each: {key, label, filter, one, many, roles[], people[]}
    filter: "all",
    roles: { current: "all", alumni: "all" }  // role filter per group key
  };

  /* --- small pieces ------------------------------------------- */

  function linksHtml(person) {
    var name = person && person.add_name == null ? "" : String((person && person.add_name) || "");
    var items = window.CWL.personLinks ? window.CWL.personLinks(person) : [];
    return items.map(function (it) {
      // Apply cvSrc to CV links to ensure correct path prefix for current page depth
      var url = it.url;
      if (it.name === "cv" && window.CWL.cvSrc) {
        url = window.CWL.cvSrc(url);
      }
      var isPdf = /\.pdf($|\?)/i.test(url);
      var target = isPdf ? "article.html?url=" + encodeURIComponent(url) : url;
      var label = it.label === "Email" ? "Email " + name : it.label + " of " + name;
      return '<a class="member-link" href="' + esc(target) + '" aria-label="' + esc(label) +
        '" title="' + esc(it.label) + '">' + socialIconHtml(it.name) + "</a>";
    }).join("\n        ");
  }

  function linksRowHtml(person) {
    var links = linksHtml(person);
    return links ? '<div class="member-links">' + links + "</div>" : "";
  }

  function roleTypeAttr(person) {
    var sub = person && (person.relevant_sub_category_name != null ? person.relevant_sub_category_name : person.roleType);
    return sub != null && String(sub)
      ? ' data-role-type="' + esc(String(sub)) + '"'
      : "";
  }

  /* Profile slugs now live in data/team/profiles/ */
  function profileSlug(person) {
    return window.CWL.profileSlug(person);
  }

  function cardLinkHtml(person, verb) {
    var slug = profileSlug(person);
    if (!slug) return "";
    var name = person.add_name == null ? "" : String(person.add_name);
    return (
      '<a class="member-card__link" data-profile-slug="' + esc(slug) +
      '" aria-label="' + esc(verb + " " + name) + '"></a>'
    );
  }

  /* --- the featured lab-lead card ------------------------------ */

  function featuredHtml(person) {
    var name = person.add_name == null ? "" : String(person.add_name);
    var teamPhoto = person.image_path || person.photo;
    var photo = teamPhoto
      ? '<div class="member-photo member-photo--ring" style="background-image: url(\'' + esc(window.CWL.teamImageSrc(teamPhoto, person._category)) + "')\"></div>"
      : "";

    var bioSource = person.text != null
      ? person.text
      : (person.summary || person.bio);
    var bioParas = Array.isArray(bioSource) ? bioSource : (bioSource ? [bioSource] : []);
    var bio = bioParas.map(function (para) {
      return "<p>" + esc(para) + "</p>";
    }).join("");

    var honour = person.honorary_title_or_titles || person.honours || person.honors || person.fellowship;
    var honourLine = honour
      ? '<p class="member-featured__honour">' + esc(honour) + "</p>"
      : "";

    var email = person.add_email || person.email;
    var emailLine = email
      ? window.CWL.emailCopyHtml(email, { className: "email-copy member-featured__email" })
      : "";

    var links = linksHtml(person);
    var buttons = links ? '<div class="member-actions">' + links + "</div>" : "";

    return (
      '<div class="member-card member-card--featured" data-group="current"' + roleTypeAttr(person) + ">" +
      cardLinkHtml(person, "Open the profile of") +
      '<div class="member-featured">' +
      '<div class="member-featured__grid">' +
      photo +
      '<div class="member-featured__body">' +
      (person.position || person.role ? '<span class="member-featured__eyebrow">' + esc(person.position || person.role) + "</span>" : "") +
      '<h2 class="member-featured__name">' + esc(name) + "</h2>" +
      (person.subtitle ? '<p class="member-featured__subtitle">' + esc(person.subtitle) + "</p>" : "") +
      honourLine +
      (bio ? '<div class="member-bio">' + bio + "</div>" : "") +
      emailLine +
      (buttons ? '<div class="member-actions">' + buttons + "</div>" : "") +
      "</div></div></div></div>"
    );
  }

  /* --- one current member (grid card) -------------------------- */

  function personText(person) {
    var t = person && (person.text != null
      ? person.text
      : (person.summary != null ? person.summary : person.bio));
    if (Array.isArray(t)) return t.join(" ");
    return t == null ? "" : String(t);
  }

  function currentHtml(person, group) {
    var name = person.add_name == null ? "" : String(person.add_name);
    var teamPhoto = person.image_path || person.photo;
    var photo = teamPhoto
      ? '<div class="member-photo" style="background-image: url(\'' + esc(window.CWL.teamImageSrc(teamPhoto, person._category)) + "')\"></div>"
      : "";

    var links = linksRowHtml(person);
    var text = personText(person);

    var email = person.add_email || person.email;
    return (
      '<div class="member-card" data-group="' + esc(group || "current") + '"' + roleTypeAttr(person) + ">" +
      cardLinkHtml(person, "Open the profile of") +
      photo +
      '<div class="member-head">' +
      '<div>' +
      '<h3 class="member-name">' + esc(name) + "</h3>" +
      (person.position || person.role ? '<p class="member-role">' + esc(person.position || person.role) + "</p>" : "") +
      (email ? window.CWL.emailCopyHtml(email, { className: "email-copy member-email" }) : "") +
      "</div>" + links +
      "</div>" +
      (text ? '<p class="member-text">' + esc(text) + "</p>" : "") +
      "</div>"
    );
  }

  /* --- one alumni (grayscale card) ------------------------------ */

  function alumniHtml(person) {
    var name = person.add_name == null ? "" : String(person.add_name);
    var teamPhoto = person.image_path || person.photo;
    var photo = teamPhoto
      ? '<div class="member-photo member-photo--muted" style="background-image: url(\'' + esc(window.CWL.teamImageSrc(teamPhoto, person._category)) + "')\"></div>"
      : "";
    var text = personText(person);

    return (
      '<div class="member-card member-card--alumni" data-group="alumni"' + roleTypeAttr(person) + ">" +
      cardLinkHtml(person, "Open the profile of") +
      photo +
      '<div class="member-head">' +
      "<div>" +
      '<h3 class="member-name">' + esc(name) + "</h3>" +
      (person.position || person.role ? '<p class="member-role">' + esc(person.position || person.role) + "</p>" : "") +
      "</div>" + linksRowHtml(person) +
      "</div>" +
      (text ? '<p class="member-text">' + esc(text) + "</p>" : "") +
      "</div>"
    );
  }

  /* --- the filter buttons (top bar) ------------------------------- */

  /* Built from the group files themselves: "All members" first, then each
     group's own `filter` (falling back to its label/key) in file order. */
  function renderFilters(groups) {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;
    var keys = ["all"];
    var words = ["All members"];
    (groups || []).forEach(function (g) {
      var key = g && g.main_category_name;
      if (!key || keys.indexOf(key) > -1) return;
      keys.push(key);
      words.push(g.main_category_tag_label || g.left_side_divider_label || key);
    });
    bar.innerHTML = keys.map(function (key, i) {
      return (
        '<button type="button" class="filter-btn' + (i === 0 ? " active" : "") +
        '" data-filter="' + esc(key) + '">' + esc(words[i]) + "</button>"
      );
    }).join("");
  }

  /* --- combine all roles from all groups for roleLabel ----------- */
  function collectAllRoles(groups) {
    var map = {};
    groups.forEach(function (g) {
      (g.sub_categories || []).forEach(function (r) {
        if (r && r.sub_category_name) map[r.sub_category_name] = r.sub_category_tag_label;
      });
    });
    return map;
  }

  /* A role's display words: from collected roles map */
  function roleLabel(allRolesMap, name) {
    return allRolesMap[name] != null ? String(allRolesMap[name]) : name;
  }

  /* Pills for one list of people: "All" first, then every roleType
     found, in the order people carry them. The bar hides itself when
     nobody in that list has a roleType at all. */
  function renderRoleBar(people, barId, key, allRolesMap) {
    var bar = document.getElementById(barId);
    if (!bar) return;
    var seen = {};
    var order = [];
    (people || []).forEach(function (p) {
      var sub = p && (p.relevant_sub_category_name != null ? p.relevant_sub_category_name : p.roleType);
      var r = sub != null ? String(sub) : "";
      if (r && !seen[r]) {
        seen[r] = true;
        order.push(r);
      }
    });
    if (!order.length) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    var html = [
      '<button type="button" class="filter-btn active" data-role="' + key + '" data-value="all">All</button>'
    ];
    order.forEach(function (r) {
      html.push(
        '<button type="button" class="filter-btn" data-role="' + key +
          '" data-value="' + esc(r) + '">' + esc(roleLabel(allRolesMap, r)) + "</button>"
      );
    });
    bar.innerHTML = html.join("");
  }

  function wireRoleBars() {
    Array.prototype.forEach.call(document.querySelectorAll(".team-role-bar"), function (bar) {
      bar.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter-btn");
        if (!btn) return;
        Array.prototype.forEach.call(bar.querySelectorAll(".filter-btn"), function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        state.roles[btn.getAttribute("data-role")] = btn.getAttribute("data-value");
        applyFilter(state.filter);
      });
    });
  }

  /* One band per extra group, built from the same pieces as the alumni's,
     and slipped in under it. */
  function renderGroupSections(groups) {
    var alumniSection = document.getElementById("alumni-section");
    if (!alumniSection || !groups.length) return;
    alumniSection.insertAdjacentHTML("afterend", groups.map(function (g) {
      var id = "group-" + g.main_category_name;
      return [
        '<section class="w-full px-margin md:px-margin-tablet lg:px-margin-desktop pb-space-xl" id="' + id + '-section">',
        '  <div class="max-w-[1260px] mx-auto pb-space-lg md:pb-space-xl">',
        '    <div class="team-label-row">',
        '      <span class="team-label-row__label" id="' + id + '-label"></span>',
        '      <span class="team-label-row__rule"></span>',
        '      <span class="team-label-row__count" id="' + id + '-count"></span>',
        "    </div>",
        '    <div class="team-role-bar" id="' + id + '-role-bar" hidden></div>',
        '    <div class="team-grid" id="' + id + '-list"></div>',
        "  </div>",
        "</section>"
      ].join("\n");
    }).join("\n"));
  }

  /* --- counts, sections, empty message ------------------------ */

  function wordCount(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  }

  function applyFilter(filter) {
    state.filter = filter;
    var cards = document.querySelectorAll(".member-card");
    var visible = {};

    Array.prototype.forEach.call(cards, function (card) {
      var group = card.getAttribute("data-group") || "current";
      var rolePick = state.roles[group] || "all";
      var role = card.getAttribute("data-role-type") || "";
      var show =
        (filter === "all" || group === filter) &&
        (rolePick === "all" || role === rolePick);
      card.style.display = show ? "" : "none";
      if (show) visible[group] = (visible[group] || 0) + 1;
    });

    var sections = {
      current: { section: "current-section", count: "current-count", one: "member", many: "members" },
      alumni: { section: "alumni-section", count: "alumni-count", one: "alumnus", many: "alumni" }
    };
    state.groups.forEach(function (g) {
      // Skip built-in sections; they already have correct IDs above
      var key = g.main_category_name;
      if (key === "current" || key === "alumni") return;
      sections[key] = {
        section: "group-" + key + "-section",
        count: "group-" + key + "-count",
        one: g.right_side_divider_label_if_there_is_one_person || "member",
        many: g.right_side_divider_label_if_there_is_more_than_one_person || "members"
      };
    });

    var total = 0;
    Object.keys(sections).forEach(function (key) {
      var info = sections[key];
      var n = visible[key] || 0;
      total += n;
      var section = document.getElementById(info.section);
      var count = document.getElementById(info.count);
      if (section) section.classList.toggle("hidden", n === 0);
      if (count) count.textContent = wordCount(n, info.one, info.many);
    });

    var empty = document.getElementById("empty-state");
    if (empty) empty.classList.toggle("hidden", total > 0);
  }

  function wireFilters() {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;
      Array.prototype.forEach.call(bar.querySelectorAll(".filter-btn"), function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      applyFilter(btn.getAttribute("data-filter"));
    });
  }

  /* --- the page as a whole ------------------------------------- */

  function renderPage(config, groups) {
    state.config = config;
    state.groups = groups;

    var heading = document.getElementById("team-heading");
    var text = document.getElementById("team-text");
    var eyebrow = document.getElementById("team-eyebrow");
    if (eyebrow) eyebrow.textContent = config.team_page_subheading == null ? "Team" : String(config.team_page_subheading);
    if (heading) heading.textContent = config.team_page_heading == null ? "Our Team & Alumni" : String(config.team_page_heading);
    if (text) text.textContent = config.team_page_introduction == null ? "" : String(config.team_page_introduction);

    var currentGroup = groups.find(function (g) { return g.main_category_name === "current"; });
    var alumniGroup = groups.find(function (g) { return g.main_category_name === "alumni"; });
    var currentLabel = document.getElementById("current-label");
    var alumniLabel = document.getElementById("alumni-label");
    if (currentLabel) currentLabel.textContent = (currentGroup && currentGroup.left_side_divider_label) ? currentGroup.left_side_divider_label : "The People";
    if (alumniLabel) alumniLabel.textContent = (alumniGroup && alumniGroup.left_side_divider_label) ? alumniGroup.left_side_divider_label : "Alumni";

    renderFilters(groups);

    /* Collect all roles from all groups for roleLabel lookup */
    var allRolesMap = collectAllRoles(groups);

    /* Current members: first person with show_in_team_page=true
       is the featured card */
    var currentGroup = groups.find(function (g) { return g.main_category_name === "current"; });
    var currentPeople = currentGroup ? currentGroup.add_people_to_category_defined_above : [];

    function isTeamFeatured(p) {
      return p && (p.show_in_team_page === true || p.teamFeatured === true);
    }

    var featuredWrap = document.getElementById("featured-member");
    var featured = currentPeople.filter(isTeamFeatured);
    if (featuredWrap) featuredWrap.innerHTML = featured.length ? featuredHtml(featured[0]) : "";

    var currentList = document.getElementById("current-list");
    if (currentList) {
      var grid = currentPeople.filter(function (p) { return !isTeamFeatured(p); })
        .map(function (p) { return currentHtml(p); })
        .join("\n");
      currentList.innerHTML = grid || "";
    }

    /* Alumni group */
    var alumniGroup = groups.find(function (g) { return g.main_category_name === "alumni"; });
    var alumniPeople = alumniGroup ? alumniGroup.add_people_to_category_defined_above : [];
    var alumniList = document.getElementById("alumni-list");
    if (alumniList) alumniList.innerHTML = alumniPeople.map(alumniHtml).join("\n");

    /* Role pills under each built-in section label row */
    renderRoleBar(currentPeople, "current-role-bar", "current", allRolesMap);
    renderRoleBar(alumniPeople, "alumni-role-bar", "alumni", allRolesMap);

    /* Extra groups from config: a band each, with their own cards, count,
       role pills and filter button. */
    var extraGroups = groups.filter(function (g) { return g.main_category_name !== "current" && g.main_category_name !== "alumni"; });
    renderGroupSections(extraGroups);
    extraGroups.forEach(function (g) {
      var key = g.main_category_name;
      state.roles[key] = "all";
      var label = document.getElementById("group-" + key + "-label");
      if (label) label.textContent = g.left_side_divider_label;
      var list = document.getElementById("group-" + key + "-list");
      if (list) {
        list.innerHTML = g.add_people_to_category_defined_above.map(function (p) { return currentHtml(p, key); }).join("\n");
      }
      renderRoleBar(g.add_people_to_category_defined_above, "group-" + key + "-role-bar", key, allRolesMap);
    });

    /* Closing CTA. */
    var closing = config.team_page_closing_section || {};
    var ctaSection = document.getElementById("team-cta");
    if (ctaSection) {
      var closingBtn = closing.team_page_closing_section_button || null;
      var closingLink = closingBtn ? closingBtn.team_page_closing_section_button_link : "";
      /* "@positions", "@contact", … resolve through the same registry the
         About page uses; ordinary links pass through unchanged. */
      if (closingLink && window.CWL.link) closingLink = window.CWL.link(closingLink);
      /* The button's icon comes from JSON ("arrow_outward", "materials:…",
         or any icon file in assets/icons/). No key keeps the default arrow. */
      var closingIconName = closingBtn ? closingBtn.team_page_closing_section_button_icon : "";
      var closingIcon = closingIconName && window.CWL.iconHtml
        ? window.CWL.iconHtml(closingIconName, "text-sm")
        : '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span>';
      var hasWords = closing.team_page_closing_section_heading || closing.team_page_closing_section_text || closingLink;
      if (!hasWords) {
        ctaSection.hidden = true;
      } else {
        ctaSection.hidden = false;
        ctaSection.innerHTML =
          '<div class="max-w-[1260px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-end">' +
          '  <div class="lg:col-span-7 text-center lg:text-left">' +
          (closing.team_page_closing_section_heading ? '<h2 class="font-headline-lg text-[1.875rem] md:text-[2.625rem] leading-[1.15] text-[#F5F2EB]">' + esc(closing.team_page_closing_section_heading) + "</h2>" : "") +
          (closing.team_page_closing_section_text ? '<p class="mt-space-sm font-body-lg text-body-lg text-[#CDC8BC]">' + esc(closing.team_page_closing_section_text) + "</p>" : "") +
          "  </div>" +
          (closingLink
            ? '  <div class="lg:col-span-5 flex justify-center lg:justify-end">' +
              '<a class="inline-flex items-center justify-center gap-2 w-[280px] max-w-full bg-[#F5F2EB] text-[#1B1C19] px-8 py-3.5 font-label-md text-label-md uppercase tracking-[0.18em] font-medium hover:bg-white transition-all" href="' + esc(closingLink) + '">' +
              "<span>" + esc(closingBtn.team_page_closing_section_button_label || "Learn more") + "</span>" +
              closingIcon + "</a></div>"
            : "") +
          "</div>";
      }
    }

    /* Header "Back to Home" label. The href stays in the page markup
       (../index.html); JSON only carries the words. */
    var navBtn = (config.team_page_navbar_button || [])[0] || {};
    var backLink = document.getElementById("team-back");
    var backText = document.getElementById("team-back-text");
    if (backLink && navBtn.link) {
      var backHref = window.CWL.link ? window.CWL.link(navBtn.link) : navBtn.link;
      backLink.setAttribute("href", backHref);
    }
    if (backText) {
      backText.textContent = navBtn.page_nav_bar_button_label == null
        ? "Back to Home"
        : String(navBtn.page_nav_bar_button_label);
    }

    wireFilters();
    wireRoleBars();
    applyFilter("all");
    wireProfiles();
  }

  function wireProfiles() {
    var wire = window.CWL.wireArticleLinks;
    if (!wire) return;
    wire(document, {
      attr: "data-profile-slug",
      dataDir: "../data/team/profiles/",
      hrefPrefix: "profile.html?profile="
    });
  }

  /* --- boot: load config, then each group file ----------------- */

  /* Transitional: the page's short keys fill their older prefixed names. */
  function liftPage(config) {
    var page = config && config.team_page;
    if (!page || typeof page !== "object") return config;
    if (page.subheading != null) config.team_page_subheading = page.subheading;
    if (page.heading != null) config.team_page_heading = page.heading;
    if (page.intro != null) config.team_page_introduction = page.intro;
    if (page.back_button_label != null && !config.team_page_navbar_button) {
      config.team_page_navbar_button = [{ page_nav_bar_button_label: page.back_button_label }];
    }
    var closing = page.closing;
    if (closing && typeof closing === "object") {
      if (config.team_page_closing_section == null) config.team_page_closing_section = {};
      var target = config.team_page_closing_section;
      if (closing.heading != null) target.team_page_closing_section_heading = closing.heading;
      if (closing.text != null) target.team_page_closing_section_text = closing.text;
      var btn = closing.button;
      if (btn && typeof btn === "object" && !target.team_page_closing_section_button) {
        target.team_page_closing_section_button = {
          team_page_closing_section_button_label: btn.label,
          team_page_closing_section_button_link: btn.link,
          team_page_closing_section_button_icon: btn.icon
        };
      }
    }
    return config;
  }

  function boot() {
    var list = document.getElementById("current-list");
    if (!list) return;

    loadJson(CONFIG_URL).then(function (config) {
      if (!config) {
        list.innerHTML = messageHtml("The team page could not be loaded right now.");
        return;
      }
      config = liftPage(config);

      var groupFiles = (config.main_category_file_names || []).filter(function (f) { return typeof f === "string"; });
      window.CWL.setPageTitle(config.team_page_heading);
      var loadPromises = groupFiles.map(function (file) {
        var name = /\.json$/i.test(file) ? file : file + ".json";
        return loadJson("../data/team/" + name).catch(function () { return null; });
      });

      Promise.all(loadPromises).then(function (groupData) {
        var groups = groupData.filter(Boolean);
        /* Remember which category each person belongs to, so a bare image
           filename can be looked up in assets/images/team_and_alumni/<category>/. */
        groups.forEach(function (g) {
          var cat = g.main_category_name;
          (g.add_people_to_category_defined_above || []).forEach(function (p) {
            if (p) p._category = cat;
          });
        });
        renderPage(config, groups);
      });
    });
  }

  boot();
})();