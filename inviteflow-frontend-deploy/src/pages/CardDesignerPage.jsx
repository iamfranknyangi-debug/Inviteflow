// ============================================================
//  CardDesignerPage.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useDropzone } from 'react-dropzone';
import { eventsAPI, cardsAPI, guestsAPI } from '../services/api';
import toast from 'react-hot-toast';

function InvitePreview({ design, guestName }) {
  return (
    <div style={{
      background:'linear-gradient(135deg,#0d1520,#1a0d28)',
      border:'1px solid rgba(212,168,67,0.3)', borderRadius:14,
      padding:30, textAlign:'center', position:'relative', overflow:'hidden', minHeight:220,
    }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 60% 40%,rgba(212,168,67,.06),transparent 70%)' }} />
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ fontSize:11, letterSpacing:3, color:'#d4a843', textTransform:'uppercase', marginBottom:10 }}>
          ✦ You Are Cordially Invited ✦
        </div>
        <div style={{ fontFamily:'Georgia,serif', fontSize:22, fontWeight:700, color:'#f0c460', marginBottom:8 }}>
          {design.eventName || 'Event Name'}
        </div>
        <div style={{ fontSize:14, fontWeight:500, color:'#fff', marginBottom:6 }}>
          Dear {guestName},
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.8 }}>
          {design.message || 'You are cordially invited'}<br />
          📅 {design.date || 'Date TBD'}&nbsp;&nbsp;
          🕖 {design.time || 'Time TBD'}<br />
          📍 {design.venue || 'Venue TBD'}
        </div>
        <div style={{ marginTop:14, fontSize:12, color:'#d4a843' }}>✦ ✦ ✦</div>
      </div>
    </div>
  );
}

export default function CardDesignerPage() {
  const [eventId,    setEventId]    = useState('');
  const [previewGuest, setPreviewGuest] = useState('Your Guest');
  const [design, setDesign] = useState({
    eventName:'', date:'', time:'', venue:'', message:'You are cordially invited to join us for a special evening.',
    primaryColor:'#d4a843', textColor:'#ffffff',
  });
  const [bgFile, setBgFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [genning, setGenning] = useState(false);

  const { data: evData } = useQuery('events-all', () => eventsAPI.list({ limit:100 }).then(r=>r.data));
  const { data: guestData } = useQuery(['guests-card', eventId], () => guestsAPI.list({ event_id:eventId, limit:200 }).then(r=>r.data), { enabled:!!eventId });
  const events = evData?.data || [];
  const guests = guestData?.data || [];

  // Load existing card design when event is selected
  const { data: cardData } = useQuery(['card-design', eventId], () => cardsAPI.get(eventId).then(r=>r.data), { enabled:!!eventId });
  useEffect(() => {
    const ev = events.find(e=>e.id===eventId);
    if (ev) {
      setDesign(d => ({
        ...d,
        eventName: cardData?.data?.title_text || ev.name,
        date: ev.event_date,
        time: ev.event_time,
        venue: ev.venue_name,
        message: cardData?.data?.body_message || d.message,
      }));
    }
  }, [eventId, cardData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept:{ 'image/*':['.jpg','.jpeg','.png','.webp'] },
    maxFiles:1,
    onDrop: files => setBgFile(files[0]),
  });

  const save = async () => {
    if (!eventId) return toast.error('Select an event');
    setSaving(true);
    try {
      await cardsAPI.upsert(eventId, {
        title_text:    design.eventName,
        body_message:  design.message,
        primary_color: design.primaryColor,
        text_color:    design.textColor,
      });
      if (bgFile) {
        const fd = new FormData(); fd.append('image', bgFile);
        await cardsAPI.uploadBg(eventId, fd);
      }
      toast.success('Card design saved!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const generateAll = async () => {
    if (!eventId) return toast.error('Select an event');
    setGenning(true);
    try {
      const { data } = await cardsAPI.generateAll(eventId);
      toast.success(data.message);
    } catch { toast.error('Generation failed'); }
    finally { setGenning(false); }
  };

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>Card Designer</h1>
        <p style={{ color:'var(--text3)', fontSize:14 }}>Design personalised invitation cards</p>
      </div>

      <div style={{ marginBottom:20 }}>
        <select className="form-select" style={{ width:300 }} value={eventId} onChange={e=>setEventId(e.target.value)}>
          <option value="">Select event...</option>
          {events.map(e=><option key={e.id} value={e.id}>{e.emoji} {e.name}</option>)}
        </select>
      </div>

      <div className="row" style={{ alignItems:'flex-start', gap:20 }}>
        {/* Settings */}
        <div style={{ flex:1, minWidth:0 }}>
          <div className="card">
            <div style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:600, marginBottom:18 }}>Event Details</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                ['Event Name', 'eventName', 'text', 'e.g. Annual Gala 2026'],
                ['Date',       'date',      'text', 'e.g. Saturday, 15 December 2025'],
                ['Time',       'time',      'text', 'e.g. 7:00 PM'],
                ['Venue',      'venue',     'text', 'Venue name and city'],
              ].map(([label,key,type,ph]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" type={type} placeholder={ph}
                    value={design[key]} onChange={e=>setDesign({...design,[key]:e.target.value})} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Custom Message</label>
                <textarea className="form-textarea" rows={3} value={design.message}
                  onChange={e=>setDesign({...design,message:e.target.value})} />
              </div>
              <div style={{ display:'flex', gap:12 }}>
                <div className="form-group" style={{ flex:1 }}>
                  <label className="form-label">Accent Color</label>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="color" value={design.primaryColor}
                      onChange={e=>setDesign({...design,primaryColor:e.target.value})}
                      style={{ width:40,height:36,borderRadius:8,border:'1px solid var(--border2)',cursor:'pointer',padding:2 }} />
                    <input className="form-input" value={design.primaryColor}
                      onChange={e=>setDesign({...design,primaryColor:e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginTop:16 }}>
              <div style={{ fontWeight:500, marginBottom:12, fontSize:14 }}>Background Image</div>
              <div {...getRootProps()} className="upload-area" style={{ borderColor:isDragActive?'var(--gold3)':undefined }}>
                <input {...getInputProps()} />
                <div style={{ fontSize:28, marginBottom:8 }}>🖼</div>
                <div style={{ fontSize:13 }}>{bgFile ? bgFile.name : 'Drop image or click to browse'}</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>PNG, JPG up to 10MB</div>
              </div>
              {bgFile && <div className="badge badge-green" style={{ marginTop:10 }}>✓ {bgFile.name}</div>}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{ flex:1, minWidth:0 }}>
          <div className="card">
            <div style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:600, marginBottom:16 }}>Live Preview</div>
            <InvitePreview design={design} guestName={previewGuest} />

            <div style={{ marginTop:16 }}>
              <label className="form-label">Preview for specific guest</label>
              <select className="form-select" onChange={e=>setPreviewGuest(e.target.value || 'Your Guest')}>
                <option value="">Generic preview</option>
                {guests.map(g=><option key={g.id} value={g.full_name}>{g.full_name}</option>)}
              </select>
            </div>

            <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginTop:16, display:'flex', flexDirection:'column', gap:10 }}>
              <button className="btn btn-primary" style={{ justifyContent:'center' }} onClick={save} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Design'}
              </button>
              <button className="btn btn-ghost" style={{ justifyContent:'center' }} onClick={generateAll} disabled={genning}>
                {genning ? 'Generating...' : `✨ Generate All Cards (${guests.length})`}
              </button>
              <button className="btn btn-ghost" style={{ justifyContent:'center' }}
                onClick={()=>toast.success('PDF export — connect jsPDF backend to enable')}>
                ⬇ Download as PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
