/**
 * Браузерный shim для модуля crypto, используемого mathsteps.
 * Реализует только createHash('sha1') с синхронным API.
 */
import SHA1 from 'crypto-js/sha1.js';
import Hex from 'crypto-js/enc-hex.js';

class HashShim {
  private chunks: string[] = [];

  update(data: string): this {
    this.chunks.push(data);
    return this;
  }

  digest(encoding: 'hex'): string {
    if (encoding !== 'hex') {
      throw new Error('Поддерживается только hex');
    }
    const content = this.chunks.join('');
    return SHA1(content).toString(Hex);
  }
}

export function createHash(algorithm: string): HashShim {
  if (algorithm !== 'sha1') {
    throw new Error('Поддерживается только sha1');
  }
  return new HashShim();
}
