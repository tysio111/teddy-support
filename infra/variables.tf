variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "name" {
  type    = string
  default = "teddy-support"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "domain" {
  description = "API hostname, e.g. api.example.com. Point an A record at the elastic_ip output."
  type        = string
}

variable "frontend_origins" {
  description = "Origins allowed by CORS (API and presigned S3 uploads)."
  type        = list(string)
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy, as owner/name."
  type        = string
}

variable "instance_type" {
  description = "Graviton (arm64) instance; images are built for linux/arm64."
  type        = string
  default     = "t4g.medium"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  type    = number
  default = 20
}

variable "data_volume_size_gb" {
  description = "EBS volume for Qdrant data, mounted at /data."
  type        = number
  default     = 20
}

variable "create_github_oidc_provider" {
  description = "Set to false if the account already has the GitHub OIDC provider."
  type        = bool
  default     = true
}
