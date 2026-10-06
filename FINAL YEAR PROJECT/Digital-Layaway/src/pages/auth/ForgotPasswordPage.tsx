import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Mail, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/auth-errors';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui/Spinner';

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (error) {
      showToast(mapAuthError(error), 'error');
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout>
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold text-ink-900">Check your email</h1>
          <p className="mt-2 text-sm text-ink-500">
            If an account exists for that address, we&apos;ve sent a link to reset your password.
            It may take a minute to arrive.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary mt-6 w-full">
            Back to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div>
        <button
          onClick={() => navigate('/login')}
          className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-ink-600 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>

        <h1 className="font-serif text-3xl font-bold text-ink-900">Reset your password</h1>
        <p className="mt-2 text-sm text-ink-500">
          Enter the email on your account and we&apos;ll send you a link to set a new password.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
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
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <><Spinner /> Sending…</>
            ) : (
              <>Send reset link <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
