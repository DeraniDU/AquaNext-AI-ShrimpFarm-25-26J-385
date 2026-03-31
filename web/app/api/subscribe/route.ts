import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const smtpServer = process.env.SMTP_SERVER || 'smtp.gmail.com';
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USERNAME;
    const smtpPass = process.env.SMTP_PASSWORD;

    // If no credentials, simulate success
    if (!smtpUser || !smtpPass) {
      console.log(`[MOCK EMAIL] Saved subscriber '${email}'. Configure SMTP_USERNAME/SMTP_PASSWORD in .env.local to send real emails.`);
      return NextResponse.json({ 
        status: 'success', 
        message: 'Subscribed successfully! (Mocked - configure SMTP to send real emails)' 
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpServer,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0891b2, #2563eb); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">AquaNext Research</h1>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">Welcome to the Community!</h2>
          <p>Hello,</p>
          <p>Thank you for subscribing to AquaNext Insights. You've joined over 5,000 researchers, farmers, and industry professionals.</p>
          <p>Every week, we'll send you our curated roundup of:</p>
          <ul>
            <li>The latest aquaculture research papers</li>
            <li>Sustainable farming practices & case studies</li>
            <li>Insights from our AI data models</li>
          </ul>
          <p>We're thrilled to have you with us on the journey to smarter, more sustainable aquaculture.</p>
          <br/>
          <p>Best regards,<br/><strong>The AquaNext Student Team (SLIIT)</strong></p>
        </div>
      </body>
    </html>
    `;

    await transporter.sendMail({
      from: `"AquaNext Team" <${smtpUser}>`,
      to: email,
      subject: 'Welcome to AquaNext Research Insights!',
      html: htmlContent,
    });

    console.log(`📧 Sent welcome email to ${email}`);
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Subscribed and email sent!' 
    });

  } catch (error: any) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email. Please try again later.' },
      { status: 500 }
    );
  }
}
