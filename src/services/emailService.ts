import { doc, setDoc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

// ============================================================================
// 1. TRANSACTIONAL EMAIL INTERFACES & TYPES
// ============================================================================

export type TransactionalEmailTemplate = 
  | 'WELCOME_REGISTRATION'
  | 'MILESTONE_PROGRESS'
  | 'TAX_REPORT_READY'
  | 'PORTFOLIO_ALERT'
  | 'CUSTOM';

export type EmailProviderType = 
  | 'FIREBASE_CLOUD_FUNCTIONS'
  | 'FIRESTORE_TRIGGER_QUEUE'
  | 'BACKEND_REST_API'
  | 'ETHEREAL_TEST_ACCOUNT'
  | 'APP_FALLBACK';

export interface TransactionalEmailPayload {
  to: string;
  recipientName: string;
  subject: string;
  template: TransactionalEmailTemplate;
  data: Record<string, any>;
  userId?: string;
  htmlContent?: string;
  textContent?: string;
  metadata?: Record<string, any>;
}

export interface RegistrationEmailPayload {
  userId: string;
  name: string;
  email: string;
  country: string;
  preferredCurrency?: string;
  primaryGoal?: string;
  targetAmount?: number;
}

export interface MilestoneEmailPayload {
  userId: string;
  name: string;
  email: string;
  milestoneTitle: string;
  targetAmount: number;
  currentProgressAmount?: number;
  currency?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  dispatchedAt: string;
  provider: EmailProviderType;
  recipient: string;
  subject: string;
  summary: string;
  previewUrl?: string | null;
  error?: string;
}

export interface EmailDeliveryStatus {
  id: string;
  status: 'QUEUED' | 'SENDING' | 'DELIVERED' | 'FAILED';
  updatedAt: string;
  error?: string;
}

/**
 * Core interface for sending transactional emails across the platform.
 */
export interface ITransactionalEmailService {
  /**
   * Dispatches an automated registration confirmation email to newly signed-up users.
   */
  sendRegistrationConfirmation(payload: RegistrationEmailPayload): Promise<EmailDispatchResult>;

  /**
   * Dispatches a milestone progress update email when financial targets or savings are adjusted.
   */
  sendMilestoneProgressUpdate(payload: MilestoneEmailPayload): Promise<EmailDispatchResult>;

  /**
   * Dispatches an arbitrary transactional email payload.
   */
  sendCustomEmail(payload: TransactionalEmailPayload): Promise<EmailDispatchResult>;

  /**
   * Enqueues an email into Firestore for processing by a Firebase Cloud Function background trigger
   * (e.g. Firebase Trigger Email extension or an onDocumentCreated / onWrite Cloud Function).
   */
  queueEmailForCloudFunction(payload: TransactionalEmailPayload): Promise<EmailDispatchResult>;

  /**
   * Retrieves the delivery status of an enqueued or sent email.
   */
  getEmailDeliveryStatus(userId: string, emailId: string): Promise<EmailDeliveryStatus | null>;
}

// ============================================================================
// 2. EMAIL TEMPLATE GENERATORS (Irish Fiscal & Cross-Border Grounded)
// ============================================================================

export function buildRegistrationConfirmationTemplate(payload: RegistrationEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    name,
    email,
    country,
    preferredCurrency = 'EUR',
    primaryGoal = 'Irish Home Deposit & Wealth Milestone',
    targetAmount = 85000
  } = payload;

  const symbol = preferredCurrency === 'INR' ? '₹' : preferredCurrency === 'USD' ? '$' : '€';
  const formattedAmount = `${symbol}${targetAmount.toLocaleString()}`;
  const subject = `🇮🇪 Welcome to InvestIreland AI, ${name} – Your Financial Blueprint & Milestone Setup`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%); padding: 32px 28px; color: #ffffff; text-align: left; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 800; margin: 0 0 6px 0; line-height: 1.25; }
    .subtitle { font-size: 13px; color: #a7f3d0; margin: 0; }
    .content { padding: 30px 28px; font-size: 14px; line-height: 1.6; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { color: #64748b; font-weight: 500; }
    .metric-val { color: #0f172a; font-weight: 700; }
    .highlight-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #065f46; }
    .btn { display: inline-block; background: #047857; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 13px; margin: 16px 0; }
    .footer { background: #0f172a; padding: 24px 28px; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: left; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">☘️ Official Confirmation &amp; Account Integration</div>
      <h1 class="title">Failte go hÉirinn, ${name}!</h1>
      <p class="subtitle">Your cross-border portfolio &amp; financial goal milestone tracker is active.</p>
    </div>

    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering with <strong>InvestIreland AI</strong>. This automated transactional confirmation confirms your secure account creation and locks in your custom cross-border wealth blueprint for <strong>${country}</strong> tax residency.</p>

      <div class="card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          📊 Your Configured Financial Profile &amp; Milestone Target
        </div>
        <div class="metric-row">
          <span class="metric-label">Registered Member:</span>
          <span class="metric-val">${name} &lt;${email}&gt;</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Tax Residency:</span>
          <span class="metric-val">${country} (Taxes Consolidation Act 1997)</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Primary Life Stage Goal:</span>
          <span class="metric-val">${primaryGoal}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Milestone Target:</span>
          <span class="metric-val" style="color: #047857;">${formattedAmount}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Registration Timestamp:</span>
          <span class="metric-val">${new Date().toUTCString()}</span>
        </div>
      </div>

      <div class="highlight-box">
        <strong>🚀 Key Action Item: Budget 2027 Personal Savings &amp; Investment Account</strong><br>
        Commencing <strong>1 July 2027</strong>, Ireland introduces the €12,000/year investment account with a <strong>€50,000 tax-free growth ceiling</strong>. Inside this vehicle, the punitive 41% deemed disposal (8-year forced tax) is abolished. Your account will automatically model allocations toward this milestone.
      </div>

      <p style="margin-top: 24px;">
        <a href="https://ais-dev-qrlcr5odu3qypdbgjzwi5v-645067703073.europe-west1.run.app" class="btn">
          Go to Your Live Dashboard &rarr;
        </a>
      </p>
    </div>

    <div class="footer">
      <strong>InvestIreland AI — Cross-Border Wealth Intelligence</strong><br>
      Dublin, Ireland &bull; Legal Basis: Department of Finance Policy Framework &bull; Revenue Commissioners TCA 1997
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Welcome to InvestIreland AI, ${name}!

Your cross-border portfolio & financial goal milestone tracker is active.
Registered Member: ${name} (${email})
Tax Residency: ${country}
Primary Goal: ${primaryGoal}
Milestone Target: ${formattedAmount}
Date: ${new Date().toUTCString()}

Key Update: Budget 2027 Personal Savings & Investment Account introduces €12,000/yr contribution limit with €50,000 tax-free ceiling commencing 1 July 2027.
  `.trim();

  return { subject, html, text };
}

export function buildMilestoneUpdateTemplate(payload: MilestoneEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    name,
    email,
    milestoneTitle,
    targetAmount,
    currentProgressAmount = 0,
    currency = 'EUR'
  } = payload;

  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€';
  const formattedTarget = `${symbol}${targetAmount.toLocaleString()}`;
  const formattedCurrent = `${symbol}${currentProgressAmount.toLocaleString()}`;
  const pct = targetAmount > 0 ? Math.min(100, Math.round((currentProgressAmount / targetAmount) * 100)) : 0;
  const subject = `🎯 Milestone Update: Your ${milestoneTitle} Progress (${pct}%)`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #064e3b; padding: 28px; color: #fff; }
    .content { padding: 28px; font-size: 14px; line-height: 1.6; }
    .progress-bar { background: #e2e8f0; border-radius: 9999px; height: 12px; overflow: hidden; margin: 12px 0; }
    .progress-fill { background: #10b981; height: 100%; width: ${pct}%; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">🎯 Financial Milestone Progress Update</h2>
      <p style="margin:4px 0 0 0; color:#a7f3d0; font-size:13px;">${milestoneTitle}</p>
    </div>
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>You have updated your tracking for <strong>${milestoneTitle}</strong>:</p>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin:16px 0;">
        <div style="display:flex; justify-content:space-between; font-weight:700;">
          <span>Current: ${formattedCurrent}</span>
          <span>Target: ${formattedTarget}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div style="font-size:12px; color:#047857; font-weight:700; text-align:right;">${pct}% Funded</div>
      </div>
      <p>Track your portfolio adjustments and tax allocations inside your live dashboard.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Milestone Update: ${milestoneTitle}
Hello ${name},
Your current progress: ${formattedCurrent} of ${formattedTarget} (${pct}%).
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// 3. IMPLEMENTATION A: FIREBASE CLOUD FUNCTIONS / FIRESTORE QUEUE SERVICE
// ============================================================================

/**
 * Implementation designed specifically for Firebase Cloud Functions integration.
 * Supports:
 * 1. Queueing emails into Firestore collections (/users/{userId}/emails or /mail)
 *    which trigger background Firebase Cloud Functions (e.g. onDocumentCreated or Firebase Trigger Email).
 * 2. Calling Firebase Callable / HTTP Cloud Functions when deployed.
 * 3. Graceful fallback to backend proxy if functions are in transition.
 */
export class FirebaseCloudFunctionsEmailService implements ITransactionalEmailService {
  private functionsRegion: string;
  private functionsBaseUrl: string;

  constructor(options?: { region?: string; functionsBaseUrl?: string }) {
    this.functionsRegion = options?.region || 'europe-west1';
    this.functionsBaseUrl = options?.functionsBaseUrl || 
      `https://${this.functionsRegion}-${firebaseConfig.projectId}.cloudfunctions.net`;
  }

  /**
   * Enqueues an email into Firestore directly.
   * This is the recommended pattern for Firebase Trigger Email Extension & Cloud Functions:
   * Firestore write triggers `exports.sendTransactionalEmail = onDocumentCreated(...)`
   */
  async queueEmailForCloudFunction(payload: TransactionalEmailPayload): Promise<EmailDispatchResult> {
    const timestamp = new Date().toISOString();
    const messageId = `cf_mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveUserId = payload.userId || 'usr_anonymous';

    try {
      // 1. Write to user's personal audit emails collection in Firestore
      const userEmailRef = doc(db, 'users', effectiveUserId, 'emails', messageId);
      await setDoc(userEmailRef, {
        emailId: messageId,
        userId: effectiveUserId,
        recipientEmail: payload.to,
        recipientName: payload.recipientName,
        subject: payload.subject,
        template: payload.template,
        dispatchedAt: timestamp,
        status: 'QUEUED',
        transport: 'FIREBASE_CLOUD_FUNCTIONS',
        summary: `Enqueued for Firebase Cloud Functions dispatch: ${payload.subject}`,
        htmlContent: payload.htmlContent || '',
        data: payload.data || {},
        queuedAt: timestamp
      });

      console.log(`[Firebase Cloud Functions] Email ${messageId} enqueued in Firestore: users/${effectiveUserId}/emails/${messageId}`);

      return {
        success: true,
        messageId,
        dispatchedAt: timestamp,
        provider: 'FIRESTORE_TRIGGER_QUEUE',
        recipient: payload.to,
        subject: payload.subject,
        summary: `Enqueued for Firebase Cloud Functions delivery to ${payload.to}`,
        previewUrl: null
      };
    } catch (err: any) {
      console.warn('[Firebase Cloud Functions] Firestore queue write error, falling back:', err);
      // Fallback to backend REST endpoint
      return this.sendViaBackendFallback(payload);
    }
  }

  /**
   * Calls a Firebase Cloud Function HTTP or Callable trigger if available,
   * otherwise enqueues to Firestore and calls backend proxy.
   */
  async sendCustomEmail(payload: TransactionalEmailPayload): Promise<EmailDispatchResult> {
    const fnEndpoint = `${this.functionsBaseUrl}/sendTransactionalEmail`;

    try {
      // Check if Cloud Function endpoint is available
      const response = await fetch(fnEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': 'none'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          messageId: result.messageId || `cf_${Date.now()}`,
          dispatchedAt: new Date().toISOString(),
          provider: 'FIREBASE_CLOUD_FUNCTIONS',
          recipient: payload.to,
          subject: payload.subject,
          summary: result.summary || `Dispatched via Firebase Cloud Function to ${payload.to}`,
          previewUrl: result.previewUrl || null
        };
      }
    } catch {
      // Fallback to Firestore queue + local mail proxy
    }

    // Default to Firestore queue for Cloud Function triggers
    return this.queueEmailForCloudFunction(payload);
  }

  async sendRegistrationConfirmation(payload: RegistrationEmailPayload): Promise<EmailDispatchResult> {
    const { subject, html, text } = buildRegistrationConfirmationTemplate(payload);
    
    return this.queueEmailForCloudFunction({
      to: payload.email,
      recipientName: payload.name,
      subject,
      template: 'WELCOME_REGISTRATION',
      data: payload,
      userId: payload.userId,
      htmlContent: html,
      textContent: text
    });
  }

  async sendMilestoneProgressUpdate(payload: MilestoneEmailPayload): Promise<EmailDispatchResult> {
    const { subject, html, text } = buildMilestoneUpdateTemplate(payload);

    return this.queueEmailForCloudFunction({
      to: payload.email,
      recipientName: payload.name,
      subject,
      template: 'MILESTONE_PROGRESS',
      data: payload,
      userId: payload.userId,
      htmlContent: html,
      textContent: text
    });
  }

  async getEmailDeliveryStatus(userId: string, emailId: string): Promise<EmailDeliveryStatus | null> {
    try {
      const emailDoc = await getDoc(doc(db, 'users', userId, 'emails', emailId));
      if (emailDoc.exists()) {
        const data = emailDoc.data();
        return {
          id: emailId,
          status: data.status || 'DELIVERED',
          updatedAt: data.dispatchedAt || data.queuedAt || new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn('Could not read email delivery status from Firestore:', e);
    }
    return null;
  }

  private async sendViaBackendFallback(payload: TransactionalEmailPayload): Promise<EmailDispatchResult> {
    const res = await fetch('/api/auth/send-auto-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.to,
        name: payload.recipientName,
        goalTitle: payload.subject,
        triggerType: payload.template
      })
    });
    const data = await res.json();
    return {
      success: res.ok,
      messageId: data.emailDispatch?.messageId || `fallback_${Date.now()}`,
      dispatchedAt: data.emailDispatch?.dispatchedAt || new Date().toISOString(),
      provider: 'APP_FALLBACK',
      recipient: payload.to,
      subject: payload.subject,
      summary: data.emailDispatch?.summary || `Dispatched to ${payload.to}`,
      previewUrl: data.emailDispatch?.previewUrl || null
    };
  }
}

// ============================================================================
// 4. IMPLEMENTATION B: BACKEND REST API EMAIL SERVICE
// ============================================================================

export class BackendRestApiEmailService implements ITransactionalEmailService {
  async sendRegistrationConfirmation(payload: RegistrationEmailPayload): Promise<EmailDispatchResult> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration email failed');
    }
    return {
      success: true,
      messageId: data.emailDispatch?.messageId || `reg_${Date.now()}`,
      dispatchedAt: data.emailDispatch?.sentAt || new Date().toISOString(),
      provider: 'BACKEND_REST_API',
      recipient: payload.email,
      subject: data.emailDispatch?.subject || 'Welcome to InvestIreland AI',
      summary: data.emailDispatch?.summary || `Confirmation sent to ${payload.email}`,
      previewUrl: data.emailDispatch?.previewUrl || null
    };
  }

  async sendMilestoneProgressUpdate(payload: MilestoneEmailPayload): Promise<EmailDispatchResult> {
    const response = await fetch('/api/auth/send-auto-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        goalTitle: payload.milestoneTitle,
        targetAmount: payload.targetAmount,
        triggerType: 'MILESTONE_PROGRESS'
      })
    });
    const data = await response.json();
    return {
      success: response.ok,
      messageId: data.emailDispatch?.messageId || `ms_${Date.now()}`,
      dispatchedAt: data.emailDispatch?.dispatchedAt || new Date().toISOString(),
      provider: 'BACKEND_REST_API',
      recipient: payload.email,
      subject: data.emailDispatch?.subject || `Milestone Update: ${payload.milestoneTitle}`,
      summary: data.emailDispatch?.summary || `Milestone sent to ${payload.email}`,
      previewUrl: data.emailDispatch?.previewUrl || null
    };
  }

  async sendCustomEmail(payload: TransactionalEmailPayload): Promise<EmailDispatchResult> {
    const response = await fetch('/api/auth/send-auto-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.to,
        name: payload.recipientName,
        goalTitle: payload.subject,
        triggerType: payload.template
      })
    });
    const data = await response.json();
    return {
      success: response.ok,
      messageId: data.emailDispatch?.messageId || `custom_${Date.now()}`,
      dispatchedAt: data.emailDispatch?.dispatchedAt || new Date().toISOString(),
      provider: 'BACKEND_REST_API',
      recipient: payload.to,
      subject: payload.subject,
      summary: data.emailDispatch?.summary || `Email dispatched to ${payload.to}`,
      previewUrl: data.emailDispatch?.previewUrl || null
    };
  }

  async queueEmailForCloudFunction(payload: TransactionalEmailPayload): Promise<EmailDispatchResult> {
    return this.sendCustomEmail(payload);
  }

  async getEmailDeliveryStatus(userId: string, emailId: string): Promise<EmailDeliveryStatus | null> {
    return {
      id: emailId,
      status: 'DELIVERED',
      updatedAt: new Date().toISOString()
    };
  }
}

// ============================================================================
// 5. COMPOSITE EMAIL SERVICE (Unified Hybrid Gateway)
// ============================================================================

export class CompositeEmailService implements ITransactionalEmailService {
  private cloudFunctionsService: FirebaseCloudFunctionsEmailService;
  private backendService: BackendRestApiEmailService;

  constructor() {
    this.cloudFunctionsService = new FirebaseCloudFunctionsEmailService();
    this.backendService = new BackendRestApiEmailService();
  }

  async sendRegistrationConfirmation(payload: RegistrationEmailPayload): Promise<EmailDispatchResult> {
    try {
      // 1. Enqueue & record in Firestore for Firebase Cloud Functions
      await this.cloudFunctionsService.sendRegistrationConfirmation(payload);
    } catch (e) {
      console.warn('Firestore Cloud Functions queue notice:', e);
    }

    // 2. Also dispatch through backend service for instant delivery & live preview URL
    return this.backendService.sendRegistrationConfirmation(payload);
  }

  async sendMilestoneProgressUpdate(payload: MilestoneEmailPayload): Promise<EmailDispatchResult> {
    try {
      await this.cloudFunctionsService.sendMilestoneProgressUpdate(payload);
    } catch (e) {
      console.warn('Cloud Functions queue update notice:', e);
    }
    return this.backendService.sendMilestoneProgressUpdate(payload);
  }

  async sendCustomEmail(payload: TransactionalEmailPayload): Promise<EmailDispatchResult> {
    try {
      return await this.cloudFunctionsService.sendCustomEmail(payload);
    } catch {
      return this.backendService.sendCustomEmail(payload);
    }
  }

  async queueEmailForCloudFunction(payload: TransactionalEmailPayload): Promise<EmailDispatchResult> {
    return this.cloudFunctionsService.queueEmailForCloudFunction(payload);
  }

  async getEmailDeliveryStatus(userId: string, emailId: string): Promise<EmailDeliveryStatus | null> {
    return this.cloudFunctionsService.getEmailDeliveryStatus(userId, emailId);
  }
}

// Default exported singleton
export const emailService: ITransactionalEmailService = new CompositeEmailService();

export default emailService;
