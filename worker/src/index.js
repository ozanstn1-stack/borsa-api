/**
 * Borsa API - Cloudflare Worker v3
 * Calisan veri kaynaklariyla Borsa Istanbul, Global Markets, Doviz/Altin
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

// ========== YAHOO FINANCE HELPER ==========

async function yahooChart(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;
    return {
      fiyat: meta.regularMarketPrice,
      oncekiKapanis: meta.chartPreviousClose || meta.regularMarketPrice,
      degisim: meta.chartPreviousClose
        ? (((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2)
        : '0',
      paraBirimi: meta.currency || '',
    };
  } catch (_) { return null; }
}

// ========== BIST (Yahoo Finance .IS suffix) ==========

const BIST_HISSELER = [
  { sembol: 'THYAO', ad: 'Turk Hava Yollari' },
  { sembol: 'ASELS', ad: 'Aselsan' },
  { sembol: 'GARAN', ad: 'Garanti Bankasi' },
  { sembol: 'AKBNK', ad: 'Akbank' },
  { sembol: 'EREGL', ad: 'Eregli Demir Celik' },
  { sembol: 'SISE', ad: 'Sise Cam' },
  { sembol: 'KCHOL', ad: 'Koc Holding' },
  { sembol: 'SAHOL', ad: 'Sabanci Holding' },
  { sembol: 'TUPRS', ad: 'Tupras' },
  { sembol: 'FROTO', ad: 'Ford Otosan' },
  { sembol: 'BIMAS', ad: 'Bim Magazalar' },
  { sembol: 'TOASO', ad: 'Tofas Oto. Fab.' },
  { sembol: 'TCELL', ad: 'Turkcell' },
  { sembol: 'PETKM', ad: 'Petkim' },
  { sembol: 'YKBNK', ad: 'Yapi Kredi Bankasi' },
  { sembol: 'HALKB', ad: 'Halk Bankasi' },
  { sembol: 'VAKBN', ad: 'Vakiflar Bankasi' },
  { sembol: 'ISCTR', ad: 'Is Bankasi C' },
  { sembol: 'ARCLK', ad: 'Arcelik' },
  { sembol: 'ENKAI', ad: 'Enka Insaat' },
  { sembol: 'SASA', ad: 'Sasa Polyester' },
  { sembol: 'EKGYO', ad: 'Emlak Konut GMYO' },
  { sembol: 'PGSUS', ad: 'Pegasus' },
  { sembol: 'KOZAL', ad: 'Koza Altin' },
  { sembol: 'TAVHL', ad: 'TAV Havalimanlari' },
];

async function fetchBIST() {
  const results = [];
  const promises = BIST_HISSELER.map(async (h) => {
    const data = await yahooChart(`${h.sembol}.IS`);
    if (data && data.fiyat > 0) {
      results.push({
        sembol: h.sembol,
        ad: h.ad,
        fiyat: data.fiyat,
        oncekiKapanis: data.oncekiKapanis,
        degisim: data.degisim,
        paraBirimi: 'TRY',
      });
    }
  });
  await Promise.all(promises);
  results.sort((a, b) => a.sembol.localeCompare(b.sembol));
  return { borsa: 'BIST', durum: results.length > 0 ? 'basarili' : 'hata', veri: results };
}

// ========== BIST ENDEKS (XU100 via Yahoo) ==========

async function fetchBISTEndeks() {
  const endeksler = [
    { symbol: 'XU100.IS', name: 'BIST 100' },
    { symbol: 'XU030.IS', name: 'BIST 30' },
    { symbol: 'XBANK.IS', name: 'BIST Banka' },
  ];
  const results = [];
  for (const e of endeksler) {
    const data = await yahooChart(e.symbol);
    if (data && data.fiyat > 0) {
      results.push({ ad: e.name, deger: data.fiyat, degisim: data.degisim });
    }
  }
  return { borsa: 'BIST_ENDEKS', durum: results.length > 0 ? 'basarili' : 'hata', veri: results };
}

// ========== GLOBAL ==========

async function fetchGlobalMarkets() {
  const indices = [
    { symbol: '^DJI', name: 'Dow Jones', market: 'ABD' },
    { symbol: '^GSPC', name: 'S&P 500', market: 'ABD' },
    { symbol: '^IXIC', name: 'NASDAQ', market: 'ABD' },
    { symbol: '^FTSE', name: 'FTSE 100', market: 'Avrupa' },
    { symbol: '^GDAXI', name: 'DAX', market: 'Avrupa' },
    { symbol: '^FCHI', name: 'CAC 40', market: 'Avrupa' },
    { symbol: '^N225', name: 'Nikkei 225', market: 'Asya' },
    { symbol: '^HSI', name: 'Hang Seng', market: 'Asya' },
    { symbol: '000001.SS', name: 'Shanghai', market: 'Asya' },
  ];
  const results = [];
  for (const idx of indices) {
    const data = await yahooChart(idx.symbol);
    if (data && data.fiyat > 0) {
      results.push({
        sembol: idx.symbol, ad: idx.name, piyasa: idx.market,
        fiyat: data.fiyat, oncekiKapanis: data.oncekiKapanis,
        degisim: data.degisim, paraBirimi: data.paraBirimi,
      });
    }
  }
  return results;
}

// ========== DOVIZ / ALTIN (truncgil) ==========

async function fetchDovizAltin() {
  try {
    const res = await fetch('https://finans.truncgil.com/today.json', { headers: UA });
    const data = await res.json();
    const onemli = ['USD','EUR','GBP','CHF','JPY','CAD','AUD','SAR','CNY','RUB',
      'gram-altin','ceyrek-altin','yarim-altin','tam-altin','cumhuriyet-altini','ons','gumus'];
    const kurlar = [];
    for (const key of onemli) {
      if (data[key]) {
        const item = data[key];
        const alis = parseFloat((item['Alış'] || '0').replace(/\./g, '').replace(',', '.').replace('$', ''));
        const satis = parseFloat((item['Satış'] || '0').replace(/\./g, '').replace(',', '.').replace('$', ''));
        const degisim = (item['Değişim'] || '%0').replace('%', '');
        kurlar.push({
          kod: key.toUpperCase(),
          tur: item['Tür'] || '',
          alis, satis,
          degisim: parseFloat(degisim),
        });
      }
    }
    return { kaynak: 'DOVIZ_ALTIN', durum: 'basarili', guncelleme: data.Update_Date || '', veri: kurlar };
  } catch (e) {
    return { kaynak: 'DOVIZ_ALTIN', durum: 'hata', mesaj: e.message, veri: [] };
  }
}

// ========== TEFAS ==========

async function fetchTEFAS() {
  const dates = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(`${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`);
  }
  for (const dateStr of dates) {
    try {
      const body = `fontip=YAT&session=&fonkod=&fession=&baession=${dateStr}&bession=${dateStr}&fonunession=`;
      const res = await fetch('https://www.tefas.gov.tr/api/DB/BindHistoryInfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...UA,
          'Origin': 'https://www.tefas.gov.tr', 'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx' },
        body
      });
      const data = await res.json();
      const fonlar = (data.data || []).slice(0, 30).map(f => ({
        kod: f.FonKodu, ad: f.FonUnvani,
        fiyat: parseFloat(f.BirimPayDegeri || 0),
        gunlukGetiri: parseFloat(f.GunlukArtis || 0),
      })).filter(f => f.fiyat > 0);
      if (fonlar.length > 0) {
        return { kaynak: 'TEFAS', durum: 'basarili', tarih: dateStr, veri: fonlar };
      }
    } catch (_) {}
  }
  return { kaynak: 'TEFAS', durum: 'hata', mesaj: 'Fon verisi alinamadi', veri: [] };
}

// ========== ROUTER ==========

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  let responseData;
  switch (path) {
    case '/':
      responseData = { api: 'Borsa API v3.0', endpoints: [
        '/bist', '/bist/endeks', '/global', '/global/abd', '/global/avrupa',
        '/global/asya', '/tefas', '/doviz', '/tumu'
      ], zaman: new Date().toISOString() };
      break;
    case '/bist': responseData = await fetchBIST(); break;
    case '/bist/endeks': responseData = await fetchBISTEndeks(); break;
    case '/global': {
      const all = await fetchGlobalMarkets();
      responseData = { kaynak: 'GLOBAL', durum: all.length > 0 ? 'basarili' : 'hata', veri: all };
      break;
    }
    case '/global/abd': {
      const all = await fetchGlobalMarkets();
      responseData = { kaynak: 'ABD', durum: 'basarili', veri: all.filter(i => i.piyasa === 'ABD') };
      break;
    }
    case '/global/avrupa': {
      const all = await fetchGlobalMarkets();
      responseData = { kaynak: 'AVRUPA', durum: 'basarili', veri: all.filter(i => i.piyasa === 'Avrupa') };
      break;
    }
    case '/global/asya': {
      const all = await fetchGlobalMarkets();
      responseData = { kaynak: 'ASYA', durum: 'basarili', veri: all.filter(i => i.piyasa === 'Asya') };
      break;
    }
    case '/tefas': responseData = await fetchTEFAS(); break;
    case '/doviz': responseData = await fetchDovizAltin(); break;
    case '/tumu': {
      const [bist, endeks, global, tefas, doviz] = await Promise.all([
        fetchBIST(), fetchBISTEndeks(), fetchGlobalMarkets(), fetchTEFAS(), fetchDovizAltin()
      ]);
      responseData = { guncelleme: new Date().toISOString(), bist, endeks, tefas, doviz,
        global: { abd: global.filter(i => i.piyasa === 'ABD'), avrupa: global.filter(i => i.piyasa === 'Avrupa'), asya: global.filter(i => i.piyasa === 'Asya') }
      };
      break;
    }
    default:
      return new Response(JSON.stringify({ hata: 'Endpoint bulunamadi' }), { status: 404, headers: CORS_HEADERS });
  }
  return new Response(JSON.stringify(responseData, null, 2), { headers: CORS_HEADERS });
}

export default { async fetch(request) { return handleRequest(request); } };
