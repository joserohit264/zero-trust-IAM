# Database Schema Documentation

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐          │
│    │    users     │◄──────│  user_roles  │──────►│    roles     │          │
│    │──────────────│       │──────────────│       │──────────────│          │
│    │ id (PK)      │       │ id (PK)      │       │ id (PK)      │          │
│    │ username     │       │ user_id (FK) │       │ name         │          │
│    │ email        │       │ role_id (FK) │       │ description  │          │
│    │ password_hash│       │ assigned_at  │       │ permissions  │          │
│    │ totp_secret  │       │ assigned_by  │       │ created_at   │          │
│    │ mfa_enabled  │       └──────────────┘       │ updated_at   │          │
│    │ is_active    │                              └──────────────┘          │
│    │ last_login   │                                                        │
│    │ created_at   │       ┌──────────────┐                                 │
│    │ updated_at   │◄──────│  sessions    │                                 │
│    └──────────────┘       │──────────────│                                 │
│           ▲               │ id (PK)      │                                 │
│           │               │ user_id (FK) │                                 │
│           │               │ token_hash   │                                 │
│           │               │ ip_address   │                                 │
│           │               │ mfa_verified │                                 │
│           │               │ expires_at   │                                 │
│           │               │ created_at   │                                 │
│           │               └──────────────┘                                 │
│           │                                                                │
│    ┌──────────────┐                                                        │
│    │  audit_logs  │                                                        │
│    │──────────────│                                                        │
│    │ id (PK)      │                                                        │
│    │ user_id (FK) │                                                        │
│    │ username     │                                                        │
│    │ action_type  │                                                        │
│    │ resource     │                                                        │
│    │ ip_address   │                                                        │
│    │ metadata     │                                                        │
│    │ success      │                                                        │
│    │ previous_hash│                                                        │
│    │ current_hash │                                                        │
│    │ created_at   │                                                        │
│    └──────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tables

### users
Primary table for user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Login username |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| first_name | VARCHAR(100) | | User first name |
| last_name | VARCHAR(100) | | User last name |
| totp_secret_encrypted | TEXT | | Encrypted TOTP secret |
| mfa_enabled | BOOLEAN | DEFAULT FALSE | MFA status |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| last_login | TIMESTAMPTZ | | Last successful login |
| failed_login_attempts | INTEGER | DEFAULT 0 | Failed login counter |
| locked_until | TIMESTAMPTZ | | Account lockout expiry |
| created_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Last update time |

### roles
System roles for RBAC.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Role name |
| description | TEXT | | Role description |
| permissions | JSONB | NOT NULL, DEFAULT '[]' | Array of permissions |
| created_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Last update time |

### user_roles
Junction table for user-role assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, ON DELETE CASCADE | User reference |
| role_id | UUID | FK → roles.id, ON DELETE CASCADE | Role reference |
| assigned_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Assignment time |
| assigned_by | UUID | FK → users.id | Admin who assigned |

### audit_logs
Append-only audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id | Acting user |
| username | VARCHAR(50) | | Denormalized username |
| action_type | VARCHAR(50) | NOT NULL | Action category |
| resource | VARCHAR(255) | | Affected resource |
| resource_id | UUID | | Resource identifier |
| ip_address | INET | | Client IP |
| user_agent | TEXT | | Browser user agent |
| metadata | JSONB | DEFAULT '{}' | Additional context |
| success | BOOLEAN | DEFAULT TRUE | Success/failure |
| error_message | TEXT | | Error details |
| previous_hash | VARCHAR(64) | | Hash chain link |
| current_hash | VARCHAR(64) | | Current entry hash |
| created_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Entry time |

### sessions
Active user sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, ON DELETE CASCADE | Session owner |
| token_hash | VARCHAR(255) | NOT NULL | SHA-256 of token |
| refresh_token_hash | VARCHAR(255) | | SHA-256 of refresh token |
| ip_address | INET | | Session IP |
| user_agent | TEXT | | Session user agent |
| is_valid | BOOLEAN | DEFAULT TRUE | Session validity |
| mfa_verified | BOOLEAN | DEFAULT FALSE | MFA status for session |
| expires_at | TIMESTAMPTZ | NOT NULL | Session expiry |
| created_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Session start |

## Indexes

```sql
-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- User Roles
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Audit Logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);

-- Sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_valid ON sessions(is_valid);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

## Triggers

### Audit Log Protection
Prevents modification of audit logs to maintain integrity.

```sql
CREATE TRIGGER audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER audit_logs_no_delete  
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();
```

### Updated At Auto-Update
Automatically updates `updated_at` timestamp on record changes.

```sql
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Default Roles

| Role | Permissions |
|------|-------------|
| admin | users:create, users:read, users:update, users:delete, roles:assign, roles:revoke, mfa:manage, logs:read, logs:export, dashboard:access |
| user | profile:read, profile:update, mfa:setup |
| auditor | logs:read, logs:export, users:read |
