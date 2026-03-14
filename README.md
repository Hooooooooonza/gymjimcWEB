# GymJIMC Web – Návod na sestavení a nasazení

## Co je potřeba
- Účet na **GitHub** (zdarma) – https://github.com
- Účet na **Netlify** (zdarma) – https://netlify.com
- Účet na **JSONBin** (zdarma) – https://jsonbin.io

---

## KROK 1 – Vytvoř JSONBin (databáze pro obsah webu)

1. Jdi na **https://jsonbin.io** a registruj se (zdarma).
2. Po přihlášení klikni na **„+ CREATE BIN"**.
3. Do editoru vlož tento JSON a klikni **Create**:
   ```json
   {
     "events": [],
     "texts": {}
   }
   ```
4. Po vytvoření se zobrazí URL jako:
   `https://api.jsonbin.io/v3/b/XXXXXXXXXXXXXXXXXX`
   – zkopíruj si tu část `XXXXXXXXXXXXXXXXXX` – to je tvůj **BIN_ID**.
5. Klikni na svůj avatar vpravo nahoře → **API Keys**.
6. Klikni **+ CREATE ACCESS KEY**, zapiš libovolný název, zkopíruj klíč – to je **JSONBIN_API_KEY**.

---

## KROK 2 – Nahraj web na GitHub

1. Jdi na **https://github.com/new** a vytvoř nový repozitář (např. `gymjimc-web`), nastav na **Private** (doporučeno), klikni **Create repository**.
2. Na svém počítači ve složce `gymjimc-web` spusť terminál a zadej:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TVOJE_JMENO/gymjimc-web.git
git push -u origin main
```
*(Nahraď `TVOJE_JMENO` svým GitHub usernamem.)*

---

## KROK 3 – Nasaď na Netlify

1. Jdi na **https://app.netlify.com** a přihlas se.
2. Klikni **„Add new site" → „Import an existing project"**.
3. Vyber **GitHub** a vyber repozitář `gymjimc-web`.
4. Nastavení buildu:
   - **Build command:** (nechej prázdné)
   - **Publish directory:** `public`
5. Klikni **Deploy site**.

---

## KROK 4 – Nastav tajné proměnné (heslo nikdy v kódu!)

1. V Netlify jdi do svého webu → **Site configuration → Environment variables**.
2. Klikni **„Add a variable"** a přidej tyto 4 proměnné:

| Klíč | Hodnota |
|------|---------|
| `ADMIN_PASSWORD` | Tvoje zvolené heslo do admin panelu (např. `MujTajnyHeslo123`) |
| `TOKEN_SECRET` | Náhodný řetězec 32+ znaků (např. `hJ8kL2mN9pQrStUvWxYz1234567890AB`) |
| `JSONBIN_BIN_ID` | BIN_ID z kroku 1 |
| `JSONBIN_API_KEY` | API klíč z kroku 1 |

> **DŮLEŽITÉ:** Heslo `ADMIN_PASSWORD` je uloženo POUZE na Netlify serveru. Nikdo ho nemůže přečíst z kódu webu.

3. Klikni **„Deploy site"** znovu (nebo pushni prázdný commit), aby se proměnné načetly.

---

## KROK 5 – Hotovo! Otestuj web

1. Na Netlify najdeš URL svého webu (např. `https://gymjimc-web.netlify.app`).
2. Přejdi na **`/admin`** (např. `https://gymjimc-web.netlify.app/admin`).
3. Zadej heslo, které jsi nastavil v `ADMIN_PASSWORD`.
4. Přidej první event nebo uprav texty.

---

## Vlastní doména

Pokud chceš mít web na `gymjimc.org`:
1. V Netlify jdi na **Domain management → Add custom domain**.
2. Zadej `gymjimc.org`.
3. U svého registrátora domény nastav DNS záznamy podle pokynů Netlify.

---

## Struktura projektu

```
gymjimc-web/
├── public/               ← Veřejný web (to co vidí hráči)
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   └── admin/
│       ├── index.html    ← Admin panel
│       ├── admin.css
│       └── admin.js
├── netlify/
│   └── functions/
│       ├── get-content.js    ← Čte obsah (veřejné)
│       ├── admin-login.js    ← Ověřuje heslo (server-side)
│       └── save-content.js   ← Ukládá obsah (chráněno tokenem)
├── netlify.toml
└── README.md
```

---

## Jak funguje bezpečnost hesla

```
Klient (prohlížeč)          Server (Netlify Function)
        │                           │
        │  POST /admin-login        │
        │  { password: "xxx" }  ──► │  Porovná s ADMIN_PASSWORD
        │                           │  (uloženým v env vars)
        │  ◄── { token: "..." }     │
        │                           │
        │  Všechny další požadavky  │
        │  Authorization: Bearer    │
        │  token ───────────────► │  Ověří token podpis
```

Heslo NIKDY neopustí Netlify server. Klient dostane pouze dočasný token platný 8 hodin.

---

## Aktualizace webu

Při každé změně souborů:
```bash
git add .
git commit -m "Popis změny"
git push
```
Netlify se automaticky přenasadí do ~30 sekund.

---

## Podpora

Problémy? Zkontroluj:
- **Netlify → Functions log** pro chyby v backend funkcích
- Že jsou správně nastaveny všechny 4 env proměnné
- Že JSONBin BIN_ID odpovídá existujícímu binu
