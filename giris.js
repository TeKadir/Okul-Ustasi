/* =========================================================
   SUPABASE AYARLARI
   Yalnızca publishable key kullanılır, secret key konmaz.
========================================================= */

const SUPABASE_URL =
    "https://hinisayolrgyzcoztobi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_76n3XsryMfvfdYwKeUu6SA_TCxImZiW";

/* Başarılı giriş / zaten oturum açık ise gidilecek sayfa */
const ANA_SAYFA =
    "index.html";


/* =========================================================
   ELEMENTLER
========================================================= */

const $ = function (id) { return document.getElementById(id); };

const checkingText = $("checkingText");
const authContent = $("authContent");

const tabGiris = $("tabGiris");
const tabKayit = $("tabKayit");
const panelGiris = $("panelGiris");
const panelKayit = $("panelKayit");

const girisForm = $("girisForm");
const girisEmail = $("girisEmail");
const girisSifre = $("girisSifre");
const girisMesaj = $("girisMesaj");
const loginButton = $("loginButton");

const kayitForm = $("kayitForm");
const kayitEmail = $("kayitEmail");
const kayitUsername = $("kayitUsername");
const kayitSifre = $("kayitSifre");
const kayitMesaj = $("kayitMesaj");
const registerButton = $("registerButton");
const onayButon = $("onayButon");

let supabaseClient = null;


/* =========================================================
   YARDIMCI FONKSİYONLAR
========================================================= */

function mesgulYap(durum) {

    loginButton.disabled = durum;
    registerButton.disabled = durum;
}

function hataMetni(error) {

    const mesaj =
        (error && error.message ? error.message : "").toLowerCase();

    if (mesaj === "hash_yok") {
        return "Güvenli bağlantı (HTTPS) gerekli. Siteyi https:// adresinden aç.";
    }

    if (mesaj.includes("invalid login credentials")) {
        return "E-posta veya şifre hatalı.";
    }

    if (mesaj.includes("email not confirmed")) {
        return "E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.";
    }

    if (mesaj.includes("rate limit") || mesaj.includes("too many")) {
        return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
    }

    if (mesaj.includes("database error saving new user")) {
        return "Kullanıcı adı geçersiz veya zaten alınmış. Başka bir ad dene.";
    }

    return error && error.message
        ? error.message
        : "Bilinmeyen bir hata oluştu.";
}

function anaSayfayaGit() {

    /* replace: geri tuşuyla giriş sayfasına dönülmesin */
    window.location.replace(ANA_SAYFA);
}


/* =========================================================
   OKUDUM VE ANLADIM DÜĞMESİ
========================================================= */

function onayDurumu() {
    return onayButon.getAttribute("aria-pressed") === "true";
}

onayButon.addEventListener("click", function () {

    onayButon.setAttribute("aria-pressed", onayDurumu() ? "false" : "true");
    onayButon.classList.remove("uyar");
});


/* =========================================================
   GİRİŞ
========================================================= */

async function girisYap(olay) {

    olay.preventDefault();

    const email = girisEmail.value.trim();
    const sifre = girisSifre.value;

    girisMesaj.textContent = "";

    if (!email || !sifre) {
        girisMesaj.textContent = "E-posta ve şifre gir.";
        return;
    }

    mesgulYap(true);
    girisMesaj.textContent = "Giriş yapılıyor...";

    try {

        const { error } = await ouSifre.girisDene(supabaseClient, email, sifre);

        if (error) {
            girisMesaj.textContent = "Giriş başarısız: " + hataMetni(error);
            mesgulYap(false);
            return;
        }

        girisMesaj.textContent = "Giriş başarılı. Yönlendiriliyorsun...";
        anaSayfayaGit();

    } catch (e) {

        console.error(e);

        girisMesaj.textContent =
            e && e.message === "HASH_YOK"
                ? hataMetni(e)
                : "Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.";

        mesgulYap(false);
    }
}


/* =========================================================
   KAYIT OL
========================================================= */

async function kayitOl(olay) {

    olay.preventDefault();

    const email = kayitEmail.value.trim();
    const sifre = kayitSifre.value;

    kayitMesaj.textContent = "";

    if (!email || !sifre) {
        kayitMesaj.textContent = "E-posta ve şifre gir.";
        return;
    }

    if (sifre.length < 6) {
        kayitMesaj.textContent = "Şifre en az 6 karakter olmalı.";
        return;
    }

    /* Kullanıcı adı: yalnızca arayüz kontrolü. Asıl kural ve
       benzersizlik veritabanında (profiles tablosu) zorunlu tutulur. */

    const username = kayitUsername.value.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        kayitMesaj.textContent = "Kullanıcı adı 3-20 karakter olmalı (a-z, 0-9, _).";
        return;
    }

    if (!onayDurumu()) {
        kayitMesaj.textContent =
            "Kayıt olmak için sözleşme ve KVKK metnini okuyup \"okudum ve anladım\" düğmesine basmalısın.";
        onayButon.classList.add("uyar");
        onayButon.focus();
        return;
    }

    mesgulYap(true);
    kayitMesaj.textContent = "Kayıt oluşturuluyor...";

    try {

        const { data: musait, error: musaitHata } =
            await supabaseClient.rpc("username_musait", { p_username: username });

        if (musaitHata) {
            kayitMesaj.textContent =
                "Kullanıcı adı kontrol edilemedi: " + hataMetni(musaitHata);
            mesgulYap(false);
            return;
        }

        if (musait !== true) {
            kayitMesaj.textContent =
                "Bu kullanıcı adı alınmış veya geçersiz. Başka bir ad dene.";
            mesgulYap(false);
            return;
        }

        const hash = await ouSifre.hashle(sifre);

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: hash,
            options: {
                data: {
                    username: username,
                    sozlesme_kabul: true,
                    kvkk_okudum: true,
                    onay_zamani: new Date().toISOString()
                }
            }
        });

        if (error) {
            kayitMesaj.textContent = "Kayıt başarısız: " + hataMetni(error);
            mesgulYap(false);
            return;
        }

        /* Mevcut e-posta ile tekrar kayıt denenirse bazı durumlarda
           error dönmez; identities boş olur. */
        if (
            data.user &&
            Array.isArray(data.user.identities) &&
            data.user.identities.length === 0
        ) {
            kayitMesaj.textContent =
                "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı dene.";
            mesgulYap(false);
            return;
        }

        if (!data.session) {
            /* E-posta doğrulaması açıksa oturum hemen başlamaz */
            kayitMesaj.textContent =
                "Kayıt oluşturuldu. E-posta adresini doğruladıktan sonra giriş yap.";
            mesgulYap(false);
            return;
        }

        kayitMesaj.textContent = "Kayıt başarılı. Yönlendiriliyorsun...";
        anaSayfayaGit();

    } catch (e) {

        console.error(e);

        kayitMesaj.textContent =
            e && e.message === "HASH_YOK"
                ? hataMetni(e)
                : "Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.";

        mesgulYap(false);
    }
}


/* =========================================================
   GİRİŞ / KAYIT SEKMELERİ (iki ayrı form)
========================================================= */

function modAyarla(kayit) {

    tabGiris.setAttribute("aria-selected", kayit ? "false" : "true");
    tabKayit.setAttribute("aria-selected", kayit ? "true" : "false");

    panelGiris.hidden = kayit;
    panelKayit.hidden = !kayit;

    girisMesaj.textContent = "";
    kayitMesaj.textContent = "";

    try {
        history.replaceState(null, "", kayit ? "#kayit" : location.pathname + location.search);
    } catch (e) {}
}

tabGiris.addEventListener("click", function () { modAyarla(false); });
tabKayit.addEventListener("click", function () { modAyarla(true); });

girisForm.addEventListener("submit", girisYap);
kayitForm.addEventListener("submit", kayitOl);


/* =========================================================
   BAŞLANGIÇ
   Oturum zaten açıksa giriş formu yerine ana sayfaya yönlendir.
========================================================= */

async function baslat() {

    if (!window.supabase) {
        checkingText.textContent =
            "Giriş sistemi yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.";
        return;
    }

    supabaseClient =
        window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    try {

        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            checkingText.textContent =
                "Zaten giriş yapmışsın. Ana sayfaya yönlendiriliyorsun...";
            anaSayfayaGit();
            return;
        }

    } catch (e) {
        console.error(e);
    }

    checkingText.style.display = "none";
    authContent.style.display = "block";
}


modAyarla(location.hash.toLowerCase() === "#kayit");

baslat();
