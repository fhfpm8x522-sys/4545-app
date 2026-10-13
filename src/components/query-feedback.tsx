export function QueryFeedback({ loading, error, retry }: { loading?: boolean; error?: unknown; retry?: () => unknown }) {
  if (error) return <div role="alert" className="panel mb-4 p-4 text-sm"><p>לא הצלחנו לטעון את הנתונים. נסה שוב.</p>{retry && <button className="mt-2 text-club underline" onClick={() => retry()}>טעינה מחדש</button>}</div>;
  if (loading) return <p role="status" className="panel mb-4 animate-pulse p-4 text-sm text-muted-foreground">טוען נתונים…</p>;
  return null;
}
