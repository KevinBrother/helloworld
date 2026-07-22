#!/bin/sh
set -eu

PROFILE=${PROFILE:-k8s-demo}
NAMESPACE=${NAMESPACE:-task-demo}

current_context=$(kubectl config current-context 2>/dev/null || true)
[ "$current_context" = "$PROFILE" ] || {
  echo "expected kubectl context $PROFILE, got ${current_context:-none}" >&2
  exit 1
}

echo "== Workloads =="
kubectl -n "$NAMESPACE" get deployment,statefulset,pod,job,cronjob,hpa
echo
echo "== Network =="
kubectl -n "$NAMESPACE" get service,ingress
echo
echo "== Storage =="
kubectl -n "$NAMESPACE" get pvc
echo
echo "== Recent events =="
kubectl -n "$NAMESPACE" get events --sort-by=.lastTimestamp | tail -n 20
