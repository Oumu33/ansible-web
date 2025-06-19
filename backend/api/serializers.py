from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, HostGroup, Host, Playbook, TaskExecution, SSHKey
from django.contrib.auth.password_validation import validate_password

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('role',)

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password")

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        attrs.pop('password2')
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile')

# Host Management Serializers
class HostGroupSerializer(serializers.ModelSerializer):
    # created_by = UserSerializer(read_only=True) # Optional: show full user details
    created_by_username = serializers.ReadOnlyField(source='created_by.username', allow_null=True)

    class Meta:
        model = HostGroup
        fields = ['id', 'name', 'description', 'created_by_username', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_username']

    def create(self, validated_data):
        # Set created_by to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class HostSerializer(serializers.ModelSerializer):
    # groups = HostGroupSerializer(many=True, read_only=True) # Alternative: show full group details
    groups = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=HostGroup.objects.all(),
        required=False
    )
    # created_by = UserSerializer(read_only=True) # Optional: show full user details
    created_by_username = serializers.ReadOnlyField(source='created_by.username', allow_null=True)

    class Meta:
        model = Host
        fields = [
            'id', 'name', 'ip_address', 'fqdn', 'ansible_user', 'ansible_port',
            'ssh_key_name', 'groups', 'variables',
            'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_username']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        # Handle ManyToMany groups field
        groups_data = validated_data.pop('groups', None)
        host = Host.objects.create(**validated_data)
        if groups_data:
            host.groups.set(groups_data)
        return host

    def update(self, instance, validated_data):
        # Handle ManyToMany groups field
        groups_data = validated_data.pop('groups', None)
        instance = super().update(instance, validated_data)
        if groups_data is not None: # Allow clearing groups by passing empty list
            instance.groups.set(groups_data)
        return instance

# Playbook Management Serializer
class PlaybookSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source='created_by.username', allow_null=True)

    class Meta:
        model = Playbook
        fields = ['id', 'name', 'description', 'content', 'created_by_username', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_username']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        # Basic YAML validation could be added here if desired
        # try:
        #     import yaml
        #     yaml.safe_load(validated_data['content'])
        # except yaml.YAMLError as exc:
        #     raise serializers.ValidationError(f"Invalid YAML content: {exc}")
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Basic YAML validation could be added here if desired
        # if 'content' in validated_data:
        #     try:
        #         import yaml
        #         yaml.safe_load(validated_data['content'])
        #     except yaml.YAMLError as exc:
        #         raise serializers.ValidationError(f"Invalid YAML content: {exc}")
        return super().update(instance, validated_data)

class TaskExecutionSerializer(serializers.ModelSerializer):
    playbook_name = serializers.ReadOnlyField(source='playbook.name')
    executed_by_username = serializers.ReadOnlyField(source='executed_by.username', allow_null=True)

    class Meta:
        model = TaskExecution
        fields = [
            'id', 'playbook', 'playbook_name', 'target_spec', 'status',
            'celery_task_id', 'output_log_directory',
            'executed_by', 'executed_by_username',
            'started_at', 'completed_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'playbook_name', 'status', 'celery_task_id',
            'output_log_directory', 'executed_by_username', 'executed_by', # executed_by is set in perform_create
            'started_at', 'completed_at', 'created_at'
        ]
        # For creation, only playbook (ID) and target_spec are needed from user.
        # executed_by is set automatically.
        extra_kwargs = {
            'playbook': {'queryset': Playbook.objects.all()}, # Ensure playbook ID is valid
            'target_spec': {'required': True} # Making target_spec explicitly required
        }

class SSHKeySerializer(serializers.ModelSerializer):
    associated_user_username = serializers.ReadOnlyField(source='associated_user.username')
    private_key_present = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SSHKey
        fields = ['id', 'name', 'private_key', 'private_key_present', 'fingerprint', 'associated_user', 'associated_user_username', 'created_at', 'updated_at']
        read_only_fields = ['id', 'associated_user_username', 'created_at', 'updated_at', 'fingerprint', 'private_key_present']
        extra_kwargs = {
            'private_key': {'write_only': True, 'style': {'input_type': 'textarea'}, 'required': True},
            'associated_user': {'write_only': True }, # Default is handled by perform_create in ViewSet
            'name': {'required': True},
        }

    def get_private_key_present(self, obj):
        # This method is a hint for the UI.
        # FernetField stores an empty string as an encrypted value if the source is empty.
        # So, checking if obj.private_key is not None or not empty after decryption is complex here.
        # A simple check: if the object exists and has an ID, it means a key was submitted.
        # For a new submission (no obj.id yet), this field won't be shown.
        return obj.id is not None

    def create(self, validated_data):
        # CurrentUserDefault in associated_user field extra_kwargs is not working as expected here,
        # so we ensure association in perform_create of the ViewSet.
        # Or, it could be set here if default isn't working:
        # if 'associated_user' not in validated_data and self.context['request'].user.is_authenticated:
        #    validated_data['associated_user'] = self.context['request'].user
        return super().create(validated_data)
