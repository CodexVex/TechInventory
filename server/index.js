import {CouchDB} from './db.js';
import {createApp,hashPassword} from './app.js';
const db=new CouchDB(process.env.COUCHDB_URL,process.env.COUCHDB_DATABASE||'techinventory');
await db.init();
for(const [username,password,role] of [[process.env.ADMIN_USER,process.env.ADMIN_PASSWORD,'admin'],[process.env.VIEWER_USER,process.env.VIEWER_PASSWORD,'viewer']]) {
 if(!username||!password)continue;
 if(password.length<12)throw Error('Passwords need at least 12 characters');
 try {await db.get('user:'+username);}catch(e){if(e.status!==404)throw e;await db.put({_id:'user:'+username,type:'user',role,passwordHash:hashPassword(password)});}
}
const app=createApp({db,secret:process.env.SESSION_SECRET,origin:process.env.APP_ORIGIN||'http://localhost:3000',production:process.env.NODE_ENV==='production'});
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('TechInventory ready'));
