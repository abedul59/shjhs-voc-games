<script setup>
import { ref } from 'vue';
const emit = defineEmits(['verified']);
const password = ref('');
const error = ref('');
const verify = () => {
  const today = new Date();
  const expected = `${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  if (password.value === expected) {
    emit('verified', password.value);
    password.value = '';
  } else {
    password.value = '';
    error.value = '驗證失敗，請重新輸入。';
  }
};
</script>

<template>
  <section class="exam-gate">
    <h1>再次驗證身分</h1>
    <form @submit.prevent="verify">
      <label for="exam-password">動態密碼</label>
      <input id="exam-password" v-model="password" type="password" autocomplete="off" required autofocus>
      <button type="submit">進入出題器</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <NuxtLink to="/admin">返回後台</NuxtLink>
  </section>
</template>

<style scoped>
.exam-gate{max-width:420px;margin:10vh auto;padding:32px;border:1px solid #94a3b8;border-radius:12px;background:#fff;color:#1e293b;font-family:system-ui,'Noto Sans TC',sans-serif}.exam-gate form{display:grid;gap:12px}.exam-gate input,.exam-gate button{padding:12px;font:inherit}.exam-gate button{background:#1e3a8a;color:#fff;border:0;border-radius:6px;cursor:pointer}.exam-gate p{color:#b91c1c}.exam-gate a{display:inline-block;margin-top:18px}
</style>
