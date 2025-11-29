# Profaith Church Management System

A comprehensive church management platform built with Next.js and Supabase, with a companion mobile app for members.

## Features

- **Member Management** - Maintain detailed member profiles with contact information, ministry involvement, and giving history
- **Giving & Donations** - Track tithes, offerings, and contributions across different categories (Building Fund, Missions, Events)
- **Ministry Management** - Organize church ministries with leaders and member assignments
- **Small Groups** - Manage cell groups with meeting schedules and member rosters
- **Communication** - Create and distribute announcements to the entire church or specific groups
- **Financial Tracking** - Generate giving statements and financial reports
- **Secure Authentication** - Role-based access control for members, leaders, and administrators

## Tech Stack

- **Framework**: Next.js 15
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe (for donations/offerings)
- **UI**: Tailwind CSS, Material-UI
- **Charts**: Chart.js, Recharts

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables (create a `.env.local` file):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database Setup

Run the migrations in the `supabase/migrations` folder to set up your database schema:

```bash
supabase db push
```

## Project Structure

```
profaith/
├── src/                   # Web application (Next.js)
│   ├── app/              # Next.js app directory
│   │   ├── account/      # Main dashboard
│   │   ├── members/      # Member directory
│   │   ├── projects/     # Church projects/campaigns
│   │   ├── ministries/   # Ministry management
│   │   ├── groups/       # Small groups
│   │   └── api/         # API routes
│   ├── components/       # Reusable UI components
│   ├── modules/         # Feature modules
│   └── lib/             # Utilities and helpers
├── mobile/              # Mobile app (React Native/Expo)
│   ├── src/
│   │   ├── screens/     # App screens
│   │   ├── components/  # Mobile components
│   │   ├── navigation/  # Navigation setup
│   │   └── config/      # Configuration
│   └── README.md        # Mobile app documentation
└── supabase/            # Database migrations and functions
```

## Key Features

### Member Dashboard
- View giving history and contribution statistics
- Track involvement in ministries and small groups
- Access personal giving statements

### Admin Features
- Complete member directory with search and filters
- Financial reporting and giving statements
- Ministry and small group management
- Announcement creation and distribution
- Project/campaign management for fundraising

### Donation Processing
- Secure Stripe integration for online giving
- Support for different giving categories (Tithes, Building Fund, Missions, Events)
- Automated receipt generation
- Year-end giving statements

## Mobile App

A companion mobile application is available for church members, providing easy access to:
- Make donations and payments
- View payment history
- Track membership status
- Update profile information

See the [mobile app documentation](mobile/README.md) for setup and usage instructions.

## Contributing

This is a church management system. For questions or support, contact your church administrator.

## License

Private - For church use only
