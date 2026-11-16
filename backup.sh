#!/usr/bin/env bash
# Cold physical backup, optional private Blob upload, isolated restore drill.
set -Eeuo pipefail
cd "$(dirname "$0")"
umask 077
: "${BACKUP_PASSPHRASE_FILE:?Set a private passphrase file outside the repository}"
test -s "$BACKUP_PASSPHRASE_FILE"
command -v gpg >/dev/null
out=${BACKUP_DIR:-/tmp/techinventory-private-backups}
mkdir -p "$out" evidence/backup
out=$(cd "$out" && pwd)
evidence="$PWD/evidence/backup"
stage=$(mktemp -d)
project="ti-restore-$RANDOM-$$"
stopped=0
cleanup() {
 rc=$?
 if (( stopped )); then docker compose start couchdb app >/dev/null || rc=1; fi
 if [[ -f "$stage/restore.yaml" ]]; then docker compose -p "$project" -f "$stage/restore.yaml" down -v >/dev/null 2>&1 || true; fi
 rm -rf "$stage"
 exit "$rc"
}
trap cleanup EXIT
exec 9>"$out/.lock"
flock -n 9 || exit 1
cat > "$stage/snapshot.mjs" <<'JS'
import {createHash} from 'node:crypto';
import {CouchDB} from './server/db.js';
const db=new CouchDB(process.env.COUCHDB_URL);
const docs=(await db.request('/techinventory/_all_docs?include_docs=true')).rows.map(r=>r.doc).sort((a,b)=>a._id.localeCompare(b._id));
const security=await db.request('/techinventory/_security');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
console.log(JSON.stringify({documentCount:docs.length,assets:docs.filter(d=>d.type==='asset').map(d=>({id:d._id,rev:d._rev})),documentsSha256:hash(docs),securitySha256:hash(security)},null,2));
JS
DB=$(docker compose ps -q couchdb)
APP=$(docker compose ps -q app)
test -n "$DB" && test -n "$APP"
dbimage=$(docker inspect "$DB" --format '{{.Image}}')
appimage=$(docker inspect "$APP" --format '{{.Image}}')
docker pull alpine:3.22 >/dev/null
stopped=1
docker compose stop app >/dev/null
docker compose run --rm -T --no-deps app node --input-type=module < "$stage/snapshot.mjs" > "$evidence/before.json"
docker compose stop couchdb >/dev/null
docker cp "$DB:/opt/couchdb/etc" "$stage/etc"
cp .env "$stage/app.env"
docker run --rm --volumes-from "$DB:ro" -v "$stage:/backup" alpine:3.22 tar -C /opt/couchdb -czf /backup/data.tar.gz data
tar -C "$stage" -czf "$stage/physical.tar.gz" data.tar.gz etc app.env
docker compose start couchdb app >/dev/null
stopped=0
name="techinventory-$(date -u +%Y%m%dT%H%M%SZ).tar.gz.gpg"
gpg --batch --yes --pinentry-mode loopback --passphrase-file "$BACKUP_PASSPHRASE_FILE" --symmetric --cipher-algo AES256 --output "$out/$name.partial" "$stage/physical.tar.gz"
mv "$out/$name.partial" "$out/$name"
(cd "$out" && sha256sum "$name" > "$name.sha256")
if [[ -n ${BACKUP_BLOB_BASE_URL:-} ]]; then
 : "${BACKUP_UPLOAD_SAS_FILE:?Supply a short-lived SAS file}"
 sas=$(cat "$BACKUP_UPLOAD_SAS_FILE")
 for suffix in '' .sha256; do
  curl --fail --silent --show-error --retry 3 -X PUT -H 'x-ms-blob-type: BlockBlob' --upload-file "$out/$name$suffix" "$BACKUP_BLOB_BASE_URL/$name$suffix?$sas"
 done
fi
# Verify the encrypted archive, then restore from it, not from the staging copy.
start=$(date +%s)
(cd "$out" && sha256sum -c "$name.sha256")
rm -rf "$stage/etc" "$stage/app.env" "$stage/data.tar.gz" "$stage/physical.tar.gz"
gpg --batch --pinentry-mode loopback --passphrase-file "$BACKUP_PASSPHRASE_FILE" --decrypt --output "$stage/physical.tar.gz" "$out/$name"
tar -xzf "$stage/physical.tar.gz" -C "$stage"
cat > "$stage/restore.yaml" <<EOF
services:
  couchdb:
    image: $dbimage
    env_file: app.env
    volumes:
      - restored:/opt/couchdb/data
      - ./etc:/opt/couchdb/etc
  app:
    image: $appimage
    env_file: app.env
    environment:
      COUCHDB_URL: http://\${COUCHDB_USER}:\${COUCHDB_PASSWORD}@couchdb:5984
volumes:
  restored:
EOF
docker compose --env-file "$stage/app.env" -p "$project" -f "$stage/restore.yaml" create couchdb >/dev/null
restored=$(docker compose --env-file "$stage/app.env" -p "$project" -f "$stage/restore.yaml" ps -aq couchdb)
docker run --rm --volumes-from "$restored" -v "$stage:/backup:ro" alpine:3.22 tar -xzf /backup/data.tar.gz -C /opt/couchdb
docker compose --env-file "$stage/app.env" -p "$project" -f "$stage/restore.yaml" start couchdb >/dev/null
ready=0
for i in $(seq 1 60); do
 if docker exec "$restored" curl -fsS http://localhost:5984/_up >/dev/null; then ready=1; break; fi
 sleep 1
done
(( ready )) || exit 1
docker compose --env-file "$stage/app.env" -p "$project" -f "$stage/restore.yaml" run --rm -T --no-deps app node --input-type=module < "$stage/snapshot.mjs" > "$evidence/restored.json"
cmp "$evidence/before.json" "$evidence/restored.json"
printf '{"status":"PASS","isolatedRestore":true,"documentsAndRevisionsMatch":true,"securityMatches":true,"restoreSeconds":%s,"completedAt":"%s"}\n' "$(($(date +%s)-start))" "$(date -u +%FT%TZ)" > "$evidence/result.json"
cat "$evidence/result.json"
echo "Encrypted backup: $out/$name"
