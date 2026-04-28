"""
users/urls.py — Enrutador DRF para Sistema IAM de Usuarios 
"""
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import RegisterUserView, UserMeView, ProfileView, AddInkView

urlpatterns = [
    # ---- JWT Authentication ----
    # Token de Acceso general (equivale al Login):
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # Token para refrescar sub-sesiones en el frontend:
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ---- Registro y Cuentas ----
    path('register/', RegisterUserView.as_view(), name='register'),
    path('me/', UserMeView.as_view(), name='me'),
    path('me/add_ink/', AddInkView.as_view(), name='add_ink'),
    path('profile/', ProfileView.as_view(), name='profile'),
]
