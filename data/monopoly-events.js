// The same decks and effects are used by the player and the computer.
export const monopolyEvents = {
  chance: [
    { title: '城市英語小導遊', text: '你用英語介紹景點，獲得導覽獎勵。', cash: 180 },
    { title: '單字獎學金', text: '持續學習獲得肯定，領取學習獎學金。', cash: 150 },
    { title: '旅遊補助', text: '抽中城市探索補助，旅費增加了！', cash: 100 },
    { title: '免租通行證', text: '獲得一張免租券，下次到對手土地可免付一次租金（最多保留兩張）。', shield: 1 },
    { title: '友善城市回饋', text: '協助旅人找到車站，收到一份謝禮。', cash: 80 }
  ],
  fate: [
    { title: '行李超重', text: '紀念品買得太多，需要支付行李費。', cash: -80 },
    { title: '旅館整修', text: '幫城市旅館修繕設備，支付整修費。', cash: -100 },
    { title: '錯過末班車', text: '改搭計程車回到市區，支付交通費。', cash: -60 },
    { title: '雨天備案', text: '天氣改變，臨時購買雨具與室內活動門票。', cash: -50 },
    { title: '失而復得', text: '找回遺失的旅費！今天的命運也有好消息。', cash: 120 }
  ]
};
