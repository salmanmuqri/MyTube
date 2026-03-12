from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from videos.models import Category

User = get_user_model()

CATEGORIES = [
    ('Education', 'education'),
    ('Comedy', 'comedy'),
    ('Religion', 'religion'),
    ('Sports', 'sports'),
    ('Movies', 'movies'),
    ('Series', 'series'),
    ('Technology', 'technology'),
    ('Gaming', 'gaming'),
    ('Music', 'music'),
    ('News', 'news'),
    ('Travel', 'travel'),
    ('Food', 'food'),
    ('Health & Fitness', 'health-fitness'),
    ('Science', 'science'),
    ('Motivation', 'motivation'),
    ('Vlogs', 'vlogs'),
    ('DIY & Crafts', 'diy-crafts'),
    ('Fashion', 'fashion'),
    ('Politics', 'politics'),
    ('Animals & Pets', 'animals-pets'),
]


class Command(BaseCommand):
    help = 'Seeds the database with categories and a default superuser'

    def handle(self, *args, **options):
        # Seed categories
        created_count = 0
        for name, slug in CATEGORIES:
            _, created = Category.objects.get_or_create(slug=slug, defaults={'name': name})
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ {created_count} categories created ({len(CATEGORIES) - created_count} already existed)'))

        # Create superuser
        if not User.objects.filter(email='admin@mytube.com').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@mytube.com',
                password='admin123',
                role='admin',
            )
            self.stdout.write(self.style.SUCCESS('✅ Superuser created: admin@mytube.com / admin123'))
        else:
            self.stdout.write('ℹ️  Superuser admin@mytube.com already exists')

        # Create demo user
        if not User.objects.filter(email='demo@mytube.com').exists():
            User.objects.create_user(
                username='demo',
                email='demo@mytube.com',
                password='demo123',
            )
            self.stdout.write(self.style.SUCCESS('✅ Demo user created: demo@mytube.com / demo123'))
        else:
            self.stdout.write('ℹ️  Demo user already exists')

        self.stdout.write(self.style.SUCCESS('\n🎉 Seed complete! Start the backend: python manage.py runserver'))
