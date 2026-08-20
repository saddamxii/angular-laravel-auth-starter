#!/bin/sh
set -eu

certificate_dir=/etc/nginx/test-certs
mkdir -p "$certificate_dir"

if [ ! -f "$certificate_dir/frontend.test.crt" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
    -keyout "$certificate_dir/frontend.test.key" \
    -out "$certificate_dir/frontend.test.crt" \
    -subj '/CN=frontend.test' \
    -addext 'subjectAltName=DNS:frontend.test'
fi
