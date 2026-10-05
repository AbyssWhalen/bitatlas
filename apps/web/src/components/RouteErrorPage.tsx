export function RouteErrorPage() {
  return (
    <main className="fatal-state route-error-page" role="alert">
      <h1>页面未能载入</h1>
      <p>请检查网络后重新载入。已保存的学习记录仍保留在本机。</p>
      <button className="primary-command" onClick={() => window.location.reload()}>重新载入页面</button>
    </main>
  );
}
