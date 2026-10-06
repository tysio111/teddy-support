locals {
  prefix   = "${var.name}-${var.environment}"
  ssm_path = "/${var.name}/${var.environment}/"
}

data "aws_caller_identity" "current" {}

# The default VPC keeps this setup small; RDS is still private (no public IP,
# security group only admits the app instance).
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}
