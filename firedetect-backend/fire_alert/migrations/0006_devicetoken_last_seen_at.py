# Generated manually to track app-open heartbeat for push repeat stop condition

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fire_alert', '0005_devicetoken_notification_channel'),
    ]

    operations = [
        migrations.AddField(
            model_name='devicetoken',
            name='last_seen_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
