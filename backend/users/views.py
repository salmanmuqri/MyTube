from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from .models import User, Subscription
from .serializers import (
    RegisterSerializer, UserSerializer,
    ProfileUpdateSerializer, SubscriptionSerializer
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.check_password(password):
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'


class SubscribeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        channel = get_object_or_404(User, id=user_id)
        if channel == request.user:
            return Response({'error': 'Cannot subscribe to yourself'}, status=status.HTTP_400_BAD_REQUEST)
        sub, created = Subscription.objects.get_or_create(subscriber=request.user, channel=channel)
        if not created:
            sub.delete()
            channel.subscribers_count = max(0, channel.subscribers_count - 1)
            channel.save(update_fields=['subscribers_count'])
            return Response({'subscribed': False, 'subscribers_count': channel.subscribers_count})
        channel.subscribers_count += 1
        channel.save(update_fields=['subscribers_count'])
        return Response({'subscribed': True, 'subscribers_count': channel.subscribers_count}, status=status.HTTP_201_CREATED)


class SubscriptionListView(generics.ListAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(subscriber=self.request.user).select_related('channel')


class SubscriptionCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        is_subscribed = Subscription.objects.filter(
            subscriber=request.user, channel_id=user_id
        ).exists()
        return Response({'subscribed': is_subscribed})


class SubscriptionFeedView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from videos.models import Video
        subscribed_channels = Subscription.objects.filter(
            subscriber=self.request.user
        ).values_list('channel_id', flat=True)
        return (Video.objects.filter(
            uploader_id__in=subscribed_channels, status='READY'
        ).select_related('uploader', 'category').order_by('-created_at')[:50])

    def list(self, request, *args, **kwargs):
        from videos.serializers import VideoListSerializer
        qs = self.get_queryset()
        serializer = VideoListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
