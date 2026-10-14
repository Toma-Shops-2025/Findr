# Android upload keystore backup (plain English)

When you build Findr for Google Play, Android must **sign** the app with a **private key** (the upload keystore). Google uses that signature to know updates are really from you.

## What “backup safe” means

1. **EAS can create the keystore for you** (`eas credentials -p android`, production profile).
2. When Expo/EAS offers to **download a backup** of the keystore (`.jks` or `.keystore` file) and a password — **save copies in at least two safe places** (encrypted USB, password manager vault, cloud drive only you control).
3. **If you lose the keystore**, you may not be able to upload updates to the **same** Play app — Google treats it like a different app. Recovery is painful.

You are **not** uploading the keystore to GitHub. You keep it offline like a house key.

## What you already have

If you built production AABs successfully, EAS likely already stores the key in your Expo account (`tomas_empire`). The backup file is extra insurance if Expo or your account access ever fails.

## Play App Signing

Google Play often uses **Play App Signing** (Google holds the final signing key). You still need your **upload key** for each new `.aab` you upload.

## Checklist

- [ ] Downloaded keystore backup from EAS (if offered)
- [ ] Saved password separately from the file
- [ ] Did **not** commit `.jks` / passwords to git
