terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  backend_host_effective = var.create_backend ? try(aws_instance.backend[0].public_dns, "") : var.backend_host
  backend_ws_effective   = var.backend_ws != "" ? var.backend_ws : (var.create_backend ? "wss://${local.backend_host_effective}:3001/agents" : "")
}

resource "aws_key_pair" "deployer" {
  key_name   = "illyboost-key"
  public_key = file(var.ssh_pub_key_path)
}

resource "aws_security_group" "ssh_http" {
  name        = "illyboost-sg"
  description = "Allow ssh and outbound"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "backend" {
  name        = "illyboost-backend-sg"
  description = "Backend TLS (3001) + ssh"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  ingress {
    description = "Backend HTTPS+WSS"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = [var.backend_public_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "backend" {
  count         = var.create_backend ? 1 : 0
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.backend_instance_type
  key_name      = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.backend.id]

  user_data = templatefile("user_data_backend.sh.tpl", { agent_secret = var.agent_secret })

  tags = {
    Name = "illyboost-backend"
  }
}

resource "aws_instance" "agent" {
  count         = var.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.ssh_http.id]

  user_data = templatefile("user_data.sh.tpl", { backend_host = local.backend_host_effective, backend_ws = local.backend_ws_effective, agent_id = "agent-${count.index+1}", agent_secret = var.agent_secret })

  tags = {
    Name = "illyboost-agent-${count.index+1}"
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}
