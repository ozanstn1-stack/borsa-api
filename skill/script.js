/**
 * Borsa Asistanı — Google AI Edge Gallery & Gemma 4 Tool Functions
 *
 * Bu dosya, Cloudflare Worker API'ye bağlanan araç fonksiyonlarını içerir.
 * Deploy ettikten sonra API_BASE_URL değerini kendi worker URL'nizle değiştirin.
 */

const API_BASE_URL = "https://borsa-api.ozanborsabot.workers.dev";

// ─── Yardımcı ───

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  return res.json();
}

// ─── Araç Fonksiyonları ───

/**
 * @tool bist_hisse_getir
 * @description Borsa İstanbul'daki hisse senetlerinin güncel fiyat, değişim yüzdesi ve işlem hacmi bilgilerini getirir.
 * @returns {object} BIST hisse verileri — sembol, ad, fiyat, degisim, hacim alanlarını içerir.
 */
async function bist_hisse_getir() {
  return await apiFetch("/bist");
}

/**
 * @tool bist_endeks_getir
 * @description BIST endekslerinin (XU100, XU030 vb.) güncel değer ve değişim bilgilerini getirir.
 * @returns {object} BIST endeks verileri — ad, deger, degisim alanlarını içerir.
 */
async function bist_endeks_getir() {
  return await apiFetch("/bist/endeks");
}

/**
 * @tool global_borsa_getir
 * @description Belirtilen bölgenin borsa endeks verilerini getirir.
 * @param {string} bolge - Bölge seçimi: "abd", "avrupa", "asya" veya "tumu" (varsayılan: "tumu")
 * @returns {object} Seçilen bölgenin borsa endeks verileri — ad, fiyat, degisim, paraBirimi alanlarını içerir.
 */
async function global_borsa_getir(bolge = "tumu") {
  const validBolge = ["abd", "avrupa", "asya", "tumu"];
  const sec = validBolge.includes(bolge.toLowerCase()) ? bolge.toLowerCase() : "tumu";
  const endpoint = sec === "tumu" ? "/global" : `/global/${sec}`;
  return await apiFetch(endpoint);
}

/**
 * @tool tefas_getir
 * @description TEFAS'taki yatırım fonlarının birim pay değeri, günlük getiri, katılımcı sayısı ve toplam büyüklük bilgilerini getirir.
 * @returns {object} TEFAS fon verileri — kod, ad, fiyat, gunlukGetiri, kisiSayisi, buyukluk alanlarını içerir.
 */
async function tefas_getir() {
  return await apiFetch("/tefas");
}

/**
 * @tool doviz_getir
 * @description Güncel döviz kurları ve altın fiyatlarını (USD/TRY, EUR/TRY, gram altın vb.) getirir.
 * @returns {object} Döviz ve altın verileri — kod, ad, alis, satis, degisim alanlarını içerir.
 */
async function doviz_getir() {
  return await apiFetch("/doviz");
}

/**
 * @tool tumu_getir
 * @description Tüm piyasa verilerini tek seferde getirir: BIST hisseler, BIST endeksler, ABD/Avrupa/Asya borsaları, TEFAS fonlar, döviz ve altın.
 * @returns {object} Tüm piyasa verilerini içeren birleşik JSON yanıtı.
 */
async function tumu_getir() {
  return await apiFetch("/tumu");
}
