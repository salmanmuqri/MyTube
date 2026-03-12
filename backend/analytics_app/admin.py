from django.contrib import admin
from .models import WatchHistory


@admin.register(WatchHistory)
class WatchHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'video', 'watch_duration', 'watch_percentage', 'updated_at']
    list_filter = ['updated_at']
