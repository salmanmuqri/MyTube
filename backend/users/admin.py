from django.contrib import admin
from .models import User, Subscription


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'subscribers_count', 'created_at']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'email']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['subscriber', 'channel', 'created_at']
