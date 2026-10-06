# App configuration in SSM Parameter Store, rendered into .env.prod on every
# deploy (deploy/render-env.sh). Secrets are SecureString.
#
# Third-party secrets are NOT managed here (they would land in the Terraform
# state). Set them once by hand, e.g.:
#   aws ssm put-parameter --type SecureString \
#     --name /teddy-support/prod/ANTHROPIC_API_KEY --value '...'
# Needed: ANTHROPIC_API_KEY, VOYAGE_API_KEY (if KNOWLEDGE_ENABLED), MAIL_USER,
# MAIL_PASSWORD (SES SMTP credentials). Any other variable from
# env-example-relational can be added the same way (String or SecureString).

locals {
  config = {
    NODE_ENV             = "production"
    APP_NAME             = "Teddy Support API"
    APP_PORT             = "3001"
    API_PREFIX           = "api"
    APP_TRUST_PROXY_HOPS = "1"
    BACKEND_DOMAIN       = "https://${var.domain}"
    FRONTEND_DOMAIN      = var.frontend_origins[0]
    APP_CORS_ORIGINS     = join(",", var.frontend_origins)

    DATABASE_TYPE                = "postgres"
    DATABASE_HOST                = aws_db_instance.main.address
    DATABASE_PORT                = tostring(aws_db_instance.main.port)
    DATABASE_USERNAME            = aws_db_instance.main.username
    DATABASE_NAME                = aws_db_instance.main.db_name
    DATABASE_SYNCHRONIZE         = "false"
    DATABASE_MAX_CONNECTIONS     = "20"
    DATABASE_SSL_ENABLED         = "true"
    DATABASE_REJECT_UNAUTHORIZED = "true"

    FILE_DRIVER           = "s3-presigned"
    AWS_S3_REGION         = var.region
    AWS_DEFAULT_S3_BUCKET = aws_s3_bucket.files.bucket

    MAIL_HOST          = "email-smtp.${var.region}.amazonaws.com"
    MAIL_PORT          = "587"
    MAIL_SECURE        = "false"
    MAIL_REQUIRE_TLS   = "true"
    MAIL_IGNORE_TLS    = "false"
    MAIL_DEFAULT_EMAIL = "noreply@${var.domain}"
    MAIL_DEFAULT_NAME  = "Teddy Support"

    AUTH_JWT_TOKEN_EXPIRES_IN           = "15m"
    AUTH_REFRESH_TOKEN_EXPIRES_IN       = "30d"
    AUTH_FORGOT_TOKEN_EXPIRES_IN        = "30m"
    AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN = "1d"

    INTENT_CHECKPOINTER = "postgres"
  }

  generated_secrets = [
    "AUTH_JWT_SECRET",
    "AUTH_REFRESH_SECRET",
    "AUTH_FORGOT_SECRET",
    "AUTH_CONFIRM_EMAIL_SECRET",
  ]
}

resource "aws_ssm_parameter" "config" {
  for_each = local.config

  name  = "${local.ssm_path}${each.key}"
  type  = "String"
  value = each.value
}

resource "random_password" "auth" {
  for_each = toset(local.generated_secrets)

  length  = 64
  special = false
}

resource "aws_ssm_parameter" "auth" {
  for_each = toset(local.generated_secrets)

  name  = "${local.ssm_path}${each.key}"
  type  = "SecureString"
  value = random_password.auth[each.key].result
}

resource "aws_ssm_parameter" "db_password" {
  name  = "${local.ssm_path}DATABASE_PASSWORD"
  type  = "SecureString"
  value = random_password.db.result
}
