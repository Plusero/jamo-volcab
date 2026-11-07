import { useCallback, useEffect, useState } from 'react';

/**
 * 异步读取数据。出错时在渲染中抛出，交给全局 ErrorBoundary。
 * 返回 [值（加载中为 undefined）, 重新读取]。fn 应保持稳定（用 useCallback）。
 */
export function useAsync<T>(fn: () => Promise<T>): [T | undefined, () => void] {
  const [value, setValue] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  if (error) throw error;

  useEffect(() => {
    let live = true;
    fn().then((v) => live && setValue(v), (e: unknown) => live && setError(e));
    return () => { live = false; };
  }, [fn, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return [value, reload];
}
