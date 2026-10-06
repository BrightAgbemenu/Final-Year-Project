import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Phone, Package, Wallet, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { clientSchema, type ClientForm } from '@/lib/schemas';

export function NewClientPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema) as never,
    mode: 'onBlur',
    defaultValues: { total_cost: '' },
  });

  const onSubmit = async (data: ClientForm) => {
    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from('layaway_profiles')
      .insert({
        client_name: data.client_name,
        client_phone: data.client_phone || null,
        item_description: data.item_description,
        total_cost: parseFloat(data.total_cost),
      })
      .select('id')
      .single();

    setSubmitting(false);

    if (error) {
      showToast('Could not save this client. Please try again.', 'error');
      return;
    }

    showToast('Client added successfully.', 'success');
    navigate(`/clients/${inserted.id}`, { replace: true });
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
          <h1 className="font-serif text-2xl font-bold text-ink-900">New client</h1>
          <p className="text-sm text-ink-500">Create a layaway record for a new customer.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label htmlFor="client_name" className="label-text">Client's full name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              id="client_name"
              type="text"
              placeholder="e.g. Kofi Asante"
              className="input-field pl-11"
              {...register('client_name')}
            />
          </div>
          {errors.client_name && <p className="field-error">{errors.client_name.message}</p>}
        </div>

        <div>
          <label htmlFor="client_phone" className="label-text">Client's phone (optional)</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              id="client_phone"
              type="tel"
              placeholder="e.g. 024 123 4567"
              className="input-field pl-11"
              {...register('client_phone')}
            />
          </div>
          {errors.client_phone && <p className="field-error">{errors.client_phone.message}</p>}
        </div>

        <div>
          <label htmlFor="item_description" className="label-text">Item or service description</label>
          <div className="relative">
            <Package className="pointer-events-none absolute left-3.5 top-4 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <textarea
              id="item_description"
              rows={3}
              placeholder="e.g. Custom 3-seater sofa with Kente pattern"
              className="input-field pl-11 resize-none"
              {...register('item_description')}
            />
          </div>
          {errors.item_description && (
            <p className="field-error">{errors.item_description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="total_cost" className="label-text">Agreed total cost (GHS)</label>
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              id="total_cost"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              placeholder="0.00"
              className="input-field pl-11 tabular"
              {...register('total_cost')}
            />
          </div>
          {errors.total_cost && <p className="field-error">{errors.total_cost.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? (
              <><Spinner /> Saving…</>
            ) : (
              <><Check className="h-4 w-4" /> Save client</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
