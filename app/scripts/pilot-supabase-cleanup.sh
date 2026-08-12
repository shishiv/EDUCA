#!/usr/bin/env bash
# shellcheck shell=bash
# Targeted, non-forced cleanup for one isolated local Supabase project.

pilot_supabase_stop_project() {
  local project_dir="$1"
  local project_id="$2"
  local running_containers
  local stopped_containers
  local volumes
  local networks
  local stop_status=0
  local -a stopped_container_ids=()
  local -a volume_names=()
  local -a network_ids=()

  if pnpm exec supabase --workdir "$project_dir" stop --project-id "$project_id" --no-backup; then
    stop_status=0
  else
    stop_status=$?
  fi
  if [[ "$stop_status" -ne 0 ]]; then
    echo "PILOT_SUPABASE_CLEANUP_FALLBACK: supabase stop returned nonzero for project=$project_id" >&2
  else
    echo "PILOT_SUPABASE_CLEANUP_VERIFY: checking targeted Docker resources for project=$project_id" >&2
  fi

  running_containers=$(docker ps -q --filter "label=com.supabase.cli.project=$project_id" --filter status=running) || {
    echo "PILOT_SUPABASE_CLEANUP_RUNNING_PROBE_FAILED: project=$project_id" >&2
    return 1
  }
  if [[ -n "$running_containers" ]]; then
    echo "PILOT_SUPABASE_CLEANUP_RUNNING_CONTAINERS: project=$project_id" >&2
    return 1
  fi

  stopped_containers=$(docker ps -aq --filter "label=com.supabase.cli.project=$project_id") || {
    echo "PILOT_SUPABASE_CLEANUP_CONTAINER_PROBE_FAILED: project=$project_id" >&2
    return 1
  }
  volumes=$(docker volume ls -q --filter "label=com.supabase.cli.project=$project_id") || {
    echo "PILOT_SUPABASE_CLEANUP_VOLUME_PROBE_FAILED: project=$project_id" >&2
    return 1
  }
  networks=$(docker network ls -q --filter "label=com.supabase.cli.project=$project_id") || {
    echo "PILOT_SUPABASE_CLEANUP_NETWORK_PROBE_FAILED: project=$project_id" >&2
    return 1
  }
  if [[ -z "$stopped_containers" && -z "$volumes" && -z "$networks" ]]; then
    return 0
  fi

  if [[ -n "$stopped_containers" ]]; then
    read -r -a stopped_container_ids <<< "$stopped_containers"
    docker rm "${stopped_container_ids[@]}" >/dev/null || {
      echo "PILOT_SUPABASE_CLEANUP_CONTAINER_REMOVE_FAILED: project=$project_id" >&2
      return 1
    }
  fi

  if [[ -n "$volumes" ]]; then
    read -r -a volume_names <<< "$volumes"
    docker volume rm "${volume_names[@]}" >/dev/null || {
      echo "PILOT_SUPABASE_CLEANUP_VOLUME_REMOVE_FAILED: project=$project_id" >&2
      return 1
    }
  fi

  if [[ -n "$networks" ]]; then
    read -r -a network_ids <<< "$networks"
    docker network rm "${network_ids[@]}" >/dev/null || {
      echo "PILOT_SUPABASE_CLEANUP_NETWORK_REMOVE_FAILED: project=$project_id" >&2
      return 1
    }
  fi

  if [[ -n "$(docker ps -aq --filter "label=com.supabase.cli.project=$project_id")" ]]; then
    echo "PILOT_SUPABASE_CLEANUP_CONTAINERS_REMAIN: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$(docker volume ls -q --filter "label=com.supabase.cli.project=$project_id")" ]]; then
    echo "PILOT_SUPABASE_CLEANUP_VOLUMES_REMAIN: project=$project_id" >&2
    return 1
  fi
  if [[ -n "$(docker network ls -q --filter "label=com.supabase.cli.project=$project_id")" ]]; then
    echo "PILOT_SUPABASE_CLEANUP_NETWORKS_REMAIN: project=$project_id" >&2
    return 1
  fi

  echo "PILOT_SUPABASE_CLEANUP_FALLBACK_OK: project=$project_id" >&2
}
