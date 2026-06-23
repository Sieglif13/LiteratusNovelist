import os
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator

def send_verification_email(user):
    """
    Envía el correo de verificación de cuenta al usuario.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    
    frontend_url = settings.FRONTEND_URL
    verify_url = f"{frontend_url}/verify-email?uid={uid}&token={token}"
    
    subject = "Verifica tu cuenta en Literatus Novelist"
    
    # Plantilla HTML Básica y minimalista para Literatus
    html_message = f"""
    <html>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 0; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="padding: 40px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-family: Georgia, serif;">Literatus Novelist</h1>
            </div>
            <div style="padding: 40px;">
                <h2 style="margin-top: 0; font-size: 20px;">¡Bienvenido/a, {user.username}!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                    Gracias por unirte a Literatus Novelist. Estás a un solo paso de poder conversar con los personajes literarios más grandes de la historia.
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                    Por favor, confirma tu dirección de correo electrónico haciendo clic en el siguiente botón:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verify_url}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verificar mi cuenta</a>
                </div>
                <p style="font-size: 14px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                    Si no creaste esta cuenta, puedes ignorar este correo sin problemas.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Texto plano alternativo
    plain_message = f"Bienvenido a Literatus Novelist.\nPara verificar tu cuenta, copia y pega el siguiente enlace en tu navegador:\n{verify_url}"
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )

def send_password_reset_email(user):
    """
    Envía el correo de recuperación de contraseña al usuario.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    
    frontend_url = settings.FRONTEND_URL
    reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"
    
    subject = "Recuperación de contraseña - Literatus Novelist"
    
    # Plantilla HTML
    html_message = f"""
    <html>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 0; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="padding: 40px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-family: Georgia, serif;">Literatus Novelist</h1>
            </div>
            <div style="padding: 40px;">
                <h2 style="margin-top: 0; font-size: 20px;">Hola, {user.username}</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                    Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para elegir una nueva.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
                </div>
                <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                    Si no solicitaste este cambio, ignora este correo. Tu cuenta seguirá estando segura.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    plain_message = f"Hola {user.username},\nPara restablecer tu contraseña, usa este enlace:\n{reset_url}"
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )
