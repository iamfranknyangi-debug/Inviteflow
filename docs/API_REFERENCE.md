# InviteFlow — Complete API Reference

**Base URL:** `https://inviteflow.app/api`  
**Authentication:** Bearer JWT in `Authorization` header  
**Content-Type:** `application/json` (unless uploading files)

---

## Authentication

### POST /auth/login
Login and receive a JWT token.

**Request:**
```json
{ "username": "admin", "password": "admin123" }
```
**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "uuid", "username": "admin", "email": "admin@inviteflow.app", "role": "superadmin" }
}
```

### GET /auth/me
Get current authenticated user.

### PUT /auth/me
Update profile: `{ full_name, email }`

### POST /auth/change-password
`{ current_password, new_password }`

### POST /auth/logout
Invalidates session (client must also discard token).

---

## Events

### GET /events
List all events with summary stats.
**Query:** `?status=active&page=1&limit=20`

### POST /events
Create a new event.
```json
{
  "name": "Annual Gala 2026",
  "event_date": "2026-12-15",
  "event_time": "19:00",
  "venue_name": "Grand Ballroom, Serena Hotel",
  "venue_address": "Ohio Street, Dar es Salaam",
  "venue_city": "Dar es Salaam",
  "emoji": "🎉",
  "status": "draft",
  "max_guests": 300
}
```

### GET /events/:id
Get single event details.

### PUT /events/:id
Update event (same body as POST).

### DELETE /events/:id
Delete event and all associated guests/invitations.

### GET /events/:id/summary
Get event stats: total_guests, invitations_sent, rsvp_confirmed, rsvp_declined, attended.

---

## Guests

### GET /guests
List guests with RSVP, invitation, attendance status.
**Query:** `?event_id=uuid&status=confirmed&search=Amina&page=1&limit=50`

### POST /guests
Add a single guest.
```json
{
  "event_id": "uuid",
  "full_name": "Amina Hassan",
  "phone": "+255712345001",
  "email": "amina@email.com",
  "table_number": "T-05",
  "is_vip": false,
  "notes": "Vegetarian"
}
```
Auto-creates RSVP record with status `pending`.  
Auto-generates guest code: `G-00001`.

### POST /guests/bulk
Upload CSV or Excel file with guest list.
- `Content-Type: multipart/form-data`
- Fields: `event_id` (text), `file` (CSV/XLSX)
- CSV columns: `Full Name`, `Phone`, `Email` (optional)
- Returns `{ jobId }` — process is async; poll job status.

```bash
curl -X POST /api/guests/bulk \
  -H "Authorization: Bearer TOKEN" \
  -F "event_id=uuid" \
  -F "file=@guests.csv"
```

### GET /guests/:id
Single guest with full RSVP + attendance details.

### PUT /guests/:id
Update guest: `{ full_name, phone, email, notes, table_number, is_vip }`

### DELETE /guests/:id
Remove guest (cascades to RSVP, invitations, attendance, QR code).

### POST /guests/:id/qr
Generate (or regenerate) QR code for this guest.
**Response:** `{ token, verify_url, qr_image_url }`

### GET /guests/:id/qr/image
Download QR code as PNG file.

---

## Invitations (SMS / WhatsApp)

### GET /invitations
List all invitations.
**Query:** `?event_id=uuid&status=sent&page=1&limit=50`

### POST /invitations/send
Send to specific guests.
```json
{
  "event_id": "uuid",
  "guest_ids": ["uuid1", "uuid2"],
  "channel": "sms",
  "provider": "africas_talking",
  "template": "Dear {guest_name}, you are invited to {event_name}..."
}
```
**Template variables:** `{guest_name}` `{event_name}` `{event_date}` `{event_time}` `{venue_name}` `{qr_link}` `{rsvp_link}`

### POST /invitations/send-all
Send to ALL unsent guests in an event.
```json
{ "event_id": "uuid", "channel": "sms", "provider": "africas_talking" }
```

### POST /invitations/test
Send a test message to a phone number.
```json
{ "phone": "+255712345001", "message": "Test message", "channel": "sms" }
```

---

## QR Codes

### GET /qr/verify/:token  *(Public — no auth)*
Scan/verify a QR code. Returns guest + event info, RSVP status.  
Used when camera scans the QR code.

### POST /qr/scan/:token  *(Public — no auth)*
Mark guest as attended (check-in at event entrance).  
Returns `{ already_checked_in, message }`.

### POST /qr/generate/:guestId  *(Auth required)*
Regenerate QR code for a guest.

### GET /qr/bulk/:eventId  *(Auth required)*
Generate QR codes for all guests in an event.

---

## RSVP

### GET /rsvp/:token  *(Public)*
Get guest RSVP page data (used for the public RSVP form).

### POST /rsvp/:token  *(Public)*
Guest submits RSVP response.
```json
{ "status": "confirmed", "plus_ones": 1, "response_note": "Bringing my spouse" }
```
Status options: `confirmed` | `declined` | `maybe`

### GET /rsvp/event/:eventId  *(Auth)*
List all RSVP responses for an event.

### PUT /rsvp/guest/:guestId  *(Auth)*
Admin overrides RSVP status.
```json
{ "status": "confirmed", "plus_ones": 0, "response_note": "" }
```

---

## Reports

### GET /reports/dashboard
Overall stats across all events for the authenticated admin.
```json
{
  "total_events": 4,
  "total_guests": 517,
  "invitations_sent": 433,
  "rsvp_confirmed": 347,
  "rsvp_declined": 42,
  "rsvp_pending": 128,
  "total_attended": 201
}
```

### GET /reports/event/:eventId
Per-event breakdown including daily send trend, channel breakdown, VIP list.

### GET /reports/export/:eventId
Download guest list as CSV or JSON.
**Query:** `?format=csv` or `?format=json`

---

## Invitation Cards

### GET /cards/:eventId
Get card design for an event.

### POST /cards/:eventId
Save/update card design.
```json
{
  "title_text": "Annual Gala 2026",
  "subtitle_text": "An Evening of Elegance",
  "body_message": "You are cordially invited...",
  "footer_text": "Dress code: Black tie",
  "primary_color": "#d4a843",
  "text_color": "#ffffff"
}
```

### POST /cards/:eventId/background
Upload background image.
- `Content-Type: multipart/form-data`
- Field: `image` (JPG/PNG, max 10MB)

### POST /cards/:eventId/preview
Generate preview PNG for a specific guest.
```json
{ "guest_name": "Amina Hassan" }
```
Returns PNG image binary.

### POST /cards/:eventId/generate-all
Generate personalised PNG card for every guest in the event.  
Cards uploaded to S3 / local storage.

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400  | Validation error — check `message` field |
| 401  | Missing or invalid JWT token |
| 403  | Insufficient role permissions |
| 404  | Resource not found |
| 409  | Conflict (duplicate phone, etc.) |
| 422  | Business rule violation |
| 429  | Rate limit exceeded (100 req/15min) |
| 500  | Internal server error |

All error responses follow:
```json
{ "success": false, "message": "Human-readable error" }
```

---

## Rate Limits

- General API: **100 requests per 15 minutes** per IP
- Auth endpoints: **10 requests per 15 minutes** per IP
- File upload: max **10MB** per file

---

## WebSocket Events (Future)

Planned real-time events via Socket.io:

| Event | Payload |
|-------|---------|
| `guest:checked_in` | `{ guestId, guestName, eventId, timestamp }` |
| `rsvp:updated`     | `{ guestId, status }` |
| `invitation:sent`  | `{ guestId, channel, messageId }` |

---

## Africa's Talking SMS Setup

1. Sign up at [africastalking.com](https://africastalking.com)
2. Create an application
3. Get API key and username
4. Set `AT_ENVIRONMENT=sandbox` for testing (free)
5. Set `AT_ENVIRONMENT=production` for live SMS
6. Fund your AT wallet (Tanzania: ~TZS 100–150 per SMS)

## Twilio WhatsApp Setup

1. Create Twilio account at [twilio.com](https://twilio.com)
2. Enable WhatsApp Sandbox in console
3. Configure webhook URL: `https://inviteflow.app/api/twilio/webhook`
4. For production: submit WhatsApp Business profile for approval
