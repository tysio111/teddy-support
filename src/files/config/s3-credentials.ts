/**
 * Static keys when both are configured, otherwise undefined so the AWS SDK
 * falls back to its default credential chain (e.g. an EC2 instance role).
 */
export function s3Credentials(
  accessKeyId?: string,
  secretAccessKey?: string,
): { accessKeyId: string; secretAccessKey: string } | undefined {
  return accessKeyId && secretAccessKey
    ? { accessKeyId, secretAccessKey }
    : undefined;
}
