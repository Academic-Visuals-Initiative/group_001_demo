/* ------------------------------------------------------------------
   footer.js — builds the site footer from the "footer" block of
   data/site.json. Pages only carry an empty mount:

     <footer id="footer"></footer>

   Template 01's shape: a two-column band — on the left the logo mark
   with the department, school and university names beside it; on the
   right the copyright line, the permanent credit line under it, and
   the social squares.

   The mark is any image you like (SVG, PNG, JPG) — point `logo` at it.
   The three names are ordinary words: write them in the JSON and they
   set themselves in the condensed lockup face. Icons are picked by
   name ("x", "linkedin", "github", "mail", ...).

   The site.json path adapts automatically to pages living one
   directory deep (pages/).
------------------------------------------------------------------ */
(function () {
  "use strict";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;
  var formatText = window.CWL.formatText;
  var iconLabel = window.CWL.iconLabel;

  /* ------------------------------------------------------------------
     ATTRIBUTION NOTICE — REQUIRED BY THE TEMPLATE LICENCE
     The AVI credit, the CC BY-NC-SA licence line and the "Hosted on
     GitHub Pages" line are fixed parts of this template. They are not
     content: do not remove, hide or rewrite them. The footer checks for
     all three after drawing and blocks the page if any is missing.
     ------------------------------------------------------------------ */

  var inPages = window.location.pathname.indexOf("/pages/") !== -1;
  var BASE = inPages ? "../" : "";
  var SITE_URL = BASE + "data/site.json";
  var LOGO_DIR = "assets/logos/main_website/";

  /* Footer mark: a bare name comes from assets/logos/main_website/; a
     path or URL is used as written. */
  function logoSrc(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/" || s.indexOf("data:") === 0) return s;
    if (s.indexOf("../") === 0) return s;
    if (!/\.[a-z0-9]+$/i.test(s)) s += ".svg";
    if (s.indexOf("/") > -1) return BASE + s;
    return BASE + LOGO_DIR + s;
  }

  /* Fixed legal / maker lines. These are not content and can never be
     edited through site.json. */
  var AVI_TEXT = "Designed by Academic Visuals Initiative (AVI).";
  var AVI_URL = "https://www.academicvisualsinitiative.org";
  var LICENSE_TEXT = "Licensed under CC BY-NC-SA 4.0.";
  var LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";
  var HOSTED_TEXT = "Hosted on GitHub Pages";

  /* If any required constant has been deleted (or is not a string), the
     footer refuses to run and blocks the page instead of rendering an
     unbranded site. */
  if (typeof AVI_TEXT !== "string" || typeof AVI_URL !== "string" ||
    typeof LICENSE_TEXT !== "string" || typeof LICENSE_URL !== "string" ||
    typeof HOSTED_TEXT !== "string") {
    blockSite();
    return;
  }

  /* Social marks come from assets/icons/social_icons/ (or system_icons/
     for mail): js/helpers.js socialIconHtml masks the named file in, so a
     new drawing works as soon as its file exists. */
  function socialHtml(s) {
    var key = String(s.icon || "").trim();
    if (!key) return "";
    /* The visible name is optional: without one, the icon's own file name
       supplies a friendly label ("x" -> "X", "linkedin" -> "LinkedIn"). */
    var label = s.name != null && String(s.name).trim()
      ? String(s.name)
      : iconLabel(key);
    return (
      '<a class="w-8 h-8 bg-primary text-on-primary flex items-center justify-center hover:bg-secondary transition-colors" ' +
      'href="' + esc(s.link || "#") + '" aria-label="' + esc(label) + '">' +
      window.CWL.socialIconHtml(key) +
      "</a>"
    );
  }

  /* The left half: the mark, a hairline rule, then the three names —
     the lockup the department logo used to carry, but with the words
     coming from the JSON rather than drawn into the artwork. Each name
     is optional; drop one and its line simply isn't there.

     The names need real width (the school line is long), so the lockup
     sits the mark beside the words from `md` up, with the rule between
     them; on phones the mark stands over the words. */
  function lockupHtml(f) {
    var big = "text-[22px] md:text-[21px] lg:text-[26px] xl:text-[30px]";
    var names = [
      { text: f.department, cls: big },
      { text: f.school, cls: big },
      { text: f.university, cls: "text-[17px] lg:text-[20px] xl:text-[23px]" }
    ].filter(function (line) { return line.text; });

    var mark = f.logo
      ? '<img class="h-16 md:h-14 lg:h-20 w-auto" src="' + esc(logoSrc(f.logo)) + '" alt="' + esc(f.logoAlt || "") + '" />'
      : "";
    var rule = (mark && names.length)
      ? '        <span class="hidden md:block self-stretch w-px bg-on-surface/25" aria-hidden="true"></span>'
      : "";
    var words = names.length
      ? '        <div class="flex flex-col justify-center text-center md:text-left font-lockup uppercase leading-[0.9] md:leading-[1.32] lg:leading-[0.9] text-on-surface">' +
        names.map(function (line) {
          return '<span class="' + line.cls + '">' + esc(String(line.text)) + "</span>";
        }).join("") +
        "</div>"
      : "";
    if (!mark && !words) return "";
    return '      <div class="lg:col-span-6 flex flex-col items-center gap-space-sm md:flex-row md:items-center xl:gap-space-md">' + mark + rule + words + "</div>";
  }

  function render(f) {
    var socials = Array.isArray(f.socials) ? f.socials : [];
    var copyright = f.copyright != null ? String(f.copyright) : "";
    var label = "font-label-sm text-label-sm uppercase text-secondary tracking-widest md:text-[11px] lg:text-[13px]";
    /* The credit · licence line and the hosted line set at the same
       small size — the credit pair has to fit one line inside half the
       footer, and the hosted line matches it. */
    var META = "font-label-sm uppercase text-secondary tracking-[0.05em] text-[10px]";

    /* The bottom bar's fixed lines: maker credit + licence on the left,
       hosted line on the right. */
    var aviHtml =
      '<a class="footer-credit order-2" href="' + AVI_URL + '" target="_blank" rel="noopener">' +
      AVI_TEXT + "</a>";
    var licenseHtml =
      '<a class="footer-credit" href="' + LICENSE_URL + '" target="_blank" rel="noopener">' +
      LICENSE_TEXT + "</a>";

    /* A line of your own right under the copyright — a word, or a link
       to a credits page. Same shape as `license`: a plain string, or
       { "text": "…", "link": "…" }; leave the key out and the line goes. */
    var credit = f.credit;
    var creditText = "";
    var creditLink = "";
    if (credit && typeof credit === "object") {
      creditText = String(credit.text || "");
      creditLink = String(credit.link || "");
    } else if (credit != null) {
      creditText = String(credit);
    }
    var creditHtml = creditText
      ? (creditLink
        ? '<a class="footer-credit" href="' + esc(creditLink) + '">' + esc(creditText) + "</a>"
        : esc(creditText))
      : "";

    /* One more line under the copyright — a date, a note. Same shape as
       `license`: a plain string, or { "text": "…", "link": "…" }. */
    var updated = f.updated;
    var updatedText = "";
    var updatedLink = "";
    if (updated && typeof updated === "object") {
      updatedText = String(updated.text || "");
      updatedLink = String(updated.link || "");
    } else if (updated != null) {
      updatedText = String(updated);
    }
    var updatedHtml = updatedText
      ? (updatedLink
        ? '<a class="footer-credit" href="' + esc(updatedLink) + '">' + esc(updatedText) + "</a>"
        : esc(updatedText))
      : "";

    return [
      '  <div class="max-w-[1260px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">',
      '    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter-desktop items-start">',
      lockupHtml(f),
      '      <div class="lg:col-span-6 lg:col-start-7 flex flex-col items-center md:items-end gap-space-md text-center md:text-right">',
      '        <div class="flex flex-col items-center md:items-end">',
      '          <p class="' + label + '">' + formatText(esc(copyright)) + "</p>",
      updatedHtml ? '          <p class="' + label + '">' + updatedHtml + "</p>" : "",
      creditHtml ? '          <p class="' + label + '">' + creditHtml + "</p>" : "",
      socials.length
        ? '          <div class="flex items-center gap-space-xs mt-[4px]">' + socials.map(socialHtml).join("") + "</div>"
        : "",
      "        </div>",
      "      </div>",
      "    </div>",
      '    <div class="mt-space-md flex flex-col md:flex-row items-center justify-between gap-space-sm">',
      '      <p class="' + META + ' text-center md:text-left flex flex-col items-center md:block">' +
        aviHtml +
        '<span class="hidden md:inline mx-space-xs opacity-50">\u00b7</span><span class="order-1">' + licenseHtml + "</span></p>",
      '      <p class="' + META + ' text-center md:text-right order-first md:order-none">' + HOSTED_TEXT + "</p>",
      "    </div>",
      "  </div>"
    ].filter(function (line) { return line !== ""; }).join("\n");
  }

  /* The three attribution lines must be present and linked. If an editor
     strips them, the page is covered rather than left unbranded. */
  function attributionIntact() {
    var foot = document.getElementById("footer");
    if (!foot) return false;
    var text = foot.textContent.replace(/\s+/g, " ");
    return text.indexOf(AVI_TEXT) !== -1 &&
      text.indexOf(LICENSE_TEXT) !== -1 &&
      text.indexOf(HOSTED_TEXT) !== -1 &&
      !!foot.querySelector('a[href="' + AVI_URL + '"]') &&
      !!foot.querySelector('a[href="' + LICENSE_URL + '"]');
  }

  function blockSite() {
    if (document.getElementById("cwl-attribution-block")) return;
    var box = document.createElement("div");
    box.id = "cwl-attribution-block";
    box.setAttribute("style",
      "position:fixed;inset:0;z-index:2147483647;background:#FAF9F5;color:#1B1C19;" +
      "display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;" +
      "font-family:system-ui,-apple-system,'Segoe UI',sans-serif;");
    box.innerHTML =
      '<div style="max-width:34rem">' +
      '<p style="margin:0 0 .5rem;font-size:1.25rem;font-weight:600">This site is temporarily unavailable.</p>' +
      '<p style="margin:0;font-size:1rem;line-height:1.6">The template attribution is missing. ' +
      'Restore the footer credit, the CC BY-NC-SA licence line and the &ldquo;Hosted on GitHub Pages&rdquo; line.</p>' +
      "</div>";
    document.documentElement.appendChild(box);
    if (document.body) document.body.style.overflow = "hidden";
  }

  function guard() {
    if (attributionIntact()) return true;
    blockSite();
    return false;
  }

  function footerData(raw, site) {
    var f = raw || {};
    var s = site || {};
    function pick(now, before) {
      if (f[now] != null) return f[now];
      return f[before];
    }
    return {
      logo: pick("footer_logo", "logo"),
      logoAlt: pick("logo_alt", "logoAlt"),
      department: pick("logo_text_line_1", "department"),
      school: pick("logo_text_line_2", "school"),
      university: pick("logo_text_line_3", "university"),
      copyright: pick("footer_right_side_line_1", "copyright"),
      updated: pick("footer_right_side_line_2", "updated"),
      credit: pick("footer_right_side_line_3", "credit"),
      /* Socials are a top-level list now; the older place inside the
         footer block still reads. */
      socials: s.footer_social_icons != null
        ? s.footer_social_icons
        : pick("footer_social_icons", "socials")
    };
  }

  function boot() {
    var foot = document.getElementById("footer");
    if (!foot) return;

    loadJson(SITE_URL).then(function (site) {
      var f = footerData(site && (site.edit_footer || site.footer), site);
      foot.className = "w-full bg-surface-container-low text-on-surface pt-20 lg:pt-28 pb-[25px] lg:pb-[33px]";
      foot.innerHTML = render(f);
      guard();

      /* Keep watching: a later script (or a person with devtools) can also
         remove the lines after the first paint. */
      if (window.MutationObserver) {
        new MutationObserver(guard).observe(foot, {
          childList: true, subtree: true, characterData: true, attributes: true
        });
        new MutationObserver(guard).observe(document.body, { childList: true });
      }
    });
  }

  boot();
})();
