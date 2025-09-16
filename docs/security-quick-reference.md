# Security Quick Reference

## Quick Security Commands for Educational Systems

### 🚨 Emergency Commands

```bash
# Stop all operations immediately
killall node
pkill -f "claude-code"

# Check database connection security
supabase status
supabase db inspect

# Verify RLS policies active
psql -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

### 🔍 Security Validation Commands

#### Permission Audit Commands
```bash
# Run complete security audit
npm run security:audit

# Check for duplicate permissions
node scripts/security/check-duplicates.js

# Validate educational compliance
node scripts/security/validate-compliance.js

# Test MCP tool security context
node tests/security/test-mcp-security.js
```

#### Educational Data Protection
```bash
# Verify multi-school isolation
supabase db inspect --schema public --table alunos
supabase db inspect --schema public --table frequencia

# Check attendance record immutability
node scripts/security/validate-attendance.js

# Verify LGPD compliance
node tests/security/test-educational-compliance.js
```

### 🔐 MCP Tool Security Commands

#### Safe MCP Operations
```bash
# Read-only operations (SAFE)
mcp__supabase__list_tables
mcp__supabase__get_project_url
mcp__supabase__get_anon_key

# Browser operations (USE WITH CAUTION)
mcp__playwright__browser_navigate "http://localhost:3000"
mcp__playwright__browser_snapshot

# Component operations (REVIEW CHANGES)
mcp__shadcn-ui__get_component "button"
mcp__shadcn-ui__list_components
```

#### Dangerous MCP Operations (Require Validation)
```bash
# CRITICAL: Database operations
mcp__supabase__execute_sql        # Review SQL before execution
mcp__supabase__apply_migration    # Test on development first

# HIGH RISK: Browser interactions
mcp__playwright__browser_click    # Verify target before execution
mcp__playwright__browser_type     # Check data input context
```

### 📊 Compliance Validation

#### Brazilian Educational Standards
```yaml
LGPD Compliance Check:
  - Data minimization: ✓ Only collect necessary student data
  - Purpose limitation: ✓ Use for educational purposes only
  - Transparency: ✓ Clear data usage policies
  - Security: ✓ Encryption and access controls

LBI Accessibility Check:
  - WCAG 2.1 AA: ✓ Screen reader compatibility
  - Keyboard navigation: ✓ Full keyboard access
  - Visual accessibility: ✓ High contrast mode
  - Motor accessibility: ✓ Touch-friendly interface

Ministry Standards Check:
  - Attendance integrity: ✓ Non-retroactive marking
  - Grade security: ✓ Teacher-only access
  - Audit trail: ✓ Complete operation logging
  - Reporting: ✓ Municipal compliance reports
```

### 🏫 Educational Context Commands

#### User Role Validation
```bash
# Check user permissions by role
node scripts/security/check-role-permissions.js --role professor
node scripts/security/check-role-permissions.js --role diretor
node scripts/security/check-role-permissions.js --role admin

# Validate school isolation
node scripts/security/test-school-isolation.js --school-id 1
```

#### Attendance System Security
```bash
# Verify "Abrir aula" workflow compliance
node scripts/security/validate-attendance-workflow.js

# Check attendance record immutability
node scripts/security/test-attendance-immutability.js

# Validate 80% attendance threshold monitoring
node scripts/security/check-attendance-alerts.js
```

### 🛡️ Security Response Procedures

#### Level 1: Low Impact (Self-Service)
```bash
# User account lockout
supabase auth admin list-users
supabase auth admin reset-password

# Clear local cache
rm -rf .next/cache
npm run dev -- --clear-cache
```

#### Level 2: Medium Impact (IT Support)
```bash
# System performance issues
pm2 status
pm2 restart all
systemctl status postgresql

# Authentication failures
tail -f /var/log/supabase/auth.log
journalctl -u supabase-auth -f
```

#### Level 3: High Impact (Security Team)
```bash
# Potential data exposure
supabase db backup
pg_dump gestao_fronteira > backup_$(date +%Y%m%d_%H%M%S).sql

# System unavailability
systemctl status supabase
docker ps -a
kubectl get pods
```

#### Level 4: Critical Impact (Full Response)
```bash
# Confirmed data breach
# 1. Isolate affected systems
iptables -A INPUT -s SUSPICIOUS_IP -j DROP

# 2. Preserve evidence
dd if=/dev/sda1 of=/evidence/disk_image.dd

# 3. Notify authorities
echo "$(date): Security incident detected" >> /var/log/security/incidents.log

# 4. Activate backup systems
rsync -av /backup/latest/ /production/
systemctl start backup-database
```

### 📱 Mobile Security Commands

#### Tablet/Phone Access Validation
```bash
# Test responsive design
npm run test:mobile
playwright test --project=mobile

# Validate touch interface
node tests/security/test-mobile-accessibility.js

# Check offline capabilities
node tests/security/test-offline-attendance.js
```

### 🔄 Backup and Recovery Commands

#### Educational Data Backup
```bash
# Daily backup (automated)
pg_dump gestao_fronteira | gzip > backup_$(date +%Y%m%d).sql.gz

# Attendance data export (legal compliance)
psql -c "\copy (SELECT * FROM frequencia WHERE data_aula >= '2024-01-01') TO 'attendance_export.csv' CSV HEADER"

# Student data export (LGPD compliance)
node scripts/export/student-data-export.js --anonymize --student-id 123
```

#### Recovery Procedures
```bash
# Restore from backup
gunzip -c backup_20241201.sql.gz | psql gestao_fronteira

# Rebuild search indexes
psql -c "REINDEX DATABASE gestao_fronteira;"

# Verify data integrity
node scripts/security/verify-data-integrity.js
```

### 📋 Daily Security Checklist

```yaml
Morning Security Check:
  - [ ] Verify database connection and RLS policies
  - [ ] Check overnight security logs
  - [ ] Validate backup completion
  - [ ] Test critical user workflows

During Operation:
  - [ ] Monitor attendance marking workflows
  - [ ] Check user authentication patterns
  - [ ] Validate multi-school data isolation
  - [ ] Review system performance metrics

Evening Security Review:
  - [ ] Audit day's database operations
  - [ ] Review user access patterns
  - [ ] Check compliance alert triggers
  - [ ] Verify attendance record immutability
```

### 🆘 Emergency Contacts

```yaml
Security Incident Response:
  - Municipal IT Security: [REDACTED]
  - Educational Technology Coordinator: [REDACTED]
  - Data Protection Officer: [REDACTED]
  - Emergency Hotline: [REDACTED]

Technical Support:
  - Database Administrator: [REDACTED]
  - System Administrator: [REDACTED]
  - Network Security: [REDACTED]
  - Application Support: [REDACTED]
```

---

**Quick Reference Version**: 1.0
**Last Updated**: 2025-09-16
**Emergency Use**: Keep printed copy available
**Mobile Access**: Available at `docs.fronteira.edu.br/security`