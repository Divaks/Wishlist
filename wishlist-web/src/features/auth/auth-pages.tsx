import type { ComponentProps } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api/client'
import type {
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '@/types/api'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.').max(255),
  password: z.string().min(1, 'Enter your password.'),
  name: z.string().optional(),
})

const registerSchema = loginSchema.extend({
  name: z.string().trim().max(100, 'Use 100 characters or fewer.').optional(),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .refine(
      (password) => new TextEncoder().encode(password).length <= 72,
      'Use a password of 72 bytes or fewer.',
    ),
})

type AuthFieldProps = Pick<
  ComponentProps<typeof Input>,
  'type' | 'autoComplete' | 'required'
> & {
  label: string
  field: UseFormRegisterReturn
  error?: string
}

function AuthField({ field, label, error, ...inputProps }: AuthFieldProps) {
  const id = field.name
  const errorId = `${id}-error`

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {!inputProps.required && (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
        {...field}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const { api, setAccessToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const registeredEmail =
    typeof location.state?.registeredEmail === 'string'
      ? location.state.registeredEmail
      : undefined
  const submitLabel = isRegister ? 'Create account' : 'Log in'
  const submittingLabel = isRegister ? 'Creating account…' : 'Logging in…'
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: {
      email: registeredEmail ?? '',
    },
  })

  const submit = handleSubmit(async ({ email, password, name }) => {
    try {
      if (isRegister) {
        const body: RegisterRequest = {
          email,
          password,
          ...(name ? { name } : {}),
        }
        await api<RegisterResponse>('/auth/register', {
          method: 'POST',
          json: body,
        })
        void navigate('/login', {
          replace: true,
          state: { registeredEmail: email },
        })
        return
      }

      const { accessToken } = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        json: { email, password },
      })
      setAccessToken(accessToken)
      void navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !isRegister) {
        setError('root', { message: 'Email or password is incorrect.' })
      } else if (
        error instanceof ApiError &&
        error.status === 409 &&
        isRegister
      ) {
        setError('root', {
          message: 'An account already uses this email. Log in to continue.',
        })
      } else {
        setError('root', { message: 'Something went wrong. Please try again.' })
      }
    }
  })

  return (
    <Card className="mx-auto w-full max-w-md sm:mt-6">
      <CardHeader>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isRegister ? 'Create an account' : 'Log in'}
        </h1>
        {!isRegister && registeredEmail && (
          <p role="status" className="text-sm text-muted-foreground">
            Account created. Log in to continue.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={submit}>
          <fieldset disabled={isSubmitting} className="space-y-5">
            {isRegister && (
              <AuthField
                label="Name"
                autoComplete="name"
                field={register('name')}
                error={errors.name?.message}
              />
            )}
            <AuthField
              label="Email"
              type="email"
              autoComplete="email"
              required
              field={register('email')}
              error={errors.email?.message}
            />
            <AuthField
              label="Password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              field={register('password')}
              error={errors.password?.message}
            />
            {errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full">
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </fieldset>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          {isRegister ? 'Already have an account?' : 'New to Wishlist?'}{' '}
          <Link
            className="font-medium text-foreground underline underline-offset-4"
            to={isRegister ? '/login' : '/register'}
          >
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export function LoginPage() {
  return <AuthForm mode="login" />
}

export function RegisterPage() {
  return <AuthForm mode="register" />
}
