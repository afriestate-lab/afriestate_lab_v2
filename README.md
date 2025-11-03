# Afri Estate Web App

A comprehensive property management web application built with Expo Router, React Native Web, and Supabase.

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

## 📱 Tech Stack

- **Framework**: Expo Router with React Native Web
- **Navigation**: Expo Router (file-based routing)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: React Native Paper
- **State Management**: React Context API
- **TypeScript**: Full type safety
- **Payment Integration**: MTN MoMo, Airtel Money, Bank Transfer, Cards
- **Deployment**: Vercel

## 🛠️ Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
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
   Create a `.env` file with the necessary environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `EXPO_PUBLIC_API_URL`: Your API endpoint
   - Additional configuration for payments and services

   See `env.example` for a complete list.

4. **Start the development server**
   ```bash
   npm start
   # or
   npm run web
   ```

5. **Open in browser**
   - The app will open automatically at `http://localhost:8081`
   - Or press `w` to open in web browser

## 🔧 Configuration

### Environment Variables

The app uses the following environment variables (configure in `.env`):

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
EXPO_PUBLIC_API_URL=https://afriestate.com
EXPO_PUBLIC_APP_URL=https://afriestate.com

# App Environment
EXPO_PUBLIC_APP_ENV=production
```

### Supabase Setup

1. Create a Supabase project
2. Set up the database schema (see `supabase/` directory)
3. Configure authentication providers
4. Set up Row Level Security (RLS) policies
5. Configure storage buckets for images

### Payment Integration

The app supports multiple payment methods:
- **MTN MoMo**: Mobile money payments
- **Airtel Money**: Mobile money payments
- **Bank Transfer**: Traditional banking
- **Cards**: Credit/Debit card payments
- **Cash**: Manual payment recording

## 📁 App Structure

```
afriestate_lab_v2/
├── app/                    # Main app screens and components (Expo Router)
│   ├── auth/              # Authentication screens
│   ├── components/        # Reusable components
│   └── _layout.tsx       # Root layout and navigation
├── src/
│   ├── lib/              # Utility functions and configurations
│   ├── types/            # TypeScript type definitions
│   └── config/           # App configuration
├── assets/               # Images, icons, and static files
├── website/              # Static website files
└── dist/                 # Web build output
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

## 🏠 Property Management

### Features
- Property listing with detailed information
- Room availability tracking
- Image upload and management
- Amenities and features listing
- Location-based search
- Booking and reservation system

### Property Types
- Apartments
- Houses
- Villas
- Studios
- Commercial spaces

## 💰 Payment System

### Supported Payment Methods
- **MTN MoMo**: Mobile money
- **Airtel Money**: Mobile money
- **Bank Transfer**: Traditional banking
- **Cards**: Credit/Debit card payments
- **Cash**: Manual recording

### Payment Features
- Payment tracking and history
- Receipt generation
- Payment reminders
- Late payment notifications
- Payment analytics

## 📊 Dashboard Features

### Tenant Dashboard
- Current lease information
- Payment history
- Maintenance requests
- Message center
- Booking history

### Landlord Dashboard
- Property overview
- Revenue analytics
- Tenant management
- Payment tracking
- Property performance

### Manager Dashboard
- Assigned properties
- Tenant coordination
- Maintenance tracking
- Payment assistance

### Admin Dashboard
- User management
- System analytics
- Security monitoring
- Support ticket management

## 🚀 Deployment

### Development
```bash
npm start
```

### Build for Production
```bash
npm run build:web
```

This creates a `dist/` folder with the static web build.

### Deploy to Vercel

1. **Connect your repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your Git repository

2. **Configure Environment Variables**
   - Add all `EXPO_PUBLIC_*` variables in Vercel project settings

3. **Deploy**
   - Push to your main branch (auto-deploy)
   - Or use `vercel --prod`

See `VERCEL_DEPLOYMENT.md` for detailed instructions.

## 🔧 Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npx expo start --clear
   ```

2. **Dependency conflicts**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Build errors**
   ```bash
   npm run clean:cache
   npm run build:web
   ```

### Environment Issues

1. **Supabase connection issues**
   - Verify environment variables
   - Check Supabase project status
   - Verify RLS policies

2. **Payment integration issues**
   - Check API keys
   - Verify webhook configurations
   - Test payment endpoints

## 📄 License

This project is proprietary software developed for Afri Estate property management platform.

## 👥 Contributing

For internal development only. Please contact the development team for access and contribution guidelines.

## 📞 Support

For technical support or questions:
- Email: support@afriestate.com
- Phone: +250 780 0566 266

## 🔄 Version History

- **v2.0.0**: Web-focused release
  - Full web support
  - Vercel deployment ready
  - Optimized for web performance
  - Multi-role authentication
  - Property management system
  - Payment integration
  - Real-time updates

---

**Built with ❤️ by the Afri Estate Development Team**
