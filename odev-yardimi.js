/* =========================================================
   OKUL USTASI - ÖDEV
   Mevcut SQL RPC sistemine göre yazılmıştır.

   KULLANILAN RPC'LER:
   - ders_listesi()
   - gonderileri_getir()
   - gonderi_ekle()
   - gonderi_sil()
   - gonderi_cevaplarini_getir()
   - gonderi_cevap_ekle()
   - gonderi_cevap_sil()
   - is_admin()
   - gonderi_gorsel_ekle()   (yeni)
   - gonderi_ekleri_getir()  (yeni)
   + Storage kovası: odev-gorselleri
========================================================= */


/* =========================================================
   SUPABASE
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


/* =========================================================
   DURUM
========================================================= */

let mevcutKullanici = null;
let mevcutKullaniciAdminMi = false;

let dersler = [];

let sayfaNo = 0;

const SAYFA_BOYUTU = 20;

/* gonderi_ekle / gonderileri_getir için tür. Veritabanında farklıysa SADECE burayı değiştir. */
const TUR = "odev";

let yukleniyor = false;

let dahaFazlaVar = false;

/* Fotoğraf ayarları (sunucu tarafında da aynı sınırlar uygulanır) */
const KOVA = "odev-gorselleri";
const MAX_FOTO = 3;
const MAX_HAM_BOYUT = 15 * 1024 * 1024;   // seçilen dosya
const MAX_BOYUT = 5 * 1024 * 1024;        // yüklenen dosya
const MAX_KENAR = 1600;                   // piksel
const IZINLI_TURLER = ["image/jpeg", "image/png", "image/webp"];

let secilenGorseller = [];   // { dosya, onizleme }


/* =========================================================
   ELEMENTLER
========================================================= */

/* Üst menü artık tüm sayfalarda ortak; aynı işi yapan elemanlar kullanılıyor. */
const kullaniciKutusu =
    document.getElementById("topUser");

const kullaniciYazisi =
    document.getElementById("topUserEmail");

const girisButonu =
    document.getElementById("topLoginLink");

const cikisButonu =
    document.getElementById("logoutButton");

const girisUyarisi =
    document.getElementById("girisUyarisi");

const gonderiFormu =
    document.getElementById("gonderiFormu");

const ders =
    document.getElementById("ders");

const baslik =
    document.getElementById("baslik");

const aciklama =
    document.getElementById("aciklama");

const karakterSayisi =
    document.getElementById("karakterSayisi");

const gonderButonu =
    document.getElementById("gonderButonu");

const formMesaji =
    document.getElementById("formMesaji");

const filtreDers =
    document.getElementById("filtreDers");

const filtreArama =
    document.getElementById("filtreArama");

const araButonu =
    document.getElementById("araButonu");

const gonderiListesi =
    document.getElementById("gonderiListesi");

const dahaButonu =
    document.getElementById("dahaButonu");

const listeDurumu =
    document.getElementById("listeDurumu");

const teslimTarihi =
    document.getElementById("teslimTarihi");

const gorselSec =
    document.getElementById("gorselSec");

const onizleme =
    document.getElementById("onizleme");

const buyukFoto =
    document.getElementById("buyukFoto");

const buyukFotoImg =
    document.getElementById("buyukFotoImg");


/* =========================================================
   YARDIMCI FONKSİYONLAR
========================================================= */

function tarihFormatla(tarih) {

    if (!tarih) {
        return "";
    }

    return new Date(tarih).toLocaleString(
        "tr-TR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function hataMetni(error) {

    if (!error) {
        return "Bilinmeyen bir hata oluştu.";
    }

    return error.message || "Bilinmeyen bir hata oluştu.";
}


/*
    DOM elemanı oluştururken innerHTML kullanmıyoruz.
    Kullanıcıların yazdığı metinler textContent ile ekleniyor.
*/
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


function mesajGoster(mesaj, basari = false) {

    formMesaji.textContent = mesaj;

    formMesaji.className =
        "mesaj " + (basari ? "basari" : "hata");
}


function mesajTemizle() {

    formMesaji.textContent = "";

    formMesaji.className = "mesaj";
}


/* =========================================================
   KULLANICI DURUMU
========================================================= */

async function kullaniciyiGuncelle() {

    const {
        data
    } = await supabaseClient.auth.getSession();

    mevcutKullanici =
        data.session?.user || null;


    if (!mevcutKullanici) {

        mevcutKullaniciAdminMi = false;

        kullaniciYazisi.textContent = "";

        kullaniciKutusu.style.display = "none";

        girisButonu.style.display =
            "inline-block";

        cikisButonu.style.display =
            "none";

        girisUyarisi.style.display =
            "block";

        gonderiFormu.style.opacity =
            "0.55";

        gonderButonu.disabled = true;

        return;
    }


    /*
       E-posta burada yalnızca kullanıcının
       kendi ekranında gösteriliyor.
    */

    kullaniciYazisi.textContent =
        mevcutKullanici.email || "Kullanıcı";

    girisButonu.style.display =
        "none";

    cikisButonu.style.display =
        "inline-block";

    kullaniciKutusu.style.display = "flex";

    girisUyarisi.style.display =
        "none";

    gonderiFormu.style.opacity =
        "1";

    gonderButonu.disabled = false;


    const {
        data: adminData,
        error: adminError
    } = await supabaseClient.rpc("is_admin");


    if (!adminError) {

        mevcutKullaniciAdminMi =
            adminData === true;

    } else {

        mevcutKullaniciAdminMi =
            false;
    }
}


/* =========================================================
   ÇIKIŞ
========================================================= */

cikisButonu.addEventListener(
    "click",
    async () => {

        const {
            error
        } = await supabaseClient.auth.signOut();

        if (error) {

            alert(
                "Çıkış yapılırken hata oluştu: " +
                hataMetni(error)
            );

            return;
        }

        location.reload();
    }
);


/* =========================================================
   DERS LİSTESİ
========================================================= */

async function dersListesiniGetir() {

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "ders_listesi"
    );


    if (error) {

        console.error(
            "Ders listesi hatası:",
            error
        );

        alert(
            "Ders listesi alınamadı."
        );

        return;
    }


    dersler = Array.isArray(data)
        ? data
        : [];


    dersler.forEach(
        dersAdi => {

            const option1 =
                document.createElement("option");

            option1.value =
                dersAdi;

            option1.textContent =
                dersAdi;

            ders.appendChild(option1);


            const option2 =
                document.createElement("option");

            option2.value =
                dersAdi;

            option2.textContent =
                dersAdi;

            filtreDers.appendChild(option2);
        }
    );
}


/* =========================================================
   KARAKTER SAYACI
========================================================= */

aciklama.addEventListener(
    "input",
    () => {

        karakterSayisi.textContent =
            aciklama.value.length +
            " / 2000";
    }
);


/* =========================================================
   GÖNDERİ EKLE
========================================================= */

/* =========================================================
   FOTOĞRAF SEÇME / ÖNİZLEME
========================================================= */

function bugunYazisi() {

    const d = new Date();

    const ay = String(d.getMonth() + 1).padStart(2, "0");
    const gun = String(d.getDate()).padStart(2, "0");

    return d.getFullYear() + "-" + ay + "-" + gun;
}

teslimTarihi.min = bugunYazisi();


function onizlemeCiz() {

    onizleme.innerHTML = "";

    secilenGorseller.forEach((g, index) => {

        const kart = eleman("div", "onizleme-kart");

        const img = document.createElement("img");
        img.src = g.onizleme;
        img.alt = "Seçilen fotoğraf " + (index + 1);

        const sil = eleman("button", "onizleme-sil");
        sil.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
        sil.type = "button";
        sil.setAttribute("aria-label", "Fotoğrafı kaldır");

        sil.addEventListener("click", () => {

            URL.revokeObjectURL(g.onizleme);
            secilenGorseller.splice(index, 1);
            onizlemeCiz();
        });

        kart.appendChild(img);
        kart.appendChild(sil);
        onizleme.appendChild(kart);
    });
}


function gorselleriTemizle() {

    secilenGorseller.forEach(g => URL.revokeObjectURL(g.onizleme));
    secilenGorseller = [];
    onizlemeCiz();
}


gorselSec.addEventListener("change", () => {

    mesajTemizle();

    const dosyalar = Array.from(gorselSec.files || []);

    gorselSec.value = "";

    for (const dosya of dosyalar) {

        if (secilenGorseller.length >= MAX_FOTO) {

            mesajGoster(
                "En fazla " + MAX_FOTO + " fotoğraf ekleyebilirsin."
            );

            break;
        }

        if (!IZINLI_TURLER.includes(dosya.type)) {

            mesajGoster(
                "Sadece JPG, PNG veya WEBP fotoğraf yükleyebilirsin."
            );

            continue;
        }

        if (dosya.size > MAX_HAM_BOYUT) {

            mesajGoster(
                "Fotoğraf çok büyük (en fazla 15 MB)."
            );

            continue;
        }

        secilenGorseller.push({
            dosya: dosya,
            onizleme: URL.createObjectURL(dosya)
        });
    }

    onizlemeCiz();
});


/* =========================================================
   FOTOĞRAFI KÜÇÜLT (telefon fotoğrafları çok büyük olur)
   Canvas ile yeniden çizildiği için konum (EXIF) bilgisi de
   fotoğraftan silinir.
========================================================= */

function gorseliKucult(dosya) {

    return new Promise((coz, red) => {

        const url = URL.createObjectURL(dosya);
        const img = new Image();

        img.onload = () => {

            URL.revokeObjectURL(url);

            const oran = Math.min(
                1,
                MAX_KENAR / Math.max(img.naturalWidth, img.naturalHeight)
            );

            const canvas = document.createElement("canvas");

            canvas.width = Math.max(1, Math.round(img.naturalWidth * oran));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * oran));

            const ctx = canvas.getContext("2d");

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                blob => blob
                    ? coz(blob)
                    : red(new Error("Fotoğraf işlenemedi.")),
                "image/jpeg",
                0.85
            );
        };

        img.onerror = () => {

            URL.revokeObjectURL(url);

            red(new Error(
                "Fotoğraf okunamadı. JPG, PNG veya WEBP bir dosya seç."
            ));
        };

        img.src = url;
    });
}


/* Güvenli olmayan (http) bağlantılarda crypto.randomUUID yoktur. */
function uuidUret() {

    const b = new Uint8Array(16);
    crypto.getRandomValues(b);

    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;

    const h = Array.from(b, x => x.toString(16).padStart(2, "0"));

    return (
        h.slice(0, 4).join("") + "-" +
        h.slice(4, 6).join("") + "-" +
        h.slice(6, 8).join("") + "-" +
        h.slice(8, 10).join("") + "-" +
        h.slice(10, 16).join("")
    );
}


async function yuklenenleriSil(yollar) {

    if (!yollar.length) {
        return;
    }

    try {
        await supabaseClient.storage.from(KOVA).remove(yollar);
    } catch (e) {
        console.error("Temizleme hatası:", e);
    }
}


/*
   Her fotoğraf <kullanıcı-id>/<uuid>.jpg yoluna yüklenir.
   Storage politikası sadece kendi klasörüne yüklemeye izin verir.
*/
async function gorselleriYukle() {

    const yollar = [];

    try {

        for (const g of secilenGorseller) {

            const blob = await gorseliKucult(g.dosya);

            if (blob.size > MAX_BOYUT) {
                throw new Error("Fotoğraf çok büyük (en fazla 5 MB).");
            }

            const yol =
                mevcutKullanici.id + "/" + uuidUret() + ".jpg";

            const { error } = await supabaseClient
                .storage
                .from(KOVA)
                .upload(yol, blob, {
                    contentType: "image/jpeg",
                    upsert: false
                });

            if (error) {
                throw error;
            }

            yollar.push(yol);
        }

    } catch (e) {

        await yuklenenleriSil(yollar);
        throw e;
    }

    return yollar;
}


/* gonderi_ekle yeni kaydın id'sini döndürmüyorsa son gönderimizi bulur. */
async function yeniGonderiIdBul(donenVeri, secilenDers, baslikMetni) {

    if (typeof donenVeri === "number") {
        return donenVeri;
    }

    if (typeof donenVeri === "string" && /^\d+$/.test(donenVeri)) {
        return Number(donenVeri);
    }

    if (donenVeri && typeof donenVeri === "object" && donenVeri.id) {
        return donenVeri.id;
    }

    const { data } = await supabaseClient.rpc(
        "gonderileri_getir",
        {
            p_tur: TUR,
            p_ders: secilenDers,
            p_arama: null,
            p_limit: 10,
            p_sayfa: 0
        }
    );

    const bulunan = (Array.isArray(data) ? data : []).find(
        g => g.user_id === mevcutKullanici.id && g.baslik === baslikMetni
    );

    return bulunan ? bulunan.id : null;
}


/* =========================================================
   GÖNDERİ EKLE
========================================================= */

gonderiFormu.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        mesajTemizle();


        if (!mevcutKullanici) {

            mesajGoster(
                "Ödev paylaşmak için önce giriş yapmalısın."
            );

            return;
        }


        const secilenDers = ders.value.trim();
        const baslikMetni = baslik.value.trim();
        const aciklamaMetni = aciklama.value.trim();
        const teslim = teslimTarihi.value;


        if (!secilenDers) {
            mesajGoster("Lütfen bir ders seç.");
            return;
        }

        if (!baslikMetni) {
            mesajGoster("Başlık boş bırakılamaz.");
            return;
        }

        if (!aciklamaMetni) {
            mesajGoster("Açıklama boş bırakılamaz.");
            return;
        }

        if (!teslim) {
            mesajGoster("Lütfen teslim tarihini seç.");
            return;
        }


        gonderButonu.disabled = true;

        gonderButonu.textContent =
            secilenGorseller.length > 0
                ? "Fotoğraf yükleniyor..."
                : "Gönderiliyor...";


        /* 1) Fotoğrafları yükle (varsa) */

        let yollar = [];

        try {

            yollar = await gorselleriYukle();

        } catch (e) {

            console.error(e);

            mesajGoster(
                "Fotoğraf yüklenemedi: " + hataMetni(e)
            );

            gonderButonu.disabled = false;
            gonderButonu.textContent = "Ödevi Paylaş";

            return;
        }


        gonderButonu.textContent = "Gönderiliyor...";


        /* 2) Ödevi oluştur */

        const {
            data: donenVeri,
            error
        } = await supabaseClient.rpc(
            "gonderi_ekle",
            {
                p_tur: TUR,

                p_ders: secilenDers,

                p_baslik: baslikMetni,

                p_aciklama: aciklamaMetni,

                p_teslim_tarihi: teslim
            }
        );


        if (error) {

            console.error(error);

            await yuklenenleriSil(yollar);

            mesajGoster(hataMetni(error));

            gonderButonu.disabled = false;
            gonderButonu.textContent = "Ödevi Paylaş";

            return;
        }


        /* 3) Fotoğrafları ödeve bağla (sahiplik sunucuda kontrol edilir) */

        let fotoHatasi = "";

        if (yollar.length > 0) {

            try {

                const yeniId = await yeniGonderiIdBul(
                    donenVeri,
                    secilenDers,
                    baslikMetni
                );

                if (!yeniId) {
                    throw new Error("Ödev kaydı bulunamadı.");
                }

                for (const yol of yollar) {

                    const { error: baglaHata } = await supabaseClient.rpc(
                        "gonderi_gorsel_ekle",
                        {
                            p_gonderi_id: yeniId,
                            p_dosya_yolu: yol
                        }
                    );

                    if (baglaHata) {
                        throw baglaHata;
                    }
                }

            } catch (e) {

                console.error(e);

                fotoHatasi = hataMetni(e);

                await yuklenenleriSil(yollar);
            }
        }


        /* Formu temizle */

        ders.value = "";
        baslik.value = "";
        aciklama.value = "";
        teslimTarihi.value = "";

        gorselleriTemizle();

        karakterSayisi.textContent = "0 / 2000";


        if (fotoHatasi) {

            mesajGoster(
                "Ödev paylaşıldı ama fotoğraf eklenemedi: " + fotoHatasi
            );

        } else {

            mesajGoster("Ödev başarıyla paylaşıldı.", true);
        }


        sayfaNo = 0;

        await gonderileriGetir(false);

        gonderButonu.disabled = false;
        gonderButonu.textContent = "Ödevi Paylaş";
    }
);


/* =========================================================
   TESLİM TARİHİ + FOTOĞRAFLARI KARTLARA YERLEŞTİR
========================================================= */

function teslimYazisi(deger) {

    if (!deger) {
        return null;
    }

    const tamGun = String(deger).length === 10;

    const d = new Date(tamGun ? deger + "T00:00:00" : deger);

    if (isNaN(d.getTime())) {
        return null;
    }

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    const gecmis = d < bugun;

    return {
        metin:
            "Teslim: " + d.toLocaleDateString("tr-TR") +
            (gecmis ? " (süresi geçti)" : ""),
        gecmis: gecmis
    };
}


function fotoAc(url) {

    buyukFotoImg.src = url;
    buyukFoto.classList.add("acik");
}

function fotoKapat() {

    buyukFoto.classList.remove("acik");
    buyukFotoImg.removeAttribute("src");
}

buyukFoto.addEventListener("click", fotoKapat);

document.addEventListener("keydown", event => {

    if (event.key === "Escape" && buyukFoto.classList.contains("acik")) {
        fotoKapat();
    }
});


async function ekleriDoldur(gonderiler) {

    if (!gonderiler.length) {
        return;
    }

    const idler = gonderiler.map(g => g.id);

    const { data, error } = await supabaseClient.rpc(
        "gonderi_ekleri_getir",
        { p_gonderi_idleri: idler }
    );

    if (error) {

        /* Ek bilgiler gelmezse ödevler yine de listelenir. */
        console.error("Ödev ekleri alınamadı:", error);
        return;
    }

    const ekler = Array.isArray(data) ? data : [];

    /* Tüm fotoğraflar için tek seferde imzalı bağlantı iste. */

    const tumYollar = [];

    ekler.forEach(e => (e.dosya_yollari || []).forEach(y => tumYollar.push(y)));

    const adresler = {};

    if (tumYollar.length > 0 && mevcutKullanici) {

        const { data: imzali, error: imzaHata } = await supabaseClient
            .storage
            .from(KOVA)
            .createSignedUrls(tumYollar, 3600);

        if (imzaHata) {
            console.error("Fotoğraf bağlantısı alınamadı:", imzaHata);
        } else {
            (imzali || []).forEach(i => {
                if (i.signedUrl) {
                    adresler[i.path] = i.signedUrl;
                }
            });
        }
    }

    ekler.forEach(ek => {

        const kart = gonderiListesi.querySelector(
            '[data-gonderi-id="' + ek.gonderi_id + '"]'
        );

        if (!kart) {
            return;
        }

        kart.dataset.yollar = JSON.stringify(ek.dosya_yollari || []);

        /* Teslim tarihi */

        const t = teslimYazisi(ek.teslim_tarihi);
        const meta = kart.querySelector(".gonderi-meta");

        if (t && meta && !meta.querySelector(".teslim-etiket")) {

            meta.insertBefore(
                eleman(
                    "span",
                    "teslim-etiket" + (t.gecmis ? " gecmis" : ""),
                    t.metin
                ),
                meta.children[1] || null
            );
        }

        /* Fotoğraflar */

        const alan = kart.querySelector(".ek-alani");

        if (!alan) {
            return;
        }

        alan.innerHTML = "";

        const gorunenler = (ek.dosya_yollari || [])
            .map(y => adresler[y])
            .filter(Boolean);

        if (gorunenler.length === 0) {

            if ((ek.dosya_yollari || []).length > 0 && !mevcutKullanici) {
                alan.appendChild(
                    eleman(
                        "div",
                        "small-note",
                        "Fotoğrafları görmek için giriş yap."
                    )
                );
            }

            return;
        }

        const galeri = eleman("div", "galeri");

        gorunenler.forEach((url, i) => {

            const dugme = document.createElement("button");
            dugme.type = "button";
            dugme.setAttribute("aria-label", "Fotoğrafı büyüt");

            const img = document.createElement("img");
            img.src = url;
            img.alt = "Ödev fotoğrafı " + (i + 1);
            img.loading = "lazy";

            dugme.appendChild(img);
            dugme.addEventListener("click", () => fotoAc(url));

            galeri.appendChild(dugme);
        });

        alan.appendChild(galeri);
    });
}


/* =========================================================
   GÖNDERİLERİ GETİR
========================================================= */

async function gonderileriGetir(devam = false) {

    if (yukleniyor) {
        return;
    }

    yukleniyor = true;


    if (!devam) {

        sayfaNo = 0;

        gonderiListesi.innerHTML = "";

        const yukleniyorYazisi =
            eleman(
                "div",
                "yukleniyor",
                "Ödevler yükleniyor..."
            );

        gonderiListesi.appendChild(
            yukleniyorYazisi
        );
    }


    const secilenDers =
        filtreDers.value || null;

    const arama =
        filtreArama.value.trim() || null;


    const {
        data,
        error
    } = await supabaseClient.rpc(
        "gonderileri_getir",
        {
            p_tur: TUR,

            p_ders: secilenDers,

            p_arama: arama,

            p_limit: SAYFA_BOYUTU,

            p_sayfa: sayfaNo
        }
    );


    yukleniyor = false;


    if (error) {

        console.error(error);

        if (!devam) {
            gonderiListesi.innerHTML = "";
        }

        const hata =
            eleman(
                "div",
                "bos-liste",
                "Ödevler yüklenirken bir hata oluştu: " +
                hataMetni(error)
            );

        gonderiListesi.appendChild(
            hata
        );

        dahaButonu.style.display =
            "none";

        return;
    }


    const gonderiler =
        Array.isArray(data)
            ? data
            : [];


    /*
       İlk sayfadaysak listeyi temizliyoruz.
    */

    if (!devam) {
        gonderiListesi.innerHTML = "";
    }


    if (
        !devam &&
        gonderiler.length === 0
    ) {

        const bos =
            eleman(
                "div",
                "bos-liste",
                "Henüz paylaşılmış bir ödev yok."
            );

        gonderiListesi.appendChild(
            bos
        );

        dahaButonu.style.display =
            "none";

        listeDurumu.textContent =
            "";

        return;
    }


    gonderiler.forEach(
        gonderi => {

            const kart =
                gonderiOlustur(gonderi);

            gonderiListesi.appendChild(
                kart
            );
        }
    );


    /*
       Gelen kayıt sayısı 20 ise
       daha fazla kayıt olabileceğini varsayıyoruz.
    */

    await ekleriDoldur(gonderiler);

    dahaFazlaVar =
        gonderiler.length === SAYFA_BOYUTU;


    if (dahaFazlaVar) {

        dahaButonu.style.display =
            "inline-block";

    } else {

        dahaButonu.style.display =
            "none";
    }


    listeDurumu.textContent =
        gonderiler.length +
        " ödev gösteriliyor";
}


/* =========================================================
   GÖNDERİ KARTI
========================================================= */

function gonderiOlustur(gonderi) {

    const kart =
        eleman(
            "article",
            "gonderi"
        );

    kart.dataset.gonderiId = gonderi.id;


    /* -----------------------------------------------------
       ÜST
    ----------------------------------------------------- */

    const ust =
        eleman(
            "div",
            "gonderi-ust"
        );


    const meta =
        eleman(
            "div",
            "gonderi-meta"
        );


    const dersEtiketi =
        eleman(
            "span",
            "ders-etiket",
            gonderi.ders || "Ders"
        );


    const tarih =
        eleman(
            "span",
            "gonderi-tarih",
            tarihFormatla(
                gonderi.created_at
            )
        );


    meta.appendChild(
        dersEtiketi
    );

    meta.appendChild(
        tarih
    );


    ust.appendChild(
        meta
    );

    kart.appendChild(
        ust
    );


    /* -----------------------------------------------------
       BAŞLIK
    ----------------------------------------------------- */

    const baslikEl =
        eleman(
            "h3",
            null,
            gonderi.baslik
        );

    kart.appendChild(
        baslikEl
    );


    /* -----------------------------------------------------
       AÇIKLAMA
    ----------------------------------------------------- */

    const aciklamaEl =
        eleman(
            "div",
            "gonderi-aciklama",
            gonderi.aciklama
        );

    kart.appendChild(
        aciklamaEl
    );

    /* Teslim tarihi ve fotoğraflar sonradan buraya yerleşir. */
    kart.appendChild(
        eleman("div", "ek-alani")
    );


    /* -----------------------------------------------------
       ALT
    ----------------------------------------------------- */

    const alt =
        eleman(
            "div",
            "gonderi-alt"
        );


    const sahip =
        eleman(
            "span",
            "gonderi-sahip",
            "Paylaşan: " +
            (gonderi.ad || "Kullanıcı")
        );


    const islemler =
        eleman(
            "div",
            "gonderi-islemler"
        );


    /* -----------------------------------------------------
       CEVAPLAR
    ----------------------------------------------------- */

    const cevapButonu =
        eleman(
            "button",
            "kucuk-buton cevaplari-buton",
            "Cevaplar (" +
            Number(gonderi.cevap_sayisi || 0) +
            ")"
        );

    cevapButonu.type = "button";


    const cevapAlani =
        cevapAlaniOlustur(
            gonderi
        );


    cevapButonu.addEventListener(
        "click",
        async () => {

            const acikMi =
                cevapAlani.classList.contains(
                    "acik"
                );


            if (acikMi) {

                cevapAlani.classList.remove(
                    "acik"
                );

                return;
            }


            cevapAlani.classList.add(
                "acik"
            );


            await cevaplariGetir(
                gonderi.id,
                cevapAlani
            );
        }
    );


    islemler.appendChild(
        cevapButonu
    );


    /* -----------------------------------------------------
       SİLME
    ----------------------------------------------------- */

    if (
        mevcutKullanici &&
        (
            gonderi.user_id ===
            mevcutKullanici.id
            ||
            mevcutKullaniciAdminMi
        )
    ) {

        const silButonu =
            eleman(
                "button",
                "kucuk-buton sil-buton",
                "Sil"
            );

        silButonu.type = "button";


        silButonu.addEventListener(
            "click",
            () => {

                gonderiSil(
                    gonderi.id,
                    kart
                );
            }
        );


        islemler.appendChild(
            silButonu
        );
    }


    alt.appendChild(
        sahip
    );

    alt.appendChild(
        islemler
    );

    kart.appendChild(
        alt
    );


    kart.appendChild(
        cevapAlani
    );


    return kart;
}


/* =========================================================
   CEVAP ALANI
========================================================= */

function cevapAlaniOlustur(gonderi) {

    const alan =
        eleman(
            "div",
            "cevap-alani"
        );


    const liste =
        eleman(
            "div",
            "cevap-listesi"
        );


    liste.dataset.cevapListesi =
        "true";


    alan.appendChild(
        liste
    );


    if (!mevcutKullanici) {

        const giris =
            eleman(
                "div",
                "cevap-giris"
            );


        const metin =
            document.createElement("span");


        metin.appendChild(
            document.createTextNode(
                "Cevap yazmak için "
            )
        );


        const link =
            document.createElement("a");

        link.href =
            "giris.html";

        link.textContent =
            "giriş yap";

        metin.appendChild(
            link
        );


        metin.appendChild(
            document.createTextNode(
                "malısın."
            )
        );


        giris.appendChild(
            metin
        );


        alan.appendChild(
            giris
        );


        return alan;
    }


    /* -----------------------------------------------------
       CEVAP FORMU
    ----------------------------------------------------- */

    const form =
        document.createElement("form");

    form.className =
        "cevap-form";


    const textarea =
        document.createElement("textarea");

    textarea.maxLength =
        1000;

    textarea.placeholder =
        "Bu soruya yardımcı ol...";


    const buton =
        eleman(
            "button",
            "cevap-gonder",
            "Cevapla"
        );

    buton.type =
        "submit";


    form.appendChild(
        textarea
    );

    form.appendChild(
        buton
    );


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const metin =
                textarea.value.trim();


            if (!metin) {

                alert(
                    "Cevap boş bırakılamaz."
                );

                return;
            }


            buton.disabled =
                true;

            buton.textContent =
                "Gönderiliyor...";


            const {
                error
            } = await supabaseClient.rpc(
                "gonderi_cevap_ekle",
                {
                    p_gonderi_id:
                        gonderi.id,

                    p_cevap:
                        metin,

                    p_ust_cevap_id:
                        null
                }
            );


            if (error) {

                alert(
                    hataMetni(error)
                );

                buton.disabled =
                    false;

                buton.textContent =
                    "Cevapla";

                return;
            }


            textarea.value = "";


            await cevaplariGetir(
                gonderi.id,
                alan
            );


            buton.disabled =
                false;

            buton.textContent =
                "Cevapla";
        }
    );


    alan.appendChild(
        form
    );


    return alan;
}


/* =========================================================
   CEVAPLARI GETİR
========================================================= */

async function cevaplariGetir(
    gonderiId,
    cevapAlani
) {

    const liste =
        cevapAlani.querySelector(
            '[data-cevap-listesi="true"]'
        );


    liste.innerHTML =
        "";


    const yukleniyor =
        eleman(
            "div",
            null,
            "Cevaplar yükleniyor..."
        );


    liste.appendChild(
        yukleniyor
    );


    const {
        data,
        error
    } = await supabaseClient.rpc(
        "gonderi_cevaplarini_getir",
        {
            p_gonderi_id:
                gonderiId
        }
    );


    if (error) {

        liste.innerHTML = "";

        liste.appendChild(
            eleman(
                "div",
                null,
                "Cevaplar alınamadı: " +
                hataMetni(error)
            )
        );

        return;
    }


    liste.innerHTML = "";


    const cevaplar =
        Array.isArray(data)
            ? data
            : [];


    if (cevaplar.length === 0) {

        liste.appendChild(
            eleman(
                "div",
                null,
                "Henüz cevap yok. İlk cevabı sen verebilirsin."
            )
        );

        return;
    }


    cevaplar.forEach(
        cevap => {

            const cevapEl =
                cevapOlustur(
                    cevap
                );

            liste.appendChild(
                cevapEl
            );
        }
    );
}


/* =========================================================
   TEK CEVAP
========================================================= */

function cevapOlustur(cevap) {

    const el =
        eleman(
            "div",
            "cevap"
        );


    const ust =
        eleman(
            "div",
            "cevap-ust"
        );


    const yazar =
        eleman(
            "span",
            "cevap-yazar",
            cevap.ad || "Kullanıcı"
        );


    const tarih =
        eleman(
            "span",
            "cevap-tarih",
            tarihFormatla(
                cevap.created_at
            )
        );


    ust.appendChild(
        yazar
    );

    ust.appendChild(
        tarih
    );


    el.appendChild(
        ust
    );


    const metin =
        eleman(
            "div",
            "cevap-metin",
            cevap.cevap
        );


    el.appendChild(
        metin
    );


    /*
       Kendi cevabı veya admin ise silme.
    */

    if (
        mevcutKullanici &&
        (
            cevap.user_id ===
            mevcutKullanici.id
            ||
            mevcutKullaniciAdminMi
        )
    ) {

        const sil =
            eleman(
                "button",
                "cevap-sil",
                "Cevabı Sil"
            );

        sil.type =
            "button";


        sil.addEventListener(
            "click",
            async () => {

                const onay =
                    confirm(
                        "Bu cevabı silmek istediğine emin misin?"
                    );


                if (!onay) {
                    return;
                }


                sil.disabled =
                    true;


                const {
                    error
                } = await supabaseClient.rpc(
                    "gonderi_cevap_sil",
                    {
                        p_id:
                            cevap.id
                    }
                );


                if (error) {

                    alert(
                        hataMetni(error)
                    );

                    sil.disabled =
                        false;

                    return;
                }


                el.remove();
            }
        );


        el.appendChild(
            sil
        );
    }


    return el;
}


/* =========================================================
   GÖNDERİ SİL
========================================================= */

async function gonderiSil(
    id,
    kart
) {

    const onay =
        confirm(
            "Bu ödevi, fotoğraflarını ve cevaplarını silmek istediğine emin misin?"
        );


    if (!onay) {
        return;
    }


    const {
        error
    } = await supabaseClient.rpc(
        "gonderi_sil",
        {
            p_id: id
        }
    );


    if (error) {

        alert(
            hataMetni(error)
        );

        return;
    }


    /* Ödev silindi; dosyaları da kaldır (sahibi veya admin silebilir). */
    try {

        const yollar = JSON.parse(kart.dataset.yollar || "[]");

        if (yollar.length > 0) {
            await supabaseClient.storage.from(KOVA).remove(yollar);
        }

    } catch (e) {
        console.error("Dosya temizleme hatası:", e);
    }

    kart.remove();


    /*
       Liste tamamen boş kaldıysa
       bilgi mesajı göster.
    */

    if (
        gonderiListesi.children.length === 0
    ) {

        gonderiListesi.appendChild(
            eleman(
                "div",
                "bos-liste",
                "Henüz paylaşılmış bir ödev yok."
            )
        );
    }
}


/* =========================================================
   ARAMA
========================================================= */

araButonu.addEventListener(
    "click",
    async () => {

        await gonderileriGetir(
            false
        );
    }
);


/*
   Enter ile arama.
*/

filtreArama.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            araButonu.click();
        }
    }
);


/*
   Ders değişince direkt filtrele.
*/

filtreDers.addEventListener(
    "change",
    async () => {

        await gonderileriGetir(
            false
        );
    }
);


/* =========================================================
   DAHA FAZLA
========================================================= */

dahaButonu.addEventListener(
    "click",
    async () => {

        if (!dahaFazlaVar) {
            return;
        }


        dahaButonu.disabled =
            true;

        dahaButonu.textContent =
            "Yükleniyor...";


        sayfaNo++;


        await gonderileriGetir(
            true
        );


        dahaButonu.disabled =
            false;

        dahaButonu.textContent =
            "Daha Fazla";
    }
);


/* =========================================================
   AUTH DEĞİŞİKLİĞİ
========================================================= */

supabaseClient.auth.onAuthStateChange(
    async (
        event,
        session
    ) => {

        const eskiId =
            mevcutKullanici?.id || null;

        const yeniId =
            session?.user?.id || null;


        mevcutKullanici =
            session?.user || null;


        /*
           Kullanıcı gerçekten değiştiyse
           butonları ve silme izinlerini yenile.
        */

        if (
            eskiId !== yeniId
        ) {

            await kullaniciyiGuncelle();

            await gonderileriGetir(false);
        }
    }
);


/* =========================================================
   BAŞLAT
========================================================= */

async function baslat() {

    await kullaniciyiGuncelle();

    await dersListesiniGetir();

    await gonderileriGetir(false);
}


baslat();
