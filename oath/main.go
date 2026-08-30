package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// ===================== 配置 =====================
const (
	jwtSecret          = "your-super-secret-shared-key-change-in-prod" // 共享对称密钥
	accessTokenTTL     = 15 * time.Minute                              // 15 分钟 JWT
	refreshTokenTTL    = 7 * 24 * time.Hour                            // Refresh 7 天
	cookieNameRefresh  = "refresh_token"
)

// ===================== 数据结构 =====================

type User struct {
	ID              string
	Username        string
	Password        string // 演示用，实际应存哈希
	SecurityVersion int    // 安全版本，改密/强制下线时 +1
}

type Session struct {
	ID              string
	UserID          string
	RefreshToken    string
	SecurityVersion int
	Status          string // "active" | "revoked"
	ExpiresAt       time.Time
}

type Claims struct {
	UserID          string `json:"user_id"`
	SessionID       string `json:"session_id"`
	SecurityVersion int    `json:"security_version"`
	jwt.RegisteredClaims
}

// ===================== 内存存储（实际用 Redis） =====================

var (
	usersMu    sync.RWMutex
	users      = map[string]*User{} // username -> user

	sessionsMu sync.RWMutex
	sessions   = map[string]*Session{} // sessionID -> session
)

func init() {
	// 初始化一个演示用户
	users["alice"] = &User{
		ID:              "u-001",
		Username:        "alice",
		Password:        "password123",
		SecurityVersion: 1,
	}
}

// ===================== 工具函数 =====================

func generateJWT(userID, sessionID string, securityVersion int) (string, error) {
	claims := Claims{
		UserID:          userID,
		SessionID:       sessionID,
		SecurityVersion: securityVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "demo-auth",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

func parseJWT(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, fmt.Errorf("invalid token")
}

func setRefreshCookie(w http.ResponseWriter, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameRefresh,
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // 生产环境必须 true + HTTPS
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Now().Add(refreshTokenTTL),
	})
}

func clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameRefresh,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})
}

// ===================== 业务逻辑 =====================

// 登录：创建会话 + 发 Access JWT + Refresh Cookie
func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	usersMu.RLock()
	user, ok := users[req.Username]
	usersMu.RUnlock()
	if !ok || user.Password != req.Password {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	// 创建会话
	sessionID := uuid.New().String()
	refreshToken := uuid.New().String()

	session := &Session{
		ID:              sessionID,
		UserID:          user.ID,
		RefreshToken:    refreshToken,
		SecurityVersion: user.SecurityVersion,
		Status:          "active",
		ExpiresAt:       time.Now().Add(refreshTokenTTL),
	}

	sessionsMu.Lock()
	sessions[sessionID] = session
	sessionsMu.Unlock()

	// 签发 15 分钟 Access JWT
	accessToken, err := generateJWT(user.ID, sessionID, user.SecurityVersion)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	// 设置 Refresh Cookie
	setRefreshCookie(w, refreshToken)

	json.NewEncoder(w).Encode(map[string]string{
		"access_token": accessToken,
		"message":      "login success",
	})
}

// 受保护接口：每次都回查会话状态 + 安全版本
func protectedHandler(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	if len(auth) < 8 || auth[:7] != "Bearer " {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	tokenStr := auth[7:]

	// 1. 验证 JWT 签名 + 过期
	claims, err := parseJWT(tokenStr)
	if err != nil {
		http.Error(w, "invalid or expired token", http.StatusUnauthorized)
		return
	}

	// 2. 回查会话状态
	sessionsMu.RLock()
	session, ok := sessions[claims.SessionID]
	sessionsMu.RUnlock()

	if !ok || session.Status != "active" || time.Now().After(session.ExpiresAt) {
		http.Error(w, "session revoked or expired", http.StatusUnauthorized)
		return
	}

	// 3. 检查用户安全版本（改密后旧 Token 立即失效）
	usersMu.RLock()
	var user *User
	for _, u := range users {
		if u.ID == claims.UserID {
			user = u
			break
		}
	}
	usersMu.RUnlock()

	if user == nil || user.SecurityVersion != claims.SecurityVersion {
		http.Error(w, "security version mismatch (password changed?)", http.StatusUnauthorized)
		return
	}

	// 全部通过
	json.NewEncoder(w).Encode(map[string]string{
		"message":  "protected resource accessed",
		"user_id":  claims.UserID,
		"session":  claims.SessionID,
	})
}

// Refresh：轮换 Refresh Token
func refreshHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(cookieNameRefresh)
	if err != nil {
		http.Error(w, "missing refresh cookie", http.StatusUnauthorized)
		return
	}
	oldRefresh := cookie.Value

	// 查找对应会话
	sessionsMu.Lock()
	defer sessionsMu.Unlock()

	var session *Session
	for _, s := range sessions {
		if s.RefreshToken == oldRefresh {
			session = s
			break
		}
	}
	if session == nil || session.Status != "active" || time.Now().After(session.ExpiresAt) {
		http.Error(w, "invalid or revoked refresh token", http.StatusUnauthorized)
		return
	}

	// 检查安全版本
	usersMu.RLock()
	var user *User
	for _, u := range users {
		if u.ID == session.UserID {
			user = u
			break
		}
	}
	usersMu.RUnlock()
	if user == nil || user.SecurityVersion != session.SecurityVersion {
		http.Error(w, "security version mismatch", http.StatusUnauthorized)
		return
	}

	// ===== 轮换：旧 Refresh 立即失效，发新的 =====
	newRefresh := uuid.New().String()
	session.RefreshToken = newRefresh
	session.ExpiresAt = time.Now().Add(refreshTokenTTL) // 可选择是否滑动过期

	// 签发新的 Access JWT
	accessToken, err := generateJWT(user.ID, session.ID, user.SecurityVersion)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	setRefreshCookie(w, newRefresh)

	json.NewEncoder(w).Encode(map[string]string{
		"access_token": accessToken,
		"message":      "token refreshed (refresh rotated)",
	})
}

// 登出：撤销当前会话
func logoutHandler(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	if len(auth) < 8 {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	claims, err := parseJWT(auth[7:])
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	sessionsMu.Lock()
	if s, ok := sessions[claims.SessionID]; ok {
		s.Status = "revoked"
	}
	sessionsMu.Unlock()

	clearRefreshCookie(w)
	json.NewEncoder(w).Encode(map[string]string{"message": "logged out, session revoked"})
}

// 修改密码：安全版本 +1，所有旧会话立即失效
func changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username    string `json:"username"`
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	usersMu.Lock()
	user, ok := users[req.Username]
	if !ok || user.Password != req.OldPassword {
		usersMu.Unlock()
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	user.Password = req.NewPassword
	user.SecurityVersion++ // 关键：安全版本递增
	newVersion := user.SecurityVersion
	usersMu.Unlock()

	// 可选：同时把该用户所有会话都标为 revoked
	sessionsMu.Lock()
	for _, s := range sessions {
		if s.UserID == user.ID {
			s.Status = "revoked"
		}
	}
	sessionsMu.Unlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":          "password changed, all old sessions invalidated",
		"security_version": newVersion,
	})
}

// ===================== 启动 =====================

func main() {
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/protected", protectedHandler)
	http.HandleFunc("/refresh", refreshHandler)
	http.HandleFunc("/logout", logoutHandler)
	http.HandleFunc("/change-password", changePasswordHandler)

	fmt.Println("Server running on :8080")
	fmt.Println("演示流程：")
	fmt.Println("1. POST /login          {\"username\":\"alice\",\"password\":\"password123\"}")
	fmt.Println("2. GET  /protected      Header: Authorization: Bearer <access_token>")
	fmt.Println("3. POST /refresh        （自动带 Cookie）")
	fmt.Println("4. POST /logout         Header: Authorization: Bearer <access_token>")
	fmt.Println("5. POST /change-password {\"username\":\"alice\",\"old_password\":\"password123\",\"new_password\":\"newpass\"}")
	http.ListenAndServe(":8080", nil)
}
