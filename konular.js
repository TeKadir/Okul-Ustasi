/* =========================================================
   OKUL USTASI - KONULAR
   Kullanılan RPC'ler:
   - konu_dersleri()               (herkes)
   - konu_videolarini_getir()      (herkes)
   - konu_videosu_ekle()           (SADECE admin - sunucuda kontrol)
   - konu_videosu_guncelle()       (SADECE admin - sunucuda kontrol)
   - konu_videosu_sil()            (SADECE admin - sunucuda kontrol)
   - is_admin()                    (sadece düğmeleri göstermek için)

   Videolar YouTube bağlantısı olarak eklenir; sunucu bağlantıdan
   11 haneli video kodunu ayıklar, başka site bağlantısı kabul etmez.
========================================================= */

const SUPABASE_URL =
    "https://hinisayolrgyzcoztobi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_76n3XsryMfvfdYwKeUu6SA_TCxImZiW";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* Sunucudan alınamazsa kullanılacak yedek liste */
const YEDEK_DERSLER = [
    "Matematik", "Fen Bilimleri", "Türkçe", "İngilizce",
    "İnkılap Tarihi", "Din Kültürü", "Diğer"
];

const DERS_IKONLARI = {
    "Matematik": '<path d="M5 12h14M12 5v0M12 19v0"/><circle cx="12" cy="6" r="1.2"/><circle cx="12" cy="18" r="1.2"/>',
    "Fen Bilimleri": '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M8 15h8"/>',
    "Türkçe": '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 8h6M9 12h4"/>',
    "İngilizce": '<path d="M4 7h9M8.5 4v3M6 7c.5 3 3 6 6 7M12 7c-.5 3-3 6-6 7M13 20l4-9 4 9M14.5 17h5"/>',
    "İnkılap Tarihi": '<path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>',
    "Din Kültürü": '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5zM17 4v4M15 6h4"/>',
    "Diğer": '<path d="M12 3l2.5 5.5 5.5.8-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.8z"/>'
};

const VARSAYILAN_DERS_IKONU =
    '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5"/>';

function dersIkonu(ders) {

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "ders-svg");
    svg.innerHTML = DERS_IKONLARI[ders] || VARSAYILAN_DERS_IKONU;

    return svg;
}

let mevcutKullanici = null;
let adminMi = false;

let dersler = [];
let tumVideolar = [];
let seciliDers = null;
let oynayanId = null;
let duzenlenenId = null;

const dersIzgara = document.getElementById("dersIzgara");
const videoBolumu = document.getElementById("videoBolumu");
const videoBolumBaslik = document.getElementById("videoBolumBaslik");
const videoListesi = document.getElementById("videoListesi");
const oynaticiAlani = document.getElementById("oynaticiAlani");
const videoCerceve = document.getElementById("videoCerceve");
const oynatBaslik = document.getElementById("oynatBaslik");
const oynatKonu = document.getElementById("oynatKonu");
const oynatAciklama = document.getElementById("oynatAciklama");

const adminKutu = document.getElementById("adminKutu");
const adminBaslik = document.getElementById("adminBaslik");
const videoFormu = document.getElementById("videoFormu");
const vDers = document.getElementById("vDers");
const vBaslik = document.getElementById("vBaslik");
const vKonu = document.getElementById("vKonu");
const vUrl = document.getElementById("vUrl");
const vAciklama = document.getElementById("vAciklama");
const vKaydet = document.getElementById("vKaydet");
const vIptal = document.getElementById("vIptal");
const vMesaj = document.getElementById("vMesaj");


/* =========================================================
   ÜST MENÜ (diğer sayfalarla aynı mantık)
========================================================= */

const topLoginLink = document.getElementById("topLoginLink");
const topUser = document.getElementById("topUser");
const topUserEmail = document.getElementById("topUserEmail");
const logoutButton = document.getElementById("logoutButton");

function ustCubuguGuncelle(session) {

    if (session && session.user) {

        topLoginLink.style.display = "none";
        topUser.style.display = "flex";
        topUserEmail.textContent = session.user.email || "";

    } else {

        topLoginLink.style.display = "inline-block";
        topUser.style.display = "none";
        topUserEmail.textContent = "";
    }
}

logoutButton.addEventListener("click", async () => {

    await supabaseClient.auth.signOut();
});


/* =========================================================
   YARDIMCI
========================================================= */

function eleman(tag, className, text) {

    const el = document.createElement(tag);

    if (className) {
        el.className = className;
    }

    if (text !== undefined) {
        el.textContent = text;
    }

    return el;
}

function hataMetni(error) {

    if (!error) {
        return "Bilinmeyen bir hata oluştu.";
    }

    return error.message || "Bilinmeyen bir hata oluştu.";
}

function tarihFormatla(tarih) {

    if (!tarih) {
        return "";
    }

    return new Date(tarih).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function formMesaji(metin, basari) {

    vMesaj.textContent = metin || "";
    vMesaj.className = metin ? "mesaj " + (basari ? "basari" : "hata") : "mesaj";
}


/* =========================================================
   DERSLER
========================================================= */

async function dersleriGetir() {

    const { data, error } = await supabaseClient.rpc("konu_dersleri");

    dersler =
        !error && Array.isArray(data) && data.length > 0
            ? data
            : YEDEK_DERSLER;

    vDers.innerHTML = "";

    const ilk = document.createElement("option");
    ilk.value = "";
    ilk.textContent = "Ders seç";
    vDers.appendChild(ilk);

    dersler.forEach(d => {

        const o = document.createElement("option");
        o.value = d;
        o.textContent = d;
        vDers.appendChild(o);
    });
}


function dersDugmeleriniCiz() {

    dersIzgara.innerHTML = "";

    dersler.forEach(d => {

        const sayi = tumVideolar.filter(v => v.ders === d).length;

        const dugme = eleman("button", "ders-dugme" + (d === seciliDers ? " secili" : ""));
        dugme.type = "button";

        const ikonKap = eleman("span", "ders-ikon");
        ikonKap.appendChild(dersIkonu(d));
        dugme.appendChild(ikonKap);
        dugme.appendChild(eleman("span", null, d));
        dugme.appendChild(eleman("span", "ders-sayi", sayi + " video"));

        dugme.addEventListener("click", () => dersSec(d));

        dersIzgara.appendChild(dugme);
    });
}


function dersSec(d) {

    seciliDers = d;
    oynayanId = null;

    /* Seçilen dersin testlerine giden bağlantı */
    const testLinki = document.getElementById("testLinki");
    testLinki.href = "test.html?ders=" + encodeURIComponent(d);
    testLinki.textContent = d + " testlerine git";

    history.replaceState(null, "", "#" + encodeURIComponent(d));

    oynatıcıyiKapat();
    dersDugmeleriniCiz();
    videoListesiniCiz();

    videoBolumu.scrollIntoView({ behavior: "smooth", block: "start" });
}


/* =========================================================
   VİDEOLAR
========================================================= */

async function videolariGetir() {

    const { data, error } = await supabaseClient.rpc(
        "konu_videolarini_getir",
        { p_ders: null }
    );

    if (error) {

        console.error(error);

        dersIzgara.innerHTML = "";
        dersIzgara.appendChild(
            eleman("div", "bos-liste", "Videolar yüklenemedi: " + hataMetni(error))
        );

        return false;
    }

    tumVideolar = Array.isArray(data) ? data : [];

    return true;
}


function videoListesiniCiz() {

    videoListesi.innerHTML = "";

    if (!seciliDers) {
        videoBolumu.style.display = "none";
        return;
    }

    videoBolumu.style.display = "block";
    videoBolumBaslik.textContent = "2. " + seciliDers + " videoları";

    const liste = tumVideolar.filter(v => v.ders === seciliDers);

    if (liste.length === 0) {

        videoListesi.appendChild(
            eleman("div", "bos-liste", "Bu ders için henüz video eklenmemiş.")
        );

        return;
    }

    liste.forEach(v => {

        const kart = eleman(
            "article",
            "video-karti" + (v.id === oynayanId ? " oynuyor" : "")
        );

        const oynat = eleman("button", "video-oynat", "▶");
        oynat.type = "button";
        oynat.setAttribute("aria-label", v.baslik + " videosunu izle");
        oynat.addEventListener("click", () => videoOynat(v));

        const bilgi = eleman("div", "video-bilgi");
        bilgi.appendChild(eleman("strong", null, v.baslik));

        const alt = [];

        if (v.konu_adi) {
            alt.push(v.konu_adi);
        }

        alt.push(tarihFormatla(v.created_at));

        bilgi.appendChild(eleman("div", "video-alt", alt.join("  •  ")));

        kart.appendChild(oynat);
        kart.appendChild(bilgi);

        const islemler = eleman("div", "video-islemler");

        const izle = eleman("button", "kucuk-buton cevaplari-buton", "İzle");
        izle.type = "button";
        izle.addEventListener("click", () => videoOynat(v));
        islemler.appendChild(izle);

        /* Düğmeler yalnızca gösterim içindir; asıl yetki sunucuda. */
        if (adminMi) {

            const duzenle = eleman("button", "kucuk-buton", "Düzenle");
            duzenle.type = "button";
            duzenle.addEventListener("click", () => duzenlemeyeBasla(v));
            islemler.appendChild(duzenle);

            const sil = eleman("button", "kucuk-buton sil-buton", "Sil");
            sil.type = "button";
            sil.addEventListener("click", () => videoSil(v));
            islemler.appendChild(sil);
        }

        kart.appendChild(islemler);
        videoListesi.appendChild(kart);
    });
}


/* =========================================================
   OYNATICI  (youtube-nocookie: izleme başlayana kadar çerez yok)
========================================================= */

function oynatıcıyiKapat() {

    videoCerceve.innerHTML = "";
    oynaticiAlani.style.display = "none";
}


function videoOynat(v) {

    /* Kod sunucuda doğrulanıyor; burada da bir kez daha kontrol. */
    if (!/^[A-Za-z0-9_-]{11}$/.test(v.video_kodu)) {
        alert("Bu videonun bağlantısı geçersiz.");
        return;
    }

    oynayanId = v.id;

    videoCerceve.innerHTML = "";

    const iframe = document.createElement("iframe");

    iframe.src =
        "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(v.video_kodu) +
        "?rel=0&playsinline=1";

    iframe.title = v.baslik;

    iframe.allow =
        "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";

    iframe.setAttribute("allowfullscreen", "");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    videoCerceve.appendChild(iframe);

    oynatBaslik.textContent = v.baslik;
    oynatKonu.textContent = v.konu_adi || "";
    oynatKonu.style.display = v.konu_adi ? "block" : "none";
    oynatAciklama.textContent = v.aciklama || "";
    oynatAciklama.style.display = v.aciklama ? "block" : "none";

    oynaticiAlani.style.display = "block";

    videoListesiniCiz();

    oynaticiAlani.scrollIntoView({ behavior: "smooth", block: "start" });
}


/* =========================================================
   ADMİN: EKLE / GÜNCELLE / SİL
========================================================= */

function adminAlaniniGuncelle() {

    adminKutu.style.display = adminMi ? "block" : "none";
}


function formuSifirla() {

    duzenlenenId = null;

    videoFormu.reset();

    if (seciliDers) {
        vDers.value = seciliDers;
    }

    adminBaslik.textContent = "Yeni konu videosu ekle";
    vKaydet.textContent = "Videoyu Ekle";
    vIptal.style.display = "none";
}


function duzenlemeyeBasla(v) {

    duzenlenenId = v.id;

    vDers.value = v.ders;
    vBaslik.value = v.baslik;
    vKonu.value = v.konu_adi || "";
    vAciklama.value = v.aciklama || "";
    vUrl.value = "https://www.youtube.com/watch?v=" + v.video_kodu;

    adminBaslik.textContent = "Videoyu düzenle";
    vKaydet.textContent = "Değişiklikleri Kaydet";
    vIptal.style.display = "inline-block";

    formMesaji("");

    adminKutu.scrollIntoView({ behavior: "smooth", block: "start" });
}


vIptal.addEventListener("click", () => {

    formuSifirla();
    formMesaji("");
});


videoFormu.addEventListener("submit", async event => {

    event.preventDefault();

    formMesaji("");

    const ders = vDers.value;
    const baslik = vBaslik.value.trim();
    const konu = vKonu.value.trim();
    const aciklama = vAciklama.value.trim();
    const url = vUrl.value.trim();

    if (!ders) { formMesaji("Lütfen bir ders seç."); return; }
    if (!baslik) { formMesaji("Video başlığı boş bırakılamaz."); return; }
    if (!url) { formMesaji("YouTube bağlantısı gerekli."); return; }

    vKaydet.disabled = true;

    const duzenleme = duzenlenenId !== null;

    const { error } = duzenleme
        ? await supabaseClient.rpc("konu_videosu_guncelle", {
            p_id: duzenlenenId,
            p_ders: ders,
            p_baslik: baslik,
            p_konu_adi: konu,
            p_aciklama: aciklama,
            p_video_url: url
        })
        : await supabaseClient.rpc("konu_videosu_ekle", {
            p_ders: ders,
            p_baslik: baslik,
            p_konu_adi: konu,
            p_aciklama: aciklama,
            p_video_url: url
        });

    vKaydet.disabled = false;

    if (error) {
        console.error(error);
        formMesaji(hataMetni(error));
        return;
    }

    formuSifirla();

    formMesaji(duzenleme ? "Video güncellendi." : "Video eklendi.", true);

    await videolariGetir();

    if (!seciliDers) {
        seciliDers = ders;
    }

    dersDugmeleriniCiz();
    videoListesiniCiz();
});


async function videoSil(v) {

    if (!confirm("\"" + v.baslik + "\" videosunu silmek istediğine emin misin?")) {
        return;
    }

    const { error } = await supabaseClient.rpc(
        "konu_videosu_sil",
        { p_id: v.id }
    );

    if (error) {
        alert(hataMetni(error));
        return;
    }

    if (oynayanId === v.id) {
        oynayanId = null;
        oynatıcıyiKapat();
    }

    await videolariGetir();

    dersDugmeleriniCiz();
    videoListesiniCiz();
}


/* =========================================================
   OTURUM + BAŞLAT
========================================================= */

async function adminKontrol() {

    adminMi = false;

    if (mevcutKullanici) {

        const { data, error } = await supabaseClient.rpc("is_admin");

        adminMi = !error && data === true;
    }

    adminAlaniniGuncelle();
}


supabaseClient.auth.onAuthStateChange(async (event, session) => {

    ustCubuguGuncelle(session);

    const eskiId = mevcutKullanici ? mevcutKullanici.id : null;
    const yeniId = session && session.user ? session.user.id : null;

    mevcutKullanici = session && session.user ? session.user : null;

    if (eskiId !== yeniId) {

        await adminKontrol();
        videoListesiniCiz();
    }
});


(async function baslat() {

    const { data } = await supabaseClient.auth.getSession();

    ustCubuguGuncelle(data.session);

    mevcutKullanici = data.session ? data.session.user : null;

    await dersleriGetir();

    const tamam = await videolariGetir();

    if (!tamam) {
        return;
    }

    /* Adres çubuğunda #Matematik gibi bir ders varsa onu aç. */
    const hash = decodeURIComponent(location.hash.replace("#", ""));

    if (dersler.includes(hash)) {
        seciliDers = hash;
    }

    dersDugmeleriniCiz();
    videoListesiniCiz();

    await adminKontrol();

    videoListesiniCiz();
})();
