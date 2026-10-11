/* =========================================================
   OKUL USTASI - ANASAYFA EKLERI (anasayfa-ek.js)
   Gunluk calisma (seri), bildirim dugmesi, kisayollar, hizli erisim, ornek icerik kartlari, takvim ve sohbet ozeti.
   anasayfa.html'in kendi scriptinden SONRA yuklenir ve onun
   `supabaseClient` degiskenini kullanir (ikinci bir istemci olusturmaz).
   Tum veri guvenligi Supabase RLS ile saglanir; buradaki kontroller
   yalnizca arayuz icindir.
========================================================= */

(function () {

    "use strict";

    var kok = document.getElementById("ynAnasayfaEk");

    if (!kok || typeof supabaseClient === "undefined") {
        return;
    }

    /* ----- Site bolumleri: kisayol secenekleri ve hizli erisim ----- */

    var BOLUMLER = [
        { ad: "Matematik",     hedef: "konu-videolari.html#Matematik",     bilgi: "Konu videoları" },
        { ad: "Fen Bilimleri", hedef: "konu-videolari.html#Fen%20Bilimleri", bilgi: "Konu videoları" },
        { ad: "Türkçe",        hedef: "konu-videolari.html#T%C3%BCrk%C3%A7e", bilgi: "Konu videoları" },
        { ad: "Konu Videoları", hedef: "konu-videolari.html",               bilgi: "Tüm dersler" },
        { ad: "Ders Soruları", hedef: "ders-sorulari.html",          bilgi: "Soru sor, cevap al" },
        { ad: "Ödev Yardımı",  hedef: "odev-yardimi.html",             bilgi: "Ödev soruları" },
        { ad: "Genel Sorular", hedef: "genel-sorular.html",          bilgi: "Genel sorular ve tartışma" },
        { ad: "Duyurular",     hedef: "duyurular.html",             bilgi: "Okul duyuruları" },
        { ad: "Neler Oldu?",   hedef: "neler-oldu.html",               bilgi: "Okulda olanlar" },
        { ad: "Bildirimler",   hedef: "bildirimler.html",           bilgi: "Bildirimlerin" },
        { ad: "Takvim",        hedef: "takvim.html",                bilgi: "Kişisel takvimin" },
        { ad: "Sohbet",        hedef: "sohbet.html",                bilgi: "Arkadaşlarınla yaz" }
    ];

    /* ----- Basit SVG ikonlar (emoji yok) ----- */

    var IKONLAR = {
        arti:  '<path d="M12 5v14M5 12h14"/>',
        cop:   '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
        yukari:'<path d="M6 15l6-6 6 6"/>',
        asagi: '<path d="M6 9l6 6 6-6"/>',
        kalem: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/>'
    };

    function ikon(ad) {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "yn-ikon");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML = IKONLAR[ad];
        return svg;
    }

    function el(tag, sinif, metin) {
        var e = document.createElement(tag);
        if (sinif) { e.className = sinif; }
        if (metin !== undefined) { e.textContent = metin; }
        return e;
    }

    function kutu(baslik) {
        var k = el("section", "yn-kutu");
        var ust = el("div", "yn-baslik-satir");
        ust.appendChild(el("h2", null, baslik));
        k.appendChild(ust);
        return { kutu: k, ust: ust };
    }

    function kart(ad, bilgi, hedef) {
        var a = el("a", "yn-kart");
        a.href = hedef;
        a.appendChild(el("strong", null, ad));
        if (bilgi) { a.appendChild(el("span", null, bilgi)); }
        return a;
    }

    function bos(metin) {
        return el("div", "yn-bos", metin);
    }


    /* =====================================================
       KISAYOLLAR
    ===================================================== */

    var kisayolKutusu = kutu("Kısayollarım");
    var kisayolIcerik = el("div");
    var kisayollar = [];
    var kullaniciId = null;
    var kisayolYukleSirasi = 0;
    var kisayolIslemde = false;

    var ekleDugme = el("button", "yn-btn kucuk");
    ekleDugme.type = "button";
    ekleDugme.appendChild(ikon("arti"));
    ekleDugme.appendChild(document.createTextNode("Kısayol ekle"));
    kisayolKutusu.ust.appendChild(ekleDugme);

    var form = el("div", "yn-ekle-form");
    var secAlan = el("div", "yn-alan");
    var secEtiket = el("label", null, "Bölüm");
    secEtiket.setAttribute("for", "ynKisayolSec");
    var sec = el("select");
    sec.id = "ynKisayolSec";
    BOLUMLER.forEach(function (b, i) {
        var o = el("option", null, b.ad);
        o.value = String(i);
        sec.appendChild(o);
    });
    secAlan.appendChild(secEtiket);
    secAlan.appendChild(sec);

    var adAlan = el("div", "yn-alan");
    var adEtiket = el("label", null, "Kısayol adı (isteğe bağlı)");
    adEtiket.setAttribute("for", "ynKisayolAd");
    var adGirdi = el("input");
    adGirdi.type = "text";
    adGirdi.id = "ynKisayolAd";
    adGirdi.maxLength = 30;
    adAlan.appendChild(adEtiket);
    adAlan.appendChild(adGirdi);

    var formSatir = el("div", "yn-satir");
    var kaydet = el("button", "yn-btn", "Ekle");
    kaydet.type = "button";
    var vazgec = el("button", "yn-btn ikincil", "Vazgeç");
    vazgec.type = "button";
    formSatir.appendChild(kaydet);
    formSatir.appendChild(vazgec);

    var kisayolMesaj = el("div", "yn-mesaj");
    kisayolMesaj.setAttribute("role", "status");

    form.appendChild(secAlan);
    form.appendChild(adAlan);
    form.appendChild(formSatir);

    kisayolKutusu.kutu.appendChild(kisayolIcerik);
    kisayolKutusu.kutu.appendChild(form);
    kisayolKutusu.kutu.appendChild(kisayolMesaj);

    function kisayolMesajYaz(metin, hata) {
        kisayolMesaj.textContent = metin || "";
        kisayolMesaj.className = "yn-mesaj" + (metin ? (hata ? " hata" : " ok") : "");
    }

    ekleDugme.addEventListener("click", function () {
        form.classList.toggle("acik");
        kisayolMesajYaz("");
    });

    vazgec.addEventListener("click", function () {
        form.classList.remove("acik");
        adGirdi.value = "";
    });

    function aracDugme(ikonAdi, etiket, tikla, pasif) {
        var b = el("button", "yn-mini");
        b.type = "button";
        b.setAttribute("aria-label", etiket);
        b.title = etiket;
        b.appendChild(ikon(ikonAdi));
        b.disabled = !!pasif;
        b.addEventListener("click", tikla);
        return b;
    }

    function kisayollariCiz() {

        kisayolIcerik.textContent = "";

        if (!kullaniciId) {
            kisayolIcerik.appendChild(bos("Kısayol eklemek için giriş yap."));
            ekleDugme.style.display = "none";
            form.classList.remove("acik");
            return;
        }

        ekleDugme.style.display = "";

        if (kisayollar.length === 0) {
            kisayolIcerik.appendChild(bos("Henüz kısayolun yok. \"Kısayol ekle\" ile başla."));
            return;
        }

        var grid = el("div", "yn-grid");

        kisayollar.forEach(function (k, i) {

            var sar = el("div", "yn-kisayol-sar");
            sar.appendChild(kart(k.title, null, k.target));

            var araclar = el("div", "yn-kisayol-araclar");
            araclar.appendChild(aracDugme("yukari", "Yukarı taşı", function () { tasi(i, -1); }, i === 0));
            araclar.appendChild(aracDugme("asagi", "Aşağı taşı", function () { tasi(i, 1); }, i === kisayollar.length - 1));
            araclar.appendChild(aracDugme("kalem", "Adı değiştir", function () { adDegistir(k); }));
            araclar.appendChild(aracDugme("cop", "Sil", function () { sil(k); }));
            sar.appendChild(araclar);

            grid.appendChild(sar);
        });

        kisayolIcerik.appendChild(grid);
    }

    async function kisayollariYukle() {

        var sira = ++kisayolYukleSirasi;

        if (!kullaniciId) {
            kisayollar = [];
            kisayollariCiz();
            return;
        }

        /* RLS yalnizca kullanicinin kendi satirlarini dondurur. */
        var r = await supabaseClient
            .from("user_shortcuts")
            .select("id, title, target, position")
            .order("position", { ascending: true })
            .order("created_at", { ascending: true });

        if (sira !== kisayolYukleSirasi) { return; }

        if (r.error) {
            console.error(r.error);
            kisayolIcerik.textContent = "Kısayollar yüklenemedi.";
            return;
        }

        kisayollar = r.data || [];
        kisayollariCiz();
    }

    kaydet.addEventListener("click", async function () {

        if (kisayolIslemde || !kullaniciId) { return; }

        var b = BOLUMLER[Number(sec.value)];
        var ad = adGirdi.value.trim() || b.ad;

        kisayolIslemde = true;
        kaydet.disabled = true;

        var r = await supabaseClient.from("user_shortcuts").insert({
            title: ad,
            target: b.hedef,
            position: kisayollar.length
        });

        kisayolIslemde = false;
        kaydet.disabled = false;

        if (r.error) {
            var cift = r.error.code === "23505";
            kisayolMesajYaz(cift ? "Bu bölüm için zaten bir kısayolun var." : "Eklenemedi: " + r.error.message, true);
            return;
        }

        adGirdi.value = "";
        form.classList.remove("acik");
        kisayolMesajYaz("");
        await kisayollariYukle();
    });

    async function sil(k) {

        if (kisayolIslemde) { return; }
        if (!window.confirm("\"" + k.title + "\" kısayolu silinsin mi?")) { return; }

        kisayolIslemde = true;
        var r = await supabaseClient.from("user_shortcuts").delete().eq("id", k.id);
        kisayolIslemde = false;

        if (r.error) {
            kisayolMesajYaz("Silinemedi: " + r.error.message, true);
            return;
        }

        await kisayollariYukle();
    }

    async function adDegistir(k) {

        if (kisayolIslemde) { return; }

        var yeni = window.prompt("Kısayol adı (en fazla 30 karakter):", k.title);

        if (yeni === null) { return; }

        yeni = yeni.trim();

        if (!yeni || yeni.length > 30) {
            kisayolMesajYaz("Ad 1-30 karakter olmalı.", true);
            return;
        }

        kisayolIslemde = true;
        var r = await supabaseClient.from("user_shortcuts").update({ title: yeni }).eq("id", k.id);
        kisayolIslemde = false;

        if (r.error) {
            kisayolMesajYaz("Güncellenemedi: " + r.error.message, true);
            return;
        }

        await kisayollariYukle();
    }

    async function tasi(i, yon) {

        var j = i + yon;

        if (kisayolIslemde || j < 0 || j >= kisayollar.length) { return; }

        var kopya = kisayollar.slice();
        var t = kopya[i];
        kopya[i] = kopya[j];
        kopya[j] = t;

        kisayolIslemde = true;
        var r = await supabaseClient.rpc("kisayol_sirala", {
            p_idler: kopya.map(function (x) { return x.id; })
        });
        kisayolIslemde = false;

        if (r.error) {
            kisayolMesajYaz("Sıralanamadı: " + r.error.message, true);
            return;
        }

        await kisayollariYukle();
    }


    /* =====================================================
       HIZLI ERISIM (sabit bolum listesi)
    ===================================================== */

    var hizli = kutu("Hızlı erişim");
    var hizliGrid = el("div", "yn-grid");

    ["Ders Soruları", "Ödev Yardımı", "Konu Videoları", "Duyurular", "Takvim", "Sohbet"].forEach(function (ad) {
        var b = BOLUMLER.filter(function (x) { return x.ad === ad; })[0];
        hizliGrid.appendChild(kart(b.ad, b.bilgi, b.hedef));
    });

    hizli.kutu.appendChild(hizliGrid);


    /* =====================================================
       ORNEK ICERIKLER (mevcut verilerden)
    ===================================================== */

    var konularKutu = kutu("Konulardan örnekler");
    konularKutu.ust.appendChild(
        (function () {
            var a = el("a", "yn-btn ikincil kucuk", "Tüm konular");
            a.href = "konu-videolari.html";
            return a;
        })()
    );
    var konularIcerik = el("div", "yn-grid");
    konularKutu.kutu.appendChild(konularIcerik);

    var duyuruKutu = kutu("Son duyurular");
    duyuruKutu.ust.appendChild(
        (function () {
            var a = el("a", "yn-btn ikincil kucuk", "Tüm duyurular");
            a.href = "duyurular.html";
            return a;
        })()
    );
    var duyuruIcerik = el("div", "yn-grid");
    duyuruKutu.kutu.appendChild(duyuruIcerik);

    function tarihMetni(t) {
        if (!t) { return ""; }
        var p = String(t).split("-");
        return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : t;
    }

    function kisalt(m, n) {
        m = m || "";
        return m.length > n ? m.slice(0, n - 1).trim() + "..." : m;
    }

    async function konulariYukle() {

        /* Mevcut RPC: konu_videolarini_getir(p_ders). Veri tekrar tutulmaz. */
        var r = await supabaseClient.rpc("konu_videolarini_getir", { p_ders: "Matematik" });

        konularIcerik.textContent = "";

        if (r.error || !r.data || r.data.length === 0) {
            konularIcerik.parentNode.replaceChild(
                bos(r.error ? "Konular şu anda yüklenemiyor." : "Henüz konu videosu eklenmemiş."),
                konularIcerik
            );
            return;
        }

        r.data.slice(0, 4).forEach(function (v) {
            konularIcerik.appendChild(
                kart(v.baslik, kisalt(v.konu_adi || v.aciklama || v.ders, 70), "konu-videolari.html#" + encodeURIComponent(v.ders))
            );
        });
    }

    async function duyurulariYukle() {

        /* Mevcut RPC: duyurulari_getir() */
        var r = await supabaseClient.rpc("duyurulari_getir");

        duyuruIcerik.textContent = "";

        if (r.error || !r.data || r.data.length === 0) {
            duyuruIcerik.parentNode.replaceChild(
                bos(r.error ? "Duyurular şu anda yüklenemiyor." : "Henüz duyuru yok."),
                duyuruIcerik
            );
            return;
        }

        r.data.slice(0, 3).forEach(function (d) {
            duyuruIcerik.appendChild(
                kart(d.baslik, tarihMetni(d.tarih) + " - " + kisalt(d.aciklama, 60), "duyurular.html")
            );
        });
    }


    /* =====================================================
       TAKVIM OZETI ve SOHBET OZETI (yalnizca giris yapmis kullanici)
    ===================================================== */

    var takvimKutu = kutu("Yaklaşan etkinliklerim");
    takvimKutu.ust.appendChild(
        (function () {
            var a = el("a", "yn-btn ikincil kucuk", "Takvimi aç");
            a.href = "takvim.html";
            return a;
        })()
    );
    var takvimIcerik = el("div", "yn-grid");
    takvimKutu.kutu.appendChild(takvimIcerik);

    var sohbetKutu = kutu("Sohbetlerim");
    sohbetKutu.ust.appendChild(
        (function () {
            var a = el("a", "yn-btn ikincil kucuk", "Sohbete git");
            a.href = "sohbet.html";
            return a;
        })()
    );
    var sohbetIcerik = el("div", "yn-grid");
    sohbetKutu.kutu.appendChild(sohbetIcerik);

    async function ozetleriYukle() {

        takvimIcerik.textContent = "";
        sohbetIcerik.textContent = "";

        if (!kullaniciId) {
            takvimKutu.kutu.style.display = "none";
            sohbetKutu.kutu.style.display = "none";
            return;
        }

        takvimKutu.kutu.style.display = "";
        sohbetKutu.kutu.style.display = "";

        var t = await supabaseClient
            .from("calendar_events")
            .select("id, title, start_time")
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(3);

        takvimIcerik.textContent = "";

        if (t.error || !t.data || t.data.length === 0) {
            takvimIcerik.appendChild(bos(t.error ? "Takvim yüklenemedi." : "Yaklaşan etkinliğin yok."));
        } else {
            t.data.forEach(function (e) {
                var zaman = new Date(e.start_time).toLocaleString("tr-TR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                });
                takvimIcerik.appendChild(kart(e.title, zaman, "takvim.html"));
            });
        }

        var s = await supabaseClient.rpc("sohbetlerim");

        sohbetIcerik.textContent = "";

        if (s.error || !s.data || s.data.length === 0) {
            sohbetIcerik.appendChild(bos(s.error ? "Sohbetler yüklenemedi." : "Henüz sohbetin yok."));
        } else {
            s.data.slice(0, 3).forEach(function (x) {
                sohbetIcerik.appendChild(kart(x.diger_kullanici, kisalt(x.son_mesaj || "Henüz mesaj yok", 50), "sohbet.html"));
            });
        }
    }


    /* =====================================================
       GUNLUK CALISMA (seri) - mevcut RPC: calisma_ozeti()
       Gun ve seri hesabi SUNUCUDA yapilir; burada yalnizca gosterilir.
       Siteyi acmak seriye sayilmaz: seri, test cevap kayitlarindan
       (en az 10 FARKLI soru) hesaplanir.
    ===================================================== */

    var SERI_MIN_SORU = 10;   /* SQL'deki c_seri_min ile ayni olmali */

    var calismaKutu = kutu("Günlük çalışma");
    var calismaLink = el("a", "yn-btn ikincil kucuk", "Ayrıntılar");
    calismaLink.href = "profil.html";
    calismaKutu.ust.appendChild(calismaLink);
    var calismaIcerik = el("div");
    calismaKutu.kutu.appendChild(calismaIcerik);
    var calismaSirasi = 0;

    function istatistik(deger, etiket, tamam) {
        var k = el("div", "cl-stat" + (tamam ? " tamam" : ""));
        k.appendChild(el("strong", null, String(deger)));
        k.appendChild(el("span", null, etiket));
        return k;
    }

    async function calismayiYukle() {

        var sira = ++calismaSirasi;

        if (!kullaniciId) {
            calismaLink.style.display = "none";
            calismaIcerik.textContent = "";
            var g = bos("Günlük serini görmek için ");
            var gl = el("a", null, "giriş yap");
            gl.href = "giris.html";
            g.appendChild(gl);
            g.appendChild(document.createTextNode("."));
            calismaIcerik.appendChild(g);
            return;
        }

        calismaLink.style.display = "";

        var r = await supabaseClient.rpc("calisma_ozeti");

        if (sira !== calismaSirasi) { return; }

        calismaIcerik.textContent = "";

        var o = r.data ? (Array.isArray(r.data) ? r.data[0] : r.data) : null;

        if (r.error || !o) {
            if (r.error) { console.error(r.error); }
            calismaIcerik.appendChild(bos("Günlük çalışma bilgisi şu anda yüklenemiyor."));
            return;
        }

        var hedef = Number(o.hedef) || 0;
        var bugun = Number(o.bugun_soru) || 0;
        var seri = Number(o.seri) || 0;
        var tamam = o.seri_bugun_tamam === true;
        var kalan = Math.max(0, SERI_MIN_SORU - bugun);
        var yuzde = hedef > 0 ? Math.min(100, Math.round(bugun / hedef * 100)) : 0;

        var kutular = el("div", "cl-ozet");
        kutular.appendChild(istatistik(seri, "gün üst üste", tamam));
        kutular.appendChild(istatistik(bugun, "bugün çözülen farklı soru", false));
        kutular.appendChild(istatistik(tamam ? "Tamam" : bugun + " / " + SERI_MIN_SORU, "bugünkü seri şartı", tamam));
        calismaIcerik.appendChild(kutular);

        var satir = el("div", "cl-hedef-satir");
        satir.appendChild(el("strong", null, "Günlük hedef: " + bugun + " / " + hedef + " soru"));
        satir.appendChild(el("span", "yn-soluk", "%" + yuzde));
        calismaIcerik.appendChild(satir);

        var cubuk = el("div", "cl-cubuk");
        cubuk.setAttribute("role", "progressbar");
        cubuk.setAttribute("aria-valuemin", "0");
        cubuk.setAttribute("aria-valuemax", "100");
        cubuk.setAttribute("aria-valuenow", String(yuzde));
        cubuk.setAttribute("aria-label", "Günlük hedef ilerlemesi");
        var dolu = el("div", "cl-dolu");
        dolu.style.width = yuzde + "%";
        cubuk.appendChild(dolu);
        calismaIcerik.appendChild(cubuk);

        var durum;
        if (tamam) {
            durum = "Bugünün seri şartı tamam. Yarın da en az " + SERI_MIN_SORU + " farklı soru çözerek devam et.";
        } else if (seri > 0) {
            durum = "Serin sürüyor. Bugün sayılması için " + kalan + " farklı soru daha çözmen gerekiyor.";
        } else {
            durum = "Seri başlatmak için bugün en az " + SERI_MIN_SORU + " farklı soru çöz" +
                    (bugun > 0 ? " (" + kalan + " soru kaldı)." : ".");
        }
        calismaIcerik.appendChild(el("p", "cl-not", durum));

        var git = el("div", "yn-satir");
        var testBtn = el("a", "yn-btn", "Test çöz");
        testBtn.href = "test.html";
        git.appendChild(testBtn);
        calismaIcerik.appendChild(git);
    }


    /* =====================================================
       BILDIRIM DUGMESI (ust menu) - mevcut RPC: okunmamis_bildirim_sayisi()
       Gercek zamanli kanal yok: sayi sayfa acilinca ve sekmeye
       geri donulunce yenilenir.
    ===================================================== */

    var bildirimDugme = document.getElementById("ouBildirimDugme");
    var bildirimSayi = document.getElementById("ouBildirimSayi");
    var bildirimSirasi = 0;

    async function bildirimSayisiniYukle() {

        if (!bildirimDugme) { return; }

        var sira = ++bildirimSirasi;

        if (!kullaniciId) {
            bildirimDugme.hidden = true;
            return;
        }

        bildirimDugme.hidden = false;

        var r = await supabaseClient.rpc("okunmamis_bildirim_sayisi");

        if (sira !== bildirimSirasi) { return; }

        if (r.error) {
            console.error(r.error);
            return;
        }

        var n = Number(r.data || 0);

        bildirimDugme.classList.toggle("okunmamis", n > 0);
        bildirimSayi.textContent = n > 99 ? "99+" : (n > 0 ? String(n) : "");
        bildirimDugme.setAttribute(
            "aria-label",
            n > 0 ? "Bildirimler, " + n + " okunmamış" : "Bildirimler"
        );
    }

    function yenile() {
        if (!kullaniciId) { return; }
        bildirimSayisiniYukle();
        calismayiYukle();
    }

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) { yenile(); }
    });

    window.addEventListener("pageshow", function (olay) {
        if (olay.persisted) { yenile(); }
    });


    /* ----- Sayfaya yerlestir (mevcut tanitim kartinin altina) ----- */

    kok.appendChild(calismaKutu.kutu);
    kok.appendChild(kisayolKutusu.kutu);
    kok.appendChild(hizli.kutu);
    kok.appendChild(konularKutu.kutu);
    kok.appendChild(duyuruKutu.kutu);
    kok.appendChild(takvimKutu.kutu);
    kok.appendChild(sohbetKutu.kutu);

    kisayollariCiz();


    /* ----- Baslangic: herkese acik icerik bir kez, kullaniciya ozel veri oturuma gore ----- */

    konulariYukle();
    duyurulariYukle();

    function oturum(session) {

        var yeni = session && session.user ? session.user.id : null;

        /* TOKEN_REFRESHED gibi olaylar ayni kullanici icin yeniden yuklemesin. */
        if (yeni === kullaniciId && kisayolYukleSirasi > 0) {
            return;
        }

        kullaniciId = yeni;
        kisayollariYukle();
        ozetleriYukle();
        calismayiYukle();
        bildirimSayisiniYukle();
    }

    supabaseClient.auth.getSession().then(function (r) {
        oturum(r.data.session);
    });

    supabaseClient.auth.onAuthStateChange(function (olay, session) {
        oturum(session);
    });

})();
