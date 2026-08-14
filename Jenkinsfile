pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Validate Docker Compose') {
            steps {
                sh 'docker compose config'
            }
        }

        stage('Build Images') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Test') {
            steps {
                echo 'Application tests will be enabled with the backend/frontend foundations in the next implementation phase.'
            }
        }
    }

    post {
        always {
            sh 'docker compose down -v --remove-orphans || true'
            cleanWs()
        }
    }
}
