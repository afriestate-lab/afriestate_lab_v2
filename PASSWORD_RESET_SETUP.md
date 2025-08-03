# 🔐 Mobile App Password Reset Setup Guide

## 🎯 **Issue**
The "Wibagiwe ijambo ry'ibanga" (Forgot Password) functionality in the mobile app is not working.

## 🔧 **Root Cause**
The mobile app cannot reach the web API endpoint because:
1. **API URL Configuration**: The mobile app needs the correct API URL
2. **Network Access**: Mobile devices cannot access `localhost:3000`
3. **Environment Variables**: Missing or incorrect configuration

## 🚀 **Solution**

### **Step 1: Configure API URL**

Create a `.env` file in the `mobile-app` directory:

```bash
# Navigate to mobile app directory
cd mobile-app

# Create .env file
touch .env
```

Add the following content to `mobile-app/.env`:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://sgektsymnqkyqcethveh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWt0c3ltbnFreXFjZXRodmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzE5NzIsImV4cCI6MjA1MDU0Nzk3Mn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8

# API Configuration
# For development: Use your computer's IP address
# Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
# EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000

# For production: Use your domain
EXPO_PUBLIC_API_URL=https://icumbi.com
```

### **Step 2: Find Your Computer's IP Address**

**On Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig | findstr "IPv4"
```

**Example Output:**
```
inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
```

Use the IP address (e.g., `192.168.1.100`) in your `.env` file.

### **Step 3: Start the Web Server**

Make sure your web server is running:

```bash
# In the main project directory
npm run dev
# or
yarn dev
```

### **Step 4: Test the Connection**

1. **Open your mobile app**
2. **Go to Sign In screen**
3. **Tap "Wibagiwe ijambo ry'ibanga?"**
4. **Enter your email or phone number**
5. **Tap "Ohereza"**
6. **Check the console logs for debugging information**

### **Step 5: Verify Network Access**

Make sure your mobile device and computer are on the same network (same WiFi).

## 🔍 **Debugging**

### **Check Console Logs**
The mobile app now includes detailed logging. Look for:

```
🔗 Attempting password reset with URL: http://192.168.1.100:3000/api/auth/reset-password
📧 Reset data: { identifier: "test@example.com", identifierType: "email" }
📡 Response status: 200
✅ API Response: { success: true, message: "..." }
```

### **Common Issues**

1. **"Network request failed"**
   - Check if your computer's IP is correct
   - Ensure both devices are on same network
   - Verify web server is running

2. **"404 Not Found"**
   - Check if API endpoint exists
   - Verify server is running on correct port

3. **"Connection refused"**
   - Check firewall settings
   - Ensure server is accessible from network

## 🧪 **Testing**

### **Test with Real Device**
1. Install the app on a real device
2. Connect both devices to same WiFi
3. Test the password reset flow

### **Test with Simulator/Emulator**
For iOS Simulator:
```bash
# Use localhost
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For Android Emulator:
```bash
# Use 10.0.2.2 (Android emulator's localhost)
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

## 📱 **Mobile App Features**

### **Enhanced Error Handling**
- ✅ Network error detection
- ✅ Detailed error messages in Kinyarwanda
- ✅ Console logging for debugging
- ✅ Graceful fallback messages

### **User Experience**
- ✅ Email/Phone toggle
- ✅ Real-time validation
- ✅ Loading states
- ✅ Success/error feedback

## 🔧 **Troubleshooting**

### **If Still Not Working:**

1. **Check Network:**
   ```bash
   # Test from mobile device
   ping YOUR_COMPUTER_IP
   ```

2. **Check Server:**
   ```bash
   # Test API endpoint
   curl http://YOUR_COMPUTER_IP:3000/api/auth/reset-password
   ```

3. **Check Firewall:**
   - Allow port 3000 in firewall
   - Ensure server accepts external connections

4. **Alternative: Use Production URL**
   ```env
   EXPO_PUBLIC_API_URL=https://icumbi.com
   ```

## ✅ **Success Indicators**

When working correctly, you should see:
- ✅ Modal opens when tapping "Wibagiwe ijambo ry'ibanga?"
- ✅ Email/Phone toggle works
- ✅ Validation messages appear
- ✅ Success message after submission
- ✅ Console logs show API communication

---

**Last Updated**: January 2025
**Status**: ✅ Ready for Testing 