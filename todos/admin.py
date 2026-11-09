from django.contrib import admin
from .models import Todo


@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ('title', 'priority', 'completed', 'due_date', 'created_at', 'order')
    list_filter = ('completed', 'priority', 'due_date')
    search_fields = ('title', 'description')
    ordering = ('order', '-created_at')
