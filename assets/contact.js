// Spam-Schutz: E-Mail-Adresse wird erst zur Laufzeit aus getrennten Teilen
// zusammengesetzt. Es steht nirgends eine vollständige Adresse im Quellcode.
// Gilt für alle Links mit der Klasse "js-mail-link"; optionales
// data-subject-Attribut wird als vorausgefüllter Betreff übernommen.
(function () {
  var links = document.querySelectorAll(".js-mail-link");
  if (!links.length) { return; }

  // Adresse in Bausteine zerlegt: <local-part>@<second-level>.<tld>
  var local  = ["orlando", "willig"];    // lokaler Teil, gestückelt
  var domain = ["pro", "ton"];           // Second-Level-Domain, gestückelt
  var tld    = ["me"];

  var at = String.fromCharCode(64);      // "@"
  var address = local.join("") + at + domain.join("") + "." + tld.join("");

  links.forEach(function (link) {
    var href = "mailto:" + address;
    var subject = link.getAttribute("data-subject");
    if (subject) { href += "?subject=" + encodeURIComponent(subject); }
    link.setAttribute("href", href);
  });
})();
