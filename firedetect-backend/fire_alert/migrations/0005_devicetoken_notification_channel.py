# Generated manually for notification channel routing

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fire_alert', '0004_firealert_resolved_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='devicetoken',
            name='notification_channel',
            field=models.CharField(default='default', max_length=120),
        ),
    ]
