from django.contrib.auth.models import User
from .serializers import UserRegistrationSerializer, UserSerializer
from .tasks import run_ansible_playbook_task
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

class UserLogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST, data={'error': str(e)})

class CurrentUserView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

from rest_framework import viewsets
from .models import HostGroup, Host, Playbook, TaskExecution
from .serializers import HostGroupSerializer, HostSerializer, PlaybookSerializer, TaskExecutionSerializer
from .tasks import run_ansible_playbook_task
# IsAuthenticated is already imported in previous app setup

class HostGroupViewSet(viewsets.ModelViewSet):
    queryset = HostGroup.objects.all().order_by('name')
    serializer_class = HostGroupSerializer
    permission_classes = [IsAuthenticated] # Ensure only authenticated users can access

    def get_queryset(self):
        # Optionally, filter by user or other criteria if needed in future
        # For now, all authenticated users can see all groups.
        return HostGroup.objects.all().order_by('name')

class HostViewSet(viewsets.ModelViewSet):
    queryset = Host.objects.all().order_by('name')
    serializer_class = HostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Optionally, filter by user or group
        queryset = Host.objects.all().order_by('name')
        group_id = self.request.query_params.get('group_id')
        if group_id:
            queryset = queryset.filter(groups__id=group_id)
        return queryset

class PlaybookViewSet(viewsets.ModelViewSet):
    queryset = Playbook.objects.all().order_by('name')
    serializer_class = PlaybookSerializer
    permission_classes = [IsAuthenticated] # Ensure only authenticated users can access

    # get_queryset can be overridden for more complex filtering if needed

class TaskExecutionViewSet(viewsets.ModelViewSet):
    queryset = TaskExecution.objects.all().order_by('-created_at')
    serializer_class = TaskExecutionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'retrieve', 'delete', 'head', 'options'] # Allow standard methods, no PUT/PATCH by default

    def perform_create(self, serializer):
        # executed_by is set to the current user, status to pending.
        instance = serializer.save(executed_by=self.request.user, status='pending')
        # Trigger Celery task asynchronously
        run_ansible_playbook_task.delay(instance.id)

    def get_queryset(self):
        queryset = super().get_queryset()
        playbook_id = self.request.query_params.get('playbook_id')
        if playbook_id:
            queryset = queryset.filter(playbook_id=playbook_id)
        # Further filtering can be added here (e.g., by user, status)
        return queryset
