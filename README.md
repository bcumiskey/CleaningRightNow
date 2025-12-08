# Cleaning Right Now - Business Management System

A comprehensive, production-ready web application for managing a short-term rental cleaning business. Built with Next.js 14, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL.

## Features

### Dashboard
- Today's jobs overview with quick access
- Upcoming schedule preview
- Financial metrics (revenue, expenses, pending payments, team owed)
- Recent activity feed
- Low stock alerts for supplies

### Calendar & Schedule
- Monthly calendar view with color-coded jobs
- Click to view job details
- Status-based color coding (Scheduled, In Progress, Completed, Cancelled)

### Properties Management
- Complete property list with search/filter
- Property details: name, address, square footage, base rate
- Owner information (name, phone, email)
- Property groups for organization
- Special notes/instructions per property
- Linen inventory per property
- Supply inventory per property
- Photo gallery per property

### Jobs Management
- Create/edit jobs with property selection
- Date and time scheduling
- Multiple service selection with configurable prices
- Team member assignment
- Automatic payment calculation:
  - Total amount
  - Business expense percentage (default 12%)
  - Team payout split equally among assigned members
- Status tracking (Scheduled, In Progress, Completed, Cancelled)
- Client payment status tracking
- Team payment status tracking
- Job-specific notes

### Team Management
- Team member roster (name, phone, email)
- Active/inactive status
- Job history per member
- Auto-calculated total owed per team member
- Payment tracking

### Linen Tracking
- Track linens per property
- Linen types (sheets, towels, etc.) with quantities
- Condition tracking (Good, Fair, Damaged, Needs Replacement)
- Replacement history

### Supply Inventory
- General supply tracking
- Quantity, unit, and cost per unit
- Low stock threshold alerts
- Category organization
- Restock functionality

### Laundry Services
- Track laundry drop-off/pickup
- Property assignment
- Service provider tracking
- Status tracking (Dropped Off, Ready for Pickup, Picked Up, Delivered)
- Cost tracking

### Invoicing
- Generate professional invoices from completed jobs
- Auto-generated invoice numbers
- Property owner information
- Itemized services
- Tax support
- Print-friendly layout
- Paid/Unpaid status tracking

### Reporting
- Revenue over time charts
- Expense breakdown
- Team earnings summary
- Property activity reports
- Export to CSV

### Audit Log
- Complete change tracking
- Filter by action type (Create, Update, Delete)
- Filter by entity type
- User attribution

### Settings
- Business information for invoices
- Default expense percentage
- Service management (add/remove services)
- Password change

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CleaningRightNow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/cleaning_right_now?schema=public"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

   # Initial admin credentials
   ADMIN_EMAIL="admin@cleaningrightnow.com"
   ADMIN_PASSWORD="your-secure-password"
   ```

4. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Set up the database**
   ```bash
   # Push schema to database
   npx prisma db push

   # Or run migrations (for production)
   npx prisma migrate dev
   ```

6. **Seed the database**
   ```bash
   npm run db:seed
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

9. **Login**
   Use the admin credentials from your `.env` file

### Database Commands

```bash
# Push schema changes to database
npm run db:push

# Run migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will detect Next.js automatically

3. **Set up Database**

   **Option A: Vercel Postgres**
   - Go to your Vercel dashboard
   - Navigate to Storage
   - Create a new Postgres database
   - Connect it to your project

   **Option B: Neon (Recommended)**
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string

4. **Configure Environment Variables**

   In Vercel dashboard, add these environment variables:
   ```
   DATABASE_URL=your-postgres-connection-string
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
   ADMIN_EMAIL=your-admin-email
   ADMIN_PASSWORD=your-secure-password
   ```

5. **Run Database Setup**

   After first deployment, run migrations:
   ```bash
   npx vercel env pull .env.local
   npx prisma db push
   npm run db:seed
   ```

6. **Redeploy**
   - Push any changes or trigger redeploy in Vercel

### Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Full URL of your app | Yes |
| `NEXTAUTH_SECRET` | Random secret for sessions | Yes |
| `ADMIN_EMAIL` | Initial admin email | Yes (for seed) |
| `ADMIN_PASSWORD` | Initial admin password | Yes (for seed) |

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── dashboard/     # Dashboard data
│   │   ├── properties/    # Properties CRUD
│   │   ├── jobs/          # Jobs CRUD
│   │   ├── team/          # Team members CRUD
│   │   ├── services/      # Services CRUD
│   │   ├── supplies/      # Supplies CRUD
│   │   ├── linens/        # Linens CRUD
│   │   ├── laundry/       # Laundry records CRUD
│   │   ├── invoices/      # Invoices CRUD
│   │   ├── audit-log/     # Audit logs
│   │   ├── settings/      # User settings
│   │   └── reports/       # Reporting data
│   ├── calendar/          # Calendar view
│   ├── properties/        # Properties pages
│   ├── jobs/              # Jobs pages
│   ├── team/              # Team pages
│   ├── supplies/          # Supplies pages
│   ├── linens/            # Linens pages
│   ├── laundry/           # Laundry pages
│   ├── invoices/          # Invoices pages
│   ├── reports/           # Reports pages
│   ├── audit-log/         # Audit log pages
│   ├── settings/          # Settings pages
│   ├── login/             # Login page
│   └── page.tsx           # Dashboard (home)
├── components/            # React components
│   ├── layout/            # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── ui/                # Reusable UI components
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   ├── StatCard.tsx
│   │   ├── Table.tsx
│   │   └── Textarea.tsx
│   └── Providers.tsx      # App providers
├── lib/                   # Utility functions
│   ├── auth.ts            # NextAuth configuration
│   ├── audit.ts           # Audit logging utilities
│   ├── prisma.ts          # Prisma client
│   └── utils.ts           # Helper functions
└── types/                 # TypeScript types
    ├── index.ts           # App types
    └── next-auth.d.ts     # NextAuth type extensions

prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Database seeding script
```

## Default Services

The app comes with these default services (configurable in Settings):

1. **Standard Clean** - $100
2. **Deep Clean** - $200
3. **Laundry** - $50
4. **Window Cleaning** - $75

## Future Extensibility

The application is structured to support future additions:

- **Google Calendar Integration**: Structure in place for syncing jobs
- **Turno API Integration**: Ready for property management platform integration
- **Additional Service Types**: Easily add new services via Settings
- **Team Permissions**: Database structure supports role-based access
- **Multi-user Support**: Can be extended for multiple business accounts

## Support

For issues or questions, please open an issue on GitHub.

## License

Private - All rights reserved.
