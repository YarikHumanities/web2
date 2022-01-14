import { createTransport } from "nodemailer";
import sanitizeHtml from "sanitize-html";
require("dotenv").config();

const transport = createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_ADRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendMail(options) {
  try {
    await transport.sendMail(options);
    return { success: true };
  } catch (error) {
    throw error_custom("Sending error", 500);
  }
}
const from = `From text message - ${process.env.EMAIL_ADRESS}`;
function formSubmit(formData) {
  let html = "";
  for (const option in formData) {
    html += option + " : " + formData[option] + "<br/>";
  }
  return sendMail({
    from,
    to: process.env.EMAIL_TO_USER,
    subject: "New form submision",
    html: sanitizeHtml(html),
  });
}

const history = new Map();
const rateLimit = (ip, limit = 3) => {
  const map_var = history.get(ip) || 0;
  if (map_var > limit) {
    throw error_custom("Too many requests", 429);
  }
  history.set(ip, map_var + 1);
};

function error_custom(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameValid = /[a-zA-ZЁёА-я]+$/;

const validate = (body) => {
  const { email, name, password, confirmPassword } = body;
  if (!email || !name || !password || !confirmPassword) {
    throw error_custom("Empty fields of field", 400);
  }
  if (!emailValid.test(email)) {
    throw error_custom("Email is not available", 400);
  }
  if (!nameValid.test(name)) {
    throw error_custom("Name is not available", 400);
  }
  if (password !== confirmPassword) {
    throw error_custom("Passwords have to match", 400);
  }
};

module.exports = async (req, res) => {
  try {
    rateLimit(req.headers["x-real-ip"], 5);
    validate(req.body);
    const result = await formSubmit(req.body);
    res.json({ result });
  } catch (e) {
    return res.status(e.status).json({
      status: e.status,
      errors: [e.message],
      result: {
        success: false,
      },
    });
  }
};
