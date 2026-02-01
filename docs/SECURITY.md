# Security Considerations

This document outlines the security measures implemented in the IAM System and provides guidance for secure deployment.

## Authentication Security

### Password Storage
- **Algorithm**: bcrypt with cost factor 12
- **Why bcrypt**: Adaptive hash function, resistant to GPU/ASIC attacks
- **Password Policy**: Minimum 8 characters, must contain uppercase, lowercase, number, and special character

### Session Management
- **JWT Tokens**: Short-lived (15 minutes) access tokens
- **Secure Storage**: HTTP-only cookies prevent XSS token theft
- **Session Invalidation**: Logout invalidates session in database
- **Token Hashing**: Tokens stored as SHA-256 hashes, not plaintext

### Multi-Factor Authentication (MFA)
- **Standard**: TOTP per RFC 6238
- **Secret Storage**: AES-256-GCM encrypted at rest
- **Time Window**: 30-second validity with ±1 step tolerance
- **Rate Limited**: 3 attempts per 5 minutes

## Authorization Security

### Role-Based Access Control (RBAC)
- **Principle of Least Privilege**: Users receive minimum necessary permissions
- **Three-Tier Roles**:
  - Admin: Full system access
  - User: Self-service only
  - Auditor: Read-only log access

### Permission Enforcement
- **Middleware-Based**: Permissions checked at route level
- **Database-Level**: Foreign key constraints prevent orphaned records
- **Logged Denials**: Unauthorized access attempts are audited

## Audit Trail Integrity

### Append-Only Logs
- **Database Triggers**: Prevent UPDATE and DELETE on audit_logs table
- **Hash Chaining**: Each log entry contains hash of previous entry
- **Verification Endpoint**: `/api/logs/integrity` validates chain

### What's Logged
- Login attempts (success/failure)
- MFA verification attempts
- User CRUD operations
- Role assignments/revocations
- Resource access
- Log exports

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| Login | 5 attempts | 15 minutes |
| MFA Verification | 3 attempts | 5 minutes |
| Password Reset | 3 attempts | 1 hour |
| Account Creation | 5 accounts | 1 hour |

## Account Protection

### Account Lockout
- **Trigger**: 5 consecutive failed login attempts
- **Duration**: 15 minutes
- **Reset**: Successful login resets counter

### Active Account Check
- Deactivated accounts cannot authenticate
- Sessions invalidated on deactivation
- Admin can toggle account status

## API Security

### Input Validation
- **Joi Schemas**: All inputs validated against schemas
- **Parameterized Queries**: SQL injection prevention
- **Type Coercion**: Strict type checking

### HTTP Security Headers (via Helmet.js)
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security (production)

### CORS Configuration
- Allowed origins configured via environment
- Credentials permitted for cookie-based auth
- Preflight caching enabled

## Encryption

### At Rest
- **TOTP Secrets**: AES-256-GCM encryption
- **Key Management**: Application-level key in environment

### In Transit
- HTTPS required in production
- TLS 1.2+ recommended

## Deployment Recommendations

### Production Checklist
- [ ] Change all default credentials
- [ ] Set strong JWT_SECRET and MFA_ENCRYPTION_KEY
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall to restrict database access
- [ ] Set NODE_ENV=production
- [ ] Enable database SSL
- [ ] Configure reverse proxy (nginx)
- [ ] Set up log rotation
- [ ] Enable database backups

### Environment Variables
```bash
# CRITICAL: Change these in production!
JWT_SECRET=<64+ character random string>
MFA_ENCRYPTION_KEY=<exactly 32 characters>
SESSION_SECRET=<64+ character random string>
DATABASE_URL=postgresql://user:password@host:5432/iam_db?sslmode=require
```

### Database Security
- Create dedicated database user with minimal privileges
- Enable connection SSL
- Regular security patches
- Daily backups with encryption

## Threat Model

### Addressed Threats
| Threat | Mitigation |
|--------|------------|
| Credential Stuffing | Rate limiting, account lockout |
| Brute Force | Strong password policy, lockout |
| Session Hijacking | HTTP-only cookies, short expiry |
| MFA Bypass | Encrypted secrets, rate limiting |
| SQL Injection | Parameterized queries |
| XSS | CSP headers, input sanitization |
| CSRF | SameSite cookies |
| Log Tampering | Hash chaining, DB triggers |
| Privilege Escalation | RBAC, permission middleware |

### Known Limitations
- No hardware security module (HSM) integration
- Single encryption key for all TOTP secrets
- In-memory rate limiting (lost on restart)
- No IP reputation checking

## Incident Response

### Security Events to Monitor
1. Multiple failed login attempts
2. MFA verification failures
3. Unauthorized access attempts (RESOURCE_DENIED)
4. Admin actions on critical accounts
5. Bulk user exports

### Log Retention
- Default: Indefinite (for compliance)
- Recommend: 90 days minimum, 2 years for compliance

## Compliance Alignment

This implementation aligns with:
- **OWASP Top 10** - Addresses injection, broken auth, sensitive data exposure
- **NIST 800-63** - Multi-factor authentication guidance
- **CIS Controls** - Account management, audit logging
- **GDPR** - Audit trails for accountability
