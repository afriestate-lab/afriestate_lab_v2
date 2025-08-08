import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../_layout'
import { useLanguage } from '@/lib/languageContext'
import { router } from 'expo-router'

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme()
  const { t } = useLanguage()

  console.log('🔍 Privacy Policy Screen Component Loading...')
  console.log('🔍 Privacy Policy Screen Component Rendered')

  const handleBack = () => {
    console.log('🔍 Back button pressed')
    router.back()
  }

  const openWebsitePrivacy = () => {
    Linking.openURL('https://icumbi.com/privacy')
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, zIndex: 9999 }]}>
      {/* Test Banner */}
      <View style={[styles.testBanner, { backgroundColor: '#ff0000' }]}>
        <Text style={styles.testBannerText}>
          🔍 PRIVACY PAGE IS LOADING - IF YOU SEE THIS, THE PAGE IS WORKING!
        </Text>
      </View>
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Privacy Policy & Terms
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Privacy Policy for Icumbi Mobile App
          </Text>
          <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
            Last Updated: August 18, 2025
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Welcome to Icumbi ("we," "our," or "us"). This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the Icumbi mobile application ("App").
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            By using our App, you agree to the collection and use of information in accordance with this policy. If you do not agree with this policy, please do not use our App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            1. Information We Collect
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Personal Information:</Text>{'\n'}
            • Full Name: Your complete name as provided during registration{'\n'}
            • Phone Number: Your 10-digit Rwandan phone number (primary identifier){'\n'}
            • Email Address: Your email address for account verification{'\n'}
            • Password: Securely encrypted password for account authentication{'\n'}
            • Role: Your role in the platform (tenant, landlord, manager, admin){'\n'}
            • Profile Picture: Optional avatar image (if provided)
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Property and Rental Information:</Text>{'\n'}
            • Property Details: Property names, addresses, descriptions{'\n'}
            • Property Images: Photos of properties and rooms (with consent){'\n'}
            • Rental Information: Lease terms, payment amounts, rental history{'\n'}
            • Location Data: Property addresses and general location information
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Payment Information:</Text>{'\n'}
            • Payment Method: Your chosen payment method (MTN MoMo, Airtel Money, Bank Transfer, Cards, Cash){'\n'}
            • Payment Amounts: Transaction amounts and payment history{'\n'}
            • Transaction IDs: Unique identifiers for payment tracking{'\n'}
            • Phone Numbers: For mobile money payments (Airtel phone numbers)
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Device and Technical Information:</Text>{'\n'}
            • Device Information: Device type, operating system, app version{'\n'}
            • Usage Data: App usage patterns, features accessed, interaction data{'\n'}
            • Network Information: Internet connection type and network status{'\n'}
            • Crash Reports: App performance and error data (anonymized)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            2. How We Use Your Information
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Account Management:</Text>{'\n'}
            • Create and manage your user account{'\n'}
            • Authenticate your identity and maintain account security{'\n'}
            • Provide personalized user experience based on your role{'\n'}
            • Send account-related notifications and updates
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Property Management:</Text>{'\n'}
            • Display and manage property listings{'\n'}
            • Process property bookings and reservations{'\n'}
            • Handle tenant-landlord communications{'\n'}
            • Generate property reports and analytics
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Payment Processing:</Text>{'\n'}
            • Process rental payments and transactions{'\n'}
            • Generate payment receipts and records{'\n'}
            • Track payment history and financial reports{'\n'}
            • Handle payment disputes and refunds
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>App Functionality:</Text>{'\n'}
            • Provide core app features and services{'\n'}
            • Improve app performance and user experience{'\n'}
            • Debug technical issues and maintain app stability{'\n'}
            • Ensure app security and prevent fraud
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            3. Information Sharing and Disclosure
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>With Your Consent:</Text>{'\n'}
            We may share your information with third parties only when you explicitly consent to such sharing.
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Service Providers:</Text>{'\n'}
            We may share information with trusted service providers who assist us in payment processing, cloud storage, analytics, and customer support.
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Legal Requirements:</Text>{'\n'}
            We may disclose your information when required by law, including court orders, subpoenas, legal requests, government authorities, and to protect user safety or prevent fraud.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            4. Data Security
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Security Measures:</Text>{'\n'}
            • Encryption: All data is encrypted in transit and at rest{'\n'}
            • Authentication: Secure login and multi-factor authentication{'\n'}
            • Access Controls: Limited access to personal information{'\n'}
            • Regular Audits: Security assessments and vulnerability testing
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Data Retention:</Text>{'\n'}
            We retain your information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and improve our services.
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Data Deletion:</Text>{'\n'}
            You may request deletion of your account and personal information by contacting us at support@icumbi.com. We will process your request within 30 days.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            5. Your Rights and Choices
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Access and Control:</Text>{'\n'}
            You have the right to:{'\n'}
            • Access: View and download your personal information{'\n'}
            • Correct: Update or modify your information{'\n'}
            • Delete: Request deletion of your account and data{'\n'}
            • Portability: Export your data in a machine-readable format
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Communication Preferences:</Text>{'\n'}
            You can control how we communicate with you through email notifications, push notifications, and SMS messages.
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Location Services:</Text>{'\n'}
            You can control location access by enabling/disabling location services and managing location permissions in device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            6. Children's Privacy
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Our App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            7. Third-Party Services
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Payment Processors:</Text>{'\n'}
            Our payment processing partners include MTN Mobile Money, Airtel Money, Banking Partners, and Card Processors.
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Analytics and Monitoring:</Text>{'\n'}
            We use third-party services for app analytics, crash reporting, and customer support management.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            8. Changes to This Policy
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by displaying a notice in the app, sending an email to your registered address, or posting the updated policy on our website.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            9. Contact Information
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          <Text style={[styles.contactInfo, { color: theme.text }]}>
            Email: support@icumbi.com{'\n'}
            Phone: +250 780 0566 266{'\n'}
            Address: Kigali, Rwanda{'\n'}
            Website: https://icumbi.com/privacy
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            10. Complaints and Disputes
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            If you have concerns about our data practices, you may:{'\n'}
            • Contact Us: Reach out to our privacy team{'\n'}
            • Data Protection Authority: File a complaint with the relevant authority{'\n'}
            • Legal Action: Pursue legal remedies as available under law
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            11. Governing Law
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            This Privacy Policy is governed by the laws of Rwanda. Any disputes arising from this policy will be resolved in accordance with Rwandan law.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            12. Consent
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            By using the Icumbi mobile app, you consent to the collection, use, and sharing of your information as described in this Privacy Policy.
          </Text>
        </View>

        {/* Terms and Conditions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Terms and Conditions
          </Text>
          <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
            Effective Date: August 18, 2025
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            By accessing and using the Icumbi mobile application, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            1. Acceptance of Terms
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            By downloading, installing, or using the Icumbi app, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            2. User Accounts and Registration
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Account Creation:</Text>{'\n'}
            • You must provide accurate and complete information when creating an account{'\n'}
            • You are responsible for maintaining the confidentiality of your account credentials{'\n'}
            • You must be at least 18 years old to create an account{'\n'}
            • One person may only create one account
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Account Responsibilities:</Text>{'\n'}
            • You are responsible for all activities that occur under your account{'\n'}
            • You must notify us immediately of any unauthorized use{'\n'}
            • You must keep your contact information up to date
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            3. Service Description
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Icumbi provides a platform for property rentals, payments, and management services including:{'\n'}
            • Property listing and search functionality{'\n'}
            • Rental payment processing{'\n'}
            • Tenant and landlord communication tools{'\n'}
            • Property management features
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            4. Payment Terms
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Payment Processing:</Text>{'\n'}
            • All payments are processed through secure third-party providers{'\n'}
            • Payment methods include MTN MoMo, Airtel Money, bank transfers, and cards{'\n'}
            • Transaction fees may apply and will be clearly displayed{'\n'}
            • Refunds are subject to our refund policy
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            <Text style={styles.bold}>Rental Payments:</Text>{'\n'}
            • Rent payments are due as agreed between tenant and landlord{'\n'}
            • Late payment fees may apply as specified in rental agreements{'\n'}
            • Payment history is tracked and available in your account
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            5. User Conduct
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            You agree not to:{'\n'}
            • Use the app for any illegal or unauthorized purpose{'\n'}
            • Violate any laws or regulations{'\n'}
            • Infringe on the rights of others{'\n'}
            • Upload harmful or malicious content{'\n'}
            • Attempt to gain unauthorized access to our systems{'\n'}
            • Use the app to harass, abuse, or harm other users
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            6. Property Listings and Accuracy
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            • Property owners are responsible for the accuracy of their listings{'\n'}
            • We do not guarantee the accuracy of property information{'\n'}
            • Users should verify property details before making commitments{'\n'}
            • We reserve the right to remove inappropriate or inaccurate listings
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            7. Limitation of Liability
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Icumbi shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the app. Our total liability shall not exceed the amount paid by you for our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            8. Termination
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms and Conditions or is harmful to other users, us, or third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            9. Changes to Terms
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We reserve the right to modify these terms at any time. We will notify users of any material changes via app notification or email. Continued use after changes constitutes acceptance of the new terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            10. Dispute Resolution
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Any disputes arising from these terms shall be resolved through binding arbitration in accordance with the laws of Rwanda. You agree to resolve disputes individually and not as part of a class action.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
            11. Contact Information
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            For questions about these Terms and Conditions, please contact us:
          </Text>
          <Text style={[styles.contactInfo, { color: theme.text }]}>
            Email: support@icumbi.com{'\n'}
            Phone: +250 780 0566 266{'\n'}
            Address: Kigali, Rwanda{'\n'}
            Website: https://icumbi.com
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.websiteButton, { backgroundColor: theme.primary }]}
            onPress={openWebsitePrivacy}
          >
            <Text style={[styles.websiteButtonText, { color: '#fff' }]}>
              View Full Privacy Policy & Terms on Website
            </Text>
            <Ionicons name="open-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  testBanner: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBannerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  contactInfo: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 8,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  websiteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bold: {
    fontWeight: 'bold',
  },
}) 