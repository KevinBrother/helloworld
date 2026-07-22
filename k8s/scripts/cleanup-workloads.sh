#!/bin/sh
set -eu

NAMESPACE=${NAMESPACE:-task-demo}

kubectl -n "$NAMESPACE" delete \
  deployment/task-app \
  service/task-app \
  ingress/task-app \
  horizontalpodautoscaler/task-app \
  cronjob/task-cleanup \
  job/task-app-migrate \
  --ignore-not-found

echo "Application workloads removed."
echo "Preserving statefulset/postgres and its PVC. Run scripts/cleanup-all.sh to delete data."
