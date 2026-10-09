<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  CROP_PRODUCTS, FARM_CROPS, FARM_DISTRICTS, FARM_FERTILIZER_COST, FARM_GAME_TYPE, XINHUA_VILLAGE_IDS,
  applyFarmAction, cropById, farmActionError, farmhouseKind, freshFarm, withVillageLand, villagePrice, villagePlotCount,
  villageById, neighborAccess, landSalePrice, cropInSeason, villageAreaKm2, villagePlotCapacity, villagePlotLimit
} from '~/lib/happy-farm';
import { FARM_ANIMALS, animalActionError, animalById, applyAnimalAction } from '~/lib/happy-farm-animals';
import { FACILITY_COST, FARMHOUSE_PARCEL_PLOTS, FARMHOUSE_PLOT_HA, SOLAR_SUBSIDY_LIMIT, SOLAR_UNSUBSIDIZED_COST, applyDemolition, applyEconomyAction, demolitionCost, demolitionError, economyActionError, farmDay, farmRevenueSlot, farmhouseName, farmhouseParcel, processedSale, revenueWaitMs, solarBuildCost, solarIncome, solarPanelCount, solarSite, tourismIncome } from '~/lib/happy-farm-economy';
import { DORM_CAPACITY, DORM_COST, commuteLabel, dormName, dorms, housingAssignments, workerCommute } from '~/lib/happy-farm-housing';
import { WORKER_ACTION_INTERVAL_MS, WORKER_GROUPS, WORKER_MIGRANT_LIMIT, WORKER_SHIFT_MS, WORKER_TASKS, WORKER_TOTAL_LIMIT, addWorkerHistory, applyWorkerAction, endWorkerShift, familyAllowedTasks, familyTaskSelected, familyWorkerName, requiredShopLanguages, runWorkerBatch, sellHarvestAtBestPrice, shopStaff, workerActionError, workerById, workerGroupName, workerWage } from '~/lib/happy-farm-workers';
import { SPECIALIST_ROLES, applySpecialistAction, hasSpecialist, specialistActionError, specialistById, specialistMarket } from '~/lib/happy-farm-specialists';
import { SCHOOL_ASSET_GATE, SCHOOL_FOUNDING_GIFT, SCHOOL_LEVELS, SCHOOL_STAFF_ROLES, SCHOOL_TERM_MS, SCHOOL_THEMES, applySchoolAction, schoolActionError, schoolActiveStaff, schoolCandidate, schoolCampusPlots, schoolLevel, schoolMarket, schoolTeacherNeed, schoolTermExpense } from '~/lib/happy-farm-private-school';
import { CIVIC_FOUNDATIONS } from '~/lib/happy-farm-civic-foundations';
import { RESEARCH_CENTER_COST, RESEARCH_MAX_LEVEL, applyResearchAction, researchActionError, researchLevel, researchUpgradeCost } from '~/lib/happy-farm-research';
import { accountUnrecorded, plotAccountSource } from '~/lib/happy-farm-accounting';
import { POWER_UNIT_COST, UTILITY_CYCLE_MS, WATER_UNIT_COST, payUtilityDebt, settleUtilityBill, utilityPaymentError, utilityPreview, utilitySlot } from '~/lib/happy-farm-utilities';
import { FARM_BUSINESSES, agricultureLesson, applyBusinessAction, businessActionError, businessById, businessIncome, marketUnitPrice, populationSource, villagePopulation } from '~/lib/happy-farm-businesses';
import { GOVERNMENT_LOAN_AMOUNT, SEED_RESERVE, applyGovernmentLoan, collectOverdueGovernmentLoan, governmentLoanBalance, governmentLoanError } from '~/lib/happy-farm-finance';
import { FARM_PROTAGONISTS, REINCARNATION_COST, chooseProtagonist, protagonistById } from '~/lib/happy-farm-protagonists';
import { DISASTER_PREP_COST, prepareDisaster, settleSeasonalEvent } from '~/lib/happy-farm-events';
import { farmLessonAllowed, farmPolicyTableMissing } from '~/lib/happy-farm-access';
import { workerMarket } from '~/lib/happy-farm-worker-roster';
import { FAMILY_ABILITIES, FAMILY_ACTIVITY_COST, FAMILY_ADULT_AGE, FAMILY_AFTER_SCHOOL_AGE, FAMILY_DATE_COST, FAMILY_HOBBIES, FAMILY_MARRIAGE_COST, FAMILY_MARRIAGE_MIN_COINS, FAMILY_MATCH_COST, FAMILY_PROFESSIONS, applyFamilyAction, collectDivorceSettlement, familyActionError, familyAssetValue, familyCandidates, familyChildAge, familyPartnerById, familySchoolLevel } from '~/lib/happy-farm-family';

const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const studentId = computed(() => student.value?.id ? String(student.value.id) : '');
const farm = ref(freshFarm());
const words = ref([]);
const revision = ref(0);
const selectedPlot = ref(0);
const selectedVillage = ref('');
const selectedDistrict = ref('新化區');
const selectedCrop = ref('carrot');
const seedQuantities = ref(Object.fromEntries(FARM_CROPS.map(item => [item.id, 1])));
const workerPayPeriod = ref('day');
const selectedFamilyProfession = ref('agronomist');
const selectedFamilyAbility = ref('crops');
const selectedFamilyMember = ref('spouse');
const childPartnerChoice = ref({});
const workerView = ref('hire');
const professionalView = ref('accountant');
const schoolName = ref('');
const schoolLevelChoice = ref('elementary');
const schoolPlotChoice = ref(-1);
const schoolClasses = ref(1);
const schoolAdmissions = ref(20);
const schoolTheme = ref('bilingual');
const schoolScholarships = ref(0);
const schoolDonation = ref(500);
const selectedAnimalId = ref('chicken');
const animalCategory = ref('livestock');
const animalCategories = [{ id: 'livestock', label: '🐄 家畜' }, { id: 'aquatic', label: '🐟 水域' }, { id: 'companions', label: '🐈 伴侶動物' }, { id: 'experience', label: '🦌 體驗動物' }];
const facilityPlotChoice = ref(-1);
const activePanel = ref('tools');
const economySection = ref('solar');
const selectedBusiness = ref('market');
const marketProductKind = ref('fresh');
const schoolAnswer = ref('');
const schoolAnsweredSlot = ref('');
const schoolFeedback = ref('');
const classmates = ref([]);
const chosenClassmateId = ref('');
const visiting = ref(null), peerFarm = ref(null);
const recentVisits = ref([]), dailySteals = ref(0);
const lastAction = ref(null);
const loadingPeer = ref(false);
const socialError = ref('');
const loans = ref([]), loanError = ref('');
const loanAmount = ref(60), loanPlotChoice = ref(-1);
const settlingLoans = ref(false);
const settlingUtilities = ref(false);
const now = ref(Date.now());
const loading = ref(true), busy = ref(false), ready = ref(false);
const notice = ref('載入農場與單字中…'), saveNotice = ref('');
const quiz = ref(null), answer = ref(''), quizError = ref(''), session = ref(null);
const lastRoutineQuizAt = ref(0);
const workerActiveMs = ref(0);
const familyActiveMs = ref(0);
const ROUTINE_QUIZ_INTERVAL_MS = 35000;
let clock = null, lastWordId = null, lastUtilityFailureAt = 0;
let lastFarmInteractionAt = 0, lastFarmTickAt = 0, lastWorkerProgressSaveAt = 0, lastWorkerCycleSyncAt = 0;
const rememberFarmInteraction = () => { lastFarmInteractionAt = Date.now(); };

const crop = id => cropById(id);
const cropSalePreview = item => Math.round((farm.value.produce[item.id] || 0) * item.sale * (farmhouseKind(farm.value) === 'headquarters' ? 1.1 : 1));
const cropSeasonLabel = item => item.seasonMonths.length === 12 ? '全年' : item.seasonMonths.join('、') + ' 月';
const viewFarm = computed(() => visiting.value && peerFarm.value ? peerFarm.value : farm.value);
const currentMap = computed(() => FARM_DISTRICTS.find(item => item.name === selectedDistrict.value) || FARM_DISTRICTS[0]);
const villages = computed(() => currentMap.value.villages);
const villageName = id => villageById(id)?.name || '未知里別';
const neighborOpen = computed(() => neighborAccess(viewFarm.value));
const xinhuaOwned = computed(() => XINHUA_VILLAGE_IDS.filter(id => viewFarm.value.ownedVillages?.includes(id)).length);
const ownedVillage = computed(() => viewFarm.value.ownedVillages?.includes(selectedVillage.value));
const visiblePlots = computed(() => viewFarm.value.plots
  .map((plot, index) => ({ plot, index }))
  .filter(item => (viewFarm.value.plotVillages?.[item.index] ?? viewFarm.value.homeVillage) === selectedVillage.value));
const villageCost = computed(() => villagePrice(farm.value));
const villageRefund = computed(() => landSalePrice(farm.value, selectedVillage.value));
const expansionCost = computed(() => 100 + villagePlotCount(farm.value, selectedVillage.value) * 30);
function chooseDistrict(name) {
  if (name !== '新化區' && !neighborOpen.value) return;
  selectedDistrict.value = name;
  const district = FARM_DISTRICTS.find(item => item.name === name);
  chooseVillage(district.villages.find(item => viewFarm.value.ownedVillages.includes(item.id))?.id || district.villages[0].id);
}
function chooseVillage(id) {
  const village = villageById(id);
  if (!village || (village.district !== '新化區' && !neighborOpen.value)) return;
  selectedDistrict.value = village.district;
  selectedVillage.value = id;
  selectedPlot.value = viewFarm.value.plotVillages?.findIndex(value => value === id) ?? -1;
}
const selectedSite = computed(() => viewFarm.value.plots[selectedPlot.value] || null);
const selected = computed(() => selectedSite.value?.crop ? selectedSite.value : null);
const totalProduce = computed(() => Object.values(farm.value.produce).reduce((sum, count) => sum + Number(count || 0), 0));
const animal = id => animalById(id);
const selectedAnimal = computed(() => animal(selectedAnimalId.value) || FARM_ANIMALS[0]);
const selectedPen = computed(() => farm.value.animals?.[selectedAnimal.value.id] || null);
const ownedAnimals = computed(() => FARM_ANIMALS.filter(item => farm.value.animals?.[item.id]).length);
const totalAnimalProducts = computed(() => Object.values(farm.value.animalProducts || {}).reduce((sum, count) => sum + Number(count || 0), 0));
const visibleAnimals = computed(() => FARM_ANIMALS.filter(item => item.category ? item.category === animalCategory.value : animalCategory.value === (['frog', 'goldfish', 'crocodile', 'milkfish', 'tilapia'].includes(item.id) ? 'aquatic' : 'livestock')));
const marketWorkers = computed(() => workerMarket(now.value, farm.value.workers));
const marketSpecialists = computed(() => specialistMarket(now.value));
const privateSchool = computed(() => farm.value.schoolFoundation);
const schoolStaff = role => schoolActiveStaff(privateSchool.value, role, now.value);
const schoolCandidateList = role => schoolMarket(now.value, role);
const schoolLandPreview = computed(() => schoolCampusPlots(farm.value, schoolPlotChoice.value, schoolLevelChoice.value));
const schoolSetupPayload = () => ({ name: schoolName.value, levelId: schoolLevelChoice.value, plotIndex: Number(schoolPlotChoice.value) });
const schoolNextTerm = computed(() => privateSchool.value?.lastTermAt ? Math.max(0, privateSchool.value.lastTermAt + SCHOOL_TERM_MS - now.value) : 0);
const schoolConfig = () => ({ classes: Number(schoolClasses.value), admissionTarget: Number(schoolAdmissions.value), theme: schoolTheme.value, scholarshipPercent: Number(schoolScholarships.value) });
function syncSchoolFields() {
  const school = privateSchool.value;
  if (!school) return;
  schoolName.value = school.name;
  schoolClasses.value = school.classes;
  schoolAdmissions.value = school.admissionTarget;
  schoolTheme.value = school.theme;
  schoolScholarships.value = school.scholarshipPercent;
}
const familyAssignments = computed(() => [
  ...(farm.value.spouse ? [{ id: 'spouse', name: spouseProfile.value?.name || '配偶', member: farm.value.spouse, age: 18, wage: 24 }] : []),
  ...farm.value.children.filter(child => familyChildAge(child, familyActiveMs.value, now.value) >= FAMILY_AFTER_SCHOOL_AGE)
    .map(child => ({ id: child.id, name: child.name, member: child, age: familyChildAge(child, familyActiveMs.value, now.value), wage: familyChildAge(child, familyActiveMs.value, now.value) < FAMILY_ADULT_AGE ? 6 : 16 }))
]);
const accountingRows = computed(() => Object.entries(farm.value.accountingTotals || {})
  .map(([id, total]) => ({ id, ...total, net: total.income - total.expense }))
  .sort((a, b) => (a.id === 'shared') - (b.id === 'shared') || b.income + b.expense - a.income - a.expense));
const accountingSummary = computed(() => accountingRows.value.filter(row => !['financing', 'foundation-donation'].includes(row.id)).reduce((sum, row) => ({ income: sum.income + row.income, expense: sum.expense + row.expense, net: sum.net + row.net }), { income: 0, expense: 0, net: 0 }));
const availableFamilyPartners = computed(() => familyCandidates(farm.value).filter(person => !farm.value.children.some(child => child.childCourtship?.partnerId === person.id || child.childMarriage?.partnerId === person.id)));
const courtshipPartner = computed(() => familyPartnerById(farm.value.courtship?.partnerId));
const spouseProfile = computed(() => familyPartnerById(farm.value.spouse?.partnerId));
const familyWorkerCount = computed(() => Number(!!(farm.value.spouse?.workEnabled && farm.value.spouse.professionId && farm.value.spouse.abilityId))
  + farm.value.children.filter(child => child.workEnabled && familyChildAge(child, familyActiveMs.value, now.value) >= FAMILY_AFTER_SCHOOL_AGE
    && (familyChildAge(child, familyActiveMs.value, now.value) < FAMILY_ADULT_AGE || child.professionId && child.abilityId)).length);
const marketNextRefresh = computed(() => new Date((Math.floor((now.value + 8 * 3600000) / (3 * 3600000)) + 1) * 3 * 3600000 - 8 * 3600000).toLocaleString('zh-TW'));
const protagonist = computed(() => protagonistById(farm.value.protagonistId));
const emptyPlots = computed(() => farm.value.plots.map((plot, index) => ({ plot, index })).filter(item => item.plot === null && farm.value.ownedVillages?.includes(farm.value.plotVillages?.[item.index])));
const eligibleLoanPlots = computed(() => emptyPlots.value.filter(item => villagePlotCount(farm.value, farm.value.plotVillages[item.index]) >= 2
  && !farm.value.plots.some(plot => plot?.facility === 'farmhouse' && plot.parcel?.includes(item.index))));
const loanPlot = computed(() => eligibleLoanPlots.value.some(item => item.index === loanPlotChoice.value) ? loanPlotChoice.value : eligibleLoanPlots.value[0]?.index ?? -1);
const openBorrowing = computed(() => loans.value.find(item => item.borrower_id === studentId.value && ['pending', 'active'].includes(item.status)));
const relevantLoans = computed(() => loans.value.filter(item => ['pending', 'active'].includes(item.status)));
const recentClosedLoans = computed(() => loans.value.filter(item => !['pending', 'active'].includes(item.status)).slice(0, 3));
const governmentBalance = computed(() => governmentLoanBalance(farm.value));
const loanPerson = id => id === studentId.value ? '我' : classmateName(id);
const loanStatus = loan => ({ pending: '等待同學決定', active: '借款中', repaid: '已還清', foreclosed: '逾期賣地', rejected: '已拒絕', cancelled: '已撤銷' })[loan.status] || loan.status;
const animalTargetPlot = computed(() => emptyPlots.value.some(item => item.index === facilityPlotChoice.value) ? facilityPlotChoice.value : emptyPlots.value[0]?.index ?? -1);
const plotLabel = index => index < 0 || index >= farm.value.plots.length ? '請選擇已購土地' : `${villageName(farm.value.plotVillages?.[index])} · 第 ${farm.value.plotVillages?.slice(0, index + 1).filter(id => id === farm.value.plotVillages[index]).length} 塊地`;
const animalLocation = pen => Number.isInteger(pen?.plotIndex) ? plotLabel(pen.plotIndex) : '待安置';
const facilityLabel = plot => plot?.facility === 'animal' ? `${animal(plot.animalId)?.icon || '🐾'} ${animal(plot.animalId)?.habitat || '動物農舍'}` : plot?.facility === 'private_school' ? `🏫 ${viewFarm.value.schoolFoundation?.name || '私立學校'}${plot.campusPart ? '校地' : '校舍'}` : plot?.facility === 'foundation_library' ? `📚 ${viewFarm.value.civicFoundations?.library?.name || '圖書館'}` : plot?.facility === 'foundation_hospital' ? `🏥 ${viewFarm.value.civicFoundations?.hospital?.name || '醫院'}` : plot?.facility === 'foundation_art_museum' ? `🎨 ${viewFarm.value.civicFoundations?.art_museum?.name || '美術館'}` : plot?.facility === 'foundation_museum' ? `🏛️ ${viewFarm.value.civicFoundations?.museum?.name || '博物館'}` : plot?.facility === 'agri_research' ? '🧪 農業科技研發中心' : plot?.facility === 'factory' ? '🏭 加工坊' : plot?.facility === 'tourism' ? '🎟️ 觀光接待站' : plot?.facility === 'migrant_dorm' ? `🛏️ ${dormName(plot.gender)}` : plot?.facility === 'farmhouse' ? `🏡 ${farmhouseName(plot.kind)}` : plot?.facility === 'loan_hold' ? '🔒 借款抵押地' : plot?.facility === 'solar' ? '☀️ 光電板' : businessById(plot?.facility) ? `${businessById(plot.facility).icon} ${businessById(plot.facility).name}` : '';
const today = computed(() => farmDay(now.value));
const revenueSlot = computed(() => farmRevenueSlot(now.value));
const workerMigrantCount = computed(() => farm.value.workers.filter(item => workerById(item.id)?.group === '移工').length);
const workerHousing = computed(() => housingAssignments(farm.value));
const workerDorm = personId => {
  const index = workerHousing.value.assignments[personId];
  return Number.isInteger(index) ? `${plotLabel(index)} · ${commuteLabel(workerCommute(farm.value, workerContract(personId), selectedVillage.value))}` : '尚無合適宿舍，暫停工作';
};
const dormOccupants = index => Object.values(workerHousing.value.assignments).filter(value => value === index).length;
const selectedFarmhouseParcel = computed(() => farm.value.plots[selectedPlot.value] === null && !farmhouseKind(farm.value)
  ? farmhouseParcel(farm.value, selectedPlot.value) : null);
const workerRestWait = computed(() => Math.max(0, (farm.value.workerRestUntil || 0) - now.value));
const workerContract = personId => farm.value.workers.find(item => item.id === personId);
const workerWaitLabel = computed(() => !(farm.value.workers.length || familyWorkerCount.value) ? '尚未安排人力'
  : workerRestWait.value ? `休息中，還有 ${Math.ceil(workerRestWait.value / 60000)} 分鐘`
    : farm.value.workerAuto ? `自動值班中 ${Math.floor(workerActiveMs.value / 60000)}/30 分鐘 · 已巡查 ${farm.value.workerRunCount || 0} 次` : '準備自動開始值班');
const utilityEstimate = computed(() => utilityPreview(farm.value, now.value));
const utilityNextWait = computed(() => (farm.value.utilityLastSlot + 1) * UTILITY_CYCLE_MS - 8 * 60 * 60 * 1000 - now.value);
const utilitySiteLabel = index => farm.value.plots[index]?.crop ? `${plotLabel(index)} · ${crop(farm.value.plots[index].crop)?.name}` : `${plotLabel(index)} · ${facilityLabel(farm.value.plots[index])}`;
const tourismPlot = computed(() => farm.value.plots.findIndex(plot => plot?.facility === 'tourism'));
const economyPreview = computed(() => tourismIncome(farm.value, now.value));
const solarWait = computed(() => revenueWaitMs(farm.value.plots[selectedPlot.value], 'lastSolarAt', 'lastSolarDay', now.value));
const tourismWait = computed(() => revenueWaitMs(farm.value.plots[tourismPlot.value], 'lastVisitAt', 'lastVisitDay', now.value));
const businessWait = computed(() => revenueWaitMs(farm.value.plots[selectedPlot.value], 'lastBusinessAt', 'lastBusinessDay', now.value));
const waitLabel = milliseconds => {
  if (milliseconds <= 0) return '現在可收款';
  const minutes = Math.ceil(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  return `還需 ${hours ? hours + ' 小時 ' : ''}${minutes % 60} 分鐘`;
};
const business = computed(() => businessById(selectedBusiness.value) || FARM_BUSINESSES[0]);
const businessChoices = computed(() => FARM_BUSINESSES.filter(item => economySection.value === 'attractions' ? item.category === 'attractions' : economySection.value === 'animal-business' ? item.category === 'animal-business' : !item.category));
function chooseEconomySection(section) {
  economySection.value = section;
  if (section === 'attractions') selectedBusiness.value = 'bicycle';
  if (section === 'animal-business') selectedBusiness.value = 'cat_cafe';
  if (section === 'business' && business.value.category) selectedBusiness.value = 'market';
}
const productionPanel = computed(() => ['tools', 'shop', 'animals', 'workers'].includes(activePanel.value));
const businessSites = computed(() => farm.value.plots.map((plot, index) => ({ plot, index })).filter(item => item.plot?.facility === selectedBusiness.value));
const schoolLesson = computed(() => agricultureLesson(now.value));
const marketStock = computed(() => Number((marketProductKind.value === 'fresh' ? farm.value.produce : farm.value.processedProduce)?.[selectedCrop.value] || 0));
const marketPrice = computed(() => marketUnitPrice(selectedCrop.value, marketProductKind.value, farm.value.plotVillages?.[selectedPlot.value]));
function selectBusinessSite(index) {
  chooseVillage(farm.value.plotVillages[index]);
  selectFarmPlot({ plot: farm.value.plots[index], index });
}
function selectFarmPlot(entry) {
  selectedPlot.value = entry.index;
  if (visiting.value) { activePanel.value = 'visitors'; return; }
  if (entry.plot?.facility === 'private_school') { navigateTo({ path: '/game-happy-farm-school', query: lesson }); return; }
  if (entry.plot?.facility === 'foundation_library' || entry.plot?.facility === 'foundation_hospital') { navigateTo({ path: '/game-happy-farm-foundation', query: { ...lesson, kind: entry.plot.facility === 'foundation_library' ? 'library' : 'hospital' } }); return; }
  if (entry.plot?.facility === 'foundation_art_museum' || entry.plot?.facility === 'foundation_museum') { navigateTo({ path: '/game-happy-farm-foundation', query: { ...lesson, kind: entry.plot.facility.slice('foundation_'.length) } }); return; }
  if (entry.plot === null && activePanel.value === 'school') { schoolPlotChoice.value = entry.index; return; }
  const siteBusiness = businessById(entry.plot?.facility);
  if (siteBusiness) {
    activePanel.value = 'economy';
    selectedBusiness.value = siteBusiness.id;
    economySection.value = siteBusiness.category || 'business';
  } else if (entry.plot?.facility === 'animal') {
    selectedAnimalId.value = entry.plot.animalId;
    animalCategory.value = animal(entry.plot.animalId)?.category || (['frog', 'goldfish', 'crocodile', 'milkfish', 'tilapia'].includes(entry.plot.animalId) ? 'aquatic' : 'livestock');
    activePanel.value = 'animals';
  } else if (entry.plot?.facility === 'factory') {
    activePanel.value = 'economy';
    economySection.value = 'processing';
  } else if (entry.plot?.facility === 'agri_research') {
    activePanel.value = 'economy';
    economySection.value = 'research';
  } else if (entry.plot?.facility === 'tourism') {
    activePanel.value = 'economy';
    economySection.value = 'tourism';
  } else if (['migrant_dorm', 'farmhouse'].includes(entry.plot?.facility)) {
    activePanel.value = 'economy';
    economySection.value = 'housing';
  } else if (entry.plot?.facility === 'solar' || entry.plot?.solar) {
    activePanel.value = 'economy';
    economySection.value = 'solar';
  } else if (entry.plot?.facility === 'loan_hold') {
    activePanel.value = 'finance';
  } else if (entry.plot === null && activePanel.value === 'finance') {
    loanPlotChoice.value = entry.index;
  } else if (entry.plot === null && activePanel.value === 'economy') {
    // An empty plot can host several facility types; keep the chosen building menu.
  } else {
    activePanel.value = 'tools';
    if (entry.plot?.crop) selectedCrop.value = entry.plot.crop;
  }
}
const animalCareDone = (item, pen) => !!pen && item.care.every(task => pen.care?.[task.id]);
const animalTimeLabel = pen => {
  if (!pen) return '等待入住';
  const seconds = Math.max(0, Math.ceil((pen.readyAt - now.value) / 1000));
  return seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '已到採集時間';
};
const lessonLabel = computed(() => [lesson.version, lesson.volume, lesson.unit].join(' · '));
const sessionKey = computed(() => 'shjhs_happy_farm_session:' + [studentId.value, lesson.version, lesson.volume, lesson.unit].join(':'));
const routineQuizKey = computed(() => 'shjhs_happy_farm_last_question:' + studentId.value);
const routineQuizSeconds = computed(() => Math.ceil(Math.max(0, ROUTINE_QUIZ_INTERVAL_MS - (now.value - lastRoutineQuizAt.value)) / 1000));
function rememberRoutineQuiz() {
  lastRoutineQuizAt.value = Date.now();
  try { localStorage.setItem(routineQuizKey.value, String(lastRoutineQuizAt.value)); } catch { /* Storage may be unavailable. */ }
}
const secondsLeft = plot => Math.max(0, Math.ceil((plot.readyAt - now.value) / 1000));
const timeLabel = plot => {
  const seconds = secondsLeft(plot);
  return seconds ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') : '可以收成';
};
const plotStage = plot => {
  if (!plot) return '空地';
  if (!secondsLeft(plot)) return '成熟';
  const elapsed = (now.value - plot.plantedAt) / (plot.readyAt - plot.plantedAt);
  return elapsed < .35 ? '發芽' : elapsed < .75 ? '成長中' : '快成熟';
};
const plotWeeds = plot => plot && now.value >= plot.weedAt && !plot.weedRemoved;
const plotPests = plot => plot && now.value >= plot.pestAt && !plot.pestRemoved;
const careStatus = plot => {
  if (!plot) return [];
  return [
    { key: 'water', icon: '💧', text: plot.watered ? '已澆水' : '未澆水', state: plot.watered ? 'done' : 'pending' },
    { key: 'fertilize', icon: '✨', text: plot.fertilized ? '已施肥' : '未施肥', state: plot.fertilized ? 'done' : 'pending' },
    { key: 'weed', icon: '🌾', text: plot.weedRemoved ? '已除草' : plotWeeds(plot) ? '待除草' : '尚無雜草', state: plot.weedRemoved ? 'done' : plotWeeds(plot) ? 'urgent' : 'pending' },
    { key: 'pest', icon: '🐛', text: plot.pestRemoved ? '已除蟲' : plotPests(plot) ? '待除蟲' : '尚無害蟲', state: plot.pestRemoved ? 'done' : plotPests(plot) ? 'urgent' : 'pending' }
  ];
};
const pulseIcon = action => ({ water: '💧', fertilize: '✨', weed: '🌾', pest: '🛡️' })[action] || '';
const can = (action, cropId = selectedCrop.value, quantity = 1) =>
  ready.value && !visiting.value && !busy.value && !quiz.value && !farmActionError(farm.value, action, cropId, selectedPlot.value, now.value, selectedVillage.value, quantity);
const canAnimal = (action, animalId = selectedAnimal.value.id, careId = '') =>
  ready.value && !visiting.value && !busy.value && !quiz.value && !animalActionError(farm.value, action, animalId, careId, now.value, animalTargetPlot.value);
const canEconomy = (action, cropId = selectedCrop.value, mode = '') =>
  ready.value && !visiting.value && !busy.value && !quiz.value && !economyActionError(farm.value, action, action === 'collectVisitors' ? tourismPlot.value : selectedPlot.value, cropId, mode, now.value);
const canBusiness = action => ready.value && !visiting.value && !busy.value && !quiz.value && !businessActionError(farm.value, action, selectedPlot.value, selectedBusiness.value, selectedCrop.value, marketProductKind.value, now.value);
function visitProblem(action, plotIndex = selectedPlot.value) {
  const plot = peerFarm.value?.plots?.[plotIndex];
  if (!plot?.crop) return '這塊田尚未播種。';
  if (action === 'water') return now.value >= plot.readyAt || plot.watered ? '作物已成熟或已澆水。' : '';
  if (action === 'weed') return now.value >= plot.weedAt && !plot.weedRemoved ? '' : '目前沒有雜草。';
  if (action === 'pest') return now.value >= plot.pestAt && !plot.pestRemoved ? '' : '目前沒有害蟲。';
  if (action === 'steal') {
    if (now.value < plot.readyAt) return '作物還沒成熟。';
    if ((plot.stolen || 0) >= 1) return '這塊田已被摘取過。';
    if (dailySteals.value >= 3) return '今天已達三次摘取上限。';
    const cropInfo = crop(plot.crop);
    if (!cropInfo) return '作物資料無效。';
    const possible = Math.max(1, cropInfo.yield + Number(plot.seasonBonus || 0) + Number(plot.watered) + Number(plot.fertilized)
      - Number(now.value >= plot.weedAt && !plot.weedRemoved)
      - Number(now.value >= plot.pestAt && !plot.pestRemoved) - Number(plot.stolen || 0));
    return possible > 1 ? '' : '必須替主人保留至少一份收成。';
  }
  return '此操作無法用於同學農場。';
}
const canVisit = action => ready.value && !!visiting.value && !socialError.value && !busy.value && !quiz.value && !visitProblem(action);

function makeSession() {
  return { id: crypto.randomUUID(), startedAt: Date.now(), correct: [], wrong: [], attemptNumber: 1 };
}
function rememberSession() {
  if (!session.value) return;
  try { sessionStorage.setItem(sessionKey.value, JSON.stringify(session.value)); }
  catch { saveNotice.value = '本機暫存不可用；請保持頁面開啟直到成績同步。'; }
}
async function syncRecord() {
  if (!session.value || !studentId.value || !(session.value.correct.length + session.value.wrong.length)) return;
  const entry = session.value;
  const { error } = await db.from('game_records').upsert([{
    id: entry.id, student_id: studentId.value, game_type: FARM_GAME_TYPE,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: entry.correct.length * 10, mistakes: entry.wrong.length,
    correct_words: entry.correct.join(', '), wrong_words: entry.wrong.join(', '),
    attempt_number: entry.attemptNumber, played_at: new Date(entry.startedAt).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - entry.startedAt) / 1000),
    device_info: navigator.userAgent
  }], { onConflict: 'id' });
  saveNotice.value = error ? '成績尚未同步：' + error.message + '。按「重試同步」。' : '農場與本次答題成績已儲存。';
}
async function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey.value) || 'null');
    if (saved?.id && Array.isArray(saved.correct) && Array.isArray(saved.wrong) && Number.isFinite(saved.startedAt)) session.value = saved;
  } catch { /* Start a new record if browser storage is unavailable. */ }
  if (!session.value) {
    session.value = makeSession();
    const { count, error } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId.value).eq('game_type', FARM_GAME_TYPE)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    if (!error) session.value.attemptNumber = (count || 0) + 1;
    rememberSession();
  } else await syncRecord();
}
async function loadFarm() {
  const { data, error } = await db.from('happy_farm_states').select('farm,revision').eq('student_id', studentId.value).maybeSingle();
  if (error) throw error;
  if (data) {
    const fallback = FARM_DISTRICTS[0].villages[Math.floor(Math.random() * XINHUA_VILLAGE_IDS.length)].id;
    farm.value = withVillageLand(data.farm, fallback);
    revision.value = data.revision;
    if (JSON.stringify(farm.value) !== JSON.stringify(data.farm)) {
      const { data: migrated, error: migrationError } = await db.from('happy_farm_states')
        .update({ farm: farm.value, revision: revision.value + 1, updated_at: new Date().toISOString() })
        .eq('student_id', studentId.value).eq('revision', revision.value).select('farm,revision').maybeSingle();
      if (migrationError) throw migrationError;
      if (migrated) { farm.value = migrated.farm; revision.value = migrated.revision; }
      else return loadFarm();
    }
    syncSchoolFields();
    if (!selectedVillage.value || !farm.value.ownedVillages.includes(selectedVillage.value)) chooseVillage(farm.value.homeVillage);
    return;
  }
  const startVillage = FARM_DISTRICTS[0].villages[Math.floor(Math.random() * XINHUA_VILLAGE_IDS.length)].id;
  const { data: created, error: createError } = await db.from('happy_farm_states')
    .insert({ student_id: studentId.value, farm: freshFarm(startVillage) }).select('farm,revision').single();
  if (createError) throw createError;
  farm.value = created.farm;
  revision.value = created.revision;
  chooseVillage(startVillage);
}
async function saveFarm(next, account = {}) {
  if (next.workerAuto && farm.value.workerAuto) next.workerActiveMs = Math.max(Number(next.workerActiveMs) || 0, workerActiveMs.value);
  if (next.gender && farm.value.gender) next.familyActiveMs = Math.max(Number(next.familyActiveMs) || 0, familyActiveMs.value);
  next = collectOverdueGovernmentLoan(next, Date.now());
  next = collectDivorceSettlement(next, farm.value);
  const index = account.plotIndex;
  const site = Number.isInteger(index) && index >= 0 ? next.plots?.[index] || farm.value.plots?.[index] : null;
  const source = account.source || (site ? plotAccountSource(index, site) : 'shared');
  const label = account.source ? account.label || '農場共同收支' : site ? `${plotLabel(index)} · ${site.crop ? crop(site.crop)?.name || '作物' : facilityLabel(site) || '農地'}` : account.label || '農場共同收支';
  accountUnrecorded(farm.value, next, source, label, account.detail || '農場操作');
  const { data, error } = await db.from('happy_farm_states')
    .update({ farm: next, revision: revision.value + 1, updated_at: new Date().toISOString() })
    .eq('student_id', studentId.value).eq('revision', revision.value).select('revision').maybeSingle();
  if (error) throw error;
  if (!data) {
    await loadFarm();
    throw new Error('農場已在另一個分頁或裝置更新，請重新選擇操作。');
  }
  farm.value = next;
  revision.value = data.revision;
  if (!next.workerAuto) workerActiveMs.value = 0;
  if (!next.gender) familyActiveMs.value = 0;
}
async function loadClassmates() {
  if (student.value?.isAnon || !student.value?.class) return;
  const { data, error } = await db.from('students')
    .select('student_id,hidden_name,seat_number,class_name')
    .eq('class_name', student.value.class).neq('student_id', studentId.value)
    .order('seat_number', { ascending: true }).limit(60);
  if (error) { notice.value = '同班名單暫時無法讀取：' + error.message; return; }
  classmates.value = data || [];
  if (!classmates.value.some(person => person.student_id === chosenClassmateId.value)) {
    chosenClassmateId.value = classmates.value[0]?.student_id || '';
  }
}
async function loadLoans(settleOverdue = false) {
  if (student.value?.isAnon) return;
  if (settleOverdue && settlingLoans.value) return;
  if (settleOverdue) settlingLoans.value = true;
  const lockActions = settleOverdue && ready.value;
  if (lockActions) busy.value = true;
  try {
    const { data, error } = await db.rpc('happy_farm_loan_list', { p_student_id: studentId.value });
    if (error) { loanError.value = '同學借款尚未啟用：請先執行本次新增的 SQL。'; return; }
    loanError.value = '';
    loans.value = Array.isArray(data) ? data : [];
    if (settleOverdue) {
      const overdue = loans.value.filter(item => item.status === 'active' && Date.parse(item.due_at) <= Date.now());
      for (const loan of overdue) {
        const { data: settled, error: settleError } = await db.rpc('happy_farm_loan_action', { p_actor_id: studentId.value, p_action: 'foreclose', p_loan_id: loan.id });
        if (settleError) { loanError.value = '逾期結算失敗：' + settleError.message; break; }
        notice.value = settled?.detail || '逾期借款已結算。';
      }
      if (overdue.length && !loanError.value) { await loadFarm(); await loadLoans(); }
    }
  } catch (error) { loanError.value = '借款資料更新失敗：' + error.message; }
  finally {
    if (settleOverdue) settlingLoans.value = false;
    if (lockActions) busy.value = false;
  }
}
async function loadVisitActivity() {
  if (student.value?.isAnon) return;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const { count, error } = await db.from('happy_farm_visits').select('id', { count: 'exact', head: true })
    .eq('actor_id', studentId.value).eq('action', 'steal')
    .gte('created_at', new Date(today + 'T00:00:00+08:00').toISOString());
  if (error) {
    socialError.value = '互訪尚未啟用；請先在新 Supabase 執行開心農場互訪 SQL。';
    return;
  }
  socialError.value = '';
  dailySteals.value = count || 0;
  const { data } = await db.from('happy_farm_visits').select('actor_id,action,crop,created_at')
    .eq('owner_id', studentId.value).order('created_at', { ascending: false }).limit(3);
  recentVisits.value = data || [];
}
async function openClassmate(person) {
  if (busy.value || quiz.value || student.value?.isAnon) return;
  loadingPeer.value = true;
  try {
    const { data, error } = await db.from('happy_farm_states').select('farm')
      .eq('student_id', person.student_id).maybeSingle();
    if (error) throw error;
    if (!data) { notice.value = person.hidden_name + ' 還沒有開設農場。'; return; }
    peerFarm.value = withVillageLand(data.farm, XINHUA_VILLAGE_IDS[0]);
    visiting.value = person;
    chooseVillage(peerFarm.value.homeVillage);
    activePanel.value = 'visitors';
    notice.value = '正在拜訪 ' + person.hidden_name + ' 的農場。一般照料約每 35 秒問一次單字；偷菜每次都問。';
  } catch (error) { notice.value = '無法進入同學農場：' + error.message; }
  finally { loadingPeer.value = false; }
}
function visitChosenClassmate() {
  const person = classmates.value.find(item => item.student_id === chosenClassmateId.value);
  if (person) openClassmate(person);
}
const classmateName = id => classmates.value.find(person => person.student_id === id)?.hidden_name || '同班同學';
const visitActionText = action => ({ water: '澆水', weed: '除草', pest: '除蟲', steal: '摘取一份作物' })[action] || action;
async function refreshPeer() {
  if (!visiting.value) return;
  const { data, error } = await db.from('happy_farm_states').select('farm')
    .eq('student_id', visiting.value.student_id).maybeSingle();
  if (!error && data) peerFarm.value = withVillageLand(data.farm, XINHUA_VILLAGE_IDS[0]);
}
async function returnHomeFarm() {
  if (busy.value || quiz.value) return;
  visiting.value = null;
  peerFarm.value = null;
  activePanel.value = 'tools';
  try { await loadFarm(); chooseVillage(farm.value.homeVillage); await loadVisitActivity(); }
  catch (error) { notice.value = '更新我的農場失敗：' + error.message; }
}
async function refreshSocial() {
  if (busy.value || quiz.value) return;
  try {
    const previousNotice = notice.value;
    if (visiting.value) await refreshPeer();
    else await loadFarm();
    await Promise.all([loadVisitActivity(), loadLoans(true)]);
    if (notice.value === previousNotice) notice.value = '農場與互訪紀錄已更新。';
  } catch (error) { notice.value = '更新失敗：' + error.message; }
}
async function applyVisit(q) {
  const { data, error } = await db.rpc('happy_farm_visit', {
    p_actor_id: studentId.value, p_owner_id: q.ownerId,
    p_action: q.action, p_plot_index: q.plotIndex
  });
  if (error) {
    await refreshPeer();
    await loadVisitActivity();
    throw error;
  }
  farm.value = withVillageLand(data.actor_farm, farm.value.homeVillage);
  revision.value = data.actor_revision;
  peerFarm.value = withVillageLand(data.owner_farm, peerFarm.value?.homeVillage || XINHUA_VILLAGE_IDS[0]);
  dailySteals.value = data.daily_steals;
  return { detail: q.action === 'steal' ? '已摘取一份 ' + crop(q.cropId).name + '，主人至少保留一份。' : '已幫同學照料作物。' };
}
function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function buildQuiz() {
  const pool = words.value.filter(word => word.id !== lastWordId);
  const word = shuffle(pool.length ? pool : words.value)[0];
  lastWordId = word.id;
  const english = String(word.en_us).trim();
  const chinese = String(word.zh_tw).trim();
  const target = english;
  const others = [...new Set(shuffle(words.value).map(item => String(item.en_us).trim()).filter(value => value && value !== target))].slice(0, 3);
  if (others.length >= 2) return {
    word, mode: 'choice', prompt: '「' + chinese + '」的英文是？',
    choices: shuffle([target, ...others]), target
  };
  const letters = [...english].map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter(index => index >= 0);
  if (letters.length < 2) return { word, mode: 'spell', prompt: '請輸入「' + chinese + '」的英文', target: english };
  const positions = shuffle(letters).slice(0, 2).sort((a, b) => a - b);
  const masked = [...english], missing = positions.map(index => masked[index]).join('');
  positions.forEach(index => { masked[index] = '＿'; });
  return { word, mode: 'letters', prompt: '補上「' + chinese + '」的兩個字母', masked: masked.join(''), target: missing };
}
function actionLabel(action, cropId, quantity = 1) {
  const name = crop(cropId)?.name || '';
  return {
    buy: `買 ${quantity} 份${name}種苗`, plant: '種下' + name, water: '澆水', fertilize: '施肥',
    weed: '除草', pest: '除蟲', harvest: '收成', sell: '賣出全部' + name, expand: '擴建田地',
    steal: '摘取一份' + name, buyLand: '買下' + villageName(selectedVillage.value) + '農地', sellLand: '出售' + villageName(selectedVillage.value) + '農地'
  }[action] || action;
}
function queueFarmOperation(operation, important = false) {
  if (!important && routineQuizSeconds.value > 0) { performWithoutQuiz(operation); return; }
  quiz.value = { ...buildQuiz(), ...operation };
  answer.value = '';
  quizError.value = '';
}
function beginAction(action, cropId = selectedCrop.value, quantity = 1) {
  if (!ready.value || busy.value || quiz.value) return;
  if (visiting.value && socialError.value) { notice.value = socialError.value; return; }
  const ownerId = visiting.value?.student_id || null;
  const targetCrop = visiting.value ? selected.value?.crop : cropId;
  const problem = visiting.value
    ? visitProblem(action)
    : farmActionError(farm.value, action, targetCrop, selectedPlot.value, Date.now(), selectedVillage.value, quantity);
  if (problem) { notice.value = problem; return; }
  queueFarmOperation({ action, cropId: targetCrop, quantity, plotIndex: selectedPlot.value, villageId: selectedVillage.value, ownerId,
    actionText: (visiting.value && action !== 'steal' ? '幫同學' : '') + actionLabel(action, targetCrop, quantity) },
  ['buyLand', 'sellLand', 'expand', 'steal'].includes(action));
}
function beginAnimalAction(action, careId = '') {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const animalId = selectedAnimal.value.id;
  const plotIndex = animalTargetPlot.value;
  const problem = animalActionError(farm.value, action, animalId, careId, Date.now(), plotIndex);
  if (problem) { notice.value = problem; return; }
  const item = selectedAnimal.value;
  const care = item.care.find(task => task.id === careId);
  const actionText = {
    buyAnimal: `在${plotLabel(plotIndex)}建造${item.habitat}並讓${item.name}入住`,
    placeAnimal: `在${plotLabel(plotIndex)}安置${item.name}`,
    careAnimal: `幫${item.name}${care?.label || '照護'}`,
    collectAnimal: `採集${item.product}`,
    sellAnimalProduct: `賣出全部${item.product}`
  }[action];
  queueFarmOperation({ action, animalId, careId, plotIndex, actionText }, ['buyAnimal', 'placeAnimal'].includes(action));
}
function beginEconomyAction(action, cropId = selectedCrop.value, mode = '') {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const plotIndex = action === 'collectVisitors' ? tourismPlot.value : selectedPlot.value;
  const problem = economyActionError(farm.value, action, plotIndex, cropId, mode, Date.now());
  if (problem) { notice.value = problem; return; }
  const actionText = {
    buildSolar: `在${plotLabel(plotIndex)}設置光電板`, collectSolar: `結算${plotLabel(plotIndex)}的賣電收入`,
    buildFactory: `在${plotLabel(plotIndex)}建造加工坊`, buildTourism: `在${plotLabel(plotIndex)}建造觀光接待站`,
    buildDorm: `在${plotLabel(plotIndex)}建造${dormName(mode)}`, buildFarmhouse: `在${plotLabel(plotIndex)}建造${farmhouseName(mode)}`,
    collectVisitors: '接待本輪遊客', processCrop: `製作${CROP_PRODUCTS[cropId]}${mode === 'outsource' ? '（委外）' : ''}`,
    sellProcessed: `賣出全部${CROP_PRODUCTS[cropId]}`
  }[action];
  queueFarmOperation({ action, cropId, plotIndex, mode, economy: true, actionText }, ['buildSolar', 'buildFactory', 'buildTourism', 'buildDorm', 'buildFarmhouse'].includes(action));
}
function beginWorkerAction(action, personId) {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const period = action === 'renewWorker' ? workerContract(personId)?.period : workerPayPeriod.value;
  const problem = workerActionError(farm.value, action, personId, period);
  if (problem) { notice.value = problem; return; }
  const person = workerById(personId);
  const actionText = action === 'hireWorker'
    ? `雇用${person.name}並預付${period === 'day' ? '日薪' : '周薪'} ${workerWage(person, period, farm.value.protagonistId)} 金幣`
    : action === 'renewWorker' ? `續付${person.name}的${period === 'day' ? '日薪' : '周薪'} ${workerWage(person, period, farm.value.protagonistId)} 金幣`
      : `結束與${person.name}的雇用`;
  queueFarmOperation({ action, personId, period, workerAction: true, actionText }, true);
}
async function changeWorkerSettings(changes) {
  if (!ready.value || busy.value || quiz.value || visiting.value) return;
  busy.value = true;
  try { await saveFarm({ ...farm.value, ...changes }); }
  catch (error) { notice.value = '人力設定未儲存：' + error.message; }
  finally { busy.value = false; }
}
async function beginWorkerCycle() {
  if (!ready.value || busy.value || quiz.value || visiting.value || farm.value.workerAuto || workerRestWait.value > 0 || !(farm.value.workers.length || familyWorkerCount.value)) return;
  busy.value = true;
  try {
    const now = Date.now();
    const next = { ...farm.value, workerAuto: true, workerActiveMs: 0, workerRestUntil: 0, workerCycleVersion: 3,
      workerRunCount: 0, workerLastActionMs: 0, workerCycleStartedAt: now };
    addWorkerHistory(next, { at: Date.now(), personId: 'system', group: 'agency', detail: '人力自動開始值班；本輪持續 30 分鐘有效遊玩時間' });
    const firstRun = runWorkerBatch({ ...next, familyActiveMs: familyActiveMs.value }, now);
    await saveFarm(firstRun?.farm || next);
    workerActiveMs.value = 0;
    lastWorkerProgressSaveAt = Date.now();
    notice.value = `人力已自動開始值班：${firstRun?.detail || '目前沒有可執行的工作'}。`;
  } catch (error) { notice.value = '人力啟動失敗：' + error.message; }
  finally { busy.value = false; }
}
async function syncWorkerCycle() {
  if (!ready.value || busy.value || quiz.value || visiting.value) return;
  if (Date.now() - lastWorkerCycleSyncAt < 10000) return;
  lastWorkerCycleSyncAt = Date.now();
  if (farm.value.workers.length || familyWorkerCount.value) {
    if (!farm.value.workerAuto && workerRestWait.value <= 0) await beginWorkerCycle();
  } else if (farm.value.workerAuto || farm.value.workerActiveMs || farm.value.workerRestUntil) {
    await changeWorkerSettings({ workerAuto: false, workerActiveMs: 0, workerRestUntil: 0, workerRunCount: 0,
      workerLastActionMs: 0, workerCycleStartedAt: 0 });
    workerActiveMs.value = 0;
  }
}
function toggleWorkerTask(taskId, enabled) {
  changeWorkerSettings({ workerTasks: { ...farm.value.workerTasks, [taskId]: enabled } });
}
async function toggleFamilyTask(memberId, taskId, enabled) {
  const assignment = familyAssignments.value.find(item => item.id === memberId);
  if (!assignment || !familyAllowedTasks(assignment.age).includes(taskId)) return;
  const next = JSON.parse(JSON.stringify(farm.value));
  const member = memberId === 'spouse' ? next.spouse : next.children.find(child => child.id === memberId);
  const current = Array.isArray(member.taskIds) ? member.taskIds : familyAllowedTasks(assignment.age);
  member.taskIds = enabled ? [...new Set([...current, taskId])] : current.filter(id => id !== taskId);
  await changeWorkerSettings(next);
}
function beginSpecialistAction(action, personId) {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const problem = specialistActionError(farm.value, action, personId, Date.now());
  if (problem) { notice.value = problem; return; }
  const person = specialistById(personId);
  queueFarmOperation({ action, personId, specialistAction: true,
    actionText: `${action === 'hireSpecialist' ? '聘請' : action === 'renewSpecialist' ? '續聘' : '解約'}${person.name}${action === 'dismissSpecialist' ? '' : `，支付 ${person.fee} 金幣`}` }, action !== 'dismissSpecialist');
}
function beginSchoolAction(action, payload = {}) {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const problem = schoolActionError(farm.value, action, payload, Date.now());
  if (problem) { notice.value = problem; return; }
  const person = schoolCandidate(payload.personId);
  const label = {
    found: `捐贈成立「${payload.name?.trim() || ''}」${schoolLevel(payload.levelId)?.name || ''}`, allocateLand: '補設校地與學制', donate: `捐贈 ${payload.amount} 金幣給學校`,
    configure: '設定班級、招生與課程', hire: `聘任 ${person?.name}`, renew: `續聘 ${person?.name}`,
    dismiss: `解除 ${person?.name} 的聘約`, enroll: '辦理新一輪招生'
  }[action];
  queueFarmOperation({ action, schoolAction: true, schoolPayload: payload, actionText: label }, true);
}
function beginResearchAction(action) {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const problem = researchActionError(farm.value, action, selectedPlot.value, selectedCrop.value);
  if (problem) { notice.value = problem; return; }
  queueFarmOperation({ action, plotIndex: selectedPlot.value, cropId: selectedCrop.value, researchAction: true,
    actionText: action === 'buildResearch' ? '興建農業科技研發中心' : `研發${crop(selectedCrop.value)?.name}第 ${researchLevel(farm.value, selectedCrop.value) + 1} 級` }, true);
}
function assignWorker(personId, focus) {
  if (!workerById(personId)?.roles.includes(focus)) return;
  changeWorkerSettings({ workers: farm.value.workers.map(hired => hired.id === personId ? { ...hired, focus } : hired) });
}
function toggleWorkerCrop(cropId, enabled) {
  const ids = new Set(farm.value.workerCropIds || []);
  if (enabled) ids.add(cropId); else ids.delete(cropId);
  changeWorkerSettings({ workerCropIds: [...ids] });
}
async function selectProtagonist(id) {
  if (!ready.value || busy.value || farm.value.protagonistId) return;
  const next = chooseProtagonist(farm.value, id);
  if (!next) return;
  busy.value = true;
  try { await saveFarm(next); notice.value = `已選擇${protagonistById(id).name}。農夫是你的兼職，開始經營吧！`; }
  catch (error) { notice.value = '主角選擇未儲存：' + error.message; }
  finally { busy.value = false; }
}
async function selectFarmGender(gender) {
  if (!ready.value || busy.value || farm.value.gender) return;
  const problem = familyActionError(farm.value, 'chooseGender', gender);
  if (problem) { notice.value = problem; return; }
  busy.value = true;
  try {
    const result = applyFamilyAction(farm.value, 'chooseGender', gender);
    await saveFarm(result.farm);
    notice.value = result.detail + '。接著選擇主角職業。';
  } catch (error) { notice.value = '性別選擇未儲存：' + error.message; }
  finally { busy.value = false; }
}
function beginFamilyAction(action, partnerId = '', hobbyId = '') {
  if (!ready.value || busy.value || quiz.value || visiting.value) return;
  const problem = familyActionError(farm.value, action, partnerId, hobbyId, familyActiveMs.value);
  if (problem) { notice.value = problem; return; }
  const person = familyPartnerById(partnerId || farm.value.courtship?.partnerId || farm.value.spouse?.partnerId);
  const labels = {
    activity: `${FAMILY_HOBBIES.find(item => item.id === hobbyId)?.activity}（${FAMILY_ACTIVITY_COST} 金幣）`,
    meet: `在興趣活動認識${person?.name}`, match: `請相親市場介紹${person?.name}（${FAMILY_MATCH_COST} 金幣）`,
    date: `與${courtshipPartner.value?.name}約會（${FAMILY_DATE_COST} 金幣）`, breakup: `與${courtshipPartner.value?.name}結束交往`,
    propose: `向${courtshipPartner.value?.name}求婚`, marry: `與${courtshipPartner.value?.name}舉辦婚禮（${FAMILY_MARRIAGE_COST} 金幣）`,
    divorce: `與${spouseProfile.value?.name}協議離婚並分產`, child: '迎接新家庭成員',
    familyCareer: '為家人選擇職業與能力', familyWork: '調整家人帶薪排班',
    childMeet: '為成年子女介紹交往對象', childDate: '成年子女約會', childMarry: '成年子女舉行婚禮', childBreakup: '成年子女結束交往'
  };
  queueFarmOperation({ action, partnerId, hobbyId, familyAction: true, actionText: labels[action] || '家庭操作' }, true);
}
function configureFamilyCareer() {
  beginFamilyAction('familyCareer', selectedFamilyMember.value, `${selectedFamilyProfession.value}:${selectedFamilyAbility.value}`);
}
async function reincarnate() {
  if (!ready.value || busy.value || quiz.value || !farm.value.protagonistId) return;
  if (farm.value.coins < REINCARNATION_COST) { notice.value = `轉生需要 ${REINCARNATION_COST} 金幣。`; return; }
  if (governmentBalance.value || farm.value.utilityDebt || relevantLoans.value.length || farm.value.divorceSettlementDue) { notice.value = '請先結清政府借款、水電欠費、同學借款及家庭財產分配，再轉生。'; return; }
  if (!confirm(`轉生需 ${REINCARNATION_COST} 金幣，整座農場會從頭開始，土地、設施、庫存及金幣都會重置。學習成績保留。確定嗎？`)) return;
  busy.value = true;
  try {
    const startVillage = FARM_DISTRICTS[0].villages[Math.floor(Math.random() * XINHUA_VILLAGE_IDS.length)].id;
    await saveFarm(freshFarm(startVillage));
    chooseVillage(startVillage);
    notice.value = '轉生完成。請選擇新的主角，重新開始農場。';
  } catch (error) { notice.value = '轉生未完成：' + error.message; }
  finally { busy.value = false; }
}
function beginDisasterPrep() {
  if (busy.value || quiz.value || farm.value.disasterShield || farm.value.coins < DISASTER_PREP_COST) return;
  queueFarmOperation({ action: 'prepareDisaster', eventAction: true, actionText: `防災整備（${DISASTER_PREP_COST} 金幣）` }, true);
}
let checkingAccess = false, lastAccessCheckAt = 0;
async function checkFarmAccess() {
  if (!student.value?.class || checkingAccess) return true;
  checkingAccess = true;
  try {
    const { data, error } = await db.from('happy_farm_lesson_access').select('mode,units').eq('class_name', student.value.class).maybeSingle();
    if (error && !farmPolicyTableMissing(error)) throw error;
    lastAccessCheckAt = Date.now();
    if (!farmLessonAllowed(data, lesson)) {
      ready.value = false;
      quiz.value = null;
      notice.value = '導師目前沒有開放本單元的開心農場。請返回首頁選擇其他單元。';
      return false;
    }
    return true;
  } catch (error) {
    ready.value = false;
    quiz.value = null;
    notice.value = '無法確認導師的農場單元設定：' + error.message;
    return false;
  } finally { checkingAccess = false; }
}
async function settleFarmEvent() {
  if (!ready.value || busy.value || quiz.value || visiting.value) return;
  const result = settleSeasonalEvent(farm.value, Date.now());
  if (!result) return;
  busy.value = true;
  try { await saveFarm(result.farm); notice.value = `農場日報：${result.detail}`; }
  catch (error) { notice.value = '農場事件尚未結算：' + error.message; }
  finally { busy.value = false; }
}
async function toggleNoSowPlot() {
  if (!ready.value || busy.value || quiz.value || visiting.value || selectedSite.value?.facility || selectedPlot.value < 0
    || !farm.value.ownedVillages?.includes(farm.value.plotVillages[selectedPlot.value])) return;
  const plots = new Set(farm.value.noSowPlots || []);
  if (plots.has(selectedPlot.value)) plots.delete(selectedPlot.value);
  else plots.add(selectedPlot.value);
  busy.value = true;
  try {
    await saveFarm({ ...farm.value, noSowPlots: [...plots] });
    notice.value = plots.has(selectedPlot.value) ? '此地已標為保留地，人力不會自動處理或播種。' : '已取消保留地標示，可再次播種。';
  } catch (error) { notice.value = '地格標示未儲存：' + error.message; }
  finally { busy.value = false; }
}
function beginDemolition(mode) {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const problem = demolitionError(farm.value, selectedPlot.value, mode);
  if (problem) { notice.value = problem; return; }
  const actionText = `拆除${plotLabel(selectedPlot.value)}的${mode === 'solar' ? '光電板' : facilityLabel(selectedSite.value)}（${demolitionCost(selectedSite.value, mode)} 金幣）`;
  queueFarmOperation({ action: 'demolish', demolition: true, mode, plotIndex: selectedPlot.value, actionText }, true);
}
function beginUtilityPayment() {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const problem = utilityPaymentError(farm.value);
  if (problem) { notice.value = problem; return; }
  queueFarmOperation({ action: 'payUtilities', utilityAction: true, actionText: '繳交未付水電費' }, true);
}
async function settleUtilities() {
  if (!ready.value || busy.value || quiz.value || visiting.value || settlingUtilities.value || utilitySlot(Date.now()) <= farm.value.utilityLastSlot
    || Date.now() - lastUtilityFailureAt < 60000) return;
  settlingUtilities.value = true;
  busy.value = true;
  try {
    const result = settleUtilityBill(farm.value, Date.now());
    if (result) { await saveFarm(result.farm); notice.value = `水電結算：${result.detail}。`; }
  } catch (error) { lastUtilityFailureAt = Date.now(); notice.value = '水電帳單尚未結算：' + error.message; }
  finally { busy.value = false; settlingUtilities.value = false; }
}
async function runWorkerRound() {
  if (!ready.value || busy.value || quiz.value || visiting.value || !(farm.value.workers.length || familyWorkerCount.value) || !farm.value.workerAuto) return;
  busy.value = true;
  try {
    const state = { ...farm.value, workerActiveMs: workerActiveMs.value, familyActiveMs: familyActiveMs.value };
    const shiftComplete = workerActiveMs.value >= WORKER_SHIFT_MS && (state.workerRunCount || 0) > 0;
    const result = shiftComplete ? endWorkerShift(state, Date.now()) : runWorkerBatch(state, Date.now());
    if (!result) return;
    await saveFarm(result.farm);
    if (shiftComplete) notice.value = '人力已結束本輪值班，現在自動休息 30 分鐘；休息後會自動開始下一輪。';
  } catch (error) { notice.value = '外包作業未完成：' + error.message; }
  finally { busy.value = false; }
}
function beginBusinessAction(action) {
  if (!ready.value || visiting.value || busy.value || quiz.value) return;
  const plotIndex = selectedPlot.value;
  const businessId = selectedBusiness.value;
  const cropId = selectedCrop.value;
  const productKind = marketProductKind.value;
  const problem = businessActionError(farm.value, action, plotIndex, businessId, cropId, productKind, Date.now());
  if (problem) { notice.value = problem; return; }
  if (action === 'collectBusiness' && businessId === 'school') {
    if (!schoolLesson.value) { schoolFeedback.value = '課程暫時無法載入，請重新整理頁面。'; return; }
    if (schoolAnsweredSlot.value !== revenueSlot.value || schoolAnswer.value !== schoolLesson.value.answer) {
      schoolFeedback.value = schoolAnsweredSlot.value === revenueSlot.value ? '再想一想：' + schoolLesson.value.explanation : '請先完成本輪農業小測驗。';
      return;
    }
    schoolFeedback.value = '答對農業小測驗！' + schoolLesson.value.explanation;
  }
  const actionText = action === 'buildBusiness' ? `在${plotLabel(plotIndex)}建造${business.value.name}`
    : action === 'collectBusiness' ? `經營${plotLabel(plotIndex)}的${business.value.name}`
      : `在${plotLabel(plotIndex)}直銷超市販售${productKind === 'fresh' ? crop(cropId)?.name : CROP_PRODUCTS[cropId]}`;
  queueFarmOperation({ action, plotIndex, businessId, cropId, productKind, businessAction: true, actionText }, action === 'buildBusiness');
}
function financeProblem(action, loan = null) {
  if (!ready.value || visiting.value || busy.value || quiz.value) return '目前無法操作資金。';
  if (action === 'borrowGovernment' || action === 'repayGovernment') return governmentLoanError(farm.value, action);
  if (student.value?.isAnon) return '請先以學生帳號登入。';
  if (loanError.value) return loanError.value;
  if (action === 'request') {
    if (openBorrowing.value) return '你已有一筆待處理或未還清的同學借款。';
    if (!chosenClassmateId.value || !classmates.value.some(person => person.student_id === chosenClassmateId.value)) return '請先選擇同班同學。';
    if (loanPlot.value < 0) return '請先保留一塊空地作為抵押。';
  }
  if (action !== 'request' && !loan) return '找不到借款。';
  return '';
}
function beginFinanceAction(action, loan = null) {
  const problem = financeProblem(action, loan);
  if (problem) { notice.value = problem; return; }
  const labels = {
    borrowGovernment: `向政府借 ${GOVERNMENT_LOAN_AMOUNT} 金幣（零利率）`,
    repayGovernment: '償還政府借款',
    request: `向${classmateName(chosenClassmateId.value)}申請借 ${loanAmount.value} 金幣`,
    approve: `同意借出 ${loan?.principal} 金幣`,
    reject: '拒絕同學借款申請',
    cancel: '撤銷我的借款申請',
    repay: `償還同學 ${loan ? loan.principal + loan.interest : ''} 金幣`
  };
  quiz.value = { ...buildQuiz(), action, financeAction: true, loanId: loan?.id || null,
    targetId: chosenClassmateId.value, amount: loanAmount.value, plotIndex: loanPlot.value,
    actionText: labels[action] };
  answer.value = '';
  quizError.value = '';
}
async function applyFinanceQuiz(q) {
  if (q.action === 'borrowGovernment' || q.action === 'repayGovernment') {
    const result = applyGovernmentLoan(farm.value, q.action, Date.now());
    await saveFarm(result.farm, { source: 'financing', label: '借款與還款（不計營業損益）', detail: result.detail });
    return result;
  }
  const { data, error } = await db.rpc('happy_farm_loan_action', {
    p_actor_id: studentId.value, p_action: q.action, p_loan_id: q.loanId,
    p_target_id: q.action === 'request' ? q.targetId : null,
    p_amount: q.action === 'request' ? q.amount : null,
    p_plot_index: q.action === 'request' ? q.plotIndex : null
  });
  if (error) throw error;
  await Promise.all([loadFarm(), loadLoans()]);
  return { detail: data?.detail || '借款操作完成' };
}
function operationProblem(q) {
  return q.eventAction ? (farm.value.disasterShield ? '防災措施已啟用。' : farm.value.coins < DISASTER_PREP_COST ? '金幣不足。' : '')
    : q.financeAction ? (q.action === 'borrowGovernment' || q.action === 'repayGovernment' ? governmentLoanError(farm.value, q.action) : loanError.value)
    : q.ownerId ? visitProblem(q.action, q.plotIndex)
      : q.demolition ? demolitionError(farm.value, q.plotIndex, q.mode)
      : q.utilityAction ? utilityPaymentError(farm.value)
      : q.familyAction ? familyActionError(farm.value, q.action, q.partnerId, q.hobbyId, familyActiveMs.value)
      : q.schoolAction ? schoolActionError(farm.value, q.action, q.schoolPayload, Date.now())
      : q.researchAction ? researchActionError(farm.value, q.action, q.plotIndex, q.cropId)
      : q.specialistAction ? specialistActionError(farm.value, q.action, q.personId, Date.now())
      : q.workerAction ? workerActionError(farm.value, q.action, q.personId, q.period)
      : q.animalId ? animalActionError(farm.value, q.action, q.animalId, q.careId, Date.now(), q.plotIndex)
        : q.businessAction ? businessActionError(farm.value, q.action, q.plotIndex, q.businessId, q.cropId, q.productKind, Date.now())
          : q.economy ? economyActionError(farm.value, q.action, q.plotIndex, q.cropId, q.mode, Date.now())
            : farmActionError(farm.value, q.action, q.cropId, q.plotIndex, Date.now(), q.villageId, q.quantity ?? 1);
}
async function applyOperation(q) {
  const problem = operationProblem(q);
  if (problem) throw new Error(problem);
  let result;
  if (q.eventAction) { result = prepareDisaster(farm.value); await saveFarm(result.farm); }
  else if (q.financeAction) result = await applyFinanceQuiz(q);
  else if (q.ownerId) result = await applyVisit(q);
  else if (q.demolition) {
    result = applyDemolition(farm.value, q.plotIndex, q.mode);
    await saveFarm(result.farm, { plotIndex: q.plotIndex, detail: result.detail });
    selectFarmPlot({ index: q.plotIndex, plot: farm.value.plots[q.plotIndex] });
  }
  else if (q.utilityAction) {
    result = payUtilityDebt(farm.value);
    await saveFarm(result.farm);
  }
  else if (q.workerAction) {
    result = applyWorkerAction(farm.value, q.action, q.personId, q.period, Date.now());
    await saveFarm(result.farm, { source: 'staff', label: '人力薪資與契約', detail: result.detail });
  }
  else if (q.specialistAction) {
    result = applySpecialistAction(farm.value, q.action, q.personId, Date.now());
    await saveFarm(result.farm, { source: 'specialists', label: '高階專業服務', detail: result.detail });
  }
  else if (q.schoolAction) {
    result = applySchoolAction(farm.value, q.action, q.schoolPayload, Date.now());
    await saveFarm(result.farm, q.action === 'found' || q.action === 'donate'
      ? { source: 'foundation-donation', label: '捐贈學校法人（不計農場營業損益）', detail: result.detail }
      : { detail: result.detail });
    if (['found', 'allocateLand', 'configure'].includes(q.action)) syncSchoolFields();
    if (['found', 'allocateLand'].includes(q.action)) chooseVillage(farm.value.plotVillages[q.schoolPayload.plotIndex]);
  }
  else if (q.researchAction) {
    result = applyResearchAction(farm.value, q.action, q.plotIndex, q.cropId, Date.now());
    await saveFarm(result.farm, { source: 'farm-research', label: '農業科技研發', detail: result.detail });
    if (q.action === 'buildResearch') selectFarmPlot({ index: q.plotIndex, plot: farm.value.plots[q.plotIndex] });
  }
  else if (q.familyAction) {
    result = applyFamilyAction({ ...farm.value, familyActiveMs: familyActiveMs.value }, q.action, q.partnerId, q.hobbyId, familyActiveMs.value, Date.now());
    await saveFarm(result.farm);
  }
  else if (q.animalId) {
    result = applyAnimalAction(farm.value, q.action, q.animalId, q.careId, Date.now(), q.plotIndex);
    await saveFarm(result.farm, { plotIndex: Number.isInteger(q.plotIndex) && q.plotIndex >= 0 ? q.plotIndex : farm.value.animals?.[q.animalId]?.plotIndex, detail: result.detail });
    if (q.action === 'buyAnimal' || q.action === 'placeAnimal') {
      chooseVillage(farm.value.plotVillages[q.plotIndex]);
      selectFarmPlot({ index: q.plotIndex, plot: farm.value.plots[q.plotIndex] });
    }
  } else if (q.economy) {
    result = applyEconomyAction(farm.value, q.action, q.plotIndex, q.cropId, q.mode, Date.now());
    await saveFarm(result.farm, { plotIndex: q.plotIndex, detail: result.detail,
      ...(q.action === 'sellProcessed' ? { source: 'crop-inventory', label: '種苗與作物庫存' } : {}) });
  } else if (q.businessAction) {
    result = applyBusinessAction(farm.value, q.action, q.plotIndex, q.businessId, q.cropId, q.productKind, Date.now());
    if (['collectBusiness', 'sellAtMarket'].includes(q.action)) {
      const staffed = shopStaff(farm.value, q.businessId, Date.now(), q.plotIndex);
      if (staffed) addWorkerHistory(result.farm, { at: Date.now(), personId: staffed.id, group: 'service', detail: `協助玩家操作：${result.detail}` });
    }
    await saveFarm(result.farm, { plotIndex: q.plotIndex, detail: result.detail });
  } else {
    result = applyFarmAction(farm.value, q.action, q.cropId, q.plotIndex, Date.now(), q.villageId, q.quantity ?? 1);
    if (q.action === 'harvest') {
      const sale = sellHarvestAtBestPrice(result.farm, Date.now(), () => true, q.cropId, 'fresh');
      if (sale) result = { farm: sale.farm, detail: `${result.detail}；${sale.detail}` };
    }
    await saveFarm(result.farm, { plotIndex: q.plotIndex, detail: result.detail,
      ...(q.action === 'buy' || q.action === 'sell' ? { source: 'crop-inventory', label: '種苗與作物庫存' }
        : q.action === 'buyLand' || q.action === 'sellLand' ? { source: 'land', label: '農地買賣' } : {}) });
    if (['buyLand', 'sellLand', 'expand'].includes(q.action)) chooseVillage(q.villageId);
  }
  if (pulseIcon(q.action)) lastAction.value = { plotIndex: q.plotIndex, action: q.action, at: Date.now() };
  return result;
}
async function performWithoutQuiz(operation) {
  if (busy.value || quiz.value) return;
  busy.value = true;
  try {
    const result = await applyOperation(operation);
    notice.value = `已完成「${operation.actionText}」${result?.detail ? '：' + result.detail : ''}。`;
    now.value = Date.now();
  } catch (error) {
    notice.value = '操作未完成：' + error.message;
  } finally { busy.value = false; }
}
async function submitAnswer() {
  if (!ready.value || !quiz.value || busy.value || !String(answer.value).trim()) return;
  busy.value = true;
  const q = quiz.value;
  const correct = answer.value.trim().toLocaleLowerCase() === q.target.toLocaleLowerCase();
  try {
    let result = null;
    if (correct) result = await applyOperation(q);
    if (correct) session.value.correct.push(q.word.en_us);
    else session.value.wrong.push(q.word.en_us);
    rememberSession();
    await syncRecord();
    rememberRoutineQuiz();
    notice.value = correct
      ? '答對 ' + q.word.en_us + '！已完成「' + q.actionText + '」' + (q.action === 'harvest' || q.action === 'sell' || q.ownerId || q.animalId || q.economy || q.businessAction || q.financeAction || q.workerAction || q.familyAction || q.schoolAction || q.researchAction || q.demolition || q.utilityAction || q.eventAction ? '，' + result.detail : '') + '。'
      : '答錯了：' + q.word.en_us + '＝' + q.word.zh_tw + '。這次沒有執行「' + q.actionText + '」。';
    quiz.value = null;
    now.value = Date.now();
  } catch (error) {
    notice.value = '操作未完成：' + error.message + '。請重試儲存或重新作答。';
    quizError.value = notice.value;
  } finally { busy.value = false; }
}
async function finishVisit() {
  if (busy.value || quiz.value) return;
  busy.value = true;
  try {
    await syncRecord();
    if (saveNotice.value.startsWith('成績尚未同步')) return;
    try { sessionStorage.removeItem(sessionKey.value); } catch { /* Browser storage may be unavailable. */ }
    await navigateTo('/');
  } finally { busy.value = false; }
}

onMounted(async () => {
  lastFarmTickAt = Date.now();
  lastFarmInteractionAt = Date.now();
  window.addEventListener('pointerdown', rememberFarmInteraction);
  window.addEventListener('keydown', rememberFarmInteraction);
  window.addEventListener('touchstart', rememberFarmInteraction);
  try {
    const saved = Number(localStorage.getItem(routineQuizKey.value) || 0);
    if (saved > 0 && saved <= Date.now()) lastRoutineQuizAt.value = saved;
  } catch { /* Storage may be unavailable. */ }
  clock = window.setInterval(() => {
    now.value = Date.now();
    const elapsed = Math.min(1500, Math.max(0, now.value - lastFarmTickAt));
    lastFarmTickAt = now.value;
    if (ready.value && farm.value.gender && farm.value.protagonistId && document.visibilityState === 'visible'
      && now.value - lastFarmInteractionAt <= 60000 && !visiting.value) {
      familyActiveMs.value += elapsed;
      if (farm.value.workerAuto) workerActiveMs.value = Math.min(WORKER_SHIFT_MS, workerActiveMs.value + elapsed);
    }
    if (ready.value && now.value - lastAccessCheckAt > 60000) void checkFarmAccess();
    if (ready.value && !busy.value && !quiz.value && farm.value.lastEventDay !== farmDay(now.value).date) void settleFarmEvent();
    if (ready.value && !busy.value && !quiz.value && utilitySlot(now.value) > farm.value.utilityLastSlot) void settleUtilities();
    if (ready.value && farm.value.workerAuto && (farm.value.workers.length || familyWorkerCount.value) && !busy.value && !quiz.value
      && (workerActiveMs.value >= WORKER_SHIFT_MS || !(farm.value.workerRunCount || 0)
        || workerActiveMs.value - (farm.value.workerLastActionMs || 0) >= WORKER_ACTION_INTERVAL_MS)) void runWorkerRound();
    else if (ready.value && !busy.value && !quiz.value && !visiting.value && ((farm.value.workers.length || familyWorkerCount.value) && !farm.value.workerAuto && workerRestWait.value <= 0
      || !(farm.value.workers.length || familyWorkerCount.value) && (farm.value.workerAuto || farm.value.workerActiveMs || farm.value.workerRestUntil))) void syncWorkerCycle();
    else if (ready.value && farm.value.workerAuto && workerActiveMs.value - (farm.value.workerActiveMs || 0) >= 5 * 60000
      && !busy.value && !quiz.value && now.value - lastWorkerProgressSaveAt >= 30000) {
      lastWorkerProgressSaveAt = now.value;
      void changeWorkerSettings({ workerActiveMs: workerActiveMs.value });
    }
    else if (ready.value && farm.value.gender && familyActiveMs.value - (farm.value.familyActiveMs || 0) >= 5 * 60000
      && !busy.value && !quiz.value && now.value - lastWorkerProgressSaveAt >= 30000) {
      lastWorkerProgressSaveAt = now.value;
      void changeWorkerSettings({ familyActiveMs: familyActiveMs.value });
    }
    if (ready.value && !busy.value && !quiz.value && !settlingLoans.value && !loanError.value
      && loans.value.some(item => item.status === 'active' && Date.parse(item.due_at) <= now.value)) loadLoans(true);
  }, 1000);
  if (!studentId.value) { notice.value = '請先回首頁登入，再開啟個人農場。'; loading.value = false; return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) {
    notice.value = '請從首頁選擇版本、冊數、單元，再進入單字開心農場。';
    loading.value = false; return;
  }
  try {
    if (!await checkFarmAccess()) return;
    const { data, error } = await db.from('vocabularies').select('id,en_us,zh_tw')
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
    if (error) throw error;
    words.value = (data || []).filter(item => String(item.en_us || '').trim() && String(item.zh_tw || '').trim());
    if (words.value.length < 2) { notice.value = '這個單元需要至少兩筆中英對照單字，請改選其他單元。'; return; }
    await loadFarm();
    workerActiveMs.value = farm.value.workerActiveMs || 0;
    familyActiveMs.value = farm.value.familyActiveMs || 0;
    await loadSession();
    const previousNotice = notice.value;
    await Promise.all([loadClassmates(), loadVisitActivity(), loadLoans(true)]);
    ready.value = true;
    if (notice.value === previousNotice) notice.value = '一般操作約每 35 秒問一次單字；建設與購地等重要操作每次都問。';
    await settleUtilities();
    if (farm.value.workerAuto && (farm.value.workers.length || familyWorkerCount.value)) void runWorkerRound();
    else void syncWorkerCycle();
  } catch (error) {
    notice.value = '農場無法載入：' + error.message + '。請確認新專案已執行開心農場 SQL。';
  } finally { loading.value = false; }
});
onUnmounted(() => {
  if (clock) window.clearInterval(clock);
  window.removeEventListener('pointerdown', rememberFarmInteraction);
  window.removeEventListener('keydown', rememberFarmInteraction);
  window.removeEventListener('touchstart', rememberFarmInteraction);
});
</script>

<template>
  <main class="farm-page">
    <header class="farm-header">
      <div><p class="eyebrow">VOCAB HAPPY FARM · 個人農場</p><h1>🌻 單字開心農場</h1><p>{{ lessonLabel }}</p></div>
      <div class="farm-top-actions"><NuxtLink to="/" class="quiet-link">← 返回首頁</NuxtLink><button v-if="ready" type="button" @click="finishVisit" :disabled="busy">完成本次學習</button></div>
    </header>
    <div class="feedback">
      <p class="notice" role="status" aria-live="polite">{{ notice }}</p>
      <p v-if="saveNotice.startsWith('成績尚未同步')" class="save-notice" role="alert">{{ saveNotice }} <button type="button" @click="syncRecord">重試同步</button></p>
    </div>
    <template v-if="ready">
      <section class="status-bar" aria-label="農場狀態">
        <button type="button" class="hero-chip" @click="activePanel = 'events'">{{ protagonist?.icon || '🎭' }} {{ protagonist?.name || '選主角' }} · {{ today.season }}</button>
        <div><span>🪙 我的金幣</span><strong>{{ farm.coins }}</strong><button v-if="!visiting" type="button" class="utility-shortcut" @click="activePanel = 'economy'; economySection = 'utilities'">💧 水電{{ farm.utilityDebt ? `欠 ${farm.utilityDebt}` : '' }}</button></div>
        <div><span>🌾 累計收成</span><strong>{{ farm.harvested }}</strong></div>
        <div><span>🎒 倉庫作物</span><strong>{{ totalProduce }}</strong></div>
        <div><span>📖 本次答題</span><strong>{{ session?.correct.length || 0 }} 對／{{ session?.wrong.length || 0 }} 錯</strong></div>
        <NuxtLink :to="{ path: '/leaderboard', query: { game: '單字開心農場', version: lesson.version, volume: lesson.volume, unit: lesson.unit } }">🏆 英雄榜</NuxtLink>
        <NuxtLink :to="{ path: '/history', query: { game: '單字開心農場' } }">📊 學習紀錄</NuxtLink>
      </section>
      <div class="farm-layout">
        <section v-if="activePanel === 'animals' && !visiting" class="animal-field" aria-label="我的養殖區">
          <div class="animal-scene"><span>{{ today.weatherIcon }} {{ today.weatherName }}</span><strong>🐾 我的養殖區</strong><span>{{ ownedAnimals }}/{{ FARM_ANIMALS.length }} 種已入住</span></div>
          <nav class="animal-categories"><button v-for="category in animalCategories" :key="category.id" type="button" :class="{ active: animalCategory === category.id }" @click="animalCategory = category.id">{{ category.label }}</button></nav>
          <div class="animal-grid">
            <button v-for="item in visibleAnimals" :key="item.id" type="button" class="animal-pen"
              :class="{ chosen: selectedAnimalId === item.id, owned: !!farm.animals?.[item.id], productive: animalCareDone(item, farm.animals?.[item.id]) && now >= farm.animals[item.id].readyAt }"
              :aria-pressed="selectedAnimalId === item.id" :aria-label="item.name + (farm.animals?.[item.id] ? '，已入住，' + animalTimeLabel(farm.animals[item.id]) : '，尚未入住')"
              @click="selectedAnimalId = item.id">
              <span class="animal-sprite" aria-hidden="true">{{ item.icon }}</span>
              <strong>{{ item.name }}</strong>
              <small v-if="farm.animals?.[item.id]">{{ animalLocation(farm.animals[item.id]) }}</small>
              <small v-else>🪙 {{ item.price }} 金幣入住</small>
              <span class="animal-pen-product">{{ item.productIcon }} {{ item.product }}</span>
            </button>
          </div>
          <p class="animal-scene-note">農舍或魚塭各佔一塊地；每種動物有不同設備與照護任務。</p>
        </section>
        <section v-else class="farm-field" aria-label="我的農地">
          <div class="scene-sky"><span>{{ today.weatherIcon }} {{ today.weatherName }}</span><span>{{ today.season }}</span><span>{{ today.weekend ? '週末遊客較多' : '平日農場' }}</span></div>
          <div class="farm-barn">🏠 <span>{{ visiting ? visiting.hidden_name + ' 的農場' : '我的農場' }} · {{ villageName(selectedVillage) }}</span></div>
          <div class="land-layout">
            <div class="map-panel">
              <div class="map-heading"><strong>臺南市{{ selectedDistrict }} · {{ villages.length }} 里</strong><span>{{ visiting ? '同學已擁有 ' + viewFarm.ownedVillages.length + ' 里' : '已擁有 ' + farm.ownedVillages.length + ' 里' }}</span></div>
              <div class="district-picker"><label for="district-select">區域地圖</label><select id="district-select" :value="selectedDistrict" @change="chooseDistrict($event.target.value)"><option v-for="district in FARM_DISTRICTS" :key="district.name" :value="district.name" :disabled="district.name !== '新化區' && !neighborOpen">{{ district.name }}{{ district.name !== '新化區' && !neighborOpen ? '（尚未解鎖）' : '' }}</option></select></div>
              <p class="unlock-hint">{{ neighborOpen ? '✅ 已解鎖鄰區，可購買與出售各里的農地' : '🔒 買齊新化區 16 里後解鎖鄰區（' + xinhuaOwned + '/16）' }}</p>
              <svg class="village-map" :viewBox="currentMap.viewBox" role="img" :aria-label="selectedDistrict + '各里地圖；下方可點選里名'">
                <path v-for="item in villages" :key="item.id" :d="item.path" class="village-shape"
                  :class="{ owned: viewFarm.ownedVillages.includes(item.id), home: viewFarm.homeVillage === item.id, selected: selectedVillage === item.id }"
                  tabindex="0" role="button" :aria-label="item.name + (viewFarm.ownedVillages.includes(item.id) ? '，已擁有' : '，尚未購買')"
                  @click="chooseVillage(item.id)" @keydown.enter.prevent="chooseVillage(item.id)" @keydown.space.prevent="chooseVillage(item.id)"><title>{{ item.name }}</title></path>
                <path :d="currentMap.outline" class="district-outline" />
              </svg>
              <div v-if="selectedDistrict === '新化區'" class="village-list" aria-label="選擇新化區的里">
                <button v-for="item in villages" :key="item.id" type="button" :class="{ owned: viewFarm.ownedVillages.includes(item.id), home: viewFarm.homeVillage === item.id, selected: selectedVillage === item.id }" :aria-pressed="selectedVillage === item.id" @click="chooseVillage(item.id)">{{ item.name }}</button>
              </div>
              <select v-else class="neighbor-village-picker" :value="selectedVillage" :aria-label="'選擇' + selectedDistrict + '的里'" @change="chooseVillage($event.target.value)"><option v-for="item in villages" :key="item.id" :value="item.id">{{ item.name }}{{ viewFarm.ownedVillages.includes(item.id) ? ' · 已擁有' : '' }}</option></select>
              <a class="map-source" href="https://maps.nlsc.gov.tw/pro/download.jsp" target="_blank" rel="noopener">村里界資料：國土測繪中心（2026）</a>
              <a class="map-source" href="https://data.tainan.gov.tw/Resource/46e014c9-0e5a-4734-9b98-23ab163e6517" target="_blank" rel="noopener">農地格數參考：臺南市政府 115 年 8 月區面積與村里界推估</a>
            </div>
            <div class="village-field">
              <p class="village-heading"><strong>{{ villageName(selectedVillage) }}</strong><span title="遊戲上限：基本 4 格，每約 0.5 平方公里增加 1 格，最高 30 格；舊存檔已擴建的地格保留">約 {{ villageAreaKm2(selectedVillage).toFixed(2) }} km² · {{ ownedVillage ? `${visiblePlots.length} / ${villagePlotLimit(viewFarm, selectedVillage)} 格農地` : '尚未購買' }}</span></p>
              <div v-if="!visiting" class="village-land-actions">
                <template v-if="!ownedVillage"><button type="button" :disabled="!can('buyLand')" @click="beginAction('buyLand')">🏡 答題購買此里 · {{ villageCost }} 金幣（取得 4 格）</button><small v-if="farm.coins < villageCost">還需 {{ villageCost - farm.coins }} 金幣</small></template>
                <template v-else-if="visiblePlots.length < villagePlotCapacity(selectedVillage)"><button type="button" :disabled="!can('expand')" @click="beginAction('expand')">🪵 答題擴建 +1 格 · {{ expansionCost }} 金幣</button><small v-if="farm.coins < expansionCost">還需 {{ expansionCost - farm.coins }} 金幣</small></template>
                <small v-else>此里農地已達 {{ villagePlotLimit(viewFarm, selectedVillage) }} 格上限</small>
              </div>
              <div v-if="ownedVillage" class="field-grid">
                <button v-for="(entry, localIndex) in visiblePlots" :key="entry.index" type="button" class="plot"
                  :class="{ chosen: selectedPlot === entry.index, campus: activePanel === 'school' && schoolLandPreview.includes(entry.index), mature: entry.plot?.crop && !secondsLeft(entry.plot), facility: !!entry.plot?.facility, reserved: !visiting && farm.noSowPlots?.includes(entry.index) }"
                  :aria-pressed="selectedPlot === entry.index" :aria-label="villageName(selectedVillage) + '第 ' + (localIndex + 1) + ' 塊地：' + (entry.plot?.facility ? facilityLabel(entry.plot) : entry.plot?.crop ? crop(entry.plot.crop)?.name + plotStage(entry.plot) : viewFarm.noSowPlots?.includes(entry.index) ? '保留地，禁止播種' : '空地')"
                  @click="selectFarmPlot(entry)">
                  <span class="plot-number">{{ localIndex + 1 }}</span><span v-if="entry.plot?.facility" class="facility-art">{{ entry.plot.facility === 'animal' ? animal(entry.plot.animalId)?.icon : entry.plot.facility === 'private_school' ? '🏫' : entry.plot.facility === 'foundation_library' ? '📚' : entry.plot.facility === 'foundation_hospital' ? '🏥' : entry.plot.facility === 'foundation_art_museum' ? '🎨' : entry.plot.facility === 'foundation_museum' ? '🏛️' : entry.plot.facility === 'agri_research' ? '🧪' : entry.plot.facility === 'factory' ? '🏭' : entry.plot.facility === 'tourism' ? '🎟️' : entry.plot.facility === 'migrant_dorm' ? '🛏️' : entry.plot.facility === 'farmhouse' ? '🏡' : entry.plot.facility === 'loan_hold' ? '🔒' : businessById(entry.plot.facility)?.icon || '☀️' }}</span><FarmCrop v-else class="plot-plant" :crop="entry.plot?.crop || ''" :stage="plotStage(entry.plot)" />
                  <span class="plot-name">{{ entry.plot?.facility ? facilityLabel(entry.plot) : entry.plot?.crop ? crop(entry.plot.crop)?.name : viewFarm.noSowPlots?.includes(entry.index) ? '🚫 保留地' : '空地' }}</span>
                  <span class="plot-progress">{{ entry.plot?.facility ? (entry.plot.solar ? '☀️ 發電中' : '設施') : entry.plot?.crop ? timeLabel(entry.plot) : viewFarm.noSowPlots?.includes(entry.index) ? '禁止播種／人力跳過' : '可播種／建設' }}</span>
                  <span v-if="entry.plot?.crop" class="plot-care" aria-hidden="true"><span v-for="status in careStatus(entry.plot)" :key="status.key" :class="status.state" :title="status.text">{{ status.icon }}{{ status.state === 'done' ? '✓' : status.state === 'urgent' ? '!' : '·' }}</span></span>
                  <span class="plot-alert">{{ entry.plot?.stolen ? '🧺' : '' }}</span>
                  <span v-if="lastAction?.plotIndex === entry.index && now - lastAction.at < 1800" class="action-pop" aria-hidden="true">{{ pulseIcon(lastAction.action) }}</span>
                </button>
                <div v-for="n in Math.min(3, Math.max(0, villagePlotCapacity(selectedVillage) - visiblePlots.length))" :key="'locked-' + n" class="plot locked"><span>🔒</span><small>待擴建</small></div>
              </div>
              <small v-if="ownedVillage && villagePlotCapacity(selectedVillage) > visiblePlots.length + 3" class="more-plots">尚可擴建 {{ villagePlotCapacity(selectedVillage) - visiblePlots.length }} 格；擴建後才會顯示新地格。</small>
              <p v-if="!ownedVillage" class="unowned-note">{{ visiting ? '同學尚未購買這個里的農地。' : '尚未購買此里；可在上方購地。' }}</p>
            </div>
          </div>
        </section>
        <aside class="farm-controls">
          <div v-if="ownedVillage && !visiting && selectedVillage !== farm.homeVillage && activePanel !== 'animals'" class="land-buy-card"><strong>🏡 {{ villageName(selectedVillage) }}</strong><span>收成此里作物後，可售地獲得 {{ villageRefund }} 金幣</span><button type="button" :disabled="!can('sellLand')" @click="beginAction('sellLand')">答題出售農地</button></div>
          <nav class="panel-tabs" aria-label="農場主要操作">
            <button type="button" :class="{ active: productionPanel }" :disabled="!!visiting" @click="activePanel = 'tools'">🌱 生產</button>
            <button type="button" :class="{ active: activePanel === 'economy' }" :disabled="!!visiting" @click="activePanel = 'economy'">🏪 經營</button>
            <button type="button" :class="{ active: activePanel === 'finance' }" :disabled="!!visiting" @click="activePanel = 'finance'">💰 資金</button>
            <button type="button" :class="{ active: activePanel === 'professionals' }" :disabled="!!visiting" @click="activePanel = 'professionals'">📊 專業顧問</button>
            <button type="button" :class="{ active: activePanel === 'school' }" :disabled="!!visiting" @click="activePanel = 'school'">🏫 私立學校</button>
            <button type="button" :class="{ active: activePanel === 'civic' }" :disabled="!!visiting" @click="activePanel = 'civic'">🏛️ 公益法人</button>
            <button type="button" :class="{ active: activePanel === 'family' }" :disabled="!!visiting" @click="activePanel = 'family'">💞 家庭</button>
            <button type="button" :class="{ active: activePanel === 'events' }" :disabled="!!visiting" @click="activePanel = 'events'">🌀 事件</button>
            <button type="button" :class="{ active: activePanel === 'visitors' }" @click="activePanel = 'visitors'">🏘️ 同學</button>
          </nav>
          <nav v-if="productionPanel && !visiting" class="panel-subtabs" aria-label="生產項目">
            <button type="button" :class="{ active: activePanel === 'tools' }" @click="activePanel = 'tools'">🧤 種植照護</button>
            <button type="button" :class="{ active: activePanel === 'shop' }" @click="activePanel = 'shop'">🛒 種苗與倉庫</button>
            <button type="button" :class="{ active: activePanel === 'animals' }" @click="activePanel = 'animals'">🐾 動物養殖</button>
            <button type="button" :class="{ active: activePanel === 'workers' }" @click="activePanel = 'workers'">👷 人力仲介</button>
          </nav>
          <p v-if="!visiting" class="quiz-cadence">{{ routineQuizSeconds ? `一般操作可直接進行；約 ${routineQuizSeconds} 秒後再問單字。` : '下一次一般操作會問單字。' }}購地、擴建及建設設施等重要操作每次都會問。</p>
          <section v-if="activePanel === 'tools' && !visiting && ownedVillage" class="tool-card">
            <h2>🧤 {{ villageName(selectedVillage) }} · 第 {{ visiblePlots.findIndex(item => item.index === selectedPlot) + 1 }} 塊田</h2>
            <p>{{ selectedSite?.facility ? facilityLabel(selectedSite) + ' · 這塊地已用於設施' : selected ? crop(selected.crop)?.name + ' · ' + plotStage(selected) : '空地 · 選擇種苗後即可播種' }}</p>
            <div v-if="selected" class="care-detail" aria-label="這塊田的照料狀態"><span v-for="status in careStatus(selected)" :key="status.key" :class="status.state">{{ status.icon }} {{ status.text }}</span></div>
            <label for="crop-select">目前種苗 · {{ crop(selectedCrop)?.name }}適季 {{ cropSeasonLabel(crop(selectedCrop)) }}</label>
            <select id="crop-select" v-model="selectedCrop"><option v-for="item in FARM_CROPS" :key="item.id" :value="item.id">{{ item.icon }} {{ item.name }}（剩 {{ farm.seeds[item.id] || 0 }}；{{ cropInSeason(item, now) ? '適季' : '非適季' }}）</option></select>
            <div class="tool-grid">
              <button type="button" :disabled="!can('plant')" @click="beginAction('plant')">🌱 播種</button>
              <button type="button" :disabled="!can('water')" @click="beginAction('water')">💧 澆水</button>
              <button type="button" :disabled="!can('fertilize')" @click="beginAction('fertilize')">✨ 施肥 {{ FARM_FERTILIZER_COST }} 金幣</button>
              <button type="button" :disabled="!can('weed')" @click="beginAction('weed')">🌾 除草</button>
              <button type="button" :disabled="!can('pest')" @click="beginAction('pest')">🐛 除蟲</button>
              <button type="button" :disabled="!can('harvest')" @click="beginAction('harvest')">🧺 收成</button>
            </div>
            <button type="button" class="plot-reserve-button" :disabled="busy || !!quiz || !!selectedSite?.facility" @click="toggleNoSowPlot()">{{ farm.noSowPlots?.includes(selectedPlot) ? '✅ 取消保留地標示' : '🚫 標為保留地（禁止播種，人力跳過）' }}</button>
            <p class="help">適季播種多收 1 份；非適季生長較慢且少收 1 份。澆水、施肥與除蟲可保住收成。</p>
          </section>
          <section v-if="activePanel === 'shop' && !visiting" class="shop-card">
            <h2>🛒 種苗店與倉庫 <small>新化五寶：鳳梨、麻竹筍、地瓜、橄欖、胡麻 · 新增南部常見作物依<a href="https://fae.moa.gov.tw/map/county_agri.php" target="_blank" rel="noopener noreferrer">農業部農產地圖</a>選取；月份、售價為遊戲設定。</small></h2>
            <div class="shop-list"><div v-for="item in FARM_CROPS" :key="item.id" class="shop-row">
              <div><strong>{{ item.icon }} {{ item.name }}</strong><small>{{ item.growMinutes }} 分鐘成熟 · 種苗 {{ item.seed }} 金幣/份 · 售價 {{ item.sale }} 金幣/個</small><small>{{ cropInSeason(item, now) ? '✅ 本季適種' : '🌿 非適季' }}（{{ cropSeasonLabel(item) }}）</small>
                <div class="crop-stock"><span>🌱 種苗 <strong>{{ farm.seeds[item.id] || 0 }}</strong> 份</span><span>🧺 可賣作物 <strong>{{ farm.produce[item.id] || 0 }}</strong> 個</span><span>🏭 加工品 <strong>{{ farm.processedProduce?.[item.id] || 0 }}</strong> 份</span></div>
              </div>
              <div class="seed-purchase"><label :for="'seed-quantity-' + item.id">這次買幾份 <input :id="'seed-quantity-' + item.id" v-model.number="seedQuantities[item.id]" type="number" min="1" max="99" step="1" inputmode="numeric" /></label><small>買入合計 {{ item.seed * (Number(seedQuantities[item.id]) || 0) }} 金幣</small><button type="button" :disabled="!can('buy', item.id, seedQuantities[item.id])" @click="beginAction('buy', item.id, seedQuantities[item.id])">買 {{ Number(seedQuantities[item.id]) || 0 }} 份種苗</button><button type="button" :disabled="!can('sell', item.id)" @click="beginAction('sell', item.id)">賣 {{ farm.produce[item.id] || 0 }} 個 · 收 {{ cropSalePreview(item) }}</button></div>
            </div></div>
          </section>
          <section v-if="activePanel === 'workers' && !visiting" class="worker-card">
            <h2>👷 人力仲介</h2>
            <div class="worker-summary"><strong>已雇 {{ farm.workers.length }}/{{ WORKER_TOTAL_LIMIT }} 人</strong><span>移工名額 {{ workerMigrantCount }}/{{ WORKER_MIGRANT_LIMIT }}</span><span>{{ workerWaitLabel }}</span></div>
            <nav class="worker-view-tabs" aria-label="人力仲介頁面"><button type="button" :class="{ active: workerView === 'hire' }" @click="workerView = 'hire'">👥 雇用</button><button type="button" :class="{ active: workerView === 'tasks' }" @click="workerView = 'tasks'">🧤 排班與任務</button><button type="button" :class="{ active: workerView === 'family' }" @click="workerView = 'family'">👨‍👩‍👧 家人工作</button><button type="button" :class="{ active: workerView === 'history' }" @click="workerView = 'history'">📋 紀錄</button></nav>
            <div v-if="workerView === 'hire'" class="worker-body">
              <div class="worker-hiring-head"><label>計薪方式 <select v-model="workerPayPeriod"><option value="day">日薪</option><option value="week">周薪</option></select></label><button type="button" @click="activePanel = 'economy'; economySection = 'housing'">🛏️ 建移工宿舍</button></div>
              <p class="worker-help">本輪 {{ marketWorkers.length }} 位候選人，每 3 小時換檔（下次 {{ marketNextRefresh }}）；已雇用者會保留。移工需先有同性別空床位才可雇用；台灣人免住宿舍。</p>
              <div class="worker-dorm-list"><span v-for="item in dorms(farm)" :key="item.index">{{ dormName(item.plot.gender) }} · {{ plotLabel(item.index) }} · {{ dormOccupants(item.index) }}/{{ DORM_CAPACITY }} 人</span><span v-if="!dorms(farm).length">目前沒有移工宿舍</span></div>
              <div class="worker-roster"><div v-for="person in marketWorkers" :key="person.id" class="worker-person">
                <div><strong>{{ person.name }} <small v-if="person.gender">· {{ person.gender === 'female' ? '女' : '男' }}</small></strong><span>{{ person.group }} · {{ person.roles.map(workerGroupName).join('、') }}</span><small>語言：{{ person.languages.join('、') }} · 遊戲{{ (workerContract(person.id)?.period || workerPayPeriod) === 'day' ? '日薪' : '周薪' }} {{ workerWage(person, workerContract(person.id)?.period || workerPayPeriod, farm.protagonistId) }} 金幣</small><small v-if="workerContract(person.id)">已付至 {{ new Date(workerContract(person.id).paidUntil).toLocaleString('zh-TW') }}<span v-if="person.gender"> · {{ workerDorm(person.id) }}</span></small><small v-else-if="person.gender && workerActionError(farm, 'hireWorker', person.id, workerPayPeriod)" class="worker-blocked">{{ workerActionError(farm, 'hireWorker', person.id, workerPayPeriod) }}</small><label v-if="workerContract(person.id)" class="worker-focus">目前班別 <select :value="workerContract(person.id).focus" :disabled="busy || !!quiz" @change="assignWorker(person.id, $event.target.value)"><option v-for="role in person.roles" :key="role" :value="role">{{ workerGroupName(role) }}</option></select></label></div>
                <div v-if="workerContract(person.id)" class="worker-person-actions"><button v-if="workerContract(person.id).paidUntil <= now" type="button" :disabled="busy || !!quiz || !!workerActionError(farm, 'renewWorker', person.id, workerContract(person.id).period)" @click="beginWorkerAction('renewWorker', person.id)">答題續薪</button><button type="button" :disabled="busy || !!quiz" @click="beginWorkerAction('dismissWorker', person.id)">解雇</button></div>
                <button v-else type="button" :disabled="busy || !!quiz || !!workerActionError(farm, 'hireWorker', person.id, workerPayPeriod)" @click="beginWorkerAction('hireWorker', person.id)">答題雇用</button>
              </div></div>
              <small class="worker-disclaimer">宿舍與通勤級距為遊戲設定，非實際距離或勞動法規。選定地格可在「經營 → 住居」建宿舍。</small>
            </div>
            <div v-else-if="workerView === 'tasks'" class="worker-body">
              <p class="worker-help">只要安排雇員或家人工作，就會自動開始值班並立即巡查；值班期間每累積 1 分鐘有效遊玩時間，會再巡查並執行可做的工作。累積值班 30 分鐘後自動休息 30 分鐘，再自動開始下一輪。休息使用實際時間，關閉網站期間也會倒數；離線不累積值班時間。全程無須按鈕或答題。農田班預設選最高價通路販售收成。</p>
              <div class="worker-settings"><strong>自動播種作物（可多選）</strong><div class="worker-crop-choices"><label v-for="item in FARM_CROPS" :key="item.id"><input type="checkbox" :checked="farm.workerCropIds?.includes(item.id)" :disabled="busy || !!quiz" @change="toggleWorkerCrop(item.id, $event.target.checked)">{{ item.icon }} {{ item.name }} <small>{{ farm.seeds[item.id] || 0 }} 苗</small></label></div><small v-if="!farm.workerCropIds?.length">目前未勾選任何作物，自動播種會暫停。</small></div>
              <div class="worker-actions"><strong>🔄 自動值班循環</strong><span role="status" aria-live="polite">{{ workerWaitLabel }}</span></div>
              <p class="worker-report">{{ farm.workerLastReport || '尚未執行外包作業。' }}{{ farm.workerLastRunAt ? ` · 最近執行：${new Date(farm.workerLastRunAt).toLocaleString('zh-TW')}` : '' }}{{ farm.workerAuto ? ' · 自動巡田已開啟' : '' }}</p>
              <div class="worker-task-groups"><div v-for="group in WORKER_GROUPS" :key="group.id" class="worker-task-group"><strong>{{ group.name }}</strong><div class="worker-task-list"><label v-for="task in WORKER_TASKS.filter(item => item.group === group.id)" :key="task.id"><input type="checkbox" :checked="farm.workerTasks[task.id]" :disabled="busy || !!quiz" @change="toggleWorkerTask(task.id, $event.target.checked)" />{{ task.name }}</label></div></div></div>
              <small class="worker-disclaimer">販售與加工預設關閉，可勾選後由人力執行。沒有合適宿舍的既有移工會暫停工作。</small>
            </div>
            <div v-else-if="workerView === 'family'" class="worker-body"><p class="worker-help">先在「家庭」選職業、能力並加入排班，再為每位家人勾選可做的工作。這些個人勾選還會受到「排班與任務」的總開關限制。未成年子女只做放學後可做的農田工作。</p><p v-if="!familyAssignments.length">尚無可排班的配偶或滿 6 歲子女。</p><article v-for="person in familyAssignments" :key="person.id" class="family-assignment"><strong>{{ person.name }} · {{ person.age < 18 ? `${person.age} 歲／課後打工` : '成年' }} · 每輪薪資 {{ person.wage }}</strong><span>{{ person.member.workEnabled ? '已加入排班' : '未排班' }} · {{ FAMILY_PROFESSIONS.find(item => item.id === person.member.professionId)?.name || '未選職業' }} · {{ FAMILY_ABILITIES.find(item => item.id === person.member.abilityId)?.name || '未選能力' }}</span><div class="worker-task-list"><label v-for="task in WORKER_TASKS.filter(item => familyAllowedTasks(person.age).includes(item.id))" :key="task.id"><input type="checkbox" :checked="familyTaskSelected(person.member, task.id, person.age)" :disabled="busy || !!quiz" @change="toggleFamilyTask(person.id, task.id, $event.target.checked)">{{ task.name }}</label></div><small v-if="!person.member.workEnabled">到「家庭」頁加入排班後才會執行。</small></article></div>
            <div v-else class="worker-body worker-history"><p v-if="!farm.workerHistory?.length">尚無雇用或工作紀錄。</p><div v-for="(entry, index) in farm.workerHistory" :key="index"><strong>{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ workerById(entry.personId)?.name || familyWorkerName(farm, entry.personId) || '系統' }}</strong><span>{{ workerGroupName(entry.group) || '👥 人力仲介' }} · {{ entry.detail }}</span></div></div>
          </section>
          <section v-if="activePanel === 'animals' && !visiting" class="animal-card">
            <h2>{{ selectedAnimal.icon }} {{ selectedAnimal.name }} <small>產品：{{ selectedAnimal.productIcon }} {{ selectedAnimal.product }}</small></h2>
            <p class="animal-intro">{{ selectedPen ? (Number.isInteger(selectedPen.plotIndex) ? '已入住 · 本輪產品倒數 ' + animalTimeLabel(selectedPen) : '原有動物待安置 · 先選空地') : '尚未入住 · 購買後可開始照護' }}</p>
            <p class="animal-economy">{{ selectedAnimal.habitat }}佔一塊地 · 設備：{{ selectedAnimal.equipment }}</p>
            <p class="animal-economy">入住 {{ selectedAnimal.price }} 金幣 · 每 {{ selectedAnimal.minutes }} 分鐘產出 {{ selectedAnimal.yield }} 份 · 每份售價 {{ selectedAnimal.sale }} 金幣</p>
            <label v-if="!selectedPen || !Number.isInteger(selectedPen.plotIndex)" class="animal-location-picker">建設位置 <select :value="animalTargetPlot" @change="facilityPlotChoice = Number($event.target.value)"><option v-for="entry in emptyPlots" :key="entry.index" :value="entry.index">{{ plotLabel(entry.index) }}</option></select><small v-if="!emptyPlots.length">沒有空地，請先收成或擴建。</small></label>
            <p v-else class="animal-economy">📍 {{ animalLocation(selectedPen) }}</p>
            <button v-if="!selectedPen" type="button" class="animal-primary" :disabled="!canAnimal('buyAnimal')" @click="beginAnimalAction('buyAnimal')">答題讓 {{ selectedAnimal.name }} 入住</button>
            <button v-else-if="!Number.isInteger(selectedPen.plotIndex)" type="button" class="animal-primary" :disabled="!canAnimal('placeAnimal')" @click="beginAnimalAction('placeAnimal')">答題安置原有動物</button>
            <template v-else>
              <div class="animal-care-list" aria-label="本輪照護任務">
                <button v-for="task in selectedAnimal.care" :key="task.id" type="button" :class="{ done: selectedPen.care?.[task.id] }"
                  :disabled="!canAnimal('careAnimal', selectedAnimal.id, task.id)" @click="beginAnimalAction('careAnimal', task.id)">
                  <span>{{ task.icon }} {{ task.label }}</span><strong>{{ selectedPen.care?.[task.id] ? '✓ 已完成' : '進行照護' }}</strong>
                </button>
              </div>
              <button type="button" class="animal-primary" :disabled="!canAnimal('collectAnimal')" @click="beginAnimalAction('collectAnimal')">{{ selectedAnimal.productIcon }} 採集 {{ selectedAnimal.product }}</button>
              <p class="animal-help">{{ animalCareDone(selectedAnimal, selectedPen) ? (now >= selectedPen.readyAt ? '照護與倒數皆完成，可以採集。' : '照護已完成，等待產出。') : '完成上方三項照護後即可採集。' }}</p>
            </template>
            <div class="animal-inventory"><span>🎒 {{ selectedAnimal.product }}庫存 <strong>{{ farm.animalProducts?.[selectedAnimal.id] || 0 }}</strong></span><button type="button" :disabled="!canAnimal('sellAnimalProduct')" @click="beginAnimalAction('sellAnimalProduct')">賣出</button></div>
            <p class="animal-total">動物產品共 {{ totalAnimalProducts }} 份 · 累計採集 {{ farm.animalCollected || 0 }} 份</p>
            <p class="animal-disclaimer">青蛙、金魚、鱷魚提供虛擬導覽或觀賞券；照護時間與售價為遊戲數值。</p>
          </section>
          <section v-if="activePanel === 'economy' && !visiting" class="economy-card">
            <h2>☀️ 農場經營 <small>{{ today.date }} · {{ today.season }} · {{ today.weatherIcon }} {{ today.weatherName }}</small></h2>
            <p class="help">模擬天氣每日更新；光電、觀光與營業設施每次收款後需等 3 小時。一般收款約每 35 秒才會出一題單字，不會自動累積收益。</p>
            <nav class="economy-tabs" aria-label="經營項目"><button v-for="item in [{ id: 'solar', text: '☀️ 光電' }, { id: 'processing', text: '🏭 加工' }, { id: 'tourism', text: '🎟️ 觀光' }, { id: 'research', text: '🧪 農業研發' }, { id: 'housing', text: '🏡 住居' }, { id: 'attractions', text: '🚲 觀光店' }, { id: 'animal-business', text: '🐾 動物商業' }, { id: 'business', text: '🏬 商業' }, { id: 'utilities', text: '💧 水電' }, { id: 'demolition', text: '🧱 拆除' }]" :key="item.id" type="button" :class="{ active: economySection === item.id }" @click="chooseEconomySection(item.id)">{{ item.text }}</button></nav>
            <div v-if="economySection === 'research'" class="economy-block research-block"><strong>🧪 農業科技研發中心</strong>
              <p>佔一格自有空地；逐種作物研發，效果從下一次播種開始。第 1 級收成 +1、第 2 級生長快 20%、第 3 級自動完成除草與除蟲。</p>
              <p v-if="!farm.plots.some(plot => plot?.facility === 'agri_research')">目前尚未建設。先選一格空地，建設費 {{ RESEARCH_CENTER_COST }} 金幣。</p>
              <button type="button" :disabled="busy || !!quiz || !!researchActionError(farm, 'buildResearch', selectedPlot, selectedCrop)" @click="beginResearchAction('buildResearch')">答題建設研發中心 · {{ RESEARCH_CENTER_COST }}</button>
              <label>選擇研發作物<select v-model="selectedCrop"><option v-for="item in FARM_CROPS" :key="item.id" :value="item.id">{{ item.icon }} {{ item.name }} · 第 {{ researchLevel(farm, item.id) }}/{{ RESEARCH_MAX_LEVEL }} 級</option></select></label>
              <p>{{ crop(selectedCrop)?.name }}目前第 {{ researchLevel(farm, selectedCrop) }} 級；下級研發需 {{ researchUpgradeCost(farm, selectedCrop) }} 金幣。</p>
              <button type="button" :disabled="busy || !!quiz || !!researchActionError(farm, 'upgradeCrop', selectedPlot, selectedCrop)" @click="beginResearchAction('upgradeCrop')">答題升級{{ crop(selectedCrop)?.name }}</button>
              <div class="research-history"><small v-for="(item, index) in farm.researchHistory" :key="index">{{ new Date(item.at).toLocaleString('zh-TW') }} · {{ item.detail }}</small></div>
            </div>
            <div v-if="economySection === 'solar'" class="economy-block"><strong>📍 {{ plotLabel(selectedPlot) }} · {{ selectedSite?.facility ? facilityLabel(selectedSite) : selected ? crop(selected.crop)?.name : '空地' }}</strong>
              <p v-if="selectedSite?.solar">{{ solarSite(selectedSite) }}光電板 · 本輪可賣電 {{ solarIncome(selectedSite, now) }} 金幣 · {{ waitLabel(solarWait) }}</p>
              <div class="economy-actions"><button type="button" :disabled="!canEconomy('buildSolar')" @click="beginEconomyAction('buildSolar')">設置光電 {{ solarBuildCost(farm) }} 金幣</button><button type="button" :disabled="!canEconomy('collectSolar')" @click="beginEconomyAction('collectSolar')">賣電收款</button></div>
              <small>空地、魚塭、農舍及所有營業建築都可設置。已設 {{ solarPanelCount(farm) }} 處；遊戲補助價 {{ FACILITY_COST.solar }} 金幣累計限 {{ SOLAR_SUBSIDY_LIMIT }} 次，剩 {{ Math.max(0, SOLAR_SUBSIDY_LIMIT - farm.solarSubsidiesUsed) }} 次，之後每處 {{ SOLAR_UNSUBSIDIZED_COST }} 金幣。拆除不恢復名額。</small>
            </div>
            <div v-if="economySection === 'processing'" class="economy-block"><strong>🏭 加工與副產品</strong>
              <div class="economy-actions"><button type="button" :disabled="!canEconomy('buildFactory')" @click="beginEconomyAction('buildFactory')">空地建加工坊 {{ FACILITY_COST.factory }}</button></div>
              <select v-model="selectedCrop" aria-label="選擇加工原料"><option v-for="item in FARM_CROPS" :key="item.id" :value="item.id">{{ item.icon }} {{ item.name }} → {{ CROP_PRODUCTS[item.id] }}</option></select>
              <small>原料 {{ farm.produce[selectedCrop] || 0 }} · {{ CROP_PRODUCTS[selectedCrop] }}庫存 {{ farm.processedProduce?.[selectedCrop] || 0 }} · 售價 {{ processedSale(selectedCrop) }}</small>
              <div class="economy-actions"><button type="button" :disabled="!canEconomy('processCrop', selectedCrop, 'factory')" @click="beginEconomyAction('processCrop', selectedCrop, 'factory')">坊內加工 2 份</button><button type="button" :disabled="!canEconomy('processCrop', selectedCrop, 'outsource')" @click="beginEconomyAction('processCrop', selectedCrop, 'outsource')">委外加工 12</button><button type="button" :disabled="!canEconomy('sellProcessed')" @click="beginEconomyAction('sellProcessed')">賣副產品</button></div>
            </div>
            <div v-if="economySection === 'tourism'" class="economy-block"><strong>🎟️ 觀光農場</strong>
              <p>{{ today.weekend ? '週末' : '平日' }}本輪預計 {{ economyPreview.visitors }} 位遊客 · 門票 {{ economyPreview.coins }} 金幣 · 累計來客 {{ farm.visitors || 0 }}</p>
              <div class="economy-actions"><button type="button" :disabled="!canEconomy('buildTourism')" @click="beginEconomyAction('buildTourism')">空地建接待站 {{ FACILITY_COST.tourism }}</button><button type="button" :disabled="!canEconomy('collectVisitors')" @click="beginEconomyAction('collectVisitors')">接待本輪遊客</button></div>
              <small v-if="tourismPlot >= 0">{{ waitLabel(tourismWait) }}</small>
              <small>{{ governmentBalance ? '政府借款未清償：農場免費開放參觀，仍可累計遊客；還清後恢復門票。' : '農作物與動物種類越多，來客越多；週末人潮較高。' }}</small>
            </div>
            <div v-if="economySection === 'housing'" class="economy-block housing-block">
              <strong>🏡 宿舍與農舍</strong>
              <p>📍 {{ plotLabel(selectedPlot) }} · {{ selectedSite?.facility ? facilityLabel(selectedSite) : selected ? crop(selected.crop)?.name : '空地' }}</p>
              <div class="housing-option"><strong>🛏️ 移工宿舍</strong><p>男女分開，每間佔 1 格、可住 {{ DORM_CAPACITY }} 人；多里共用，限同區與新化相鄰區的遊戲通勤級距。先建宿舍才能雇用對應性別移工。</p><div class="economy-actions"><button type="button" :disabled="!canEconomy('buildDorm', selectedCrop, 'female')" @click="beginEconomyAction('buildDorm', selectedCrop, 'female')">建女宿舍 {{ DORM_COST }}</button><button type="button" :disabled="!canEconomy('buildDorm', selectedCrop, 'male')" @click="beginEconomyAction('buildDorm', selectedCrop, 'male')">建男宿舍 {{ DORM_COST }}</button></div><small v-for="item in dorms(farm)" :key="item.index">{{ dormName(item.plot.gender) }}：{{ plotLabel(item.index) }} · {{ dormOccupants(item.index) }}/{{ DORM_CAPACITY }} 人</small></div>
              <div class="housing-option"><strong>🏡 農舍外觀（二選一）</strong><p>遊戲以同一里連續 {{ FARMHOUSE_PARCEL_PLOTS }} 格各 {{ FARMHOUSE_PLOT_HA }} 公頃，模擬單筆 {{ FARMHOUSE_PARCEL_PLOTS * FARMHOUSE_PLOT_HA }} 公頃農地。建築佔 1 格，其餘 9 格保留農用。已擁有 {{ villagePlotCount(farm, selectedVillage) }} 格；{{ selectedFarmhouseParcel ? '所選地格符合遊戲門檻' : '所選地格尚未符合遊戲門檻' }}。</p><div class="economy-actions"><button type="button" :disabled="!canEconomy('buildFarmhouse', selectedCrop, 'headquarters')" @click="beginEconomyAction('buildFarmhouse', selectedCrop, 'headquarters')">🏢 農業公司總部 {{ FACILITY_COST.headquarters }}</button><button type="button" :disabled="!canEconomy('buildFarmhouse', selectedCrop, 'villa')" @click="beginEconomyAction('buildFarmhouse', selectedCrop, 'villa')">🏠 自家豪宅 {{ FACILITY_COST.villa }}</button></div><small>總部外觀：一般賣作物與副產品收入 +10%。豪宅外觀：起始里的作物每次收成 +1。兩者都只作自用農舍的遊戲外觀設定，不提供實際公司辦公或住宿營業許可。</small><small>實際申請還須農民資格、同縣市戶籍與持有年限、農業使用、建築許可等審查；遊戲地格不是地籍，不能當成申請資格。<a href="https://law.moa.gov.tw/LawContent.aspx?id=FL014306" target="_blank" rel="noopener noreferrer">農業部《農業用地興建農舍辦法》</a></small></div>
            </div>
            <div v-if="economySection === 'business' || economySection === 'attractions' || economySection === 'animal-business'" class="economy-block business-block">
              <label>選擇設施 <select v-model="selectedBusiness" aria-label="選擇經營設施"><option v-for="item in businessChoices" :key="item.id" :value="item.id">{{ item.icon }} {{ item.name }}</option></select></label>
              <p><strong>{{ business.icon }} {{ business.name }}</strong> · {{ business.description }}</p>
              <small>設備：{{ business.equipment }} · 建設 {{ business.cost }} 金幣 · 每里此類設施限一間。</small>
              <small v-if="business.bonusCrop">主題作物：{{ crop(business.bonusCrop)?.name }}。本里有種植或倉庫有庫存時，每輪收入加 7 金幣；不消耗作物。</small>
              <small v-if="business.outdoor">戶外活動晴天收入較高、雨天較低；週末遊客較多。</small>
              <small v-if="business.requiredAnimal">先在同一里養 {{ animal(business.requiredAnimal)?.name }} 才能建設與營業；設施另佔一格地。</small>
              <p class="staffing-state">👷 營業人力：{{ shopStaff(farm, selectedBusiness, now, selectedPlot) ? (workerById(shopStaff(farm, selectedBusiness, now, selectedPlot).id)?.name || familyWorkerName(farm, shopStaff(farm, selectedBusiness, now, selectedPlot).id)) + ' 可值班' : '尚無可值班人員' }} · 需要 {{ requiredShopLanguages(selectedBusiness).join('、') }}。請至「生產 → 人力仲介」安排店鋪與觀光班；每位人員每輪最多處理 2 項工作。</p>
              <p>📍 {{ plotLabel(selectedPlot) }} · {{ selectedSite?.facility ? facilityLabel(selectedSite) : selected ? crop(selected.crop)?.name : '空地' }}</p>
              <div class="economy-actions"><button type="button" :disabled="!canBusiness('buildBusiness')" @click="beginBusinessAction('buildBusiness')">答題建造 {{ business.name }}</button><button type="button" :disabled="!canBusiness('collectBusiness')" @click="beginBusinessAction('collectBusiness')">結算本輪 {{ businessIncome(farm, selectedBusiness, farm.plotVillages?.[selectedPlot], now) }} 金幣</button></div>
              <small v-if="selectedSite?.facility === selectedBusiness">{{ waitLabel(businessWait) }}</small>
              <div v-if="businessSites.length" class="business-sites"><span>已建設：</span><button v-for="site in businessSites" :key="site.index" type="button" :class="{ active: selectedPlot === site.index }" @click="selectBusinessSite(site.index)">{{ plotLabel(site.index) }}{{ revenueWaitMs(site.plot, 'lastBusinessAt', 'lastBusinessDay', now) > 0 ? ' · 等待中' : ' · 可收款' }}</button></div>
              <div v-if="selectedBusiness === 'market'" class="business-extra">
                <p>本里人口 {{ villagePopulation(farm.plotVillages?.[selectedPlot]).toLocaleString() }} 人 · 人口越多，客流分潤越高；自產商品在超市售價也較高。</p>
                <div class="business-pickers"><select v-model="marketProductKind" aria-label="選擇產品類型"><option value="fresh">農作物</option><option value="processed">加工品</option></select><select v-model="selectedCrop" aria-label="選擇超市販售商品"><option v-for="item in FARM_CROPS" :key="item.id" :value="item.id">{{ marketProductKind === 'fresh' ? item.name : CROP_PRODUCTS[item.id] }}</option></select></div>
                <small>庫存 {{ marketStock }} · 本店每份 {{ marketPrice }} 金幣 · 合計 {{ marketStock * marketPrice }} 金幣</small>
                <div class="economy-actions"><button type="button" :disabled="!canBusiness('sellAtMarket')" @click="beginBusinessAction('sellAtMarket')">在本店賣出全部</button></div>
                <a :href="populationSource.sourceUrl" target="_blank" rel="noopener">人口參考：臺南市政府民政局民國 {{ populationSource.year }} 年里別資料</a>
              </div>
              <div v-if="selectedBusiness === 'school'" class="business-extra school-lesson">
                <strong>本輪農業小課堂</strong><p>{{ schoolLesson?.question || '正在準備課程' }}</p>
                <div class="school-choices"><button v-for="choice in schoolLesson?.choices || []" :key="choice" type="button" :class="{ active: schoolAnsweredSlot === revenueSlot && schoolAnswer === choice }" @click="schoolAnswer = choice; schoolAnsweredSlot = revenueSlot; schoolFeedback = ''">{{ choice }}</button></div>
                <small>每輪先答農業題；單字題按一般操作的 35 秒間隔出現。</small><p v-if="schoolFeedback" role="status">{{ schoolFeedback }}</p>
              </div>
              <small v-if="selectedBusiness === 'restaurant'">庫存有農作物或動物產品時，每輪營收加 5 金幣；此加成不消耗庫存。</small>
              <small v-if="selectedBusiness === 'fishing' || selectedBusiness === 'shrimp'">設施本身包含池與釣位；雨天客流較少，週末較多。</small>
              <small v-if="selectedBusiness === 'karaoke'">包廂每 3 小時可結算一次，週末客流較多。</small>
              <small v-if="selectedBusiness === 'bicycle' || selectedBusiness === 'icecream'">晴天和週末收入較高；雨天較少。每里每類設施限一間，佔一格空地。</small>
              <small>累計設施營收 {{ farm.businessRevenue || 0 }} 金幣。遊戲營收為模擬數值，每輪需自行結算。</small>
            </div>
            <div v-if="economySection === 'utilities'" class="economy-block utility-block"><strong>💧 農場水電帳單</strong>
              <p>每 3 小時結算一次；離線期間只計一輪。{{ utilityNextWait <= 0 ? '帳單即將結算' : '下輪' + waitLabel(utilityNextWait) }}。</p>
              <div class="utility-numbers"><span>⚡ 用電 {{ utilityEstimate.grossPower }} 度</span><span>☀️ 光電抵用 {{ utilityEstimate.solarCredit }} 度</span><span>💡 計費 {{ utilityEstimate.chargedPower }} 度 × {{ POWER_UNIT_COST }}</span><span>💧 用水 {{ utilityEstimate.water }} 度 × {{ WATER_UNIT_COST }}</span></div>
              <p><strong>下輪預估 {{ utilityEstimate.total }} 金幣</strong>（電 {{ utilityEstimate.powerCost }}、水 {{ utilityEstimate.waterCost }}）· 未付 {{ farm.utilityDebt || 0 }} 金幣</p>
              <button type="button" :disabled="busy || !!quiz || !!utilityPaymentError(farm)" @click="beginUtilityPayment()">答題繳交未付帳單</button>
              <small v-if="farm.utilityLastBill">上次結算 {{ new Date(farm.utilityLastBill.at).toLocaleString('zh-TW') }}：{{ farm.utilityLastBill.total }} 金幣，已付 {{ farm.utilityLastBill.paid }}，新欠款 {{ farm.utilityLastBill.newDebt }}。</small>
              <div class="utility-sites"><strong>各地格預估用量</strong><p v-if="!utilityEstimate.details.length">目前沒有需要水電的農作物或設施。</p><span v-for="item in utilityEstimate.details" :key="item.plotIndex">{{ utilitySiteLabel(item.plotIndex) }} · 電 {{ item.power }} 度／水 {{ item.water }} 度</span></div>
              <small>光電板先抵用電量，晴天每處 4 度、多雲 3 度、雨天 1 度；水費照常計算。賣電仍依原光電收款規則。所有費率均為遊戲數值。</small>
            </div>
            <div v-if="economySection === 'demolition'" class="economy-block demolition-block"><strong>🧱 拆除選取地格</strong>
              <p>📍 {{ plotLabel(selectedPlot) }} · {{ selectedSite?.facility ? facilityLabel(selectedSite) : selected ? crop(selected.crop)?.name : '空地' }}</p>
              <p>拆除不退建設費。動物農舍拆除後，動物保留並等待重新安置；同時拆除屋頂光電板需加收處理費。</p>
              <div class="economy-actions"><button type="button" :disabled="busy || !!quiz || !!demolitionError(farm, selectedPlot, 'solar')" @click="beginDemolition('solar')">答題拆光電 · {{ demolitionCost(selectedSite, 'solar') }} 金幣</button><button type="button" :disabled="busy || !!quiz || !!demolitionError(farm, selectedPlot, 'facility')" @click="beginDemolition('facility')">答題拆設施 · {{ demolitionCost(selectedSite) }} 金幣</button></div>
              <small>空地、作物及借款抵押地不能拆除。先點選地格，再進入此頁操作。</small>
            </div>
          </section>
          <section v-if="activePanel === 'events' && !visiting" class="finance-card event-card">
            <h2>🌀 天災人禍與我的主角</h2>
            <div v-if="protagonist" class="event-hero" :style="{ background: protagonist.color }"><FarmHeroPortrait :person="protagonist" /><div><strong>{{ protagonist.name }}</strong><p>{{ protagonist.story }}</p><small>能力：{{ protagonist.skill }}。農夫是兼職。</small></div></div>
            <p>目前 {{ today.season }} · {{ today.weatherIcon }} {{ today.weatherName }}。每天最多一件季節事件；沒有事件的日子也會留下平安日報。事件機率及金幣為遊戲設定。</p>
            <div class="finance-block"><strong>🛠️ 防災整備</strong><p>支付 {{ DISASTER_PREP_COST }} 金幣並答對單字，可免除下一次負面事件。{{ farm.disasterShield ? '目前已啟用。' : '目前尚未啟用。' }}</p><button type="button" :disabled="busy || !!quiz || farm.disasterShield || farm.coins < DISASTER_PREP_COST" @click="beginDisasterPrep">答題完成防災整備</button></div>
            <div class="event-list"><strong>📋 最近事件</strong><p v-if="!farm.eventHistory?.length">尚無事件，下一個農場日開始出現。</p><article v-for="(event, index) in farm.eventHistory" :key="index"><b>{{ event.icon }} {{ event.name }} · {{ event.season }}</b><span>{{ event.detail }}</span><small>{{ new Date(event.at).toLocaleString('zh-TW') }}</small></article></div>
            <div class="finance-block"><strong>♻️ 轉生重來</strong><p>轉生需有 {{ REINCARNATION_COST }} 金幣且清償借款、水電及家庭財產分配。整座農場、主角、土地、設施及庫存重置；學習成績保留，之後可重新選主角。</p><button type="button" :disabled="busy || !!quiz || farm.coins < REINCARNATION_COST || governmentBalance > 0 || farm.utilityDebt > 0 || relevantLoans.length > 0 || farm.divorceSettlementDue > 0" @click="reincarnate">花 {{ REINCARNATION_COST }} 金幣轉生</button></div>
          </section>
          <section v-if="activePanel === 'family' && !visiting" class="finance-card family-card">
            <h2>💞 家庭與人際</h2>
            <p class="worker-help">角色性別：{{ farm.gender === 'male' ? '男' : '女' }}。可與同性或異性對象交往、結婚。參加興趣活動可自然認識對象，也可付費由相親市場介紹。交往對象均為虛構成人；子女未滿 18 歲不能結婚，須就學，滿 6 歲可在放學後打工。</p>
            <div class="finance-block"><strong>🎨 培養興趣與參加活動</strong><div class="family-grid"><article v-for="hobby in FAMILY_HOBBIES" :key="hobby.id"><b>{{ hobby.icon }} {{ hobby.name }}</b><small>參加 {{ farm.familyHobbies[hobby.id] || 0 }} 次</small><button type="button" :disabled="busy || !!quiz || farm.coins < FAMILY_ACTIVITY_COST" @click="beginFamilyAction('activity', '', hobby.id)">答題{{ hobby.activity }} · {{ FAMILY_ACTIVITY_COST }}</button></article></div></div>
            <div v-if="!farm.courtship && !farm.spouse" class="finance-block"><strong>💕 自由戀愛與相親市場</strong><p>自由戀愛：先參加對方喜歡的活動 2 次；相親介紹費 {{ FAMILY_MATCH_COST }} 金幣。選擇對象後可約會培養感情。</p><div class="family-grid"><article v-for="person in availableFamilyPartners" :key="person.id"><b>{{ person.icon }} {{ person.name }} · {{ person.profession }}</b><small>喜歡{{ FAMILY_HOBBIES.find(item => item.id === person.hobby)?.name }} · {{ person.ability }}</small><button type="button" :disabled="!!familyActionError(farm, 'meet', person.id) || busy || !!quiz" @click="beginFamilyAction('meet', person.id)">答題活動相識</button><button type="button" :disabled="!!familyActionError(farm, 'match', person.id) || busy || !!quiz" @click="beginFamilyAction('match', person.id)">答題相親認識 · {{ FAMILY_MATCH_COST }}</button></article></div></div>
            <div v-if="farm.courtship" class="finance-block"><strong>💌 交往中：{{ courtshipPartner?.icon }} {{ courtshipPartner?.name }}</strong><p>{{ farm.courtship.metBy }} · 感情 {{ farm.courtship.affection }}/100 · 喜歡{{ FAMILY_HOBBIES.find(item => item.id === courtshipPartner?.hobby)?.name }}</p><div class="economy-actions"><button type="button" :disabled="!!familyActionError(farm, 'date') || busy || !!quiz" @click="beginFamilyAction('date')">答題約會 · {{ FAMILY_DATE_COST }}</button><button v-if="!farm.courtship.engaged" type="button" :disabled="!!familyActionError(farm, 'propose') || busy || !!quiz" @click="beginFamilyAction('propose')">答題求婚 · 需感情 70／金幣 {{ FAMILY_MARRIAGE_MIN_COINS }}</button><button v-else type="button" :disabled="!!familyActionError(farm, 'marry') || busy || !!quiz" @click="beginFamilyAction('marry')">答題結婚 · 需感情 85／金幣 1500</button><button type="button" :disabled="busy || !!quiz" @click="beginFamilyAction('breakup')">答題結束交往</button></div></div>
            <div v-if="farm.spouse" class="finance-block"><strong>💍 配偶：{{ spouseProfile?.icon }} {{ spouseProfile?.name }}</strong><p>{{ farm.spouse.professionId ? FAMILY_PROFESSIONS.find(item => item.id === farm.spouse.professionId)?.name : '尚未選擇農場職業' }} · {{ farm.spouse.abilityId ? FAMILY_ABILITIES.find(item => item.id === farm.spouse.abilityId)?.name : '尚未選擇能力' }} · {{ farm.spouse.workEnabled ? '帶薪排班中' : '未排班' }}</p><p>目前農場資產遊戲估價 {{ familyAssetValue(farm) }}；離婚後約需分配 {{ Math.floor(familyAssetValue(farm) / 2) }} 金幣等值財產。現金先分半，不足部分由未來收入分期償還。</p><div class="economy-actions"><button type="button" :disabled="!!familyActionError(farm, 'familyWork', 'spouse', '', familyActiveMs) || busy || !!quiz" @click="beginFamilyAction('familyWork', 'spouse')">答題{{ farm.spouse.workEnabled ? '停止' : '加入' }}排班 · 每輪薪資 24</button><button type="button" :disabled="!!familyActionError(farm, 'child') || busy || !!quiz" @click="beginFamilyAction('child')">答題迎接小孩 · 220</button><button type="button" :disabled="busy || !!quiz" @click="beginFamilyAction('divorce')">答題協議離婚（按財產等值分半）</button></div></div>
            <div v-if="farm.spouse || farm.children.length" class="finance-block"><strong>👨‍👩‍👧 家人職業與能力</strong><div class="family-pickers"><label>家人<select v-model="selectedFamilyMember"><option v-if="farm.spouse" value="spouse">{{ spouseProfile?.name }}（配偶）</option><option v-else value="spouse" disabled>選擇成年家人</option><option v-for="child in farm.children.filter(item => familyChildAge(item, familyActiveMs) >= FAMILY_ADULT_AGE)" :key="child.id" :value="child.id">{{ child.name }}（成年子女）</option></select></label><label>職業<select v-model="selectedFamilyProfession"><option v-for="job in FAMILY_PROFESSIONS" :key="job.id" :value="job.id">{{ job.icon }} {{ job.name }} · {{ job.detail }}</option></select></label><label>能力<select v-model="selectedFamilyAbility"><option v-for="ability in FAMILY_ABILITIES" :key="ability.id" :value="ability.id">{{ ability.name }} · {{ ability.detail }}</option></select></label><button type="button" :disabled="!!familyActionError(farm, 'familyCareer', selectedFamilyMember, `${selectedFamilyProfession}:${selectedFamilyAbility}`, familyActiveMs) || busy || !!quiz" @click="configureFamilyCareer">答題確認職業與能力</button></div><small>家人可參與所有類別工作；職業決定工作優先順序，能力讓指定類別多做一項。配偶每輪薪資 24、成年子女 16 金幣；農場經理可服務需要英語的店鋪。</small></div>
            <div v-if="farm.children.length" class="finance-block"><strong>🧒 子女成長</strong><div class="family-grid"><article v-for="child in farm.children" :key="child.id"><b>{{ child.gender === 'male' ? '👦' : '👧' }} {{ child.name }} · {{ familyChildAge(child, familyActiveMs, now) }} 歲</b><small>天賦：{{ workerGroupName(child.trait) }} · {{ familyChildAge(child, familyActiveMs, now) >= FAMILY_ADULT_AGE ? '已成年' : `${familySchoolLevel(familyChildAge(child, familyActiveMs, now))}就學中 · 實際時間每 3 小時成長 1 歲；成年後每 6 小時成長 1 歲` }}</small><small v-if="familyChildAge(child, familyActiveMs, now) >= FAMILY_ADULT_AGE">{{ child.professionId ? FAMILY_PROFESSIONS.find(item => item.id === child.professionId)?.name : '尚未選職業' }} · {{ child.workEnabled ? '帶薪排班中' : '未排班' }}</small><button v-if="familyChildAge(child, familyActiveMs, now) >= FAMILY_AFTER_SCHOOL_AGE" type="button" :disabled="!!familyActionError(farm, 'familyWork', child.id, '', familyActiveMs) || busy || !!quiz" @click="beginFamilyAction('familyWork', child.id)">答題{{ child.workEnabled ? '停止' : '加入' }}{{ familyChildAge(child, familyActiveMs, now) < FAMILY_ADULT_AGE ? '課後打工 · 每輪薪資 6' : '排班 · 每輪薪資 16' }}</button><div v-if="familyChildAge(child, familyActiveMs, now) >= FAMILY_ADULT_AGE" class="child-romance"><small v-if="child.childMarriage">💍 已與 {{ familyPartnerById(child.childMarriage.partnerId)?.name }} 結婚；{{ child.workEnabled ? '仍協助家業' : '未參與家業' }}。</small><template v-else-if="child.childCourtship"><small>💕 與 {{ familyPartnerById(child.childCourtship.partnerId)?.name }} 交往 · 感情 {{ child.childCourtship.affection }}/100</small><button type="button" :disabled="!!familyActionError(farm, 'childDate', child.id, '', familyActiveMs) || busy || !!quiz" @click="beginFamilyAction('childDate', child.id)">答題約會 · 35</button><button type="button" :disabled="!!familyActionError(farm, 'childMarry', child.id, '', familyActiveMs) || busy || !!quiz" @click="beginFamilyAction('childMarry', child.id)">答題結婚 · 感情 75／費用 300</button><button type="button" :disabled="busy || !!quiz" @click="beginFamilyAction('childBreakup', child.id)">結束交往</button></template><template v-else><label>認識成年對象<select v-model="childPartnerChoice[child.id]"><option value="">請選擇</option><option v-for="person in familyCandidates().filter(person => person.id !== farm.spouse?.partnerId && person.id !== farm.courtship?.partnerId && !farm.children.some(item => item.childMarriage?.partnerId === person.id || item.childCourtship?.partnerId === person.id))" :key="person.id" :value="person.id">{{ person.icon }} {{ person.name }} · {{ person.profession }}</option></select></label><button type="button" :disabled="!!familyActionError(farm, 'childMeet', child.id, childPartnerChoice[child.id], familyActiveMs) || busy || !!quiz" @click="beginFamilyAction('childMeet', child.id, childPartnerChoice[child.id])">答題認識對象 · 60</button></template></div></article></div></div>
            <div v-if="farm.divorceSettlementDue" class="finance-block"><strong>📜 財產分配紀錄</strong><p>尚有 {{ farm.divorceSettlementDue }} 金幣等值分產待支付；往後新增收入的一半會用來償還，保留至少 12 金幣買種苗。</p></div>
            <div class="finance-block"><strong>📋 家庭紀錄</strong><p v-if="!farm.familyHistory.length">尚無家庭事件。</p><div class="family-history"><p v-for="(entry, index) in farm.familyHistory" :key="index">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.detail }}</p></div></div>
          </section>
          <section v-if="activePanel === 'professionals' && !visiting" class="finance-card professional-card">
            <h2>📊 高階人力仲介</h2>
            <p>農場顧問以農場金幣支付，每約 3 小時。私校校長、行政人員由學校基金支付，每約 24 小時；名單每 3 小時更新。學校教師請到「私立學校」招聘。</p>
            <nav class="worker-view-tabs" aria-label="高階人力職位"><button v-for="role in [...SPECIALIST_ROLES, ...SCHOOL_STAFF_ROLES]" :key="role.id" type="button" :class="{ active: professionalView === role.id }" @click="professionalView = role.id">{{ role.icon }} {{ role.name }}</button></nav>
            <div v-for="role in SPECIALIST_ROLES.filter(item => item.id === professionalView)" :key="role.id" class="professional-content">
              <div class="finance-block"><strong>{{ role.icon }} {{ role.name }}</strong><p>{{ role.effect }}</p><p v-if="farm.specialistContracts?.[role.id]">目前合約：{{ specialistById(farm.specialistContracts[role.id].personId)?.name }} · {{ hasSpecialist(farm, role.id, now) ? '服務中' : '已到期' }} · 至 {{ new Date(farm.specialistContracts[role.id].paidUntil).toLocaleString('zh-TW') }}</p><p v-else>目前未聘用。</p></div>
              <div class="worker-roster"><div v-for="person in marketSpecialists.filter(item => item.role === role.id)" :key="person.id" class="worker-person"><div><strong>{{ person.name }}</strong><span>{{ person.note }}</span><small>3 小時服務費 {{ person.fee }} 金幣</small></div><button type="button" :disabled="busy || !!quiz || !!specialistActionError(farm, 'hireSpecialist', person.id, now)" @click="beginSpecialistAction('hireSpecialist', person.id)">答題聘請</button></div></div>
              <div v-if="farm.specialistContracts?.[role.id]" class="economy-actions"><button v-if="!hasSpecialist(farm, role.id, now)" type="button" :disabled="busy || !!quiz || !!specialistActionError(farm, 'renewSpecialist', farm.specialistContracts[role.id].personId, now)" @click="beginSpecialistAction('renewSpecialist', farm.specialistContracts[role.id].personId)">答題續聘原顧問</button><button type="button" :disabled="busy || !!quiz" @click="beginSpecialistAction('dismissSpecialist', farm.specialistContracts[role.id].personId)">解約</button></div>
              <template v-if="role.id === 'accountant'"><div class="finance-block"><strong>📒 設施損益</strong><p>自本功能啟用後開始記帳。正數是入帳，負數是實付；借款、未付水電及庫存不算營業淨利。共同薪資與其他支出另列，避免誤算到單一設施。</p><p>總收入 {{ accountingSummary.income }} · 總支出 {{ accountingSummary.expense }} · 淨額 {{ accountingSummary.net }} 金幣</p><p v-if="!hasSpecialist(farm, 'accountant', now)">聘用有效會計後，可檢視各設施與最近交易。</p><template v-else><div class="accounting-table"><div class="accounting-head"><b>設施／項目</b><b>收入</b><b>支出</b><b>淨額</b></div><div v-for="row in accountingRows" :key="row.id"><span>{{ row.label }}</span><span>{{ row.income }}</span><span>{{ row.expense }}</span><strong :class="{ loss: row.net < 0 }">{{ row.net }}</strong></div><p v-if="!accountingRows.length">尚無收支紀錄。</p></div><strong>最近交易</strong><div class="accounting-entries"><p v-for="entry in farm.accountingEntries" :key="entry.id">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.label }} · {{ entry.delta > 0 ? '+' : '' }}{{ entry.delta }} · {{ entry.detail }}</p></div></template></div></template>
            </div>
            <div v-for="role in SCHOOL_STAFF_ROLES.filter(item => item.id === professionalView)" :key="role.id" class="professional-content">
              <div class="finance-block"><strong>{{ role.icon }} {{ role.name }}</strong><p>{{ role.note }}。聘約由學校法人基金支付，不使用農場個人金幣。</p><p v-if="!privateSchool">請先到「私立學校」捐贈設校。</p><p v-else>在任：{{ schoolStaff(role.id).map(item => schoolCandidate(item.personId)?.name).join('、') || '尚無' }} · 學校基金 {{ privateSchool.fund }} 金幣</p></div>
              <div v-if="privateSchool" class="worker-roster"><div v-for="person in schoolCandidateList(role.id)" :key="person.id" class="worker-person"><div><strong>{{ person.name }}</strong><span>{{ person.specialty }} · 能力 {{ person.skill }}</span><small>24 小時薪資 {{ person.fee }} 金幣（學校基金）</small></div><button type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'hire', { personId: person.id }, now)" @click="beginSchoolAction('hire', { personId: person.id })">答題聘任</button></div></div>
              <div v-if="privateSchool" class="school-staff-list"><div v-for="contract in privateSchool.staff.filter(item => item.role === role.id)" :key="contract.personId"><strong>{{ schoolCandidate(contract.personId)?.name }}</strong><small>{{ contract.paidUntil > now ? '在任至' : '已到期' }} {{ new Date(contract.paidUntil).toLocaleString('zh-TW') }}</small><div class="economy-actions"><button v-if="contract.paidUntil <= now" type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'renew', { personId: contract.personId }, now)" @click="beginSchoolAction('renew', { personId: contract.personId })">答題續聘</button><button type="button" :disabled="busy || !!quiz" @click="beginSchoolAction('dismiss', { personId: contract.personId })">解約</button></div></div></div>
            </div>
            <div class="finance-block"><strong>📋 顧問合約紀錄</strong><p v-if="!farm.specialistHistory?.length">尚無合約紀錄。</p><p v-for="(entry, index) in farm.specialistHistory" :key="index">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.detail }}</p></div>
          </section>
          <section v-if="activePanel === 'school' && !visiting" class="finance-card school-card">
            <h2>🏫 私立學校法人</h2>
            <p class="worker-help">請從自己擁有的空地提供校地；國小需 1 格、國中／高中／高職需 2 格、大學需 3 格，校地會佔用農地。學校基金獨立記帳，捐款與學費用於校務。遊戲金額和地格並非現實設校標準。</p>
            <template v-if="!privateSchool">
              <div class="finance-block"><strong>🎁 捐贈設立</strong><p>農場總資產達 {{ SCHOOL_ASSET_GATE }} 金幣、備有 {{ SCHOOL_FOUNDING_GIFT }} 金幣及足夠自有空地，即可開辦一所私立學校。現有總資產約 {{ familyAssetValue(farm) }} 金幣。</p><label>自訂校名 <input v-model.trim="schoolName" type="text" maxlength="24" placeholder="例如：新化希望學校"></label><label>選擇學制<select v-model="schoolLevelChoice"><option v-for="level in SCHOOL_LEVELS" :key="level.id" :value="level.id">{{ level.icon }} {{ level.name }} · 需 {{ level.land }} 格地 · 最多 {{ level.maxClasses }} 班</option></select></label><label>校地起點<select v-model.number="schoolPlotChoice"><option :value="-1">請選擇自己擁有的空地</option><option v-for="entry in emptyPlots" :key="entry.index" :value="entry.index">{{ plotLabel(entry.index) }}</option></select></label><small v-if="schoolLandPreview.length">將佔用 {{ villageName(farm.plotVillages[schoolPlotChoice]) }} 的第 {{ schoolLandPreview.map(index => farm.plotVillages.slice(0, index + 1).filter(id => id === farm.plotVillages[index]).length).join('、') }} 格土地；點選左側空地也可指定起點。</small><small v-else>所選里需要 {{ schoolLevel(schoolLevelChoice)?.land }} 格可用空地，農舍保留地不能使用。</small><button type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'found', schoolSetupPayload(), now)" @click="beginSchoolAction('found', schoolSetupPayload())">答題捐贈 {{ SCHOOL_FOUNDING_GIFT }} 金幣設校</button></div>
            </template>
            <template v-else>
              <div class="school-summary"><div><strong>{{ privateSchool.name }}</strong><small>{{ schoolLevel(privateSchool.levelId)?.name || '待指定學制' }} · {{ privateSchool.plotIndexes?.length ? villageName(privateSchool.villageId) + ' · 佔地 ' + privateSchool.plotIndexes.length + ' 格' : '待補設校地' }}</small></div><span>🏦 學校基金 {{ privateSchool.fund }} 金幣</span><span>⭐ 聲望 {{ privateSchool.reputation }} / 100</span><span>👩‍🎓 累計招生 {{ privateSchool.totalStudents }} 人</span></div>
              <NuxtLink v-if="privateSchool.plotIndexes?.length" class="school-campus-link" :to="{ path: '/game-happy-farm-school', query: lesson }">🏫 進入學校全頁管理 · 教室／學生／教師／設施／課表 →</NuxtLink>
              <div v-if="!privateSchool.plotIndexes?.length" class="finance-block"><strong>🗺️ 補設校地與學制</strong><p>此學校在舊預覽版本成立，尚未指定自有校地。既有基金、員工與校務紀錄會保留；指定校地後才能繼續招生。</p><label>學制<select v-model="schoolLevelChoice"><option v-for="level in SCHOOL_LEVELS" :key="level.id" :value="level.id">{{ level.name }} · 需 {{ level.land }} 格地</option></select></label><label>校地起點<select v-model.number="schoolPlotChoice"><option :value="-1">請選擇自己擁有的空地</option><option v-for="entry in emptyPlots" :key="entry.index" :value="entry.index">{{ plotLabel(entry.index) }}</option></select></label><small v-if="schoolLandPreview.length">將佔用同一里的 {{ schoolLandPreview.length }} 格空地</small><button type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'allocateLand', schoolSetupPayload(), now)" @click="beginSchoolAction('allocateLand', schoolSetupPayload())">答題補設校地</button></div>
              <div class="finance-block school-donation"><strong>追加捐贈</strong><label>金額 <input v-model.number="schoolDonation" type="number" min="100" max="10000" step="100"></label><button type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'donate', { amount: Number(schoolDonation) }, now)" @click="beginSchoolAction('donate', { amount: Number(schoolDonation) })">答題捐贈給學校</button></div>
              <div v-if="privateSchool.plotIndexes?.length" class="finance-block"><strong>📐 規劃招生與課程</strong><div class="school-form"><label>班級數<select v-model.number="schoolClasses"><option v-for="count in schoolLevel(privateSchool.levelId).maxClasses" :key="count" :value="count">{{ count }} 班</option></select></label><label>預計招生人數<input v-model.number="schoolAdmissions" type="number" min="10" :max="schoolClasses * schoolLevel(privateSchool.levelId).classSize"></label><label>課程特色<select v-model="schoolTheme"><option v-for="theme in SCHOOL_THEMES" :key="theme.id" :value="theme.id">{{ theme.icon }} {{ theme.name }}</option></select></label><label>獎學金減免<select v-model.number="schoolScholarships"><option :value="0">0%</option><option :value="10">10%</option><option :value="20">20%</option></select></label></div><small>{{ schoolLevel(privateSchool.levelId).name }}每班最多規劃 {{ schoolLevel(privateSchool.levelId).classSize }} 人；每增一班支付 {{ schoolLevel(privateSchool.levelId).expansionCost }} 金幣。獎學金可提升聲望，也會減少學費。</small><button type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'configure', schoolConfig(), now)" @click="beginSchoolAction('configure', schoolConfig())">答題儲存校務規劃</button></div>
              <div v-if="privateSchool.plotIndexes?.length" class="finance-block"><strong>👩‍🏫 教師招聘</strong><p>{{ schoolLevel(privateSchool.levelId).name }}目前至少需要 {{ schoolTeacherNeed(privateSchool) }} 名教師；先在高階人力仲介聘校長與行政人員，再選擇適合課程的教師。</p><div class="school-staff-list"><div v-for="contract in privateSchool.staff.filter(item => item.role === 'teacher')" :key="contract.personId"><strong>{{ schoolCandidate(contract.personId)?.name }} · {{ schoolCandidate(contract.personId)?.specialty }}</strong><small>{{ contract.paidUntil > now ? '在任至' : '已到期' }} {{ new Date(contract.paidUntil).toLocaleString('zh-TW') }}</small><div class="economy-actions"><button v-if="contract.paidUntil <= now" type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'renew', { personId: contract.personId }, now)" @click="beginSchoolAction('renew', { personId: contract.personId })">答題續聘</button><button type="button" :disabled="busy || !!quiz" @click="beginSchoolAction('dismiss', { personId: contract.personId })">解約</button></div></div></div><div class="school-market"><article v-for="person in schoolCandidateList('teacher')" :key="person.id"><strong>{{ person.name }} · {{ person.specialty }}</strong><small>能力 {{ person.skill }} · 24 小時薪資 {{ person.fee }} 金幣</small><button type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'hire', { personId: person.id }, now)" @click="beginSchoolAction('hire', { personId: person.id })">答題聘任</button></article></div></div>
              <div v-if="privateSchool.plotIndexes?.length" class="finance-block"><strong>📣 辦理招生</strong><p>{{ schoolLevel(privateSchool.levelId).name }}目前 {{ privateSchool.classes }} 班／目標 {{ privateSchool.admissionTarget }} 人；在任校長 {{ schoolStaff('principal').length }}、行政 {{ schoolStaff('administrator').length }}、教師 {{ schoolStaff('teacher').length }}/需 {{ schoolTeacherNeed(privateSchool) }}。每輪相隔 3 小時。</p><p>預估校務與水電費 {{ schoolTermExpense(privateSchool) }} 金幣，從學校基金支付。此學制學費 {{ schoolLevel(privateSchool.levelId).tuition }} 金幣／人，評量重點是{{ schoolLevel(privateSchool.levelId).outcome }}；招生人數及教學品質影響聲望。</p><p v-if="schoolNextTerm">下輪招生還需 {{ waitLabel(schoolNextTerm) }}</p><button type="button" :disabled="busy || !!quiz || !!schoolActionError(farm, 'enroll', {}, now)" @click="beginSchoolAction('enroll')">答題辦理新一輪招生</button><p v-if="privateSchool.lastResult">最近一輪：{{ privateSchool.lastResult.students }} 人 · {{ privateSchool.lastResult.outcome || '教學品質' }} {{ privateSchool.lastResult.quality }} · 學費 {{ privateSchool.lastResult.tuition }} · 校務支出 {{ privateSchool.lastResult.expense }}</p></div>
              <div class="finance-block"><strong>📒 學校基金紀錄</strong><div class="school-history"><p v-for="(entry, index) in privateSchool.history" :key="index">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.detail }}</p></div></div>
            </template>
          </section>
          <section v-if="activePanel === 'civic' && !visiting" class="finance-card civic-card">
            <h2>🏛️ 公益法人</h2>
            <p>從自己的農地捐地成立圖書館或醫院。每個法人都有獨立基金、職員、設施、服務與收支紀錄；點選下方進入全頁管理。</p>
            <div class="civic-entry-grid">
              <NuxtLink v-for="(config, kind) in CIVIC_FOUNDATIONS" :key="kind" :to="{ path: '/game-happy-farm-foundation', query: { ...lesson, kind } }" class="civic-entry">
                <span>{{ config.icon }}</span><strong>{{ farm.civicFoundations?.[kind]?.name || `成立${config.label}` }}</strong>
                <small v-if="farm.civicFoundations?.[kind]">基金 {{ farm.civicFoundations[kind].fund }} · 聲望 {{ farm.civicFoundations[kind].reputation }}/100</small>
                <small v-else>捐贈 {{ config.gift }} 金幣與 {{ config.land }} 格自有地</small>
                <b>進入{{ config.label }}管理 →</b>
              </NuxtLink>
            </div>
            <small>遊戲中的金額和地格並非現實財團法人或醫療機構設立標準。</small>
          </section>
          <section v-if="activePanel === 'finance' && !visiting" class="finance-card">
            <h2>💰 農場資金</h2>
            <div class="finance-block">
              <strong>🏛️ 政府短期零利率紓困</strong>
              <p>金幣低於 {{ SEED_RESERVE }} 且已無種苗時，可借 {{ GOVERNMENT_LOAN_AMOUNT }} 金幣，期限 24 小時；不能重複借。未還清前觀光農場免費開放參觀。到期後，每次農場收款或操作會自動扣還，保留 {{ SEED_RESERVE }} 金幣買種苗。</p>
              <p v-if="governmentBalance">尚欠 {{ governmentBalance }} 金幣 · 到期 {{ new Date(farm.governmentLoan.dueAt).toLocaleString('zh-TW') }}</p>
              <div class="economy-actions"><button type="button" :disabled="!!governmentLoanError(farm, 'borrowGovernment') || busy || !!quiz" @click="beginFinanceAction('borrowGovernment')">答題申請紓困</button><button type="button" :disabled="!!governmentLoanError(farm, 'repayGovernment') || busy || !!quiz" @click="beginFinanceAction('repayGovernment')">答題償還可用餘額</button></div>
            </div>
            <div class="finance-block">
              <strong>🤝 同班短期借款</strong>
              <p>同學同意後立即撥款，24 小時內一次還清本金與 10% 利息。申請時抵押一塊空地；逾期後，下次任一方進入農場會按約定價格強制賣地，先償還本金和利息，餘款返還你。</p>
              <p v-if="loanError" class="visit-warning">{{ loanError }}</p>
              <template v-if="!student?.isAnon">
                <div class="finance-pickers"><label>出借同學<select v-model="chosenClassmateId"><option value="" disabled>選擇同班同學</option><option v-for="person in classmates" :key="person.student_id" :value="person.student_id">{{ person.seat_number }} 號 · {{ person.hidden_name }}</option></select></label><label>借款金額<select v-model.number="loanAmount"><option :value="60">60 金幣</option><option :value="100">100 金幣</option></select></label><label>抵押空地<select v-model.number="loanPlotChoice"><option :value="-1" disabled>選擇空地</option><option v-for="entry in eligibleLoanPlots" :key="entry.index" :value="entry.index">{{ plotLabel(entry.index) }}</option></select></label></div>
                <p>借 {{ loanAmount }} → 到期應還 {{ loanAmount + Math.ceil(loanAmount * .1) }}；逾期賣地價 {{ loanAmount + 60 }}，扣還後返還 {{ 60 - Math.ceil(loanAmount * .1) }} 金幣。</p>
                <button type="button" :disabled="!!financeProblem('request')" @click="beginFinanceAction('request')">答題送出借款申請</button>
                <div v-if="relevantLoans.length" class="loan-list"><article v-for="loan in relevantLoans" :key="loan.id"><strong>{{ loanPerson(loan.borrower_id) }} 向 {{ loanPerson(loan.lender_id) }} 借 {{ loan.principal }} 金幣 · {{ loanStatus(loan) }}</strong><small>利息 {{ loan.interest }} · 抵押 {{ villageName(loan.collateral_village) }}一格 · {{ loan.status === 'active' ? '到期 ' + new Date(loan.due_at).toLocaleString('zh-TW') : '待同學同意' }}</small><div class="economy-actions"><button v-if="loan.status === 'pending' && loan.lender_id === studentId" type="button" :disabled="busy || !!quiz || farm.coins < loan.principal + SEED_RESERVE" @click="beginFinanceAction('approve', loan)">答題同意出借</button><button v-if="loan.status === 'pending' && loan.lender_id === studentId" type="button" :disabled="busy || !!quiz" @click="beginFinanceAction('reject', loan)">答題拒絕</button><button v-if="loan.status === 'pending' && loan.borrower_id === studentId" type="button" :disabled="busy || !!quiz" @click="beginFinanceAction('cancel', loan)">答題撤銷</button><button v-if="loan.status === 'active' && loan.borrower_id === studentId" type="button" :disabled="busy || !!quiz || farm.coins < loan.principal + loan.interest" @click="beginFinanceAction('repay', loan)">答題還清 {{ loan.principal + loan.interest }}</button></div></article></div>
                <div v-if="recentClosedLoans.length" class="loan-list"><strong>最近結案</strong><article v-for="loan in recentClosedLoans" :key="loan.id"><span>{{ loanPerson(loan.borrower_id) }} 借 {{ loan.principal }} · {{ loanStatus(loan) }}</span><small v-if="loan.status === 'foreclosed'">賣地 {{ loan.sale_value }}，還本息 {{ loan.principal + loan.interest }}，返還 {{ loan.sale_value - loan.principal - loan.interest }} 金幣</small></article></div>
                <button type="button" class="finance-refresh" :disabled="busy || !!quiz" @click="refreshSocial">更新借款與農場</button>
              </template>
              <p v-else>同學借款需要使用學生帳號。</p>
            </div>
          </section>
          <section v-if="activePanel === 'visitors'" class="visit-card">
            <div class="visit-card-heading"><h2>🏘️ 同班互訪</h2><button type="button" @click="refreshSocial" :disabled="busy || !!quiz">更新農場</button></div>
            <p v-if="student?.isAnon" class="help">匿名訪客不能拜訪同學農場，請先以學生帳號登入。</p>
            <template v-else>
              <p v-if="socialError" class="visit-warning">{{ socialError }}</p>
              <div class="friend-picker">
                <select v-model="chosenClassmateId" aria-label="選擇同班同學" :disabled="loadingPeer || busy || !!quiz">
                  <option value="" disabled>選擇同班同學</option>
                  <option v-for="person in classmates" :key="person.student_id" :value="person.student_id">{{ person.seat_number }} 號 · {{ person.hidden_name }}</option>
                </select>
                <button type="button" :disabled="!chosenClassmateId || loadingPeer || busy || !!quiz" @click="visitChosenClassmate">{{ loadingPeer ? '載入中…' : '前往拜訪' }}</button>
              </div>
              <p v-if="!classmates.length" class="help">目前沒有可選的同班學生。</p>
              <template v-if="visiting">
                <div class="visit-heading"><strong>正在拜訪：{{ visiting.hidden_name }}</strong><button type="button" @click="returnHomeFarm" :disabled="busy || !!quiz">回我的農場</button></div>
                <p class="visit-target">第 {{ selectedPlot + 1 }} 塊田：{{ selected ? crop(selected.crop)?.name + ' · ' + plotStage(selected) : '空地' }}</p>
                <div v-if="selected" class="care-detail" aria-label="同學田地的照料狀態"><span v-for="status in careStatus(selected)" :key="status.key" :class="status.state">{{ status.icon }} {{ status.text }}</span></div>
                <div class="visit-actions">
                  <button type="button" :disabled="!canVisit('water')" @click="beginAction('water')">💧 幫忙澆水</button>
                  <button type="button" :disabled="!canVisit('weed')" @click="beginAction('weed')">🌾 幫忙除草</button>
                  <button type="button" :disabled="!canVisit('pest')" @click="beginAction('pest')">🐛 幫忙除蟲</button>
                  <button type="button" :disabled="!canVisit('steal')" @click="beginAction('steal')">🧺 偷菜一份</button>
                </div>
                <p class="help">每天最多偷菜三次（已用 {{ dailySteals }}/3）；每塊田只能被偷一次，主人至少保留一份。</p>
              </template>
              <div class="visit-log">
                <strong>最近來訪</strong>
                <p v-if="!recentVisits.length">尚無同學來訪紀錄。</p>
                <p v-for="(event, index) in recentVisits" :key="index">{{ classmateName(event.actor_id) }} {{ event.action === 'steal' ? '摘取了' + crop(event.crop)?.name : '幫忙' + visitActionText(event.action) }}</p>
              </div>
            </template>
          </section>
        </aside>
      </div>
    </template>
    <section v-else-if="!loading" class="start-help"><NuxtLink to="/">返回首頁選擇單元</NuxtLink></section>
    <div v-if="ready && !farm.gender" class="hero-shade"><section class="hero-dialog gender-dialog" role="dialog" aria-modal="true" aria-labelledby="gender-title"><h2 id="gender-title">👤 建立農場角色</h2><p>選擇遊戲角色性別，之後可認識對象並建立家庭。選定後直到轉生前不能更換。</p><div class="economy-actions"><button type="button" :disabled="busy" @click="selectFarmGender('male')">👨 男</button><button type="button" :disabled="busy" @click="selectFarmGender('female')">👩 女</button></div></section></div>
    <div v-if="ready && farm.gender && !farm.protagonistId" class="hero-shade">
      <section class="hero-dialog" role="dialog" aria-modal="true" aria-labelledby="hero-title">
        <h2 id="hero-title">🎭 選擇你的主角</h2>
        <p>你有自己的本業，農夫是兼職。選定後不能更換；付費轉生會讓農場從頭開始。</p>
        <div class="hero-grid"><button v-for="person in FARM_PROTAGONISTS" :key="person.id" type="button" class="hero-choice" :style="{ background: person.color }" :disabled="busy" @click="selectProtagonist(person.id)"><FarmHeroPortrait :person="person" /><strong>{{ person.name }}</strong><small>{{ person.story }}</small><em>起步 +{{ person.amount }} 金幣 · {{ person.skill }}</em></button></div>
      </section>
    </div>
    <div v-if="quiz" class="quiz-shade">
      <section class="quiz-card" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
        <p class="eyebrow">答對即可完成一次農場操作</p>
        <h2 id="quiz-title">{{ quiz.actionText }}</h2>
        <p class="quiz-prompt">{{ quiz.prompt }}</p>
        <p v-if="quizError" class="quiz-error" role="alert">{{ quizError }}</p>
        <form @submit.prevent="submitAnswer">
          <div v-if="quiz.mode === 'choice'" class="choices">
            <button v-for="choice in quiz.choices" :key="choice" type="button" :class="{ picked: answer === choice }" @click="answer = choice">{{ choice }}</button>
          </div>
          <div v-else class="write-answer"><strong v-if="quiz.masked">{{ quiz.masked }}</strong><input v-model="answer" autocomplete="off" autocapitalize="off" spellcheck="false" :maxlength="quiz.mode === 'letters' ? 2 : 60" :placeholder="quiz.mode === 'letters' ? '輸入兩個字母' : '輸入英文'" /></div>
          <div class="quiz-actions"><button type="button" class="cancel" :disabled="busy" @click="quiz = null">取消操作</button><button type="submit" :disabled="busy || !answer.trim()">{{ busy ? '儲存中…' : '送出答案' }}</button></div>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.farm-page{min-height:100vh;padding:22px clamp(12px,3vw,40px) 38px;color:#264028;background:linear-gradient(#afdfef 0 220px,#e9f7ce 220px 100%);font-family:system-ui,-apple-system,sans-serif}
.farm-header,.status-bar,.farm-layout{max-width:1320px;margin:auto}
.farm-header{display:flex;justify-content:space-between;align-items:center;gap:20px}
.farm-header h1{margin:3px 0;font-size:clamp(1.6rem,3vw,2.5rem);color:#245b38}
.farm-header p{margin:2px 0}
.eyebrow{letter-spacing:.12em;font-size:.72rem;font-weight:900;color:#466d4a}
.farm-top-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.farm-page button,.farm-page select,.farm-page input{font:inherit}
.farm-page button{cursor:pointer}
.farm-top-actions button,.status-bar a,.quiz-actions button,.expand{border:2px solid #2e7546;border-radius:12px;background:#fff8db;color:#275b38;padding:9px 13px;font-weight:800;text-decoration:none}
.quiet-link{color:#245b38;font-weight:800}
.feedback{display:flex;gap:8px;max-width:1320px;margin:8px auto}
.notice,.save-notice{max-width:1320px;margin:12px auto;padding:10px 14px;border:2px solid #7da96b;border-radius:12px;background:#fffdf0;font-weight:700}
.feedback .notice,.feedback .save-notice{margin:0}.feedback .notice{flex:1;min-width:0}
.save-notice{font-size:.82rem}
.save-notice button{margin-left:8px;border:0;background:transparent;text-decoration:underline;color:#125b85}
.status-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.status-bar>div,.status-bar>a{display:flex;gap:8px;align-items:center;background:#fffdf1;border:2px solid #9dbb72;border-radius:12px;padding:9px 14px;box-shadow:0 3px 0 #b4c888}
.status-bar strong{color:#a5521a}
.status-bar a{margin-left:auto}
.farm-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,1fr);gap:16px;align-items:start}
.farm-field{position:relative;min-height:560px;overflow:hidden;border:4px solid #74a45a;border-radius:22px;background:radial-gradient(ellipse at 50% 90%,#89c66f,#78b85e 70%,#64a650);box-shadow:0 12px 0 #b8d69d}
.animal-field{display:flex;flex-direction:column;min-height:560px;min-width:0;overflow:hidden;border:4px solid #74a45a;border-radius:22px;background:linear-gradient(#c1ecf0 0 18%,#a6d67d 18% 100%);box-shadow:0 12px 0 #b8d69d}
.animal-scene{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 18px;color:#275838;font-size:1rem}.animal-scene strong{font-size:1.3rem}.animal-scene span{font-weight:800}
.animal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:10px;min-height:0;flex:1;padding:12px}
.animal-pen{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;border:3px solid #9d7549;border-radius:15px;background:linear-gradient(145deg,#fff9dd,#e8d5a9);color:#3c5634;box-shadow:0 4px #94724d;transition:transform .15s,border-color .15s}
.animal-pen:hover,.animal-pen.chosen{transform:translateY(-3px);border-color:#d18727;outline:3px solid #ffe69a}.animal-pen.owned{background:linear-gradient(145deg,#f5ffda,#d4eda8)}.animal-pen.productive{background:linear-gradient(145deg,#fff3c1,#ffe093)}
.animal-sprite{font-size:clamp(1.8rem,5vh,3.5rem);line-height:1.1;animation:animal-bob 3s ease-in-out infinite}.animal-pen:nth-child(3n) .animal-sprite{animation-delay:-1s}.animal-pen:nth-child(3n + 1) .animal-sprite{animation-delay:-2s}
.animal-pen strong{font-size:1rem}.animal-pen small{font-size:.75rem;font-weight:800}.animal-pen-product{font-size:.72rem;color:#6a6043}
.animal-scene-note{margin:0;padding:6px 12px;background:#ebf8cd;color:#326044;text-align:center;font-size:.78rem;font-weight:750}
.animal-card{display:flex;flex-direction:column;gap:9px;min-height:0;border:3px solid #8eb471;border-radius:18px;padding:16px;background:#fffdf0;box-shadow:0 6px 0 #bdd6a3}
.animal-card h2{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0;color:#326341;font-size:1.3rem}.animal-card h2 small{font-size:.78rem}.animal-card p{margin:0}.animal-intro{font-weight:800}.animal-economy,.animal-total,.animal-disclaimer{font-size:.8rem;color:#586c51}
.animal-care-list{display:grid;gap:7px}.animal-care-list button{display:flex;align-items:center;justify-content:space-between;gap:8px;border:2px solid #81ab78;border-radius:10px;background:#e8f5d2;color:#28543b;padding:10px;text-align:left;font-size:.9rem;font-weight:800}.animal-care-list button.done{background:#d4eed1}.animal-care-list button strong{white-space:nowrap;font-size:.78rem}
.animal-primary,.animal-inventory button{border:2px solid #45865a;border-radius:10px;background:#d9efaa;color:#245438;padding:10px;font-weight:900}.animal-primary{width:100%}.animal-help{font-size:.83rem;color:#356647}
.animal-inventory{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding:10px;border:1px dashed #a4bc8c;border-radius:10px;background:#f8ffe9;font-size:.85rem;font-weight:800}.animal-inventory button{padding:7px 10px}.animal-total{font-weight:800}
@keyframes animal-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.scene-sky{height:63px;display:flex;justify-content:space-around;align-items:center;font-size:2rem;background:linear-gradient(#a9dff3,#e0f5e9)}
.farm-barn{width:max-content;max-width:75%;margin:15px auto 10px;padding:10px 20px;border:3px solid #9b6435;border-radius:16px;background:#f8e0a0;box-shadow:0 6px #a37a48;font-size:1.7rem}
.farm-barn span{font-size:.95rem;font-weight:900}
.field-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;max-width:620px;max-height:580px;overflow:auto;margin:16px auto 20px;padding:5px 16px 12px;transform:rotate(-2deg)}
.plot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:94px;border:4px solid #915c35;border-radius:14px;background:repeating-linear-gradient(25deg,#bd8654 0 12px,#a46d43 13px 24px);color:#fffbe4;text-shadow:0 2px 2px #533321;box-shadow:0 6px 0 #6d492d;transition:transform .15s}
.plot:hover,.plot.chosen{transform:translateY(-4px);outline:4px solid #ffe57d}
.plot.mature{background:#986439}
.plot.locked{cursor:default;border-color:#899588;background:#b5c2ae;box-shadow:none;opacity:.7}
.plot-number{position:absolute;top:4px;left:8px;font-size:.68rem}
.plot-plant{font-size:2.3rem;line-height:1.1}
.plot-name{font-weight:900;font-size:.78rem}
.plot-progress{font-size:.7rem}
.plot-alert{position:absolute;right:3px;top:3px;font-size:1rem}
.scene-footer{text-align:center;font-size:1.9rem}
.farm-controls{display:grid;gap:14px}
.panel-tabs{display:flex;gap:6px}
.panel-tabs button{flex:1;border:2px solid #74a65d;border-radius:10px;background:#fffdf0;color:#315b39;padding:8px 5px;font-weight:850}
.panel-tabs{overflow-x:auto}.panel-tabs button{min-width:64px;white-space:nowrap}
.panel-tabs button.active{background:#d8f1a9;border-color:#3d8451}
.panel-subtabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.panel-subtabs button{min-width:0;border:1px solid #78a465;border-radius:9px;background:#f8ffe7;color:#315b39;padding:8px 3px;font-size:.78rem;font-weight:800}.panel-subtabs button.active{background:#d8f1a9;border-width:2px}
.quiz-cadence{flex:none;margin:0;padding:5px 8px;border-radius:8px;background:#edf7d5;color:#315b39;font-size:.72rem;font-weight:750;line-height:1.35}
.finance-card{border:3px solid #8eb471;border-radius:18px;padding:14px;background:#fffdf0;box-shadow:0 6px 0 #bdd6a3}.finance-card h2{margin:0 0 9px;color:#326341}.finance-block{display:grid;gap:8px;border-top:1px dashed #b6cba6;padding:11px 0}.finance-block p{margin:0;font-size:.82rem;line-height:1.5}.finance-block strong{color:#245b38}.finance-pickers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.finance-pickers label{display:grid;gap:3px;font-size:.75rem;font-weight:800}.finance-pickers select{min-width:0;width:100%;border:1px solid #8eaf7d;border-radius:8px;padding:7px;background:#fff}.finance-block>button,.finance-refresh{border:2px solid #418151;border-radius:9px;background:#e2f3bb;padding:8px;color:#245338;font-weight:800}.loan-list{display:grid;gap:6px}.loan-list article{display:grid;gap:5px;border:1px solid #b6cba6;border-radius:9px;padding:8px;background:#f6fce7}.loan-list small{font-size:.73rem}
.tool-card,.shop-card{border:3px solid #8eb471;border-radius:18px;padding:16px;background:#fffdf0;box-shadow:0 6px 0 #bdd6a3}
.visit-card{border:3px solid #8eb471;border-radius:18px;padding:16px;background:#fffdf0;box-shadow:0 6px 0 #bdd6a3}
.visit-card h2{margin:0 0 7px;color:#326341;font-size:1.15rem}
.visit-card-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}
.visit-card-heading button{border:1px solid #418151;border-radius:8px;background:#fff;padding:4px 7px;color:#245338;font-size:.73rem;font-weight:800}
.friend-picker{display:flex;gap:6px}
.friend-picker select{min-width:0;flex:1;border:2px solid #9bbc7c;border-radius:9px;background:#fff;padding:9px}
.friend-picker button,.visit-heading button,.visit-actions button{border:2px solid #418151;border-radius:10px;background:#e2f3bb;padding:8px;color:#245338;font-size:.82rem;font-weight:800}
.visit-heading{display:flex;justify-content:space-between;align-items:center;gap:7px;margin-top:12px}
.visit-target{margin:8px 0;font-size:.85rem}
.visit-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.visit-card .help{font-size:.74rem;line-height:1.45}
.visit-warning{border:2px solid #c78e42;border-radius:8px;background:#fff3d8;padding:8px;font-size:.78rem}
.visit-log{border-top:1px dashed #adcaa0;margin-top:10px;padding-top:8px;font-size:.74rem}
.visit-log p{margin:3px 0}
.tool-card h2,.shop-card h2{margin:0 0 6px;color:#326341;font-size:1.15rem}
.tool-card p{margin:5px 0 10px}
.tool-card label{display:block;font-size:.78rem;font-weight:800;margin:9px 0 4px}
.tool-card select{width:100%;padding:9px;border:2px solid #9bbc7c;border-radius:9px;background:#fff}
.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:12px 0}
.tool-grid button,.shop-row button{border:2px solid #418151;border-radius:10px;background:#e2f3bb;padding:9px 5px;color:#245338;font-size:.83rem;font-weight:800}
.farm-page button:disabled{opacity:.45;cursor:not-allowed}
.tool-card .help{font-size:.78rem;line-height:1.5;color:#607460}
.shop-row{display:flex;justify-content:space-between;gap:8px;align-items:center;border-top:1px dashed #b6cba6;padding:9px 0}
.shop-row>div:first-child{display:grid;gap:2px}
.shop-row small{font-size:.72rem;color:#6d7862}
.shop-row>div:last-child{display:flex;flex-direction:column;gap:5px;flex-shrink:0}
.shop-row button{padding:5px 8px}
.expand{width:100%;margin-top:8px}
.start-help{text-align:center;padding:28px}
.quiz-shade{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:14px;background:#153c28ae}
.quiz-card{width:min(100%,490px);max-height:calc(100vh - 30px);overflow:auto;border:4px solid #7da859;border-radius:22px;background:#fffdf1;box-shadow:0 14px 0 #34512b;padding:24px}
.quiz-card h2{margin:5px 0 15px}
.quiz-prompt{font-size:1.15rem;font-weight:800}
.quiz-error{border:2px solid #c45144;border-radius:9px;padding:9px;background:#fff0eb;color:#9b3028}
.choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.choices button{border:2px solid #a4bd85;border-radius:11px;background:#fff;padding:13px 8px;color:#263f28;font-weight:800}
.choices button.picked{background:#e1f5b1;border-color:#4c8a42}
.write-answer strong{display:block;font-size:1.8rem;letter-spacing:.15em;margin:10px 0}
.write-answer input{width:100%;box-sizing:border-box;padding:12px;border:2px solid #9fbc82;border-radius:10px}
.quiz-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}
.quiz-actions button:last-child{background:#d9ef9f}
.quiz-actions .cancel{background:#fff}
@media(max-width:850px){.farm-layout{grid-template-columns:1fr}.farm-field,.animal-field{min-height:0}.field-grid{max-width:580px}.farm-controls{display:flex;flex-direction:column}.status-bar a{margin-left:0}}
@media(max-width:620px){.farm-page{padding:12px 9px 25px}.farm-header{align-items:flex-start}.farm-header h1{font-size:1.5rem}.farm-top-actions{justify-content:flex-end}.farm-top-actions button{font-size:.74rem;padding:7px}.farm-controls{grid-template-columns:1fr}.farm-field{border-width:2px}.field-grid{gap:6px;margin:14px auto;padding:0 8px}.plot{min-height:76px;border-width:2px;border-radius:9px}.plot-plant{font-size:1.65rem}.plot-name,.plot-progress{font-size:.63rem}.plot-alert{font-size:.78rem}.scene-footer{font-size:1.4rem}.status-bar{gap:6px}.status-bar>div,.status-bar>a{font-size:.75rem;padding:7px}.choices{grid-template-columns:1fr}}
@media(min-width:900px) and (min-height:560px){
  .farm-page{box-sizing:border-box;height:100dvh;min-height:0;overflow:hidden;display:flex;flex-direction:column;padding:8px 16px}
  .farm-header{width:100%;flex:none}.farm-header h1{font-size:1.55rem;margin:0}.farm-header .eyebrow{font-size:.6rem}.farm-header p{font-size:.78rem}
  .feedback{width:100%;flex:none;margin:5px auto}.feedback .notice,.feedback .save-notice{padding:6px 10px;font-size:.78rem}
  .status-bar{width:100%;flex:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) auto auto;gap:6px;margin:0 auto 7px}
  .status-bar>div,.status-bar>a{padding:5px 7px;min-width:0;font-size:.7rem;box-shadow:none}
  .status-bar a{margin-left:0;white-space:nowrap}
  .farm-layout{width:100%;height:0;flex:1;min-height:0;margin:0 auto;grid-template-columns:minmax(0,1.5fr) minmax(320px,.9fr);gap:10px}
  .farm-field{box-sizing:border-box;min-height:0;height:100%;display:flex;flex-direction:column;box-shadow:none}
  .animal-field{box-sizing:border-box;min-height:0;height:100%;box-shadow:none}.animal-grid{gap:7px;padding:7px}.animal-pen{min-height:0;border-width:2px}.animal-scene{padding:5px 11px}.animal-scene strong{font-size:1rem}.animal-scene-note{padding:4px 8px;font-size:.69rem}
  .scene-sky{height:35px;flex:none;font-size:1.45rem}
  .farm-barn{flex:none;margin:5px auto;padding:4px 12px;font-size:1.15rem;box-shadow:0 3px #a37a48}
  .farm-barn span{font-size:.78rem}
  .field-grid{box-sizing:border-box;width:min(100%,680px);max-width:none;min-height:0;flex:1;grid-auto-rows:minmax(0,1fr);gap:6px;margin:5px auto;padding:0 10px}
  .plot{min-height:0;border-width:2px;box-shadow:0 3px #6d492d}.plot-plant{font-size:clamp(1.35rem,3vh,2rem)}
  .plot-name,.plot-progress{font-size:.65rem}.scene-footer{flex:none;font-size:1.25rem;line-height:1.3}
  .farm-controls{display:flex;flex-direction:column;min-height:0;height:100%;gap:7px}
  .panel-tabs{flex:none}.panel-tabs button{padding:5px 3px;font-size:.78rem}
  .tool-card,.shop-card,.visit-card,.animal-card{box-sizing:border-box;flex:1;min-height:0;overflow:hidden;padding:10px;box-shadow:none}.animal-card{gap:5px}.animal-card h2{font-size:1rem}.animal-care-list{gap:4px}.animal-care-list button{padding:6px}.animal-inventory{padding:6px}
  .tool-card h2,.shop-card h2,.visit-card h2{font-size:.98rem}
  .tool-card p{margin:3px 0}.tool-card label{margin:5px 0 3px}.tool-card select{padding:6px}
  .tool-grid{margin:7px 0;gap:5px}.tool-grid button{padding:7px 3px;font-size:.75rem}
  .shop-row{padding:5px 0}.shop-row small{font-size:.66rem}.shop-row button{padding:3px 6px}
  .visit-heading{margin-top:7px}.visit-target{margin:4px 0}.visit-actions{gap:5px}
  .visit-actions button{padding:5px}.visit-card .help{margin:6px 0}
  .visit-log{margin-top:6px;padding-top:5px}.visit-log p{margin:2px 0}
}
.land-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;min-height:0;padding:4px 10px 12px;box-sizing:border-box}
.map-panel,.village-field{min-width:0;min-height:0;display:flex;flex-direction:column}
.map-heading,.village-heading{display:flex;justify-content:space-between;align-items:center;gap:6px;margin:0 0 4px;padding:4px 7px;border-radius:8px;background:#ecf8cd;color:#285d38;font-size:.78rem}
.village-heading{background:#fff3c7}
.village-land-actions{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:7px;margin:0 0 5px;min-height:29px}.village-land-actions button{border:1px solid #367a47;border-radius:8px;background:#e0f3b4;color:#275b38;padding:5px 9px;font-size:.74rem;font-weight:900}.village-land-actions small{color:#744a26;font-size:.69rem;font-weight:800}
.map-heading span,.village-heading span{font-size:.7rem}
.village-map{display:block;min-height:0;max-height:295px;width:100%;flex:1;overflow:visible;filter:drop-shadow(0 3px 2px #2e663e58)}
.village-shape{fill:#b6d39c;stroke:#fff9df;stroke-width:2;cursor:pointer;transition:fill .16s}
.village-shape:hover,.village-shape:focus{fill:#f7d876;outline:none;stroke:#835e28;stroke-width:4}
.village-shape.owned{fill:#69b56c}.village-shape.home{fill:#3e9153}.village-shape.selected{fill:#f4c457;stroke:#613f26;stroke-width:6}
.district-outline{fill:none;stroke:#285b36;stroke-width:6;pointer-events:none}
.village-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;margin-top:4px}
.village-list button{min-width:0;border:1px solid #5c915e;border-radius:6px;background:#edf2d5;color:#25452c;font-size:.65rem;font-weight:800;padding:3px 1px;white-space:nowrap}
.village-list button.owned{background:#c1efb7}.village-list button.home{background:#82cb8b}.village-list button.selected{background:#ffe193;border:2px solid #8b5d28}
.map-source{margin-top:3px;color:#225744;text-align:center;font-size:.59rem}
.village-field{background:#d1ad80;border:2px solid #a57548;border-radius:12px;padding:5px;box-sizing:border-box}
.village-field .field-grid{width:100%;max-width:325px;min-height:0;margin:0 auto;padding:2px;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr));gap:6px;transform:none}
.village-field .plot{min-height:64px;max-height:80px;padding:3px 1px;box-sizing:border-box}
.village-field .plot-plant{flex:none}
.village-field .plot-name,.village-field .plot-progress{line-height:1.1}
.plot-care{position:absolute;bottom:2px;left:2px;right:2px;display:flex;justify-content:center;gap:2px;line-height:1}
.plot-care span{padding:1px;border-radius:3px;background:#fffaf0d9;color:#526759;font-size:.56rem;text-shadow:none}
.plot-care span.done{background:#b9f2bd;color:#174a27}.plot-care span.urgent{background:#ffdda0;color:#8b311a;font-weight:900}
.village-field .plot-progress{padding-bottom:11px}
.action-pop{position:absolute;inset:10% 0;display:grid;place-items:center;font-size:2rem;pointer-events:none;animation:action-pop 1.6s ease-out both;text-shadow:0 2px #fff}
@keyframes action-pop{from{opacity:0;transform:translateY(12px) scale(.6)}25%{opacity:1;transform:translateY(-5px) scale(1.2)}to{opacity:0;transform:translateY(-24px) scale(1)}}
.care-detail{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:5px 0}
.care-detail span{display:block;border:1px solid #bacbb0;border-radius:6px;background:#f3f2e5;padding:3px 5px;font-size:.72rem;font-weight:800;color:#597059}
.care-detail span.done{background:#d9f2c9;color:#23603a}.care-detail span.urgent{background:#ffdfac;border-color:#cc8c4b;color:#8c391c}
.district-picker{display:flex;align-items:center;gap:5px;margin:2px 0;font-size:.7rem;font-weight:800}
.district-picker select,.neighbor-village-picker{min-width:0;flex:1;border:1px solid #618b5f;border-radius:6px;background:#fffdf0;color:#245338;padding:3px;font-size:.7rem}
.unlock-hint{margin:2px 0;padding:3px 6px;border-radius:6px;background:#e9f4d0;color:#2f5a39;font-size:.67rem;font-weight:800;text-align:center}
.neighbor-village-picker{flex:none;width:100%;margin-top:5px;font-size:.79rem;padding:6px}
.shop-card{display:flex;flex-direction:column}
.shop-card h2 small{display:block;font-size:.62rem;color:#50705a}
.shop-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;min-height:0;flex:1;overflow:auto;align-content:start}
.shop-list .shop-row{display:block;min-width:0;border:1px solid #b6cba6;border-radius:7px;padding:3px 5px;background:#fbffe9}
.shop-list .shop-row>div:first-child{gap:0}.shop-list .shop-row>div:last-child{flex-direction:row;gap:3px;margin-top:2px}
.shop-list .shop-row small{font-size:.59rem;white-space:nowrap}
.shop-list .shop-row button{flex:1;padding:2px;font-size:.62rem}
.shop-card .expand{flex:none;padding:5px;margin-top:5px;font-size:.75rem}
.unowned-land{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:#fff5da;border:2px dashed #a8814e;border-radius:12px;padding:15px;color:#654a2a}
.unowned-land span{font-size:2rem}.unowned-land p{max-width:260px;font-size:.8rem}
.unowned-note{margin:8px 2px;padding:7px 9px;border-radius:8px;background:#fff5da;color:#654a2a;font-size:.78rem;font-weight:750}
.shop-list .shop-row .seed-purchase{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin-top:5px}.seed-purchase label{display:flex;align-items:center;gap:4px;grid-column:1 / -1;font-size:.7rem;font-weight:800}.seed-purchase input{box-sizing:border-box;width:68px;min-width:0;border:1px solid #8cac75;border-radius:6px;padding:3px;background:#fff;color:#284a31}.seed-purchase small{grid-column:1 / -1}
.shop-list .crop-stock{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}.crop-stock span{display:inline-flex;align-items:center;gap:3px;border:1px solid #9abf81;border-radius:7px;background:#eaf6d7;padding:3px 5px;color:#245338;font-size:.7rem;font-weight:750;white-space:nowrap}.crop-stock strong{font-size:.9rem;color:#163e24}.shop-list .shop-row .seed-purchase small{font-size:.68rem;white-space:normal}.shop-list .shop-row .seed-purchase button{font-size:.7rem;min-height:28px}
.worker-card{display:flex;flex-direction:column;gap:7px;min-height:0;border:3px solid #8eb471;border-radius:18px;padding:12px;background:#fffdf0;color:#245338;box-shadow:0 6px 0 #bdd6a3}.worker-card h2{margin:0;font-size:1.12rem}.worker-help,.worker-report{margin:0;font-size:.75rem;line-height:1.4}.worker-summary,.worker-settings,.worker-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.worker-summary>*{border-radius:7px;background:#eaf6d7;padding:5px 7px;font-size:.75rem}.worker-settings label{display:flex;align-items:center;gap:4px;flex:1;min-width:140px;font-size:.74rem;font-weight:800}.worker-settings select{flex:1;min-width:0;padding:5px;border:1px solid #8cac75;border-radius:7px;background:#fff;color:#245338}.worker-task-list{display:flex;flex-wrap:wrap;gap:5px}.worker-task-list label{display:flex;align-items:center;gap:3px;border:1px solid #a4c88b;border-radius:7px;padding:4px 6px;font-size:.75rem;font-weight:800}.worker-actions button,.worker-person button{border:1px solid #418151;border-radius:8px;background:#e2f3bb;color:#245338;padding:6px 9px;font-size:.75rem;font-weight:800}.worker-actions button{flex:1}.worker-report{border-radius:7px;background:#f0f6e3;padding:5px}.worker-roster{display:grid;grid-template-columns:1fr 1fr;gap:5px;min-height:0;overflow:auto;align-content:start}.worker-person{display:flex;justify-content:space-between;align-items:center;gap:5px;border:1px solid #b6cba6;border-radius:8px;background:#fbffe9;padding:6px;min-width:0}.worker-person>div{display:flex;flex-direction:column;gap:2px;min-width:0}.worker-person strong{font-size:.82rem}.worker-person span,.worker-person small{font-size:.69rem;line-height:1.3}.worker-person button{flex:none;padding:5px}.worker-disclaimer{font-size:.68rem;color:#607460}
.worker-view-tabs{display:flex;gap:5px}.worker-view-tabs button{flex:1;border:1px solid #78a465;border-radius:7px;background:#f8ffe7;color:#245338;padding:5px;font-size:.74rem;font-weight:800}.worker-view-tabs button.active{background:#d8f1a9}.worker-task-groups{display:grid;gap:5px;overflow:auto;min-height:0;max-height:160px}.worker-task-group{border:1px solid #b6cba6;border-radius:8px;padding:5px;background:#f6fbe9}.worker-task-group>strong{display:block;margin-bottom:3px;font-size:.73rem}.worker-focus{display:flex;align-items:center;gap:4px;font-size:.68rem;font-weight:800}.worker-focus select{min-width:0;max-width:100%;border:1px solid #8cac75;border-radius:5px;background:#fff;color:#245338;font-size:.68rem}.worker-history{display:grid;gap:5px;overflow:auto;min-height:0;align-content:start}.worker-history>div{display:grid;gap:2px;border:1px solid #b6cba6;border-radius:7px;padding:6px;background:#fbffe9;font-size:.74rem}.worker-history>div span{line-height:1.4}.plot-reserve-button{width:100%;border:1px solid #a47654;border-radius:8px;background:#fff2d8;color:#684627;padding:6px;font-size:.75rem;font-weight:800}.plot.reserved{border-color:#c88b51;background:#f6ead8}.staffing-state{border:1px solid #acc793;border-radius:7px;padding:6px;background:#eef7df;line-height:1.4}.utility-block,.demolition-block{flex:1;min-height:0;overflow:auto;align-content:start}.utility-numbers{display:grid;grid-template-columns:1fr 1fr;gap:5px}.utility-numbers span{border:1px solid #afc995;border-radius:7px;background:#fff;padding:6px;font-weight:800}.utility-block>button{border:1px solid #418151;border-radius:8px;background:#e2f3bb;color:#245338;padding:7px;font-weight:800}.utility-sites{display:grid;gap:4px;min-height:0;overflow:auto;max-height:170px}.utility-sites>span{border-bottom:1px dashed #b6cba6;padding:3px;font-size:.73rem}.status-bar .utility-shortcut{border:1px solid #6c9b76;border-radius:6px;background:#e9f6df;color:#245338;padding:2px 4px;font-size:.65rem;font-weight:800;cursor:pointer}
@media(max-width:620px){.panel-subtabs button{font-size:.68rem;padding:7px 1px}.worker-roster{grid-template-columns:1fr}.worker-card{min-height:420px}.shop-list .crop-stock span{font-size:.68rem}}
@media(min-width:900px) and (min-height:560px){.worker-card{box-sizing:border-box;flex:1;overflow:hidden;box-shadow:none}.worker-roster,.worker-history{flex:1}}
.worker-card{overflow:hidden}.worker-view-tabs{flex:none}.worker-view-tabs button{min-width:0;white-space:nowrap}.worker-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:8px;padding:3px 4px 8px}.worker-hiring-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.worker-hiring-head label{display:flex;align-items:center;gap:5px;font-size:.78rem;font-weight:800}.worker-hiring-head select{padding:5px;border:1px solid #8cac75;border-radius:7px;background:#fff}.worker-hiring-head button{border:1px solid #418151;border-radius:8px;background:#d9efae;color:#245338;padding:7px 10px;font-weight:850}.worker-dorm-list{display:flex;flex-wrap:wrap;gap:5px}.worker-dorm-list span{border-radius:7px;background:#eaf6d7;padding:4px 7px;font-size:.72rem;font-weight:700}.worker-roster{overflow:visible;flex:none}.worker-person{align-items:flex-start;min-height:93px;padding:9px}.worker-person strong{font-size:.91rem}.worker-person span,.worker-person small{font-size:.73rem;white-space:normal}.worker-person .worker-blocked{color:#a54126;font-weight:800}.worker-person-actions{display:flex;flex-direction:column;gap:5px}.worker-task-groups{max-height:none;overflow:visible}.worker-history{display:grid;flex:1;overflow-y:auto}.housing-block{flex:1;min-height:0;overflow-y:auto;align-content:start}.housing-option{display:grid;gap:5px;border:1px solid #b6cba6;border-radius:10px;background:#f7fce9;padding:9px;margin-top:7px}.housing-option p{margin:0;line-height:1.45}.housing-option small{display:block;line-height:1.45}.housing-option a{color:#165c9a;text-decoration:underline}
@media(max-width:620px){.worker-card{min-height:0}.worker-body{max-height:65vh}.worker-roster{grid-template-columns:1fr}.worker-person{min-height:0}.worker-hiring-head button{flex:1}}
.worker-body > *{flex-shrink:0}
.worker-body .worker-settings label{min-width:0}
.worker-body .worker-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch}
.worker-body .worker-actions button{min-width:0;min-height:38px;white-space:normal;line-height:1.3}
.worker-body .worker-report{overflow-wrap:anywhere}
.worker-body .worker-task-groups{flex:none;min-height:auto;max-height:none;overflow:visible;grid-template-columns:1fr;align-items:start}
.worker-body .worker-task-group{min-width:0}
.worker-body .worker-task-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
.worker-body .worker-task-list label{min-width:0;min-height:30px;box-sizing:border-box;line-height:1.3;white-space:normal;overflow-wrap:anywhere}
.worker-body .worker-task-list input{flex:none;margin:0 2px 0 0}
@media(min-width:1400px){.worker-body .worker-task-groups{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}}
@media(min-width:900px) and (min-height:560px){.worker-card{min-height:0}.worker-body{height:0;flex:1 1 0;overflow-y:auto;overflow-x:hidden}}
@media(min-width:621px) and (max-width:899px){.worker-card{overflow:visible}.worker-body{flex:none;max-height:none;overflow:visible}}
@media(max-width:420px){.worker-body .worker-task-list,.worker-body .worker-actions{grid-template-columns:1fr}}
.land-buy-card{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 8px;border:2px solid #8eb471;border-radius:10px;background:#fff5d2;font-size:.75rem}
.land-buy-card span{flex:1}.land-buy-card button{border:1px solid #418151;border-radius:7px;background:#d8ecac;color:#245338;padding:5px;font-weight:800}
@media(min-width:900px) and (min-height:560px){
  .land-layout{flex:1;height:0;overflow:hidden;padding:2px 8px 8px}
  .village-map{max-height:none;height:0}
  .village-field .field-grid{flex:1;height:0;grid-auto-rows:minmax(0,1fr)}
  .village-field .plot{max-height:none;min-height:0}
  .village-field .plot-plant{width:clamp(28px,5vh,42px);height:clamp(28px,5vh,42px)}
}
@media(max-width:899px){.farm-field{min-height:0}.village-map{height:300px;flex:none}.land-layout{padding-bottom:12px}}
@media(max-width:620px){
  .animal-field{min-height:510px}.animal-grid{gap:5px;padding:8px}.animal-pen{padding:4px 1px}.animal-sprite{font-size:2rem}.animal-pen strong{font-size:.83rem}.animal-pen small,.animal-pen-product{font-size:.59rem}.animal-scene strong{font-size:1rem}.animal-scene span{font-size:.68rem}.animal-scene-note{font-size:.69rem}
  .panel-tabs button{font-size:.72rem;padding:7px 2px}.animal-card h2{font-size:1.12rem}.animal-card h2 small{font-size:.7rem}
  .land-layout{grid-template-columns:1fr;gap:10px}
  .village-map{height:265px;max-height:265px}
  .village-list button{font-size:.7rem;padding:5px 1px}
  .village-field .field-grid{max-width:400px;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:5px auto}
  .village-field .plot{min-height:78px;max-height:none}
  .shop-list{grid-template-columns:1fr 1fr}
  .shop-list .shop-row small{white-space:normal}
}
@media(max-width:360px){.village-list button{font-size:.62rem}}
@media(min-width:1500px) and (min-height:850px){
  .farm-page{padding:14px clamp(22px,2vw,40px) 18px}
  .farm-header,.feedback,.status-bar,.farm-layout{max-width:none}
  .farm-header h1{font-size:2rem}
  .farm-header p{font-size:.9rem}
  .farm-header .eyebrow{font-size:.72rem}
  .feedback{margin:8px auto}
  .feedback .notice,.feedback .save-notice{padding:9px 13px;font-size:.9rem}
  .status-bar{gap:10px;margin-bottom:12px}
  .status-bar>div,.status-bar>a{padding:9px 11px;font-size:.88rem}
  .farm-layout{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:18px}
  .scene-sky{height:45px;font-size:1.75rem}
  .farm-barn{margin:8px auto;padding:7px 16px;font-size:1.4rem}
  .farm-barn span{font-size:1rem}
  .land-layout{gap:16px;padding:8px 16px 16px}
  .map-heading,.village-heading{padding:8px 10px;font-size:1rem}
  .village-land-actions button{padding:7px 12px;font-size:.9rem}.village-land-actions small{font-size:.82rem}
  .village-heading strong{font-size:1.1rem}
  .map-heading span,.village-heading span{font-size:.86rem}
  .district-picker{gap:9px;margin:6px 0;font-size:.9rem}
  .district-picker select,.neighbor-village-picker{padding:7px;font-size:.9rem}
  .unlock-hint{margin:4px 0;padding:7px;font-size:.82rem}
  .village-list{gap:6px;margin-top:8px}
  .village-list button{padding:7px 3px;font-size:.88rem}
  .map-source{margin-top:7px;font-size:.75rem}
  .village-field{padding:10px}
  .village-field .field-grid{max-width:560px;gap:9px;padding:4px}
  .village-field .plot{padding:8px 4px;border-width:3px}
  .village-field .plot-plant{width:clamp(44px,6vh,64px);height:clamp(44px,6vh,64px)}
  .plot-number{font-size:.84rem}
  .village-field .plot-name{font-size:1.05rem;line-height:1.25}
  .village-field .plot-progress{font-size:.86rem;line-height:1.2;padding-bottom:17px}
  .plot-care{bottom:5px;gap:4px}
  .plot-care span{padding:2px 3px;font-size:.75rem}
  .plot-alert{font-size:1.25rem}
  .farm-controls{gap:12px}
  .panel-tabs button{padding:9px 5px;font-size:.95rem}
  .tool-card,.shop-card,.visit-card{padding:18px}
  .animal-card{padding:18px;gap:12px}.animal-card h2{font-size:1.35rem}.animal-care-list button{padding:12px;font-size:1rem}.animal-pen strong{font-size:1.15rem}.animal-pen small,.animal-pen-product{font-size:.88rem}
  .tool-card h2,.shop-card h2,.visit-card h2{font-size:1.2rem}
  .tool-card p,.visit-card p{font-size:.95rem}
  .tool-card label{font-size:.9rem}
  .tool-card select{padding:9px;font-size:.95rem}
  .tool-grid{gap:9px;margin:14px 0}
  .tool-grid button{padding:11px 5px;font-size:.95rem}
  .tool-card .help,.visit-card .help{font-size:.86rem}
  .care-detail span{padding:6px 8px;font-size:.85rem}
  .shop-card h2 small{font-size:.85rem}
  .shop-list{gap:9px}
  .shop-list .shop-row{padding:8px}
  .shop-list .shop-row strong{font-size:.98rem}
  .shop-list .shop-row small{font-size:.78rem;white-space:normal}
  .shop-list .shop-row button{padding:7px 4px;font-size:.84rem}
  .shop-card .expand{padding:9px;font-size:.9rem}
  .land-buy-card{padding:10px;font-size:.9rem}
  .land-buy-card button{padding:8px;font-size:.88rem}
  .visit-actions button,.friend-picker button{font-size:.9rem}
  .visit-log{font-size:.85rem}
}
.animal-grid{grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr))}
.animal-location-picker{display:grid;gap:3px;font-size:.82rem;font-weight:800}.animal-location-picker select{min-width:0;padding:5px;border:1px solid #81ab78;border-radius:8px;background:#fff}.animal-location-picker small{color:#91402c}
.plot.facility{background:linear-gradient(145deg,#619e86,#39766d);border-color:#35675c}.facility-art{font-size:2rem;line-height:1.1}
.scene-sky{font-size:.9rem;font-weight:800}
.economy-card{display:flex;flex-direction:column;gap:8px;border:3px solid #8eb471;border-radius:18px;padding:12px;background:#fffdf0;box-shadow:0 6px 0 #bdd6a3;min-height:0}.economy-card h2{display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin:0;font-size:1.1rem;color:#326341}.economy-card h2 small{font-size:.7rem}.economy-card>.help{margin:0;font-size:.72rem}.economy-tabs{display:flex;gap:4px}.economy-tabs button{flex:1;border:1px solid #74a65d;border-radius:7px;background:#fff;color:#315b39;padding:6px 2px;font-size:.75rem;font-weight:800}.economy-tabs button.active{background:#d8f1a9}.economy-block{display:grid;gap:7px;padding:10px;border:1px solid #b2c893;border-radius:9px;background:#f5fbe7;font-size:.82rem}.economy-block p{margin:0}.economy-block small{font-size:.73rem;color:#526b4e}.economy-block select{min-width:0;width:100%;padding:6px;border:1px solid #8cac75;border-radius:6px;background:#fff}.economy-actions{display:flex;flex-wrap:wrap;gap:5px}.economy-actions button{flex:1;border:1px solid #418151;border-radius:7px;background:#e2f3bb;color:#245338;padding:7px 4px;font-size:.75rem;font-weight:800}
.business-block{flex:1;min-height:0;overflow:auto;align-content:start}.business-block label{display:grid;gap:3px;font-weight:800}.business-block a{font-size:.7rem;color:#286c4f}.business-sites{display:flex;flex-wrap:wrap;align-items:center;gap:4px}.business-sites span{font-weight:800}.business-sites button,.school-choices button{border:1px solid #8cac75;border-radius:7px;background:#fff;padding:5px 7px;color:#285638;font-size:.72rem;font-weight:800}.business-sites button.active,.school-choices button.active{background:#daf3b2;border-color:#438044}.business-extra{display:grid;gap:6px;padding:8px;border:1px solid #cedeb4;border-radius:8px;background:#fffdf4}.business-pickers{display:grid;grid-template-columns:110px minmax(0,1fr);gap:5px}.school-choices{display:flex;flex-wrap:wrap;gap:5px}.school-lesson>p[role=status]{color:#275e3e;font-weight:800}
@media(min-width:900px) and (min-height:560px){.economy-card{box-sizing:border-box;flex:1;min-height:0;overflow:hidden;box-shadow:none}.scene-sky{font-size:.75rem}}
@media(max-width:620px){.animal-grid{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr))}.scene-sky{font-size:.65rem}.economy-card h2{font-size:1rem}.economy-card h2 small{font-size:.65rem}}
.village-field .field-grid{grid-template-rows:none;grid-auto-rows:minmax(68px,1fr);overflow-y:auto;align-content:start}.village-field .plot{min-height:68px}
.more-plots{display:block;margin-top:4px;color:#4a3927;text-align:center;font-size:.72rem;font-weight:800}
.economy-tabs{overflow-x:auto}.economy-tabs button{min-width:64px;white-space:nowrap}.panel-subtabs{flex:none}
@media(min-width:900px) and (min-height:560px){.finance-card{box-sizing:border-box;flex:1;min-height:0;overflow:auto;box-shadow:none}}
@media(min-width:1500px) and (min-height:850px){
  .farm-page{padding:8px 16px 10px}
  .farm-header h1{font-size:1.75rem}
  .farm-header p{font-size:.8rem}
  .farm-header .eyebrow{font-size:.65rem}
  .feedback{margin:4px auto}
  .feedback .notice,.feedback .save-notice{padding:6px 9px;font-size:.8rem}
  .status-bar{gap:6px;margin-bottom:7px}
  .status-bar>div,.status-bar>a{padding:6px 8px;font-size:.8rem}
  .farm-layout{gap:12px}
  .farm-controls{gap:6px}
  .panel-tabs button{padding:6px 4px;font-size:.84rem}
  .panel-subtabs button{padding:6px 3px;font-size:.77rem}
  .quiz-cadence{padding:4px 7px;font-size:.71rem}
  .scene-sky{height:34px;font-size:1.35rem}
  .farm-barn{margin:4px auto;padding:4px 11px;font-size:1.18rem}
  .farm-barn span{font-size:.9rem}
  .land-layout{gap:10px;padding:4px 10px 9px}
  .map-heading,.village-heading{padding:5px 8px;font-size:.91rem}
  .district-picker{gap:6px;margin:3px 0;font-size:.82rem}
  .district-picker select,.neighbor-village-picker{padding:5px;font-size:.82rem}
  .unlock-hint{margin:2px 0;padding:4px;font-size:.74rem}
  .village-list{gap:4px;margin-top:5px}
  .village-list button{padding:5px 2px;font-size:.8rem}
  .map-source{margin-top:3px;font-size:.69rem}
  .village-field{padding:7px}
  .village-field .field-grid{gap:7px;padding:3px}
  .village-field .plot{padding:5px 3px}
  .tool-card,.shop-card,.visit-card,.animal-card{padding:12px}
  .shop-list{gap:6px}
  .shop-list .shop-row{padding:5px 7px}
  .worker-card{gap:5px;padding:10px}
  .worker-body{gap:6px}
  .worker-body .worker-task-group{padding:7px}
  .worker-body .worker-task-group>strong{font-size:.83rem}
  .worker-body .worker-task-list label{font-size:.8rem;padding:5px 6px}
  .worker-body .worker-actions button{font-size:.82rem}
}
.hero-chip{border:2px solid #9dbb72;border-radius:12px;background:#fffdf1;color:#245b38;padding:9px 12px;font-weight:850;box-shadow:0 3px 0 #b4c888}
@media(min-width:900px) and (min-height:560px){.status-bar .hero-chip{min-width:0;padding:5px 7px;font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:none}}
.animal-categories{display:flex;flex-wrap:wrap;gap:5px;padding:2px 10px}.animal-categories button{flex:1;min-width:88px;border:1px solid #639063;border-radius:8px;background:#f3ffe4;color:#285338;padding:5px;font-weight:800}.animal-categories button.active{background:#3d8b57;color:#fff}
.worker-crop-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:5px;max-height:145px;overflow:auto;width:100%}.worker-crop-choices label{display:flex;justify-content:flex-start;gap:5px;border:1px solid #a5c58e;border-radius:7px;padding:4px;background:#f7ffe9;min-width:0}.worker-crop-choices label small{margin-left:auto}.worker-settings{display:block}.worker-settings>strong{display:block;margin-bottom:5px;font-size:.81rem}.worker-settings>small{font-size:.74rem;color:#8a4a31}
.event-card{overflow:auto}.event-hero{display:flex;align-items:center;gap:12px;border-radius:14px;padding:12px}.event-hero>span{font-size:3rem}.event-hero p{margin:3px 0}.event-list{display:grid;gap:6px}.event-list article{display:grid;gap:3px;border:1px solid #a9bf9c;border-radius:8px;background:#fffef1;padding:8px}.event-list small{color:#60745b}
.hero-shade{position:fixed;inset:0;z-index:1005;display:grid;place-items:center;padding:16px;background:#163421dc}.hero-dialog{width:min(980px,100%);max-height:92vh;overflow:auto;border:4px solid #79aa5e;border-radius:20px;background:#fffcdd;padding:18px;box-shadow:0 14px 40px #14241966}.hero-dialog h2{margin:0 0 7px;color:#275538}.hero-dialog p{margin:0 0 12px}.hero-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.hero-choice{display:flex;flex-direction:column;align-items:center;gap:5px;min-height:155px;border:2px solid #66945b;border-radius:14px;padding:9px;color:#244735;text-align:center}.hero-choice>span{font-size:2.3rem;line-height:1.1}.hero-choice strong{font-size:1rem}.hero-choice small,.hero-choice em{font-size:.75rem;line-height:1.3}.hero-choice em{font-style:normal;font-weight:800}.hero-choice:hover{outline:3px solid #f6b747}
.gender-dialog{width:min(430px,100%)}.gender-dialog .economy-actions button{font-size:1.1rem;padding:14px}
.child-romance{display:grid;gap:5px;padding:7px;border:1px solid #b6ceac;border-radius:8px;background:#f2f9e9}.child-romance label{display:grid;gap:3px;font-size:.75rem}.child-romance select{min-width:0;width:100%;padding:6px}.family-card{overflow:auto}.family-card>.worker-help{margin:0 0 8px}.family-card .finance-block{margin-bottom:8px}.family-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.family-grid article{display:grid;gap:5px;align-content:start;border:1px solid #b5c99d;border-radius:9px;background:#fffef4;padding:8px;min-width:0}.family-grid article b{font-size:.84rem}.family-grid article small{font-size:.74rem;color:#4a6454}.family-grid article button,.family-pickers button{border:1px solid #55946a;border-radius:8px;background:#e3f4cf;color:#25523d;padding:6px;font-size:.77rem;font-weight:800}.family-grid article button:disabled{opacity:.55}.family-pickers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.family-pickers label{display:grid;gap:3px;font-size:.76rem;font-weight:800}.family-pickers select{min-width:0;width:100%;padding:5px;border:1px solid #83a67b;border-radius:7px;background:white}.family-history{max-height:160px;overflow:auto}.family-history p{margin:4px 0;padding:4px;border-bottom:1px solid #d1dfc4}
.family-assignment{display:grid;gap:6px;border:1px solid #a7c79b;border-radius:10px;background:#f7fce9;padding:9px}.family-assignment>span,.family-assignment>small{font-size:.76rem}.family-assignment .worker-task-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.family-assignment .worker-task-list label{min-width:0;white-space:normal}.professional-card{overflow:auto}.professional-card>p{font-size:.78rem;line-height:1.5}.professional-content{display:grid;gap:8px}.professional-card .worker-roster{grid-template-columns:1fr;overflow:visible}.professional-card .worker-person{min-height:0}.professional-card .worker-view-tabs{margin:8px 0}.professional-card .economy-actions{display:flex;flex-wrap:wrap;gap:7px}.accounting-table{display:grid;max-height:270px;overflow:auto;border:1px solid #bdd1ab;border-radius:8px}.accounting-table>div{display:grid;grid-template-columns:minmax(120px,2fr) repeat(3,minmax(48px,1fr));gap:4px;padding:6px;border-bottom:1px solid #d7e2cd;font-size:.75rem;align-items:center}.accounting-table>div:nth-child(odd){background:#f4f9e9}.accounting-table>div span:first-child{overflow-wrap:anywhere}.accounting-table .accounting-head{background:#dcecc8;font-weight:900}.accounting-table .loss{color:#ab3d26}.accounting-entries{max-height:160px;overflow:auto}.accounting-entries p{border-bottom:1px dashed #c6d6ba;padding:4px 0}@media(max-width:620px){.family-assignment .worker-task-list{grid-template-columns:1fr}.professional-card .worker-view-tabs button{font-size:.73rem;padding:6px 2px}.accounting-table>div{grid-template-columns:minmax(92px,2fr) repeat(3,minmax(38px,1fr));font-size:.68rem}}
@media(max-width:620px){.family-grid,.family-pickers{grid-template-columns:1fr}}
@media(max-width:760px){.hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-choice{min-height:135px}.animal-categories button{min-width:70px;font-size:.72rem}.worker-crop-choices{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){.action-pop,.animal-sprite{animation:none}}
.plot.campus{outline:4px solid #6ce1ef;outline-offset:1px}
.school-campus-link{display:block;margin:8px 0;padding:11px 13px;border-radius:9px;background:#2e7853;color:#fff;text-decoration:none;font-weight:900;text-align:center}
.school-card{overflow:auto}.school-card>.worker-help{margin:0 0 8px;line-height:1.5}.school-card .finance-block{display:grid;gap:7px;margin-bottom:8px}.school-card .finance-block>p{margin:0;line-height:1.45}.school-card .finance-block>button,.school-card .school-market button{border:1px solid #418151;border-radius:8px;background:#e2f3bb;color:#245338;padding:8px;font-weight:800}.school-card button:disabled{opacity:.55}.school-card label{display:grid;gap:3px;font-weight:800;font-size:.78rem}.school-card input,.school-card select{min-width:0;width:100%;box-sizing:border-box;border:1px solid #87ab7b;border-radius:7px;background:#fff;padding:7px;color:#245338}.school-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:8px}.school-summary>div,.school-summary>span{display:grid;gap:2px;border:1px solid #a9c394;border-radius:8px;background:#f5fbe8;padding:7px;font-size:.78rem;font-weight:800;min-width:0}.school-summary strong{font-size:.95rem;overflow-wrap:anywhere}.school-summary small{font-size:.7rem}.school-donation{grid-template-columns:1fr minmax(100px,140px) auto;align-items:end}.school-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.school-market{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-height:240px;overflow:auto}.school-market article,.school-staff-list>div{display:grid;gap:4px;border:1px solid #b7caa4;border-radius:8px;background:#fffef4;padding:7px}.school-market small,.school-staff-list small{font-size:.72rem}.school-staff-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.school-history{max-height:170px;overflow:auto}.school-history p{padding:4px 0;border-bottom:1px dashed #b7caa4}.school-card .finance-block>small{line-height:1.4}
@media(max-width:760px){.school-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.school-form{grid-template-columns:repeat(2,minmax(0,1fr))}.school-donation{grid-template-columns:1fr 1fr}.school-donation>strong{grid-column:1/-1}.school-donation>button{grid-column:1/-1}.school-market,.school-staff-list{grid-template-columns:1fr}}
.research-block{overflow-y:auto}.research-block label{display:grid;gap:4px;font-weight:800}.research-block>button{border:1px solid #418151;border-radius:8px;background:#e2f3bb;color:#245338;padding:8px;font-weight:800}.research-history{display:grid;gap:4px;max-height:130px;overflow:auto}.civic-card{overflow:auto}.civic-card>p{line-height:1.5}.civic-entry-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.civic-entry{display:grid;gap:7px;border:2px solid #88b682;border-radius:12px;background:#f5fbe9;color:#25513a;padding:16px;text-decoration:none}.civic-entry>span{font-size:2.2rem}.civic-entry strong{font-size:1.1rem}.civic-entry small{font-size:.82rem;line-height:1.4}.civic-entry b{color:#1e7050}
/* Keep both navigation levels in one readable row; small screens scroll horizontally. */
.panel-tabs,.panel-subtabs,.economy-tabs,.worker-view-tabs{display:flex;align-items:stretch;gap:5px;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:#8fb67f transparent;padding-bottom:3px}
.panel-tabs button,.panel-subtabs button,.economy-tabs button,.worker-view-tabs button,.professional-card .worker-view-tabs button{flex:0 0 auto;min-width:max-content;white-space:nowrap;padding:7px 11px;font-size:.85rem;line-height:1.2}
.panel-tabs button.active,.panel-subtabs button.active,.economy-tabs button.active,.worker-view-tabs button.active{background:#357d50;color:#fff;border-color:#236545}
@media(max-width:620px){.civic-entry-grid{grid-template-columns:1fr}.panel-tabs button,.panel-subtabs button,.economy-tabs button,.worker-view-tabs button,.professional-card .worker-view-tabs button{font-size:.84rem;padding:8px 11px}}
@media(max-width:700px){
  .farm-page{overflow-x:hidden;padding:9px 8px max(20px,env(safe-area-inset-bottom))}
  .farm-header{flex-wrap:wrap;gap:7px}
  .farm-header>div:first-child{min-width:0}
  .farm-top-actions{width:100%;justify-content:space-between;gap:6px}
  .farm-top-actions a,.farm-top-actions button{min-height:40px;display:inline-flex;align-items:center;justify-content:center}
  .feedback,.farm-layout,.farm-controls,.farm-field,.animal-field{min-width:0}
  .status-bar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
  .status-bar>div,.status-bar>a,.status-bar>.hero-chip{min-width:0;margin:0;padding:7px 8px;line-height:1.35;overflow-wrap:anywhere}
  .status-bar>.hero-chip{grid-column:1/-1;text-align:left}
  .status-bar>div{display:flex;flex-wrap:wrap;gap:3px 6px}
  .status-bar>div strong{font-size:.9rem}
  .status-bar>a{text-align:center;justify-content:center}
  .field-grid{grid-template-columns:repeat(3,minmax(0,1fr));max-height:none;overflow:visible;transform:none;padding:4px;gap:6px}
  .plot{min-width:0;min-height:94px;padding:5px 2px}
  .plot-name,.plot-progress{font-size:.76rem;line-height:1.25;overflow-wrap:anywhere}
  .village-field .field-grid{max-width:none}
  .panel-tabs,.panel-subtabs,.economy-tabs,.worker-view-tabs{scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;max-width:100%}
  .panel-tabs button,.panel-subtabs button,.economy-tabs button,.worker-view-tabs button{scroll-snap-align:start;min-height:42px;font-size:.86rem}
  .farm-controls input,.farm-controls select,.farm-controls button{max-width:100%}
  .quiz-shade,.hero-shade{padding:8px}
  .quiz-card,.hero-dialog{max-height:calc(100dvh - 16px);overflow-y:auto;padding:14px}
  .quiz-actions button{min-height:44px}
}
</style>
