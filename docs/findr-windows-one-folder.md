# Findr on Windows — one folder, not five

You ended up with several folders because we tried different workflows over time (git clone issues, EAS on `C:\F\mobile`, backups, old Desktop copy). **Only one folder should be “live” for Findr.**

## What each folder usually was

| Path | What it was | Keep? |
|------|-------------|--------|
| **`C:\Findr`** | Official **git clone** from GitHub (`Toma-Shops-2025/Findr`) | **Yes — this is the source of truth** |
| **`C:\F`** | Short path for **EAS / mobile** builds when clone was broken | **No** — delete after you confirm `C:\Findr\mobile` builds |
| **`C:\Findr-git`** | Second clone attempt or old remote | **No** — if `C:\Findr` has `.git`, archive or delete |
| **`C:\Findr-backup`** | Manual zip/copy before a risky change | **Optional** — move to external drive, then delete from `C:\` |
| **Desktop `Findr`** | Old copy before you moved to `C:\Findr` | **No** — easy to edit the wrong files |

Your **Desktop** also has many other app folders (TAV, PlayNPayday, etc.) — that is normal if you juggle multiple projects; only **Findr** needs the cleanup above.

## The setup to use from now on

1. **Code & git:** `C:\Findr` only  
   ```powershell
   cd C:\Findr
   git pull origin main
   Test-Path .git   # must be True
   ```

2. **Play Store AAB:** GitHub Actions (see `docs/findr-build-free-windows.md`) — build from **`main`**, not a random folder.

3. **Optional local Expo:**  
   ```powershell
   cd C:\Findr\mobile
   npm install
   npx expo start
   ```

4. **Do not** run `eas build` from a non-git copy or from `C:\F` unless it is a **junction** to `C:\Findr\mobile`:
   ```powershell
   # Only if you want a short path:
   mklink /J C:\F\mobile C:\Findr\mobile
   ```

## Safe cleanup steps (when you have time)

1. Confirm `C:\Findr` works: `git status`, `git log -1`.  
2. Zip `C:\Findr-backup` and `Desktop\Findr` to **OneDrive / external disk** if you want nostalgia.  
3. Delete `C:\Findr-git`, `C:\F` (if not junction), Desktop `Findr`, and `C:\Findr-backup` after the zip.  
4. Pin **`C:\Findr`** in File Explorer sidebar.

Nothing on Render or Play Console cares about local folder names — only **GitHub `main`** and the **AAB you upload** matter.
