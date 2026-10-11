/* =========================================================
   OKUL USTASI - GÜNLÜK ÇALIŞMA KARTI (calisma.js)
   Profil sayfasında günlük hedef, seri ve çalışma özetini gösterir.

   Kullanılan sunucu fonksiyonları (hepsi auth.uid() ile yalnızca
   kullanıcının KENDİ verisine erişir):
   - calisma_ozeti()
   - gunluk_hedef_ayarla(p_hedef)
   - saat_dilimi_ayarla(p_saat_dilimi)

   Gün ve seri hesabı SUNUCUDA yapılır; burada yalnızca gösterilir.
   "Tahmini süre" gerçek çalışma süresi değildir, bitirilen testlerin
   başlama-bitiş farkından hesaplanır.

   profil.js'ten SONRA yüklenir (supabaseClient'ı onun tanımından alır).
========================================================= */

(function () {

    "use strict";

    if (typeof supabaseClient === "undefined") {
        return;
    }

    /* SQL'deki c_seri_min ile aynı olmalı */
    var SERI_MIN_SORU = 10;

    var yuklemeSirasi = 0;
    var mevcutId = null;
    var govde = null;
    var mesajKutusu = null;


    function eleman(tag, sinif, metin) {

        var el = document.createElement(tag);

        if (sinif) {
            el.className = sinif;
        }

        if (metin !== undefined) {
            el.textContent = metin;
        }

        return el;
    }

    function mesaj(kutu, metin, durum) {

        kutu.textContent = metin || "";
        kutu.className = "yn-mesaj" + (metin && durum ? " " + durum : "");   /* "hata" veya "ok" */
    }

    function istatistik(deger, etiket, tamam) {

        var kutu = eleman("div", "cl-stat" + (tamam ? " tamam" : ""));

        kutu.appendChild(eleman("strong", null, String(deger)));
        kutu.appendChild(eleman("span", null, etiket));

        return kutu;
    }


    /* ---------- kartı sayfaya yerleştir ---------- */

    function kartiOlustur() {

        var alan = document.getElementById("profilAlani");

        if (!alan) {
            return false;
        }

        var kart = eleman("section", "yn-kutu cl-kutu");
        kart.id = "calismaKarti";

        kart.appendChild(eleman("h2", null, "Günlük çalışma"));

        mesajKutusu = eleman("div", "yn-mesaj");
        mesajKutusu.setAttribute("role", "status");
        kart.appendChild(mesajKutusu);

        govde = eleman("div");
        kart.appendChild(govde);

        /* Kimlik/seviye kutusunun hemen altına */
        var ilk = alan.querySelector(".yn-kutu");

        if (ilk && ilk.nextSibling) {
            alan.insertBefore(kart, ilk.nextSibling);
        } else {
            alan.appendChild(kart);
        }

        return true;
    }


    /* ---------- çizim ---------- */

    function saatDilimleri(mevcut) {

        var liste = [];

        try {
            if (typeof Intl.supportedValuesOf === "function") {
                liste = Intl.supportedValuesOf("timeZone").slice();
            }
        } catch (e) {
            liste = [];
        }

        if (liste.indexOf("Europe/Istanbul") === -1) {
            liste.push("Europe/Istanbul");
        }

        if (mevcut && liste.indexOf(mevcut) === -1) {
            liste.push(mevcut);
        }

        liste.sort();

        return liste;
    }

    function ozetiCiz(o) {

        govde.textContent = "";

        var hedef = Number(o.hedef) || 0;
        var bugun = Number(o.bugun_soru) || 0;
        var seri = Number(o.seri) || 0;
        var yuzde = hedef > 0 ? Math.min(100, Math.round(bugun / hedef * 100)) : 0;

        /* Günlük hedef */
        var satir = eleman("div", "cl-hedef-satir");
        satir.appendChild(eleman("strong", null, "Bugün " + bugun + " / " + hedef + " soru"));
        satir.appendChild(eleman("span", "yn-soluk", "%" + yuzde));
        govde.appendChild(satir);

        var cubuk = eleman("div", "cl-cubuk");
        cubuk.setAttribute("role", "progressbar");
        cubuk.setAttribute("aria-valuemin", "0");
        cubuk.setAttribute("aria-valuemax", "100");
        cubuk.setAttribute("aria-valuenow", String(yuzde));
        cubuk.setAttribute("aria-label", "Günlük hedef ilerlemesi");

        var dolu = eleman("div", "cl-dolu");
        dolu.style.width = yuzde + "%";
        cubuk.appendChild(dolu);
        govde.appendChild(cubuk);

        govde.appendChild(eleman(
            "p",
            "cl-not",
            "Aynı soruyu aynı gün tekrar çözmek sayıyı artırmaz; farklı sorular sayılır."
        ));

        /* Seri, süre, tamamlanan test */
        var kutular = eleman("div", "cl-ozet");

        kutular.appendChild(istatistik(
            seri,
            "gün seri",
            o.seri_bugun_tamam
        ));

        kutular.appendChild(istatistik(
            Number(o.bugun_dakika) || 0,
            "dk tahmini süre (bugün)",
            false
        ));

        kutular.appendChild(istatistik(
            Number(o.tamamlanan_test) || 0,
            "tamamlanan test",
            false
        ));

        govde.appendChild(kutular);

        var kalan = Math.max(0, SERI_MIN_SORU - bugun);

        govde.appendChild(eleman(
            "p",
            "cl-not",
            o.seri_bugun_tamam
                ? "Bugünün seri şartı tamam."
                : "Seriye bugün sayılması için en az " + SERI_MIN_SORU +
                  " farklı soru gerekir" +
                  (bugun > 0 ? " (" + kalan + " soru kaldı)." : ".")
        ));

        govde.appendChild(eleman(
            "p",
            "cl-not",
            "Süre gerçek çalışma süresi değil, bitirdiğin testlerin başlama ve bitiş zamanından yapılan bir tahmindir."
        ));

        ayarlariCiz(o, hedef);
    }

    function ayarlariCiz(o, hedef) {

        var ayar = eleman("div", "cl-ayar");

        /* Günlük hedef */
        var a1 = eleman("div", "yn-alan");
        var l1 = eleman("label", null, "Günlük hedef (soru sayısı, 1-500)");
        l1.setAttribute("for", "clHedefGirdi");
        a1.appendChild(l1);

        var s1 = eleman("div", "cl-ayar-satir");

        var hedefGirdi = eleman("input");
        hedefGirdi.type = "number";
        hedefGirdi.id = "clHedefGirdi";
        hedefGirdi.min = "1";
        hedefGirdi.max = "500";
        hedefGirdi.step = "1";
        hedefGirdi.inputMode = "numeric";
        hedefGirdi.value = String(hedef || 20);

        var hedefBtn = eleman("button", "yn-btn", "Hedefi kaydet");
        hedefBtn.type = "button";

        var hedefMesaj = eleman("div", "yn-mesaj");
        hedefMesaj.setAttribute("role", "status");

        hedefBtn.addEventListener("click", async function () {

            var deger = Number(hedefGirdi.value);

            if (!Number.isInteger(deger) || deger < 1 || deger > 500) {
                mesaj(hedefMesaj, "Hedef 1 ile 500 arasında bir tam sayı olmalı.", "hata");
                return;
            }

            hedefBtn.disabled = true;
            mesaj(hedefMesaj, "Kaydediliyor...");

            var r = await supabaseClient.rpc("gunluk_hedef_ayarla", { p_hedef: deger });

            hedefBtn.disabled = false;

            if (r.error) {
                console.error(r.error);
                mesaj(hedefMesaj, "Kaydedilemedi: " + r.error.message, "hata");
                return;
            }

            await yukle(true);
        });

        s1.appendChild(hedefGirdi);
        s1.appendChild(hedefBtn);
        a1.appendChild(s1);
        a1.appendChild(hedefMesaj);
        ayar.appendChild(a1);

        /* Saat dilimi */
        var a2 = eleman("div", "yn-alan");
        var l2 = eleman("label", null, "Saat dilimi (günün ne zaman bittiğini belirler)");
        l2.setAttribute("for", "clSaatSec");
        a2.appendChild(l2);

        var s2 = eleman("div", "cl-ayar-satir");

        var sec = eleman("select");
        sec.id = "clSaatSec";

        saatDilimleri(o.saat_dilimi).forEach(function (ad) {
            var op = eleman("option", null, ad);
            op.value = ad;
            sec.appendChild(op);
        });

        sec.value = o.saat_dilimi;

        var saatBtn = eleman("button", "yn-btn", "Saat dilimini kaydet");
        saatBtn.type = "button";

        var tarayiciBtn = eleman("button", "yn-btn ikincil kucuk", "Tarayıcınınkini seç");
        tarayiciBtn.type = "button";

        var saatMesaj = eleman("div", "yn-mesaj");
        saatMesaj.setAttribute("role", "status");

        tarayiciBtn.addEventListener("click", function () {

            var tz = "";

            try {
                tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
            } catch (e) {
                tz = "";
            }

            if (!tz) {
                mesaj(saatMesaj, "Tarayıcı saat dilimini vermedi, listeden seç.", "hata");
                return;
            }

            if (!Array.prototype.some.call(sec.options, function (op) { return op.value === tz; })) {
                var op = eleman("option", null, tz);
                op.value = tz;
                sec.appendChild(op);
            }

            sec.value = tz;
            mesaj(saatMesaj, "");
        });

        saatBtn.addEventListener("click", async function () {

            saatBtn.disabled = true;
            mesaj(saatMesaj, "Kaydediliyor...");

            var r = await supabaseClient.rpc("saat_dilimi_ayarla", { p_saat_dilimi: sec.value });

            saatBtn.disabled = false;

            if (r.error) {
                console.error(r.error);
                mesaj(saatMesaj, "Kaydedilemedi: " + r.error.message, "hata");
                return;
            }

            await yukle(true);
        });

        s2.appendChild(sec);
        s2.appendChild(saatBtn);
        s2.appendChild(tarayiciBtn);
        a2.appendChild(s2);
        a2.appendChild(saatMesaj);
        ayar.appendChild(a2);

        govde.appendChild(ayar);
    }


    /* ---------- veri ---------- */

    async function yukle(sessiz) {

        var sira = ++yuklemeSirasi;

        if (!sessiz) {
            mesaj(mesajKutusu, "Yükleniyor...");
        }

        var r = await supabaseClient.rpc("calisma_ozeti");

        if (sira !== yuklemeSirasi) {
            return;
        }

        if (r.error) {
            console.error(r.error);
            govde.textContent = "";
            mesaj(mesajKutusu, "Çalışma özeti yüklenemedi: " + r.error.message, "hata");
            return;
        }

        var o = Array.isArray(r.data) ? r.data[0] : r.data;

        if (!o) {
            mesaj(mesajKutusu, "Çalışma özeti bulunamadı.", "hata");
            return;
        }

        mesaj(mesajKutusu, "");
        ozetiCiz(o);
    }

    function oturum(session) {

        var yeni = session && session.user ? session.user.id : null;

        /* Aynı kullanıcı için TOKEN_REFRESHED vb. olayları yeniden yüklemesin */
        if (yeni && yeni !== mevcutId) {
            yukle(false);
        }

        if (!yeni && govde) {
            govde.textContent = "";
        }

        mevcutId = yeni;
    }


    /* ---------- başlangıç ---------- */

    if (!kartiOlustur()) {
        return;
    }

    supabaseClient.auth.onAuthStateChange(function (olay, session) {
        oturum(session);
    });

    supabaseClient.auth.getSession().then(function (r) {
        oturum(r.data.session);
    });

})();
