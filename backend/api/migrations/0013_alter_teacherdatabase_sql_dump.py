# Generated by Django 5.2.1 on 2025-05-27 08:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_task_due_date'),
    ]

    operations = [
        migrations.AlterField(
            model_name='teacherdatabase',
            name='sql_dump',
            field=models.FileField(upload_to=''),
        ),
    ]
