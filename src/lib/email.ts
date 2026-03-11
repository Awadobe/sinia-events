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
  registrationId?: string;
  isInvite?: boolean;
}

export async function sendConfirmationEmail({
  toEmail,
  attendeeName,
  eventTitle,
  eventDate,
  eventLocation,
  eventSlug,
  status,
  registrationId,
  isInvite,
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
    : isInvite 
      ? `You've been invited to ${eventTitle}!` 
      : `You're registered for ${eventTitle}!`;

  // Determine sender email. Resend allows 'onboarding@resend.dev' for testing
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  // Generate a QR code that links to the admin check-in endpoint for this specific registration
  // We need the registration ID to do this, so we'll add it to the props.
  let qrCodeDataUrl = '';
  if (status === 'confirmed' && registrationId) {
     const checkInUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/scan?id=${registrationId}`;
     try {
       const QRCode = (await import('qrcode')).default;
       qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, {
         width: 250,
         margin: 2,
         color: {
           dark: '#111827',
           light: '#ffffff'
         }
       });
     } catch (err) {
       console.error('Failed to generate QR code for email:', err);
     }
  }

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

          ${qrCodeDataUrl ? `
          <div style="text-align: center; margin: 30px 0; padding: 20px; border: 2px dashed #e5e7eb; border-radius: 12px;">
            <p style="margin-top: 0; color: #111827; font-weight: bold;">Your Event Ticket</p>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">Present this QR code at the door to check in.</p>
            <img src="${qrCodeDataUrl}" alt="Check-in QR Code" style="width: 200px; height: 200px; display: inline-block;" />
          </div>
          ` : ''}

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
