import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/auth-errors';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AppLayout';
import { Spinner, FullPageLoader } from '@/components/ui/Spinner';
import { PasswordInput } from '@/components/ui/PasswordInput';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

/**
 * Reached via the link Supabase emails from resetPasswordForEmail(). The recovery
 * token in the URL is parsed into a real (temporary) session by the supabase-js
 * client before this component mounts (detectSessionInUrl is on) — so `session`
 * being present is what confirms the link is valid, not a route guard.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setSubmitting(false);

    if (error) {
      showToast(mapAuthError(error), 'error');
      return;
    }

    showToast('Password updated.', 'success');
    navigate('/', { replace: true });
  };

  if (authLoading) {
    return <FullPageLoader label="Verifying your link…" />;
  }

  if (!session) {
    return (
      <AuthLayout>
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink-900">Link expired</h1>
          <p className="mt-2 text-sm text-ink-500">
            This password reset link is invalid or has expired. Request a new one to continue.
          </p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="btn-primary mt-6 w-full"
          >
            Request a new link
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="font-serif text-3xl font-bold text-ink-900">Set a new password</h1>
        <p className="mt-2 text-sm text-ink-500">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="password" className="label-text">New password</label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              {...register('password')}
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <><Spinner /> Updating…</>
            ) : (
              <>Update password <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
