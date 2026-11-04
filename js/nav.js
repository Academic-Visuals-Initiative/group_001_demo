/* ------------------------------------------------------------------
   nav.js — builds both nav menus from the
   hide_show_or_change_the_name_of_navigation_bar_items block of
   data/site.json (editorial design: uppercase label links, a
   divider before flagged items, sharp active pill).

   Each item has an "enabled" flag (default true). Items with
   enabled: false are skipped entirely. An item may carry
   "divider": true to draw a hairline before it.

   No gear, no localStorage, no visitor toggle — pure JSON control.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var SITE_URL = "data/site.json";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;

  /* Each nav item names its own label:
       "navigation_bar_about_label": "About"
     (older files may still use a plain "label"). */
  function navLabel(item) {
    if (!item) return "";
    var keys = Object.keys(item);
    for (var i = 0; i < keys.length; i += 1) {
      if (/^navigation_bar_.+_label$/i.test(keys[i])) return item[keys[i]];
    }
    return item.label;
  }

  function visibleItems(site) {
    var items = (site && Array.isArray(site.navigation_bar_items))
      ? site.navigation_bar_items
      : ((site && Array.isArray(site.hide_show_or_change_the_name_of_navigation_bar_items))
        ? site.hide_show_or_change_the_name_of_navigation_bar_items
        : ((site && Array.isArray(site.nav)) ? site.nav : []));
    return items.filter(function (item) {
      var label = navLabel(item);
      return item && label != null && String(label).trim() !== "" && item.is_enabled !== false;
    });
  }

  /* Where a menu item goes. The simplest form names a free-standing page
     by its JSON file — "page": "facilities" (the .json is optional) — and
     the template path is written for you. A page in a folder of your own is
     named the same way, with the folder in front: "page": "notes.diary",
     or as two keys, "folder": "notes", "page": "diary". "link" still takes
     anything: an anchor ("#team"), a path ("pages/labs.html") or a named
     link ("@page:facilities"). With none of them, the label becomes the
     anchor: "Publications" → "#publications". */
  function navHref(item) {
    var page = (item && item.page != null) ? String(item.page).trim() : "";
    if (page) {
      var folder = (item && item.folder != null) ? String(item.folder).trim() : "";
      page = page.replace(/^data\/pages\//i, "").replace(/\.json$/i, "");
      /* "notes.diary" (or "notes/diary") carries its own folder. */
      var split = page.indexOf("/") !== -1 ? "/" : (page.indexOf(".") !== -1 ? "." : "");
      if (split) {
        folder = page.slice(0, page.indexOf(split)) || folder;
        page = page.slice(page.indexOf(split) + 1);
      }
      folder = folder
        .replace(/^data\//i, "")
        .replace(/^pages$/i, "")
        .replace(/\/+$/, "");
      if (folder) {
        return "pages/page.html?folder=" + encodeURIComponent(folder) +
          "&page=" + encodeURIComponent(page);
      }
      return "pages/page.html?page=" + encodeURIComponent(page);
    }
    var link = String((item && item.link) || "");
    var label = String(navLabel(item) || "");
    if (link.charAt(0) === "@" && window.CWL && window.CWL.link) return window.CWL.link(link);
    if (link) return link;
    var anchor = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return anchor ? "#" + anchor : "";
  }

  /* One link, desktop size. */
  function itemHtml(item) {
    return (
      '<a class="nav-link font-label-md text-label-md uppercase px-space-sm py-space-xs text-on-surface-variant transition-colors" href="' +
      esc(navHref(item)) + '">' + esc(navLabel(item)) + "</a>"
    );
  }

  /* One link, mobile-menu size. */
  function mobileItemHtml(item) {
    return (
      '<a class="nav-link py-space-sm font-headline-md text-headline-md uppercase tracking-wide text-on-surface-variant transition-all duration-300" href="' +
      esc(navHref(item)) + '">' + esc(navLabel(item)) + "</a>"
    );
  }

  /* Hairline divider for items flagged "divider": true. */
  function dividerHtml() {
    return '<span class="h-3 w-px bg-outline-variant mx-space-xs" aria-hidden="true"></span>';
  }

  function build(items, one) {
    return items.map(function (item) {
      return (item.divider === true ? dividerHtml() : "") + one(item);
    }).join("\n");
  }

  function boot() {
    var nav = document.getElementById("nav");
    var mobileNav = document.getElementById("mobile-nav");
    if (!nav || !mobileNav) return;

    loadJson(SITE_URL).then(function (site) {
      var visible = visibleItems(site);
      nav.innerHTML = build(visible, itemHtml);
      mobileNav.innerHTML = build(visible, mobileItemHtml);
      /* Sections switched off earlier retarget their nav links to a
         page — apply those now that the links exist. */
      window.CWL.applyPendingRetargets();

      /* Scroll-spy: highlight the active nav link (desktop only). */
      var navLinks = nav.querySelectorAll(".nav-link");
      if (navLinks.length) {
        function setActive(activeLink) {
          navLinks.forEach(function (link) {
            if (link === activeLink) {
              link.classList.add("bg-[#1B1C19]", "text-[#FAF9F5]");
              link.classList.remove("text-on-surface-variant");
            } else {
              link.classList.remove("bg-[#1B1C19]", "text-[#FAF9F5]");
              link.classList.add("text-on-surface-variant");
            }
          });
        }
        /* Fire initial highlight once the observer is armed, then
           ignore the first batch of callbacks (they fire for all
           sections already in view on load). */
        var firstBatch = true;
        var observer = new IntersectionObserver(function (entries) {
          if (firstBatch) { firstBatch = false; return; }
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var id = entry.target.id;
              var matchingLink = nav.querySelector('.nav-link[href="#' + id + '"]');
              if (matchingLink) setActive(matchingLink);
            }
          });
        }, { rootMargin: "-120px 0px -50% 0px", threshold: 0 });

        navLinks.forEach(function (link) {
          var href = link.getAttribute("href") || "";
          /* only same-page anchors participate in scroll-spy */
          if (href.charAt(0) === "#") {
            var section = document.querySelector(href);
            if (section) observer.observe(section);
          }
          link.addEventListener("click", function () {
            setTimeout(function () { setActive(link); }, 50);
          });
        });
        /* After a tick, arm the observer and set the first link. */
        setTimeout(function () {
          firstBatch = false;
          setActive(navLinks[0]);
        }, 0);
      }
    });
  }

  boot();
})();
