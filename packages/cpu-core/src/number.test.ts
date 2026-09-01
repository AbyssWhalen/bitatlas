import { describe, expect, it } from 'vitest';
import {
  CPU_EXPLORER_NUMBER_SOURCE_COMMIT,
  decodeFloat32,
  decodeSignedInteger,
  encodeFloat32,
  encodeSignedInteger,
  formatInteger,
  parseInteger,
  type NumberCoreResult,
} from './index';

function unwrap<T>(result: NumberCoreResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function errorCode<T>(result: NumberCoreResult<T>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected an error result.');
  return result.error.code;
}

describe('number core provenance', () => {
  it('records the pinned CPU Explorer source commit', () => {
    expect(CPU_EXPLORER_NUMBER_SOURCE_COMMIT).toBe('94194987e6ed72d437a7b3debdc14adb2aaa4619');
  });
});

describe('signed integer parsing and formatting', () => {
  it.each([
    [{ text: '-0b1010' } as const, -10n, 2],
    [{ text: '+0o52' } as const, 42n, 8],
    [{ text: '42' } as const, 42n, 10],
    [{ text: '-0x2A' } as const, -42n, 16],
    [{ text: '-2A', radix: 16 } as const, -42n, 16],
  ])('strictly parses $0', (input, expected, radix) => {
    const parsed = unwrap(parseInteger(input));
    expect(parsed).toMatchObject({ value: expected, radix });
  });

  it('rejects empty input, invalid digits, and a conflicting prefix', () => {
    expect(errorCode(parseInteger({ text: '  ' }))).toBe('empty-input');
    expect(errorCode(parseInteger({ text: '0b102' }))).toBe('invalid-digit');
    expect(errorCode(parseInteger({ text: '0x10', radix: 10 }))).toBe('prefix-radix-mismatch');
  });

  it('rejects a radix outside 2, 8, 10, and 16 at the runtime boundary', () => {
    expect(errorCode(parseInteger({ text: '10', radix: 3 as 2 }))).toBe('invalid-radix');
    expect(errorCode(formatInteger({ value: 10n, radix: 3 as 2 }))).toBe('invalid-radix');
  });

  it('formats signed values with deterministic digits and prefixes', () => {
    expect(unwrap(formatInteger({ value: -42n, radix: 2, prefix: true })).text).toBe('-0b101010');
    expect(unwrap(formatInteger({ value: -42n, radix: 8, prefix: true })).text).toBe('-0o52');
    expect(unwrap(formatInteger({ value: -42n, radix: 10, prefix: true })).text).toBe('-42');
    expect(unwrap(formatInteger({ value: -42n, radix: 16, prefix: true, uppercase: true })).text).toBe('-0x2A');
  });
});

describe('signed integer representations', () => {
  it('preserves the valid CPU Explorer -5 @ 8-bit compatibility vector', () => {
    expect(unwrap(encodeSignedInteger({ value: -5n, bitWidth: 8, representation: 'sign-magnitude' })).bits)
      .toBe('10000101');
    expect(unwrap(encodeSignedInteger({ value: -5n, bitWidth: 8, representation: 'ones-complement' })).bits)
      .toBe('11111010');
    expect(unwrap(encodeSignedInteger({ value: -5n, bitWidth: 8, representation: 'twos-complement' })).bits)
      .toBe('11111011');
  });

  it('does not preserve the old 9-bit sign/ones-complement error for -128 @ 8-bit', () => {
    expect(errorCode(encodeSignedInteger({
      value: -128n,
      bitWidth: 8,
      representation: 'sign-magnitude',
    }))).toBe('out-of-range');
    expect(errorCode(encodeSignedInteger({
      value: -128n,
      bitWidth: 8,
      representation: 'ones-complement',
    }))).toBe('out-of-range');
    expect(unwrap(encodeSignedInteger({
      value: -128n,
      bitWidth: 8,
      representation: 'twos-complement',
    })).bits).toBe('10000000');
  });

  it('round-trips representable boundary values for every representation', () => {
    for (const representation of ['sign-magnitude', 'ones-complement', 'twos-complement'] as const) {
      for (const value of [-127n, -1n, 0n, 1n, 127n]) {
        const encoded = unwrap(encodeSignedInteger({ value, bitWidth: 8, representation }));
        const decoded = unwrap(decodeSignedInteger({ bits: encoded.bits, bitWidth: 8, representation }));
        expect(decoded).toMatchObject({ value, negativeZero: false });
      }
    }
  });

  it('distinguishes negative zero for sign-magnitude and ones-complement', () => {
    expect(unwrap(decodeSignedInteger({
      bits: '10000000',
      bitWidth: 8,
      representation: 'sign-magnitude',
    }))).toMatchObject({ value: 0n, negativeZero: true });
    expect(unwrap(decodeSignedInteger({
      bits: '11111111',
      bitWidth: 8,
      representation: 'ones-complement',
    }))).toMatchObject({ value: 0n, negativeZero: true });
    expect(unwrap(decodeSignedInteger({
      bits: '10000000',
      bitWidth: 8,
      representation: 'twos-complement',
    }))).toMatchObject({ value: -128n, negativeZero: false });
  });

  it('validates bit width, exact bit count, and binary characters', () => {
    expect(errorCode(encodeSignedInteger({
      value: 0n,
      bitWidth: 1,
      representation: 'twos-complement',
    }))).toBe('invalid-bit-width');
    expect(errorCode(decodeSignedInteger({
      bits: '1010',
      bitWidth: 8,
      representation: 'twos-complement',
    }))).toBe('bit-width-mismatch');
    expect(errorCode(decodeSignedInteger({
      bits: '0000000x',
      bitWidth: 8,
      representation: 'twos-complement',
    }))).toBe('invalid-bit-string');
    expect(errorCode(encodeSignedInteger({
      value: 128n,
      bitWidth: 8,
      representation: 'twos-complement',
    }))).toBe('out-of-range');
  });
});

describe('float32 IEEE 754 inspection', () => {
  it('preserves valid CPU Explorer vectors for 1.5 and negative zero', () => {
    const onePointFive = unwrap(encodeFloat32({ value: 1.5 }));
    expect(onePointFive).toMatchObject({
      bits: '00111111110000000000000000000000',
      hex: '0x3fc00000',
      classification: 'normal',
      sign: 0,
      exponentBits: '01111111',
      fractionBits: '10000000000000000000000',
    });

    const negativeZero = unwrap(encodeFloat32({ value: -0 }));
    expect(negativeZero).toMatchObject({
      bits: '10000000000000000000000000000000',
      classification: 'negative-zero',
      sign: 1,
    });
    expect(Object.is(negativeZero.value, -0)).toBe(true);
  });

  it.each([
    [0, 'positive-zero', '00000000000000000000000000000000'],
    [Number.POSITIVE_INFINITY, 'positive-infinity', '01111111100000000000000000000000'],
    [Number.NEGATIVE_INFINITY, 'negative-infinity', '11111111100000000000000000000000'],
  ] as const)('classifies %s', (value, classification, bits) => {
    expect(unwrap(encodeFloat32({ value }))).toMatchObject({ classification, bits });
  });

  it('classifies NaN without relying on a particular NaN payload', () => {
    const result = unwrap(encodeFloat32({ value: Number.NaN }));
    expect(result.classification).toBe('nan');
    expect(result.exponentBits).toBe('11111111');
    expect(result.fractionRaw).not.toBe(0);
    expect(Number.isNaN(result.value)).toBe(true);
  });

  it('decodes the smallest positive subnormal value', () => {
    const result = unwrap(decodeFloat32({ bits: '00000000000000000000000000000001' }));
    expect(result.classification).toBe('subnormal');
    expect(result.value).toBe(2 ** -149);
  });

  it('rejects malformed float32 bit strings instead of returning NaN', () => {
    expect(errorCode(decodeFloat32({ bits: '0'.repeat(31) }))).toBe('bit-width-mismatch');
    expect(errorCode(decodeFloat32({ bits: `${'0'.repeat(31)}x` }))).toBe('invalid-bit-string');
  });
});
