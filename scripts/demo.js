import {readFileSync,writeFileSync} from 'node:fs';
const base=process.env.TEST_URL||'http://localhost:3000';
const r=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:process.env.ADMIN_USER,password:process.env.ADMIN_PASSWORD})});if(!r.ok)throw Error('Login failed '+r.status);
const {csrf}=await r.json(),cookie=r.headers.get('set-cookie').split(';')[0];
const call=async(path,method='GET',body)=>{const res=await fetch(base+'/api'+path,{method,headers:{'content-type':'application/json',cookie,origin:base,'x-csrf-token':csrf},body:body?JSON.stringify(body):undefined});if(!res.ok)throw Error('Request failed '+res.status);return res.status===204?null:res.json();};
const mode=process.argv[2];
if(mode==='seed'){
 for(const [code,name,category,location,responsible,status] of [['LT-DEMO','Laptop de laboratorio','Laptop','Laboratorio A','Equipo Alfa','Disponible'],['PC-DEMO','Estación de diseño','Desktop','Aula 204','Equipo Beta','Asignado'],['MON-DEMO','Monitor de 24 pulgadas','Monitor','Laboratorio B','Equipo Gamma','Mantenimiento'],['RED-DEMO','Router de prácticas','Red','Sala de redes','Equipo Delta','Disponible']]){
 const found=await call('/assets?q='+code);if(found.some(x=>x.code===code))continue;
 await call('/assets','POST',{code,name,category,location,responsible,status,notes:'Datos ficticios para demostración académica'});
 }console.log('Four fictional demonstration assets available.');
}else if(mode==='before'){
 const items=await call('/assets?q=LT-DEMO'),doc=items.find(x=>x.code==='LT-DEMO');if(!doc)throw Error('Seed missing');writeFileSync('evidence/persistencia-antes.json',JSON.stringify(doc,null,2));console.log('Recorded document identity and revision before restart.');
}else if(mode==='after'){
 const before=JSON.parse(readFileSync('evidence/persistencia-antes.json'));const items=await call('/assets?q=LT-DEMO'),after=items.find(x=>x._id===before._id);if(!after||after._rev!==before._rev)throw Error('Persistence check failed');writeFileSync('evidence/persistencia-despues.json',JSON.stringify({verifiedAt:new Date().toISOString(),sameId:after._id===before._id,sameRevision:after._rev===before._rev,document:after},null,2));console.log('PASS: same CouchDB document and revision after container restart.');
}else throw Error('Choose seed, before or after');
