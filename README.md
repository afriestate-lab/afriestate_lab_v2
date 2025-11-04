# Afri Estate Web App

A comprehensive property management web application built with Next.js 14+, React, and Supabase.

## 🚀 Features

- **Multi-role Authentication**: Landlord, Tenant, Manager, and Admin roles
- **Property Management**: Add, edit, and manage properties with detailed information
- **Room Booking**: Real-time room availability and booking system
- **Payment Processing**: Integrated payment system with multiple payment methods
- **Tenant Dashboard**: Comprehensive tenant portal with lease management
- **Landlord Dashboard**: Property overview and management tools
- **Manager Portal**: Property management and tenant coordination
- **Admin Panel**: System administration and user management
- **Real-time Updates**: Live data synchronization with Supabase
- **Multi-language Support**: English and Kinyarwanda localization
- **Responsive Design**: Fully responsive across all devices (mobile, tablet, desktop)
- **SEO Optimized**: Server-side rendering and metadata support

## 📱 Tech Stack

- **Framework**: Next.js 14+ with App Router
- **UI Library**: Shadcn/ui with Tailwind CSS
- **Navigation**: Next.js App Router (file-based routing)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Context API
- **TypeScript**: Full type safety
- **Payment Integration**: MTN MoMo, Airtel Money, Bank Transfer, Cards
- **Deployment**: Vercel (recommended)

## 🛠️ Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd afriestate_lab_v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the necessary environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   See `.env.local.example` for a complete list.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - The app will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Payment Configuration
NEXT_PUBLIC_MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
NEXT_PUBLIC_MTN_MOMO_SUBSCRIPTION_KEY=your_subscription_key
NEXT_PUBLIC_MTN_MOMO_API_USER_ID=your_api_user_id
NEXT_PUBLIC_MTN_MOMO_API_KEY=your_api_key

# App Configuration
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,rw
```

### Supabase Setup

1. Create a Supabase project
2. Set up the database schema (see `supabase/` directory)
3. Configure authentication providers
4. Set up Row Level Security (RLS) policies
5. Configure storage buckets for images

## 📁 Project Structure

```
afriestate_lab_v2/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   │   ├── tenant/        # Tenant dashboard
│   │   ├── landlord/      # Landlord dashboard
│   │   └── admin/         # Admin dashboard
│   ├── auth/              # Auth routes
│   ├── properties/        # Property management
│   ├── tenants/           # Tenant management
│   ├── payments/          # Payment management
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── src/
│   ├── components/        # React components
│   │   └── ui/            # Shadcn/ui components
│   ├── lib/               # Utility functions
│   │   ├── supabase.ts    # Supabase client
│   │   ├── roleGuard.ts   # Role-based access control
│   │   └── helpers.ts     # Helper functions
│   └── types/             # TypeScript definitions
├── public/                # Static assets
├── middleware.ts          # Next.js middleware for route protection
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## 🔐 Authentication

The app supports multiple authentication methods:
- **Phone Number**: Primary authentication method
- **Email**: Alternative authentication
- **Role-based Access**: Different dashboards for different roles

### User Roles

1. **Tenant**: View properties, book rooms, manage payments
2. **Landlord**: Manage properties, view tenants, track revenue
3. **Manager**: Assist landlords with property management
4. **Admin**: System administration and user management

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Deploy to Vercel

1. **Connect your repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your Git repository

2. **Configure Environment Variables**
   - Add all `NEXT_PUBLIC_*` variables in Vercel project settings

3. **Deploy**
   - Push to your main branch (auto-deploy)
   - Or use `vercel --prod`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 📄 License

This project is proprietary software developed for Afri Estate property management platform.

## 📞 Support

For technical support or questions:
- Email: support@afriestate.com
- Phone: +250 780 0566 266

## 🔄 Version History

- **v2.0.0**: Next.js conversion
  - Migrated from Expo/React Native to Next.js
  - Full web support with SSR/SSG
  - Responsive design across all devices
  - Shadcn/ui component library
  - SEO optimized

---

**Built with ❤️ by the Afri Estate Development Team**
