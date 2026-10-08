import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { 
  buildRegistrationConfirmationTemplate, 
  RegistrationEmailPayload 
} from '../src/services/emailService';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestoreDb = admin.firestore();

// Outbound system dispatcher email
const SYSTEM_DISPATCHER_EMAIL = process.env.SYSTEM_DISPATCHER_EMAIL || 'locapricorntraining@gmail.com';

/**
 * Mailer transporter configured for production SMTP or Ethereal test inbox
 */
async function getMailerTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
      secure: (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to test account
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Firebase Cloud Function triggered automatically when a new user is created in Firebase Authentication.
 * Triggers on: functions.auth.user().onCreate
 * 
 * Features:
 * 1. Captures user's specific email address and display name
 * 2. Fetches any existing user profile attributes from Cloud Firestore (users/{uid})
 * 3. Builds a personalized welcome email using the emailService.ts template implementation
 * 4. Dispatches the email to the user's specific email address
 * 5. Logs the transactional dispatch audit trail in Firestore (users/{uid}/emails/{emailId})
 * 6. Marks welcomeEmailSent: true in the user document
 */
export const onUserCreatedSendWelcomeEmail = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(async (user: functions.auth.UserRecord) => {
    const userEmail = user.email;
    const userId = user.uid;

    if (!userEmail) {
      console.warn(`[Cloud Function: onUserCreatedSendWelcomeEmail] User ${userId} has no email address. Skipping welcome email.`);
      return null;
    }

    console.log(`[Cloud Function: onUserCreatedSendWelcomeEmail] Triggered for user: ${userId} (${userEmail})`);

    try {
      // 1. Fetch user's profile metadata from Firestore if available
      let userName = user.displayName || userEmail.split('@')[0] || 'Valued Investor';
      let userCountry = 'Ireland';
      let preferredCurrency = 'EUR';
      let primaryGoal = 'Dublin / Irish Home Deposit';
      let targetAmount = 85000;

      const userDocRef = firestoreDb.collection('users').doc(userId);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData) {
          userName = userData.name || userName;
          userCountry = userData.country || userCountry;
          preferredCurrency = userData.preferredCurrency || preferredCurrency;
          primaryGoal = userData.primaryLifeStageGoal || primaryGoal;
          targetAmount = Number(userData.targetLifeGoalAmount) || targetAmount;
        }
      } else {
        // Create initial placeholder profile if none exists
        await userDocRef.set({
          uid: userId,
          name: userName,
          email: userEmail,
          country: userCountry,
          preferredCurrency,
          primaryLifeStageGoal: primaryGoal,
          targetLifeGoalAmount: targetAmount,
          registeredAt: new Date().toISOString(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      // 2. Generate personalized welcome email payload using emailService template
      const emailPayload: RegistrationEmailPayload = {
        userId,
        name: userName,
        email: userEmail,
        country: userCountry,
        preferredCurrency,
        primaryGoal,
        targetAmount
      };

      const { subject, html, text } = buildRegistrationConfirmationTemplate(emailPayload);

      // 3. Dispatch transactional email via mailer
      const transporter = await getMailerTransporter();
      const mailOptions = {
        from: `"InvestIreland AI System" <${SYSTEM_DISPATCHER_EMAIL}>`,
        replyTo: SYSTEM_DISPATCHER_EMAIL,
        to: userEmail,
        subject,
        text,
        html,
      };

      const info = await transporter.sendMail(mailOptions);
      const messageId = info.messageId || `cf_auth_${Date.now()}`;
      const previewUrl = nodemailer.getTestMessageUrl(info) || null;

      console.log(`[Cloud Function: onUserCreatedSendWelcomeEmail] Successfully sent welcome email to ${userEmail}. Message ID: ${messageId}`);
      if (previewUrl) {
        console.log(`[Cloud Function: onUserCreatedSendWelcomeEmail] Ethereal live preview URL: ${previewUrl}`);
      }

      // 4. Save audit log to Firestore: users/{userId}/emails/{emailId}
      const emailLogRef = userDocRef.collection('emails').doc(messageId);
      await emailLogRef.set({
        emailId: messageId,
        userId,
        recipientEmail: userEmail,
        recipientName: userName,
        subject,
        dispatchedAt: new Date().toISOString(),
        status: 'DELIVERED',
        transport: 'FIREBASE_CLOUD_FUNCTIONS',
        previewUrl,
        summary: `Automated welcome email dispatched via Firebase Auth onCreate trigger to ${userEmail}.`,
        htmlContent: html,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 5. Update user document with confirmation flag
      await userDocRef.set({
        welcomeEmailSent: true,
        welcomeEmailDispatchedAt: new Date().toISOString(),
        lastWelcomeMessageId: messageId,
        welcomeEmailPreviewUrl: previewUrl
      }, { merge: true });

      return {
        success: true,
        userId,
        recipient: userEmail,
        messageId,
        previewUrl
      };
    } catch (error: any) {
      console.error(`[Cloud Function: onUserCreatedSendWelcomeEmail] Failed to process welcome email for ${userEmail}:`, error);
      throw error;
    }
  });

/**
 * HTTPS Callable Cloud Function to allow programmatic / client-side testing of the Auth Welcome Trigger
 */
export const triggerAuthWelcomeEmailTest = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const { email, name, userId } = req.body || req.query;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const testUser = {
      uid: userId || `test_usr_${Date.now()}`,
      email,
      displayName: name || 'Test Investor'
    } as functions.auth.UserRecord;

    try {
      const emailPayload: RegistrationEmailPayload = {
        userId: testUser.uid,
        name: testUser.displayName || 'Test Investor',
        email: testUser.email,
        country: 'Ireland',
        preferredCurrency: 'EUR',
        primaryGoal: 'Irish Home Deposit & Wealth Milestone',
        targetAmount: 85000
      };

      const { subject, html, text } = buildRegistrationConfirmationTemplate(emailPayload);
      const transporter = await getMailerTransporter();
      const info = await transporter.sendMail({
        from: `"InvestIreland AI System" <${SYSTEM_DISPATCHER_EMAIL}>`,
        replyTo: SYSTEM_DISPATCHER_EMAIL,
        to: testUser.email,
        subject,
        text,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || null;

      res.json({
        success: true,
        message: `Welcome email triggered for ${testUser.email}`,
        messageId: info.messageId,
        previewUrl
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
