# 開心農場動物區設計依據

這是單字遊戲，不是實際飼養指南。每次購買、照護、採集、販售都先答單字題；十一種動物各有三項照護任務。完成任務且倒數結束才能採集，採集後開始下一輪。金幣、時間、產量均為遊戲平衡數值；未操作時動物不會受傷或消失。農舍或魚塭各佔用一塊原有農地；舊存檔會優先使用空地，不夠時於已擁有的里自動增加地格至該里上限，仍無法容納時保留動物及產品，待玩家騰出空地後再安置。

| 動物 | 遊戲照護重點 | 可販售產出 |
| --- | --- | --- |
| 乳牛 | 牧草、飲水槽、梳理 | 牛奶 |
| 羊 | 乾草、飲水、羊舍 | 羊毛 |
| 雞 | 穀物、飲水、雞窩 | 雞蛋 |
| 鴨 | 飼料、戲水池、鴨窩 | 鴨蛋 |
| 鵝 | 青草、戲水池、鵝舍 | 鵝蛋 |
| 豬 | 飼料、飲水、泥浴區 | 有機堆肥 |
| 青蛙 | 昆蟲餌、濕潤棲地、躲藏處 | 虛擬夜觀導覽券 |
| 金魚 | 少量餵食、過濾器、水質 | 虛擬觀賞券 |
| 鱷魚 | 專用飼料、水池、日照區 | 虛擬保育導覽券 |
| 虱目魚 | 投餌桶、鹽度與水質、增氧機 | 虱目魚 |
| 臺灣鯛 | 飼料、溶氧水車、水質 | 臺灣鯛 |

設計參考：

- 英國政府的[牛隻福利規範](https://www.gov.uk/government/publications/code-of-recommendations-for-the-welfare-of-livestock-cattle/code-of-recommendations-for-the-welfare-of-livestock-cattle)、[羊隻福利規範](https://www.gov.uk/government/publications/code-of-recommendations-for-the-welfare-of-livestock-sheep/sheep-and-goats-welfare-recommendations)、[豬隻福利規範](https://www.gov.uk/government/publications/pigs-on-farm-welfare/caring-for-pigs)提到適當飼料、清潔飲水、環境與遮蔽。
- 英國政府的[蛋雞福利規範](https://www.gov.uk/government/publications/poultry-on-farm-welfare/poultry-welfare-recommendations)重視巢箱、棲架與覓食；[鴨隻福利規範](https://www.gov.uk/government/publications/poultry-on-farm-welfare/ducks-mallard-and-pekin-welfare-recommendations)重視飲水和適當環境。
- 澳洲政府的[青蛙池指南](https://www.qld.gov.au/environment/plants-animals/animals/discovering-wildlife/frogs/build-frog-pond)、[金魚照護指南](https://agriculture.vic.gov.au/livestock-and-animals/animal-welfare-victoria/other-pets/caring-for-your-pet-fish)及[鱷魚照護準則](https://www.dcceew.gov.au/environment/wildlife-trade/publications/code-practice-humane-treatment-wild-and-farmed-australian-crocodiles)支持棲地濕度、水質、過濾與溫度／日照區等主題。
- 農業部[虱目魚養殖資料](https://fae.moa.gov.tw/map/food_item.php?id=2&type=AS04)記錄投餌、越冬溝與魚塭季節；[臺灣鯛資料](https://fae.moa.gov.tw/map/food_item.php?id=198&type=AS04)強調水質、鹽度及飼料。遊戲以增氧、水質和投餌作照護題材，並非實際養殖規格。

## 作物、能源與觀光

- 新增芒果（遊戲適季 4–9 月）、火龍果（5–11 月）、香蕉（全年）。農業部資料指出[芒果品種的產期跨春夏至初秋](https://fae.moa.gov.tw/theme_data.php?id=4687&sub_theme=knowledge&theme=topics)、[火龍果主要產期 6–11 月](https://fae.moa.gov.tw/map/food_item.php?id=254&type=AS03)、[香蕉全年生產](https://fae.moa.gov.tw/files/kids_edu_material/2088/A001_1.pdf)。原有作物也增加不同適季；地瓜與香蕉因臺灣多地可全年生產，遊戲設為全年。可參考農業部[季節蔬果教材](https://fae.moa.gov.tw/files/topics/3056/A02_1.pdf)與[稻米期作資料](https://fae.moa.gov.tw/files/kids_edu_material/2080/A001_2.pdf)。適季加 1 份，非適季少 1 份且生長較慢；月份與產量為簡化的遊戲規則，先前已種作物不追溯調整。
- 光電板可設於空地、虱目魚／臺灣鯛魚塭上方，或有屋頂的動物農舍。每塊板每天領一次賣電收入，晴天高於多雲、雨天。農業部的[漁電共生說明](https://talis.moa.gov.tw/age/Page/AgriGreenEnergy?category=OutFishing)強調魚塭仍須維持養殖；遊戲只模擬概念，不表示現實設置時不需許可。
- 觀光接待站佔一塊空地，每天答題接待一次；週末基礎人潮較平日多，田地與動物種類增加人潮。每種作物可用兩份原料在自建加工坊製成副產品，或付費委外加工。農業部對[休閒農業的生產、加工與體驗](https://www.moa.gov.tw/ws.php?id=2506544)有相關介紹。收入、遊客數與每日天氣均是遊戲模擬值，不是真實天氣、發電或市場資料。
- 新作物在同班互訪中可澆水、照料與摘取；新 Supabase 專案須在 SQL Editor 執行 `supabase/migrations/20260930_happy_farm_seasons.sql`，以更新互訪函式的作物清單與適季產量計算。農場、光電與觀光進度仍存於 `happy_farm_states.farm` JSONB，不新增資料表。

青蛙、金魚與鱷魚只產出遊戲內的虛擬導覽或觀賞券；遊戲不包含野生動物交易。
