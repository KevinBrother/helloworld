#!/bin/sh
set -eu

PROFILE=${PROFILE:-k8s-demo}
NAMESPACE=${NAMESPACE:-task-demo}
TARGET=kubernetes
LOCAL_PORT=${LOCAL_PORT:-}
PORT_FORWARD_PID=
PORT_FORWARD_LOG="${TMPDIR:-/tmp}/task-demo-port-forward.$$.log"

cleanup() {
  if [ -n "$PORT_FORWARD_PID" ]; then
    kill "$PORT_FORWARD_PID" >/dev/null 2>&1 || true
    wait "$PORT_FORWARD_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$PORT_FORWARD_LOG"
}
trap cleanup EXIT INT TERM

case "${1:-}" in
  "")
    ;;
  --target=compose)
    TARGET=compose
    ;;
  --target=kubernetes)
    ;;
  *)
    echo "usage: $0 [--target=compose|--target=kubernetes]" >&2
    exit 2
    ;;
esac

wait_for_url() {
  url=$1
  attempts=${2:-60}
  count=0
  until curl --fail --silent "$url" >/dev/null 2>&1; do
    count=$((count + 1))
    [ "$count" -lt "$attempts" ] || {
      echo "timed out waiting for $url" >&2
      return 1
    }
    sleep 1
  done
}

wait_for_port_forward() {
  attempts=${1:-30}
  count=0
  while [ "$count" -lt "$attempts" ]; do
    if grep -F "Forwarding from" "$PORT_FORWARD_LOG" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$PORT_FORWARD_PID" >/dev/null 2>&1; then
      cat "$PORT_FORWARD_LOG" >&2
      echo "kubectl port-forward exited before becoming ready" >&2
      return 1
    fi
    count=$((count + 1))
    sleep 1
  done
  cat "$PORT_FORWARD_LOG" >&2
  echo "timed out waiting for kubectl port-forward" >&2
  return 1
}

verify_api() {
  base_url=$1
  marker="verify-$(date +%s)"
  created=$(curl --fail --silent --show-error \
    -X POST "$base_url/api/v1/tasks" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"$marker\",\"description\":\"automated verification\"}")
  id=$(printf '%s' "$created" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p')
  [ -n "$id" ] || {
    echo "could not extract task id from create response" >&2
    return 1
  }

  curl --fail --silent --show-error \
    -X PUT "$base_url/api/v1/tasks/$id" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"$marker-updated\",\"description\":\"verified update\"}" \
    >/dev/null
  curl --fail --silent --show-error \
    -X PATCH "$base_url/api/v1/tasks/$id/status" \
    -H "Content-Type: application/json" \
    -d '{"status":"completed"}' \
    >/dev/null
  curl --fail --silent --show-error "$base_url/api/v1/tasks?status=completed" |
    grep -F "$marker-updated" >/dev/null
  curl --fail --silent --show-error \
    -X DELETE "$base_url/api/v1/tasks/$id" \
    >/dev/null
}

if [ "$TARGET" = "compose" ]; then
  BASE_URL=${COMPOSE_URL:-http://127.0.0.1:${APP_PORT:-8080}}
  wait_for_url "$BASE_URL/health/ready" 60
  curl --fail --silent --show-error "$BASE_URL/health/live" >/dev/null
  verify_api "$BASE_URL"
  echo "Compose verification passed: $BASE_URL"
  exit 0
fi

current_context=$(kubectl config current-context 2>/dev/null || true)
[ "$current_context" = "$PROFILE" ] || {
  echo "expected kubectl context $PROFILE, got ${current_context:-none}" >&2
  exit 1
}

kubectl -n "$NAMESPACE" rollout status statefulset/postgres --timeout=180s
kubectl -n "$NAMESPACE" wait --for=condition=complete job/task-app-migrate --timeout=120s
kubectl -n "$NAMESPACE" rollout status deployment/task-app --timeout=180s
kubectl -n "$NAMESPACE" wait \
  --for=condition=Ready \
  pod \
  -l app.kubernetes.io/name=task-app,app.kubernetes.io/component=application \
  --timeout=120s

if [ -n "$LOCAL_PORT" ]; then
  port_binding="$LOCAL_PORT:80"
else
  port_binding=":80"
fi

kubectl -n "$NAMESPACE" port-forward service/task-app "$port_binding" \
  >"$PORT_FORWARD_LOG" 2>&1 &
PORT_FORWARD_PID=$!
wait_for_port_forward 30

if [ -z "$LOCAL_PORT" ]; then
  LOCAL_PORT=$(sed -n \
    's/^Forwarding from 127\.0\.0\.1:\([0-9][0-9]*\) ->.*/\1/p' \
    "$PORT_FORWARD_LOG" | head -n 1)
  [ -n "$LOCAL_PORT" ] || {
    cat "$PORT_FORWARD_LOG" >&2
    echo "could not determine local port-forward port" >&2
    exit 1
  }
fi

BASE_URL="http://127.0.0.1:$LOCAL_PORT"
wait_for_url "$BASE_URL/health/ready" 60
curl --fail --silent --show-error "$BASE_URL/health/live" >/dev/null
verify_api "$BASE_URL"

ingress_address=$(kubectl -n "$NAMESPACE" get ingress task-app \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
if [ -n "$ingress_address" ]; then
  echo "Ingress address: $ingress_address"
else
  echo "Ingress has no address yet; use port-forward or minikube tunnel -p $PROFILE"
fi

echo "Kubernetes verification passed"
