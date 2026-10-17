import React,{useEffect,useState} from 'react';
import {Plus,Trash2,Send,MessageSquare,FileClock,CheckCircle2,AlertCircle,BookOpen,UserPlus} from 'lucide-react';
import {supabase} from '../lib/supabase';
const err=e=>e?.message||String(e||'Gagal');
const when=s=>s?new Date(s).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}):'—';
const emptyCase={title:'',question:'',answer_guide:'',followup:'',competency:'',source:''};

export function StudyCaseManager({data,admin,notify,refresh}){
 const [group,setGroup]=useState(''),[adding,setAdding]=useState(false),[form,setForm]=useState(emptyCase),[busy,setBusy]=useState(false);
 const groups=data.groups||[];
 useEffect(()=>{if(!groups.some(x=>x.id===group))setGroup(groups[0]?.id||'');},[group,groups]);
 const base=(data.cases||[]).find(x=>x.group_id===group);
 const extras=(data.extraCases||[]).filter(x=>x.group_id===group);
 async function add(){if(!admin||!group||!form.title.trim()||!form.question.trim())return;
  setBusy(true);const {error}=await supabase.from('pl2_extra_cases').insert({group_id:group,...form});setBusy(false);
  if(error){notify('Gagal menambah studi kasus: '+err(error));return;}notify('Studi kasus berhasil ditambahkan.');setForm(emptyCase);setAdding(false);refresh();
 }
 async function remove(table,key,value,title){if(!admin)return;
  if(!window.confirm(`Hapus studi kasus "${title}" secara permanen? Tindakan ini dicatat dalam jejak audit.`))return;
  const {error}=await supabase.from(table).delete().eq(key,value);
  if(error)notify('Gagal menghapus: '+err(error));else{notify('Studi kasus dihapus.');refresh();}
 }
 return <>
  <div className="page-head"><div><span className="eyebrow">BANK STUDI KASUS</span><h1>Studi kasus per jabatan</h1><p>Penguji membaca kasus sesuai penugasan. Hanya administrator yang dapat menambah dan menghapus kasus.</p></div>{admin&&<button className="btn primary" onClick={()=>setAdding(v=>!v)}><Plus size={16}/> Tambah studi kasus</button>}</div>
  <div className="toolbar"><label className="field compact"><span>Peminatan</span><select value={group} onChange={e=>setGroup(e.target.value)}>{groups.map(g=><option key={g.id} value={g.id}>{g.id} · {g.unit}</option>)}</select></label><span className="toolbar-count">{(base?1:0)+extras.length} paket kasus</span></div>
  {admin&&adding&&<section className="panel v24-block"><h3>Kasus tambahan baru</h3><div className="v24-form-grid"><label>Judul<input maxLength="140" value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} placeholder="Contoh: Strategi pengelolaan tim"/></label><label>Sumber / referensi<input value={form.source} onChange={e=>setForm(v=>({...v,source:e.target.value}))}/></label></div>
   <label>Pertanyaan utama<textarea rows="3" value={form.question} onChange={e=>setForm(v=>({...v,question:e.target.value}))}/></label>
   <label>Panduan jawaban<textarea rows="3" value={form.answer_guide} onChange={e=>setForm(v=>({...v,answer_guide:e.target.value}))}/></label>
   <label>Pertanyaan lanjutan<textarea rows="2" value={form.followup} onChange={e=>setForm(v=>({...v,followup:e.target.value}))}/></label>
   <label>Kompetensi yang diamati<input value={form.competency} onChange={e=>setForm(v=>({...v,competency:e.target.value}))}/></label>
   <button className="btn primary" disabled={busy||form.title.trim().length<3||form.question.trim().length<8} onClick={add}><Plus size={16}/> Simpan kasus tambahan</button>
  </section>}
  {base&&<section className="panel v24-block"><div className="v24-between"><div><span className="eyebrow">KASUS UTAMA · DARI BANK AWAL</span><h3>{group}</h3></div>{admin&&<button className="btn outline v24-danger" onClick={()=>remove('study_cases','group_id',group,group+' (kasus awal)')}><Trash2 size={15}/> Hapus kasus awal</button>}</div>
   <h4>Pertanyaan A</h4><p>{base.question_a}</p><div className="v24-soft"><b>Panduan jawaban A</b><p>{base.key_a}</p></div>
   <h4>Pertanyaan B</h4><p>{base.question_b}</p><div className="v24-soft"><b>Panduan jawaban B</b><p>{base.key_b}</p></div>
   {base.followup&&<p><b>Lanjutan: </b>{base.followup}</p>}{base.competency&&<p><b>Kompetensi: </b>{base.competency}</p>}
  </section>}
  {extras.map(c=><section className="panel v24-block" key={c.id}><div className="v24-between"><div><span className="eyebrow">STUDI KASUS TAMBAHAN</span><h3>{c.title}</h3></div>{admin&&<button className="btn outline v24-danger" onClick={()=>remove('pl2_extra_cases','id',c.id,c.title)}><Trash2 size={15}/> Hapus</button>}</div><p><b>Pertanyaan:</b> {c.question}</p><div className="v24-soft"><b>Panduan jawaban</b><p>{c.answer_guide||'Belum diisi'}</p></div>{c.followup&&<p><b>Lanjutan:</b> {c.followup}</p>}{c.competency&&<p><b>Kompetensi:</b> {c.competency}</p>}{c.source&&<p className="footnote">Sumber: {c.source}</p>}</section>)}
  {!base&&!extras.length&&<div className="panel v24-block"><BookOpen size={24}/><p>Belum ada kasus pada peminatan ini. Administrator dapat menambah studi kasus.</p></div>}
 </>;
}

export function ParticipantRequests({data,admin,session,group,notify,refresh}){
 const [show,setShow]=useState(false),[code,setCode]=useState(''),[name,setName]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[notes,setNotes]=useState({});
 const rows=data.participantRequests||[];
 const own=rows.filter(x=>x.requester_id===session.user.id);
 async function send(){if(!group||!code.trim()||!name.trim()||reason.trim().length<5)return;
  setBusy(true);const {error}=await supabase.from('pl2_participant_requests').insert({group_id:group,proposed_code:code.trim().toUpperCase(),candidate_name:name.trim(),reason:reason.trim()});setBusy(false);
  if(error){notify('Permintaan gagal: '+err(error));return;}notify('Permintaan dikirim ke administrator.');setShow(false);setName('');setCode('');setReason('');refresh();
 }
 async function decision(r,approve){if(!admin)return;
  if(approve&&!window.confirm(`Setujui dan tambahkan ${r.candidate_name} ke ${r.group_id} dengan kode ${r.proposed_code}?`))return;
  setBusy(true);let error;
  if(approve)({error}=await supabase.rpc('pl2_approve_participant_request',{p_request_id:r.id}));
  else ({error}=await supabase.from('pl2_participant_requests').update({status:'rejected',admin_note:notes[r.id]||'Ditolak oleh administrator',reviewed_by:session.user.id,reviewed_at:new Date().toISOString()}).eq('id',r.id).eq('status','pending'));
  setBusy(false);if(error){notify('Gagal memproses: '+err(error));return;}notify(approve?'Peserta berhasil ditambahkan.':'Permintaan ditolak.');refresh();
 }
 if(!admin)return <section className="panel v24-block"><div className="v24-between"><div><h3>Permintaan tambah peserta</h3><p>Penguji tidak bisa menambah peserta langsung. Ajukan ke administrator.</p></div><button className="btn outline" onClick={()=>setShow(v=>!v)}><UserPlus size={16}/> Ajukan peserta</button></div>
  {show&&<div className="v24-request-form"><p>Kelompok yang sedang dipilih: <b>{group||'—'}</b></p><label>Kode asesmen yang diusulkan<input value={code} onChange={e=>setCode(e.target.value)} placeholder={(group||'GDD-M-ADM')+'-05'}/></label><label>Nama lengkap<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Alasan penambahan<textarea rows="2" value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="btn primary" disabled={busy||!group||!code.trim()||!name.trim()||reason.trim().length<5} onClick={send}><Send size={15}/> Kirim permintaan</button></div>}
  {!!own.length&&<div className="v24-list">{own.slice(0,8).map(r=><div className="v24-item" key={r.id}><b>{r.candidate_name} · {r.proposed_code}</b><small>{r.status} · {when(r.created_at)}</small>{r.admin_note&&<p>Catatan admin: {r.admin_note}</p>}</div>)}</div>}
 </section>;
 return <section className="panel v24-block"><div className="v24-between"><div><h3>Permintaan tambah peserta dari penguji</h3><p>Persetujuan membuat peserta di database; untuk President, asesmen VP akan ikut dibuat.</p></div><span className="status-tag neutral">{rows.filter(r=>r.status==='pending').length} menunggu</span></div>
  {rows.filter(r=>r.status==='pending').length?rows.filter(r=>r.status==='pending').map(r=><div className="v24-item" key={r.id}><div className="v24-between"><div><b>{r.candidate_name} · {r.proposed_code}</b><small>{r.group_id} · {when(r.created_at)}</small></div></div><p>Alasan: {r.reason}</p><label>Catatan penolakan (jika ditolak)<input value={notes[r.id]||''} onChange={e=>setNotes(v=>({...v,[r.id]:e.target.value}))}/></label><div className="v24-actions"><button className="btn primary" disabled={busy} onClick={()=>decision(r,true)}><CheckCircle2 size={15}/> Setujui & tambahkan</button><button className="btn outline v24-danger" disabled={busy} onClick={()=>decision(r,false)}><AlertCircle size={15}/> Tolak</button></div></div>):<p>Tidak ada permintaan menunggu persetujuan.</p>}
 </section>;
}

export function StaffChat({data,session,admin,notify,refresh}){
 const [body,setBody]=useState(''),[sending,setSending]=useState(false);
 const items=data.chatFeed||[];
 async function send(e){e.preventDefault();const message=body.trim();if(!message||message.length>2000)return;
  setSending(true);const {error}=await supabase.from('pl2_chat_messages').insert({body:message});setSending(false);
  if(error){notify('Gagal mengirim chat: '+err(error));return;}setBody('');refresh();
 }
 async function remove(m){if(!admin||!window.confirm('Hapus pesan ini dari chat internal?'))return;const {error}=await supabase.from('pl2_chat_messages').delete().eq('id',m.id);if(error)notify(err(error));else refresh();}
 return <><div className="page-head"><div><span className="eyebrow">KOMUNIKASI INTERNAL</span><h1>Chat realtime PH/BPH</h1><p>Ruang diskusi antara administrator dan seluruh akun penguji resmi. Pembaruan masuk otomatis ketika ada pesan baru.</p></div><span className="status-tag good">Hanya akun terotorisasi</span></div><div className="message hint">Jangan kirim password, token, atau data pribadi peserta ke ruang chat bersama. Semua akun penilai dapat membaca percakapan ini.</div>
 <section className="panel v24-chat"><div className="v24-chat-scroll">{items.length?items.map(m=><div className={'v24-chat-bubble '+(m.sender_id===session.user.id?'mine':'')} key={m.id}><div className="v24-chat-meta"><b>{m.display_name}</b><small>{when(m.created_at)}</small>{admin&&<button className="tiny-action" onClick={()=>remove(m)}>Hapus</button>}</div><p>{m.body}</p></div>):<p className="v24-empty">Belum ada pesan. Kamu bisa memulai percakapan.</p>}</div>
 <form className="v24-chat-compose" onSubmit={send}><label htmlFor="v24-chat-input">Pesan baru</label><textarea id="v24-chat-input" rows="2" maxLength="2000" value={body} onChange={e=>setBody(e.target.value)} placeholder="Tulis pertanyaan atau informasi untuk PH/BPH…"/><div className="v24-between"><small>{body.length}/2000 karakter</small><button className="btn primary" type="submit" disabled={sending||!body.trim()}><Send size={15}/> Kirim pesan</button></div></form></section></>;
}

export function OwnAudit({data}){
 const items=data.myAudit||[];
 const ops={INSERT:'Menambahkan',UPDATE:'Mengubah',DELETE:'Menghapus'};
 const names={scores:'Penilaian',participants:'Peserta',pl2_participant_requests:'Permintaan peserta',group_feedback:'Feedback kelompok',individual_feedback:'Feedback individu',pl2_extra_cases:'Studi kasus',study_cases:'Studi kasus'};
 return <><div className="page-head"><div><span className="eyebrow">RIWAYAT PRIBADI</span><h1>Jejak pengerjaan saya</h1><p>Perubahan yang dilakukan dengan akunmu sendiri; tidak memuat nilai mentah maupun aktivitas rahasia pengguna lain.</p></div></div><section className="panel v24-block">{items.length?items.map(x=><div key={x.id} className="v24-audit-row"><FileClock size={17}/><div><strong>{ops[x.operation]||x.operation} {names[x.table_name]||x.table_name}</strong><p>Target: {x.target_id||'—'}</p><small>{when(x.occurred_at)}</small></div></div>):<p>Belum ada riwayat perubahan dari akun ini.</p>}</section></>;
}
