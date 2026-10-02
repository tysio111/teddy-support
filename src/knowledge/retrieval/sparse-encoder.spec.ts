import { SparseEncoder } from './sparse-encoder';

describe('SparseEncoder', () => {
  it('should count term frequencies with unique, sorted indices', () => {
    const vector = new SparseEncoder().encode('Refund refund REFUND policy');

    expect(vector.indices).toHaveLength(2);
    expect([...vector.indices].sort((a, b) => a - b)).toEqual(vector.indices);
    expect(vector.values.sort()).toEqual([1, 3]);
  });

  it('should produce the same indices for documents and queries', () => {
    const encoder = new SparseEncoder();
    const document = encoder.encode('How long does delivery take?');
    const query = encoder.encode('delivery');

    expect(document.indices).toEqual(expect.arrayContaining(query.indices));
  });

  it('should tokenize any script', () => {
    const encoder = new SparseEncoder();

    expect(encoder.terms('Zwrot towaru — 30 dni')).toEqual([
      'zwrot',
      'towaru',
      '30',
      'dni',
    ]);
    expect(encoder.terms('Доставка заказа')).toEqual(['доставка', 'заказа']);
  });

  it('should stem when a language is configured', () => {
    const encoder = new SparseEncoder('english');

    expect(encoder.terms('shipping shipped ships')).toEqual([
      'ship',
      'ship',
      'ship',
    ]);
    expect(encoder.encode('shipping').indices).toEqual(
      encoder.encode('shipped').indices,
    );
  });

  it('should reject unknown languages', () => {
    expect(() => new SparseEncoder('klingon')).toThrow(/No stemmer/);
  });

  it('should return an empty vector for text without words', () => {
    expect(new SparseEncoder().encode('?! …')).toEqual({
      indices: [],
      values: [],
    });
  });
});
