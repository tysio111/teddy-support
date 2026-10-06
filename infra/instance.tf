data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023_arm64.value
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name

  metadata_options {
    http_tokens = "required"
    # 2 hops so containers (bridge network) can reach IMDS and use the
    # instance role, e.g. for S3.
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    region             = var.region
    ecr_repository_url = aws_ecr_repository.api.repository_url
    domain             = var.domain
    ssm_path           = local.ssm_path
    deploy_bucket      = aws_s3_bucket.deploy.bucket
    data_volume_id     = aws_ebs_volume.data.id
  })

  # A new AMI or user data should not silently replace the host.
  lifecycle {
    ignore_changes = [ami, user_data]
  }

  tags = {
    Name = "${local.prefix}-app"
  }
}

# Qdrant data lives on its own volume so it outlives the instance.
resource "aws_ebs_volume" "data" {
  availability_zone = data.aws_subnet.app.availability_zone
  size              = var.data_volume_size_gb
  type              = "gp3"
  encrypted         = true

  tags = {
    Name     = "${local.prefix}-data"
    Snapshot = "${local.prefix}-daily"
  }
}

data "aws_subnet" "app" {
  id = data.aws_subnets.default.ids[0]
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.app.id
}

resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id

  tags = {
    Name = "${local.prefix}-app"
  }
}

# --- Daily snapshots of the data volume, kept for 14 days ---

resource "aws_iam_role" "dlm" {
  name = "${local.prefix}-dlm"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "dlm.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "data" {
  description        = "${local.prefix} data volume daily snapshots"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]
    target_tags = {
      Snapshot = "${local.prefix}-daily"
    }

    schedule {
      name      = "daily"
      copy_tags = true

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["02:30"]
      }

      retain_rule {
        count = 14
      }
    }
  }
}
