#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
PROFILE=${PROFILE:-k8s-demo}
IMAGE=${IMAGE:-task-app:dev}
NAMESPACE=${NAMESPACE:-task-demo}
K8S_DIR="$ROOT/deploy/k8s"
LOCAL_SECRET="$K8S_DIR/11-secret.local.yaml"

current_context=$(kubectl config current-context 2>/dev/null || true)
[ "$current_context" = "$PROFILE" ] || {
  echo "kubectl context must be $PROFILE; run make cluster-up first" >&2
  exit 1
}

docker build -t "$IMAGE" "$ROOT"
PROFILE="$PROFILE" IMAGE="$IMAGE" "$ROOT/scripts/load-image.sh"

if [ ! -f "$LOCAL_SECRET" ]; then
  cp "$K8S_DIR/11-secret.example.yaml" "$LOCAL_SECRET"
  echo "Created development Secret at $LOCAL_SECRET"
fi

kubectl apply -f "$K8S_DIR/00-namespace.yaml"
kubectl apply -f "$LOCAL_SECRET"
kubectl apply -f "$K8S_DIR/10-configmap.yaml"
kubectl apply -f "$K8S_DIR/20-postgres-service.yaml"
kubectl apply -f "$K8S_DIR/21-postgres-statefulset.yaml"
kubectl -n "$NAMESPACE" rollout status statefulset/postgres --timeout=240s

kubectl -n "$NAMESPACE" delete job task-app-migrate --ignore-not-found --wait=true
kubectl apply -f "$K8S_DIR/30-migration-job.yaml"
kubectl -n "$NAMESPACE" wait \
  --for=condition=complete \
  job/task-app-migrate \
  --timeout=180s

kubectl apply -f "$K8S_DIR/40-app-serviceaccount.yaml"
kubectl apply -f "$K8S_DIR/41-app-deployment.yaml"
kubectl apply -f "$K8S_DIR/42-app-service.yaml"
kubectl apply -f "$K8S_DIR/50-ingress.yaml"
kubectl apply -f "$K8S_DIR/60-hpa.yaml"
kubectl apply -f "$K8S_DIR/70-maintenance-cronjob.yaml"
kubectl -n "$NAMESPACE" rollout status deployment/task-app --timeout=240s

minikube_ip=$(minikube ip -p "$PROFILE")
cat <<EOF
Deployment ready.

Direct access:
  kubectl -n $NAMESPACE port-forward service/task-app 8080:80
  open http://127.0.0.1:8080

Ingress access:
  Add "$minikube_ip task-demo.local" to /etc/hosts, then open http://task-demo.local
  On macOS with the Docker driver, "minikube tunnel -p $PROFILE" may be required.
EOF
