import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (data) => {
  const msg = { ...data, from: "demchuk.volodymyr@lnu.edu.ua" };
  console.log("try send email");
  await sgMail.send(msg);
  console.log("Email sended");
  return true;
};
