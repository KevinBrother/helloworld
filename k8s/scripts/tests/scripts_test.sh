#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_file() {
  [ -f "$ROOT/$1" ] || fail "missing $1"
  sh -n "$ROOT/$1" || fail "invalid shell syntax in $1"
}

assert_contains() {
  grep -F -- "$2" "$ROOT/$1" >/dev/null || fail "$1 must contain: $2"
}

for script in \
  scripts/cluster-up.sh \
  scripts/load-image.sh \
  scripts/deploy.sh \
  scripts/verify.sh \
  scripts/status.sh \
  scripts/cleanup-workloads.sh \
  scripts/cleanup-all.sh
do
  assert_file "$script"
done

assert_contains scripts/cluster-up.sh 'addons enable ingress'
assert_contains scripts/cluster-up.sh 'addons enable metrics-server'
assert_contains scripts/load-image.sh 'docker image rm -f'
assert_contains scripts/load-image.sh 'minikube image load'
assert_contains scripts/deploy.sh 'load-image.sh'
assert_contains scripts/deploy.sh 'condition=complete'
assert_contains scripts/verify.sh '--target=compose'
assert_contains scripts/verify.sh 'rollout status statefulset/postgres'
assert_contains scripts/verify.sh 'kill -0 "$PORT_FORWARD_PID"'
assert_contains scripts/verify.sh 'Forwarding from'
assert_contains scripts/cleanup-all.sh '--yes-delete-data'
assert_contains scripts/cleanup-workloads.sh 'statefulset/postgres'

printf 'PASS: deployment script contracts\n'
