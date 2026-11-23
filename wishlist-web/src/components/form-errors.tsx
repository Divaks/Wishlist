import type { FieldErrors, FieldValues } from 'react-hook-form'

export function FormErrors<T extends FieldValues>({
  errors,
}: {
  errors: FieldErrors<T>
}) {
  const messages = Object.values(errors).flatMap((error) =>
    typeof error?.message === 'string' ? [error.message] : [],
  )
  if (!messages.length) return null
  return (
    <ul role="alert" className="list-disc pl-5 text-destructive">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}
