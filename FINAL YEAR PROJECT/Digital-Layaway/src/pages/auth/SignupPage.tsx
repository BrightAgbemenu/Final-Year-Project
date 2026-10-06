import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, User, Phone, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/auth-errors';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui/Spinner';
import { PasswordInput } from '@/components/ui/PasswordInput';

const signupSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name').max(80, 'Name is too long'),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[0-9+\s()-]{7,20}$/.test(v),
      'Enter a valid phone number'
    ),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupForm = z.infer<typeof signupSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: SignupForm) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          phone: data.phone || null,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      showToast(mapAuthError(error), 'error');
      return;
    }

    showToast('Account created! Welcome to LedgerPay.', 'success');
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout>
      <div>
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold text-ink-900">Get started</h1>
          <p className="mt-2 text-sm text-ink-500">
            Set up your free artisan account in seconds. No paperwork required.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="full_name" className="label-text">Full name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Ama Mensah"
                className="input-field pl-11"
                {...register('full_name')}
              />
            </div>
            {errors.full_name && (
              <p className="field-error">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="label-text">Phone (optional)</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g. 024 123 4567"
                className="input-field pl-11"
                {...register('phone')}
              />
            </div>
            {errors.phone && (
              <p className="field-error">{errors.phone.message}</p>
            )}
          </div>

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
              <p className="field-error">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="label-text">Password</label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              {...register('password')}
            />
            {errors.password && (
              <p className="field-error">{errors.password.message}</p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <><Spinner /> Creating account…</>
            ) : (
              <>Create account <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
