import path from 'path';
import type { Request } from 'express';
import { getQueryStringValue } from './utils.js';

const MIRROR_API_VERSION_PATTERN = /^mirror\.openshift\.io\/v\d+/;

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REGISTRY_HOSTNAME_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export type PathResolutionResult =
  | { ok: true; filepath: string; basename: string }
  | { ok: false; error: string };

export function isValidMirrorApiVersion(apiVersion: unknown): boolean {
  return typeof apiVersion === 'string' && MIRROR_API_VERSION_PATTERN.test(apiVersion);
}

export function isValidOperationId(id: string): boolean {
  return UUID_V4_PATTERN.test(id);
}

export function getSafeQueryParam(req: Request, name: string): string | undefined {
  return getQueryStringValue(req.query[name]);
}

export function resolvePathWithinDir(
  baseDir: string,
  userSegment: string,
  options?: { extensionPattern?: RegExp },
): PathResolutionResult {
  if (!userSegment || typeof userSegment !== 'string') {
    return { ok: false, error: 'Invalid filename' };
  }

  if (userSegment.includes('..') || userSegment.includes('/') || userSegment.includes('\\')) {
    return { ok: false, error: 'Invalid filename' };
  }

  const basename = path.basename(userSegment);
  if (!basename) {
    return { ok: false, error: 'Invalid filename' };
  }

  if (options?.extensionPattern && !options.extensionPattern.test(basename)) {
    return { ok: false, error: 'Invalid filename' };
  }

  const baseResolved = path.resolve(baseDir);
  const filepath = path.resolve(baseResolved, basename);

  if (filepath !== baseResolved && !filepath.startsWith(baseResolved + path.sep)) {
    return { ok: false, error: 'Invalid filename' };
  }

  return { ok: true, filepath, basename };
}

function parseIpv4Octets(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }
    const value = Number(part);
    if (value < 0 || value > 255) {
      return null;
    }
    octets.push(value);
  }

  return octets;
}

function isBlockedIpv4(host: string): boolean {
  const octets = parseIpv4Octets(host);
  if (!octets) {
    return false;
  }

  const [a, b] = octets;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;

  return false;
}

function isBlockedHostname(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) {
    return true;
  }
  if (lower === 'metadata.google.internal') {
    return true;
  }
  return isBlockedIpv4(host);
}

export function isValidRegistryHostname(registry: unknown): registry is string {
  if (typeof registry !== 'string') {
    return false;
  }

  const host = registry.trim();
  if (!host || host.length > 253) {
    return false;
  }

  if (
    host.includes('://') ||
    host.includes('/') ||
    host.includes('?') ||
    host.includes('#') ||
    host.includes('@') ||
    host.includes(':')
  ) {
    return false;
  }

  if (!REGISTRY_HOSTNAME_PATTERN.test(host)) {
    return false;
  }

  return !isBlockedHostname(host);
}

export function resolveOperationJsonPath(
  baseDir: string,
  operationId: string,
): PathResolutionResult {
  if (!isValidOperationId(operationId)) {
    return { ok: false, error: 'Invalid operation id' };
  }

  return resolvePathWithinDir(baseDir, `${operationId}.json`);
}

export function resolveOperationLogPath(
  baseDir: string,
  operationId: string,
): PathResolutionResult {
  if (!isValidOperationId(operationId)) {
    return { ok: false, error: 'Invalid operation id' };
  }

  return resolvePathWithinDir(baseDir, `${operationId}.log`);
}

export function isSafeOutboundUrl(urlString: string, allowedHost: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const normalizedAllowed = allowedHost.toLowerCase();
  const normalizedHost = parsed.hostname.toLowerCase();

  if (normalizedHost !== normalizedAllowed) {
    return false;
  }

  return isValidRegistryHostname(normalizedHost);
}
