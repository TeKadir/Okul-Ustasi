/* =========================================================
   OKUL USTASI - TESTLER (test.js)
   Kullanılan RPC'ler (hepsi herkese açık, giriş gerekmez):
   - test_ozet()      hangi seviye/ders/konuda kaç soru var
   - test_baslat()    rastgele soru getirir (doğru cevaplar GELMEZ)
   - test_kontrol()   cevapları gönderir, doğruları geri alır
   - is_admin()       sadece "Soru ekle / yönet" bağlantısını göstermek için
   Kurulum SQL'i: kurulum/test-sistemi.sql
========================================================= */

const SUPABASE_URL = "https://hinisayolrgyzcoztobi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_76n3XsryMfvfdYwKeUu6SA_TCxImZiW";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = function (id) { return document.getElementById(id); };

const SEVIYELER = [
    "5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf",
    "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Üniversite"
];

const KAYNAK_ADLARI = {
    internet: "İnternetten alınan",
    meb: "MEB çıkmış soru"
};

const ZORLUKLAR = ["kolay", "orta", "zor"];

const ZORLUK_ADLARI = {
    kolay: "Kolay",
    orta: "Orta",
    zor: "Zor"
};

const HARFLER = ["A", "B", "C", "D", "E"];
const ADETLER = [10, 20, 30];

/* Adres: test.html?seviye=8.%20Sınıf&ders=Matematik  (konular sayfasından gelince) */
const adresBilgisi = new URLSearchParams(location.search);
const istenenSeviye = adresBilgisi.get("seviye");
const istenenDers = adresBilgisi.get("ders");

let ozet = [];               /* test_ozet() satırları */
let seciliSeviye = null;
let seciliDers = null;
let seciliKonu = "";
let seciliKaynak = "";       /* "" = hepsi */
let seciliAdet = 20;
let seciliZorluk = "";       /* "" = hepsi */

let sorular = [];            /* çözülen test */
let cevaplar = {};           /* { soruId: "A" } */
let simdiki = 0;
let bitiriliyor = false;

let sonucListesi = [];
let sonucFiltresi = "hepsi";   /* hepsi | yanlis | anlamadim */

let girisliId = null;        /* oturum açan kullanıcı (yoksa null) */
let oturumId = null;         /* sunucudaki test oturumu (yalnızca giriş yapmışsa) */
let anlamadim = new Set();   /* "Anlamadım" işaretli soru numaraları */
let kazanilanXp = null;      /* son testten kazanılan XP (null = hesaplanmadı) */


/* ---------- yardımcılar ---------- */

function eleman(tag, sinif, metin) {

    const el = document.createElement(tag);

    if (sinif) {
        el.className = sinif;
    }

    if (metin !== undefined) {
        el.textContent = metin;
    }

    return el;
}

function mesajYaz(kutuId, metin, hata) {

    const el = $(kutuId);

    el.textContent = metin || "";
    el.className = "yn-mesaj" + (metin && hata ? " hata" : "");
}

function trSirala(liste) {

    return liste.sort(function (a, b) { return a.localeCompare(b, "tr"); });
}


/* ---------- üst çubuk ---------- */

function ustCubuk(session) {

    if (session && session.user) {
        $("topLoginLink").style.display = "none";
        $("topUser").style.display = "flex";
        $("topUserEmail").textContent = session.user.email || "";
    } else {
        $("topLoginLink").style.display = "inline-block";
        $("topUser").style.display = "none";
        $("topUserEmail").textContent = "";
    }
}

$("logoutButton").addEventListener("click", async function () {
    await supabaseClient.auth.signOut();
});


/* =========================================================
   1) SEÇİM EKRANI
========================================================= */

function seviyeSoruSayisi(seviye) {

    return ozet.reduce(function (toplam, r) {
        return r.seviye === seviye ? toplam + r.soru_sayisi : toplam;
    }, 0);
}

/* Büyük seçim düğmesi (seviye ve ders için) */
function secimDugmesi(ad, alt, secili, pasif, tikla) {

    const b = eleman("button", "ts-btn" + (secili ? " secili" : ""));

    b.type = "button";
    b.disabled = pasif;
    b.setAttribute("aria-pressed", secili ? "true" : "false");

    b.appendChild(eleman("strong", null, ad));
    b.appendChild(eleman("span", null, alt));

    b.addEventListener("click", tikla);

    return b;
}

/* Küçük yuvarlak düğme (kaynak ve soru sayısı için) */
function kucukSecim(metin, secili, pasif, tikla) {

    const b = eleman("button", "ts-chip" + (secili ? " secili" : ""), metin);

    b.type = "button";
    b.disabled = pasif;
    b.setAttribute("aria-pressed", secili ? "true" : "false");

    b.addEventListener("click", tikla);

    return b;
}

function seviyeleriCiz() {

    const kap = $("seviyeIzgara");
    kap.textContent = "";

    SEVIYELER.forEach(function (s) {

        const sayi = seviyeSoruSayisi(s);

        kap.appendChild(secimDugmesi(
            s,
            sayi > 0 ? sayi + " soru" : "Yakında",
            s === seciliSeviye,
            sayi === 0,
            function () { seviyeSec(s); }
        ));
    });
}

function seviyeSec(s) {

    seciliSeviye = s;
    seciliDers = null;
    seciliKonu = "";
    seciliKaynak = "";
    seciliZorluk = "";

    seviyeleriCiz();
    dersleriCiz();

    $("dersBolumu").style.display = "block";
    $("ayarBolumu").style.display = "none";
    mesajYaz("secimMesaj", "");

    /* Konular sayfasından ders seçilerek gelindiyse otomatik seç */
    if (istenenDers) {
        const dersVar = ozet.some(function (r) {
            return r.seviye === s && r.ders === istenenDers;
        });

        if (dersVar) {
            dersSec(istenenDers);
        }
    }
}

function dersleriCiz() {

    const kap = $("dersIzgara");
    kap.textContent = "";

    const sayilar = {};

    ozet.forEach(function (r) {
        if (r.seviye === seciliSeviye) {
            sayilar[r.ders] = (sayilar[r.ders] || 0) + r.soru_sayisi;
        }
    });

    trSirala(Object.keys(sayilar)).forEach(function (d) {

        kap.appendChild(secimDugmesi(
            d,
            sayilar[d] + " soru",
            d === seciliDers,
            false,
            function () { dersSec(d); }
        ));
    });
}

function dersSec(d) {

    seciliDers = d;
    seciliKonu = "";
    seciliKaynak = "";
    seciliZorluk = "";

    dersleriCiz();
    konulariDoldur();
    kaynaklariCiz();
    adetleriCiz();

    $("ayarBolumu").style.display = "block";
    mesajYaz("secimMesaj", "");
}

function konulariDoldur() {

    const sec = $("konuSec");
    sec.textContent = "";

    const sayilar = {};
    let toplam = 0;

    ozet.forEach(function (r) {
        if (r.seviye === seciliSeviye && r.ders === seciliDers) {
            toplam += r.soru_sayisi;
            if (r.konu) {
                sayilar[r.konu] = (sayilar[r.konu] || 0) + r.soru_sayisi;
            }
        }
    });

    const hepsi = eleman("option", null, "Tüm konular (" + toplam + ")");
    hepsi.value = "";
    sec.appendChild(hepsi);

    trSirala(Object.keys(sayilar)).forEach(function (k) {
        const o = eleman("option", null, k + " (" + sayilar[k] + ")");
        o.value = k;
        sec.appendChild(o);
    });

    sec.value = seciliKonu;
}

$("konuSec").addEventListener("change", function () {
    seciliKonu = this.value;
    kaynaklariCiz();
});

/* Seçili seviye/ders/konuya uyan özet satırı mı? (kaynak ve zorluk filtreleri ayrı verilir)
   Eski veritabanında zorluk sütunu yoksa satır "orta" sayılır. */
function ozetSatiriUygunMu(r, kaynakFiltresi, zorlukFiltresi) {

    const zorluk = ZORLUKLAR.includes(r.zorluk) ? r.zorluk : "orta";

    return r.seviye === seciliSeviye &&
        r.ders === seciliDers &&
        (!seciliKonu || r.konu === seciliKonu) &&
        (!kaynakFiltresi || r.kaynak === kaynakFiltresi) &&
        (!zorlukFiltresi || zorluk === zorlukFiltresi);
}

function kaynaklariCiz() {

    const sayi = { internet: 0, meb: 0 };

    ozet.forEach(function (r) {
        if (ozetSatiriUygunMu(r, "", seciliZorluk)) {
            sayi[r.kaynak] = (sayi[r.kaynak] || 0) + r.soru_sayisi;
        }
    });

    const toplam = sayi.internet + sayi.meb;

    if (seciliKaynak && !sayi[seciliKaynak]) {
        seciliKaynak = "";
    }

    const kap = $("kaynakDugmeleri");
    kap.textContent = "";

    [
        ["", "Hepsi", toplam],
        ["internet", KAYNAK_ADLARI.internet, sayi.internet],
        ["meb", KAYNAK_ADLARI.meb, sayi.meb]
    ].forEach(function (k) {

        kap.appendChild(kucukSecim(
            k[1] + " (" + k[2] + ")",
            seciliKaynak === k[0],
            k[2] === 0,
            function () {
                seciliKaynak = k[0];
                kaynaklariCiz();
            }
        ));
    });

    zorluklariCiz();
}

function zorluklariCiz() {

    const sayi = { kolay: 0, orta: 0, zor: 0 };

    ozet.forEach(function (r) {
        if (ozetSatiriUygunMu(r, seciliKaynak, "")) {
            const z = ZORLUKLAR.includes(r.zorluk) ? r.zorluk : "orta";
            sayi[z] += r.soru_sayisi;
        }
    });

    /* Seçili zorlukta soru kalmadıysa "Hepsi"ne dön ve kaynak sayılarını yenile */
    if (seciliZorluk && !sayi[seciliZorluk]) {
        seciliZorluk = "";
        kaynaklariCiz();
        return;
    }

    const toplam = sayi.kolay + sayi.orta + sayi.zor;

    const kap = $("zorlukDugmeleri");
    kap.textContent = "";

    [["", "Hepsi", toplam]].concat(
        ZORLUKLAR.map(function (z) { return [z, ZORLUK_ADLARI[z], sayi[z]]; })
    ).forEach(function (k) {

        kap.appendChild(kucukSecim(
            k[1] + " (" + k[2] + ")",
            seciliZorluk === k[0],
            k[2] === 0,
            function () {
                seciliZorluk = k[0];
                kaynaklariCiz();
            }
        ));
    });

    const uygun = seciliZorluk ? sayi[seciliZorluk] : toplam;

    $("uygunNot").textContent =
        "Seçimine uyan " + uygun + " soru var; test en fazla " +
        Math.min(seciliAdet, uygun) + " soru içerir.";
}

function adetleriCiz() {

    const kap = $("adetDugmeleri");
    kap.textContent = "";

    ADETLER.forEach(function (a) {

        kap.appendChild(kucukSecim(
            a + " soru",
            a === seciliAdet,
            false,
            function () {
                seciliAdet = a;
                adetleriCiz();
                kaynaklariCiz();
            }
        ));
    });
}

async function ozetYukle() {

    const { data, error } = await supabaseClient.rpc("test_ozet");

    if (error) {
        console.error(error);
        mesajYaz("secimMesaj", "Testler yüklenemedi: " + error.message, true);
        return;
    }

    ozet = data || [];

    seviyeleriCiz();

    if (ozet.length === 0) {
        mesajYaz("secimMesaj", "Henüz test eklenmemiş.");
        return;
    }

    if (istenenSeviye && SEVIYELER.includes(istenenSeviye) && seviyeSoruSayisi(istenenSeviye) > 0) {
        seviyeSec(istenenSeviye);
    } else if (istenenDers) {
        mesajYaz("secimMesaj", istenenDers + " testleri için önce seviyeni seç.");
    }
}


/* =========================================================
   2) TEST EKRANI
========================================================= */

function cevapSayisi() {

    return sorular.filter(function (s) { return cevaplar[s.id]; }).length;
}

function ekranGoster(hangisi) {

    $("secimAlani").style.display = hangisi === "secim" ? "block" : "none";
    $("testAlani").style.display = hangisi === "test" ? "block" : "none";
    $("sonucAlani").style.display = hangisi === "sonuc" ? "block" : "none";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function testiBaslat() {

    if (!seciliSeviye || !seciliDers) {
        return;
    }

    $("baslatBtn").disabled = true;
    $("yeniTestBtn").disabled = true;
    mesajYaz("secimMesaj", "Test hazırlanıyor...");

    const parametreler = {
        p_seviye: seciliSeviye,
        p_ders: seciliDers,
        p_konu: seciliKonu || null,
        p_kaynak: seciliKaynak || null,
        p_adet: seciliAdet
    };

    /* Yalnızca seçildiyse gönderilir: zorluk SQL'i henüz kurulmadıysa test yine çalışır */
    if (ZORLUKLAR.includes(seciliZorluk)) {
        parametreler.p_zorluk = seciliZorluk;
    }

    const { data, error } = await supabaseClient.rpc("test_baslat", parametreler);

    $("baslatBtn").disabled = false;
    $("yeniTestBtn").disabled = false;

    if (error) {
        console.error(error);
        ekranGoster("secim");
        mesajYaz("secimMesaj", "Test başlatılamadı: " + error.message, true);
        return;
    }

    if (!data || data.length === 0) {
        ekranGoster("secim");
        mesajYaz("secimMesaj", "Bu seçim için soru bulunamadı.", true);
        return;
    }

    sorular = data;
    cevaplar = {};
    simdiki = 0;
    oturumId = data[0].oturum_id || null;
    kazanilanXp = null;

    mesajYaz("secimMesaj", "");
    mesajYaz("testMesaj", "");

    numaralariOlustur();
    soruyuCiz();
    ekranGoster("test");
}

function numaralariOlustur() {

    const kap = $("tsNav");
    kap.textContent = "";

    sorular.forEach(function (s, i) {

        const b = eleman("button", "ts-no", String(i + 1));
        b.type = "button";
        b.setAttribute("aria-label", (i + 1) + ". soruya git");

        b.addEventListener("click", function () {
            simdiki = i;
            soruyuCiz();
        });

        kap.appendChild(b);
    });
}

function soruyuCiz() {

    const s = sorular[simdiki];

    $("tsSayac").textContent =
        "Soru " + (simdiki + 1) + " / " + sorular.length +
        "  •  Cevaplanan: " + cevapSayisi();

    $("tsDolu").style.width =
        Math.round(cevapSayisi() / sorular.length * 100) + "%";

    /* Numara düğmeleri */
    const numaralar = $("tsNav").children;

    for (let i = 0; i < numaralar.length; i++) {

        numaralar[i].className =
            "ts-no" +
            (cevaplar[sorular[i].id] ? " cevapli" : "") +
            (anlamadim.has(sorular[i].id) ? " anlamadim" : "") +
            (i === simdiki ? " aktif" : "");
    }

    /* Rozetler: kaynak, not, konu */
    const rozet = $("tsRozet");
    rozet.textContent = "";
    rozet.appendChild(eleman("span", "ts-rozet", KAYNAK_ADLARI[s.kaynak] || s.kaynak));

    if (s.kaynak_not) {
        rozet.appendChild(eleman("span", "ts-rozet", s.kaynak_not));
    }

    if (s.konu) {
        rozet.appendChild(eleman("span", "ts-rozet", s.konu));
    }

    if (ZORLUK_ADLARI[s.zorluk]) {
        rozet.appendChild(eleman("span", "ts-rozet", ZORLUK_ADLARI[s.zorluk]));
    }

    const isaretli = anlamadim.has(s.id);

    $("anlamadimBtn").setAttribute("aria-pressed", isaretli ? "true" : "false");
    $("anlamadimBtn").textContent = isaretli ? "Anlamadım (işaretli)" : "Anlamadım";

    $("tsSoru").textContent = s.soru;

    /* Şıklar: düğme */
    const siklar = $("tsSiklar");
    siklar.textContent = "";

    HARFLER.forEach(function (h) {

        const metin = s["sec_" + h.toLowerCase()];

        if (!metin) {
            return;
        }

        const secili = cevaplar[s.id] === h;
        const b = eleman("button", "ts-sik" + (secili ? " secili" : ""));

        b.type = "button";
        b.setAttribute("aria-pressed", secili ? "true" : "false");

        b.appendChild(eleman("span", "ts-harf", h));
        b.appendChild(eleman("span", "ts-metin", metin));

        b.addEventListener("click", function () {

            if (cevaplar[s.id] === h) {
                delete cevaplar[s.id];      /* aynı şıka tekrar basınca seçim kalkar */
            } else {
                cevaplar[s.id] = h;
            }

            soruyuCiz();
        });

        siklar.appendChild(b);
    });

    $("oncekiBtn").disabled = simdiki === 0;
    $("sonrakiBtn").textContent =
        simdiki === sorular.length - 1 ? "Testi bitir" : "Sonraki";
}

$("oncekiBtn").addEventListener("click", function () {

    if (simdiki > 0) {
        simdiki--;
        soruyuCiz();
    }
});

$("sonrakiBtn").addEventListener("click", function () {

    if (simdiki < sorular.length - 1) {
        simdiki++;
        soruyuCiz();
    } else {
        testiBitir();
    }
});

$("bitirUstBtn").addEventListener("click", testiBitir);


/* =========================================================
   "ANLAMADIM" VE XP  (giriş yapmış kullanıcılar için)
   Hepsi sunucu fonksiyonlarıdır; kaydı RLS/SQL tarafı yapar.
========================================================= */

async function anlamadimAyarla(soruId, yeni, mesajKutusu) {

    const { error } = await supabaseClient.rpc("anlamadim_ayarla", {
        p_soru_id: soruId,
        p_isaretli: yeni
    });

    if (error) {
        console.error(error);
        mesajYaz(mesajKutusu, "İşaret kaydedilemedi: " + error.message, true);
        return false;
    }

    if (yeni) {
        anlamadim.add(soruId);
    } else {
        anlamadim.delete(soruId);
    }

    mesajYaz(mesajKutusu, "");
    return true;
}

async function anlamadimDegistir() {

    if (!girisliId) {
        mesajYaz("testMesaj", "Anlamadım işareti için giriş yapmalısın.", true);
        return;
    }

    const s = sorular[simdiki];

    if (!s) {
        return;
    }

    $("anlamadimBtn").disabled = true;

    await anlamadimAyarla(s.id, !anlamadim.has(s.id), "testMesaj");

    $("anlamadimBtn").disabled = false;

    if (sorular[simdiki]) {
        soruyuCiz();
    }
}

async function anlamadimYukle() {

    const { data, error } = await supabaseClient.rpc("anlamadim_idleri");

    if (error) {
        /* SQL henüz kurulmadıysa test yine de çalışsın */
        console.error(error);
        return;
    }

    anlamadim = new Set((data || []).map(Number));

    if (sorular.length > 0 && $("testAlani").style.display !== "none") {
        soruyuCiz();
    }
}

/* Test bitince XP iste. Doğruluğu sunucu kendi verisinden hesaplar. */
async function xpIste(gonder) {

    kazanilanXp = null;

    if (!girisliId || !oturumId) {
        return;
    }

    const oturum = oturumId;
    oturumId = null;   /* aynı oturum için ikinci istek gönderilmesin */

    const { data, error } = await supabaseClient.rpc("test_xp_ver", {
        p_oturum: oturum,
        p_cevaplar: gonder
    });

    if (error) {
        console.error(error);
        return;
    }

    kazanilanXp = Number(data) || 0;
}

function xpBilgisiniYaz() {

    const kap = $("xpBilgi");
    kap.textContent = "";

    const profil = eleman("a", null, "Profilim");
    profil.href = "profil.html";

    if (!girisliId) {
        const giris = eleman("a", null, "giriş yap");
        giris.href = "giris.html";

        kap.appendChild(document.createTextNode("XP ve seviye kazanmak için "));
        kap.appendChild(giris);
        kap.appendChild(document.createTextNode("."));
        return;
    }

    if (kazanilanXp === null) {
        return;
    }

    kap.appendChild(document.createTextNode(
        kazanilanXp > 0
            ? "+" + kazanilanXp + " XP kazandın. "
            : "Bu testten XP kazanmadın (doğru yaptıkların daha önce sayılmış olabilir). "
    ));
    kap.appendChild(profil);
}


/* =========================================================
   3) SONUÇ
========================================================= */

async function testiBitir() {

    if (bitiriliyor) {
        return;
    }

    const bos = sorular.length - cevapSayisi();

    if (bos > 0 && !window.confirm(bos + " soru boş. Yine de bitirilsin mi?")) {
        return;
    }

    bitiriliyor = true;
    mesajYaz("testMesaj", "Kontrol ediliyor...");

    const gonder = {};

    sorular.forEach(function (s) {
        gonder[String(s.id)] = cevaplar[s.id] || "";
    });

    const { data, error } = await supabaseClient.rpc("test_kontrol", {
        p_cevaplar: gonder
    });

    bitiriliyor = false;

    if (error) {
        console.error(error);
        mesajYaz("testMesaj", "Sonuç alınamadı: " + error.message, true);
        return;
    }

    const harita = {};

    (data || []).forEach(function (r) {
        harita[String(r.soru_id)] = r;
    });

    sonucuHazirla(harita);
    await xpIste(gonder);
    sonucuGoster();
}

function sonucuHazirla(harita) {

    sonucListesi = sorular.map(function (s) {

        const r = harita[String(s.id)];
        const secilen = cevaplar[s.id] || "";

        let durum = "bilinmiyor";

        if (r) {
            if (!secilen) {
                durum = "bos";
            } else if (secilen === r.dogru) {
                durum = "dogru";
            } else {
                durum = "yanlis";
            }
        }

        return {
            soru: s,
            secilen: secilen,
            dogru: r ? r.dogru : "",
            aciklama: r ? r.aciklama : "",
            durum: durum
        };
    });
}

function sonucuGoster() {

    const say = function (d) {
        return sonucListesi.filter(function (k) { return k.durum === d; }).length;
    };

    const dogru = say("dogru");
    const yanlis = say("yanlis");
    const bos = say("bos");
    const toplam = dogru + yanlis + bos;

    $("puanBuyuk").textContent = dogru + " / " + toplam;
    $("puanAlt").textContent =
        "%" + (toplam ? Math.round(dogru / toplam * 100) : 0) +
        "  •  " + dogru + " doğru, " + yanlis + " yanlış, " + bos + " boş";

    mesajYaz("sonucMesaj", "");
    xpBilgisiniYaz();

    sonucFiltresi = "hepsi";
    sonucListesiniCiz();
    ekranGoster("sonuc");
}

function filtreDugmeleri() {

    $("filtreHepsi").className = "ts-chip" + (sonucFiltresi === "hepsi" ? " secili" : "");
    $("filtreYanlis").className = "ts-chip" + (sonucFiltresi === "yanlis" ? " secili" : "");
    $("filtreAnlamadim").className = "ts-chip" + (sonucFiltresi === "anlamadim" ? " secili" : "");
}

function sonucListesiniCiz() {

    filtreDugmeleri();

    const kap = $("sonucListe");
    kap.textContent = "";

    let gosterilen = 0;

    sonucListesi.forEach(function (k, i) {

        if (sonucFiltresi === "yanlis" && k.durum === "dogru") {
            return;
        }

        if (sonucFiltresi === "anlamadim" && !anlamadim.has(k.soru.id)) {
            return;
        }

        kap.appendChild(sonucKarti(k, i + 1));
        gosterilen++;
    });

    if (gosterilen === 0) {
        kap.appendChild(eleman(
            "div", "yn-bos",
            sonucFiltresi === "anlamadim"
                ? "Anlamadım olarak işaretlediğin soru yok."
                : "Hepsini doğru yaptın, tebrikler!"
        ));
    }
}

function sonucKarti(k, no) {

    const etiket = {
        dogru: "Doğru",
        yanlis: "Yanlış",
        bos: "Boş",
        bilinmiyor: "Kontrol edilemedi (soru değiştirilmiş veya silinmiş olabilir)"
    }[k.durum];

    const kart = eleman("div", "ts-kart " + k.durum);

    kart.appendChild(eleman("div", "ts-kart-ust", "Soru " + no + "  —  " + etiket));

    const rozet = eleman("div", "ts-rozetler");
    rozet.appendChild(eleman("span", "ts-rozet", KAYNAK_ADLARI[k.soru.kaynak] || k.soru.kaynak));

    if (k.soru.kaynak_not) {
        rozet.appendChild(eleman("span", "ts-rozet", k.soru.kaynak_not));
    }

    if (ZORLUK_ADLARI[k.soru.zorluk]) {
        rozet.appendChild(eleman("span", "ts-rozet", ZORLUK_ADLARI[k.soru.zorluk]));
    }

    kart.appendChild(rozet);
    kart.appendChild(eleman("p", "ts-soru", k.soru.soru));

    HARFLER.forEach(function (h) {

        const metin = k.soru["sec_" + h.toLowerCase()];

        if (!metin) {
            return;
        }

        let sinif = "ts-sik ts-sabit";

        if (h === k.dogru) {
            sinif += " dogru";
        } else if (h === k.secilen) {
            sinif += " yanlis";
        }

        const sik = eleman("div", sinif);
        sik.appendChild(eleman("span", "ts-harf", h));
        sik.appendChild(eleman("span", "ts-metin", metin));

        /* Renk körlüğü için işareti yazıyla da veriyoruz */
        if (h === k.dogru && h === k.secilen) {
            sik.appendChild(eleman("span", "ts-isaret", "✓ Doğru cevabın"));
        } else if (h === k.dogru) {
            sik.appendChild(eleman("span", "ts-isaret", "✓ Doğru cevap"));
        } else if (h === k.secilen) {
            sik.appendChild(eleman("span", "ts-isaret", "✗ Senin cevabın"));
        }

        kart.appendChild(sik);
    });

    if (k.durum !== "bilinmiyor") {
        kart.appendChild(eleman(
            "p", "ts-aciklama" + (k.aciklama ? "" : " yn-soluk"),
            k.aciklama
                ? "Açıklama: " + k.aciklama
                : "Bu soru için detaylı çözüm eklenmemiş."
        ));
    }

    if (girisliId && k.durum !== "bilinmiyor") {

        const dugme = eleman("button", "ts-anlamadim");
        dugme.type = "button";

        const yaz = function () {
            const isaretli = anlamadim.has(k.soru.id);
            dugme.setAttribute("aria-pressed", isaretli ? "true" : "false");
            dugme.textContent = isaretli ? "Anlamadım (işaretli)" : "Anlamadım";
        };

        yaz();

        dugme.addEventListener("click", async function () {
            dugme.disabled = true;
            await anlamadimAyarla(k.soru.id, !anlamadim.has(k.soru.id), "sonucMesaj");
            dugme.disabled = false;
            yaz();
        });

        const alt = eleman("div", "ts-kart-alt");
        alt.appendChild(dugme);
        kart.appendChild(alt);
    }

    return kart;
}

$("filtreHepsi").addEventListener("click", function () {
    sonucFiltresi = "hepsi";
    sonucListesiniCiz();
});

$("filtreYanlis").addEventListener("click", function () {
    sonucFiltresi = "yanlis";
    sonucListesiniCiz();
});

$("filtreAnlamadim").addEventListener("click", function () {
    sonucFiltresi = "anlamadim";
    sonucListesiniCiz();
});

$("anlamadimBtn").addEventListener("click", anlamadimDegistir);

$("yeniTestBtn").addEventListener("click", testiBaslat);

$("baskaTestBtn").addEventListener("click", function () {
    ekranGoster("secim");
});

$("baslatBtn").addEventListener("click", testiBaslat);


/* =========================================================
   OTURUM
========================================================= */

function oturumDurumu(session) {

    ustCubuk(session);

    $("adminLink").style.display = "none";

    const yeniId = session && session.user ? session.user.id : null;
    const eskiId = girisliId;

    girisliId = yeniId;

    if (!yeniId) {
        anlamadim = new Set();
        return;
    }

    supabaseClient.rpc("is_admin").then(function (r) {
        if (!r.error && r.data === true) {
            $("adminLink").style.display = "block";
        }
    });

    /* Oturum yenilenince (aynı kullanıcı) işaretleri tekrar çekme */
    if (yeniId !== eskiId) {
        anlamadimYukle();
    }
}

supabaseClient.auth.onAuthStateChange(function (olay, session) {
    oturumDurumu(session);
});

supabaseClient.auth.getSession().then(function (r) {
    oturumDurumu(r.data.session);
});

adetleriCiz();
ozetYukle();
