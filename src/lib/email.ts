import { Resend } from 'resend';
import { format } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendConfirmationEmailProps {
  toEmail: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  eventSlug: string;
  status: 'confirmed' | 'pending';
}

export async function sendConfirmationEmail({
  toEmail,
  attendeeName,
  eventTitle,
  eventDate,
  eventLocation,
  eventSlug,
  status,
}: SendConfirmationEmailProps) {
  // If no API key is set, silently skip email sending but log it
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is not set. Skipping email confirmation to:', toEmail);
    return { success: true, skipped: true };
  }

  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${eventSlug}`;
  const formattedDate = format(new Date(eventDate), "EEEE, MMMM d, yyyy 'at' h:mm a");

  const subject = status === 'pending'
    ? `Registration Request Received: ${eventTitle}`
    : `You're registered for ${eventTitle}!`;

  // Determine sender email. Resend allows 'onboarding@resend.dev' for testing if you don't have a domain yet
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: `Radius <${fromEmail}>`,
      to: [toEmail],
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">Hi ${attendeeName},</h2>
          
          ${status === 'pending'
          ? `<p style="color: #4b5563; line-height: 1.6;">We've received your request to join <strong>${eventTitle}</strong>. The host will review your registration and you'll receive another email once approved.</p>`
          : `<p style="color: #4b5563; line-height: 1.6;">You are officially registered for <strong>${eventTitle}</strong>!</p>`
        }
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 10px 0;"><strong>📅 When:</strong> ${formattedDate}</p>
            ${eventLocation ? `<p style="margin: 0 0 10px 0;"><strong>📍 Where:</strong> ${eventLocation}</p>` : ''}
          </div>

          <p style="margin-top: 30px;">
            <a href="${eventUrl}" style="background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Event Details</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 14px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Powered by Radius for Christex Foundation
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    return { success: false, error: err };
  }
}
