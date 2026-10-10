/* =========================================================
   OKUL USTASI - SORU YÖNETİMİ (test-yonet.js)   SADECE ADMİN
   Kullanılan RPC'ler (sunucuda is_admin() ile kontrol edilir):
   - test_sorulari_toplu_ekle()   tek veya toplu soru ekler
   - test_sorulari_yonet()        soruları doğru cevaplarıyla listeler
   - test_sorusu_sil()            soru siler
   - test_ozet()                  ders önerileri için
   - is_admin()                   bu sayfayı göstermek için
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

const ZORLUK_ADLARI = {
    kolay: "Kolay",
    orta: "Orta",
    zor: "Zor"
};

const HAZIR_DERSLER = [
    "Matematik", "Fen Bilimleri", "Türkçe", "İngilizce", "İnkılap Tarihi",
    "Din Kültürü", "Sosyal Bilgiler", "Fizik", "Kimya", "Biyoloji",
    "Tarih", "Coğrafya", "Edebiyat", "Felsefe", "Geometri"
];

/* Toplu dosyadaki sütun sırası */
const SUTUNLAR = [
    "seviye", "ders", "konu", "kaynak", "kaynak_not", "soru",
    "a", "b", "c", "d", "e", "dogru", "aciklama", "zorluk"
];

let hazirSatirlar = [];


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

function mesajYaz(kutuId, metin, durum) {

    const el = $(kutuId);

    el.textContent = metin || "";
    el.className = "yn-mesaj" + (metin && durum ? " " + durum : "");   /* durum: "hata" veya "ok" */
}

function seviyeSecenekleri(sec, ilkYazi) {

    sec.textContent = "";

    if (ilkYazi) {
        const ilk = eleman("option", null, ilkYazi);
        ilk.value = "";
        sec.appendChild(ilk);
    }

    SEVIYELER.forEach(function (s) {
        const o = eleman("option", null, s);
        o.value = s;
        sec.appendChild(o);
    });
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
   SORU KONTROLÜ (hem tek soru hem toplu yükleme kullanır)
   Sunucu da aynı kuralları denetler; burada amaç hatayı
   kullanıcıya satır satır, anlaşılır söylemek.
========================================================= */

function kucukHarf(metin) {

    return String(metin || "").trim().toLocaleLowerCase("tr");
}

/* "5", "5. sınıf", "5.sinif", "üniversite" gibi yazımları düzeltir */
function seviyeBul(ham) {

    const anahtar = kucukHarf(ham).replace(/[\s.]/g, "");

    if (anahtar === "üniversite" || anahtar === "universite") {
        return "Üniversite";
    }

    for (let n = 5; n <= 12; n++) {
        if (anahtar === String(n) || anahtar === n + "sınıf" || anahtar === n + "sinif") {
            return n + ". Sınıf";
        }
    }

    return "";
}

/* Boş = "orta" (eski CSV'ler). Tanınmayan değerde null döner. */
function zorlukBul(ham) {

    const z = kucukHarf(ham);

    if (z === "") {
        return "orta";
    }

    if (z === "kolay" || z === "orta" || z === "zor") {
        return z;
    }

    return null;
}

function kaynakBul(ham) {

    const k = kucukHarf(ham);

    if (k === "meb") {
        return "meb";
    }

    if (k === "internet" || k === "internetten") {
        return "internet";
    }

    return "";
}

/* ham: { seviye, ders, ... } metinleri. Dönen: { hata } veya { satir } */
function satirHazirla(ham) {

    const temiz = function (x) { return String(x === undefined || x === null ? "" : x).trim(); };

    const s = {
        seviye: seviyeBul(ham.seviye),
        ders: temiz(ham.ders),
        konu: temiz(ham.konu),
        kaynak: kaynakBul(ham.kaynak),
        kaynak_not: temiz(ham.kaynak_not),
        soru: temiz(ham.soru),
        a: temiz(ham.a),
        b: temiz(ham.b),
        c: temiz(ham.c),
        d: temiz(ham.d),
        e: temiz(ham.e),
        dogru: temiz(ham.dogru).toUpperCase(),
        aciklama: temiz(ham.aciklama),
        zorluk: zorlukBul(ham.zorluk)
    };

    if (!s.seviye) {
        return { hata: "Seviye tanınmadı (5. Sınıf ... 12. Sınıf veya Üniversite olmalı)." };
    }

    if (!s.kaynak) {
        return { hata: "Kaynak 'internet' veya 'meb' olmalı." };
    }

    if (!s.zorluk) {
        return { hata: "Zorluk 'kolay', 'orta' veya 'zor' olmalı (boş bırakılırsa 'orta' olur)." };
    }

    if (!s.ders || s.ders.length > 60) {
        return { hata: "Ders boş olamaz ve en fazla 60 karakter olmalı." };
    }

    if (s.konu.length > 100 || s.kaynak_not.length > 100) {
        return { hata: "Konu ve kaynak notu en fazla 100 karakter olmalı." };
    }

    if (!s.soru || s.soru.length > 2000) {
        return { hata: "Soru boş olamaz ve en fazla 2000 karakter olmalı." };
    }

    if (!s.a || !s.b || !s.c || !s.d) {
        return { hata: "A, B, C ve D şıkları boş olamaz." };
    }

    if ([s.a, s.b, s.c, s.d, s.e].some(function (x) { return x.length > 500; })) {
        return { hata: "Bir şık en fazla 500 karakter olmalı." };
    }

    if (["A", "B", "C", "D", "E"].indexOf(s.dogru) === -1) {
        return { hata: "Doğru cevap A, B, C, D veya E olmalı." };
    }

    if (s.dogru === "E" && !s.e) {
        return { hata: "Doğru cevap E seçilmiş ama E şıkkı boş." };
    }

    if (s.aciklama.length > 2000) {
        return { hata: "Açıklama en fazla 2000 karakter olmalı." };
    }

    return { satir: s };
}


/* =========================================================
   TEK SORU EKLE
========================================================= */

async function tekSoruKaydet() {

    const sonuc = satirHazirla({
        seviye: $("fSeviye").value,
        ders: $("fDers").value,
        konu: $("fKonu").value,
        kaynak: $("fKaynak").value,
        kaynak_not: $("fKaynakNot").value,
        soru: $("fSoru").value,
        a: $("fA").value,
        b: $("fB").value,
        c: $("fC").value,
        d: $("fD").value,
        e: $("fE").value,
        dogru: $("fDogru").value,
        aciklama: $("fAciklama").value,
        zorluk: $("fZorluk").value
    });

    if (sonuc.hata) {
        mesajYaz("fMesaj", sonuc.hata, "hata");
        return;
    }

    $("fKaydet").disabled = true;
    mesajYaz("fMesaj", "Kaydediliyor...");

    const { error } = await supabaseClient.rpc("test_sorulari_toplu_ekle", {
        p_satirlar: [sonuc.satir]
    });

    $("fKaydet").disabled = false;

    if (error) {
        console.error(error);
        mesajYaz("fMesaj", "Kaydedilemedi: " + error.message, "hata");
        return;
    }

    /* Seviye, ders, konu, kaynak kalır: arka arkaya soru eklemek kolay olsun. */
    ["fSoru", "fA", "fB", "fC", "fD", "fE", "fAciklama"].forEach(function (id) {
        $(id).value = "";
    });

    $("fDogru").value = "A";
    mesajYaz("fMesaj", "Soru kaydedildi.", "ok");
    $("fSoru").focus();

    dersOnerileriniYukle();
}

$("fKaydet").addEventListener("click", tekSoruKaydet);


/* =========================================================
   TOPLU EKLE  (CSV / Excel'den yapıştırma)
========================================================= */

/* İlk satırın ayırıcısını bulur: sekme (Excel'den kopyalama), ; (Türkçe Excel CSV) veya , */
function ayiracBul(metin) {

    let tirnakta = false;
    let sekme = 0;
    let noktaliVirgul = 0;
    let virgul = 0;

    for (let i = 0; i < metin.length; i++) {

        const h = metin[i];

        if (h === '"') {
            tirnakta = !tirnakta;
        } else if (!tirnakta) {
            if (h === "\n" || h === "\r") { break; }
            if (h === "\t") { sekme++; }
            if (h === ";") { noktaliVirgul++; }
            if (h === ",") { virgul++; }
        }
    }

    if (sekme > 0 && sekme >= noktaliVirgul && sekme >= virgul) {
        return "\t";
    }

    if (noktaliVirgul > 0 && noktaliVirgul >= virgul) {
        return ";";
    }

    return ",";
}

/* Tırnak içindeki ayırıcıları ve satır sonlarını doğru okuyan basit CSV ayrıştırıcı */
function csvAyir(metin, ayirac) {

    const satirlar = [];
    let satir = [];
    let hucre = "";
    let tirnakta = false;

    function satiriBitir() {
        satir.push(hucre);
        hucre = "";

        if (satir.some(function (x) { return x.trim() !== ""; })) {
            satirlar.push(satir);
        }

        satir = [];
    }

    for (let i = 0; i < metin.length; i++) {

        const h = metin[i];

        if (tirnakta) {
            if (h === '"') {
                if (metin[i + 1] === '"') {
                    hucre += '"';
                    i++;
                } else {
                    tirnakta = false;
                }
            } else {
                hucre += h;
            }
        } else if (h === '"' && hucre === "") {
            tirnakta = true;
        } else if (h === ayirac) {
            satir.push(hucre);
            hucre = "";
        } else if (h === "\n" || h === "\r") {
            if (h === "\r" && metin[i + 1] === "\n") {
                i++;
            }
            satiriBitir();
        } else {
            hucre += h;
        }
    }

    satiriBitir();

    return satirlar;
}

function topluKontrol() {

    hazirSatirlar = [];
    $("yukleBtn").style.display = "none";
    $("topluHatalar").textContent = "";

    const metin = $("topluMetin").value.replace(/^\uFEFF/, "");

    if (!metin.trim()) {
        mesajYaz("topluMesaj", "Önce bir dosya seç ya da soruları yapıştır.", "hata");
        return;
    }

    const satirlar = csvAyir(metin, ayiracBul(metin));

    /* İlk satır başlıksa atla; hata mesajlarındaki satır numarası dosyadakiyle aynı kalsın */
    let ilkNo = 1;

    if (satirlar.length > 0 && kucukHarf(satirlar[0][0]) === "seviye") {
        satirlar.shift();
        ilkNo = 2;
    }

    if (satirlar.length === 0) {
        mesajYaz("topluMesaj", "Soru satırı bulunamadı.", "hata");
        return;
    }

    if (satirlar.length > 500) {
        mesajYaz("topluMesaj", "Bir seferde en fazla 500 soru yüklenebilir (" + satirlar.length + " var). Dosyayı bölün.", "hata");
        return;
    }

    const hatalar = [];
    const hazir = [];

    satirlar.forEach(function (hucreler, i) {

        const no = ilkNo + i;

        if (hucreler.length < 12) {
            hatalar.push("Satır " + no + ": en az 12 sütun olmalı, " + hucreler.length + " var.");
            return;
        }

        const ham = {};

        SUTUNLAR.forEach(function (ad, k) {
            ham[ad] = hucreler[k];
        });

        const sonuc = satirHazirla(ham);

        if (sonuc.hata) {
            hatalar.push("Satır " + no + ": " + sonuc.hata);
        } else {
            hazir.push(sonuc.satir);
        }
    });

    if (hatalar.length > 0) {

        mesajYaz(
            "topluMesaj",
            hatalar.length + " satırda hata var. Düzeltip tekrar kontrol et" +
            (hatalar.length > 20 ? " (ilk 20 hata gösteriliyor)." : "."),
            "hata"
        );

        hatalar.slice(0, 20).forEach(function (h) {
            $("topluHatalar").appendChild(eleman("li", null, h));
        });

        return;
    }

    hazirSatirlar = hazir;
    mesajYaz("topluMesaj", hazir.length + " soru hazır. Yüklemek için \"Yükle\" düğmesine bas.", "ok");
    $("yukleBtn").textContent = hazir.length + " soruyu yükle";
    $("yukleBtn").style.display = "inline-flex";
}

async function topluYukle() {

    if (hazirSatirlar.length === 0) {
        return;
    }

    $("yukleBtn").disabled = true;
    $("kontrolBtn").disabled = true;
    mesajYaz("topluMesaj", "Yükleniyor...");

    const { data, error } = await supabaseClient.rpc("test_sorulari_toplu_ekle", {
        p_satirlar: hazirSatirlar
    });

    $("yukleBtn").disabled = false;
    $("kontrolBtn").disabled = false;

    if (error) {
        console.error(error);
        mesajYaz("topluMesaj", "Yüklenemedi (hiçbir soru eklenmedi): " + error.message, "hata");
        return;
    }

    mesajYaz("topluMesaj", data + " soru eklendi.", "ok");

    hazirSatirlar = [];
    $("yukleBtn").style.display = "none";
    $("topluMetin").value = "";

    dersOnerileriniYukle();
}

/* CSV dosyası seç: Excel'in Türkçe CSV'si genelde Windows-1254'tür, ikisini de dene */
$("dosyaSec").addEventListener("change", async function () {

    const dosya = this.files[0];

    if (!dosya) {
        return;
    }

    const tampon = await dosya.arrayBuffer();
    let metin;

    try {
        metin = new TextDecoder("utf-8", { fatal: true }).decode(tampon);
    } catch (e) {
        metin = new TextDecoder("windows-1254").decode(tampon);
    }

    $("topluMetin").value = metin;
    this.value = "";

    topluKontrol();
});

function ornekIndir() {

    const satirlar = [
        "seviye;ders;konu;kaynak;kaynak_not;soru;A;B;C;D;E;dogru;aciklama;zorluk",
        '8. Sınıf;Matematik;Üslü Sayılar;internet;;2 üzeri 3 kaçtır?;6;8;9;12;;B;2 x 2 x 2 = 8;kolay',
        '8. Sınıf;Matematik;Üslü Sayılar;meb;LGS ÖRNEK;"10 üzeri 2 kaçtır?";20;100;1000;12;10;B;10 x 10 = 100;zor'
    ];

    const blob = new Blob(["\uFEFF" + satirlar.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const baglanti = document.createElement("a");

    baglanti.href = URL.createObjectURL(blob);
    baglanti.download = "ornek-sorular.csv";
    document.body.appendChild(baglanti);
    baglanti.click();
    baglanti.remove();

    setTimeout(function () { URL.revokeObjectURL(baglanti.href); }, 1000);
}

$("kontrolBtn").addEventListener("click", topluKontrol);
$("yukleBtn").addEventListener("click", topluYukle);
$("ornekBtn").addEventListener("click", ornekIndir);


/* =========================================================
   LİSTELE / SİL
========================================================= */

async function listele() {

    $("listeleBtn").disabled = true;
    mesajYaz("listeMesaj", "Yükleniyor...");
    $("soruListesi").textContent = "";

    const { data, error } = await supabaseClient.rpc("test_sorulari_yonet", {
        p_seviye: $("lSeviye").value || null,
        p_ders: $("lDers").value.trim() || null,
        p_konu: $("lKonu").value.trim() || null,
        p_kaynak: $("lKaynak").value || null
    });

    $("listeleBtn").disabled = false;

    if (error) {
        console.error(error);
        mesajYaz("listeMesaj", "Liste alınamadı: " + error.message, "hata");
        return;
    }

    if (!data || data.length === 0) {
        mesajYaz("listeMesaj", "Bu seçimde soru yok.");
        return;
    }

    mesajYaz(
        "listeMesaj",
        data.length + " soru" + (data.length === 200 ? " (en yeni 200 gösteriliyor; filtreyi daraltabilirsin)" : "")
    );

    data.forEach(function (q) {
        $("soruListesi").appendChild(soruOgesi(q));
    });
}

function soruOgesi(q) {

    const oge = eleman("div", "ts-liste-ogesi");

    oge.appendChild(eleman(
        "div", "yn-soluk",
        "#" + q.id + "  •  " + q.seviye + "  •  " + q.ders +
        (q.konu ? "  •  " + q.konu : "") +
        (ZORLUK_ADLARI[q.zorluk] ? "  •  " + ZORLUK_ADLARI[q.zorluk] : "") +
        "  •  " + (KAYNAK_ADLARI[q.kaynak] || q.kaynak) +
        (q.kaynak_not ? " (" + q.kaynak_not + ")" : "")
    ));

    oge.appendChild(eleman("p", null, q.soru));

    ["A", "B", "C", "D", "E"].forEach(function (h) {

        const metin = q["sec_" + h.toLowerCase()];

        if (!metin) {
            return;
        }

        const dogruMu = h === q.dogru;

        oge.appendChild(eleman(
            "p", dogruMu ? "ts-dogru-cevap" : null,
            h + ") " + metin + (dogruMu ? "   ✓ doğru cevap" : "")
        ));
    });

    if (q.aciklama) {
        oge.appendChild(eleman("p", "yn-soluk", "Açıklama: " + q.aciklama));
    }

    const sil = eleman("button", "yn-btn tehlike kucuk", "Sil");
    sil.type = "button";

    sil.addEventListener("click", async function () {

        if (!window.confirm("#" + q.id + " numaralı soru silinsin mi?")) {
            return;
        }

        sil.disabled = true;

        const { error } = await supabaseClient.rpc("test_sorusu_sil", { p_id: q.id });

        if (error) {
            console.error(error);
            mesajYaz("listeMesaj", "Silinemedi: " + error.message, "hata");
            sil.disabled = false;
            return;
        }

        oge.remove();
        dersOnerileriniYukle();
    });

    oge.appendChild(sil);

    return oge;
}

$("listeleBtn").addEventListener("click", listele);


/* =========================================================
   DERS ÖNERİLERİ (yazarken açılan liste)
========================================================= */

async function dersOnerileriniYukle() {

    const adlar = HAZIR_DERSLER.slice();
    const { data } = await supabaseClient.rpc("test_ozet");

    (data || []).forEach(function (r) {
        if (adlar.indexOf(r.ders) === -1) {
            adlar.push(r.ders);
        }
    });

    const liste = $("dersOnerileri");
    liste.textContent = "";

    adlar.sort(function (a, b) { return a.localeCompare(b, "tr"); }).forEach(function (d) {
        const o = document.createElement("option");
        o.value = d;
        liste.appendChild(o);
    });
}


/* =========================================================
   OTURUM / YETKİ
========================================================= */

let yetkiKontrolSirasi = 0;

let sonKullaniciId;   /* tanımsız: henüz hiç kontrol edilmedi */

async function oturumDurumu(session) {

    ustCubuk(session);

    /* Oturum yenilenince aynı kullanıcı için yetkiyi tekrar sorma */
    const yeniId = session && session.user ? session.user.id : null;

    if (yeniId === sonKullaniciId) {
        return;
    }

    sonKullaniciId = yeniId;

    const sira = ++yetkiKontrolSirasi;

    $("yonetAlani").style.display = "none";

    const yetkiKutu = $("yetkiYok");

    if (!session || !session.user) {
        yetkiKutu.style.display = "block";
        yetkiKutu.textContent = "";
        yetkiKutu.appendChild(document.createTextNode("Bu sayfa için "));
        const a = eleman("a", null, "giriş yapmalısın");
        a.href = "giris.html";
        yetkiKutu.appendChild(a);
        yetkiKutu.appendChild(document.createTextNode("."));
        return;
    }

    yetkiKutu.style.display = "block";
    yetkiKutu.textContent = "Yetki kontrol ediliyor...";

    const { data, error } = await supabaseClient.rpc("is_admin");

    if (sira !== yetkiKontrolSirasi) {
        return;
    }

    if (!error && data === true) {
        yetkiKutu.style.display = "none";
        $("yonetAlani").style.display = "block";
        dersOnerileriniYukle();
    } else {
        yetkiKutu.textContent = "Bu sayfa sadece yöneticiler içindir.";
    }
}

supabaseClient.auth.onAuthStateChange(function (olay, session) {
    oturumDurumu(session);
});

supabaseClient.auth.getSession().then(function (r) {
    oturumDurumu(r.data.session);
});

seviyeSecenekleri($("fSeviye"));
seviyeSecenekleri($("lSeviye"), "Hepsi");
