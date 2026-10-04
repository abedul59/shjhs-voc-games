<script setup>
import { computed, ref } from 'vue';
import { ISEKAI_AREAS, ISEKAI_BUILDINGS, ISEKAI_CROPS, adjustedBuildingCost, buildingById, isekaiActionError } from '~/lib/isekai-farm';
import { ISEKAI_CIVIC, ISEKAI_CIVIC_UPGRADES, ISEKAI_RECIPES, ISEKAI_SCHOOL_DAYS, ISEKAI_SCHOOL_SUBJECTS, ISEKAI_SPECIALISTS, ISEKAI_WORLD_CYCLE_MS, expansionActionError, isekaiCivicMarket, isekaiFacilityCount } from '~/lib/isekai-farm-expansion';

const props = defineProps({ farm: { type: Object, required: true }, areaId: { type: String, required: true }, plotIndex: { type: Number, required: true }, plotKind: { type: String, default: 'home' }, frontierFieldIndex: { type: Number, default: 0 }, frontierAccess: { type: Boolean, default: false }, frontierClaimedAt: { type: String, default: '' }, now: { type: Number, required: true }, disabled: { type: Boolean, default: false }, classmates: { type: Array, default: () => [] }, loans: { type: Array, default: () => [] }, visits: { type: Array, default: () => [] }, visitPreview: { type: Object, default: null }, studentId: { type: String, default: '' }, loanReady: { type: Boolean, default: false }, visitReady: { type: Boolean, default: false } });
const emit = defineEmits(['action']);
const section = ref('craft');
const fullScreen = ref(false);
const recipeId = ref('flour');
const facilityId = ref('alchemy');
const cropId = ref('wheat');
const civicId = ref('school');
const institutionName = ref('');
const donation = ref(100);
const classes = ref(1);
const admissions = ref(20);
const scheduleDay = ref(0);
const schedulePeriod = ref(0);
const scheduleSubject = ref('英語單字');
const scheduleClass = ref(0);
const lenderId = ref('');
const loanAmount = ref(60);
const collateralAreaId = ref('');
const visitTargetId = ref('');
const visitCropId = ref('');
const categories = [
  { id: 'craft', label: '⚗️ 加工與販賣' }, { id: 'venue', label: '🏪 商店與觀光' },
  { id: 'civic', label: '🏫 學府與公益' }, { id: 'research', label: '🔆 研發與能源' },
  { id: 'finance', label: '📒 財務與事件' }, { id: 'visits', label: '👥 同學互訪' }
];
const plot = computed(() => props.plotKind === 'frontier' ? props.farm.frontierPlots?.[props.areaId]?.[props.plotIndex]?.[props.frontierFieldIndex]
  : props.farm.plots?.[props.areaId]?.[props.plotIndex]);
const selectedCivic = computed(() => ISEKAI_CIVIC.find(item => item.id === civicId.value));
const civicCandidates = computed(() => [...isekaiCivicMarket(props.now, civicId.value, 'leader'), ...isekaiCivicMarket(props.now, civicId.value, 'worker')]);
const institution = computed(() => props.farm.expansion?.civic?.[civicId.value]);
const selectedRecipe = computed(() => ISEKAI_RECIPES.find(item => item.id === recipeId.value));
const stock = computed(() => selectedRecipe.value?.animal ? props.farm.animalGoods?.[selectedRecipe.value.sourceId] || 0 : props.farm.produce?.[selectedRecipe.value?.sourceId] || 0);
const usedSite = computed(() => props.plotKind === 'frontier' ? `frontier:${props.areaId}:${props.plotIndex}:${props.frontierFieldIndex}` : `${props.areaId}:${props.plotIndex}`);
const collateralOptions = computed(() => ISEKAI_AREAS.filter(item => props.farm.unlockedAreas?.includes(item.id)
  && !['fittoa','ranoa','kingdragon'].includes(item.id) && props.farm.plots?.[item.id]?.every(plot => !plot)));
const loanPerson = id => id === props.studentId ? '我' : props.classmates.find(item => item.student_id === id)?.hidden_name || '同班同學';
const remainingVenue = computed(() => Math.max(0, Math.ceil(((props.farm.expansion?.venues?.[usedSite.value] || 0) + ISEKAI_WORLD_CYCLE_MS - props.now) / 60000)));
const facilityOptions = computed(() => ISEKAI_BUILDINGS.filter(item => section.value === 'craft' ? ['craft','trade'].includes(item.category)
  : section.value === 'venue' ? item.category === 'venue' : section.value === 'civic' ? item.category === 'civic'
    : section.value === 'research' ? ['energy','research','housing'].includes(item.category) : false));
const selectedFacility = computed(() => buildingById(facilityId.value));
const localAction = action => props.plotKind === 'frontier' && ['build','operateVenue','solarRoof'].includes(action.type)
  ? { ...action, plotKind: 'frontier', frontierFieldIndex: props.frontierFieldIndex, frontierAccess: props.frontierAccess, frontierClaimedAt: props.frontierClaimedAt }
  : action;
const buildAction = computed(() => localAction({ type: 'build', areaId: props.areaId, plotIndex: props.plotIndex, buildingId: facilityId.value }));
const canBuild = computed(() => !props.disabled && !isekaiActionError(props.farm, buildAction.value, props.now));
const can = action => !props.disabled && !expansionActionError(props.farm, localAction(action), props.now);
const send = action => emit('action', localAction(action));
const closeInstitution = () => {
  if (window.confirm(`結束${institution.value?.name || '機構'}營運？基金將移交公共用途，無法提回農莊；之後可拆除建築。`)) send({ type: 'closeCivic', civicId: civicId.value });
};
function setSection(id) {
  section.value = id;
  facilityId.value = facilityOptions.value[0]?.id || 'alchemy';
}
const currency = value => Math.round(Number(value) || 0);
</script>

<template>
  <div class="town-panel" :class="{ fullscreen: fullScreen }">
    <header class="town-header"><div><strong>中央大陸城鎮經營</strong><small>建設使用目前選取的田位；各項產業以三小時為營運週期。</small></div><button @click="fullScreen = !fullScreen">{{ fullScreen ? '返回農莊' : '⛶ 全頁管理' }}</button></header>
    <nav class="town-nav"><button v-for="item in categories" :key="item.id" :class="{ active: section === item.id }" @click="setSection(item.id)">{{ item.label }}</button></nav>
    <div class="town-content">
      <div v-if="!['finance','visits'].includes(section)" class="facility-builder">
        <label>選擇設施
          <select v-model="facilityId"><option v-for="item in facilityOptions" :key="item.id" :value="item.id">{{ item.mark }} {{ item.name }} · {{ adjustedBuildingCost(farm, item) }} 金幣</option></select>
        </label>
        <span>{{ selectedFacility?.description || '選擇要建造的設施' }}</span>
        <button :disabled="!canBuild" @click="send(buildAction)">在田位 {{ plotIndex + 1 }} 建造</button>
        <small v-if="!canBuild">{{ isekaiActionError(farm, buildAction, now) }}</small>
      </div>

      <template v-if="section === 'craft'">
        <p>先在私人農莊或可使用的邊境地建魔藥加工坊，再用兩份原料製作一份加工品。加工品可直接販賣；多族市集會提高售價。</p>
        <div class="town-cards"><article v-for="recipe in ISEKAI_RECIPES" :key="recipe.id" :class="{ active: recipeId === recipe.id }" @click="recipeId = recipe.id">
          <b>{{ recipe.mark }} {{ recipe.name }}</b><small>原料 {{ recipe.sourceCount }} 份 · 庫存 {{ recipe.animal ? farm.animalGoods?.[recipe.sourceId] || 0 : farm.produce?.[recipe.sourceId] || 0 }} · 成品 {{ farm.expansion?.processed?.[recipe.id] || 0 }}</small><small>售價 {{ recipe.sale }}；多族市集加價 30%</small>
        </article></div>
        <div class="town-actions"><button :disabled="!can({ type:'process', recipeId })" @click="send({ type:'process', recipeId })">加工{{ selectedRecipe?.name }}</button><button :disabled="!can({ type:'sellProcessed', recipeId })" @click="send({ type:'sellProcessed', recipeId })">販賣全部成品</button></div>
        <small>{{ stock }} 份原料可製作 {{ selectedRecipe ? Math.floor(stock / selectedRecipe.sourceCount) : 0 }} 份。</small>
      </template>

      <template v-else-if="section === 'venue'">
        <p>旅店、食堂、釣場和觀光設施依季節、天氣、平日或週末決定收入；交易員與會計師也有加成。</p>
        <div class="town-cards"><article v-for="item in facilityOptions" :key="item.id" :class="{ active: facilityId === item.id }" @click="facilityId = item.id"><b>{{ item.mark }} {{ item.name }}</b><small>{{ item.description }}</small><small>已建 {{ isekaiFacilityCount(farm, item.id) }} 間</small></article></div>
        <div class="town-actions"><button :disabled="!can({ type:'operateVenue', areaId, plotIndex })" @click="send({ type:'operateVenue', areaId, plotIndex })">經營所選田位的{{ buildingById(plot?.facility)?.name || '設施' }}</button><span v-if="remainingVenue">還有 {{ remainingVenue }} 分鐘可再次營業</span></div>
      </template>

      <template v-else-if="section === 'civic'">
        <p>公益機構需蓋在自己可使用的田位；捐贈、學費和結餘只留在機構基金。學校可設定班級與招生；各機構聘用主管與專業人員後自動營運。</p>
        <div class="town-cards"><article v-for="item in ISEKAI_CIVIC" :key="item.id" :class="{ active: civicId === item.id }" @click="civicId = item.id; facilityId = item.id"><b>{{ item.mark }} {{ item.name }}</b><small>已建 {{ isekaiFacilityCount(farm, item.id) }} 間 · {{ farm.expansion?.civic?.[item.id]?.name || '尚未成立' }}</small></article></div>
        <section class="institution"><h3>{{ selectedCivic?.mark }} {{ institution?.name || selectedCivic?.name }}</h3>
          <template v-if="!institution"><label>自訂機構名稱<input v-model.trim="institutionName" maxlength="24" placeholder="例如：星露學府" /></label><button :disabled="!can({ type:'foundCivic', civicId, name:institutionName })" @click="send({ type:'foundCivic', civicId, name:institutionName })">創辦並捐入 300 金幣</button><small>{{ expansionActionError(farm, { type:'foundCivic', civicId, name:institutionName }, now) }}</small></template>
          <template v-else><p>專用基金 <b>{{ currency(institution.fund) }}</b> 金幣 · {{ selectedCivic.leaderName }} {{ institution.staff?.leader || 0 }} 人 · {{ selectedCivic.roleName }} {{ institution.staff?.worker || 0 }} 人</p>
            <h4>高階人力市場 · 每三小時輪換</h4><div class="town-cards civic-people"><article v-for="person in civicCandidates" :key="person.id"><span class="civic-portrait"><IsekaiPortrait :race-id="person.raceId" :profession-id="person.professionId" :seed="person.id" :label="person.name" /></span><b>{{ person.name }} · {{ person.role === 'leader' ? selectedCivic.leaderName : selectedCivic.roleName }}</b><small>能力 {{ person.skill }} · 聘用基金 60</small><button :disabled="!can({type:'hireCivic',civicId,role:person.role,candidateId:person.id})" @click="send({type:'hireCivic',civicId,role:person.role,candidateId:person.id})">聘用</button></article></div><p>已聘：<span v-for="person in institution.personnel || []" :key="person.id">{{ person.name }}{{ person.role === 'leader' ? '（主管）' : civicId === 'school' ? `（第 ${Number(person.classIndex) + 1} 班）` : '（專業人員）' }}　</span><span v-if="!institution.personnel?.length">尚無人員</span></p><button :disabled="!can({type:'operateCivic',civicId})" @click="send({type:'operateCivic',civicId})">手動{{ selectedCivic.service }}</button>
            <label>追加捐贈 <input v-model.number="donation" type="number" min="50" max="10000" step="10" /></label><button :disabled="!can({type:'donateCivic',civicId,amount:donation})" @click="send({type:'donateCivic',civicId,amount:donation})">捐贈至專用基金</button>
            <div v-if="civicId === 'school'" class="school-settings"><label>班級數<input v-model.number="classes" type="number" min="1" max="12" /></label><label>招生目標<input v-model.number="admissions" type="number" min="10" max="480" /></label><button :disabled="!can({type:'configureCivic',civicId,classes,admissions})" @click="send({type:'configureCivic',civicId,classes,admissions})">儲存班級與招生</button><p>教室 {{ institution.classes }} 間 · 目標 {{ institution.admissions }} 人 · 在學 {{ institution.students || 0 }} 人；教師 {{ institution.staff?.worker || 0 }} 位。每班最多 40 人，師資與課表會影響開課。</p></div>
            <div v-if="civicId === 'school'" class="school-schedule"><h4>教室、學生與各班週課表</h4><div class="classroom-grid"><button v-for="index in institution.classes" :key="index" :class="{ active: scheduleClass === index - 1 }" @click="scheduleClass = index - 1"><b>🏫 第 {{ index }} 班</b><small>學生 {{ Math.min(40, Math.max(0, (institution.students || 0) - (index - 1) * 40)) }} 人</small><small>老師 {{ institution.personnel?.filter(item => item.role === 'worker' && item.classIndex === index - 1).map(item => item.name).join('、') || '待聘' }}</small></button></div><div class="schedule-table"><div v-for="(day,row) in institution.schedules?.[scheduleClass] || []" :key="row"><b>週{{ ISEKAI_SCHOOL_DAYS[row] }}</b><span v-for="(subject,col) in day" :key="col">{{ subject }}</span></div></div><div class="town-actions"><label>星期<select v-model.number="scheduleDay"><option v-for="(name,index) in ISEKAI_SCHOOL_DAYS" :key="index" :value="index">週{{ name }}</option></select></label><label>節次<select v-model.number="schedulePeriod"><option v-for="index in 6" :key="index" :value="index - 1">第 {{ index }} 節</option></select></label><label>課程<select v-model="scheduleSubject"><option v-for="subject in ISEKAI_SCHOOL_SUBJECTS" :key="subject">{{ subject }}</option></select></label><button @click="send({type:'setSchedule',civicId:'school',classIndex:scheduleClass,day:scheduleDay,period:schedulePeriod,subject:scheduleSubject})">儲存課表</button></div></div>
            <h4>擴建設施</h4><div class="town-actions"><button v-for="upgrade in ISEKAI_CIVIC_UPGRADES[civicId] || []" :key="upgrade[0]" :disabled="!can({type:'civicUpgrade',civicId,upgradeId:upgrade[0]})" @click="send({type:'civicUpgrade',civicId,upgradeId:upgrade[0]})">{{ institution.upgrades?.includes(upgrade[0]) ? '✓' : '+' }} {{ upgrade[1] }} · 基金 {{ upgrade[2] }}</button></div>
            <div class="institution-history"><p v-for="(entry,index) in institution.history || []" :key="index">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.detail }}</p></div>
            <button class="close-institution" @click="closeInstitution">結束營運並將基金移交公共用途</button>
          </template>
        </section>
      </template>

      <template v-else-if="section === 'research'">
        <p>魔法農業研發塔提升指定作物的產量與生長速度。魔晶陣或建築屋頂魔晶板可抵水電費，晴天發電較多。</p>
        <div class="town-actions"><label>研發作物<select v-model="cropId"><option v-for="crop in ISEKAI_CROPS" :key="crop.id" :value="crop.id">{{ crop.symbol }} {{ crop.name }} · 等級 {{ farm.expansion?.research?.[crop.id] || 0 }}/3</option></select></label><button :disabled="!can({type:'researchCrop',cropId})" @click="send({type:'researchCrop',cropId})">升級作物 · {{ 180 + (farm.expansion?.research?.[cropId] || 0) * 200 }} 金幣</button></div>
        <div class="town-actions"><button :disabled="!can({type:'solarRoof',areaId,plotIndex})" @click="send({type:'solarRoof',areaId,plotIndex})">在本田位建築屋頂裝魔晶板 · {{ (farm.expansion?.roofs?.length || 0) < 3 ? 90 : 160 }} 金幣</button><span>已設屋頂 {{ farm.expansion?.roofs?.length || 0 }} 處；前三處有補助。</span></div>
        <p>目前水電欠款 {{ farm.expansion?.utilityDebt || 0 }} 金幣；魔晶陣 {{ isekaiFacilityCount(farm, 'manaarray') }} 處，淨水池 {{ isekaiFacilityCount(farm, 'reservoir') }} 處。</p><button :disabled="!can({type:'payUtility'})" @click="send({type:'payUtility'})">繳清水電費</button>
      </template>

      <template v-else-if="section === 'finance'">
        <p>所有農莊金幣收入與支出在這裡查看；公益機構的基金另外管理。</p>
        <div class="finance-summary"><b>金幣 {{ farm.coins }}</b><span>水電欠款 {{ farm.expansion?.utilityDebt || 0 }}</span><span>公會借款 {{ farm.expansion?.loan?.amount || 0 }}</span><span>一次性防災結界 {{ farm.expansion?.disasterShield ? '已設置' : '未設置' }}</span></div>
        <div class="town-actions"><button :disabled="!can({type:'borrowGuild'})" @click="send({type:'borrowGuild'})">資金不足時借 200 · 零息</button><button :disabled="!can({type:'repayGuild'})" @click="send({type:'repayGuild'})">償還公會借款</button><button :disabled="!can({type:'insure'})" @click="send({type:'insure'})">設防災結界 · 90</button></div>
        <h3>向同班同學短期借款</h3><p>以另一片空領地作抵押，借 60 或 100 金幣，六小時內還本付 10% 利息；逾期自動賣出抵押領地，餘款返還。私人農莊起始領地不能抵押。</p>
        <p v-if="!loanReady">此功能需先在新專案執行 <code>20261003_isekai_farm_peer_loans.sql</code>。</p>
        <div v-else class="peer-loan-form"><label>出借同學<select v-model="lenderId"><option value="">選擇同班同學</option><option v-for="person in classmates.filter(item => item.student_id !== studentId)" :key="person.student_id" :value="person.student_id">{{ person.hidden_name || person.student_id }}</option></select></label><label>金額<select v-model.number="loanAmount"><option :value="60">60 金幣</option><option :value="100">100 金幣</option></select></label><label>抵押領地<select v-model="collateralAreaId"><option value="">選擇全空領地</option><option v-for="area in collateralOptions" :key="area.id" :value="area.id">{{ area.name }}（價值 {{ area.cost }}）</option></select></label><button :disabled="disabled || !lenderId || !collateralAreaId || !!farm.expansion?.loanCollateral" @click="send({type:'peerLoan',command:'request',targetId:lenderId,amount:loanAmount,areaId:collateralAreaId})">送出借款申請</button></div>
        <div class="town-history"><p v-for="loan in loans" :key="loan.id">{{ loanPerson(loan.borrower_id) }} 向 {{ loanPerson(loan.lender_id) }} 借 {{ loan.principal }}＋利息 {{ loan.interest }}；{{ ISEKAI_AREAS.find(item => item.id === loan.collateral_area)?.name }}；{{ {pending:'待同意',active:'借款中',repaid:'已還清',foreclosed:'抵押地已賣',rejected:'已拒絕',cancelled:'已取消'}[loan.status] }}<span v-if="loan.due_at"> · 到期 {{ new Date(loan.due_at).toLocaleString('zh-TW') }}</span><span class="loan-buttons"><button v-if="loan.status==='pending' && loan.lender_id===studentId" :disabled="disabled" @click="send({type:'peerLoan',command:'approve',loanId:loan.id})">同意</button><button v-if="loan.status==='pending' && loan.lender_id===studentId" :disabled="disabled" @click="send({type:'peerLoan',command:'reject',loanId:loan.id})">拒絕</button><button v-if="loan.status==='pending' && loan.borrower_id===studentId" :disabled="disabled" @click="send({type:'peerLoan',command:'cancel',loanId:loan.id})">取消</button><button v-if="loan.status==='active' && loan.borrower_id===studentId" :disabled="disabled" @click="send({type:'peerLoan',command:'repay',loanId:loan.id})">提前還款</button></span></p></div>
        <h3>高階人力市場</h3><div class="town-cards"><article v-for="person in ISEKAI_SPECIALISTS" :key="person.id"><span class="civic-portrait"><IsekaiPortrait :race-id="person.id === 'veterinarian' ? 'beast' : person.id === 'legal' ? 'elf' : 'human'" :profession-id="person.id === 'veterinarian' ? 'veterinarian' : person.id === 'legal' ? 'scholar' : 'merchant'" :seed="person.id" :label="person.name" /></span><b>{{ person.mark }} {{ person.name }}</b><small>{{ person.effect }}；聘用 {{ person.cost }}、每輪薪資 {{ person.wage }}</small><button v-if="!farm.expansion?.specialists?.includes(person.id)" :disabled="!can({type:'hireSpecialist',specialistId:person.id})" @click="send({type:'hireSpecialist',specialistId:person.id})">聘用</button><button v-else @click="send({type:'dismissSpecialist',specialistId:person.id})">結束合約</button></article></div>
        <h3>收支帳本</h3><div class="town-history"><p v-for="(entry,index) in farm.expansion?.accounts || []" :key="index">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.detail }} <b>{{ entry.income ? `+${entry.income}` : `-${entry.expense}` }}</b></p><p v-if="!farm.expansion?.accounts?.length">尚無金幣收支。</p></div>
        <h3>季節與大陸事件</h3><div class="town-history"><p v-for="(entry,index) in farm.expansion?.worldHistory || []" :key="index">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.details.join('；') }}</p><p v-if="!farm.expansion?.worldHistory?.length">下一輪三小時結算時會出現。</p></div>
      </template>
      <template v-else>
        <p>只能拜訪同班同學。拜訪後可查看對方的農莊領地與可分享收成；對同一位同學每三小時最多取得一份作物，資料庫會同步更新雙方倉庫。</p>
        <p v-if="!visitReady">請先在新專案執行同學互訪 SQL；若尚未有同班同學建立異世界農莊，也需等對方進入遊戲。</p>
        <div class="town-actions"><label>同學<select v-model="visitTargetId"><option value="">選擇同班同學</option><option v-for="person in classmates.filter(item => item.student_id !== studentId)" :key="person.student_id" :value="person.student_id">{{ person.hidden_name || person.student_id }}</option></select></label><button :disabled="disabled || !visitReady || !visitTargetId" @click="send({type:'peerVisit',command:'visit',targetId:visitTargetId})">拜訪農莊</button></div>
        <div v-if="visitPreview && visitPreview.targetId === visitTargetId" class="visit-preview"><h3>{{ loanPerson(visitTargetId) }}的農莊</h3><p>領地 {{ ISEKAI_AREAS.find(item => item.id === visitPreview.areaId)?.name || visitPreview.areaId }} · 累積收成 {{ visitPreview.harvested || 0 }} 次</p><div class="town-cards"><article v-for="crop in ISEKAI_CROPS.filter(item => (visitPreview.produce?.[item.id] || 0) > 0)" :key="crop.id" :class="{ active: visitCropId === crop.id }" @click="visitCropId = crop.id"><b>{{ crop.symbol }} {{ crop.name }}</b><small>可見庫存 {{ visitPreview.produce[crop.id] }} 份</small></article></div><p v-if="!ISEKAI_CROPS.some(item => (visitPreview.produce?.[item.id] || 0) > 0)">同學目前沒有可分享收成。</p><button :disabled="disabled || !visitCropId || !(visitPreview.produce?.[visitCropId] > 0)" @click="send({type:'peerVisit',command:'gather',targetId:visitTargetId,cropId:visitCropId})">取得所選作物一份</button></div>
        <h3>互訪紀錄</h3><div class="town-history"><p v-for="(entry,index) in visits" :key="index">{{ new Date(entry.created_at).toLocaleString('zh-TW') }} · {{ loanPerson(entry.actor_id) }} {{ entry.action === 'gather' ? '取得一份' : '拜訪' }} {{ loanPerson(entry.target_id) }}{{ entry.crop_id ? ` · ${ISEKAI_CROPS.find(item => item.id === entry.crop_id)?.name || entry.crop_id}` : '' }}</p><p v-if="!visits.length">尚無互訪紀錄。</p></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.town-panel{color:#eee2c5;display:grid;gap:10px;font-family:Georgia,'Noto Serif TC',serif}.town-panel *{box-sizing:border-box}.town-header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #bda47788;padding-bottom:8px}.town-header strong{font-size:18px}.town-header small{display:block;font-size:12px;color:#d6c9aa;margin-top:3px}.town-nav{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}.town-panel button{border:1px solid #c3a877;border-radius:5px;background:#31544b;color:#fff0d0;padding:8px;font:inherit;font-size:12px;cursor:pointer}.town-panel button:disabled{opacity:.42;cursor:not-allowed}.town-nav button.active{background:#8b673c;color:white}.town-content{min-height:0;overflow:auto;padding:0 2px 8px}.town-content p{font-size:13px;line-height:1.5}.town-content h3{margin:14px 0 6px;font-size:16px}.facility-builder{display:grid;grid-template-columns:minmax(160px,1.2fr) minmax(170px,1fr) auto;gap:7px;align-items:center;background:#bda47520;border:1px solid #bda47555;border-radius:6px;padding:8px;margin:4px 0 9px}.facility-builder span,.facility-builder small{font-size:12px;color:#e0d1ac}.facility-builder small{grid-column:1/-1}.town-panel label{display:grid;gap:4px;font-size:12px}.town-panel input,.town-panel select{width:100%;min-width:0;border:1px solid #bea06e;border-radius:4px;background:#f7edd2;color:#283a34;padding:7px;font:inherit;font-size:13px}.town-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;max-height:205px;overflow:auto}.town-cards article{border:1px solid #9d8763;border-radius:5px;background:#bda47519;padding:8px;cursor:pointer;display:grid;gap:4px}.town-cards article.active{background:#4f6853;border-color:#f1ce8d}.town-cards b{font-size:13px}.town-cards small{font-size:11px;line-height:1.4;color:#ddd0ae}.town-actions{display:flex;flex-wrap:wrap;align-items:end;gap:7px;margin:10px 0}.town-actions span{font-size:12px}.institution{background:#bda4751d;border:1px solid #c9ad7b;border-radius:6px;padding:12px;margin-top:10px}.institution h3{margin:0 0 7px}.institution>button{margin-top:6px}.school-settings{display:grid;grid-template-columns:1fr 1fr auto;gap:7px;align-items:end}.school-settings p{grid-column:1/-1}.institution-history,.town-history{max-height:160px;overflow:auto;border-top:1px solid #bda47780;margin-top:10px}.institution-history p,.town-history p{margin:0;border-bottom:1px solid #bda4773d;padding:6px 2px}.finance-summary{display:flex;gap:6px;flex-wrap:wrap}.finance-summary>*{background:#bda47520;border:1px solid #bda47555;border-radius:4px;padding:7px;font-size:12px}.town-panel.fullscreen{position:fixed;z-index:850;inset:2vh 3vw;background:linear-gradient(150deg,#1c3339,#13252c);border:2px solid #d3b47d;border-radius:10px;padding:18px;box-shadow:0 0 0 100vmax #06151bdf,0 20px 80px #000c;grid-template-rows:auto auto minmax(0,1fr)}.fullscreen .town-content{overflow:auto}.fullscreen .town-cards{max-height:300px}@media(max-width:800px){.town-nav{grid-template-columns:repeat(3,minmax(0,1fr))}.facility-builder{grid-template-columns:1fr 1fr}.facility-builder span{grid-column:1/-1}.school-settings{grid-template-columns:1fr 1fr}.school-settings button{grid-column:1/-1}}@media(max-width:480px){.town-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.facility-builder{grid-template-columns:1fr}.facility-builder span,.facility-builder small{grid-column:auto}.town-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.town-panel.fullscreen{inset:4px;padding:9px}}
.school-schedule{margin-top:10px;border-top:1px solid #bda47780}.school-schedule h4,.institution h4{font-size:14px;margin:10px 0 6px}.schedule-table{overflow-x:auto}.schedule-table>div{display:grid;grid-template-columns:36px repeat(6,minmax(90px,1fr));min-width:620px}.schedule-table b,.schedule-table span{border:1px solid #bda47770;padding:5px;font-size:11px;text-align:center}.schedule-table b{background:#496853}
.peer-loan-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;align-items:end}.loan-buttons{display:inline-flex;gap:4px;margin-left:5px}.loan-buttons button{padding:3px 7px;font-size:11px}@media(max-width:700px){.peer-loan-form{grid-template-columns:1fr 1fr}}@media(max-width:430px){.peer-loan-form{grid-template-columns:1fr}}
.close-institution{margin-top:12px;background:#623f3c!important;border-color:#d1a796!important}
.visit-preview{border:1px solid #c8aa76;border-radius:6px;padding:10px;margin:8px 0;background:#bda4751d}
.civic-people{max-height:310px}.civic-portrait{display:block;width:55px;height:82px;margin:auto}
.classroom-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:5px;margin:8px 0}.classroom-grid button{display:grid;gap:3px;text-align:left}.classroom-grid button.active{background:#82673e}.classroom-grid small{font-size:11px}
</style>
