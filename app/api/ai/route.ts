import {NextResponse} from 'next/server';
const URL_='https://api.groq.com/openai/v1/chat/completions';
const MODEL='openai/gpt-oss-120b';
const SYS=`You are an experienced real-estate sales intelligence assistant for an Indian sales team.
Rules: use ONLY facts in the lead data/message. Never invent customer facts. Separate explicit statements from inference. Be concise and salesperson-friendly. Evidence must be short verbatim/near-verbatim snippets from the customer message. Do not reveal chain-of-thought; give brief decision factors only.`;
const SCHEMA=`Return ONLY JSON: {"summary":str,"intent":str,"requirements":[str],"missing":[str],"objections":[{"type":"Budget sensitivity|Timing uncertainty|Location concern|Property mismatch|Comparison shopping|Low engagement|Financing","severity":"High|Medium|Low","confidence":0-100,"evidence":str,"strategy":str}],"dims":{"urgency":0-10,"budgetClarity":0-10,"specificity":0-10,"intentStrength":0-10,"engagement":0-10,"objectionSeverity":0-10},"why":str,"nextMove":{"action":"Call now|Send WhatsApp follow-up|Ask one qualification question|Send property shortlist|Address financing concern|Follow up tomorrow|Do not contact yet","why":str,"exact":str,"opening":str},"response":str}`;
async function g(messages:any[],json:boolean){
  const key=process.env.GROQ_API_KEY; if(!key) throw new Error('GROQ_API_KEY not set');
  const r=await fetch(URL_,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({model:MODEL,messages,temperature:json?0.3:0.5,...(json?{response_format:{type:'json_object'}}:{})})});
  if(!r.ok){const t=await r.text().catch(()=>'');let msg=t;try{msg=JSON.parse(t)?.error?.message||t}catch{}throw new Error(`Groq ${r.status}: ${msg}`.slice(0,300))}
  const j=await r.json(); return j.choices?.[0]?.message?.content||'';
}
const n=(x:any)=>Math.max(0,Math.min(10,Number(x)||0));
function score(d:any){
  const s=(n(d.urgency)*.25+n(d.intentStrength)*.25+n(d.budgetClarity)*.2+n(d.specificity)*.15+n(d.engagement)*.15)*10-n(d.objectionSeverity)*2;
  const sc=Math.round(Math.max(0,Math.min(100,s))); return {score:sc,priority:sc>=65?'Hot':sc>=40?'Warm':'Cold'};
}
export async function POST(req:Request){
  try{
    const {mode,lead,history=[],question,analysis}=await req.json();
    if(!lead?.message?.trim()) return NextResponse.json({error:'No customer message provided.'},{status:400});
    const ctx=`LEAD PROFILE: name=${lead.name}, location=${lead.location}, requirement=${lead.requirement}, budget=${lead.budget}, timeline=${lead.timeline}, status=${lead.status}\nCUSTOMER MESSAGE:\n${lead.message}`;
    if(mode==='analyze'){
      const t=await g([{role:'system',content:SYS},{role:'user',content:`${ctx}\n\n${SCHEMA}`}],true);
      let a:any; try{a=JSON.parse(t)}catch{return NextResponse.json({error:'AI returned malformed output. Retry.'},{status:502})}
      a.dims=a.dims||{}; a.objections=Array.isArray(a.objections)?a.objections:[]; a.requirements=a.requirements||[]; a.missing=a.missing||[]; a.nextMove=a.nextMove||{};
      return NextResponse.json({analysis:{...a,...score(a.dims),source:MODEL,at:Date.now()}});
    }
    if(mode==='chat'){
      const mem=`${ctx}\nAI ANALYSIS: ${JSON.stringify(analysis||'not yet analyzed')}`;
      const t=await g([{role:'system',content:SYS+' You are a copilot for ONE lead. Answer only from the lead context below; if information is missing say so and suggest what to ask. Keep answers under 120 words unless drafting a message.\n'+mem},
        ...history.slice(-8).map((m:any)=>({role:m.role==='user'?'user':'assistant',content:m.text})),{role:'user',content:question}],false);
      return NextResponse.json({reply:t});
    }
    return NextResponse.json({error:'Bad mode'},{status:400});
  }catch(e:any){return NextResponse.json({error:'AI unavailable: '+e.message},{status:503})}
}