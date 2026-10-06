import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, User, Store, Phone, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { mapSaveError } from '@/lib/errors';

const settingsSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name').max(80, 'Name is too long'),
  business_name: z.string().max(80, 'Business name is too long').optional(),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^[0-9+\s()-]{7,20}$/.test(v), 'Enter a valid phone number'),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      business_name: profile?.business_name || '',
      phone: profile?.phone || '',
    },
  });

  const onSubmit = async (data: SettingsForm) => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        business_name: data.business_name || null,
        phone: data.phone || null,
      })
      .eq('id', user.id);
    setSubmitting(false);

    if (error) {
      showToast(mapSaveError(error), 'error');
      return;
    }

    await refreshProfile();
    showToast('Profile updated.', 'success');
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex animate-fade-in items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-ink-600 transition-colors hover:bg-paper-200"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink-900">Your profile</h1>
          <p className="text-sm text-ink-500">Update the name and phone number your clients see.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5 p-5" noValidate>
        <div>
          <label htmlFor="full_name" className="label-text">Full name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              className="input-field pl-11"
              {...register('full_name')}
            />
          </div>
          {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
        </div>

        <div>
          <label htmlFor="business_name" className="label-text">Business name (optional)</label>
          <div className="relative">
            <Store className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              id="business_name"
              type="text"
              placeholder="e.g. Ama's Fashion House"
              autoComplete="organization"
              className="input-field pl-11"
              {...register('business_name')}
            />
          </div>
          {errors.business_name ? (
            <p className="field-error">{errors.business_name.message}</p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-500">
              Shown on receipts and WhatsApp messages instead of your personal name, if set.
            </p>
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
              className="input-field pl-11"
              {...register('phone')}
            />
          </div>
          {errors.phone && <p className="field-error">{errors.phone.message}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Save changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
