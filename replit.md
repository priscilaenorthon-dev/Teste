# Sistema JOMAGA - Tool Management System

## Overview

This is a comprehensive tool management system (Sistema JOMAGA) designed for industrial/manufacturing environments. The system manages the complete lifecycle of tools including inventory tracking, loan/return workflows, calibration scheduling, and multi-role access control. Built as a full-stack TypeScript application with a React frontend and Express backend, it provides role-based dashboards for administrators, operators, and end users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing

**UI Component Strategy:**
- Shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- Material Design principles adapted for data-heavy business applications
- Tailwind CSS for utility-first styling with custom design tokens
- Material Icons for consistent iconography

**State Management:**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- React Hook Form with Zod for type-safe form validation and state
- Session-based authentication state managed through React Query

**Design System:**
- Custom color palette with HSL-based theming supporting light/dark modes
- Typography system using Inter font family for UI and Roboto Mono for data/codes
- Responsive grid layouts: 3-column dashboard, 2-column forms, single-column mobile
- Consistent spacing scale using Tailwind's spacing units (2, 4, 6, 8, 12, 16)

### Backend Architecture

**Server Framework:**
- Express.js REST API with TypeScript
- Session-based authentication using express-session
- Bcrypt for secure password hashing (10 salt rounds)

**API Design:**
- RESTful endpoints organized by resource (tools, users, loans, classes, models)
- Role-based authorization middleware (admin, operator, user)
- CRUD operations for all primary entities
- Specialized endpoints for dashboard statistics and calibration alerts

**Authentication & Authorization:**
- Username/password authentication (replacing email-based login per requirements)
- Session persistence with configurable secret and 7-day expiry
- Three-tier role system:
  - **Admin**: Full system access, user management, all CRUD operations
  - **Operator**: Tool management, loan/return processing, report generation
  - **User**: View own loans, confirm tool receipt
- Middleware chain: session loading → authentication check → role verification

**Data Access Layer:**
- Storage abstraction pattern via IStorage interface
- Repository pattern for database operations
- Type-safe data models derived from Drizzle schema

### Database Design

**ORM & Migrations:**
- Drizzle ORM for type-safe database queries and schema management
- PostgreSQL as the primary database via Neon serverless
- Migration-based schema versioning (stored in `/migrations`)

**Core Data Models:**

1. **Users Table:**
   - Authentication: username (unique), hashed password
   - Profile: firstName, lastName, email, matriculation (employee ID), department
   - Role-based access control field
   - QR code: unique qrCode field (varchar, unique) for badge-based authentication
   - QR codes automatically generated using nanoid(16) for all users

2. **Tools Table:**
   - Identification: code (unique), name
   - Relationships: classId (foreign key), modelId (foreign key)
   - Inventory: quantity, status (available, loaned, calibration, out_of_service)
   - Calibration tracking: lastCalibrationDate, nextCalibrationDate

3. **Tool Classes Table:**
   - Hierarchical categorization (cutting, measuring, fastening, etc.)
   - Name and description fields

4. **Tool Models Table:**
   - Distinguishes calibration requirements (Normal vs. Calibration models)
   - Fields: name, requiresCalibration (boolean), calibrationIntervalDays

5. **Loans Table:**
   - Tracking: toolId, userId, quantity loaned
   - Timestamps: loanDate, returnDate (nullable for active loans)
   - Status: 'active' or 'returned'
   - Audit trail of all tool movements

6. **Calibration Alerts Table:**
   - Automated alerting for tools approaching calibration due dates
   - Links to tools requiring maintenance

7. **Sessions Table:**
   - Express session persistence for authentication state
   - Required for production deployment

**Database Relationships:**
- Tools → Classes (many-to-one)
- Tools → Models (many-to-one)
- Loans → Tools (many-to-one)
- Loans → Users (many-to-one)

### External Dependencies

**Core Infrastructure:**
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Replit Platform**: Development environment with integrated deployment
  - Replit Auth integration (optional OIDC-based authentication)
  - Development tooling plugins (cartographer, dev banner, error overlay)

**Third-Party Libraries:**

1. **Authentication & Security:**
   - bcrypt: Password hashing and verification
   - express-session: Session management
   - connect-pg-simple: PostgreSQL session store

2. **Validation & Type Safety:**
   - Zod: Runtime type validation and schema definition
   - @hookform/resolvers: React Hook Form + Zod integration
   - drizzle-zod: Generate Zod schemas from Drizzle tables

3. **UI Component Libraries:**
   - @radix-ui/*: 20+ accessible component primitives (dialogs, dropdowns, menus, etc.)
   - cmdk: Command palette component
   - date-fns: Date manipulation and formatting with Portuguese locale support
   - jsPDF + jspdf-autotable: PDF generation for custody terms and reports

4. **Build & Development:**
   - esbuild: Fast server-side bundling for production
   - tsx: TypeScript execution for development server
   - Vite plugins for Replit-specific features

**API Integration Points:**
- Google Fonts CDN: Inter and Roboto Mono font families
- Material Icons: Icon font for consistent UI symbols

**QR Code Implementation:**
- Library: @zxing/library for QR code scanning, qrcode for image generation
- Scanner component: React component using getUserMedia API for camera access
- Badge printing: QR codes displayed in user management page with download capability
- Loan confirmation: Dual-tab interface allowing Login/Senha or QR Code authentication
- **Security Architecture (Discriminated Union Pattern):**
  - Backend: Zod-validated discriminated union for loan confirmation
    - Method "manual": Requires email and password
    - Method "qrcode": Requires actual QR code string (not boolean flag)
  - Server-side QR validation: Backend re-validates QR code against database via `storage.getUserByQRCode()`
  - Defense-in-depth: Backend verifies QR code belongs to selected user (prevents impersonation)
  - No trust in client flags: System cannot be bypassed by sending fake authentication flags
- Backend endpoints: 
  - POST /api/auth/validate-qrcode: Returns user data for matched QR codes (used for UX validation)
  - POST /api/loans: Re-validates QR code server-side before creating loan (security validation)

**Implemented Features:**
✅ QR code authentication for badge-based loan confirmation
✅ Server-side QR code re-validation (prevents authentication bypass)
✅ Discriminated union API contract for type-safe loan confirmation
✅ QR Code display modal with loading states and download functionality
✅ Multi-tool loan processing in single transaction
✅ Automated PDF generation for custody terms (Termo de Responsabilidade)
✅ Advanced reporting with date range, department, and tool type filters
✅ Dashboard analytics with usage metrics and calibration compliance tracking