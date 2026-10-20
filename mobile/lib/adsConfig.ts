/**
 * AdMob / Ad Manager wiring is OFF until you set EXPO_PUBLIC_ADS_ENABLED=true
 * and add unit IDs. UI slots (FindrAdSlot) stay in place for zero layout churn later.
 */
export const ADS_ENABLED =
  process.env.EXPO_PUBLIC_ADS_ENABLED === 'true';

export const AD_UNIT_IDS = {
  bannerChat:
    process.env.EXPO_PUBLIC_ADMOB_BANNER_CHAT?.trim() ?? '',
  bannerNearby:
    process.env.EXPO_PUBLIC_ADMOB_BANNER_NEARBY?.trim() ?? '',
};

export function adsReadyForSdk(): boolean {
  return ADS_ENABLED && Boolean(AD_UNIT_IDS.bannerChat || AD_UNIT_IDS.bannerNearby);
}
