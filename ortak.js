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

    /* Windows uygulamasının (Electron) içinde miyiz? İçindeysek "Uygulamayı İndir" gösterilmez. */
    var uygulamaIcinde = /Electron/i.test(navigator.userAgent);


    /* -----------------------------------------------------
       PANEL BAĞLANTILARI
       Dosya adları mevcut sayfalarla birebir aynıdır.
    ----------------------------------------------------- */

    var BAGLANTILAR = [
        { ad: "Anasayfa",      dosya: "anasayfa.html",     ikon: "ev" },
        { ad: "Ders Yardımı",  dosya: "ders-yardimi.html", ikon: "kitap" },
        { ad: "Ödev",          dosya: "odev-soru.html",    ikon: "kalem" },
        { ad: "Soru ve Konu",  dosya: "soru-olustur.html", ikon: "soru" },
        { ad: "Konular",       dosya: "konular.html",      ikon: "liste" },
        { ad: "Testler",       dosya: "test.html",         ikon: "test" },
        { ad: "Duyurular",     dosya: "duyurular.html",    ikon: "duyuru" },
        { ad: "Bildirimler",   dosya: "bildirimler.html",  ikon: "zil" },
        { ad: "Olaylar",       dosya: "olaylar.html",      ikon: "bayrak" },
        { ad: "Takvim",        dosya: "takvim.html",       ikon: "takvim" },
        { ad: "Sohbet",        dosya: "sohbet.html",       ikon: "sohbet" },
        { ad: "Uygulamayı İndir", dosya: "uygulama/Okul-Ustasi.exe", ikon: "indir", indir: true }
    ];


    /* -----------------------------------------------------
       SVG İKONLAR (emoji yok; rengi yazı rengini izler)
       Sabit, güvenilir metinlerdir; kullanıcı verisi içermez.
    ----------------------------------------------------- */

    var IKONLAR = {
        ev:      '<path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6"/>',
        kitap:   '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6"/>',
        kalem:   '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3"/>',
        soru:    '<path d="M12 21a9 9 0 1 0-9-9c0 1.6.4 3 1.2 4.3L3 21l4.7-1.2A9 9 0 0 0 12 21zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5v.5"/>',
        liste:   '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
        test:    '<path d="M9 6h11M9 12h11M9 18h11M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
        duyuru:  '<path d="M4 10v4h3l7 4V6l-7 4zM17 9a4 4 0 0 1 0 6"/>',
        zil:     '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>',
        bayrak:  '<path d="M5 21V4M5 5h12l-2 4 2 4H5"/>',
        takvim:  '<path d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4"/>',
        sohbet:  '<path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5"/>',
        indir:   '<path d="M12 3v12M7 11l5 5 5-5M5 20h14"/>',
        profil:  '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
        ayar:    '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4"/>',
        kapat:   '<path d="M6 6l12 12M18 6L6 18"/>',
        ay:      '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
        gunes:   '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
    };


    function svgIkon(ad) {

        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("class", "ou-svg");
        svg.innerHTML = IKONLAR[ad] || "";

        return svg;
    }


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

        temaDugmesi.textContent = "";
        temaDugmesi.appendChild(svgIkon(koyu ? "gunes" : "ay"));

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
    var menuKutusu = null;
    var yoneticiBaglanti = null;


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

        kapatDugmesi = eleman("button", "ou-kapat");
        kapatDugmesi.appendChild(svgIkon("kapat"));
        kapatDugmesi.type = "button";
        kapatDugmesi.setAttribute("aria-label", "Menüyü kapat");

        ust.appendChild(kapatDugmesi);
        panel.appendChild(ust);

        /* ---- Bağlantılar ---- */

        var menu = eleman("div", "ou-menu");
        var simdi = mevcutDosya();

        BAGLANTILAR.forEach(function (b) {

            if (b.indir && uygulamaIcinde) {
                return;
            }

            var a = eleman("a");
            a.href = b.dosya;

            if (b.indir) {
                a.setAttribute("download", "");
            }

            var ikonKap = eleman("span", "ou-m-ikon");
            ikonKap.appendChild(svgIkon(b.ikon));
            a.appendChild(ikonKap);
            a.appendChild(eleman("span", null, b.ad));

            if (b.dosya === simdi) {
                a.className = "aktif";
                a.setAttribute("aria-current", "page");
            }

            menu.appendChild(a);
        });

        panel.appendChild(menu);
        menuKutusu = menu;

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
       YÖNETİCİ BAĞLANTISI
       Yalnızca sunucudaki is_admin() true dönerse görünür.
       (Gizli olması güvenlik değildir; asıl yetki sunucuda kontrol edilir.)
       Sayfanın kendi supabaseClient değişkenini kullanır; yoksa hiçbir şey yapmaz.
    ===================================================== */

    function yoneticiBaglantisiniGuncelle() {

        if (!menuKutusu || typeof supabaseClient === "undefined" ||
            !supabaseClient || !supabaseClient.auth) {
            return;
        }

        function kaldir() {
            if (yoneticiBaglanti) {
                yoneticiBaglanti.remove();
                yoneticiBaglanti = null;
            }
        }

        supabaseClient.auth.getSession().then(function (sonuc) {

            if (!sonuc.data || !sonuc.data.session) {
                kaldir();
                return null;
            }

            return supabaseClient.rpc("is_admin").then(function (cevap) {

                if (cevap.error || cevap.data !== true) {
                    kaldir();
                    return;
                }

                if (yoneticiBaglanti) {
                    return;
                }

                var a = eleman("a");
                a.href = "test-yonet.html";

                var ikonKap = eleman("span", "ou-m-ikon");
                ikonKap.appendChild(svgIkon("ayar"));
                a.appendChild(ikonKap);
                a.appendChild(eleman("span", null, "Soru yönetimi"));

                if (mevcutDosya() === "test-yonet.html") {
                    a.className = "aktif";
                    a.setAttribute("aria-current", "page");
                }

                menuKutusu.appendChild(a);
                yoneticiBaglanti = a;
            });

        }).catch(function () {});
    }

    function yoneticiBaglantisiniIzle() {

        yoneticiBaglantisiniGuncelle();

        if (typeof supabaseClient !== "undefined" && supabaseClient && supabaseClient.auth) {
            supabaseClient.auth.onAuthStateChange(function () {
                /* Callback içinde başka Supabase çağrısı beklenmesin diye ertele */
                window.setTimeout(yoneticiBaglantisiniGuncelle, 0);
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
        yoneticiBaglantisiniIzle();
    }


    /* Uygulama (PWA): service worker kaydı. Yalnızca https veya localhost'ta çalışır. */
    if ("serviceWorker" in navigator && !uygulamaIcinde) {
        window.addEventListener("load", function () {
            navigator.serviceWorker.register("sw.js").catch(function (hata) {
                console.error("Service worker kaydedilemedi:", hata);
            });
        });
    }


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", baslat);
    } else {
        baslat();
    }

})();
