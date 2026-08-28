from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output' / 'pdf' / 'guide-authentification-angular-laravel.pdf'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold',
    fontSize=27, leading=34, textColor=colors.HexColor('#172B4D'), alignment=TA_CENTER,
    spaceAfter=16,
))
styles.add(ParagraphStyle(
    name='CoverSub', parent=styles['Normal'], fontSize=13, leading=19,
    alignment=TA_CENTER, textColor=colors.HexColor('#52606D'),
))
styles.add(ParagraphStyle(
    name='H1b', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=19,
    leading=24, textColor=colors.HexColor('#172B4D'), spaceBefore=8, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name='H2b', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=13,
    leading=17, textColor=colors.HexColor('#0052CC'), spaceBefore=10, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name='Bodyb', parent=styles['BodyText'], fontSize=9.4, leading=14,
    textColor=colors.HexColor('#243B53'), spaceAfter=6,
))
styles.add(ParagraphStyle(
    name='Codeb', parent=styles['Code'], fontName='Courier', fontSize=7.5, leading=10,
    leftIndent=8, rightIndent=8, borderColor=colors.HexColor('#D9E2EC'), borderWidth=.5,
    borderPadding=7, backColor=colors.HexColor('#F4F7FA'), spaceAfter=8,
))
styles.add(ParagraphStyle(
    name='Small', parent=styles['BodyText'], fontSize=8, leading=10, textColor=colors.HexColor('#52606D'),
))


def p(text, style='Bodyb'):
    return Paragraph(text, styles[style])


def table(rows, widths, header=True):
    result = Table(rows, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT')
    commands = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), .35, colors.HexColor('#C9D4E0')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    if header:
        commands.extend([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B5CAD')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ])
    result.setStyle(TableStyle(commands))
    return result


def flow_boxes(labels):
    cells = [[p(f'<b>{label}</b>', 'Small') for label in labels]]
    result = Table(cells, colWidths=[17.0 / len(labels) * cm] * len(labels), hAlign='CENTER')
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#E6F0FF')),
        ('BOX', (0, 0), (-1, -1), .8, colors.HexColor('#2684FF')),
        ('INNERGRID', (0, 0), (-1, -1), .6, colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    return result


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#D9E2EC'))
    canvas.line(1.7 * cm, 1.35 * cm, 19.3 * cm, 1.35 * cm)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#52606D'))
    canvas.drawString(1.7 * cm, .9 * cm, 'Angular Laravel Auth Starter - Guide technique')
    canvas.drawRightString(19.3 * cm, .9 * cm, f'Page {doc.page}')
    canvas.restoreState()


story = []
story += [Spacer(1, 4.8 * cm), p('Guide de l authentification', 'CoverTitle'),
          p('Angular + Laravel + MySQL', 'CoverSub'), Spacer(1, .55 * cm),
          p('Parcours complet : interface, API PHP, securite, base de donnees et retour vers l interface.', 'CoverSub'),
          Spacer(1, 1.6 * cm), flow_boxes(['Angular UI', 'Nginx', 'Laravel API', 'MySQL', 'JSON + cookies']),
          Spacer(1, .7 * cm), p('Document base sur le code du projet angular-laravel-auth-starter.', 'CoverSub'), PageBreak()]

story += [p('1. Vue d ensemble', 'H1b'),
          p('Le projet est une application SPA : Angular affiche les pages dans le navigateur. Laravel ne rend pas de pages HTML PHP ; il expose des routes API JSON. Nginx sert Angular et transmet les appels /api vers Laravel.'),
          flow_boxes(['1. Formulaire Angular', '2. Requete HTTP', '3. Middleware Laravel', '4. Controleur PHP', '5. Tables MySQL', '6. Reponse Angular']),
          Spacer(1, .3 * cm),
          p('<b>Point important :</b> les controles du frontend ameliorent l experience utilisateur, mais Laravel revalide toujours les donnees et les permissions. Un utilisateur ne peut donc pas contourner un droit en modifiant le navigateur.'),
          p('Fichiers centraux : frontend/src/app/app.routes.ts, frontend/src/app/core/auth/auth.service.ts, backend/routes/api.php et backend/app/Http/Controllers/Api/AuthController.php.', 'Small')]

story += [p('2. Pages du frontend Angular', 'H1b'),
          table([
              [p('URL'), p('Composant'), p('Fonction visible')],
              [p('/login'), p('LoginComponent'), p('Connexion email/mot de passe ; bouton de connexion par passkey ; lien mot de passe oublie.')],
              [p('/register'), p('RegisterComponent'), p('Creation de compte avec nom, email, mot de passe et acceptation des conditions.')],
              [p('/forgot-password'), p('ForgotPasswordComponent'), p('Envoie une demande de lien de reinitialisation.')],
              [p('/reset-password'), p('ResetPasswordComponent'), p('Accepte le token de lien et enregistre le nouveau mot de passe.')],
              [p('/dashboard'), p('DashboardComponent'), p('Accueil protege ; affiche le prenom et propose Security ou Sign out.')],
              [p('/security'), p('SecurityComponent'), p('Liste et supprime les passkeys ; affiche, revoque les sessions actives.')],
              [p('/admin'), p('AdminComponent'), p('Liste les utilisateurs si le droit users.view est present.')],
              [p('/forbidden'), p('ForbiddenComponent'), p('Affiche le refus d acces.')],
          ], [2.7*cm, 4.1*cm, 10.2*cm]), Spacer(1, .25*cm),
          p('Chaque page est maintenant separee en trois fichiers : component.ts (logique), component.html (interface) et component.scss (style).')]

story += [p('3. Connexion par mot de passe - aller', 'H1b'),
          p('<b>Etape 1 - LoginComponent.</b> Le visiteur remplit email et mot de passe. Le formulaire Angular verifie que les champs sont presents. La methode submit() appelle AuthService.login().'),
          p('<b>Etape 2 - CSRF.</b> AuthService demande d abord GET /api/auth/csrf-cookie. Le token recu est memorise et auth.interceptor.ts ajoute X-CSRF-TOKEN aux POST, PUT et DELETE.'),
          p('<b>Etape 3 - Nginx.</b> Le navigateur appelle localhost:4200/api/auth/login. Le fichier frontend/nginx.conf transmet cette requete au conteneur backend:8000/api/auth/login.'),
          p('<b>Etape 4 - route PHP.</b> backend/routes/api.php associe POST auth/login a AuthController::login() et applique web, auth.audit et throttle:5,1.'),
          p('<b>Etape 5 - AuthController::login().</b> Cette fonction valide les champs, cherche le compte et refuse les identifiants faux, les comptes inactifs et les emails non verifies.'),
          p('<b>Etape 6 - MySQL.</b> Laravel lit users.email, users.password, users.is_active et users.email_verified_at. password_verify() compare le mot de passe recu au hash stocke.'),
          p('Extrait simplifie du controleur :', 'H2b'),
          p("$user = User::where('email', strtolower($credentials['email']))->first();<br/>if (! $user || ! $user->is_active || ! password_verify($credentials['password'], $user->password)) { return response()->json(..., 401); }<br/>if (! $user->hasVerifiedEmail()) return response()->json(..., 403);", 'Codeb')]

story += [p('4. Connexion par mot de passe - retour', 'H1b'),
          p('<b>Etape 7 - Tokens.</b> Laravel genere un access token JWT court et un refresh token plus long. AuthSessionManager::record() inscrit une session dans auth_sessions avec le hash du jti du refresh token, l appareil, IP et user-agent.'),
          p('<b>Etape 8 - Reponse.</b> tokenResponse() retourne access_token et user en JSON. Le refresh token est place dans le cookie refresh_token, HttpOnly ; JavaScript ne peut pas le lire.'),
          p('<b>Etape 9 - Angular.</b> AuthService.applyAuthentication() conserve access_token et currentUser en memoire. LoginComponent redirige vers /dashboard.'),
          p('<b>Etape 10 - Requetes protegees.</b> auth.interceptor.ts ajoute Authorization: Bearer access_token. Laravel applique auth:api puis access.token, qui refuse explicitement un refresh token utilise comme access token.'),
          flow_boxes(['Reponse JSON', 'Access token en memoire', 'Cookie HttpOnly', 'Redirection Dashboard']),
          Spacer(1, .3 * cm),
          p('<b>Expiration :</b> si une API retourne 401, l intercepteur appelle POST /api/auth/refresh. Laravel verifie le cookie, la session active et le compte, revoque l ancien refresh token puis en genere une nouvelle paire. Angular rejoue ensuite la requete initiale.')]

story += [p('5. Inscription et verification email', 'H1b'),
          p('<b>RegisterComponent -> POST /api/auth/register -> AuthController::register().</b> Laravel impose le prenom, nom, email unique, mot de passe d au moins 12 caracteres avec majuscule, minuscule, chiffre et caractere special, puis accepte les conditions.'),
          p('Dans une transaction SQL, User::create() insere le compte dans users et roles()->attach() associe le role user dans role_user. Ensuite sendEmailVerificationNotification() envoie le message de verification.'),
          p('Le lien de verification arrive sur GET /api/auth/email/verify/{id}/{hash}. verifyEmail() controle la signature de route et le hash de l email, puis remplit users.email_verified_at. Sans cette date, login() refuse la connexion avec 403.'),
          p('<b>Attention email :</b> avec MAIL_MAILER=log, les liens sont ecrits dans storage/logs/laravel.log. Pour une reception reelle, la configuration SMTP doit etre renseignee dans .env.', 'Bodyb')]

story += [p('6. Mot de passe oublie et reinitialisation', 'H1b'),
          p('<b>Demande.</b> ForgotPasswordComponent appelle POST /api/auth/password/forgot. AuthController::forgotPassword() utilise Password::sendResetLink(). Laravel cree un token temporaire hashé dans password_reset_tokens et envoie le lien.'),
          p('La reponse est toujours similaire, que l email existe ou non : cela empeche un attaquant de decouvrir les comptes existants.'),
          p('<b>Redirection.</b> Le lien email pointe vers GET /api/auth/password/reset/{token}. passwordResetPage() redirige vers Angular : /reset-password?token=...&email=...'),
          p('<b>Nouveau mot de passe.</b> ResetPasswordComponent lit token et email dans l URL, puis appelle POST /api/auth/password/reset. AuthController::resetPassword() demande au Password Broker de verifier le token ; si valide, il met a jour users.password et invalide le token.'),
          flow_boxes(['Forgot Password UI', 'password_reset_tokens', 'Email de lien', 'Reset Password UI', 'users.password mis a jour'])]

story += [p('7. Passkeys et sessions', 'H1b'),
          p('<b>SecurityComponent.</b> La page charge GET /api/passkeys et GET /api/sessions. PasskeyController::index() lit passkeys de l utilisateur ; SessionController::index() retourne les auth_sessions non revoquees.'),
          p('<b>Ajouter une passkey.</b> SecurityComponent appelle Passkeys.register(). Le navigateur ouvre Windows Hello, empreinte, Face ID ou une cle physique. Laravel valide WebAuthn puis stocke credential_id et credential dans passkeys.'),
          p('<b>Se connecter par passkey.</b> LoginComponent appelle Passkeys.verify(). Apres validation, PasskeyLoginResponse cree les memes access et refresh tokens qu une connexion mot de passe. Angular appelle restoreSession(), puis GET /api/auth/me.'),
          p('<b>Revoquer.</b> DELETE /api/sessions/{id}, DELETE /api/sessions ou DELETE /api/passkeys/{id} sont controles par permission et par la propriete de la ressource : un utilisateur ne peut modifier que ses propres sessions et passkeys.')]

story += [p('8. Roles, permissions et audit', 'H1b'),
          table([
              [p('Element'), p('Role dans la securite')],
              [p('roles / role_user'), p('Definit les roles attribues au compte : user, admin, etc.')],
              [p('permissions / permission_role'), p('Associe les autorisations fines aux roles, par exemple users.view ou sessions.revoke.')],
              [p('PermissionMiddleware'), p('Bloque les routes admin, sessions et passkeys sans le droit necessaire ; reponse 403.')],
              [p('audit_logs'), p('AuthenticationAuditMiddleware garde une trace des inscriptions, connexions, echecs, deconnexions et resets.')],
          ], [5.0*cm, 12.0*cm]),
          Spacer(1, .3 * cm),
          p('La page Admin n est donc pas seulement cachee dans Angular. Son appel GET /api/admin/users passe aussi par auth:api, access.token et permission:users.view dans Laravel.')]

story += [p('9. Carte des fichiers essentiels', 'H1b'),
          table([
              [p('Zone'), p('Fichier'), p('Responsabilite')],
              [p('Frontend'), p('core/auth/auth.service.ts'), p('CSRF, login, refresh, logout, sessions et etat utilisateur.')],
              [p('Frontend'), p('core/auth/auth.interceptor.ts'), p('Ajoute Bearer et CSRF ; tente refresh apres un 401.')],
              [p('Frontend'), p('features/auth/*'), p('HTML, CSS et TypeScript des ecrans auth.')],
              [p('Proxy'), p('frontend/nginx.conf'), p('Transmet /api et les routes passkeys au backend.')],
              [p('Backend'), p('routes/api.php'), p('Declare les URL, limites de debit et middleware.')],
              [p('Backend'), p('Api/AuthController.php'), p('Register, login, refresh, forgot, reset, verify, resend, logout, me.')],
              [p('Backend'), p('Services/AuthSessionManager.php'), p('Enregistre, verifie et revoque les sessions de refresh.')],
              [p('Data'), p('database/migrations/*'), p('Structure de users, tokens reset, sessions, roles, permissions, passkeys et audit.')],
          ], [2.2*cm, 6.1*cm, 8.7*cm]),
          Spacer(1, .5 * cm),
          p('Conclusion : Angular collecte et affiche, Nginx achemine, Laravel valide et autorise, MySQL conserve les donnees. Les tokens et les controles serveur ferment la boucle vers une interface protegee.', 'H2b')]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=1.7*cm, leftMargin=1.7*cm, topMargin=1.6*cm, bottomMargin=1.8*cm, title='Guide de l authentification Angular Laravel')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
