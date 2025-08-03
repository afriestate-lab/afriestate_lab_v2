import { useEffect } from 'react';
import { router } from 'expo-router';

export default function AuthIndex() {
  useEffect(() => {
    router.replace('/auth/sign-in');
  }, []);
  return null;
} 