#!/bin/bash

# Get file paths and information for a specific feature
# Usage: ./scripts/get-feature-paths.sh [spec-directory]

source "$(dirname "$0")/common.sh"

main() {
    local spec_dir="$1"

    if [[ -n "$spec_dir" ]]; then
        # Show specific feature information
        show_feature_info "$spec_dir"
    else
        # Show all features
        show_all_features
    fi
}

show_all_features() {
    log_info "Available features in the SRE Educational Management System:"
    echo

    if [[ ! -d "specs" ]]; then
        log_warning "No specs directory found. Run create-new-feature.sh to create your first feature."
        return
    fi

    local feature_count=0

    for spec_dir in specs/*/; do
        if [[ -d "$spec_dir" ]]; then
            feature_count=$((feature_count + 1))
            local feature_name
            feature_name=$(basename "$spec_dir")

            echo "📁 $feature_name"
            echo "   Path: $spec_dir"

            # Check status based on files present
            local status="📝 Specification"
            if [[ -f "$spec_dir/plan.md" ]]; then
                status="📋 Planning"
            fi
            if [[ -f "$spec_dir/tasks.md" ]]; then
                status="⚙️  Implementation"
            fi

            echo "   Status: $status"

            # Show key files
            local files=()
            [[ -f "$spec_dir/spec.md" ]] && files+=("spec.md")
            [[ -f "$spec_dir/plan.md" ]] && files+=("plan.md")
            [[ -f "$spec_dir/data-model.md" ]] && files+=("data-model.md")
            [[ -f "$spec_dir/tasks.md" ]] && files+=("tasks.md")
            [[ -d "$spec_dir/contracts" ]] && files+=("contracts/")

            if [[ ${#files[@]} -gt 0 ]]; then
                echo "   Files: ${files[*]}"
            fi

            echo
        fi
    done

    if [[ $feature_count -eq 0 ]]; then
        log_info "No features found. Create your first feature with:"
        log_info "  ./scripts/create-new-feature.sh \"feature-name\""
    else
        log_success "Found $feature_count feature(s)"
    fi

    echo
    log_info "To see detailed information about a feature:"
    log_info "  $0 \"specs/[feature-directory]\""
}

show_feature_info() {
    local spec_dir="$1"

    if [[ ! -d "$spec_dir" ]]; then
        log_error "Feature directory not found: $spec_dir"
        return 1
    fi

    local feature_name
    feature_name=$(basename "$spec_dir")

    log_info "Feature: $feature_name"
    echo "📁 Directory: $spec_dir"
    echo

    # Show file structure
    log_info "📄 Files and Structure:"
    if command -v tree &> /dev/null; then
        tree "$spec_dir"
    else
        # Fallback if tree is not available
        find "$spec_dir" -type f | sort | sed 's|[^/]*/|- |g'
    fi
    echo

    # Show file details
    log_info "📋 File Details:"

    # Specification file
    if [[ -f "$spec_dir/spec.md" ]]; then
        echo "✅ spec.md - Feature specification"
        local spec_size
        spec_size=$(wc -l < "$spec_dir/spec.md")
        echo "   Lines: $spec_size"
        echo "   Modified: $(date -r "$spec_dir/spec.md" '+%Y-%m-%d %H:%M')"
    else
        echo "❌ spec.md - Missing specification file"
    fi

    # Plan file
    if [[ -f "$spec_dir/plan.md" ]]; then
        echo "✅ plan.md - Implementation plan"
        local plan_size
        plan_size=$(wc -l < "$spec_dir/plan.md")
        echo "   Lines: $plan_size"
        echo "   Modified: $(date -r "$spec_dir/plan.md" '+%Y-%m-%d %H:%M')"
    else
        echo "⚠️  plan.md - Not created (run setup-plan.sh)"
    fi

    # Data model file
    if [[ -f "$spec_dir/data-model.md" ]]; then
        echo "✅ data-model.md - Database schema"
        local model_size
        model_size=$(wc -l < "$spec_dir/data-model.md")
        echo "   Lines: $model_size"
    else
        echo "⚠️  data-model.md - Not created"
    fi

    # Research file
    if [[ -f "$spec_dir/research.md" ]]; then
        echo "✅ research.md - Technical research"
        local research_size
        research_size=$(wc -l < "$spec_dir/research.md")
        echo "   Lines: $research_size"
    else
        echo "⚠️  research.md - Not created"
    fi

    # Tasks file
    if [[ -f "$spec_dir/tasks.md" ]]; then
        echo "✅ tasks.md - Implementation tasks"
        local tasks_size
        tasks_size=$(wc -l < "$spec_dir/tasks.md")
        echo "   Lines: $tasks_size"
    else
        echo "⚠️  tasks.md - Not created"
    fi

    # Contracts directory
    if [[ -d "$spec_dir/contracts" ]]; then
        echo "✅ contracts/ - API specifications"
        local contract_count
        contract_count=$(find "$spec_dir/contracts" -type f | wc -l)
        echo "   Files: $contract_count"
    else
        echo "⚠️  contracts/ - Not created"
    fi

    echo

    # Show branch information
    if git rev-parse --git-dir > /dev/null 2>&1; then
        log_info "🌳 Git Information:"
        local current_branch
        current_branch=$(git branch --show-current)
        echo "Current branch: $current_branch"

        # Check if there's a corresponding feature branch
        local expected_branch
        expected_branch=$(echo "$feature_name" | sed 's/^[0-9]*-//')
        if git branch --list | grep -q "$expected_branch"; then
            echo "Feature branch: $expected_branch (exists)"
        else
            echo "Feature branch: $expected_branch (not found)"
        fi
    fi

    echo

    # Show next steps
    log_info "🚀 Next Steps:"
    if [[ ! -f "$spec_dir/spec.md" ]]; then
        echo "1. Create specification file: edit $spec_dir/spec.md"
    elif [[ ! -f "$spec_dir/plan.md" ]]; then
        echo "1. Create implementation plan: ./scripts/setup-plan.sh \"$spec_dir\""
    elif [[ ! -f "$spec_dir/tasks.md" ]]; then
        echo "1. Create task breakdown (use /plan command in Claude Code)"
    else
        echo "1. Begin implementation (use /tasks command in Claude Code)"
    fi

    # Show useful commands
    echo
    log_info "💡 Useful Commands:"
    echo "  Check prerequisites: ./scripts/check-task-prerequisites.sh \"$spec_dir\""
    echo "  Setup planning:      ./scripts/setup-plan.sh \"$spec_dir\""
    if command -v code &> /dev/null; then
        echo "  Open in VS Code:     code \"$spec_dir\""
    fi
}

# Run main function
main "$@"