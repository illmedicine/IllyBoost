# Terraform infra

This folder contains example Terraform to provision EC2 instances that run the Python agent. It is provided as a starting point — review and harden it before use.

Prerequisites:
- AWS credentials configured (AWS CLI, env vars, or provider config)
- An SSH public key available locally to access instances.

Quick usage:

```bash
cd infra
terraform init
terraform apply -var='backend_host=<YOUR_BACKEND_PUBLIC_IP>' -var='ssh_pub_key_path=~/.ssh/id_rsa.pub' -var='instance_count=2'
```

What happens:
- Terraform creates `instance_count` EC2 instances (Ubuntu AMI), injects a `user_data` script to install Python, Chrome, and the agent, and starts the agent which connects back to `ws://<backend_host>:3002`.

Important notes:
- Set `backend_host` to the public IP or hostname reachable by the agents (where your backend WS is running).
- The `user_data` embeds the current `agent/agent.py` content into the VM — inspect this before provisioning.
- Security groups in `main.tf` open SSH and agent WS ports to the world; tighten these to your management IP range.

TLS notes:
- You can run your backend with TLS by providing certificate and key paths to the backend process (`SSL_CERT_PATH` and `SSL_KEY_PATH` env vars). When TLS is enabled, agents should connect to `wss://<backend_host>:<PORT>/agents` and the frontend should use `wss://<backend_host>:<PORT>/front`.
- If you want agents to connect via TLS, ensure the VM `user_data` sets `BACKEND_WS` accordingly (e.g., `wss://<host>:<port>/agents`). The current `user_data.sh.tpl` uses an insecure `ws://` scheme by default; edit it before provisioning if you enable TLS.

Cleanup:

```bash
terraform destroy -var='backend_host=<YOUR_BACKEND_PUBLIC_IP>'
```

Review and testing: Launch a small instance first, then confirm the agent connects to the backend before scaling up.
