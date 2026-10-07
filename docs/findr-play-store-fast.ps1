# Findr — fastest path to Google Play (run sections in order)
$ErrorActionPreference = "Stop"

if (-not (Test-Path "C:\Findr\.git")) {
  Write-Host "ERROR: Clone first: git clone https://github.com/Toma-Shops-2025/Findr.git C:\Findr"
  exit 1
}

Write-Host @"

=== FASTEST PATH (no 24-day wait) ===
1) Subscribe EAS Starter (unblocks cloud builds):
     eas billing:subscribe starter --account tomas_empire

2) From C:\Findr\mobile:
     eas credentials -p android
     eas build -p android --profile production

3) Upload the .aab in Google Play Console (Internal testing first).

4) Backend: migration 008 + Render deploy findr-api (see findr-hello-notes.md).

Test without EAS quota: cd C:\Findr\mobile && npx expo start  (Expo Go)

Full notes: C:\Findr\docs\findr-play-store-fast.md
"@
