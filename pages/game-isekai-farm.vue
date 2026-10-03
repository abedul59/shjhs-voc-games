<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ISEKAI_ANIMALS, ISEKAI_AREAS, ISEKAI_BUILDINGS, ISEKAI_CROPS, ISEKAI_GAME_TYPE, ISEKAI_GENDERS, ISEKAI_PROFESSIONS, ISEKAI_RACES, ISEKAI_REGIONS, ISEKAI_REINCARNATION_COST, adjustedAnimalCost, adjustedAreaCost, adjustedBuildingCost, adjustedFeedCost, adjustedRegionCost, adjustedSalePrice, adjustedSeedPrice, animalById, applyIsekaiAction, areaById, buildingById, chooseIsekaiIdentity, cropById, freshIsekaiFarm, isekaiActionError, isekaiClimate, isekaiFrontierFieldCount, normalizeIsekaiFarm, professionById, raceById } from '~/lib/isekai-farm';
import { FIELD_SHAPES, HOMESTEAD_SHAPE, LOCAL_LANDMARKS, MAP_TINTS, TERRITORY_SHAPES } from '~/lib/isekai-cartography';
import { ISEKAI_HOBBIES, ISEKAI_PARTNERS, ISEKAI_REST_MS, ISEKAI_SHIFT_MS, ISEKAI_TASKS, ISEKAI_WORK_INTERVAL_MS, applyPeopleAction, isekaiChildAge, isekaiStaffMarket, isekaiStaffWage, normalizeIsekaiPeople, partnerById, peopleActionError, runIsekaiStaff, staffById } from '~/lib/isekai-farm-people';
import { advanceIsekaiWorld, applyExpansionAction, expansionActionError, normalizeIsekaiExpansion } from '~/lib/isekai-farm-expansion';
import { farmLessonAllowed, farmPolicyTableMissing } from '~/lib/happy-farm-access';

const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const studentId = computed(() => student.value?.id ? String(student.value.id) : '');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const lessonLabel = [lesson.version, lesson.volume, lesson.unit].filter(Boolean).join(' · ');
const farm = ref(normalizeIsekaiExpansion(normalizeIsekaiPeople(freshIsekaiFarm())));
const revision = ref(0);
const words = ref([]);
const loading = ref(true);
const busy = ref(false);
const notice = ref('正在翻開開拓日誌…');
const saveNotice = ref('');
const now = ref(Date.now());
const selectedPlot = ref(0);
const selectedFrontier = ref(0);
const selectedFrontierField = ref(0);
const selectedFrontierAreaId = ref('fittoa');
const selectedFrontierCropId = ref('wheat');
const selectedCropId = ref('wheat');
const seedQuantity = ref(1);
const selectedBuildingId = ref('well');
const selectedAnimalId = ref('hen');
const animalCategory = ref('land');
const operationTab = ref('crops');
const profileDraft = ref({ gender: '', raceId: '', professionId: '', faith: 'free', areaId: '' });
const staffView = ref('market');
const staffPayPeriod = ref('day');
const familyView = ref('meet');
const chosenHobbyId = ref('gardening');
const childPartnerChoice = ref({});
const frontiers = ref([]);
const frontierReady = ref(false);
const frontierLeaseReady = ref(false);
const classmates = ref([]);
const peerLoans = ref([]);
const peerLoanReady = ref(false);
const peerVisits = ref([]);
const peerVisitReady = ref(false);
const peerVisitPreview = ref(null);
const accessAllowed = ref(true);
let lastAccessCheckAt = 0;
let checkingAccess = false;
const battle = ref(null);
const staffActiveMs = ref(0);
let lastActiveTick = 0;
let lastInteractionAt = 0;
let interactionCleanup;
let staffTickBusy = false;
let lastFrontierRefresh = 0;
let lastPeerLoanAttempt = 0;
const mapMode = ref('large');
const atlasOpen = ref(false);
const atlasListsOpen = ref(false);
const ledgerOpen = ref(false);
const nextQuizAt = ref(0);
const quiz = ref(null);
const answer = ref('');
const session = ref(null);
const sessionKey = computed(() => `isekai-farm-session:${studentId.value}:${lesson.version}:${lesson.volume}:${lesson.unit}`);
const quizClockKey = computed(() => `${sessionKey.value}:next-question`);
const activeRegion = computed(() => ISEKAI_REGIONS.find(region => region.id === farm.value.selectedRegion) || ISEKAI_REGIONS[0]);
const activeArea = computed(() => areaById(farm.value.selectedArea) || ISEKAI_AREAS[0]);
const regionAreas = computed(() => ISEKAI_AREAS.filter(area => area.region === activeRegion.value.id));
const startAreaPreview = computed(() => areaById(profileDraft.value.areaId));
const localLandmarks = computed(() => LOCAL_LANDMARKS[activeArea.value.id] || LOCAL_LANDMARKS.fittoa);
const mapViewBox = computed(() => {
  if (mapMode.value === 'large') return '0 0 800 900';
  return '0 0 600 420';
});
const mapCaption = computed(() => mapMode.value === 'world' ? '六面世界 · 五大陸圖誌'
  : mapMode.value === 'worldExact' ? '原作世界地圖 · 海岸線原圖'
  : mapMode.value === 'large' ? '中央大陸全貌'
  : mapMode.value === 'middle' ? `${activeRegion.value.name} · 四領地總覽` : mapMode.value === 'small' ? `${activeArea.value.name} · 領地詳圖` : `${activeArea.value.name} · 農莊與邊境`);
const regionCrops = computed(() => ISEKAI_CROPS.filter(crop => crop.region === activeRegion.value.id));
const categoryAnimals = computed(() => ISEKAI_ANIMALS.filter(animal => animal.group === animalCategory.value));
const stockedCrops = computed(() => ISEKAI_CROPS.filter(crop => (farm.value.produce[crop.id] || 0) > 0));
const stockedAnimals = computed(() => ISEKAI_ANIMALS.filter(animal => (farm.value.animalGoods?.[animal.id] || 0) > 0));
const climate = computed(() => isekaiClimate(now.value, activeRegion.value.id));
const plots = computed(() => farm.value.plots[activeArea.value.id] || []);
const selectedSite = computed(() => plots.value[selectedPlot.value]);
const selectedAnimal = computed(() => animalById(selectedAnimalId.value));
const animalPurchaseCost = computed(() => (selectedAnimal.value ? adjustedAnimalCost(farm.value, selectedAnimal.value) : 0)
  + (selectedSite.value ? 0 : adjustedBuildingCost(farm.value, buildingById('stable'))));
const quizWaitSeconds = computed(() => Math.max(0, Math.ceil((nextQuizAt.value - now.value) / 1000)));
const totalProduce = computed(() => [...Object.values(farm.value.produce), ...Object.values(farm.value.animalGoods || {})].reduce((sum, count) => sum + Number(count || 0), 0));
const currentScore = computed(() => (session.value?.correct.length || 0) * 10);
const marketStaff = computed(() => isekaiStaffMarket(now.value, farm.value.staff || []));
const frontierAt = index => frontiers.value.find(item => item.area_id === activeArea.value.id && item.plot_index === index);
const frontierArea = computed(() => areaById(selectedFrontierAreaId.value) || activeArea.value);
const frontierCrops = computed(() => ISEKAI_CROPS.filter(crop => crop.region === frontierArea.value.region));
const frontierClaim = computed(() => frontiers.value.find(item => item.area_id === frontierArea.value.id && item.plot_index === selectedFrontier.value));
const frontierUsable = computed(() => frontierClaim.value?.owner_id === studentId.value
  || (frontierClaim.value?.lease_holder_id === studentId.value && new Date(frontierClaim.value.lease_expires_at).getTime() > now.value));
const frontierFields = computed(() => (farm.value.frontierPlots?.[frontierArea.value.id]?.[selectedFrontier.value] || [])
  .map(plot => plot?.accessAt === frontierClaim.value?.captured_at ? plot : null));
const frontierSite = computed(() => frontierFields.value[selectedFrontierField.value]);
const homeFrontiersComplete = computed(() => ISEKAI_AREAS.some(area => area.id === (farm.value.profile?.startAreaId || 'fittoa')
  && Array.from({ length: 6 }, (_, index) => frontiers.value.some(item => item.area_id === area.id && item.plot_index === index && item.owner_id === studentId.value)).every(Boolean)));
const frontierExpansionAllowed = computed(() => frontierArea.value.id === (farm.value.profile?.startAreaId || 'fittoa') || homeFrontiersComplete.value);
const frontierOwnerName = computed(() => !frontierClaim.value?.owner_id ? '系統守衛' : frontierClaim.value.owner_id === studentId.value ? '我方'
  : classmates.value.find(item => item.student_id === frontierClaim.value.owner_id)?.hidden_name || '同班領主');
const staffAvailable = computed(() => (farm.value.staff || []).filter(item => item.focus !== 'guard').length
  + (farm.value.spouses || []).filter(item => !['rest','guard'].includes(item.focus)).length
  + (farm.value.children || []).filter(item => !['rest','guard'].includes(item.focus) && isekaiChildAge(item, now.value) >= 6).length);
const peopleActionTypes = new Set(['hireStaff','dismissStaff','staffFocus','staffTask','staffAutoCrop','staffReservePlot','activity','meet','match','date','breakup','propose','marry','divorce','child','familyFocus','childMeet','childDate','childMarry','childBreakup']);
const expansionActionTypes = new Set(['process','sellProcessed','operateVenue','solarRoof','researchCrop','hireSpecialist','dismissSpecialist','borrowGuild','repayGuild','insure','payUtility','foundCivic','donateCivic','hireCivic','configureCivic','setSchedule','civicUpgrade','operateCivic','closeCivic']);
let clock;
let lastWordId = null;

function changeRegion(id) {
  if (!farm.value.unlockedRegions.includes(id)) return;
  farm.value.selectedRegion = id;
  const nextArea = ISEKAI_AREAS.find(area => area.region === id && farm.value.unlockedAreas.includes(area.id));
  if (nextArea) farm.value.selectedArea = nextArea.id;
  if (nextArea) selectedFrontierAreaId.value = nextArea.id;
  selectedPlot.value = 0;
  selectedCropId.value = ISEKAI_CROPS.find(crop => crop.region === id)?.id || 'wheat';
  selectedFrontierCropId.value = selectedCropId.value;
  mapMode.value = 'middle';
}
function openWorldMap() { mapMode.value = 'world'; atlasOpen.value = true; }
function openExactWorldMap() { mapMode.value = 'worldExact'; atlasOpen.value = true; }

function changeArea(id) {
  const area = areaById(id);
  if (!area || !farm.value.unlockedAreas.includes(id)) return;
  farm.value.selectedRegion = area.region;
  farm.value.selectedArea = id;
  selectedFrontierAreaId.value = id;
  selectedPlot.value = 0;
  selectedCropId.value = ISEKAI_CROPS.find(crop => crop.region === area.region)?.id || 'wheat';
  selectedFrontierCropId.value = selectedCropId.value;
  mapMode.value = 'small';
}

function openTerritory(area) {
  if (farm.value.unlockedAreas.includes(area.id)) changeArea(area.id);
  else askAction({ type: 'unlockArea', areaId: area.id });
}

function selectPlot(index) {
  selectedPlot.value = index;
  const plot = plots.value[index];
  operationTab.value = plot?.facility === 'stable' ? 'animals' : buildingById(plot?.facility)?.category ? 'town' : plot?.facility ? 'buildings' : 'crops';
}

function selectFrontier(index) {
  selectedFrontierAreaId.value = activeArea.value.id;
  selectedFrontier.value = index;
  selectedFrontierField.value = 0;
  operationTab.value = 'war';
}
function chooseFrontierArea(id) {
  selectedFrontierAreaId.value = id;
  selectedFrontier.value = 0;
  selectedFrontierField.value = 0;
  selectedFrontierCropId.value = ISEKAI_CROPS.find(crop => crop.region === areaById(id)?.region)?.id || 'wheat';
  operationTab.value = 'war';
}
function frontierFarmAction(type) {
  return { type, plotKind: 'frontier', areaId: frontierArea.value.id, plotIndex: selectedFrontier.value,
    frontierFieldIndex: selectedFrontierField.value, cropId: selectedFrontierCropId.value, quantity: seedQuantity.value };
}

function scheduleNextQuiz() {
  nextQuizAt.value = Date.now() + 30000 + Math.floor(Math.random() * 10001);
  try { sessionStorage.setItem(quizClockKey.value, String(nextQuizAt.value)); } catch { /* Keep the timer in memory. */ }
}

async function createProfile() {
  if (busy.value || farm.value.profile) return;
  busy.value = true;
  try {
    await saveFarm(chooseIsekaiIdentity(farm.value, profileDraft.value));
    selectedCropId.value = ISEKAI_CROPS.find(crop => crop.region === farm.value.selectedRegion)?.id || 'wheat';
    selectedFrontierAreaId.value = farm.value.selectedArea;
    selectedFrontierCropId.value = selectedCropId.value;
    mapMode.value = 'small';
    notice.value = `已從${activeArea.value.name}開始開拓；${raceById(farm.value.profile.raceId).name}・${professionById(farm.value.profile.professionId).name}的農莊是兼職。`;
  } catch (error) { notice.value = `角色尚未建立：${error.message}`; }
  finally { busy.value = false; }
}

function confirmReincarnation() {
  if (!can({ type: 'reincarnate' })) return;
  if (window.confirm(`轉生將花費 ${ISEKAI_REINCARNATION_COST} 金幣並清空所有農莊進度；學習成績保留。確定要重新開始嗎？`)) askAction({ type: 'reincarnate' });
}

function actionMessage(action) {
  if (action.type === 'peerVisit') return action.command === 'gather' ? '到同學農莊取得收成' : '拜訪同班同學農莊';
  if (action.type === 'peerLoan') return ({ request:'向同班同學借款', approve:'同意同學借款', reject:'拒絕借款', cancel:'撤銷借款', repay:'償還同學借款', foreclose:'抵押領地到期結算' })[action.command] || '同學借款';
  if (expansionActionTypes.has(action.type)) return ({ process:'加工產品', sellProcessed:'販賣加工品', operateVenue:'經營商店與觀光', solarRoof:'設置屋頂魔晶板', researchCrop:'研發作物', hireSpecialist:'聘用高階顧問', dismissSpecialist:'結束顧問合約', borrowGuild:'公會急難借款', repayGuild:'償還公會借款', insure:'設置防災結界', payUtility:'繳納水電費', foundCivic:'創辦公益機構', donateCivic:'捐贈機構基金', hireCivic:'聘用機構人員', configureCivic:'設定招生與班級', setSchedule:'安排學府課表', civicUpgrade:'擴建公益設施', operateCivic:'經營公益機構', closeCivic:'結束公益機構營運' })[action.type];
  if (action.type === 'battleStart') return `挑戰${frontierArea.value.name}第 ${selectedFrontier.value + 1} 塊邊境田地`;
  if (action.type === 'frontierRent') return `租用${frontierArea.value.name}第 ${selectedFrontier.value + 1} 塊邊境田地`;
  if (peopleActionTypes.has(action.type)) return ({ hireStaff:'雇用人員', dismissStaff:'解雇人員', staffFocus:'安排人員工作', staffTask:'修改自動任務', staffAutoCrop:'設定自動播種作物', staffReservePlot:'設定手動保留田位', activity:'參加社交活動', meet:'自然相識', match:'相親介紹', date:'約會', breakup:'和平分手', propose:'求婚', marry:'結婚', divorce:'離婚', child:'迎接孩子', familyFocus:'安排家人工作', childMeet:'孩子認識對象', childDate:'孩子約會', childMarry:'孩子結婚', childBreakup:'孩子分手' })[action.type];
  if (action.type === 'unlock') return `開拓${ISEKAI_REGIONS.find(region => region.id === action.regionId)?.name}`;
  if (action.type === 'unlockArea') return `開拓${areaById(action.areaId)?.name}`;
  if (action.type === 'reincarnate') return '付費轉生、重新開拓';
  if (action.type === 'build') return `建造${buildingById(action.buildingId)?.name}`;
  if (action.type === 'demolish') return '拆除建築';
  if (action.type === 'adopt') return `飼養${animalById(action.animalId)?.name}`;
  if (action.type === 'release') return '讓動物離開畜舍';
  if (action.type === 'feed') return '照顧畜舍動物';
  if (action.type === 'collect') return '收取動物產物';
  if (action.type === 'sellAnimal') return `出售${animalById(action.animalId)?.product}`;
  const crop = cropById(action.cropId || selectedSite.value?.cropId);
  return ({ buy: `購買${crop?.name || ''}種苗`, plant: `播種${crop?.name || ''}`, water: '為作物澆水', harvest: '收成作物', sell: `出售${crop?.name || ''}` })[action.type] || '農莊操作';
}

function can(action) {
  return accessAllowed.value && !loading.value && !busy.value && !quiz.value && !battle.value && !(action.type === 'battleStart'
    ? (!frontierReady.value || !student.value?.class || student.value?.isAnon || frontierClaim.value?.owner_id === studentId.value || (frontierClaim.value?.lease_holder_id && new Date(frontierClaim.value.lease_expires_at).getTime() > now.value) || !frontierExpansionAllowed.value || (!frontierLeaseReady.value && frontierArea.value.id !== (farm.value.profile?.startAreaId || 'fittoa')))
    : action.type === 'frontierRent' ? (!frontierLeaseReady.value || !student.value?.class || student.value?.isAnon || !!frontierClaim.value?.owner_id || (frontierClaim.value?.lease_holder_id && frontierClaim.value.lease_holder_id !== studentId.value && new Date(frontierClaim.value.lease_expires_at).getTime() > now.value) || !frontierExpansionAllowed.value || farm.value.coins < 60)
    : action.plotKind === 'frontier' ? (!frontierUsable.value || isekaiActionError(farm.value, { ...action, frontierAccess: true, frontierClaimedAt: frontierClaim.value?.captured_at }, now.value))
    : action.type === 'peerLoan' ? (!peerLoanReady.value || !student.value?.class || student.value?.isAnon)
    : action.type === 'peerVisit' ? (!peerVisitReady.value || !student.value?.class || student.value?.isAnon)
    : peopleActionTypes.has(action.type) ? peopleActionError(farm.value, action, now.value) : expansionActionTypes.has(action.type) ? expansionActionError(farm.value, action, now.value) : isekaiActionError(farm.value, action, now.value));
}

function askAction(action) {
  if (!accessAllowed.value) { notice.value = '導師目前沒有開放這個單元的異世界農莊。'; return; }
  if (busy.value || quiz.value) return;
  const error = action.type === 'battleStart' ? (!student.value?.class || student.value?.isAnon ? '請以班級學生帳號登入。' : !frontierExpansionAllowed.value ? '先佔領起始領地的六塊邊境地。' : !frontierLeaseReady.value && frontierArea.value.id !== (farm.value.profile?.startAreaId || 'fittoa') ? '跨領地戰鬥需要先執行新版邊境土地 SQL。' : frontierClaim.value?.owner_id === studentId.value ? '已擁有這塊邊境田地。' : '')
    : action.type === 'frontierRent' ? (!frontierLeaseReady.value ? '租地需要先執行新版邊境土地 SQL。' : !frontierExpansionAllowed.value ? '先佔領起始領地的六塊邊境地。' : farm.value.coins < 60 ? '租地需要 60 金幣。' : '')
    : action.plotKind === 'frontier' ? (!frontierUsable.value ? '尚未佔領或租用此邊境田地。' : isekaiActionError(farm.value, { ...action, frontierAccess: true, frontierClaimedAt: frontierClaim.value?.captured_at }, now.value))
    : action.type === 'peerLoan' ? (!peerLoanReady.value ? '同學借款尚未啟用，請先執行新增 SQL。' : !student.value?.class || student.value?.isAnon ? '請以班級學生帳號登入。' : '')
    : action.type === 'peerVisit' ? (!peerVisitReady.value ? '同學互訪尚未啟用，請先執行新增 SQL。' : !student.value?.class || student.value?.isAnon ? '請以班級學生帳號登入。' : '')
    : peopleActionTypes.has(action.type) ? peopleActionError(farm.value, action, now.value) : expansionActionTypes.has(action.type) ? expansionActionError(farm.value, action, now.value) : isekaiActionError(farm.value, action, now.value);
  if (error) { notice.value = error; return; }
  if (!words.value.length) { notice.value = '本課單字尚未載入。'; return; }
  if (Date.now() < nextQuizAt.value) { void performWithoutQuiz(action); return; }
  const candidates = words.value.filter(word => word.id !== lastWordId);
  const word = (candidates.length ? candidates : words.value)[Math.floor(Math.random() * (candidates.length || words.value.length))];
  lastWordId = word.id;
  const english = String(word.en_us).trim();
  const eligibleFill = /^[a-zA-Z]{3,}$/.test(english);
  const type = eligibleFill && Math.random() < .5 ? 'fill' : 'choice';
  const indices = type === 'fill' ? [...english].map((_, index) => index).sort(() => Math.random() - .5).slice(0, 2).sort((a, b) => a - b) : [];
  const options = type === 'choice'
    ? [english, ...words.filter(item => item.id !== word.id).sort(() => Math.random() - .5).slice(0, 3).map(item => item.en_us)].sort(() => Math.random() - .5)
    : [];
  quiz.value = { action, word, type, indices, options, title: actionMessage(action),
    masked: [...english].map((letter, index) => indices.includes(index) ? '＿' : letter).join(''),
    target: type === 'fill' ? indices.map(index => english[index]).join('').toLowerCase() : english.toLowerCase() };
  answer.value = '';
}

async function executeAction(action) {
  if (action.type === 'battleStart') {
    await startBattle();
    return battle.value?.message || '戰鬥開始';
  }
  if (action.type === 'frontierRent') {
    const { data, error } = await db.rpc('isekai_frontier_rent', {
      p_actor_id: studentId.value, p_area_id: frontierArea.value.id, p_plot_index: selectedFrontier.value
    });
    if (error) throw error;
    await loadFarm();
    await loadFrontiers();
    return data?.message || '邊境田地已租用';
  }
  if (action.type === 'peerLoan') {
    const { data, error } = await db.rpc('isekai_farm_loan_action', {
      p_actor_id: studentId.value, p_action: action.command, p_loan_id: action.loanId || null,
      p_target_id: action.targetId || null, p_amount: action.amount || null, p_area_id: action.areaId || null
    });
    if (error) throw error;
    await loadFarm();
    await loadPeerLoans();
    return data?.detail || '同學借款操作完成';
  }
  if (action.type === 'peerVisit') {
    const { data, error } = await db.rpc('isekai_farm_visit', { p_actor_id: studentId.value,
      p_target_id: action.targetId, p_action: action.command, p_crop_id: action.cropId || null });
    if (error) throw error;
    peerVisitPreview.value = { targetId: action.targetId, areaId: data?.target_area,
      harvested: data?.target_harvested, produce: data?.target_produce || {} };
    if (action.command === 'gather') { await loadFarm(); ledgerOpen.value = true; }
    await loadPeerVisits();
    return data?.detail || '已拜訪同學農莊';
  }
  let frontierClaimedAt = '';
  if (action.plotKind === 'frontier') {
    const { data, error } = await db.from('isekai_frontier_claims').select('owner_id,lease_holder_id,lease_expires_at,captured_at')
      .eq('class_name', student.value.class).eq('area_id', action.areaId).eq('plot_index', action.plotIndex).maybeSingle();
    if (error) throw error;
    if (data?.owner_id !== studentId.value && !(data?.lease_holder_id === studentId.value && new Date(data.lease_expires_at).getTime() > Date.now())) {
      await loadFrontiers();
      throw new Error('此田地的佔領或租期已變更，請重新選擇。');
    }
    frontierClaimedAt = data.captured_at;
  }
  const plotAction = action.plotKind === 'frontier' ? { ...action, frontierAccess: true, frontierClaimedAt } : action;
  const harvestedCropId = action.type === 'harvest' ? (action.plotKind === 'frontier'
    ? farm.value.frontierPlots?.[action.areaId]?.[action.plotIndex]?.[action.frontierFieldIndex]
    : farm.value.plots?.[action.areaId || activeArea.value.id]?.[action.plotIndex])?.cropId : null;
  const harvestClaim = action.type === 'harvest' && action.plotKind !== 'frontier' && frontierAt(action.plotIndex)?.owner_id === studentId.value;
  const result = peopleActionTypes.has(action.type)
    ? applyPeopleAction(farm.value, action, Date.now())
    : expansionActionTypes.has(action.type) ? applyExpansionAction(farm.value, action, Date.now())
    : applyIsekaiAction(farm.value, action.plotKind === 'frontier' ? plotAction
      : harvestClaim ? { ...action, frontierBonus: true } : action, Date.now());
  const coinDelta = result.farm.coins - farm.value.coins;
  if (!expansionActionTypes.has(action.type) && coinDelta && action.type !== 'reincarnate') {
    result.farm.expansion = { ...result.farm.expansion, accounts: [{ at: Date.now(), category: action.type,
      income: Math.max(0, coinDelta), expense: Math.max(0, -coinDelta), detail: result.detail }, ...(result.farm.expansion?.accounts || [])].slice(0, 50) };
  }
  await saveFarm(result.farm);
  if (harvestedCropId) { selectedCropId.value = harvestedCropId; ledgerOpen.value = true; }
  if (action.type === 'collect') ledgerOpen.value = true;
  if (action.type === 'reincarnate') {
    selectedPlot.value = 0; selectedFrontier.value = 0; selectedFrontierField.value = 0; selectedFrontierAreaId.value = 'fittoa'; selectedCropId.value = 'wheat'; mapMode.value = 'large'; staffActiveMs.value = 0;
    if (student.value?.class && !student.value?.isAnon) {
      const { error } = await db.rpc('isekai_frontier_relinquish', { p_actor_id: studentId.value });
      if (error) return `${result.detail}；邊境歸屬尚未清除：${error.message}`;
      await loadFrontiers();
    }
  }
  if (action.type === 'unlock') {
    selectedPlot.value = 0;
    selectedCropId.value = ISEKAI_CROPS.find(crop => crop.region === farm.value.selectedRegion)?.id || 'wheat';
    mapMode.value = 'middle';
  }
  if (action.type === 'unlockArea') { selectedPlot.value = 0; mapMode.value = 'small'; }
  if (action.type === 'build') operationTab.value = action.buildingId === 'stable' ? 'animals' : buildingById(action.buildingId)?.category ? 'town' : 'buildings';
  if (action.type === 'adopt') operationTab.value = 'animals';
  if (action.type === 'demolish') operationTab.value = 'crops';
  return result.detail;
}

async function performWithoutQuiz(action) {
  if (busy.value || quiz.value) return;
  busy.value = true;
  try { notice.value = `${await executeAction(action)}。下次單字題約 ${quizWaitSeconds.value} 秒後出現。`; now.value = Date.now(); }
  catch (error) { notice.value = `操作未完成：${error.message}`; }
  finally { busy.value = false; }
}

async function loadFarm() {
  const { data, error } = await db.from('isekai_farm_states').select('farm,revision').eq('student_id', studentId.value).maybeSingle();
  if (error) throw error;
  if (data) { farm.value = normalizeIsekaiExpansion(normalizeIsekaiPeople(normalizeIsekaiFarm(data.farm))); revision.value = data.revision; return; }
  const { data: created, error: createError } = await db.from('isekai_farm_states')
    .insert({ student_id: studentId.value, farm: freshIsekaiFarm() }).select('farm,revision').single();
  if (createError?.code === '23505') return loadFarm();
  if (createError) throw createError;
  farm.value = normalizeIsekaiExpansion(normalizeIsekaiPeople(normalizeIsekaiFarm(created.farm)));
  revision.value = created.revision;
}

async function saveFarm(next) {
  next = normalizeIsekaiExpansion(normalizeIsekaiPeople(next));
  const { data, error } = await db.from('isekai_farm_states')
    .update({ farm: next, revision: revision.value + 1, updated_at: new Date().toISOString() })
    .eq('student_id', studentId.value).eq('revision', revision.value).select('revision').maybeSingle();
  if (error) throw error;
  if (!data) { await loadFarm(); throw new Error('另一個分頁已更新農莊，請重新操作。'); }
  farm.value = next;
  revision.value = data.revision;
}

function rememberSession() {
  try { sessionStorage.setItem(sessionKey.value, JSON.stringify(session.value)); }
  catch { saveNotice.value = '本機暫存不可用；請保持頁面開啟直到成績同步。'; }
}

async function syncRecord() {
  const entry = session.value;
  if (!entry || !(entry.correct.length + entry.wrong.length)) return;
  const { error } = await db.from('game_records').upsert([{
    id: entry.id, student_id: studentId.value, game_type: ISEKAI_GAME_TYPE,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: entry.correct.length * 10, mistakes: entry.wrong.length,
    correct_words: entry.correct.join(', '), wrong_words: entry.wrong.join(', '),
    attempt_number: entry.attemptNumber, played_at: new Date(entry.startedAt).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - entry.startedAt) / 1000),
    device_info: navigator.userAgent
  }], { onConflict: 'id' });
  saveNotice.value = error ? `成績尚未同步：${error.message}。請按「重試同步」。` : '農莊進度與本次答題成績已同步。';
}

async function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey.value) || 'null');
    if (saved?.id && Array.isArray(saved.correct) && Array.isArray(saved.wrong) && Number.isFinite(saved.startedAt)) session.value = saved;
  } catch { /* Start a new record if browser storage is unavailable. */ }
  if (!session.value) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId.value).eq('game_type', ISEKAI_GAME_TYPE)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    session.value = { id: crypto.randomUUID(), startedAt: Date.now(), correct: [], wrong: [], attemptNumber: (count || 0) + 1 };
    rememberSession();
  } else await syncRecord();
}

async function submitAnswer() {
  if (!quiz.value || busy.value || !answer.value.trim()) return;
  busy.value = true;
  const question = quiz.value;
  const correct = answer.value.trim().toLowerCase() === question.target;
  try {
    let detail = '';
    if (correct) {
      detail = await executeAction(question.action);
      session.value.correct.push(question.word.en_us);
    } else session.value.wrong.push(question.word.en_us);
    rememberSession();
    await syncRecord();
    scheduleNextQuiz();
    notice.value = correct ? `答對 ${question.word.en_us}！${detail}。下一題約 30–40 秒後。` : `答錯了：${question.word.en_us}＝${question.word.zh_tw}。這次未執行操作；下一題約 30–40 秒後。`;
    quiz.value = null;
    now.value = Date.now();
  } catch (error) {
    notice.value = `操作未完成：${error.message}`;
  } finally { busy.value = false; }
}

async function leaveFarm() {
  if (busy.value || quiz.value) return;
  busy.value = true;
  try {
    await syncRecord();
    if (saveNotice.value.startsWith('成績尚未同步')) return;
    try { sessionStorage.removeItem(sessionKey.value); sessionStorage.removeItem(quizClockKey.value); } catch { /* Browser storage may be unavailable. */ }
    await navigateTo('/');
  } finally { busy.value = false; }
}

function remaining(plot) {
  const seconds = Math.ceil(Math.max(0, plot.readyAt - now.value) / 1000);
  if (seconds <= 0) return '可以收成';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

async function loadFrontiers() {
  if (!student.value?.class || student.value?.isAnon) return;
  let [claims, peers] = await Promise.all([
    db.from('isekai_frontier_claims').select('area_id,plot_index,owner_id,lease_holder_id,lease_expires_at,captured_at').eq('class_name', student.value.class).limit(1000),
    db.from('students').select('student_id,hidden_name').eq('class_name', student.value.class).limit(100)
  ]);
  frontierLeaseReady.value = !claims.error;
  if (claims.error?.code === '42703') claims = await db.from('isekai_frontier_claims')
    .select('area_id,plot_index,owner_id,captured_at').eq('class_name', student.value.class).limit(1000);
  if (claims.error) { frontierReady.value = false; lastFrontierRefresh = Date.now(); notice.value = '邊境農地尚未啟用：請先執行新版邊境土地 SQL。'; return; }
  frontierReady.value = true;
  frontiers.value = claims.data || [];
  for (const claim of frontiers.value) {
    const fields = farm.value.frontierPlots?.[claim.area_id]?.[claim.plot_index] || [];
    fields.forEach((plot, index) => { if (plot && plot.accessAt !== claim.captured_at) fields[index] = null; });
  }
  classmates.value = peers.data || [];
  lastFrontierRefresh = Date.now();
}

async function loadPeerLoans() {
  if (!student.value?.class || student.value?.isAnon) return;
  const [{ data, error }, peers] = await Promise.all([
    db.rpc('isekai_farm_loan_list', { p_student_id: studentId.value }),
    db.from('students').select('student_id,hidden_name').eq('class_name', student.value.class).limit(100)
  ]);
  peerLoanReady.value = !error;
  if (!error) peerLoans.value = Array.isArray(data) ? data : [];
  if (!peers.error) classmates.value = peers.data || [];
}

async function loadPeerVisits() {
  if (!student.value?.class || student.value?.isAnon) return;
  const { data, error } = await db.rpc('isekai_farm_visit_list', { p_student_id: studentId.value });
  peerVisitReady.value = !error;
  if (!error) peerVisits.value = Array.isArray(data) ? data : [];
}

async function checkIsekaiAccess() {
  if (!student.value?.class || checkingAccess) return true;
  checkingAccess = true;
  try {
    const { data, error } = await db.from('isekai_farm_lesson_access').select('mode,units')
      .eq('class_name', student.value.class).maybeSingle();
    if (error && !farmPolicyTableMissing(error)) throw error;
    accessAllowed.value = farmLessonAllowed(data, lesson);
    lastAccessCheckAt = Date.now();
    if (!accessAllowed.value) { quiz.value = null; notice.value = '導師目前沒有開放這個單元的異世界農莊。請返回首頁選擇其他單元。'; }
    return accessAllowed.value;
  } catch (error) { accessAllowed.value = false; lastAccessCheckAt = Date.now(); notice.value = `農莊單元權限無法確認：${error.message}`; return false; }
  finally { checkingAccess = false; }
}

async function startBattle() {
  const { data, error } = await db.rpc('isekai_frontier_battle', {
    p_actor_id: studentId.value, p_area_id: frontierArea.value.id, p_plot_index: selectedFrontier.value, p_command: 'start'
  });
  if (error) throw error;
  battle.value = { ...data, areaId: frontierArea.value.id, plotIndex: selectedFrontier.value, log: [data.message] };
}

async function battleCommand(command) {
  if (!battle.value || busy.value || battle.value.status !== 'active') return;
  busy.value = true;
  try {
    const { data, error } = await db.rpc('isekai_frontier_battle', {
      p_actor_id: studentId.value, p_area_id: battle.value.areaId, p_plot_index: battle.value.plotIndex, p_command: command
    });
    if (error) throw error;
    battle.value = { ...battle.value, ...data, log: [data.message, ...battle.value.log].slice(0, 12) };
    if (data.status !== 'active') { await loadFrontiers(); notice.value = data.message; }
  } catch (error) { notice.value = `戰鬥中斷：${error.message}`; battle.value = null; }
  finally { busy.value = false; }
}

async function tickStaff() {
  if (staffTickBusy || !accessAllowed.value || loading.value || busy.value || quiz.value || battle.value || !farm.value.profile || !staffAvailable.value) return;
  const current = Date.now();
  if (!lastActiveTick) { lastActiveTick = current; return; }
  const delta = Math.min(2000, Math.max(0, current - lastActiveTick));
  lastActiveTick = current;
  if (farm.value.staffRestUntil > current) return;
  if (document.visibilityState !== 'visible' || !document.hasFocus() || current - lastInteractionAt > 60000) return;
  if (farm.value.staffRestUntil && farm.value.staffRestUntil <= current) {
    staffTickBusy = true; busy.value = true;
    try {
      await saveFarm({ ...farm.value, staffRestUntil: 0, staffHistory: [{ at: current, details: ['休息結束，自動開始新一輪值班'] }, ...farm.value.staffHistory].slice(0, 16) });
      notice.value = '人力休息結束，已自動開始新一輪值班。';
    } catch (error) { notice.value = `值班恢復失敗：${error.message}`; }
    finally { busy.value = false; staffTickBusy = false; }
    return;
  }
  staffActiveMs.value = Math.min(ISEKAI_SHIFT_MS, staffActiveMs.value + delta);
  const due = !farm.value.staffLastWorkMs || staffActiveMs.value - farm.value.staffLastWorkMs >= ISEKAI_WORK_INTERVAL_MS;
  if (!due && staffActiveMs.value < ISEKAI_SHIFT_MS) return;
  staffTickBusy = true;
  busy.value = true;
  try {
    if (due || current - lastFrontierRefresh > 5 * 60000) await loadFrontiers();
    let next = normalizeIsekaiPeople(farm.value);
    let details = [];
    if (due) { const worked = runIsekaiStaff(next, current, frontiers.value.filter(item => item.owner_id === studentId.value
      || (item.lease_holder_id === studentId.value && new Date(item.lease_expires_at).getTime() > current))); next = worked.farm; details = worked.details; next.staffLastWorkMs = Math.max(1, staffActiveMs.value); }
    if (staffActiveMs.value >= ISEKAI_SHIFT_MS) {
      next.staffActiveMs = 0; next.staffLastWorkMs = 0; next.staffRestUntil = current + ISEKAI_REST_MS;
      next.staffHistory.unshift({ at: current, details: ['本輪值班滿 45 分鐘，開始休息 15 分鐘'] }); next.staffHistory = next.staffHistory.slice(0, 16);
      staffActiveMs.value = 0;
    } else next.staffActiveMs = staffActiveMs.value;
    await saveFarm(next);
    notice.value = details.length ? `自動值班：${details.join('；')}` : '人力休息中；休息結束後自動恢復值班。';
  } catch (error) { notice.value = `自動值班未完成：${error.message}`; staffActiveMs.value = farm.value.staffActiveMs || 0; }
  finally { busy.value = false; staffTickBusy = false; }
}

async function tickWorld() {
  if (!accessAllowed.value || loading.value || busy.value || quiz.value || battle.value || !farm.value.profile) return;
  const overdueLoan = peerLoans.value.find(item => item.status === 'active' && item.due_at && Date.parse(item.due_at) <= Date.now());
  if (overdueLoan && peerLoanReady.value && Date.now() - lastPeerLoanAttempt > 60000) {
    lastPeerLoanAttempt = Date.now();
    busy.value = true;
    try {
      const { data, error } = await db.rpc('isekai_farm_loan_action', { p_actor_id: studentId.value,
        p_action: 'foreclose', p_loan_id: overdueLoan.id, p_target_id: null, p_amount: null, p_area_id: null });
      if (error) throw error;
      await loadFarm(); await loadPeerLoans();
      notice.value = data?.detail || '同學借款已到期結算。';
    } catch (error) { notice.value = `借款到期結算失敗：${error.message}`; }
    finally { busy.value = false; }
    return;
  }
  const progressed = advanceIsekaiWorld(farm.value, Date.now());
  if (!progressed.changed) return;
  busy.value = true;
  try {
    await saveFarm(progressed.farm);
    if (progressed.details.length) notice.value = `大陸動態：${progressed.details.slice(-3).join('；')}`;
  } catch (error) { notice.value = `大陸動態尚未儲存：${error.message}`; }
  finally { busy.value = false; }
}

onMounted(async () => {
  lastInteractionAt = Date.now();
  const rememberInteraction = () => { lastInteractionAt = Date.now(); };
  window.addEventListener('pointerdown', rememberInteraction);
  window.addEventListener('keydown', rememberInteraction);
  window.addEventListener('touchstart', rememberInteraction);
  // Keep the callback so it can be removed when leaving this page.
  interactionCleanup = () => { window.removeEventListener('pointerdown', rememberInteraction); window.removeEventListener('keydown', rememberInteraction); window.removeEventListener('touchstart', rememberInteraction); };
  clock = window.setInterval(() => { now.value = Date.now(); if (Date.now() - lastAccessCheckAt > 60000) void checkIsekaiAccess(); void tickWorld(); void tickStaff(); }, 1000);
  if (!studentId.value) { notice.value = '請先從首頁登入學生帳號。'; loading.value = false; return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) { notice.value = '請從首頁選擇版本、冊數與單元。'; loading.value = false; return; }
  try {
    if (!await checkIsekaiAccess()) return;
    const { data, error } = await db.from('vocabularies').select('id,en_us,zh_tw')
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
    if (error) throw error;
    words.value = (data || []).filter(word => String(word.en_us || '').trim() && String(word.zh_tw || '').trim());
    if (words.value.length < 2) { notice.value = '這個單元至少需要兩筆中英對照單字。'; return; }
    await loadFarm();
    staffActiveMs.value = farm.value.staffActiveMs || 0;
    const savedArea = farm.value.selectedArea;
    changeRegion(farm.value.selectedRegion);
    if (farm.value.unlockedAreas.includes(savedArea)) farm.value.selectedArea = savedArea;
    selectedFrontierAreaId.value = farm.value.selectedArea;
    selectedFrontierCropId.value = ISEKAI_CROPS.find(crop => crop.region === activeArea.value.region)?.id || 'wheat';
    mapMode.value = 'large';
    await loadSession();
    try {
      const savedQuizAt = Number(sessionStorage.getItem(quizClockKey.value));
      if (savedQuizAt > Date.now() && savedQuizAt < Date.now() + 40000) nextQuizAt.value = savedQuizAt;
    } catch { /* An unavailable session store leaves the next question immediately due. */ }
    await loadFrontiers();
    await loadPeerLoans();
    await loadPeerVisits();
    notice.value = '你的農莊佔微地圖中間一塊地；內部六個田位可種植或建設。單字題每 30–40 秒出現一次。';
  } catch (error) { notice.value = `農莊無法載入：${error.message}。請確認已在此站 Supabase 執行異世界農莊 SQL。`; }
  finally { loading.value = false; void tickWorld(); }
});
onUnmounted(() => { if (clock) window.clearInterval(clock); interactionCleanup?.(); });
</script>

<template>
  <main class="isekai-page">
    <header class="isekai-header">
      <div><span class="eyebrow">THE CHRONICLE OF A NEW HOMESTEAD</span><h1>單字異世界悠閒農莊</h1><p>{{ lessonLabel }} · 獨立冒險存檔</p></div>
      <nav><button @click="ledgerOpen = !ledgerOpen">{{ ledgerOpen ? '關閉倉庫' : '🪙 倉庫・販賣' }}</button><NuxtLink :to="{ path: '/history', query: { game: ISEKAI_GAME_TYPE } }">學習紀錄</NuxtLink><NuxtLink :to="{ path: '/leaderboard', query: { game: ISEKAI_GAME_TYPE, ...lesson } }">英雄榜</NuxtLink><button @click="leaveFarm" :disabled="busy || !!quiz">返回遊戲選單</button></nav>
    </header>
    <div class="notice" role="status">{{ notice }} <button v-if="saveNotice.startsWith('成績尚未同步')" @click="syncRecord">重試同步</button></div>
    <div class="isekai-layout">
      <section class="atlas panel" :class="{ 'atlas-overlay': atlasOpen }" aria-label="異世界地圖">
        <div class="section-heading"><span>01 · 大陸圖誌</span><strong>{{ mapCaption }}</strong></div>
        <div class="map-toolbar" aria-label="地圖比例尺">
          <button :class="{ chosen: mapMode === 'world' }" @click="openWorldMap">超大地圖 · 世界</button>
          <button :class="{ chosen: mapMode === 'worldExact' }" @click="openExactWorldMap">超大地圖 · 原圖海岸線</button>
          <button :class="{ chosen: mapMode === 'large' }" @click="mapMode = 'large'">大地圖 · 全大陸</button>
          <button :class="{ chosen: mapMode === 'middle' }" @click="mapMode = 'middle'">中地圖 · {{ activeRegion.name.replace('中央大陸', '') }}</button>
          <button :class="{ chosen: mapMode === 'small' }" @click="mapMode = 'small'">小地圖 · {{ activeArea.name }}</button>
          <button :class="{ chosen: mapMode === 'micro' }" @click="mapMode = 'micro'">微地圖 · 農莊</button>
          <button class="atlas-expand" @click="atlasOpen = !atlasOpen">{{ atlasOpen ? '收起地圖' : '展開地圖' }}</button>
        </div>
        <div class="map-frame" :class="`map-${mapMode}`">
          <svg v-if="mapMode === 'world'" viewBox="0 0 1200 800" role="group" aria-label="六面世界五大陸與主要國家、城市、迷宮位置">
            <image href="/maps/six-faced-world.svg" x="0" y="0" width="1200" height="800" />
            <g class="world-central-link" role="button" tabindex="0" aria-label="放大中央大陸" @click="mapMode = 'large'" @keydown.enter="mapMode = 'large'">
              <rect x="82" y="153" width="540" height="475" fill="transparent" /><text x="287" y="355" text-anchor="middle">點選中央大陸放大 ↗</text>
            </g>
          </svg>
          <img v-else-if="mapMode === 'worldExact'" class="original-world-map" src="https://www.baka-tsuki.org/project/images/3/39/World_Map_3.png" alt="原作網路小說世界地圖第 3 版，顯示各大陸的原圖海岸線" loading="lazy" />
          <svg v-else-if="mapMode === 'large'" :viewBox="mapViewBox" preserveAspectRatio="xMidYMid meet" role="group" aria-label="中央大陸全貌；可選擇區域">
            <image href="/maps/central-continent.svg" x="0" y="0" width="800" height="900" />
            <g v-for="region in ISEKAI_REGIONS" :key="region.id" class="atlas-point" :class="{ locked: !farm.unlockedRegions.includes(region.id), current: activeRegion.id === region.id }" role="button" tabindex="0" :aria-label="region.name" @click="changeRegion(region.id)" @keydown.enter="changeRegion(region.id)">
              <circle :cx="region.x" :cy="region.y" r="19" /><text :x="region.x" :y="region.y + 7" text-anchor="middle" font-size="22">{{ farm.unlockedRegions.includes(region.id) ? '✧' : '◆' }}</text><text class="atlas-label" :x="region.x" :y="region.y + 40" text-anchor="middle" font-size="19">{{ region.name.replace('中央大陸', '') }}</text>
            </g>
          </svg>
          <svg v-else-if="mapMode === 'middle'" viewBox="0 0 600 420" role="group" :aria-label="`${activeRegion.name}的四塊領地；可選擇或開拓`">
            <rect width="600" height="420" fill="#203a3a" />
            <path d="M15 55 Q180 8 340 32 T590 72 M8 360 Q150 395 300 380 T590 350" fill="none" stroke="#dec58b" stroke-width="5" opacity=".35" />
            <g v-for="(area, index) in regionAreas" :key="area.id" class="territory-shape" :class="{ chosen: activeArea.id === area.id, locked: !farm.unlockedAreas.includes(area.id) }" role="button" tabindex="0" :aria-label="`${area.name}${farm.unlockedAreas.includes(area.id) ? '已開拓' : '尚未開拓'}`" @click="openTerritory(area)" @keydown.enter="openTerritory(area)">
              <path :d="TERRITORY_SHAPES[index].path" :fill="MAP_TINTS[activeRegion.id][index]" />
              <text :x="TERRITORY_SHAPES[index].x" :y="TERRITORY_SHAPES[index].y - 6" text-anchor="middle" font-size="28">{{ farm.unlockedAreas.includes(area.id) ? ['🌾','🌲','🏞️','⛰️'][index] : '🔒' }}</text>
              <text class="shape-label" :x="TERRITORY_SHAPES[index].x" :y="TERRITORY_SHAPES[index].y + 22" text-anchor="middle">{{ area.name }}</text>
            </g>
          </svg>
          <svg v-else-if="mapMode === 'small'" viewBox="0 0 600 420" role="group" :aria-label="`${activeArea.name}領地詳圖，有三處地方地標，農莊位於其中`">
            <rect width="600" height="420" fill="#1c3740" />
            <path d="M22 69 Q118 14 243 37 L335 18 Q490 28 573 92 L580 284 Q533 388 390 402 L206 386 Q70 405 19 306Z" :fill="MAP_TINTS[activeRegion.id][regionAreas.findIndex(area => area.id === activeArea.id)] || '#829869'" stroke="#e8d4a1" stroke-width="7" />
            <path d="M30 318 Q140 258 220 281 T393 193 T570 113" fill="none" stroke="#8dbbc2" stroke-width="17" opacity=".85" />
            <path d="M83 109 Q182 138 270 200 T510 319" fill="none" stroke="#d5bb83" stroke-width="8" stroke-dasharray="19 10" />
            <g class="local-landmark"><circle cx="136" cy="112" r="9"/><text x="151" y="105">{{ localLandmarks[0] }}</text></g>
            <g class="local-landmark"><circle cx="425" cy="105" r="9"/><text x="440" y="99">{{ localLandmarks[1] }}</text></g>
            <g class="local-landmark"><circle cx="430" cy="335" r="9"/><text x="445" y="329">{{ localLandmarks[2] }}</text></g>
            <g class="local-farm" role="button" tabindex="0" aria-label="放大我的農莊與邊境" @click="mapMode = 'micro'" @keydown.enter="mapMode = 'micro'"><circle cx="300" cy="227" r="35"/><text x="300" y="237" text-anchor="middle" font-size="30">🏡</text><text x="300" y="283" text-anchor="middle">我的農莊 · 點選放大</text></g>
            <text class="local-title" x="300" y="40" text-anchor="middle">{{ activeArea.name }} · 領地詳圖</text>
          </svg>
          <svg v-else viewBox="0 0 600 420" role="group" :aria-label="`${activeArea.name}的一塊私人農莊及六塊邊境地`">
            <rect width="600" height="420" fill="#253c3e" />
            <g v-for="(shape, index) in FIELD_SHAPES" :key="index" class="field-shape" :class="{ chosen: operationTab === 'war' && selectedFrontier === index }" role="button" tabindex="0" :aria-label="`邊境 ${index + 1}；${frontierAt(index)?.owner_id === studentId ? '我方' : frontierAt(index)?.owner_id ? '同學' : '系統'}`" @click="selectFrontier(index)" @keydown.enter="selectFrontier(index)">
              <path :d="shape.path" :fill="frontierAt(index)?.owner_id === studentId ? '#517968' : frontierAt(index)?.lease_holder_id === studentId && new Date(frontierAt(index)?.lease_expires_at).getTime() > now ? '#5d88a0' : frontierAt(index)?.owner_id ? '#925e58' : MAP_TINTS[activeRegion.id][index % 4]" />
              <text class="shape-label" :x="shape.x" :y="shape.y" text-anchor="middle">{{ frontierAt(index)?.owner_id === studentId ? '🌾' : frontierAt(index)?.lease_holder_id === studentId && new Date(frontierAt(index)?.lease_expires_at).getTime() > now ? '🪙' : frontierAt(index)?.owner_id ? '⚔' : '◇' }} 邊境 {{ index + 1 }}</text>
            </g>
            <g class="field-shape home-shape" role="button" tabindex="0" aria-label="我的一塊農莊；點選經營" @click="operationTab = 'crops'" @keydown.enter="operationTab = 'crops'">
              <path :d="HOMESTEAD_SHAPE.path" fill="#376a61" />
              <text :x="HOMESTEAD_SHAPE.x" :y="HOMESTEAD_SHAPE.y - 15" text-anchor="middle" font-size="37">🏡</text>
              <text class="shape-label" :x="HOMESTEAD_SHAPE.x" :y="HOMESTEAD_SHAPE.y + 18" text-anchor="middle">我的農莊</text>
              <text class="shape-owner" :x="HOMESTEAD_SHAPE.x" :y="HOMESTEAD_SHAPE.y + 42" text-anchor="middle">內含 6 個田位</text>
            </g>
          </svg>
        </div>
        <p class="map-note" v-if="mapMode === 'worldExact'">顯示原作網路小說地圖第 3 版的原圖海岸線。<a href="https://www.baka-tsuki.org/project/index.php?title=File%3AWorld_Map_3.png" target="_blank" rel="noopener noreferrer">查看圖片來源與原圖</a>。遊戲領地位置仍是自創設定。</p>
        <p class="map-note" v-else>{{ mapMode === 'world' ? '五大陸示意圖；點選中央大陸放大。' : mapMode === 'large' ? '中央大陸全貌；選一區放大。' : mapMode === 'middle' ? '本區四塊領地總覽；點選一塊查看詳圖。' : mapMode === 'small' ? '只顯示所選的一塊領地；地標為遊戲設計。點選農莊進入微地圖。' : '私人農莊與六塊邊境地。' }} 農莊經營目前限中央大陸。</p>
        <button class="atlas-list-toggle" @click="atlasListsOpen = !atlasListsOpen">{{ atlasListsOpen ? '收起區域與領地清單' : '▾ 選擇其他區域與領地' }}</button>
        <div v-if="atlasListsOpen" class="atlas-lists">
        <div class="region-list">
          <div v-for="region in ISEKAI_REGIONS" :key="region.id" class="region-row" :class="{ selected: activeRegion.id === region.id }">
            <button v-if="farm.unlockedRegions.includes(region.id)" @click="changeRegion(region.id)"><b>{{ region.name }}</b><small>{{ region.subtitle }}</small></button>
            <div v-else><b>{{ region.name }}</b><small>收成 3 次後可解鎖 · {{ adjustedRegionCost(farm, region) }} 金幣</small></div>
            <button v-if="!farm.unlockedRegions.includes(region.id)" class="unlock" :disabled="!can({ type: 'unlock', regionId: region.id })" @click="askAction({ type: 'unlock', regionId: region.id })">開拓</button>
          </div>
        </div>
        <div class="area-list"><h3>{{ activeRegion.name }}的領地 · {{ regionAreas.filter(area => farm.unlockedAreas.includes(area.id)).length }}/{{ regionAreas.length }}</h3>
          <div v-for="area in regionAreas" :key="area.id" class="area-row" :class="{ selected: activeArea.id === area.id }">
            <button v-if="farm.unlockedAreas.includes(area.id)" @click="changeArea(area.id)"><b>{{ area.name }}</b><small>{{ area.description }}</small></button>
            <div v-else><b>{{ area.name }}</b><small>開拓費 {{ adjustedAreaCost(farm, area) }} 金幣</small></div>
            <button v-if="!farm.unlockedAreas.includes(area.id)" class="unlock" :disabled="!can({ type: 'unlockArea', areaId: area.id })" @click="askAction({ type: 'unlockArea', areaId: area.id })">購地</button>
          </div>
        </div>
        </div>
      </section>

      <section class="homestead panel" aria-label="農莊">
        <div class="section-heading"><span>02 · 領地經營</span><strong>{{ activeArea.name }}</strong></div>
        <p class="region-description">{{ activeArea.description }} · {{ climate.seasonName }}季／{{ climate.weather }} · {{ farm.profile ? `${raceById(farm.profile.raceId)?.name}／${professionById(farm.profile.professionId)?.name}` : '請先建立角色' }}</p>
        <div class="resource-bar"><span>◈ 金幣 <b>{{ farm.coins }}</b></span><span>✧ 聲望 <b>{{ farm.renown }}</b></span><span>收成 <b>{{ farm.harvested }}</b> 次</span><span>單字 <b>{{ currentScore }}</b> 分</span></div><button class="sell-entry" @click="ledgerOpen = true">🪙 販賣收成的作物與動物產物 · 庫存 {{ totalProduce }} 份</button>
        <div class="field-scene"><div class="horizon"><span class="sun">✺</span><span class="hills hill-back"></span><span class="hills hill-front"></span></div>
          <div class="field-grid">
            <button v-for="(plot, index) in plots" :key="index" class="field-tile" :class="{ selected: selectedPlot === index, grown: plot && plot.cropId && now >= plot.readyAt, facility: plot?.facility }" @click="selectPlot(index)">
              <span class="tile-index">田地 {{ index + 1 }}</span><span v-if="plot?.cropId" class="crop-glyph" :style="{ color: cropById(plot.cropId)?.color }">{{ cropById(plot.cropId)?.symbol }}</span><span v-else-if="plot?.animalId" class="crop-glyph">{{ animalById(plot.animalId)?.mark }}</span><span v-else-if="plot?.facility" class="crop-glyph">{{ buildingById(plot.facility)?.mark }}</span><span v-else class="empty-glyph">🌱</span>
              <strong>{{ plot?.cropId ? cropById(plot.cropId)?.name : plot?.facility ? buildingById(plot.facility)?.name : '尚未使用' }}</strong><small>{{ plot?.cropId ? remaining(plot) : plot?.facility === 'stable' ? plot.animalId ? `${animalById(plot.animalId)?.name} · ${plot.readyAt ? remaining(plot) : '待照顧'}` : '空畜舍' : plot?.facility ? buildingById(plot.facility)?.description : farm.staffReservedPlots.includes(`${activeArea.id}:${index}`) ? '手動保留 · 不自動播種' : '允許人力自動播種' }}</small>
            </button>
          </div>
        </div>
        <p class="field-caption">我的農莊是一塊微地圖土地；下方六格是農莊內部田位。{{ quizWaitSeconds ? `下一題約 ${quizWaitSeconds} 秒後` : '下一次操作會出單字題' }}。</p>
        <div class="workbench">
          <div class="work-title"><strong>第 {{ selectedPlot + 1 }} 塊田</strong><span>{{ selectedSite?.cropId ? cropById(selectedSite.cropId)?.name : selectedSite?.facility ? buildingById(selectedSite.facility)?.name : '空地' }}</span></div>
          <div class="operation-tabs"><button :class="{ chosen: operationTab === 'crops' }" @click="operationTab = 'crops'">🌾 種植</button><button :class="{ chosen: operationTab === 'buildings' }" @click="operationTab = 'buildings'">🏗️ 建設</button><button :class="{ chosen: operationTab === 'animals' }" @click="operationTab = 'animals'">🐾 飼育</button><button :class="{ chosen: operationTab === 'staff' }" @click="operationTab = 'staff'">👥 人力</button><button :class="{ chosen: operationTab === 'family' }" @click="operationTab = 'family'">💞 家庭</button><button :class="{ chosen: operationTab === 'war' }" @click="operationTab = 'war'">⚔️ 邊境戰</button><button :class="{ chosen: operationTab === 'town' }" @click="operationTab = 'town'">🏰 城鎮</button></div>
          <template v-if="operationTab === 'crops'"><div class="crop-picker"><button v-for="crop in regionCrops" :key="crop.id" :class="{ chosen: selectedCropId === crop.id }" @click="selectedCropId = crop.id"><span :style="{ color: crop.color }">{{ crop.symbol }}</span> {{ crop.name }} <small>種苗 {{ farm.seeds[crop.id] || 0 }} · {{ crop.seasons.includes(climate.season) ? '適合當季' : '非當季' }}</small></button></div>
          <div class="action-grid">
            <label class="seed-quantity">購買數量<input v-model.number="seedQuantity" type="number" min="1" max="50" step="1" inputmode="numeric" /></label><button :disabled="!can({ type: 'buy', regionId: activeRegion.id, areaId: activeArea.id, cropId: selectedCropId, quantity: seedQuantity })" @click="askAction({ type: 'buy', regionId: activeRegion.id, areaId: activeArea.id, cropId: selectedCropId, quantity: seedQuantity })">購買種苗 <small>合計 {{ cropById(selectedCropId) ? adjustedSeedPrice(farm, cropById(selectedCropId)) * (Number(seedQuantity) || 0) : 0 }} 金幣</small></button>
            <button :disabled="!can({ type: 'plant', regionId: activeRegion.id, plotIndex: selectedPlot, cropId: selectedCropId })" @click="askAction({ type: 'plant', regionId: activeRegion.id, plotIndex: selectedPlot, cropId: selectedCropId })">播種</button>
            <button :disabled="!can({ type: 'water', regionId: activeRegion.id, plotIndex: selectedPlot })" @click="askAction({ type: 'water', regionId: activeRegion.id, plotIndex: selectedPlot })">澆水・催生</button>
            <button :disabled="!can({ type: 'harvest', regionId: activeRegion.id, plotIndex: selectedPlot })" @click="askAction({ type: 'harvest', regionId: activeRegion.id, plotIndex: selectedPlot })">收成</button><button :disabled="!can({ type: 'sell', cropId: selectedCropId })" @click="askAction({ type: 'sell', cropId: selectedCropId })">賣出{{ cropById(selectedCropId)?.name }} <small>庫存 {{ farm.produce[selectedCropId] || 0 }} 份</small></button>
          </div></template>
          <template v-else-if="operationTab === 'buildings'"><div class="crop-picker"><button v-for="building in ISEKAI_BUILDINGS.filter(item => !item.category)" :key="building.id" :class="{ chosen: selectedBuildingId === building.id }" @click="selectedBuildingId = building.id"><span>{{ building.mark }}</span> {{ building.name }} <small>{{ adjustedBuildingCost(farm, building) }} 金幣 · {{ building.description }}</small></button></div><div class="action-grid building-actions"><button :disabled="!can({ type: 'build', plotIndex: selectedPlot, buildingId: selectedBuildingId })" @click="askAction({ type: 'build', plotIndex: selectedPlot, buildingId: selectedBuildingId })">建造{{ buildingById(selectedBuildingId)?.name }}</button><button :disabled="!can({ type: 'demolish', plotIndex: selectedPlot })" @click="askAction({ type: 'demolish', plotIndex: selectedPlot })">拆除建築 <small>18 金幣</small></button></div></template>
          <template v-else-if="operationTab === 'animals'"><div class="animal-categories"><button v-for="category in [{ id: 'land', name: '陸地與飛禽' }, { id: 'insect', name: '昆蟲' }, { id: 'aquatic', name: '水生' }]" :key="category.id" :class="{ chosen: animalCategory === category.id }" @click="animalCategory = category.id; selectedAnimalId = ISEKAI_ANIMALS.find(animal => animal.group === category.id)?.id">{{ category.name }}</button></div><div class="crop-picker"><button v-for="animal in categoryAnimals" :key="animal.id" :class="{ chosen: selectedAnimalId === animal.id }" @click="selectedAnimalId = animal.id"><span>{{ animal.mark }}</span> {{ animal.name }} <small>{{ adjustedAnimalCost(farm, animal) }} 金幣 · {{ animal.product }}</small></button></div><div class="action-grid">
            <button :disabled="!can({ type: 'adopt', plotIndex: selectedPlot, animalId: selectedAnimalId })" @click="askAction({ type: 'adopt', plotIndex: selectedPlot, animalId: selectedAnimalId })">{{ selectedSite ? '購入動物' : '建飼育舍並購入' }} <small>合計 {{ animalPurchaseCost }} 金幣</small></button>
            <button :disabled="!can({ type: 'feed', plotIndex: selectedPlot })" @click="askAction({ type: 'feed', plotIndex: selectedPlot })">餵養照顧 <small>{{ animalById(selectedSite?.animalId) ? adjustedFeedCost(farm, animalById(selectedSite.animalId)) : 0 }} 金幣</small></button>
            <button :disabled="!can({ type: 'collect', plotIndex: selectedPlot })" @click="askAction({ type: 'collect', plotIndex: selectedPlot })">收取產物</button>
            <button :disabled="!can({ type: 'release', plotIndex: selectedPlot })" @click="askAction({ type: 'release', plotIndex: selectedPlot })">讓動物離開</button><button :disabled="!can({ type: 'sellAnimal', animalId: selectedAnimalId })" @click="askAction({ type: 'sellAnimal', animalId: selectedAnimalId })">販賣{{ selectedAnimal?.product }} <small>庫存 {{ farm.animalGoods[selectedAnimalId] || 0 }} 份</small></button>
          </div><small class="animal-hint">{{ isekaiActionError(farm, { type: 'adopt', plotIndex: selectedPlot, animalId: selectedAnimalId }, now) || '空地可直接建飼育舍並購入；已有空舍只需付動物費。' }}</small></template>
          <template v-else-if="operationTab === 'staff'"><div class="person-tabs"><button :class="{ chosen: staffView === 'market' }" @click="staffView = 'market'">招募市場</button><button :class="{ chosen: staffView === 'roster' }" @click="staffView = 'roster'">值班與任務</button><button :class="{ chosen: staffView === 'history' }" @click="staffView = 'history'">工作紀錄</button></div>
            <p class="people-note">{{ staffAvailable ? farm.staffRestUntil > now ? `休息中，約 ${Math.ceil((farm.staffRestUntil - now)/60000)} 分鐘後自動恢復` : `自動值班 ${Math.floor(staffActiveMs/60000)}/45 分鐘有效遊玩時間` : '雇用人員或安排家人工作後自動值班' }}。休息 15 分鐘按實際時間計算；不需按啟動按鈕。</p>
            <div v-if="staffView === 'market'" class="people-scroll"><div class="task-toggles"><button :class="{ chosen:staffPayPeriod === 'day' }" @click="staffPayPeriod = 'day'">日薪</button><button :class="{ chosen:staffPayPeriod === 'week' }" @click="staffPayPeriod = 'week'">周薪</button></div><p class="people-note">雇用時預付所選期間薪資；期滿後有任務才自動續約扣款。休息期間不另外扣薪。</p><div class="people-grid"><article v-for="person in marketStaff" :key="person.id"><span class="person-art"><IsekaiPortrait :race-id="person.raceId" :profession-id="person.professionId" :seed="person.id" :label="person.name" /></span><b>{{ person.name }}</b><small>{{ ISEKAI_RACES.find(item => item.id === person.raceId)?.name }} · {{ ISEKAI_PROFESSIONS.find(item => item.id === person.professionId)?.name }}</small><small>擅長 {{ {crops:'農田',animals:'飼育',trade:'交易',guard:'戰鬥'}[person.focus] }} · 戰力 {{ person.power }} · 日薪 {{ isekaiStaffWage(person,'day') }}／周薪 {{ isekaiStaffWage(person,'week') }}</small><button v-if="!farm.staff.some(item => item.id === person.id)" :disabled="!can({ type:'hireStaff', personId:person.id, period:staffPayPeriod })" @click="askAction({ type:'hireStaff', personId:person.id, period:staffPayPeriod })">雇用 · 預付 {{ isekaiStaffWage(person,staffPayPeriod) }} 金幣</button><button v-else :disabled="!can({ type:'dismissStaff', personId:person.id })" @click="askAction({ type:'dismissStaff', personId:person.id })">解雇</button></article></div></div>
            <div v-else-if="staffView === 'roster'" class="people-scroll"><p v-if="!farm.staff.length">目前未雇用市場人員。</p><div v-for="contract in farm.staff" :key="contract.id" class="assignment"><span>{{ staffById(contract.id)?.mark }} {{ staffById(contract.id)?.name }} · {{ contract.period === 'week' ? '周薪' : '日薪' }} {{ isekaiStaffWage(staffById(contract.id), contract.period) }} · {{ contract.paidUntil > now ? `已付至 ${new Date(contract.paidUntil).toLocaleString('zh-TW')}` : '待有任務時續約' }}</span><button v-for="focus in ['crops','animals','trade','guard']" :key="focus" :class="{ chosen: contract.focus === focus }" @click="askAction({ type:'staffFocus', personId:contract.id, focus })">{{ { crops:'農田',animals:'飼育',trade:'交易',guard:'戰鬥' }[focus] }}</button></div><div class="task-toggles"><button v-for="task in ISEKAI_TASKS" :key="task.id" :class="{ chosen: farm.staffTasks[task.id] }" @click="askAction({ type:'staffTask', taskId:task.id, enabled:!farm.staffTasks[task.id] })">{{ farm.staffTasks[task.id] ? '☑' : '□' }} {{ task.label }}</button></div><p class="people-note">勾選要自動種植的作物；人力會在每次巡查填滿所有可播種空田。田位的手動保留只禁止自動補苗與播種，不影響澆水或收成。</p><div class="task-toggles"><button v-for="crop in regionCrops" :key="crop.id" :class="{ chosen: farm.staffAutoCrops.includes(crop.id) }" @click="askAction({ type:'staffAutoCrop', cropId:crop.id, enabled:!farm.staffAutoCrops.includes(crop.id) })">{{ farm.staffAutoCrops.includes(crop.id) ? '☑' : '□' }} {{ crop.symbol }} {{ crop.name }}</button></div><button class="people-main-action" @click="askAction({ type:'staffReservePlot', areaId:activeArea.id, plotIndex:selectedPlot })">第 {{ selectedPlot + 1 }} 塊田 · {{ farm.staffReservedPlots.includes(`${activeArea.id}:${selectedPlot}`) ? '目前禁止人力播種，點此允許' : '目前允許人力播種，點此禁止' }}</button></div>
            <div v-else class="people-scroll"><p v-for="(entry,index) in farm.staffHistory" :key="index">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.details.join('；') }}</p><p v-if="!farm.staffHistory.length">尚無值班紀錄。</p></div>
          </template>
          <template v-else-if="operationTab === 'family'"><div class="person-tabs"><button :class="{ chosen: familyView === 'meet' }" @click="familyView = 'meet'">認識對象</button><button :class="{ chosen: familyView === 'home' }" @click="familyView = 'home'">配偶與孩子</button></div><p class="people-note">{{ farm.profile?.faith === 'milis' ? '米里斯信仰：一位配偶' : '自由信仰：最多三位配偶' }}。任何性別組合都可交往與結婚；雙方在遊戲中同意後才能結婚。</p>
            <div v-if="familyView === 'meet'" class="people-scroll"><div class="task-toggles"><button v-for="hobby in ISEKAI_HOBBIES" :key="hobby.id" :class="{ chosen: chosenHobbyId === hobby.id }" @click="chosenHobbyId = hobby.id">{{ hobby.mark }} {{ hobby.name }} {{ farm.familyHobbies[hobby.id] || 0 }} 次</button></div><button class="people-main-action" :disabled="!can({ type:'activity', hobbyId:chosenHobbyId })" @click="askAction({ type:'activity', hobbyId:chosenHobbyId })">參加活動 · 20 金幣</button><div class="people-grid"><article v-for="person in ISEKAI_PARTNERS" :key="person.id"><span class="person-art"><IsekaiPortrait :race-id="person.raceId" :profession-id="person.professionId" :seed="person.id" :label="person.name" /></span><b>{{ person.name }}</b><small>{{ ISEKAI_RACES.find(item => item.id === person.raceId)?.name }} · {{ ISEKAI_PROFESSIONS.find(item => item.id === person.professionId)?.name }}</small><small>喜歡 {{ ISEKAI_HOBBIES.find(item => item.id === person.hobby)?.name }}</small><button :disabled="!can({ type:'meet',partnerId:person.id })" @click="askAction({ type:'meet',partnerId:person.id })">活動中認識</button><button :disabled="!can({ type:'match',partnerId:person.id })" @click="askAction({ type:'match',partnerId:person.id })">相親介紹 · 60</button></article></div><div v-if="farm.courtship" class="courtship-card"><b>交往中：{{ partnerById(farm.courtship.partnerId)?.name }} · 好感 {{ farm.courtship.affection }}/100 {{ farm.courtship.engaged ? '💍 已訂婚' : '' }}</b><div class="task-toggles"><button @click="askAction({type:'date',partnerId:farm.courtship.partnerId})">約會 · 35</button><button @click="askAction({type:'propose',partnerId:farm.courtship.partnerId})">求婚</button><button @click="askAction({type:'marry',partnerId:farm.courtship.partnerId})">結婚 · 300</button><button @click="askAction({type:'breakup'})">分手</button></div></div></div>
            <div v-else class="people-scroll"><div class="people-grid"><article v-for="spouse in farm.spouses" :key="spouse.partnerId"><span class="person-art"><IsekaiPortrait :race-id="partnerById(spouse.partnerId)?.raceId" :profession-id="partnerById(spouse.partnerId)?.professionId" :seed="spouse.partnerId" :label="partnerById(spouse.partnerId)?.name" /></span><b>{{ partnerById(spouse.partnerId)?.name }} · 配偶</b><small>{{ ISEKAI_PROFESSIONS.find(item => item.id === partnerById(spouse.partnerId)?.professionId)?.name }} · 工作日薪 24</small><div class="task-toggles"><button v-for="focus in ['crops','animals','trade','guard','rest']" :key="focus" :class="{ chosen:spouse.focus===focus }" @click="askAction({type:'familyFocus',memberId:spouse.partnerId,focus})">{{ {crops:'農田',animals:'飼育',trade:'交易',guard:'戰鬥',rest:'休息'}[focus] }}</button></div><button @click="askAction({type:'child',partnerId:spouse.partnerId})">迎接孩子 · 180</button><button @click="askAction({type:'divorce',partnerId:spouse.partnerId})">離婚 · 分產一半</button></article><article v-for="child in farm.children" :key="child.id"><span class="person-art"><IsekaiPortrait :race-id="farm.profile?.raceId" :profession-id="farm.profile?.professionId" :seed="child.id" :label="child.name" /></span><b>{{ child.name }} · {{ isekaiChildAge(child,now) }} 歲</b><small>{{ isekaiChildAge(child,now) < 6 ? '尚未入學' : isekaiChildAge(child,now) < 18 ? '在學中；放學後可幫忙' : '已成年' }} · {{ isekaiChildAge(child,now) < 18 ? '工作日薪 12' : '工作日薪 30' }}</small><div class="task-toggles"><button v-for="focus in ['crops','animals','trade','guard','rest']" :key="focus" :disabled="isekaiChildAge(child,now)<6 || (focus==='guard' && isekaiChildAge(child,now)<18)" :class="{ chosen:child.focus===focus }" @click="askAction({type:'familyFocus',memberId:child.id,focus})">{{ {crops:'農田',animals:'飼育',trade:'交易',guard:'戰鬥',rest:'休息'}[focus] }}</button></div><div v-if="isekaiChildAge(child,now)>=18" class="child-courtship"><small v-if="child.childMarriage">💍 已與 {{ partnerById(child.childMarriage.partnerId)?.name }} 結婚</small><template v-else><small v-if="child.childCourtship">💞 與 {{ partnerById(child.childCourtship.partnerId)?.name }} 交往 · 好感 {{ child.childCourtship.affection }}</small><select v-if="!child.childCourtship" v-model="childPartnerChoice[child.id]"><option value="">選擇交往對象</option><option v-for="person in ISEKAI_PARTNERS" :key="person.id" :value="person.id">{{ person.name }}</option></select><div class="task-toggles"><button v-if="!child.childCourtship" :disabled="!can({type:'childMeet',memberId:child.id,partnerId:childPartnerChoice[child.id]})" @click="askAction({type:'childMeet',memberId:child.id,partnerId:childPartnerChoice[child.id]})">認識 · 40</button><template v-else><button @click="askAction({type:'childDate',memberId:child.id})">約會 · 25</button><button @click="askAction({type:'childMarry',memberId:child.id})">結婚 · 150</button><button @click="askAction({type:'childBreakup',memberId:child.id})">分手</button></template></div></template></div></article></div><p v-if="!farm.spouses.length && !farm.children.length">目前尚無家庭成員。</p></div>
          </template>
          <IsekaiTownPanel v-else-if="operationTab === 'town'" :farm="farm" :area-id="activeArea.id" :plot-index="selectedPlot" :now="now" :classmates="classmates" :loans="peerLoans" :visits="peerVisits" :visit-preview="peerVisitPreview" :student-id="studentId" :loan-ready="peerLoanReady" :visit-ready="peerVisitReady" :disabled="loading || busy || !!quiz || !!battle" @action="askAction" />
          <div v-else class="war-panel">
            <div class="war-scene"><span>🛡️</span><strong>{{ frontierArea.name }} · 邊境土地 {{ selectedFrontier + 1 }}</strong><span>⚔️</span></div>
            <p>每塊邊境地有 3–6 格獨立農地。勝利佔領後不會自動到期，每格可分別播種、澆水、收成；其他同學仍可發動戰鬥奪取。也可花 60 金幣向系統租用空置邊境地 6 小時。租期結束或土地被奪後，原有作物無法繼續使用。</p>
            <label class="frontier-area-picker">選擇領地 <select :value="selectedFrontierAreaId" @change="chooseFrontierArea($event.target.value)"><option v-for="area in ISEKAI_AREAS" :key="area.id" :value="area.id">{{ area.name }}{{ area.id === (farm.profile?.startAreaId || 'fittoa') ? ' · 起始領地' : '' }}</option></select></label>
            <p v-if="!homeFrontiersComplete" class="people-note">佔滿起始領地的六塊邊境地後，可前往其他領地租地或戰鬥開拓。進度 {{ frontiers.filter(item => item.area_id === (farm.profile?.startAreaId || 'fittoa') && item.owner_id === studentId).length }}/6。</p>
            <p v-if="frontierReady && !frontierLeaseReady" class="people-note">本地邊境戰與耕種可用；租地和跨領地拓展需先在新專案 Supabase 執行 20261003_isekai_frontier_farmland.sql。</p>
            <div class="frontier-slot-list"><button v-for="index in 6" :key="index" :class="{ chosen: selectedFrontier === index - 1, usable: frontiers.some(item => item.area_id === frontierArea.id && item.plot_index === index - 1 && (item.owner_id === studentId || (item.lease_holder_id === studentId && new Date(item.lease_expires_at).getTime() > now))) }" @click="selectedFrontier = index - 1; selectedFrontierField = 0">{{ index }} · {{ isekaiFrontierFieldCount(frontierArea.id, index - 1) }} 格 · {{ frontiers.find(item => item.area_id === frontierArea.id && item.plot_index === index - 1)?.owner_id === studentId ? '已佔領' : frontiers.find(item => item.area_id === frontierArea.id && item.plot_index === index - 1)?.lease_holder_id === studentId && new Date(frontiers.find(item => item.area_id === frontierArea.id && item.plot_index === index - 1)?.lease_expires_at).getTime() > now ? '租用中' : '待開拓' }}</button></div>
            <p>目前守方：<b>{{ frontierOwnerName }}</b><template v-if="frontierClaim?.lease_holder_id && new Date(frontierClaim.lease_expires_at).getTime() > now">；租戶：{{ frontierClaim.lease_holder_id === studentId ? '我方' : '同班同學' }}，至 {{ new Date(frontierClaim.lease_expires_at).toLocaleString('zh-TW') }}</template></p>
            <div v-if="frontierUsable" class="frontier-farm-controls">
              <strong>🌾 {{ frontierArea.name }}第 {{ selectedFrontier + 1 }} 塊邊境地 · {{ frontierFields.length }} 格農地</strong>
              <div class="frontier-field-grid" role="group" aria-label="邊境地的農田格子"><button v-for="(plot, fieldIndex) in frontierFields" :key="fieldIndex" class="frontier-field-tile" :class="{ chosen: selectedFrontierField === fieldIndex, grown: plot?.cropId && now >= plot.readyAt }" @click="selectedFrontierField = fieldIndex"><span>農地 {{ fieldIndex + 1 }}</span><strong>{{ plot?.cropId ? cropById(plot.cropId)?.symbol : '🌱' }}</strong><small>{{ plot?.cropId ? cropById(plot.cropId)?.name : '空地' }}</small><small v-if="plot?.cropId">{{ remaining(plot) }}</small></button></div>
              <p class="people-note">目前選擇農地 {{ selectedFrontierField + 1 }}：{{ frontierSite?.cropId ? cropById(frontierSite.cropId)?.name : '可播種' }}。每格可分別種植與收成。</p>
              <button v-if="frontierClaim?.lease_holder_id === studentId && frontierClaim?.owner_id !== studentId" class="people-main-action" :disabled="!can({ type:'frontierRent' })" @click="askAction({ type:'frontierRent' })">續租 6 小時 · 60 金幣</button>
              <div class="crop-picker"><button v-for="crop in frontierCrops" :key="crop.id" :class="{ chosen: selectedFrontierCropId === crop.id }" @click="selectedFrontierCropId = crop.id"><span>{{ crop.symbol }}</span>{{ crop.name }}<small>種苗 {{ farm.seeds[crop.id] || 0 }}</small></button></div>
              <div class="action-grid"><label class="seed-quantity">購買數量<input v-model.number="seedQuantity" type="number" min="1" max="50" step="1" inputmode="numeric" /></label><button :disabled="!can(frontierFarmAction('buy'))" @click="askAction(frontierFarmAction('buy'))">買種苗</button><button :disabled="!can(frontierFarmAction('plant'))" @click="askAction(frontierFarmAction('plant'))">播種</button><button :disabled="!can(frontierFarmAction('water'))" @click="askAction(frontierFarmAction('water'))">澆水</button><button :disabled="!can(frontierFarmAction('harvest'))" @click="askAction(frontierFarmAction('harvest'))">收成</button></div>
            </div>
            <div v-else class="frontier-acquire"><button class="people-main-action" :disabled="!can({ type:'battleStart' })" @click="askAction({ type:'battleStart' })">向{{ frontierOwnerName }}發動挑戰</button><button class="people-main-action" :disabled="!can({ type:'frontierRent' })" @click="askAction({ type:'frontierRent' })">租用空置田地 · 60 金幣／6 小時</button></div>
            <small v-if="student?.isAnon || !student?.class">請用班級學生帳號登入，才能參加邊境開拓。</small><small v-else-if="!frontierReady">邊境農地尚未啟用；請先在 Supabase 執行新版邊境土地 SQL。</small>
          </div>
        </div>
      </section>

      <aside v-if="ledgerOpen" class="ledger panel"><div class="section-heading"><span>03 · 開拓日誌</span><strong>庫存與販賣</strong><button class="ledger-close" @click="ledgerOpen = false" aria-label="關閉倉庫">×</button></div>
        <div v-if="farm.profile" class="profile-card"><span class="character-portrait"><IsekaiPortrait :race-id="farm.profile.raceId" :profession-id="farm.profile.professionId" :gender="farm.profile.gender" :seed="studentId" label="我的主角" /></span><strong>{{ raceById(farm.profile.raceId)?.mark }} {{ raceById(farm.profile.raceId)?.name }} · {{ professionById(farm.profile.professionId)?.name }}</strong><small>性別：{{ ISEKAI_GENDERS.find(item => item.id === farm.profile.gender)?.name }}</small><small>{{ raceById(farm.profile.raceId)?.skill }}／{{ professionById(farm.profile.professionId)?.skill }}</small><button :disabled="!can({ type: 'reincarnate' })" @click="confirmReincarnation">轉生 · {{ ISEKAI_REINCARNATION_COST }} 金幣</button></div>
          <div class="stock-list"><div v-for="crop in stockedCrops" :key="crop.id" class="stock-row"><span :style="{ color: crop.color }">{{ crop.symbol }}</span><div><b>{{ crop.name }}</b><small>售價 {{ adjustedSalePrice(farm, crop) }} 金幣 / 份</small></div><strong>× {{ farm.produce[crop.id] || 0 }}</strong><button :disabled="!can({ type: 'sell', cropId: crop.id })" @click="askAction({ type: 'sell', cropId: crop.id })">出售</button></div></div>
          <div class="stock-list animal-stock"><div v-for="animal in stockedAnimals" :key="animal.id" class="stock-row"><span>{{ animal.mark }}</span><div><b>{{ animal.product }}</b><small>售價 {{ adjustedSalePrice(farm, animal) }} 金幣 / 份</small></div><strong>× {{ farm.animalGoods?.[animal.id] || 0 }}</strong><button :disabled="!can({ type: 'sellAnimal', animalId: animal.id })" @click="askAction({ type: 'sellAnimal', animalId: animal.id })">出售</button></div></div>
        <p v-if="!totalProduce" class="empty-stock">收成後會自動打開倉庫；有庫存時按「出售」。</p>
        <div class="journal"><h3>最近記事</h3><p v-for="(entry, index) in farm.journal" :key="index"><time>{{ new Date(entry.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }}</time>{{ entry.text }}</p></div>
        <small class="sync-note">{{ saveNotice || '每個動作答題後，農莊將自動儲存。' }}</small>
      </aside>
    </div>

    <div v-if="!loading && !farm.profile && words.length >= 2" class="profile-scrim"><section class="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="identity-title">
      <span class="eyebrow">YOUR LIFE ON THE CENTRAL CONTINENT</span><h2 id="identity-title">建立開拓者</h2><div class="identity-intro"><span class="identity-preview"><IsekaiPortrait :race-id="profileDraft.raceId || 'human'" :profession-id="profileDraft.professionId || 'farmer'" :gender="profileDraft.gender" :seed="studentId || 'hero'" label="主角預覽" /></span><p>你有自己的本業，農莊是兼職。種族與職業帶來不同經營能力；選定後不能更換，除非付費轉生並從頭開始。左側會預覽你的原創角色立繪。</p></div>
      <h3>01 · 性別</h3><div class="identity-options"><button v-for="option in ISEKAI_GENDERS" :key="option.id" :class="{ chosen: profileDraft.gender === option.id }" @click="profileDraft.gender = option.id"><span>{{ option.mark }}</span>{{ option.name }}</button></div>
      <h3>信仰與婚姻規則</h3><div class="identity-options"><button :class="{chosen:profileDraft.faith==='free'}" @click="profileDraft.faith='free'"><span>🌟</span>自由信仰<small>最多三位配偶</small></button><button :class="{chosen:profileDraft.faith==='milis'}" @click="profileDraft.faith='milis'"><span>⛪</span>米里斯信仰<small>一位配偶</small></button></div>
      <h3>02 · 種族</h3><div class="identity-options race-options"><button v-for="option in ISEKAI_RACES" :key="option.id" :class="{ chosen: profileDraft.raceId === option.id }" @click="profileDraft.raceId = option.id"><span>{{ option.mark }}</span><b>{{ option.name }}</b><small>{{ option.skill }}</small></button></div>
      <h3>03 · 職業</h3><div class="identity-options profession-options"><button v-for="option in ISEKAI_PROFESSIONS" :key="option.id" :class="{ chosen: profileDraft.professionId === option.id }" @click="profileDraft.professionId = option.id"><span>{{ option.mark }}</span><b>{{ option.name }}</b><small>{{ option.skill }}</small></button></div>
      <p class="identity-story">{{ professionById(profileDraft.professionId)?.story || '選一份本業，開始你的異世界生活。' }}</p>
      <h3>04 · 選擇中央大陸的起始領地</h3><p>三個區域的十二塊領地都可選；開局只擁有你選的一塊。</p>
      <select v-model="profileDraft.areaId" class="start-area-select" aria-label="起始領地"><option value="" disabled>請選擇起始領地</option><optgroup v-for="region in ISEKAI_REGIONS" :key="region.id" :label="region.name"><option v-for="area in ISEKAI_AREAS.filter(item => item.region === region.id)" :key="area.id" :value="area.id">{{ area.name }}</option></optgroup></select>
      <p v-if="startAreaPreview" class="start-area-description">{{ startAreaPreview.description }} · 開局種苗依所選區域配發。</p>
      <button class="identity-submit" :disabled="busy || !profileDraft.gender || !profileDraft.raceId || !profileDraft.professionId || !profileDraft.areaId" @click="createProfile">{{ busy ? '建立中…' : '啟程開拓' }}</button>
    </section></div>

    <div v-if="battle" class="battle-scrim"><section class="battle-card" role="dialog" aria-modal="true" aria-labelledby="battle-title"><span class="eyebrow">FRONTIER CHRONICLE · 邊境戰</span><h2 id="battle-title">{{ battle.areaId }} · 第 {{ battle.plotIndex + 1 }} 塊田</h2><div class="battle-stage"><div><span>🧙‍♂️</span><b>我方農莊</b><small>生命 {{ battle.actor_hp }} · 魔力 {{ battle.actor_mana }} · 草藥 {{ battle.actor_items }}</small><meter :value="battle.actor_hp" :max="140" /></div><strong>⚔️</strong><div><span>🛡️</span><b>{{ battle.owner_id ? '同班領主' : '系統守衛' }}</b><small>生命 {{ battle.defender_hp }}</small><meter :value="battle.defender_hp" :max="140" /></div></div><p class="battle-outcome">{{ battle.message }}</p><div class="battle-commands" v-if="battle.status==='active'"><button :disabled="busy" @click="battleCommand('attack')">⚔️ 攻擊</button><button :disabled="busy || !battle.actor_mana" @click="battleCommand('magic')">🔮 魔術</button><button :disabled="busy" @click="battleCommand('guard')">🛡️ 防禦</button><button :disabled="busy || !battle.actor_items" @click="battleCommand('item')">🌿 道具</button></div><button v-else class="people-main-action" @click="battle=null">返回農莊</button><div class="battle-log"><p v-for="(entry,index) in battle.log" :key="index">{{ entry }}</p></div></section></div>

    <div v-if="quiz" class="quiz-scrim"><section class="quiz-card" role="dialog" aria-modal="true" aria-labelledby="quiz-title"><span class="eyebrow">WORD MAGIC · 單字咒語</span><h2 id="quiz-title">{{ quiz.title }}</h2><p>「{{ quiz.word.zh_tw }}」的英文是什麼？</p>
      <div v-if="quiz.type === 'choice'" class="quiz-options"><button v-for="option in quiz.options" :key="option" :class="{ chosen: answer === option }" @click="answer = option">{{ option }}</button></div>
      <label v-else class="fill-answer">補上缺少的兩個字母 <strong>{{ quiz.masked }}</strong><input v-model="answer" maxlength="2" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="輸入兩個字母" @keyup.enter="submitAnswer" /></label>
      <div class="quiz-actions"><button @click="quiz = null; answer = ''" :disabled="busy">取消操作</button><button class="cast" @click="submitAnswer" :disabled="busy || !answer.trim()">{{ busy ? '保存中…' : '施放咒語' }}</button></div>
    </section></div>
  </main>
</template>

<style scoped>
.isekai-page{--ink:#f3e8cb;--muted:#b9baa8;min-height:100vh;background:radial-gradient(circle at 12% 4%,#465149,#1c302f 38%,#101d23 100%);color:var(--ink);padding:18px 24px 26px;font-family:Georgia,'Noto Serif TC','Songti TC',serif}.isekai-page *{box-sizing:border-box}.isekai-page button{font:inherit;cursor:pointer}.isekai-page button:disabled{opacity:.45;cursor:not-allowed}.isekai-header{display:flex;justify-content:space-between;gap:20px;align-items:center;min-height:84px;border-bottom:1px solid #bda77b80;margin-bottom:12px}.isekai-header h1{font-size:clamp(22px,2.1vw,34px);letter-spacing:.08em;margin:3px 0}.isekai-header p{margin:0 0 7px;color:var(--muted);font-size:13px}.eyebrow{font-size:10px;letter-spacing:.2em;color:#e1c281;font-weight:bold}.isekai-header nav{display:flex;gap:8px;flex-wrap:wrap}.isekai-header nav a,.isekai-header nav button{background:#13242c;color:#f2dfbb;text-decoration:none;border:1px solid #a68c5c;border-radius:5px;padding:9px 12px;font-size:13px}.notice{background:#d6bf8e;color:#26352f;padding:9px 14px;border-radius:5px;margin-bottom:12px;min-height:38px;font-size:14px}.notice button{background:#2d413e;color:white;border:0;border-radius:4px;margin-left:8px}.isekai-layout{display:grid;grid-template-columns:minmax(280px,.96fr) minmax(480px,1.54fr) minmax(270px,.9fr);gap:14px;height:calc(100vh - 166px);min-height:620px}.panel{min-height:0;background:linear-gradient(150deg,#1d3338e8,#14262de8);border:1px solid #a88e5b99;box-shadow:inset 0 0 0 4px #e9d5a010,0 7px 22px #06111680;border-radius:8px;padding:15px;overflow:auto}.section-heading{display:flex;justify-content:space-between;align-items:baseline;gap:8px;border-bottom:1px solid #af976780;padding-bottom:9px;margin-bottom:10px}.section-heading span{font-size:11px;color:#d5bd8f;letter-spacing:.14em}.section-heading strong{font-size:19px}.atlas{display:flex;flex-direction:column}.map-frame{position:relative;max-width:100%;flex:1;min-height:260px;overflow:hidden;background:#213941;border:1px solid #6d786c;border-radius:6px}.map-frame img{height:100%;width:100%;object-fit:contain}.map-marker{position:absolute;transform:translate(-50%,-50%);border:0;background:transparent;color:#fef4d8;display:flex;flex-direction:column;align-items:center;text-shadow:0 2px 3px #10211d;min-width:52px}.marker-dot{display:grid;place-items:center;width:29px;height:29px;background:#bb8345;border:2px solid #f4d49a;border-radius:50%;box-shadow:0 0 12px #f6d18b80}.map-marker.active .marker-dot{background:#496b59;box-shadow:0 0 0 4px #f5e5b674}.map-marker.locked .marker-dot{background:#626a69}.marker-name{font-size:12px;font-weight:bold;white-space:nowrap;background:#14272bbf;padding:1px 4px;border-radius:3px}.map-note{font-size:10px;color:#bcbba6;margin:6px 0 8px}.region-list{display:grid;gap:5px}.region-row{display:flex;align-items:center;gap:6px;border:1px solid #8f8160;background:#10262b8a;border-radius:5px;min-height:50px}.region-row.selected{border-color:#e3bf7b;background:#385044}.region-row>button:first-child,.region-row>div{flex:1;text-align:left;background:none;border:none;color:var(--ink);padding:6px 8px}.region-row b,.region-row small{display:block}.region-row b{font-size:12px}.region-row small{font-size:10px;color:#cad1bc}.region-row .unlock{margin-right:6px;padding:6px 9px;border:1px solid #d5b77d;border-radius:4px;background:#946c3c;color:#fff4d7;font-size:11px}.homestead{display:flex;flex-direction:column}.region-description{color:#c6c9b5;margin:0 0 10px;font-size:13px}.resource-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.resource-bar span{background:#bda4751f;border:1px solid #bda47564;border-radius:4px;text-align:center;padding:9px 4px;font-size:12px}.resource-bar b{font-size:17px;color:#f1d48c}.field-scene{position:relative;flex:1;min-height:260px;border:1px solid #997f50;border-radius:6px;overflow:hidden;background:linear-gradient(#344d51 0%,#688471 42%,#6a6448 43%,#554d37 100%);display:flex;align-items:flex-end}.horizon{position:absolute;inset:0;pointer-events:none}.sun{position:absolute;top:8%;right:14%;font-size:40px;color:#f8dfa1;text-shadow:0 0 30px #fff4bd}.hills{position:absolute;width:120%;height:45%;left:-10%;bottom:42%;background:#445f58;border-radius:50% 50% 0 0}.hill-front{left:29%;bottom:37%;height:34%;background:#3b564e}.field-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;padding:12px}.field-tile{height:clamp(96px,14vh,148px);min-width:0;border:2px solid #caa876;border-radius:7px;background:repeating-linear-gradient(155deg,#655039,#655039 10px,#735a3e 12px,#735a3e 22px);color:#fff1d7;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 8px 0 #332e28b3;text-shadow:0 2px 3px #251c17}.field-tile.selected{border-color:#f7df92;outline:3px solid #e8c67980}.field-tile.grown{background:repeating-linear-gradient(155deg,#496546,#496546 10px,#56754d 12px,#56754d 22px)}.tile-index{font-size:11px;color:#f6e4b9}.crop-glyph,.empty-glyph{font-size:clamp(30px,4vw,52px);line-height:1.2}.field-tile strong{font-size:13px}.field-tile small{font-size:11px}.workbench{margin-top:12px}.work-title{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:7px}.work-title span{color:#c6c2a5;font-size:12px}.crop-picker{display:flex;gap:6px}.crop-picker button{flex:1;background:#1d3937;border:1px solid #8d906e;color:#eee4c6;border-radius:4px;padding:8px;font-size:12px}.crop-picker button.chosen{border-color:#f5ce83;background:#4d5940}.crop-picker button>span{font-size:18px}.crop-picker small{display:block}.action-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.action-grid button{border:1px solid #dabd85;border-radius:4px;background:#866538;color:#fff5dc;min-height:43px;font-size:13px}.action-grid small{display:block;font-size:10px}.ledger{display:flex;flex-direction:column}.stock-list{display:grid;gap:5px}.stock-row{display:grid;grid-template-columns:22px 1fr auto auto;gap:6px;align-items:center;background:#bfa97f1a;border:1px solid #a98b5d55;border-radius:4px;padding:7px}.stock-row>span{font-size:20px}.stock-row b,.stock-row small{display:block}.stock-row b{font-size:12px}.stock-row small{font-size:10px;color:#bcbca8}.stock-row strong{font-size:12px}.stock-row button{border:1px solid #ba9e6b;background:#3b5c4d;color:#fff2cc;border-radius:4px;padding:5px;font-size:11px}.empty-stock{color:#bdbda8;font-size:12px}.journal{margin-top:10px;overflow:auto;flex:1;border-top:1px solid #bda47564}.journal h3{font-size:15px;margin:10px 0}.journal p{margin:0;border-bottom:1px solid #cbb28231;padding:7px 0;font-size:12px;line-height:1.4}.journal time{color:#d9bb80;margin-right:6px}.sync-note{display:block;color:#d4c59e;margin-top:10px;font-size:11px}.quiz-scrim{position:fixed;z-index:1000;inset:0;background:#06171ac9;display:grid;place-items:center;padding:16px}.quiz-card{width:min(450px,100%);background:linear-gradient(150deg,#efe2ba,#cdb582);color:#28342e;border:7px double #71583b;border-radius:9px;padding:26px;box-shadow:0 20px 80px #000a;text-align:center}.quiz-card .eyebrow{color:#71583b}.quiz-card h2{margin:5px 0 15px;font-size:25px}.quiz-card p{font-size:17px}.quiz-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.quiz-options button{border:1px solid #816b4b;border-radius:5px;background:#fff7dd;padding:12px;color:#29332f}.quiz-options button.chosen{background:#4c6957;color:white}.fill-answer{display:grid;gap:10px}.fill-answer strong{font-size:25px;letter-spacing:.15em}.fill-answer input{width:100%;padding:11px;border:1px solid #806749;border-radius:5px;text-align:center;font-size:17px}.quiz-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.quiz-actions button{border:1px solid #765c3d;border-radius:4px;background:#f6e7c6;color:#253930;padding:9px 15px}.quiz-actions .cast{background:#385d50;color:#fff4d5}
@media(max-width:1150px){.isekai-layout{grid-template-columns:minmax(270px,1fr) minmax(430px,1.5fr);height:auto;min-height:0}.ledger{grid-column:1/-1;max-height:270px}.stock-list{grid-template-columns:repeat(3,1fr)}.map-frame{height:520px;flex:none}}
@media(max-width:760px){.isekai-page{padding:10px}.isekai-header{display:block}.isekai-header nav{margin:10px 0}.isekai-layout{display:flex;flex-direction:column}.panel{overflow:visible}.atlas{order:1}.homestead{order:0}.ledger{order:2}.map-frame{height:430px}.field-scene{min-height:300px}.field-tile{height:94px}.stock-list{grid-template-columns:1fr 1fr}.resource-bar{grid-template-columns:repeat(2,1fr)}.action-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:440px){.stock-list{grid-template-columns:1fr}.map-frame{height:350px}.field-grid{gap:5px;padding:8px}.field-tile{height:86px}.field-tile strong{font-size:11px}.crop-picker button{font-size:11px;padding:5px}.quiz-options{grid-template-columns:1fr}}
.map-frame{flex:none;aspect-ratio:8 / 9;min-height:0;height:auto}
.map-frame img{display:block;object-fit:fill}
@media(max-width:1150px){.map-frame{height:auto}}
@media(max-width:760px){.map-frame{height:auto}}
@media(max-width:440px){.map-frame{height:auto}}
.isekai-layout{grid-template-columns:minmax(350px,1.15fr) minmax(450px,1.25fr) minmax(255px,.72fr)}
.map-toolbar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:8px}
.map-toolbar button{background:#1d3a3b;color:#eadbb8;border:1px solid #9a8a65;border-radius:4px;padding:7px 4px;font-size:11px;min-width:0}
.map-toolbar button.chosen{background:#8a6a39;color:#fff6da;border-color:#efce88}
.map-toolbar .atlas-expand{grid-column:1/-1;background:#35594e;font-size:13px}
.map-frame{width:100%;background:#1d3640}.map-frame svg{display:block;width:100%;height:100%;background:#203a44}
.map-frame.map-middle{aspect-ratio:4 / 3}.map-frame.map-small{aspect-ratio:1 / 1}
.map-frame.map-small,.map-frame.map-micro{aspect-ratio:10 / 7}
.territory-shape,.field-shape{cursor:pointer;outline:none}.territory-shape path,.field-shape path{stroke:#e9d5a6;stroke-width:5;stroke-linejoin:round;transition:filter .18s,stroke-width .18s}.territory-shape:hover path,.field-shape:hover path,.territory-shape:focus path,.field-shape:focus path{filter:brightness(1.2);stroke-width:8}.territory-shape.chosen path,.field-shape.chosen path{stroke:#fff3b7;stroke-width:8}.territory-shape.locked path{filter:saturate(.4) brightness(.65)}.shape-label{font-size:17px;font-weight:bold;fill:#fff8de;paint-order:stroke;stroke:#203138;stroke-width:4;pointer-events:none}.territory-shape text,.field-shape text{pointer-events:none}
.atlas-point{cursor:pointer;fill:#f9f1d6;outline:none}.atlas-point circle{fill:#a77b42;stroke:#fae0a4;stroke-width:2.5}.atlas-point.current circle{fill:#3d7163;stroke:#f7e6a3;stroke-width:4}.atlas-point.locked circle{fill:#4a6264;stroke:#b2bdab}.atlas-label{fill:#fff2d0;paint-order:stroke;stroke:#15282b;stroke-width:4;stroke-linejoin:round;font-weight:bold;pointer-events:none}.atlas-point text{pointer-events:none}
.area-list{margin-top:8px;border-top:1px solid #af976780;padding-top:7px}.area-list h3{font-size:12px;color:#e8c991;margin:0 0 6px}.area-row{display:flex;align-items:center;gap:6px;border:1px solid #8f8160;background:#10262b8a;border-radius:5px;margin:4px 0;min-height:45px}.area-row.selected{border-color:#e3bf7b;background:#385044}.area-row>button:first-child,.area-row>div{flex:1;text-align:left;background:none;border:none;color:var(--ink);padding:5px 8px}.area-row b,.area-row small{display:block}.area-row b{font-size:12px}.area-row small{font-size:10px;color:#cad1bc}.area-row .unlock{margin-right:6px;padding:6px 9px;border:1px solid #d5b77d;border-radius:4px;background:#946c3c;color:#fff4d7;font-size:11px}
.atlas-overlay{position:fixed;z-index:700;inset:2vh 4vw;display:flex;flex-direction:column;padding:18px 24px;background:#132930;box-shadow:0 0 0 100vmax #071519d9,0 20px 80px #000a;overflow:auto}.atlas-overlay .map-toolbar{grid-template-columns:repeat(4,minmax(0,1fr))}.atlas-overlay .map-toolbar .atlas-expand{grid-column:auto}.atlas-overlay .map-frame{flex:1;min-height:280px;max-height:calc(100vh - 220px);aspect-ratio:auto}.atlas-overlay .region-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.atlas-overlay .area-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.atlas-overlay .area-list h3{grid-column:1/-1}.atlas-overlay .area-row{margin:0}
.profile-card{display:grid;gap:5px;border:1px solid #c9a66b;background:#bca27222;border-radius:5px;padding:9px;margin-bottom:10px}.profile-card strong{font-size:13px}.profile-card small{font-size:11px;color:#dbd3b7}.profile-card button{background:#304c48;color:#efdcaf;border:1px solid #bb9c63;border-radius:4px;padding:6px;font-size:11px}
.profile-card .character-portrait{display:grid;place-items:center;width:58px;height:58px;border:2px solid #d9bb80;border-radius:50%;background:radial-gradient(circle at 40% 25%,#777e62,#34554e 70%);box-shadow:0 0 0 3px #132b2d,0 3px 12px #05130f;font-size:31px;margin-bottom:4px}
.field-tile.facility{background:repeating-linear-gradient(155deg,#4d5b60,#4d5b60 10px,#5b686b 12px,#5b686b 22px)}.field-tile small{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 3px}.operation-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:8px 0}.operation-tabs button{background:#203d3c;color:#ebdfbf;border:1px solid #9e8d68;border-radius:4px;padding:7px;font-size:12px}.operation-tabs button.chosen{background:#866538;color:#fff6df;border-color:#e5c581}.building-actions{grid-template-columns:1fr 1fr}.animal-hint{display:block;color:#cfc5a8;margin-top:5px;font-size:11px}.animal-stock{margin-top:10px;padding-top:10px;border-top:1px solid #bda47564}
.crop-picker{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));max-height:178px;overflow:auto;align-content:start;padding:2px;gap:6px}.crop-picker button{min-width:0;min-height:66px;line-height:1.25;text-align:left;overflow-wrap:anywhere}.crop-picker button>span{display:inline-block;min-width:28px;font-size:28px;vertical-align:middle;filter:drop-shadow(0 2px 2px #10201d)}.crop-picker button small{margin-top:4px;color:#d8d6b8}.animal-categories{display:flex;gap:5px;margin:7px 0}.animal-categories button{flex:1;min-width:0;padding:6px 4px;border:1px solid #8d906e;border-radius:4px;background:#24413e;color:#eee4c6;font-size:12px}.animal-categories button.chosen{background:#8a6a39;border-color:#f5ce83}.crop-glyph,.stock-row>span{filter:drop-shadow(0 2px 3px #14231f)}.identity-options.profession-options{grid-template-columns:repeat(4,minmax(0,1fr))}.identity-options.profession-options button span{font-size:31px}.identity-options.profession-options button{min-height:82px}
.shape-owner{font-size:13px;font-weight:bold;fill:#fef4c2;paint-order:stroke;stroke:#213235;stroke-width:3;pointer-events:none}.person-tabs,.task-toggles{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0}.person-tabs button,.task-toggles button,.assignment button{border:1px solid #a58b61;border-radius:4px;background:#25433f;color:#f1e5c5;padding:6px 8px;font-size:12px}.person-tabs button.chosen,.task-toggles button.chosen,.assignment button.chosen{background:#856638;border-color:#f3d497}.people-note{font-size:12px;line-height:1.45;color:#e0d2ad;margin:6px 0}.people-scroll{max-height:285px;overflow:auto}.people-scroll>p{font-size:12px;margin:4px 0;padding:4px;border-bottom:1px solid #a68d6755}.people-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-height:285px;overflow:auto}.people-grid article{min-width:0;display:grid;gap:3px;align-content:start;border:1px solid #a68d67;border-radius:5px;background:#bda4751b;padding:7px}.people-grid article b{font-size:13px}.people-grid article small{font-size:11px;color:#e2d7b7;line-height:1.35}.people-grid article button,.people-main-action{border:1px solid #d6bd8a;border-radius:4px;background:#80643b;color:#fff4d8;padding:7px;font-size:12px}.people-main-action{width:100%;margin:5px 0;font-size:14px}.person-icon{font-size:30px;line-height:1.1}.assignment{display:flex;align-items:center;gap:4px;flex-wrap:wrap;border-bottom:1px solid #a68d6755;padding:5px 0}.assignment>span{min-width:90px;font-size:12px}.courtship-card{margin-top:8px;border:1px solid #d5b77d;padding:8px;border-radius:5px}.courtship-card b{font-size:12px}.war-panel{font-size:13px;line-height:1.5}.war-panel p{margin:6px 0}.war-scene{display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid #a88e5b;border-radius:5px;background:linear-gradient(130deg,#3a4b47,#694e37)}.war-scene span{font-size:33px}.battle-scrim{position:fixed;z-index:1100;inset:0;background:#06151bea;display:grid;place-items:center;padding:12px}.battle-card{width:min(650px,100%);max-height:96vh;overflow:auto;background:linear-gradient(150deg,#182d35,#3a3c36);color:#f8e9c5;border:6px double #d0ae70;border-radius:7px;padding:20px;box-shadow:0 20px 90px #000d}.battle-card h2{font-size:24px;margin:6px 0 12px}.battle-stage{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}.battle-stage>div{display:grid;gap:4px;text-align:center;padding:12px;background:#bda47521;border:1px solid #c5a36e;border-radius:5px}.battle-stage span{font-size:48px}.battle-stage small{font-size:12px}.battle-stage meter{width:100%;height:13px}.battle-outcome{background:#d2ba8d;color:#2d3430;padding:10px;border-radius:4px;min-height:44px}.battle-commands{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.battle-commands button{min-height:45px;border:1px solid #e6cf9e;background:#5b5143;color:#fff1d0;border-radius:4px}.battle-log{max-height:120px;overflow:auto;margin-top:10px}.battle-log p{font-size:12px;margin:3px 0;padding:3px;border-bottom:1px solid #bba47844}
.child-courtship{display:grid;gap:4px;margin-top:5px;padding-top:5px;border-top:1px solid #bca47577}.child-courtship select{width:100%;min-width:0;padding:6px;border:1px solid #d6bd8a;border-radius:4px;background:#f3e4c2;color:#263630}
.profile-scrim{position:fixed;z-index:900;inset:0;background:#06171ae9;display:grid;place-items:center;padding:14px}.profile-dialog{width:min(830px,100%);max-height:94vh;overflow:auto;background:linear-gradient(150deg,#e6d3a6,#bca278);border:8px double #674c33;color:#27362f;padding:24px;border-radius:8px;box-shadow:0 20px 80px #000b}.profile-dialog h2{font-size:28px;margin:4px 0}.profile-dialog p{margin:6px 0 12px}.profile-dialog h3{font-size:15px;margin:14px 0 6px}.identity-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.identity-options.race-options{grid-template-columns:repeat(5,minmax(0,1fr))}.identity-options.profession-options{grid-template-columns:repeat(3,minmax(0,1fr))}.identity-options button{display:grid;justify-items:center;gap:3px;min-height:67px;background:#f7edcf;color:#293a33;border:1px solid #8b7957;border-radius:5px;padding:8px 5px;font-size:13px}.identity-options button.chosen{background:#456a58;color:#fff3d6;border:2px solid #e9c980}.identity-options button span{font-size:22px}.identity-options button small{font-size:10px}.identity-story{font-style:italic;min-height:22px}.identity-submit{display:block;width:100%;background:#355b4b;color:#fff3ce;border:1px solid #70593b;border-radius:5px;padding:12px;font-size:17px}
@media(max-width:1150px){.isekai-layout{grid-template-columns:minmax(270px,1fr) minmax(420px,1.3fr)}.atlas-overlay .area-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.isekai-layout{display:flex}.atlas-overlay{inset:5px;padding:10px}.atlas-overlay .region-list{grid-template-columns:1fr}.atlas-overlay .area-list{grid-template-columns:1fr 1fr}.atlas-overlay .map-frame{min-height:230px}.identity-options.race-options{grid-template-columns:repeat(3,minmax(0,1fr))}.profile-dialog{padding:12px}}
@media(max-width:440px){.map-toolbar{grid-template-columns:1fr 1fr}.map-toolbar .atlas-expand{grid-column:1/-1}.atlas-overlay .map-toolbar{grid-template-columns:1fr 1fr}.atlas-overlay .map-toolbar .atlas-expand{grid-column:auto}.atlas-overlay .area-list{grid-template-columns:1fr}.identity-options.race-options,.identity-options.profession-options{grid-template-columns:repeat(2,minmax(0,1fr))}.crop-picker{grid-template-columns:repeat(2,minmax(0,1fr));max-height:170px}.shape-label{font-size:15px}}
@media(max-width:600px){.people-grid{grid-template-columns:1fr}.battle-commands{grid-template-columns:repeat(2,1fr)}.battle-stage span{font-size:34px}.battle-card{padding:12px}.shape-owner{font-size:11px}}
/* Two working panes keep the map and the farm readable; stores open only when needed. */
.isekai-layout{grid-template-columns:minmax(300px,.9fr) minmax(560px,1.6fr);gap:12px;height:calc(100vh - 166px);min-height:560px}
.atlas,.homestead{overflow:auto;scrollbar-gutter:stable}
.atlas .map-frame{flex:none;max-height:min(58vh,600px)}
.atlas .map-frame.map-large{aspect-ratio:8 / 9}
.atlas .map-frame.map-world{aspect-ratio:3 / 2;overflow:auto}
.atlas .map-frame.map-worldExact{aspect-ratio:3 / 2;overflow:auto}
.map-frame.map-world svg{min-width:1100px;width:100%;height:auto}
.map-frame.map-worldExact .original-world-map{display:block;width:max(100%,1000px);height:auto;object-fit:contain}
.world-central-link{cursor:pointer}.world-central-link text{font-size:17px;fill:#fff3d5;paint-order:stroke;stroke:#142931;stroke-width:4;pointer-events:none}.world-central-link:focus rect{stroke:#f4d78d;stroke-width:5}
.atlas .map-frame.map-middle{aspect-ratio:4 / 3}
.atlas .map-frame.map-small,.atlas .map-frame.map-micro{aspect-ratio:10 / 7}
.map-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}
.map-toolbar button{font-size:12px;padding:8px 5px;min-height:36px}
.map-toolbar .atlas-expand{grid-column:1/-1}
.local-landmark circle{fill:#e1c280;stroke:#304e4d;stroke-width:4}.local-landmark text,.local-title,.local-farm text{fill:#fff4d5;font-size:17px;font-weight:bold;paint-order:stroke;stroke:#183139;stroke-width:4}.local-title{font-size:23px}.local-farm{cursor:pointer}.local-farm circle{fill:#315e53;stroke:#f6db9f;stroke-width:5}.local-farm:focus circle,.local-farm:hover circle{fill:#467963}.map-note a{color:#f4d58c}
.start-area-select{width:100%;padding:10px;border:1px solid #70593b;border-radius:5px;background:#fff6dc;color:#24382f;font:inherit}.start-area-description{font-weight:bold;color:#345743}
.frontier-area-picker{display:grid;gap:5px;margin:9px 0;color:#e6cf9f}.frontier-area-picker select{width:100%;padding:9px;background:#ead9b0;color:#22362e;border:1px solid #b49a63;border-radius:5px;font:inherit}.frontier-slot-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}.frontier-slot-list button{min-height:38px;padding:5px;background:#26443e;color:#f0dfba;border:1px solid #8e936f;border-radius:4px;font-size:12px}.frontier-slot-list button.usable{background:#376a58}.frontier-slot-list button.chosen{border:2px solid #f5d68e;background:#8b6840}.frontier-farm-controls{display:grid;gap:6px;padding:10px;border:1px solid #c4ac79;border-radius:5px;background:#30504388}.frontier-farm-controls>small{color:#e1d3aa}.frontier-farm-controls .crop-picker{max-height:150px}.frontier-field-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.frontier-field-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:94px;padding:7px 4px;border:1px solid #b2c48a;border-radius:8px;background:linear-gradient(145deg,#547848,#314f37);color:#fff8da;text-align:center;cursor:pointer}.frontier-field-tile strong{font-size:24px;line-height:1.1}.frontier-field-tile small{font-size:12px;color:#f4edcf}.frontier-field-tile.chosen{outline:3px solid #f6d680;outline-offset:-3px;background:linear-gradient(145deg,#77723f,#4b6036)}.frontier-field-tile.grown{border-color:#f3d475;background:linear-gradient(145deg,#68804d,#46603e)}.frontier-acquire{display:grid;grid-template-columns:1fr 1fr;gap:7px}.frontier-acquire .people-main-action{margin:0;min-height:46px}@media(max-width:600px){.frontier-slot-list{grid-template-columns:repeat(2,minmax(0,1fr))}.frontier-field-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.frontier-acquire{grid-template-columns:1fr}}
.atlas-list-toggle{width:100%;background:#2e5149;color:#fff0cf;border:1px solid #c5a773;border-radius:5px;padding:9px;margin:4px 0 7px;font-size:13px}
.atlas-lists{display:grid;gap:8px}
.atlas-lists .region-list,.atlas-lists .area-list{margin:0}
.region-row b,.area-row b{font-size:13px}
.region-row small,.area-row small,.map-note{font-size:12px;line-height:1.4}
.field-scene{flex:none;min-height:0;height:255px}
.field-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.field-tile{height:103px}
.crop-glyph,.empty-glyph{font-size:34px}
.field-caption{font-size:12px;color:#dfd2b2;line-height:1.3;margin:7px 0 2px}
.workbench{margin-top:6px}
.operation-tabs{grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
.operation-tabs button{font-size:13px;min-height:39px;padding:6px 2px}
.crop-picker{grid-template-columns:repeat(auto-fill,minmax(138px,1fr));max-height:180px}
.crop-picker button{font-size:13px}
.action-grid button{font-size:13px;min-height:48px}
.animal-hint{font-size:12px;line-height:1.4;margin-top:8px}
.people-grid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr));max-height:360px;gap:9px}
.people-grid article{padding:9px;gap:5px}
.people-grid article b{font-size:14px}
.people-grid article small,.people-note{font-size:12px}
.people-scroll{max-height:360px}
.person-art{display:block;width:76px;height:108px;margin:0 auto 3px}
.ledger{position:fixed;z-index:650;top:12px;right:12px;bottom:12px;width:min(380px,calc(100vw - 24px));box-shadow:0 0 0 100vmax #071519a6,0 16px 50px #000b;overflow:auto}
.ledger-close{border:1px solid #c5a773;background:#35564c;color:#fff4d8;border-radius:5px;font-size:22px;line-height:1;width:32px;height:32px}
.ledger .stock-list{grid-template-columns:1fr}
.profile-card .character-portrait{width:108px;height:155px;border:0;border-radius:0;background:none;box-shadow:none}
.profile-card{grid-template-columns:115px 1fr;align-items:start}
.profile-card .character-portrait{grid-row:span 4}
.profile-card button{grid-column:1/-1}
.home-shape path{stroke:#f3dfa0;stroke-width:7}
.home-shape:hover path,.home-shape:focus path{stroke:#fff0be;stroke-width:9}
.identity-intro{display:flex;align-items:center;gap:16px}.identity-preview{display:block;flex:none;width:92px;height:138px}.identity-intro p{font-size:14px;line-height:1.6}
.sell-entry{width:100%;border:1px solid #d7b879;border-radius:5px;background:#375e4b;color:#fff3d7;padding:9px;margin:0 0 7px;font-size:13px;text-align:left}
.seed-quantity{display:grid;align-items:center;gap:2px;border:1px solid #bda47564;border-radius:4px;background:#bda47520;padding:4px 8px;color:#f3e4c5;font-size:12px}
.seed-quantity input{width:100%;min-width:0;border:1px solid #be9f6b;border-radius:4px;background:#fff3d5;color:#203630;padding:4px 6px;font-size:15px}
@media(max-width:1050px){.isekai-layout{grid-template-columns:minmax(270px,.9fr) minmax(430px,1.35fr)}.operation-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){.isekai-page{padding:10px}.isekai-layout{display:flex;flex-direction:column;height:auto;min-height:0}.panel{overflow:visible}.homestead{order:0}.atlas{order:1}.atlas .map-frame{max-height:none}.field-scene{height:260px}.field-tile{height:103px}.operation-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}.ledger{overflow:auto;top:6px;right:6px;bottom:6px;width:min(380px,calc(100vw - 12px))}.atlas-overlay{overflow:auto}.people-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:480px){.isekai-header nav a,.isekai-header nav button{padding:7px;font-size:12px}.field-scene{height:248px}.field-grid{gap:5px;padding:7px}.field-tile{height:100px}.field-tile strong{font-size:12px}.field-tile small{font-size:10px}.crop-glyph,.empty-glyph{font-size:29px}.crop-picker{grid-template-columns:repeat(2,minmax(0,1fr))}.action-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.people-grid{grid-template-columns:1fr 1fr}.person-art{width:64px;height:92px}.atlas-list-toggle{font-size:12px}}
</style>
