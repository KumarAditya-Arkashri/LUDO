import { randomInt } from 'crypto';
import { DiceRandomProvider } from './dice.types';

export class CryptoDiceRandomProvider implements DiceRandomProvider {
  generate(min: number, max: number): number {
    if (min >= max) {
      throw new Error('min must be less than max');
    }
    // crypto.randomInt is min inclusive, max exclusive
    return randomInt(min, max + 1);
  }
}
