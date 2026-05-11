import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Chapter

count = 0
for c in Chapter.objects.all():
    if 'pr_ipito' in c.content_html:
        c.content_html = c.content_html.replace('pr_ipito', 'principito')
        c.save()
        count += 1

print(f'Actualizados {count} capítulos con la nueva ruta de imágenes.')
