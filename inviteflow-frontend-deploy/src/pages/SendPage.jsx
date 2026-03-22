// ============================================================
//  SendPage.jsx
// ============================================================
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { eventsAPI, guestsAPI, invitationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const DEFAULT_TEMPLATE = `Dear {guest_name},

You are cordially invited to {event_name}.

📅 Date: {event_date}
🕖 Time: {event_time}
📍 Venue: {venue_name}

Your QR code: {qr_link}
Confirm attendance: {rsvp_link}

We look forward to seeing you!`;

export default function SendPage() {
  const [eventId,   setEventId]   = useState('');
  const [channel,   setChannel]   = useState('sms');
  const [provider,  setProvider]  = useState('africas_talking');
  const [template,  setTemplate]  = useState(DEFAULT_TEMPLATE);
  const [sending,   setSending]   = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendMode,  setSendMode]  = useState('unsent'); // 'unsent' | 'all' | 'confirmed'

  const { data: evData } = useQuery('events-all', () => eventsAPI.list({ limit:100 }).then(r=>r.data));
  const events = evData?.data || [];

  const { data: guestData } = useQuery(
    ['guests-send', eventId],
    () => guestsAPI.list({ event_id: eventId, limit:500 }).then(r=>r.data),
    { enabled: !!eventId }
  );
  const allGuests   = guestData?.data || [];
  const unsentGuests = allGuests.filter(g => !g.sent_at);
  const confirmedGuests = allGuests.filter(g => g.rsvp_status === 'confirmed');

  const recipientCount = sendMode === 'all' ? allGuests.length
    : sendMode === 'confirmed' ? confirmedGuests.length
    : unsentGuests.length;

  const handleSendAll = async () => {
    if (!eventId) return toast.error('Please select an event');
    if (recipientCount === 0) return toast.error('No recipients to send to');
    setSending(true);
    try {
      const { data } = await invitationsAPI.sendAll({ event_id: eventId, channel, template, provider });
      toast.success(`✓ ${data.data.sent} invitations sent!`);
      if (data.data.failed > 0) toast.error(`${data.data.failed} failed`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone) return toast.error('Enter a test phone number');
    try {
      await invitationsAPI.sendTest({ phone: testPhone, message: template.replace(/{[^}]+}/g,'[sample]'), channel });
      toast.success('Test message sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed');
    }
  };

  const selectedEvent = events.find(e => e.id === eventId);
  const previewMsg = template
    .replace(/{guest_name}/g,  'Amina Hassan')
    .replace(/{event_name}/g,  selectedEvent?.name || 'Annual Gala 2025')
    .replace(/{event_date}/g,  selectedEvent?.event_date || '15 Dec 2025')
    .replace(/{event_time}/g,  selectedEvent?.event_time || '19:00')
    .replace(/{venue_name}/g,  selectedEvent?.venue_name || 'Grand Ballroom')
    .replace(/{qr_link}/g,     'https://inviteflow.app/verify/xxxxx')
    .replace(/{rsvp_link}/g,   'https://inviteflow.app/rsvp/xxxxx');

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:600 }}>Send Invitations</h1>
        <p style={{ color:'var(--text3)', fontSize:14 }}>Compose and dispatch personalised invitations</p>
      </div>

      <div className="row" style={{ alignItems:'flex-start', gap:20 }}>
        {/* Compose */}
        <div style={{ flex:1.4, minWidth:0 }}>
          <div className="card">
            <div style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:600, marginBottom:20 }}>Compose Message</div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Event</label>
                <select className="form-select" value={eventId} onChange={e=>setEventId(e.target.value)}>
                  <option value="">Select event...</option>
                  {events.map(e=><option key={e.id} value={e.id}>{e.emoji} {e.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Channel</label>
                <div style={{ display:'flex', gap:10 }}>
                  {[['sms','📱 SMS'],['whatsapp','💬 WhatsApp']].map(([val,label]) => (
                    <label key={val} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                      padding:'10px 16px', flex:1, borderRadius:9,
                      border: `1px solid ${channel===val?'var(--accent)':'var(--border2)'}`,
                      background: channel===val?'rgba(108,124,255,.1)':'transparent' }}>
                      <input type="radio" name="channel" checked={channel===val} onChange={()=>setChannel(val)} style={{ accentColor:'var(--accent)' }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">SMS Provider</label>
                <select className="form-select" value={provider} onChange={e=>setProvider(e.target.value)}>
                  <option value="africas_talking">Africa's Talking</option>
                  <option value="twilio">Twilio</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Message Template</label>
                <textarea className="form-textarea" rows={9} value={template}
                  onChange={e=>setTemplate(e.target.value)}
                  style={{ fontFamily:'monospace', fontSize:13, lineHeight:1.7 }} />
              </div>

              <div style={{ background:'var(--bg4)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--text3)', lineHeight:1.8 }}>
                <strong>Available variables:</strong> {'{guest_name}'} {'{event_name}'} {'{event_date}'} {'{event_time}'} {'{venue_name}'} {'{qr_link}'} {'{rsvp_link}'}
              </div>

              <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
                <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>Test before sending:</div>
                <div style={{ display:'flex', gap:10 }}>
                  <input className="form-input" placeholder="+255700000000" value={testPhone}
                    onChange={e=>setTestPhone(e.target.value)} style={{ flex:1 }} />
                  <button className="btn btn-ghost" onClick={handleTest}>🧪 Send Test</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipients + Send */}
        <div style={{ flex:1, minWidth:0 }}>
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:600, marginBottom:16 }}>Recipients</div>

            {[
              ['unsent',    `Unsent only (${unsentGuests.length})`],
              ['all',       `All guests (${allGuests.length})`],
              ['confirmed', `Confirmed RSVP (${confirmedGuests.length})`],
            ].map(([val,label]) => (
              <label key={val} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer',
                padding:'10px 14px', borderRadius:9, marginBottom:6,
                border:`1px solid ${sendMode===val?'var(--gold3)':'var(--border2)'}`,
                background:sendMode===val?'rgba(212,168,67,.05)':'transparent' }}>
                <input type="radio" name="sendmode" checked={sendMode===val} onChange={()=>setSendMode(val)} style={{ accentColor:'var(--gold2)' }} />
                <span style={{ fontSize:14 }}>{label}</span>
              </label>
            ))}

            <div style={{ margin:'14px 0', padding:'12px 14px', background:'var(--bg4)', borderRadius:9, fontSize:13 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ color:'var(--text2)' }}>Will send to:</span>
                <span style={{ fontWeight:600, color:'var(--gold2)' }}>{recipientCount} recipients</span>
              </div>
              {allGuests.length > 0 && (
                <>
                  <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,var(--gold3),var(--gold2))',
                      width:`${Math.round(allGuests.filter(g=>g.sent_at).length/allGuests.length*100)}%`, transition:'.6s' }} />
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>
                    {allGuests.filter(g=>g.sent_at).length}/{allGuests.length} already sent
                  </div>
                </>
              )}
            </div>

            <button className="btn btn-primary" disabled={sending || recipientCount===0}
              style={{ width:'100%', justifyContent:'center', padding:11 }}
              onClick={handleSendAll}>
              {sending ? 'Sending...' : `📤 Send to ${recipientCount} Guests`}
            </button>
          </div>

          {/* Preview */}
          <div className="card">
            <div style={{ fontFamily:'Georgia,serif', fontSize:16, fontWeight:600, marginBottom:14 }}>Message Preview</div>
            <div style={{ background:'var(--bg4)', borderRadius:10, padding:14, fontSize:13, color:'var(--text2)',
              lineHeight:1.9, whiteSpace:'pre-wrap', fontFamily:'monospace', maxHeight:280, overflowY:'auto' }}>
              {previewMsg}
            </div>
            <div style={{ marginTop:10, fontSize:12, color:'var(--text3)' }}>
              ~{previewMsg.length} chars · approx {Math.ceil(previewMsg.length/160)} SMS segment{previewMsg.length>160?'s':''}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
