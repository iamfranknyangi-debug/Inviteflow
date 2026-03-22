import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { QRCodeCanvas } from 'qrcode.react';
import { eventsAPI, guestsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function QRCodesPage() {
  const [eventId, setEventId] = useState('');
  const { data: evData } = useQuery('events-all', () => eventsAPI.list({ limit:100 }).then(r=>r.data));
  const { data: guestData } = useQuery(
    ['guests-qr', eventId],
    () => guestsAPI.list({ event_id: eventId, limit:200 }).then(r=>r.data),
    { enabled: !!eventId }
  );

  const events = evData?.data || [];
  const guests = guestData?.data || [];

  const download = (guestCode) => {
    const canvas = document.getElementById(`qr-${guestCode}`);
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${guestCode}-qr.png`;
    a.click();
  };

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>QR Codes</h1>
        <p style={{ color:'var(--text3)', fontSize:14 }}>Unique scannable codes for each guest</p>
      </div>

      <div style={{ display:'flex', gap:12, marginBottom:24, alignItems:'center' }}>
        <select className="form-select" style={{ width:300 }} value={eventId} onChange={e=>setEventId(e.target.value)}>
          <option value="">Select event...</option>
          {events.map(e=><option key={e.id} value={e.id}>{e.emoji||'🎉'} {e.name}</option>)}
        </select>
        {eventId && guests.length > 0 && (
          <button className="btn btn-primary" onClick={()=>toast.success(`${guests.length} QR codes ready`)}>
            ⬛ Download All
          </button>
        )}
      </div>

      {!eventId && (
        <div className="card" style={{ textAlign:'center', padding:60 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⬛</div>
          <div style={{ color:'var(--text2)' }}>Select an event to view QR codes</div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
        {guests.map(g => {
          const verifyUrl = g.qr_token
            ? `${window.location.origin}/verify/${g.qr_token}`
            : `https://inviteflow-3.onrender.com/api/qr/verify/sample-${g.id}`;
          return (
            <div key={g.id} className="card card-sm" style={{ textAlign:'center' }}>
              <div style={{ fontWeight:500, marginBottom:4, fontSize:14 }}>{g.full_name}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:12 }}>{g.guest_code}</div>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                <div style={{ background:'#fff', padding:8, borderRadius:8 }}>
                  <QRCodeCanvas id={`qr-${g.guest_code}`} value={verifyUrl} size={100} level="M" />
                </div>
              </div>
              <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:10 }}>
                <span className={`badge ${g.rsvp_status==='confirmed'?'badge-green':g.rsvp_status==='declined'?'badge-red':'badge-yellow'}`}>
                  {g.rsvp_status||'pending'}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>download(g.guest_code)}>⬇ Save QR</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
