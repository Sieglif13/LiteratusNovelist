from django.contrib import admin
from .models import Author, Genre, Book, Edition, BookAuthor

@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'nationality']
    prepopulated_fields = {'slug': ('full_name',)}

@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ['name']
    prepopulated_fields = {'slug': ('name',)}

class BookAuthorInline(admin.TabularInline):
    model = BookAuthor
    extra = 1

class EditionInline(admin.TabularInline):
    model = Edition
    extra = 1

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [BookAuthorInline, EditionInline]

@admin.register(Edition)
class EditionAdmin(admin.ModelAdmin):
    """
    Registro independiente de Edition en el panel de administración
    para gestionar formatos, precios y archivos directamente.
    """
    list_display = ['book', 'format', 'language', 'price']
    search_fields = ['book__title', 'isbn', 'publisher']
    list_filter = ['format', 'language']
