terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# Get available AZs
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
}

# Get Ubuntu 22.04 image
data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# VCN
resource "oci_core_virtual_network" "illyboost_vcn" {
  compartment_id = var.compartment_ocid
  display_name   = "illyboost-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
}

# Internet Gateway
resource "oci_core_internet_gateway" "illyboost_igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.illyboost_vcn.id
  enabled        = true
  display_name   = "illyboost-igw"
}

# Route Table
resource "oci_core_route_table" "illyboost_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.illyboost_vcn.id
  display_name   = "illyboost-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.illyboost_igw.id
  }
}

# Subnet
resource "oci_core_subnet" "illyboost_subnet" {
  compartment_id      = var.compartment_ocid
  vcn_id              = oci_core_virtual_network.illyboost_vcn.id
  cidr_block          = "10.0.1.0/24"
  display_name        = "illyboost-subnet"
  route_table_id      = oci_core_route_table.illyboost_rt.id
}

# Network Security Group
resource "oci_core_network_security_group" "illyboost_nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.illyboost_vcn.id
  display_name   = "illyboost-nsg"
}

# NSG Rules - SSH
resource "oci_core_network_security_group_security_rule" "ssh" {
  network_security_group_id = oci_core_network_security_group.illyboost_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  stateless                 = false
  
  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# NSG Rules - Backend API (3001)
resource "oci_core_network_security_group_security_rule" "backend_api" {
  network_security_group_id = oci_core_network_security_group.illyboost_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  stateless                 = false
  
  tcp_options {
    destination_port_range {
      min = 3001
      max = 3001
    }
  }
}

# NSG Rules - Agent WebSocket (3002)
resource "oci_core_network_security_group_security_rule" "agent_ws" {
  network_security_group_id = oci_core_network_security_group.illyboost_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  stateless                 = false
  
  tcp_options {
    destination_port_range {
      min = 3002
      max = 3002
    }
  }
}

# NSG Rules - Frontend WebSocket (3003)
resource "oci_core_network_security_group_security_rule" "frontend_ws" {
  network_security_group_id = oci_core_network_security_group.illyboost_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  stateless                 = false
  
  tcp_options {
    destination_port_range {
      min = 3003
      max = 3003
    }
  }
}

# NSG Rules - Egress (allow all)
resource "oci_core_network_security_group_security_rule" "egress" {
  network_security_group_id = oci_core_network_security_group.illyboost_nsg.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  stateless                 = false
}

# Backend Instance
resource "oci_core_instance" "backend" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  display_name        = "illyboost-backend"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 2
    memory_in_gbs = 12
  }

  create_vnic_details {
    subnet_id              = oci_core_subnet.illyboost_subnet.id
    nsg_ids                = [oci_core_network_security_group.illyboost_nsg.id]
    assign_public_ip       = true
  }

  source_details {
    source_type = "IMAGE"
    source_id   = data.oci_core_images.ubuntu.images[0].id
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(file("${path.module}/user_data_backend.sh"))
  }

  depends_on = [oci_core_internet_gateway.illyboost_igw]
}

# Agent Instances
resource "oci_core_instance" "agent" {
  count = var.agent_count

  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[count.index % length(data.oci_identity_availability_domains.ads.availability_domains)].name
  compartment_id      = var.compartment_ocid
  display_name        = "illyboost-agent-${count.index + 1}"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 2
    memory_in_gbs = 12
  }

  create_vnic_details {
    subnet_id              = oci_core_subnet.illyboost_subnet.id
    nsg_ids                = [oci_core_network_security_group.illyboost_nsg.id]
    assign_public_ip       = true
  }

  source_details {
    source_type = "IMAGE"
    source_id   = data.oci_core_images.ubuntu.images[0].id
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(templatefile("${path.module}/user_data_agent.sh", {
      backend_host = oci_core_instance.backend.public_ip
      agent_id     = "agent-${count.index + 1}"
    }))
  }

  depends_on = [oci_core_instance.backend]
}
