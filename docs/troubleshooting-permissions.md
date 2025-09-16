# Troubleshooting Guide: Permission and Security Issues

## Common Permission Issues and Solutions

### 🚨 Critical Issues (Immediate Action Required)

#### Issue: Student Data Cross-School Access
**Symptoms:**
- Teacher sees students from other schools
- Wrong attendance records displayed
- Cross-school grade access

**Immediate Actions:**
```bash
# 1. Verify RLS policies are active
psql -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"

# 2. Check user school assignment
psql -c "SELECT u.id, u.email, u.escola_id, e.nome FROM users u JOIN escolas e ON u.escola_id = e.id WHERE u.id = 'USER_ID';"

# 3. Immediate user logout
supabase auth admin delete-user USER_ID
```

**Root Cause Analysis:**
- RLS policy misconfiguration
- User assigned to wrong school
- Session token corruption

**Permanent Fix:**
```sql
-- Re-enable RLS on critical tables
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public';
```

#### Issue: Attendance Records Modified Retroactively
**Symptoms:**
- Attendance changed after school day end
- Audit trail shows unauthorized modifications
- Legal compliance violation

**Immediate Actions:**
```bash
# 1. Stop all attendance operations
systemctl stop attendance-service

# 2. Create forensic backup
pg_dump -t frequencia gestao_fronteira > forensic_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Identify unauthorized changes
psql -c "SELECT * FROM audit_log WHERE table_name = 'frequencia' AND operation = 'UPDATE' AND created_at > CURRENT_DATE - INTERVAL '7 days';"
```

**Investigation Steps:**
1. Review audit logs for modification patterns
2. Identify users with modification permissions
3. Check for system vulnerabilities
4. Document for compliance reporting

**Permanent Fix:**
```sql
-- Implement strict attendance immutability
CREATE OR REPLACE FUNCTION prevent_retroactive_attendance()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.created_at::date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance records cannot be modified after the school day: %', OLD.created_at::date;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_retroactive_attendance_trigger
    BEFORE UPDATE ON frequencia
    FOR EACH ROW
    EXECUTE FUNCTION prevent_retroactive_attendance();
```

### ⚠️ High Priority Issues

#### Issue: MCP Tool Unauthorized Database Access
**Symptoms:**
- Unexpected database queries in logs
- Performance degradation during automated operations
- Security alerts from monitoring systems

**Diagnostic Commands:**
```bash
# Check active MCP tool connections
netstat -an | grep :5432
lsof -i :5432

# Review recent database operations
tail -f /var/log/postgresql/postgresql.log | grep "mcp"

# Audit MCP tool permissions
node scripts/security/audit-mcp-permissions.js
```

**Immediate Response:**
```bash
# 1. Revoke MCP database access temporarily
psql -c "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;"

# 2. Stop MCP services
pkill -f "mcp-server"
systemctl stop claude-code-mcp

# 3. Review permission grants
psql -c "SELECT grantee, table_name, privilege_type FROM information_schema.table_privileges WHERE grantee = 'anon';"
```

**Resolution:**
1. Review MCP tool configuration for educational compliance
2. Implement principle of least privilege
3. Add monitoring for automated operations
4. Update security policies

#### Issue: Permission Duplication Causing Performance Issues
**Symptoms:**
- Slow authentication and authorization
- Duplicate entries in permission audits
- System timeouts during role checks

**Detection:**
```bash
# Find duplicate permissions
node scripts/security/find-permission-duplicates.js

# Check permission count by user
psql -c "SELECT user_id, COUNT(*) as permission_count FROM user_permissions GROUP BY user_id ORDER BY permission_count DESC;"

# Analyze permission overlap
node scripts/security/analyze-permission-overlap.js
```

**Cleanup Process:**
```bash
# 1. Backup current permissions
pg_dump -t user_permissions gestao_fronteira > permissions_backup.sql

# 2. Remove duplicates
node scripts/security/deduplicate-permissions.js --dry-run
node scripts/security/deduplicate-permissions.js --execute

# 3. Verify system functionality
npm run test:auth
npm run test:permissions
```

### 🔍 Medium Priority Issues

#### Issue: Brazilian Compliance Validation Failures
**Symptoms:**
- LGPD compliance warnings
- Accessibility audit failures
- Educational data exposure risks

**Compliance Check:**
```bash
# LGPD compliance validation
node tests/security/test-educational-compliance.js --verbose

# Accessibility testing
npm run test:accessibility

# Data minimization audit
node scripts/security/audit-data-collection.js
```

**Resolution Steps:**
1. Update privacy policies for educational context
2. Implement data retention schedules
3. Add consent management for guardians
4. Enable accessibility features

#### Issue: User Role Confusion
**Symptoms:**
- Teachers accessing administrative functions
- Parents seeing other students' data
- Incorrect permission escalation

**Diagnostic Process:**
```bash
# Check user role assignments
psql -c "SELECT u.email, u.role, u.escola_id, e.nome FROM users u JOIN escolas e ON u.escola_id = e.id ORDER BY u.role;"

# Validate role permissions
node scripts/security/validate-role-permissions.js --role professor
node scripts/security/validate-role-permissions.js --role responsavel

# Test role isolation
node tests/security/test-role-isolation.js
```

**Fix Implementation:**
```sql
-- Update role constraints
ALTER TABLE users ADD CONSTRAINT valid_roles
CHECK (role IN ('admin', 'diretor', 'secretario', 'professor', 'responsavel'));

-- Add role-based RLS policies
CREATE POLICY user_role_isolation ON users
FOR ALL
USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');
```

### 🛠️ Low Priority Issues

#### Issue: Session Management Problems
**Symptoms:**
- Users logged out unexpectedly
- Session conflicts in multi-device usage
- Token refresh failures

**Session Diagnostics:**
```bash
# Check active sessions
supabase auth admin list-sessions

# Review session logs
tail -f /var/log/supabase/auth.log | grep "session"

# Test token validity
node scripts/security/validate-session-tokens.js
```

#### Issue: Slow Permission Loading
**Symptoms:**
- Dashboard takes >3 seconds to load
- Permission checks timeout
- UI becomes unresponsive

**Performance Analysis:**
```bash
# Profile permission queries
psql -c "EXPLAIN ANALYZE SELECT * FROM user_permissions WHERE user_id = 'sample_id';"

# Check index usage
psql -c "SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE schemaname = 'public';"

# Optimize queries
node scripts/performance/optimize-permission-queries.js
```

## Troubleshooting Workflows

### 🔄 Standard Investigation Process

#### Step 1: Initial Assessment (5 minutes)
```bash
# System health check
systemctl status postgresql supabase nginx
docker ps | grep -E "(postgres|supabase)"

# Error log review
tail -50 /var/log/application/error.log
grep -i "error\|exception\|permission" /var/log/application/application.log
```

#### Step 2: Permission Context Gathering (10 minutes)
```bash
# User context
psql -c "SELECT id, email, role, escola_id, created_at, last_sign_in_at FROM auth.users WHERE email = 'user@example.com';"

# Permission context
node scripts/security/get-user-permissions.js --user-id USER_ID

# Recent activity
psql -c "SELECT * FROM audit_log WHERE user_id = 'USER_ID' ORDER BY created_at DESC LIMIT 20;"
```

#### Step 3: Security Validation (15 minutes)
```bash
# RLS policy check
node tests/security/test-rls-policies.js

# Educational compliance check
node tests/security/test-educational-compliance.js

# Permission integrity check
node scripts/security/validate-permission-integrity.js
```

#### Step 4: Resolution Implementation (Variable)
- Apply specific fixes based on findings
- Test resolution in staging environment
- Monitor for regression issues
- Document solution for future reference

### 🚨 Emergency Response Procedures

#### Security Incident Response (Critical)
```bash
# Immediate containment
systemctl stop nginx
iptables -A INPUT -p tcp --dport 3000 -j DROP

# Evidence preservation
cp /var/log/application/application.log /evidence/app_log_$(date +%Y%m%d_%H%M%S).log
pg_dump gestao_fronteira > /evidence/database_$(date +%Y%m%d_%H%M%S).sql

# Stakeholder notification
echo "$(date): Security incident - immediate containment active" | mail -s "URGENT: Security Incident" security@fronteira.edu.br
```

#### Data Breach Response (Critical)
```bash
# Identify scope
psql -c "SELECT COUNT(*) as affected_students FROM alunos WHERE escola_id = AFFECTED_SCHOOL_ID;"
psql -c "SELECT COUNT(*) as affected_records FROM frequencia WHERE created_at >= 'INCIDENT_START_TIME';"

# Legal compliance
node scripts/compliance/generate-breach-report.js --incident-id INCIDENT_ID
node scripts/compliance/notify-authorities.js --type "data_breach"

# Communication
node scripts/communication/notify-affected-users.js --school-id AFFECTED_SCHOOL_ID
```

## Prevention Strategies

### 🛡️ Proactive Security Measures

#### Daily Monitoring Setup
```bash
# Automated daily checks
crontab -e
# Add: 0 6 * * * /scripts/security/daily-security-check.sh
# Add: 0 18 * * * /scripts/security/audit-daily-operations.sh
```

#### Weekly Security Audits
```bash
# Permission audit
node scripts/security/weekly-permission-audit.js

# Compliance check
node scripts/compliance/weekly-compliance-check.js

# Performance analysis
node scripts/performance/weekly-performance-audit.js
```

#### Monthly Security Reviews
```bash
# Comprehensive security assessment
node scripts/security/monthly-security-assessment.js

# User access review
node scripts/security/user-access-review.js

# Educational compliance audit
node scripts/compliance/monthly-compliance-audit.js
```

### 📚 Educational Specific Considerations

#### Attendance System Protection
```sql
-- Preventive measures for attendance integrity
CREATE OR REPLACE FUNCTION validate_attendance_workflow()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure "Abrir aula" workflow compliance
    IF NOT EXISTS (
        SELECT 1 FROM aulas_abertas
        WHERE turma_id = NEW.turma_id
        AND data_aula = NEW.data_aula
        AND status = 'aberta'
    ) THEN
        RAISE EXCEPTION 'Attendance cannot be marked without opening class session first';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Multi-School Isolation Validation
```bash
# Regular isolation testing
node tests/security/test-multi-school-isolation.js --comprehensive
node tests/security/validate-rls-effectiveness.js --all-tables
```

---

**Troubleshooting Guide Version**: 1.0
**Last Updated**: 2025-09-16
**Emergency Contact**: security@fronteira.edu.br
**On-Call Support**: +55 (XX) XXXX-XXXX