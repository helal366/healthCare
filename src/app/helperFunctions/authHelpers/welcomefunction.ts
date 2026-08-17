import path from "path";
import { envVars } from "../../config";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";

interface WelcomeEmailPayload {
  name: string;
  email: string;
  provider: "CREDENTIAL" | "GOOGLE";
}
export const welcomeForFirstRegistration = async (payload: WelcomeEmailPayload) => {
  const TEMPLATE_DIR = path.join(process.cwd(), "src/app/templates");
  const { name, email, provider } = payload;
  const templatePath = path.join(TEMPLATE_DIR, "welcome_email.ejs");
  const templateData = {
    name,
    year: new Date().getFullYear(),
    provider,
  };
  const html = await ejs.renderFile(templatePath, templateData);
  try {
    await transporter.sendMail({
      from: `"${envVars.EMAIL_SENDER_NAME}" <${envVars.EMAIL_SENDER}>`,
      to: email,
      subject: "Registration Successful – Welcome to HealthCare!",
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};
