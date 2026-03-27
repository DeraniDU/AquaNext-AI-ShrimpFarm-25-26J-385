# Allow mobile phone to reach Feeding app (Windows Firewall)

Your phone and PC are on the same Wi‑Fi, but Windows Firewall is blocking incoming connections on ports **8002** (backend) and **5174** (frontend). Do this **once** on your PC.

---

## Option A – PowerShell (run as Administrator)

1. **Right‑click** the Start button → **Terminal (Admin)** or **Windows PowerShell (Admin)**.
2. Copy‑paste and run **one at a time**:

**Allow Feeding backend (8002):**
```powershell
New-NetFirewallRule -DisplayName "Feeding Backend 8002" -Direction Inbound -LocalPort 8002 -Protocol TCP -Action Allow -Profile Private
```

**Allow Feeding frontend (5174):**
```powershell
New-NetFirewallRule -DisplayName "Feeding Frontend 5174" -Direction Inbound -LocalPort 5174 -Protocol TCP -Action Allow -Profile Private
```

3. Close the admin terminal.

---

## Option B – Windows Defender Firewall GUI

1. Press **Win + R**, type `wf.msc`, press Enter.
2. Click **Inbound Rules** (left).
3. Click **New Rule...** (right).
4. **Rule Type:** Port → Next.
5. **TCP**, **Specific local ports:** `8002` → Next.
6. **Allow the connection** → Next.
7. Check **Private** only (uncheck Domain, Public) → Next.
8. Name: `Feeding Backend 8002` → Finish.
9. Repeat steps 3–8 for port **5174** and name `Feeding Frontend 5174`.

---

## After adding the rules

1. **Restart** the Feeding backend so it binds again:
   ```powershell
   cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\feeding-system
   .\venv\Scripts\activate
   uvicorn app.main:app --host 0.0.0.0 --port 8002
   ```
2. On your **phone** (same Wi‑Fi), open in the browser:
   - `http://192.168.1.3:8002/batch` → should show JSON.
   - `http://192.168.1.3:5174` → should show the Feeding app and load data.

If `192.168.1.3` is not your PC’s IP, run `ipconfig` in PowerShell and use the **IPv4 Address** of your Wi‑Fi adapter.
