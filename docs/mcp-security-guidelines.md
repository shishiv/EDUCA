# MCP Security Guidelines

## High-Risk MCP Tools (Require Extra Caution)

### Database Operations (CRITICAL Risk)
- **`mcp__supabase__apply_migration`** - Can alter database schema permanently
  - ⚠️ **CRITICAL**: Schema changes affect all users and cannot be easily reversed
  - 🔒 **Required**: Database backup before execution
  - 📋 **Validation**: Test migrations on development environment first
  - 🎓 **Educational Impact**: May affect student data structure and attendance records

- **`mcp__supabase__execute_sql`** - Direct database access with full permissions
  - ⚠️ **CRITICAL**: Can modify student data, attendance records, and system configuration
  - 🔒 **Required**: Verify Row Level Security (RLS) policies are active
  - 📋 **Validation**: SQL queries must be reviewed for educational data compliance
  - 🎓 **Educational Impact**: Direct access to protected student information

### Browser Automation (HIGH Risk)
- **`mcp__playwright__browser_*`** - Browser automation with network access
  - ⚠️ **HIGH**: Can interact with production systems and submit forms
  - 🔒 **Required**: Use only in isolated testing environments
  - 📋 **Validation**: Verify target URLs before execution
  - 🎓 **Educational Impact**: Can modify attendance, grades, or student records if used against production

### File System Operations (MEDIUM Risk)
- **`mcp__shadcn-ui__*`** - Component and template access
  - ⚠️ **MEDIUM**: Can modify UI components and styling
  - 🔒 **Required**: Review component changes for accessibility compliance
  - 📋 **Validation**: Ensure Brazilian Portuguese terminology consistency
  - 🎓 **Educational Impact**: May affect user interface accessibility for educational users

## Security Best Practices

### 1. Always Validate Before Execution
```bash
# WRONG: Direct execution without validation
mcp__supabase__execute_sql "UPDATE alunos SET ..."

# RIGHT: Validate and document first
# 1. Verify RLS policies active
# 2. Test query on development data
# 3. Document educational compliance rationale
# 4. Then execute with logging
```

### 2. Use Read-Only Operations When Possible
```bash
# Prefer safe exploration
mcp__supabase__list_tables           # Safe: Read-only schema inspection
mcp__supabase__get_project_url       # Safe: Configuration information

# Avoid direct modification unless necessary
mcp__supabase__execute_sql           # Dangerous: Direct data modification
```

### 3. Educational Data Protection Protocol

#### Before Any Educational Data Operation:
1. **Verify School Context**: Ensure user has proper school access
2. **Check RLS Policies**: Confirm Row Level Security is enforcing isolation
3. **Validate User Role**: Ensure user role permits the operation
4. **Document Rationale**: Record why the operation is needed
5. **Test First**: Use development/staging environment

#### Attendance System Special Procedures:
```bash
# CRITICAL: Attendance is legal document in Brazil
# NEVER modify attendance retroactively
# ALWAYS verify "Abrir aula" workflow compliance

# Safe attendance operations:
mcp__supabase__list_tables           # Check attendance schema
# View attendance (read-only with RLS)

# Dangerous attendance operations:
mcp__supabase__execute_sql           # Modify attendance records
# Requires: Legal compliance documentation
# Requires: Non-retroactive verification
# Requires: Audit trail activation
```

### 4. Rate Limiting and Usage Monitoring

#### Database Operations:
- **Maximum**: 30 SQL operations per minute
- **Burst Limit**: 5 operations in 10 seconds
- **Educational Exception**: Attendance periods may have higher limits

#### Browser Automation:
- **Maximum**: 60 browser actions per minute
- **Concurrent Limit**: 3 browser instances maximum
- **Educational Exception**: UI testing may require extended sessions

### 5. Error Handling and Recovery

#### Database Connection Failures:
```bash
# Fallback strategy for educational continuity
1. Switch to offline mode for attendance
2. Cache operations locally
3. Sync when connection restored
4. Notify administrators of degradation
```

#### Browser Automation Failures:
```bash
# Educational workflow preservation
1. Fall back to manual forms
2. Maintain data integrity
3. Provide alternative access methods
4. Document system status for users
```

## Brazilian Educational Compliance

### LGPD (Lei Geral de Proteção de Dados)
- **Data Minimization**: Only access necessary student data
- **Purpose Limitation**: Use data only for documented educational purposes
- **Consent Management**: Respect guardian permissions for data access
- **Data Subject Rights**: Support data access and correction requests

### LBI (Lei Brasileira de Inclusão)
- **Accessibility**: Ensure UI changes maintain WCAG 2.1 AA compliance
- **Assistive Technology**: Test compatibility with screen readers
- **Inclusive Design**: Maintain educational accessibility features

### Ministry of Education Standards
- **Attendance Integrity**: Maintain non-retroactive attendance record policy
- **Grade Security**: Protect student academic records from unauthorized access
- **Audit Requirements**: Maintain complete audit trail for educational operations

### Municipal Policies (Fronteira)
- **Data Residency**: Educational data must remain within approved systems
- **Multi-School Isolation**: Strict separation between school districts
- **Budget Compliance**: Technology usage within municipal budget constraints

## MCP Tool Security Matrix

| Tool Category | Risk Level | Authentication | Audit Logging | Educational Use |
|--------------|------------|----------------|---------------|----------------|
| `mcp__supabase__list_*` | LOW | Required | Optional | Schema exploration |
| `mcp__supabase__execute_sql` | CRITICAL | Required | Mandatory | Data operations |
| `mcp__supabase__apply_migration` | CRITICAL | Required | Mandatory | Schema changes |
| `mcp__playwright__browser_*` | HIGH | Required | Recommended | UI testing |
| `mcp__shadcn-ui__*` | MEDIUM | Required | Optional | Component development |

## Emergency Procedures

### Security Incident Response
1. **Immediate**: Stop all MCP operations
2. **Assessment**: Determine scope of potential data exposure
3. **Notification**: Alert municipal IT security team
4. **Educational Impact**: Assess impact on student data and attendance
5. **Recovery**: Implement containment and recovery procedures

### Educational Continuity Plan
1. **Attendance Backup**: Switch to paper-based attendance recording
2. **Grade Protection**: Secure existing grade data
3. **Communication**: Notify teachers and administrators
4. **Data Sync**: Plan for system recovery and data synchronization

### Contact Information
- **Municipal IT Security**: [Contact Information]
- **Educational Technology Coordinator**: [Contact Information]
- **Data Protection Officer**: [Contact Information]
- **Emergency Hotline**: [Contact Information]

---

**Version**: 1.0
**Last Updated**: 2025-09-16
**Review Schedule**: Monthly or after security incidents
**Compliance Review**: Quarterly with educational administration