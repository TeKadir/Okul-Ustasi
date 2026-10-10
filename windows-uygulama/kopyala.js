/* Site dosyalarını (bir üst klasör) site/ klasörüne kopyalar.
   Site'de bir şey değiştirince "npm run exe" yeterli; bu otomatik çalışır. */

const fs = require("fs");
const path = require("path");

const kaynak = path.join(__dirname, "..");
const hedef = path.join(__dirname, "site");

fs.rmSync(hedef, { recursive: true, force: true });
fs.mkdirSync(hedef, { recursive: true });

fs.readdirSync(kaynak).forEach(function (ad) {

    /* Sadece site dosyaları: html, css, js, ikonlar. */
    var uzanti = path.extname(ad).toLowerCase();
    var siteDosyasi = [".html", ".css", ".js"].includes(uzanti);

    if (siteDosyasi && ad !== "sw.js") {
        fs.copyFileSync(path.join(kaynak, ad), path.join(hedef, ad));
    }
});

fs.cpSync(path.join(kaynak, "ikonlar"), path.join(hedef, "ikonlar"), { recursive: true });

console.log("Site dosyaları site/ klasörüne kopyalandı.");
