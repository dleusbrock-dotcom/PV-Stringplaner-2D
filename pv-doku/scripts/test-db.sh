#!/usr/bin/env bash
# Spielt alle Migrationen in eine temporäre lokale PostgreSQL-Instanz ein und führt die
# Datenbanktests (RLS, Sperre, Statuswechsel, Vollständigkeit) aus.
# Voraussetzung: PostgreSQL-Serverbinaries (initdb, pg_ctl) im PATH oder unter /usr/lib/postgresql/*/bin.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v initdb >/dev/null 2>&1; then
  PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)
  [ -n "${PGBIN}" ] && export PATH="${PGBIN}:${PATH}"
fi
command -v initdb >/dev/null || { echo "initdb nicht gefunden" >&2; exit 1; }

DIR="$(pwd)/.tmp-db"
PORT="${PGTEST_PORT:-54329}"
rm -rf "$DIR"
mkdir -p "$DIR"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  # PostgreSQL verweigert den Start als root
  id pgtest >/dev/null 2>&1 || useradd -M -s /bin/false pgtest
  chown -R pgtest "$DIR"
  RUN_AS=(runuser -u pgtest --)
fi
"${RUN_AS[@]}" initdb -D "$DIR/data" -U postgres -A trust >/dev/null
"${RUN_AS[@]}" pg_ctl -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap '"${RUN_AS[@]}" pg_ctl -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true' EXIT

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$DIR" -p "$PORT" -U postgres -d postgres)
"${PSQL[@]}" -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f supabase/tests/db_test.sql
echo "Datenbanktests erfolgreich."
