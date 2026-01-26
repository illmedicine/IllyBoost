output "agent_public_ips" {
  description = "Public IPs of provisioned IllyBoost agent instances"
  value       = aws_instance.agent[*].public_ip
}

output "backend_public_dns" {
  description = "Public DNS name of provisioned backend instance (if create_backend=true)"
  value       = try(aws_instance.backend[0].public_dns, null)
}

output "backend_https_url" {
  description = "Backend HTTPS URL (self-signed cert by default)"
  value       = try("https://${aws_instance.backend[0].public_dns}:3001", null)
}

output "backend_agent_wss" {
  description = "Agent WSS URL used by agents when backend is provisioned"
  value       = try("wss://${aws_instance.backend[0].public_dns}:3001/agents", null)
}

output "backend_frontend_wss" {
  description = "Frontend WSS URL used by the UI when served from same host"
  value       = try("wss://${aws_instance.backend[0].public_dns}:3001/front", null)
}

output "backend_ssh_command" {
  description = "Convenience SSH command for backend instance (update path to your private key)"
  value       = try("ssh -i <YOUR_PRIVATE_KEY_PATH> ubuntu@${aws_instance.backend[0].public_dns}", null)
}

output "agent_public_dns" {
  description = "Public DNS names of provisioned IllyBoost agent instances"
  value       = aws_instance.agent[*].public_dns
}

output "ssh_commands" {
  description = "Convenience SSH commands (update path to your private key)"
  value = [
    for i, inst in aws_instance.agent :
    "ssh -i <YOUR_PRIVATE_KEY_PATH> ubuntu@${inst.public_dns}"
  ]
}
