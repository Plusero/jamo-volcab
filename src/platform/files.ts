/** 触发浏览器下载一个文本文件。 */
export function downloadFile(fileName: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
}

const isDomError = (e: unknown, name: string) => e instanceof DOMException && e.name === name;

/**
 * 手机上用系统分享面板（iPhone 靠它「存储到文件」），电脑上直接下载。
 * 用户在分享面板里取消不算错误。
 */
export async function shareOrDownload(fileName: string, text: string): Promise<void> {
  const file = new File([text], fileName, { type: 'application/json' });
  if (navigator.maxTouchPoints > 0 && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch (e) {
      if (isDomError(e, 'AbortError')) return;
      // canShare 说可以、share 却拒绝（Chromium 不分享 .json；或用户手势已过期）：改为下载。
      if (!isDomError(e, 'NotAllowedError')) throw e;
    }
  }
  downloadFile(fileName, text);
}
