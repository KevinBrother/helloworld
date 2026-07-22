#!/bin/sh
set -eu

PROFILE=${PROFILE:-k8s-demo}

command -v minikube >/dev/null 2>&1 || {
  echo "minikube is required" >&2
  exit 1
}
command -v kubectl >/dev/null 2>&1 || {
  echo "kubectl is required" >&2
  exit 1
}

minikube start -p "$PROFILE" --driver=docker --cpus=4 --memory=6144
minikube addons enable ingress -p "$PROFILE"
minikube addons enable metrics-server -p "$PROFILE"
kubectl config use-context "$PROFILE" >/dev/null

current_context=$(kubectl config current-context)
[ "$current_context" = "$PROFILE" ] || {
  echo "expected kubectl context $PROFILE, got $current_context" >&2
  exit 1
}

kubectl wait --for=condition=Ready node --all --timeout=180s
echo "Minikube profile $PROFILE is ready"
