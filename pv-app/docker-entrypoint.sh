#!/bin/sh
set -e

echo "⏳ Warte auf Datenbank..."
until nc -z db 5432; do
  sleep 1
done
echo "✅ Datenbank erreichbar"

echo "🔄 Migrationen anwenden..."
npx prisma migrate deploy

echo "🌱 Demo-Daten einspielen..."
npx prisma db seed || echo "ℹ️  Seed übersprungen (Daten bereits vorhanden)"

echo "🚀 App starten..."
exec node server.js
