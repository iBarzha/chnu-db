# Generated by Django 5.2 on 2025-05-20 07:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_temporarydatabase'),
    ]

    operations = [
        migrations.CreateModel(
            name='Task',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('original_db', models.FileField(upload_to='task_dumps/')),
                ('etalon_db', models.FileField(blank=True, null=True, upload_to='task_dumps/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AddField(
            model_name='assignment',
            name='standard_db_dump',
            field=models.FileField(blank=True, null=True, upload_to='task_dumps/'),
        ),
        migrations.AddField(
            model_name='assignment',
            name='standard_solution',
            field=models.TextField(blank=True, help_text='SQL solution applied by teacher', null=True),
        ),
    ]
