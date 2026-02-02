variable "tenancy_ocid" {
  type        = string
  description = "Oracle Cloud Tenancy OCID"
  sensitive   = true
}

variable "user_ocid" {
  type        = string
  description = "Oracle Cloud User OCID"
  sensitive   = true
}

variable "fingerprint" {
  type        = string
  description = "Oracle Cloud API Key Fingerprint"
  sensitive   = true
}

variable "private_key_path" {
  type        = string
  description = "Path to Oracle Cloud API private key"
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  type        = string
  description = "Oracle Cloud region"
  default     = "us-ashburn-1"
}

variable "compartment_ocid" {
  type        = string
  description = "Oracle Cloud Compartment OCID"
  sensitive   = true
}

variable "ssh_public_key_path" {
  type        = string
  description = "Path to SSH public key"
  default     = "~/.ssh/id_rsa.pub"
}

variable "agent_count" {
  type        = number
  description = "Number of agent instances to create"
  default     = 2
}

variable "rdp_password" {
  type        = string
  description = "Password for RDP access to VMs (username: ubuntu)"
  sensitive   = true
}

variable "rdp_allowed_cidr" {
  type        = string
  description = "CIDR block allowed to access RDP (e.g., your office IP). Must be explicitly set - no default value for security."
}
