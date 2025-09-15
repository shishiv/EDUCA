#!/bin/bash

# Common utilities for SRE Educational Management System scripts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Project structure validation
validate_project_structure() {
    local required_dirs=("memory" "scripts" "specs" "templates")
    local missing_dirs=()

    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            missing_dirs+=("$dir")
        fi
    done

    if [[ ${#missing_dirs[@]} -gt 0 ]]; then
        log_error "Missing required directories: ${missing_dirs[*]}"
        return 1
    fi

    return 0
}

# Get next spec number
get_next_spec_number() {
    local max_num=0
    if [[ -d "specs" ]]; then
        for spec_dir in specs/*/; do
            if [[ -d "$spec_dir" ]]; then
                local dir_name=$(basename "$spec_dir")
                if [[ $dir_name =~ ^([0-9]+)- ]]; then
                    local num=${BASH_REMATCH[1]}
                    if [[ $num -gt $max_num ]]; then
                        max_num=$num
                    fi
                fi
            fi
        done
    fi
    printf "%03d" $((max_num + 1))
}

# Create spec directory
create_spec_directory() {
    local spec_name="$1"
    local spec_number="$2"

    if [[ -z "$spec_name" ]]; then
        log_error "Spec name is required"
        return 1
    fi

    if [[ -z "$spec_number" ]]; then
        spec_number=$(get_next_spec_number)
    fi

    local spec_dir="specs/${spec_number}-${spec_name}"

    if [[ -d "$spec_dir" ]]; then
        log_warning "Spec directory already exists: $spec_dir"
        return 1
    fi

    mkdir -p "$spec_dir/contracts"
    log_success "Created spec directory: $spec_dir"
    echo "$spec_dir"
}

# Git branch management
create_feature_branch() {
    local branch_name="$1"

    if [[ -z "$branch_name" ]]; then
        log_error "Branch name is required"
        return 1
    fi

    if git rev-parse --verify "$branch_name" >/dev/null 2>&1; then
        log_warning "Branch already exists: $branch_name"
        git checkout "$branch_name"
    else
        git checkout -b "$branch_name"
        log_success "Created and switched to branch: $branch_name"
    fi
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        return 1
    fi
    return 0
}

# Educational domain validation helpers
validate_brazilian_cpf() {
    local cpf="$1"
    # Basic CPF format validation (11 digits)
    if [[ ! $cpf =~ ^[0-9]{11}$ ]]; then
        return 1
    fi
    return 0
}

# Check if required tools are installed
check_required_tools() {
    local required_tools=("git" "node" "npm")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi

    return 0
}

# Check if project has the required primary foundation (gestao_fronteira)
check_primary_foundation() {
    if [[ ! -d "gestao_fronteira" ]]; then
        log_warning "Primary foundation 'gestao_fronteira' directory not found"
        log_info "This project should use gestao_fronteira as the 80% MVP ready foundation"
        return 1
    fi

    if [[ ! -f "gestao_fronteira/package.json" ]]; then
        log_warning "gestao_fronteira appears incomplete (no package.json)"
        return 1
    fi

    log_success "Primary foundation 'gestao_fronteira' found"
    return 0
}