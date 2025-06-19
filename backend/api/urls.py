from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UserRegistrationView, UserLogoutView, CurrentUserView, HostGroupViewSet, HostViewSet, PlaybookViewSet, TaskExecutionViewSet, SSHKeyViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path('auth/register/', UserRegistrationView.as_view(), name='user_register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/login/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('auth/logout/', UserLogoutView.as_view(), name='user_logout'),
    path('auth/user/', CurrentUserView.as_view(), name='current_user'),
]

# Host Management URLs
router = DefaultRouter()
router.register(r'hostgroups', HostGroupViewSet, basename='hostgroup')
router.register(r'hosts', HostViewSet, basename='host')

# Add router.urls to urlpatterns
# Ensure urlpatterns exists before trying to add to it.
# The original urlpatterns are defined. We append to this list.
router.register(r'playbooks', PlaybookViewSet, basename='playbook')
router.register(r'taskexecutions', TaskExecutionViewSet, basename='taskexecution')
router.register(r'sshkeys', SSHKeyViewSet, basename='sshkey')
urlpatterns += router.urls
