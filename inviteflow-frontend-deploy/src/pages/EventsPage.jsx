// ============================================================
//  EventsPage.jsx
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { eventsAPI } from '../services/api';
import toast from 'react-hot-toast';

function EventModal({ event, onClose, onSave }) {
  const { register, handleSubmit, formState:{ errors } } = useForm({ defaultValues: event || {} });
  const onSubmit = async (data) => {
    try {
      if (event?.id) { await eventsAPI.update(event.id, data); toast.success('Event updated!'); }
      else           { await eventsAPI.create(data);           toast.success('Event created!'); }
      onSave();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving event'); }
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{event?.id ? 'Edit Event' : 'Create Event'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Event Name *</label>
                <input className="form-input" placeholder="e.g. Annual Gala 2026"
                  {...register('name',{ required:'Name is required' })} />
                {errors.name && <span style={{ color:'var(--danger)',fontSize:12 }}>{errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" {...register('event_date',{ required:true })} />
              </div>
              <div className="form-group">
                <label className="form-label">Time *</label>
                <input className="form-input" type="time" {...register('event_time',{ required:true })} />
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Venue *</label>
                <input className="form-input" placeholder="Venue name" {...register('venue_name',{ required:true })} />
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Venue Address</label>
                <input className="form-input" placeholder="Full address" {...register('venue_address')} />
              </div>
              <div className="form-group">
                <label className="form-label">Emoji</label>
                <input className="form-input" placeholder="🎉" maxLength={2} {...register('emoji')} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={3} placeholder="Event description..." {...register('description')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{event?.id?'Save Changes':'Create Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EventsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const { data } = useQuery('events-all', () => eventsAPI.list({ limit:100 }).then(r=>r.data));
  const events = data?.data || [];

  const deleteMut = useMutation(id => eventsAPI.remove(id), {
    onSuccess: () => { qc.invalidateQueries('events-all'); toast.success('Event deleted'); },
  });

  const statusColors = { draft:'var(--text3)', active:'var(--success)', completed:'var(--accent2)', cancelled:'var(--danger)' };

  return (
    <>
      {modal !== null && (
        <EventModal event={modal === 'new' ? null : modal}
          onClose={()=>setModal(null)}
          onSave={()=>{ setModal(null); qc.invalidateQueries('events-all'); }} />
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>Events</h1>
          <p style={{ color:'var(--text3)', fontSize:14 }}>{events.length} events total</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setModal('new')}>+ New Event</button>
      </div>
      <div className="events-grid">
        {events.map(ev => (
          <div key={ev.id} className="event-card">
            <div className="event-banner" style={{ background:`linear-gradient(135deg,#0d1520,#1a0d28)` }}>
              <div className="event-banner-overlay" />
              <span style={{ fontSize:38, position:'relative', zIndex:1 }}>{ev.emoji||'🎉'}</span>
            </div>
            <div className="event-info">
              <div className="event-name">{ev.name}</div>
              <div className="event-meta">
                <span>📅 {ev.event_date} at {ev.event_time}</span>
                <span>📍 {ev.venue_name}</span>
                <span style={{ color: statusColors[ev.status], fontSize:11, textTransform:'uppercase', letterSpacing:'.8px', fontWeight:500 }}>
                  ● {ev.status}
                </span>
              </div>
            </div>
            <div className="event-footer">
              <div style={{ fontSize:12, color:'var(--text3)' }}>
                {ev.total_guests||0} guests · {ev.rsvp_confirmed||0} confirmed
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setModal(ev)}>✏</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/guests?event=${ev.id}`)}>Guests</button>
              </div>
            </div>
          </div>
        ))}
        <div className="event-card" style={{ cursor:'pointer', borderStyle:'dashed' }} onClick={()=>setModal('new')}>
          <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:40, minHeight:220 }}>
            <div style={{ fontSize:30, color:'var(--text3)' }}>+</div>
            <div style={{ color:'var(--text3)', fontSize:14 }}>Create New Event</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
//  QRCodesPage.jsx
// ============================================================
import { QRCodeCanvas } from 'qrcode.react';
import { guestsAPI, qrAPI } from '../services/api';

export function QRCodesPage() {
  const [eventId, setEventId] = useState('');
  const { data: evData }   = useQuery('events-all', () => eventsAPI.list({ limit:100 }).then(r=>r.data));
  const { data: guestData } = useQuery(
    ['guests-qr', eventId],
    () => guestsAPI.list({ event_id:eventId, limit:200 }).then(r=>r.data),
    { enabled:!!eventId }
  );
  const events = evData?.data || [];
  const guests = guestData?.data || [];

  const genAll = async () => {
    if (!eventId) return toast.error('Select event first');
    try {
      const { data } = await qrAPI.bulkGenerate(eventId);
      toast.success(data.message);
    } catch { toast.error('Generation failed'); }
  };

  const download = (guestCode, token) => {
    const canvas = document.getElementById(`qr-canvas-${guestCode}`);
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href=url; a.download=`${guestCode}-qr.png`; a.click();
  };

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>QR Codes</h1>
          <p style={{ color:'var(--text3)', fontSize:14 }}>Unique scannable codes for each guest</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <select className="form-select" style={{ width:260 }} value={eventId} onChange={e=>setEventId(e.target.value)}>
            <option value="">Select event...</option>
            {events.map(e=><option key={e.id} value={e.id}>{e.emoji} {e.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={genAll}>⬛ Generate All</button>
        </div>
      </div>

      {guests.length === 0 && eventId && (
        <div className="card" style={{ textAlign:'center', padding:60 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⬛</div>
          <div style={{ color:'var(--text2)' }}>No guests in this event yet</div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
        {guests.map(g => {
          const verifyUrl = g.qr_token
            ? `${window.location.origin}/verify/${g.qr_token}`
            : `${window.location.origin}/verify/sample-${g.id}`;
          return (
            <div key={g.id} className="card card-sm" style={{ textAlign:'center' }}>
              <div style={{ fontWeight:500, marginBottom:4, fontSize:14 }}>{g.full_name}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:12 }}>{g.guest_code}</div>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                <div style={{ background:'#fff', padding:8, borderRadius:8, display:'inline-block' }}>
                  <QRCodeCanvas id={`qr-canvas-${g.guest_code}`} value={verifyUrl} size={100} level="M" />
                </div>
              </div>
              <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap', marginBottom:10 }}>
                <span className={`badge ${g.rsvp_status==='confirmed'?'badge-green':g.rsvp_status==='declined'?'badge-red':'badge-yellow'}`}>
                  {g.rsvp_status||'pending'}
                </span>
                {g.attended_at && <span className="badge badge-blue">✓ Attended</span>}
              </div>
              <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>download(g.guest_code, g.qr_token)}>⬇ Save</button>
                <button className="btn btn-accent btn-sm" onClick={async ()=>{ await guestsAPI.generateQR(g.id); toast.success('QR regenerated'); }}>↺ Regen</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data format info */}
      {guests.length > 0 && (
        <div className="card" style={{ marginTop:20 }}>
          <div style={{ fontFamily:'Georgia,serif', fontSize:15, fontWeight:600, marginBottom:10 }}>QR Payload Format</div>
          <div style={{ background:'var(--bg4)', borderRadius:8, padding:14, fontFamily:'monospace', fontSize:12, color:'var(--text2)', lineHeight:1.8 }}>
            {`{\n  "gid": "guest-uuid",\n  "eid": "event-uuid",\n  "code": "G-00001",\n  "iat": 1700000000,\n  "exp": 1731536000\n}`}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:8 }}>
            Signed with HS256 · Verify at: <code style={{ color:'var(--accent2)' }}>{window.location.origin}/verify/:token</code>
          </div>
        </div>
      )}
    </>
  );
}

export default EventsPage;
