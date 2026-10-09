/* =========================================================
   OKUL USTASI - ORTAK ŞİFRE İŞLEMLERİ (sifre.js)
   Şifre 64 tur SHA-256 ile hash'lenir; Supabase'e ham şifre
   değil bu hash gönderilir. Giriş sayfası, yönetici girişleri
   (olaylar, duyurular) hep buradan geçer: tek kaynak.
   DİKKAT: HASH_TUR ve HASH_TUZ değişirse tüm girişler bozulur.
========================================================= */

(function () {

    "use strict";

    var HASH_TUR = 64;
    var HASH_TUZ = "okul-ustasi-v1";

    var HTTPS_HATA =
        "Güvenli bağlantı (HTTPS) gerekli. Siteyi https:// adresinden aç.";


    async function sha256Hex(metin) {

        var bayt = new TextEncoder().encode(metin);
        var ozet = await crypto.subtle.digest("SHA-256", bayt);

        return Array.from(new Uint8Array(ozet))
            .map(function (b) { return b.toString(16).padStart(2, "0"); })
            .join("");
    }


    async function hashle(sifre) {

        if (!window.crypto || !crypto.subtle) {
            throw new Error("HASH_YOK");
        }

        var h = HASH_TUZ + ":" + sifre;

        for (var i = 0; i < HASH_TUR; i++) {
            h = await sha256Hex(h + ":" + HASH_TUZ);
        }

        return h;
    }


    /* signInWithPassword yerine kullanılır; { error } döner.
       Eski hesaplar (şifresi hash'siz): hash'li deneme tutmazsa ham
       şifreyle bir kez denenir, tutarsa hesap otomatik hash'e taşınır. */
    async function girisDene(client, email, sifre) {

        var hash;

        try {
            hash = await hashle(sifre);
        } catch (e) {
            return { error: { message: HTTPS_HATA } };
        }

        var sonuc = await client.auth.signInWithPassword({
            email: email,
            password: hash
        });

        if (
            sonuc.error &&
            /invalid login credentials/i.test(sonuc.error.message || "")
        ) {

            var eski = await client.auth.signInWithPassword({
                email: email,
                password: sifre
            });

            if (!eski.error) {

                var guncel = await client.auth.updateUser({ password: hash });

                if (guncel.error) {
                    console.error(guncel.error);
                }

                return { error: null };
            }

            return { error: eski.error };
        }

        return { error: sonuc.error };
    }


    window.ouSifre = {
        hashle: hashle,
        girisDene: girisDene,
        HTTPS_HATA: HTTPS_HATA
    };

})();
