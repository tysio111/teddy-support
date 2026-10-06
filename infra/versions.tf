terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # State holds generated secrets (DB password, JWT secrets): keep it in an
  # encrypted, private bucket. Fill in and uncomment before the first apply.
  # backend "s3" {
  #   bucket       = "<your-terraform-state-bucket>"
  #   key          = "teddy-support/prod.tfstate"
  #   region       = "eu-central-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
