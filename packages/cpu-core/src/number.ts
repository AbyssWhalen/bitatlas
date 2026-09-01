export const CPU_EXPLORER_NUMBER_SOURCE_COMMIT = '94194987e6ed72d437a7b3debdc14adb2aaa4619' as const;

export type IntegerRadix = 2 | 8 | 10 | 16;
export type SignedIntegerRepresentation = 'sign-magnitude' | 'ones-complement' | 'twos-complement';
export type Float32Classification =
  | 'positive-zero'
  | 'negative-zero'
  | 'subnormal'
  | 'normal'
  | 'positive-infinity'
  | 'negative-infinity'
  | 'nan';

export type NumberCoreErrorCode =
  | 'empty-input'
  | 'invalid-input'
  | 'invalid-radix'
  | 'invalid-digit'
  | 'prefix-radix-mismatch'
  | 'invalid-bit-width'
  | 'invalid-bit-string'
  | 'bit-width-mismatch'
  | 'invalid-representation'
  | 'out-of-range';

export interface NumberCoreError {
  code: NumberCoreErrorCode;
  message: string;
  details?: Readonly<Record<string, string | number>>;
}

export type NumberCoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: NumberCoreError };

export interface ParseIntegerInput {
  text: string;
  radix?: IntegerRadix;
}

export interface IntegerParseStep {
  index: number;
  symbol: string;
  digitValue: number;
  accumulator: bigint;
}

export interface ParsedInteger {
  value: bigint;
  radix: IntegerRadix;
  sign: -1 | 0 | 1;
  digits: string;
  normalized: string;
  steps: readonly IntegerParseStep[];
}

export interface FormatIntegerInput {
  value: bigint;
  radix: IntegerRadix;
  prefix?: boolean;
  uppercase?: boolean;
}

export interface FormattedInteger {
  value: bigint;
  radix: IntegerRadix;
  sign: '-' | '';
  prefix: '' | '0b' | '0o' | '0x';
  digits: string;
  text: string;
}

export interface EncodeSignedIntegerInput {
  value: bigint;
  bitWidth: number;
  representation: SignedIntegerRepresentation;
}

export interface DecodeSignedIntegerInput {
  bits: string;
  bitWidth: number;
  representation: SignedIntegerRepresentation;
}

export interface SignedIntegerRange {
  min: bigint;
  max: bigint;
}

export interface EncodedSignedInteger {
  value: bigint;
  bitWidth: number;
  representation: SignedIntegerRepresentation;
  bits: string;
  signBit: '0' | '1';
  payloadBits: string;
  range: SignedIntegerRange;
}

export interface DecodedSignedInteger extends EncodedSignedInteger {
  negativeZero: boolean;
}

export interface EncodeFloat32Input {
  value: number;
}

export interface DecodeFloat32Input {
  bits: string;
}

export interface Float32Info {
  value: number;
  bits: string;
  hex: string;
  classification: Float32Classification;
  sign: 0 | 1;
  signBits: string;
  exponentBits: string;
  fractionBits: string;
  exponentRaw: number;
  fractionRaw: number;
  exponentBias: 127;
  unbiasedExponent: number | null;
}

const RADICES = new Set<number>([2, 8, 10, 16]);
const REPRESENTATIONS = new Set<string>(['sign-magnitude', 'ones-complement', 'twos-complement']);
const MIN_BIT_WIDTH = 2;
const MAX_BIT_WIDTH = 1024;
const DIGIT_PATTERNS: Record<IntegerRadix, RegExp> = {
  2: /^[01]+$/u,
  8: /^[0-7]+$/u,
  10: /^[0-9]+$/u,
  16: /^[0-9a-f]+$/iu,
};
const PREFIXES: Record<IntegerRadix, FormattedInteger['prefix']> = {
  2: '0b',
  8: '0o',
  10: '',
  16: '0x',
};

function success<T>(value: T): NumberCoreResult<T> {
  return { ok: true, value };
}

function failure(
  code: NumberCoreErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number>>,
): NumberCoreResult<never> {
  return details ? { ok: false, error: { code, message, details } } : { ok: false, error: { code, message } };
}

function isIntegerRadix(value: unknown): value is IntegerRadix {
  return typeof value === 'number' && RADICES.has(value);
}

function isRepresentation(value: unknown): value is SignedIntegerRepresentation {
  return typeof value === 'string' && REPRESENTATIONS.has(value);
}

function validateBitWidth(bitWidth: number): NumberCoreResult<number> {
  if (!Number.isInteger(bitWidth) || bitWidth < MIN_BIT_WIDTH || bitWidth > MAX_BIT_WIDTH) {
    return failure(
      'invalid-bit-width',
      `Bit width must be an integer between ${MIN_BIT_WIDTH} and ${MAX_BIT_WIDTH}.`,
      { bitWidth },
    );
  }
  return success(bitWidth);
}

function digitValue(symbol: string): number {
  const codePoint = symbol.toLowerCase().codePointAt(0)!;
  return codePoint >= 97 ? codePoint - 87 : codePoint - 48;
}

function prefixedRadix(text: string): IntegerRadix | null {
  const prefix = text.slice(0, 2).toLowerCase();
  if (prefix === '0b') return 2;
  if (prefix === '0o') return 8;
  if (prefix === '0x') return 16;
  return null;
}

export function parseInteger(input: ParseIntegerInput): NumberCoreResult<ParsedInteger> {
  if (typeof input !== 'object' || input === null || typeof input.text !== 'string') {
    return failure('invalid-input', 'Integer input must contain a text string.');
  }
  if (input.radix !== undefined && !isIntegerRadix(input.radix)) {
    return failure('invalid-radix', 'Radix must be one of 2, 8, 10, or 16.');
  }

  let body = input.text.trim();
  if (!body) return failure('empty-input', 'Integer input cannot be empty.');

  let negative = false;
  if (body[0] === '+' || body[0] === '-') {
    negative = body[0] === '-';
    body = body.slice(1);
  }
  if (!body) return failure('invalid-digit', 'Integer input must contain at least one digit.');

  const prefixRadix = prefixedRadix(body);
  if (prefixRadix !== null) {
    if (input.radix !== undefined && input.radix !== prefixRadix) {
      return failure(
        'prefix-radix-mismatch',
        `Prefix indicates radix ${prefixRadix}, but radix ${input.radix} was requested.`,
      );
    }
    body = body.slice(2);
  }

  const radix = input.radix ?? prefixRadix ?? 10;
  if (!body || !DIGIT_PATTERNS[radix].test(body)) {
    return failure('invalid-digit', `Input contains a digit that is invalid for radix ${radix}.`, {
      radix,
      digits: body,
    });
  }

  const steps: IntegerParseStep[] = [];
  let magnitude = 0n;
  for (const [index, symbol] of [...body].entries()) {
    const value = digitValue(symbol);
    magnitude = magnitude * BigInt(radix) + BigInt(value);
    steps.push({ index, symbol, digitValue: value, accumulator: magnitude });
  }

  const value = negative ? -magnitude : magnitude;
  const sign: ParsedInteger['sign'] = value === 0n ? 0 : negative ? -1 : 1;
  return success({
    value,
    radix,
    sign,
    digits: body.toLowerCase(),
    normalized: value.toString(10),
    steps,
  });
}

export function formatInteger(input: FormatIntegerInput): NumberCoreResult<FormattedInteger> {
  if (typeof input !== 'object' || input === null || typeof input.value !== 'bigint') {
    return failure('invalid-input', 'Integer formatting requires a bigint value.');
  }
  if (!isIntegerRadix(input.radix)) {
    return failure('invalid-radix', 'Radix must be one of 2, 8, 10, or 16.');
  }

  const sign: FormattedInteger['sign'] = input.value < 0n ? '-' : '';
  const magnitude = input.value < 0n ? -input.value : input.value;
  let digits = magnitude.toString(input.radix);
  if (input.uppercase) digits = digits.toUpperCase();
  const prefix = input.prefix ? PREFIXES[input.radix] : '';
  return success({ value: input.value, radix: input.radix, sign, prefix, digits, text: `${sign}${prefix}${digits}` });
}

function representationRange(bitWidth: number, representation: SignedIntegerRepresentation): SignedIntegerRange {
  const highBit = 1n << BigInt(bitWidth - 1);
  const max = highBit - 1n;
  return representation === 'twos-complement' ? { min: -highBit, max } : { min: -max, max };
}

export function encodeSignedInteger(input: EncodeSignedIntegerInput): NumberCoreResult<EncodedSignedInteger> {
  if (typeof input !== 'object' || input === null || typeof input.value !== 'bigint') {
    return failure('invalid-input', 'Signed integer encoding requires a bigint value.');
  }
  if (!isRepresentation(input.representation)) {
    return failure('invalid-representation', 'Unknown signed integer representation.');
  }
  const validWidth = validateBitWidth(input.bitWidth);
  if (!validWidth.ok) return validWidth;

  const range = representationRange(input.bitWidth, input.representation);
  if (input.value < range.min || input.value > range.max) {
    return failure(
      'out-of-range',
      `${input.value} is outside the ${input.bitWidth}-bit ${input.representation} range.`,
      { min: range.min.toString(), max: range.max.toString() },
    );
  }

  const width = BigInt(input.bitWidth);
  const modulus = 1n << width;
  const highBit = 1n << (width - 1n);
  const mask = modulus - 1n;
  let raw: bigint;
  if (input.representation === 'sign-magnitude') {
    raw = input.value < 0n ? highBit | -input.value : input.value;
  } else if (input.representation === 'ones-complement') {
    raw = input.value < 0n ? mask ^ -input.value : input.value;
  } else {
    raw = input.value < 0n ? modulus + input.value : input.value;
  }

  const bits = raw.toString(2).padStart(input.bitWidth, '0');
  return success({
    value: input.value,
    bitWidth: input.bitWidth,
    representation: input.representation,
    bits,
    signBit: bits[0] as '0' | '1',
    payloadBits: bits.slice(1),
    range,
  });
}

export function decodeSignedInteger(input: DecodeSignedIntegerInput): NumberCoreResult<DecodedSignedInteger> {
  if (typeof input !== 'object' || input === null || typeof input.bits !== 'string') {
    return failure('invalid-input', 'Signed integer decoding requires a bit string.');
  }
  if (!isRepresentation(input.representation)) {
    return failure('invalid-representation', 'Unknown signed integer representation.');
  }
  const validWidth = validateBitWidth(input.bitWidth);
  if (!validWidth.ok) return validWidth;
  if (!/^[01]+$/u.test(input.bits)) {
    return failure('invalid-bit-string', 'Bit string may contain only 0 and 1.');
  }
  if (input.bits.length !== input.bitWidth) {
    return failure(
      'bit-width-mismatch',
      `Expected ${input.bitWidth} bits, received ${input.bits.length}.`,
      { expected: input.bitWidth, actual: input.bits.length },
    );
  }

  const width = BigInt(input.bitWidth);
  const modulus = 1n << width;
  const highBit = 1n << (width - 1n);
  const mask = modulus - 1n;
  const raw = BigInt(`0b${input.bits}`);
  const negative = (raw & highBit) !== 0n;
  let value: bigint;
  let negativeZero = false;

  if (input.representation === 'sign-magnitude') {
    const magnitude = raw & (highBit - 1n);
    negativeZero = negative && magnitude === 0n;
    value = negative ? -magnitude : magnitude;
  } else if (input.representation === 'ones-complement') {
    const magnitude = negative ? mask ^ raw : raw;
    negativeZero = negative && magnitude === 0n;
    value = negative ? -magnitude : magnitude;
  } else {
    value = negative ? raw - modulus : raw;
  }

  return success({
    value,
    bitWidth: input.bitWidth,
    representation: input.representation,
    bits: input.bits,
    signBit: input.bits[0] as '0' | '1',
    payloadBits: input.bits.slice(1),
    range: representationRange(input.bitWidth, input.representation),
    negativeZero,
  });
}

function inspectFloat32Word(word: number): Float32Info {
  const bits = (word >>> 0).toString(2).padStart(32, '0');
  const sign = (word >>> 31) as 0 | 1;
  const exponentRaw = (word >>> 23) & 0xff;
  const fractionRaw = word & 0x7fffff;
  let classification: Float32Classification;
  if (exponentRaw === 0 && fractionRaw === 0) {
    classification = sign === 0 ? 'positive-zero' : 'negative-zero';
  } else if (exponentRaw === 0) {
    classification = 'subnormal';
  } else if (exponentRaw === 0xff && fractionRaw === 0) {
    classification = sign === 0 ? 'positive-infinity' : 'negative-infinity';
  } else if (exponentRaw === 0xff) {
    classification = 'nan';
  } else {
    classification = 'normal';
  }

  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, word >>> 0, false);
  return {
    value: view.getFloat32(0, false),
    bits,
    hex: `0x${(word >>> 0).toString(16).padStart(8, '0')}`,
    classification,
    sign,
    signBits: bits.slice(0, 1),
    exponentBits: bits.slice(1, 9),
    fractionBits: bits.slice(9),
    exponentRaw,
    fractionRaw,
    exponentBias: 127,
    unbiasedExponent: exponentRaw === 0xff ? null : exponentRaw === 0 ? -126 : exponentRaw - 127,
  };
}

export function encodeFloat32(input: EncodeFloat32Input): NumberCoreResult<Float32Info> {
  if (typeof input !== 'object' || input === null || typeof input.value !== 'number') {
    return failure('invalid-input', 'Float32 encoding requires a number value.');
  }
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, input.value, false);
  return success(inspectFloat32Word(view.getUint32(0, false)));
}

export function decodeFloat32(input: DecodeFloat32Input): NumberCoreResult<Float32Info> {
  if (typeof input !== 'object' || input === null || typeof input.bits !== 'string') {
    return failure('invalid-input', 'Float32 decoding requires a bit string.');
  }
  if (!/^[01]+$/u.test(input.bits)) {
    return failure('invalid-bit-string', 'Float32 bit string may contain only 0 and 1.');
  }
  if (input.bits.length !== 32) {
    return failure('bit-width-mismatch', `Float32 requires exactly 32 bits, received ${input.bits.length}.`, {
      expected: 32,
      actual: input.bits.length,
    });
  }
  return success(inspectFloat32Word(Number.parseInt(input.bits, 2) >>> 0));
}
