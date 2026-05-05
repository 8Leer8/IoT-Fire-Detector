from django.db import migrations


def clear_ghost_active_alerts(apps, schema_editor):
    FireAlert = apps.get_model('fire_alert', 'FireAlert')
    FireAlert.objects.filter(
        status='normal',
        stall_1_active=False,
        stall_2_active=False,
        is_active=True,
    ).update(is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ('fire_alert', '0008_firealert_is_active_firealert_stall_1_active_and_more'),
    ]

    operations = [
        migrations.RunPython(clear_ghost_active_alerts, migrations.RunPython.noop),
    ]
