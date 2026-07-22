FROM golang:1.22-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
      -trimpath -ldflags="-s -w" \
      -o /out/server ./cmd/server \
    && CGO_ENABLED=0 GOOS=linux go build \
      -trimpath -ldflags="-s -w" \
      -o /out/migrate ./cmd/migrate

FROM alpine:3.20

RUN apk add --no-cache ca-certificates \
    && addgroup -g 65532 -S app \
    && adduser -u 65532 -S -G app -H app

WORKDIR /app

COPY --from=build /out/server /app/server
COPY --from=build /out/migrate /app/migrate

USER 65532:65532

EXPOSE 8080

ENTRYPOINT ["/app/server"]
