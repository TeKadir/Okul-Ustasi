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
   ÜST ÇUBUK
========================================================= */

const topLoginLink =
    document.getElementById(
        "topLoginLink"
    );

const topUser =
    document.getElementById(
        "topUser"
    );

const topUserEmail =
    document.getElementById(
        "topUserEmail"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


function ustCubuguGuncelle(
    session
) {

    if (
        session &&
        session.user
    ) {

        topLoginLink.style.display =
            "none";

        topUser.style.display =
            "flex";

        topUserEmail.textContent =
            session.user.email || "";

    } else {

        topLoginLink.style.display =
            "inline-block";

        topUser.style.display =
            "none";

        topUserEmail.textContent =
            "";

    }

}


logoutButton.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();

    }
);


supabaseClient.auth.onAuthStateChange(
    function (
        event,
        session
    ) {

        ustCubuguGuncelle(
            session
        );

    }
);


supabaseClient.auth.getSession().then(
    function (result) {

        ustCubuguGuncelle(
            result.data.session
        );

    }
);


/* =========================================================
   ELEMENTLER
========================================================= */

const latestEventTitle =
    document.getElementById(
        "latestEventTitle"
    );

const latestEventDate =
    document.getElementById(
        "latestEventDate"
    );

const latestEventDescription =
    document.getElementById(
        "latestEventDescription"
    );

const allEventsList =
    document.getElementById(
        "allEventsList"
    );


const adminPanel =
    document.getElementById(
        "adminPanel"
    );

const adminLoginBox =
    document.getElementById(
        "adminLoginBox"
    );

const adminControls =
    document.getElementById(
        "adminControls"
    );

const adminEmail =
    document.getElementById(
        "adminEmail"
    );

const adminPassword =
    document.getElementById(
        "adminPassword"
    );

const adminLoginButton =
    document.getElementById(
        "adminLoginButton"
    );

const adminMessage =
    document.getElementById(
        "adminMessage"
    );

const adminLogoutButton =
    document.getElementById(
        "adminLogoutButton"
    );

const adminEventList =
    document.getElementById(
        "adminEventList"
    );

const eventTitleInput =
    document.getElementById(
        "eventTitleInput"
    );

const eventDateInput =
    document.getElementById(
        "eventDateInput"
    );

const eventDescriptionInput =
    document.getElementById(
        "eventDescriptionInput"
    );

const eventFormTitle =
    document.getElementById(
        "eventFormTitle"
    );

const saveEventButton =
    document.getElementById(
        "saveEventButton"
    );

const cancelEventButton =
    document.getElementById(
        "cancelEventButton"
    );

const eventMessage =
    document.getElementById(
        "eventMessage"
    );


let duzenlenenOlayId =
    null;


/* =========================================================
   TARİH
========================================================= */

function tarihiFormatla(
    tarih
) {

    if (!tarih) {
        return "";
    }


    const parcalar =
        tarih.split("-");


    if (
        parcalar.length !== 3
    ) {

        return tarih;

    }


    return (
        parcalar[2] +
        "." +
        parcalar[1] +
        "." +
        parcalar[0]
    );

}


/* =========================================================
   OLAYLARI GETİR
========================================================= */

async function olaylariGetir() {

    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "olaylari_getir"
            );


    if (error) {

        console.error(
            "Olaylar alınamadı:",
            error
        );


        latestEventTitle.textContent =
            "Olaylar alınamadı";


        latestEventDate.textContent =
            "";


        latestEventDescription.innerHTML =
            "<p>Olay bilgileri şu anda yüklenemiyor.</p>";


        allEventsList.textContent =
            "Olaylar yüklenemedi.";


        return [];

    }


    if (
        !data ||
        data.length === 0
    ) {

        latestEventTitle.textContent =
            "Henüz olay kaydı yok";


        latestEventDate.textContent =
            "";


        latestEventDescription.innerHTML =
            "<p>Henüz kayıtlı bir olay bulunmuyor.</p>";


        allEventsList.textContent =
            "Henüz kayıtlı olay bulunmuyor.";


        return [];

    }


    /* =====================================================
       SON OLAY
    ===================================================== */

    const sonOlay =
        data[0];


    latestEventTitle.textContent =
        sonOlay.baslik;


    latestEventDate.textContent =
        "Tarih: " +
        tarihiFormatla(
            sonOlay.tarih
        );


    latestEventDescription.innerHTML =
        "";


    sonOlay.aciklama
        .split(/\n+/)
        .forEach(
            function (metin) {

                if (
                    !metin.trim()
                ) {

                    return;

                }


                const p =
                    document.createElement(
                        "p"
                    );


                p.textContent =
                    metin.trim();


                latestEventDescription.appendChild(
                    p
                );

            }
        );


    /* =====================================================
       TÜM OLAYLAR
    ===================================================== */

    allEventsList.innerHTML =
        "";


    data.forEach(
        function (olay) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "event-card";


            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                olay.baslik;


            const date =
                document.createElement(
                    "div"
                );


            date.className =
                "event-date";


            date.textContent =
                "Tarih: " +
                tarihiFormatla(
                    olay.tarih
                );


            card.appendChild(
                title
            );


            card.appendChild(
                date
            );


            olay.aciklama
                .split(/\n+/)
                .forEach(
                    function (metin) {

                        if (
                            !metin.trim()
                        ) {

                            return;

                        }


                        const p =
                            document.createElement(
                                "p"
                            );


                        p.textContent =
                            metin.trim();


                        card.appendChild(
                            p
                        );

                    }
                );


            allEventsList.appendChild(
                card
            );

        }
    );


    return data;

}


/* =========================================================
   ADMIN KONTROLÜ
========================================================= */

async function adminMi() {

    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "is_admin"
            );


    if (error) {

        console.error(
            "Admin kontrolü:",
            error
        );


        return false;

    }


    return data === true;

}


/* =========================================================
   ADMIN PANELİNİ GÖSTER
========================================================= */

function adminPaneliniKontrolEt() {

    if (
        window.location.hash.toLowerCase()
        === "#admin"
    ) {

        adminPanel.style.display =
            "block";

    } else {

        adminPanel.style.display =
            "none";

    }

}


/* =========================================================
   ADMIN GİRİŞ
========================================================= */

async function adminGiris() {

    const email =
        adminEmail.value.trim();


    const password =
        adminPassword.value;


    if (
        !email ||
        !password
    ) {

        adminMessage.textContent =
            "E-posta ve şifre gir.";

        return;

    }


    adminMessage.textContent =
        "Giriş yapılıyor...";


    adminLoginButton.disabled =
        true;


    const {
        error
    } =
        await ouSifre.girisDene(supabaseClient, email, password);


    if (error) {

        adminMessage.textContent =
            "Giriş başarısız: " +
            error.message;


        adminLoginButton.disabled =
            false;


        return;

    }


    const yetkili =
        await adminMi();


    if (!yetkili) {

        await supabaseClient
            .auth
            .signOut();


        adminMessage.textContent =
            "Bu hesap yönetici olarak yetkilendirilmemiş.";


        adminLoginButton.disabled =
            false;


        return;

    }


    adminLoginBox.style.display =
        "none";


    adminControls.style.display =
        "block";


    adminMessage.textContent =
        "";


    adminLoginButton.disabled =
        false;


    await adminOlaylariGetir();

}


/* =========================================================
   ADMIN OLAYLARI
========================================================= */

async function adminOlaylariGetir() {

    adminEventList.textContent =
        "Olaylar yükleniyor...";


    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "olaylari_getir"
            );


    if (error) {

        adminEventList.textContent =
            "Olaylar alınamadı.";


        console.error(
            error
        );


        return;

    }


    if (
        !data ||
        data.length === 0
    ) {

        adminEventList.textContent =
            "Henüz kayıtlı olay yok.";


        return;

    }


    adminEventList.innerHTML =
        "";


    data.forEach(
        function (olay) {

            const box =
                document.createElement(
                    "div"
                );


            box.className =
                "admin-event";


            const title =
                document.createElement(
                    "strong"
                );


            title.textContent =
                olay.baslik;


            const date =
                document.createElement(
                    "div"
                );


            date.className =
                "event-date";


            date.textContent =
                "Tarih: " +
                tarihiFormatla(
                    olay.tarih
                );


            const description =
                document.createElement(
                    "div"
                );


            description.className =
                "admin-event-description";


            description.textContent =
                olay.aciklama;


            const editButton =
                document.createElement(
                    "button"
                );


            editButton.className =
                "secondary-button";


            editButton.textContent =
                "Düzenle";


            editButton.onclick =
                function () {

                    olayDuzenle(
                        olay
                    );

                };


            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.className =
                "secondary-button";


            deleteButton.textContent =
                "Sil";


            deleteButton.onclick =
                function () {

                    olaySil(
                        olay.id
                    );

                };


            box.appendChild(
                title
            );


            box.appendChild(
                date
            );


            box.appendChild(
                description
            );


            box.appendChild(
                editButton
            );


            box.appendChild(
                deleteButton
            );


            adminEventList.appendChild(
                box
            );

        }
    );

}


/* =========================================================
   OLAY KAYDET / GÜNCELLE
========================================================= */

async function olayKaydet() {

    const baslik =
        eventTitleInput
            .value
            .trim();


    const tarih =
        eventDateInput
            .value;


    const aciklama =
        eventDescriptionInput
            .value
            .trim();


    if (!baslik) {

        eventMessage.textContent =
            "Olay başlığı gir.";

        return;

    }


    if (!tarih) {

        eventMessage.textContent =
            "Olay tarihi seç.";

        return;

    }


    if (!aciklama) {

        eventMessage.textContent =
            "Olay açıklaması gir.";

        return;

    }


    eventMessage.textContent =
        "Kaydediliyor...";


    let error = null;


    if (
        duzenlenenOlayId ===
        null
    ) {

        const result =
            await supabaseClient
                .rpc(
                    "olay_ekle",
                    {

                        p_baslik:
                            baslik,

                        p_tarih:
                            tarih,

                        p_aciklama:
                            aciklama

                    }
                );


        error =
            result.error;

    } else {

        const result =
            await supabaseClient
                .rpc(
                    "olay_guncelle",
                    {

                        p_id:
                            duzenlenenOlayId,

                        p_baslik:
                            baslik,

                        p_tarih:
                            tarih,

                        p_aciklama:
                            aciklama

                    }
                );


        error =
            result.error;

    }


    if (error) {

        eventMessage.textContent =
            "Olay kaydedilemedi: " +
            error.message;


        console.error(
            error
        );


        return;

    }


    eventMessage.textContent =
        duzenlenenOlayId === null
            ? "Yeni olay başarıyla eklendi."
            : "Olay başarıyla güncellendi.";


    olayDuzenlemeyiIptalEt();


    await olaylariGetir();

    await adminOlaylariGetir();

}


/* =========================================================
   OLAY DÜZENLE
========================================================= */

function olayDuzenle(
    olay
) {

    duzenlenenOlayId =
        olay.id;


    eventFormTitle.textContent =
        "Olayı Düzenle";


    saveEventButton.textContent =
        "Değişiklikleri Kaydet";


    cancelEventButton.style.display =
        "inline-block";


    eventTitleInput.value =
        olay.baslik;


    eventDateInput.value =
        olay.tarih;


    eventDescriptionInput.value =
        olay.aciklama;


    eventMessage.textContent =
        "";


    eventTitleInput.scrollIntoView({
        behavior:
            "smooth",

        block:
            "center"
    });

}


/* =========================================================
   DÜZENLEMEYİ İPTAL
========================================================= */

function olayDuzenlemeyiIptalEt() {

    duzenlenenOlayId =
        null;


    eventFormTitle.textContent =
        "Yeni Olay Ekle";


    saveEventButton.textContent =
        "Olayı Kaydet";


    cancelEventButton.style.display =
        "none";


    eventTitleInput.value =
        "";


    eventDateInput.value =
        "";


    eventDescriptionInput.value =
        "";


    eventMessage.textContent =
        "";

}


/* =========================================================
   OLAY SİL
========================================================= */

async function olaySil(
    id
) {

    const onay =
        confirm(
            "Bu olay kaydı kalıcı olarak silinsin mi?"
        );


    if (!onay) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .rpc(
                "olay_sil",
                {
                    p_id:
                        id
                }
            );


    if (error) {

        alert(
            "Olay silinemedi: " +
            error.message
        );


        return;

    }


    await olaylariGetir();

    await adminOlaylariGetir();

}


/* =========================================================
   ADMIN ÇIKIŞ
========================================================= */

async function adminCikis() {

    await supabaseClient
        .auth
        .signOut();


    adminControls.style.display =
        "none";


    adminLoginBox.style.display =
        "block";


    adminMessage.textContent =
        "Yönetici çıkışı yapıldı.";

}


/* =========================================================
   BUTONLAR
========================================================= */

adminLoginButton.addEventListener(
    "click",
    adminGiris
);


saveEventButton.addEventListener(
    "click",
    olayKaydet
);


cancelEventButton.addEventListener(
    "click",
    olayDuzenlemeyiIptalEt
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


    await olaylariGetir();


    const {
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (
        session &&
        window.location.hash.toLowerCase()
        === "#admin"
    ) {

        const yetkili =
            await adminMi();


        if (yetkili) {

            adminLoginBox.style.display =
                "none";


            adminControls.style.display =
                "block";


            await adminOlaylariGetir();

        }

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
            window.location.hash.toLowerCase()
            !== "#admin"
        ) {

            return;

        }


        const yetkili =
            await adminMi();


        if (yetkili) {

            adminLoginBox.style.display =
                "none";


            adminControls.style.display =
                "block";


            await adminOlaylariGetir();

        }

    }
);


/* =========================================================
   OLAYLARI PERİYODİK YENİLE
========================================================= */

setInterval(
    olaylariGetir,
    30000
);
