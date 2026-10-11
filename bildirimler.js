/* =========================================================
   OKUL USTASI - BİLDİRİMLER
   Kullanılan RPC'ler (hepsi auth.uid() ile sadece kullanıcının
   KENDİ bildirimlerine erişir):
   - bildirimleri_getir()
   - okunmamis_bildirim_sayisi()
   - bildirim_okundu_isaretle()
   - tum_bildirimleri_okundu_isaretle()
   - bildirim_sil()
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


const SAYFA_BOYUTU = 20;

let mevcutKullanici = null;
let sayfaNo = 0;
let yukleniyor = false;

const girisUyarisi = document.getElementById("girisUyarisi");
const bildirimBolumu = document.getElementById("bildirimBolumu");
const bildirimListesi = document.getElementById("bildirimListesi");
const okunmamisSayi = document.getElementById("okunmamisSayi");
const hepsiniOkuButonu = document.getElementById("hepsiniOkuButonu");
const dahaButonu = document.getElementById("dahaButonu");


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


/* Sadece site içi sayfa adlarına (ör. odev-soru.html) izin verilir. */
function guvenliBaglanti(baglanti) {

    return typeof baglanti === "string" &&
        /^[a-z0-9-]+\.html$/.test(baglanti);
}


async function sayacGuncelle() {

    const { data, error } = await supabaseClient.rpc(
        "okunmamis_bildirim_sayisi"
    );

    if (error) {
        console.error(error);
        return;
    }

    const sayi = Number(data || 0);

    okunmamisSayi.textContent = sayi > 0 ? String(sayi) : "";

    hepsiniOkuButonu.disabled = sayi === 0;
}


async function okunduYap(id, kart) {

    const { error } = await supabaseClient.rpc(
        "bildirim_okundu_isaretle",
        { p_id: id }
    );

    if (error) {
        console.error(error);
        return false;
    }

    kart.classList.remove("okunmamis");

    const buton = kart.querySelector(".okundu-buton");

    if (buton) {
        buton.remove();
    }

    await sayacGuncelle();

    return true;
}


/* =========================================================
   KART
========================================================= */

function bildirimKarti(b) {

    const kart = eleman(
        "article",
        "bildirim" + (b.okundu ? "" : " okunmamis")
    );

    kart.appendChild(eleman("h3", null, b.baslik));

    if (b.mesaj) {
        kart.appendChild(eleman("div", "bildirim-mesaj", b.mesaj));
    }

    const alt = eleman("div", "bildirim-alt");

    alt.appendChild(
        eleman("span", "bildirim-tarih", tarihFormatla(b.created_at))
    );

    const islemler = eleman("div", "bildirim-islemler");

    if (guvenliBaglanti(b.baglanti)) {

        const ac = eleman("a", "kucuk-buton", "Aç");
        ac.href = b.baglanti;

        ac.addEventListener("click", async event => {

            if (!b.okundu && kart.classList.contains("okunmamis")) {

                event.preventDefault();

                await okunduYap(b.id, kart);

                window.location.href = b.baglanti;
            }
        });

        islemler.appendChild(ac);
    }

    if (!b.okundu) {

        const okundu = eleman(
            "button",
            "kucuk-buton okundu-buton",
            "Okundu"
        );

        okundu.type = "button";

        okundu.addEventListener("click", () => okunduYap(b.id, kart));

        islemler.appendChild(okundu);
    }

    const sil = eleman("button", "kucuk-buton sil-buton", "Sil");
    sil.type = "button";

    sil.addEventListener("click", async () => {

        const { error } = await supabaseClient.rpc(
            "bildirim_sil",
            { p_id: b.id }
        );

        if (error) {
            alert(hataMetni(error));
            return;
        }

        kart.remove();

        if (bildirimListesi.children.length === 0) {
            bildirimListesi.appendChild(
                eleman("div", "bos-liste", "Hiç bildirimin yok.")
            );
        }

        await sayacGuncelle();
    });

    islemler.appendChild(sil);

    alt.appendChild(islemler);
    kart.appendChild(alt);

    return kart;
}


/* =========================================================
   LİSTE
========================================================= */

async function bildirimleriGetir(devam) {

    if (yukleniyor) {
        return;
    }

    yukleniyor = true;

    if (!devam) {
        sayfaNo = 0;
        bildirimListesi.innerHTML = "";
        bildirimListesi.appendChild(
            eleman("div", "yukleniyor", "Bildirimler yükleniyor...")
        );
    }

    const { data, error } = await supabaseClient.rpc(
        "bildirimleri_getir",
        {
            p_limit: SAYFA_BOYUTU,
            p_sayfa: sayfaNo
        }
    );

    yukleniyor = false;

    if (!devam) {
        bildirimListesi.innerHTML = "";
    }

    if (error) {

        console.error(error);

        bildirimListesi.appendChild(
            eleman(
                "div",
                "bos-liste",
                "Bildirimler yüklenemedi: " + hataMetni(error)
            )
        );

        dahaButonu.style.display = "none";

        return;
    }

    const liste = Array.isArray(data) ? data : [];

    if (!devam && liste.length === 0) {

        bildirimListesi.appendChild(
            eleman("div", "bos-liste", "Hiç bildirimin yok.")
        );

        dahaButonu.style.display = "none";

        await sayacGuncelle();

        return;
    }

    liste.forEach(b => bildirimListesi.appendChild(bildirimKarti(b)));

    dahaButonu.style.display =
        liste.length === SAYFA_BOYUTU ? "inline-block" : "none";

    await sayacGuncelle();
}


dahaButonu.addEventListener("click", async () => {

    sayfaNo += 1;

    dahaButonu.disabled = true;

    await bildirimleriGetir(true);

    dahaButonu.disabled = false;
});


hepsiniOkuButonu.addEventListener("click", async () => {

    const { error } = await supabaseClient.rpc(
        "tum_bildirimleri_okundu_isaretle"
    );

    if (error) {
        alert(hataMetni(error));
        return;
    }

    bildirimListesi.querySelectorAll(".bildirim").forEach(k => {
        k.classList.remove("okunmamis");
        const d = k.querySelector(".okundu-buton");
        if (d) { d.remove(); }
    });

    await sayacGuncelle();
});


/* =========================================================
   OTURUM
========================================================= */

async function sayfayiHazirla() {

    if (!mevcutKullanici) {

        girisUyarisi.style.display = "block";
        bildirimBolumu.style.display = "none";

        return;
    }

    girisUyarisi.style.display = "none";
    bildirimBolumu.style.display = "block";

    await bildirimleriGetir(false);
}


supabaseClient.auth.onAuthStateChange(async (event, session) => {

    ustCubuguGuncelle(session);

    const eskiId = mevcutKullanici ? mevcutKullanici.id : null;
    const yeniId = session && session.user ? session.user.id : null;

    mevcutKullanici = session && session.user ? session.user : null;

    if (eskiId !== yeniId) {
        await sayfayiHazirla();
    }
});


(async function baslat() {

    const { data } = await supabaseClient.auth.getSession();

    ustCubuguGuncelle(data.session);

    mevcutKullanici = data.session ? data.session.user : null;

    await sayfayiHazirla();
})();
