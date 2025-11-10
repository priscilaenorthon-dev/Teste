# Design Guidelines: Sistema JOMAGA - Tool Management System

## Design Approach
**Selected System**: Material Design principles adapted for internal business application
**Justification**: Information-dense productivity tool requiring clear data hierarchy, strong visual feedback for status changes, and efficient form interactions. Material Design excels at data-heavy enterprise applications with its emphasis on clarity and systematic component patterns.

## Typography System

**Font Family**: Inter (via Google Fonts CDN)
- **Headings**: 
  - H1: text-3xl font-bold (Dashboard titles, page headers)
  - H2: text-2xl font-semibold (Section headers, module titles)
  - H3: text-xl font-semibold (Card headers, table headers)
  - H4: text-lg font-medium (Subsections, dialog titles)
- **Body Text**: 
  - Primary: text-base font-normal (Forms, descriptions, table content)
  - Secondary: text-sm font-normal (Helper text, metadata, timestamps)
  - Labels: text-sm font-medium (Form labels, status badges)
- **Data Display**: 
  - Stats: text-4xl font-bold (Dashboard metrics)
  - Codes: font-mono text-sm (Tool IDs, user matriculation numbers)

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, and 16
- Component padding: p-4 to p-6
- Section margins: mb-8 to mb-12
- Card spacing: gap-6 for grids
- Form field spacing: space-y-4
- Table cell padding: p-4

**Grid System**:
- Dashboard: 3-column grid (lg:grid-cols-3) for metric cards
- Tool inventory: Responsive table with sticky header
- Form layouts: 2-column (lg:grid-cols-2) for efficient data entry
- Mobile: Single column stacking (grid-cols-1)

## Core Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with company logo left-aligned
- User profile dropdown (name, role badge, logout) right-aligned
- Height: h-16
- Shadow: shadow-md for elevation

**Sidebar Navigation** (Desktop):
- Width: w-64
- Collapsible with icon-only mode (w-16)
- Active state: Highlighted background with left border accent
- Icons: Material Icons via CDN
- Menu items: Dashboard, Tools, Loans, Returns, Calibration, Reports, Users (Admin only)

### Dashboard Components

**Metric Cards** (3-column grid):
- Elevated cards with shadow-lg
- Large number display (text-4xl font-bold)
- Icon indicator (Material Icons, size 48px)
- Label beneath number
- Height: h-32
- Padding: p-6

**Alert Panel**:
- Prominent placement below metrics
- List of tools nearing calibration due date (10 days)
- Each alert: Tool name, code, days remaining
- Warning icon with tool count badge

**Recent Activity Table**:
- Latest 10 loan/return transactions
- Columns: Timestamp, User, Tool, Action, Status
- Striped rows for readability
- Compact row height: h-12

### Tool Management

**Tool Inventory Table**:
- Full-width responsive table
- Columns: Code, Name, Class, Model, Quantity, Status, Actions
- Sortable headers (clickable with sort icons)
- Status badges: Pill-shaped with distinct visual treatment per state (Available, Loaned, Calibration, Out of Service)
- Row actions: Icon buttons for Edit, Delete (Admin), Quick Loan
- Pagination: Bottom-aligned, showing "X-Y of Z tools"
- Search bar: Top-right with filter dropdowns (Class, Model, Status)

**Tool Detail Modal**:
- Large centered modal (max-w-2xl)
- Header: Tool name and code
- Two-column layout for specifications
- Loan history table embedded
- Calibration timeline (if applicable)
- Action buttons: Edit, Delete, Close

### Loan/Return Process

**Loan Form**:
- Two-step process clearly indicated
- Step 1 - Operator Section: Tool selector (searchable dropdown), User selector (searchable dropdown)
- Step 2 - User Confirmation: Large confirmation card requiring user login (email/password fields)
- Auto-generated Cautela preview: Shows user name, tool details, date/time, confirmation checkbox
- Submit button: Large, prominent (h-12)

**Cautela (Loan Term) Document**:
- Print-optimized layout
- Header: Company name, document title
- Body: User details, tool specifications, date/time
- Footer: Digital signature confirmation, system-generated ID
- Export as PDF button prominently displayed

### Forms & Data Entry

**Standard Form Pattern**:
- Label above input (text-sm font-medium)
- Input fields: h-10 with border and focus ring
- Required field indicator: Red asterisk
- Helper text: text-sm below field
- Error messages: Red text with icon
- Submit/Cancel buttons: Right-aligned, primary button h-10

**User Registration Form**:
- Fields: Full Name, Matriculation ID, Department (dropdown), Email, Password, Confirm Password, Role (dropdown: Admin/Operator/User)
- Profile upload placeholder (optional image)
- Two-column layout on desktop

**Tool Registration Form**:
- Fields: Name, Code/ID, Class (dropdown), Model (radio: Normal/Calibration), Quantity (number input), Status (dropdown)
- Conditional fields for Calibration: Last calibration date (date picker), Calibration interval (number input with unit selector)
- Add/edit mode clearly indicated in header

### Reports Module

**Report Builder**:
- Filter panel: Date range picker, User filter, Department filter, Tool class filter
- Report type selector: Loaned tools, Loan history, Calibration schedule
- Generate button: Prominent (h-12)
- Export options: PDF and Excel icons

**Report Display Table**:
- Dynamic columns based on report type
- Sortable headers
- Row highlighting for overdue items
- Summary footer with totals

### Alerts & Notifications

**Calibration Alerts**:
- Notification badge on sidebar Calibration menu item
- Alert list: Tool name, code, due date, days remaining
- Visual urgency indicator: Gradient from yellow (10 days) to red (overdue)

### Permissions & Access Control

**Role-Based UI Elements**:
- Admin: All modules visible, delete actions enabled
- Operator: Tools, Loans, Returns, Calibration, Reports visible
- User: Dashboard showing "My Loaned Tools" only
- Disabled actions: Greyed out with tooltip explaining permission requirement

## Interaction Patterns

**Table Interactions**:
- Hover: Row background highlight
- Click: Opens detail modal or navigates to detail page
- Checkbox selection: Bulk actions toolbar appears

**Form Validation**:
- Real-time validation on blur
- Error state: Red border, error icon, message below field
- Success state: Green checkmark icon

**Loading States**:
- Spinner overlay for async operations
- Skeleton loaders for tables and cards during initial load
- Progress bar for file uploads (reports)

## Responsive Behavior

**Desktop (lg+)**:
- Sidebar navigation + main content area
- Multi-column layouts for forms and dashboards
- Full data tables with all columns

**Tablet (md)**:
- Collapsible sidebar or hamburger menu
- 2-column grids reduce to single column
- Horizontal scroll for wide tables

**Mobile (base)**:
- Bottom navigation bar (5 key icons)
- Stacked layouts
- Card-based tool list instead of table
- Simplified forms with accordion sections

## Images

No hero images required. This is a utility application focused on data management.

**Icon Usage**:
- Material Icons throughout via CDN
- Tool class icons in inventory
- Status icons in tables and badges
- User profile avatars (initials fallback)