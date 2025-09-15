#!/bin/bash

# Check prerequisites for task implementation
# Usage: ./scripts/check-task-prerequisites.sh "spec-directory"

source "$(dirname "$0")/common.sh"

main() {
    local spec_dir="$1"

    if [[ -z "$spec_dir" ]]; then
        log_error "Usage: $0 \"spec-directory\""
        log_info "Example: $0 \"specs/001-mvp-digital-diary\""
        exit 1
    fi

    if [[ ! -d "$spec_dir" ]]; then
        log_error "Spec directory not found: $spec_dir"
        exit 1
    fi

    log_info "Checking prerequisites for: $spec_dir"

    local all_checks_passed=true

    # Check specification files
    if ! check_specification_files "$spec_dir"; then
        all_checks_passed=false
    fi

    # Check project foundation
    if ! check_project_foundation; then
        all_checks_passed=false
    fi

    # Check development environment
    if ! check_development_environment; then
        all_checks_passed=false
    fi

    # Check database prerequisites
    if ! check_database_prerequisites; then
        all_checks_passed=false
    fi

    # Check dependencies
    if ! check_dependencies "$spec_dir"; then
        all_checks_passed=false
    fi

    # Summary
    if [[ "$all_checks_passed" == true ]]; then
        log_success "All prerequisites met! Ready for implementation."
        return 0
    else
        log_error "Some prerequisites are missing. Please address the issues above."
        return 1
    fi
}

check_specification_files() {
    local spec_dir="$1"
    local checks_passed=true

    log_info "Checking specification files..."

    # Check required specification files
    local required_files=("spec.md")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$spec_dir/$file" ]]; then
            log_error "Missing required file: $spec_dir/$file"
            checks_passed=false
        else
            log_success "Found: $spec_dir/$file"
        fi
    done

    # Check optional but recommended files
    local optional_files=("plan.md" "data-model.md" "research.md" "quickstart.md")
    for file in "${optional_files[@]}"; do
        if [[ -f "$spec_dir/$file" ]]; then
            log_success "Found optional file: $spec_dir/$file"
        else
            log_warning "Missing optional file: $spec_dir/$file (run setup-plan.sh to create)"
        fi
    done

    return $([[ "$checks_passed" == true ]] && echo 0 || echo 1)
}

check_project_foundation() {
    log_info "Checking project foundation..."

    local checks_passed=true

    # Check for gestao_fronteira (primary foundation)
    if [[ ! -d "gestao_fronteira" ]]; then
        log_error "Missing primary foundation: gestao_fronteira directory"
        checks_passed=false
    else
        log_success "Found primary foundation: gestao_fronteira"

        # Check package.json
        if [[ ! -f "gestao_fronteira/package.json" ]]; then
            log_warning "gestao_fronteira/package.json not found"
        else
            log_success "Found gestao_fronteira/package.json"
        fi

        # Check if dependencies are installed
        if [[ ! -d "gestao_fronteira/node_modules" ]]; then
            log_warning "Dependencies not installed in gestao_fronteira (run: cd gestao_fronteira && npm install)"
        else
            log_success "Dependencies installed in gestao_fronteira"
        fi
    fi

    # Check other available projects
    local other_projects=("fronteira-educa-gest" "fronteira-educa-digital" "bro")
    for project in "${other_projects[@]}"; do
        if [[ -d "$project" ]]; then
            log_success "Available project: $project"
        fi
    done

    return $([[ "$checks_passed" == true ]] && echo 0 || echo 1)
}

check_development_environment() {
    log_info "Checking development environment..."

    local checks_passed=true

    # Check required tools
    local required_tools=("node" "npm" "git")
    for tool in "${required_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            local version
            case "$tool" in
                "node")
                    version=$(node --version)
                    log_success "$tool: $version"
                    ;;
                "npm")
                    version=$(npm --version)
                    log_success "$tool: $version"
                    ;;
                "git")
                    version=$(git --version)
                    log_success "$tool: $version"
                    ;;
            esac
        else
            log_error "Missing required tool: $tool"
            checks_passed=false
        fi
    done

    # Check optional but recommended tools
    local optional_tools=("pnpm" "supabase" "code")
    for tool in "${optional_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            local version
            case "$tool" in
                "pnpm")
                    version=$(pnpm --version)
                    log_success "Optional tool - $tool: $version"
                    ;;
                "supabase")
                    version=$(supabase --version)
                    log_success "Optional tool - $tool: $version"
                    ;;
                "code")
                    log_success "Optional tool - VS Code available"
                    ;;
            esac
        else
            log_info "Optional tool not found: $tool"
        fi
    done

    return $([[ "$checks_passed" == true ]] && echo 0 || echo 1)
}

check_database_prerequisites() {
    log_info "Checking database prerequisites..."

    local checks_passed=true

    # Check for Supabase configuration in gestao_fronteira
    if [[ -f "gestao_fronteira/.env.local" ]]; then
        log_success "Found gestao_fronteira/.env.local"

        # Check for required environment variables
        local env_file="gestao_fronteira/.env.local"
        if grep -q "NEXT_PUBLIC_SUPABASE_URL" "$env_file"; then
            log_success "Found NEXT_PUBLIC_SUPABASE_URL configuration"
        else
            log_warning "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local"
        fi

        if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$env_file"; then
            log_success "Found NEXT_PUBLIC_SUPABASE_ANON_KEY configuration"
        else
            log_warning "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
        fi
    else
        log_warning "Missing gestao_fronteira/.env.local (copy from .env.example)"
    fi

    # Check for database migrations
    if [[ -d "gestao_fronteira/supabase/migrations" ]]; then
        local migration_count
        migration_count=$(ls gestao_fronteira/supabase/migrations/*.sql 2>/dev/null | wc -l)
        if [[ $migration_count -gt 0 ]]; then
            log_success "Found $migration_count database migration(s)"
        else
            log_warning "No database migrations found"
        fi
    else
        log_warning "No supabase/migrations directory found"
    fi

    return $([[ "$checks_passed" == true ]] && echo 0 || echo 1)
}

check_dependencies() {
    local spec_dir="$1"
    log_info "Checking project dependencies..."

    local checks_passed=true

    # Check if this is a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        checks_passed=false
    else
        log_success "Git repository detected"

        # Check current branch
        local current_branch
        current_branch=$(git branch --show-current)
        log_info "Current branch: $current_branch"
    fi

    # Check project structure
    if ! validate_project_structure; then
        log_warning "Project structure issues detected"
    else
        log_success "Project structure validated"
    fi

    # Check constitution file
    if [[ -f "memory/constitution.md" ]]; then
        log_success "Found development constitution"
    else
        log_warning "Missing development constitution (memory/constitution.md)"
    fi

    # Check templates
    local template_files=("spec-template.md" "plan-template.md" "tasks-template.md")
    for template in "${template_files[@]}"; do
        if [[ -f "templates/$template" ]]; then
            log_success "Found template: $template"
        else
            log_info "Missing template: $template (will be created as needed)"
        fi
    done

    return $([[ "$checks_passed" == true ]] && echo 0 || echo 1)
}

# Run main function
main "$@"