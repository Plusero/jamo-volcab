/** Google 翻译链接：荷兰语 → 简体中文（默认）或英文。 */
export function googleTranslateUrl(text: string, tl: 'zh-CN' | 'en' = 'zh-CN'): string {
  return `https://translate.google.com/?${new URLSearchParams({ sl: 'nl', tl, text, op: 'translate' })}`;
}

/** Van Dale 首页。免费版已停止服务，需登录，不做深链。 */
export const VAN_DALE_URL = 'https://zoeken.vandale.nl/';

/** 复制到剪贴板（「复制词条」按钮用）。 */
export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
