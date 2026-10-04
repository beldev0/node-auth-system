const emailVerificationTemplate = (name, href) => {
    return `
    <!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérifiez votre adresse e-mail</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
    }
    .container {
      max-width: 580px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #4f46e5;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      text-align: center;
    }
    .content h2 {
      font-size: 20px;
      margin-top: 0;
      color: #111827;
    }
    .content p {
      font-size: 15px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 30px;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 8px;
      transition: background-color 0.2s ease;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #6b7280;
      text-decoration: underline;
    }
  </style>
</head>
<body>

  <div class="container">
    <div class="header">
      <h1>MonApplication</h1>
    </div>

    <div class="content">
      <h2>Bienvenue parmi nous ${name} !</h2>
      <p>
        Merci de vous être inscrit. Pour finaliser la création de votre compte et accéder à toutes nos fonctionnalités, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.
      </p>

      <a href="${href}" class="btn">Confirmer mon e-mail</a>

      <p style="margin-top: 30px; font-size: 13px; color: #6b7280;">
        Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte, vous pouvez ignorer ce message.
      </p>
    </div>

    <div class="footer">
      <p>© 2026 MonApplication. Tous droits réservés.</p>
      <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
        <a href="${href}">${href}</a>
      </p>
    </div>
  </div>

</body>
</html>
    `
}

module.exports = emailVerificationTemplate