import os
from django.core.management.base import BaseCommand
from django.conf import settings
from catalog.models import Book, Tag
from google import genai

class Command(BaseCommand):
    help = "Genera tags temáticos y el estado de ánimo (mood) de libros que no tienen etiquetas usando Gemini."

    def handle(self, *args, **kwargs):
        # Configurar cliente de Gemini
        api_key = getattr(settings, 'GOOGLE_API_KEY', os.environ.get('GOOGLE_API_KEY'))
        if not api_key:
            self.stdout.write(self.style.ERROR("No se encontró GOOGLE_API_KEY en settings."))
            return

        client = genai.Client(api_key=api_key)

        # Buscar libros sin tags
        books = Book.objects.filter(tags__isnull=True).distinct()
        total_books = books.count()

        if total_books == 0:
            self.stdout.write(self.style.SUCCESS("Todos los libros ya tienen etiquetas."))
            return

        self.stdout.write(self.style.WARNING(f"Procesando {total_books} libros para generar tags y mood..."))

        mood_choices = [c[0] for c in Book.MoodChoices.choices]

        for book in books:
            self.stdout.write(f"Procesando: {book.title}")
            
            prompt = f"""
            Eres un experto literario. Analiza la siguiente sinopsis de un libro y proporciona:
            1. 5 etiquetas temáticas cortas (máximo 2 palabras cada una) relevantes para la historia.
            2. Un 'Mood' (estado de ánimo general) que DEBE ser exactamente uno de esta lista: {', '.join(mood_choices)}.
            
            Formato de respuesta obligatorio (sin comillas ni formato markdown extra):
            Tags: etiqueta1, etiqueta2, etiqueta3, etiqueta4, etiqueta5
            Mood: [Tu selección]
            
            Sinopsis:
            {book.synopsis}
            """
            
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                )
                
                text = response.text.strip()
                self.stdout.write(f"Respuesta IA:\n{text}\n")
                
                # Parsear respuesta
                lines = text.split('\n')
                tags_part = ""
                mood_part = ""
                
                for line in lines:
                    line = line.strip()
                    if line.lower().startswith('tags:'):
                        tags_part = line.split(':', 1)[1].strip()
                    elif line.lower().startswith('mood:'):
                        mood_part = line.split(':', 1)[1].strip()
                
                # Procesar Tags
                if tags_part:
                    tag_names = [t.strip().title() for t in tags_part.split(',')]
                    tag_objs = []
                    for name in tag_names:
                        if name:
                            # Truncate if too long to avoid DB errors
                            name = name[:50]
                            tag, created = Tag.objects.get_or_create(name=name)
                            tag_objs.append(tag)
                    
                    if tag_objs:
                        book.tags.add(*tag_objs)
                        self.stdout.write(self.style.SUCCESS(f"  + Añadidos {len(tag_objs)} tags a {book.title}"))

                # Procesar Mood
                if mood_part:
                    # Limpiar mood_part por si tiene puntuación extra
                    clean_mood = mood_part.strip('[]"\'* ')
                    # Verificar que coincide con las opciones
                    matched_mood = next((m for m in mood_choices if m.lower() == clean_mood.lower()), None)
                    if matched_mood:
                        book.mood = matched_mood
                        book.save(update_fields=['mood'])
                        self.stdout.write(self.style.SUCCESS(f"  + Mood guardado: {matched_mood}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"  - Mood '{clean_mood}' no está en la lista permitida."))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error procesando {book.title}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS("Proceso completado."))
