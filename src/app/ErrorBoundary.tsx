import { Component, type ReactNode } from 'react';
import { exportBackup } from '../application/backup';
import { downloadFile } from '../platform/files';
import { db } from './AppContext';

/**
 * Let it crash 的唯一兜底：渲染错误、未捕获异常和未处理的 Promise 拒绝都到这里。
 * 恢复方式就是刷新页面；页面状态会从 IndexedDB 重新推导。
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidMount() {
    window.addEventListener('error', this.onError);
    window.addEventListener('unhandledrejection', this.onRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.onError);
    window.removeEventListener('unhandledrejection', this.onRejection);
  }

  onError = (e: ErrorEvent) => this.setState({ error: e.error ?? e.message });
  onRejection = (e: PromiseRejectionEvent) => this.setState({ error: e.reason });

  exportNow = async () => {
    const { fileName, json } = await exportBackup(db, Date.now());
    downloadFile(fileName, json);
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return (
      <main className="error-screen">
        <h1>出错了</h1>
        <pre>{message}</pre>
        <div className="row">
          <button className="btn primary" onClick={() => location.reload()}>刷新</button>
          <button className="btn" onClick={this.exportNow}>导出备份</button>
        </div>
      </main>
    );
  }
}
