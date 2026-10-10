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


function ustCubuguGuncelle(session) {

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
    function (event, session) {

        ustCubuguGuncelle(session);

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
   KARŞILAMA MESAJLARI
========================================================= */

const WELCOME_ITEMS = [

    {
        text:
            "Bir sorunuz mu var?",

        button:
            "Ders Yardımı",

        href:
            "ders-yardimi.html"
    },


    {
        text:
            "Ödevde takıldığınız bir yer mi var?",

        button:
            "Ödev / Soru",

        href:
            "odev-soru.html"
    },


    {
        text:
            "Bir duyuru mu arıyorsunuz?",

        button:
            "Duyurular",

        href:
            "duyurular.html"
    },


    {
        text:
            "Bir konu hakkında yardım mı lazım?",

        button:
            "Konular",

        href:
            "konular.html"
    },


    {
        text:
            "Bir soru paylaşmak mı istiyorsunuz?",

        button:
            "Soru Oluştur",

        href:
            "soru-olustur.html"
    },


    {
        text:
            "Okulla ilgili bir problemi bildirmek mi istiyorsunuz?",

        button:
            "Bildirimler",

        href:
            "bildirimler.html"
    },


    {
        text:
            "Daha önce neler olduğunu mu görmek istiyorsunuz?",

        button:
            "Olaylar",

        href:
            "olaylar.html"
    }

];


/* Windows uygulaması: yalnızca uygulamanın dışında (tarayıcıda) gösterilir. */
if (!/Electron/i.test(navigator.userAgent)) {
    WELCOME_ITEMS.push({
        text: "Okul Ustası'nı Windows uygulaması olarak kullanmak ister misin?",
        button: "Uygulamayı İndir",
        href: "uygulama/Okul-Ustasi.exe"
    });
}

const WELCOME_INTERVAL =
    5000;


const WELCOME_FADE =
    500;


let welcomeIndex =
    0;


let welcomeTimer =
    null;


let welcomeChanging =
    false;


let welcomePaused =
    false;


/* =========================================================
   ELEMENTLER
========================================================= */

const welcomeStage =
    document.getElementById(
        "welcomeStage"
    );


const welcomeTextInner =
    document.getElementById(
        "welcomeTextInner"
    );


const welcomeLinks =
    document.getElementById(
        "welcomeLinks"
    );


const welcomeDots =
    document.getElementById(
        "welcomeDots"
    );


const welcomePause =
    document.getElementById(
        "welcomePause"
    );


/* =========================================================
   MESAJI GÖSTER
========================================================= */

function welcomeUygula(index) {

    const item =
        WELCOME_ITEMS[index];


    welcomeIndex =
        index;


    welcomeTextInner.textContent =
        item.text;


    welcomeLinks.innerHTML =
        "";


    const link =
        document.createElement(
            "a"
        );


    link.href =
        item.href;


    link.className =
        "main-button";


    link.textContent =
        item.button +
        " →";


    welcomeLinks.appendChild(
        link
    );


    const dots =
        welcomeDots.children;


    for (
        let i = 0;
        i < dots.length;
        i++
    ) {

        dots[i].classList.toggle(
            "active",
            i === index
        );

    }

}


/* =========================================================
   GEÇİŞ
========================================================= */

function welcomeGecis(index) {

    if (
        welcomeChanging ||
        index === welcomeIndex
    ) {

        return;

    }


    welcomeChanging =
        true;


    welcomeStage.style.opacity =
        "0";


    welcomeStage.style.transform =
        "translateY(10px)";


    setTimeout(
        function () {

            welcomeUygula(
                index
            );


            welcomeStage.style.opacity =
                "1";


            welcomeStage.style.transform =
                "translateY(0)";


            welcomeChanging =
                false;


            welcomePlanla();

        },
        WELCOME_FADE
    );

}


/* =========================================================
   ZAMANLAYICI
========================================================= */

function welcomeTemizle() {

    if (welcomeTimer) {

        clearTimeout(
            welcomeTimer
        );

        welcomeTimer =
            null;

    }

}


function welcomePlanla() {

    welcomeTemizle();


    if (welcomePaused) {
        return;
    }


    welcomeTimer =
        setTimeout(
            function () {

                welcomeGecis(
                    (
                        welcomeIndex + 1
                    ) %
                    WELCOME_ITEMS.length
                );

            },
            WELCOME_INTERVAL
        );

}


/* =========================================================
   BAŞLAT
========================================================= */

WELCOME_ITEMS.forEach(
    function (item, index) {

        const dot =
            document.createElement(
                "button"
            );


        dot.type =
            "button";


        dot.className =
            "welcome-dot";


        dot.setAttribute(
            "aria-label",
            item.text
        );


        dot.addEventListener(
            "click",
            function () {

                welcomeTemizle();


                welcomeGecis(
                    index
                );


                if (
                    index ===
                    welcomeIndex
                ) {

                    welcomePlanla();

                }

            }
        );


        welcomeDots.appendChild(
            dot
        );

    }
);


welcomeUygula(0);


welcomePause.addEventListener(
    "click",
    function () {

        welcomePaused =
            !welcomePaused;


        welcomePause.textContent =
            welcomePaused
                ? "Devam ettir"
                : "Duraklat";


        welcomePlanla();

    }
);


welcomePlanla();
