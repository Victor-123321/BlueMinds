// NeuroBlueMinds/Services/EmailService.cs
// Sends transactional emails via SMTP (MailKit).
// Works with Gmail, Outlook, Resend SMTP relay, SendGrid SMTP relay, etc.
// Configure via appsettings.json Email section.

using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MimeKit.Text;

namespace NeuroBlueMinds.Server.Services;

// ── Interface ─────────────────────────────────────────────────────────────────

public interface IEmailService
{
    /// <summary>
    /// Sends a specialist invitation email with a branded HTML template.
    /// </summary>
    Task SendSpecialistInviteAsync(
        string toEmail,
        string toName,
        string parentName,
        string childName,
        string acceptUrl,
        DateTime expiresAt);
}

// ── SMTP implementation ───────────────────────────────────────────────────────

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendSpecialistInviteAsync(
        string toEmail,
        string toName,
        string parentName,
        string childName,
        string acceptUrl,
        DateTime expiresAt)
    {
        var emailCfg  = _config.GetSection("Email");
        var smtpHost  = emailCfg["SmtpHost"]  ?? "smtp.gmail.com";
        var smtpPort  = int.Parse(emailCfg["SmtpPort"] ?? "587");
        var smtpUser  = emailCfg["SmtpUser"]  ?? "";
        var smtpPass  = emailCfg["SmtpPass"]  ?? "";
        var fromEmail = emailCfg["FromEmail"] ?? smtpUser;
        var fromName  = emailCfg["FromName"]  ?? "NeuroBlueMinds";

        if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            _logger.LogWarning(
                "[EmailService] SMTP credentials not configured. " +
                "Invite for {Email} was NOT sent. Set Email:SmtpUser and Email:SmtpPass in appsettings.", toEmail);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(new MailboxAddress(
            string.IsNullOrWhiteSpace(toName) ? toEmail : toName,
            toEmail));
        message.Subject = $"🧠 {parentName} te invita a apoyar a {childName} en NeuroBlueMinds";

        var html = BuildInviteHtml(toName, parentName, childName, acceptUrl, expiresAt);
        message.Body = new TextPart(TextFormat.Html) { Text = html };

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(quit: true);

            _logger.LogInformation(
                "[EmailService] Invite email sent to {Email} for child {Child}.", toEmail, childName);
        }
        catch (Exception ex)
        {
            // Log but don't re-throw: the access record is already saved,
            // the parent can share the link manually if email fails.
            _logger.LogError(ex,
                "[EmailService] Failed to send invite email to {Email}. The access record was saved.", toEmail);
        }
    }

    // ── HTML template ─────────────────────────────────────────────────────────

    private static string BuildInviteHtml(
        string toName,
        string parentName,
        string childName,
        string acceptUrl,
        DateTime expiresAt)
    {
        var greeting    = string.IsNullOrWhiteSpace(toName) ? "Hola" : $"Hola, {toName}";
        var expiryStr   = expiresAt.ToString("dddd, dd 'de' MMMM 'de' yyyy", new System.Globalization.CultureInfo("es-MX"));

        return $"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Invitación a NeuroBlueMinds</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

          <!-- Wrapper -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0f4f8;">
            <tr><td style="padding:32px 16px;">

              <!-- Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0"
                     width="100%" style="max-width:560px;margin:0 auto;background-color:#ffffff;
                     border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);
                              padding:36px 40px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:8px;">🧠</div>
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                                letter-spacing:-0.3px;">NeuroBlueMinds</h1>
                    <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px;font-weight:500;">
                      Plataforma de aprendizaje adaptativo para niños neurodivergentes
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">

                    <!-- Greeting -->
                    <p style="margin:0 0 8px;color:#1e293b;font-size:18px;font-weight:600;">
                      {greeting} 👋
                    </p>
                    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                      <strong style="color:#1e293b;">{parentName}</strong> te ha invitado a unirte
                      como especialista en el perfil de aprendizaje de
                      <strong style="color:#2563eb;">{childName}</strong>.
                    </p>

                    <!-- Divider -->
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

                    <!-- Info box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                           style="background-color:#eff6ff;border-radius:12px;
                                  border-left:4px solid #2563eb;margin-bottom:28px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0 0 10px;color:#1e40af;font-size:13px;font-weight:700;
                                     text-transform:uppercase;letter-spacing:0.5px;">
                            ¿Qué significa esta invitación?
                          </p>
                          <ul style="margin:0;padding-left:18px;color:#1e3a8a;font-size:14px;line-height:1.8;">
                            <li>Acceso al perfil adaptativo de <strong>{childName}</strong></li>
                            <li>Historial de sesiones, progreso por estilo VARK y puntajes</li>
                            <li>Observaciones clínicas y recomendaciones de la IA</li>
                            <li>Colaboración en tiempo real con la familia</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align:center;padding-bottom:24px;">
                          <a href="{acceptUrl}"
                             style="display:inline-block;background-color:#2563eb;color:#ffffff;
                                    font-size:16px;font-weight:700;text-decoration:none;
                                    padding:14px 36px;border-radius:12px;
                                    box-shadow:0 4px 12px rgba(37,99,235,0.35);">
                            ✅ &nbsp;Aceptar invitación
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Link fallback -->
                    <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;text-align:center;">
                      ¿El botón no funciona? Copia este enlace en tu navegador:
                    </p>
                    <p style="margin:0 0 24px;word-break:break-all;font-size:11px;
                               color:#64748b;text-align:center;font-family:monospace;">
                      {acceptUrl}
                    </p>

                    <!-- Expiry notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                           style="background-color:#fefce8;border-radius:10px;
                                  border:1px solid #fde047;margin-bottom:8px;">
                      <tr>
                        <td style="padding:12px 16px;text-align:center;">
                          <p style="margin:0;color:#854d0e;font-size:13px;">
                            ⏰ &nbsp;Esta invitación expira el <strong>{expiryStr}</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color:#f8fafc;padding:20px 40px;
                              border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">
                      Recibiste este correo porque <strong>{parentName}</strong> ingresó tu dirección
                      como especialista de confianza.
                    </p>
                    <p style="margin:0;color:#cbd5e1;font-size:11px;">
                      Si no esperabas esta invitación, puedes ignorar este correo de forma segura.
                    </p>
                    <p style="margin:12px 0 0;color:#bfdbfe;font-size:11px;font-weight:600;">
                      🧠 NeuroBlueMinds · Aprendizaje adaptativo
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>

        </body>
        </html>
        """;
    }
}
