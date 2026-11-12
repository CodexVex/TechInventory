export class CouchDB {
  constructor(url, name='techinventory') { const u=new URL(url); this.auth='Basic '+Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString('base64'); u.username='';u.password='';this.url=u.href.replace(/\/$/,'');this.name=name; }
  async request(path,method='GET',body) {
    const r=await fetch(this.url+path,{method,headers:{Authorization:this.auth,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    const data=await r.json(); if(!r.ok) {const e=new Error(data.reason||'Database error');e.status=r.status;throw e;} return data;
  }
  async init(){try{await this.request('/'+this.name,'PUT')}catch(e){if(e.status!==412)throw e;}
    await this.request('/'+this.name+'/_security','PUT',{admins:{names:[],roles:[]},members:{names:['inventory_service'],roles:[]}});
  }
  get(id){return this.request('/'+this.name+'/'+encodeURIComponent(id));}
  put(doc){return this.request('/'+this.name+'/'+encodeURIComponent(doc._id),'PUT',doc);}
  remove(id,rev){return this.request('/'+this.name+'/'+encodeURIComponent(id)+'?rev='+encodeURIComponent(rev),'DELETE');}
  async list(){return (await this.request('/'+this.name+'/_all_docs?include_docs=true')).rows.map(x=>x.doc).filter(x=>x.type==='asset');}
}
