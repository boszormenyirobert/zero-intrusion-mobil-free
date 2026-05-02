# Refactoring roadmap

Ez a terv **kicsi, alacsony kockázatú változtatásokkal indul**, és csak utána halad a nagyobb szerkezeti refaktorok felé.

## 0. szabályok a refaktor során
Refactoralhatod a szabalyokk szerint:
- TDD szerint kell haladni: `red -> green -> refactor`
- Minden lépés után fusson a `npm run test:ci`.
- Egyszerre csak egy logikai témát módosítsunk.
- Külső viselkedés, API-formátum és storage-sémák ne változzanak meg külön migrációs terv nélkül.
- Először a zajt csökkentjük, utána javítjuk a típusosságot, végül jönnek a nagyobb szerkezeti átalakítások.
- A publikus API input/output shape nem változhat
- Kis lépésekben kell refaktorálni
- Minden kis lépés után célzott teszteket kell futtatni
- Minden lezárt refaktor lépés után teljes regressziós tesztfuttatás kell
- A rendszernek minden pillanatban futtathatónak kell maradnia
- Update the file refactoring.md es torold a feladatbol ami kesz van

- Utana automatikusan vedd a kovetkezo feladatot a szabalyok szerint,
ha nem tudsz tovabb menni, akkor allj meg
- ne irj history-t, mindig a tesztek eredmenyeket ird csak ki, es mi a kovetkezo feladat/file
---

## 1. Fázis — nagyon kicsi, gyors, biztonságos javítások

### 1.1 Lint setup stabilizálása
- Javítani a Jest globálok kezelését a lintben:
	- `jest.setup.js`
	- tesztfájlok globális környezete
- Kivenni a generált fájlokat a lintből:
	- `coverage/`
	- egyéb build/generált outputok
- Cél: a `npm run lint` legyen zöld.

### 1.2 Tesztfájl warningok eltakarítása
- Duplikált tesztcímek megszüntetése.
- Felesleges importok törlése.
- Mock komponensek és hook-használat lintbarát átírása.
- Árnyékolt változónevek (`React`, `Text`) egyszerűsítése a tesztekben.

### 1.3 Debug logok minimalizálása
- Eltávolítani vagy maszkolni az érzékeny adatokat kiíró logokat.
- Prioritás:
	1. auth / device secret logok
	2. HTTP request/response body logok
	3. fejlesztői UI debug logok
- Bevezetni egy egyszerű szabályt: production-flow-ban ne logoljunk secretet, tokent, privát azonosítót.

### 1.4 Apró név- és stílusjavítások
- Félrevezető vagy vegyes elnevezések javítása.
- Elgépelések javítása kommentekben és függvénynevekben.
- Konzisztens string quote és formázási stílus megtartása a meglévő kódbázissal összhangban.

---

## 2. Fázis — kis kockázatú viselkedésmegőrző kódjavítások

### 2.1 Visszatérési értékek rendbetétele
- Egységesíteni a service függvények visszatérési szerződéseit.
- Kiemelt feladat:
	- `src/services/HTTP/PasswordManager/Shared/Registration.tsx`
	- minden sikeres ág adjon vissza explicit `true`-t vagy strukturált eredményt
	- minden hibás ág adjon vissza explicit `false`-t

### 2.2 Korai kilépések és guard clause-ok tisztítása
- Felesleges egymásba ágyazás csökkentése.
- `if` blokkok egyszerűsítése ott, ahol már van korai `return` lehetőség.
- Cél: kisebb kognitív terhelés ugyanazzal a működéssel.

### 2.3 Hibakezelés konzisztenssé tétele
- Egységes error-kezelési minta kialakítása:
	- logolás vagy nem logolás szabályozása
	- `false`/`null`/`undefined` használat következetessé tétele
- Külön figyelem:
	- `Firebase.tsx`
	- `HandleQRScan.tsx`
	- HTTP service-ek

---

## 3. Fázis — típusosság erősítése kis lépésekben

### 3.1 `any` típusok kivezetése
- Prioritási sorrend:
	1. publikus service interfészek
	2. komponens propok
	3. belső helper változók
- Kiemelt helyek:
	- `App.tsx`
	- `src/component/AutoQRScanner/AutoQRScanner.tsx`
	- `src/services/HTTP/registerUser.ts`
	- `src/services/HTTP/SystemHub/SystemHub.tsx`
	- `src/services/StrongBiometricService.ts`

### 3.2 HTTP payload és response típusok pontosítása
- Request body típusok külön definiálása.
- Response parsinghez célzott interfészek bevezetése.
- `unknown` + type guard használata ott, ahol külső adat jön.

### 3.3 QR route typing javítása
- A QR route-kezelést típusosabbá tenni.
- `handleRoute` kulcsok és input payloadok kapcsolatának szűkítése.
- `toCamelCase()` által használt route mapping biztonságosabbá tétele.

---

## 4. Fázis — közepes méretű belső tisztítások

### 4.1 Logging centralizálása
- Minden közvetlen `console.log` / `console.error` helyett közös logger használata.
- Logger tudjon:
	- debug módot kezelni
	- érzékeny mezőket maszkolni
	- productionben csendesebb lenni

### 4.2 Firebase flow tisztítása
- `user-credential-decryption` ág felülvizsgálata.
- A jelenlegi félkész/dead flow kivezetése vagy befejezése.
- A `JSON.parse(qrData)` hibabiztosabbá tétele.
- Pending QR állapotkezelés szétválasztása a notification-kezeléstől.

### 4.3 Auth és biometric állapotkezelés egyszerűsítése
- `App.tsx` auth logikájának tisztítása.
- `availableAuthMethods`, `selectedAuthMethod`, `isLoading` állapotok kapcsolatának egyszerűsítése.
- Ismétlődő alert- és retry-logika kiszervezése helperbe.

### 4.4 Main screen inicializáció tisztítása
- `Main.tsx` indítási folyamata legyen jobban tagolt:
	- push token init
	- device registration init
	- user validity check
- A jelenlegi egybefüggő `useEffect` kisebb helper függvényekre bontása.

---

## 5. Fázis — komponensszintű refaktorok

### 5.1 `UserRegistration` feldarabolása
- A komponens jelenleg több felelősséget kezel:
	- aktív profil betöltés
	- új profil draft létrehozás
	- URL-lépés kezelése
	- user submit flow
- Kisebb egységekre bontási javaslat:
	- form state helper
	- profile bootstrap helper
	- submit service/helper
	- URL step UI és details step UI külön komponensbe

### 5.2 `Entry` nézetlogika egyszerűsítése
- A `view === '...'` alapú elágazások kivonása külön render/helper logikába.
- Profilválasztó és action-handlerek szétválasztása.
- Push notification action UI és főmenü UI lazább csatolása.

### 5.3 `AutoQRScanner` stabilizálása
- `setView` prop pontos típusa.
- Permission, animation és scan lock logika tiszta szétválasztása.
- Kamera fallback üzenetek lokalizálhatóságának előkészítése.

### 5.4 `Clone` és `Cards` komponensek egyszerűsítése
- Felesleges debug logok eltávolítása.
- Egységes action-kezelés.
- Jobban típusozott opciólista és gombállapotok.

---

## 6. Fázis — service réteg rendezése

### 6.1 HTTP service-ek szerkezeti egységesítése
- Közös request helper kialakítása ismétlődő mintákra:
	- path előállítás
	- auth header építés
	- fetch + response check
	- parse + error mapping

### 6.2 RequestHandler és QR dispatch egyszerűsítése
- A `RequestHandler` inkább route registry / adapter legyen, ne csak pass-through wrapper.
- A route dispatch logika és a konkrét service hívások kapcsolata legyen deklaratívabb.

### 6.3 Device store API finomítása
- `DeviceStore.tsx` jól szervezett, de tovább tisztítható:
	- storage read/write helper-ek még tisztább szeparációja
	- legacy migráció külön modulba mozgatása
	- profile normalizálás és persistence szabályok dokumentálása

---

## 7. Fázis — konfiguráció és architekturális javítások

### 7.1 Környezeti konfiguráció externalizálása
- API base URL és Firebase config kivezetése közvetlen forráskódból.
- Környezetenkénti konfigurációs stratégia kialakítása.
- Release/dev eltérések dokumentálása.

### 7.2 Biztonsági policy dokumentálása
- Mit szabad logolni és mit nem.
- Mely service-ek kezelnek secretet.
- Mely storage mezők érzékenyek.

### 7.3 Modulhatárok tisztítása
- UI, orchestration, domain logic és transport réteg szétválasztása.
- Fő cél: a komponensek kevesebb service részletet ismerjenek.

---

## Ajánlott végrehajtási sorrend sprintenként

### Sprint 1
- Lint setup javítás
- Teszt warningok tisztítása
- Érzékeny logok eltávolítása

### Sprint 2
- `Registration` visszatérési értékek rendbetétele
- Hibakezelés egységesítése
- Guard clause és kisebb olvashatósági javítások

### Sprint 3
- `any` típusok kivezetésének első köre
- HTTP payload/response típusok pontosítása
- QR typing javítása

### Sprint 4
- Firebase flow tisztítása
- `App.tsx` auth flow egyszerűsítése
- `Main.tsx` inicializáció feldarabolása

### Sprint 5
- `UserRegistration` komponens bontása
- `Entry`, `Clone`, `AutoQRScanner`, `Cards` komponensek refaktorja

### Sprint 6
- HTTP common layer kialakítása
- Request dispatch egyszerűsítése
- Konfiguráció externalizálása

---

## Definíció: mikor léphetünk tovább a következő fázisra?

Csak akkor, ha:

- a tesztek zöldek,
- a lint zöld vagy dokumentáltan javuló trendet mutat,
- nincs új viselkedésváltozás,
- az adott fázis módosításai kicsi, review-zható PR-ekben vannak.
