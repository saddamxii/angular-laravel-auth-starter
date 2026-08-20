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
                // The Jenkins controller runs in a container. Bind mounting $PWD into
                // a sibling Docker container resolves on the Docker host, not inside
                // Jenkins, so run audits in the images that already contain the source.
                sh 'docker compose -f docker-compose.test.yml run --rm --no-deps backend-test composer audit --no-interaction'
                sh 'docker compose -f docker-compose.frontend-test.yml run --rm --no-deps frontend-test sh -c "npm install --package-lock-only --ignore-scripts --no-audit --no-fund && npm audit --audit-level=high"'
            }
        }

        stage('Build Production Images') {
            steps {
                sh 'docker compose -f docker-compose.yml build --pull'
            }
        }

        stage('Docker Smoke Test') {
            steps {
                // Use build-specific host ports so this isolated smoke stack can run
                // alongside a developer's local stack on Docker Desktop.
                sh 'MYSQL_PORT=$((50000 + BUILD_NUMBER)) FRONTEND_PORT=$((40000 + BUILD_NUMBER)) docker compose -f docker-compose.yml up -d --wait --wait-timeout 120'
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
