import { describe, it, expect } from 'vitest';
import { hashBytes, hashString, verifyHash } from '../hash';

describe('hash utilities', () => {
  describe('hashString', () => {
    it('should hash empty string to known SHA-256 test vector', () => {
      const result = hashString('');
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should hash "abc" to known SHA-256 test vector', () => {
      const result = hashString('abc');
      expect(result).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });

    it('should produce consistent hashes', () => {
      const input = 'consistent test data';
      const hash1 = hashString(input);
      const hash2 = hashString(input);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashString('input1');
      const hash2 = hashString('input2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashBytes', () => {
    it('should hash empty bytes to known SHA-256 test vector', () => {
      const emptyBytes = new Uint8Array(0);
      const result = hashBytes(emptyBytes);
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should hash "abc" bytes to known SHA-256 test vector', () => {
      const abcBytes = new TextEncoder().encode('abc');
      const result = hashBytes(abcBytes);
      expect(result).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });

    it('should produce consistent hashes for same input', () => {
      const data = new TextEncoder().encode('test data');
      const hash1 = hashBytes(data);
      const hash2 = hashBytes(data);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashBytes(new TextEncoder().encode('input1'));
      const hash2 = hashBytes(new TextEncoder().encode('input2'));
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyHash', () => {
    it('should verify correct hash', () => {
      const data = new TextEncoder().encode('test data');
      const hash = hashBytes(data);
      const isValid = verifyHash(data, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect hash', () => {
      const data = new TextEncoder().encode('test data');
      const incorrectHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const isValid = verifyHash(data, incorrectHash);
      expect(isValid).toBe(false);
    });

    it('should verify empty data against empty hash', () => {
      const emptyBytes = new Uint8Array(0);
      const expectedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const isValid = verifyHash(emptyBytes, expectedHash);
      expect(isValid).toBe(true);
    });

    it('should verify "abc" data against known test vector', () => {
      const abcBytes = new TextEncoder().encode('abc');
      const expectedHash = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
      const isValid = verifyHash(abcBytes, expectedHash);
      expect(isValid).toBe(true);
    });

    it('should be case-sensitive for hex hashes', () => {
      const data = new TextEncoder().encode('abc');
      const expectedHash = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
      const uppercaseHash = expectedHash.toUpperCase();
      // Node.js crypto produces lowercase hex, so uppercase should not match
      const isValid = verifyHash(data, uppercaseHash);
      expect(isValid).toBe(false);
    });
  });
});
