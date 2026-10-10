/* Paylaşım formu başta kapalı; düğme açıp kapatır.
   Form DOM'da kalır, sayfanın kendi kodu aynen çalışır. */
(function () {
    var d = document.getElementById("formAcButonu");
    var k = document.getElementById("formKarti");
    var y = document.getElementById("formAcYazi");
    if (!d || !k || !y) { return; }

    d.addEventListener("click", function () {
        var ac = !k.classList.contains("form-acik");
        k.classList.toggle("form-acik", ac);
        d.setAttribute("aria-expanded", ac ? "true" : "false");
        y.textContent = ac ? y.getAttribute("data-acik") : y.getAttribute("data-kapali");
        if (ac) {
            k.scrollIntoView({ behavior: "smooth", block: "start" });
            var ilk = k.querySelector("select, input:not([type=hidden]), textarea");
            if (ilk) { ilk.focus({ preventScroll: true }); }
        }
    });
})();
