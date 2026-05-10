# Borsa API — Cloudflare Worker + AI Edge Gallery Skill

## Proje Yapısı

```
borsa-api/
├── worker/                  # Cloudflare Worker API
│   ├── wrangler.toml
│   ├── package.json
│   └── src/index.js         # Ana worker kodu
├── skill/                   # Google AI Edge Gallery Skill
│   ├── SKILL.md             # Gemma 4 sistem promptu
│   └── script.js            # Araç fonksiyonları
└── README.md
```

## API Endpoints

| Endpoint | Açıklama |
|---|---|
| `GET /` | API bilgileri ve endpoint listesi |
| `GET /bist` | BIST hisse verileri |
| `GET /bist/endeks` | BIST endeks verileri |
| `GET /global` | Tüm global borsalar |
| `GET /global/abd` | ABD borsaları (Dow Jones, S&P 500, NASDAQ) |
| `GET /global/avrupa` | Avrupa borsaları (FTSE 100, DAX, CAC 40) |
| `GET /global/asya` | Asya borsaları (Nikkei 225, Hang Seng, Shanghai) |
| `GET /tefas` | TEFAS yatırım fonları |
| `GET /doviz` | Döviz ve altın kurları |
| `GET /tumu` | Tüm veriler tek seferde |

## Kurulum ve Deploy

### 1. Worker'ı Deploy Et

```bash
cd worker
npm install
npx wrangler login        # Cloudflare hesabına giriş
npx wrangler deploy        # Worker'ı deploy et
```

Deploy sonrası size verilen URL'yi kopyalayın (örn: `https://borsa-api.XXXXX.workers.dev`)

### 2. Skill Ayarları

`skill/script.js` içindeki `API_BASE_URL` değerini kendi worker URL'nizle değiştirin:

```js
const API_BASE_URL = "https://borsa-api.XXXXX.workers.dev";
```

### 3. AI Edge Gallery'ye Yükleme

1. Google AI Edge Gallery uygulamasını açın
2. Gemma 4 modelini seçin
3. **Skills** bölümüne gidin
4. `SKILL.md` ve `script.js` dosyalarını yükleyin
5. Skill aktif edildikten sonra "BIST nasıl?" gibi sorular sorabilirsiniz

## Veri Kaynakları

- **BIST**: BigPara (Hürriyet) API
- **Global Borsalar**: Yahoo Finance API
- **TEFAS**: tefas.gov.tr resmi API
- **Döviz/Altın**: BigPara API
