import { ActionParameter } from '../../action-parameters/domain/action-parameter';
import { buildParameterSchema, parseEnumValues } from './parameter-schema';

describe('parseEnumValues', () => {
  it('should parse JSON arrays and comma-separated lists', () => {
    expect(parseEnumValues('["a","b"]')).toEqual(['a', 'b']);
    expect(parseEnumValues('a, b ,c')).toEqual(['a', 'b', 'c']);
    expect(parseEnumValues(null)).toEqual([]);
    expect(parseEnumValues('  ')).toEqual([]);
  });
});

describe('buildParameterSchema', () => {
  const schema = buildParameterSchema([
    { name: 'orderId', type: 'string', description: '', isRequired: true },
    { name: 'quantity', type: 'number', description: '', isRequired: false },
    {
      name: 'reason',
      type: 'string',
      description: '',
      isRequired: false,
      enumValues: 'damaged,late',
    },
  ] as ActionParameter[]);

  it('should accept typed values and nulls', () => {
    expect(schema.parse({ orderId: '1', quantity: 2, reason: 'late' })).toEqual(
      { orderId: '1', quantity: 2, reason: 'late' },
    );
    expect(
      schema.parse({ orderId: null, quantity: null, reason: null }),
    ).toEqual({ orderId: null, quantity: null, reason: null });
  });

  it('should reject values outside the enum', () => {
    expect(() =>
      schema.parse({ orderId: '1', quantity: 1, reason: 'other' }),
    ).toThrow();
  });
});
