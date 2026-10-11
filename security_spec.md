# Firestore Security Specification

## 1. Data Invariants
1. **Dispatcher & Admin Privilege**: Administrative dispatch operations (creating, editing, and deleting scheduled visits, unscheduled jobs, clients, staff roster, van assignments, quotes, and invoices) are restricted to authenticated dispatch staff and verified administrators (`cleaningserviceyeg@gmail.com`).
2. **Schema Integrity**: Every document written to `/clients/{clientId}`, `/scheduledVisits/{visitId}`, `/unscheduledJobs/{jobId}`, `/quotes/{quoteId}`, `/invoices/{invoiceId}`, and `/vanOverrides/{vanId}` must conform strictly to defined field schemas. No unexpected keys or prototype poisoning.
3. **Identifier Sanitization**: Document IDs must be alphanumeric strings matching `^[a-zA-Z0-9_\-]+$` and not exceeding 128 characters.
4. **Denial of Wallet Protection**: All string fields are constrained with `.size() <= MAX` (e.g., names <= 120 chars, addresses <= 300 chars, phone numbers <= 30 chars). Unbounded arrays are forbidden; array fields such as tags have a strict length limit (`<= 20`).
5. **Temporal Integrity**: State timestamps such as `updatedAt` and `createdAt` must match server timestamps (`request.time`) or strictly preserved values.

---

## 2. The "Dirty Dozen" Payloads (Security Attack Vectors)

### Payload 1: Unauthorized Client Insertion (Unauthenticated Attacker)
```json
{
  "collection": "clients",
  "auth": null,
  "data": {
    "name": "Hacker Client",
    "phone": "780-000-0000"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 2: Massive String Buffer Overflow in Client Phone ("Denial of Wallet")
```json
{
  "collection": "clients",
  "auth": { "uid": "unverified-user", "email": "attacker@evil.com", "email_verified": false },
  "data": {
    "name": "John Doe",
    "phone": "7809999999".repeat(1000)
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 3: Shadow Field Injection in Client Record
```json
{
  "collection": "clients",
  "auth": { "uid": "staff-user-1", "email": "staff@example.com", "email_verified": true },
  "data": {
    "id": "cli-123",
    "name": "Legit Name",
    "phone": "780-555-1234",
    "isAdmin": true,
    "systemRole": "superadmin"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 4: Invalid Document ID Traversal
```json
{
  "collection": "clients",
  "docId": "../../etc/passwd",
  "auth": { "uid": "staff-user-1", "email": "staff@example.com", "email_verified": true },
  "data": { "name": "Directory Traversal Test" },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 5: Unverified Email Privilege Escalation (Email Spoofing)
```json
{
  "collection": "admins",
  "docId": "spoofed-admin",
  "auth": { "uid": "spoofed-uid", "email": "cleaningserviceyeg@gmail.com", "email_verified": false },
  "data": { "role": "admin" },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 6: Array Size Exhaustion on Client Tags
```json
{
  "collection": "clients",
  "docId": "cli-456",
  "auth": { "uid": "staff-1", "email": "staff@example.com", "email_verified": true },
  "data": {
    "name": "Jane Doe",
    "phone": "780-555-5678",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15", "tag16", "tag17", "tag18", "tag19", "tag20", "tag21", "tag22"]
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 7: Scheduled Visit State Shortcutting & Unauthorized Van ID
```json
{
  "collection": "scheduledVisits",
  "auth": null,
  "data": {
    "id": "visit-999",
    "vanId": "van-invalid",
    "status": "COMPLETED"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 8: Invoice Total Tampering
```json
{
  "collection": "invoices",
  "docId": "inv-101",
  "auth": null,
  "data": {
    "totalAmount": -5000,
    "status": "PAID"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 9: Quote Document Deletion by Anonymous User
```json
{
  "collection": "quotes",
  "docId": "q-101",
  "operation": "delete",
  "auth": null,
  "expected": "PERMISSION_DENIED"
}
```

### Payload 10: Van Hub Override Injection by Non-Admin
```json
{
  "collection": "vanOverrides",
  "docId": "van-1",
  "auth": { "uid": "anonymous", "email_verified": false },
  "data": {
    "customVanName": "Hacked Fleet Unit",
    "cleanerName": "Unauthorized"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 11: PII Blanket Read by Unauthenticated Client
```json
{
  "collection": "clients",
  "operation": "list",
  "auth": null,
  "expected": "PERMISSION_DENIED"
}
```

### Payload 12: Admin Self-Assignment in Admins Collection
```json
{
  "collection": "admins",
  "docId": "attacker-uid",
  "auth": { "uid": "attacker-uid", "email": "attacker@evil.com", "email_verified": true },
  "data": { "role": "admin" },
  "expected": "PERMISSION_DENIED"
}
```

---

## 3. The Test Runner Spec
Tests verify that all unauthenticated, unverified, oversized, and schema-violating operations are rejected by Firestore Security Rules.
