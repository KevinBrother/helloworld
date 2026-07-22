#!/bin/sh
set -eu

NAMESPACE=${NAMESPACE:-task-demo}
CONFIRMATION=${1:-}

if [ "$CONFIRMATION" != "--yes-delete-data" ]; then
  printf 'This deletes namespace %s and its PostgreSQL data.\n' "$NAMESPACE"
  printf 'Type delete-data to continue: '
  read -r answer
  [ "$answer" = "delete-data" ] || {
    echo "Cancelled"
    exit 1
  }
fi

kubectl delete namespace "$NAMESPACE" --ignore-not-found
echo "Namespace $NAMESPACE and its persistent data were deleted"
