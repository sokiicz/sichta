# Návod: Cloudflare krok za krokem

Backend Šichty běží na Durable Objects. Jedna instance na jednu místnost.

Tohle je jediná část, kterou za tebe udělat nemůžu, protože chce tvůj účet.
Zabere to zhruba deset minut. Kód je připravený.

---

## Proč Durable Objects a ne databáze

Herní pravidla žijí v `src/game/` jako čistý TypeScript. Durable Object ten
**stejný reducer spouští na serveru** bez jediné změny. Kdybychom šli přes SQL,
museli bychom pravidla napsat podruhé a od té chvíle udržovat dvě pravdy, které
se časem rozejdou.

Navíc DO drží stav autoritativně a sám posouvá fáze přes `alarm()`, takže se
deset telefonů nemůže rozejít v tom, kolikátá je šichta.

Na **Workers Free** plánu jsou SQLite-backed Durable Objects dostupné a
**storage se neúčtuje**.

---

## 0. Node 22 je vyřešený

Wrangler chce Node 22+, systémový je 20.15.1. Sáhnout na něj by znamenalo
riskovat ostatní projekty ve workspace, takže v `D:/ai/tools/node22` leží
**přenosný Node 22.23.2**, který ten systémový nechává být.

Používá se přes `cf.cmd` v kořeni projektu, který si PATH nastaví sám.
Nemusíš kvůli tomu nic dělat ani na to myslet, jen pouštěj `npm run cf:*`
místo `npx wrangler`.

---

## 1. Účet a přihlášení

1. Založ si účet na **https://dash.cloudflare.com** (zdarma, stačí e-mail).
2. V terminálu v `D:\ai\Apps\sichta`:

```bash
npm run cf:login
```

Otevře se prohlížeč, potvrdíš přístup. Token si `wrangler` uloží sám,
do repa se nedostane.

---

## 2. Nasadit

```bash
npm run cf:deploy
```

Napoprvé se zeptá, jestli má vytvořit workera. Potvrď.

Až doběhne, vypíše adresu ve tvaru
`https://sichta.<tvuj-ucet>.workers.dev`. **Tu si ulož**, patří do
`D:\ai\Apps\Secrets\sichta.txt` a do `.env.local`.

> Migrace `new_sqlite_classes` z `wrangler.toml` proběhne automaticky při
> prvním nasazení. Ručně nic zakládat nemusíš.

---

## 3. Ověřit, že to žije

```bash
curl -X POST https://sichta.<tvuj-ucet>.workers.dev/api/mistnost
```

Musí vrátit něco jako `{"kod":"K7M2QX"}`. Když ano, backend běží.

---

## 4. Uložit adresu

**Do `D:\ai\Apps\Secrets\sichta.txt`:**

```
CLOUDFLARE_WORKER_URL
https://sichta.neco.workers.dev
```

**A do `D:\ai\Apps\sichta\.env.local`:**

```
VITE_WORKER_URL=https://sichta.neco.workers.dev
```

`.env.local` je v `.gitignore`.

> Tahle adresa není tajemství, je to veřejný endpoint. Do Secrets ji dávám
> jen proto, aby byla na jednom místě s ostatními údaji projektu.

---

## 5. Místní vývoj

Backend si můžeš pustit lokálně, bez nasazování:

```bash
npm run cf:dev
```

Běží na `http://localhost:8787` a má vlastní lokální storage.

---

## 6. Dát mi vědět

Napiš **„Cloudflare hotovo"** a napojím klienta na WebSocket.

---

## Kdyby něco nešlo

**`You need to register a workers.dev subdomain`**
: V dashboardu jdi do **Workers & Pages** a založ si subdoménu. Je to
  jednorázové.

**`Durable Objects are not available on your plan`**
: Zkontroluj, že `wrangler.toml` má `new_sqlite_classes`, ne
  `new_classes`. Na free plánu jdou jen SQLite-backed.

**`wrangler login` se zasekne**
: Použij `.\cf.cmd login --browser=false` a vlož odkaz do prohlížeče ručně.

**`Wrangler requires at least Node.js v22`**
: Pouštíš `npx wrangler` místo `npm run cf:*`. Ten obal existuje právě proto,
  aby použil přenosný Node z `D:i	ools
ode22`.

**Worker běží, ale WebSocket se nepřipojí**
: Zkontroluj, že voláš `wss://`, ne `ws://`. Cloudflare nepustí nešifrované.

---

## Co to bude stát

Nic. Workers Free dává 100 000 požadavků denně a u SQLite-backed Durable
Objects se na free plánu neúčtuje storage. Jeden herní večer je proti tomu
zanedbatelný.

---

## Alternativa, kdyby ses rozmyslel

V `supabase/` leží hotové schéma a RPC funkce pro Postgres. Je to slepá větev,
ale funkční: kdyby Cloudflare z nějakého důvodu nevyhovoval, dá se to spustit
podle [navod-supabase.md](navod-supabase.md). Počítej ale s tím, že tam se
pravidla duplikují do SQL a musí se udržovat dvakrát.
