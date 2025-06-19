import os
import subprocess
import tempfile
import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings # Use Django settings
from .models import TaskExecution, Playbook, Host, HostGroup, User # Ensure User is imported
import json

logger = logging.getLogger(__name__)

LOGS_BASE_DIR = getattr(settings, 'ANSIBLE_LOGS_BASE_DIR', os.path.join(settings.BASE_DIR, 'ansible_logs'))
os.makedirs(LOGS_BASE_DIR, exist_ok=True)

def generate_inventory_file(target_spec, execution_log_dir):
    inventory_content = ""
    hosts_to_include = set() # Use a set to avoid duplicates initially

    if target_spec.lower() == 'all':
        for host in Host.objects.all():
            hosts_to_include.add(host)
    else:
        targets = [t.strip() for t in target_spec.split(',')]
        for target_name in targets:
            group = HostGroup.objects.filter(name=target_name).first()
            if group:
                for host in group.hosts.all():
                    hosts_to_include.add(host)
                continue

            host = Host.objects.filter(name=target_name).first() or                    Host.objects.filter(ip_address=target_name).first() or                    Host.objects.filter(fqdn=target_name).first()

            if host:
                hosts_to_include.add(host)
            else:
                logger.warning(f"Target '{target_name}' not found in database. Skipping.")

    if not hosts_to_include:
        inventory_content = "# No hosts found for the given target_spec\n"
    else:
        for host_obj in hosts_to_include:
            host_ip = host_obj.ip_address if host_obj.ip_address else host_obj.fqdn
            if not host_ip:
                logger.warning(f"Host {host_obj.name} has no IP or FQDN. Skipping.")
                continue

            inventory_line = f"{host_ip}"
            if host_obj.ansible_user:
                inventory_line += f" ansible_user={host_obj.ansible_user}"
            if host_obj.ansible_port and host_obj.ansible_port != 22:
                inventory_line += f" ansible_port={host_obj.ansible_port}"

            if host_obj.variables:
                for key, value in host_obj.variables.items():
                    if isinstance(value, str):
                        inventory_line += f" {key}='{value}'"
                    else: # For numbers, booleans, or complex types, JSON dump them
                        inventory_line += f" {key}={json.dumps(value)}"
            inventory_content += inventory_line + "\n"

    inventory_file_path = os.path.join(execution_log_dir, 'inventory.ini')
    with open(inventory_file_path, 'w') as f:
        f.write(inventory_content)
    logger.info(f"Generated inventory file at: {inventory_file_path} with content:\n{inventory_content}")
    return inventory_file_path

@shared_task(bind=True)
def run_ansible_playbook_task(self, task_execution_id):
    try:
        task_execution = TaskExecution.objects.get(id=task_execution_id)
    except TaskExecution.DoesNotExist:
        logger.error(f"TaskExecution with ID {task_execution_id} not found.")
        return

    task_execution.celery_task_id = self.request.id
    task_execution.status = 'running'
    task_execution.started_at = timezone.now()

    execution_log_dir_name = f"task_{task_execution.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}"
    execution_log_dir = os.path.join(LOGS_BASE_DIR, execution_log_dir_name)
    os.makedirs(execution_log_dir, exist_ok=True)
    task_execution.output_log_directory = execution_log_dir
    task_execution.save(update_fields=['celery_task_id', 'status', 'started_at', 'output_log_directory'])

    playbook_content = task_execution.playbook.content
    output_log_file = os.path.join(execution_log_dir, 'ansible_output.log')

    temp_playbook_file_path = None
    inventory_file_path = None

    try:
        inventory_file_path = generate_inventory_file(task_execution.target_spec, execution_log_dir)
        with open(inventory_file_path, 'r') as f_inv_check:
            inventory_check_content = f_inv_check.read()
            if "# No hosts found" in inventory_check_content and not any(line.strip() and not line.startswith("#") for line in inventory_check_content.splitlines()):
                 raise ValueError("No hosts matched the target specification. Cannot run playbook.")

        if not os.path.exists(inventory_file_path) or (os.path.getsize(inventory_file_path) == 0 and not "# No hosts found" in inventory_check_content) :
             raise FileNotFoundError("Inventory file was not created properly or is empty and does not indicate 'No hosts found'.")


        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.yml', dir=execution_log_dir) as tmp_playbook:
            tmp_playbook.write(playbook_content)
            temp_playbook_file_path = tmp_playbook.name

        logger.info(f"Temporary playbook: {temp_playbook_file_path}, Inventory: {inventory_file_path}, Log: {output_log_file}")

        env = os.environ.copy()
        env["ANSIBLE_DEPRECATION_WARNINGS"] = "False"
        env["ANSIBLE_HOST_KEY_CHECKING"] = "False" # CAUTION: For dev/testing only.
        # Add ANSIBLE_STDOUT_CALLBACK=json for structured output if desired later for parsing
        # env["ANSIBLE_STDOUT_CALLBACK"] = "json"

        command = ['ansible-playbook', '-i', inventory_file_path, temp_playbook_file_path]
        logger.info(f"Executing command: {' '.join(command)}")

        process = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=execution_log_dir, env=env
        )

        with open(output_log_file, 'w') as log_f:
            for line in process.stdout: # process.stdout is already a text stream
                log_f.write(line)
        process.wait() # Wait for the subprocess to complete

        task_execution.status = 'succeeded' if process.returncode == 0 else 'failed'
        logger.info(f"Ansible playbook finished. RC: {process.returncode}, Status: {task_execution.status}")

    except Exception as e:
        logger.error(f"Error in run_ansible_playbook_task for {task_execution_id}: {e}", exc_info=True)
        task_execution.status = 'failed'
        # Ensure output_log_file is defined before trying to write to it
        if 'output_log_file' in locals() and output_log_file:
            try:
                with open(output_log_file, 'a') as log_f: # Append error to log
                    log_f.write(f"\n--- TASK EXECUTION ERROR ---\n{str(e)}\n")
            except Exception as log_e: # Catch error during logging
                logger.error(f"Could not write error to log file {output_log_file}: {log_e}")
    finally:
        task_execution.completed_at = timezone.now()
        task_execution.save(update_fields=['status', 'completed_at'])

        if temp_playbook_file_path and os.path.exists(temp_playbook_file_path):
            try:
                os.remove(temp_playbook_file_path)
            except OSError as e: # Catch specific error for file removal
                logger.error(f"Error removing temp playbook {temp_playbook_file_path}: {e}")
    return task_execution.status
