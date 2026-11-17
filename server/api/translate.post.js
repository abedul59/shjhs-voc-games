export default defineEventHandler(async event => {
  const body = await readBody(event);
  const text = String(body?.text || '').trim();

  if (!text) throw createError({ statusCode: 400, message: '請輸入英文句子。' });
  if (text.length > 500) throw createError({ statusCode: 400, message: '單句不可超過 500 個字元。' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const query = new URLSearchParams({
      client: 'gtx',
      sl: 'en',
      tl: 'zh-TW',
      dt: 't',
      q: text
    });
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'shjhs-voc-games/1.0' }
    });
    if (!response.ok) throw new Error(`translation-http-${response.status}`);

    const payload = await response.json();
    const translation = Array.isArray(payload?.[0])
      ? payload[0].map(part => part?.[0] || '').join('').trim()
      : '';
    if (!translation) throw new Error('translation-empty');
    return { translation };
  } catch (error) {
    console.error('English to Traditional Chinese translation failed:', error);
    throw createError({ statusCode: 502, message: '自動翻譯暫時無法使用，請稍後重試或直接輸入中文。' });
  } finally {
    clearTimeout(timeout);
  }
});
