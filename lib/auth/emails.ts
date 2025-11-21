import { Resend } from "resend";

export async function sendNewUserEmailAlert(name: string, email: string) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "B&B AI <demorequests@transactional.brownandbeatty.com>",
      to: (process.env.APP_EMAIL_ALERTS_TO || "")
        .split(",")
        .map((e) => e.trim()),
      subject: "New User Alert",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1a365d;">New User Alert!</h1>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendVerificationEmail(
  name: string,
  email: string,
  url: string
) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "B&B AI <demorequests@transactional.brownandbeatty.com>",
      to: email,
      subject: "Account Verification",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1a365d;">Welcome to B&B AI!</h1>
          <p>Hello, ${name}!</p>
          <p>Please <a href="${url}" style="color: #1a365d; text-decoration: underline;">click here to verify your account</a>.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendResetPasswordEmail(
  name: string,
  email: string,
  url: string
) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "B&B AI <demorequests@transactional.brownandbeatty.com>",
      to: email,
      subject: "Reset password",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1a365d;">Password reset request</h1>
          <p>Hello, ${name}!</p>
          <p>Please <a href="${url}" style="color: #1a365d; text-decoration: underline;">click here to reset your password</a>.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendStaffInvitationEmail(
  inviteeName: string,
  inviteeEmail: string,
  organizationName: string,
  inviterName: string,
  role: string,
  isNewUser: boolean = true,
  invitedAt?: Date
) {
  try {
    // Generate invitation token (same logic as in the accept route)
    const crypto = require('crypto');
    const invitationTime = invitedAt || new Date();
    const token = crypto
      .createHash('sha256')
      .update(`${inviteeEmail.toLowerCase()}-${invitationTime.getTime()}`)
      .digest('hex')
      .substring(0, 32);
    
    const baseUrl = process.env.BASE_URL || process.env.NEXTAUTH_URL;
    const acceptUrl = `${baseUrl}/invitation/accept?token=${token}&email=${encodeURIComponent(inviteeEmail)}`;
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'B&B AI <invitations@transactional.brownandbeatty.com>',
      to: [inviteeEmail],
      subject: `You've been invited to join ${organizationName} on Brown & Beatty AI`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a365d; margin-bottom: 20px;">Welcome to Brown & Beatty AI!</h1>
          
          <p>Hi ${inviteeName},</p>
          
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Brown & Beatty AI as a <strong>${role}</strong>.</p>
          
          <div style="background: #f7fafc; border-left: 4px solid #3182ce; padding: 16px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d3748;">Getting Started:</h3>
            <p style="margin: 10px 0;">
              Please <a href="${acceptUrl}" style="color: #3182ce; text-decoration: underline;">click here to accept this invitation</a>.
            </p>
            ${isNewUser ? `
              <p style="margin: 10px 0;">After clicking the link, you'll be prompted to set up your password and then have access to ${organizationName}.</p>
            ` : `
              <p style="margin: 10px 0;">After clicking the link, you'll be added to ${organizationName}. You can then log in with your existing credentials for: <strong>${inviteeEmail}</strong></p>
            `}
          </div>
          
          <div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 12px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #c53030; font-size: 14px; margin: 0;">
              <strong>Important:</strong> Please use the email address <strong>${inviteeEmail}</strong> when signing up or logging in.
            </p>
          </div>
          
          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            Brown & Beatty AI is a comprehensive platform for managing collective agreements, grievances, and labor relations. 
            If you have any questions, please contact your administrator.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #a0aec0; font-size: 12px;">
            This invitation was sent by ${inviterName} from ${organizationName}. 
            If you believe this was sent in error, please disregard this email.
          </p>
        </div>
      `,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send staff invitation email:', error);
    return { success: false, error: 'Failed to send invitation email' };
  }
}
