import * as functions from 'firebase-functions/v1';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { buildAutoResponseEmail } from './shared/emailTemplate';

if (getApps().length === 0) {
  initializeApp();
}

const firestoreDb = getFirestore();
const SYSTEM_DISPATCHER_EMAIL = process.env.SYSTEM_DISPATCHER_EMAIL || 'notifications@investireland.ai';

/**
 * Production SMTP transport. Returns null when SMTP is not configured so that
 * deployed functions never silently send through a throwaway test inbox.
 */
function getMailerTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Sends a welcome email when a Firebase Auth user is created.
 *
 * NOTE: the Express server also exposes POST /api/emails/welcome. Deploy only one
 * of the two welcome mechanisms, otherwise new users receive two emails.
 * The send is idempotent per user via the welcomeEmailSent flag.
 */
export const onUserCreatedSendWelcomeEmail = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(async (user: functions.auth.UserRecord) => {
    const userEmail = user.email;
    const userId = user.uid;
    if (!userEmail) {
      functions.logger.warn('User has no email address; skipping welcome email', { userId });
      return null;
    }

    const userDocRef = firestoreDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.exists ? userDoc.data() ?? {} : {};
    if (userData.welcomeEmailSent) {
      functions.logger.info('Welcome email already sent; skipping', { userId });
      return null;
    }

    const transporter = getMailerTransporter();
    if (!transporter) {
      functions.logger.warn('SMTP_USER/SMTP_PASS not configured; welcome email not sent', { userId });
      return null;
    }

    const { subject, html, text } = buildAutoResponseEmail({
      userName: userData.name || user.displayName || userEmail.split('@')[0] || 'Investor',
      userEmail,
      country: userData.country || 'Ireland',
      primaryGoal: userData.primaryLifeStageGoal || undefined,
      targetAmount: Number(userData.targetLifeGoalAmount) || undefined,
      currency: userData.preferredCurrency || 'EUR',
      triggerType: 'WELCOME_REGISTRATION',
      appUrl: process.env.APP_URL,
    });

    try {
      const info = await transporter.sendMail({
        from: `"InvestIreland AI" <${SYSTEM_DISPATCHER_EMAIL}>`,
        replyTo: SYSTEM_DISPATCHER_EMAIL,
        to: userEmail,
        subject,
        text,
        html,
      });
      const messageId = String(info.messageId || `cf_auth_${Date.now()}`).replace(/[^a-zA-Z0-9_.@-]/g, '_');

      await userDocRef.collection('emails').doc(messageId).set({
        emailId: messageId,
        userId,
        recipientEmail: userEmail,
        subject,
        dispatchedAt: new Date().toISOString(),
        status: 'DELIVERED',
        transport: 'FIREBASE_CLOUD_FUNCTIONS',
        createdAt: FieldValue.serverTimestamp(),
      });
      await userDocRef.set(
        { welcomeEmailSent: true, welcomeEmailDispatchedAt: new Date().toISOString() },
        { merge: true }
      );
      functions.logger.info('Welcome email sent', { userId, messageId });
      return { success: true };
    } catch (error) {
      functions.logger.error('Failed to send welcome email', { userId, error: String(error) });
      throw error;
    }
  });
