/* ------------------------------------------------------------------
   site.js — applies the GLOBAL bits of data/site.json (the master
   config, shaped like the reference template's site.json):

   - title            → the browser tab title
   - favicon          → <link rel="icon">
   - description      → <meta name="description">
   - metadata         → keywords, author, og:type meta tags
   - header.name / header.subtitle → the brand words in the header
   - header.image / header.image_alt → the brand logo

   The cv block is no longer part of site.json.

   index.html and the subpages carry the markup; site.js fills every word
   and logo from data/site.json. An empty value hides that piece — there
   are no hard-coded brand fallbacks.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var IN_PAGES = window.location.pathname.indexOf("/pages/") !== -1;
  var BASE = IN_PAGES ? "../" : "";
  var SITE_URL = BASE + "data/site.json";
  var LOGO_DIR = "assets/logos/main_website/";

  /* The site's own marks (favicon, header logo, footer logo): a bare name is
     read from assets/logos/main_website/; a path or URL is used as written. */
  function logoSrc(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/" || s.indexOf("data:") === 0) return s;
    if (s.indexOf("../") === 0) return s;
    if (!/\.[a-z0-9]+$/i.test(s)) s += ".svg";
    if (s.indexOf("/") > -1) return BASE + s;
    return BASE + LOGO_DIR + s;
  }

  var loadJson = window.CWL.loadJson;

  /* Create or update a <meta> tag by name. */
  function metaByName(name, content) {
    if (content == null || !String(content).trim()) return;
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", String(content));
  }

  /* Create or update a <meta> tag by property (og: tags). */
  function metaByProperty(prop, content) {
    if (content == null || !String(content).trim()) return;
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", prop);
      document.head.appendChild(el);
    }
    el.setAttribute("content", String(content));
  }

  /* Create or update the favicon <link>. A relative path in site.json is
     read from the site root, so it still finds the file on a subpage. */
  function favicon(href) {
    var url = logoSrc(href);
    if (!url) return;
    var el = document.querySelector('link[rel~="icon"]');
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "icon");
      document.head.appendChild(el);
    }
    el.setAttribute("href", url);
  }

  function boot() {
    loadJson(SITE_URL).then(function (site) {
      if (!site) return;

      var siteTitle = site.add_title_to_show_in_search_engines != null
        ? site.add_title_to_show_in_search_engines
        : site.title;
      var siteFavicon = site.favicon_path != null
        ? site.favicon_path
        : site.favicon;
      var siteDescription = site.add_a_small_introduction_to_show_in_search_engines != null
        ? site.add_a_small_introduction_to_show_in_search_engines
        : site.description;
      var header = site.navigation_bar_logo_name_and_subtitle || site.header || {};
      var headerName = header.add_your_group_name != null
        ? header.add_your_group_name
        : header.name;
      var headerImage = header.image_path != null
        ? header.image_path
        : header.image;

      /* The tab title is data-only: a page script may have set a specific
         title, otherwise the site title fills it. No static title in HTML. */
      if (siteTitle != null && String(siteTitle).trim() && !String(document.title).trim()) {
        document.title = String(siteTitle);
      }

      favicon(siteFavicon);

      if (siteDescription != null) metaByName("description", siteDescription);
      if (site.metadata && typeof site.metadata === "object") {
        metaByName("keywords", site.metadata.keywords);
        metaByName("author", site.metadata.author);
        metaByProperty("og:type", site.metadata.og_type);
        metaByProperty("og:title", siteTitle != null ? siteTitle : site.metadata.og_title);
        if (siteDescription != null) metaByProperty("og:description", siteDescription);
        if (headerImage != null && String(headerImage).trim()) {
          metaByProperty("og:image", logoSrc(headerImage));
        }
      }

      /* The brand words + logo in the header. Empty words hide the line —
         nothing is hard-coded in the pages. */
      if (header && typeof header === "object") {
        function applyWords(id, value) {
          var el = document.getElementById(id);
          if (!el) return;
          var words = value == null ? "" : String(value);
          el.textContent = words;
          el.style.display = words.trim() ? "" : "none";
        }
        applyWords("site-name", headerName);
        applyWords("site-subtitle", header.subtitle);
        applyWords("site-name-mobile", headerName);
        applyWords("site-subtitle-mobile", header.subtitle);

        if (headerImage !== undefined) {
          var raw = String(headerImage == null ? "" : headerImage).trim();
          var imgs = document.querySelectorAll("[data-site-logo]");
          Array.prototype.forEach.call(imgs, function (img) {
            if (!raw) {
              img.style.display = "none";
              return;
            }
            var src = logoSrc(raw);
            var alt = header.image_alt != null
              ? String(header.image_alt)
              : (headerName != null ? String(headerName) : "");
            img.style.display = "";
            img.setAttribute("src", src);
            img.setAttribute("alt", alt);
          });
        }
      }
    });
  }

  boot();
})();
