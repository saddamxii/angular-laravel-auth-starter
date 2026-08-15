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
                sh 'docker compose -f docker-compose.frontend-test.yml run --rm frontend-test'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'frontend/test-results/**/*.xml'
                    archiveArtifacts allowEmptyArchive: true, artifacts: 'frontend/playwright-report/**'
                    sh 'docker compose -f docker-compose.frontend-test.yml down -v --remove-orphans || true'
                }
            }
        }

        stage('Security Audit') {
            steps {
                sh 'docker run --rm -v "$PWD/backend:/app" -w /app composer:2 composer audit --no-interaction || true'
                sh 'docker run --rm -v "$PWD/frontend:/app" -w /app node:22.22.3-bookworm sh -c "npm install --package-lock-only --ignore-scripts --no-audit --no-fund && npm audit --audit-level=high"'
            }
        }

        stage('Build Production Images') {
            steps {
                sh 'docker compose -f docker-compose.yml build --pull'
            }
        }

        stage('Docker Smoke Test') {
            steps {
                sh 'docker compose -f docker-compose.yml up -d'
                sh 'sleep 10'
                sh 'docker compose -f docker-compose.yml ps'
                sh 'docker inspect --format="{{.State.Health.Status}}" auth_starter_frontend || true'
            }
        }
    }

    post {
        always {
            sh 'docker compose -f docker-compose.yml down -v --remove-orphans || true'
            sh 'docker system prune -f || true'
        }
        success {
            echo 'Authentication starter CI pipeline completed successfully.'
        }
        failure {
            echo 'CI failed. Review the stage logs before merging.'
        }
    }
}
