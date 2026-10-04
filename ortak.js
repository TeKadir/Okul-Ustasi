/* =========================================================
   OKUL USTASI - ORTAK SCRIPT (ortak.js)
   1) Karanlık tema düğmesi (tercih localStorage'da saklanır)
   2) Sol panel (açma/kapama, ESC, dışarı tıklama, odak yönetimi)
   3) Panelin "Hesap" bölümü (giriş durumunu üst menüden okur;
      Supabase / oturum kodu burada YOK, sayfaların kendi kodu kalır)

   Tema tercihi sayfa çizilmeden önce, her sayfanın <head> kısmındaki
   küçük satır içi script ile uygulanır (beyaz parlama olmasın diye).
========================================================= */

(function () {

    "use strict";

    var TEMA_ANAHTARI = "ou-tema";

    var kok = document.documentElement;


    /* -----------------------------------------------------
       PANEL BAĞLANTILARI
       Dosya adları mevcut sayfalarla birebir aynıdır.
    ----------------------------------------------------- */

    var BAGLANTILAR = [
        { ad: "Anasayfa",      dosya: "anasayfa.html",     ikon: "" },
        { ad: "Ders Yardımı",  dosya: "ders-yardimi.html", ikon: "" },
        { ad: "Ödev",          dosya: "odev-soru.html",    ikon: "" },
        { ad: "Soru ve Konu",  dosya: "soru-olustur.html", ikon: "" },
        { ad: "Konular",       dosya: "konular.html",      ikon: "" },
        { ad: "Duyurular",     dosya: "duyurular.html",    ikon: "" },
        { ad: "Bildirimler",   dosya: "bildirimler.html",  ikon: "" },
        { ad: "Olaylar",       dosya: "olaylar.html",      ikon: "" },
        { ad: "Takvim",        dosya: "takvim.html",       ikon: "" },
        { ad: "Sohbet",        dosya: "sohbet.html",       ikon: "" }
    ];


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


    /* =====================================================
       KARANLIK TEMA
    ===================================================== */

    var temaDugmesi = null;


    function temaOku() {

        try {
            return localStorage.getItem(TEMA_ANAHTARI) === "dark"
                ? "dark"
                : "light";
        } catch (e) {
            return kok.getAttribute("data-tema") === "dark"
                ? "dark"
                : "light";
        }
    }


    function temaKaydet(tema) {

        try {
            localStorage.setItem(TEMA_ANAHTARI, tema);
        } catch (e) {
            /* Depolama kapalıysa tema yalnızca bu sayfada geçerli olur. */
        }
    }


    function temaDugmesiniGuncelle() {

        if (!temaDugmesi) {
            return;
        }

        var koyu = kok.getAttribute("data-tema") === "dark";

        temaDugmesi.textContent = koyu ? "" : "";

        temaDugmesi.setAttribute(
            "aria-label",
            koyu ? "Açık temaya geç" : "Karanlık temaya geç"
        );

        temaDugmesi.setAttribute("title",
            koyu ? "Açık tema" : "Karanlık tema"
        );

        temaDugmesi.setAttribute("aria-pressed", koyu ? "true" : "false");
    }


    function temaUygula(tema) {

        if (tema === "dark") {
            kok.setAttribute("data-tema", "dark");
        } else {
            kok.removeAttribute("data-tema");
        }

        temaDugmesiniGuncelle();
    }


    function temaDegistir() {

        var yeni =
            kok.getAttribute("data-tema") === "dark"
                ? "light"
                : "dark";

        temaKaydet(yeni);
        temaUygula(yeni);
    }


    /* Başka sekmede tema değişirse bu sekme de uysun. */
    window.addEventListener("storage", function (olay) {

        if (olay.key === TEMA_ANAHTARI) {
            temaUygula(olay.newValue === "dark" ? "dark" : "light");
        }
    });


    /* =====================================================
       SOL PANEL
    ===================================================== */

    var panel = null;
    var yer = null;
    var acDugmesi = null;
    var kapatDugmesi = null;
    var hesapAlani = null;


    function mevcutDosya() {

        var parca = location.pathname.split("/").pop();

        if (!parca || parca === "index.html") {
            return "anasayfa.html";
        }

        return parca.toLowerCase();
    }


    function panelAcikMi() {

        return panel && panel.classList.contains("acik");
    }


    function panelAc() {

        if (!panel || panelAcikMi()) {
            return;
        }

        panel.classList.add("acik");
        yer.classList.add("acik");
        kok.classList.add("ou-panel-acik");

        if (acDugmesi) {
            acDugmesi.setAttribute("aria-expanded", "true");
        }

        /* Görünür olduktan sonra odağı panele taşı. */
        window.setTimeout(function () {
            if (kapatDugmesi) {
                kapatDugmesi.focus();
            }
        }, 30);
    }


    function panelKapat(odagiGeriVer) {

        if (!panel || !panelAcikMi()) {
            return;
        }

        panel.classList.remove("acik");
        yer.classList.remove("acik");
        kok.classList.remove("ou-panel-acik");

        if (acDugmesi) {
            acDugmesi.setAttribute("aria-expanded", "false");

            if (odagiGeriVer) {
                acDugmesi.focus();
            }
        }
    }


    function panelOlustur() {

        yer = eleman("div", "ou-yer");

        panel = eleman("nav", "ou-panel");
        panel.id = "ouPanel";
        panel.setAttribute("aria-label", "Site menüsü");

        /* ---- Üst ---- */

        var ust = eleman("div", "ou-panel-ust");

        ust.appendChild(eleman("span", "ou-panel-baslik", "Okul Ustası"));

        kapatDugmesi = eleman("button", "ou-kapat", "✕");
        kapatDugmesi.type = "button";
        kapatDugmesi.setAttribute("aria-label", "Menüyü kapat");

        ust.appendChild(kapatDugmesi);
        panel.appendChild(ust);

        /* ---- Bağlantılar ---- */

        var menu = eleman("div", "ou-menu");
        var simdi = mevcutDosya();

        BAGLANTILAR.forEach(function (b) {

            var a = eleman("a");
            a.href = b.dosya;

            a.appendChild(eleman("span", "ou-m-ikon", b.ikon));
            a.appendChild(eleman("span", null, b.ad));

            if (b.dosya === simdi) {
                a.className = "aktif";
                a.setAttribute("aria-current", "page");
            }

            menu.appendChild(a);
        });

        panel.appendChild(menu);

        /* ---- Hesap ---- */

        hesapAlani = eleman("div", "ou-panel-hesap");
        panel.appendChild(hesapAlani);

        document.body.appendChild(yer);
        document.body.appendChild(panel);

        /* ---- Olaylar ---- */

        kapatDugmesi.addEventListener("click", function () {
            panelKapat(true);
        });

        yer.addEventListener("click", function () {
            panelKapat(true);
        });

        document.addEventListener("keydown", function (olay) {

            if (!panelAcikMi()) {
                return;
            }

            if (olay.key === "Escape") {
                olay.preventDefault();
                panelKapat(true);
                return;
            }

            /* Tab ile odak panelin dışına kaçmasın. */
            if (olay.key === "Tab") {

                var odaklanabilir = panel.querySelectorAll(
                    "a[href], button:not([disabled])"
                );

                if (odaklanabilir.length === 0) {
                    return;
                }

                var ilk = odaklanabilir[0];
                var son = odaklanabilir[odaklanabilir.length - 1];

                if (olay.shiftKey && document.activeElement === ilk) {
                    olay.preventDefault();
                    son.focus();
                } else if (!olay.shiftKey && document.activeElement === son) {
                    olay.preventDefault();
                    ilk.focus();
                }
            }
        });
    }


    /* =====================================================
       PANELİN HESAP BÖLÜMÜ
       Üst menüdeki #topUser görünür mü diye bakar.
    ===================================================== */

    function hesapAlaniniGuncelle() {

        if (!hesapAlani) {
            return;
        }

        hesapAlani.textContent = "";

        var topUser = document.getElementById("topUser");
        var topEmail = document.getElementById("topUserEmail");
        var cikis = document.getElementById("logoutButton");

        var girisYapmis =
            topUser &&
            window.getComputedStyle(topUser).display !== "none";

        var satir = eleman("div", "ou-hesap-satir");

        if (girisYapmis) {

            satir.appendChild(
                eleman(
                    "span",
                    null,
                    "Hesabım: " + (topEmail ? topEmail.textContent : "")
                )
            );

            var cikisDugmesi = eleman("button", null, "Çıkış Yap");
            cikisDugmesi.type = "button";

            cikisDugmesi.addEventListener("click", function () {

                if (cikis) {
                    cikis.click();
                }

                panelKapat(false);
            });

            satir.appendChild(cikisDugmesi);

        } else {

            var giris = eleman("a", null, "Giriş Yap");
            giris.href = "giris.html";

            satir.appendChild(giris);
        }

        hesapAlani.appendChild(satir);
    }


    function hesapIzle() {

        hesapAlaniniGuncelle();

        if (!window.MutationObserver) {
            return;
        }

        var gozlemci = new MutationObserver(hesapAlaniniGuncelle);

        var topUser = document.getElementById("topUser");
        var topEmail = document.getElementById("topUserEmail");

        if (topUser) {
            gozlemci.observe(topUser, {
                attributes: true,
                attributeFilter: ["style"]
            });
        }

        if (topEmail) {
            gozlemci.observe(topEmail, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
    }


    /* =====================================================
       BAŞLAT
    ===================================================== */

    function baslat() {

        temaDugmesi = document.getElementById("ouTemaDugme");
        acDugmesi = document.getElementById("ouPanelAc");

        if (temaDugmesi) {
            temaDugmesi.addEventListener("click", temaDegistir);
        }

        temaUygula(temaOku());

        panelOlustur();

        if (acDugmesi) {
            acDugmesi.addEventListener("click", function () {

                if (panelAcikMi()) {
                    panelKapat(true);
                } else {
                    panelAc();
                }
            });
        }

        hesapIzle();
    }


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", baslat);
    } else {
        baslat();
    }

})();
