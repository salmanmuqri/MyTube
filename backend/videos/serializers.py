from rest_framework import serializers
from .models import Video, Category, Tag, Like, Comment, Playlist, PlaylistVideo


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'user', 'username', 'user_avatar', 'video', 'parent',
                  'text', 'is_flagged', 'replies', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'video', 'is_flagged', 'created_at', 'updated_at']

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all()[:10], many=True).data
        return []


class VideoListSerializer(serializers.ModelSerializer):
    uploader_name = serializers.CharField(source='uploader.username', read_only=True)
    uploader_avatar = serializers.ImageField(source='uploader.avatar', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Video
        fields = ['id', 'title', 'description', 'uploader', 'uploader_name',
                  'uploader_avatar', 'category', 'category_name', 'tags', 'status',
                  'thumbnail', 'duration', 'views_count', 'likes_count',
                  'comments_count', 'trending_score', 'created_at']


class VideoDetailSerializer(serializers.ModelSerializer):
    uploader_name = serializers.CharField(source='uploader.username', read_only=True)
    uploader_avatar = serializers.ImageField(source='uploader.avatar', read_only=True)
    uploader_subscribers = serializers.IntegerField(source='uploader.subscribers_count', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    tags = TagSerializer(many=True, read_only=True)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = ['id', 'title', 'description', 'uploader', 'uploader_name',
                  'uploader_avatar', 'uploader_subscribers', 'category', 'category_name',
                  'tags', 'status', 'hls_path', 'thumbnail', 'duration',
                  'views_count', 'likes_count', 'comments_count',
                  'trending_score', 'created_at', 'updated_at', 'is_liked']

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(user=request.user, video=obj).exists()
        return False


class VideoUploadSerializer(serializers.ModelSerializer):
    tag_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    category_name = serializers.CharField(write_only=True, required=False)
    video_file = serializers.FileField(write_only=True)

    class Meta:
        model = Video
        fields = ['title', 'description', 'video_file', 'category_name', 'tag_names', 'thumbnail']

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        category_name = validated_data.pop('category_name', None)
        video_file = validated_data.pop('video_file')

        if category_name:
            category, _ = Category.objects.get_or_create(
                name=category_name,
                defaults={'slug': category_name.lower().replace(' ', '-')}
            )
            validated_data['category'] = category

        validated_data['original_file'] = video_file
        validated_data['uploader'] = self.context['request'].user
        video = Video.objects.create(**validated_data)

        for name in tag_names:
            tag, _ = Tag.objects.get_or_create(name=name.strip().lower())
            video.tags.add(tag)

        return video


class VideoUpdateSerializer(serializers.ModelSerializer):
    tag_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    category_name = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Video
        fields = ['title', 'description', 'thumbnail', 'category_name', 'tag_names']

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('tag_names', None)
        category_name = validated_data.pop('category_name', None)

        if category_name is not None:
            if category_name:
                category, _ = Category.objects.get_or_create(
                    name=category_name,
                    defaults={'slug': category_name.lower().replace(' ', '-')}
                )
                instance.category = category
            else:
                instance.category = None

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tag_names is not None:
            instance.tags.clear()
            for name in tag_names:
                if name.strip():
                    tag, _ = Tag.objects.get_or_create(name=name.strip().lower())
                    instance.tags.add(tag)

        return instance


class PlaylistSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    video_count = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = ['id', 'owner', 'owner_name', 'name', 'description',
                  'is_public', 'video_count', 'thumbnail', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_video_count(self, obj):
        return obj.playlist_videos.count()

    def get_thumbnail(self, obj):
        first = obj.playlist_videos.select_related('video').first()
        if first and first.video.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first.video.thumbnail.url)
            return first.video.thumbnail.url
        return None


class PlaylistDetailSerializer(PlaylistSerializer):
    videos = serializers.SerializerMethodField()

    class Meta(PlaylistSerializer.Meta):
        fields = PlaylistSerializer.Meta.fields + ['videos']

    def get_videos(self, obj):
        pvs = obj.playlist_videos.select_related('video__uploader', 'video__category').all()
        videos = [pv.video for pv in pvs]
        return VideoListSerializer(videos, many=True, context=self.context).data


class PlaylistVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaylistVideo
        fields = ['id', 'playlist', 'video', 'position', 'added_at']
        read_only_fields = ['id', 'added_at']
