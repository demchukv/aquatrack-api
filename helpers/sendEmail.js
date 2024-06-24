import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (data) => {
  const msg = { ...data, from: "aquatrack3@gmail.com" };
  await sgMail.send(msg);
  return true;
};
