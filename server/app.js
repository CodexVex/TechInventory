import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import {randomBytes,scryptSync,timingSafeEqual,createHmac} from 'node:crypto';
import {z} from 'zod';
export function hashPassword(password,salt=randomBytes(16).toString('hex')) {return salt+':'+scryptSync(password,salt,64).toString('hex');}
function verify(password,stored){const [salt,hash]=stored.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'));}
export const assetSchema=z.object({code:z.string().trim().regex(/^[A-Z0-9-]{2,30}$/),name:z.string().trim().min(2).max(100),category:z.enum(['Laptop','Desktop','Monitor','Red','Otro']),location:z.string().trim().min(2).max(100),responsible:z.string().trim().min(2).max(100),status:z.enum(['Disponible','Asignado','Mantenimiento','Baja']),notes:z.string().trim().max(1000).default('')}).strict();
export function createApp({db,secret,origin='http://localhost:3000',production=false}) {
 if(!secret||secret.length<32)throw Error('SESSION_SECRET needs at least 32 characters');
 const app=express();app.disable('x-powered-by');app.use(helmet());app.use(express.json({limit:'20kb'}));app.use(cookieParser());
 app.use('/api',rateLimit({windowMs:60000,limit:200}));
 const sign=s=>createHmac('sha256',secret).update(s).digest('base64url');
 function readSession(req){try{const [data,sig]=req.cookies.session.split('.');const expected=sign(data);if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const session=JSON.parse(Buffer.from(data,'base64url'));return session.exp>Date.now()?session:null;}catch{return null;}}
 app.get('/api/health',async(req,res,next)=>{try{await db.request('/');res.json({status:'ok',database:'Apache CouchDB'});}catch(e){res.status(503).json({error:'Base de datos no disponible'});}});
 app.post('/api/login',rateLimit({windowMs:900000,limit:10}),async(req,res,next)=>{try{const {username,password}=req.body;if(typeof username!=='string'||typeof password!=='string'||password.length>256)return res.status(400).json({error:'Credenciales inválidas'});let user;try{user=await db.get('user:'+username);}catch(e){if(e.status!==404)throw e;}
 const valid=verify(password,user?.passwordHash||hashPassword('invalid-password','invalid-salt'));if(!user||!valid)return res.status(401).json({error:'Credenciales inválidas'});
 const session={username,role:user.role,csrf:randomBytes(24).toString('hex'),exp:Date.now()+3600000};const data=Buffer.from(JSON.stringify(session)).toString('base64url');res.cookie('session',data+'.'+sign(data),{httpOnly:true,secure:production,sameSite:'strict',maxAge:3600000,path:'/'});res.json({username,role:user.role,csrf:session.csrf});}catch(e){next(e);}});
 app.use('/api',(req,res,next)=>{req.session=readSession(req);if(!req.session)return res.status(401).json({error:'Inicia sesión'});if(!['GET','HEAD'].includes(req.method)&&(req.get('origin')!==origin||req.get('x-csrf-token')!==req.session.csrf))return res.status(403).json({error:'Solicitud no autorizada'});next();});
 app.get('/api/me',(req,res)=>res.json(req.session));
 app.post('/api/logout',(req,res)=>{res.clearCookie('session',{path:'/'});res.sendStatus(204);});
 app.get('/api/assets',async(req,res,next)=>{try{let items=await db.list();const q=String(req.query.q||'').toLowerCase();if(q)items=items.filter(x=>[x.code,x.name,x.location,x.responsible].join(' ').toLowerCase().includes(q));if(req.query.status)items=items.filter(x=>x.status===req.query.status);items.sort((a,b)=>a.code.localeCompare(b.code));res.json(items);}catch(e){next(e);}});
 app.get('/api/stats',async(req,res,next)=>{try{const items=await db.list();res.json({total:items.length,byStatus:items.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{})});}catch(e){next(e);}});
 app.use('/api/assets',(req,res,next)=>{if(req.method!=='GET'&&req.session.role!=='admin')return res.status(403).json({error:'Solo administradores'});next();});
 app.post('/api/assets',async(req,res,next)=>{try{const item=assetSchema.parse(req.body);const doc={...item,_id:'asset:'+item.code,type:'asset',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),updatedBy:req.session.username};const result=await db.put(doc);res.status(201).json({...doc,_rev:result.rev});}catch(e){next(e);}});
 app.put('/api/assets/:id',async(req,res,next)=>{try{const {_rev,...input}=req.body;const item=assetSchema.parse(input);if(typeof _rev!=='string')return res.status(400).json({error:'Falta revisión'});const old=await db.get(req.params.id);if(old.type!=='asset')return res.sendStatus(404);if(item.code!==old.code)return res.status(400).json({error:'El código no se puede cambiar'});const doc={...old,...item,_rev,updatedAt:new Date().toISOString(),updatedBy:req.session.username};const result=await db.put(doc);res.json({...doc,_rev:result.rev});}catch(e){next(e);}});
 app.delete('/api/assets/:id',async(req,res,next)=>{try{const old=await db.get(req.params.id);if(old.type!=='asset')return res.sendStatus(404);if(typeof req.query.rev!=='string')return res.status(400).json({error:'Falta revisión'});await db.remove(old._id,req.query.rev);res.sendStatus(204);}catch(e){next(e);}});
 app.use('/api',(req,res)=>res.status(404).json({error:'Ruta no encontrada'}));app.use(express.static('dist'));app.get('/{*path}',(req,res)=>res.sendFile('index.html',{root:'dist'}));
 app.use((e,req,res,next)=>{const status=e instanceof z.ZodError?400:[404,409].includes(e.status)?e.status:500;res.status(status).json({error:status===400?'Datos inválidos':status===409?'El registro cambió o el código ya existe. Actualiza e intenta de nuevo.':status===404?'No encontrado':'Error interno'});});return app;
}
