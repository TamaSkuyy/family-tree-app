package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
}

var defaultLimiter = &RateLimiter{
	visitors: make(map[string]*visitor),
}

const (
	loginLimit     = 5
	registerLimit  = 3
	authAPILimit   = 100
	publicAPILimit = 30
)

func init() {
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			defaultLimiter.cleanup()
		}
	}()
}

func (rl *RateLimiter) getVisitor(key string, limit rate.Limit) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[key]
	if !exists {
		lim := rate.NewLimiter(limit, int(limit))
		rl.visitors[key] = &visitor{limiter: lim, lastSeen: time.Now()}
		return lim
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	for ip, v := range rl.visitors {
		if time.Since(v.lastSeen) > 10*time.Minute {
			delete(rl.visitors, ip)
		}
	}
}

func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		path := c.Request.URL.Path

		var lim *rate.Limiter
		switch {
		case matchPath(path, "/api/v1/auth/login"):
			lim = defaultLimiter.getVisitor(ip+"_login", loginLimit)
		case matchPath(path, "/api/v1/auth/register"):
			lim = defaultLimiter.getVisitor(ip+"_register", registerLimit)
		default:
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				lim = defaultLimiter.getVisitor(ip, authAPILimit)
			} else {
				lim = defaultLimiter.getVisitor(ip, publicAPILimit)
			}
		}

		if !lim.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded, try again later",
			})
			return
		}
		c.Next()
	}
}

func matchPath(path, target string) bool {
	return len(path) >= len(target) && path[:len(target)] == target
}
