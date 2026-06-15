import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import {
  isValidMirrorApiVersion,
  isValidRegistryHostname,
  isValidOperationId,
  resolvePathWithinDir,
  isSafeOutboundUrl,
} from '../../server/security.js';

describe('security helpers', () => {
  describe('resolvePathWithinDir', () => {
    const baseDir = path.join(os.tmpdir(), 'security-test-configs');

    it('accepts a simple yaml filename', () => {
      const result = resolvePathWithinDir(baseDir, 'foo.yaml', {
        extensionPattern: /\.(ya?ml)$/i,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.basename).toBe('foo.yaml');
        expect(result.filepath).toBe(path.resolve(baseDir, 'foo.yaml'));
      }
    });

    it('rejects path traversal', () => {
      const result = resolvePathWithinDir(baseDir, '../etc/passwd');
      expect(result.ok).toBe(false);
    });
  });

  describe('isValidMirrorApiVersion', () => {
    it('accepts mirror.openshift.io api versions', () => {
      expect(isValidMirrorApiVersion('mirror.openshift.io/v2alpha1')).toBe(true);
    });

    it('rejects spoofed api versions', () => {
      expect(isValidMirrorApiVersion('evil/mirror.openshift.io/v2alpha1')).toBe(false);
      expect(isValidMirrorApiVersion('v1')).toBe(false);
    });
  });

  describe('isValidRegistryHostname', () => {
    it('accepts registry hostnames', () => {
      expect(isValidRegistryHostname('registry.example.com')).toBe(true);
    });

    it('rejects private and malformed hosts', () => {
      expect(isValidRegistryHostname('169.254.169.254')).toBe(false);
      expect(isValidRegistryHostname('localhost')).toBe(false);
      expect(isValidRegistryHostname('evil.com/path')).toBe(false);
      expect(isValidRegistryHostname('https://registry.example.com')).toBe(false);
    });
  });

  describe('isValidOperationId', () => {
    it('accepts uuid v4 values', () => {
      expect(isValidOperationId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('rejects non-uuid values', () => {
      expect(isValidOperationId('../../etc/passwd')).toBe(false);
      expect(isValidOperationId('not-a-uuid')).toBe(false);
    });
  });

  describe('isSafeOutboundUrl', () => {
    it('accepts https urls for the allowed host', () => {
      expect(
        isSafeOutboundUrl('https://registry.example.com/service/token', 'registry.example.com'),
      ).toBe(true);
    });

    it('rejects urls for other hosts', () => {
      expect(isSafeOutboundUrl('https://evil.example.com/token', 'registry.example.com')).toBe(false);
    });
  });
});
