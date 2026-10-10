/* =========================================================
   OKUL USTASI - SERVICE WORKER (sw.js)
   Uygulama dosyalarını (HTML, CSS, JS, ikonlar) saklar.
   Önce internetten dener, internet yoksa saklanan kopyayı açar.
   Supabase ve başka sitelere gelen istekler HİÇ saklanmaz
   (giriş, mesaj, veri hep canlı kalır).
   Dosyaları güncelleyince aşağıdaki SURUM numarasını artır.
========================================================= */

var SURUM = "ou-v3";

var DOSYALAR = [
    "anasayfa.html", "bildirimler.html", "ders-yardimi.html", "duyurular.html",
    "giris.html", "konular.html", "odev-soru.html", "olaylar.html",
    "sohbet.html", "soru-olustur.html", "takvim.html",
    "ortak.css", "yeni.css", "ortak.js", "sifre.js", "form-ac.js", "anasayfa-ek.js",
    "anasayfa.css", "anasayfa.js", "bildirimler.css", "bildirimler.js",
    "ders-yardimi.css", "ders-yardimi.js", "duyurular.css", "duyurular.js",
    "giris.css", "giris.js", "konular.css", "konular.js",
    "odev-soru.css", "odev-soru.js", "olaylar.css", "olaylar.js",
    "sohbet.css", "sohbet.js", "soru-olustur.css", "soru-olustur.js",
    "takvim.css", "takvim.js", "profil.html", "profil.css", "profil.js",
    "test.html", "test.css", "test.js", "test-yonet.html", "test-yonet.js",
    "manifest.json", "ikonlar/ikon-192.png", "ikonlar/ikon-512.png"
];


self.addEventListener("install", function (olay) {
    olay.waitUntil(
        caches.open(SURUM).then(function (depo) {
            return depo.addAll(DOSYALAR);
        })
    );
    self.skipWaiting();
});


self.addEventListener("activate", function (olay) {
    olay.waitUntil(
        caches.keys().then(function (adlar) {
            return Promise.all(
                adlar
                    .filter(function (ad) { return ad !== SURUM; })
                    .map(function (ad) { return caches.delete(ad); })
            );
        })
    );
    self.clients.claim();
});


self.addEventListener("fetch", function (olay) {

    var istek = olay.request;

    /* Yalnızca kendi sitemizin GET istekleri. Supabase vb. dokunulmaz. */
    if (istek.method !== "GET" || new URL(istek.url).origin !== location.origin) {
        return;
    }

    olay.respondWith(
        fetch(istek)
            .then(function (cevap) {
                var kopya = cevap.clone();
                caches.open(SURUM).then(function (depo) {
                    depo.put(istek, kopya);
                });
                return cevap;
            })
            .catch(function () {
                return caches.match(istek).then(function (kayitli) {
                    return kayitli || caches.match("anasayfa.html");
                });
            })
    );
});
