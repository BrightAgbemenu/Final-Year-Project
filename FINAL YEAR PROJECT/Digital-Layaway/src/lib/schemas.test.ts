import { describe, expect, it } from 'vitest';
import { clientSchema } from './schemas';

const valid = {
  client_name: 'Kofi Asante',
  client_phone: '024 123 4567',
  item_description: 'Custom 3-seater sofa',
  total_cost: '500',
};

describe('clientSchema', () => {
  it('accepts a fully valid submission', () => {
    expect(clientSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an omitted phone (optional)', () => {
    const rest = {
      client_name: valid.client_name,
      item_description: valid.item_description,
      total_cost: valid.total_cost,
    };
    expect(clientSchema.safeParse(rest).success).toBe(true);
  });

  describe('client_name', () => {
    it('rejects a single character', () => {
      expect(clientSchema.safeParse({ ...valid, client_name: 'A' }).success).toBe(false);
    });

    it('accepts exactly 2 characters', () => {
      expect(clientSchema.safeParse({ ...valid, client_name: 'Ab' }).success).toBe(true);
    });

    it('accepts exactly 80 characters', () => {
      expect(clientSchema.safeParse({ ...valid, client_name: 'A'.repeat(80) }).success).toBe(true);
    });

    it('rejects 81 characters', () => {
      expect(clientSchema.safeParse({ ...valid, client_name: 'A'.repeat(81) }).success).toBe(false);
    });
  });

  describe('client_phone', () => {
    it.each(['024 123 4567', '+233241234567', '(024) 123-4567', '0241234567'])(
      'accepts %s',
      (client_phone) => {
        expect(clientSchema.safeParse({ ...valid, client_phone }).success).toBe(true);
      }
    );

    it.each(['abc1234567', '123', '024-123-4567-extension-99999'])(
      'rejects %s',
      (client_phone) => {
        expect(clientSchema.safeParse({ ...valid, client_phone }).success).toBe(false);
      }
    );
  });

  describe('item_description', () => {
    it('rejects 2 characters', () => {
      expect(clientSchema.safeParse({ ...valid, item_description: 'ab' }).success).toBe(false);
    });

    it('accepts exactly 3 characters', () => {
      expect(clientSchema.safeParse({ ...valid, item_description: 'abc' }).success).toBe(true);
    });

    it('rejects 201 characters', () => {
      expect(
        clientSchema.safeParse({ ...valid, item_description: 'a'.repeat(201) }).success
      ).toBe(false);
    });
  });

  describe('total_cost', () => {
    it('rejects an empty string', () => {
      expect(clientSchema.safeParse({ ...valid, total_cost: '' }).success).toBe(false);
    });

    it('rejects zero', () => {
      expect(clientSchema.safeParse({ ...valid, total_cost: '0' }).success).toBe(false);
    });

    it('rejects a negative amount', () => {
      expect(clientSchema.safeParse({ ...valid, total_cost: '-50' }).success).toBe(false);
    });

    it('rejects non-numeric input', () => {
      expect(clientSchema.safeParse({ ...valid, total_cost: 'abc' }).success).toBe(false);
    });

    it('accepts a small positive amount', () => {
      expect(clientSchema.safeParse({ ...valid, total_cost: '0.01' }).success).toBe(true);
    });

    it('accepts exactly the upper bound', () => {
      expect(clientSchema.safeParse({ ...valid, total_cost: '100000000' }).success).toBe(true);
    });

    it('rejects just above the upper bound', () => {
      expect(clientSchema.safeParse({ ...valid, total_cost: '100000000.01' }).success).toBe(
        false
      );
    });
  });
});
