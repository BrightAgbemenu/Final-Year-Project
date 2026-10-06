import { z } from 'zod';

export const clientSchema = z.object({
  client_name: z.string().min(2, "Enter the client's full name").max(80, 'Name is too long'),
  client_phone: z
    .string()
    .optional()
    .refine((v) => !v || /^[0-9+\s()-]{7,20}$/.test(v), 'Enter a valid phone number'),
  item_description: z.string().min(3, 'Describe the item or service').max(200, 'Description is too long'),
  total_cost: z
    .string()
    .min(1, 'Enter an amount greater than zero')
    .refine((v) => {
      const n = parseFloat(v);
      return !Number.isNaN(n) && n > 0;
    }, 'Enter an amount greater than zero')
    .refine((v) => parseFloat(v) <= 100000000, 'Amount is too large'),
});

export type ClientForm = z.infer<typeof clientSchema>;
