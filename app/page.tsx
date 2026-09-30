'use client';
import {useEffect,useMemo,useState} from 'react';
const STEPS=['Analyzing customer intent…','Identifying buying signals…','Detecting objections…','Preparing next best action…'];
let _uid=0;
const D=(name:string,location:string,requirement:string,budget:string,timeline:string,message:string)=>({id:`${name}-${Date.now()}-${_uid++}`,name,location,requirement,budget,timeline,message,status:'New',created:Date.now(),log:[{t:Date.now(),e:'Lead received'}],chat:[]});
const DEMO=[
D('Rahul Verma','Indore','2BHK near Vijay Nagar','₹70L','Within 30 days','Hi, I saw your Vijay Nagar 2BHK listing. Loan is pre-approved up to 70L. My lease ends next month so I need to move fast. Can I visit this Saturday?'),
D('Priya Nair','Pune','2BHK, Wakad','₹65L','3 months','Honestly 65L is already stretching us. We are first-time buyers and unsure about EMI. Is there any subsidy? Also comparing with another builder in Hinjewadi.'),
D('Amit Shah','Ahmedabad','Any 3BHK, rental yield focus','₹1.2Cr','6 months','Looking for investment properties with good rental yield. Send me ROI numbers for Bopal and Shela. Will decide after comparing 4-5 projects.'),
D('Sneha Iyer','Bengaluru','Something in Whitefield','Not sure','Just exploring','hi price?'),
D('Karan Malhotra','Gurugram','3BHK ready to move','₹1.5Cr','2 weeks','Relocating from Dubai in 2 weeks, family of 4. Need a ready-to-move 3BHK in Sector 57 or 65. Schools nearby are a must. Can do a video tour tomorrow.'),
D('Meera Joshi','Mumbai','Not decided','₹?','Maybe this year','Interested in buying something maybe. Not sure if 1BHK or 2BHK, or which area. Please call sometime.')];
const bd=(l:any)=>l.analysis?.priority||'—';
export default function Page(){
  const [leads,setLeads]=useState<any[]>([]);const [sel,setSel]=useState<string|null>(null);const [view,setView]=useState('hero');
  const [busy,setBusy]=useState<string|null>(null);const [step,setStep]=useState(0);const [err,setErr]=useState('');
  const [listening,setListening]=useState(false);
  const [voiceLang,setVoiceLang]=useState('en-IN');
  const LANGS=[['en-IN','English'],['hi-IN','हिंदी'],['mr-IN','मराठी'],['gu-IN','ગુજરાતી'],['ta-IN','தமிழ்'],['te-IN','తెలుగు'],['kn-IN','ಕನ್ನಡ'],['bn-IN','বাংলা']];
  function speak(text:string){if(!text||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=0.95;u.lang=voiceLang;window.speechSynthesis.speak(u)}
  function dictate(){const SR:any=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition;
    if(!SR){setErr('Voice input needs Chrome or Edge on this device.');return}
    const r=new SR();r.lang=voiceLang;r.continuous=true;r.interimResults=false;
    r.onresult=(e:any)=>{let t='';for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript+' ';setF((f:any)=>({...f,message:(f.message?f.message+' ':'')+t.trim()}))};
    r.onend=()=>setListening(false);r.onerror=()=>setListening(false);
    r.start();setListening(true);(window as any)._rec=r}
  function stopDictate(){(window as any)._rec?.stop();setListening(false)}
  const [q,setQ]=useState('');const [chatBusy,setChatBusy]=useState(false);const [why,setWhy]=useState('');const [f,setF]=useState<any>({name:'',location:'',requirement:'',budget:'',timeline:'',message:''});
  useEffect(()=>{try{const s=localStorage.getItem('leads');if(s){setLeads(JSON.parse(s));setView('app')}}catch{}},[]);
  useEffect(()=>{if(leads.length)try{localStorage.setItem('leads',JSON.stringify(leads))}catch{}},[leads]);
  const upd=(id:string,fn:(l:any)=>any)=>setLeads(ls=>ls.map(l=>l.id===id?fn(l):l));
  const log=(l:any,e:string)=>({...l,log:[...l.log,{t:Date.now(),e}]});
  const lead=leads.find(l=>l.id===sel);
  const post=async(b:any)=>{const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).catch(()=>null);
    if(!r) throw new Error('Connection issue. Your lead data is safe.');const j=await r.json();if(!r.ok) throw new Error(j.error||'AI analysis couldn\'t be completed. Retry.');return j};
  async function analyze(l:any){setErr('');setBusy(l.id);setStep(0);const iv=setInterval(()=>setStep(s=>Math.min(s+1,3)),500);
    try{const {analysis}=await post({mode:'analyze',lead:l});await new Promise(r=>setTimeout(r,Math.max(0,1800)));
      upd(l.id,x=>({...log(log(x,'AI analyzed'),'Priority set: '+analysis.priority),analysis,priority:analysis.priority}))}
    catch(e:any){setErr(e.message)}finally{clearInterval(iv);setBusy(null)}}
  async function ask(text:string){if(!lead||!text.trim())return;setChatBusy(true);setQ('');const h=lead.chat;
    upd(lead.id,l=>({...l,chat:[...l.chat,{role:'user',text}]}));
    try{const {reply}=await post({mode:'chat',lead,analysis:lead.analysis,history:h,question:text});upd(lead.id,l=>({...l,chat:[...l.chat,{role:'model',text:reply}]}))}
    catch(e:any){setErr(e.message)}finally{setChatBusy(false)}}
  function add(l:any){setLeads(ls=>[l,...ls]);setSel(l.id);setView('app');analyze(l)}
  function submit(){if(!f.message.trim()){setErr('No customer message provided.');return}if(!f.name.trim()){setErr('Name is required.');return}setErr('');add(D(f.name,f.location,f.requirement,f.budget,f.timeline,f.message));setF({name:'',location:'',requirement:'',budget:'',timeline:'',message:''})}
  const sorted=useMemo(()=>[...leads].sort((a,b)=>(b.analysis?.score??-1)-(a.analysis?.score??-1)),[leads]);
  const queue=useMemo(()=>sorted.filter(l=>l.analysis&&!['Converted','Lost'].includes(l.status)).map(l=>{const a=l.analysis,p=a.priority;
    const bucket=p==='Hot'?'🔴 Call now':l.status==='Follow-up'?'🟠 Follow up today':a.missing.length>=3?'🟡 Missing qualification':'🟢 Nurture';return{l,bucket}}),[sorted]);
  const hot=leads.filter(l=>l.priority==='Hot').length;

  if(view==='hero') return <main className="hero fade"><p className="h">Masal</p><h1>Masal Lead Intelligence</h1><p className="m">Turn inbound conversations into your next best sales move.</p>
    <div className="row" style={{justifyContent:'center',marginTop:20}}><button className="btn" onClick={()=>{setLeads(DEMO);setSel(DEMO[0].id);setView('app')}}>Explore Demo</button><button className="btn g" onClick={()=>setView('add')}>Add Lead</button></div></main>;

  const a=lead?.analysis;
  return <div>
    <header className="row" style={{padding:'12px 16px',borderBottom:'1px solid var(--b)',justifyContent:'space-between'}}>
      <b>Masal <span className="m">Lead Intelligence</span></b>
      <div className="row"><span>🔥 {hot} Hot</span><span>⚡ {queue.filter(x=>x.bucket.startsWith('🔴')||x.bucket.startsWith('🟠')).length} Need action</span><span>📋 {leads.length} Leads</span><span>✅ {leads.filter(l=>l.analysis).length} Analyzed</span></div>
      <div className="row"><button className="btn g" onClick={()=>setView('add')}>+ Add lead</button><button className="btn" disabled={!!busy} onClick={async()=>{for(const l of leads.filter(l=>!l.analysis)){setSel(l.id);await analyze(l)}}}>Analyze all</button></div></header>
    {err&&<div role="alert" className="card" style={{margin:16,borderColor:'var(--hot)'}}>{err} <button className="btn g" onClick={()=>setErr('')}>Dismiss</button></div>}
    {view==='add'?<main className="card fade" style={{maxWidth:640,margin:'24px auto'}}><h2 style={{marginTop:0}}>New lead</h2>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>{[['name','Name'],['location','Location'],['requirement','Property requirement'],['budget','Budget (e.g. ₹70L)'],['timeline','Buying timeline']].map(([k,p])=><label key={k}><span className="h">{p}</span><input value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})} placeholder={p}/></label>)}</div>
      <label><span className="h row" style={{marginTop:12,justifyContent:'space-between'}}>Customer message / chat transcript ({f.message.length})
        <span className="row" style={{gap:6}}><select aria-label="Voice language" value={voiceLang} onChange={e=>setVoiceLang(e.target.value)} style={{width:110,padding:'2px 6px'}}>{LANGS.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select>
        <button type="button" className="btn g" style={{padding:'2px 10px'}} onClick={listening?stopDictate:dictate}>{listening?'⏹ Stop dictating':'🎙️ Dictate'}</button></span></span>
        <textarea rows={7} value={f.message} onChange={e=>setF({...f,message:e.target.value})} placeholder="Paste the inquiry or WhatsApp conversation… or click Dictate to speak it"/></label>
      <div className="row" style={{marginTop:12}}><button className="btn" onClick={submit}>Save & analyze</button><button className="btn g" onClick={()=>setF({...DEMO[0],message:DEMO[0].message})}>Load Demo Lead</button><button className="btn g" onClick={()=>setView(leads.length?'app':'hero')}>Cancel</button></div></main>
    :<div className="app">
      <nav aria-label="Leads" className="card"><p className="h">Leads by priority</p>
        {!leads.length&&<p className="m">No leads yet. Add your first lead to start prioritizing.</p>}
        {sorted.map(l=><button key={l.id} className={'li '+(l.id===sel?'on':'')} onClick={()=>{setSel(l.id);upd(l.id,x=>x.viewed?x:{...log(x,'Salesperson viewed'),viewed:1})}}>
          <div className="row" style={{justifyContent:'space-between'}}><b>{l.name}</b><span className={'pill '+bd(l)}>{bd(l)} {l.analysis?.score??''}</span></div><div className="m">{l.budget} · {l.status}</div></button>)}
        <p className="h" style={{marginTop:16}}>What needs my attention?</p>
        {queue.slice(0,4).map(({l,bucket})=><div key={l.id} className="card" style={{marginBottom:6,padding:10}}><b>{bucket}</b><div>{l.name}</div><div className="m">{l.analysis.nextMove.exact}</div></div>)}</nav>
      <main>{!lead?<div className="card">Select a lead.</div>:<div className="grid fade" key={lead.id}>
        <div className="card"><div className="row" style={{justifyContent:'space-between'}}><h2 style={{margin:0}}>{lead.name}</h2>{a&&<span className={'pill '+a.priority}>{a.priority} · {a.score}/100</span>}</div>
          <div className="m">{lead.location} · {lead.requirement} · {lead.budget} · {lead.timeline}</div>
          <div className="row" style={{marginTop:8}}><select aria-label="Status" style={{width:140}} value={lead.status} onChange={e=>upd(lead.id,l=>({...log(l,'Status → '+e.target.value),status:e.target.value}))}>{['New','Contacted','Qualified','Follow-up','Converted','Lost'].map(s=><option key={s}>{s}</option>)}</select>
          <select aria-label="Priority" style={{width:110}} value={lead.priority||''} onChange={e=>upd(lead.id,l=>({...log(l,'Priority → '+e.target.value),priority:e.target.value}))}><option value="">Priority</option>{['Hot','Warm','Cold'].map(s=><option key={s}>{s}</option>)}</select>
          <button className="btn g" disabled={!!busy} onClick={()=>analyze(lead)}>{a?'Re-analyze':'Analyze'}</button></div>
          <p className="m" style={{marginBottom:0}}>"{lead.message}"</p></div>
        {busy===lead.id?<div className="card"><b>{STEPS[step]}</b>{[1,2,3,4].map(i=><div key={i} className="sk"/>)}</div>
        :a?<>
          <div className="card"><p className="h">Summary · Intent</p><p style={{margin:'0 0 6px'}}>{a.summary}</p><p className="m" style={{margin:0}}>{a.intent}</p>
            <p className="h" style={{marginTop:12}}>Key requirements</p><div className="row">{a.requirements.map((r:string)=><span key={r} className="pill" style={{borderColor:'var(--b)'}}>{r}</span>)}</div>
            <p className="h" style={{marginTop:12}}>Still missing</p><div className="m">{a.missing.join(' · ')||'Nothing critical'}</div></div>
          <div className="card"><p className="h">Why this score? <button className="btn g" style={{padding:'0 8px'}} onClick={()=>setWhy(why===lead.id?'':lead.id)}>{why===lead.id?'Hide':'Why?'}</button></p><b className={a.priority}>{a.priority}</b> — {a.why}
            {why===lead.id&&<div className="grid" style={{marginTop:10}}>{Object.entries(a.dims).map(([k,v]:any)=><div key={k}><div className="row" style={{justifyContent:'space-between'}}><span className="m">{k}</span><span>{v}/10</span></div><div className="bar"><i style={{width:v*10+'%'}}/></div></div>)}
              <span className="m">score = (urgency×.25 + intent×.25 + budget×.2 + specificity×.15 + engagement×.15)×10 − objections×2</span></div>}</div>
          <div className="card"><p className="h">Objection Radar</p>{!a.objections.length&&<span className="m">No friction detected.</span>}
            {a.objections.map((o:any,i:number)=><div key={i} style={{borderTop:i?'1px solid var(--b)':0,padding:'8px 0'}}><div className="row" style={{justifyContent:'space-between'}}><b>{o.type} — {o.severity}</b><span className="m">{o.confidence}% conf.</span></div>
              <div className="bar"><i style={{width:o.confidence+'%',background:o.severity==='High'?'var(--hot)':o.severity==='Medium'?'var(--warm)':'var(--cold)'}}/></div>
              <div className="m">Evidence: "{o.evidence}"</div><div>→ {o.strategy}</div></div>)}</div>
          <div className="card"><p className="h">Lead memory</p><div className="m">Budget {lead.budget} · {lead.location} · {lead.requirement} · {lead.timeline} · Status {lead.status} · {lead.chat.length} chat msgs · Last AI move: {a.nextMove.action}</div>
            <p className="h" style={{marginTop:12}}>Activity</p>{[...lead.log].reverse().map((x:any,i:number)=><div key={i} className="m">{new Date(x.t).toLocaleTimeString()} — {x.e}</div>)}</div>
        </>:<div className="card m">Not analyzed yet. Click Analyze to run the AI.</div>}</div>}</main>
      <aside className="grid" style={{alignContent:'start'}}>{a&&lead&&busy!==lead.id&&<>
        <div className="card" style={{borderColor:'var(--a)'}}><p className="h row" style={{justifyContent:'space-between'}}>⭐ Next best move <select aria-label="Voice language" value={voiceLang} onChange={e=>setVoiceLang(e.target.value)} style={{width:100,padding:'0 4px'}}>{LANGS.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select></p><h3 style={{margin:'0 0 4px'}}>{a.nextMove.action}</h3><div><b>Do:</b> {a.nextMove.exact}</div><div className="m"><b>Why:</b> {a.nextMove.why}</div>
          <p className="h row" style={{marginTop:10,justifyContent:'space-between'}}>Suggested opening <button className="btn g" style={{padding:'0 8px'}} onClick={()=>speak(a.nextMove.opening)}>🔊 Listen</button></p><p style={{margin:0}}>{a.nextMove.opening}</p>
          <div className="row" style={{marginTop:10}}><button className="btn" onClick={()=>{upd(lead.id,l=>log(l,'Response used: '+a.nextMove.action));ask('Rewrite this as a WhatsApp message I can send now: '+a.response)}}>Use this response</button>
          <button className="btn g" onClick={()=>{navigator.clipboard.writeText(a.response);upd(lead.id,l=>log(l,'Message copied'))}}>Copy message</button>
          <button className="btn g" disabled={!!busy} onClick={()=>analyze(lead)}>Regenerate</button></div></div>
        <div className="card"><p className="h row" style={{justifyContent:'space-between'}}>Suggested response <button className="btn g" style={{padding:'0 8px'}} onClick={()=>speak(a.response)}>🔊 Listen</button></p><p style={{margin:0}}>{a.response}</p></div></>}
        {lead&&<div className="card"><p className="h">Copilot · <span>Grounded in: profile + message + AI analysis</span></p>
          <div className="chat">{lead.chat.map((m:any,i:number)=><p key={i} className={m.role==='user'?'u':''}>{m.role==='user'?'You: ':''}{m.text}</p>)}{chatBusy&&<div className="sk"/>}</div>
          <div className="row" style={{margin:'8px 0'}}>{['What should I emphasize on the call?','Make my reply more assertive','What info is missing?','Give me a 20-second call opening'].map(s=><button key={s} className="btn g" style={{fontSize:12,padding:'2px 8px'}} disabled={chatBusy} onClick={()=>ask(s)}>{s}</button>)}</div>
          <div className="row"><input aria-label="Ask about this lead" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask(q)} placeholder="Ask about this lead…"/><button className="btn" disabled={chatBusy} onClick={()=>ask(q)}>Ask</button></div></div>}
      </aside></div>}
  </div>}
