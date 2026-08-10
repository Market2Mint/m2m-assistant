import { describe, expect, it } from 'vitest';
import {
  MAX_QUANTITY_PER_LINE,
  MIN_QUANTITY_PER_LINE,
  appendKeypadDigit,
  keypadBackspacePressed,
  keypadDigitPressed,
  keypadQuantity,
  openKeypadState,
  stepQuantity,
  trimKeypadDigit,
} from './quantity';

describe('keypad entry', () => {
  it('builds multi-digit quantities digit by digit', () => {
    let s = '';
    s = appendKeypadDigit(s, '3');
    s = appendKeypadDigit(s, '0');
    expect(s).toBe('30');
    expect(keypadQuantity(s)).toBe(30);
  });

  it('refuses a digit that would exceed the cap, instead of clamping it', () => {
    // 350-instead-of-35 is the typo the cap exists for. The customer sees their "5"
    // press do nothing rather than a silently different number.
    expect(appendKeypadDigit('99', '9')).toBe('99');
    expect(appendKeypadDigit('9', '9')).toBe('99');
    expect(MAX_QUANTITY_PER_LINE).toBe(99);
  });

  it('a leading zero is replaced, not shown as an impossible quantity', () => {
    expect(appendKeypadDigit('0', '7')).toBe('7');
    expect(appendKeypadDigit('', '0')).toBe('0');
    expect(keypadQuantity('0')).toBeNull();
  });

  it('Done is disabled (null) until the entry is a real quantity', () => {
    expect(keypadQuantity('')).toBeNull();
    expect(keypadQuantity('0')).toBeNull();
    expect(keypadQuantity('1')).toBe(1);
    expect(keypadQuantity('99')).toBe(99);
    expect(keypadQuantity('100')).toBeNull();
  });

  it('backspace trims one digit', () => {
    expect(trimKeypadDigit('42')).toBe('4');
    expect(trimKeypadDigit('4')).toBe('');
    expect(trimKeypadDigit('')).toBe('');
  });

  it('rejects non-digit input outright', () => {
    expect(appendKeypadDigit('4', 'x')).toBe('4');
    expect(keypadQuantity('4x')).toBeNull();
  });
});

describe('the calculator convention', () => {
  it('opens showing the current count, and Done without typing commits it unchanged', () => {
    const s = openKeypadState(3);
    expect(s.entry).toBe('3');
    expect(keypadQuantity(s.entry)).toBe(3);
  });

  it('the first digit REPLACES the seed — tapping 2 over a pre-filled 3 is 2, not 32', () => {
    const s = keypadDigitPressed(openKeypadState(3), '2');
    expect(s.entry).toBe('2');
    expect(s.pristine).toBe(false);
  });

  it('digits after the first append normally', () => {
    let s = keypadDigitPressed(openKeypadState(3), '2');
    s = keypadDigitPressed(s, '5');
    expect(s.entry).toBe('25');
  });

  it('backspace on the pristine seed clears it outright', () => {
    const s = keypadBackspacePressed(openKeypadState(30));
    expect(s.entry).toBe('');
    expect(keypadQuantity(s.entry)).toBeNull();
  });

  it('backspace after typing trims one digit only', () => {
    let s = keypadDigitPressed(openKeypadState(1), '4');
    s = keypadDigitPressed(s, '2');
    s = keypadBackspacePressed(s);
    expect(s.entry).toBe('4');
  });
});

describe('stepper', () => {
  it('one press, one card, inside the bounds', () => {
    expect(stepQuantity(1, 1)).toBe(2);
    expect(stepQuantity(2, -1)).toBe(1);
    // Zero cards is "remove the line", which is the bin's job, not the stepper's.
    expect(stepQuantity(MIN_QUANTITY_PER_LINE, -1)).toBe(MIN_QUANTITY_PER_LINE);
    expect(stepQuantity(MAX_QUANTITY_PER_LINE, 1)).toBe(MAX_QUANTITY_PER_LINE);
  });
});
