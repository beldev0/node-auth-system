const nodemailer = require('nodemailer')
console.log(process.env.SMTP_PASS, process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
    // host : process.env.SMTP_HOST,
    // port : process.env.SMTP_PORT,
    // secure : false,
    service : 'gmail',    
    auth : {
        user : process.env.SMTP_USER,
        pass : process.env.SMTP_PASS
    }
})

async function test() {
    try {
      await transporter.verify();
      console.log("Server is ready to take our messages");
    } catch (err) {
      console.error("Verification failed:", err);
    }
}

module.exports = transporter
