from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('user', 'User'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    # Add other profile fields here if needed in the future

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

# Signal to create or update UserProfile whenever a User instance is saved.
@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        UserProfile.objects.get_or_create(user=instance)

# Host Management Models
class HostGroup(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, related_name='host_groups_created', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Host(models.Model):
    name = models.CharField(max_length=100, unique=True)
    ip_address = models.GenericIPAddressField(protocol='both', unpack_ipv4=True, null=True, blank=True) # Can be IP or FQDN if we resolve later
    fqdn = models.CharField(max_length=255, null=True, blank=True, help_text="Fully Qualified Domain Name, if IP is not static or for reference.")
    ansible_user = models.CharField(max_length=100, default='root', help_text="Default SSH user for Ansible.")
    ansible_port = models.PositiveIntegerField(default=22, help_text="SSH port for Ansible.")
    # For SSH key, we'll just use a placeholder text field for now.
    # Later, this could be a ForeignKey to an SSHKey model or use a proper secrets management.
    ssh_key_name = models.CharField(max_length=100, blank=True, null=True, help_text="Name/ID of the SSH key to use (managed separately for now).")

    groups = models.ManyToManyField(HostGroup, related_name='hosts', blank=True)
    created_by = models.ForeignKey(User, related_name='hosts_created', on_delete=models.SET_NULL, null=True, blank=True)
    variables = models.JSONField(default=dict, blank=True, help_text="Host-specific Ansible variables (e.g., {'ansible_python_interpreter': '/usr/bin/python3'})")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Host"
        verbose_name_plural = "Hosts"
        # Potentially add a unique constraint for ip_address if it's always required and unique
        # unique_together = [['ip_address', 'ansible_port']]

# Playbook Management Model
class Playbook(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    content = models.TextField(help_text="YAML content of the Ansible playbook.")
    # For file-based storage later, we might add:
    # file_path = models.CharField(max_length=1024, blank=True, null=True)
    # storage_type = models.CharField(max_length=10, choices=[('db', 'Database'), ('file', 'File System')], default='db')

    created_by = models.ForeignKey(User, related_name='playbooks_created', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Playbook"
        verbose_name_plural = "Playbooks"
        ordering = ['name']

# Task Execution Model
class TaskExecution(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'), # Future use
    ]

    playbook = models.ForeignKey(Playbook, related_name='executions', on_delete=models.CASCADE)
    target_spec = models.TextField(help_text="Specification of targets, e.g., 'all', 'webservers', 'host1,host2.example.com'")

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    celery_task_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)

    output_log_directory = models.CharField(max_length=1024, blank=True, null=True, help_text="Directory where execution logs are stored.")

    executed_by = models.ForeignKey(User, related_name='tasks_executed', on_delete=models.SET_NULL, null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Execution of {self.playbook.name} on {self.target_spec} ({self.status})"

    class Meta:
        verbose_name = "Task Execution"
        verbose_name_plural = "Task Executions"
        ordering = ['-created_at']
