import { 
  buildRegistrationConfirmationTemplate, 
  RegistrationEmailPayload,
  EmailDispatchResult
} from '../services/emailService';
import { db } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface FirebaseUserRecordPayload {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

/**
 * Core handler logic for the Firebase Authentication user creation trigger.
 * Can be run in Firebase Cloud Functions environment or invoked via server endpoint.
 */
export async function handleFirebaseAuthUserCreated(
  user: FirebaseUserRecordPayload,
  options?: {
    preferredCountry?: string;
    preferredCurrency?: string;
    primaryGoal?: string;
    targetAmount?: number;
  }
): Promise<EmailDispatchResult> {
  const { uid, email, displayName } = user;

  if (!email) {
    throw new Error(`Cannot send welcome email: user ${uid} does not have an email address.`);
  }

  // 1. Check if user profile already exists in Firestore
  let userName = displayName || email.split('@')[0] || 'Valued Investor';
  let country = options?.preferredCountry || 'Ireland';
  let preferredCurrency = options?.preferredCurrency || 'EUR';
  let primaryGoal = options?.primaryGoal || 'Dublin / Irish Home Deposit';
  let targetAmount = options?.targetAmount || 85000;

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      userName = data.name || userName;
      country = data.country || country;
      preferredCurrency = data.preferredCurrency || preferredCurrency;
      primaryGoal = data.primaryLifeStageGoal || primaryGoal;
      targetAmount = Number(data.targetLifeGoalAmount) || targetAmount;
    } else {
      // Initialize profile doc
      await setDoc(userDocRef, {
        uid,
        name: userName,
        email,
        country,
        preferredCurrency,
        primaryLifeStageGoal: primaryGoal,
        targetLifeGoalAmount: targetAmount,
        registeredAt: new Date().toISOString(),
        authTriggerProcessed: true
      }, { merge: true });
    }
  } catch (err) {
    console.warn('[Auth Welcome Trigger] Firestore read note:', err);
  }

  // 2. Prepare payload using emailService template generator
  const emailPayload: RegistrationEmailPayload = {
    userId: uid,
    name: userName,
    email,
    country,
    preferredCurrency,
    primaryGoal,
    targetAmount
  };

  const { subject, html, text } = buildRegistrationConfirmationTemplate(emailPayload);

  // 3. Dispatch transactional welcome email via server mailer endpoint
  const response = await fetch('/api/auth/send-auto-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      name: userName,
      goalTitle: primaryGoal,
      targetAmount,
      triggerType: 'FIREBASE_AUTH_ON_CREATE'
    })
  });

  const data = await response.json();
  const messageId = data.emailDispatch?.messageId || `auth_cf_${Date.now()}`;
  const previewUrl = data.emailDispatch?.previewUrl || null;

  // 4. Log in Firestore under users/{uid}/emails
  try {
    const emailRef = doc(db, 'users', uid, 'emails', messageId);
    await setDoc(emailRef, {
      emailId: messageId,
      userId: uid,
      recipientEmail: email,
      recipientName: userName,
      subject,
      dispatchedAt: new Date().toISOString(),
      status: 'DELIVERED',
      transport: 'FIREBASE_CLOUD_FUNCTIONS',
      trigger: 'functions.auth.user().onCreate',
      previewUrl,
      summary: `Automated welcome email dispatched via Firebase Auth onCreate trigger to ${email}.`,
      htmlContent: html
    });
  } catch (err) {
    console.warn('[Auth Welcome Trigger] Firestore email audit log note:', err);
  }

  return {
    success: response.ok,
    messageId,
    dispatchedAt: new Date().toISOString(),
    provider: 'FIREBASE_CLOUD_FUNCTIONS',
    recipient: email,
    subject,
    summary: `Firebase Auth onCreate trigger sent welcome email to ${email}`,
    previewUrl
  };
}
