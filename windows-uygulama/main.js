/* =========================================================
   OKUL USTASI - WINDOWS UYGULAMASI (main.js)
   Siteyi bir pencerede açar.
   Varsayılan: site/ klasöründeki dosyalar uygulamanın içinden açılır.
   Site internette yayındaysa SITE_ADRESI'ne adresini yaz;
   o zaman uygulama canlı siteyi açar.
========================================================= */

const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

/* Örnek: "https://tekadir.github.io/anasayfa.html"   (boşsa yerel dosyalar) */
const SITE_ADRESI = "";


let pencere = null;


function pencereAc() {

    pencere = new BrowserWindow({
        width: 1100,
        height: 760,
        minWidth: 360,
        minHeight: 500,
        backgroundColor: "#fffdf5",
        icon: path.join(__dirname, "build", "icon.ico"),
        title: "Okul Ustası",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    Menu.setApplicationMenu(null);

    if (SITE_ADRESI) {
        pencere.loadURL(SITE_ADRESI);
    } else {
        pencere.loadFile(path.join(__dirname, "site", "anasayfa.html"));
    }

    /* İnternet adreslerini (http/https) uygulamada değil, tarayıcıda aç. */
    function disAdresMi(adres) {

        if (!/^https?:/i.test(adres)) {
            return false;
        }

        if (SITE_ADRESI) {
            return new URL(adres).origin !== new URL(SITE_ADRESI).origin;
        }

        return true;
    }

    pencere.webContents.setWindowOpenHandler(function (bilgi) {

        if (/^https?:/i.test(bilgi.url)) {
            shell.openExternal(bilgi.url);
        }

        return { action: "deny" };
    });

    pencere.webContents.on("will-navigate", function (olay, adres) {

        if (disAdresMi(adres)) {
            olay.preventDefault();
            shell.openExternal(adres);
        }
    });

    pencere.on("closed", function () {
        pencere = null;
    });
}


/* Uygulama iki kez açılmasın; ikinci tıklamada mevcut pencere öne gelsin. */
if (!app.requestSingleInstanceLock()) {

    app.quit();

} else {

    app.on("second-instance", function () {

        if (pencere) {
            if (pencere.isMinimized()) {
                pencere.restore();
            }
            pencere.focus();
        }
    });

    app.whenReady().then(pencereAc);

    app.on("window-all-closed", function () {
        app.quit();
    });
}
