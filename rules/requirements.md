# WiFi Authentication System

## 1. Overview

### Goal
Build a system to authenticate users before granting WiFi access and enforce access policies such as session duration, bandwidth limits, and device restrictions.

---

## 2. High-Level Architecture

### Components

- **Access Point / Controller**
  - WiFi router or enterprise controller
  - Supports captive portal or RADIUS integration

- **Captive Portal (Frontend)**
  - Login interface presented to users

- **Authentication Server**
  - Validates user credentials (OTP, SSO, etc.)

- **Authorization Engine**
  - Determines access policies (time, bandwidth, roles)


- **User Database**
  - Stores users, devices, sessions

- **Session Manager**
  - Tracks active sessions and expiry

---

## 3. User Flow

1. User connects to WiFi (SSID)
2. User is redirected to Captive Portal
3. User selects login method:
   - Mobile OTP
   - Email OTP
   - Username/Password
   - SSO (SAML/OAuth)
   - Voucher Code
4. Authentication Server validates credentials
5. Authorization Engine applies policies:
   - Session duration
   - Bandwidth limits
   - Device binding
6. Access is granted via Controller/RADIUS
7. Session is tracked
8. Session expires or user logs out

---

## 4. Authentication Models

### 4.1 Captive Portal
- Browser-based login
- Suitable for guest users
- Easy to implement

### 4.2 WPA2/WPA3 Enterprise (802.1X)
- Strong security
- Used for employees
- No browser login required

### 4.3 MAC-Based Authentication
- Device-based access
- Less secure
- Suitable for IoT devices

---

## 5. Functional Requirements

### 5.1 User Management
- User registration (self-service/admin)
- OTP verification
- Device binding (limit devices per user)

### 5.2 Authentication
- Multiple login methods
- Retry and lockout handling
- OTP rate limiting

### 5.3 Authorization
- Role-based access:
  - Guest
  - Employee
  - Admin
- Time-based access control
- Bandwidth throttling

### 5.4 Session Management
- Track active sessions
- Force disconnect capability
- Auto session expiry

### 5.5 Logging & Audit
- Login attempts
- User ↔ IP ↔ MAC mapping
- Usage tracking

### 5.6 Admin Portal
- User management
- Voucher generation
- Active session monitoring
- Analytics dashboard

---

## 6. Non-Functional Requirements

### 6.1 Security
- HTTPS for captive portal
- WPA2/WPA3 encryption
- Protection against brute force attacks
- Partial mitigation for MAC spoofing

### 6.2 Scalability
- Support 100 to 10,000+ concurrent users
- Stateless authentication services

### 6.3 Performance
- Login response time < 2 seconds
- Minimal latency overhead

### 6.4 Compliance
- Maintain logs of:
  - User identity
  - IP address
  - MAC address
  - Session timestamps
- Retain logs as per regulatory requirements

---

## 7. Suggested Technology Stack

### Backend
- Node.js / Python (FastAPI)

### Frontend
- React (Captive Portal UI)

### Authentication
- OTP-based (SMS/Email)
- SSO (SAML/OAuth)
- Optional: Keycloak / Cognito

### RADIUS
- FreeRADIUS (containerized)

### Database
- DynamoDB (sessions, users)
- RDS (if relational model required)

### Infrastructure
- Kubernetes (EKS)
- API Gateway / Load Balancer

---

## 8. System Flow Diagram (Logical)
User Device
↓
WiFi Access Point
↓
Captive Portal (Login Page)
↓
Authentication Server
↓
Authorization Engine
↓
RADIUS / Controller
↓
Internet Access Granted
↓
Session Manager (Tracking)


---

## 9. Key Design Decisions

- Guest vs Employee vs Hybrid system
- Authentication method (OTP, SSO, Voucher)
- RADIUS vs direct controller integration
- Cloud vs On-Prem deployment
- Logging and compliance requirements

---

## 10. MVP Scope

### Included
- Captive portal
- Mobile OTP authentication
- Basic session control (time-based)
- Admin dashboard (basic)
- Logging (IP, MAC, session)

### Excluded (Future Enhancements)
- Advanced analytics
- AI-based anomaly detection
- Multi-tenant support
- Device fingerprinting

---

## 11. Future Enhancements

- AI-based user behavior analysis
- Dynamic bandwidth allocation
- Integration with enterprise IAM
- Device posture checks
- Zero Trust Network Access (ZTNA)

---

## 12. Notes

- Prefer hybrid approach:
  - Captive portal for guests
  - 802.1X for employees
- Ensure compliance with local data retention laws
- Design for extensibility and modularity