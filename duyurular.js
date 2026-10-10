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
   ELEMENTLER
========================================================= */

const topLoginLink = document.getElementById("topLoginLink");
const topUser = document.getElementById("topUser");
const topUserEmail = document.getElementById("topUserEmail");
const logoutButton = document.getElementById("logoutButton");
const duyuruListesi = document.getElementById("duyuruListesi");
const adminPanel = document.getElementById("adminPanel");
const adminLoginBox = document.getElementById("adminLoginBox");
const adminControls = document.getElementById("adminControls");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminLoginButton = document.getElementById("adminLoginButton");
const adminMessage = document.getElementById("adminMessage");
const adminDuyuruList = document.getElementById("adminDuyuruList");
const duyuruBaslikInput = document.getElementById("duyuruBaslikInput");
const duyuruAciklamaInput = document.getElementById("duyuruAciklamaInput");
const duyuruTarihInput = document.getElementById("duyuruTarihInput");
const duyuruFormTitle = document.getElementById("duyuruFormTitle");
const saveDuyuruButton = document.getElementById("saveDuyuruButton");
const cancelDuyuruButton = document.getElementById("cancelDuyuruButton");
const duyuruMessage = document.getElementById("duyuruMessage");
const adminLogoutButton = document.getElementById("adminLogoutButton");


/* =========================================================
   DURUM
========================================================= */

let duzenlenenDuyuruId = null;
let duyuruGetirSurum = 0;
let mevcutSession = null;
let mevcutKullanici = null;
let mevcutKullaniciAdminMi = false;


/* =========================================================
   ÜST ÇUBUK
========================================================= */

function ustCubuguGuncelle(session) {

    mevcutSession = session;
    mevcutKullanici = session?.user || null;

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


logoutButton.addEventListener("click", async function () {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        console.error("Çıkış yapılamadı:", error);
        return;
    }

    mevcutSession = null;
    mevcutKullanici = null;
    mevcutKullaniciAdminMi = false;

    await duyurulariGetir();
});


supabaseClient.auth.onAuthStateChange(
    async function (event, session) {

        ustCubuguGuncelle(session);

        if (session && session.user) {
            mevcutKullanici = session.user;
        } else {
            mevcutKullanici = null;
            mevcutKullaniciAdminMi = false;
        }

        await duyurulariGetir();
    }
);


supabaseClient.auth.getSession().then(
    function (result) {
        ustCubuguGuncelle(result.data.session);
    }
);


/* =========================================================
   TARİH FORMATLAMA
========================================================= */

function tarihiFormatla(tarih) {

    if (!tarih) {
        return "";
    }

    const parcalar = tarih.split("-");

    if (parcalar.length !== 3) {
        return tarih;
    }

    return (
        parcalar[2] + "." +
        parcalar[1] + "." +
        parcalar[0]
    );
}


function yorumTarihiFormatla(tarih) {

    if (!tarih) {
        return "";
    }

    const tarihObjesi = new Date(tarih);

    if (Number.isNaN(tarihObjesi.getTime())) {
        return "";
    }

    return tarihObjesi.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* =========================================================
   DUYURULARI GETİR
========================================================= */

async function duyurulariGetir() {

    /* Aynı anda birden fazla çağrı (başlangıç, oturum olayı, 30 sn'lik
       yenileme) çalışabilir. Yalnızca EN SON çağrı listeyi çizer. */
    const surum = ++duyuruGetirSurum;

    duyuruListesi.textContent =
        "Duyurular yükleniyor...";

    const {
        data,
        error
    } = await supabaseClient
        .rpc("duyurulari_getir");

    if (error) {

        console.error(
            "Duyurular alınamadı:",
            error
        );

        duyuruListesi.textContent =
            "Duyurular şu anda yüklenemiyor.";

        return [];
    }

    if (!data || data.length === 0) {

        duyuruListesi.textContent =
            "Henüz yayınlanmış bir duyuru yok.";

        return [];
    }

    if (mevcutKullanici) {
        mevcutKullaniciAdminMi = await adminMi();
    } else {
        mevcutKullaniciAdminMi = false;
    }

    if (surum !== duyuruGetirSurum) {
        return data;
    }

    /* Liste önce bellekte hazırlanır, en sonda tek hamlede yerine konur. */
    const parca = document.createDocumentFragment();

    for (const duyuru of data) {

        const kutu = document.createElement("div");
        kutu.className = "duyuru";

        const baslik = document.createElement("h2");
        baslik.textContent = duyuru.baslik;

        const tarih = document.createElement("div");
        tarih.className = "duyuru-tarih";
        tarih.textContent =
            "Tarih: " + tarihiFormatla(duyuru.tarih);

        const aciklama = document.createElement("p");
        aciklama.className = "duyuru-aciklama";
        aciklama.textContent = duyuru.aciklama;

        kutu.appendChild(baslik);
        kutu.appendChild(tarih);
        kutu.appendChild(aciklama);

        const yorumAlani =
            await yorumAlaniOlustur(duyuru.id);

        kutu.appendChild(yorumAlani);
        parca.appendChild(kutu);

        if (surum !== duyuruGetirSurum) {
            return data;
        }
    }

    if (surum !== duyuruGetirSurum) {
        return data;
    }

    duyuruListesi.innerHTML = "";
    duyuruListesi.appendChild(parca);

    return data;
}


/* =========================================================
   YORUM ALANI
========================================================= */

async function yorumAlaniOlustur(duyuruId) {

    const alan = document.createElement("div");
    alan.className = "yorum-alani";

    const baslik = document.createElement("h3");
    baslik.textContent = "Yorumlar";
    alan.appendChild(baslik);

    const yorumListesi = document.createElement("div");
    yorumListesi.className = "yorum-listesi";

    const {
        data,
        error
    } = await supabaseClient
        .rpc("duyuru_yorumlarini_getir", {
            p_duyuru_id: duyuruId
        });

    if (error) {

        console.error(
            "Yorumlar alınamadı:",
            error
        );

        yorumListesi.textContent =
            "Yorumlar yüklenemedi.";

    } else if (!data || data.length === 0) {

        yorumListesi.textContent =
            "Henüz yorum yok.";

    } else {

        data.forEach(function (yorum) {
            yorumListesi.appendChild(
                yorumKutusuOlustur(yorum)
            );
        });
    }

    alan.appendChild(yorumListesi);


    /* =====================================================
       YORUM YAZMA
    ===================================================== */

    const yorumForm = document.createElement("div");
    yorumForm.className = "yorum-form";

    if (!mevcutKullanici) {

        const girisMesaji = document.createElement("p");
        girisMesaji.textContent =
            "Yorum yazmak için giriş yapmalısın.";

        yorumForm.appendChild(girisMesaji);

    } else {

        const textarea = document.createElement("textarea");
        textarea.className = "input";
        textarea.maxLength = 500;
        textarea.placeholder = "Yorumunu yaz...";

        const bilgi = document.createElement("div");
        bilgi.className = "small-note";
        bilgi.textContent = "En fazla 500 karakter.";

        const yorumButton = document.createElement("button");
        yorumButton.className = "secondary-button";
        yorumButton.textContent = "Yorum Yap";

        const mesaj = document.createElement("div");
        mesaj.className = "form-message";

        yorumButton.addEventListener("click", async function () {

            const yorum = textarea.value.trim();

            if (!yorum) {
                mesaj.textContent = "Yorum boş olamaz.";
                return;
            }

            if (yorum.length > 500) {
                mesaj.textContent =
                    "Yorum en fazla 500 karakter olabilir.";
                return;
            }

            yorumButton.disabled = true;
            mesaj.textContent = "Yorum gönderiliyor...";

            const { error } =
                await supabaseClient
                    .rpc("duyuru_yorum_ekle", {
                        p_duyuru_id: duyuruId,
                        p_yorum: yorum
                    });

            if (error) {

                console.error(
                    "Yorum gönderilemedi:",
                    error
                );

                mesaj.textContent =
                    "Yorum gönderilemedi: " +
                    error.message;

                yorumButton.disabled = false;
                return;
            }

            await duyurulariGetir();
        });

        yorumForm.appendChild(textarea);
        yorumForm.appendChild(bilgi);
        yorumForm.appendChild(yorumButton);
        yorumForm.appendChild(mesaj);
    }

    alan.appendChild(yorumForm);

    return alan;
}


/* =========================================================
   YORUM KUTUSU
========================================================= */

function yorumKutusuOlustur(yorum) {

    const kutu = document.createElement("div");
    kutu.className = "yorum";

    const ustSatir = document.createElement("div");

    const isim = document.createElement("strong");
    isim.textContent = yorum.ad || "Kullanıcı";

    const tarih = document.createElement("span");
    tarih.textContent =
        " • " + yorumTarihiFormatla(yorum.created_at);

    ustSatir.appendChild(isim);
    ustSatir.appendChild(tarih);

    const metin = document.createElement("p");
    metin.textContent = yorum.yorum;

    kutu.appendChild(ustSatir);
    kutu.appendChild(metin);

    const kendiYorumu =
        mevcutKullanici &&
        yorum.user_id === mevcutKullanici.id;

    if (kendiYorumu || mevcutKullaniciAdminMi) {

        const silButton = document.createElement("button");
        silButton.className = "secondary-button";
        silButton.textContent = "Yorumu Sil";

        silButton.addEventListener("click", async function () {
            await yorumSil(yorum.id);
        });

        kutu.appendChild(silButton);
    }

    return kutu;
}


/* =========================================================
   YORUM SİL
========================================================= */

async function yorumSil(yorumId) {

    const onay = confirm(
        "Bu yorum silinsin mi?"
    );

    if (!onay) {
        return;
    }

    const { error } =
        await supabaseClient
            .rpc("duyuru_yorum_sil", {
                p_id: yorumId
            });

    if (error) {

        console.error(
            "Yorum silinemedi:",
            error
        );

        alert(
            "Yorum silinemedi: " +
            error.message
        );

        return;
    }

    await duyurulariGetir();
}


/* =========================================================
   ADMIN KONTROLÜ
========================================================= */

async function adminMi() {

    const {
        data,
        error
    } = await supabaseClient
        .rpc("is_admin");

    if (error) {

        console.error(
            "Admin kontrolü başarısız:",
            error
        );

        return false;
    }

    return data === true;
}


/* =========================================================
   ADMIN PANELİ
========================================================= */

function adminPaneliniKontrolEt() {

    if (
        window.location.hash.toLowerCase() === "#admin"
    ) {

        adminPanel.style.display = "block";

    } else {

        adminPanel.style.display = "none";
        adminControls.style.display = "none";
        adminLoginBox.style.display = "block";
    }
}


/* =========================================================
   ADMIN GİRİŞ
========================================================= */

async function adminGiris() {

    const email = adminEmail.value.trim();
    const password = adminPassword.value;

    adminMessage.textContent = "";

    if (!email || !password) {
        adminMessage.textContent = "E-posta ve şifre gir.";
        return;
    }

    adminMessage.textContent = "Giriş yapılıyor...";
    adminLoginButton.disabled = true;

    const { error } =
        await ouSifre.girisDene(supabaseClient, email, password);

    if (error) {

        adminMessage.textContent =
            "Giriş başarısız: " + error.message;

        adminLoginButton.disabled = false;
        return;
    }

    const yetkili = await adminMi();

    if (!yetkili) {

        await supabaseClient.auth.signOut();

        adminMessage.textContent =
            "Bu hesap yönetici olarak yetkilendirilmemiş.";

        adminLoginButton.disabled = false;
        return;
    }

    mevcutKullaniciAdminMi = true;

    adminLoginBox.style.display = "none";
    adminControls.style.display = "block";
    adminMessage.textContent = "";
    adminLoginButton.disabled = false;

    await adminDuyurulariGetir();
    await duyurulariGetir();
}


/* =========================================================
   ADMIN DUYURULARINI GETİR
========================================================= */

async function adminDuyurulariGetir() {

    adminDuyuruList.textContent =
        "Duyurular yükleniyor...";

    const {
        data,
        error
    } = await supabaseClient
        .rpc("duyurulari_getir");

    if (error) {

        adminDuyuruList.textContent =
            "Duyurular alınamadı.";

        console.error(error);
        return;
    }

    if (!data || data.length === 0) {

        adminDuyuruList.textContent =
            "Henüz duyuru yok.";

        return;
    }

    adminDuyuruList.innerHTML = "";

    data.forEach(function (duyuru) {

        const kutu = document.createElement("div");
        kutu.className = "admin-duyuru";

        const baslik = document.createElement("strong");
        baslik.textContent = duyuru.baslik;

        const tarih = document.createElement("div");
        tarih.className = "duyuru-tarih";
        tarih.textContent =
            "Tarih: " + tarihiFormatla(duyuru.tarih);

        const aciklama = document.createElement("div");
        aciklama.className = "admin-duyuru-aciklama";
        aciklama.textContent = duyuru.aciklama;

        const duzenleButton = document.createElement("button");
        duzenleButton.className = "secondary-button";
        duzenleButton.textContent = "Düzenle";

        duzenleButton.addEventListener("click", function () {
            duyuruDuzenle(duyuru);
        });

        const silButton = document.createElement("button");
        silButton.className = "secondary-button";
        silButton.textContent = "Sil";

        silButton.addEventListener("click", function () {
            duyuruSil(duyuru.id);
        });

        kutu.appendChild(baslik);
        kutu.appendChild(tarih);
        kutu.appendChild(aciklama);
        kutu.appendChild(duzenleButton);
        kutu.appendChild(silButton);

        adminDuyuruList.appendChild(kutu);
    });
}


/* =========================================================
   DUYURU EKLE / GÜNCELLE
========================================================= */

async function duyuruKaydet() {

    const baslik = duyuruBaslikInput.value.trim();
    const aciklama = duyuruAciklamaInput.value.trim();
    const tarih = duyuruTarihInput.value;

    duyuruMessage.textContent = "";

    if (!baslik) {
        duyuruMessage.textContent = "Duyuru başlığı gir.";
        return;
    }

    if (!aciklama) {
        duyuruMessage.textContent = "Duyuru açıklaması gir.";
        return;
    }

    if (!tarih) {
        duyuruMessage.textContent = "Duyuru tarihi seç.";
        return;
    }

    saveDuyuruButton.disabled = true;
    duyuruMessage.textContent = "Kaydediliyor...";

    let error = null;

    if (duzenlenenDuyuruId === null) {

        const result =
            await supabaseClient
                .rpc("duyuru_ekle", {
                    p_baslik: baslik,
                    p_aciklama: aciklama,
                    p_tarih: tarih
                });

        error = result.error;

    } else {

        const result =
            await supabaseClient
                .rpc("duyuru_guncelle", {
                    p_id: duzenlenenDuyuruId,
                    p_baslik: baslik,
                    p_aciklama: aciklama,
                    p_tarih: tarih
                });

        error = result.error;
    }

    if (error) {

        console.error(
            "Duyuru kaydedilemedi:",
            error
        );

        duyuruMessage.textContent =
            "Duyuru kaydedilemedi: " + error.message;

        saveDuyuruButton.disabled = false;
        return;
    }

    duyuruMessage.textContent =
        duzenlenenDuyuruId === null
            ? "Duyuru başarıyla eklendi."
            : "Duyuru başarıyla güncellendi.";

    duyuruDuzenlemeyiIptalEt();

    await duyurulariGetir();
    await adminDuyurulariGetir();

    saveDuyuruButton.disabled = false;
}


/* =========================================================
   DUYURU DÜZENLE
========================================================= */

function duyuruDuzenle(duyuru) {

    duzenlenenDuyuruId = duyuru.id;

    duyuruFormTitle.textContent =
        "Duyuruyu Düzenle";

    saveDuyuruButton.textContent =
        "Değişiklikleri Kaydet";

    cancelDuyuruButton.style.display =
        "inline-block";

    duyuruBaslikInput.value = duyuru.baslik;
    duyuruAciklamaInput.value = duyuru.aciklama;
    duyuruTarihInput.value = duyuru.tarih;
    duyuruMessage.textContent = "";

    duyuruBaslikInput.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================================
   DÜZENLEMEYİ İPTAL
========================================================= */

function duyuruDuzenlemeyiIptalEt() {

    duzenlenenDuyuruId = null;

    duyuruFormTitle.textContent =
        "Yeni Duyuru Ekle";

    saveDuyuruButton.textContent =
        "Duyuruyu Kaydet";

    cancelDuyuruButton.style.display =
        "none";

    duyuruBaslikInput.value = "";
    duyuruAciklamaInput.value = "";
    duyuruTarihInput.value = "";
}


/* =========================================================
   DUYURU SİL
========================================================= */

async function duyuruSil(id) {

    const onay = confirm(
        "Bu duyuru kalıcı olarak silinsin mi?"
    );

    if (!onay) {
        return;
    }

    const { error } =
        await supabaseClient
            .rpc("duyuru_sil", {
                p_id: id
            });

    if (error) {

        console.error(
            "Duyuru silinemedi:",
            error
        );

        alert(
            "Duyuru silinemedi: " + error.message
        );

        return;
    }

    await duyurulariGetir();
    await adminDuyurulariGetir();
}


/* =========================================================
   ADMIN ÇIKIŞ
========================================================= */

async function adminCikis() {

    await supabaseClient.auth.signOut();

    mevcutKullaniciAdminMi = false;

    adminControls.style.display = "none";
    adminLoginBox.style.display = "block";

    adminEmail.value = "";
    adminPassword.value = "";

    adminMessage.textContent =
        "Yönetici çıkışı yapıldı.";

    await duyurulariGetir();
}


/* =========================================================
   BUTONLAR
========================================================= */

adminLoginButton.addEventListener(
    "click",
    adminGiris
);

saveDuyuruButton.addEventListener(
    "click",
    duyuruKaydet
);

cancelDuyuruButton.addEventListener(
    "click",
    duyuruDuzenlemeyiIptalEt
);

adminLogoutButton.addEventListener(
    "click",
    adminCikis
);


/* =========================================================
   BAŞLANGIÇ
========================================================= */

async function baslat() {

    adminPaneliniKontrolEt();

    const {
        data: {
            session
        }
    } = await supabaseClient
        .auth
        .getSession();

    ustCubuguGuncelle(session);

    if (session && session.user) {

        mevcutKullanici = session.user;
        mevcutKullaniciAdminMi = await adminMi();
    }

    await duyurulariGetir();

    if (
        window.location.hash.toLowerCase() !== "#admin"
    ) {
        return;
    }

    if (!session) {
        return;
    }

    if (mevcutKullaniciAdminMi) {

        adminLoginBox.style.display = "none";
        adminControls.style.display = "block";

        await adminDuyurulariGetir();
    }
}


baslat();


/* =========================================================
   HASH DEĞİŞİNCE
========================================================= */

window.addEventListener(
    "hashchange",
    async function () {

        adminPaneliniKontrolEt();

        if (
            window.location.hash.toLowerCase() !== "#admin"
        ) {
            return;
        }

        const {
            data: {
                session
            }
        } = await supabaseClient
            .auth
            .getSession();

        if (!session) {
            return;
        }

        const yetkili = await adminMi();

        if (yetkili) {

            mevcutKullanici = session.user;
            mevcutKullaniciAdminMi = true;

            adminLoginBox.style.display = "none";
            adminControls.style.display = "block";

            await adminDuyurulariGetir();
        }
    }
);


/* =========================================================
   OTOMATİK YENİLEME
========================================================= */

setInterval(
    duyurulariGetir,
    30000
);
