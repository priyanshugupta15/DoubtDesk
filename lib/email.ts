export async function sendWarningEmail(email: string, reason: string, strikes: number) {
    console.log(`[EMAIL SIMULATION] To: ${email}, Subject: Safety Warning - DoubtDesk, Message: Your post was flagged for: ${reason}. You have ${strikes}/3 strikes. Further violations will result in an automatic account block.`);
    
    // Placeholder for actual email service integration (e.g., Resend)
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Safety @ DoubtDesk <safety@doubtdesk.com>',
      to: email,
      subject: 'Safety Warning - DoubtDesk',
      html: `<p>Your post was flagged for: <strong>${reason}</strong>.</p>
             <p>This is strike <strong>${strikes}</strong> of 3.</p>
             <p>Further violations will result in an automatic account block.</p>`
    });
    */
}

/**
 * Simulates sending a blocking notification email.
 */
export async function sendBlockEmail(email: string, durationDays: number, totalBlocks: number) {
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + durationDays);

    console.log(`[EMAIL SIMULATION] To: ${email} | Subject: Account Temporarily Blocked`);
    console.log(`Body: Your account has been suspended for ${durationDays} days due to repeated safety violations. This is your block #${totalBlocks}. Your access will be restored on ${unlockDate.toDateString()}.`);
    
    // In production, integrate with Resend here.
}
