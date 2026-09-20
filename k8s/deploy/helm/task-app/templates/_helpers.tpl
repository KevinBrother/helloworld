{{- define "task-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "task-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "task-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "task-app.labels" -}}
helm.sh/chart: {{ include "task-app.chart" . }}
{{ include "task-app.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: k8s-task-demo
{{- end }}

{{- define "task-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "task-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: application
{{- end }}

{{- define "task-app.postgresName" -}}
{{- printf "%s-postgres" (include "task-app.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "task-app.postgresLabels" -}}
app.kubernetes.io/name: postgres
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: database
app.kubernetes.io/part-of: k8s-task-demo
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "task-app.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "task-app.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "task-app.databaseURL" -}}
{{- if .Values.postgres.auth.databaseURL }}
{{- .Values.postgres.auth.databaseURL }}
{{- else }}
{{- printf "postgres://%s:%s@%s:5432/%s?sslmode=disable" .Values.postgres.auth.username .Values.postgres.auth.password (include "task-app.postgresName" .) .Values.postgres.auth.database }}
{{- end }}
{{- end }}

