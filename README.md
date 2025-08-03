# Icumbi Mobile App

A comprehensive React Native mobile application for property management, built with Expo and Supabase.

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
- **Offline Support**: Cached data for offline functionality
- **Multi-language Support**: English and Kinyarwanda localization

## 📱 Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: React Native Paper
- **State Management**: React Context API
- **TypeScript**: Full type safety
- **Payment Integration**: IremboPay, MTN MoMo, Flutterwave

## 🛠️ Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)
- Supabase account

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MRobert045/Icumbi.mobile-app.git
   cd Icumbi.mobile-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   The `.env` file is already configured with the necessary environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `EXPO_PUBLIC_API_URL`: Your API endpoint
   - Additional configuration for payments and services

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## 🔧 Configuration

### Environment Variables

The app uses the following environment variables (already configured in `.env`):

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://sgektsymnqkyqcethveh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
EXPO_PUBLIC_API_URL=https://icumbi.com
EXPO_PUBLIC_APP_URL=https://icumbi.com

# App Environment
EXPO_PUBLIC_APP_ENV=production

# Admin Configuration
EXPO_PUBLIC_SUPER_ADMIN_EMAIL=mugisha@icumbi.com
EXPO_PUBLIC_SUPER_ADMIN_NAME=Icumbi Developers
EXPO_PUBLIC_SUPER_ADMIN_PHONE=+250780566973
```

### Supabase Setup

1. Create a Supabase project
2. Set up the database schema (see `supabase/` directory)
3. Configure authentication providers
4. Set up Row Level Security (RLS) policies
5. Configure storage buckets for images

### Payment Integration

The app supports multiple payment methods:
- **IremboPay**: Rwandan government payment system
- **MTN MoMo**: Mobile money payments
- **Flutterwave**: International payments
- **Cash**: Manual payment recording

## 📱 App Structure

```
mobile-app/
├── app/                    # Main app screens and components
│   ├── auth/              # Authentication screens
│   ├── components/        # Reusable components
│   └── _layout.tsx       # Root layout and navigation
├── src/
│   ├── lib/              # Utility functions and configurations
│   ├── types/            # TypeScript type definitions
│   └── config/           # App configuration
├── assets/               # Images, icons, and static files
├── ios/                  # iOS-specific configuration
└── android/              # Android-specific configuration
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
- **IremboPay**: Government services integration
- **MTN MoMo**: Mobile money
- **Airtel Money**: Mobile money
- **Bank Transfer**: Traditional banking
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
npx expo start
```

### Production Build
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for production
eas build --platform ios
eas build --platform android
```

## 📱 Testing

### Manual Testing
1. Install Expo Go on your device
2. Scan the QR code from `npx expo start`
3. Test all user flows and features

### Automated Testing
```bash
npm test
```

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

3. **iOS build issues**
   ```bash
   cd ios && pod install
   ```

4. **Android build issues**
   ```bash
   cd android && ./gradlew clean
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

This project is proprietary software developed for Icumbi property management platform.

## 👥 Contributing

For internal development only. Please contact the development team for access and contribution guidelines.

## 📞 Support

For technical support or questions:
- Email: mugisha@icumbi.com
- Phone: +250780566973

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
- Multi-role authentication
- Property management system
- Payment integration
- Real-time updates
- Offline support

---

**Built with ❤️ by the Icumbi Development Team** 