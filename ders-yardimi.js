/* =========================================================
   OKUL USTASI - DERS YARDIMI
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

let yukleniyor = false;

let dahaFazlaVar = false;


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

gonderiFormu.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        mesajTemizle();


        if (!mevcutKullanici) {

            mesajGoster(
                "Yardım istemek için önce giriş yapmalısın."
            );

            return;
        }


        const secilenDers =
            ders.value.trim();

        const baslikMetni =
            baslik.value.trim();

        const aciklamaMetni =
            aciklama.value.trim();


        if (!secilenDers) {

            mesajGoster(
                "Lütfen bir ders seç."
            );

            return;
        }


        if (!baslikMetni) {

            mesajGoster(
                "Başlık boş bırakılamaz."
            );

            return;
        }


        if (!aciklamaMetni) {

            mesajGoster(
                "Açıklama boş bırakılamaz."
            );

            return;
        }


        gonderButonu.disabled = true;

        gonderButonu.textContent =
            "Gönderiliyor...";


        const {
            error
        } = await supabaseClient.rpc(
            "gonderi_ekle",
            {
                p_tur: "ders_yardimi",

                p_ders: secilenDers,

                p_baslik: baslikMetni,

                p_aciklama: aciklamaMetni,

                p_teslim_tarihi: null
            }
        );


        if (error) {

            console.error(error);

            mesajGoster(
                hataMetni(error)
            );

            gonderButonu.disabled = false;

            gonderButonu.textContent =
                "Yardım İste";

            return;
        }


        /*
           Formu temizle.
        */

        ders.value = "";

        baslik.value = "";

        aciklama.value = "";

        karakterSayisi.textContent =
            "0 / 2000";


        mesajGoster(
            "Sorun başarıyla paylaşıldı.",
            true
        );


        /*
           Listeyi baştan yükle.
        */

        sayfaNo = 0;

        await gonderileriGetir(false);


        gonderButonu.disabled = false;

        gonderButonu.textContent =
            "Yardım İste";
    }
);


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
                "Sorular yükleniyor..."
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
            p_tur: "ders_yardimi",

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
                "Sorular yüklenirken bir hata oluştu: " +
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
                "Henüz bu bölümde bir soru yok."
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
        " soru gösteriliyor";
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
            "Soruyu soran: " +
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
            "Bu soruyu ve cevaplarını silmek istediğine emin misin?"
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
                "Henüz bu bölümde bir soru yok."
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
