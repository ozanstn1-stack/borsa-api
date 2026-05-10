/**
 * Borsa API - Cloudflare Worker
 * Borsa İstanbul, Global Markets & TEFAS verilerini JSON olarak sunar
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

// ========== DATA FETCHERS ==========

async function fetchBIST() {
  try {
    const res = await fetch('https://bigpara.hurriyet.com.tr/api/v1/hisse/list', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await res.json();
    const hisseler = (data.data || []).slice(0, 30).map(h => ({
      sembol: h.kod || h.HESSION,
      ad: h.ad || h.HESSION,
      fiyat: parseFloat(h.satis || h.SATIS || 0),
      degisim: parseFloat(h.yuzde || h.YUZDE || 0),
      hacim: h.hacimTL || h.HACIMTL || '0',
      tarih: h.spiTarih || new Date().toISOString()
    }));
    return { borsa: 'BIST', durum: 'basarili', veri: hisseler };
  } catch (e) {
    return { borsa: 'BIST', durum: 'hata', mesaj: e.message, veri: [] };
  }
}

async function fetchBISTSummary() {
  try {
    const res = await fetch('https://bigpara.hurriyet.com.tr/api/v1/borsa/endeksler', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await res.json();
    const endeksler = (data.data || []).map(e => ({
      ad: e.ad || e.AD,
      deger: parseFloat(e.satis || e.SATIS || 0),
      degisim: parseFloat(e.yuzde || e.YUZDE || 0),
    }));
    return { borsa: 'BIST_ENDEKS', durum: 'basarili', veri: endeksler };
  } catch (e) {
    return { borsa: 'BIST_ENDEKS', durum: 'hata', mesaj: e.message, veri: [] };
  }
}

async function fetchTEFAS() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const body = `fontip=YAT&session=&fonkod=&fession=&baession=${today}&bession=${today}&fonunession=`;
    const res = await fetch('https://www.tefas.gov.tr/api/DB/BindHistoryInfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.tefas.gov.tr',
        'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx'
      },
      body
    });
    const data = await res.json();
    const fonlar = (data.data || []).slice(0, 30).map(f => ({
      kod: f.FonKodu,
      ad: f.FonUnvani,
      fiyat: parseFloat(f.BirimPayDegeri || 0),
      gunlukGetiri: parseFloat(f.GunlukArtis || 0),
      kisiSayisi: f.KatilimciSayisi || 0,
      buyukluk: f.ToplamDeger || '0'
    }));
    return { kaynak: 'TEFAS', durum: 'basarili', veri: fonlar };
  } catch (e) {
    return { kaynak: 'TEFAS', durum: 'hata', mesaj: e.message, veri: [] };
  }
}

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
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?range=1d&interval=1m`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta) {
        results.push({
          sembol: idx.symbol,
          ad: idx.name,
          piyasa: idx.market,
          fiyat: meta.regularMarketPrice || 0,
          oncekiKapanis: meta.chartPreviousClose || 0,
          degisim: meta.regularMarketPrice && meta.chartPreviousClose
            ? (((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2)
            : '0',
          paraBirimi: meta.currency || 'USD',
        });
      }
    } catch (_) { /* skip failed index */ }
  }
  return results;
}

async function fetchDovizAltin() {
  try {
    const res = await fetch('https://bigpara.hurriyet.com.tr/api/v1/doviz/headerlist', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await res.json();
    const kurlar = (data.data || []).map(k => ({
      kod: k.SEMPIRIK || k.kod,
      ad: k.Pirim || k.ad,
      alis: parseFloat(k.alis || k.ALIS || 0),
      satis: parseFloat(k.satis || k.SATIS || 0),
      degisim: parseFloat(k.yuzde || k.YUZDE || 0),
    }));
    return { kaynak: 'DOVIZ_ALTIN', durum: 'basarili', veri: kurlar };
  } catch (e) {
    return { kaynak: 'DOVIZ_ALTIN', durum: 'hata', mesaj: e.message, veri: [] };
  }
}

// ========== ROUTER ==========

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let responseData;

  switch (path) {
    case '/':
      responseData = {
        api: 'Borsa API v1.0',
        endpoints: [
          'GET /bist - BIST hisse verileri',
          'GET /bist/endeks - BIST endeks verileri',
          'GET /global - ABD, Avrupa, Asya borsaları',
          'GET /global/abd - ABD borsaları',
          'GET /global/avrupa - Avrupa borsaları',
          'GET /global/asya - Asya borsaları',
          'GET /tefas - TEFAS fon verileri',
          'GET /doviz - Döviz ve altın kurları',
          'GET /tumu - Tüm veriler',
        ],
        zaman: new Date().toISOString()
      };
      break;

    case '/bist':
      responseData = await fetchBIST();
      break;

    case '/bist/endeks':
      responseData = await fetchBISTSummary();
      break;

    case '/global': {
      const all = await fetchGlobalMarkets();
      responseData = { kaynak: 'GLOBAL', durum: 'basarili', veri: all };
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
    case '/tefas':
      responseData = await fetchTEFAS();
      break;

    case '/doviz':
      responseData = await fetchDovizAltin();
      break;

    case '/tumu': {
      const [bist, endeks, global, tefas, doviz] = await Promise.all([
        fetchBIST(), fetchBISTSummary(), fetchGlobalMarkets(), fetchTEFAS(), fetchDovizAltin()
      ]);
      responseData = {
        guncelleme: new Date().toISOString(),
        bist, endeks, tefas, doviz,
        global: {
          abd: global.filter(i => i.piyasa === 'ABD'),
          avrupa: global.filter(i => i.piyasa === 'Avrupa'),
          asya: global.filter(i => i.piyasa === 'Asya'),
        }
      };
      break;
    }
    default:
      return new Response(JSON.stringify({ hata: 'Endpoint bulunamadı', yol: path }), {
        status: 404, headers: CORS_HEADERS
      });
  }

  return new Response(JSON.stringify(responseData, null, 2), { headers: CORS_HEADERS });
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  },
};
