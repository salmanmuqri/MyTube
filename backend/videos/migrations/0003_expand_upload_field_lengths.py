from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('videos', '0002_playlist_playlistvideo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='video',
            name='original_file',
            field=models.FileField(blank=True, max_length=500, null=True, upload_to='originals/'),
        ),
        migrations.AlterField(
            model_name='video',
            name='thumbnail',
            field=models.ImageField(blank=True, max_length=500, null=True, upload_to='thumbnails/'),
        ),
    ]