// Spam-Schutz: E-Mail-Adresse wird erst zur Laufzeit aus getrennten Teilen
// zusammengesetzt. Es steht nirgends eine vollständige Adresse im Quellcode.
// --> Zum Aktivieren die vier Platzhalter unten mit den echten Teilen ersetzen.
(function () {
  var link = document.getElementById("mail-link");
  if (!link) { return; }

  // Adresse in Bausteine zerlegt: <local-part>@<second-level>.<tld>
  var local  = ["orlando", "willig"];    // lokaler Teil, gestückelt
  var domain = ["pro", "ton"];           // Second-Level-Domain, gestückelt
  var tld    = ["me"];

  var at = String.fromCharCode(64);      // "@"
  var address = local.join("") + at + domain.join("") + "." + tld.join("");

  link.setAttribute("href", "mailto:" + address);
})();
