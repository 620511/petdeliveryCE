import { useEffect, useState } from "react";
import { privacyAPI } from "../../services/api";

export default function AdminPrivacy() {
  const [requests,setRequests]=useState([]);
  const [logs,setLogs]=useState([]);
  const [incidents,setIncidents]=useState([]);
  const [error,setError]=useState("");

  const load=async()=>{
    try{
      const [r,l,i]=await Promise.all([privacyAPI.adminRequests(),privacyAPI.auditLogs(),privacyAPI.incidents()]);
      setRequests(r.data); setLogs(l.data); setIncidents(i.data);
    }catch(e){setError(e?.response?.data?.error||"Erro ao carregar o painel LGPD.");}
  };
  useEffect(()=>{load();},[]);

  const updateRequest=async(id,status)=>{
    try{await privacyAPI.updateRequest(id,{status}); await load();}
    catch(e){setError(e?.response?.data?.error||"Erro ao atualizar solicitação.");}
  };

  const createIncident=async()=>{
    const title=window.prompt("Título do incidente:");
    if(!title) return;
    const description=window.prompt("Descrição do incidente:");
    if(!description) return;
    try{await privacyAPI.createIncident({title,description,severity:"medium"}); await load();}
    catch(e){setError(e?.response?.data?.error||"Erro ao registrar incidente.");}
  };

  const card={background:"#fff",borderRadius:16,padding:20,marginBottom:18,boxShadow:"0 5px 20px rgba(0,0,0,.05)"};
  return <div style={{padding:28,fontFamily:"system-ui"}}>
    <h1 style={{marginTop:0}}>🔐 LGPD & Segurança</h1>
    <p style={{color:"#666"}}>Solicitações de titulares, auditoria e incidentes de segurança.</p>
    {error&&<div style={{...card,color:"#b42318"}}>{error}</div>}

    <section style={card}><h2>Solicitações LGPD</h2>
      {requests.length===0?<p>Nenhuma solicitação.</p>:requests.map(r=><div key={r.id} style={{padding:"12px 0",borderBottom:"1px solid #eee"}}>
        <b>{r.type}</b> — {r.user?.name} ({r.user?.email})<br/>
        <small>{new Date(r.requestedAt).toLocaleString("pt-BR")} · {r.status}</small>
        <div style={{marginTop:7,display:"flex",gap:6}}>
          {r.status!=="in_progress"&&r.status!=="completed"&&<button onClick={()=>updateRequest(r.id,"in_progress")}>Em análise</button>}
          {r.status!=="completed"&&<button onClick={()=>updateRequest(r.id,"completed")}>Concluir</button>}
          {r.status!=="rejected"&&r.status!=="completed"&&<button onClick={()=>updateRequest(r.id,"rejected")}>Recusar</button>}
        </div>
      </div>)}
    </section>

    <section style={card}><h2>Incidentes de segurança</h2><button onClick={createIncident} style={{padding:"9px 12px"}}>+ Registrar incidente</button>
      {incidents.map(i=><div key={i.id} style={{padding:"12px 0",borderBottom:"1px solid #eee"}}><b>{i.title}</b> — {i.severity} — {i.status}<br/><small>{new Date(i.detectedAt).toLocaleString("pt-BR")}</small></div>)}
    </section>

    <section style={card}><h2>Auditoria</h2>
      <div style={{maxHeight:420,overflow:"auto"}}>{logs.map(l=><div key={l.id} style={{padding:"8px 0",borderBottom:"1px solid #eee",fontSize:13}}>
        <b>{l.action}</b> · {l.user?.email||"sistema"} · {new Date(l.createdAt).toLocaleString("pt-BR")}
      </div>)}</div>
    </section>
  </div>;
}
