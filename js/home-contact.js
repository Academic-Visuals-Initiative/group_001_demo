/* ------------------------------------------------------------------
   home-contact.js — Section 08 (stations list + the panel on the right)
   of index.html.

   Words: data/site.json   -> sections entry "contact" (eyebrow)
          data/edit_contact_section.json -> heading, text, stations, and the panel

   The panel on the right is chosen by the JSON, one word —
   `choose_between_form_map_or_image`:
     - "form"   -> the message form (name, email, subject, message)
     - "map"    -> an embedded map with a link out to it
     - "image"  -> a picture (`image`, `imageAlt`)
   The form posts itself through EmailJS when `add_emailjs_info` carries the
   service, template and public key (see data/edit_contact_section.json); without
   them it says so instead of pretending to send.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var SITE_URL = "data/site.json";
  var DATA_URL = "data/edit_contact_section.json";

  var esc = window.CWL.esc;
  var loadJson = window.CWL.loadJson;

  /* Bare filename -> assets/images/contact/; "path/name" or http(s) as written. */
  function imgSrc(src) {
    var s = String(src || "").trim();
    if (!s) return "";
    if (/^(https?:)?\/\//.test(s) || s.charAt(0) === "/") return s;
    return s.indexOf("/") !== -1 ? s : "assets/images/contact/" + s;
  }

  var INPUT_CLS = "w-full bg-transparent border-b border-[#FAF9F5]/25 px-4 py-3 text-body-md text-[#FAF9F5] placeholder-[#8C8577] focus:outline-none focus:border-[#FAF9F5]";

  /* The four fields the form always offers. The input names (`from_name`,
     `from_email`, `subject`, `message`) are the words your mail template
     reads, so they live here in the engine and never in the JSON. Only the
     words a visitor sees — the label and the placeholder — come from the
     JSON. */
  var FIELDS = [
    {
      key: "edit_name_field",
      input: "from_name",
      labelKey: "edit_name_field_label",
      hintKey: "name_field_place_holder_text",
      legacy: "name"
    },
    {
      key: "edit_email_field",
      input: "from_email",
      labelKey: "edit_email_field_label",
      hintKey: "email_field_place_holder_text",
      legacy: "email"
    },
    {
      key: "edit_subject_field",
      input: "subject",
      labelKey: "edit_subject_field_label",
      hintKey: "subject_field_place_holder_text",
      legacy: "subject"
    },
    {
      key: "edit_message_field",
      input: "message",
      labelKey: "edit_message_field_label",
      hintKey: "message_field_place_holder_text",
      legacy: "message"
    }
  ];

  /* The rows inside a station card — an icon, a small label and the
     words. Write them as `details` (icon/label/value, like the spec's
     list), or just use the short keys — address, phone, email, hours —
     and the rows build themselves. `value` may be one line or several. */
  function stationRows(s) {
    if (Array.isArray(s.details) && s.details.length) {
      return s.details.map(function (row) {
        if (!row || typeof row !== "object") return row;
        var out = {};
        Object.keys(row).forEach(function (k) { out[k] = row[k]; });
        if (out.icon == null && out.icon_name_or_path != null) {
          out.icon = out.icon_name_or_path;
        }
        return out;
      });
    }
    function iconFor(key, fallback) {
      var value = s[key];
      return value != null && String(value).trim() ? value : fallback;
    }
    var line1 = s.card_text_line_1 != null ? s.card_text_line_1 : s.address;
    var line2 = s.card_text_line_2 != null ? s.card_text_line_2 : s.phone;
    var line3 = s.card_text_line_3 != null ? s.card_text_line_3 : s.email;
    var line4 = s.card_text_line_4 != null ? s.card_text_line_4 : s.hours;
    var rows = [];
    if (line1) {
      rows.push({
        icon: iconFor("add_icon_name_or_path_to_line_1_icon",
          iconFor("add_icon_name_or_path_to_address", "location")),
        label: s.card_text_line_1_label != null ? s.card_text_line_1_label : "Address",
        value: line1
      });
    }
    if (line2) {
      rows.push({
        icon: iconFor("add_icon_name_or_path_to_line_2_icon",
          iconFor("add_icon_name_or_path_to_phone", "phone_left")),
        label: s.card_text_line_2_label != null ? s.card_text_line_2_label : "Phone",
        value: line2
      });
    }
    if (line3) {
      rows.push({
        icon: iconFor("add_icon_name_or_path_to_line_3_icon",
          iconFor("add_icon_name_or_path_to_email", "mail")),
        label: s.card_text_line_3_label != null ? s.card_text_line_3_label : "Email",
        value: line3, link: "mailto:" + line3
      });
    }
    if (line4) {
      rows.push({
        icon: iconFor("add_icon_name_or_path_to_line_4_icon",
          iconFor("add_icon_name_or_path_to_hours", "clock")),
        label: s.card_text_line_4_label != null ? s.card_text_line_4_label : "Hours",
        value: line4
      });
    }
    return rows;
  }

  function rowValueHtml(row) {
    var lines = Array.isArray(row.value) ? row.value : [row.value];
    var body = lines
      .filter(function (l) { return l != null && l !== ""; })
      .map(function (l) { return '<span class="font-body-sm text-body-sm text-[#CDC8BC] block">' + esc(String(l)) + "</span>"; })
      .join("");
    return row.link
      ? '<a class="block hover:text-[#FAF9F5] transition-colors" href="' + esc(row.link) + '">' + body + "</a>"
      : body;
  }

  function stationHtml(s) {
    var rows = stationRows(s).map(function (row) {
      return [
        '            <div class="flex items-start justify-center lg:justify-start gap-2">',
        '              ' + window.CWL.iconHtml(row.icon || "materials:label", "text-[16px] text-[#A69F8E] mt-[3px]"),
        '              <div class="text-center lg:text-left">',
        row.label
          ? '                <span class="font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E] block">' + esc(row.label) + "</span>"
          : "",
        "                " + rowValueHtml(row),
        "              </div>",
        "            </div>"
      ].filter(function (l) { return l !== ""; }).join("\n");
    });

    return [
      '          <div class="bg-[#21211E] border border-[#FAF9F5]/10 p-5 text-center lg:text-left">',
      '            <span class="font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E] block">' + esc(s.card_subheading != null ? s.card_subheading : (s.label || "")) + "</span>",
      '            <span class="font-headline-sm text-headline-sm text-[#FAF9F5] block mt-1">' + esc(s.card_heading != null ? s.card_heading : (s.heading || "")) + "</span>",
      rows.length
        ? '            <div class="mt-4 space-y-3">' + rows.join("\n") + "</div>"
        : "",
      "          </div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  function formFields(form) {
    var given = (form && (form.edit_input_fields_of_contact_form || form.fields)) || {};
    return FIELDS.map(function (spec) {
      var g = given[spec.key] || given[spec.legacy] || {};
      return {
        key: spec.key,
        name: spec.input,
        label: g[spec.labelKey] != null ? g[spec.labelKey]
          : (g.label != null ? g.label : ""),
        placeholder: g[spec.hintKey] != null ? g[spec.hintKey]
          : (g.placeholder != null ? g.placeholder : "")
      };
    });
  }

  function fieldRow(field, kind, cls) {
    var inner = kind === "textarea"
      ? '<textarea class="' + INPUT_CLS + ' resize-none" id="' + esc(field.name) + '" name="' + esc(field.name) + '" placeholder="' + esc(field.placeholder) + '" rows="4" required></textarea>'
      : '<input class="' + INPUT_CLS + '" id="' + esc(field.name) + '" name="' + esc(field.name) + '" placeholder="' + esc(field.placeholder) + '" type="' + esc(kind) + '" required />';
    return [
      "        <div" + (cls ? ' class="' + cls + '"' : "") + ">",
      '          <label class="block font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E] mb-2" for="' + esc(field.name) + '">' + esc(field.label) + "</label>",
      "          " + inner,
      "        </div>"
    ].join("\n");
  }

  /* The form card: four fields, the note, the button — dark, like the
     band it sits on. */
  function formCard(form) {
    var field = {};
    formFields(form).forEach(function (f) { field[f.key] = f; });

    var title = form.contact_us_form_title != null
      ? form.contact_us_form_title : form.title;
    var subtitle = form.contact_us_form_subtitle != null
      ? form.contact_us_form_subtitle : form.subtitle;

    var head = (title || subtitle)
      ? [
          '        <div class="mb-8 pb-4 border-b border-[#FAF9F5]/15">',
          title
            ? '          <h3 class="font-headline-md text-headline-md uppercase text-[#FAF9F5]">' + esc(title) + "</h3>"
            : "",
          subtitle
            ? '          <p class="font-body-sm text-body-sm text-[#A69F8E] mt-1">' + esc(subtitle) + "</p>"
            : "",
          "        </div>"
        ].filter(function (l) { return l !== ""; }).join("\n")
      : "";

    var note = form.add_special_note != null ? form.add_special_note : form.note;
    var buttonLabel = form.button_label != null
      ? form.button_label : form.button;

    return [
      '      <div class="relative bg-[#21211E] border border-[#FAF9F5]/10 p-8 md:p-12 text-center md:text-left" data-contact-card>',
      head,
      '        <form class="space-y-6" id="contact-form">',
      '          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">',
      fieldRow(field.edit_name_field, "text"),
      fieldRow(field.edit_email_field, "email"),
      "          </div>",
      fieldRow(field.edit_subject_field, "text"),
      fieldRow(field.edit_message_field, "textarea"),
      '          <div class="pt-4 flex flex-col md:flex-row items-center justify-between gap-4">',
      '            <span class="font-label-sm text-label-sm text-[#A69F8E]" id="contact-note">' + esc(note || "") + "</span>",
      '            <button class="w-full md:w-auto bg-[#FAF9F5] text-[#1B1C19] px-10 py-4 font-label-md text-label-md uppercase tracking-[0.2em] font-medium hover:bg-white transition-colors whitespace-nowrap" type="submit">' + esc(buttonLabel || "Send") + " \u2192</button>",
      "          </div>",
      "        </form>",
      "      </div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* The map card: the same framed plate the picture uses — brown
     wireframe offset, dark mat — with the embedded map, its name and a
     link out to it. Write `"embed": "Nordic Science Park, Oslo"` and both
     the embed and the link build themselves; paste a whole embed instead
     as `"embed": { "src": "https://…" }` and it wins, while
     `link` sets the link yourself. */
  function mapCard(map) {
    var embed = map.embed != null ? map.embed : (map.q != null ? map.q : map.query);
    var place = typeof embed === "string" ? embed
      : ((embed && embed.query) || map.q || map.query || "");
    var title = map.map_title != null ? map.map_title : map.label;
    var linkLabel = map.edit_label_of_open_map_link != null
      ? map.edit_label_of_open_map_link : map.linkLabel;
    var ownLink = map.link;
    var src = (embed && typeof embed === "object" && embed.src)
      ? embed.src
      : (place ? "https://maps.google.com/maps?q=" + encodeURIComponent(place) + "&output=embed" : "");
    var link = ownLink || (place ? "https://www.google.com/maps?q=" + encodeURIComponent(place) : "");
    if (!src && !link) return "";
    return [
      '      <div class="relative" data-panel="map">',
      '        <div class="absolute -top-4 -right-4 md:-top-7 md:-right-7 w-full h-full border border-[#C7BAA0]/40 pointer-events-none cw-wireframe z-0"></div>',
      '        <div class="relative z-10 bg-[#21211E] p-3 md:p-4 shadow-2xl">',
      src
        ? '          <div class="overflow-hidden aspect-[4/3] w-full bg-[#2C2B27]"><iframe class="w-full h-full border-0" src="' + esc(src) + '" title="' + esc(title || "Map") + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>'
        : "",
      title || link
        ? [
            '          <div class="pt-3 px-1 flex items-center justify-between gap-space-sm">',
            '            <span class="font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E]">' + esc(title || "") + "</span>",
            link
              ? '            <a class="font-label-sm text-label-sm uppercase tracking-widest text-[#7D776A] hover:text-[#FAF9F5] transition-colors inline-flex items-center gap-2" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(linkLabel || "Open in Maps") + '<span class="cw-icon cw-icon--arrow-outward text-sm" aria-hidden="true"></span></a>'
              : "",
            "          </div>"
          ].filter(function (l) { return l !== ""; }).join("\n")
        : "",
      "        </div>",
      "      </div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* The picture panel: the same framed plate the About band uses — a
     wireframe offset behind, the photo on a dark mat, the caption at the
     bottom-left, and the credit as a black tag in the top-right corner.
     The words live together under `edit_image_if_you_are_using_image`. */
  function imageCard(data) {
    var block = data && data.edit_image_if_you_are_using_image;
    if (typeof block === "string") block = { image_path: block };
    var b = (block && typeof block === "object") ? block : {};

    var src = b.image_path != null ? b.image_path
      : (b.image != null ? b.image : (data && data.image));
    if (!src) return "";
    var alt = b.image_alt != null ? b.image_alt : b.imageAlt;
    var caption = b.add_image_caption != null ? b.add_image_caption : b.imageCaption;
    var credit = b.add_image_credit != null ? b.add_image_credit : b.imageCredit;
    return [
      '      <div class="relative" data-panel="image">',
      '        <div class="absolute -top-4 -right-4 md:-top-7 md:-right-7 w-full h-full border border-[#C7BAA0]/40 pointer-events-none cw-wireframe z-0"></div>',
      '        <div class="relative z-10 bg-[#21211E] p-3 md:p-4 shadow-2xl">',
      '          <div class="relative overflow-hidden aspect-[4/3] w-full bg-[#2C2B27]">',
      '            <img class="w-full h-full object-cover grayscale contrast-[1.08] transition-all duration-500 hover:grayscale-0" loading="lazy" data-panel-img alt="' + esc(alt || "") + '" src="' + esc(imgSrc(src)) + '" />',
      credit
        ? '            <span class="absolute top-0 right-0 z-10 bg-primary px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-on-primary pointer-events-none">' + esc(credit) + "</span>"
        : "",
      "          </div>",
      caption
        ? [
            '          <div class="pt-3 px-1 flex items-center justify-start">',
            '            <span class="font-label-sm text-label-sm uppercase tracking-widest text-[#A69F8E]">' + esc(caption) + "</span>",
            "          </div>"
          ].join("\n")
        : "",
      "        </div>",
      "      </div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* A picture that can't load shouldn't leave a broken frame behind:
     drop its card instead (§7 rule — no picture, nothing drawn). */
  function guardImage(section) {
    var img = section.querySelector("[data-panel-img]");
    if (!img) return;
    function drop() {
      var card = img.closest("[data-panel]");
      if (card) card.parentNode.removeChild(card);
    }
    if (img.complete && img.naturalWidth === 0) {
      drop();
      return;
    }
    img.addEventListener("error", drop);
  }

  /* The right panel shows exactly ONE thing, and the JSON says which:
     `"choose_between_form_map_or_image": "form"` | `"map"` | `"image"`.
     Leave the key out and the first one you have words for is used — form,
     then map, then the picture. Pick a panel whose words are missing and
     the column simply stays empty (the §7 rule: no words, nothing drawn). */
  /* The map's words live under `edit_map_info_if_you_are_using_map`. */
  function mapInfo(data) {
    var m = data && (data.edit_map_info_if_you_are_using_map != null
      ? data.edit_map_info_if_you_are_using_map
      : (data.add_map_info_if_you_are_using_map != null
        ? data.add_map_info_if_you_are_using_map
        : data.map));
    return (m && m !== true) ? m : {};
  }

  function panelHtml(data) {
    var formData = data && (data.edit_form_if_you_are_using_form != null
      ? data.edit_form_if_you_are_using_form
      : data.form);
    var wanted = data && (data.choose_between_form_map_or_image != null
      ? data.choose_between_form_map_or_image
      : data.panel);
    var want = String(wanted || "").toLowerCase();
    if (want !== "form" && want !== "map" && want !== "image") {
      want = formData ? "form" : (Object.keys(mapInfo(data)).length ? "map" : "image");
    }
    if (want === "map") return mapCard(mapInfo(data));
    if (want === "image") return imageCard(data);
    return formCard((formData && formData !== true) ? formData : {});
  }

  function render(entry, data) {
    var stations = (data && Array.isArray(data.cards))
      ? data.cards
      : ((data && Array.isArray(data.add_detail_card))
        ? data.add_detail_card
        : ((data && Array.isArray(data.add_detail_cards)) ? data.add_detail_cards
          : ((data && Array.isArray(data.stations)) ? data.stations : [])));

    var subheading = data && (data.subheading != null
      ? data.subheading
      : (data.contact_section_subheading != null ? data.contact_section_subheading : data.eyebrow));
    if (subheading == null) subheading = entry.eyebrow;
    var heading = data && (data.heading != null
      ? data.heading
      : data.contact_section_heading);
    var intro = data && (data.intro != null
      ? data.intro
      : (data.contact_section_introduction != null ? data.contact_section_introduction : data.text));

    return [
      '<div class="max-w-[1260px] mx-auto">',
      '  <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop">',
      '    <div class="lg:col-span-5 flex flex-col justify-between text-center lg:text-left">',
      "      <div>",
      '        <span class="font-label-md text-label-md uppercase tracking-[0.25em] text-[#A69F8E] block mb-2">' + esc(subheading || "") + "</span>",
      '        <h2 class="font-headline-lg text-[2.375rem] md:text-[3.125rem] leading-[1.15] uppercase tracking-wide text-[#FAF9F5] mb-6">' + esc(heading || "") + "</h2>",
      '        <div class="w-16 h-px bg-[#FAF9F5]/25 mb-8 mx-auto lg:mx-0"></div>',
      intro
        ? '        <p class="font-body-md text-body-md text-[#CDC8BC] max-w-md mx-auto lg:mx-0 mb-10 leading-relaxed lg:text-justify">' + esc(intro) + "</p>"
        : "",
      stations.length
        ? ['        <div class="space-y-6">', stations.map(stationHtml).join("\n"), "        </div>"].join("\n")
        : "",
      "      </div>",
      "    </div>",
      '    <div class="lg:col-span-7 mt-12 lg:mt-0">',
      panelHtml(data),
      "    </div>",
      "  </div>",
      "</div>"
    ].filter(function (l) { return l !== ""; }).join("\n");
  }

  /* The form posts itself through EmailJS. The keys live in
     data/edit_contact_section.json -> add_emailjs_info; with none of them the form
     says so rather than pretending to send. */
  function wireForm(data) {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var conf = (data && (data.add_emailjs_info || data.emailjs)) || null;
    var words = (data && (data.edit_form_if_you_are_using_form != null
      ? data.edit_form_if_you_are_using_form
      : data.form)) || {};
    var sentOk = words.message_to_show_when_sent_was_successful != null
      ? words.message_to_show_when_sent_was_successful : words.success;
    var sentFail = words.message_to_show_when_sent_was_unsuccessful != null
      ? words.message_to_show_when_sent_was_unsuccessful : words.error;
    var note = document.getElementById("contact-note");
    var card = form.closest("[data-contact-card]");
    var button = form.querySelector('button[type="submit"]');
    var buttonText = button ? button.textContent : "";
    var ready = false;

    /* The result covers the whole form card for a moment, so a sent or
       failed message is impossible to miss; then the form comes back. */
    function showResult(message, ok) {
      if (!card) {
        if (note) note.textContent = message;
        return;
      }
      var old = card.querySelector("[data-contact-result]");
      if (old) old.remove();
      var layer = document.createElement("div");
      layer.setAttribute("data-contact-result", "");
      layer.setAttribute("style",
        "position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;" +
        "align-items:center;justify-content:center;gap:14px;padding:2rem;text-align:center;" +
        "background:#21211E;opacity:0;transition:opacity .25s ease;");
      layer.innerHTML =
        '<span class="cw-icon ' + (ok ? "cw-icon--check-circle" : "cw-icon--error") +
        '" aria-hidden="true" style="font-size:34px;color:' + (ok ? "#d7ead0" : "#ffdad6") + '"></span>' +
        '<p class="font-headline-sm text-headline-sm text-[#FAF9F5]" style="margin:0;max-width:30rem">' +
        esc(message) + "</p>";
      card.appendChild(layer);
      setTimeout(function () { layer.style.opacity = "1"; }, 20);
      setTimeout(function () {
        layer.style.opacity = "0";
        setTimeout(function () { if (layer.parentNode) layer.remove(); }, 300);
      }, 2000);
    }

    if (conf && conf.service_id && conf.template_id && conf.public_key && window.emailjs) {
      window.emailjs.init(conf.public_key);
      ready = true;
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();

      function settle(ok, message) {
        showResult(message, ok);
        if (ok) form.reset();
        if (button) {
          button.disabled = false;
          button.textContent = buttonText;
        }
      }

      if (!ready) {
        settle(false, sentFail || "This form isn't connected yet - please email us instead.");
        return;
      }

      if (button) {
        /* Freeze the button's width before its words change, so the note
           beside it never jumps. */
        if (!button.style.minWidth) {
          button.style.minWidth = Math.ceil(button.getBoundingClientRect().width) + "px";
        }
        button.disabled = true;
        button.textContent = "Sending\u2026";
      }
      window.emailjs.sendForm(conf.service_id, conf.template_id, form)
        .then(function () { settle(true, sentOk || "Thanks - your message has been sent."); })
        .catch(function () { settle(false, sentFail || "Something went wrong - please email us instead."); });
    });
  }

  function boot() {
    var section = document.getElementById("contact");
    if (!section) return;

    Promise.all([loadJson(SITE_URL), loadJson(DATA_URL)]).then(function (loaded) {
      var site = loaded[0];
      var data = loaded[1] || {};
      /* The band's words live in one object: "contact_section". An older
         flat file is still read as it is. */
      if (data.contact_section && typeof data.contact_section === "object") {
        data = data.contact_section;
      }
      var entry = window.CWL.sectionConfig(site, "contact");

      if (!entry || entry.is_enabled === false) {
        section.style.display = "none";
        window.CWL.retargetNav("#contact", entry && entry.button && entry.button.link);
        return;
      }
      section.innerHTML = render(entry, data);
      guardImage(section);
      wireForm(data);
    });
  }

  boot();
})();
