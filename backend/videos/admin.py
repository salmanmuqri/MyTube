from django.contrib import admin
from .models import Video, Category, Tag, Like, Comment


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'uploader', 'status', 'views_count', 'likes_count', 'trending_score', 'created_at']
    list_filter = ['status', 'category']
    search_fields = ['title', 'description']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name']


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'video', 'created_at']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'video', 'text', 'is_flagged', 'created_at']
    list_filter = ['is_flagged']
