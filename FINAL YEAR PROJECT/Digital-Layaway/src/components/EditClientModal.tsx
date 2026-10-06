import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Phone, Package, Wallet, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { clientSchema, type ClientForm } from '@/lib/schemas';
import { formatGHS } from '@/lib/format';
import { mapSaveError } from '@/lib/errors';
import type { LayawayWithTotals } from '@/types/database';

type EditClientModalProps = {
  open: boolean;
  onClose: () => void;
  profile: LayawayWithTotals;
  onUpdated: () => void;
};

export function EditClientModal({ open, onClose, profile, onUpdated }: EditClientModalProps) {
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema) as never,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) {
      reset({
        client_name: profile.client_name,
        client_phone: profile.client_phone || '',
        item_description: profile.item_description,
        total_cost: String(profile.total_cost),
      });
    }
  }, [open, profile, reset]);

  const onSubmit = async (data: ClientForm) => {
    const newTotalCost = parseFloat(data.total_cost);

    if (newTotalCost < profile.total_paid) {
      setError('total_cost', {
        message: `Cannot be less than the ${formatGHS(profile.total_paid)} already paid.`,
      });
      return;
    }

    const { error } = await supabase
      .from('layaway_profiles')
      .update({
        client_name: data.client_name,
        client_phone: data.client_phone || null,
        item_description: data.item_description,
        total_cost: newTotalCost,
      })
      .eq('id', profile.id);

    if (error) {
      showToast(mapSaveError(error), 'error');
      return;
    }

    showToast('Client updated.', 'success');
    onUpdated();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit client" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="edit_client_name" className="label-text">
            Client's full name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              id="edit_client_name"
              type="text"
              className="input-field pl-11"
              {...register('client_name')}
            />
          </div>
          {errors.client_name && <p className="field-error">{errors.client_name.message}</p>}
        </div>

        <div>
          <label htmlFor="edit_client_phone" className="label-text">
            Client's phone (optional)
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              id="edit_client_phone"
              type="tel"
              className="input-field pl-11"
              {...register('client_phone')}
            />
          </div>
          {errors.client_phone && <p className="field-error">{errors.client_phone.message}</p>}
        </div>

        <div>
          <label htmlFor="edit_item_description" className="label-text">
            Item or service description
          </label>
          <div className="relative">
            <Package className="pointer-events-none absolute left-3.5 top-4 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <textarea
              id="edit_item_description"
              rows={3}
              className="input-field resize-none pl-11"
              {...register('item_description')}
            />
          </div>
          {errors.item_description && (
            <p className="field-error">{errors.item_description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="edit_total_cost" className="label-text">
            Agreed total cost (GHS)
          </label>
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              id="edit_total_cost"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              className="input-field pl-11 tabular"
              {...register('total_cost')}
            />
          </div>
          {errors.total_cost ? (
            <p className="field-error">{errors.total_cost.message}</p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-500">
              {formatGHS(profile.total_paid)} already paid on this record.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? (
              <>
                <Spinner /> Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Save changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
