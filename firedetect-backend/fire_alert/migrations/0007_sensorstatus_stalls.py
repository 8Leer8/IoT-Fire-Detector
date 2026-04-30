# Generated manually for ESP32 stall payload support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fire_alert', '0006_devicetoken_last_seen_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='sensorstatus',
            name='stall1',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='sensorstatus',
            name='stall2',
            field=models.BooleanField(default=False),
        ),
    ]
