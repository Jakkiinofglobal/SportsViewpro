import nodemailer from 'nodemailer';

export async function notifyPlanChange(adminEmail, emailUser, emailPass, payload){
  if(!adminEmail || !emailUser || !emailPass) return;
  const t = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailUser, pass: emailPass }
  });
  await t.sendMail({
    from: '"SportSight" <no-reply@sportsight.app>',
    to: adminEmail,
    subject: `Plan change: ${payload.email} → ${payload.plan}`,
    text: JSON.stringify(payload, null, 2)
  });
}
