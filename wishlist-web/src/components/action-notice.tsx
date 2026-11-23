export function ActionNotice({
  title,
  description,
  error = false,
}: {
  title: string
  description: string
  error?: boolean
}) {
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`rounded-lg border-l-4 bg-card p-4 shadow-sm ${
        error ? 'border-destructive' : 'border-primary'
      }`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
