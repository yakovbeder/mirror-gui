const MIRROR_API_VERSION_PATTERN = /^mirror\.openshift\.io\/v\d+/;

export function isValidMirrorApiVersion(apiVersion: unknown): boolean {
  return typeof apiVersion === 'string' && MIRROR_API_VERSION_PATTERN.test(apiVersion);
}
