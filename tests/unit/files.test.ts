// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownload } from '../../src/platform/files';

function stubNavigator(p: { touch: number; canShare?: boolean; share?: () => Promise<void> }) {
  vi.stubGlobal('navigator', {
    maxTouchPoints: p.touch,
    canShare: p.canShare === undefined ? undefined : () => p.canShare,
    share: p.share,
  });
}

describe('shareOrDownload', () => {
  let click: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    click = vi.fn();
    HTMLAnchorElement.prototype.click = click as unknown as () => void;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('电脑（无触屏）直接下载，不调用分享', async () => {
    const share = vi.fn();
    stubNavigator({ touch: 0, canShare: true, share });
    await shareOrDownload('b.json', '{}');
    expect(share).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it('手机上分享成功就不再下载', async () => {
    stubNavigator({ touch: 5, canShare: true, share: () => Promise.resolve() });
    await shareOrDownload('b.json', '{}');
    expect(click).not.toHaveBeenCalled();
  });

  it('分享被拒绝（NotAllowedError）时改为下载', async () => {
    stubNavigator({ touch: 5, canShare: true, share: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) });
    await shareOrDownload('b.json', '{}');
    expect(click).toHaveBeenCalledOnce();
  });

  it('用户取消分享（AbortError）不报错也不下载', async () => {
    stubNavigator({ touch: 5, canShare: true, share: () => Promise.reject(new DOMException('cancel', 'AbortError')) });
    await shareOrDownload('b.json', '{}');
    expect(click).not.toHaveBeenCalled();
  });

  it('其他错误照常抛出', async () => {
    stubNavigator({ touch: 5, canShare: true, share: () => Promise.reject(new TypeError('boom')) });
    await expect(shareOrDownload('b.json', '{}')).rejects.toThrow('boom');
  });
});
