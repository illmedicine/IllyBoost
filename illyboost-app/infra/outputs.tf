output "backend_public_ip" {
  description = "Public IP of backend instance"
  value       = oci_core_instance.backend.public_ip
}

output "backend_private_ip" {
  description = "Private IP of backend instance"
  value       = oci_core_instance.backend.private_ip
}

output "agent_public_ips" {
  description = "Public IPs of agent instances"
  value       = [for instance in oci_core_instance.agent : instance.public_ip]
}

output "agent_private_ips" {
  description = "Private IPs of agent instances"
  value       = [for instance in oci_core_instance.agent : instance.private_ip]
}

output "ssh_command_backend" {
  description = "SSH command to connect to backend"
  value       = "ssh ubuntu@${oci_core_instance.backend.public_ip}"
}

output "ssh_commands_agents" {
  description = "SSH commands to connect to agents"
  value       = [for i, instance in oci_core_instance.agent : "ssh ubuntu@${instance.public_ip} # agent-${i + 1}"]
}

output "rdp_connection_backend" {
  description = "RDP connection address for backend (username: ubuntu)"
  value       = "${oci_core_instance.backend.public_ip}:3389"
}

output "rdp_connections_agents" {
  description = "RDP connection addresses for agents (username: ubuntu)"
  value       = [for i, instance in oci_core_instance.agent : "${instance.public_ip}:3389 # agent-${i + 1}"]
}

output "illyboost_frontend_url" {
  description = "Direct link to IllyBoost frontend with backend pre-configured (open this URL to auto-connect)"
  value       = "https://illmedicine.github.io/IllyBoost/?backend=${oci_core_instance.backend.public_ip}:3001"
}

output "backend_api_url" {
  description = "Backend API URL for manual configuration"
  value       = "http://${oci_core_instance.backend.public_ip}:3001"
}
