// 仅在 jsdom 环境中加载 jest-dom 匹配器;node 环境下无事发生。
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
}

export {};
