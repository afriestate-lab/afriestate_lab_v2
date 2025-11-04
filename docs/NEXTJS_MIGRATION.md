# Next.js Migration Guide

This document describes the migration from Expo/React Native to Next.js.

## Migration Summary

The application has been successfully migrated from Expo/React Native to Next.js 14+ with the following changes:

### Core Changes

1. **Framework**: Expo Router → Next.js App Router
2. **UI Library**: React Native Paper → Shadcn/ui
3. **Styling**: StyleSheet → Tailwind CSS
4. **Storage**: AsyncStorage → localStorage
5. **Icons**: Expo Vector Icons → Lucide React
6. **Routing**: Expo Router → Next.js App Router
7. **Navigation**: React Navigation → Next.js Link + useRouter

### File Structure Changes

- `app/index.tsx` → `app/page.tsx`
- `app/_layout.tsx` → `app/layout.tsx`
- `app/auth/sign-in.tsx` → `app/auth/sign-in/page.tsx`
- All route files converted to Next.js App Router structure

### Component Conversions

- React Native `View` → HTML `div`
- React Native `Text` → HTML `p`, `span`, `h1-h6`
- React Native `TouchableOpacity` → HTML `button`
- React Native `Image` → Next.js `Image`
- React Native `ScrollView` → HTML `div` with overflow
- React Native `FlatList` → CSS Grid/Flexbox with map

### Key Features Preserved

- ✅ Multi-role authentication
- ✅ Role-based access control
- ✅ Property management
- ✅ Payment processing
- ✅ Multi-language support (EN/RW)
- ✅ Dark mode
- ✅ Real-time data with Supabase

## Next Steps

Some components still need conversion:
- Forms (add-property, add-tenant, etc.)
- Modals (booking, property details, etc.)
- Charts (replace react-native-chart-kit with recharts)

These can be converted incrementally as needed.

