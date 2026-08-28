import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type AppLocale = 'en' | 'fr' | 'es';

const translations: Record<AppLocale, Record<string, string>> = {
  en: {
    'language.english': 'English', 'language.french': 'French', 'language.spanish': 'Spanish',
    'nav.dashboard': 'Dashboard', 'nav.profile': 'My profile', 'nav.settings': 'Settings', 'nav.administration': 'Administration', 'nav.sign_out': 'Sign out',
    'auth.welcome_back': 'Welcome back', 'auth.email_or_username': 'Email or username', 'auth.password': 'Password', 'auth.sign_in': 'Sign in',
    'auth.forgot_password': 'Forgot password?', 'auth.create_account': 'Create your account', 'auth.email_address': 'Email address',
    'auth.new_password': 'New password', 'auth.confirm_password': 'Confirm password', 'auth.reset_password': 'Reset password',
    'auth.back_to_sign_in': 'Back to sign in', 'auth.send_reset_link': 'Send reset link',
    'settings.language': 'Language', 'settings.language_description': 'Choose the language used by the application and account emails.',
    'admin.users': 'Users', 'admin.roles': 'Roles & permissions', 'admin.audit': 'Audit log', 'admin.refresh': 'Refresh',
    'forbidden.message': 'You do not have permission to access this resource.', 'forbidden.back': 'Back to dashboard',
    'security.title': 'Security settings', 'security.change_password': 'Change password', 'security.current_password': 'Current password', 'security.confirm_new_password': 'Confirm new password', 'security.change_email': 'Change email address', 'security.new_email': 'New email address', 'security.passkeys': 'Passkeys', 'security.sessions': 'Active sessions', 'security.add_passkey': 'Add passkey', 'security.remove': 'Remove', 'security.revoke': 'Revoke', 'security.sign_out_all': 'Sign out all devices',
    'admin.title': 'Administration', 'admin.create_user': 'Create user', 'admin.edit_user': 'Edit user', 'admin.first_name': 'First name', 'admin.last_name': 'Last name', 'admin.username': 'Username', 'admin.email': 'Email address', 'admin.role': 'Role', 'admin.status': 'Status', 'admin.active': 'Active', 'admin.disabled': 'Disabled', 'admin.save': 'Save changes', 'admin.cancel': 'Cancel', 'admin.filter': 'Filter', 'admin.clear': 'Clear', 'admin.event': 'Event', 'admin.user': 'User', 'admin.from': 'From', 'admin.to': 'To', 'admin.previous': 'Previous', 'admin.next': 'Next',
    'security.passkey_added': 'Passkey registered successfully.', 'security.password_mismatch': 'The new password confirmation does not match.', 'security.password_changed': 'Password changed. All other devices have been signed out.', 'security.passkey_error': 'The passkey could not be registered. Please try again.', 'security.password_error': 'Unable to change the password.',
  },
  fr: {
    'language.english': 'Anglais', 'language.french': 'Français', 'language.spanish': 'Espagnol',
    'nav.dashboard': 'Tableau de bord', 'nav.profile': 'Mon profil', 'nav.settings': 'Paramètres', 'nav.administration': 'Administration', 'nav.sign_out': 'Se déconnecter',
    'auth.welcome_back': 'Bon retour', 'auth.email_or_username': 'E-mail ou nom d’utilisateur', 'auth.password': 'Mot de passe', 'auth.sign_in': 'Se connecter',
    'auth.forgot_password': 'Mot de passe oublié ?', 'auth.create_account': 'Créer votre compte', 'auth.email_address': 'Adresse e-mail',
    'auth.new_password': 'Nouveau mot de passe', 'auth.confirm_password': 'Confirmer le mot de passe', 'auth.reset_password': 'Réinitialiser le mot de passe',
    'auth.back_to_sign_in': 'Retour à la connexion', 'auth.send_reset_link': 'Envoyer le lien de réinitialisation',
    'settings.language': 'Langue', 'settings.language_description': 'Choisissez la langue de l’application et des e-mails du compte.',
    'admin.users': 'Utilisateurs', 'admin.roles': 'Rôles et permissions', 'admin.audit': 'Journal d’audit', 'admin.refresh': 'Actualiser',
    'forbidden.message': 'Vous n’avez pas l’autorisation d’accéder à cette ressource.', 'forbidden.back': 'Retour au tableau de bord',
    'security.title': 'Paramètres de sécurité', 'security.change_password': 'Changer le mot de passe', 'security.current_password': 'Mot de passe actuel', 'security.confirm_new_password': 'Confirmer le nouveau mot de passe', 'security.change_email': 'Changer l’adresse e-mail', 'security.new_email': 'Nouvelle adresse e-mail', 'security.passkeys': 'Clés d’accès', 'security.sessions': 'Sessions actives', 'security.add_passkey': 'Ajouter une clé d’accès', 'security.remove': 'Supprimer', 'security.revoke': 'Révoquer', 'security.sign_out_all': 'Déconnecter tous les appareils',
    'admin.title': 'Administration', 'admin.create_user': 'Créer un utilisateur', 'admin.edit_user': 'Modifier l’utilisateur', 'admin.first_name': 'Prénom', 'admin.last_name': 'Nom', 'admin.username': 'Nom d’utilisateur', 'admin.email': 'Adresse e-mail', 'admin.role': 'Rôle', 'admin.status': 'Statut', 'admin.active': 'Actif', 'admin.disabled': 'Désactivé', 'admin.save': 'Enregistrer les modifications', 'admin.cancel': 'Annuler', 'admin.filter': 'Filtrer', 'admin.clear': 'Effacer', 'admin.event': 'Événement', 'admin.user': 'Utilisateur', 'admin.from': 'Du', 'admin.to': 'Au', 'admin.previous': 'Précédent', 'admin.next': 'Suivant',
    'security.passkey_added': 'Clé d’accès enregistrée avec succès.', 'security.password_mismatch': 'La confirmation du nouveau mot de passe ne correspond pas.', 'security.password_changed': 'Mot de passe modifié. Tous les autres appareils ont été déconnectés.', 'security.passkey_error': 'La clé d’accès n’a pas pu être enregistrée. Réessayez.', 'security.password_error': 'Impossible de modifier le mot de passe.',
  },
  es: {
    'language.english': 'Inglés', 'language.french': 'Francés', 'language.spanish': 'Español',
    'nav.dashboard': 'Panel de control', 'nav.profile': 'Mi perfil', 'nav.settings': 'Configuración', 'nav.administration': 'Administración', 'nav.sign_out': 'Cerrar sesión',
    'auth.welcome_back': 'Bienvenido de nuevo', 'auth.email_or_username': 'Correo electrónico o nombre de usuario', 'auth.password': 'Contraseña', 'auth.sign_in': 'Iniciar sesión',
    'auth.forgot_password': '¿Olvidaste tu contraseña?', 'auth.create_account': 'Crea tu cuenta', 'auth.email_address': 'Correo electrónico',
    'auth.new_password': 'Nueva contraseña', 'auth.confirm_password': 'Confirmar contraseña', 'auth.reset_password': 'Restablecer contraseña',
    'auth.back_to_sign_in': 'Volver al inicio de sesión', 'auth.send_reset_link': 'Enviar enlace de restablecimiento',
    'settings.language': 'Idioma', 'settings.language_description': 'Elige el idioma de la aplicación y de los correos de la cuenta.',
    'admin.users': 'Usuarios', 'admin.roles': 'Roles y permisos', 'admin.audit': 'Registro de auditoría', 'admin.refresh': 'Actualizar',
    'forbidden.message': 'No tienes permiso para acceder a este recurso.', 'forbidden.back': 'Volver al panel de control',
    'security.title': 'Configuración de seguridad', 'security.change_password': 'Cambiar contraseña', 'security.current_password': 'Contraseña actual', 'security.confirm_new_password': 'Confirmar nueva contraseña', 'security.change_email': 'Cambiar correo electrónico', 'security.new_email': 'Nuevo correo electrónico', 'security.passkeys': 'Claves de acceso', 'security.sessions': 'Sesiones activas', 'security.add_passkey': 'Añadir clave de acceso', 'security.remove': 'Eliminar', 'security.revoke': 'Revocar', 'security.sign_out_all': 'Cerrar sesión en todos los dispositivos',
    'admin.title': 'Administración', 'admin.create_user': 'Crear usuario', 'admin.edit_user': 'Editar usuario', 'admin.first_name': 'Nombre', 'admin.last_name': 'Apellido', 'admin.username': 'Nombre de usuario', 'admin.email': 'Correo electrónico', 'admin.role': 'Rol', 'admin.status': 'Estado', 'admin.active': 'Activo', 'admin.disabled': 'Desactivado', 'admin.save': 'Guardar cambios', 'admin.cancel': 'Cancelar', 'admin.filter': 'Filtrar', 'admin.clear': 'Limpiar', 'admin.event': 'Evento', 'admin.user': 'Usuario', 'admin.from': 'Desde', 'admin.to': 'Hasta', 'admin.previous': 'Anterior', 'admin.next': 'Siguiente',
    'security.passkey_added': 'Clave de acceso registrada correctamente.', 'security.password_mismatch': 'La confirmación de la nueva contraseña no coincide.', 'security.password_changed': 'Contraseña cambiada. Se cerró la sesión en todos los demás dispositivos.', 'security.passkey_error': 'No se pudo registrar la clave de acceso. Inténtalo de nuevo.', 'security.password_error': 'No se pudo cambiar la contraseña.',
  },
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);
  readonly locale = signal<AppLocale>(this.readStoredLocale());

  constructor() { this.applyDocumentLocale(this.locale()); }

  t(key: string): string { return translations[this.locale()][key] ?? translations.en[key] ?? key; }
  setLocale(locale: AppLocale | string): void {
    const normalizedLocale = this.normalizeLocale(locale);
    this.locale.set(normalizedLocale);
    localStorage.setItem('app_locale', normalizedLocale);
    this.applyDocumentLocale(normalizedLocale);
  }

  private readStoredLocale(): AppLocale {
    const value = localStorage.getItem('app_locale');
    return this.normalizeLocale(value);
  }
  private normalizeLocale(value: string | null): AppLocale { return value === 'fr' || value === 'es' || value === 'en' ? value : 'en'; }
  private applyDocumentLocale(locale: AppLocale): void {
    this.document.documentElement.lang = locale;
    this.document.documentElement.dir = 'ltr';
  }
}
