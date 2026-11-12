import{existsSync,writeFileSync}from'node:fs';import{randomBytes}from'node:crypto';
if(existsSync('.env')){console.log('.env already exists; left unchanged');process.exit(0);}
const random=()=>randomBytes(24).toString('hex');
const dbPassword=random();
writeFileSync('.env',`COUCHDB_USER=inventory_service\nCOUCHDB_PASSWORD=${dbPassword}\nCOUCHDB_URL=http://inventory_service:${dbPassword}@localhost:5984\nSESSION_SECRET=${random()}\nADMIN_USER=admin\nADMIN_PASSWORD=${random()}\nVIEWER_USER=consulta\nVIEWER_PASSWORD=${random()}\nAPP_ORIGIN=http://localhost:3000\nNODE_ENV=development\n`,{mode:0o600});console.log('Created .env with random credentials. Read ADMIN_PASSWORD locally; do not publish it.');
