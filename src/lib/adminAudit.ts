import { apiPost } from '@/lib/api-client';

export async function logAdminAction(params: {
  readonly adminAddress: string;
  readonly action: string;
  readonly targetAddress?: string;
  readonly txHash?: string;
  readonly metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const isFounderAction = params.action === 'register_founder' || params.action === 'mark_sprint';
  const endpoint = isFounderAction ? '/admin/whitelist' : '/admin/tge';

  const body = isFounderAction
    ? { action: params.action, targetAddress: params.targetAddress, txHash: params.txHash, metadata: params.metadata }
    : { action: params.action, txHash: params.txHash, metadata: params.metadata };

  try {
    await apiPost(endpoint, body);
    return true;
  } catch {
    return false;
  }
}
