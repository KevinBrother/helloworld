package web

import "embed"

// Files contains the server-rendered page and its static assets.
//
//go:embed templates/*.html static/*
var Files embed.FS
