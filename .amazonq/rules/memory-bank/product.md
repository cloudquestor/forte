# Forte — Product Overview

## Purpose
Forte is a captive portal WiFi authentication system for campuses and societies. It intercepts unauthenticated WiFi users, presents a login page, and grants network access by dynamically managing nftables firewall rules based on MAC addresses.

## Value Proposition
- Lightweight, self-hosted, Docker-based — no cloud dependency
- Firewall-native access control via nftables MAC sets (no RADIUS required)
- Configurable entirely via environment variables
- Supports test/simulation mode via OpenWRT Docker rig

## Key Features
- Username/password login with bcrypt-hashed credentials
- Token-based sessions with configurable TTL (e.g. `8h`, `30m`)
- MAC address allowlisting in nftables on login; removal on logout/expiry
- Admin UI: view active sessions, manage users, force logout
- CORS-configurable API for flexible deployment topologies
- Nginx reverse proxy serves portal SPA and proxies `/api/` to backend
- Runtime-configurable portal branding (app name, tagline, policy text, redirect URL)

## Target Users
- Campus IT administrators managing guest/student WiFi
- Society/community network operators
- Developers building or testing captive portal integrations

## Use Cases
- Guest WiFi login for universities, co-working spaces, housing societies
- Time-limited network access sessions
- Admin-controlled user provisioning without a full RADIUS stack

## Current MVP Scope
- Captive portal with username/password authentication
- Session-based access control (time-limited)
- Admin dashboard (session monitoring, user management)
- MAC-based firewall enforcement via nftables
- Logging of sessions (IP, MAC, timestamps)

## Planned / Future
- OTP (SMS/Email) authentication
- SSO (SAML/OAuth)
- Voucher codes
- Bandwidth throttling
- Advanced analytics, AI anomaly detection
- Multi-tenant support
