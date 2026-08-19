pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    environment {
        COMPOSE_DOCKER_CLI_BUILD = '1'
        DOCKER_BUILDKIT = '1'
        CI = 'true'
        COMPOSE_PROJECT_NAME = "auth-starter-ci-${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Validate Configuration') {
            steps {
                sh 'docker version'
                sh 'docker compose version'
                sh 'docker compose -f docker-compose.yml config'
                sh 'docker compose -f docker-compose.test.yml config'
                sh 'docker compose -f docker-compose.frontend-test.yml config'
                sh 'docker compose -f docker-compose.passkey-test.yml config'
            }
        }

        stage('Backend Tests') {
            steps {
                sh 'docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test'
            }
            post {
                always {
                    sh 'docker compose -f docker-compose.test.yml down -v --remove-orphans || true'
                }
            }
        }

        stage('Frontend Tests') {
            steps {
                sh 'docker compose -f docker-compose.frontend-test.yml up --build --abort-on-container-exit --exit-code-from frontend-test'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'frontend/test-results/**/*.xml'
                    archiveArtifacts allowEmptyArchive: true, artifacts: 'frontend/playwright-report/**'
                    sh 'docker compose -f docker-compose.frontend-test.yml down -v --remove-orphans || true'
                }
            }
        }

        stage('Passkey Integration Tests') {
            steps {
                sh 'docker compose -p "${COMPOSE_PROJECT_NAME}-passkey" -f docker-compose.passkey-test.yml up --build --abort-on-container-exit --exit-code-from passkey-test'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'frontend/test-results/**/*.xml'
                    archiveArtifacts allowEmptyArchive: true, artifacts: 'frontend/playwright-report/**,frontend/test-results/**'
                    sh 'docker compose -p "${COMPOSE_PROJECT_NAME}-passkey" -f docker-compose.passkey-test.yml down -v --remove-orphans || true'
                }
            }
        }

        stage('Security Audit') {
            steps {
                sh 'docker run --rm -v "$PWD/backend:/app:ro" -w /app composer:2 composer audit --locked --no-interaction'
                sh 'docker run --rm -v "$PWD/frontend:/app" -w /app node:22.22.3-bookworm sh -c "npm install -g npm@12 --no-audit --no-fund && npm install --package-lock-only --ignore-scripts --no-audit --no-fund && npm audit --audit-level=high"'
            }
        }

        stage('Build Production Images') {
            steps {
                sh 'docker compose -f docker-compose.yml build --pull'
            }
        }

        stage('Docker Smoke Test') {
            steps {
                sh 'docker compose -f docker-compose.yml up -d --wait --wait-timeout 120'
                sh 'docker compose -f docker-compose.yml ps'
                sh 'docker compose -f docker-compose.yml exec -T backend php artisan migrate:status'
                sh 'docker compose -f docker-compose.yml exec -T frontend sh -c "wget -q -O - http://127.0.0.1/api/auth/csrf-cookie | grep -q token"'
            }
        }
    }

    post {
        always {
            sh 'docker compose -f docker-compose.yml down -v --remove-orphans || true'
        }
        success {
            echo 'Authentication starter CI pipeline completed successfully.'
        }
        failure {
            echo 'CI failed. Review the stage logs before merging.'
        }
    }
}
