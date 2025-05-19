from django.contrib.sessions.models import Session
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import TemporaryDatabase
import psycopg2
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@receiver(post_delete, sender=Session)
def delete_temporary_database(sender, instance, **kwargs):
    """
    Signal handler to delete temporary databases when a session is deleted.
    """
    try:
        # Find all temporary databases associated with this session
        temp_dbs = TemporaryDatabase.objects.filter(session_key=instance.session_key)
        
        if not temp_dbs.exists():
            return
            
        # Connect to PostgreSQL
        db_config = settings.DATABASES['default']
        conn = psycopg2.connect(
            dbname=db_config['NAME'],
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            host=db_config['HOST'],
            port=db_config['PORT']
        )
        conn.autocommit = True  # Required for DROP DATABASE
        cursor = conn.cursor()
        
        # Drop each temporary database
        for temp_db in temp_dbs:
            try:
                # Terminate all connections to the database
                cursor.execute(f"""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = %s
                    AND pid <> pg_backend_pid()
                """, [temp_db.database_name])
                
                # Drop the database
                cursor.execute(f"DROP DATABASE IF EXISTS {temp_db.database_name}")
                logger.info(f"Dropped temporary database: {temp_db.database_name}")
                
                # Delete the database record
                temp_db.delete()
            except Exception as e:
                logger.error(f"Error dropping temporary database {temp_db.database_name}: {str(e)}")
        
        # Close connection
        cursor.close()
        conn.close()
    except Exception as e:
        logger.error(f"Error in delete_temporary_database signal handler: {str(e)}")