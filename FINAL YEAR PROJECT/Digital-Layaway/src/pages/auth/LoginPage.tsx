import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/auth-errors';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui/Spinner';
import { PasswordInput } from '@/components/ui/PasswordInput';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/';

  const onSubmit = async (data: LoginForm) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setSubmitting(false);

    if (error) {
      showToast(mapAuthError(error), 'error');
      return;
    }

    showToast('Welcome back!', 'success');
    navigate(from, { replace: true });
  };

  return (
    <AuthLayout>
      <div>
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-ink-900">Sign in</h1>
          <p className="mt-2 text-sm text-ink-500">
            Enter your details to manage your layaway records.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="label-text">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="input-field pl-11"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="field-error">
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="label-text">Password</label>
              <Link
                to="/forgot-password"
                className="mb-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="At least 6 characters"
              {...register('password')}
            />
            {errors.password && (
              <p className="field-error">
                <span>{errors.password.message}</span>
              </p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <><Spinner /> Signing in…</>
            ) : (
              <>Sign in <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-ink-500">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
