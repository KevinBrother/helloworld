#!/bin/sh
set -eu

PROFILE=${PROFILE:-k8s-demo}
IMAGE=${IMAGE:-task-app:dev}

# The Docker driver can retain an older image behind the same local tag.
minikube ssh -p "$PROFILE" -- docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
minikube image load -p "$PROFILE" --overwrite=true "$IMAGE"
