'use client';

import { useEffect } from 'react';
import { markPostsReadAction } from '../../../lib/building-post-actions';

// Fires once when a tenant views the announcements tab, recording that they
// opened each visible notice, so staff can see delivery/open rates.
export default function MarkPostsRead({ postIds }: { postIds: string[] }) {
  useEffect(() => {
    if (postIds.length === 0) return;
    markPostsReadAction(postIds).catch((error) => console.error('Failed to mark posts read:', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postIds.join(',')]);

  return null;
}
