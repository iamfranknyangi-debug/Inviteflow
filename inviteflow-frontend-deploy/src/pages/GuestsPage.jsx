// ============================================================
//  GuestsPage.jsx — full CRUD, bulk import, search, filter
// ============================================================
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { guestsAPI, eventsAPI } from '../services/api';

// ── Status badge ─────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    confirmed: ['badge-green', '✓ Confirmed'],
    pending:   ['badge-yellow','⏳ Pending'],
    declined:  ['badge-red',   '✗ Declined'],
    sent:      ['badge-green', '✓ Sent'],
    not_sent:  ['badge-gray',  'Not Sent'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Add / Edit Modal ──────────────────────────────────────────
function GuestModal({ guest, events, onClose, onSave }) {
  const { register, handleSubmit, formState:{ errors } } = useForm({
    defaultValues: guest || {}
  });

  const onSubmit = async (data) => {
    try {
      if (guest?.id) {
        await guestsAPI.update(guest.id, data);
        toast.success('Guest updated!');
      } else {
        await guestsAPI.create(data);
        toast.success('Guest added!');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving guest');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{guest?.id ? 'Edit Guest' : 'Add New Guest'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Guest full name"
                  {...register('full_name', { required:'Full name is required' })} />
                {errors.full_name && <span style={{ color:'var(--danger)', fontSize:12 }}>{errors.full_name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-input" placeholder="+255700000000"
                  {...register('phone', { required:'Phone is required' })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="optional"
                  {...register('email')} />
              </div>
              {!guest?.id && (
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Event *</label>
                  <select className="form-select" {...register('event_id', { required:'Event is required' })}>
                    <option value="">Select event...</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Table Number</label>
                <input className="form-input" placeholder="e.g. T-05" {...register('table_number')} />
              </div>
              <div className="form-group" style={{ justifyContent:'center', paddingTop:20 }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                  <input type="checkbox" {...register('is_vip')} />
                  <span className="form-label" style={{ margin:0 }}>VIP Guest</span>
                </label>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" placeholder="Dietary requirements, special notes..."
                  {...register('notes')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {guest?.id ? 'Save Changes' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bulk Upload Modal ─────────────────────────────────────────
function BulkModal({ events, onClose, onDone }) {
  const [eventId, setEventId] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    onDrop: setFiles,
  });

  const handleUpload = async () => {
    if (!eventId) return toast.error('Select an event first');
    if (!files.length) return toast.error('Select a file first');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', files[0]);
      fd.append('event_id', eventId);
      const { data } = await guestsAPI.bulkUpload(fd);
      toast.success(data.message);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Bulk Upload Guests</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group" style={{ marginBottom:16 }}>
            <label className="form-label">Event</label>
            <select className="form-select" value={eventId} onChange={e=>setEventId(e.target.value)}>
              <option value="">Select event...</option>
              {events.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div {...getRootProps()} className="upload-area" style={{ borderColor: isDragActive ? 'var(--gold3)':undefined }}>
            <input {...getInputProps()} />
            <div style={{ fontSize:32, marginBottom:10 }}>📄</div>
            <div style={{ fontWeight:500, marginBottom:6 }}>
              {files.length ? files[0].name : 'Drop CSV / Excel file here or click to browse'}
            </div>
            <div style={{ fontSize:13, color:'var(--text3)' }}>
              Columns: <strong>Full Name</strong>, <strong>Phone</strong> (and optionally Email)
            </div>
          </div>

          {files.length > 0 && (
            <div className="badge badge-green" style={{ marginTop:12 }}>
              ✓ {files[0].name} ({Math.round(files[0].size/1024)} KB)
            </div>
          )}

          <div style={{ background:'var(--bg4)', borderRadius:8, padding:12, marginTop:16, fontSize:12, color:'var(--text3)', lineHeight:1.8 }}>
            <strong>CSV format example:</strong><br/>
            Full Name,Phone,Email<br/>
            Amina Hassan,+255712345001,amina@email.com<br/>
            James Kiprotich,+255712345002,
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
            {loading ? 'Uploading...' : '⬆ Import Guests'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function GuestsPage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [eventFilter, setEvent]   = useState('');
  const [modal, setModal]         = useState(null); // null | 'add' | {guest}
  const [bulk, setBulk]           = useState(false);

  const { data: evData } = useQuery('events-all', () => eventsAPI.list({ limit:100 }).then(r=>r.data));
  const events = evData?.data || [];

  const params = { limit:100 };
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (eventFilter) params.event_id = eventFilter;

  const { data, isLoading } = useQuery(
    ['guests', search, statusFilter, eventFilter],
    () => guestsAPI.list(params).then(r=>r.data)
  );
  const guests = data?.data || [];

  const deleteMutation = useMutation(
    (id) => guestsAPI.remove(id),
    { onSuccess: () => { qc.invalidateQueries('guests'); toast.success('Guest removed'); } }
  );

  const genQR = async (id, name) => {
    try {
      await guestsAPI.generateQR(id);
      toast.success(`QR generated for ${name}`);
      qc.invalidateQueries('guests');
    } catch { toast.error('QR generation failed'); }
  };

  return (
    <>
      {modal === 'add' && (
        <GuestModal events={events} onClose={()=>setModal(null)}
          onSave={()=>{ setModal(null); qc.invalidateQueries('guests'); }} />
      )}
      {modal?.id && (
        <GuestModal guest={modal} events={events} onClose={()=>setModal(null)}
          onSave={()=>{ setModal(null); qc.invalidateQueries('guests'); }} />
      )}
      {bulk && (
        <BulkModal events={events} onClose={()=>setBulk(false)}
          onDone={()=>{ setBulk(false); qc.invalidateQueries('guests'); }} />
      )}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>Guest Management</h1>
        <p style={{ color:'var(--text3)', fontSize:14 }}>{guests.length} guests total</p>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search name, phone, ID..."
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width:180 }} value={eventFilter} onChange={e=>setEvent(e.target.value)}>
          <option value="">All Events</option>
          {events.map(e=><option key={e.id} value={e.id}>{e.emoji} {e.name}</option>)}
        </select>
        <select className="form-select" style={{ width:160 }} value={statusFilter} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="declined">Declined</option>
        </select>
        <div style={{ flex:1 }} />
        <button className="btn btn-ghost" onClick={()=>setBulk(true)}>⬆ Bulk Upload</button>
        <button className="btn btn-primary" onClick={()=>setModal('add')}>+ Add Guest</button>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Phone</th>
                <th>Event</th>
                <th>RSVP</th>
                <th>Invited</th>
                <th>Attended</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>Loading...</td></tr>
              )}
              {!isLoading && guests.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>
                  No guests found. <button className="btn btn-ghost btn-sm" onClick={()=>setModal('add')}>Add one →</button>
                </td></tr>
              )}
              {guests.map(g => (
                <tr key={g.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {g.is_vip && <span title="VIP">⭐</span>}
                      <div>
                        <div style={{ fontWeight:500 }}>{g.full_name}</div>
                        <div style={{ fontSize:12, color:'var(--text3)' }}>{g.guest_code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize:13, color:'var(--text2)' }}>{g.phone}</td>
                  <td style={{ fontSize:13 }}>{events.find(e=>e.id===g.event_id)?.name?.substring(0,20)||'—'}</td>
                  <td><Badge status={g.rsvp_status || 'pending'} /></td>
                  <td><Badge status={g.sent_at ? 'sent' : 'not_sent'} /></td>
                  <td>{g.attended_at
                    ? <span className="badge badge-blue">✓ Scanned</span>
                    : <span className="badge badge-gray">—</span>}</td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setModal(g)} title="Edit">✏</button>
                      <button className="btn btn-accent btn-sm" onClick={()=>genQR(g.id, g.full_name)} title="Generate QR">⬛</button>
                      <button className="btn btn-danger btn-sm" title="Delete"
                        onClick={()=>{ if(window.confirm(`Delete ${g.full_name}?`)) deleteMutation.mutate(g.id); }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
