#!/usr/bin/env bash
# Azure Cloud Shell Bash. Demo resources use Azure for Students credits.
set -Eeuo pipefail
umask 077
stamp=$(date -u +%m%d%H%M%S)
rg="rg-techinventory-backup-$stamp"
account="tibackup$stamp"
region=eastus
vm=techinventory-backup
mkdir -p evidence/backup
# Stop compute on both success and failure. Delete this demo group after preserving evidence.
trap 'az vm deallocate -g "$rg" -n "$vm" --only-show-errors -o none || true' EXIT
az account show --query '{name:name,state:state}' -o json
az group create -n "$rg" -l "$region" --tags project=TechInventory purpose=backup-demo -o none
az storage account create -g "$rg" -n "$account" -l "$region" --sku Standard_LRS --allow-blob-public-access false --min-tls-version TLS1_2 --https-only true -o none
key=$(az storage account keys list -g "$rg" -n "$account" --query '[0].value' -o tsv)
AZURE_STORAGE_KEY="$key" az storage container create --account-name "$account" -n backups --public-access off -o none
expiry=$(date -u -d '+90 minutes' +%Y-%m-%dT%H:%MZ)
AZURE_STORAGE_KEY="$key" az storage account generate-sas --account-name "$account" --services b --resource-types o --permissions cw --expiry "$expiry" --https-only -o tsv > /tmp/ti-sas
az vm create -g "$rg" -n "$vm" --image Ubuntu2204 --size Standard_B1ms --admin-username azureuser --generate-ssh-keys --nsg-rule NONE --public-ip-sku Standard --os-disk-size-gb 30 --storage-sku Standard_LRS --public-ip-address-dns-name "$account" -o none
az vm open-port -g "$rg" -n "$vm" --port 80,443 --priority 1010 -o none
domain="$account.$region.cloudapp.azure.com"
cat > /tmp/ti-worker-source.sh <<'WORKER'
set -Eeuo pipefail
umask 077
exec 3>&1
exec > /tmp/ti-run.log 2>&1
trap 'rc=$?; if ((rc)); then tail -60 /tmp/ti-run.log >&3; fi' EXIT
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 git gnupg curl
systemctl enable --now docker
if [ ! -d /opt/techinventory/.git ]; then git clone https://github.com/CodexVex/TechInventory.git /opt/techinventory; fi
cd /opt/techinventory
git pull --ff-only
chmod -R a+rX client server
chmod 644 package.json package-lock.json couchdb.ini Caddyfile
docker run --rm -v "$PWD:/app" -w /app node:24-alpine node scripts/setup.js
grep -q '^DOMAIN=' .env || printf '\nDOMAIN=%s\n' "$TI_DOMAIN" >> .env
docker compose -f compose.yaml -f compose.production.yaml up -d --build --wait --wait-timeout 300
docker compose exec -T app node --input-type=module <<'JS'
import {CouchDB} from './server/db.js';
const db=new CouchDB(process.env.COUCHDB_URL);
let doc={_id:'asset:BACKUP-AZURE',type:'asset',code:'BACKUP-AZURE',name:'Demostración Azure',status:'Disponible'};
try {doc._rev=(await db.get(doc._id))._rev;}catch(e){if(e.status!==404)throw e;}
await db.put(doc);
JS
if [ ! -s /root/ti-key ]; then openssl rand -base64 48 > /root/ti-key; fi
export BACKUP_PASSPHRASE_FILE=/root/ti-key
export BACKUP_UPLOAD_SAS_FILE=/root/ti-sas
export BACKUP_BLOB_BASE_URL=https://$TI_ACCOUNT.blob.core.windows.net/backups
export BACKUP_DIR=/root/ti-backups
bash backup.sh
curl -fsS --max-time 15 --retry 12 --retry-delay 5 https://$TI_DOMAIN/api/health >&3
cat evidence/backup/before.json evidence/backup/restored.json evidence/backup/result.json >&3
WORKER
{
 printf "umask 077\ncat > /root/ti-sas <<'PRIVATE_SAS'\n"
 cat /tmp/ti-sas
 printf "\nPRIVATE_SAS\n"
 printf 'export TI_DOMAIN=%q\nexport TI_ACCOUNT=%q\n' "$domain" "$account"
 printf "cat > /tmp/ti-worker.sh <<'WORKER'\n"
 cat /tmp/ti-worker-source.sh
 printf '\nWORKER\nbash /tmp/ti-worker.sh\n'
} > /tmp/ti-command.sh
az vm run-command invoke -g "$rg" -n "$vm" --command-id RunShellScript --scripts @/tmp/ti-command.sh -o json > evidence/backup/azure-deployment.json
cat evidence/backup/azure-deployment.json
grep -q 'PASS' evidence/backup/azure-deployment.json
AZURE_STORAGE_KEY="$key" az storage blob list --account-name "$account" -c backups --query '[].{name:name,bytes:properties.contentLength}' -o json > evidence/backup/azure-blobs.json
az storage account show -g "$rg" -n "$account" --query '{allowBlobPublicAccess:allowBlobPublicAccess,httpsOnly:enableHttpsTrafficOnly,minTls:minimumTlsVersion}' -o json > evidence/backup/azure-storage-security.json
printf '{"resourceGroup":"%s","domain":"%s","retireAfterDemo":true}\n' "$rg" "$domain" > evidence/backup/azure-hosting.json
rm -f /tmp/ti-sas /tmp/ti-command.sh
printf 'Evidence retained in evidence/backup. Retire this disposable resource group after preserving it: %s\n' "$rg"
