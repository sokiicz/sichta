# Návod: Supabase krok za krokem

Tohle je jediná část stavby, kterou za tebe udělat nemůžu, protože chce tvůj
účet. Zabere to zhruba deset minut. Všechno ostatní je připravené.

Až budeš hotový, napiš mi a napojím na to aplikaci.

---

## 1. Založit projekt

1. Jdi na **https://supabase.com** a přihlas se (GitHub účet stačí).
2. **New project**.
3. Vyplň:
   - **Name:** `sichta`
   - **Database Password:** nech vygenerovat a **hned si ho ulož**, ukáže se
     jen jednou. Patří do `D:\ai\Apps\Secrets\sichta.txt`.
   - **Region:** `Central EU (Frankfurt)`. Hrajete v Česku, každý milisekundový
     skok navíc je vidět na odpočtu.
   - **Plan:** Free.
4. **Create new project** a počkej asi dvě minuty, než se rozjede.

> Free tier na tohle bohatě stačí. Deset telefonů na jeden večer je proti
> jeho limitům nic.

---

## 2. Spustit SQL

V levém menu **SQL Editor**, pak **New query**.

**Nejdřív první soubor:**

1. Otevři `D:\ai\Apps\sichta\supabase\01-schema.sql`
2. Zkopíruj celý obsah do editoru
3. **Run**
4. Čekej hlášku `Success. No rows returned`

**Potom druhý, ve stejném okně:**

1. Otevři `D:\ai\Apps\sichta\supabase\02-functions.sql`
2. Smaž obsah editoru, vlož tenhle soubor
3. **Run**
4. Zase `Success`

Pořadí je důležité, druhý soubor staví na tabulkách z prvního.

---

## 3. Ověřit, že je zamčeno

Tohle nepřeskakuj. Je to jediná kontrola toho, že si nikdo nepřečte, kdo je
sabotér, prostým otevřením konzole v prohlížeči.

V **SQL Editoru** spusť:

```sql
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
   and tablename in ('rooms', 'players', 'roles', 'actions');
```

**U všech čtyř řádků musí být `rowsecurity = true.`** Když ne, něco se
nepovedlo, napiš mi to a projdeme to.

---

## 4. Získat klíče

V levém menu **Project Settings** (ozubené kolo) a pak **API**.

Potřebuješ dvě hodnoty:

| Kde to je | Jak se to jmenuje v kódu |
|---|---|
| **Project URL** | `VITE_SUPABASE_URL` |
| **Project API keys** → `anon` `public` | `VITE_SUPABASE_ANON_KEY` |

> `anon` klíč je určený k tomu, aby byl v prohlížeči, na tom není nic
> špatného. Ochranu dělá RLS z kroku 3, ne utajení klíče.
>
> Klíč **`service_role` nikam nekopíruj.** Ten obchází všechno a do aplikace
> nepatří.

---

## 5. Uložit klíče

**Do `D:\ai\Apps\Secrets\sichta.txt`** (mimo repo, nikdy se necommitne):

```
SUPABASE_URL
https://neco.supabase.co

SUPABASE_ANON_KEY
eyJ...

SUPABASE_DB_PASSWORD
...
```

**A do `D:\ai\Apps\sichta\.env.local`**, odkud to načte Vite:

```
VITE_SUPABASE_URL=https://neco.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`.env.local` je v `.gitignore`, do repa se nedostane.

---

## 6. Dát mi vědět

Napiš mi **„Supabase hotovo"**. Klíče mi neposílej a nikam je nevypisuj,
přečtu si je sám z `.env.local` přes runner, který stdout rediguje.

Pak napojím klienta a zkusíme první online partii.

---

## Kdyby něco nešlo

**`permission denied for table`** při spuštění SQL
: Spouštíš to v SQL Editoru pod svým účtem, kde na to právo máš. Zkontroluj,
  že jsi ve správném projektu.

**`relation "rooms" does not exist`** u druhého souboru
: Neproběhl první. Vrať se ke kroku 2.

**`rowsecurity = false`**
: Spusť ručně:
  `alter table rooms enable row level security;` a totéž pro
  `players`, `roles`, `actions`.

**Projekt je po pár dnech „paused"**
: Free tier uspí projekt po týdnu nečinnosti. Probudí se tlačítkem
  v dashboardu, data zůstávají.
