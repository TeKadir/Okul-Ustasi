/* Hazır kurulum dosyasını sitenin uygulama/ klasörüne koyar;
   "Uygulamayı İndir" bağlantıları bu dosyayı indirir. */

const fs = require("fs");
const path = require("path");

const ad = "Okul-Ustasi.exe";
const hedefKlasor = path.join(__dirname, "..", "uygulama");

fs.mkdirSync(hedefKlasor, { recursive: true });
fs.copyFileSync(path.join(__dirname, "dist", ad), path.join(hedefKlasor, ad));

console.log("Hazır: uygulama/" + ad);
