@echo off
echo ========================================
echo  PV-Stringplaner 2D – Lokaler Start
echo ========================================
echo.

REM Prüfe ob Node.js installiert ist
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo FEHLER: Node.js nicht gefunden!
    echo Bitte installieren: https://nodejs.org  ^(LTS-Version^)
    pause
    exit /b 1
)

echo [1/5] Node.js gefunden:
node --version

REM SQLite-Schema aktivieren
echo [2/5] SQLite-Datenbank einrichten...
copy /y prisma\schema.sqlite.prisma prisma\schema.prisma >nul

REM .env.local anlegen falls nicht vorhanden
if not exist .env.local (
    echo DATABASE_URL=file:./dev.db> .env.local
    echo NEXTAUTH_SECRET=lokal-dev-bitte-in-produktion-aendern>> .env.local
    echo NEXTAUTH_URL=http://localhost:3000>> .env.local
    echo [2/5] .env.local angelegt.
)

REM Abhängigkeiten installieren
echo [3/5] Pakete installieren ^(einmalig, kann 2-3 Min dauern^)...
call npm install --silent

REM Prisma Client generieren + Datenbank erstellen
echo [4/5] Datenbank erstellen und Demo-Daten laden...
call npx prisma db push --force-reset >nul 2>&1
call npx prisma db seed

REM App starten
echo [5/5] App starten...
echo.
echo ========================================
echo  App laeuft auf: http://localhost:3000
echo  Login: admin@pv-planer.de / demo1234
echo  Zum Beenden: Strg+C druecken
echo ========================================
echo.
call npm run dev
