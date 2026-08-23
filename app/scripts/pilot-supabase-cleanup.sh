#!/usr/bin/env bash
# shellcheck shell=bash
# Targeted, non-forced cleanup for one isolated local Supabase project.
# After `supabase stop`, collects ALL remaining resources with mapfile,
# stops running containers gracefully, removes stopped containers, volumes,
# and networks for the SAME project id, validates absence, and never
# touches another project id.

pilot_supabase_stop_project() {
  local project_dir="$1"
  local project_id="$2"
  local stop_status=0
  local -a running_ids=()
  local -a all_container_ids=()
  local -a volume_names=()
  local -a network_ids=()
  local resource_output=''

  # Phase 1: CLI stop (best-effort)
  if pnpm exec supabase --workdir "$project_dir" stop --project-id "$project_id" --no-backup; then
    stop_status=0
  else
    stop_status=$?
    echo "PILOT_SUPABASE_CLEANUP_FALLBACK: supabase stop returned $stop_status for project=$project_id" >&2
  fi

  # Phase 2: Collect ALL running containers for this project id
  if ! resource_output=$(docker ps -q --filter "label=com.supabase.cli.project=$project_id" --filter status=running 2>/dev/null); then
    echo "PILOT_SUPABASE_CLEANUP_RUNNING_PROBE_FAILED: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$resource_output" ]]; then
    mapfile -t running_ids <<< "$resource_output"
  fi

  # Phase 3: Gracefully stop running containers (no -f)
  if [[ ${#running_ids[@]} -gt 0 ]]; then
    echo "PILOT_SUPABASE_CLEANUP_STOPPING: ${#running_ids[@]} running containers for project=$project_id" >&2
    docker stop "${running_ids[@]}" >/dev/null 2>&1 || {
      echo "PILOT_SUPABASE_CLEANUP_STOP_FAILED: project=$project_id" >&2
      return 1
    }
  fi

  # Phase 4: Collect ALL containers (stopped) for this project id
  if ! resource_output=$(docker ps -aq --filter "label=com.supabase.cli.project=$project_id" 2>/dev/null); then
    echo "PILOT_SUPABASE_CLEANUP_CONTAINER_PROBE_FAILED: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$resource_output" ]]; then
    mapfile -t all_container_ids <<< "$resource_output"
  fi

  # Phase 5: Collect volumes and networks
  if ! resource_output=$(docker volume ls -q --filter "label=com.supabase.cli.project=$project_id" 2>/dev/null); then
    echo "PILOT_SUPABASE_CLEANUP_VOLUME_PROBE_FAILED: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$resource_output" ]]; then
    mapfile -t volume_names <<< "$resource_output"
  fi
  if ! resource_output=$(docker network ls -q --filter "label=com.supabase.cli.project=$project_id" 2>/dev/null); then
    echo "PILOT_SUPABASE_CLEANUP_NETWORK_PROBE_FAILED: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$resource_output" ]]; then
    mapfile -t network_ids <<< "$resource_output"
  fi

  # Phase 6: Nothing to remove, so return early
  if [[ ${#all_container_ids[@]} -eq 0 && ${#volume_names[@]} -eq 0 && ${#network_ids[@]} -eq 0 ]]; then
    echo "PILOT_SUPABASE_CLEANUP_VERIFY: no resources remain for project=$project_id" >&2
    return 0
  fi

  # Phase 7: Remove containers
  if [[ ${#all_container_ids[@]} -gt 0 ]]; then
    docker rm "${all_container_ids[@]}" >/dev/null 2>&1 || {
      echo "PILOT_SUPABASE_CLEANUP_CONTAINER_REMOVE_FAILED: project=$project_id" >&2
      return 1
    }
  fi

  # Phase 8: Remove volumes
  if [[ ${#volume_names[@]} -gt 0 ]]; then
    docker volume rm "${volume_names[@]}" >/dev/null 2>&1 || {
      echo "PILOT_SUPABASE_CLEANUP_VOLUME_REMOVE_FAILED: project=$project_id" >&2
      return 1
    }
  fi

  # Phase 9: Remove networks
  if [[ ${#network_ids[@]} -gt 0 ]]; then
    docker network rm "${network_ids[@]}" >/dev/null 2>&1 || {
      echo "PILOT_SUPABASE_CLEANUP_NETWORK_REMOVE_FAILED: project=$project_id" >&2
      return 1
    }
  fi

  # Phase 10: Validate that nothing from this project id remains
  local -a remaining_containers=()
  local -a remaining_volumes=()
  local -a remaining_networks=()
  if ! resource_output=$(docker ps -aq --filter "label=com.supabase.cli.project=$project_id" 2>/dev/null); then
    echo "PILOT_SUPABASE_CLEANUP_FINAL_CONTAINER_PROBE_FAILED: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$resource_output" ]]; then
    mapfile -t remaining_containers <<< "$resource_output"
  fi
  if ! resource_output=$(docker volume ls -q --filter "label=com.supabase.cli.project=$project_id" 2>/dev/null); then
    echo "PILOT_SUPABASE_CLEANUP_FINAL_VOLUME_PROBE_FAILED: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$resource_output" ]]; then
    mapfile -t remaining_volumes <<< "$resource_output"
  fi
  if ! resource_output=$(docker network ls -q --filter "label=com.supabase.cli.project=$project_id" 2>/dev/null); then
    echo "PILOT_SUPABASE_CLEANUP_FINAL_NETWORK_PROBE_FAILED: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$resource_output" ]]; then
    mapfile -t remaining_networks <<< "$resource_output"
  fi

  if [[ ${#remaining_containers[@]} -gt 0 ]]; then
    echo "PILOT_SUPABASE_CLEANUP_CONTAINERS_REMAIN: project=$project_id count=${#remaining_containers[@]}" >&2
    return 1
  fi
  if [[ ${#remaining_volumes[@]} -gt 0 ]]; then
    echo "PILOT_SUPABASE_CLEANUP_VOLUMES_REMAIN: project=$project_id count=${#remaining_volumes[@]}" >&2
    return 1
  fi
  if [[ ${#remaining_networks[@]} -gt 0 ]]; then
    echo "PILOT_SUPABASE_CLEANUP_NETWORKS_REMAIN: project=$project_id count=${#remaining_networks[@]}" >&2
    return 1
  fi

  echo "PILOT_SUPABASE_CLEANUP_FALLBACK_OK: project=$project_id" >&2
  return 0
}
