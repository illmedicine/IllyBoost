variable "region" {
  type = string
  default = "us-east-1"
}

variable "instance_count" {
  type = number
  default = 2
}

variable "instance_type" {
  type = string
  default = "t3.micro"
}

variable "create_backend" {
  type        = bool
  default     = true
  description = "If true, provision a backend EC2 instance (TLS enabled) alongside agents."
}

variable "backend_instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance type for backend when create_backend=true."
}

variable "ssh_pub_key_path" {
  type = string
  default = "~/.ssh/id_rsa.pub"
}

variable "backend_ws" {
  type        = string
  default     = ""
  description = "Optional full WebSocket URL for agents (e.g., wss://backend.example.com:443/agents). If set, overrides backend_host."
}

variable "backend_host" {
  type = string
  default     = ""
  description = "Public host or IP where the backend WS is reachable from agents. Optional when create_backend=true."
}

variable "allowed_cidr" {
  type = string
  default = "0.0.0.0/0"
  description = "CIDR allowed to access SSH and agent ports. Tighten for production (e.g., your IP/32)."
}

variable "backend_public_cidr" {
  type        = string
  default     = "0.0.0.0/0"
  description = "CIDR allowed to access backend HTTPS port (3001). Tighten if only certain users should access the UI/API."
}

variable "agent_secret" {
  type = string
  default = ""
  description = "Optional shared secret that agents send to the backend for simple authentication."
}
