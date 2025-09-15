#!/bin/bash

# Create a new feature specification following the Specify process
# Usage: ./scripts/create-new-feature.sh "feature-name" ["optional-description"]

source "$(dirname "$0")/common.sh"

main() {
    local feature_name="$1"
    local feature_description="$2"

    if [[ -z "$feature_name" ]]; then
        log_error "Usage: $0 \"feature-name\" [\"optional-description\"]"
        log_info "Example: $0 \"mvp-digital-diary\" \"Implement core attendance tracking functionality\""
        exit 1
    fi

    # Validate project structure
    if ! validate_project_structure; then
        log_error "Project structure validation failed"
        exit 1
    fi

    # Check if we're in a git repository
    if ! check_git_repo; then
        exit 1
    fi

    # Check required tools
    if ! check_required_tools; then
        exit 1
    fi

    # Check primary foundation
    check_primary_foundation

    # Get next spec number
    local spec_number
    spec_number=$(get_next_spec_number)

    # Create spec directory
    local spec_dir
    spec_dir=$(create_spec_directory "$feature_name" "$spec_number")

    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    # Create branch name
    local branch_name="${spec_number}-${feature_name}"

    # Create feature branch
    if ! create_feature_branch "$branch_name"; then
        log_error "Failed to create feature branch"
        exit 1
    fi

    # Copy spec template
    if [[ -f "templates/spec-template.md" ]]; then
        cp "templates/spec-template.md" "$spec_dir/spec.md"
        log_success "Copied spec template to $spec_dir/spec.md"
    else
        log_warning "Spec template not found, creating basic spec file"
        create_basic_spec "$spec_dir/spec.md" "$feature_name" "$feature_description" "$spec_number"
    fi

    # Update spec with feature details
    update_spec_template "$spec_dir/spec.md" "$feature_name" "$feature_description" "$spec_number"

    log_success "Feature setup complete!"
    log_info "Next steps:"
    log_info "1. Edit $spec_dir/spec.md with detailed requirements"
    log_info "2. Use /specify command in Claude Code to refine the specification"
    log_info "3. Use /plan command to create implementation plan"
    log_info "4. Use /tasks command to break down implementation tasks"

    # Show current status
    log_info "Current branch: $(git branch --show-current)"
    log_info "Spec directory: $spec_dir"

    # Automatically open spec file if VS Code is available
    if command -v code &> /dev/null; then
        log_info "Opening spec file in VS Code..."
        code "$spec_dir/spec.md"
    fi
}

create_basic_spec() {
    local spec_file="$1"
    local feature_name="$2"
    local feature_description="$3"
    local spec_number="$4"

    cat > "$spec_file" << EOF
# ${feature_name^} Specification

**Spec ID**: SRE-${spec_number}
**Created**: $(date +%Y-%m-%d)
**Author**: Specify Framework
**Version**: 1.0
**Phase**: Specify

---

## Overview

${feature_description:-"Feature description to be added"}

## User Stories

### As a [Role]
- I want to [action]
- So that [benefit]

## Functional Requirements

### FR-${spec_number}.1: [Requirement Title]
**Priority**: [Critical/High/Medium/Low]

**Description**: [Detailed requirement description]

## Non-Functional Requirements

### Performance
- [ ] Page load time < 3 seconds
- [ ] Mobile responsive design
- [ ] Works on tablets for teacher use

### Security
- [ ] Row Level Security (RLS) compliance
- [ ] Role-based access control
- [ ] Audit trail for all actions

### Educational Compliance
- [ ] Brazilian educational regulations compliance
- [ ] CPF validation and formatting
- [ ] Non-retroactive data integrity where required

## Success Criteria

- [ ] [Measurable success criterion 1]
- [ ] [Measurable success criterion 2]
- [ ] [Measurable success criterion 3]

## Dependencies

- [ ] gestao_fronteira foundation (80% MVP ready)
- [ ] Supabase authentication and database
- [ ] shadcn/ui component library

## Review & Acceptance Checklist

### Specification Quality
- [ ] Requirements are specific and measurable
- [ ] User stories clearly defined
- [ ] Dependencies identified
- [ ] Success criteria defined

### Educational Domain Alignment
- [ ] Aligns with Brazilian educational system
- [ ] Considers multi-school architecture
- [ ] Addresses data security requirements
- [ ] Includes compliance considerations

### Technical Feasibility
- [ ] Leverages existing gestao_fronteira components
- [ ] Compatible with current technology stack
- [ ] Performance requirements realistic
- [ ] Security requirements achievable
EOF

    log_success "Created basic spec file: $spec_file"
}

update_spec_template() {
    local spec_file="$1"
    local feature_name="$2"
    local feature_description="$3"
    local spec_number="$4"

    # Replace placeholders in the spec file
    sed -i "s/\[FEATURE_NAME\]/${feature_name}/g" "$spec_file" 2>/dev/null || true
    sed -i "s/\[FEATURE_DESCRIPTION\]/${feature_description}/g" "$spec_file" 2>/dev/null || true
    sed -i "s/\[SPEC_NUMBER\]/${spec_number}/g" "$spec_file" 2>/dev/null || true
    sed -i "s/\[DATE\]/$(date +%Y-%m-%d)/g" "$spec_file" 2>/dev/null || true
}

# Run main function
main "$@"