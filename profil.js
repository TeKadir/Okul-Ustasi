/* =========================================================
   OKUL USTASI - PROFİLİM (profil.js)
   Kullanılan sunucu fonksiyonları (hepsi auth.uid() ile yalnızca
   kullanıcının KENDİ verisine erişir):
   - profilim_getir()        kullanıcı adı, sınıf, toplam XP, seviye
   - profil_sinif_kaydet()   sınıfı kaydeder
   - anlamadim_listem()      "Anlamadım" işaretli sorular (cevapsız)
   - anlamadim_cozum()       doğru cevap + çözüm (testi bitirmişse)
   - anlamadim_ayarla()      işareti kaldırır
   E-posta değişimi Supabase Auth ile yapılır (doğrulama bağlantısı gider).
   XP ve seviye burada ASLA yazılmaz; yalnızca gösterilir.
   Kurulum SQL'i: kurulum/profil-xp-zorluk.sql
========================================================= */

const SUPABASE_URL = "https://hinisayolrgyzcoztobi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_76n3XsryMfvfdYwKeUu6SA_TCxImZiW";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = function (id) { return document.getElementById(id); };

const ZORLUK_ADLARI = { kolay: "Kolay", orta: "Orta", zor: "Zor" };

let mevcutId = null;
let yuklemeSirasi = 0;


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


/* ---------- profil ---------- */

function profiliCiz(p, eposta) {

    const ad = p.username || "Kullanıcı";

    $("kullaniciAdi").textContent = ad;
    $("epostaGoster").textContent = eposta || "";
    $("avatar").textContent = ad.charAt(0) || "?";

    $("seviyeRozet").textContent = "Seviye " + p.seviye;

    const aralik = p.sonraki_seviye - p.seviye_baslangic;
    const kazanilan = p.toplam_xp - p.seviye_baslangic;
    const yuzde = aralik > 0 ? Math.min(100, Math.max(0, Math.round(kazanilan / aralik * 100))) : 0;

    $("xpYazi").textContent = "Seviye " + p.seviye + "  •  " + p.toplam_xp + " XP";
    $("xpAlt").textContent =
        "Sonraki seviyeye " + (p.sonraki_seviye - p.toplam_xp) + " XP (" +
        kazanilan + " / " + aralik + ")";

    $("xpDolu").style.width = yuzde + "%";
    $("xpCubuk").setAttribute("aria-valuenow", String(yuzde));

    $("sinifSec").value = p.sinif || "";
}

async function profiliYukle(session) {

    const sira = ++yuklemeSirasi;

    mesajYaz("profilMesaj", "");

    const { data, error } = await supabaseClient.rpc("profilim_getir");

    if (sira !== yuklemeSirasi) {
        return;
    }

    if (error) {
        console.error(error);
        mesajYaz("profilMesaj", "Profil yüklenemedi: " + error.message, "hata");
        return;
    }

    const p = Array.isArray(data) ? data[0] : data;

    if (!p) {
        mesajYaz("profilMesaj", "Profil bulunamadı.", "hata");
        return;
    }

    profiliCiz(p, session.user.email);
}


/* ---------- sınıf ---------- */

$("sinifKaydet").addEventListener("click", async function () {

    const sinif = $("sinifSec").value;

    if (!sinif) {
        mesajYaz("sinifMesaj", "Bir sınıf seç.", "hata");
        return;
    }

    $("sinifKaydet").disabled = true;
    mesajYaz("sinifMesaj", "Kaydediliyor...");

    const { error } = await supabaseClient.rpc("profil_sinif_kaydet", { p_sinif: sinif });

    $("sinifKaydet").disabled = false;

    if (error) {
        console.error(error);
        mesajYaz("sinifMesaj", "Kaydedilemedi: " + error.message, "hata");
        return;
    }

    mesajYaz("sinifMesaj", "Sınıfın kaydedildi.", "ok");
});


/* ---------- e-posta (Supabase Auth akışı) ---------- */

$("epostaKaydet").addEventListener("click", async function () {

    const yeni = $("yeniEposta").value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(yeni)) {
        mesajYaz("epostaMesaj", "Geçerli bir e-posta adresi gir.", "hata");
        return;
    }

    $("epostaKaydet").disabled = true;
    mesajYaz("epostaMesaj", "Gönderiliyor...");

    const { error } = await supabaseClient.auth.updateUser({ email: yeni });

    $("epostaKaydet").disabled = false;

    if (error) {
        console.error(error);
        mesajYaz("epostaMesaj", "Değiştirilemedi: " + error.message, "hata");
        return;
    }

    $("yeniEposta").value = "";
    mesajYaz(
        "epostaMesaj",
        "Doğrulama bağlantısı gönderildi. Bağlantıya tıkladıktan sonra e-postan değişir.",
        "ok"
    );
});


/* ---------- anlamadığım sorular ---------- */

function soruKarti(q) {

    const kart = eleman("div", "pr-soru");

    const rozet = eleman("div", "ts-rozetler");
    rozet.appendChild(eleman("span", "ts-rozet", q.ders));

    if (q.konu) {
        rozet.appendChild(eleman("span", "ts-rozet", q.konu));
    }

    if (ZORLUK_ADLARI[q.zorluk]) {
        rozet.appendChild(eleman("span", "ts-rozet", ZORLUK_ADLARI[q.zorluk]));
    }

    kart.appendChild(rozet);
    kart.appendChild(eleman("p", null, q.soru));

    ["A", "B", "C", "D", "E"].forEach(function (h) {

        const metin = q["sec_" + h.toLowerCase()];

        if (metin) {
            kart.appendChild(eleman("div", "pr-sik", h + ") " + metin));
        }
    });

    const cozumKutusu = eleman("div", "pr-cozum");
    cozumKutusu.style.display = "none";
    kart.appendChild(cozumKutusu);

    const mesaj = eleman("div", "yn-mesaj");
    kart.appendChild(mesaj);

    const satir = eleman("div", "yn-satir");

    const cozum = eleman("button", "yn-btn kucuk", "Çözümü göster");
    cozum.type = "button";

    cozum.addEventListener("click", async function () {

        cozum.disabled = true;
        mesaj.textContent = "";
        mesaj.className = "yn-mesaj";

        const { data, error } = await supabaseClient.rpc("anlamadim_cozum", { p_soru_id: q.id });

        cozum.disabled = false;

        if (error) {
            mesaj.textContent = error.message;
            mesaj.className = "yn-mesaj hata";
            return;
        }

        const c = Array.isArray(data) ? data[0] : data;

        cozumKutusu.style.display = "block";
        cozumKutusu.textContent =
            "Doğru cevap: " + (c ? c.dogru : "-") + "\n" +
            (c && c.aciklama ? "Açıklama: " + c.aciklama : "Bu soru için detaylı çözüm eklenmemiş.");
    });

    const kaldir = eleman("button", "yn-btn ikincil kucuk", "İşareti kaldır");
    kaldir.type = "button";

    kaldir.addEventListener("click", async function () {

        kaldir.disabled = true;

        const { error } = await supabaseClient.rpc("anlamadim_ayarla", {
            p_soru_id: q.id,
            p_isaretli: false
        });

        if (error) {
            console.error(error);
            mesaj.textContent = "Kaldırılamadı: " + error.message;
            mesaj.className = "yn-mesaj hata";
            kaldir.disabled = false;
            return;
        }

        kart.remove();

        if ($("anlamadimListe").children.length === 0) {
            $("anlamadimListe").appendChild(eleman("div", "yn-bos", "Anlamadım olarak işaretlediğin soru yok."));
        }
    });

    satir.appendChild(cozum);
    satir.appendChild(kaldir);
    kart.appendChild(satir);

    return kart;
}

async function anlamadimListesiniYukle() {

    const kap = $("anlamadimListe");

    kap.textContent = "";
    mesajYaz("listeMesaj", "Yükleniyor...");

    const { data, error } = await supabaseClient.rpc("anlamadim_listem");

    mesajYaz("listeMesaj", "");

    if (error) {
        console.error(error);
        mesajYaz("listeMesaj", "Liste alınamadı: " + error.message, "hata");
        return;
    }

    if (!data || data.length === 0) {
        kap.appendChild(eleman("div", "yn-bos", "Anlamadım olarak işaretlediğin soru yok."));
        return;
    }

    data.forEach(function (q) {
        kap.appendChild(soruKarti(q));
    });
}


/* ---------- oturum ---------- */

function oturumDurumu(session) {

    ustCubuk(session);

    const yeniId = session && session.user ? session.user.id : null;

    $("girisYok").style.display = yeniId ? "none" : "block";
    $("profilAlani").style.display = yeniId ? "block" : "none";

    /* Oturum yenilenince (aynı kullanıcı) tekrar yükleme */
    if (yeniId && yeniId !== mevcutId) {
        profiliYukle(session);
        anlamadimListesiniYukle();
    }

    mevcutId = yeniId;
}

supabaseClient.auth.onAuthStateChange(function (olay, session) {
    oturumDurumu(session);
});

supabaseClient.auth.getSession().then(function (r) {
    oturumDurumu(r.data.session);
});
