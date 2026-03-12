from django.contrib import admin
from .models import UserPreference, RecommendationLog


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'updated_at']


@admin.register(RecommendationLog)
class RecommendationLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'video', 'score', 'algorithm', 'created_at']
