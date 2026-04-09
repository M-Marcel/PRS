/**
 * Log an admin action to the database for audit trail.
 * Called after an on-chain TX confirms.
 *
 * This is non-fatal — if the POST fails, we show a warning but don't block.
 * The on-chain action already happened; the audit log is supplementary.
 */
export async function logAdminAction(params: {
  readonly adminAddress: string;
  readonly action: string;
  readonly targetAddress?: string;
  readonly txHash?: string;
  readonly metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const isFounderAction = params.action === 'register_founder' || params.action === 'mark_sprint';
  const endpoint = isFounderAction ? '/api/admin/whitelist' : '/api/admin/tge';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn('Failed to log admin action:', data);
      return false;
    }

    return true;
  } catch {
    console.warn('Failed to log admin action: network error');
    return false;
  }
}
