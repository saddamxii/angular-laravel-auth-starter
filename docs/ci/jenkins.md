# Jenkins pipeline

Create a Pipeline-from-SCM job that uses the repository `Jenkinsfile`.
The build agent needs Docker Engine access, Docker Compose v2, and permission
to run Docker commands. No deployment credentials are required because the
pipeline only builds and validates local images.

Each build uses a unique Compose project name and removes only its own
containers, networks, and volumes. The pipeline runs, in order:

1. Compose configuration validation.
2. Laravel migrations, seeders, and PHPUnit feature tests.
3. Angular linting, unit tests, and Chromium UI tests.
4. HTTPS WebAuthn registration and sign-in using a Chromium virtual
   authenticator.
5. Composer and npm high-severity dependency audits.
6. Production-image build and a health-checked Docker smoke test, including
   Laravel migration status and Nginx-to-API CSRF proxy validation.

Run the job from a clean workspace. A failing audit or test intentionally
fails the build; inspect that stage before merging.
