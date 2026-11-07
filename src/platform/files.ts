/** 触发浏览器下载一个文本文件。 */
export function downloadFile(fileName: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
}

/** 支持分享文件时走系统分享面板，否则下载。用户在分享面板里取消不算错误。 */
export async function shareOrDownload(fileName: string, text: string): Promise<void> {
  const file = new File([text], fileName, { type: 'application/json' });
  if (!navigator.canShare?.({ files: [file] })) return downloadFile(fileName, text);
  try {
    await navigator.share({ files: [file], title: fileName });
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
  }
}
