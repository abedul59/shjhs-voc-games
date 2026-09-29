# 單字鐵路旅遊地理資料

- 臺灣及日本真實海岸輪廓：Natural Earth 1:10m Admin 0 Countries（public domain），於遊戲座標系中做少量幾何簡化。來源：<https://www.naturalearthdata.com/downloads/10m-cultural-vectors/>。
- 臺灣車站與路線沿用既有資料：<https://data.gov.tw/dataset/33425>、<https://www.railway.gov.tw/tra-tip-web/tip/tip001/tip111/view?code=E040>。本次依各站經緯度重算地圖位置，使站點貼合真實輪廓。
- 日本車站及鐵道路線：[國土交通省國土數值情報 N02，2025 年度](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html)，CC BY 4.0。依營運公司篩選 JR 北海道、東日本、東海、西日本、四國、九州的客運車站，含新幹線，不含私鐵、地下鐵與 JR 貨物。按營運公司分開下載，合計 4,339 個公司／車站組合；跨公司的同一座車站可能計入多個 JR 分區。
- 日本都道府縣分界：Natural Earth 1:10m Admin 1 States and Provinces（public domain），用來給車站分配中地圖範圍。
- 日本車站中文名稱：日本維基百科[跨語言連結 API](https://www.mediawiki.org/wiki/API:Langlinks) 的中文條目標題，轉為繁體中文；同名異地車站依都道府縣查找各自條目。名稱對應與逐站覆核值存於 `data/railway-japan-zh-source.json`。這些是名稱資料，不取代日本國土交通省的站點與座標。Natural Earth 簡化邊界造成的少數跨縣站點歸屬已於產生腳本修正。
- 2025 年 N02 尚列有 2026 年 3 月停駛的 JR 北海道留萌線。本資料已排除其停駛站及沒有定期客運的海峽線站；深川、木古內等仍由其他 JR 路線服務的車站保留。參考：[JR 北海道留萌線公告](https://www.jrhokkaido.co.jp/CM/Info/press/pdf/20250328_KO_todokede.pdf)。其餘路線以 2025 年官方資料為準，未來營運調整須重生資料。

重建資料時，先下載上述 GeoJSON／Shapefile 及 N02 ZIP，安裝 `shapely` 與 `pyshp`，再執行 `python3 scripts/generate-railway-geodata.py --countries COUNTRIES.geojson --admin1 ADMIN1.shp --n02 N02-25_GML.zip`。腳本產生 `data/railway-outlines.json`、`data/railway-japan-index.json`、`public/railway/japan-*.json`，並依原有臺灣站點經緯度更新 `data/railway-taiwan.json`。日本的六個資料檔由前端按需載入。支線的車站順序依鐵道路線相鄰關係排出，路線有岔線時列表依路網遍歷。

既有 Supabase 專案需執行 `supabase/migrations/20260929_railway_japan_progress_capacity.sql`，將車站章上限從 300 提升到 6,000；既有進度不會清除。

日本車站圖鑑只在到站解鎖後查詢維基百科簡介（優先中文，找不到才查日文）。若文章有封面照片，另查 Wikimedia Commons 的作者、授權及圖片頁資訊後才顯示。站點資料本身不仰賴維基百科載入，維基百科暫時不可用時仍可遊玩。
