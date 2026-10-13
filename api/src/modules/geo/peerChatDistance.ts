import {
  formatChatDistanceLabel,
  haversineMeters,
} from './coarseLocation.js';
import { getLocationStore } from './locationStore.js';
import { getProfileStore } from '../profiles/profileStore.js';

/**
 * Distance from viewer to peer for chat header.
 * Hidden when peer turned off "share distance in chat" or either lacks coarse location.
 */
export async function peerChatDistanceLabel(
  viewerUserId: string,
  peerUserId: string,
): Promise<string | null> {
  const profiles = await getProfileStore();
  const peerProfile = await profiles.get(peerUserId);
  if (peerProfile && peerProfile.shareChatDistance === false) {
    return null;
  }

  const { store } = await getLocationStore();
  const [viewerLoc, peerLoc] = await Promise.all([
    store.get(viewerUserId),
    store.get(peerUserId),
  ]);
  if (!viewerLoc || !peerLoc) return null;

  const meters = haversineMeters(
    viewerLoc.latitude,
    viewerLoc.longitude,
    peerLoc.latitude,
    peerLoc.longitude,
  );
  return formatChatDistanceLabel(meters);
}
