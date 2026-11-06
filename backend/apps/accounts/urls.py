from django.urls import path

from . import views

urlpatterns = [
    path('csrf/', views.CsrfView.as_view()),
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/login/', views.LoginView.as_view()),
    path('auth/token/', views.TokenView.as_view()),
    path('auth/logout/', views.LogoutView.as_view()),
    path('auth/me/', views.MeView.as_view()),
    path('auth/password/', views.PasswordView.as_view()),
]
