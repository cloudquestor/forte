# Forte — Product Overview

## Purpose
Forte is a captive portal WiFi authentication system for campuses and societies. It intercepts unauthenticated clients, presents a login/signup UI, and grants network access by managing firewall rules (nftables) or via TP-Link Omada controller integration.

## Key Features
- Username/password login with JWT-based session tokens
- User self-registration with OTP verification (MSG91 or dummy OTP for dev)
- Password reset via OTP flow
- Admin panel: create/delete users, revoke sessions, view active sessions
- nftables MAC-based allowlist management (direct or via `docker exec` into a router container)
- TP-Link Omada SDN controller integration for EAP/Gateway-based auth
- Configurable branding (app name, tagline, policy text, logo)
- Captive portal redirect support (`?redirect=` query param)
- Policy page with markdown-rendered content

## Target Users
- Campus/society network administrators who need a self-hosted captive portal
- Deployments on OpenWrt routers or Docker-based infrastructure

## Deployment
- Two containers: `forte-backend` (FastAPI) and `forte-portal` (Nginx + React SPA)
- Published to GitHub Container Registry: `ghcr.io/cloudquestor/forte-backend:latest` and `ghcr.io/cloudquestor/forte-portal:latest`
- Configured entirely via environment variables; persistent data stored in a Docker volume at `/data`
