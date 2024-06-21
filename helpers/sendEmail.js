import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (data) => {
  const msg = { ...data, from: "demchuk.volodymyr@lnu.edu.ua" };
  await sgMail.send(msg);
  return true;
};
