#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
CHART_DIR="$ROOT_DIR/deploy/helm/task-app"
HELM=${HELM:-helm}

if ! command -v "$HELM" >/dev/null 2>&1; then
  if [ -x /opt/homebrew/opt/helm@3/bin/helm ]; then
    HELM=/opt/homebrew/opt/helm@3/bin/helm
  else
    echo "helm 3 is required" >&2
    exit 1
  fi
fi

rendered=$(mktemp)
overridden=$(mktemp)
trap 'rm -f "$rendered" "$overridden"' EXIT INT TERM

"$HELM" lint "$CHART_DIR"
"$HELM" template task-demo "$CHART_DIR" --namespace task-demo >"$rendered"

for kind in ConfigMap Secret Service StatefulSet Job ServiceAccount Deployment Ingress HorizontalPodAutoscaler CronJob; do
  grep -q "^kind: $kind$" "$rendered"
done

grep -q 'helm.sh/hook: post-install,pre-upgrade' "$rendered"
grep -q 'replicas: 2' "$rendered"
grep -q 'storage: 1Gi' "$rendered"
grep -q 'host: task-demo.local' "$rendered"
[ "$(grep -c 'name: wait-for-postgres' "$rendered")" -eq 2 ]

"$HELM" template task-demo "$CHART_DIR" \
  --namespace task-demo \
  --set replicaCount=3 \
  --set ingress.enabled=false \
  --set autoscaling.enabled=false \
  >"$overridden"

grep -q 'replicas: 3' "$overridden"
! grep -q '^kind: Ingress$' "$overridden"
! grep -q '^kind: HorizontalPodAutoscaler$' "$overridden"

if "$HELM" lint "$CHART_DIR" --set replicaCount=0 >/dev/null 2>&1; then
  echo "expected schema validation to reject replicaCount=0" >&2
  exit 1
fi

echo "helm chart contract tests passed"
